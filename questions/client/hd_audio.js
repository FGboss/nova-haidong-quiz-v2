// 客户端考核 - 嗨动 音频扩声系统 - 题库
// 基于知识库：天韵系列、奥菲斯系列、公共广播、音频处理器、音频基础知识、线缆接头、扩声方案设计
const QUESTIONS_client_hd_audio = [
  // ===== 单选题 (7题/套，题库~18题) =====
  { id: 'cha_s1', type: 'single', question: '天韵系列音频产品的主要定位是什么？', options: ['专业扩声系统，面向会议室和多功能厅', '家庭影院音响', '便携蓝牙音箱', '耳机'], answer: 'A', points: 5, explain: '天韵系列是嗨动专业扩声系统产品线，覆盖会议室、多功能厅、报告厅等商业扩声场景。' },
  { id: 'cha_s2', type: 'single', question: '奥菲斯系列音频产品的核心特点是什么？', options: ['高端数字音频处理，支持Dante网络音频', '入门级模拟音频', '仅支持单声道', '不需要供电'], answer: 'A', points: 5, explain: '奥菲斯系列是高端数字音频处理产品，支持Dante网络音频协议，适用于大型和复杂的音频系统。' },
  { id: 'cha_s3', type: 'single', question: '公共广播系统中，定压输出和定阻输出的主要区别是什么？', options: ['定压适合远距离多扬声器，定阻适合近距离高质量', '定压输出功率更大', '定阻输出更便宜', '没有区别'], answer: 'A', points: 5, explain: '定压输出（70V/100V）适合远距离、多扬声器并联场景；定阻输出（4Ω/8Ω）适合近距离、高音质场景。' },
  { id: 'cha_s4', type: 'single', question: '音频处理器中，EQ（均衡器）的作用是什么？', options: ['调整不同频率段的增益，改善音质', '增加音量', '减少噪音', '改变音源'], answer: 'A', points: 5, explain: 'EQ均衡器通过调整各频段的增益来补偿或修饰声音，矫正声场缺陷，改善整体音质表现。' },
  { id: 'cha_s5', type: 'single', question: 'Dante音频网络协议是什么类型的协议？', options: ['基于标准IP网络的数字音频传输协议', '模拟音频传输协议', '蓝牙音频协议', '光纤音频协议'], answer: 'A', points: 5, explain: 'Dante是Audinate公司开发的基于标准IP网络的数字音频传输协议，支持低延迟、多通道音频传输。' },
  { id: 'cha_s6', type: 'single', question: 'XLR（卡侬）接头的特点是什么？', options: ['平衡传输，抗干扰能力强，专业音频标准接口', '非平衡传输', '仅用于电源', '仅用于视频'], answer: 'A', points: 5, explain: 'XLR接头采用平衡传输方式，三芯设计（正、负、地），具有强抗干扰能力，是专业音频的标准接口。' },
  { id: 'cha_s7', type: 'single', question: '专业功放的额定功率通常标注在什么负载条件下？', options: ['8Ω或4Ω', '100Ω', '1Ω', '0.1Ω'], answer: 'A', points: 5, explain: '专业功放通常标注在8Ω或4Ω负载下的额定功率，这是最常见的扬声器阻抗标准。' },
  { id: 'cha_s8', type: 'single', question: '反馈抑制器的主要功能是什么？', options: ['自动检测并抑制麦克风啸叫', '增加音量', '改善音质', '延长混响'], answer: 'A', points: 5, explain: '反馈抑制器自动检测音频反馈频点（啸叫），通过窄带滤波器将其抑制，防止产生刺耳的啸叫声。' },
  { id: 'cha_s9', type: 'single', question: '在扩声方案设计中，声压级（SPL）的单位是什么？', options: ['dB（分贝）', 'Hz（赫兹）', 'W（瓦特）', 'V（伏特）'], answer: 'A', points: 5, explain: '声压级以分贝（dB）为单位，衡量声音的响度，扩声设计的目标是确保各区域声压级均匀覆盖。' },
  { id: 'cha_s10', type: 'single', question: '调音台中"AUX发送"的作用是什么？', options: ['将信号发送到辅助输出，如监听或效果器', '调节主音量', '切换输入通道', '开关电源'], answer: 'A', points: 5, explain: 'AUX（辅助）发送用于将通道信号发送到辅助输出，常用于舞台监听、效果器或录音等。' },
  { id: 'cha_s11', type: 'single', question: '天韵系列扬声器通常采用什么类型的箱体设计？', options: ['全频音箱+超低音音箱的组合设计', '仅高音单元', '仅中音单元', '开放式箱体'], answer: 'A', points: 5, explain: '天韵系列采用全频音箱和超低音音箱的组合设计，覆盖完整频率范围，满足不同场景需求。' },
  { id: 'cha_s12', type: 'single', question: '在音频系统中，"信噪比（SNR）"指标的意义是什么？', options: ['信号与噪声的比值，越高表示音质越纯净', '信号强度', '噪声大小', '功率大小'], answer: 'A', points: 5, explain: '信噪比是信号功率与噪声功率的比值，SNR越高表示背景噪声越小，音质越纯净清晰。' },
  { id: 'cha_s13', type: 'single', question: '公共广播系统中，分区控制的主要作用是什么？', options: ['对不同区域进行独立广播或背景音乐播放', '增加音量', '减少设备数量', '降低功耗'], answer: 'A', points: 5, explain: '分区控制允许对不同区域（如不同楼层、不同部门）进行独立的广播或背景音乐播放，实现灵活管理。' },
  { id: 'cha_s14', type: 'single', question: '音频处理器中，压缩器（Compressor）的主要作用是什么？', options: ['控制动态范围，防止信号过载', '增加音量', '改变音色', '消除噪声'], answer: 'A', points: 5, explain: '压缩器通过压缩动态范围，将过大信号降低，防止削波失真，保护扬声器系统不被过载损坏。' },
  { id: 'cha_s15', type: 'single', question: 'TRS 6.35mm接头与TS 6.35mm接头的主要区别是什么？', options: ['TRS是三芯平衡/立体声，TS是两芯非平衡/单声道', 'TRS更小', 'TRS只能用于吉他', '没有区别'], answer: 'A', points: 5, explain: 'TRS（Tip-Ring-Sleeve）三芯支持平衡或立体声；TS（Tip-Sleeve）两芯仅支持非平衡单声道信号。' },
  { id: 'cha_s16', type: 'single', question: '在扩声系统中，扬声器覆盖角度的选择依据是什么？', options: ['根据听音区域的覆盖范围和安装位置确定', '越大越好', '越小越好', '固定90度'], answer: 'A', points: 5, explain: '扬声器覆盖角度需根据听音区域的大小、形状和安装位置选择，确保声场均匀覆盖，避免声聚焦和死区。' },
  { id: 'cha_s17', type: 'single', question: '奥菲斯系列支持的Dante音频通道数通常是多少？', options: ['64×64通道以上', '2×2通道', '8×8通道', '16×16通道'], answer: 'A', points: 5, explain: '奥菲斯系列高端型号支持64×64甚至更多Dante通道，满足大型音频系统的复杂路由需求。' },
  { id: 'cha_s18', type: 'single', question: '音频系统中，接地环路（Ground Loop）会导致什么问题？', options: ['产生50Hz交流哼声', '音质变好', '音量增大', '信号增强'], answer: 'A', points: 5, explain: '接地环路会产生50Hz（或60Hz）的交流哼声，严重影响音质，需通过隔离变压器或平衡连接解决。' },

  // ===== 多选题 (4题/套，题库~10题) =====
  { id: 'cha_m1', type: 'multiple', question: '天韵系列扩声系统包含哪些组件？', options: ['全频音箱', '超低音音箱', '专业功放', '音频处理器', '调音台'], answer: 'ABCDE', points: 5, explain: '天韵系列提供全频音箱、超低音、功放、音频处理器和调音台等完整的扩声系统组件。' },
  { id: 'cha_m2', type: 'multiple', question: '以下哪些是常见的专业音频接口？', options: ['XLR（卡侬）', 'TRS 6.35mm', 'RCA', 'Speakon', '3.5mm'], answer: 'ABCDE', points: 5, explain: 'XLR、TRS、RCA、Speakon和3.5mm都是常见的音频接口，其中XLR和Speakon是专业扩声最常用的。' },
  { id: 'cha_m3', type: 'multiple', question: '音频处理器通常包含哪些功能模块？', options: ['均衡器(EQ)', '压缩器', '分频器', '限幅器', '延时器'], answer: 'ABCDE', points: 5, explain: '音频处理器通常集成均衡器、压缩器、分频器、限幅器和延时器等功能模块。' },
  { id: 'cha_m4', type: 'multiple', question: 'Dante网络音频系统的优势包括哪些？', options: ['低延迟', '多通道', '灵活路由', '标准网络布线', '即插即用'], answer: 'ABCDE', points: 5, explain: 'Dante系统具有低延迟、多通道传输、灵活路由、标准网络布线和设备自动发现等优势。' },
  { id: 'cha_m5', type: 'multiple', question: '公共广播系统通常包含哪些功能？', options: ['背景音乐播放', '紧急广播', '分区控制', '定时播放', '消防联动'], answer: 'ABCDE', points: 5, explain: '公共广播系统支持背景音乐、紧急广播、分区控制、定时播放和消防联动等功能。' },
  { id: 'cha_m6', type: 'multiple', question: '以下哪些因素会影响扩声系统的音质？', options: ['扬声器品质', '功放匹配', '房间声学', '线缆质量', '信号源质量'], answer: 'ABCDE', points: 5, explain: '扬声器品质、功放匹配、房间声学特性、线缆质量和信号源质量都会影响最终音质表现。' },
  { id: 'cha_m7', type: 'multiple', question: '在音频系统中，可能导致啸叫的原因有哪些？', options: ['麦克风与扬声器距离过近', '系统增益过高', '房间反射强烈', 'EQ设置不当', '麦克风指向性不合适'], answer: 'ABCDE', points: 5, explain: '啸叫可能由麦克风拾取扬声器声音、增益过高、房间反射、EQ设置不当和麦克风指向性不合适等多种原因导致。' },
  { id: 'cha_m8', type: 'multiple', question: '专业功放选型时需要考虑哪些参数？', options: ['额定功率', '负载阻抗', '信噪比', '总谐波失真', '阻尼系数'], answer: 'ABCDE', points: 5, explain: '功放选型需考虑额定功率、负载阻抗匹配、信噪比、总谐波失真和阻尼系数等关键参数。' },
  { id: 'cha_m9', type: 'multiple', question: '会议室扩声方案设计需要考虑哪些因素？', options: ['房间面积和形状', '使用场景', '预算', '装修风格', '声学环境'], answer: 'ABCDE', points: 5, explain: '会议室扩声设计需综合考虑房间面积形状、使用场景、预算、装修风格和声学环境等因素。' },
  { id: 'cha_m10', type: 'multiple', question: '以下哪些是嗨动音频产品线？', options: ['天韵系列', '奥菲斯系列', '公共广播', '音频处理器', '功放系列'], answer: 'ABCDE', points: 5, explain: '嗨动音频产品线包括天韵系列、奥菲斯系列、公共广播、音频处理器和功放系列等。' },

  // ===== 判断题 (3题/套，题库~8题) =====
  { id: 'cha_j1', type: 'judge', question: 'XLR接口采用平衡传输方式，抗干扰能力优于非平衡RCA接口。', options: ['正确', '错误'], answer: 'A', points: 5, explain: 'XLR平衡传输利用共模抑制原理消除干扰，传输距离和抗干扰能力远优于非平衡RCA接口。' },
  { id: 'cha_j2', type: 'judge', question: '定压功放可以直接连接定阻扬声器。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '定压功放和定阻扬声器不能直接连接，需要通过变压器匹配，否则会损坏设备。' },
  { id: 'cha_j3', type: 'judge', question: 'Dante音频系统必须使用专用交换机，不能用普通网络交换机。', options: ['正确', '错误'], answer: 'B', points: 5, explain: 'Dante可使用标准网络交换机，但推荐使用支持QoS和IGMP Snooping的交换机以保证音频传输质量。' },
  { id: 'cha_j4', type: 'judge', question: '功放的额定功率应大于扬声器的额定功率。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '功放功率通常应为扬声器功率的1.5-2倍，留有充足余量，既能保证动态表现，又避免削波失真损坏扬声器。' },
  { id: 'cha_j5', type: 'judge', question: '音频处理器可以完全替代调音台。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '音频处理器和调音台功能不同：处理器用于信号处理优化，调音台用于多路信号混合和实时控制，两者互补而非替代。' },
  { id: 'cha_j6', type: 'judge', question: '公共广播系统必须支持消防联动功能。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '根据消防规范，公共广播系统必须具备消防联动功能，火灾时自动切换至紧急广播模式。' },
  { id: 'cha_j7', type: 'judge', question: '平衡传输线缆长度可达数百米而不明显衰减。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '平衡传输利用差分信号传输，抗干扰能力强，线缆长度可达数百米而信号质量无明显下降。' },
  { id: 'cha_j8', type: 'judge', question: '所有扬声器都可以在有水源的环境中使用。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '普通扬声器不具备防水能力，户外或潮湿环境需使用防水等级（IP65+）的专用扬声器。' },

  // ===== 简答题 (4题/套，题库~9题) =====
  { id: 'cha_q1', type: 'short', question: '请简述会议室扩声系统方案设计的基本流程。', keywords: '需求,声场,扬声器,功放,处理器,调音台,布线,调试', points: 10, explain: '设计流程：1.收集需求（房间尺寸、用途、预算）；2.声场模拟计算；3.选择扬声器型号和布局；4.匹配功放功率；5.配置音频处理器；6.选择调音台和音源；7.设计布线方案；8.安装调试。' },
  { id: 'cha_q2', type: 'short', question: '请说明反馈抑制器的工作原理和安装注意事项。', keywords: '反馈,啸叫,频率,检测,抑制,滤波器,麦克风,位置', points: 10, explain: '工作原理：实时检测反馈频率，自动生成窄带陷波滤波器抑制啸叫。安装注意：1.正确连接在信号链路中；2.合理设置检测灵敏度；3.避免过度抑制影响音质；4.优先通过声学优化和摆位减少反馈。' },
  { id: 'cha_q3', type: 'short', question: '请解释Dante网络音频系统的基本架构和配置要点。', keywords: 'Dante,IP,网络,交换机,QoS,延迟,通道,路由', points: 10, explain: '架构：基于标准IP网络的音频传输系统，设备通过交换机互联。配置要点：1.配置Dante Controller软件路由；2.设置QoS保障音频优先；3.配置IGMP Snooping；4.同步时钟源设置；5.合理规划通道数量。' },
  { id: 'cha_q4', type: 'short', question: '天韵系列和奥菲斯系列在定位上有什么区别？如何为客户选择？', keywords: '天韵,会议室,奥菲斯,高端,Dante,数字,模拟,场景', points: 10, explain: '天韵系列面向常规会议室和多功能厅，提供模拟扩声方案。奥菲斯系列面向大型高端场景，支持Dante数字网络音频，适合复杂系统。选择依据：项目规模、预算、音频复杂度、是否需要网络化。' },
  { id: 'cha_q5', type: 'short', question: '公共广播系统设计中，如何合理规划扬声器分区？', keywords: '分区,区域,功能,独立,消防,楼层,部门,控制', points: 10, explain: '分区规划：1.按楼层物理分区；2.按功能区域（办公区/公共区/会议区）；3.各分区可独立控制音量和开关；4.消防分区与建筑防火分区一致；5.考虑未来扩展需求。' },
  { id: 'cha_q6', type: 'short', question: '在扩声系统中，如何解决接地环路导致的交流哼声？', keywords: '接地,环路,哼声,隔离,平衡,变压器,接地,电源', points: 10, explain: '解决方法：1.使用音频隔离变压器；2.确保所有设备在同一电源回路；3.使用平衡连接方式；4.检查信号线屏蔽层接地；5.断开信号地环路（lift ground）；6.使用DI盒隔离。' },
  { id: 'cha_q7', type: 'short', question: '音频线缆接头焊接时，XLR平衡接头的引脚定义是什么？', keywords: 'XLR,引脚,1地,2热,3冷,平衡,焊接,接头', points: 10, explain: 'XLR引脚定义：Pin1-接地（屏蔽），Pin2-信号热端（+），Pin3-信号冷端（-）。焊接时需确保焊点牢固、无短路、屏蔽层正确接地。' },
  { id: 'cha_q8', type: 'short', question: '请说明音频处理器中压缩器、限幅器、噪声门三个模块的区别和作用。', keywords: '压缩器,限幅器,噪声门,动态,阈值,压缩比,保护,信噪比', points: 10, explain: '压缩器：超过阈值按比例压缩，控制动态范围。限幅器：超过阈值硬性限制，防止过载保护设备。噪声门：低于阈值切断信号，消除背景噪声。三者共同实现信号动态管理。' },
  { id: 'cha_q9', type: 'short', question: '在多功能厅扩声设计中，如何平衡语言清晰度和音乐表现力？', keywords: '均衡,声场,混响,扬声器,覆盖,处理器,模式,场景', points: 10, explain: '平衡方法：1.使用音频处理器设置不同场景模式（会议/演出）；2.语言场景强调中高频清晰度；3.音乐场景扩展低频和高频响应；4.合理布置扬声器确保声场均匀；5.适当控制混响时间。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_tech_hd_audio;
}