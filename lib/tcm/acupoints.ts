/**
 * 穴位标准定位库（供报告穴位保健渲染）
 *
 * 定位依据《针灸学》国家标准骨度分寸/体表标志取穴法。
 * patterns.ts 的穴位条目 name 可能是组合（如「脾俞、胃俞」）或带括号
 * 操作注记（如「神阙（隔姜灸）」），渲染层按顿号拆分、去括号后逐一查表。
 *
 * 主配穴约定：各证候 wellness.acupoint 数组的第一个条目为主穴（组），
 * 其余为配穴（组）——少而精，突出主治。
 */

export interface AcupointInfo {
  /** 标准定位 */
  location: string;
}

export const ACUPOINT_INFO: Record<string, AcupointInfo> = {
  足三里: { location: "犊鼻（外膝眼）下 3 寸，胫骨前嵴外一横指" },
  脾俞: { location: "第 11 胸椎棘突下，旁开 1.5 寸" },
  胃俞: { location: "第 12 胸椎棘突下，旁开 1.5 寸" },
  神阙: { location: "脐中央（只灸不针）" },
  关元: { location: "前正中线，脐下 3 寸" },
  命门: { location: "第 2 腰椎棘突下" },
  肾俞: { location: "第 2 腰椎棘突下，旁开 1.5 寸" },
  涌泉: { location: "足底前 1/3 与后 2/3 交界处凹陷中" },
  太溪: { location: "内踝尖与跟腱之间凹陷中" },
  照海: { location: "内踝尖正下方凹陷处" },
  神门: { location: "腕掌侧横纹尺侧端，尺侧腕屈肌腱桡侧凹陷中" },
  内关: { location: "腕掌侧横纹上 2 寸，掌长肌腱与桡侧腕屈肌腱之间" },
  心俞: { location: "第 5 胸椎棘突下，旁开 1.5 寸" },
  气海: { location: "前正中线，脐下 1.5 寸" },
  血海: { location: "髌骨内上缘上 2 寸，股四头肌内侧头隆起处" },
  膈俞: { location: "第 7 胸椎棘突下，旁开 1.5 寸" },
  太冲: { location: "足背第 1、2 跖骨结合部前方凹陷中" },
  期门: { location: "乳头直下，第 6 肋间隙" },
  膻中: { location: "前正中线，平第 4 肋间（两乳头连线中点）" },
  肝俞: { location: "第 9 胸椎棘突下，旁开 1.5 寸" },
  行间: { location: "足背第 1、2 趾间，趾蹼缘后方赤白肉际" },
  风池: { location: "枕骨下，胸锁乳突肌上端与斜方肌上端之间凹陷中" },
  三阴交: { location: "内踝尖上 3 寸，胫骨内侧面后缘" },
  睛明: { location: "目内眦角稍上方凹陷处（按揉宜轻，勿压迫眼球）" },
  太阳: { location: "眉梢与目外眦之间，向后约一横指凹陷中" },
  肺俞: { location: "第 3 胸椎棘突下，旁开 1.5 寸" },
  膏肓: { location: "第 4 胸椎棘突下，旁开 3 寸" },
  太渊: { location: "腕掌侧横纹桡侧端，桡动脉搏动处" },
  大椎: { location: "第 7 颈椎棘突下" },
  曲池: { location: "屈肘，肘横纹外侧端凹陷中" },
  合谷: { location: "手背第 1、2 掌骨间，近第 2 掌骨桡侧中点" },
  少商: { location: "拇指桡侧，指甲角旁 0.1 寸（点刺放血须专业人员操作）" },
  丰隆: { location: "外踝尖上 8 寸，胫骨前嵴外二横指" },
  中脘: { location: "前正中线，脐上 4 寸" },
  阴陵泉: { location: "胫骨内侧髁下缘凹陷中" },
  天枢: { location: "脐旁 2 寸" },
};

/** 拆分组合穴名并查定位（如「脾俞、胃俞」→ 两条；「神阙（隔姜灸）」→ 神阙） */
export function acupointLocations(name: string): { name: string; location?: string }[] {
  return name
    .split("、")
    .map((part) => {
      const base = part.replace(/（.*）/, "").trim();
      return { name: part.trim(), location: ACUPOINT_INFO[base]?.location };
    })
    .filter((x) => x.name.length > 0);
}
