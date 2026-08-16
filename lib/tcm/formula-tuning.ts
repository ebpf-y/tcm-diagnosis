/**
 * 方剂调优表：方内选方规则 + 动态加减规则
 *
 * 与 formulas.ts 分离存放：formulas.ts 是静态知识库（原方原貌），
 * 本表是规则引擎用的"个体化"元数据——
 *
 * - favorSigns：同证多首方剂时的选方依据。命中这些体征说明该方
 *   比同证其他方更对证（如脾气虚兼便溏 → 参苓白术散优于四君子汤）。
 *   引擎按命中数排序并生成推荐理由；未命中任何 favorSigns 的方
 *   视为该证基础方。
 * - modRules：动态加减。命中指定体征时，把对应加减法从静态文本
 *   「落实」为针对该用户的个体化加减建议（供医师参考）。
 */

/** 动态加减规则 */
export interface ModRule {
  /** 触发体征（signs.ts 的 key，命中任意一个即触发） */
  signs: string[];
  /** 加减建议文本 */
  text: string;
}

export interface FormulaTuning {
  /** 选方倾向体征 */
  favorSigns?: string[];
  /** 动态加减规则 */
  modRules?: ModRule[];
}

/**
 * 方剂禁忌标签（供禁忌交叉校验 checkContraindications）。
 * 标签为用户条件词表：高血压 / 心脑血管疾病 / 消化道溃疡 /
 * 正在服用抗凝/抗血小板药物 / 儿童 / 老年 / 感冒发热 / 便溏 / 阴虚内热。
 * 依据各方 cautions 文本提取，命中即生成警示，不再仅靠静态文本。
 */
export const CONTRA_TAGS: Record<string, string[]> = {
  mahuang: ["高血压", "心脑血管疾病", "儿童", "老年"],
  buzhong_yiqi: ["高血压"],
  fuzilizhong: ["儿童", "老年", "阴虚内热"],
  jingui_shenqi: ["阴虚内热", "儿童", "老年"],
  yougui: ["阴虚内热", "儿童", "老年"],
  liuwei_dihuang: ["便溏", "感冒发热"],
  zuogui: ["便溏", "感冒发热"],
  sijunzi: ["感冒发热"],
  shenlingbaizhu: ["感冒发热"],
  guipi: ["感冒发热"],
  bazhen: ["感冒发热"],
  shiquan_dabu: ["感冒发热"],
  yupingfeng: ["感冒发热"],
  bugan: ["便溏", "感冒发热"],
  yangxin: ["感冒发热"],
  siwu: ["便溏"],
  tianwang_buxin: ["便溏"],
  suanzaoren: ["便溏"],
  yiwei: ["便溏"],
  shashen_maidong: ["便溏"],
  longdan_xiegan: ["便溏"],
  xuefu_zhuyu: ["消化道溃疡", "正在服用抗凝/抗血小板药物"],
  taohong_siwu: ["消化道溃疡", "正在服用抗凝/抗血小板药物"],
};

