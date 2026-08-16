import { chatComplete, type ChatMessage } from "@/lib/llm/client";
import { matchSignsFromText, scoreSigns, topSignConstitutions, scorePatterns } from "@/lib/engine";
import { CHAT_SYSTEM_PROMPT, EXTRACT_SYSTEM_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";

/** 选择式问诊的每轮响应协议 */
interface ChatTurn {
  reply: string;
  options: string[];
  done: boolean;
}

/**
 * POST /api/chat
 * - action 缺省：选择式问诊。body: { messages: ChatMessage[] }
 *   返回 { reply, options, done }；LLM 输出无法解析时降级为 { reply: 原文, options: [], done: false }
 * - action = "extract"：对话结束后的结构化提取，返回体征评分 JSON
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: ChatMessage[]; action?: string };
  const messages = body.messages ?? [];

  if (body.action === "extract") {
    return handleExtract(messages);
  }

  const full: ChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...messages.filter((m) => m.role !== "system"),
  ];

  let raw: string;
  try {
    raw = await chatComplete(full);
  } catch (err) {
    return Response.json(
      { reply: `（对话服务异常：${err instanceof Error ? err.message : "未知错误"}）`, options: [], done: false } satisfies ChatTurn,
      { status: 200 }
    );
  }
  return Response.json(parseChatTurn(raw));
}

/** 解析 LLM 每轮输出为 ChatTurn；解析失败时降级为纯文本回复 */
function parseChatTurn(raw: string): ChatTurn {
  const fallback: ChatTurn = { reply: raw || "（未收到有效回复）", options: [], done: false };
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return fallback;
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as Partial<ChatTurn>;
    if (typeof json.reply !== "string" || json.reply.length === 0) return fallback;
    return {
      reply: json.reply,
      options: Array.isArray(json.options)
        ? json.options.filter((o): o is string => typeof o === "string").slice(0, 5)
        : [],
      done: json.done === true,
    };
  } catch {
    return fallback;
  }
}

/** 对话 → 结构化症状 → 体征评分 */
async function handleExtract(messages: ChatMessage[]) {
  const transcript = messages
    .map((m) => `${m.role === "assistant" ? "医师" : "来访者"}：${m.content}`)
    .join("\n");
  // 关键词匹配只针对来访者自述，避免医师提问中的症状词造成误命中
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  let summary = "";
  let llmKeys: string[] = [];
  try {
    const raw = await chatComplete([
      { role: "system", content: EXTRACT_SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ]);
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    summary = typeof json.summary === "string" ? json.summary : "";
    // LLM 提取的规范化术语关键词纳入体征匹配（与用户原文关键词匹配取并集），
    // 解决口语表述（如"睡不着"）匹配不到规范体征词（"失眠"）的问题
    if (Array.isArray(json.keywords)) {
      llmKeys = matchSignsFromText(
        json.keywords.filter((k: unknown) => typeof k === "string").join("\n"),
        "symptom"
      );
    }
  } catch {
    // LLM 提取失败时退化为纯关键词匹配
  }

  // 关键词匹配作为确定性兜底（mock 模式下这是主要路径）；仅匹配来访者自述
  const signKeys = Array.from(new Set([...matchSignsFromText(userText, "symptom"), ...llmKeys]));
  const scores = scoreSigns(signKeys);
  const top = topSignConstitutions(scores);
  // 证候辨证（含命中明细；对话渠道仅产出症状类体征，按覆盖率归一）
  const patterns = scorePatterns(signKeys, { availableCategories: ["symptom"] }).slice(0, 3);

  if (!summary) {
    summary =
      signKeys.length > 0
        ? `对话中识别到 ${signKeys.length} 项症状线索`
        : "对话中未识别到明显症状线索";
  }
  return Response.json({ summary, signKeys, scores, top, patterns });
}
