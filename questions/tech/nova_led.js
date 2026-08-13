// 技术进阶 - 诺瓦 LED控制系统 - 题库
// 基于知识库：接收卡+发送卡产品介绍、LED控制系统演变史、LED显示行业基础知识、信号源种类和接口类型
const QUESTIONS_tech_nova_led = [
  // ===== 单选题 (7题/套，题库~18题) =====
  { id: 'tnl_s1', type: 'single', question: '诺瓦接收卡的主要功能是什么？', options: ['接收视频信号并驱动LED模组显示', '提供电源给LED屏幕', '控制LED屏幕的亮度', '生成视频内容'], answer: 'A', points: 5, explain: '接收卡的核心功能是接收来自发送卡的视频信号，解码后驱动LED模组进行显示。' },
  { id: 'tnl_s2', type: 'single', question: '诺瓦发送卡通常通过什么接口与接收卡连接？', options: ['千兆网口（RJ45）', 'USB接口', 'HDMI接口', 'VGA接口'], answer: 'A', points: 5, explain: '发送卡通过千兆网口（RJ45）将视频信号传输给接收卡，这是LED控制系统中最常见的连接方式。' },
  { id: 'tnl_s3', type: 'single', question: '在LED控制系统中，一张发送卡最多能带载多少像素点？', options: ['65万像素', '130万像素', '260万像素', '520万像素'], answer: 'B', points: 5, explain: '一张标准发送卡最大带载能力为130万像素，超过此数量需要增加发送卡或多张发送卡级联。' },
  { id: 'tnl_s4', type: 'single', question: 'LED显示屏的刷新率通常要求达到多少以上才能保证画面不闪烁？', options: ['60Hz', '120Hz', '1920Hz', '3840Hz'], answer: 'D', points: 5, explain: 'LED显示屏的刷新率通常要求达到3840Hz以上，远高于普通显示器的60Hz，以确保拍摄时不出现扫描线。' },
  { id: 'tnl_s5', type: 'single', question: '诺瓦的GTS系统主要功能是什么？', options: ['LED屏幕的远程监控和管理', '视频内容制作', '音频处理', '电源管理'], answer: 'A', points: 5, explain: 'GTS（Global Technical Service）是诺瓦的远程监控和管理系统，可对LED屏幕进行远程状态监控、故障诊断和内容管理。' },
  { id: 'tnl_s6', type: 'single', question: 'LED显示系统中，灰度等级通常用多少bit来表示？', options: ['8bit', '12bit', '14bit', '18bit'], answer: 'C', points: 5, explain: 'LED显示系统通常使用14bit灰度处理，可呈现16384级灰度，确保画面细腻平滑。高端产品可达18bit+。' },
  { id: 'tnl_s7', type: 'single', question: '接收卡的"任意走线"功能是指什么？', options: ['网线可以任意连接，系统自动识别走线顺序', '线缆可以任意弯曲', '接口可以任意插拔', '信号可以任意切换'], answer: 'A', points: 5, explain: '任意走线功能允许网线不按顺序连接接收卡，系统自动识别每个接收卡的位置，大大简化了现场布线工作。' },
  { id: 'tnl_s8', type: 'single', question: 'LED显示屏的像素间距（Pitch）越小，意味着什么？', options: ['分辨率越高，画面越清晰', '亮度越高', '功耗越低', '成本越低'], answer: 'A', points: 5, explain: '像素间距越小，单位面积内的像素点越多，分辨率越高，画面越清晰。常见的有P1.25、P1.5、P2.5等规格。' },
  { id: 'tnl_s9', type: 'single', question: '诺瓦的"屏老板"系统属于什么类型的产品？', options: ['LED屏幕远程管理平台', 'LED屏幕硬件控制器', '视频播放软件', '屏幕校准工具'], answer: 'A', points: 5, explain: '屏老板是诺瓦的LED屏幕远程管理平台，提供设备管理、内容发布、状态监控等功能。' },
  { id: 'tnl_s10', type: 'single', question: '在LED控制系统中，HDR功能的实现主要依赖什么？', options: ['高动态范围处理算法', '更亮的LED灯珠', '更快的网速', '更大的屏幕'], answer: 'A', points: 5, explain: 'HDR（高动态范围）通过算法处理扩展亮度范围，使亮部更亮、暗部更暗，呈现更多细节。' },
  { id: 'tnl_s11', type: 'single', question: 'LED接收卡上的"扫描"参数指的是什么？', options: ['LED模组的扫描方式（如1/32扫）', '画面刷新速度', '信号扫描频率', '色彩扫描范围'], answer: 'A', points: 5, explain: '扫描参数指LED模组的扫描方式，如1/16扫、1/32扫等，决定了同一时间点亮多少行LED灯珠。' },
  { id: 'tnl_s12', type: 'single', question: '诺瓦发送卡支持的视频输入接口包括哪些？', options: ['HDMI、DVI、DP', '仅HDMI', '仅VGA', '仅USB'], answer: 'A', points: 5, explain: '诺瓦发送卡通常支持HDMI、DVI、DP等多种视频输入接口，兼容主流视频源设备。' },
  { id: 'tnl_s13', type: 'single', question: 'LED屏幕出现"拖影"现象的可能原因是什么？', options: ['刷新率过低或响应时间不足', '亮度过高', '分辨率过高', '网线过长'], answer: 'A', points: 5, explain: '拖影通常是由于刷新率不够或LED灯珠响应时间不足导致，需要调整控制系统参数或更换更高性能的驱动IC。' },
  { id: 'tnl_s14', type: 'single', question: '诺瓦控制系统中，ColorAjust技术的作用是什么？', options: ['实现LED屏幕的逐点色彩校正', '调节屏幕亮度', '调整画面比例', '优化网络传输'], answer: 'A', points: 5, explain: 'ColorAjust是诺瓦的逐点色彩校正技术，通过对每个像素点进行独立校准，消除色差和亮度不均。' },
  { id: 'tnl_s15', type: 'single', question: '在LED控制系统中，光电转换器的作用是什么？', options: ['将电信号转换为光信号进行长距离传输', '将光信号转换为电能', '测量屏幕亮度', '转换电源电压'], answer: 'A', points: 5, explain: '光电转换器将电信号转换为光信号通过光纤传输，实现远距离（可达数十公里）的无损信号传输。' },
  { id: 'tnl_s16', type: 'single', question: 'LED屏幕的"死灯"现象通常由什么原因造成？', options: ['LED灯珠损坏或焊接不良', '控制系统故障', '网线接触不良', '电源电压过高'], answer: 'A', points: 5, explain: '死灯通常是LED灯珠本身损坏或生产工艺中的焊接不良导致，需要更换对应模组或进行维修。' },
  { id: 'tnl_s17', type: 'single', question: '接收卡与发送卡之间使用什么协议进行通信？', options: ['千兆以太网协议', 'USB协议', 'HDMI协议', '串口协议'], answer: 'A', points: 5, explain: '接收卡和发送卡之间通过千兆以太网进行数据传输，使用诺瓦私有的数据传输协议。' },
  { id: 'tnl_s18', type: 'single', question: '诺瓦的"智能设置"功能主要用于什么场景？', options: ['自动识别LED模组参数并配置接收卡', '自动调节屏幕亮度', '自动切换信号源', '自动更新固件'], answer: 'A', points: 5, explain: '智能设置功能可自动识别LED模组的规格参数（分辨率、扫描方式等），简化现场配置工作。' },

  // ===== 多选题 (4题/套，题库~12题) =====
  { id: 'tnl_m1', type: 'multiple', question: '诺瓦LED控制系统由哪些核心组件组成？', options: ['发送卡', '接收卡', '视频处理器', 'LED模组', '电源适配器'], answer: 'ABC', points: 5, explain: 'LED控制系统核心组件包括发送卡（视频信号发送）、接收卡（信号接收和驱动）和视频处理器（信号处理和切换）。' },
  { id: 'tnl_m2', type: 'multiple', question: '以下哪些因素会影响LED显示屏的显示效果？', options: ['刷新率', '灰度等级', '像素间距', '色温', '信号延迟'], answer: 'ABCDE', points: 5, explain: '刷新率、灰度等级、像素间距、色温和信号延迟都是影响LED显示屏显示效果的重要因素。' },
  { id: 'tnl_m3', type: 'multiple', question: '诺瓦接收卡支持哪些功能？', options: ['任意走线', '逐点校正', 'HDR处理', '3D显示', '热备份'], answer: 'ABCDE', points: 5, explain: '诺瓦接收卡支持任意走线、逐点校正、HDR处理、3D显示和热备份等多种高级功能。' },
  { id: 'tnl_m4', type: 'multiple', question: '以下哪些是LED控制系统中常见的信号传输方式？', options: ['千兆网线传输', '光纤传输', '同轴电缆传输', '无线传输', 'HDMI直连'], answer: 'AB', points: 5, explain: 'LED控制系统中主要使用千兆网线（短距离）和光纤（长距离）进行信号传输，保证信号质量。' },
  { id: 'tnl_m5', type: 'multiple', question: 'LED屏幕出现"扫描线"的可能原因有哪些？', options: ['刷新率设置过低', '快门速度过快拍摄', '接收卡配置错误', '电源供电不足', '网线质量差'], answer: 'ABCDE', points: 5, explain: '扫描线可能由多种原因造成：刷新率低、拍摄快门快、接收卡配置错误、供电不足或网线质量差等。' },
  { id: 'tnl_m6', type: 'multiple', question: '诺瓦控制系统支持哪些视频输入接口类型？', options: ['HDMI', 'DVI', 'DP（DisplayPort）', 'SDI', 'VGA'], answer: 'ABCDE', points: 5, explain: '诺瓦控制系统支持HDMI、DVI、DP、SDI和VGA等多种视频输入接口，兼容各种视频源。' },
  { id: 'tnl_m7', type: 'multiple', question: '以下哪些是LED控制系统的重要性能指标？', options: ['带载能力', '刷新率', '灰度等级', '色彩深度', '传输延迟'], answer: 'ABCDE', points: 5, explain: '带载能力、刷新率、灰度等级、色彩深度和传输延迟都是衡量LED控制系统性能的重要指标。' },
  { id: 'tnl_m8', type: 'multiple', question: '诺瓦GTS/屏老板系统支持哪些远程管理功能？', options: ['设备状态监控', '远程内容发布', '故障告警', '固件升级', '播放日志查看'], answer: 'ABCDE', points: 5, explain: 'GTS/屏老板系统支持设备监控、内容发布、故障告警、固件升级和日志查看等全面的远程管理功能。' },
  { id: 'tnl_m9', type: 'multiple', question: 'LED显示系统中，哪些因素影响屏幕的亮度？', options: ['LED灯珠规格', '驱动电流', '扫描方式', '环境温度', '供电电压'], answer: 'ABCDE', points: 5, explain: 'LED灯珠规格、驱动电流、扫描方式、环境温度和供电电压都会影响屏幕的最终亮度表现。' },
  { id: 'tnl_m10', type: 'multiple', question: '接收卡配置文件通常包含哪些参数？', options: ['模组分辨率', '扫描方式', 'RGB信号顺序', '走线方式', '亮度校正数据'], answer: 'ABCDE', points: 5, explain: '接收卡配置文件包含模组分辨率、扫描方式、RGB顺序、走线方式和亮度校正数据等关键参数。' },

  // ===== 判断题 (3题/套，题库~9题) =====
  { id: 'tnl_j1', type: 'judge', question: 'LED显示屏的刷新率越高，拍摄时越不容易出现扫描线。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '刷新率越高，LED屏幕在一帧内刷新次数越多，拍摄时越不容易出现扫描线。' },
  { id: 'tnl_j2', type: 'judge', question: '接收卡的数量越多，LED屏幕的显示效果就越好。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '接收卡数量取决于带载需求，并非越多越好。过多的接收卡会增加系统复杂度和成本。' },
  { id: 'tnl_j3', type: 'judge', question: '千兆网线的最大传输距离通常为100米。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '标准千兆网线（Cat5e/Cat6）的最大传输距离为100米，超过此距离需要使用光纤或中继器。' },
  { id: 'tnl_j4', type: 'judge', question: 'LED模组的扫描方式越高（如1/64扫），同一时间点亮的灯珠越多。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '扫描方式越高表示同一时间点亮的灯珠越少。1/64扫意味着每次只点亮1/64的灯珠。' },
  { id: 'tnl_j5', type: 'judge', question: '光纤传输相比网线传输，具有更远的传输距离和更强的抗干扰能力。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '光纤传输距离可达数十公里，且不受电磁干扰，是长距离LED控制系统的最佳选择。' },
  { id: 'tnl_j6', type: 'judge', question: '任何分辨率的视频源都可以直接接入LED发送卡。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '发送卡有最大输入分辨率限制，超过限制的视频源需要先通过视频处理器进行缩放处理。' },
  { id: 'tnl_j7', type: 'judge', question: '逐点校正可以消除LED屏幕的色差和亮度不均。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '逐点校正技术通过对每个像素点的独立校准，可以有效消除色差和亮度不均，提升整体画质。' },
  { id: 'tnl_j8', type: 'judge', question: '发送卡可以同时输出多路信号到不同的接收卡组。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '部分发送卡支持多路输出，可以同时驱动多个接收卡组，实现更大的带载面积。' },

  // ===== 简答题 (4题/套，题库~12题) =====
  { id: 'tnl_q1', type: 'short', question: '请简述LED屏幕出现"黑屏"故障时，应该从哪些方面进行排查？', keywords: '电源,发送卡,接收卡,网线,信号源,连接,配置,固件', points: 10, explain: '排查顺序：1.检查电源是否正常供电；2.检查发送卡指示灯状态；3.检查接收卡指示灯状态；4.检查网线连接是否松动；5.检查信号源是否正常输出；6.检查配置文件是否正确。' },
  { id: 'tnl_q2', type: 'short', question: '请说明LED控制系统中"带载能力"的概念及其重要性。', keywords: '像素,分辨率,发送卡,接收卡,网口,级联,130万,带载', points: 10, explain: '带载能力指控制系统能驱动的最大像素点数量。发送卡标准带载130万像素，超过需增加发送卡或使用级联。带载能力不足会导致画面缺失或无法正常显示。' },
  { id: 'tnl_q3', type: 'short', question: '请简述诺瓦"任意走线"功能的工作原理和优势。', keywords: '自动识别,网线,顺序,接收卡,位置,简化,布线,配置', points: 10, explain: '任意走线功能允许网线不按顺序连接接收卡，系统通过识别算法自动定位每个接收卡的位置。优势是极大简化现场布线，降低施工难度和出错率。' },
  { id: 'tnl_q4', type: 'short', question: '在LED屏幕调试中，如何解决画面闪烁问题？', keywords: '刷新率,DCLK,相位,扫描,频率,驱动,3840,配置', points: 10, explain: '1.检查并提高刷新率（建议3840Hz以上）；2.调整DCLK时钟频率；3.调整OE极性；4.检查和调整扫描参数；5.确认驱动IC配置正确。' },
  { id: 'tnl_q5', type: 'short', question: '请说明LED屏幕"色差"问题的成因及解决方法。', keywords: '亮度,波长,批次,灯珠,逐点校正,校准,ColorAjust,温度', points: 10, explain: '色差成因：LED灯珠批次差异、亮度波长不一致、温度影响。解决方法：使用逐点校正技术（如ColorAjust）对每个像素进行独立校准，消除色差和亮度不均。' },
  { id: 'tnl_q6', type: 'short', question: '请简述光纤传输在LED控制系统中的优势和使用场景。', keywords: '长距离,抗干扰,光纤,传输,光电转换,远距离,稳定,户外', points: 10, explain: '光纤传输优势：传输距离远（可达数十公里）、抗电磁干扰、信号稳定。使用场景：大型户外屏幕、跨建筑连接、强电磁干扰环境等需要长距离或高可靠性传输的场景。' },
  { id: 'tnl_q7', type: 'short', question: '请说明如何判断一张接收卡是否正常工作？', keywords: '指示灯,闪烁,绿灯,红灯,通信,信号,供电,状态', points: 10, explain: '判断方法：1.观察接收卡指示灯状态（绿灯闪烁表示正常通信）；2.检查对应模组是否正常显示；3.通过软件查看接收卡在线状态；4.测量供电电压是否正常。' },
  { id: 'tnl_q8', type: 'short', question: '请说明LED屏幕的灰度等级对显示效果的影响。', keywords: '灰度,16384,14bit,平滑,过渡,色彩,层次,细腻', points: 10, explain: '灰度等级越高，画面明暗过渡越平滑，色彩层次越丰富。14bit灰度可呈现16384级，消除低灰偏色和过渡断层，实现细腻的画面表现。' },
  { id: 'tnl_q9', type: 'short', question: '请简述LED控制系统在户外广告屏中的应用要点。', keywords: '防水,散热,亮度,远程,监控,防护,环境,稳定', points: 10, explain: '户外应用要点：1.设备需具备防水防尘能力（IP65+）；2.保证散热系统正常工作；3.亮度需达到5000nit以上；4.配置远程监控系统（GTS/屏老板）；5.做好防雷和接地保护。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_tech_nova_led;
}