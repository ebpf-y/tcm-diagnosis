/**
 * 君臣佐使结构化方解库
 *
 * 把 formulas.ts 中方解（analysis 散文）里的配伍机理结构化为
 * 君/臣/佐/使 四个地位分组，供报告按角色渲染：
 * - 君：针对主病主证起主要治疗作用的药物
 * - 臣：辅助君药加强疗效，或针对兼病兼证起主要作用
 * - 佐：佐助、佐制（减毒/纠偏）、反佐
 * - 使：引经、调和诸药
 *
 * 数据依据各本方解与《方剂学》通行论述；herbs 与 formulas.ts
 * ingredients 的药味名对应（测试校验闭合）。
 */

export interface FormulaRole {
  /** 配伍地位 */
  role: "君" | "臣" | "佐" | "使";
  /** 该地位的药味（与 ingredients 的药味名对应） */
  herbs: string[];
  /** 该地位药物的配伍机理 */
  rationale: string;
}

export const FORMULA_ROLES: Record<string, FormulaRole[]> = {
  sijunzi: [
    { role: "君", herbs: ["人参"], rationale: "大补元气、健脾养胃" },
    { role: "臣", herbs: ["白术"], rationale: "健脾燥湿，助君药运化" },
    { role: "佐", herbs: ["茯苓"], rationale: "渗湿健脾，与白术相伍则湿去脾健" },
    { role: "使", herbs: ["炙甘草"], rationale: "益气和中、调和诸药" },
  ],
  shenlingbaizhu: [
    { role: "君", herbs: ["人参", "白术", "茯苓"], rationale: "四君益气健脾为基" },
    { role: "臣", herbs: ["山药", "莲子肉", "白扁豆", "薏苡仁"], rationale: "健脾渗湿止泻" },
    { role: "佐", herbs: ["砂仁"], rationale: "醒脾和胃、行气化滞，使补而不滞" },
    { role: "使", herbs: ["桔梗", "炙甘草"], rationale: "桔梗宣肺利气、载药上行，寓培土生金之意；甘草调和" },
  ],
  buzhong_yiqi: [
    { role: "君", herbs: ["黄芪"], rationale: "补中益气、升阳固表，重用以举陷" },
    { role: "臣", herbs: ["人参", "白术", "炙甘草"], rationale: "健脾益气，助黄芪补气之功" },
    { role: "佐", herbs: ["当归", "陈皮"], rationale: "当归养血和营，陈皮理气和胃、使补而不滞" },
    { role: "使", herbs: ["升麻", "柴胡"], rationale: "升举清阳、引诸药上行" },
  ],
  lizhong: [
    { role: "君", herbs: ["干姜"], rationale: "大辛大热，温中散寒" },
    { role: "臣", herbs: ["人参"], rationale: "补气健脾，温补并行" },
    { role: "佐", herbs: ["白术"], rationale: "健脾燥湿" },
    { role: "使", herbs: ["炙甘草"], rationale: "益气和中、调和诸药" },
  ],
  fuzilizhong: [
    { role: "君", herbs: ["制附子", "干姜"], rationale: "附子温肾助阳，干姜温中散寒，相须为用、温阳力倍" },
    { role: "臣", herbs: ["人参"], rationale: "补气健脾" },
    { role: "佐", herbs: ["白术"], rationale: "健脾燥湿" },
    { role: "使", herbs: ["炙甘草"], rationale: "益气和中、调和诸药，兼缓附姜之峻" },
  ],
  jingui_shenqi: [
    { role: "君", herbs: ["干地黄"], rationale: "重用滋补肾阴，阴中求阳之基" },
    { role: "臣", herbs: ["山茱萸", "山药"], rationale: "滋补肝脾、益精固涩" },
    { role: "佐", herbs: ["泽泻", "茯苓", "牡丹皮"], rationale: "渗湿泄浊、清泻虚火，寓泻于补、防滋腻碍邪" },
    { role: "使", herbs: ["桂枝", "炮附子"], rationale: "少佐温阳化气，取「少火生气」之义，使阳有所化" },
  ],
  yougui: [
    { role: "君", herbs: ["制附子", "肉桂"], rationale: "温补肾阳、峻补命火" },
    { role: "臣", herbs: ["鹿角胶", "熟地黄", "枸杞子", "山茱萸", "山药"], rationale: "填精滋阴，取「阴中求阳」之意" },
    { role: "佐", herbs: ["菟丝子", "杜仲", "当归"], rationale: "补肝肾、强腰膝，养血和血" },
  ],
  liuwei_dihuang: [
    { role: "君", herbs: ["熟地黄"], rationale: "滋肾填精" },
    { role: "臣", herbs: ["山茱萸", "山药"], rationale: "补肝涩精、补脾固精，并补三阴" },
    { role: "佐", herbs: ["泽泻", "牡丹皮", "茯苓"], rationale: "三泻：泻肾浊、清肝火、渗脾湿，防滋补之腻滞" },
  ],
  zuogui: [
    { role: "君", herbs: ["熟地黄"], rationale: "滋肾填精，纯甘壮水" },
    { role: "臣", herbs: ["龟板胶", "鹿角胶"], rationale: "血肉有情之品，峻补精髓，龟鹿相配、阴阳并调" },
    { role: "佐", herbs: ["枸杞子", "山茱萸", "山药"], rationale: "滋补肝肾之阴" },
    { role: "使", herbs: ["菟丝子", "川牛膝"], rationale: "益肝肾、强腰膝，引药下行入肾" },
  ],
  guipi: [
    { role: "君", herbs: ["黄芪", "人参", "白术", "炙甘草"], rationale: "健脾益气，脾旺则气血生化有源" },
    { role: "臣", herbs: ["当归", "龙眼肉"], rationale: "养血补心" },
    { role: "佐", herbs: ["酸枣仁", "茯神", "远志", "木香"], rationale: "养心安神；木香理气醒脾、使补而不滞" },
    { role: "使", herbs: ["生姜", "大枣"], rationale: "调和营卫" },
  ],
  bazhen: [
    { role: "君", herbs: ["人参", "熟地黄"], rationale: "益气与养血并举，气血双补" },
    { role: "臣", herbs: ["白术", "茯苓", "当归", "白芍"], rationale: "健脾益气、养血柔肝" },
    { role: "佐", herbs: ["川芎"], rationale: "活血行气，使补而不滞" },
    { role: "使", herbs: ["炙甘草", "生姜", "大枣"], rationale: "调和脾胃，使补益之品易于受纳运化" },
  ],
  siwu: [
    { role: "君", herbs: ["熟地黄"], rationale: "滋阴补血" },
    { role: "臣", herbs: ["当归"], rationale: "补血活血，使血足而脉道通利" },
    { role: "佐", herbs: ["白芍"], rationale: "养血柔肝、敛阴和营" },
    { role: "使", herbs: ["川芎"], rationale: "活血行气，使补而不滞、滋而不腻" },
  ],
  chaihu_shugan: [
    { role: "君", herbs: ["柴胡"], rationale: "疏肝解郁" },
    { role: "臣", herbs: ["香附", "川芎"], rationale: "香附理气疏肝，川芎行气活血，兼调气血" },
    { role: "佐", herbs: ["陈皮", "枳壳", "白芍"], rationale: "理气行滞；白芍柔肝缓急，防辛散伤肝阴" },
    { role: "使", herbs: ["炙甘草"], rationale: "调和诸药" },
  ],
  xiaoyao: [
    { role: "君", herbs: ["柴胡"], rationale: "疏肝解郁" },
    { role: "臣", herbs: ["当归", "白芍"], rationale: "养血柔肝，使肝体得养而肝用得舒" },
    { role: "佐", herbs: ["白术", "茯苓"], rationale: "健脾益气，实脾以防肝木之乘" },
    { role: "使", herbs: ["薄荷", "生姜", "炙甘草"], rationale: "薄荷助柴胡疏散郁遏，煨姜温中和胃，甘草调和" },
  ],
  longdan_xiegan: [
    { role: "君", herbs: ["龙胆草"], rationale: "大苦大寒，清肝胆实火、利下焦湿热" },
    { role: "臣", herbs: ["黄芩", "栀子"], rationale: "苦寒泻火，助君药清泄之力" },
    { role: "佐", herbs: ["泽泻", "木通", "车前子", "当归", "生地黄"], rationale: "清热利湿、导邪下行；归地养血滋阴，防苦燥渗利伤阴" },
    { role: "使", herbs: ["柴胡", "生甘草"], rationale: "柴胡疏畅肝气并引药入肝，甘草调和" },
  ],
  yupingfeng: [
    { role: "君", herbs: ["黄芪"], rationale: "益气固表" },
    { role: "臣", herbs: ["白术"], rationale: "健脾益气，培土以生金" },
    { role: "佐", herbs: ["防风"], rationale: "走表散风，固表而不留邪、祛风而不伤正" },
  ],
  mahuang: [
    { role: "君", herbs: ["麻黄"], rationale: "发汗解表、宣肺平喘" },
    { role: "臣", herbs: ["桂枝"], rationale: "温经散寒、助麻黄发汗，麻桂相须力峻" },
    { role: "佐", herbs: ["杏仁"], rationale: "降利肺气，与麻黄一宣一降" },
    { role: "使", herbs: ["炙甘草"], rationale: "调和诸药、缓麻桂之峻" },
  ],
  yinqiao: [
    { role: "君", herbs: ["金银花", "连翘"], rationale: "辛凉透表、清热解毒" },
    { role: "臣", herbs: ["薄荷", "牛蒡子", "荆芥穗", "淡豆豉"], rationale: "疏散风热；荆芥、豆豉虽辛温，佐入辛凉中增透散而不助热" },
    { role: "佐", herbs: ["桔梗", "竹叶", "芦根"], rationale: "宣肺利咽、清热生津" },
    { role: "使", herbs: ["生甘草"], rationale: "清热解毒、调和诸药" },
  ],
  erchen: [
    { role: "君", herbs: ["法半夏"], rationale: "燥湿化痰、降逆和胃" },
    { role: "臣", herbs: ["陈皮"], rationale: "理气化痰，气顺则痰消" },
    { role: "佐", herbs: ["茯苓"], rationale: "健脾渗湿，绝生痰之源" },
    { role: "使", herbs: ["炙甘草", "乌梅", "生姜"], rationale: "甘草和中；乌梅敛肺防辛燥伤津；生姜制半夏之毒" },
  ],
  pingwei: [
    { role: "君", herbs: ["苍术"], rationale: "燥湿健脾" },
    { role: "臣", herbs: ["厚朴"], rationale: "行气除满，燥湿与行气相须" },
    { role: "佐", herbs: ["陈皮"], rationale: "理气和胃" },
    { role: "使", herbs: ["炙甘草", "生姜", "大枣"], rationale: "调和中焦" },
  ],
  huoxiang_zhengqi: [
    { role: "君", herbs: ["藿香"], rationale: "芳香化湿、解表散寒、和中止呕" },
    { role: "臣", herbs: ["紫苏叶", "白芷"], rationale: "助君药解表化湿" },
    { role: "佐", herbs: ["半夏曲", "陈皮", "厚朴", "大腹皮", "白术", "茯苓", "桔梗"], rationale: "燥湿化痰、行气除满、健脾渗湿、宣肺利膈" },
    { role: "使", herbs: ["炙甘草", "生姜", "大枣"], rationale: "调和诸药、调和营卫" },
  ],
  ganlu_xiaodu: [
    { role: "君", herbs: ["滑石", "茵陈", "黄芩"], rationale: "清热利湿，湿热两清" },
    { role: "臣", herbs: ["石菖蒲", "藿香", "白豆蔻"], rationale: "芳香化浊、醒脾和中" },
    { role: "佐", herbs: ["连翘", "射干", "川贝母"], rationale: "清热解毒、利咽化痰" },
    { role: "使", herbs: ["木通", "薄荷"], rationale: "木通利湿导邪下行，薄荷疏表透邪" },
  ],
  yiwei: [
    { role: "君", herbs: ["沙参", "麦冬"], rationale: "滋养胃阴" },
    { role: "臣", herbs: ["生地黄", "玉竹"], rationale: "养阴生津" },
    { role: "使", herbs: ["冰糖"], rationale: "养胃和中，体现「胃喜润恶燥」之旨" },
  ],
  tianwang_buxin: [
    { role: "君", herbs: ["生地黄"], rationale: "滋阴养血、清虚热" },
    { role: "臣", herbs: ["天冬", "麦冬", "玄参"], rationale: "滋阴降火" },
    { role: "佐", herbs: ["丹参", "当归", "人参", "茯苓", "酸枣仁", "柏子仁", "远志", "五味子"], rationale: "养血活血、益气宁心、养心安神" },
    { role: "使", herbs: ["桔梗"], rationale: "载药上行、引药入心经" },
  ],
  suanzaoren: [
    { role: "君", herbs: ["酸枣仁"], rationale: "重用养血补肝、宁心安神" },
    { role: "臣", herbs: ["知母"], rationale: "滋阴清热除烦" },
    { role: "佐", herbs: ["茯苓", "川芎"], rationale: "茯苓宁心安神；川芎调肝血，与枣仁一收一散、养血调肝" },
    { role: "使", herbs: ["甘草"], rationale: "和中调药" },
  ],
  jiaotai: [
    { role: "君", herbs: ["黄连"], rationale: "苦寒直折心火于上" },
    { role: "使", herbs: ["肉桂"], rationale: "辛热温补肾阳、引火归元于下，一寒一热使水火既济" },
  ],
  xuefu_zhuyu: [
    { role: "君", herbs: ["桃仁", "红花"], rationale: "活血化瘀" },
    { role: "臣", herbs: ["赤芍", "川芎", "牛膝"], rationale: "助活血；牛膝引血下行" },
    { role: "佐", herbs: ["生地黄", "当归", "柴胡", "枳壳", "桔梗"], rationale: "养血滋阴使祛瘀不伤正；柴枳桔疏肝理气、升降气机，气行则血行" },
    { role: "使", herbs: ["甘草"], rationale: "调和诸药" },
  ],
  sini: [
    { role: "君", herbs: ["柴胡"], rationale: "升发阳气、疏肝解郁" },
    { role: "臣", herbs: ["枳实"], rationale: "下气破结，与柴胡一升一降、调畅气机" },
    { role: "佐", herbs: ["白芍"], rationale: "柔肝缓急、养血敛阴" },
    { role: "使", herbs: ["炙甘草"], rationale: "调和诸药，与芍药相配缓急止痛" },
  ],
  shashen_maidong: [
    { role: "君", herbs: ["沙参", "麦冬"], rationale: "清养肺胃之阴" },
    { role: "臣", herbs: ["玉竹", "天花粉"], rationale: "生津润燥" },
    { role: "佐", herbs: ["桑叶", "白扁豆"], rationale: "桑叶轻清宣散燥邪；扁豆健运中焦、防滋腻碍胃" },
    { role: "使", herbs: ["生甘草"], rationale: "调和诸药" },
  ],
  bugan: [
    { role: "君", herbs: ["熟地黄"], rationale: "滋阴补血，养肝之体" },
    { role: "臣", herbs: ["当归", "白芍"], rationale: "养血柔肝" },
    { role: "佐", herbs: ["川芎", "酸枣仁", "木瓜"], rationale: "川芎行血防滞；枣仁养心安神；木瓜舒筋活络、酸甘化阴" },
    { role: "使", herbs: ["炙甘草"], rationale: "与芍药相配缓急止痛，调和诸药" },
  ],
  yangxin: [
    { role: "君", herbs: ["黄芪", "人参"], rationale: "补益心气" },
    { role: "臣", herbs: ["当归", "川芎"], rationale: "养血和营" },
    { role: "佐", herbs: ["柏子仁", "酸枣仁", "远志", "茯神", "五味子", "半夏曲", "肉桂"], rationale: "养心安神、收敛心气；半夏曲和胃化痰；少佐肉桂温通心阳、鼓舞气血" },
    { role: "使", herbs: ["炙甘草"], rationale: "益气和中、调和诸药" },
  ],
  shiquan_dabu: [
    { role: "君", herbs: ["人参", "熟地黄", "黄芪"], rationale: "气血双补，黄芪益气固表助温补之力" },
    { role: "臣", herbs: ["白术", "茯苓", "当归", "白芍"], rationale: "健脾益气、养血柔肝" },
    { role: "佐", herbs: ["川芎", "肉桂"], rationale: "川芎行血防滞；肉桂温阳助运，使气血得温则生" },
    { role: "使", herbs: ["炙甘草"], rationale: "调和诸药" },
  ],
  danzhi_xiaoyao: [
    { role: "君", herbs: ["柴胡"], rationale: "疏肝解郁" },
    { role: "臣", herbs: ["当归", "白芍", "牡丹皮", "栀子"], rationale: "归芍养血柔肝；丹皮清血中伏火，栀子清泄三焦郁火" },
    { role: "佐", herbs: ["白术", "茯苓"], rationale: "健脾益气，实脾防木乘" },
    { role: "使", herbs: ["薄荷", "生姜", "炙甘草"], rationale: "薄荷助疏郁，煨姜和胃，甘草调和" },
  ],
  jingfang_baidu: [
    { role: "君", herbs: ["荆芥", "防风", "羌活", "独活"], rationale: "疏风散寒、胜湿止痛" },
    { role: "臣", herbs: ["柴胡", "前胡"], rationale: "一升一降、解表宣肺" },
    { role: "佐", herbs: ["川芎", "枳壳", "桔梗", "茯苓"], rationale: "行气活血、宽胸利气、健脾渗湿" },
    { role: "使", herbs: ["甘草"], rationale: "调和诸药" },
  ],
  sangju: [
    { role: "君", herbs: ["桑叶", "菊花"], rationale: "轻清宣透、疏散风热" },
    { role: "臣", herbs: ["薄荷", "杏仁", "桔梗"], rationale: "薄荷助疏散；杏仁降肺、桔梗宣肺，一宣一降复肺之宣降" },
    { role: "佐", herbs: ["连翘", "芦根"], rationale: "清热解毒、生津止渴" },
    { role: "使", herbs: ["生甘草"], rationale: "调和诸药" },
  ],
  taohong_siwu: [
    { role: "君", herbs: ["桃仁", "红花"], rationale: "活血化瘀" },
    { role: "臣", herbs: ["当归", "川芎"], rationale: "养血活血、行气通脉" },
    { role: "佐", herbs: ["熟地黄", "白芍"], rationale: "滋阴养血，使祛瘀不伤正" },
  ],
  banxia_xiexin: [
    { role: "君", herbs: ["法半夏"], rationale: "辛温散结消痞、降逆止呕" },
    { role: "臣", herbs: ["干姜", "黄芩", "黄连"], rationale: "干姜温中散寒，芩连苦寒泄热，辛开苦降、寒热并调" },
    { role: "佐", herbs: ["人参", "大枣"], rationale: "甘温益气、补益中虚，痞因中虚而起者非补不消" },
    { role: "使", herbs: ["炙甘草"], rationale: "调和诸药、补中和胃" },
  ],
  xiaochaihu: [
    { role: "君", herbs: ["柴胡"], rationale: "透达少阳之邪、疏利枢机" },
    { role: "臣", herbs: ["黄芩"], rationale: "清泄少阳之热，柴芩相配一散一清" },
    { role: "佐", herbs: ["法半夏", "生姜", "人参", "大枣"], rationale: "半夏生姜和胃降逆，参枣益气和中、扶正达邪" },
    { role: "使", herbs: ["炙甘草"], rationale: "调和诸药" },
  ],
  guizhi: [
    { role: "君", herbs: ["桂枝"], rationale: "解肌发表、温通卫阳" },
    { role: "臣", herbs: ["白芍"], rationale: "益阴敛营，桂芍相配一散一收、调和营卫" },
    { role: "佐", herbs: ["生姜", "大枣"], rationale: "生姜助桂枝散邪，大枣助白芍和营" },
    { role: "使", herbs: ["炙甘草"], rationale: "调和诸药" },
  ],
  wuling: [
    { role: "君", herbs: ["泽泻"], rationale: "直达下焦、利水渗湿" },
    { role: "臣", herbs: ["猪苓", "茯苓"], rationale: "增强利水渗湿之功" },
    { role: "佐", herbs: ["白术"], rationale: "健脾燥湿、运化水湿，绝水湿之源" },
    { role: "使", herbs: ["桂枝"], rationale: "温阳化气，助膀胱气化以行水" },
  ],
};
