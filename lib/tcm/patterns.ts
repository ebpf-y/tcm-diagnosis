/**
 * 证候库（18 个常见证候）
 *
 * 覆盖八纲、脏腑、气血津液辨证的常见证候。主症/兼症/舌脉参照
 * 《中医诊断学》《中医内科学》通行表述；病机附经典引文，
 * 引文均出自《黄帝内经》《伤寒论》《金匮要略》等原著原文。
 * 每个证候关联：治则、经典方剂（formulas.ts key）、食疗（diet-therapy.ts key）、
 * 保健方案（穴位含机理、导引、起居）、常见传变/兼夹关系（relations）。
 */

/** 证候 ID */
export type PatternId =
  | "piqixu" // 脾气虚证
  | "piyangxu" // 脾阳虚证
  | "shenyangxu" // 肾阳虚证
  | "shenyinxu" // 肾阴虚证
  | "xinpi_liangxu" // 心脾两虚证
  | "qixue_liangxu" // 气血两虚证
  | "ganyu_qizhi" // 肝郁气滞证
  | "ganyu_pixu" // 肝郁脾虚证
  | "ganhuo_shangyan" // 肝火上炎证
  | "ganxue_xu" // 肝血虚证
  | "feiqixu" // 肺气虚证
  | "fenghan_shubiao" // 风寒束表证
  | "fengre_fanbiao" // 风热犯表证
  | "tanshi_zhongzu" // 痰湿中阻证
  | "shire_yunpi" // 湿热蕴脾证
  | "weiyinxu" // 胃阴虚证
  | "xinshen_bujiao" // 心肾不交证
  | "qizhi_xueyu"; // 气滞血瘀证

/** 穴位保健条目 */
export interface AcupointAdvice {
  /** 穴位名 */
  name: string;
  /** 操作方法 */
  method: string;
  /** 选穴机理 */
  rationale: string;
}

export interface PatternWellness {
  /** 穴位保健（联合类型兼容旧版报告的纯文本格式） */
  acupoint: (AcupointAdvice | string)[];
  /** 导引运动 */
  exercise: string[];
  /** 起居宜忌 */
  daily: string[];
}

/** 证候传变/兼夹关系 */
export interface PatternRelation {
  /** 目标证候 */
  target: PatternId;
  /** 关系机理 */
  mechanism: string;
  /** 经典依据（可选，无可靠出处则留空，不编造条文） */
  classic?: string;
}

export interface Pattern {
  id: PatternId;
  name: string;
  /** 辨证体系归类 */
  category: "脏腑辨证" | "八纲辨证" | "气血津液辨证" | "六经卫气营血辨证";
  /** 主症 */
  chiefSymptoms: string[];
  /** 兼症 */
  minorSymptoms: string[];
  /** 舌脉 */
  tonguePulse: string[];
  /** 病机（含经典出处引文） */
  pathogenesis: string;
  /** 治则 */
  treatment: string;
  /** 关联经典方剂（formulas.ts 的 key） */
  formulaKeys: string[];
  /** 关联食疗（diet-therapy.ts 的 key） */
  dietKeys: string[];
  /** 保健方案 */
  wellness: PatternWellness;
  /** 常见传变/兼夹关系 */
  relations: PatternRelation[];
}

