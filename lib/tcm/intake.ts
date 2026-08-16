/**
 * 「主诉与四诊信息」采集表单配置（/intake 页与引擎共用）
 *
 * 参照真实中医病历结构：主诉（+病程）、现病史（加重/缓解因素）、
 * 既往史与用药、女性专问、切诊（脉诊自测）、闻诊自评。
 * 选项全部选择式；主诉等关键选项直接携带对应的体征 key（signs.ts），
 * 由引擎 intakeToSigns 组装为辨证输入。
 */

/** 三部九候矩阵的一条记录（专家模式） */
export interface PositionPulse {
  side: "左" | "右";
  position: "寸" | "关" | "尺";
  depth: "浮" | "中" | "沉";
  /** 该部候得的脉象（EXPERT_PULSE_OPTIONS 的 key，即 signs.ts 的脉象体征 key） */
  qualities: string[];
}

/** 脉诊自测结构化数据 */
export interface PulseForm {
  /**
   * 采集模式：amateur（业余向导，默认）/ expert（专业录入）。
   * 缺省视为业余（兼容旧数据）。
   */
  mode?: "amateur" | "expert";
  /** 脉率（次/分），未测为 null */
  rate: number | null;
  /** 搏动力度 */
  strength: "有力" | "无力" | "适中" | "";
  /** 位置深浅 */
  depth: "轻按即得" | "重按才得" | "";
  /** 脉道粗细 */
  width: "细如线" | "宽大" | "紧绷如弦" | "";
  /** 节律 */
  rhythm: "整齐" | "时有停跳" | "";
  /** —— 业余模式质量控制 —— */
  /** 实际测量秒数（计时器记录；<30 秒则脉率不可信，不产体征） */
  measuredSeconds?: number | null;
  /** 复测脉率（次/分；与首次差异 >10 提示重测，不产迟/数体征） */
  retestRate?: number | null;
  /** 脉形判断把握：不确定时脉形项不产体征（只保留脉率/节律） */
  confidence?: "确定" | "不确定" | "";
  /** —— 专家模式 —— */
  /** 总体脉象（EXPERT_PULSE_OPTIONS 的 key 列表） */
  pulse28?: string[];
  /** 三部九候（左右×寸关尺×浮中沉，选填） */
  positions?: PositionPulse[];
  /** —— 以下为进阶自测（可选，误差较大仅供参考） —— */
  /** 哪只手搏动更有力（双手对比） */
  strongerHand?: "左手" | "右手" | "双手相近" | "";
  /** 哪一部搏动最弱（三部对比） */
  weakestPosition?: "寸" | "关" | "尺" | "三部均匀" | "";
}

/** 闻诊自评 */
export interface ListeningForm {
  voice: "洪亮" | "低微" | "嘶哑" | "";
  cough: "无" | "有" | "";
  breath: "无" | "口干口苦" | "口黏" | "口气重" | "";
}

/** 女性专问（可整体跳过） */
export interface FemaleForm {
  cycle: "规律" | "不规律" | "";
  flow: "正常" | "量少色淡" | "量多" | "";
  pain: boolean; // 痛经、经血有块
  leukorrhea: boolean; // 带下异常
}

/** 男性专问（可整体跳过） */
export interface MaleForm {
  emission: boolean; // 遗精
  premature: boolean; // 早泄
  nightUrine: boolean; // 夜尿频多
}

/** 完整采集表单 */
export interface IntakeForm {
  /** 人口学信息（必填；旧数据缺失时为空串，各处理处须宽容） */
  gender: "male" | "female" | "";
  ageGroup: "<18" | "18-40" | "40-60" | ">60" | "";
  /** 主诉词条 key 列表（对应 CHIEF_COMPLAINT_OPTIONS） */
  chiefComplaints: string[];
  /** 自定义主诉补充 */
  customComplaint?: string;
  /** 病程 */
  course: "<1w" | "1w-1m" | "1m-6m" | ">6m" | "";
  /** 加重因素 key 列表 */
  aggravating: string[];
  /** 缓解因素 key 列表 */
  relieving: string[];
  /** 慢性病史 key 列表 */
  history: string[];
  /** 长期服药（自由文本，逗号分隔） */
  medications?: string;
  /** 生活方式 key 列表（LIFESTYLE_OPTIONS；湿邪/阴虚等辨证的生活史依据） */
  lifestyle?: string[];
  /** 近期体检异常 key 列表（CHECKUP_OPTIONS；用于健康提示，不参与辨证评分） */
  checkup?: string[];
  /** 女性专问，跳过或男性为 null */
  female: FemaleForm | null;
  /** 男性专问，跳过或女性为 null */
  male?: MaleForm | null;
  pulse: PulseForm;
  listening: ListeningForm;
}

/** 性别选项 */
export const GENDER_OPTIONS = [
  { key: "male", label: "男" },
  { key: "female", label: "女" },
] as const;

