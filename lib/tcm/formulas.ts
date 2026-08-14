/**
 * 经典方剂库（27 首）
 *
 * 组成与剂量以《伤寒论》《金匮要略》《太平惠民和剂局方》《脾胃论》
 * 《景岳全书》《温病条辨》等所载原方为准，剂量为现代汤剂常用参考量（克）。
 * 每首方剂含：出处、组成、煎服法、功效、方解（君臣佐使配伍机理）、
 * 主治证候、加减要点、禁忌、中成药参考。
 * 所有方剂仅供学习参考，须在执业中医师辨证指导下使用。
 */

import type { PatternId } from "./patterns";

export interface FormulaIngredient {
  /** 药味名 */
  name: string;
  /** 现代参考剂量（克），特殊标注如「后下」「冲服」写入 note */
  dose: string;
  note?: string;
}

export interface Formula {
  key: string;
  name: string;
  /** 出处 */
  source: string;
  /** 组成 */
  ingredients: FormulaIngredient[];
  /** 煎服法 */
  preparation: string;
  /** 功效 */
  functions: string;
  /** 方解（君臣佐使与配伍机理） */
  analysis: string;
  /** 主治证候（patterns.ts 的 id） */
  patternIds: PatternId[];
  /** 加减要点 */
  modifications: string;
  /** 禁忌与特殊人群提示 */
  cautions: string;
  /** 中成药参考 */
  patent: string;
}

/** 通用提示：常规水煎服法 */
const DECOCTION_STD = "水煎服，每日 1 剂，加水适量，武火煮沸后文火煎 25~30 分钟，取汁分早晚两次温服。";