export const FORMULA_TUNING: Record<string, FormulaTuning> = {
  // ---------- 脾气虚 ----------
  shenlingbaizhu: {
    favorSigns: ["sym_diarrhea", "sym_stool_sticky"], // 脾虚夹湿泄泻者优
    modRules: [
      { signs: ["sym_cold"], text: "兼腹中冷痛，加干姜" },
    ],
  },
  buzhong_yiqi: {
    favorSigns: ["sym_short_breath", "sym_low_voice"], // 中气下陷、劳倦内伤者优
  },
  // ---------- 脾阳虚 ----------
  fuzilizhong: {
    favorSigns: ["sym_cold", "sym_dawn_diarrhea"], // 中寒较甚、五更泄者优
  },
  // ---------- 肾阳虚 ----------
  jingui_shenqi: {
    favorSigns: ["sym_urine_clear", "face_edema"], // 化气行水，阳虚水泛者优
    modRules: [
      { signs: ["face_edema"], text: "水肿明显，加车前子、牛膝（济生肾气丸意）" },
      { signs: ["sym_zaoxie", "sym_yijing"], text: "阳痿滑精，加鹿茸、淫羊藿" },
    ],
  },
  yougui: {
    favorSigns: ["sym_yijing", "sym_zaoxie", "sym_lowerback"], // 精亏滑泄、腰膝冷痛者优
  },
  // ---------- 肾阴虚 ----------
  zuogui: {
    favorSigns: ["sym_lowerback", "sym_tinnitus"], // 真阴亏虚较重者优
  },
  // ---------- 心脾两虚 / 气血两虚 / 肝血虚 ----------
  guipi: {
    favorSigns: ["sym_insomnia", "sym_palpitation"], // 劳伤心脾、怔忡不寐者优
    modRules: [
      { signs: ["sym_insomnia"], text: "失眠较重，加夜交藤、合欢皮" },
      { signs: ["sym_menses_light"], text: "血虚明显，加熟地黄、白芍" },
    ],
  },
  yangxin: {
    favorSigns: ["sym_palpitation", "sym_forgetful"], // 心血不足、心神不宁偏重者优
  },
  shiquan_dabu: {
    favorSigns: ["sym_cold", "sym_fatigue"], // 气血两虚兼虚寒者优
  },
  siwu: {
    favorSigns: ["sym_menses_light"], // 血虚月经不调者优
  },
  bugan: {
    favorSigns: ["sym_numbness", "sym_insomnia"], // 肝血不足、筋脉失养者优
  },
  taohong_siwu: {
    favorSigns: ["sym_dysmenorrhea", "sym_pain"], // 血虚夹瘀、痛经刺痛者优
  },
  // ---------- 肝郁 / 肝火 ----------
  chaihu_shugan: {
    favorSigns: ["sym_bloating", "sym_belching", "sym_hypochondriac"], // 气滞胀痛明显者优
    modRules: [
      { signs: ["sym_irritable", "tongue_red"], text: "气郁化火，加栀子、牡丹皮" },
    ],
  },
  sini: {
    favorSigns: ["sym_hypochondriac", "sym_mood"], // 阳郁气滞、胸胁不舒者优
  },
  xiaoyao: {
    favorSigns: ["sym_mood", "sym_appetite"], // 肝郁兼脾弱者优
    modRules: [
      { signs: ["sym_irritable", "tongue_red", "coating_yellow"], text: "郁久化热，加牡丹皮、栀子（加味逍遥散意）" },
    ],
  },
  longdan_xiegan: {
    favorSigns: ["sym_bitter", "sym_urine_yellow"], // 肝胆实火湿热俱盛者优
  },
  danzhi_xiaoyao: {
    favorSigns: ["sym_irritable", "sym_mood"], // 肝郁化火、火势不甚者优
  },
  // ---------- 肺气虚 / 表证 ----------
  yupingfeng: {
    favorSigns: ["sym_sweat", "sym_catch_cold"], // 表虚自汗、易感者优
    modRules: [
      { signs: ["sym_sweat"], text: "自汗甚，加浮小麦、煅牡蛎" },
    ],
  },
  mahuang: {
    favorSigns: ["sym_fever", "sym_runny_nose"], // 风寒表实无汗者优
  },
  jingfang_baidu: {
    favorSigns: ["sym_fatigue", "sym_phlegm"], // 体虚外感或夹湿者优
  },
  yinqiao: {
    favorSigns: ["sym_sore_throat", "sym_fever"], // 热重咽痛者优
  },
  sangju: {
    favorSigns: ["sym_cough"], // 咳重热轻者优
  },
  // ---------- 痰湿 / 湿热 ----------
  erchen: {
    favorSigns: ["sym_phlegm"], // 痰湿咳嗽、痰多者优
    modRules: [
      { signs: ["coating_yellow", "sym_urine_yellow"], text: "痰热，加黄芩、瓜蒌" },
      { signs: ["sym_appetite"], text: "兼食积，加山楂、神曲" },
    ],
  },
  pingwei: {
    favorSigns: ["sym_bloating", "sym_sticky_mouth"], // 湿滞脾胃、痞满者优
  },
  huoxiang_zhengqi: {
    favorSigns: ["sym_diarrhea", "sym_runny_nose"], // 外感风寒、内伤湿滞者优
  },
  ganlu_xiaodu: {
    favorSigns: ["sym_fever", "sym_urine_yellow"], // 湿热并重、身热者优
  },
  // ---------- 胃阴虚 / 心肾不交 ----------
  yiwei: {
    favorSigns: ["sym_dry"], // 胃阴不足、口干纳差者优
  },
  shashen_maidong: {
    favorSigns: ["sym_dry", "sym_cough"], // 燥伤肺胃阴分者优
  },
  tianwang_buxin: {
    favorSigns: ["sym_insomnia", "sym_forgetful"], // 阴亏血少、虚烦不寐者优
    modRules: [
      { signs: ["sym_night_sweat"], text: "盗汗，加浮小麦、煅牡蛎" },
      { signs: ["sym_irritable"], text: "心烦重，加黄连" },
    ],
  },
  suanzaoren: {
    favorSigns: ["sym_insomnia", "sym_heat"], // 肝血不足、虚热内扰者优
    modRules: [
      { signs: ["sym_palpitation"], text: "心悸，加龙骨、牡蛎" },
    ],
  },
  jiaotai: {
    favorSigns: ["sym_irritable", "sym_heat"], // 心火偏亢、心烦明显者优
  },
  // ---------- 气滞血瘀 ----------
  xuefu_zhuyu: {
    favorSigns: ["sym_pain", "sym_hypochondriac"], // 胸中血府血瘀、刺痛者优
    modRules: [
      { signs: ["sym_pain"], text: "痛甚，加延胡索、五灵脂" },
      { signs: ["sym_dysmenorrhea"], text: "痛经经闭，加益母草、泽兰" },
    ],
  },
  // ---------- 痞证 / 经方补充 ----------
  banxia_xiexin: {
    favorSigns: ["sym_stuffiness", "sym_nausea"], // 痞满呕恶者正对其证
  },
  xiaochaihu: {
    favorSigns: ["sym_hypochondriac", "sym_bitter"], // 少阳枢机不利（胁满口苦）者优
  },
  guizhi: {
    favorSigns: ["sym_sweat"], // 风寒表虚有汗者优（无汗表实仍用麻黄汤）
  },
  wuling: {
    favorSigns: ["face_edema"], // 水湿内停、气化不利兼浮肿者优
  },
  sijunzi: {
    modRules: [
      { signs: ["sym_phlegm", "coating_thick_greasy"], text: "兼痰湿，加陈皮、半夏（六君子汤意）" },
      { signs: ["sym_bloating", "sym_belching"], text: "兼气滞，加木香、砂仁（香砂六君子汤意）" },
    ],
  },
  lizhong: {
    modRules: [
      { signs: ["sym_cold"], text: "寒甚，加附子（附子理中汤意）" },
    ],
  },
};