export const PATTERNS: Record<PatternId, Pattern> = {
  piqixu: {
    id: "piqixu",
    name: "脾气虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["纳呆食少", "脘腹胀满（食后尤甚）", "大便溏薄", "神疲乏力"],
    minorSymptoms: ["少气懒言", "面色萎黄", "形体消瘦或虚胖", "气短"],
    tonguePulse: ["舌淡苔白", "脉缓弱"],
    pathogenesis:
      "脾主运化，为气血生化之源。脾气亏虚则运化失健，水谷不化，故纳呆便溏；气血生化乏源，故神疲乏力。《脾胃论》云：「脾胃之气既伤，而元气亦不能充，而诸病之所由生也。」",
    treatment: "健脾益气",
    formulaKeys: ["sijunzi", "shenlingbaizhu"],
    dietKeys: ["shanyao_zhou", "shenqi_yimi_zhou"],
    wellness: {
      acupoint: [
        {
          name: "足三里",
          method: "艾灸或按揉，每次 10~15 分钟，每日 1 次",
          rationale:
            "足阳明胃经合穴，《四总穴歌》「肚腹三里留」，健运脾胃、补中益气，为虚劳诸证之要穴。",
        },
        {
          name: "脾俞、胃俞",
          method: "按揉或艾灸，每穴 5~10 分钟",
          rationale: "背俞穴为脏腑经气输注于背部之处，脾俞、胃俞相配，直补脾胃之气。",
        },
      ],
      exercise: ["饭后缓行百步，助脾运化", "习八段锦「调理脾胃须单举」"],
      daily: ["饮食定时定量，忌生冷油腻", "劳倦适度，「劳则气耗」，避免过度劳累"],
    },
    relations: [
      {
        target: "piyangxu",
        mechanism: "气虚日久损及脾阳，由气及阳，温煦失职而转为脾阳虚",
      },
      {
        target: "tanshi_zhongzu",
        mechanism: "脾失健运，水湿不化，聚而成痰，虚证与痰湿并见",
        classic: "《素问·至真要大论》「诸湿肿满，皆属于脾」",
      },
      {
        target: "qixue_liangxu",
        mechanism: "脾为气血生化之源，脾虚日久化源不足，由气虚及血，渐成气血两虚",
      },
    ],
  },
  piyangxu: {
    id: "piyangxu",
    name: "脾阳虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["脘腹冷痛、喜温喜按", "畏寒肢冷", "大便溏薄清稀（甚则完谷不化）"],
    minorSymptoms: ["口淡不渴", "纳呆食少", "神疲乏力", "泛吐清水"],
    tonguePulse: ["舌淡胖嫩、边有齿痕、苔白滑", "脉沉迟无力"],
    pathogenesis:
      "脾阳亏虚，温煦失职，阴寒内生，故脘腹冷痛、畏寒肢冷；阳不化气，水谷不运，故便溏清稀。《素问·至真要大论》云：「诸湿肿满，皆属于脾。」",
    treatment: "温中健脾",
    formulaKeys: ["lizhong", "fuzilizhong"],
    dietKeys: ["ganjiang_zhou", "danggui_shengjiang_yangrou"],
    wellness: {
      acupoint: [
        {
          name: "神阙（隔姜灸）",
          method: "隔姜灸 3~5 壮，或艾条悬灸 15 分钟",
          rationale: "神阙为元气所系、元神之阙，隔姜灸之温中散寒、回阳固脱之力尤胜。",
        },
        {
          name: "关元、足三里",
          method: "艾灸，每穴 10~15 分钟",
          rationale: "关元为元气之根，温补下元；足三里健运中焦，二穴相配脾肾双温。",
        },
      ],
      exercise: ["日光下散步、太极拳，借天阳补人阳", "摩腹：睡前顺时针揉腹百次"],
      daily: ["腹部、足部注意保暖", "忌生冷瓜果冷饮，纵盛夏亦不贪凉"],
    },
    relations: [
      {
        target: "shenyangxu",
        mechanism: "脾阳根于肾阳，脾阳久虚则累及于肾，或由肾阳不足、火不暖土而脾肾同病",
      },
    ],
  },
  shenyangxu: {
    id: "shenyangxu",
    name: "肾阳虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["腰膝酸软冷痛", "畏寒肢冷（下肢尤甚）", "小便清长、夜尿频多"],
    minorSymptoms: ["精神萎靡", "面色㿠白或黧黑", "五更泄泻", "男子阳痿早泄、女子宫寒不孕"],
    tonguePulse: ["舌淡胖、苔白", "脉沉细无力（尺部尤甚）"],
    pathogenesis:
      "肾阳为一身阳气之根，主温煦气化。肾阳不足则腰膝失温、气化无权，故腰膝冷痛、小便清长；火不暖土则五更泄泻。《素问·生气通天论》云：「阳气者，若天与日，失其所则折寿而不彰。」",
    treatment: "温补肾阳",
    formulaKeys: ["jingui_shenqi", "yougui"],
    dietKeys: ["duzhong_yangrou", "hutaoren_zhou"],
    wellness: {
      acupoint: [
        {
          name: "命门、肾俞",
          method: "艾灸，每穴 10~15 分钟",
          rationale: "命门为性命之根、真火所居，肾俞为肾之背俞，艾灸二穴温补肾阳、固本培元。",
        },
        {
          name: "涌泉",
          method: "睡前以手掌搓揉至发热",
          rationale: "足少阴肾经井穴，搓之引火归元，使浮阳下潜、阴平阳秘。",
        },
      ],
      exercise: ["太极拳、散步等和缓运动，以微汗出为度", "叩齿咽津、提肛固肾"],
      daily: ["腰足部保暖，睡前热水泡脚", "节制房事，顾护元阳"],
    },
    relations: [
      {
        target: "piqixu",
        mechanism: "火不暖土，肾阳不足则脾失温煦，运化无力而兼脾气（阳）虚",
      },
      {
        target: "shenyinxu",
        mechanism: "阴阳互根，阳损日久及阴，可致阴阳两虚",
        classic: "《景岳全书》「善补阳者，必于阴中求阳，则阳得阴助而生化无穷」",
      },
    ],
  },
  shenyinxu: {
    id: "shenyinxu",
    name: "肾阴虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["腰膝酸软", "五心烦热、潮热盗汗", "咽干颧红"],
    minorSymptoms: ["耳鸣耳聋", "失眠多梦", "男子遗精、女子经少", "大便干结"],
    tonguePulse: ["舌红少津少苔（或无苔、有裂纹）", "脉细数"],
    pathogenesis:
      "肾阴为一身阴液之本，肾阴亏虚则阴不制阳、虚火内生，故五心烦热、潮热盗汗；腰为肾之府，肾精不足则腰膝酸软。《素问·调经论》云：「阴虚则内热。」",
    treatment: "滋补肾阴",
    formulaKeys: ["liuwei_dihuang", "zuogui"],
    dietKeys: ["gouqi_sangshen_zhou", "baihe_yiner_geng"],
    wellness: {
      acupoint: [
        {
          name: "太溪",
          method: "按揉，每次 5~10 分钟，每日 1~2 次",
          rationale: "足少阴肾经原穴，为肾经原气输注之处，滋补肾阴之要穴。",
        },
        {
          name: "照海",
          method: "按揉，每次 5 分钟",
          rationale: "八脉交会穴，通于阴跷脉，滋阴降火、利咽安神，阴虚火旺者宜之。",
        },
      ],
      exercise: ["游泳、太极拳等中小强度运动，忌大汗伤阴", "静坐养气，收敛浮火"],
      daily: ["戒熬夜，子时前入睡以养阴", "节房事、戒辛燥，以免更伤肾阴"],
    },
    relations: [
      {
        target: "xinshen_bujiao",
        mechanism: "肾阴亏于下，不能上济心火，水火失济而成心肾不交",
        classic: "《伤寒论》「少阴病，得之二三日以上，心中烦，不得卧，黄连阿胶汤主之」",
      },
    ],
  },
  xinpi_liangxu: {
    id: "xinpi_liangxu",
    name: "心脾两虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["心悸怔忡", "失眠多梦", "健忘", "纳呆食少、神疲乏力"],
    minorSymptoms: ["面色萎黄", "头晕", "女子月经量少色淡", "腹胀便溏"],
    tonguePulse: ["舌淡嫩、苔薄白", "脉细弱"],
    pathogenesis:
      "思虑过度，劳伤心脾：心血不足则神不守舍，故心悸失眠健忘；脾气亏虚则运化失健，故纳呆乏力。严用和《济生方》云归脾汤「治思虑过度，劳伤心脾，健忘怔忡」。",
    treatment: "益气补血，健脾养心",
    formulaKeys: ["guipi"],
    dietKeys: ["longyan_lianzi_zhou", "hongzao_danggui_dan"],
    wellness: {
      acupoint: [
        {
          name: "神门、内关",
          method: "按揉，每穴 3~5 分钟，睡前为佳",
          rationale: "神门为心经原穴，宁心安神；内关为心包经络穴，宽胸宁心，二穴相配安神定悸。",
        },
        {
          name: "心俞、脾俞、足三里",
          method: "按揉或艾灸，每穴 5~10 分钟",
          rationale: "心俞、脾俞为心脾之背俞，配胃经合穴足三里，补益心脾、气血双调。",
        },
      ],
      exercise: ["散步、八段锦等柔缓运动，避免劳神过度", "睡前静坐调息十分钟"],
      daily: ["劳逸结合，减少思虑耗神", "规律作息，睡前勿过用电子产品"],
    },
    relations: [
      {
        target: "qixue_liangxu",
        mechanism: "心脾两虚日久，气血化源不足，可进而发展为气血两虚",
      },
    ],
  },
  qixue_liangxu: {
    id: "qixue_liangxu",
    name: "气血两虚证",
    category: "气血津液辨证",
    chiefSymptoms: ["头晕目眩", "神疲乏力、少气懒言", "面色淡白或萎黄"],
    minorSymptoms: ["心悸失眠", "唇甲色淡", "女子月经量少色淡", "手足麻木"],
    tonguePulse: ["舌淡苔白", "脉细弱无力"],
    pathogenesis:
      "气为血之帅，血为气之母。气虚则推动无力，血虚则濡养失职，气血俱亏则头面失荣、脏腑失养。《素问·调经论》云：「血气不和，百病乃变化而生。」",
    treatment: "气血双补",
    formulaKeys: ["bazhen"],
    dietKeys: ["danggui_shengjiang_yangrou", "hongzao_danggui_dan"],
    wellness: {
      acupoint: [
        {
          name: "足三里、气海",
          method: "艾灸，每穴 10~15 分钟",
          rationale: "气海为元气之海，足三里为强壮要穴，二穴相配益气培元，补气以生血。",
        },
        {
          name: "血海、膈俞",
          method: "按揉，每穴 5 分钟",
          rationale: "血海健脾养血，膈俞为八会穴之血会，二穴相配养血和血。",
        },
      ],
      exercise: ["和缓运动循序渐进，切忌过劳耗气", "八段锦、太极拳"],
      daily: ["注意营养，勿过度节食", "避免久视伤血、久卧伤气"],
    },
    relations: [
      {
        target: "xinpi_liangxu",
        mechanism: "气血不足，心失所养、脾失健运，常兼心脾两虚之候",
      },
    ],
  },
  ganyu_qizhi: {
    id: "ganyu_qizhi",
    name: "肝郁气滞证",
    category: "脏腑辨证",
    chiefSymptoms: ["情志抑郁或急躁易怒", "胁肋胀痛、走窜不定", "善太息"],
    minorSymptoms: ["咽部异物感（梅核气）", "嗳气频作", "女子乳房胀痛、月经不调", "症状随情绪波动而增减"],
    tonguePulse: ["舌淡红、苔薄白", "脉弦"],
    pathogenesis:
      "肝主疏泄，调畅气机情志。情志不遂则肝失条达、气机郁滞，故胁胀太息、情志抑郁。《素问·举痛论》云：「百病生于气也。」",
    treatment: "疏肝解郁，理气畅中",
    formulaKeys: ["chaihu_shugan"],
    dietKeys: ["meiguihua_cha", "foshou_chenpi_zhou"],
    wellness: {
      acupoint: [
        {
          name: "太冲、期门",
          method: "按揉，每穴 3~5 分钟，每日 1~2 次",
          rationale: "太冲为肝经原穴，期门为肝之募穴，原募相配，疏肝解郁之力最著。",
        },
        {
          name: "膻中",
          method: "以掌根上下推擦至微热",
          rationale: "膻中为八会穴之气会，宽胸理气、舒畅情志，善治气郁胸闷。",
        },
      ],
      exercise: ["登山、徒步、球类等舒展性运动，宣畅气机", "习六字诀「嘘」字诀疏肝"],
      daily: ["保持情志舒畅，移情易性", "多与人交流，忌长期独处生闷气"],
    },
    relations: [
      {
        target: "ganyu_pixu",
        mechanism: "肝木乘脾土，肝郁日久克伐脾气，由肝及脾而成肝郁脾虚",
        classic: "《金匮要略》「见肝之病，知肝传脾，当先实脾」",
      },
      {
        target: "piqixu",
        mechanism: "肝木乘脾土，肝气横逆犯脾，脾失健运而兼见脾虚之象",
        classic: "《金匮要略》「见肝之病，知肝传脾，当先实脾」",
      },
      {
        target: "ganhuo_shangyan",
        mechanism: "气郁日久则化火，肝郁化火、肝火上炎",
        classic: "《丹溪心法》「气有余便是火」",
      },
      {
        target: "qizhi_xueyu",
        mechanism: "气为血帅，气滞日久则血行不畅，由气及血而成气滞血瘀",
      },
    ],
  },
  ganyu_pixu: {
    id: "ganyu_pixu",
    name: "肝郁脾虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["胁肋胀满、情志抑郁", "纳呆腹胀", "大便溏薄或时干时溏"],
    minorSymptoms: ["神疲乏力", "嗳气", "腹痛即泻、泻后痛减", "女子月经不调"],
    tonguePulse: ["舌淡红、苔薄白或白腻", "脉弦细或弦缓"],
    pathogenesis:
      "肝气郁结，横逆犯脾，脾失健运，故见肝郁与脾虚并见之候。《金匮要略》云：「见肝之病，知肝传脾，当先实脾。」",
    treatment: "疏肝健脾",
    formulaKeys: ["xiaoyao"],
    dietKeys: ["foshou_chenpi_zhou", "shanyao_zhou"],
    wellness: {
      acupoint: [
        {
          name: "太冲、足三里",
          method: "按揉，每穴 3~5 分钟",
          rationale: "太冲疏肝解郁，足三里健脾和胃，一肝一脾，正合「扶土抑木」之法。",
        },
        {
          name: "肝俞、脾俞",
          method: "按揉或艾灸，每穴 5 分钟",
          rationale: "肝脾背俞相配，调肝以疏其郁，实脾以防其传。",
        },
      ],
      exercise: ["太极拳、散步，调畅气机兼助运化", "腹式呼吸配合提肛"],
      daily: ["情志调畅与饮食有节并重", "忌暴饮暴食与忧思气结时进食"],
    },
    relations: [
      {
        target: "ganyu_qizhi",
        mechanism: "本证多由肝郁气滞日久、横逆犯脾发展而来，肝郁为始动因素",
        classic: "《金匮要略》「见肝之病，知肝传脾，当先实脾」",
      },
    ],
  },
  ganhuo_shangyan: {
    id: "ganhuo_shangyan",
    name: "肝火上炎证",
    category: "脏腑辨证",
    chiefSymptoms: ["头晕胀痛", "面红目赤", "口苦口干", "急躁易怒"],
    minorSymptoms: ["耳鸣耳聋（暴起）", "胁肋灼痛", "失眠多梦", "小便短黄、大便秘结"],
    tonguePulse: ["舌红、苔黄", "脉弦数"],
    pathogenesis:
      "肝气郁久化火，或素体阳盛，肝火循经上炎，故头目胀痛、面红目赤；火扰心神则急躁失眠。《素问·至真要大论》云：「诸风掉眩，皆属于肝。」",
    treatment: "清肝泻火",
    formulaKeys: ["longdan_xiegan"],
    dietKeys: ["juhua_juemingzi_cha", "lvdou_tang"],
    wellness: {
      acupoint: [
        {
          name: "太冲、行间",
          method: "按揉，每穴 3~5 分钟，力度可稍重",
          rationale: "行间为肝经荥穴，《难经》「荥主身热」，配原穴太冲，清泻肝火之力专。",
        },
        {
          name: "风池",
          method: "按揉，每侧 3 分钟",
          rationale: "足少阳与阳维之会，清利头目、平抑肝阳，治肝火上扰之头晕目赤。",
        },
      ],
      exercise: ["游泳、慢跑等运动疏泄郁热", "避免情绪激烈对抗性运动"],
      daily: ["戒急躁易怒，保持情绪平稳", "忌辛辣酒酪等助火之品，戒熬夜"],
    },
    relations: [
      {
        target: "ganyu_qizhi",
        mechanism: "本证多由肝郁气滞郁久化火而来，郁为火之始因",
        classic: "《丹溪心法》「气有余便是火」",
      },
    ],
  },
  ganxue_xu: {
    id: "ganxue_xu",
    name: "肝血虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["头晕目眩", "两目干涩、视物模糊", "肢体麻木、筋脉拘急"],
    minorSymptoms: ["面色无华", "爪甲不荣", "女子月经量少色淡甚则闭经", "失眠多梦"],
    tonguePulse: ["舌淡、苔白", "脉弦细"],
    pathogenesis:
      "肝藏血，开窍于目，其华在爪，主筋。肝血不足则目失濡养、筋爪失荣。《素问·五脏生成》云：「肝受血而能视，足受血而能步，掌受血而能握，指受血而能摄。」",
    treatment: "滋补肝血",
    formulaKeys: ["siwu"],
    dietKeys: ["zhugan_bocai", "gouqi_sangshen_zhou"],
    wellness: {
      acupoint: [
        {
          name: "肝俞、血海、三阴交",
          method: "按揉，每穴 3~5 分钟",
          rationale: "肝俞补肝养血，血海养血调血，三阴交调补肝脾肾三阴，共奏养血柔肝之功。",
        },
        {
          name: "睛明、太阳",
          method: "轻柔按揉，每穴 1~2 分钟",
          rationale: "目周局部取穴，疏通目络，配合养血治本以濡养目窍。",
        },
      ],
      exercise: ["和缓运动，避免久视耗血", "眼保健操、运目远眺"],
      daily: ["减少长时间用眼，勿熬夜", "注意月经、失血后的养血调护"],
    },
    relations: [
      {
        target: "qixue_liangxu",
        mechanism: "血虚日久，气无所附而生化无力，由血及气，可成气血两虚",
      },
    ],
  },
  feiqixu: {
    id: "feiqixu",
    name: "肺气虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["咳喘无力、气短", "动则尤甚", "自汗、易感外邪"],
    minorSymptoms: ["少气懒言", "声音低怯", "痰液清稀", "神疲乏力"],
    tonguePulse: ["舌淡、苔白", "脉虚弱"],
    pathogenesis:
      "肺主气司呼吸，外合皮毛。肺气亏虚则呼吸功能减弱、卫表不固，故气短自汗、反复感冒。《素问·至真要大论》云：「诸气膹郁，皆属于肺。」",
    treatment: "补益肺气，固表止汗",
    formulaKeys: ["yupingfeng", "buzhong_yiqi"],
    dietKeys: ["huangqi_dunji", "shenqi_yimi_zhou"],
    wellness: {
      acupoint: [
        {
          name: "肺俞、膏肓",
          method: "艾灸，每穴 10 分钟",
          rationale: "肺俞补益肺气，膏肓主治虚劳羸瘦，《千金方》极重灸膏肓治诸虚百损。",
        },
        {
          name: "太渊",
          method: "按揉，每次 3~5 分钟",
          rationale: "手太阴肺经原穴，又为脉会，补益肺气之要穴。",
        },
      ],
      exercise: ["腹式呼吸、扩胸运动，增强肺通气", "耐寒锻炼循序渐进（如冷水洗脸）"],
      daily: ["注意气候变化及时增减衣物", "戒烟，避免粉尘烟雾刺激"],
    },
    relations: [
      {
        target: "piqixu",
        mechanism: "脾为肺母，肺虚日久子盗母气；治宜培土生金，兼顾脾胃",
      },
    ],
  },
  fenghan_shubiao: {
    id: "fenghan_shubiao",
    name: "风寒束表证",
    category: "八纲辨证",
    chiefSymptoms: ["恶寒重、发热轻", "无汗", "头身疼痛"],
    minorSymptoms: ["鼻塞流清涕", "打喷嚏", "咳嗽痰稀白", "口不渴"],
    tonguePulse: ["舌苔薄白而润", "脉浮紧"],
    pathogenesis:
      "风寒外袭，卫阳被遏，腠理闭塞，故恶寒无汗、头身疼痛。《伤寒论》云：「太阳病，头痛发热，身疼腰痛，骨节疼痛，恶风无汗而喘者，麻黄汤主之。」",
    treatment: "辛温解表，宣肺散寒",
    formulaKeys: ["mahuang"],
    dietKeys: ["shengjiang_hongtang_shui", "congbai_douchi_tang"],
    wellness: {
      acupoint: [
        {
          name: "风池、大椎",
          method: "按揉或艾灸，每穴 5 分钟",
          rationale: "大椎为诸阳之会，风池疏风解表，二穴相配疏风散寒、解表通阳。",
        },
        {
          name: "肺俞",
          method: "艾灸 10 分钟",
          rationale: "温散肺卫风寒，助卫阳以驱邪外出。",
        },
      ],
      exercise: ["微汗为宜，切忌大汗淋漓", "病中宜静养，暂停剧烈运动"],
      daily: ["注意保暖避风", "热粥助汗，覆被取微汗"],
    },
    relations: [],
  },
  fengre_fanbiao: {
    id: "fengre_fanbiao",
    name: "风热犯表证",
    category: "八纲辨证",
    chiefSymptoms: ["发热重、微恶风", "咽喉肿痛", "口渴"],
    minorSymptoms: ["有汗或少汗", "咳嗽痰黄稠", "鼻塞流浊涕", "头痛"],
    tonguePulse: ["舌尖边红、苔薄白微黄", "脉浮数"],
    pathogenesis:
      "风热之邪犯表，卫表失和，热邪上扰，故发热咽痛口渴。《温病条辨》云：「但热不恶寒而渴者，辛凉平剂银翘散主之。」",
    treatment: "辛凉解表，疏风清热",
    formulaKeys: ["yinqiao"],
    dietKeys: ["sangju_cha", "bingtang_xueli"],
    wellness: {
      acupoint: [
        {
          name: "曲池、合谷",
          method: "按揉，每穴 3~5 分钟",
          rationale: "手阳明大肠经穴，阳明多气多血，疏风清热、解表退热之常用对穴。",
        },
        {
          name: "少商",
          method: "点刺放血 3~5 滴（须由专业人员操作）",
          rationale: "肺经井穴，点刺放血清肺利咽，为咽喉肿痛之效穴。",
        },
      ],
      exercise: ["病中静养，热退后再恢复运动", "室内保持空气流通"],
      daily: ["多饮温开水", "忌辛辣温燥之物"],
    },
    relations: [],
  },
  tanshi_zhongzu: {
    id: "tanshi_zhongzu",
    name: "痰湿中阻证",
    category: "气血津液辨证",
    chiefSymptoms: ["脘腹痞闷胀满", "呕恶痰多", "头重如裹、身重困倦"],
    minorSymptoms: ["口黏不渴", "纳呆", "形体肥胖", "大便黏滞"],
    tonguePulse: ["舌淡胖、苔白厚腻", "脉濡滑"],
    pathogenesis:
      "脾失健运，水湿内停，聚湿成痰，痰湿中阻则气机升降失常。《金匮要略》云：「病痰饮者，当以温药和之。」《丹溪心法》云：「百病多有兼痰者。」",
    treatment: "燥湿化痰，理气和中",
    formulaKeys: ["erchen", "pingwei"],
    dietKeys: ["yimi_donggua_tang", "shenqi_yimi_zhou"],
    wellness: {
      acupoint: [
        {
          name: "丰隆",
          method: "按揉，每次 5 分钟，每日 1~2 次",
          rationale: "足阳明胃经络穴，为化痰要穴，《玉龙歌》「痰多宜向丰隆寻」。",
        },
        {
          name: "中脘、阴陵泉",
          method: "按揉或艾灸，每穴 5~10 分钟",
          rationale: "中脘为胃募、腑会，和胃化痰；阴陵泉为脾经合穴，健脾利湿，标本兼顾。",
        },
      ],
      exercise: ["坚持有氧运动：快走、慢跑、游泳，以汗畅为度", "八段锦「调理脾胃须单举」"],
      daily: ["居处干燥，忌潮湿环境", "忌肥甘厚味、甜腻生冷"],
    },
    relations: [
      {
        target: "shire_yunpi",
        mechanism: "痰湿郁久化热，或外感湿热，可转为湿热蕴脾",
      },
    ],
  },
  shire_yunpi: {
    id: "shire_yunpi",
    name: "湿热蕴脾证",
    category: "气血津液辨证",
    chiefSymptoms: ["脘腹痞闷", "口苦口黏", "大便黏滞不爽或溏臭", "小便短黄"],
    minorSymptoms: ["身热不扬", "身重困倦", "纳呆恶心", "面目肌肤发黄（重则）"],
    tonguePulse: ["舌红、苔黄腻", "脉濡数或滑数"],
    pathogenesis:
      "湿热之邪蕴结中焦，脾胃升降失司，湿性黏滞、热性炎上，故痞闷口黏、便溏溲黄并见。薛生白《湿热条辨》云：「湿热证，始恶寒，后但热不寒，汗出胸痞，舌白，口渴不引饮。」",
    treatment: "清热利湿，醒脾和中",
    formulaKeys: ["ganlu_xiaodu", "huoxiang_zhengqi"],
    dietKeys: ["lvdou_yimi_tang", "yimi_donggua_tang"],
    wellness: {
      acupoint: [
        {
          name: "阴陵泉、曲池",
          method: "按揉，每穴 5 分钟",
          rationale: "阴陵泉健脾利湿，曲池清泄郁热，利湿与清热并行。",
        },
        {
          name: "中脘、天枢",
          method: "按揉，每穴 5 分钟",
          rationale: "调理中焦气机，使湿热之邪随气机升降而下行为出。",
        },
      ],
      exercise: ["较大强度运动排汗泄热：游泳、爬山、球类", "暑湿当令时避免户外暴晒"],
      daily: ["居处通风干燥", "戒酒，忌辛辣油腻烧烤"],
    },
    relations: [
      {
        target: "tanshi_zhongzu",
        mechanism: "湿热之热邪渐去、湿邪独留，或素体湿盛，可与痰湿中阻相互转化",
      },
    ],
  },
  weiyinxu: {
    id: "weiyinxu",
    name: "胃阴虚证",
    category: "脏腑辨证",
    chiefSymptoms: ["胃脘隐隐灼痛", "饥不欲食", "口燥咽干"],
    minorSymptoms: ["干呕呃逆", "大便干结", "形体消瘦", "脘痞不舒"],
    tonguePulse: ["舌红少津、少苔或无苔（或有裂纹、剥苔）", "脉细数"],
    pathogenesis:
      "胃喜润恶燥，热病后期或嗜食辛燥，耗伤胃阴，胃失濡润、和降失常，故饥不欲食、脘痛咽干。叶天士《临证指南医案》云：「阳明燥土，得阴自安。」",
    treatment: "养阴益胃",
    formulaKeys: ["yiwei"],
    dietKeys: ["shashen_maidong_zhou", "baihe_yiner_geng"],
    wellness: {
      acupoint: [
        {
          name: "足三里、三阴交",
          method: "按揉，每穴 5 分钟",
          rationale: "足三里益胃和中，三阴交滋养三阴，养胃阴而降胃气。",
        },
        {
          name: "内关",
          method: "按揉，每穴 3 分钟",
          rationale: "心包经络穴，通阴维脉，和胃降逆，善治胃脘不适、干呕呃逆。",
        },
      ],
      exercise: ["和缓运动，避免大汗伤津", "饭后缓行，勿立即平卧"],
      daily: ["少量多餐，细嚼慢咽", "忌辛辣燥热、煎炸烧烤及烈酒"],
    },
    relations: [],
  },
  xinshen_bujiao: {
    id: "xinshen_bujiao",
    name: "心肾不交证",
    category: "脏腑辨证",
    chiefSymptoms: ["心烦失眠", "心悸健忘", "腰膝酸软"],
    minorSymptoms: ["头晕耳鸣", "五心烦热、潮热盗汗", "咽干口燥", "男子遗精、女子月经不调"],
    tonguePulse: ["舌红、少苔", "脉细数"],
    pathogenesis:
      "心属火居上，肾属水居下，正常情况下心火下温肾水、肾水上济心火。肾阴亏于下则心火亢于上，水火不济，故心烦不寐与腰膝并见。《伤寒论》云：「少阴病，得之二三日以上，心中烦，不得卧，黄连阿胶汤主之。」",
    treatment: "滋阴降火，交通心肾",
    formulaKeys: ["tianwang_buxin", "jiaotai", "suanzaoren"],
    dietKeys: ["lianzi_baihe_zhou", "gouqi_sangshen_zhou"],
    wellness: {
      acupoint: [
        {
          name: "神门、太溪",
          method: "按揉，每穴 3~5 分钟，睡前为佳",
          rationale: "心经原穴神门配肾经原穴太溪，一降心火一滋肾水，交通心肾。",
        },
        {
          name: "涌泉",
          method: "睡前搓揉至发热",
          rationale: "肾经井穴，引火下行，使上亢之心火下潜于肾水。",
        },
      ],
      exercise: ["静坐、冥想，敛神降火", "太极拳，调和上下"],
      daily: ["戒熬夜，节房事", "睡前忌咖啡浓茶与过度思虑"],
    },
    relations: [
      {
        target: "shenyinxu",
        mechanism: "本证多由肾阴亏虚、水不济火而起，肾阴虚为病之本",
        classic: "《伤寒论》「少阴病，得之二三日以上，心中烦，不得卧，黄连阿胶汤主之」",
      },
    ],
  },
  qizhi_xueyu: {
    id: "qizhi_xueyu",
    name: "气滞血瘀证",
    category: "气血津液辨证",
    chiefSymptoms: ["胸胁或局部刺痛、痛有定处、夜间加重", "情志抑郁或急躁"],
    minorSymptoms: ["面色晦黯、唇甲青紫", "肌肤甲错", "女子痛经、经血紫黯有块", "皮下瘀斑"],
    tonguePulse: ["舌质紫黯或有瘀点瘀斑、舌下络脉曲张", "脉弦涩"],
    pathogenesis:
      "气为血帅，气机郁滞则血行不畅，久而成瘀，不通则痛，故刺痛固定、入夜加重。《素问·举痛论》云：「经脉流行不止，环周不休，寒气入经而稽迟，泣而不行。」",
    treatment: "行气活血，化瘀止痛",
    formulaKeys: ["xuefu_zhuyu"],
    dietKeys: ["shanzha_hongtang_shui", "meiguihua_cha"],
    wellness: {
      acupoint: [
        {
          name: "血海、膈俞",
          method: "按揉，每穴 5 分钟",
          rationale: "血海活血调血，膈俞为血会，二穴为活血化瘀之要穴组合。",
        },
        {
          name: "太冲、合谷（四关穴）",
          method: "按揉，每穴 3~5 分钟",
          rationale: "太冲、合谷合称四关，一气一血、一肝一大肠，开四关则气机畅、瘀血行。",
        },
      ],
      exercise: ["舞蹈、健步走等促进气血运行", "运动中若胸闷胸痛眩晕，立即停止并就医"],
      daily: ["注意保暖，血得温则行", "调畅情志，气行则血行"],
    },
    relations: [
      {
        target: "ganyu_qizhi",
        mechanism: "血瘀多由气滞日久发展而来，气滞为血瘀之始因，治瘀必先行气",
      },
    ],
  },
};

export const PATTERN_IDS = Object.keys(PATTERNS) as PatternId[];
