// 场景化赋能专项 · 题库（54 题，固定整卷 · 四场考试）
// 命题蓝图：先定能力，再定题型，最后定分值；每卷小计 = 100 分
// examId 归属：A=阶段测一·拆场景  B=阶段测二·出方案  C=阶段测三·讲方案  D=结业综合卷
// 主观题（简答/配置推演/情景应答/大案例）走导师人工评分，examineRule 为评分细则提示
const QUESTIONS_scene = [
  // ====================================================================
  // A 阶段测一 · 拆场景（通过线 70）  单选5×6 + 多选3×8 + 判断2×5 + 简答2×18 = 100
  // ====================================================================
  { id: 'A-01', type: 'single', examId: 'sceneA', category: '四层拓扑', question: '四层拓扑中，下列设备属于处理层的是：', options: ['A. 无线投屏器', 'B. 视频处理器', 'C. 光纤延长器', 'D. 中控面板'], answer: 'B', points: 6, explain: '视频处理器承担信号解析/缩放等处理，属处理层；无线投屏器/光纤延长器属传输层，中控面板属呈现与控制层。' },
  { id: 'A-02', type: 'single', examId: 'sceneA', category: '子系统角色', question: '多数中小型会议室在七个子系统中，结论通常是「不配」的是：', options: ['A. 中控可视化', 'B. 音频', 'C. 分布式', 'D. LED 显示'], answer: 'C', points: 6, explain: '中小型会议室通常没有跨区取信号与多房间共享需求，分布式多为「不配」。' },
  { id: 'A-03', type: 'single', examId: 'sceneA', category: '音频', question: '展厅项目中属于必备基础音频的是：', options: ['A. 分区讲解', 'B. 公共广播', 'C. 专业扩声', 'D. 数字会议'], answer: 'B', points: 6, explain: '展厅必备基础音频是公共广播（含消防与安全广播功能），为法务/安全强制项。' },
  { id: 'A-04', type: 'single', examId: 'sceneA', category: '会议', question: '判断某会议室是否需要无纸化会议系统，最直接的依据是：', options: ['A. 房间面积大小', 'B. 参会人数多少', 'C. 是否会前分发资料、会中同步阅文', 'D. 是否接入视频会议'], answer: 'C', points: 6, explain: '是否无纸化的直接依据是「会不会前分发资料、会中同步阅文」；人数/面积属间接条件。' },
  { id: 'A-05', type: 'single', examId: 'sceneA', category: '场景差异', question: '展厅三类角色中，讲解员最核心的诉求是：', options: ['A. 屏幕亮度足够', 'B. 讲解过程不被设备操作打断', 'C. 内容更新方便', 'D. 设备隐蔽安装'], answer: 'B', points: 6, explain: '讲解员的诉求核心是「讲解过程不被设备操作打断」，因此互动/展示要随手可控。' },
  { id: 'A-06', type: 'multiple', examId: 'sceneA', category: '四层拓扑', question: '下列属于传输层的是：', options: ['A. HDMI 铜缆', 'B. HDBaseT 延长器', 'C. 分布式节点', 'D. 视频处理器', 'E. 光纤'], answer: 'ABCE', points: 8, explain: '传输层负责信号长距离/高质量传输：HDMI 铜缆、HDBaseT 延长器、分布式节点、光纤均属传输层；视频处理器属处理层。' },
  { id: 'A-07', type: 'multiple', examId: 'sceneA', category: '场景差异', question: '展厅相比会议室，需求侧的变化包括：', options: ['A. 内容更新频率高', 'B. 多人同时参观', 'C. 现场长期少人值守', 'D. 设备长时间连续运行', 'E. 必须支持会议表决'], answer: 'ABCD', points: 8, explain: '展厅内容更新频率高、多人同时参观、少人值守、长时间连续运行；「支持会议表决」是会议室而非展厅需求。' },
  { id: 'A-08', type: 'multiple', examId: 'sceneA', category: '勘察', question: '一次合格的现场勘察记录，必须包含：', options: ['A. 房间尺寸与净高', 'B. 供电容量与桥架路由', 'C. 安装面承重与结构条件', 'D. 既有信号源与设备清单', 'E. 客户预算上限'], answer: 'ABCD', points: 8, explain: '勘察记录必然包含尺寸净高、供电与桥架、承重结构、既有信号源清单；客户预算上限不属于现场勘察硬记录项。' },
  { id: 'A-09', type: 'judge', examId: 'sceneA', category: '子系统角色', question: '会议室项目为保证可靠性，应尽量把七个子系统全部配齐。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '错误。七个子系统应回到需求推演，非必要不配，避免过度配置。' },
  { id: 'A-10', type: 'judge', examId: 'sceneA', category: '信发', question: '展厅的信发系统通常属于核心系统，而不是辅助系统。', options: ['正确', '错误'], answer: 'A', points: 5, explain: '正确。展厅内容集中发布与统一更新是核心诉求，信发在展厅升格为核心系统。' },
  { id: 'A-11', type: 'short', manual: true, examId: 'sceneA', category: '需求追问', question: '某 80 平方米会议室，客户只说「要能开集团视频会」。写出你必须追问的三个问题，并说明每个问题分别影响哪个子系统的配置。', points: 18, examineRule: '评分点：是否覆盖「参会规模与席位→会议/显示」「分会场数量与跨区域→分布式」「音质与扩声范围→音频」「是否会前分发资料/投票表决→无纸化」等。每个问题须明确落到子系统。', explain: '示例追问：①参会人数与席位布局？→影响会议系统单元数量、LED 显示尺寸。②是否有多个分会场或跨区域信号共享？→决定是否配分布式。③语音为主要还是需要背景/发言扩声？→决定音频扩声配置。' },
  { id: 'A-12', type: 'short', manual: true, examId: 'sceneA', category: '场景差异', question: '说明为什么把会议室作为主线场景、展厅作为变体。请至少用两个子系统的差异举例。', points: 18, examineRule: '评分点：能讲清两条主线（会议=协同办公、展厅=展示讲解）；至少两个子系统差异，如【信发】会议多为辅助/展厅升核心；【会议/无纸化】会议必备/展厅多为不配；【分布式】会议少见/展厅可能用于跨区信号共享。', explain: '会议室是稳定高频的通用场景（七子系统逻辑清晰），展厅作为变体体现「场景差异承接」。例：信发在展厅升核心、会议在展厅多为不配、分布式取决于是否跨区取信号。' },

  // ====================================================================
  // B 阶段测二 · 出方案（通过线 70）  单选4×6 + 多选2×9 + 判断2×5 + 简答2×14 + 配置推演1×20 = 100
  // ====================================================================
  { id: 'B-01', type: 'single', examId: 'sceneB', category: '音频', question: '会议类扩声系统在听众席的最大声压级不应低于：', options: ['A. 85 dB', 'B. 90 dB', 'C. 98 dB', 'D. 105 dB'], answer: 'C', points: 6, explain: '会议类扩声系统听众席最大声压级不应低于 98 dB（语言清晰度要求）。' },
  { id: 'B-02', type: 'single', examId: 'sceneB', category: '音频', question: '音柱式扬声器每倍增距离，声压级衰减约为：', options: ['A. 3 dB', 'B. 6 dB', 'C. 9 dB', 'D. 12 dB'], answer: 'A', points: 6, explain: '线阵/音柱每倍增距离衰减约 3 dB（面源辐射减半）；点源每倍增衰减 6 dB。' },
  { id: 'B-03', type: 'single', examId: 'sceneB', category: '音频', question: '语言类扩声的功放功率余量系数宜取：', options: ['A. 0.8 至 1.0', 'B. 1.0 至 1.2', 'C. 1.2 至 1.5', 'D. 2.0 至 3.0'], answer: 'C', points: 6, explain: '语言类扩声功放功率余量系数宜取 1.2 至 1.5，保证动态与可靠性。' },
  { id: 'B-04', type: 'single', examId: 'sceneB', category: '会议', question: '有线数字会议系统单路可接的单元数量上限通常为：', options: ['A. 20 个', 'B. 40 个', 'C. 60 个', 'D. 80 个'], answer: 'B', points: 6, explain: '有线数字会议系统单路可接单元数量上限通常为 40 个。' },
  { id: 'B-05', type: 'multiple', examId: 'sceneB', category: 'LED 显示', question: '导致屏体尺寸选小的常见原因有：', options: ['A. 只按房间面积估算', 'B. 忽略最远观看距离', 'C. 忽略净高与安装空间', 'D. 按人均面积反推', 'E. 忽略现场照度'], answer: 'ABCD', points: 9, explain: '按面积估算、忽略最远观看距离、忽略净高安装空间、按人均面积反推都会造成屏体偏小；现场照度影响亮度选择而非尺寸。' },
  { id: 'B-06', type: 'multiple', examId: 'sceneB', category: '播控', question: '展厅多屏同步方案必须交代的内容包括：', options: ['A. 主备关系', 'B. 切换方式', 'C. 同步与校时方式', 'D. 故障降级策略', 'E. 屏体品牌'], answer: 'ABCD', points: 9, explain: '多屏同步须交代主备关系、切换方式、同步与校时方式、故障降级策略；屏体品牌非同步方案本身内容。' },
  { id: 'B-07', type: 'judge', examId: 'sceneB', category: '音频', question: '功放额定功率按音箱额定功率一比一配置即可，不必留余量。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '错误。应留余量（语言类 1.2 至 1.5），避免功放长期满负荷失真或损坏。' },
  { id: 'B-08', type: 'judge', examId: 'sceneB', category: '音频', question: '展厅的分区讲解与公共广播不能共存于同一套网络，必须物理隔离。', options: ['正确', '错误'], answer: 'B', points: 5, explain: '错误。分区讲解与公共广播可以共用同一套网络/处理设备，通过分区路由与优先级管理共存。' },
  { id: 'B-09', type: 'short', manual: true, examId: 'sceneB', category: '削减逻辑', question: '客户提出预算下调 30%。写出你的削减顺序，不少于三条，并说明每条的理由与削减后会损失什么。', points: 14, examineRule: '评分点：是否遵循「先砍非核心/可延后，后砍核心」顺序；每条含理由与损失；至少三条。示例方向：先砍中控可视化→再砍无纸化→再降 LED 尺寸/点距→最后动音频。', explain: '示例：先砍中控可视化（可用场景脚本+面板替代，损失一键场景快捷性）；再砍无纸化（回归纸质，损失无纸化便捷）；再降 LED 点距/尺寸（损失显示精细度）。核心音频与基本会议保留。' },
  { id: 'B-10', type: 'short', manual: true, examId: 'sceneB', category: '分布式', question: '说明「是否需要跨区取信号」这一步为什么常常得出「不配分布式」的结论，并举一个必须配的反例。', points: 14, examineRule: '评分点：能说明多数单房间/就近场景无需跨区→可不配；反例须体现真实跨区信号共享需求（多会议室共享、跨楼层取源等）。', explain: '多数中小型项目信号就近接入，无需跨长距离取源，故不配分布式更经济可靠。反例：总部主控室需同时调度多个分会场画面（多房间跨区域共享信号源），此时必须配分布式实现跨区调度。' },
  { id: 'B-11', type: 'short', manual: true, examId: 'sceneB', category: '综合配置', question: '配置推演：30 平方米小型会议室，8 至 10 人，需要无线投屏，需接入集团视频会议，预算 15 万元。逐个写出七个子系统的结论（配 / 不配 / 可选）并附一句理由。', points: 20, examineRule: '评分点：七系统逐一给结论并附理由；取舍合理。参考：音频配；会议可选；LED 显示配；信发不配；播控不配；中控可选；分布式不配。', explain: '参考结论：音频配（必须扩声）；会议可选（人数少可用外接摄像头+一体式会议终端）；LED 显示配（8-10 人观看）；信发不配（单会议室无内容发布需求）；播控不配；中控可选（预算内可做一键场景）；分布式不配（无跨区需求）。' },

  // ====================================================================
  // C 阶段测三 · 讲方案（通过线 70）  单选3×8 + 多选2×9 + 判断1×6 + 情景应答4×13 = 100
  // ====================================================================
  { id: 'C-01', type: 'single', examId: 'sceneC', category: '讲解结构', question: '10 页讲解稿中，第 2 页应当讲：', options: ['A. 公司介绍与资质', 'B. 客户现状与痛点', 'C. 产品参数对比', 'D. 报价明细'], answer: 'B', points: 8, explain: '第 2 页讲客户现状与痛点，上来就抓住真实需求，而非先讲公司介绍。' },
  { id: 'C-02', type: 'single', examId: 'sceneC', category: '预算表达', question: '预算页的正确做法是：', options: ['A. 只给总价', 'B. 给逐项单价明细', 'C. 给区间并说明边界条件', 'D. 不写价格，现场口头报'], answer: 'C', points: 8, explain: '预算页应给区间并说明边界条件，避免单价承诺与过度具体导致议价被动。' },
  { id: 'C-03', type: 'single', examId: 'sceneC', category: '异议应答', question: '客户提出竞品更便宜时，第一步应当：', options: ['A. 立即降价保住订单', 'B. 强调品牌与案例', 'C. 复述并确认客户的关注点', 'D. 转推更低价位的型号'], answer: 'C', points: 8, explain: '第一步应复述并确认客户关注点，弄清是价格、配置还是服务差异，再针对性回应。' },
  { id: 'C-04', type: 'multiple', examId: 'sceneC', category: '表达控制', question: '讲解超时的常见原因包括：', options: ['A. 逐页念参数', 'B. 功能堆砌、没有主次', 'C. 从未做过计时演练', 'D. 亮点讲得太多', 'E. 客户提问太多'], answer: 'ABCD', points: 9, explain: '逐页念参数、功能堆砌无主次、从未计时演练、亮点讲得太多都会导致超时；客户提问多是正常，不属超时失控主因。' },
  { id: 'C-05', type: 'multiple', examId: 'sceneC', category: '异议应答', question: '一次有效的异议应答应包含：', options: ['A. 复述客户关注点', 'B. 给出可验证的证据', 'C. 给出取舍建议', 'D. 留出追问空间', 'E. 承诺客户提出的一切要求'], answer: 'ABCD', points: 9, explain: '有效异议应答：复述关注点、给可验证证据、给取舍建议、留追问空间；「承诺一切要求」会透支交付风险。' },
  { id: 'C-06', type: 'judge', examId: 'sceneC', category: '需求引导', question: '客户说「要最大最好的屏」，最稳妥的做法是直接按最大尺寸报价。', options: ['正确', '错误'], answer: 'B', points: 6, explain: '错误。应先追问使用场景/观看距离/预算，按需选型，而非直接上最大配置。' },
  { id: 'C-07', type: 'short', manual: true, examId: 'sceneC', category: '异议应答', question: '情景应答：客户说「隔壁报价比你们低 20 万」。请写出三句话应答。', points: 13, examineRule: '评分点：不立刻降价；先确认差异构成；给可验证证据/取舍；留追问空间。例：①确认对方配置与你们方案差在哪里；②说明这 20 万背后差的系统/服务；③给出可验证案例或到现场对比的邀请。', explain: '示例：①「您说的 20 万，我先和您核对一下，他们方案里涵盖了我们系统的哪些部分？」②「这 20 万的差异主要在 X 系统与 Y 服务上，您可以对比双方配置清单。」③「方便的话我们约一场现场看真机/案例，眼见更直观。」' },
  { id: 'C-08', type: 'short', manual: true, examId: 'sceneC', category: '需求引导', question: '情景应答：客户说「我们要最大最好的屏」。请写出你的追问与回应。', points: 13, examineRule: '评分点：不直接上最大配置；追问观看距离/使用场景/预算；按需给多个可选项并说明取舍。', explain: '示例：①「想请教下这块屏主要用在什么场景、最远观看距离大概多少？」②「这个距离和场景下，XX 点距的屏显示效果就很好，过大反而浪费。」③「给您三个价位方案对比，越大越精细越贵，我建议选性价比最优的。」' },
  { id: 'C-09', type: 'short', manual: true, examId: 'sceneC', category: '取舍说明', question: '情景应答：评委问「这个方案里最贵的是哪一项，为什么值这个钱？」', points: 13, examineRule: '评分点：能指出最贵项并给出价值论证（可靠性/功能/长期成本），而非含糊其辞。', explain: '示例：最贵的是主控系统（如多层分布式/高性能处理器）。它决定了整场的稳定与扩展性，关系到会议不中断、故障可降级，长期看省下的维护与停机成本远超差价。' },
  { id: 'C-10', type: 'short', manual: true, examId: 'sceneC', category: '削减逻辑', question: '情景应答：评委问「预算砍 30%，你先砍哪个？」', points: 13, examineRule: '评分点：遵循先砍非核心后砍核心的顺序，并说明每条损失。', explain: '示例：先砍中控可视化（可用脚本+面板替代）；再砍无纸化（回归纸质）；再降 LED 点距或尺寸（损失显示精细度）。核心音频与基本会议不可动，因为直接影响会议能否开起来。' },

  // ====================================================================
  // D 结业综合卷（通过线 75）  单选12×2.5 + 多选4×5 + 判断4×2.5 + 大案例1×40 = 100
  // ====================================================================
  { id: 'D-01', type: 'single', examId: 'sceneD', category: '会议室架构', question: '「1 平台加 N 系统」中的 N，不包括下列哪一项：', options: ['A. 无纸化会议', 'B. 会议预约', 'C. 大屏拼接', 'D. 消防报警'], answer: 'D', points: 2.5, explain: '消防报警属安防/楼宇子系统，不归入会议类平台下的 N 系统。' },
  { id: 'D-02', type: 'single', examId: 'sceneD', category: '展厅馆型', question: '展厅八类馆中，以城市与项目规划成果展示为主的是：', options: ['A. 企业馆', 'B. 规划馆', 'C. 主题馆', 'D. 纪念馆'], answer: 'B', points: 2.5, explain: '规划馆以城市与项目规划成果展示为主。' },
  { id: 'D-03', type: 'single', examId: 'sceneD', category: 'LED 显示', question: '会议室屏体点间距的选择，主要取决于：', options: ['A. 房间面积', 'B. 参会人数', 'C. 最远观看距离', 'D. 预算上限'], answer: 'C', points: 2.5, explain: '点间距主要取决于最远观看距离，保证最近处无颗粒感、最远处清晰可辨。' },
  { id: 'D-04', type: 'single', examId: 'sceneD', category: '音频', question: '展厅公共广播的首要功能是：', options: ['A. 背景音乐', 'B. 消防与安全广播', 'C. 讲解扩声', 'D. 展项音效'], answer: 'B', points: 2.5, explain: '公共广播首要功能是消防与安全广播，属强制/安全项。' },
  { id: 'D-05', type: 'single', examId: 'sceneD', category: '音频', question: '分区讲解系统的扬声器布点间距一般为：', options: ['A. 2 至 4 米', 'B. 5 至 9 米', 'C. 10 至 15 米', 'D. 15 至 20 米'], answer: 'B', points: 2.5, explain: '分区讲解扬声器布点间距一般为 5 至 9 米，保证覆盖与清晰度。' },
  { id: 'D-06', type: 'single', examId: 'sceneD', category: '音频', question: '分区讲解系统的信号延时一般要求小于：', options: ['A. 1 ms', 'B. 10 ms', 'C. 50 ms', 'D. 100 ms'], answer: 'B', points: 2.5, explain: '分区讲解信号延时一般要求小于 10 ms，避免听感可感知的时间差。' },
  { id: 'D-07', type: 'single', examId: 'sceneD', category: '音频', question: '无线话筒天线安装时，两天线间距不应小于：', options: ['A. 0.5 米', 'B. 1 米', 'C. 2.5 米', 'D. 5 米'], answer: 'C', points: 2.5, explain: '两天线间距不应小于 2.5 米，避免同频干扰与分集接收失效。' },
  { id: 'D-08', type: 'single', examId: 'sceneD', category: '音频', question: '音频系统的常规采样率为：', options: ['A. 16 kHz', 'B. 32 kHz', 'C. 44.1 kHz', 'D. 48 kHz'], answer: 'D', points: 2.5, explain: '专业音频系统常规采样率为 48 kHz。' },
  { id: 'D-09', type: 'single', examId: 'sceneD', category: '中控', question: '中控系统在会议室的核心价值是：', options: ['A. 提升音质', 'B. 降低操作门槛、一键切换场景', 'C. 提高分辨率', 'D. 减少布线长度'], answer: 'B', points: 2.5, explain: '中控核心价值是降低操作门槛、一键切换预设场景。' },
  { id: 'D-10', type: 'single', examId: 'sceneD', category: '分布式', question: '分布式系统在展厅承担的主要作用是：', options: ['A. 提升亮度', 'B. 跨区域信号调度与共享', 'C. 内容制作', 'D. 语音识别'], answer: 'B', points: 2.5, explain: '分布式系统在展厅承担跨区域信号调度与共享。' },
  { id: 'D-11', type: 'single', examId: 'sceneD', category: '信发', question: '展厅信发系统解决的核心问题是：', options: ['A. 屏幕亮度', 'B. 内容集中发布与统一更新', 'C. 声音覆盖', 'D. 设备散热'], answer: 'B', points: 2.5, explain: '信发解决内容集中发布与统一更新。' },
  { id: 'D-12', type: 'single', examId: 'sceneD', category: '方案流程', question: '参观动线的确定，应当发生在：', options: ['A. 方案设计之前', 'B. 设备选型之后', 'C. 报价之后', 'D. 施工阶段'], answer: 'A', points: 2.5, explain: '参观动线应先于方案设计确定，动线决定系统布局与内容节奏。' },
  { id: 'D-13', type: 'multiple', examId: 'sceneD', category: '场景差异', question: '展厅相比会议室，通常升格为核心或主干的子系统有：', options: ['A. 信发', 'B. 播控', 'C. 会议', 'D. 分布式', 'E. 无纸化'], answer: 'ABD', points: 5, explain: '展厅中信发、播控、分布式常升格为核心/主干；会议与无纸化多为不配。' },
  { id: 'D-14', type: 'multiple', examId: 'sceneD', category: '子系统角色', question: '会议室中通常属于标配的子系统有：', options: ['A. 音频', 'B. 会议', 'C. LED 显示', 'D. 中控可视化', 'E. 分布式'], answer: 'ABCD', points: 5, explain: '会议室标配：音频、会议、LED 显示、中控可视化；分布式多为不配。' },
  { id: 'D-15', type: 'multiple', examId: 'sceneD', category: '方案交付', question: '一份可交付的方案包必须包含：', options: ['A. 系统拓扑图', 'B. 配置清单', 'C. 10 页讲解稿', 'D. 施工组织方案', 'E. 三年运维报价'], answer: 'ABC', points: 5, explain: '可交付方案包至少含系统拓扑图、配置清单、10 页讲解稿；施工组织与运维报价属项目实施阶段内容。' },
  { id: 'D-16', type: 'multiple', examId: 'sceneD', category: '考核标准', question: '下列情形中，应直接判为答辩不通过的有：', options: ['A. 漏项超过 5%', 'B. 带载或功率算错', 'C. 承诺产品不具备的功能', 'D. 违反强制标准', 'E. 竞品对标不实'], answer: 'ABCDE', points: 5, explain: '漏项超 5%、带载/功率算错、承诺不存在功能、违反强制标准、竞品对标不实，五项任一即判不通过。' },
  { id: 'D-17', type: 'judge', examId: 'sceneD', category: '会议', question: '展厅项目一定要配数字会议系统。', options: ['正确', '错误'], answer: 'B', points: 2.5, explain: '错误。展厅多为展示讲解，数字会议系统通常不是必配。' },
  { id: 'D-18', type: 'judge', examId: 'sceneD', category: '四层拓扑', question: '拓扑图上同一台设备可以同时出现在两层，只要标注清楚即可。', options: ['正确', '错误'], answer: 'B', points: 2.5, explain: '错误。每台设备应只在四层拓扑的一层出现，避免跨层悬挂与口径混乱。' },
  { id: 'D-19', type: 'judge', examId: 'sceneD', category: '方案交付', question: '配置清单的数量必须能与拓扑图逐项核对出来。', options: ['正确', '错误'], answer: 'A', points: 2.5, explain: '正确。清单数量须与拓扑图逐项对应，保证可核对。' },
  { id: 'D-20', type: 'judge', examId: 'sceneD', category: '预算表达', question: '预算页可以直接给出单台设备单价。', options: ['正确', '错误'], answer: 'B', points: 2.5, explain: '错误。预算页应给区间并说明边界条件，不直接给单价，避免议价被动。' },
  { id: 'D-21', type: 'short', manual: true, examId: 'sceneD', category: '综合配置', question: '大案例：120 平方米会议室（40 人、接入集团视频会议、需分组讨论）加 200 平方米企业展厅（两个展区、有讲解员带队、季度更新内容、夜间无人值守）。要求：列出两场景七个子系统结论；描述四层拓扑；写三个子系统差异；列出三个可能被追问的问题及应答。', points: 40, examineRule: '评分点：两场景七系统结论完整且取舍合理；四层拓扑清晰；至少三个子系统差异；三个追问应答体现接得住。', explain: '方向提示：会议室音频/会议/LED/中控多为配，分布式取决于是否跨区；展厅信发/播控/分布式多为核心，会议多为不配。四层拓扑=源/处理/传输/呈现与控制。' },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QUESTIONS_scene;
}