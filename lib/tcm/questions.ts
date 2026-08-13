/**
 * 中医体质量表（CCMQ-60）题目数据
 *
 * 以《中医体质分类与判定》标准配套量表为蓝本：
 * - 共 60 个条目，5 级计分（没有=1，很少=2，有时=3，经常=4，总是=5）
 * - 部分条目同时计入多个亚量表（如"容易疲乏"同时计入平和质（逆）与气虚质）
 * - 平和质中描述负性状态的条目采用反向计分
 */

import type { ConstitutionId } from "./constitutions";

export interface ScaleItem {
  /** 条目编号 q1 ~ q60 */
  key: string;
  /** 题干 */
  text: string;
}

/** 量表选项（Likert 5 级） */
export const SCALE_OPTIONS = [
  { value: 1, label: "没有（根本不）" },
  { value: 2, label: "很少（有一点）" },
  { value: 3, label: "有时（有些）" },
  { value: 4, label: "经常（相当）" },
  { value: 5, label: "总是（非常）" },
] as const;

export const SCALE_ITEMS: ScaleItem[] = [
  { key: "q1", text: "您精力充沛吗？" },
  { key: "q2", text: "您容易疲乏吗？" },
  { key: "q3", text: "您说话声音低弱无力吗？" },
  { key: "q4", text: "您感到闷闷不乐、情绪低沉吗？" },
  { key: "q5", text: "您比一般人耐受不了寒冷（冬天的寒冷、夏天的冷空调、电扇等）吗？" },
  { key: "q6", text: "您能适应外界自然和社会环境的变化吗？" },
  { key: "q7", text: "您容易失眠吗？" },
  { key: "q8", text: "您容易忘事（健忘）吗？" },
  { key: "q9", text: "您容易气短（呼吸短促，接不上气）吗？" },
  { key: "q10", text: "您容易心慌吗？" },
  { key: "q11", text: "您容易头晕或站起时晕眩吗？" },
  { key: "q12", text: "您比别人容易患感冒吗？" },
  { key: "q13", text: "您喜欢安静、懒得说话吗？" },
  { key: "q14", text: "您活动量稍大就容易出虚汗吗？" },
  { key: "q15", text: "您手脚发凉吗？" },
  { key: "q16", text: "您胃脘部、背部或腰膝部怕冷吗？" },
  { key: "q17", text: "您感到怕冷、衣服比别人穿得多吗？" },
  { key: "q18", text: "您吃（喝）凉的东西会感到不舒服或者怕吃（喝）凉的东西吗？" },
  { key: "q19", text: "您受凉或吃（喝）凉的东西后，容易腹泻（拉肚子）吗？" },
  { key: "q20", text: "您感到手脚心发热吗？" },
  { key: "q21", text: "您感觉身体、脸上发热吗？" },
  { key: "q22", text: "您皮肤或口唇干吗？" },
  { key: "q23", text: "您口唇的颜色比一般人红吗？" },
  { key: "q24", text: "您容易便秘或大便干燥吗？" },
  { key: "q25", text: "您面部两颧潮红或偏红吗？" },
  { key: "q26", text: "您感到眼睛干涩吗？" },
  { key: "q27", text: "您感到口干咽燥、总想喝水吗？" },
  { key: "q28", text: "您感到胸闷或腹部胀满吗？" },
  { key: "q29", text: "您感到身体沉重不轻松或不爽快吗？" },
  { key: "q30", text: "您腹部肥满松软吗？" },
  { key: "q31", text: "您有额部油脂分泌多的现象吗？" },
  { key: "q32", text: "您上眼睑比别人肿（上眼睑有轻微隆起的现象）吗？" },
  { key: "q33", text: "您嘴里有黏黏的感觉吗？" },
  { key: "q34", text: "您平素痰多，特别是咽喉部总感到有痰堵着吗？" },
  { key: "q35", text: "您舌苔厚腻或有舌苔厚厚的感觉吗？" },
  { key: "q36", text: "您面部或鼻部有油腻感或者油亮发光吗？" },
  { key: "q37", text: "您容易生痤疮或疮疖吗？" },
  { key: "q38", text: "您感到口苦或嘴里有异味吗？" },
  { key: "q39", text: "您大便黏滞不爽、有解不尽的感觉吗？" },
  { key: "q40", text: "您小便时尿道有发热感、尿色浓（深）吗？" },
  { key: "q41", text: "您带下色黄（白带颜色发黄）吗？（女性回答）/ 您阴囊潮湿吗？（男性回答）" },
  { key: "q42", text: "您的皮肤在不知不觉中会出现青紫瘀斑（皮下出血）吗？" },
  { key: "q43", text: "您两颧部有细微红丝吗？" },
  { key: "q44", text: "您身体上有哪里疼痛吗？" },
  { key: "q45", text: "您面色晦黯或容易出现褐斑吗？" },
  { key: "q46", text: "您容易有黑眼圈吗？" },
  { key: "q47", text: "您口唇颜色偏黯吗？" },
  { key: "q48", text: "您容易精神紧张、焦虑不安吗？" },
  { key: "q49", text: "您多愁善感、感情脆弱吗？" },
  { key: "q50", text: "您容易感到害怕或受到惊吓吗？" },
  { key: "q51", text: "您胁肋部或乳房胀痛吗？" },
  { key: "q52", text: "您无缘无故叹气吗？" },
  { key: "q53", text: "您咽喉部有异物感，且吐之不出、咽之不下吗？" },
  { key: "q54", text: "您没有感冒时也会打喷嚏吗？" },
  { key: "q55", text: "您没有感冒时也会鼻塞、流鼻涕吗？" },
  { key: "q56", text: "您有因季节变化、温度变化或异味等原因而咳喘的现象吗？" },
  { key: "q57", text: "您容易过敏（对药物、食物、气味、花粉或在季节交替、气候变化时）吗？" },
  { key: "q58", text: "您的皮肤容易起荨麻疹（风团、风疹块、风疙瘩）吗？" },
  { key: "q59", text: "您的皮肤因过敏出现过紫癜（紫红色瘀点、瘀斑）吗？" },
  { key: "q60", text: "您的皮肤一抓就红，并出现抓痕吗？" },
];

