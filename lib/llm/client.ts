/**
 * LLM 客户端抽象层（OpenAI 兼容协议）
 *
 * 通过环境变量切换厂商（默认 DeepSeek，兼容 Kimi / 通义 / 智谱 等
 * 一切提供 OpenAI 兼容端点的服务）：
 *   LLM_API_KEY   —— 文本模型 Key（缺省时进入 mock 模式）
 *   LLM_BASE_URL  —— 默认 https://api.deepseek.com
 *   LLM_MODEL     —— 默认 deepseek-chat
 *
 * 图像（多模态）单独配置：
 *   VISION_API_KEY / VISION_BASE_URL / VISION_MODEL
 *   默认指向阿里云百炼兼容端点 + qwen-vl-max
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMConfig {
  apiKey?: string;
  baseURL: string;
  model: string;
}

function textConfig(): LLMConfig {
  return {
    apiKey: process.env.LLM_API_KEY,
    baseURL: (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, ""),
    model: process.env.LLM_MODEL ?? "deepseek-chat",
  };
}

function visionConfig(): LLMConfig {
  return {
    apiKey: process.env.VISION_API_KEY ?? process.env.LLM_API_KEY,
    baseURL: (
      process.env.VISION_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1"
    ).replace(/\/$/, ""),
    model: process.env.VISION_MODEL ?? "qwen-vl-max",
  };
}

/** 是否处于 mock 模式（无 Key 时保证应用可演示） */
export function isMockMode(): boolean {
  return !textConfig().apiKey;
}

// ------------------------------------------------------------------
// 文本对话
// ------------------------------------------------------------------

/** 流式对话：逐 token 产出文本片段（SSE 解析） */
export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const cfg = textConfig();
  if (!cfg.apiKey) {
    yield* mockChatStream(messages);
    return;
  }
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({ model: cfg.model, messages, stream: true }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`LLM 请求失败：${res.status} ${await res.text().catch(() => "")}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta: string | undefined = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // 忽略不完整的 SSE 分片
      }
    }
  }
}

/** 非流式对话（用于症状提取等一次性调用） */
export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const cfg = textConfig();
  if (!cfg.apiKey) {
    let out = "";
    for await (const chunk of mockChatStream(messages)) out += chunk;
    return out;
  }
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({ model: cfg.model, messages, stream: false }),
  });
  if (!res.ok) {
    throw new Error(`LLM 请求失败：${res.status} ${await res.text().catch(() => "")}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// ------------------------------------------------------------------
// 图像分析（舌诊 / 面诊）
// ------------------------------------------------------------------

export type VisionMode = "tongue" | "face";

const VISION_PROMPTS: Record<VisionMode, string> = {
  tongue:
    "你是一名中医舌诊医师。请按中医舌诊规范观察此舌象照片，用中文逐项描述：" +
    "舌质（舌色：淡白/淡红/红/绛/紫黯；舌形：老嫩、胖瘦、齿痕、裂纹、芒刺）、" +
    "舌苔（苔色：白/黄/灰黑；苔质：厚薄、润燥、腐腻、剥落）。 " +
    "只客观记录舌诊所见，使用规范舌诊术语，每项一行，不做辨证结论。",
  face:
    "你是一名中医望诊医师。请按中医望色规范观察此面部照片，用中文逐项描述：" +
    "面色（红润/晄白/萎黄/晦黯/潮红/青紫）、面部油脂分泌、有无痤疮疮疖、" +
    "有无眼睑或颜面浮肿、有无目眶暗黑（黑眼圈）、唇色（淡白/淡红/红赤/紫黯）。 " +
    "只客观记录望诊所见，使用规范望诊术语，每项一行，不做辨证结论。",
};

/** 分析舌/面照片，返回结构化特征描述文本 */
export async function analyzeImage(
  base64: string,
  mimeType: string,
  mode: VisionMode
): Promise<string> {
  const cfg = visionConfig();
  if (!cfg.apiKey) {
    return mockVision(mode);
  }
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPTS[mode] },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`图像分析请求失败：${res.status} ${await res.text().catch(() => "")}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

// ------------------------------------------------------------------
// Mock 降级（无 API Key 时保证完整流程可演示）
// ------------------------------------------------------------------

/**
 * 选择式问诊 mock 剧本：按"十问歌"思路编排 6 轮，
 * 每轮返回 { reply, options, done } JSON，末轮 done=true。
 */
const MOCK_CHAT_SCRIPT = [
  {
    reply:
      "（演示模式，未配置模型 Key）请简述本次就诊的主要不适；平素畏寒与畏热情况如何？",
    options: ["平素畏寒，手足不温", "平素畏热，五心烦热", "寒热无明显偏倾", "恶寒与发热交替"],
    done: false,
  },
  {
    reply: "已记录。再问汗法：平素汗出情况如何？",
    options: ["无异常汗出", "动则汗出（自汗）", "寐中汗出（盗汗）", "汗多而黏"],
    done: false,
  },
  {
    reply: "收到。问饮食口味：纳食如何，口中可有异常味觉？",
    options: ["纳食正常，口和", "纳呆食少，脘腹胀满", "口干咽燥，喜冷饮", "口苦口黏"],
    done: false,
  },
  {
    reply: "明白。问二便：大便是否成形，小便是否正常？",
    options: ["二便正常", "大便溏薄，易腹泻", "大便干结，数日一行", "小便短黄"],
    done: false,
  },
  {
    reply: "好的。最后问睡眠与情志：入睡情况与平素情绪如何？",
    options: ["睡眠安稳，情志平和", "不寐多梦，易醒", "情绪抑郁，善太息", "急躁易怒，心烦"],
    done: false,
  },
  {
    reply:
      "问诊已毕。综合各诊所得，症状信息已足以支持体质辨识，请点击下方「生成结论」查看辨证分析。",
    options: [],
    done: true,
  },
];

/** 生成 mock 响应文本（按系统提示词特征区分调用场景） */
function mockReply(messages: ChatMessage[]): string {
  const sys = messages.find((m) => m.role === "system")?.content ?? "";
  // 选择式问诊协议：按已进行的助手轮次推进剧本
  if (sys.includes('"options"')) {
    const turns = messages.filter((m) => m.role === "assistant").length;
    const round = MOCK_CHAT_SCRIPT[Math.min(turns, MOCK_CHAT_SCRIPT.length - 1)];
    return JSON.stringify(round);
  }
  // 症状提取等一次性 JSON 调用：返回空对象，由调用方走关键词匹配兜底
  if (sys.includes("JSON")) return "{}";
  // 报告生成等自由文本调用：返回空串，由调用方走模板兜底
  return "";
}

async function* mockChatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const reply = mockReply(messages);
  for (const ch of reply) {
    yield ch;
    // 模拟流式延迟
    await new Promise((r) => setTimeout(r, 8));
  }
}

function mockVision(mode: VisionMode): string {
  return mode === "tongue"
    ? "（演示模式，未配置图像模型 Key，以下为模拟分析结果）\n" +
        "舌质颜色：淡红\n舌体形态：适中，边缘略有齿痕\n舌苔颜色：白\n苔质：薄白稍腻，润泽"
    : "（演示模式，未配置图像模型 Key，以下为模拟分析结果）\n" +
        "面色：微黄欠润泽\n面部油脂：T 区偏油\n痤疮：偶见\n浮肿：眼睑轻微浮肿\n黑眼圈：轻度\n唇色：淡红";
}
