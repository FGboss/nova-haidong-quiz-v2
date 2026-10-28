// 场景化赋能专项 · 题库（5 场闯关式固定卷，共 106 题）
// 依据《场景化音视频集成进阶培训计划 V3.1》与配套学员卷 / 参考答案重新编排。
// 设计原则：
//   1. 层层递进：测一识全景 → 测二会议室 → 测三展厅 → 测四需求澄清与跨系统配单 → 结业综合。
//   2. 每卷合计 100 分，统一通过线 80 分；客观题总分均低于 80，必须经导师完成主观题评分后才可能通过。
//   3. 题型只使用系统既有的 single / multiple / judge / short（manual），不新增控件，避免判分与导出回归。
//   4. 主观题（简答 / 链路推演 / 配单 / 拓扑纠错）走导师人工评分，examineRule 为评分细则。
const QUESTIONS_scene = [
  // ====================================================================
  // sceneT1 阶段测一 · 集成全景与产品地图（35 分钟，通过线 80）
  // 单选 12×3=36 + 判断 6×2=12 + 多选 4×5=20 + 简答 12+10+10=32 → 100
  // 客观题合计 68 分（<80，必须导师评分）
  // ====================================================================
  { id: 'T1-01', type: 'single', examId: 'sceneT1', category: '显示与拼控', question: '下列设备中，不属于 LED 显示控制系统主链路的是：', options: ['A. 发送卡', 'B. 接收卡', 'C. 视频拼接器', 'D. 功率放大器'], answer: 'D', points: 3, explain: 'LED 显示主链路为视频处理/拼接 → 发送卡 → 接收卡 → 屏体；功率放大器属音频扩声系统。' },
  { id: 'T1-02', type: 'single', examId: 'sceneT1', category: '媒体播控', question: '负责把内容按时间线在多块屏上编排播放的子系统是：', options: ['A. 显示与拼控', 'B. 分布式系统', 'C. 智能中控', 'D. 媒体播控'], answer: 'D', points: 3, explain: '媒体播控负责内容编排、排片与多屏同步播放；显示与拼控负责带载与到屏。' },
  { id: 'T1-03', type: 'single', examId: 'sceneT1', category: '音频扩声', question: '会议室扩声中，承担回声消除（AEC）与反馈抑制的设备通常是：', options: ['A. 功率放大器', 'B. 扬声器', 'C. 数字音频处理器', 'D. 电源时序器'], answer: 'C', points: 3, explain: '数字音频处理器承担 AEC、反馈抑制、均衡、压限等处理。' },
  { id: 'T1-04', type: 'single', examId: 'sceneT1', category: '分布式', question: '分布式系统的核心结构是：', options: ['A. 输入—切换—输出', 'B. 采集—存储—回放', 'C. 编码—网络传输—解码', 'D. 发送—接收—显示'], answer: 'C', points: 3, explain: '分布式以编码器—网络—解码器为核心，实现跨区域取信号与灵活上屏。' },
  { id: 'T1-05', type: 'single', examId: 'sceneT1', category: '产品归属', question: '嗨动 ECS 系列产品属于：', options: ['A. 智能中控', 'B. 视频拼接服务器', 'C. 多媒体服务器', 'D. 分布式坐席系统'], answer: 'A', points: 3, explain: 'ECS 系列为智能中央控制服务器，归属智能中控与可视化子系统。' },
  { id: 'T1-06', type: 'single', examId: 'sceneT1', category: '产品归属', question: '诺瓦 MCTRL 系列产品属于：', options: ['A. 接收卡', 'B. 发送卡（主控）', 'C. 视频处理器', 'D. 异步播放盒'], answer: 'B', points: 3, explain: 'MCTRL 系列为 LED 发送卡（主控），负责带载与信号送至屏体。' },
  { id: 'T1-07', type: 'single', examId: 'sceneT1', category: '分布式/坐席', question: '需要「一人操作多台远端主机、多人协作上屏」的场景，应优先考虑：', options: ['A. 矩阵', 'B. 分配器', 'C. KVM 光纤坐席系统', 'D. 拼接处理器'], answer: 'C', points: 3, explain: 'KVM 光纤坐席系统用于远端主机操作与坐席协作上屏，矩阵只做集中交叉切换。' },
  { id: 'T1-08', type: 'single', examId: 'sceneT1', category: '智能中控', question: '展厅实现开馆一键开屏、开音响、开灯光、播放片头，主要依靠：', options: ['A. 播控软件', 'B. 智能中控', 'C. 视频处理器', 'D. 音频处理器'], answer: 'B', points: 3, explain: '一键场景联动由智能中控编排执行；播控负责内容，不负责跨设备联动。' },
  { id: 'T1-09', type: 'single', examId: 'sceneT1', category: '边界系统', question: '视频会议终端在本公司集成方案中的定位，通常应表述为：', options: ['A. 自产主推产品', 'B. 属于显示子系统的部件', 'C. 由甲方自备、不必关心', 'D. 配套或外采，需明确原厂支持界面'], answer: 'D', points: 3, explain: '视频会议终端多为配套或外采，必须写清原厂支持界面与责任边界。' },
  { id: 'T1-10', type: 'single', examId: 'sceneT1', category: '音频扩声', question: '音频扩声系统的正确信号顺序是：', options: ['A. 音源 → 音频处理器 → 功放 → 扬声器', 'B. 音源 → 功放 → 音频处理器 → 扬声器', 'C. 音源 → 扬声器 → 功放 → 音频处理器', 'D. 音源 → 音频处理器 → 扬声器 → 功放'], answer: 'A', points: 3, explain: '音频主链路：音源 → 处理 → 功放 → 扬声器。' },
  { id: 'T1-11', type: 'single', examId: 'sceneT1', category: '无纸化会议', question: '下列产品中，属于「⑧ 无纸化会议」子系统的是：', options: ['A. 灵境分区讲解系统', 'B. 艾欧塔智能中控', 'C. 科赛无纸化会议系统', 'D. 缪斯多媒体播控系统'], answer: 'C', points: 3, explain: '科赛无纸化会议系统归属无纸化会议子系统。' },
  { id: 'T1-12', type: 'single', examId: 'sceneT1', category: '公共广播', question: '下列对「⑨ 公共广播」与「④ 音频扩声」的区分，正确的是：', options: ['A. 两者都是扩声，可共用同一台功放与同一组扬声器', 'B. 广播要求可分区、可分时，并能被消防强切；扩声只服务一场活动听清楚', 'C. 广播只用于室外，扩声只用于室内', 'D. 广播不需要功放，直接由音源推动扬声器'], answer: 'B', points: 3, explain: '公共广播强调分区、分时与消防强切；扩声服务现场听清，两者不可混为一套。' },

  { id: 'T1-13', type: 'judge', examId: 'sceneT1', category: '需求对接', question: '客户只说「按常规来」，说明需求已经明确，可以直接按公司标准配置出方案。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。「按常规来」往往意味着需求未澄清，必须先确认场景、规模、预算口径与工期。' },
  { id: 'T1-14', type: 'judge', examId: 'sceneT1', category: '需求对接', question: '需求澄清中的「预算口径」应问清是否包含屏体结构、内容制作与施工，而不只是设备总价。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。预算口径不同会直接改变方案范围与报价结构。' },
  { id: 'T1-15', type: 'judge', examId: 'sceneT1', category: '需求对接', question: '「谁负责布线」属于施工细节，口头确认即可，不必在报价前书面写清。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。布线界面与费用归属必须在报价前书面明确，否则后期扯皮。' },
  { id: 'T1-16', type: 'judge', examId: 'sceneT1', category: '需求对接', question: '公共广播的消防强切接口应由消防施工单位提供干接点，这一项必须在报价前写入界面清单。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。消防强切接口属跨单位界面，必须写入清单并明确责任方。' },
  { id: 'T1-17', type: 'judge', examId: 'sceneT1', category: '需求对接', question: '在客户现场可以直接确认最终配置与价格，这样显得效率高。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。新人不得现场承诺最终配置与价格，须经解决方案工程师复核后由销售/商务出具。' },
  { id: 'T1-18', type: 'judge', examId: 'sceneT1', category: '需求对接', question: '超出培训范围的系统（如数据大屏看板开发）被客户点名要求时，应写进「需支持事项」并注明由谁承接。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。超出边界的系统必须写明支持事项与承接方，不能默认由我方承诺。' },

  { id: 'T1-19', type: 'multiple', examId: 'sceneT1', category: '四层拓扑', question: '下列属于传输层的是：', options: ['A. HDMI 铜缆', 'B. HDBaseT 延长器', 'C. 分布式节点', 'D. 视频处理器', 'E. 光纤'], answer: 'ABCE', points: 5, explain: '传输层负责信号传输：HDMI 铜缆、HDBaseT、分布式节点、光纤；视频处理器属处理层。' },
  { id: 'T1-20', type: 'multiple', examId: 'sceneT1', category: '场景差异', question: '展厅相比会议室，需求侧的变化包括：', options: ['A. 内容更新频率高', 'B. 多人同时参观', 'C. 现场长期少人值守', 'D. 设备长时间连续运行', 'E. 必须支持会议表决'], answer: 'ABCD', points: 5, explain: '展厅内容更新快、多人参观、少人值守、长时间运行；会议表决属会议室需求。' },
  { id: 'T1-21', type: 'multiple', examId: 'sceneT1', category: '现场勘察', question: '一次合格的现场勘察记录，必须包含：', options: ['A. 房间尺寸与净高', 'B. 供电容量与桥架路由', 'C. 安装面承重与结构条件', 'D. 既有信号源与设备清单', 'E. 客户预算上限'], answer: 'ABCD', points: 5, explain: '勘察硬记录含尺寸净高、供电桥架、承重结构、既有信号源；预算上限不属于现场勘察记录项。' },
  { id: 'T1-22', type: 'multiple', examId: 'sceneT1', category: '子系统角色', question: '关于会议室与展厅的子系统角色，说法正确的有：', options: ['A. 信发在展厅通常升格为核心系统', 'B. 公共广播是展厅必备的基础音频', 'C. 分区讲解按展区与讲解动线配置', 'D. 展厅必须配置无纸化会议', 'E. 展厅必须配置视频会议'], answer: 'ABC', points: 5, explain: '展厅信发升核心、公共广播为必备基础音频、分区讲解按展区配置；无纸化与视频会议在展厅多为不配。' },

  { id: 'T1-23', type: 'short', manual: true, examId: 'sceneT1', category: '产品定位', question: '产品定位：以 MCTRL4K（LED 发送卡/主控）为例，用不超过 150 字说明：① 它属于哪个子系统；② 上游接什么设备类别；③ 下游接什么设备类别；④ 什么情况下需要其他产品配合或原厂支持。', points: 12, examineRule: '评分：归属 4 分（显示与拼控 / LED 控制系统）；上下游各 2 分（上游视频处理器或拼接器，下游接收卡/屏体）；边界 4 分（需按屏体带载与接口规格核算，固件/兼容性需原厂确认）。', explain: 'MCTRL4K 属 LED 显示控制（发送侧主控），上接视频处理器/拼接器输出，下接 LED 接收卡与屏体；带载能力、接口规格与固件兼容需原厂支持。' },
  { id: 'T1-24', type: 'short', manual: true, examId: 'sceneT1', category: '链路补全', question: '会议室链路补全：① 笔记本 HDMI 输出 →【　　】→【　　】→ LED 显示屏体（写出两个设备类别）；② 有线会议话筒 →【　　】→ 功率放大器 → 扬声器（写出一个设备类别）；③ 中控主机通过【　　】接口对屏体与音频设备下发控制指令（任写一种）。', points: 10, examineRule: '评分：每空 2 分，说明 2 分。①视频处理/拼接类设备 + 发送卡/主控；②数字音频处理器（或会议系统主机→数字音频处理器）；③网络/串口/IR/干接点任一种。能按信号流方向说明得分。', explain: '① 视频处理器/拼接处理器 → LED 发送卡；② 数字音频处理器；③ 网络、串口、红外或干接点。' },
  { id: 'T1-25', type: 'short', manual: true, examId: 'sceneT1', category: '场景差异', question: '说明为什么把会议室作为主线场景、展厅作为变体。请至少用两个子系统的差异举例（不超过 200 字）。', points: 10, examineRule: '评分：讲清两条主线（会议=协同办公，展厅=展示讲解）4 分；两个子系统差异各 3 分。例：信发在展厅升核心/会议室多为辅助；会议与无纸化在会议室必备、展厅多为不配；分布式取决于是否跨区取信号。', explain: '会议室高频通用、七子系统逻辑稳定；展厅体现场景差异：信发升核心、会议/无纸化多不配、分布式看是否跨区。' },

  // ====================================================================
  // sceneT2 阶段测二 · 会议室拓扑与配单（45 分钟，通过线 80）
  // 单选 16×2=32 + 判断 5×2=10 + 多选 5×4=20 + 简答 14+14+10=38 → 100
  // 客观题合计 62 分（<80，必须导师评分）
  // ====================================================================
  { id: 'T2-01', type: 'single', examId: 'sceneT2', category: '会议系统', question: '40 ㎡ 圆桌讨论室，层高 3 m，装修已完成、不便重新布线，会议发言设备首选：', options: ['A. 手拉手有线会议系统', 'B. 有线鹅颈话筒', 'C. 无线手持话筒', 'D. 无线鹅颈或无线吸顶话筒'], answer: 'D', points: 2, explain: '已装修不便布线时优先无线鹅颈或无线吸顶，避免重新开槽。' },
  { id: 'T2-02', type: 'single', examId: 'sceneT2', category: '会议系统', question: '参会 16 人，需要摄像跟踪、主席优先与表决功能，发言设备应选：', options: ['A. 手拉手数字会议系统', 'B. 有线鹅颈话筒', 'C. 无线手持话筒', 'D. 界面话筒'], answer: 'A', points: 2, explain: '摄像跟踪、主席优先与表决需手拉手数字会议系统支撑。' },
  { id: 'T2-03', type: 'single', examId: 'sceneT2', category: '音频扩声', question: '反馈抑制功能的首要作用是：', options: ['A. 提升整体响度', 'B. 消除回声', 'C. 抑制啸叫', 'D. 增强低频'], answer: 'C', points: 2, explain: '反馈抑制用于抑制话筒与扬声器之间的啸叫。' },
  { id: 'T2-04', type: 'single', examId: 'sceneT2', category: '音频扩声', question: 'AEC（回声消除）主要解决：', options: ['A. 电源干扰问题', 'B. 本端话筒拾取到远端声音后再回传造成的回声', 'C. 无线话筒断频问题', 'D. 扬声器失真问题'], answer: 'B', points: 2, explain: 'AEC 消除本端话筒拾取扬声器放出的远端声音后回传形成的回声。' },
  { id: 'T2-05', type: 'single', examId: 'sceneT2', category: '音频计算', question: '一间 100 ㎡、层高 3 m 的纯语言会议室，按音箱功率与环境体积比系数估算，扬声器总额定功率的合理区间是：', options: ['A. 150—200 W', 'B. 450—600 W', 'C. 240—300 W', 'D. 800 W 以上'], answer: 'C', points: 2, explain: '100 ㎡ 语言会议室按估算约需 240—300 W 总额定功率。' },
  { id: 'T2-06', type: 'single', examId: 'sceneT2', category: '音频计算', question: '承接上题，若配置 2 只音箱，单只额定功率宜选：', options: ['A. 80 W', 'B. 100 W', 'C. 300 W', 'D. 120—150 W'], answer: 'D', points: 2, explain: '总额定 240—300 W 分给 2 只，单只约 120—150 W。' },
  { id: 'T2-07', type: 'single', examId: 'sceneT2', category: '音频计算', question: '语言兼音乐类会议室，功放额定功率与音箱额定功率的比值通常取：', options: ['A. 0.5—0.8', 'B. 1.2—1.5', 'C. 2.0 以上', 'D. 3.0'], answer: 'B', points: 2, explain: '语言兼音乐类功放功率余量系数通常取 1.2—1.5。' },
  { id: 'T2-08', type: 'single', examId: 'sceneT2', category: '音频布局', question: '圆形、弧形等不规整会议室，扬声器布局优先采用：', options: ['A. 分散式布局', 'B. 只做舞台主扩', 'C. 不做布局设计', 'D. 集中式布局'], answer: 'A', points: 2, explain: '不规整房间采用分散式布局，保证声场均匀与语言清晰度。' },
  { id: 'T2-09', type: 'single', examId: 'sceneT2', category: '信号处理', question: '中型会议室有 6 路信号源，需上 2 块屏并支持坐席预览切换，信号处理优先选：', options: ['A. 视频分配器', 'B. 仅依靠发送卡', 'C. 矩阵或分布式系统', 'D. 智能中控'], answer: 'C', points: 2, explain: '多路信号选择与上屏需矩阵或分布式，分配器只能复制不能切换。' },
  { id: 'T2-10', type: 'single', examId: 'sceneT2', category: '智能中控', question: '会议室中「一键开会：降幕、开屏、切换信号、调整音量」由（　）实现：', options: ['A. 播控软件', 'B. 数字音频处理器', 'C. 功率放大器', 'D. 智能中控'], answer: 'D', points: 2, explain: '跨设备场景联动由智能中控实现。' },
  { id: 'T2-11', type: 'single', examId: 'sceneT2', category: '媒体播控', question: '播控系统在会议室中解决的核心问题是：', options: ['A. 会议流程编排与多屏同步播放', 'B. 屏体带载', 'C. 音频均衡处理', 'D. 网络交换'], answer: 'A', points: 2, explain: '播控负责内容编排、排片与多屏同步播放。' },
  { id: 'T2-12', type: 'single', examId: 'sceneT2', category: '会议系统', question: '会议室方案需要「讲话时摄像机自动跟随发言人」，应配置：', options: ['A. 智能中控', 'B. 数字会议系统与摄像跟踪', 'C. 功率放大器', 'D. 电源时序器'], answer: 'B', points: 2, explain: '摄像跟踪由数字会议系统与跟踪摄像机配合实现。' },
  { id: 'T2-13', type: 'single', examId: 'sceneT2', category: '传输', question: 'HDMI 信号需传输 30 m 到屏体，最稳妥的做法是：', options: ['A. 直接使用长 HDMI 线', 'B. 转成 VGA 后传输', 'C. 光纤 HDMI 或 HDBaseT 延长器', 'D. 中间加装分配器'], answer: 'C', points: 2, explain: '长距离 HDMI 应采用光纤 HDMI 或 HDBaseT 延长，避免信号衰减。' },
  { id: 'T2-14', type: 'single', examId: 'sceneT2', category: '配单', question: '会议室配单中最容易被漏掉、但直接关系到设备上电安全的是：', options: ['A. 电源时序器', 'B. 音箱壁装支架', 'C. 遥控器', 'D. 随机说明书'], answer: 'A', points: 2, explain: '电源时序器按顺序上电/断电，保护设备并避免冲击。' },
  { id: 'T2-15', type: 'single', examId: 'sceneT2', category: '分布式', question: '关于「矩阵与分布式」的说法，正确的是：', options: ['A. 两者是同一种设备的不同叫法', 'B. 分布式适合多点位、远距离、灵活上屏；矩阵适合集中式交叉切换', 'C. 分布式只能传输音频', 'D. 矩阵不能切换视频信号'], answer: 'B', points: 2, explain: '分布式适合多点远距离与灵活上屏，矩阵适合集中式交叉切换。' },
  { id: 'T2-16', type: 'single', examId: 'sceneT2', category: '无纸化会议', question: '会议室需要实现会议文件在线传阅、批注、同屏与表决，应归入：', options: ['A. 媒体播控', 'B. 视频会议', 'C. 智能中控', 'D. 无纸化会议'], answer: 'D', points: 2, explain: '文件传阅、批注、同屏与表决属无纸化会议系统能力。' },

  { id: 'T2-17', type: 'judge', examId: 'sceneT2', category: '需求对接', question: '项目有设计院时，屏体尺寸与点间距应在设计院出图前完成技术确认。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。屏体尺寸与点间距需在设计院出图前确认，避免后期返工。' },
  { id: 'T2-18', type: 'judge', examId: 'sceneT2', category: '需求对接', question: '甲方信息中心只负责网络，不参与音视频设备选型，因此不需要与其对接。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。信息中心涉及网络、IP 规划与安全策略，必须对接。' },
  { id: 'T2-19', type: 'judge', examId: 'sceneT2', category: '需求对接', question: '强电到机柜的空开与电缆由我方负责、弱电由总包负责，属行业惯例，合同里不必写明。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。强弱电界面必须在合同中写明，不能依赖惯例。' },
  { id: 'T2-20', type: 'judge', examId: 'sceneT2', category: '需求对接', question: '现场开孔、开槽与装饰面恢复通常属装修界面；若由我方施工，应单列费用并注明恢复责任。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。开孔与恢复属装修界面，我方施工须单列费用并明确恢复责任。' },
  { id: 'T2-21', type: 'judge', examId: 'sceneT2', category: '需求对接', question: '客户问「工期 15 天能不能完成」时，可以先答应，再由工程去协调。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。工期须经工程评估后答复，不能先行承诺。' },

  { id: 'T2-22', type: 'multiple', examId: 'sceneT2', category: '音频扩声', question: '关于会议室扩声配置，说法正确的有：', options: ['A. 100 ㎡ 语言会议室扬声器总额定功率约 240—300 W', 'B. 语言类功放功率余量系数取 1.2—1.5', 'C. 音柱每倍增距离声压级衰减约 3 dB', 'D. 会议类扩声听众席最大声压级不应低于 98 dB', 'E. 功放与音箱按 1:1 配置最稳妥'], answer: 'ABCD', points: 4, explain: 'A-D 均符合音频扩声设计口径；功放应留余量，1:1 配置不足。' },
  { id: 'T2-23', type: 'multiple', examId: 'sceneT2', category: '信号处理', question: '关于会议室信号处理与传输，说法正确的有：', options: ['A. HDMI 传输 30 m 应采用光纤 HDMI 或 HDBaseT', 'B. 6 路信号上 2 块屏可选矩阵或分布式', 'C. 矩阵适合集中式交叉切换', 'D. 分布式适合多点位、远距离、灵活上屏', 'E. 分配器可以替代矩阵完成多路选择'], answer: 'ABCD', points: 4, explain: '分配器只能复制信号，不能完成多路选择与切换。' },
  { id: 'T2-24', type: 'multiple', examId: 'sceneT2', category: '配单', question: '会议室配单中最容易遗漏的配套项包括：', options: ['A. 电源时序器', 'B. 音箱壁装支架', 'C. 线材与接插件', 'D. 网络交换机', 'E. 遥控器'], answer: 'ABCD', points: 4, explain: '电源、支架、线材、交换机属配套刚需且易漏；遥控器非必要配套。' },
  { id: 'T2-25', type: 'multiple', examId: 'sceneT2', category: '会议系统', question: '关于会议发言设备选型，说法正确的有：', options: ['A. 16 人需摄像跟踪、主席优先与表决应选手拉手数字会议', 'B. 装修完成不便布线可选无线鹅颈或无线吸顶', 'C. 40 ㎡ 圆桌讨论室首选无线鹅颈或无线吸顶', 'D. 手拉手有线会议系统只适用于 10 人以下', 'E. 界面话筒适合所有大型会议'], answer: 'ABC', points: 4, explain: 'D、E 表述绝对化且不符合选型逻辑。' },
  { id: 'T2-26', type: 'multiple', examId: 'sceneT2', category: '中控播控', question: '关于中控与播控的分工，说法正确的有：', options: ['A. 中控负责设备集中管控与场景联动', 'B. 播控负责内容编排与多屏同步播放', 'C. 中控可管控灯光、窗帘、空调', 'D. 播控负责屏体带载', 'E. 中控可以替代播控完成排片'], answer: 'ABCD', points: 4, explain: '屏体带载属 LED 控制；中控不能替代播控排片。因此 E 错误。' },

  { id: 'T2-27', type: 'short', manual: true, examId: 'sceneT2', category: '拓扑排序', question: '会议室显示主链路排序（文字作答）：请把下列节点按信号流方向排成正确顺序，并指出干扰项：LED 接收卡、视频处理器 / 拼控、LED 屏体、笔记本 HDMI 输出、功率放大器、矩阵 / 分布式编码器、LED 发送卡。', points: 14, examineRule: '评分：6 个有效节点顺序正确 12 分（每步 2 分）；指出干扰项「功率放大器」2 分。正确顺序：笔记本 HDMI → 矩阵/分布式编码器 → 视频处理器/拼控 → LED 发送卡 → LED 接收卡 → LED 屏体。', explain: '会议室显示主链路：笔记本 HDMI → 矩阵/分布式编码器 → 视频处理器/拼控 → 发送卡 → 接收卡 → 屏体；功率放大器属音频链路。' },
  { id: 'T2-28', type: 'short', manual: true, examId: 'sceneT2', category: '拓扑排序', question: '会议室音频主链路排序与补全：① 将下列节点排序并指出干扰项：功率放大器、有线会议话筒 / 会议单元、扬声器、电源时序器、数字音频处理器、会议系统主机；② 视频会议终端的音频信号应接入【　】而不是直接接入功率放大器；③ HDMI 信号需传输 30 m 到屏体，应采用【　】方式延长。', points: 14, examineRule: '评分：5 个有效节点顺序 10 分（每步 2 分）；干扰项「电源时序器」1 分；②数字音频处理器 1.5 分；③光纤 HDMI 或 HDBaseT 1.5 分。', explain: '音频链路：有线会议话筒/单元 → 会议系统主机 → 数字音频处理器 → 功率放大器 → 扬声器；电源时序器为干扰项。视频会议音频进数字音频处理器；长距离用光纤 HDMI/HDBaseT。' },
  { id: 'T2-29', type: 'short', manual: true, examId: 'sceneT2', category: '需求澄清', question: '需求澄清：依据需求卡 A（104 ㎡ 中型会议室、U 型 16 座、2 路 HDMI + 1 路无线投屏、LED P1.5 约 4.8×2.7 m、录播与中控一键开会、装修完成不便开槽），列出在深化与报价前必须问清的不少于 8 个问题，并在括号内标注类别（空间 / 显示 / 音频 / 信号 / 控制 / 网络 / 现场条件 / 预算 / 工期）。', points: 10, examineRule: '评分：每个有效问题 1 分（最多 8 分）；类别标注正确 2 分。必须覆盖空间、显示、音频、信号、控制、网络、现场条件、预算/工期中的至少 6 类。', explain: '示例：观看距离与主视线高度（空间/显示）；LED 点间距与维护通道（显示）；发言与扩声方式（音频）；信号源类型与切换方式（信号）；录播与中控联动范围（控制）；网络与 IP 规划（网络）；吊顶承重与开槽限制（现场条件）；预算口径与工期（预算/工期）。' },

  // ====================================================================
  // sceneT3 阶段测三 · 展厅拓扑与配单（45 分钟，通过线 80）
  // 单选 16×2=32 + 判断 5×2=10 + 多选 4×5=20 + 简答 13+13+12=38 → 100
  // 客观题合计 62 分（<80，必须导师评分）
  // ====================================================================
  { id: 'T3-01', type: 'single', examId: 'sceneT3', category: '显示与拼控', question: '同一观看距离下，P1.5 相比 P2.5 的主要优势是：', options: ['A. 亮度更高', 'B. 价格更低', 'C. 点间距更小，近距离观看更细腻', 'D. 更适合户外'], answer: 'C', points: 2, explain: 'P1.5 点间距更小，近距离观看更细腻；亮度、价格与户外适用性不是主要优势。' },
  { id: 'T3-02', type: 'single', examId: 'sceneT3', category: '显示与拼控', question: 'LED 屏「最近观看距离」与点间距的经验关系，通常表述为：', options: ['A. 约按点间距毫米数 × 1 米的量级估算', 'B. 与点间距无关', 'C. 点间距越大，观看距离应越近', 'D. 只取决于屏体亮度'], answer: 'A', points: 2, explain: '最近观看距离可按点间距毫米数 × 1 米的量级估算。' },
  { id: 'T3-03', type: 'single', examId: 'sceneT3', category: '媒体播控', question: '展厅多块屏播放同一片源、要求画面同步无撕裂，主要依靠：', options: ['A. 每块屏各插一个 U 盘', 'B. 播控或媒体服务器统一同步输出', 'C. 智能中控', 'D. 功率放大器'], answer: 'B', points: 2, explain: '多屏同步由播控/媒体服务器统一同步输出，各屏插 U 盘最不可靠。' },
  { id: 'T3-04', type: 'single', examId: 'sceneT3', category: '播控与LED', question: '播控系统与 LED 控制系统的关系是：', options: ['A. 二者二选一', 'B. 播控直接带载屏体', 'C. LED 控制负责内容编排', 'D. 播控负责内容与输出，LED 控制负责带载与点对点送到屏上'], answer: 'D', points: 2, explain: '播控管内容与输出，LED 控制管带载与到屏。' },
  { id: 'T3-05', type: 'single', examId: 'sceneT3', category: '播控', question: '展厅需 8 路独立输出且支持开馆多屏联动，配单时首先要确认：', options: ['A. 播控的输出路数与屏体分组', 'B. 音箱功率', 'C. 机柜颜色', 'D. 网线长度'], answer: 'A', points: 2, explain: '先确认播控输出路数与屏体分组，再谈同步与联动。' },
  { id: 'T3-06', type: 'single', examId: 'sceneT3', category: '异形屏', question: '异形屏（弧形屏、立柱屏）在显示控制上的主要差异是：', options: ['A. 不需要接收卡', 'B. 只能使用投影实现', 'C. 需按实际排布重新规划接收卡走线与带载，矩形模板不适用', 'D. 不能播放视频'], answer: 'C', points: 2, explain: '异形屏需按实际排布重新规划接收卡走线与带载。' },
  { id: 'T3-07', type: 'single', examId: 'sceneT3', category: '分布式', question: '分布式系统在展厅项目中的典型价值是：', options: ['A. 降低屏体成本', 'B. 多信号源跨区域汇聚、远距离传输与灵活上屏', 'C. 替代播控系统', 'D. 替代智能中控'], answer: 'B', points: 2, explain: '分布式用于多信号源跨区域汇聚、远距离传输与灵活上屏。' },
  { id: 'T3-08', type: 'single', examId: 'sceneT3', category: '分区音频', question: '多个展区各自讲解、互不干扰，应配置：', options: ['A. 单只大功率音箱', 'B. 智能中控', 'C. 一台功放', 'D. 分区音频与分区讲解系统'], answer: 'D', points: 2, explain: '多展区独立讲解需分区音频与分区讲解系统。' },
  { id: 'T3-09', type: 'single', examId: 'sceneT3', category: '智能中控', question: '展厅「开馆 / 参观 / 闭馆」三套模式一键切换，主要依靠：', options: ['A. 智能中控的场景联动', 'B. 播控软件', 'C. 音频处理器', 'D. 矩阵'], answer: 'A', points: 2, explain: '多模式一键切换靠中控场景联动。' },
  { id: 'T3-10', type: 'single', examId: 'sceneT3', category: '智能中控', question: '展厅中控配置双机热备，主要防范：', options: ['A. 内容素材丢失', 'B. 屏体坏点', 'C. 中控主机故障导致全馆失控', 'D. 网络变慢'], answer: 'C', points: 2, explain: '中控双机热备防范主机故障导致全馆失控。' },
  { id: 'T3-11', type: 'single', examId: 'sceneT3', category: '现场条件', question: '屏体挂装施工前必须确认的现场条件是：', options: ['A. 预算', 'B. 承重', 'C. 品牌', 'D. 颜色'], answer: 'B', points: 2, explain: '挂装前必须确认安装面承重与结构条件。' },
  { id: 'T3-12', type: 'single', examId: 'sceneT3', category: '现场条件', question: '封闭展区散热不良最直接的后果是：', options: ['A. 音质更好', 'B. 亮度更高', 'C. 没有影响', 'D. 设备高温降频甚至宕机'], answer: 'D', points: 2, explain: '散热不良会导致设备高温降频甚至宕机。' },
  { id: 'T3-13', type: 'single', examId: 'sceneT3', category: '现场条件', question: '展厅改造项目中最容易被忽略、又直接影响验收的是：', options: ['A. 疏散标识样式', 'B. 音箱品牌', 'C. 材料阻燃要求与消防联动', 'D. 屏体分辨率'], answer: 'C', points: 2, explain: '材料阻燃与消防联动直接影响验收。' },
  { id: 'T3-14', type: 'single', examId: 'sceneT3', category: '分区音频', question: '展厅音频的分区数量主要取决于：', options: ['A. 展区数量与讲解动线', 'B. 屏体数量', 'C. 机柜数量', 'D. 预算高低'], answer: 'A', points: 2, explain: '分区数量由展区数量与讲解动线决定。' },
  { id: 'T3-15', type: 'single', examId: 'sceneT3', category: '媒体播控', question: '播控素材准备时最关键的技术确认是：', options: ['A. 文件名规范', 'B. 分辨率、帧率与编码格式是否与屏体匹配', 'C. 文件大小', 'D. 播放器品牌'], answer: 'B', points: 2, explain: '素材分辨率、帧率与编码格式必须与屏体匹配。' },
  { id: 'T3-16', type: 'single', examId: 'sceneT3', category: '公共广播', question: '展厅需在开馆时段做分区背景音乐、闭馆后分区播报，并接受消防强切，应配置：', options: ['A. 仅用扩声系统的分区功放', 'B. 分布式系统', 'C. 公共广播系统（分区功放 + 消防强切接口）', 'D. 视频会议终端'], answer: 'C', points: 2, explain: '分区背景音乐、分区播报与消防强切需公共广播系统。' },

  { id: 'T3-17', type: 'judge', examId: 'sceneT3', category: '需求对接', question: '客户要求与现场条件冲突时（如层高不足无法吊装音箱），应先说明约束并给替代方案。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。先说明约束再给替代方案，避免硬承诺。' },
  { id: 'T3-18', type: 'judge', examId: 'sceneT3', category: '需求对接', question: '第三方内容制作方只需在开馆前拿到素材清单，不必提前确认分辨率与编码格式。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。素材分辨率与编码格式必须提前确认，否则播控无法匹配屏体。' },
  { id: 'T3-19', type: 'judge', examId: 'sceneT3', category: '需求对接', question: '屏体承重加固通常属土建或结构界面，需在方案阶段提出并由甲方确认责任方。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。承重加固属土建/结构界面，方案阶段就要明确责任方。' },
  { id: 'T3-20', type: 'judge', examId: 'sceneT3', category: '需求对接', question: '展厅的数据看板与互动程序开发属于我方播控系统的一部分，可以一并承诺。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。数据看板与互动开发超出播控边界，应写入需支持事项。' },
  { id: 'T3-21', type: 'judge', examId: 'sceneT3', category: '需求对接', question: '方案中引用第三方产品的参数，应由该产品原厂确认，不能凭经验填写。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。第三方参数须原厂确认，避免承诺不实。' },

  { id: 'T3-22', type: 'multiple', examId: 'sceneT3', category: '多屏同步', question: '展厅多屏同步方案必须交代的内容包括：', options: ['A. 主备关系', 'B. 切换方式', 'C. 同步与校时方式', 'D. 故障降级策略', 'E. 屏体品牌'], answer: 'ABCD', points: 5, explain: '同步方案须交代主备、切换、校时与故障降级；屏体品牌不属于同步方案内容。' },
  { id: 'T3-23', type: 'multiple', examId: 'sceneT3', category: '显示与拼控', question: '关于点间距与异形屏，说法正确的有：', options: ['A. P1.5 比 P2.5 点间距更小，近距离更细腻', 'B. 最近观看距离可按点间距毫米数 × 1 米的量级估算', 'C. 异形屏需按实际排布重新规划接收卡走线与带载', 'D. 矩形模板可以直接套用异形屏', 'E. 点间距越大，观看距离应越近'], answer: 'ABC', points: 5, explain: 'D、E 与异形屏和点间距常识相反。' },
  { id: 'T3-24', type: 'multiple', examId: 'sceneT3', category: '现场条件', question: '展厅项目进场前必须核查的现场条件包括：', options: ['A. 承重', 'B. 供电容量', 'C. 散热与消防', 'D. 材料阻燃与消防联动', 'E. 客户往年采购金额'], answer: 'ABCD', points: 5, explain: '承重、供电、散热消防、阻燃联动均为现场条件；采购金额不属于现场条件。' },
  { id: 'T3-25', type: 'multiple', examId: 'sceneT3', category: '公共广播', question: '关于公共广播与分区讲解，说法正确的有：', options: ['A. 公共广播要求可分区、可分时，并能被消防强切', 'B. 分区讲解按展区与讲解动线配置', 'C. 两者可共用网络与处理设备，但需分区路由与优先级管理', 'D. 公共广播与扩声可共用同一台功放且不必分区', 'E. 消防强切可由我方自行实现，无需与消防单位确认'], answer: 'ABC', points: 5, explain: '公共广播与扩声不能混用；消防强切必须与消防单位确认干接点。' },

  { id: 'T3-26', type: 'short', manual: true, examId: 'sceneT3', category: '拓扑排序', question: '展厅屏体显示主链路排序（文字作答）：请把下列节点按信号流方向排成正确顺序，并指出干扰项：LED 发送卡、播控 / 多媒体服务器、LED 屏体、LED 接收卡、电源时序器、视频处理器 / 拼接处理器。', points: 13, examineRule: '评分：5 个有效节点顺序 10 分（每步 2 分）；指出干扰项「电源时序器」1 分；整序无错 2 分。正确顺序：播控/多媒体服务器 → 视频处理器/拼接处理器 → LED 发送卡 → LED 接收卡 → LED 屏体。', explain: '展厅显示主链路：播控/媒体服务器 → 视频处理器/拼接处理器 → 发送卡 → 接收卡 → 屏体；电源时序器属供配电配套。' },
  { id: 'T3-27', type: 'short', manual: true, examId: 'sceneT3', category: '拓扑排序', question: '展厅分区音频排序与分工说明：① 将下列节点排序并指出干扰项：分区功放、展区音箱、视频分配器、分区音源、分区音频处理器；② 用一句话说明「播控 / 多媒体服务器」与「LED 控制系统」在展厅项目里的分工；③ 说明 4 个展区各需独立音源与讲解时，分区音频需要哪两类设备。', points: 13, examineRule: '评分：4 个有效节点顺序 8 分（每步 2 分）；干扰项「视频分配器」1 分；分工说明 2 分（播控管内容与输出、LED 控制管带载与到屏）；两类设备 2 分（分区音频处理器 + 分区功放，或分区音源/分区控制）。', explain: '分区音频链路：分区音源 → 分区音频处理器 → 分区功放 → 展区音箱；视频分配器为干扰项。播控管内容输出，LED 控制管带载到屏。' },
  { id: 'T3-28', type: 'short', manual: true, examId: 'sceneT3', category: '现场条件', question: '现场条件清单：依据需求卡 C（600 ㎡ 老楼改造企业展厅、4 展区、主屏 P1.8 6.0×3.4 m、入口弧形立柱屏 2 块、4 展区独立音源且 2 展区同步、三模式切换、原吊顶承重资料缺失），列出不少于 6 项必须补问或复核的现场条件，并说明漏问该项会导致的后果。', points: 12, examineRule: '评分：每项条件 1 分（最多 6 分），每项后果 1 分（最多 6 分）。应覆盖承重与吊装、供电容量与配电、散热、消防与阻燃、桥架路由与开槽、施工窗口与调试时间等。', explain: '条件项：吊顶/安装面承重、供电容量与回路、封闭区散热、消防强切与材料阻燃、桥架与开槽路由、施工窗口与调试时间。漏问会导致返工、验收不过或工期违约。' },

  // ====================================================================
  // sceneT4 阶段测四 · 需求澄清与跨系统配单（55 分钟，通过线 80）
  // 单选 12×2=24 + 判断 4×2=8 + 多选 5×5=25 + 简答 14+15+14=43 → 100
  // 客观题合计 57 分（<80，必须导师评分）
  // ====================================================================
  { id: 'T4-01', type: 'single', examId: 'sceneT4', category: '方案流程', question: '集成配单的正确顺序是：', options: ['A. 先设备后系统', 'B. 先报价后配置', 'C. 先系统后设备、先主链路后配套', 'D. 先定品牌再想系统'], answer: 'C', points: 2, explain: '配单应先系统后设备、先主链路后配套。' },
  { id: 'T4-02', type: 'single', examId: 'sceneT4', category: '需求澄清', question: '客户只说「要个好点的展厅，越快越好」，第一步应：', options: ['A. 直接报价', 'B. 澄清场景、规模、内容、预算与工期', 'C. 推荐最高配方案', 'D. 先发产品彩页'], answer: 'B', points: 2, explain: '需求不明时先澄清场景、规模、内容、预算与工期。' },
  { id: 'T4-03', type: 'single', examId: 'sceneT4', category: '配单', question: '配单模板中区分「必配 / 选配」的意义是：', options: ['A. 区分主链路刚需与可优化项，便于分层决策与报价', 'B. 便于排版', 'C. 方便写文档', 'D. 没有实际意义'], answer: 'A', points: 2, explain: '必配/选配用于区分主链路刚需与可优化项，支撑分层决策与报价。' },
  { id: 'T4-04', type: 'single', examId: 'sceneT4', category: '冗余', question: '集成方案中的冗余通常体现在：', options: ['A. 只体现在报价单', 'B. 不需要考虑冗余', 'C. 只在外场活动需要', 'D. 话筒数量、功放通道、网口与光口、播控主备'], answer: 'D', points: 2, explain: '冗余体现在话筒数量、功放通道、网络端口与播控主备等实际资源。' },
  { id: 'T4-05', type: 'single', examId: 'sceneT4', category: '数量估算', question: '数量估算中最不可接受的做法是：', options: ['A. 按面积与坐席数计算', 'B. 按分区计算', 'C. 填写「若干」或区间值', 'D. 预留 10% 冗余'], answer: 'C', points: 2, explain: '配单数量必须可执行，不能写「若干」或区间值。' },
  { id: 'T4-06', type: 'single', examId: 'sceneT4', category: '接口兼容', question: '接口兼容性最先要确认的是：', options: ['A. 品牌是否一致', 'B. 输入输出类型以及是否需要转换件', 'C. 外观颜色', 'D. 包装方式'], answer: 'B', points: 2, explain: '接口兼容首看输入输出类型与是否需要转换件。' },
  { id: 'T4-07', type: 'single', examId: 'sceneT4', category: '报价边界', question: '客户当场问「这套多少钱」，新人应当：', options: ['A. 说明需按配置核算，先确认需求范围与预算口径，报价由销售或商务出具', 'B. 直接报底价', 'C. 表示自己不清楚', 'D. 给一个价格区间'], answer: 'A', points: 2, explain: '新人不能现场报价，应说明按配置核算并由销售/商务出具。' },
  { id: 'T4-08', type: 'single', examId: 'sceneT4', category: '场景差异', question: '会议室与展厅配单最大的差异通常在于：', options: ['A. 没有差异', 'B. 只差音箱', 'C. 只差机柜', 'D. 播控权重、屏体复杂度、现场条件与音频分区'], answer: 'D', points: 2, explain: '两场景差异集中在播控权重、屏体复杂度、现场条件与音频分区。' },
  { id: 'T4-09', type: 'single', examId: 'sceneT4', category: '原厂支持', question: '配单表中「需原厂支持事项」栏的作用是：', options: ['A. 免责声明', 'B. 明确谁在什么节点支持什么，避免后期返工与责任不清', 'C. 形式要求', 'D. 给领导看'], answer: 'B', points: 2, explain: '需原厂支持事项用于明确支持节点与责任，避免返工。' },
  { id: 'T4-10', type: 'single', examId: 'sceneT4', category: '拓扑纠错', question: '拓扑纠错的通用方法是：', options: ['A. 只看显示部分', 'B. 只看音频部分', 'C. 从信号源出发顺主链路走到显示与音频，再回看控制与供电', 'D. 凭经验判断'], answer: 'C', points: 2, explain: '从信号源顺主链路检查显示与音频，再回看控制与供电。' },
  { id: 'T4-11', type: 'single', examId: 'sceneT4', category: '界面划分', question: '项目由总包统一管理装修，屏体挂装需在装饰面上开孔。报价前最先应确认：', options: ['A. 屏体品牌', 'B. 音箱功率', 'C. 开孔与恢复由谁负责、费用谁承担', 'D. 播控软件版本'], answer: 'C', points: 2, explain: '开孔与恢复的责任及费用归属必须报价前确认。' },
  { id: 'T4-12', type: 'single', examId: 'sceneT4', category: '预算', question: '客户说「预算按常规来」，最稳妥的下一步是：', options: ['A. 直接按最高配置报价', 'B. 先签合同再谈配置', 'C. 按最低配报价以争取中标', 'D. 给分档配置建议并同时确认预算口径与决策链'], answer: 'D', points: 2, explain: '给分档配置建议并确认预算口径与决策链，避免报价失真。' },

  { id: 'T4-13', type: 'judge', examId: 'sceneT4', category: '需求对接', question: '正确的对接顺序是：先勘察现场与确认界面，再出配置与图纸，最后谈价格与工期。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。先勘察与界面，再配置图纸，最后价格工期。' },
  { id: 'T4-14', type: 'judge', examId: 'sceneT4', category: '需求对接', question: '方案对接会应有明确输出：界面清单、待确认事项清单、责任人与时间点。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。对接会必须形成可执行的输出清单。' },
  { id: 'T4-15', type: 'judge', examId: 'sceneT4', category: '需求对接', question: '展厅播出内容的合规审核责任在甲方或内容方，我方只提供播单管理与留痕功能。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。内容合规责任在甲方/内容方，我方仅提供播单管理与留痕。' },
  { id: 'T4-16', type: 'judge', examId: 'sceneT4', category: '需求对接', question: '客户说「别家都能做到，你们也承诺同样的功能」，可以先答应再评估。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。不能先承诺后评估，必须先核实能力边界。' },

  { id: 'T4-17', type: 'multiple', examId: 'sceneT4', category: '配单', question: '关于集成配单的正确做法，包括：', options: ['A. 先系统后设备、先主链路后配套', 'B. 区分必配 / 选配便于分层决策', 'C. 数量不得填写「若干」或区间值', 'D. 接口需确认输入输出类型与转换件', 'E. 报价前先定品牌再想系统'], answer: 'ABCD', points: 5, explain: 'E 与「先系统后设备」相悖，其余均正确。' },
  { id: 'T4-18', type: 'multiple', examId: 'sceneT4', category: '冗余', question: '集成方案中的冗余通常体现在：', options: ['A. 话筒数量', 'B. 功放通道', 'C. 网口与光口', 'D. 播控主备', 'E. 只体现在报价单'], answer: 'ABCD', points: 5, explain: '冗余体现在实际资源与备份设计，不是报价单修饰。' },
  { id: 'T4-19', type: 'multiple', examId: 'sceneT4', category: '需求澄清', question: '需求澄清中必须问清的内容包括：', options: ['A. 预算口径与工期', 'B. 决策链与关键决策人', 'C. 现场条件与界面划分', 'D. 内容素材与分辨率', 'E. 客户往年采购金额'], answer: 'ABCD', points: 5, explain: 'A-D 直接影响方案与报价；往年采购金额不是必问项。' },
  { id: 'T4-20', type: 'multiple', examId: 'sceneT4', category: '原厂支持', question: '关于「需原厂支持事项」栏，说法正确的有：', options: ['A. 明确谁在什么节点支持什么', 'B. 避免后期返工与责任不清', 'C. 可以写成免责声明推卸责任', 'D. 第三方产品参数需原厂确认', 'E. 只是形式要求'], answer: 'ABD', points: 5, explain: '该栏用于明确支持与责任，不是免责声明或形式要求。' },
  { id: 'T4-21', type: 'multiple', examId: 'sceneT4', category: '拓扑纠错', question: '拓扑纠错的通用方法包括：', options: ['A. 从信号源出发顺主链路检查到显示与音频', 'B. 回看控制与供电配套', 'C. 只看显示部分', 'D. 只看音频部分', 'E. 凭经验判断'], answer: 'AB', points: 5, explain: '纠错应按信号流全链路检查，并回看控制与供电。' },

  { id: 'T4-22', type: 'short', manual: true, examId: 'sceneT4', category: '需求澄清', question: '需求澄清与复述：客户原话「我们新办公楼要弄个能开视频会的展厅，你给个方案，越快越好，预算你按常规来。」① 提出不少于 12 个有效问题，逐条归类到子系统或条件项（①—⑨ 或 空间 / 预算 / 工期 / 决策链），每条不超过 30 字；② 用 3—5 句话复述你理解的需求，并注明仍需客户确认的 2 项（不超过 120 字）。', points: 14, examineRule: '评分：12 个有效问题 9 分（每个 0.75 分，可按完整性取整）；归类正确 2 分；复述确认 3 分（含 2 项待确认）。问题需覆盖视频会议、显示、音频、播控/内容、中控、网络、空间、预算、工期、决策链。', explain: '问题示例：分会场数量与视频会议品牌（⑤）；展厅面积与展区数（空间/①）；主屏尺寸与点间距（①）；讲解与扩声方式（④）；内容谁制作、分辨率与更新频率（②）；是否需要统一平台（⑥）；网络与 IP 规划（⑦）；预算口径是否含内容与施工（预算）；开馆时间（工期）；谁最终拍板（决策链）。' },
  { id: 'T4-23', type: 'short', manual: true, examId: 'sceneT4', category: '跨系统配单', question: '跨系统配单：依据需求卡 D（区政府多功能厅 200 ㎡、层高 4 m、LED P2.0 5.0×2.8 m、报告型扩声、4 路信号上屏、远程视频会议、会议录播、中控一键场景；门厅 2×2 55 寸液晶拼接信息发布屏），完成初步配单。要求覆盖不少于 4 个子系统，「网络与供电配套」不少于 3 行，并写出屏体带载或功率估算过程。', points: 15, examineRule: '评分：子系统覆盖 5 分（≥4 个，缺一个扣 1 分）；主链路设备完整 4 分；网络与供电配套 ≥3 行 3 分；计算过程 2 分（带载或功率算式）；需原厂支持事项 1 分。', explain: '应含显示与拼控（LED 屏体/发送卡/接收卡/拼控）、音频扩声（话筒/处理器/功放/音箱）、视频会议与录播、智能中控、网络与供电（交换机/电源时序器/机柜/线材）、门厅液晶拼接+信息发布。' },
  { id: 'T4-24', type: 'short', manual: true, examId: 'sceneT4', category: '拓扑纠错', question: '拓扑纠错：下列会议室方案拓扑存在 6 处错误，请逐行指出「错在哪个环节 + 应改为什么」（每行一句，不超过 40 字）。「笔记本 HDMI 输出直接接入 LED 接收卡；有线话筒直接接入功率放大器；功率放大器的输出端接到音频处理器的输入端；中控主机仅连接了投影幕布、全系统也未配置网络交换机；电源时序器串接在功放输出之后；会议录播主机的音频输入取自功率放大器的输出端。」', points: 14, examineRule: '评分：每处 2 分，答出「错误环节 + 正确做法」各 1 分；共 6 处 12 分；表述清晰完整 2 分。', explain: '6 处：① HDMI 应先经视频处理器/拼控与发送卡再到接收卡；② 话筒应经会议主机/音频处理器再进功放；③ 应为功放输入端接处理器输出端；④ 中控应接入被控设备并配置网络交换机；⑤ 电源时序器应串在供电侧而非功放输出；⑥ 录播音频应取自音频处理器输出而非功放输出。' },

  // ====================================================================
  // sceneFinal 结业综合测试（70 分钟，通过线 80）
  // 单选 20×2=40 + 判断 3×2=6 + 多选 5×5=25 + 简答 15+14=29 → 100
  // 客观题合计 71 分（<80，必须导师评分）
  // ====================================================================
  { id: 'F-01', type: 'single', examId: 'sceneFinal', category: '集成全景', question: '下列不属于音视频集成九个子系统的是：', options: ['A. 显示与拼控', 'B. 媒体播控', 'C. 结构加固', 'D. 无纸化会议'], answer: 'C', points: 2, explain: '结构加固属土建/结构界面，不属音视频集成九个子系统。' },
  { id: 'F-02', type: 'single', examId: 'sceneFinal', category: '智能中控', question: '音视频集成方案中，承担设备集中管控与场景联动的是：', options: ['A. 分布式系统', 'B. 智能中控', 'C. 矩阵', 'D. 播控系统'], answer: 'B', points: 2, explain: '智能中控负责设备集中管控与场景联动。' },
  { id: 'F-03', type: 'single', examId: 'sceneFinal', category: '播控与LED', question: '关于播控与 LED 控制的分工，正确的是：', options: ['A. 播控管内容编排与输出，LED 控制管带载与到屏', 'B. 二者可互相替代', 'C. LED 控制负责排片', 'D. 播控负责屏体带载'], answer: 'A', points: 2, explain: '播控管内容与输出，LED 控制管带载与到屏。' },
  { id: 'F-04', type: 'single', examId: 'sceneFinal', category: '分布式/坐席', question: '需要「一人操作多台远端主机、坐席协作上屏」的场景，应选：', options: ['A. 矩阵', 'B. 分配器', 'C. 拼接处理器', 'D. KVM 光纤坐席系统'], answer: 'D', points: 2, explain: '远端主机操作与坐席协作上屏选 KVM 光纤坐席系统。' },
  { id: 'F-05', type: 'single', examId: 'sceneFinal', category: '音频计算', question: '纯语言类会议室，功放额定功率与音箱额定功率的比值通常取：', options: ['A. 0.5—0.8', 'B. 1—1.2', 'C. 2.0 以上', 'D. 3.0'], answer: 'B', points: 2, explain: '纯语言类功放与音箱功率比通常取 1—1.2。' },
  { id: 'F-06', type: 'single', examId: 'sceneFinal', category: '播控', question: '展厅播控配置前，最先要确认的技术参数是：', options: ['A. 屏体颜色', 'B. 音箱品牌', 'C. 输出路数与屏体分组', 'D. 机柜尺寸'], answer: 'C', points: 2, explain: '播控配置先确认输出路数与屏体分组。' },
  { id: 'F-07', type: 'single', examId: 'sceneFinal', category: '产品归属', question: '产品归属三色标注的含义是：', options: ['A. 自产主推 / 配套合作 / 外采需支持', 'B. 高、中、低三档价格', 'C. 三种外壳颜色', 'D. 三种质保年限'], answer: 'A', points: 2, explain: '三色标注表示自产主推、配套合作、外采需支持。' },
  { id: 'F-08', type: 'single', examId: 'sceneFinal', category: '需求澄清', question: '需求澄清清单中，最容易被新人漏问、但直接影响方案与报价的是：', options: ['A. 品牌偏好', 'B. 颜色偏好', 'C. 屏体尺寸', 'D. 预算口径与工期'], answer: 'D', points: 2, explain: '预算口径与工期最易被漏问，且直接影响方案与报价。' },
  { id: 'F-09', type: 'single', examId: 'sceneFinal', category: '配单', question: '配单中「必配」通常指：', options: ['A. 客户喜欢的', 'B. 主链路不可缺、缺失后系统无法运行', 'C. 价格较高的', 'D. 进口产品'], answer: 'B', points: 2, explain: '必配指主链路不可缺项，缺失后系统无法运行。' },
  { id: 'F-10', type: 'single', examId: 'sceneFinal', category: '现场条件', question: '展厅项目进场前必须核查的现场条件不包括：', options: ['A. 承重', 'B. 供电容量', 'C. 散热与消防', 'D. 客户往年采购金额'], answer: 'D', points: 2, explain: '往年采购金额不属于现场条件核查项。' },
  { id: 'F-11', type: 'single', examId: 'sceneFinal', category: '产品归属', question: '嗨动 MS-X6000WD 属于：', options: ['A. 扩声功放', 'B. 智能中控', 'C. 数字会议系统主机', 'D. 播控服务器'], answer: 'C', points: 2, explain: 'MS-X6000WD 属数字会议系统主机。' },
  { id: 'F-12', type: 'single', examId: 'sceneFinal', category: '产品归属', question: '嗨动天韵系列属于：', options: ['A. 智能中控', 'B. 音频扩声系统', 'C. 分布式系统', 'D. 多媒体播控'], answer: 'B', points: 2, explain: '天韵系列属音频扩声系统。' },
  { id: 'F-13', type: 'single', examId: 'sceneFinal', category: '产品归属', question: '嗨动泰山系列属于：', options: ['A. 分布式拼接', 'B. 智能中控', 'C. 音频扩声', 'D. 光纤坐席管理系统（KVM）'], answer: 'D', points: 2, explain: '泰山系列属光纤坐席管理系统（KVM）。' },
  { id: 'F-14', type: 'single', examId: 'sceneFinal', category: '产品归属', question: '嗨动阿尔法系列属于：', options: ['A. 专业级拼接服务器', 'B. 智能中控', 'C. 多媒体播控', 'D. 音频扩声'], answer: 'A', points: 2, explain: '阿尔法系列属专业级拼接服务器。' },
  { id: 'F-15', type: 'single', examId: 'sceneFinal', category: '产品归属', question: '嗨动 EG 系列属于：', options: ['A. 智能中控', 'B. 分布式', 'C. 多媒体服务器', 'D. 矩阵'], answer: 'C', points: 2, explain: 'EG 系列属多媒体服务器。' },
  { id: 'F-16', type: 'single', examId: 'sceneFinal', category: '产品归属', question: '嗨动 EMX 系列属于：', options: ['A. 分布式', 'B. 矩阵', 'C. 播控', 'D. 音频'], answer: 'B', points: 2, explain: 'EMX 系列属矩阵。' },
  { id: 'F-17', type: 'single', examId: 'sceneFinal', category: '供电配套', question: '电源时序器的主要作用是：', options: ['A. 放大音频信号', 'B. 编码视频信号', 'C. 拼接画面', 'D. 按设定顺序上电与断电，保护设备'], answer: 'D', points: 2, explain: '电源时序器按顺序上电/断电，保护设备。' },
  { id: 'F-18', type: 'single', examId: 'sceneFinal', category: '产品定位', question: '产品定位简答（书面说明某产品在系统中的位置）不考察的是：', options: ['A. 产品的具体参数与价格', 'B. 所属子系统判定', 'C. 上下游设备类别', 'D. 需其他产品配合的条件'], answer: 'A', points: 2, explain: '产品定位不考察具体参数与价格，重在归属、上下游与边界。' },
  { id: 'F-19', type: 'single', examId: 'sceneFinal', category: '配单边界', question: '新人配单的边界是：', options: ['A. 可直接对外承诺', 'B. 可自行决定报价', 'C. 只出初步配置建议，对外前须经解决方案工程师复核', 'D. 不需要复核'], answer: 'C', points: 2, explain: '新人只出初步配置建议，对外前须经解决方案工程师复核。' },
  { id: 'F-20', type: 'single', examId: 'sceneFinal', category: '多屏同步', question: '展厅多屏同步播放，最不可靠的做法是：', options: ['A. 播控统一同步输出', 'B. 每块屏各插一个 U 盘分别播放', 'C. 分布式统一分发', 'D. 播控配置主备冗余'], answer: 'B', points: 2, explain: '各屏插 U 盘分别播放无法保证同步，最不可靠。' },

  { id: 'F-21', type: 'judge', examId: 'sceneFinal', category: '需求对接', question: '会议室改造项目中，吊顶内的走线由谁敷设不影响报价，可以先不问。', options: ['正确', '错误'], answer: 'B', points: 2, explain: '错误。吊顶走线界面直接影响报价与施工责任，必须先问。' },
  { id: 'F-22', type: 'judge', examId: 'sceneFinal', category: '需求对接', question: '每次需求变更后，应重新确认界面与责任划分，不能只在原方案上改数量。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。需求变更必须重新确认界面与责任。' },
  { id: 'F-23', type: 'judge', examId: 'sceneFinal', category: '需求对接', question: '客户询问竞品参数对比时，应说明对比口径与测试条件，不能只给结论。', options: ['正确', '错误'], answer: 'A', points: 2, explain: '正确。竞品对比必须说明口径与测试条件。' },

  { id: 'F-24', type: 'multiple', examId: 'sceneFinal', category: '集成全景', question: '下列属于音视频集成九个子系统的有：', options: ['A. 显示与拼控', 'B. 媒体播控', 'C. 分布式 / 矩阵 / 坐席', 'D. 音频扩声', 'E. 结构加固'], answer: 'ABCD', points: 5, explain: '结构加固属土建/结构界面，不属九个子系统。' },
  { id: 'F-25', type: 'multiple', examId: 'sceneFinal', category: '播控与LED', question: '关于播控、LED 控制与多屏同步，说法正确的有：', options: ['A. 播控负责内容编排与输出', 'B. LED 控制负责带载与到屏', 'C. 播控统一同步输出更可靠', 'D. 每屏各插 U 盘最可靠', 'E. 播控主备冗余可提升可靠性'], answer: 'ABCE', points: 5, explain: '各屏插 U 盘最不可靠；其余正确。' },
  { id: 'F-26', type: 'multiple', examId: 'sceneFinal', category: '配单边界', question: '关于新人配单与对外口径，说法正确的有：', options: ['A. 只出初步配置建议，对外前须经解决方案工程师复核', 'B. 不得现场直接承诺最终配置与价格', 'C. 预算口径要问清是否包含结构、内容与施工', 'D. 超出范围的内容写入需支持事项', 'E. 客户说「按常规来」即可直接出方案'], answer: 'ABCD', points: 5, explain: '「按常规来」仍需澄清需求，E 错误。' },
  { id: 'F-27', type: 'multiple', examId: 'sceneFinal', category: '现场条件', question: '展厅项目必须核查的现场条件与扩展预留包括：', options: ['A. 承重', 'B. 供电容量', 'C. 散热与消防', 'D. 后期扩展预留网口与机位', 'E. 客户往年采购金额'], answer: 'ABCD', points: 5, explain: 'A-D 属现场条件与扩展预留；采购金额无关。' },
  { id: 'F-28', type: 'multiple', examId: 'sceneFinal', category: '产品归属', question: '下列产品与子系统归属，正确的有：', options: ['A. MCTRL4K — 显示与拼控', 'B. 西格玛双引擎 — 分布式', 'C. 天韵系列 — 音频扩声', 'D. ECS3000 — 智能中控', 'E. 科赛 — 视频会议'], answer: 'ABCD', points: 5, explain: '科赛属无纸化会议，不是视频会议。' },

  { id: 'F-29', type: 'short', manual: true, examId: 'sceneFinal', category: '跨场景配单', question: '结业跨场景配单：依据需求卡 E（12 层会议室 80 ㎡、10 座，本地会议 + 视频会议 + 2 路信号上屏 + 录播 + 中控；1 层品牌展厅 300 ㎡、3 展区，主屏 P1.8 5.0×2.8 m + 立式广告屏 2 块，分区讲解、多屏同步、开馆/闭馆两套模式；客户要求统一可视化平台并支持后期扩展），完成配单：① 覆盖不少于 5 个子系统；② 会议室与展厅分别列系统，同一平台管控设备注明对接方式；③ 至少 1 处扩展预留并说明理由；④ 网络与供电不少于 3 行并说明两场景如何划分网络。', points: 15, examineRule: '评分：子系统覆盖 5 分（≥5 个）；两场景系统分列与平台对接 3 分；扩展预留 2 分；网络与供电 ≥3 行 3 分；计算或对接说明 2 分。', explain: '应覆盖显示与拼控、媒体播控、音频扩声/分区讲解、视频会议/录播、智能中控、网络与供电；平台统一管控需注明中控与播控、会议、音频的对接方式（网络/串口/API）；扩展预留如备用网口、机位、播控输出路数。' },
  { id: 'F-30', type: 'short', manual: true, examId: 'sceneFinal', category: '拓扑纠错', question: '结业拓扑纠错：下列展厅方案拓扑存在 7 处错误，请逐行指出「错误环节 + 正确做法」（每行一句，不超过 40 字）。「播控服务器输出直接接入屏体接收卡，中间未配置发送卡；4 个展区共用一个音源，未做分区；异形立柱屏按常规矩形模板配置接收卡走线；中控未接入播控，开馆时需人工逐台开屏；现场承重资料未确认即下单屏体结构件；公共广播的消防强切由我方自行实现，未与消防施工单位确认干接点；播控素材开馆前 3 天才收到，未核对分辨率与编码格式。」', points: 14, examineRule: '评分：每处 2 分，共 7 处 14 分。需答出错误环节与正确做法。', explain: '7 处：① 播控→发送卡→接收卡→屏体；② 分区音源与分区音频/功放；③ 异形屏重新规划接收卡走线；④ 中控接入播控与设备实现联动；⑤ 先确认承重再下单；⑥ 消防强切由消防单位提供干接点并确认；⑦ 素材需提前核对分辨率与编码。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_scene;
}