/** 年龄段选项 */
export const AGE_GROUP_OPTIONS = [
  { key: "<18", label: "18 岁以下" },
  { key: "18-40", label: "18 ~ 40 岁" },
  { key: "40-60", label: "40 ~ 60 岁" },
  { key: ">60", label: "60 岁以上" },
] as const;

/** 性别/年龄段展示文案 */
export const GENDER_LABELS: Record<string, string> = { male: "男", female: "女" };
export const AGE_GROUP_LABELS: Record<string, string> = {
  "<18": "18 岁以下",
  "18-40": "18~40 岁",
  "40-60": "40~60 岁",
  ">60": "60 岁以上",
};

/** 进阶脉诊自评选项 */
export const PULSE_ADVANCED_OPTIONS = {
  strongerHand: ["左手", "右手", "双手相近"],
  weakestPosition: ["寸", "关", "尺", "三部均匀"],
} as const;

/** 选项配置：value 即体征 key（signs.ts），危急词条标 red */
export interface IntakeOption {
  key: string;
  label: string;
  /** 直接映射的体征 key */
  signs?: string[];
  /** 急重症词条（触发就医警示） */
  red?: boolean;
}

/** 主诉常见词条（多选） */
export const CHIEF_COMPLAINT_OPTIONS: IntakeOption[] = [
  { key: "fatigue", label: "疲乏无力", signs: ["sym_fatigue"] },
  { key: "cold", label: "畏寒怕冷", signs: ["sym_cold"] },
  { key: "heat", label: "五心烦热", signs: ["sym_heat"] },
  { key: "insomnia", label: "失眠多梦", signs: ["sym_insomnia"] },
  { key: "bloating", label: "脘腹胀满", signs: ["sym_bloating"] },
  { key: "stuffiness", label: "胃脘痞满、呕恶", signs: ["sym_stuffiness", "sym_nausea"] },
  { key: "appetite", label: "食欲不振", signs: ["sym_appetite"] },
  { key: "headache", label: "头痛", signs: ["sym_headache"] },
  { key: "dizzy", label: "头晕目眩", signs: ["sym_dizzy"] },
  { key: "lowerback", label: "腰膝酸软", signs: ["sym_lowerback"] },
  { key: "palpitation", label: "心悸心慌", signs: ["sym_palpitation"] },
  { key: "cough", label: "咳嗽", signs: ["sym_cough"] },
  { key: "phlegm", label: "痰多胸闷", signs: ["sym_phlegm"] },
  { key: "mood", label: "情绪抑郁", signs: ["sym_mood"] },
  { key: "irritable", label: "急躁易怒", signs: ["sym_irritable"] },
  { key: "hypochondriac", label: "胁肋胀痛", signs: ["sym_hypochondriac"] },
  { key: "pain", label: "固定部位疼痛", signs: ["sym_pain"] },
  { key: "diarrhea", label: "便溏腹泻", signs: ["sym_diarrhea"] },
  { key: "constipation", label: "便秘", signs: ["sym_constipation"] },
  { key: "sweat", label: "自汗易汗", signs: ["sym_sweat"] },
  { key: "night_sweat", label: "盗汗", signs: ["sym_night_sweat"] },
  { key: "throat", label: "咽喉肿痛", signs: ["sym_sore_throat"] },
  { key: "fever", label: "发热", signs: ["sym_fever"] },
  // —— 急重症词条（不提供辨证，仅触发就医警示） ——
  { key: "chest_pain", label: "剧烈胸痛", red: true },
  { key: "high_fever", label: "高热不退", red: true },
  { key: "bleeding", label: "出血不止", red: true },
  { key: "consciousness", label: "意识异常", red: true },
];

/** 病程选项 */
export const COURSE_OPTIONS = [
  { key: "<1w", label: "不到 1 周" },
  { key: "1w-1m", label: "1 周 ~ 1 个月" },
  { key: "1m-6m", label: "1 ~ 6 个月" },
  { key: ">6m", label: "6 个月以上" },
] as const;

/** 加重因素（多选） */
export const AGGRAVATING_OPTIONS = [
  { key: "overwork", label: "劳累后加重" },
  { key: "emotion", label: "情绪波动后加重" },
  { key: "cold_food", label: "饮食生冷后加重" },
  { key: "cold_env", label: "受寒后加重" },
  { key: "late_night", label: "熬夜后加重" },
  { key: "menses", label: "经期前后加重" },
  { key: "greasy", label: "油腻饮食后加重" },
];

/** 缓解因素（多选） */
export const RELIEVING_OPTIONS = [
  { key: "rest", label: "休息后缓解" },
  { key: "warm_food", label: "温热饮食后缓解" },
  { key: "warm_compress", label: "热敷后缓解" },
  { key: "stool", label: "排便后缓解" },
  { key: "activity", label: "活动后缓解" },
  { key: "emotion_calm", label: "情绪平稳后缓解" },
];

