// 客户端考核 - 诺瓦 视频拼接处理器 - 题库
// 基于知识库：V系列、TB系列、TU系列、H系列产品推广介绍
const QUESTIONS_client_nova_video = [
  { id: 'cnv_s1', type: 'single', question: '诺瓦V系列视频拼接处理器的主要定位是什么？', options: ['高端旗舰级视频拼接处理器', '入门级视频处理器', '便携式切换台', 'LED接收卡'], answer: 'A', points: 5, explain: 'V系列是诺瓦的高端旗舰级视频拼接处理器，面向大型LED显示项目和高端应用场景。' },
  { id: 'cnv_s2', type: 'single', question: 'TB系列视频处理器的典型应用场景是什么？', options: ['中型会议室和展厅', '大型体育场馆', '户外广告', '家庭影院'], answer: 'A', points: 5, explain: 'TB系列定位于中型应用场景，如会议室、展厅、中型演播室等，提供性价比优良的视频处理方案。' },
  { id: 'cnv_s3', type: 'single', question: 'TU系列的一个显著特点是什么？', options: ['支持多用户场景管理', '仅支持单路输入', '不需要外接电源', '只能用于户外屏幕'], answer: 'A', points: 5, explain: 'TU系列支持多用户场景管理，可以保存和快速切换不同的显示场景，适应多变的应用需求。' },
  { id: 'cnv_s4', type: 'single', question: 'H系列视频处理器的核心优势是什么？', options: ['高性价比的入门级解决方案', '最高端的处理能力', '最大的输入接口数量', '最长的传输距离'], answer: 'A', points: 5, explain: 'H系列定位于高性价比的入门级市场，提供可靠的基础视频处理功能，适合预算有限的项目。' },
  { id: 'cnv_s5', type: 'single', question: '视频拼接处理器的"图层"功能是指什么？', options: ['可以在屏幕上同时显示多个独立的视频画面', '屏幕的物理分层', '颜色的分层', '亮度的分层'], answer: 'A', points: 5, explain: '图层功能允许在屏幕上同时显示多个独立的视频画面，每个画面可以独立缩放、移动和叠加。' },
  { id: 'cnv_s6', type: 'single', question: '视频处理器中"预监"功能的作用是什么？', options: ['在切换前预览画面内容', '预先监控屏幕温度', '提前检测网络状态', '预览电源状态'], answer: 'A', points: 5, explain: '预监（PVW）功能允许操作员在将画面切换到主输出前预览内容，确保切换准确无误。' },
  { id: 'cnv_s7', type: 'single', question: '诺瓦视频处理器支持的4K分辨率是多少？', options: ['3840×2160', '1920×1080', '2560×1440', '4096×3112'], answer: 'A', points: 5, explain: '诺瓦视频处理器支持标准的4K UHD分辨率3840×2160@60Hz输入输出。' },
  { id: 'cnv_s8', type: 'single', question: '视频处理器中"EDID管理"的作用是什么？', options: ['管理输入输出设备的分辨率匹配', '管理设备电源', '管理网络配置', '管理用户权限'], answer: 'A', points: 5, explain: 'EDID管理确保视频处理器与输入源和显示设备之间的分辨率、刷新率等参数正确匹配。' },
  { id: 'cnv_s9', type: 'single', question: '视频拼接处理器的"画中画(PIP)"功能允许什么？', options: ['在主画面中叠加显示一个小画面', '同时显示两个等大的画面', '画面旋转90度', '画面镜像翻转'], answer: 'A', points: 5, explain: '画中画（PIP）功能允许在主画面中叠加一个或多个小画面，常用于视频会议、监控等场景。' },
  { id: 'cnv_s10', type: 'single', question: '诺瓦视频处理器中"场景轮巡"功能的作用是什么？', options: ['自动按预设顺序切换显示场景', '自动巡检设备状态', '轮换播放视频文件', '轮流检查网口状态'], answer: 'A', points: 5, explain: '场景轮巡功能按照预设顺序和时间间隔自动切换不同的显示场景，适用于信息发布等场景。' },
  { id: 'cnv_s11', type: 'single', question: '视频处理器中"Genlock（同步锁相）"功能的作用是什么？', options: ['确保多个视频源画面同步', '锁定设备防止被盗', '锁定设置防止误操作', '同步音频和视频'], answer: 'A', points: 5, explain: 'Genlock同步锁相确保多个视频源之间的帧同步，避免画面撕裂，在广电级应用中非常重要。' },
  { id: 'cnv_s12', type: 'single', question: '诺瓦视频处理器支持的最大输出分辨率是多少？', options: ['8K（7680×4320）', '4K（3840×2160）', '2K（1920×1080）', '16K（15360×8640）'], answer: 'A', points: 5, explain: '诺瓦高端视频处理器支持8K分辨率输出，适用于超大型LED屏幕和高端应用。' },
  { id: 'cnv_s13', type: 'single', question: '3G-SDI接口在视频处理器中的主要用途是什么？', options: ['广电级视频信号的输入输出', '网络数据传输', '音频信号传输', '电源供电'], answer: 'A', points: 5, explain: '3G-SDI是广播级数字视频接口标准，用于广电和演播室场景的视频信号传输，支持1080p@60Hz。' },
  { id: 'cnv_s14', type: 'single', question: '视频处理器中"色度键（Chroma Key）"功能主要用于什么？', options: ['实现虚拟演播室的抠像效果', '调整画面色彩', '锁定颜色设置', '加密颜色数据'], answer: 'A', points: 5, explain: '色度键（抠像）功能可将指定颜色（通常为绿色或蓝色）替换为其他画面，用于虚拟演播室等场景。' },
  { id: 'cnv_s15', type: 'single', question: '视频处理器出现"输入无信号"提示时，首先应检查什么？', options: ['信号源是否正常输出', '网络连接是否正常', '电源是否接通', '软件版本是否最新'], answer: 'A', points: 5, explain: '出现"输入无信号"时，首先应检查信号源设备是否正常输出，确认信号线和接口连接是否牢固。' },
  { id: 'cnv_s16', type: 'single', question: '视频处理器的"帧同步"功能解决什么问题？', options: ['不同信号源之间的画面不同步', '画面帧率过低', '画面分辨率不匹配', '颜色不一致'], answer: 'A', points: 5, explain: '帧同步功能解决多个不同信号源之间的帧率不一致问题，确保所有输入画面同步显示，避免撕裂。' },
  { id: 'cnv_s17', type: 'single', question: '诺瓦视频处理器支持的多画面显示模式，最多可以同时显示多少个画面？', options: ['16个画面', '4个画面', '8个画面', '32个画面'], answer: 'A', points: 5, explain: '诺瓦高端视频处理器支持最多16个画面的同时显示，满足大型监控和指挥中心的多画面需求。' },
  { id: 'cnv_s18', type: 'single', question: '视频处理器中"输出同步"指的是什么？', options: ['多个输出接口之间的画面同步', '输入和输出的同步', '音频和视频的同步', '网络时间的同步'], answer: 'A', points: 5, explain: '输出同步确保多个输出接口（如拼接屏的各个单元）之间的画面完全同步，消除拼接缝隙的视觉差异。' },

  { id: 'cnv_m1', type: 'multiple', question: '诺瓦视频处理器产品线包括哪些系列？', options: ['V系列', 'TB系列', 'TU系列', 'H系列', 'X系列'], answer: 'ABCD', points: 5, explain: '诺瓦视频处理器产品线包括V系列（旗舰）、TB系列（中端）、TU系列（多场景）和H系列（入门级）。' },
  { id: 'cnv_m2', type: 'multiple', question: '视频拼接处理器支持哪些常见的视频输入接口？', options: ['HDMI', 'DVI', 'DP', 'SDI', 'VGA'], answer: 'ABCDE', points: 5, explain: '视频拼接处理器通常支持HDMI、DVI、DP、SDI和VGA等多种输入接口，以兼容不同视频源。' },
  { id: 'cnv_m3', type: 'multiple', question: '以下哪些是视频处理器的重要功能特性？', options: ['多图层处理', '场景切换', '画面缩放', '色彩校正', 'EDID管理'], answer: 'ABCDE', points: 5, explain: '多图层、场景切换、画面缩放、色彩校正和EDID管理都是视频处理器的核心功能特性。' },
  { id: 'cnv_m4', type: 'multiple', question: '视频处理器中的"画面特效"可能包括哪些？', options: ['淡入淡出', '无缝切换', '画中画', '画面冻结', 'LOGO叠加'], answer: 'ABCDE', points: 5, explain: '视频处理器支持淡入淡出、无缝切换、画中画、画面冻结和LOGO叠加等多种画面特效。' },
  { id: 'cnv_m5', type: 'multiple', question: '在选择视频拼接处理器时，需要考虑哪些关键参数？', options: ['输入输出接口数量', '最大分辨率支持', '图层数量', '处理延迟', '散热方式'], answer: 'ABCDE', points: 5, explain: '选择视频处理器需综合考虑接口数量、分辨率支持、图层能力、处理延迟和散热方式等参数。' },
  { id: 'cnv_m6', type: 'multiple', question: '视频处理器支持哪些输出信号类型？', options: ['HDMI输出', 'DVI输出', 'SDI输出', '网口输出（LED专用）', 'DP输出'], answer: 'ABCDE', points: 5, explain: '视频处理器支持HDMI、DVI、SDI、LED专用网口输出和DP等多种输出方式。' },
  { id: 'cnv_m7', type: 'multiple', question: '以下哪些场景适合使用视频拼接处理器？', options: ['大型LED显示屏', '会议室多屏系统', '广播电视演播室', '安防监控中心', '舞台演出'], answer: 'ABCDE', points: 5, explain: '视频拼接处理器广泛应用于LED大屏、会议室、演播室、监控中心和舞台演出等场景。' },
  { id: 'cnv_m8', type: 'multiple', question: '视频处理器出现画面异常时，可能的原因包括哪些？', options: ['信号线接触不良', '分辨率设置不匹配', 'EDID配置错误', '固件版本过旧', '散热不良'], answer: 'ABCDE', points: 5, explain: '画面异常可能由信号线接触、分辨率不匹配、EDID错误、固件问题和散热问题等多种原因造成。' },
  { id: 'cnv_m9', type: 'multiple', question: '视频处理器的控制方式包括哪些？', options: ['前面板按键', 'Web界面', 'RS232串口', '移动APP', '红外遥控'], answer: 'ABCDE', points: 5, explain: '视频处理器支持前面板、Web界面、串口、APP和红外遥控等多种控制方式。' },

  { id: 'cnv_j1', type: 'judge', question: '视频拼接处理器的图层越多，可以同时显示的画面就越多。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '图层数量决定了可以同时叠加显示的画面数量，图层越多，多画面显示能力越强。' },
  { id: 'cnv_j2', type: 'judge', question: '视频处理器可以处理音频信号。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '视频处理器通常支持音频的嵌入和解嵌，可以对音频进行加嵌、解嵌和切换处理。' },
  { id: 'cnv_j3', type: 'judge', question: '所有视频处理器都支持4K分辨率输入输出。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '并非所有视频处理器都支持4K，入门级产品可能只支持1080p或2K分辨率。' },
  { id: 'cnv_j4', type: 'judge', question: '视频处理器的处理延迟越小越好。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '处理延迟越小，画面实时性越好，尤其在直播和互动场景中延迟至关重要。' },
  { id: 'cnv_j5', type: 'judge', question: 'HDMI接口支持音频传输。', options: ['正确', '错误'], answer: 'A', points: 5, explain: 'HDMI接口同时支持视频和音频信号的传输，是音视频一体化接口。' },
  { id: 'cnv_j6', type: 'judge', question: 'DVI接口支持音频传输。', options: ['正确', '错误'], answer: 'B', points: 5, explain: 'DVI接口只支持视频信号传输，不支持音频。需要使用HDMI或DP接口才能同时传输音频。' },
  { id: 'cnv_j7', type: 'judge', question: '视频处理器的场景切换功能可以保存和调用预设的显示布局。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '场景切换功能允许用户保存不同的显示布局为预设场景，一键切换不同的显示效果。' },

  { id: 'cnv_q1', type: 'short', question: '请简述视频拼接处理器中"图层"和"场景"的区别。', keywords: '图层,叠加,同时,场景,切换,保存,布局,预设', points: 10, explain: '图层是同时显示在屏幕上的画面叠加单元，多个图层可同时显示。场景是预设的图层布局组合，不同场景可以快速切换，每个场景包含不同的图层数量、位置和大小。' },
  { id: 'cnv_q2', type: 'short', question: '在视频处理器选型时，需要关注哪些核心技术参数？', keywords: '分辨率,接口,图层,延迟,4K,8K,输入,输出', points: 10, explain: '关注的参数：1.最大输入输出分辨率（是否支持4K/8K）；2.输入输出接口类型和数量；3.最大图层数量；4.处理延迟；5.是否支持Genlock同步；6.散热和功耗。' },
  { id: 'cnv_q3', type: 'short', question: '请说明视频处理器出现"画面撕裂"的原因和解决方法。', keywords: '帧同步,Genlock,垂直同步,刷新率,匹配,延迟,撕裂', points: 10, explain: '原因：输入信号帧率与输出刷新率不同步。解决方法：1.开启Genlock同步锁相功能；2.启用帧同步；3.确保输入输出刷新率匹配；4.使用垂直同步（V-Sync）。' },
  { id: 'cnv_q4', type: 'short', question: '请简述诺瓦V系列和H系列视频处理器的主要区别。', keywords: '旗舰,入门,高端,性价比,图层,接口,功能,场景', points: 10, explain: 'V系列是旗舰级产品，支持更多图层、更高分辨率（8K）、更多接口和高级功能（Genlock等）。H系列是入门级产品，功能基础但性价比较高，适合预算有限的中小项目。' },
  { id: 'cnv_q5', type: 'short', question: '请说明视频处理器的"色彩校正"功能及其重要性。', keywords: '色温,亮度,对比度,Gamma,校准,一致性,拼接,屏幕', points: 10, explain: '色彩校正用于调整画面的色温、亮度、对比度和Gamma等参数，确保多屏拼接时的色彩一致性，消除拼接屏幕间的色差，提升整体视觉效果。' },
  { id: 'cnv_q6', type: 'short', question: '请说明视频处理器的"热备份"功能及其作用。', keywords: '备份,冗余,自动切换,故障,电源,主备,可靠,稳定', points: 10, explain: '热备份功能指配置主备两台设备，当主设备故障时自动切换到备用设备，确保系统不中断运行。通常包括电源备份和信号备份两种方式，提升系统可靠性。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_tech_nova_video;
}