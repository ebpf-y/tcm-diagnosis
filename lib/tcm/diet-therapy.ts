/**
 * 食疗方案库（25 方）
 *
 * 遵循《千金要方·食治》「食能排邪而安脏腑」的原则，每个证候配 1~2 个食疗方。
 * 含食材、做法、服法、宜忌与食疗机理（食材性味归经与对证关系），
 * 均用药食同源之品，安全性高。
 */

import type { PatternId } from "./patterns";

export interface DietTherapy {
  key: string;
  name: string;
  /** 适用证候 */
  patternIds: PatternId[];
  /** 食材 */
  ingredients: string[];
  /** 做法 */
  method: string;
  /** 服法 */
  usage: string;
  /** 宜忌 */
  cautions: string;
  /** 食疗机理（性味归经与对证关系） */
  rationale: string;
}

export const DIET_THERAPIES: Record<string, DietTherapy> = {
  shanyao_zhou: {
    key: "shanyao_zhou",
    name: "山药红枣粥",
    patternIds: ["piqixu", "ganyu_pixu"],
    ingredients: ["鲜山药 100g（或干山药片 30g）", "红枣 5 枚", "粳米 100g"],
    method: "山药去皮切块，与红枣、粳米同煮为粥。",
    usage: "每日 1 次，作早餐温服，可长期食用。",
    cautions: "湿盛胀满者少食红枣；糖尿病患者控制用量。",
    rationale:
      "山药甘平，入脾肺肾三经，健脾益气、涩精止泻；红枣甘温入脾胃，补中益气、养血安神；粳米养胃和中。药食平和，补脾益气而不滋腻。",
  },
  shenqi_yimi_zhou: {
    key: "shenqi_yimi_zhou",
    name: "参芪薏苡仁粥",
    patternIds: ["piqixu", "feiqixu", "tanshi_zhongzu"],
    ingredients: ["党参 10g", "黄芪 10g", "薏苡仁 30g", "粳米 60g"],
    method: "党参、黄芪布包先煎 30 分钟取汁，以药汁煮薏苡仁、粳米为粥。",
    usage: "每日 1 次温服，连服 1~2 周。",
    cautions: "感冒发热期间停服；阴虚火旺者不宜。",
    rationale:
      "党参、黄芪甘温，补气健脾、益肺固表；薏苡仁甘淡微寒，健脾渗湿。补气与利湿并行，使脾运复而湿邪去，正合脾虚夹湿之病机。",
  },
  ganjiang_zhou: {
    key: "ganjiang_zhou",
    name: "干姜粥",
    patternIds: ["piyangxu"],
    ingredients: ["干姜 3g", "高良姜 3g", "粳米 60g"],
    method: "干姜、高良姜煎汁去渣，以汁煮粳米为粥。",
    usage: "每日 1 次，晨起温服。",
    cautions: "阴虚内热、胃热呕吐者忌用；孕妇慎用。",
    rationale:
      "干姜辛热入脾胃，温中散寒、回阳通脉；高良姜辛热，温胃散寒止痛。二姜相须温运中阳，以粳米顾护胃气，防辛热耗散太过。",
  },
  danggui_shengjiang_yangrou: {
    key: "danggui_shengjiang_yangrou",
    name: "当归生姜羊肉汤",
    patternIds: ["piyangxu", "qixue_liangxu"],
    ingredients: ["当归 15g", "生姜 30g", "羊肉 250g"],
    method: "羊肉焯水去膻，与当归、生姜同炖 1.5~2 小时，调味食肉饮汤。此方出自《金匮要略》，为药食同疗之祖方。",
    usage: "每周 1~2 次，冬季食用最佳。",
    cautions: "阴虚火旺、湿热内盛者忌用；感冒发热期间停服。",
    rationale:
      "当归养血活血，生姜温中散寒，羊肉甘温入脾肾、温补脾肾之阳，合奏温中补血、祛寒止痛之功。出自《金匮要略》，为药食同疗之祖方。",
  },
  duzhong_yangrou: {
    key: "duzhong_yangrou",
    name: "杜仲核桃炖羊肉",
    patternIds: ["shenyangxu"],
    ingredients: ["杜仲 15g", "核桃仁 30g", "羊肉 250g", "生姜 3 片"],
    method: "羊肉焯水，与杜仲（布包）、核桃、生姜同炖 2 小时，去药包调味食用。",
    usage: "每周 1~2 次，冬季尤宜。",
    cautions: "阴虚火旺者忌用；感冒发热期间停服。",
    rationale:
      "杜仲甘温入肝肾，补肝肾、强腰膝；核桃仁甘温，补肾温肺、纳气润肠；羊肉温补脾肾之阳。共奏温肾助阳、强筋壮骨之功。",
  },
  hutaoren_zhou: {
    key: "hutaoren_zhou",
    name: "核桃芡实粥",
    patternIds: ["shenyangxu"],
    ingredients: ["核桃仁 30g", "芡实 20g", "粳米 60g"],
    method: "芡实先浸泡 2 小时，与核桃仁、粳米同煮为粥。",
    usage: "每日 1 次温服。",
    cautions: "大便干结者芡实减量；感冒发热期间停服。",
    rationale:
      "核桃仁补肾助阳，芡实甘涩平、益肾固精、健脾止泻。脾肾双补而兼固涩下元，于肾阳不足之久泻、夜尿者相宜。",
  },
  gouqi_sangshen_zhou: {
    key: "gouqi_sangshen_zhou",
    name: "枸杞桑葚粥",
    patternIds: ["shenyinxu", "ganxue_xu", "xinshen_bujiao"],
    ingredients: ["枸杞子 15g", "桑葚 20g（干品）", "粳米 60g"],
    method: "粳米煮粥，临熟前 10 分钟入枸杞子、桑葚同煮。",
    usage: "每日 1 次，可作晚餐。",
    cautions: "脾虚便溏者少食；糖尿病患者控制用量。",
    rationale:
      "枸杞子滋补肝肾、益精明目，桑葚滋阴补血、生津润燥，二者皆入肝肾。滋而不腻、阴血同补，肾阴肝血两顾。",
  },
  baihe_yiner_geng: {
    key: "baihe_yiner_geng",
    name: "百合银耳羹",
    patternIds: ["shenyinxu", "weiyinxu"],
    ingredients: ["百合 30g", "银耳 10g", "冰糖适量"],
    method: "银耳泡发撕小朵，与百合同炖 1 小时至黏稠，加冰糖溶化。",
    usage: "每日 1 次，午后或睡前温服。",
    cautions: "痰湿盛者少食；风寒咳嗽者不宜。",
    rationale:
      "百合养阴润肺、清心安神，银耳滋阴润燥、养胃生津。甘凉清润，滋肺胃之阴而不腻膈，阴亏燥盛者宜之。",
  },
  longyan_lianzi_zhou: {
    key: "longyan_lianzi_zhou",
    name: "龙眼莲子粥",
    patternIds: ["xinpi_liangxu"],
    ingredients: ["龙眼肉 15g", "莲子 20g（去心）", "红枣 5 枚", "粳米 60g"],
    method: "莲子先煮半小时，再入龙眼肉、红枣、粳米同煮为粥。",
    usage: "每日 1 次，睡前 2 小时温服。",
    cautions: "湿热内盛、痰火扰心之失眠者不宜；糖尿病患者控制用量。",
    rationale:
      "龙眼肉甘温，补益心脾、养血安神；莲子甘涩平，健脾益肾、养心安神。心脾同治、气血兼顾，正合劳伤心脾之病机。",
  },
  hongzao_danggui_dan: {
    key: "hongzao_danggui_dan",
    name: "红枣当归煮蛋",
    patternIds: ["xinpi_liangxu", "qixue_liangxu"],
    ingredients: ["当归 10g", "红枣 6 枚", "鸡蛋 2 枚", "红糖适量"],
    method: "鸡蛋煮熟去壳，与当归、红枣同煮 30 分钟，加红糖调味，食蛋饮汤。",
    usage: "每周 2~3 次。",
    cautions: "湿热内盛者不宜；感冒发热期间停服。",
    rationale:
      "当归补血活血，红枣健脾养血，鸡蛋滋阴润燥养血。气血双补而取效平和，血虚诸证日常调食之便方。",
  },
  meiguihua_cha: {
    key: "meiguihua_cha",
    name: "玫瑰花茶",
    patternIds: ["ganyu_qizhi", "qizhi_xueyu"],
    ingredients: ["干玫瑰花 3~5g"],
    method: "沸水冲泡，加盖焖 5 分钟代茶饮。",
    usage: "每日 1~2 杯，可长期饮用。",
    cautions: "月经量过多者经期停用；孕妇慎用。",
    rationale:
      "玫瑰花甘微苦温，入肝脾二经，行气解郁、和血散瘀。芳香疏泄、轻灵透达，最宜肝气郁结之轻证日常调饮。",
  },
  foshou_chenpi_zhou: {
    key: "foshou_chenpi_zhou",
    name: "佛手陈皮粥",
    patternIds: ["ganyu_qizhi", "ganyu_pixu"],
    ingredients: ["佛手 10g", "陈皮 6g", "粳米 60g"],
    method: "佛手、陈皮煎汁去渣，以汁煮粳米为粥。",
    usage: "每日 1 次温服，连服 1 周。",
    cautions: "阴虚火旺者少食；气虚者佛手减量。",
    rationale:
      "佛手辛苦温，疏肝理气、和胃止痛；陈皮辛苦温，理气健脾、燥湿化痰。肝脾同调、疏而不燥，肝郁及脾者两宜。",
  },
  juhua_juemingzi_cha: {
    key: "juhua_juemingzi_cha",
    name: "菊花决明子茶",
    patternIds: ["ganhuo_shangyan"],
    ingredients: ["杭白菊 5g", "炒决明子 10g"],
    method: "决明子捣碎，与菊花同用沸水冲泡代茶饮。",
    usage: "每日 1~2 杯。",
    cautions: "脾胃虚寒、便溏者不宜；低血压者慎用决明子。",
    rationale:
      "菊花辛甘苦微寒，疏风清热、平肝明目；决明子苦甘微寒，清肝明目、润肠通便。二药相须，清泻肝火而兼利头目，肝火上炎者宜。",
  },
  lvdou_tang: {
    key: "lvdou_tang",
    name: "绿豆汤",
    patternIds: ["ganhuo_shangyan"],
    ingredients: ["绿豆 60g", "冰糖适量"],
    method: "绿豆煮至开花，加冰糖调味，取汤饮用。",
    usage: "暑热季节每日 1 次。",
    cautions: "脾胃虚寒者少食；服药期间不宜大量饮用（解药性）。",
    rationale: "绿豆甘寒，清热解毒、消暑利水。甘寒而不伤胃，为清解暑热之常食。",
  },
  zhugan_bocai: {
    key: "zhugan_bocai",
    name: "菠菜猪肝汤",
    patternIds: ["ganxue_xu"],
    ingredients: ["猪肝 100g", "菠菜 150g", "生姜 2 片"],
    method: "猪肝切片焯水，与姜片同煮 10 分钟，下菠菜稍煮调味。",
    usage: "每周 2~3 次。",
    cautions: "高胆固醇血症、痛风患者少食猪肝。",
    rationale:
      "猪肝甘苦温，入肝经，补肝养血明目，取「以脏补脏」之义；菠菜甘凉，养血滋阴润燥。肝血得养则目明筋柔。",
  },
  huangqi_dunji: {
    key: "huangqi_dunji",
    name: "黄芪炖鸡",
    patternIds: ["feiqixu"],
    ingredients: ["黄芪 20g", "童子鸡半只", "红枣 5 枚", "生姜 3 片"],
    method: "鸡焯水，与黄芪（布包）、红枣、生姜同炖 1.5 小时，去药包调味食用。",
    usage: "每周 1~2 次。",
    cautions: "感冒发热期间停服；阴虚火旺者不宜。",
    rationale:
      "黄芪甘微温，补气升阳、益卫固表；鸡肉甘温，温中益气、补精填髓。药食相须，补气之力醇厚，肺脾气虚、卫表不固者宜。",
  },
  shengjiang_hongtang_shui: {
    key: "shengjiang_hongtang_shui",
    name: "生姜红糖水",
    patternIds: ["fenghan_shubiao"],
    ingredients: ["生姜 15g（带皮拍碎）", "红糖 20g", "葱白 3 段"],
    method: "生姜、葱白加水煮 10 分钟，调入红糖趁热饮服。",
    usage: "感冒初起趁热顿服，覆被取微汗。",
    cautions: "风热感冒（咽痛、黄痰）忌用；糖尿病患者去红糖。",
    rationale:
      "生姜辛温，解表散寒；葱白辛温通阳；红糖甘温补中。辛甘化阳，散寒解表而不伤正，风寒束表初起最宜。",
  },
  congbai_douchi_tang: {
    key: "congbai_douchi_tang",
    name: "葱白豆豉汤",
    patternIds: ["fenghan_shubiao"],
    ingredients: ["葱白 5 段（连须）", "淡豆豉 15g"],
    method: "加水煎 10 分钟，趁热饮服。此方化裁自《肘后方》葱豉汤。",
    usage: "感冒初起每日 1~2 次。",
    cautions: "风热感冒不宜；汗出过多者慎用。",
    rationale:
      "葱白辛温通阳发汗，淡豆豉辛凉解表除烦，一温一凉、相制相成。轻清宣散、解表而不伤津，化裁自《肘后方》葱豉汤。",
  },
  sangju_cha: {
    key: "sangju_cha",
    name: "桑菊饮（代茶）",
    patternIds: ["fengre_fanbiao"],
    ingredients: ["桑叶 6g", "菊花 6g", "薄荷 3g", "芦根 10g"],
    method: "沸水冲泡或略煎 5 分钟，代茶饮。化裁自《温病条辨》桑菊饮。",
    usage: "每日 2~3 次温服。",
    cautions: "风寒咳嗽不宜；脾胃虚寒者少服。",
    rationale:
      "桑叶、菊花辛凉轻清，疏风清热、宣肺止咳；薄荷助其疏散，芦根清热生津。取吴鞠通「治上焦如羽，非轻不举」之义。",
  },
  bingtang_xueli: {
    key: "bingtang_xueli",
    name: "冰糖炖雪梨",
    patternIds: ["fengre_fanbiao"],
    ingredients: ["雪梨 1 枚", "冰糖 10g", "川贝母粉 2g（可选）"],
    method: "雪梨去核纳入冰糖（川贝粉），隔水炖 40 分钟，食梨饮汁。",
    usage: "每日 1 次，燥热咳嗽咽干者尤宜。",
    cautions: "风寒咳嗽、痰湿咳嗽者不宜；糖尿病患者去冰糖。",
    rationale:
      "雪梨甘寒，生津润燥、清热化痰；冰糖甘平，润肺止咳。甘寒濡润，风热燥邪伤津之咳者宜。",
  },
  yimi_donggua_tang: {
    key: "yimi_donggua_tang",
    name: "薏苡仁冬瓜汤",
    patternIds: ["tanshi_zhongzu", "shire_yunpi"],
    ingredients: ["薏苡仁 40g", "冬瓜 300g（连皮）", "陈皮 3g"],
    method: "薏苡仁先煮 30 分钟，下冬瓜、陈皮再煮 20 分钟，淡食或少盐。",
    usage: "每日 1 次，可常食。",
    cautions: "孕妇慎用薏苡仁；脾虚无湿者不宜多食。",
    rationale:
      "薏苡仁甘淡，健脾渗湿；冬瓜甘淡微寒，清热利水；陈皮理气和中。淡渗利湿而不伤阴，湿去则脾运自复。",
  },
  lvdou_yimi_tang: {
    key: "lvdou_yimi_tang",
    name: "绿豆薏苡仁汤",
    patternIds: ["shire_yunpi"],
    ingredients: ["绿豆 40g", "薏苡仁 40g", "荷叶半张（可选）"],
    method: "绿豆、薏苡仁同煮至开花，入荷叶再煮 5 分钟，取汤饮用。",
    usage: "暑湿季节每日 1 次。",
    cautions: "脾胃虚寒者少食；孕妇慎用薏苡仁。",
    rationale:
      "绿豆清热解毒，薏苡仁利湿健脾，荷叶清暑化湿、升发清阳。清利并行，暑湿与湿热两解。",
  },
  shashen_maidong_zhou: {
    key: "shashen_maidong_zhou",
    name: "沙参麦冬粥",
    patternIds: ["weiyinxu"],
    ingredients: ["北沙参 10g", "麦冬 10g", "石斛 6g（可选）", "粳米 60g", "冰糖适量"],
    method: "沙参、麦冬、石斛煎汁去渣，以汁煮粳米为粥，加冰糖调味。化裁自《温病条辨》沙参麦冬汤。",
    usage: "每日 1 次温服。",
    cautions: "脾胃虚寒便溏者不宜；感冒发热期间停服。",
    rationale:
      "北沙参、麦冬甘寒入肺胃，养阴生津、益胃润燥；石斛益胃生津。甘凉濡润，复胃阴而助受纳，化裁自《温病条辨》沙参麦冬汤。",
  },
  lianzi_baihe_zhou: {
    key: "lianzi_baihe_zhou",
    name: "莲子百合粥",
    patternIds: ["xinshen_bujiao"],
    ingredients: ["莲子 20g（带心）", "百合 30g", "粳米 60g"],
    method: "莲子带心（清心火）与百合、粳米同煮为粥。",
    usage: "每日 1 次，晚餐食用。",
    cautions: "大便干结者莲子去心并减量；风寒咳嗽者不宜。",
    rationale:
      "莲子带心，上清心火、下补肾水；百合养阴清心、安神定志。水火并调，心肾不交之不寐心烦者宜。",
  },
  shanzha_hongtang_shui: {
    key: "shanzha_hongtang_shui",
    name: "山楂红糖水",
    patternIds: ["qizhi_xueyu"],
    ingredients: ["山楂 15g", "红糖 15g"],
    method: "山楂煎水 15 分钟，调入红糖温服。",
    usage: "每日 1 次，经前 3~5 天开始饮用尤宜。",
    cautions: "孕妇忌用（山楂活血）；胃酸过多、胃溃疡者慎用；月经量多者经期停用。",
    rationale:
      "山楂酸甘微温，消食化积、活血散瘀；红糖甘温，补中缓急、活血化瘀。化瘀而不伤正，痛经血块者经前饮用尤宜。",
  },
};

/** 全部食疗 key */
export const DIET_KEYS = Object.keys(DIET_THERAPIES);
