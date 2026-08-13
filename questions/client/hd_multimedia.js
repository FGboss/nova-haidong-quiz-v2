// 客户端考核 - 嗨动 多媒体与会议 - 题库
// 基于知识库：缪斯播控服务器、EG系列播控、灵曜视频会议、阿丽塔LED拼控、阿尔法专业拼控、数字新媒体内容制作
const QUESTIONS_client_hd_multimedia = [
  // ===== 单选题 (7题/套，题库~18题) =====
  { id: 'chm_s1', type: 'single', question: '缪斯播控服务器的主要功能是什么？', options: ['集中管理和播放多路音视频内容', '仅播放音乐', '仅显示图片', '仅控制灯光'], answer: 'A', points: 5, explain: '缪斯播控服务器是多媒体内容管理和播放平台，可集中管理、排程和播放多路音视频内容到多个显示终端。' },
  { id: 'chm_s2', type: 'single', question: 'EG系列播控设备的定位是什么？', options: ['嵌入式播控终端，用于终端显示的内容播放', '服务器级播控系统', '手机APP', '云端服务'], answer: 'A', points: 5, explain: 'EG系列是嵌入式播控终端，部署在显示终端侧，负责接收服务器下发的播放任务并实时渲染输出。' },
  { id: 'chm_s3', type: 'single', question: '灵曜视频会议系统的核心功能是什么？', options: ['提供高清视频会议和远程协作', '仅语音通话', '仅屏幕共享', '仅文件传输'], answer: 'A', points: 5, explain: '灵曜视频会议系统提供高清视频会议、屏幕共享、远程协作和会议管理等功能。' },
  { id: 'chm_s4', type: 'single', question: '阿丽塔LED拼控与原LED控制系统的主要区别是什么？', options: ['阿丽塔直接驱动LED模组，无需发送卡和接收卡', '阿丽塔只能控制LCD屏幕', '阿丽塔需要额外的发送卡', '没有区别'], answer: 'A', points: 5, explain: '阿丽塔LED拼控将发送卡和接收卡功能集成，直接驱动LED模组，简化系统架构，减少中间环节。' },
  { id: 'chm_s5', type: 'single', question: '阿尔法专业拼控的定位是什么？', options: ['高端专业级拼接控制系统，面向大型复杂项目', '入门级拼接控制器', '仅用于小屏幕', '家用级产品'], answer: 'A', points: 5, explain: '阿尔法专业拼控面向大型LED显示项目，提供专业级的拼接、切换和处理能力。' },
  { id: 'chm_s6', type: 'single', question: '数字新媒体内容制作主要涉及哪些方面？', options: ['数字内容创意设计、动画制作、交互开发', '仅文字排版', '仅图片裁剪', '仅音频剪辑'], answer: 'A', points: 5, explain: '数字新媒体内容制作涵盖创意设计、2D/3D动画、交互程序开发、视频制作等数字内容创作。' },
  { id: 'chm_s7', type: 'single', question: '缪斯播控系统支持的播放内容格式包括哪些？', options: ['视频、图片、音频、网页、流媒体', '仅视频', '仅图片', '仅音频'], answer: 'A', points: 5, explain: '缪斯播控系统支持视频、图片、音频、网页和流媒体等多种内容格式的播放。' },
  { id: 'chm_s8', type: 'single', question: 'EG系列播控终端与服务器的通信方式是什么？', options: ['通过TCP/IP网络进行内容同步和指令交互', '通过串口通信', '通过蓝牙', '通过USB'], answer: 'A', points: 5, explain: 'EG系列播控终端通过TCP/IP网络与缪斯服务器通信，实现内容同步、播放指令下发和状态回传。' },
  { id: 'chm_s9', type: 'single', question: '灵曜视频会议系统支持的最大参会方数是多少？', options: ['根据服务器配置，支持数十至数百方', '最多2方', '最多4方', '最多8方'], answer: 'A', points: 5, explain: '灵曜视频会议系统根据服务器配置和授权，支持数十至数百方同时参会。' },
  { id: 'chm_s10', type: 'single', question: '阿丽塔LED拼控支持的输入信号类型包括哪些？', options: ['HDMI、DVI、DP、SDI', '仅HDMI', '仅VGA', '仅USB'], answer: 'A', points: 5, explain: '阿丽塔LED拼控支持HDMI、DVI、DP和SDI等主流信号输入，兼容多种视频源。' },
  { id: 'chm_s11', type: 'single', question: '阿尔法专业拼控的核心处理能力是什么？', options: ['多图层实时拼接、缩放和切换', '仅单画面显示', '仅信号切换', '仅画面缩放'], answer: 'A', points: 5, explain: '阿尔法专业拼控支持多图层实时拼接、画面缩放和信号切换，满足大型复杂显示需求。' },
  { id: 'chm_s12', type: 'single', question: '播控系统中"节目单"功能的作用是什么？', options: ['预设播放内容的顺序和时间安排', '列出所有设备', '记录播放日志', '管理系统用户'], answer: 'A', points: 5, explain: '节目单功能预设播放内容的顺序、时间和区域，实现定时定点的自动化内容播放。' },
  { id: 'chm_s13', type: 'single', question: '灵曜视频会议系统支持哪些协作功能？', options: ['屏幕共享、电子白板、文件共享、会议录制', '仅语音通话', '仅视频通话', '仅文字聊天'], answer: 'A', points: 5, explain: '灵曜系统支持屏幕共享、电子白板协作、文件共享和会议录制等丰富的协作功能。' },
  { id: 'chm_s14', type: 'single', question: '在数字新媒体内容制作中，分辨率设计需要考虑什么？', options: ['目标显示终端的分辨率和像素间距', '仅参考手机分辨率', '固定使用1920×1080', '不需要考虑分辨率'], answer: 'A', points: 5, explain: '内容分辨率需匹配目标显示终端（LED大屏、LCD等）的实际分辨率和像素间距，确保显示效果最佳。' },
  { id: 'chm_s15', type: 'single', question: '阿尔法专业拼控支持的最大输出分辨率是多少？', options: ['8K及以上', '1080P', '2K', '4K'], answer: 'A', points: 5, explain: '阿尔法专业拼控支持8K及以上分辨率输出，满足超大型LED屏幕的显示需求。' },
  { id: 'chm_s16', type: 'single', question: 'EG系列播控终端的典型部署方式是什么？', options: ['部署在显示终端附近，通过HDMI连接屏幕', '部署在云端', '部署在手机中', '不需要部署'], answer: 'A', points: 5, explain: 'EG系列播控终端部署在显示终端附近，通过HDMI连接屏幕，通过网络接收服务器指令和内容。' },
  { id: 'chm_s17', type: 'single', question: '缪斯播控系统的"多级权限管理"功能主要用于什么？', options: ['不同角色用户拥有不同的内容管理和播放权限', '控制设备开关', '管理网络带宽', '监控CPU温度'], answer: 'A', points: 5, explain: '多级权限管理确保不同角色（如管理员、操作员、审核员）拥有不同的内容发布和操作权限，保障系统安全。' },
  { id: 'chm_s18', type: 'single', question: '灵曜视频会议与第三方会议系统（如腾讯会议、Zoom）的互通方式是？', options: ['通过SIP/H.323协议网关实现互通', '不支持互通', '通过蓝牙', '通过USB'], answer: 'A', points: 5, explain: '灵曜视频会议通过SIP/H.323标准协议网关，可与腾讯会议、Zoom等第三方会议系统实现互通。' },

  // ===== 多选题 (4题/套，题库~10题) =====
  { id: 'chm_m1', type: 'multiple', question: '缪斯播控系统支持哪些内容播放方式？', options: ['定时播放', '即时插播', '循环播放', '多区域同步播放', 'LED屏幕专用播放'], answer: 'ABCDE', points: 5, explain: '缪斯播控系统支持定时播放、即时插播、循环播放、多区域同步播放和LED屏幕专用播放等模式。' },
  { id: 'chm_m2', type: 'multiple', question: '灵曜视频会议系统包含哪些核心硬件？', options: ['会议终端', '高清摄像头', '全向麦克风', '会议服务器', 'MCU多点控制单元'], answer: 'ABCDE', points: 5, explain: '灵曜系统包含会议终端、高清摄像头、全向麦克风、会议服务器和MCU等核心硬件。' },
  { id: 'chm_m3', type: 'multiple', question: '阿丽塔LED拼控相比传统方案的优势有哪些？', options: ['简化系统架构', '减少设备数量', '降低故障点', '安装调试更便捷', '降低总体成本'], answer: 'ABCDE', points: 5, explain: '阿丽塔集成发送卡和接收卡功能，简化架构、减少设备、降低故障点，安装更便捷，总体成本更低。' },
  { id: 'chm_m4', type: 'multiple', question: '数字新媒体内容制作涉及哪些技术领域？', options: ['2D/3D动画', '视频剪辑', '交互编程', 'UI/UX设计', '视觉特效'], answer: 'ABCDE', points: 5, explain: '数字新媒体内容制作涉及2D/3D动画、视频剪辑、交互编程、UI/UX设计和视觉特效等多个技术领域。' },
  { id: 'chm_m5', type: 'multiple', question: 'EG系列播控终端的特性包括哪些？', options: ['嵌入式系统', '低功耗', '稳定可靠', '支持远程管理', '支持多种媒体格式'], answer: 'ABCDE', points: 5, explain: 'EG系列播控终端具有嵌入式系统、低功耗、高稳定、远程管理和多格式支持等特性。' },
  { id: 'chm_m6', type: 'multiple', question: '阿尔法专业拼控支持哪些高级功能？', options: ['多图层叠加', '4K/8K处理', 'Genlock同步', 'HDR支持', '3D显示'], answer: 'ABCDE', points: 5, explain: '阿尔法专业拼控支持多图层、4K/8K、Genlock、HDR和3D等高级功能。' },
  { id: 'chm_m7', type: 'multiple', question: '播控系统在大型户外LED广告中的应用要点有哪些？', options: ['远程内容更新', '定时播放排程', '设备状态监控', '内容安全审核', '播放日志记录'], answer: 'ABCDE', points: 5, explain: '户外LED广告播控要点包括远程更新、定时排程、状态监控、内容审核和日志记录等。' },
  { id: 'chm_m8', type: 'multiple', question: '灵曜视频会议系统的网络要求包括哪些？', options: ['稳定的网络带宽', '低延迟', '低丢包率', 'QoS保障', '防火墙端口开放'], answer: 'ABCDE', points: 5, explain: '视频会议需要稳定带宽、低延迟、低丢包率、QoS保障和正确的防火墙配置。' },
  { id: 'chm_m9', type: 'multiple', question: '以下哪些属于嗨动多媒体产品线？', options: ['缪斯播控服务器', 'EG系列播控', '灵曜视频会议', '阿丽塔LED拼控', '阿尔法专业拼控'], answer: 'ABCDE', points: 5, explain: '嗨动多媒体产品线包括缪斯、EG系列、灵曜、阿丽塔和阿尔法等产品。' },
  { id: 'chm_m10', type: 'multiple', question: '数字新媒体内容在LED大屏上播放时需要注意哪些问题？', options: ['分辨率适配', '色彩空间转换', '帧率匹配', '内容比例', '亮度适配'], answer: 'ABCDE', points: 5, explain: 'LED大屏内容播放需注意分辨率适配、色彩空间转换、帧率匹配、内容比例和亮度适配等问题。' },

  // ===== 判断题 (3题/套，题库~8题) =====
  { id: 'chm_j1', type: 'judge', question: '缪斯播控系统支持多区域内容的独立播放。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '缪斯播控系统支持多区域独立管理，不同显示终端可播放不同内容，也可组合同步播放。' },
  { id: 'chm_j2', type: 'judge', question: 'EG系列播控终端必须始终在线才能播放内容。', options: ['正确', '错误'], answer: 'B', points: 5, explain: 'EG系列支持本地缓存播放，内容下载到本地后即使离线也能正常播放，网络恢复后自动同步。' },
  { id: 'chm_j3', type: 'judge', question: '阿丽塔LED拼控可以完全替代发送卡和接收卡。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '阿丽塔LED拼控将发送卡和接收卡功能集成，直接驱动LED模组，无需额外配置发送卡和接收卡。' },
  { id: 'chm_j4', type: 'judge', question: '灵曜视频会议系统仅支持内网使用。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '灵曜视频会议系统支持内网和外网使用，通过防火墙和网关配置可实现跨网段的远程会议。' },
  { id: 'chm_j5', type: 'judge', question: '数字新媒体内容制作中，分辨率越高越好。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '分辨率需匹配显示终端，过高分辨率会增加渲染负担和传输带宽，需根据实际需求选择合适分辨率。' },
  { id: 'chm_j6', type: 'judge', question: '阿尔法专业拼控支持双电源冗余设计。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '阿尔法专业拼控采用双电源冗余设计，单电源故障时自动切换，确保7×24小时不间断运行。' },
  { id: 'chm_j7', type: 'judge', question: '播控系统的节目单一旦设定就不能临时修改。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '播控系统支持即时插播功能，可以在节目单执行过程中临时插入紧急或临时内容，不影响原有排程。' },
  { id: 'chm_j8', type: 'judge', question: '所有视频会议系统都支持4K分辨率。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '并非所有视频会议系统都支持4K，需要终端、摄像头、网络带宽和MCU全部支持4K才能实现。' },

  // ===== 简答题 (4题/套，题库~9题) =====
  { id: 'chm_q1', type: 'short', question: '请简述缪斯播控系统在大型信息发布场景中的部署架构。', keywords: '服务器,终端,网络,内容,分发,管理,EG,同步', points: 10, explain: '部署架构：缪斯服务器集中管理内容库和播放计划，通过TCP/IP网络下发到各EG系列播控终端，终端连接显示设备播放。支持多级服务器架构实现大规模部署。' },
  { id: 'chm_q2', type: 'short', question: '阿丽塔LED拼控相比传统"发送卡+接收卡"方案的优势和适用场景。', keywords: '集成,简化,减少,故障,安装,成本,一体机,中小型', points: 10, explain: '优势：1.集成发送卡和接收卡，简化架构；2.减少设备数量和故障点；3.安装调试更便捷；4.降低总体成本。适用场景：LED一体机、中小型LED屏幕、渠道标准化方案。' },
  { id: 'chm_q3', type: 'short', question: '灵曜视频会议系统在大型企业部署时需要注意哪些问题？', keywords: 'MCU,带宽,防火墙,并发,终端,管理,安全,互通', points: 10, explain: '注意事项：1.MCU并发能力规划；2.网络带宽保障；3.防火墙和NAT穿越配置；4.终端数量和管理；5.安全策略（加密、权限）；6.与现有系统互通；7.运维管理平台。' },
  { id: 'chm_q4', type: 'short', question: '请说明数字新媒体内容制作从创意到上屏的完整流程。', keywords: '创意,设计,制作,测试,审核,发布,播控,适配', points: 10, explain: '流程：1.需求分析和创意策划；2.视觉设计（静态/动态）；3.内容制作（2D/3D/视频/交互）；4.分辨率适配和色彩校正；5.内容审核；6.上传播控系统；7.排程发布；8.效果监测。' },
  { id: 'chm_q5', type: 'short', question: '阿尔法专业拼控在大型演出场景中的技术保障方案应如何设计？', keywords: '冗余,备份,测试,预案,电源,信号,切换,实时', points: 10, explain: '保障方案：1.双电源冗余；2.关键信号源热备份；3.全流程彩排测试；4.制定应急预案；5.配置快速切换预案；6.安排现场技术保障；7.备用设备就位。' },
  { id: 'chm_q6', type: 'short', question: 'EG系列播控终端出现离线状态时，应如何排查和恢复？', keywords: '网络,IP,电源,服务器,配置,重启,日志,连接', points: 10, explain: '排查步骤：1.检查终端电源状态；2.检查网络连接和IP配置；3.Ping测试网络连通性；4.检查服务器地址和端口配置；5.查看终端日志；6.重启终端设备；7.检查防火墙设置。' },
  { id: 'chm_q7', type: 'short', question: '播控系统的内容安全审核机制应该如何设计？', keywords: '审核,权限,流程,记录,预览,发布,追溯,合规', points: 10, explain: '审核机制：1.多级审核流程（制作-审核-发布）；2.角色权限分离；3.内容预览功能；4.操作日志记录；5.发布前最终确认；6.紧急内容快速审核通道；7.审核历史追溯。' },
  { id: 'chm_q8', type: 'short', question: '在规划一个综合多媒体项目时，如何协调播控、拼控和视频会议三个子系统？', keywords: '集成,接口,协议,统一,管理,场景,联动,协同', points: 10, explain: '协调方案：1.统一管理平台集成三个子系统；2.标准化接口协议实现互联；3.场景一键切换联动；4.共享信号源和显示资源；5.统一权限管理；6.协同运维监控。' },
  { id: 'chm_q9', type: 'short', question: 'LED大屏内容制作中，如何确保色彩在不同显示终端上的一致性？', keywords: '色彩,空间,校准,校正,Gamma,色域,配置文件,一致性', points: 10, explain: '确保一致性：1.使用标准色彩空间（如sRGB/Rec.709）；2.制作时进行色彩校准；3.使用ICC色彩配置文件；4.在目标屏幕上进行色彩校正；5.统一Gamma值设置；6.定期维护校准。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_tech_hd_multimedia;
}