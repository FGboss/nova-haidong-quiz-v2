// 技术进阶 - 诺瓦 整机方案与配件 - 题库
// 基于知识库：LED一体机系统、配件产品、常规方案计算、渠道全系方案
const QUESTIONS_tech_nova_integration = [
  // ===== 单选题 (7题/套，题库~18题) =====
  { id: 'tni_s1', type: 'single', question: '诺瓦LED一体机系统的核心优势是什么？', options: ['高度集成，即插即用，无需额外配置发送卡和接收卡', '价格最低', '仅支持户外使用', '需要专业人员安装'], answer: 'A', points: 5, explain: 'LED一体机将发送卡、接收卡、电源等核心组件高度集成，实现即插即用，大幅降低安装调试门槛。' },
  { id: 'tni_s2', type: 'single', question: '诺瓦LED一体机通常适用于哪些场景？', options: ['中小型会议室和展厅', '大型体育场馆', '户外广告牌', '电影院银幕'], answer: 'A', points: 5, explain: 'LED一体机定位于中小型会议室、展厅、教室等室内场景，提供便捷的LED显示解决方案。' },
  { id: 'tni_s3', type: 'single', question: '渠道全系方案中，"全系"指的是什么？', options: ['覆盖从接收卡到视频处理器的完整产品线', '仅包含接收卡', '仅包含发送卡', '仅包含配件'], answer: 'A', points: 5, explain: '渠道全系方案提供从接收卡、发送卡到视频处理器、配件的完整产品组合，满足渠道客户的一站式采购需求。' },
  { id: 'tni_s4', type: 'single', question: '在常规方案计算中，一块P2.5的LED屏幕（2m×1.5m）大约需要多少张接收卡？', options: ['根据模组规格和带载能力计算，通常2-4张', '固定1张', '至少10张', '不需要接收卡'], answer: 'A', points: 5, explain: '接收卡数量取决于屏幕总像素和接收卡带载能力，需根据实际模组规格计算，常规中小屏幕一般2-4张。' },
  { id: 'tni_s5', type: 'single', question: '诺瓦LED一体机支持的最大分辨率通常是多少？', options: ['1920×1080（Full HD）', '3840×2160（4K）', '7680×4320（8K）', '640×480'], answer: 'B', points: 5, explain: '诺瓦主流LED一体机支持4K分辨率，满足高清显示需求，部分高端型号支持更高分辨率。' },
  { id: 'tni_s6', type: 'single', question: '诺瓦配件中，光电转换器的主要作用是什么？', options: ['实现网线信号到光纤信号的转换，延长传输距离', '将光信号转换为电能', '测量屏幕亮度', '转换输入电压'], answer: 'A', points: 5, explain: '光电转换器（光纤收发器）将网线电信号转换为光纤光信号，实现远距离传输，可达数十公里。' },
  { id: 'tni_s7', type: 'single', question: 'LED一体机内置的OPS（Open Pluggable Specification）模块用于什么？', options: ['提供可插拔的计算模块，实现智能系统功能', '提供额外的电源', '增加网络接口', '提升屏幕亮度'], answer: 'A', points: 5, explain: 'OPS模块是可插拔的标准计算模块，内置操作系统和应用程序，使LED一体机具备智能交互功能。' },
  { id: 'tni_s8', type: 'single', question: '在方案计算中，发送卡的数量取决于什么？', options: ['屏幕总像素和发送卡带载能力', '接收卡数量', '屏幕尺寸（平方米）', '网线长度'], answer: 'A', points: 5, explain: '发送卡数量由屏幕总像素点除以单张发送卡带载能力（标准130万像素）来确定，需向上取整。' },
  { id: 'tni_s9', type: 'single', question: '诺瓦LED一体机的安装方式通常是什么？', options: ['壁挂式或移动支架式', '仅天花板吊装', '地面嵌入式', '仅桌面摆放'], answer: 'A', points: 5, explain: 'LED一体机支持壁挂安装和移动支架两种方式，灵活适应不同场景需求。' },
  { id: 'tni_s10', type: 'single', question: '渠道方案中常见的"套餐"通常包含哪些组件？', options: ['接收卡+发送卡+视频处理器+配件', '仅接收卡', '仅视频处理器', '仅电源'], answer: 'A', points: 5, explain: '渠道套餐方案将接收卡、发送卡、视频处理器和必要配件打包，提供一站式采购和优惠价格。' },
  { id: 'tni_s11', type: 'single', question: 'LED一体机的色域通常能达到多少？', options: ['NTSC 72%以上', 'sRGB 50%', 'Adobe RGB 100%', '仅黑白显示'], answer: 'A', points: 5, explain: '诺瓦LED一体机色域覆盖NTSC 72%以上，高端型号可达110% NTSC以上，色彩表现丰富。' },
  { id: 'tni_s12', type: 'single', question: '在计算LED屏幕所需电源数量时，关键参数是什么？', options: ['模组功率和电源功率', '屏幕尺寸', '屏幕颜色', '安装位置'], answer: 'A', points: 5, explain: '电源数量 = (模组数量 × 单模组功耗) / 单电源额定功率，需考虑安全余量，通常按80%负载率计算。' },
  { id: 'tni_s13', type: 'single', question: '诺瓦一体机常用的无线投屏方案支持哪些协议？', options: ['AirPlay、Miracast、DLNA', '仅蓝牙', '仅WiFi Direct', '仅NFC'], answer: 'A', points: 5, explain: '诺瓦一体机支持AirPlay（苹果）、Miracast（安卓/Windows）和DLNA等主流无线投屏协议。' },
  { id: 'tni_s14', type: 'single', question: 'LED一体机在维护时，通常采用什么方式？', options: ['前维护设计，从前方即可拆卸模组', '必须从后方拆卸', '必须整体更换', '不需要维护'], answer: 'A', points: 5, explain: 'LED一体机多采用前维护设计，维护人员可从屏幕前方直接拆卸和更换模组，适合贴墙安装场景。' },
  { id: 'tni_s15', type: 'single', question: '在渠道方案中，"标配"和"选配"的区别是什么？', options: ['标配是必须包含的组件，选配是根据需求可选的组件', '标配是免费的，选配是收费的', '标配是国产的，选配是进口的', '没有区别'], answer: 'A', points: 5, explain: '标配是方案中必须包含的基础组件，选配是根据客户具体需求可以额外添加的组件，如更高规格的处理器等。' },
  { id: 'tni_s16', type: 'single', question: '诺瓦LED一体机的对比度通常能达到多少？', options: ['5000:1以上', '100:1', '500:1', '1000:1'], answer: 'A', points: 5, explain: 'LED一体机采用自发光技术，对比度可达5000:1以上，黑色表现纯净，远优于LCD屏幕。' },
  { id: 'tni_s17', type: 'single', question: '配件产品中，多功能卡的主要功能是什么？', options: ['提供多种接口扩展，如音频、USB、串口等', '替代接收卡', '替代发送卡', '替代电源'], answer: 'A', points: 5, explain: '多功能卡为LED控制系统提供音频输入输出、USB接口、RS232串口等扩展功能，增强系统连通性。' },
  { id: 'tni_s18', type: 'single', question: 'LED一体机整机方案中，散热设计通常采用什么方式？', options: ['无风扇静音散热设计', '强制风冷散热', '水冷散热', '不需要散热'], answer: 'A', points: 5, explain: 'LED一体机采用无风扇静音散热设计，通过合理的热传导和自然对流实现散热，确保会议室等场景的安静环境。' },

  // ===== 多选题 (4题/套，题库~10题) =====
  { id: 'tni_m1', type: 'multiple', question: '诺瓦LED一体机系统通常包含哪些核心组件？', options: ['LED显示模组', '内置发送卡', '内置接收卡', '电源系统', '智能主板'], answer: 'ABCDE', points: 5, explain: 'LED一体机将显示模组、发送卡、接收卡、电源和智能主板高度集成，实现一体化设计。' },
  { id: 'tni_m2', type: 'multiple', question: '在方案计算中，影响接收卡数量的因素有哪些？', options: ['屏幕总像素点', '接收卡带载能力', '模组接口数量', '网口数量', '扫描方式'], answer: 'ABCDE', points: 5, explain: '接收卡数量受屏幕总像素、接收卡带载能力、模组接口数量、网口数量和扫描方式等多种因素影响。' },
  { id: 'tni_m3', type: 'multiple', question: '诺瓦LED一体机支持哪些信号输入方式？', options: ['HDMI输入', '无线投屏', 'USB播放', 'Type-C直连', '网络流媒体'], answer: 'ABCDE', points: 5, explain: 'LED一体机支持HDMI、无线投屏、USB直读、Type-C和网络流媒体等多种信号输入方式。' },
  { id: 'tni_m4', type: 'multiple', question: '以下哪些是诺瓦的配件产品？', options: ['光电转换器', '多功能卡', '电源模块', '网线中继器', '屏体连接线'], answer: 'ABCDE', points: 5, explain: '诺瓦配件产品线包括光电转换器、多功能卡、电源模块、网线中继器和屏体连接线等配套产品。' },
  { id: 'tni_m5', type: 'multiple', question: '渠道全系方案的优势包括哪些？', options: ['一站式采购', '价格优惠', '产品兼容性好', '技术支持统一', '库存管理简化'], answer: 'ABCDE', points: 5, explain: '渠道全系方案提供一站式采购、价格优惠、产品兼容性保证、统一技术支持和简化库存管理等优势。' },
  { id: 'tni_m6', type: 'multiple', question: 'LED一体机安装前的准备工作包括哪些？', options: ['确认安装位置承重', '检查电源容量', '确认信号源接口', '准备安装工具', '测量安装空间尺寸'], answer: 'ABCDE', points: 5, explain: '安装前需确认位置承重能力、电源容量、信号源接口类型、准备安装工具并精确测量空间尺寸。' },
  { id: 'tni_m7', type: 'multiple', question: '以下哪些因素会影响LED一体机的显示效果？', options: ['环境光照', '安装平整度', '信号源质量', '观看距离', '电源稳定性'], answer: 'ABCDE', points: 5, explain: '环境光照、安装平整度、信号源质量、观看距离和电源稳定性都会影响LED一体机的最终显示效果。' },
  { id: 'tni_m8', type: 'multiple', question: '在方案设计中，需要考虑的电气参数有哪些？', options: ['总功率需求', '电源规格', '配电箱容量', '线缆规格', '接地保护'], answer: 'ABCDE', points: 5, explain: '方案设计需考虑总功率、电源规格、配电箱容量、线缆规格和接地保护等电气参数，确保系统安全稳定运行。' },
  { id: 'tni_m9', type: 'multiple', question: '诺瓦LED一体机在会议室场景的优势有哪些？', options: ['节省空间', '安装便捷', '维护简单', '显示效果好', '一体化设计'], answer: 'ABCDE', points: 5, explain: 'LED一体机在会议室中具有节省空间、安装便捷、前维护简单、显示效果好和一体化设计等优势。' },
  { id: 'tni_m10', type: 'multiple', question: '渠道方案中常见的配件组合包括哪些？', options: ['网线+光纤', '安装支架', '信号线缆', '备品模组', '工具箱'], answer: 'ABCDE', points: 5, explain: '渠道方案配件组合通常包括网线光纤、安装支架、信号线缆、备品模组和安装工具箱等。' },

  // ===== 判断题 (3题/套，题库~8题) =====
  { id: 'tni_j1', type: 'judge', question: 'LED一体机不需要额外配置发送卡和接收卡即可使用。', options: ['正确', '错误'], answer: 'A', points: 5, explain: 'LED一体机已将发送卡和接收卡集成在内部，用户开箱即用，无需额外配置。' },
  { id: 'tni_j2', type: 'judge', question: '所有LED一体机都支持前维护设计。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '并非所有LED一体机都支持前维护，部分型号可能采用后维护设计，需根据具体型号确认。' },
  { id: 'tni_j3', type: 'judge', question: '在方案计算中，发送卡数量只与屏幕面积有关。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '发送卡数量由屏幕总像素点决定，而非面积。相同面积下不同像素间距的屏幕像素点数差异很大。' },
  { id: 'tni_j4', type: 'judge', question: '渠道全系方案中，所有组件必须从同一品牌采购。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '渠道全系方案推荐统一品牌以保证兼容性，但并非强制，客户可根据需求选择部分第三方组件。' },
  { id: 'tni_j5', type: 'judge', question: 'OPS模块是LED一体机的标准配置，不可拆卸。', options: ['正确', '错误'], answer: 'B', points: 5, explain: 'OPS模块采用可插拔设计，用户可根据需要更换或升级OPS模块，并非固定不可拆卸。' },
  { id: 'tni_j6', type: 'judge', question: 'LED一体机的散热设计对设备寿命有重要影响。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '良好的散热设计可延长LED灯珠和电子元件的使用寿命，降低故障率，是产品质量的重要指标。' },
  { id: 'tni_j7', type: 'judge', question: '电源功率计算时，按照总功耗的100%选择电源即可。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '电源选型需考虑安全余量，通常按80%负载率计算，即选用额定功率为总功耗1.25倍以上的电源。' },
  { id: 'tni_j8', type: 'judge', question: 'LED一体机支持无线投屏功能，可完全替代有线连接。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '无线投屏虽然便捷，但在高带宽需求（如4K视频）或稳定性和延迟要求高的场景下，有线连接仍然是更好的选择。' },

  // ===== 简答题 (4题/套，题库~9题) =====
  { id: 'tni_q1', type: 'short', question: '请简述诺瓦LED一体机相比传统拼接LED屏幕的主要优势。', keywords: '集成,即插即用,前维护,节省空间,安装便捷,一体化,智能,无线投屏', points: 10, explain: 'LED一体机优势：1.高度集成，无需分别配置发送卡接收卡；2.即插即用，开箱即用；3.前维护设计，方便维护；4.一体化设计节省空间；5.支持无线投屏等智能功能。' },
  { id: 'tni_q2', type: 'short', question: '在方案计算中，如何确定LED屏幕所需的接收卡数量？请列出计算步骤。', keywords: '像素,分辨率,接收卡,带载,模组,网口,规格,计算', points: 10, explain: '计算步骤：1.计算屏幕总像素=宽×高（像素）；2.确定单张接收卡带载能力；3.接收卡数量=总像素/单卡带载能力（向上取整）；4.还需考虑模组接口数量和网口限制。' },
  { id: 'tni_q3', type: 'short', question: '请说明渠道全系方案给渠道商带来的商业价值。', keywords: '一站式,采购,价格,优惠,兼容,库存,支持,效率', points: 10, explain: '商业价值：1.一站式采购降低采购成本和时间；2.打包价格优惠提高利润空间；3.产品兼容性保证减少售后问题；4.简化库存管理；5.统一技术支持降低服务成本。' },
  { id: 'tni_q4', type: 'short', question: 'LED一体机安装时需要注意哪些关键问题？', keywords: '承重,电源,信号,平整度,散热,接地,安全,环境', points: 10, explain: '关键问题：1.确认安装面承重能力；2.检查电源容量和接地；3.确保信号源接口匹配；4.调整安装平整度；5.保证散热空间；6.做好安全防护。' },
  { id: 'tni_q5', type: 'short', question: '请说明光电转换器在LED控制系统中的作用和选型要点。', keywords: '光纤,传输,距离,信号,转换,速率,接口,兼容', points: 10, explain: '作用：将电信号转换为光信号实现远距离传输。选型要点：1.传输速率匹配（千兆/万兆）；2.接口类型（SC/LC）；3.传输距离；4.与发送卡/接收卡的兼容性；5.工作温度范围。' },
  { id: 'tni_q6', type: 'short', question: '请简述LED一体机OPS模块的功能和应用场景。', keywords: 'OPS,可插拔,计算,智能,系统,升级,配置,交互', points: 10, explain: 'OPS模块是可插拔计算模块，内置操作系统和应用程序。应用场景：1.会议室白板协作；2.视频会议；3.信息发布；4.文档演示。支持灵活升级和更换。' },
  { id: 'tni_q7', type: 'short', question: '方案设计中，如何选择合适的电源配置？', keywords: '功率,负载,余量,80%,额定,散热,稳定性,安全', points: 10, explain: '电源选择：1.计算总功耗=模组数量×单模组功耗；2.按80%负载率计算所需电源额定功率；3.选择合适输出电压（通常5V）；4.考虑散热和稳定性；5.预留扩展余量。' },
  { id: 'tni_q8', type: 'short', question: '诺瓦LED一体机的前维护设计是如何实现的？有什么优势？', keywords: '前维护,磁吸,拆卸,模组,工具,维护,效率,成本', points: 10, explain: '前维护设计通过磁吸或卡扣固定模组，使用专用工具从前方拆卸。优势：1.贴墙安装时无需后方空间；2.维护效率高；3.降低维护成本；4.不影响整体美观。' },
  { id: 'tni_q9', type: 'short', question: '在为客户设计LED屏幕方案时，需要收集哪些关键需求信息？', keywords: '尺寸,分辨率,观看距离,亮度,环境,预算,用途,安装', points: 10, explain: '关键需求：1.屏幕尺寸和安装空间；2.分辨率要求；3.观看距离；4.使用环境（室内/户外）；5.亮度需求；6.预算范围；7.主要用途（会议/广告/演出）；8.安装方式偏好。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_tech_nova_integration;
}