/** 慢性病史（多选） */
export const HISTORY_OPTIONS = [
  { key: "hypertension", label: "高血压" },
  { key: "diabetes", label: "糖尿病" },
  { key: "stomach", label: "脾胃病（胃炎、溃疡等）" },
  { key: "heart", label: "心脑血管疾病" },
  { key: "allergy", label: "过敏性疾病" },
  { key: "thyroid", label: "甲状腺疾病" },
  { key: "none", label: "无慢性病史" },
];

/**
 * 生活方式（多选）——湿邪/阴虚等证的生活史依据。
 * key 与 signs.ts 中对应 life_* 体征 key 一致，由引擎直接映射。
 */
export const LIFESTYLE_OPTIONS = [
  { key: "life_cold_drink", label: "常食冷饮、生冷瓜果" },
  { key: "life_late_sleep", label: "长期熬夜（23 点后入睡）" },
  { key: "life_sedentary", label: "久坐少动" },
  { key: "life_damp_env", label: "居处或工作环境潮湿" },
  { key: "life_greasy", label: "嗜食肥甘厚味、甜腻" },
];

/**
 * 近期体检异常（多选）——不参与辨证评分，用于报告健康提示
 * （「体病相关」：体质/证候与现代医学指标的关联提示）。
 */
export const CHECKUP_OPTIONS = [
  { key: "blood_lipid", label: "血脂异常" },
  { key: "blood_sugar", label: "血糖偏高" },
  { key: "uric_acid", label: "尿酸偏高" },
  { key: "overweight", label: "体重超标（BMI ≥ 24）" },
];

/** 脉象自评选项 */
export const PULSE_OPTIONS = {
  strength: ["有力", "无力", "适中"],
  depth: ["轻按即得", "重按才得"],
  width: ["细如线", "宽大", "紧绷如弦"],
  rhythm: ["整齐", "时有停跳"],
} as const;

/**
 * 专家模式脉象选项（28 脉齐备：结代合为一项，另附疾脉；可扩展）。
 * key 即 signs.ts 的脉象体征 key；专家模式录入直接产体征。
 */
export const EXPERT_PULSE_OPTIONS = [
  { key: "pulse_fu", label: "浮", desc: "轻取即得，重按稍减" },
  { key: "pulse_chen", label: "沉", desc: "轻取不应，重按始得" },
  { key: "pulse_chi", label: "迟", desc: "一息不足四至（<60 次/分）" },
  { key: "pulse_shuo", label: "数", desc: "一息五至以上（>90 次/分）" },
  { key: "pulse_hua", label: "滑", desc: "往来流利，如珠走盘" },
  { key: "pulse_se", label: "涩", desc: "往来艰涩，如轻刀刮竹" },
  { key: "pulse_xu", label: "虚", desc: "举按无力，三部皆虚" },
  { key: "pulse_shi", label: "实", desc: "举按皆有力" },
  { key: "pulse_chang", label: "长", desc: "首尾端直，超过本位" },
  { key: "pulse_duan", label: "短", desc: "首尾俱短，不及本位" },
  { key: "pulse_hong", label: "洪", desc: "来盛去衰，如波涛汹涌" },
  { key: "pulse_wei", label: "微", desc: "极细极软，似有似无" },
  { key: "pulse_jin", label: "紧", desc: "绷急有力，如转绳索" },
  { key: "pulse_huan", label: "缓", desc: "一息四至，怠缓不整" },
  { key: "pulse_kou", label: "芤", desc: "浮大中空，如按葱管" },
  { key: "pulse_xian", label: "弦", desc: "端直以长，如按琴弦" },
  { key: "pulse_ge", label: "革", desc: "浮而搏指，中空外坚如按鼓皮" },
  { key: "pulse_lao", label: "牢", desc: "沉实大弦长，按之坚牢不移" },
  { key: "pulse_ru", label: "濡", desc: "浮细而软" },
  { key: "pulse_ruo", label: "弱", desc: "沉细无力而软" },
  { key: "pulse_san", label: "散", desc: "浮散无根，至数不齐——若伴气短汗出面白，属危重之象，应立即就医" },
  { key: "pulse_xi", label: "细", desc: "脉细如线，应指明显" },
  { key: "pulse_fuz", label: "伏", desc: "重按推筋着骨始得" },
  { key: "pulse_dong", label: "动", desc: "滑数短促如豆，动摇不定" },
  { key: "pulse_cu", label: "促", desc: "数而时一止，止无定数" },
  { key: "pulse_jiedai", label: "结代", desc: "缓而时止，止有定数或良久方来" },
  { key: "pulse_ji", label: "疾", desc: "一息七至以上（>120 次/分）" },
] as const;

/** 闻诊自评选项 */
export const LISTENING_OPTIONS = {
  voice: ["洪亮", "低微", "嘶哑"],
  cough: ["无", "有"],
  breath: ["无", "口干口苦", "口黏", "口气重"],
} as const;