export const FORMULAS: Record<string, Formula> = {
  sijunzi: {
    key: "sijunzi",
    name: "四君子汤",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "人参（或党参）", dose: "9g" },
      { name: "白术", dose: "9g" },
      { name: "茯苓", dose: "9g" },
      { name: "炙甘草", dose: "6g" },
    ],
    preparation: DECOCTION_STD,
    functions: "益气健脾",
    analysis:
      "人参为君，大补元气、健脾养胃；白术为臣，健脾燥湿；茯苓为佐，渗湿健脾，与白术相伍则湿去脾健；炙甘草为使，益气和中、调和诸药。四药皆平和，不燥不腻，取「君子致中和」之义。",
    patternIds: ["piqixu"],
    modifications: "兼痰湿加陈皮、半夏（六君子汤）；兼气滞加木香、砂仁（香砂六君子汤）。",
    cautions: "阴虚内热者慎用；感冒发热期间停服。",
    patent: "四君子丸、香砂六君丸",
  },
  shenlingbaizhu: {
    key: "shenlingbaizhu",
    name: "参苓白术散",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "人参（或党参）", dose: "9g" },
      { name: "白术", dose: "12g" },
      { name: "茯苓", dose: "12g" },
      { name: "山药", dose: "12g" },
      { name: "白扁豆", dose: "9g" },
      { name: "莲子肉", dose: "9g" },
      { name: "薏苡仁", dose: "9g" },
      { name: "砂仁", dose: "6g", note: "后下" },
      { name: "桔梗", dose: "6g" },
      { name: "炙甘草", dose: "6g" },
    ],
    preparation: "原方为散剂，枣汤调下；作汤剂参考上述剂量，" + DECOCTION_STD,
    functions: "益气健脾，渗湿止泻",
    analysis:
      "以四君子汤益气健脾为基，加山药、莲子肉、白扁豆、薏苡仁健脾渗湿止泻为臣；砂仁醒脾和胃、行气化滞为佐，使补而不滞；桔梗宣肺利气、载药上行，寓培土生金之意为使。全方补中寓泻，为脾虚夹湿泄泻之常用方。",
    patternIds: ["piqixu"],
    modifications: "久泻不止加肉豆蔻、诃子；兼腹中冷痛加干姜。",
    cautions: "湿热泄泻者不宜；感冒发热期间停服。",
    patent: "参苓白术丸（散）",
  },
  buzhong_yiqi: {
    key: "buzhong_yiqi",
    name: "补中益气汤",
    source: "《脾胃论》",
    ingredients: [
      { name: "黄芪", dose: "18g" },
      { name: "人参（或党参）", dose: "9g" },
      { name: "白术", dose: "9g" },
      { name: "炙甘草", dose: "9g" },
      { name: "当归", dose: "3g" },
      { name: "陈皮", dose: "6g" },
      { name: "升麻", dose: "6g" },
      { name: "柴胡", dose: "6g" },
    ],
    preparation: DECOCTION_STD,
    functions: "补中益气，升阳举陷",
    analysis:
      "重用黄芪为君，补中益气、升阳固表；人参、白术、炙甘草健脾益气为臣；当归养血和营，陈皮理气和胃、使补而不滞，共为佐；升麻、柴胡升举清阳、引诸药上行为使。补气与升提并用，体现李东垣「甘温除热」之法。",
    patternIds: ["piqixu", "feiqixu"],
    modifications: "中气下陷之脱肛、子宫脱垂加枳壳；自汗加浮小麦、牡蛎。",
    cautions: "阴虚发热、肝阳上亢者忌用；高血压患者慎用，须医师评估。",
    patent: "补中益气丸",
  },
  lizhong: {
    key: "lizhong",
    name: "理中丸（汤）",
    source: "《伤寒论》",
    ingredients: [
      { name: "人参（或党参）", dose: "9g" },
      { name: "干姜", dose: "9g" },
      { name: "白术", dose: "9g" },
      { name: "炙甘草", dose: "9g" },
    ],
    preparation: "原方为丸剂；作汤剂（人参汤）参考上述剂量，" + DECOCTION_STD,
    functions: "温中祛寒，补气健脾",
    analysis:
      "干姜大辛大热为君，温中散寒；人参补气健脾为臣，温补并行；白术健脾燥湿为佐；炙甘草益气和中、调和诸药为使。丸者缓也，中焦虚寒之证徐徐温之，阳气复则寒凝自散。",
    patternIds: ["piyangxu"],
    modifications: "寒甚加附子（附子理中汤）；呕吐甚加半夏、生姜。",
    cautions: "阴虚内热、湿热中阻者忌用；孕妇慎用。",
    patent: "理中丸",
  },
  fuzilizhong: {
    key: "fuzilizhong",
    name: "附子理中丸",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "制附子", dose: "6g", note: "先煎 30 分钟" },
      { name: "人参（或党参）", dose: "9g" },
      { name: "干姜", dose: "9g" },
      { name: "白术", dose: "9g" },
      { name: "炙甘草", dose: "9g" },
    ],
    preparation: "附子先煎 30 分钟去麻味，再入余药同煎，取汁分两次温服。",
    functions: "温阳祛寒，补气健脾",
    analysis:
      "理中丸温中健脾，更加附子大辛大热，温肾助阳、散寒止痛，与干姜相须为用，温阳散寒之力倍增。脾阳根于肾阳，脾肾双温，故中焦虚寒之重者宜之。",
    patternIds: ["piyangxu"],
    modifications: "五更泄泻加补骨脂、肉豆蔻（合四神丸意）。",
    cautions: "附子有毒，须炮制合格并先煎，严禁自行增减剂量；孕妇忌用；阴虚阳亢者忌用。",
    patent: "附子理中丸",
  },
  jingui_shenqi: {
    key: "jingui_shenqi",
    name: "金匮肾气丸",
    source: "《金匮要略》",
    ingredients: [
      { name: "干地黄（或熟地黄）", dose: "24g" },
      { name: "山药", dose: "12g" },
      { name: "山茱萸", dose: "12g" },
      { name: "泽泻", dose: "9g" },
      { name: "茯苓", dose: "9g" },
      { name: "牡丹皮", dose: "9g" },
      { name: "桂枝", dose: "3g" },
      { name: "炮附子", dose: "3g", note: "先煎" },
    ],
    preparation: "原方为丸剂；作汤剂参考上述剂量，附子先煎，" + DECOCTION_STD,
    functions: "温补肾阳，化气行水",
    analysis:
      "重用干地黄滋补肾阴为君；山茱萸、山药滋补肝脾、益精固涩为臣；泽泻、茯苓、牡丹皮渗湿泄浊、清泻虚火为佐，寓泻于补、防滋腻碍邪；少佐桂枝、附子温阳化气，取「少火生气」之义，于阴中求阳，使阳有所化。",
    patternIds: ["shenyangxu"],
    modifications: "水肿明显加车前子、牛膝（济生肾气丸）；阳痿早泄加鹿茸、淫羊藿。",
    cautions: "阴虚火旺者忌用；孕妇忌用；含附子，须炮制合格，不可过量久服。",
    patent: "金匮肾气丸、桂附地黄丸",
  },
  yougui: {
    key: "yougui",
    name: "右归丸",
    source: "《景岳全书》",
    ingredients: [
      { name: "熟地黄", dose: "24g" },
      { name: "山药", dose: "12g" },
      { name: "山茱萸", dose: "9g" },
      { name: "枸杞子", dose: "12g" },
      { name: "鹿角胶", dose: "12g", note: "烊化" },
      { name: "菟丝子", dose: "12g" },
      { name: "杜仲", dose: "12g" },
      { name: "当归", dose: "9g" },
      { name: "肉桂", dose: "6g" },
      { name: "制附子", dose: "6g", note: "先煎" },
    ],
    preparation: "原方为丸剂；作汤剂附子先煎、鹿角胶烊化兑入，分两次温服。",
    functions: "温补肾阳，填精益髓",
    analysis:
      "附子、肉桂温补肾阳为君；鹿角胶温肾填精，熟地黄、枸杞子、山茱萸、山药滋阴益肾，取「阴中求阳」之意为臣；菟丝子、杜仲补肝肾、强腰膝，当归养血和血为佐使。纯补无泻，峻补元阳，适用于肾阳亏虚较重者。",
    patternIds: ["shenyangxu"],
    modifications: "阳虚滑精加补骨脂、芡实；便溏去当归加白术。",
    cautions: "阴虚火旺者忌用；孕妇忌用；含附子，须炮制合格。",
    patent: "右归丸",
  },
  liuwei_dihuang: {
    key: "liuwei_dihuang",
    name: "六味地黄丸",
    source: "《小儿药证直诀》",
    ingredients: [
      { name: "熟地黄", dose: "24g" },
      { name: "山茱萸", dose: "12g" },
      { name: "山药", dose: "12g" },
      { name: "泽泻", dose: "9g" },
      { name: "茯苓", dose: "9g" },
      { name: "牡丹皮", dose: "9g" },
    ],
    preparation: "原方为丸剂；作汤剂参考上述剂量，" + DECOCTION_STD,
    functions: "滋阴补肾",
    analysis:
      "熟地黄滋肾填精为君；山茱萸补肝涩精、山药补脾固精为臣，三药并补肝脾肾三阴；泽泻泻肾浊、牡丹皮清肝火、茯苓渗脾湿为佐，是谓三泻，防滋补之腻滞。三补三泻，以补为主，补而不滞，为滋补肾阴之祖方。",
    patternIds: ["shenyinxu"],
    modifications: "虚火明显加知母、黄柏（知柏地黄丸）；目涩加枸杞子、菊花（杞菊地黄丸）。",
    cautions: "脾虚便溏者慎用；感冒发热期间停服。",
    patent: "六味地黄丸、知柏地黄丸、杞菊地黄丸",
  },
  zuogui: {
    key: "zuogui",
    name: "左归丸",
    source: "《景岳全书》",
    ingredients: [
      { name: "熟地黄", dose: "24g" },
      { name: "山药", dose: "12g" },
      { name: "枸杞子", dose: "12g" },
      { name: "山茱萸", dose: "12g" },
      { name: "川牛膝", dose: "9g" },
      { name: "菟丝子", dose: "12g" },
      { name: "鹿角胶", dose: "12g", note: "烊化" },
      { name: "龟板胶", dose: "12g", note: "烊化" },
    ],
    preparation: "原方为丸剂；作汤剂二胶烊化兑入，分两次温服。",
    functions: "滋阴补肾，填精益髓",
    analysis:
      "熟地黄、枸杞子、山茱萸、山药滋补肝肾之阴；龟板胶、鹿角胶为血肉有情之品，峻补精髓，龟鹿相配、阴阳并调；菟丝子、川牛膝益肝肾、强腰膝。纯甘壮水、填补真阴，较六味地黄丸滋补之力更峻。",
    patternIds: ["shenyinxu"],
    modifications: "虚热明显加女贞子、旱莲草；盗汗加煅龙骨、煅牡蛎。",
    cautions: "脾虚便溏者慎用；感冒发热期间停服。",
    patent: "左归丸",
  },
  guipi: {
    key: "guipi",
    name: "归脾汤",
    source: "《济生方》",
    ingredients: [
      { name: "白术", dose: "9g" },
      { name: "茯神", dose: "9g" },
      { name: "黄芪", dose: "12g" },
      { name: "龙眼肉", dose: "12g" },
      { name: "酸枣仁", dose: "12g" },
      { name: "人参（或党参）", dose: "6g" },
      { name: "木香", dose: "6g" },
      { name: "炙甘草", dose: "3g" },
      { name: "当归", dose: "9g" },
      { name: "远志", dose: "6g" },
      { name: "生姜", dose: "3 片" },
      { name: "大枣", dose: "3 枚" },
    ],
    preparation: DECOCTION_STD,
    functions: "益气补血，健脾养心",
    analysis:
      "黄芪、人参、白术、炙甘草健脾益气为君，脾旺则气血生化有源；当归、龙眼肉养血补心为臣；酸枣仁、茯神、远志养心安神，木香理气醒脾、使补而不滞，共为佐；生姜、大枣调和营卫为使。心脾同治、气血双补，为劳伤心脾之名方。",
    patternIds: ["xinpi_liangxu"],
    modifications: "失眠重加夜交藤、合欢皮；血虚明显加熟地黄、白芍。",
    cautions: "阴虚火旺之失眠慎用；感冒发热期间停服。",
    patent: "归脾丸",
  },
  bazhen: {
    key: "bazhen",
    name: "八珍汤",
    source: "《正体类要》",
    ingredients: [
      { name: "人参（或党参）", dose: "9g" },
      { name: "白术", dose: "9g" },
      { name: "茯苓", dose: "9g" },
      { name: "炙甘草", dose: "6g" },
      { name: "当归", dose: "9g" },
      { name: "川芎", dose: "6g" },
      { name: "白芍", dose: "9g" },
      { name: "熟地黄", dose: "9g" },
      { name: "生姜", dose: "3 片" },
      { name: "大枣", dose: "3 枚" },
    ],
    preparation: DECOCTION_STD,
    functions: "益气补血（四君子汤合四物汤）",
    analysis:
      "以四君子汤益气、四物汤养血，气血双补、浑然一体；生姜、大枣调和脾胃为佐使，使补益之品易于受纳运化。药性平和，为气血双补之平剂。",
    patternIds: ["qixue_liangxu"],
    modifications: "加黄芪、肉桂为十全大补汤，温补气血之力更强。",
    cautions: "感冒发热期间停服；湿热内盛者不宜。",
    patent: "八珍颗粒、十全大补丸",
  },
  siwu: {
    key: "siwu",
    name: "四物汤",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "熟地黄", dose: "12g" },
      { name: "当归", dose: "9g" },
      { name: "白芍", dose: "9g" },
      { name: "川芎", dose: "6g" },
    ],
    preparation: DECOCTION_STD,
    functions: "补血调血",
    analysis:
      "熟地黄滋阴补血为君；当归补血活血为臣，使血足而脉道通利；白芍养血柔肝、川芎活血行气为佐使，使补而不滞、滋而不腻。补中有行，为补血调经之祖方。",
    patternIds: ["ganxue_xu"],
    modifications: "血虚有热加黄芩、牡丹皮；血瘀加桃仁、红花（桃红四物汤）。",
    cautions: "脾虚便溏者慎用熟地黄，可改用生地黄并配伍健脾药；孕妇须在医师指导下使用。",
    patent: "四物合剂、四物膏",
  },
  chaihu_shugan: {
    key: "chaihu_shugan",
    name: "柴胡疏肝散",
    source: "《景岳全书》",
    ingredients: [
      { name: "柴胡", dose: "6g" },
      { name: "陈皮", dose: "6g" },
      { name: "川芎", dose: "5g" },
      { name: "香附", dose: "5g" },
      { name: "枳壳", dose: "5g" },
      { name: "白芍", dose: "5g" },
      { name: "炙甘草", dose: "3g" },
    ],
    preparation: DECOCTION_STD,
    functions: "疏肝解郁，行气止痛",
    analysis:
      "柴胡疏肝解郁为君；香附理气疏肝、川芎行气活血为臣，兼调气血；陈皮、枳壳理气行滞，白芍柔肝缓急为佐，防辛散伤肝阴；甘草调和诸药为使。疏肝气、行血滞，为肝郁胁痛之常用方。",
    patternIds: ["ganyu_qizhi"],
    modifications: "气郁化火加栀子、牡丹皮；梅核气加半夏、厚朴（合半夏厚朴汤意）。",
    cautions: "本方芳香辛燥，阴虚火旺者慎用；不宜久服。",
    patent: "柴胡舒肝丸",
  },
  xiaoyao: {
    key: "xiaoyao",
    name: "逍遥散",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "柴胡", dose: "9g" },
      { name: "当归", dose: "9g" },
      { name: "白芍", dose: "9g" },
      { name: "白术", dose: "9g" },
      { name: "茯苓", dose: "9g" },
      { name: "炙甘草", dose: "4.5g" },
      { name: "薄荷", dose: "3g", note: "后下" },
      { name: "生姜", dose: "3 片" },
    ],
    preparation: "薄荷后下，" + DECOCTION_STD,
    functions: "疏肝解郁，养血健脾",
    analysis:
      "柴胡疏肝解郁为君；当归、白芍养血柔肝为臣，使肝体得养而肝用得舒；白术、茯苓健脾益气为佐，实脾以防肝木之乘；薄荷少许助柴胡疏散郁遏，煨生姜温中和胃，甘草调和为使。体用并调、肝脾同治，为调和肝脾之名方。",
    patternIds: ["ganyu_pixu"],
    modifications: "郁久化热加牡丹皮、栀子（加味逍遥散）；血虚明显加熟地黄。",
    cautions: "阴虚阳亢者慎用；孕妇慎用。",
    patent: "逍遥丸、加味逍遥丸",
  },
  longdan_xiegan: {
    key: "longdan_xiegan",
    name: "龙胆泻肝汤",
    source: "《医方集解》",
    ingredients: [
      { name: "龙胆草", dose: "6g" },
      { name: "黄芩", dose: "9g" },
      { name: "栀子", dose: "9g" },
      { name: "泽泻", dose: "9g" },
      { name: "木通", dose: "6g", note: "须用川木通，禁用关木通" },
      { name: "车前子", dose: "9g", note: "包煎" },
      { name: "当归", dose: "3g" },
      { name: "生地黄", dose: "9g" },
      { name: "柴胡", dose: "6g" },
      { name: "生甘草", dose: "6g" },
    ],
    preparation: "车前子包煎，" + DECOCTION_STD,
    functions: "清泻肝胆实火，清利肝经湿热",
    analysis:
      "龙胆草大苦大寒，清肝胆实火、利下焦湿热为君；黄芩、栀子苦寒泻火为臣；泽泻、木通、车前子清热利湿、导邪从小便而行为佐；当归、生地黄养血滋阴，防苦燥渗利伤阴，柴胡疏畅肝气并引药入肝，甘草调和为使。泻中有补、降中寓升。",
    patternIds: ["ganhuo_shangyan"],
    modifications: "目赤肿痛加菊花、夏枯草；便秘加大黄。",
    cautions:
      "方中木通须为川木通，严禁使用含马兜铃酸的关木通；脾胃虚寒者慎用；中病即止，不可久服；孕妇忌用。",
    patent: "龙胆泻肝丸（认准不含关木通配方）",
  },
  yupingfeng: {
    key: "yupingfeng",
    name: "玉屏风散",
    source: "《丹溪心法》",
    ingredients: [
      { name: "黄芪", dose: "15g" },
      { name: "白术", dose: "12g" },
      { name: "防风", dose: "6g" },
    ],
    preparation: "原方为散剂；作汤剂参考上述剂量，" + DECOCTION_STD,
    functions: "益气固表止汗",
    analysis:
      "黄芪益气固表为君；白术健脾益气为臣，培土以生金；防风走表散风为佐使，与黄芪相伍，固表而不留邪、祛风而不伤正。补中寓散，如屏风之御风，为表虚自汗、易感风邪之要方。",
    patternIds: ["feiqixu"],
    modifications: "自汗甚加浮小麦、煅牡蛎；易感冒者缓解期坚持服用以固表。",
    cautions: "外感发热期间停服（闭门留寇之忌）；阴虚盗汗者不宜。",
    patent: "玉屏风颗粒",
  },
  mahuang: {
    key: "mahuang",
    name: "麻黄汤",
    source: "《伤寒论》",
    ingredients: [
      { name: "麻黄", dose: "9g", note: "去节" },
      { name: "桂枝", dose: "6g" },
      { name: "杏仁", dose: "9g", note: "去皮尖" },
      { name: "炙甘草", dose: "3g" },
    ],
    preparation: "先煎麻黄去上沫，再入余药同煎，温服后覆被取微汗，中病即止，不必尽剂。",
    functions: "发汗解表，宣肺平喘",
    analysis:
      "麻黄发汗解表、宣肺平喘为君；桂枝温经散寒、助麻黄发汗为臣，麻桂相须发汗力峻；杏仁降利肺气，与麻黄一宣一降为佐；炙甘草调和诸药、缓麻桂之峻为使。为辛温发汗之峻剂，中病即止。",
    patternIds: ["fenghan_shubiao"],
    modifications: "体虚外感风寒改用荆防败毒散；项背强加葛根。",
    cautions:
      "高血压、心脏病患者及孕妇忌用；体虚、自汗、失血者禁用；发汗以微汗为度，过汗伤阳。本方须在医师指导下使用。",
    patent: "风寒感冒颗粒（功效相近的中成药）",
  },
  yinqiao: {
    key: "yinqiao",
    name: "银翘散",
    source: "《温病条辨》",
    ingredients: [
      { name: "金银花", dose: "15g" },
      { name: "连翘", dose: "15g" },
      { name: "桔梗", dose: "6g" },
      { name: "薄荷", dose: "6g", note: "后下" },
      { name: "竹叶", dose: "4g" },
      { name: "生甘草", dose: "5g" },
      { name: "荆芥穗", dose: "4g" },
      { name: "淡豆豉", dose: "5g" },
      { name: "牛蒡子", dose: "9g" },
      { name: "芦根", dose: "15g" },
    ],
    preparation: "薄荷后下，香气大出即取服，勿过煎；病重者约 4 小时一服。",
    functions: "辛凉透表，清热解毒",
    analysis:
      "金银花、连翘辛凉透表、清热解毒为君；薄荷、牛蒡子、荆芥穗、淡豆豉疏散风热为臣，荆芥、豆豉虽辛温，佐入大队辛凉中增透散之力而不助热；桔梗宣肺利咽，竹叶、芦根清热生津为佐；生甘草清热解毒、调和为使。遵「治上焦如羽」之旨。",
    patternIds: ["fengre_fanbiao"],
    modifications: "咽痛甚加板蓝根、玄参；咳嗽加桑叶、菊花（桑菊饮意）。",
    cautions: "风寒表证忌用；不宜久煎；孕妇慎用。",
    patent: "银翘解毒片、维 C 银翘片（注意其含西药成分）",
  },
  erchen: {
    key: "erchen",
    name: "二陈汤",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "法半夏", dose: "9g" },
      { name: "陈皮", dose: "9g" },
      { name: "茯苓", dose: "6g" },
      { name: "炙甘草", dose: "3g" },
      { name: "生姜", dose: "3 片" },
      { name: "乌梅", dose: "1 枚" },
    ],
    preparation: DECOCTION_STD,
    functions: "燥湿化痰，理气和中",
    analysis:
      "半夏燥湿化痰、降逆和胃为君；陈皮理气化痰为臣，气顺则痰消；茯苓健脾渗湿为佐，绝生痰之源；炙甘草和中，乌梅少许收敛肺气、防辛燥伤津，生姜制半夏之毒，共为使。为治湿痰之祖方。",
    patternIds: ["tanshi_zhongzu"],
    modifications: "痰热加黄芩、瓜蒌；食积加山楂、神曲。",
    cautions: "半夏须用炮制品（法半夏/姜半夏），生半夏有毒严禁内服；阴虚燥咳者忌用；孕妇慎用。",
    patent: "二陈丸",
  },
  pingwei: {
    key: "pingwei",
    name: "平胃散",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "苍术", dose: "12g" },
      { name: "厚朴", dose: "9g" },
      { name: "陈皮", dose: "6g" },
      { name: "炙甘草", dose: "3g" },
      { name: "生姜", dose: "2 片" },
      { name: "大枣", dose: "2 枚" },
    ],
    preparation: DECOCTION_STD,
    functions: "燥湿运脾，行气和胃",
    analysis:
      "苍术燥湿健脾为君；厚朴行气除满为臣，燥湿与行气相须；陈皮理气和胃为佐；甘草、生姜、大枣调和中焦为使。湿去气行，则痞满自除、胃气得平，故曰平胃。",
    patternIds: ["tanshi_zhongzu"],
    modifications: "兼痰湿合二陈汤（平陈汤）；湿热加黄连、黄芩。",
    cautions: "阴虚气滞者慎用；孕妇慎用。",
    patent: "平胃丸",
  },
  huoxiang_zhengqi: {
    key: "huoxiang_zhengqi",
    name: "藿香正气散",
    source: "《太平惠民和剂局方》",
    ingredients: [
      { name: "藿香", dose: "9g" },
      { name: "紫苏叶", dose: "6g" },
      { name: "白芷", dose: "6g" },
      { name: "大腹皮", dose: "9g" },
      { name: "茯苓", dose: "9g" },
      { name: "白术", dose: "9g" },
      { name: "半夏曲", dose: "9g" },
      { name: "陈皮", dose: "6g" },
      { name: "厚朴", dose: "6g" },
      { name: "桔梗", dose: "6g" },
      { name: "炙甘草", dose: "3g" },
      { name: "生姜", dose: "3 片" },
      { name: "大枣", dose: "1 枚" },
    ],
    preparation: DECOCTION_STD,
    functions: "解表化湿，理气和中",
    analysis:
      "藿香芳香化湿、解表散寒、和中止呕为君；紫苏、白芷助其解表化湿为臣；半夏曲、陈皮燥湿化痰，厚朴、大腹皮行气除满，白术、茯苓健脾渗湿，桔梗宣肺利膈，共为佐；甘草、姜枣调和为使。外散风寒、内化湿浊，表里同治。",
    patternIds: ["shire_yunpi"],
    modifications: "表寒重加香薷；湿热重加黄连、滑石。",
    cautions: "阴虚火旺者慎用；藿香正气水含酒精，驾驶员、酒精过敏者及服用头孢类药物者禁用。",
    patent: "藿香正气口服液（无酒精型）、藿香正气软胶囊",
  },
  ganlu_xiaodu: {
    key: "ganlu_xiaodu",
    name: "甘露消毒丹",
    source: "《医效秘传》",
    ingredients: [
      { name: "滑石", dose: "15g", note: "包煎" },
      { name: "茵陈", dose: "11g" },
      { name: "黄芩", dose: "10g" },
      { name: "石菖蒲", dose: "6g" },
      { name: "川贝母", dose: "5g" },
      { name: "木通", dose: "5g", note: "须用川木通" },
      { name: "藿香", dose: "4g" },
      { name: "射干", dose: "4g" },
      { name: "连翘", dose: "4g" },
      { name: "薄荷", dose: "4g", note: "后下" },
      { name: "白豆蔻", dose: "4g", note: "后下" },
    ],
    preparation: "滑石包煎，薄荷、白豆蔻后下，" + DECOCTION_STD,
    functions: "利湿化浊，清热解毒",
    analysis:
      "滑石、茵陈、黄芩清热利湿为君，湿热两清；石菖蒲、藿香、白豆蔻芳香化浊、醒脾和中为臣；连翘、射干、川贝母清热解毒、利咽化痰，木通利湿、薄荷疏表为佐使。利湿化浊与清热解毒并重，为湿热并治之名方。",
    patternIds: ["shire_yunpi"],
    modifications: "黄疸加栀子、大黄；发热甚加青蒿。",
    cautions: "寒湿证忌用；孕妇慎用；木通须用川木通，禁用关木通。",
    patent: "甘露消毒丸",
  },
  yiwei: {
    key: "yiwei",
    name: "益胃汤",
    source: "《温病条辨》",
    ingredients: [
      { name: "沙参", dose: "9g" },
      { name: "麦冬", dose: "15g" },
      { name: "生地黄", dose: "15g" },
      { name: "玉竹", dose: "4.5g" },
      { name: "冰糖", dose: "3g" },
    ],
    preparation: DECOCTION_STD,
    functions: "养阴益胃",
    analysis:
      "沙参、麦冬滋养胃阴为君；生地黄、玉竹养阴生津为臣佐；冰糖养胃和中为使。甘凉濡润，体现叶天士「胃喜润恶燥」之旨，胃阴复则受纳自健。",
    patternIds: ["weiyinxu"],
    modifications: "胃脘灼痛加白芍、甘草；干呕加竹茹、枇杷叶。",
    cautions: "脾胃虚寒、便溏者慎用。",
    patent: "养胃舒颗粒（功效相近的中成药）",
  },
  tianwang_buxin: {
    key: "tianwang_buxin",
    name: "天王补心丹",
    source: "《摄生秘剖》",
    ingredients: [
      { name: "生地黄", dose: "12g" },
      { name: "玄参", dose: "9g" },
      { name: "天冬", dose: "9g" },
      { name: "麦冬", dose: "9g" },
      { name: "当归", dose: "9g" },
      { name: "丹参", dose: "9g" },
      { name: "人参（或党参）", dose: "6g" },
      { name: "茯苓", dose: "9g" },
      { name: "五味子", dose: "6g" },
      { name: "远志", dose: "6g" },
      { name: "桔梗", dose: "6g" },
      { name: "酸枣仁", dose: "9g" },
      { name: "柏子仁", dose: "9g" },
    ],
    preparation: "原方以朱砂为衣制丸，现代多去朱砂；作汤剂参考上述剂量，" + DECOCTION_STD,
    functions: "滋阴养血，补心安神",
    analysis:
      "生地黄滋阴养血、清虚热为君；天冬、麦冬、玄参滋阴降火为臣；丹参、当归养血活血，人参、茯苓益气宁心，酸枣仁、柏子仁、远志、五味子养心安神为佐；桔梗载药上行、引药入心经为使。滋水降火，使心火下交于肾、肾水上济于心。",
    patternIds: ["xinshen_bujiao"],
    modifications: "心烦重加黄连；盗汗加浮小麦、煅牡蛎。",
    cautions: "含朱砂的市售成药不可过量久服（重金属蓄积）；脾胃虚寒便溏者慎用。",
    patent: "天王补心丸",
  },
  suanzaoren: {
    key: "suanzaoren",
    name: "酸枣仁汤",
    source: "《金匮要略》",
    ingredients: [
      { name: "酸枣仁", dose: "30g", note: "炒用" },
      { name: "知母", dose: "6g" },
      { name: "茯苓", dose: "6g" },
      { name: "川芎", dose: "6g" },
      { name: "甘草", dose: "3g" },
    ],
    preparation: DECOCTION_STD + "睡前 1 小时温服效果更佳。",
    functions: "养血安神，清热除烦",
    analysis:
      "重用酸枣仁养血补肝、宁心安神为君；知母滋阴清热除烦为臣；茯苓宁心安神，川芎调肝血、疏肝气，与酸枣仁相伍一收一散、养血调肝为佐；甘草和中为使。为肝血不足、虚热内扰之不寐要方。",
    patternIds: ["xinshen_bujiao", "ganxue_xu"],
    modifications: "心烦甚加栀子、淡豆豉；心悸加龙骨、牡蛎。",
    cautions: "脾虚便溏者慎用；服用期间忌浓茶咖啡。",
    patent: "枣仁安神胶囊",
  },
  jiaotai: {
    key: "jiaotai",
    name: "交泰丸",
    source: "《韩氏医通》",
    ingredients: [
      { name: "黄连", dose: "3g" },
      { name: "肉桂", dose: "1.5g" },
    ],
    preparation: "水煎服，睡前温服；或研末为丸。",
    functions: "交通心肾，清心降火",
    analysis:
      "黄连苦寒，直折心火于上为君；肉桂辛热，温补肾阳、引火归元于下为佐使。一寒一热、一降一温，使水火既济、心肾自交。药仅两味而配伍精妙。",
    patternIds: ["xinshen_bujiao"],
    modifications: "肾阴虚甚合六味地黄丸；心烦甚加栀子、竹叶。",
    cautions: "黄连苦寒，脾胃虚寒者慎用；不宜久服。",
    patent: "交泰丸（部分地区成药）",
  },
  xuefu_zhuyu: {
    key: "xuefu_zhuyu",
    name: "血府逐瘀汤",
    source: "《医林改错》",
    ingredients: [
      { name: "桃仁", dose: "12g" },
      { name: "红花", dose: "9g" },
      { name: "当归", dose: "9g" },
      { name: "生地黄", dose: "9g" },
      { name: "川芎", dose: "5g" },
      { name: "赤芍", dose: "6g" },
      { name: "牛膝", dose: "9g" },
      { name: "桔梗", dose: "5g" },
      { name: "柴胡", dose: "3g" },
      { name: "枳壳", dose: "6g" },
      { name: "甘草", dose: "3g" },
    ],
    preparation: DECOCTION_STD,
    functions: "活血化瘀，行气止痛",
    analysis:
      "桃仁、红花活血化瘀为君；赤芍、川芎助活血，牛膝引血下行为臣；生地黄、当归养血滋阴，使祛瘀不伤正，柴胡、枳壳、桔梗疏肝理气、升降气机，气行则血行，共为佐；甘草调和为使。活血与行气并重，为气血同治之名方。",
    patternIds: ["qizhi_xueyu"],
    modifications: "痛甚加延胡索、五灵脂；经闭加益母草、泽兰。",
    cautions:
      "孕妇及月经期量多者禁用；有出血倾向（胃溃疡出血、血小板减少等）者禁用；正在服用抗凝药物（华法林、阿司匹林等）者须告知医师。",
    patent: "血府逐瘀胶囊（口服液）",
  },
};

/** 全部方剂 key */
export const FORMULA_KEYS = Object.keys(FORMULAS);