export interface SubscaleEntry {
  /** 对应 SCALE_ITEMS 的 key */
  key: string;
  /** 是否反向计分（仅平和质中的负性条目为 true） */
  reverse?: boolean;
}

/**
 * 各体质亚量表条目归属（含条目级权重来源说明）。
 * 条目共 66 个计入项、60 个独立题目，与 CCMQ-60 结构一致。
 */
export const SUBSCALES: Record<ConstitutionId, SubscaleEntry[]> = {
  pinghe: [
    { key: "q1" },
    { key: "q2", reverse: true },
    { key: "q3", reverse: true },
    { key: "q4", reverse: true },
    { key: "q5", reverse: true },
    { key: "q6" },
    { key: "q7", reverse: true },
    { key: "q8", reverse: true },
  ],
  qixu: [
    { key: "q2" },
    { key: "q3" },
    { key: "q9" },
    { key: "q10" },
    { key: "q11" },
    { key: "q12" },
    { key: "q13" },
    { key: "q14" },
  ],
  yangxu: [
    { key: "q5" },
    { key: "q12" },
    { key: "q15" },
    { key: "q16" },
    { key: "q17" },
    { key: "q18" },
    { key: "q19" },
  ],
  yinxu: [
    { key: "q20" },
    { key: "q21" },
    { key: "q22" },
    { key: "q23" },
    { key: "q24" },
    { key: "q25" },
    { key: "q26" },
    { key: "q27" },
  ],
  tanshi: [
    { key: "q28" },
    { key: "q29" },
    { key: "q30" },
    { key: "q31" },
    { key: "q32" },
    { key: "q33" },
    { key: "q34" },
    { key: "q35" },
  ],
  shire: [
    { key: "q36" },
    { key: "q37" },
    { key: "q38" },
    { key: "q39" },
    { key: "q40" },
    { key: "q41" },
  ],
  xueyu: [
    { key: "q8" },
    { key: "q42" },
    { key: "q43" },
    { key: "q44" },
    { key: "q45" },
    { key: "q46" },
    { key: "q47" },
  ],
  qiyu: [
    { key: "q4" },
    { key: "q48" },
    { key: "q49" },
    { key: "q50" },
    { key: "q51" },
    { key: "q52" },
    { key: "q53" },
  ],
  tebing: [
    { key: "q54" },
    { key: "q55" },
    { key: "q56" },
    { key: "q57" },
    { key: "q58" },
    { key: "q59" },
    { key: "q60" },
  ],
};
