// 技术进阶 - 嗨动 视频拼接与矩阵 - 题库
// 基于知识库：B系列拼接处理器、E系列拼接服务器、EMX视频矩阵、无缝混插矩阵、NVDS解码矩阵、DT视频分配器、LCD拼接方案
const QUESTIONS_tech_hd_video = [
  // ===== 单选题 (7题/套，题库~18题) =====
  { id: 'thv_s1', type: 'single', question: '嗨动B系列拼接处理器的主要定位是什么？', options: ['专业级多屏拼接处理器，支持多路输入输出', '入门级单屏切换器', '仅用于音频处理', 'LED接收卡'], answer: 'A', points: 5, explain: 'B系列是嗨动专业级拼接处理器，支持多路视频输入和输出，实现多屏拼接显示、画面分割和信号切换。' },
  { id: 'thv_s2', type: 'single', question: 'E系列拼接服务器与B系列最大的区别是什么？', options: ['E系列基于服务器架构，支持更复杂的软件处理', 'E系列价格更低', 'E系列仅支持单路输出', 'E系列不需要供电'], answer: 'A', points: 5, explain: 'E系列基于服务器架构，运行操作系统，支持更复杂的软件算法和网络化处理能力，而B系列是硬件嵌入式方案。' },
  { id: 'thv_s3', type: 'single', question: 'EMX视频矩阵的"矩阵"功能核心是什么？', options: ['任意输入信号可以切换到任意输出通道', '仅支持1对1切换', '仅支持信号放大', '仅支持信号编码'], answer: 'A', points: 5, explain: '矩阵切换器核心功能是实现M路输入到N路输出的任意切换，即任意输入信号可以路由到任意输出通道。' },
  { id: 'thv_s4', type: 'single', question: '无缝混插矩阵的"无缝"指的是什么？', options: ['信号切换时画面无黑屏、无闪烁', '机箱没有缝隙', '接口可以随意插拔', '不需要线缆'], answer: 'A', points: 5, explain: '无缝切换指在信号源切换过程中画面不出现黑屏、闪烁或撕裂，确保显示连续性，适用于广电和直播场景。' },
  { id: 'thv_s5', type: 'single', question: 'NVDS解码矩阵的主要功能是什么？', options: ['将网络视频流解码并矩阵切换输出', '将模拟信号转换为数字信号', '将音频信号放大', '为LED屏幕供电'], answer: 'A', points: 5, explain: 'NVDS解码矩阵接收IP网络视频流，解码后通过矩阵切换输出到多个显示终端，适用于监控和指挥中心。' },
  { id: 'thv_s6', type: 'single', question: 'DT视频分配器的作用是什么？', options: ['将一路视频信号复制分配到多路输出', '将多路信号合并为一路', '将视频信号放大', '将模拟信号转为数字信号'], answer: 'A', points: 5, explain: 'DT视频分配器将一路视频信号无损复制到多路输出，保证各输出端信号质量和时序一致。' },
  { id: 'thv_s7', type: 'single', question: 'LCD拼接方案中，拼接缝隙通常是多少？', options: ['0.88mm-3.5mm', '10mm以上', '完全无缝', '50mm'], answer: 'A', points: 5, explain: '主流LCD拼接屏物理拼缝在0.88mm到3.5mm之间，0.88mm为目前超窄边产品，画面整体性更好。' },
  { id: 'thv_s8', type: 'single', question: 'B系列拼接处理器支持的最大输入分辨率是多少？', options: ['4K@60Hz', '1080P@30Hz', '720P@60Hz', '8K@30Hz'], answer: 'A', points: 5, explain: 'B系列高端型号支持4K@60Hz输入，满足高清视频源的处理需求，确保画面细节不丢失。' },
  { id: 'thv_s9', type: 'single', question: '无缝混插矩阵的"混插"是什么意思？', options: ['支持不同类型信号接口板卡混合插入', '电源线和信号线混插', '不同品牌设备混用', '输入输出接口随意混接'], answer: 'A', points: 5, explain: '混插指机箱支持多种信号类型的板卡（HDMI、DVI、SDI、VGA等）混合插入，灵活配置输入输出接口。' },
  { id: 'thv_s10', type: 'single', question: 'NVDS解码矩阵支持的最大解码分辨率通常是多少？', options: ['4K', '1080P', '720P', '8K'], answer: 'A', points: 5, explain: 'NVDS解码矩阵支持4K分辨率解码，满足高清网络视频流的解码显示需求。' },
  { id: 'thv_s11', type: 'single', question: 'E系列拼接服务器通常采用什么操作系统？', options: ['Linux嵌入式系统', 'Windows Server', 'macOS', 'Android'], answer: 'A', points: 5, explain: 'E系列拼接服务器基于Linux嵌入式系统，提供高稳定性和低延迟的视频处理能力。' },
  { id: 'thv_s12', type: 'single', question: 'LCD拼接屏出现"色差"问题的主要原因是什么？', options: ['各屏单元出厂色温不一致', '电源问题', '信号线过长', '分辨率不匹配'], answer: 'A', points: 5, explain: 'LCD拼接屏色差主要由各单元出厂色温、亮度参数不一致导致，需通过专业校色设备和软件进行统一校准。' },
  { id: 'thv_s13', type: 'single', question: '拼接处理器中"画面漫游"功能指的是什么？', options: ['任意窗口可以跨屏自由移动和缩放', '自动循环播放画面', '画面自动旋转', '画面自动切换'], answer: 'A', points: 5, explain: '画面漫游允许任意输入窗口在拼接屏上自由移动位置和缩放大小，不受物理屏幕边界限制。' },
  { id: 'thv_s14', type: 'single', question: 'EMX视频矩阵通常支持哪些控制方式？', options: ['前面板按键、RS232、TCP/IP网络、遥控器', '仅前面板按键', '仅遥控器', '不支持远程控制'], answer: 'A', points: 5, explain: 'EMX矩阵支持多种控制方式：前面板按键、RS232串口、TCP/IP网络控制和红外遥控器，方便集成到中控系统。' },
  { id: 'thv_s15', type: 'single', question: 'DT视频分配器在选择时，最重要的参数是什么？', options: ['支持的最大分辨率和带宽', '外观尺寸', '重量', '颜色'], answer: 'A', points: 5, explain: '选择视频分配器时，最关键的是确认其支持的最大分辨率和带宽是否满足信号源要求，否则会出现画面降质。' },
  { id: 'thv_s16', type: 'single', question: '拼接处理器中"场景保存"功能的作用是什么？', options: ['保存当前窗口布局和信号路由配置，一键调用', '保存视频文件', '保存系统日志', '保存用户密码'], answer: 'A', points: 5, explain: '场景保存可将当前所有窗口位置、大小、信号源配置保存为预设场景，方便快速切换不同的显示模式。' },
  { id: 'thv_s17', type: 'single', question: 'B系列拼接处理器机箱通常支持多少路输入输出？', options: ['根据板卡配置，从4进4出到72进72出不等', '固定2进2出', '固定1进1出', '仅支持输入'], answer: 'A', points: 5, explain: 'B系列采用模块化设计，通过配置不同板卡可实现从4进4出到72进72出的灵活扩展。' },
  { id: 'thv_s18', type: 'single', question: '在LCD拼接方案中，图像处理器的作用是什么？', options: ['将一路信号分割显示到多个LCD屏幕上', '为LCD屏幕供电', '调节LCD屏幕亮度', '清洁LCD屏幕'], answer: 'A', points: 5, explain: '图像处理器将单路视频信号按拼接屏布局分割，使每个LCD单元显示对应区域，实现完整画面拼接。' },

  // ===== 多选题 (4题/套，题库~10题) =====
  { id: 'thv_m1', type: 'multiple', question: 'B系列拼接处理器支持哪些核心功能？', options: ['多屏拼接', '画面分割', '信号切换', '画面漫游', '场景保存'], answer: 'ABCDE', points: 5, explain: 'B系列支持多屏拼接、画面分割、信号切换、画面漫游和场景保存等完整功能。' },
  { id: 'thv_m2', type: 'multiple', question: '无缝混插矩阵支持哪些信号接口类型的板卡？', options: ['HDMI', 'DVI', 'SDI', 'VGA', 'DP'], answer: 'ABCDE', points: 5, explain: '混插矩阵支持HDMI、DVI、SDI、VGA和DP等多种信号板卡，灵活配置输入输出。' },
  { id: 'thv_m3', type: 'multiple', question: 'NVDS解码矩阵的典型应用场景包括哪些？', options: ['安防监控中心', '指挥调度中心', '智慧城市大屏', '视频会议', '远程教育'], answer: 'ABCDE', points: 5, explain: 'NVDS解码矩阵广泛应用于监控中心、指挥中心、智慧城市、视频会议和远程教育等场景。' },
  { id: 'thv_m4', type: 'multiple', question: 'LCD拼接屏方案设计需要考虑哪些因素？', options: ['拼缝宽度', '亮度均匀性', '分辨率', '安装方式', '散热条件'], answer: 'ABCDE', points: 5, explain: 'LCD拼接方案需考虑拼缝、亮度均匀性、分辨率、安装方式（壁挂/机柜）和散热条件等关键因素。' },
  { id: 'thv_m5', type: 'multiple', question: 'E系列拼接服务器相比B系列的优势有哪些？', options: ['更强的软件处理能力', '支持网络化部署', '可扩展性更强', '支持更多第三方应用', '运维管理更便捷'], answer: 'ABCDE', points: 5, explain: 'E系列基于服务器架构，具有更强的软件处理能力、网络化部署、更好的扩展性和运维便捷性。' },
  { id: 'thv_m6', type: 'multiple', question: '以下哪些是拼接处理器性能的重要指标？', options: ['输入输出通道数', '最大分辨率', '切换延迟', '画面处理能力', '系统稳定性'], answer: 'ABCDE', points: 5, explain: '拼接处理器关键指标包括通道数、分辨率支持、切换延迟、画面处理能力和系统稳定性。' },
  { id: 'thv_m7', type: 'multiple', question: 'DT视频分配器常见的故障表现有哪些？', options: ['画面闪烁', '信号丢失', '画面模糊', '颜色失真', '延迟增加'], answer: 'ABCDE', points: 5, explain: '视频分配器故障可表现为画面闪烁、信号丢失、画面模糊、颜色失真和延迟增加等。' },
  { id: 'thv_m8', type: 'multiple', question: 'EMX视频矩阵的控制接口通常包括哪些？', options: ['RS232串口', 'TCP/IP网络', '红外遥控', '前面板按键', 'USB接口'], answer: 'ABCDE', points: 5, explain: 'EMX矩阵提供RS232、TCP/IP、红外遥控、前面板按键和USB等多种控制接口。' },
  { id: 'thv_m9', type: 'multiple', question: '拼接处理器在大型指挥中心中的应用要点有哪些？', options: ['7×24小时不间断运行', '双电源冗余', '信号热备份', '低延迟处理', '统一管控平台'], answer: 'ABCDE', points: 5, explain: '指挥中心应用要求7×24运行、电源冗余、信号热备份、低延迟处理和统一管控平台等。' },
  { id: 'thv_m10', type: 'multiple', question: '以下哪些属于嗨动视频拼接产品线？', options: ['B系列拼接处理器', 'E系列拼接服务器', 'EMX视频矩阵', '无缝混插矩阵', 'NVDS解码矩阵'], answer: 'ABCDE', points: 5, explain: '嗨动视频拼接产品线包括B系列、E系列、EMX矩阵、无缝混插矩阵和NVDS解码矩阵等。' },

  // ===== 判断题 (3题/套，题库~8题) =====
  { id: 'thv_j1', type: 'judge', question: '无缝混插矩阵可以实现信号切换时零黑屏。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '无缝混插矩阵采用帧同步技术，实现信号切换时无黑屏、无闪烁、无撕裂的平滑过渡。' },
  { id: 'thv_j2', type: 'judge', question: 'NVDS解码矩阵只能解码H.264格式的视频流。', options: ['正确', '错误'], answer: 'B', points: 5, explain: 'NVDS解码矩阵通常支持H.264和H.265（HEVC）等多种编码格式，兼容性更广。' },
  { id: 'thv_j3', type: 'judge', question: 'LCD拼接屏的物理拼缝越小，画面整体性越好。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '物理拼缝越小，屏幕之间的黑色间隙越窄，画面整体感越强，观看体验越好。' },
  { id: 'thv_j4', type: 'judge', question: '视频分配器可以无限级联扩展输出数量。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '视频分配器级联会引入信号衰减和延迟，不建议无限级联，通常1-2级为宜，超过需使用信号放大器。' },
  { id: 'thv_j5', type: 'judge', question: 'B系列拼接处理器支持7×24小时不间断运行。', options: ['正确', '错误'], answer: 'A', points: 5, explain: 'B系列采用工业级设计，支持7×24小时不间断运行，满足监控中心等关键场景需求。' },
  { id: 'thv_j6', type: 'judge', question: 'E系列拼接服务器不需要安装任何软件即可使用。', options: ['正确', '错误'], answer: 'B', points: 5, explain: 'E系列基于服务器架构，需要安装配置相关软件和驱动，相比B系列需要更多的软件部署工作。' },
  { id: 'thv_j7', type: 'judge', question: '拼接处理器中的"漫游"功能允许窗口自由跨越屏幕边界。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '漫游功能允许窗口在拼接屏上自由移动，可以跨越物理屏幕边界，实现灵活的布局。' },
  { id: 'thv_j8', type: 'judge', question: '所有视频矩阵都支持无缝切换功能。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '并非所有视频矩阵都支持无缝切换，只有专门设计的无缝混插矩阵才具备帧同步切换能力。' },

  // ===== 简答题 (4题/套，题库~9题) =====
  { id: 'thv_q1', type: 'short', question: '请简述B系列拼接处理器和E系列拼接服务器的主要区别及各自适用场景。', keywords: 'B系列,硬件,嵌入式,E系列,服务器,软件,Linux,架构,场景', points: 10, explain: 'B系列是硬件嵌入式方案，即开即用，适合中小型会议室和展厅；E系列是服务器架构，软件处理能力强，适合大型指挥中心和需要复杂处理的场景。' },
  { id: 'thv_q2', type: 'short', question: '请说明无缝混插矩阵"混插"和"无缝"两个核心功能的技术实现原理。', keywords: '混插,板卡,接口,无缝,帧同步,切换,信号,黑屏', points: 10, explain: '混插：机箱采用模块化设计，支持HDMI/DVI/SDI等不同接口板卡灵活配置。无缝：采用帧同步技术，在信号切换时先缓存目标帧，再同步输出，消除黑屏和撕裂。' },
  { id: 'thv_q3', type: 'short', question: '在LCD拼接屏方案中，如何解决各屏单元之间的色差问题？', keywords: '校色,色温,亮度,均匀性,校准,仪器,软件,色彩', points: 10, explain: '解决方法：1.使用专业色彩校准仪器；2.统一设置色温（通常6500K）；3.调整各屏亮度至一致；4.使用校色软件进行Gamma曲线校正；5.定期维护校准。' },
  { id: 'thv_q4', type: 'short', question: 'NVDS解码矩阵在安防监控场景中的部署要点有哪些？', keywords: '解码,网络,带宽,延迟,数量,分辨率,稳定性,兼容', points: 10, explain: '部署要点：1.确认网络带宽满足多路解码需求；2.验证与摄像机协议的兼容性；3.合理规划解码通道数量；4.确保系统低延迟；5.配置冗余方案保证稳定性。' },
  { id: 'thv_q5', type: 'short', question: '请说明拼接处理器"场景保存与调用"功能在实际应用中的价值。', keywords: '场景,预设,切换,布局,效率,模式,会议,指挥', points: 10, explain: '价值：1.预设多种显示模式（会议模式/监控模式等）；2.一键切换节省操作时间；3.减少人为操作失误；4.适应不同时间段和业务需求；5.提升整体操作效率。' },
  { id: 'thv_q6', type: 'short', question: '视频分配器出现信号衰减时，应从哪些方面排查和解决？', keywords: '线缆,长度,接口,分辨率,级联,信号,放大器,质量', points: 10, explain: '排查：1.检查线缆长度是否超限；2.检查线缆质量；3.检查接口接触是否良好；4.减少级联层数；5.必要时使用信号放大器或中继器。' },
  { id: 'thv_q7', type: 'short', question: '拼接处理器在大型演出活动中的技术保障要点有哪些？', keywords: '冗余,备份,测试,信号,电源,切换,预案,实时', points: 10, explain: '保障要点：1.采用双电源冗余设计；2.关键信号源热备份；3.提前进行全流程测试；4.制定应急预案；5.安排专业技术保障人员；6.准备备用设备。' },
  { id: 'thv_q8', type: 'short', question: '请说明EMX视频矩阵在不同规模项目中的选型建议。', keywords: '规模,接口,类型,分辨率,控制,扩展,预算,冗余', points: 10, explain: '选型建议：小型项目选4×4或8×8；中型项目选16×16或32×32；大型项目选64×64以上。同时考虑接口类型、分辨率支持、控制方式和扩展冗余。' },
  { id: 'thv_q9', type: 'short', question: 'LCD拼接屏常见故障"黑屏"的排查思路是什么？', keywords: '电源,信号,线缆,控制器,背光,输入,输出,配置', points: 10, explain: '排查思路：1.检查电源是否正常；2.检查信号输入是否正常；3.检查连接线缆是否松动；4.检查拼接控制器工作状态；5.检查背光是否正常；6.检查配置参数是否正确。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_tech_hd_video;
}