// aiDetect.js — 本地多维 AI 倾向检测器 v2（2026-10 重构）
//
// 设计原则（相比 v1 的改进）：
//  1) 分四层信号，不再简单加减：
//     A 硬证据  — 只可能来自「从 AI 对话框复制粘贴」的机器排版（HTML标签/Markdown表格/
//                 ##标题/---/OSS链接）。真人在网页答题框手打极难出现。
//     B 强信号  — AI 高发的结构化写作习惯（术语对照表、键值对排版、箭头流程、公式罗列、
//                 中文编号分点、单位标注密集、总分总闭环、论文式长篇、高级书面连接词）。
//     C 中度信号— 结构连接词、规整枚举、书面套话、句长均匀、连续长句。
//     D 真人信号— 明确的口语/语气词/流水账表达（负分，但硬证据面前不降档）。
//  2) 硬证据命中即进入高分区（≥78），不被口语词拉回低分（修复 v1 漏报）。
//  3) 多个强信号「共振」额外加成：单个强信号可能是巧合，≥2 个同时出现几乎必然是 AI。
//  4) 聚合改为 max(加权平均, 单题最高×0.85)，一份卷子只要一题明显 AI 就能提示导师。
//
// 定位：导师参考信号，不是定罪证据。所有命中点回传前端展示，保证可解释。

'use strict';

// ============ A 类：硬证据（机器排版形态） ============
const HARD_RULES = [
  { re: /<\s*br\s*\/?\s*>/i, label: '含 HTML 换行标签 <br>' },
  { re: /<\s*\/?\s*(table|thead|tbody|tr|td|th|div|span|p|ul|ol|li|b|strong|font|hr)\b[^>]*>/i, label: '含 HTML 表格/排版标签（<td>/<tr>/<div> 等）' },
  { re: /&(nbsp|amp|lt|gt|quot|emsp);/i, label: '含 HTML 实体转义（&nbsp; 等）' },
  { re: /^\s*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)+\|?\s*$/m, label: '含 Markdown 表格分隔行（|---|）' },
  { re: /^\s*\|[^\n|]*\|[^\n|]*\|[ \t]*$/m, label: '含 Markdown 表格行（| 参数 | 说明 |）' },
  { re: /^[ \t]*#{1,6}[ \t]+\S/m, label: '含 Markdown 标题（# / ## / ###）' },
  { re: /\*\*[^*\n]{1,40}\*\*/, label: '含 Markdown 加粗（**文字**）' },
  { re: /^[ \t]*([-*_])[ \t]*\1[ \t]*\1[ \t]*$/m, label: '含 Markdown 分隔线（---）' },
  { re: /!?\[[^\]\n]{0,60}\]\([^)\n]{0,200}\)/, label: '含 Markdown 图片/链接语法（![](...)）' },
  { re: /https?:\/\/[^\s"'）)]+/, label: '含外部链接 URL' },
  { re: /OSSAccessKeyId|Signature=|oss-cn-/i, label: '含 OSS 图片签名链接残留' },
];
const MD_LIST_RE = /^[ \t]*[-*+][ \t]+\S/gm;          // 无序列表行
const MD_TABLE_ROW_RE = /^[ \t]*\|.*\|[ \t]*$/gm;      // 表格行

// ============ 信号正则 ============
const CN_LIST_RE = /^[ \t]*[一二三四五六七八九十]{1,3}[、.．][ \t]*\S/gm;   // 中文编号分点
const KV_LINE_RE = /^[ \t]*[^\n：:]{2,20}[：:][^\n]{5,}$/gm;                // 「参数：说明」多行键值对
const EN_TERM_RE = /[（(][ \t]*[A-Za-z][A-Za-z0-9 \t&\/\-]{2,30}[ \t]*[）)]/g; // 中文（English）
const ARROW_RE = /→|⇒|->|=>/g;                                              // 箭头流程
const EQUATION_RE = /[^\n。；，]{2,24}[=＝][^\n。；，]{1,24}/g;              // A = B 公式罗列
const RANGE_UNIT_RE = /\d+\s*[~～\-—至]\s*\d+\s*(cd\/m|Hz|bit|mm|nit|万|%|流明|lux|lm)/gi;
const UNIT_ANNOT_RE = /(单位|表示为|即)\s*[A-Za-z²³%/][A-Za-z0-9²³%\/\.]{0,12}/g;  // 单位标注
const LEADIN_RE = /如下[：:]|以下(是|为)|主要\s*\d+\s*步|每步|一句话(逻辑|总结|概括|说明)|综上|总而言之|概括(来|为)|分为以下|包括以下|要点如下|具体如下/g;
const TOTAL_CLOSE_RE = /(首先|第一|其一)[\s\S]{15,}(其次|第二|其二|此外|同时)[\s\S]{15,}(综上所述|综上|总而言之|总的来说|因此|由此可见)/;
const LIST_PATTERN = /(；|^\s*\d+[\.、．)]\s|\d+[\.、．）]\s|（\d+）|\(\d+\)|[①-⑩])/gm;

// ============ 词库 ============
// 术语对照表表头（AI 爱用「参数 | 说明 | 定义 | 单位」这类表格）
const TERM_HEADERS = [
  '定义', '单位', '表示方法', '表示形式', '计算公式', '计算方式', '典型范围', '常见规格',
  '人眼感知', '参数', '说明', '需确认', '关键信息', '做什么', '步骤', '含义', '意义',
  '备注', '优势', '劣势', '适用场景', '注意事项', '实现方式', '技术原理'
];
// 专业领域术语（用于判断「论文式长篇」的术语密度）
const DOMAIN_TERMS = [
  '点间距', '像素', '分辨率', '刷新率', '亮度', '灰度', '对比度', '色域', '可视角度',
  '扫描', '带载', '接收卡', '发送卡', '模组', '网口', '带宽', '配电', '功耗', '驱动',
  '箱体', '电源', '灯珠', '屏体', '信号', '接口', '级联', '色温', '像素密度', '扫描线'
];
// 总分/列举连接词（精简，去掉过于通用的词）
const STRUCT_WORDS = [
  '首先', '其次', '再次', '最后', '第一', '第二', '第三', '第四', '其一', '其二',
  '一方面', '另一方面', '综上所述', '综上', '总而言之', '总的来说', '此外', '因此',
  '由此可见', '不难看出'
];
// 高级书面连接/评价词（AI 论文式行文高发）
const ADV_CONNECTIVE = [
  '进而', '从而', '因此', '然而', '由此', '显著', '体现了', '共同决定', '直接决定',
  '直接影响', '密切相关', '有效避免', '合理选型', '确保', '基于此', '值得注意'
];
// 书面套话（保留 AI 味重的，剔除真人也常用的泛词）
const FORMAL_WORDS = [
  '提升', '优化', '加强', '强化', '确保', '充分', '有效', '合理', '系统性', '整体性',
  '全面', '高效', '便捷', '多样化', '赋能', '协同', '规范', '完善', '保障', '切实',
  '促进', '体现了', '显著', '从而', '进而', '有助于', '有利于', '旨在', '用户体验',
  '闭环', '复盘', '迭代', '落地', '抓手', '维度', '层面', '生态', '链路', '痛点', '标杆'
];
// 真人口语（严格白名单：剔除「感觉/比如/大概/其实」等术语文本也会用的词）
const HUMAN_WORDS = [
  '我觉得', '我认为', '我感觉', '说白了', '反正', '咱们', '咱', '咋', '啥', '这玩意',
  '没啥', '讲真', '差不多', '我平时', '我们平时', '我们一般', '平时', '一般就',
  '一般都是', '大概就', '好像是', '应该是吧', '凑合', '搞不定', '弄了', '整了'
];
const TAIL_PARTICLE_RE = /[吧啊哦呗嘛](?=[。，！？；、\s]|$)/g;

// ============ 工具函数 ============
function countMatches(text, re) {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const r = new RegExp(re.source, flags);
  return (text.match(r) || []).length;
}
function countDistinctWords(text, arr) {
  let n = 0;
  for (const w of arr) if (w && text.includes(w)) n++;
  return n;
}
// 统计词组出现总次数（长词优先，避免短词重复计入长词内部）
function countWordOccurrences(text, arr) {
  const set = arr.slice().sort((a, b) => b.length - a.length);
  let count = 0;
  for (const w of set) {
    if (!w) continue;
    let i = text.indexOf(w);
    while (i !== -1) { count++; i = text.indexOf(w, i + w.length); }
  }
  return count;
}
function sentenceLens(text) {
  return text.split(/[。！？；!?；\n]/).map(s => s.trim().length).filter(n => n > 0);
}

function levelOf(score) {
  if (score >= 62) return '高';
  if (score >= 36) return '中';
  return '低';
}

/**
 * 单题检测
 * @param {string} text 学员简答原文
 * @returns {{score:number, level:string, hits:string[], short?:boolean, len:number, hardCount:number}}
 */
function detectAi(text) {
  const t = (text == null ? '' : String(text)).trim();
  const len = t.length;

  if (len < 20) {
    return {
      score: 12, level: '低', short: true, len, hardCount: 0,
      hits: [`内容过短（${len}字），AI 倾向无法可靠判定，建议导师直接看原文`]
    };
  }

  const hard = [], strong = [], medium = [], human = [];

  // ---------- A 硬证据 ----------
  for (const r of HARD_RULES) if (r.re.test(t)) hard.push(r.label);
  const listLines = countMatches(t, MD_LIST_RE);
  if (listLines >= 3) hard.push(`含 ${listLines} 行 Markdown 无序列表（- 项）`);
  const tableRows = countMatches(t, MD_TABLE_ROW_RE);
  if (tableRows >= 2 && !hard.some(x => x.includes('表格'))) hard.push(`含 ${tableRows} 行 Markdown 表格`);

  // ---------- 统计量 ----------
  const segs = sentenceLens(t);
  const avgLen = segs.length ? segs.reduce((a, b) => a + b, 0) / segs.length : len;
  const humanWords = countWordOccurrences(t, HUMAN_WORDS);
  const particles = countMatches(t, TAIL_PARTICLE_RE);
  const humanHits = (humanWords > 0 ? 1 : 0) + (particles > 0 ? 1 : 0);

  // ---------- B 强信号 ----------
  const termDistinct = countDistinctWords(t, TERM_HEADERS);
  if (termDistinct >= 4) strong.push(`出现 ${termDistinct} 个术语对照表表头词（定义/单位/表示方法/典型范围等），呈参数表结构`);

  const enTerms = countMatches(t, EN_TERM_RE);
  if (enTerms >= 3) strong.push(`出现 ${enTerms} 处「中文（English）」术语英文对照，答题时逐项注英文很少见`);

  const arrows = countMatches(t, ARROW_RE);
  if (arrows >= 2) strong.push(`出现 ${arrows} 个箭头流程符号（→），像整理的流程图而不是口述`);

  const eqs = countMatches(t, EQUATION_RE);
  if (eqs >= 3) strong.push(`出现 ${eqs} 处「A = B」公式化罗列`);

  const ranges = countMatches(t, RANGE_UNIT_RE);
  if (ranges >= 2) strong.push(`出现 ${ranges} 处「数值区间+单位」精确罗列`);

  const units = countMatches(t, UNIT_ANNOT_RE);
  if (units >= 3) strong.push(`出现 ${units} 处单位标注（单位mm / 单位Hz 等），呈参数手册写法`);

  const cnList = countMatches(t, CN_LIST_RE);
  if (cnList >= 3) strong.push(`用中文编号分成 ${cnList} 条（一、二、三、），排版高度规整`);

  const kvLines = countMatches(t, KV_LINE_RE);
  if (kvLines >= 4) strong.push(`含 ${kvLines} 行统一「参数：说明」键值对排版`);

  // 结构连接词密集（真人很少连续 4 个总分连接词）
  const structCount = countWordOccurrences(t, STRUCT_WORDS);
  if (structCount >= 4) strong.push(`出现 ${structCount} 处总分/列举连接词（首先/其次/此外类），呈总分总结构`);

  const leadins = countMatches(t, LEADIN_RE);
  if (leadins >= 1) strong.push(`含 AI 腔引导语/总结句（${leadins} 处，如「如下」「主要N步」「一句话逻辑」）`);

  if (TOTAL_CLOSE_RE.test(t)) strong.push('呈「首先…其次…综上所述」完整总分总闭环结构');

  // 论文式长篇：长文 + 零口语 + 高术语密度 + 长句
  const domainTerms = countDistinctWords(t, DOMAIN_TERMS);
  const isLongForm = len >= 150 && humanHits === 0 && domainTerms >= 6 && avgLen >= 30;
  if (isLongForm) strong.push(`论文式长篇作答（${len}字、${domainTerms}个专业术语、平均句长${Math.round(avgLen)}字、全程无口语）`);

  const advConn = countWordOccurrences(t, ADV_CONNECTIVE);
  if (advConn >= 5) strong.push(`出现 ${advConn} 处高级书面连接/评价词（进而/从而/显著/体现了类）`);

  // ---------- C 中度信号 ----------
  if (structCount >= 3 && structCount < 4) medium.push(`出现 ${structCount} 处总分/列举连接词`);

  const listCount = countMatches(t, LIST_PATTERN);
  if (listCount >= 5) medium.push(`高度规整地分成 ${listCount} 个枚举点（分号/编号）`);

  const formalCount = countWordOccurrences(t, FORMAL_WORDS);
  if (formalCount >= 6) medium.push(`含 ${formalCount} 处职场书面套话（赋能/闭环/落地类）`);

  if (segs.length >= 4) {
    const mean = segs.reduce((a, b) => a + b, 0) / segs.length;
    const variance = segs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / segs.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    if (cv < 0.25) medium.push('各句长度高度均匀，像统一模板批量输出');
    if (!isLongForm && avgLen >= 35) medium.push(`平均句长 ${Math.round(avgLen)} 字，连续复合长句（手写答题少见）`);
  }

  // ---------- D 真人信号 ----------
  if (humanWords > 0) human.push(`含 ${humanWords} 处明确口语表达（我觉得/说白了/差不多类）`);
  if (particles > 0) human.push(`含 ${particles} 处句末语气词（吧/啊/哦）`);

  // ---------- 合成打分 ----------
  let score;
  if (hard.length > 0) {
    // 硬证据：直接进入高分区；负分仅象征性抵扣，避免被口语词拉回低分
    score = 78 + Math.min(14, (hard.length - 1) * 7) + Math.min(8, strong.length * 4);
    score -= Math.min(6, human.length * 2);
  } else {
    // 强信号共振加成：≥2 个同时出现几乎必然是 AI
    let bonus = 0;
    if (strong.length >= 4) bonus = 24;
    else if (strong.length >= 3) bonus = 16;
    else if (strong.length >= 2) bonus = 8;

    const longFormBonus = (len >= 150 && humanHits === 0) ? 10 : 0;

    score = strong.length * 20 + bonus + medium.length * 8 + longFormBonus - human.length * 14;
    score = Math.min(score, 78); // 无硬证据封顶，抑制误报
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const hits = [
    ...hard.map(x => `【硬证据】${x}`),
    ...strong.map(x => `【强】${x}`),
    ...medium.map(x => `【中】${x}`),
    ...human.map(x => `【真人特征】${x}`)
  ];
  if (hits.length === 0) hits.push('未发现明显 AI 特征');

  return { score, level: levelOf(score), hits, len, hardCount: hard.length };
}

/**
 * 一份答卷（多题简答）聚合检测
 * @param {Array<{id,question,points,manual}>} shortQuestions
 * @param {Record<string,string>} answers
 * @returns {{score:number, level:string, summary:string, perQuestion:Object, hardCount:number}}
 */
function detectRecord(shortQuestions, answers) {
  const perQuestion = {};
  let weightedScore = 0, weightSum = 0, maxScore = 0, any = false, hardCount = 0;

  for (const q of shortQuestions) {
    const ans = (answers || {})[q.id] || '';
    // 未作答的题目不参与聚合，避免空答案稀释整卷 AI 倾向
    if (!String(ans).trim()) continue;
    const r = detectAi(ans);
    perQuestion[q.id] = { ...r, question: q.question, maxPoints: q.points || q.maxScore || 10 };
    const w = Math.max(0.5, r.short ? 0.5 : (q.points || 10));
    weightedScore += r.score * w;
    weightSum += w;
    if (r.score > maxScore) maxScore = r.score;
    hardCount += r.hardCount || 0;
    any = true;
  }
  if (!any || weightSum === 0) {
    return { score: 0, level: '低', summary: '本文卷无简答题可检测', perQuestion: {}, hardCount: 0 };
  }

  const avg = Math.round(weightedScore / weightSum);
  // 只要有一题明显 AI，就抬升整卷提示（导师重点看那一题）
  const finalScore = Math.min(100, Math.max(avg, Math.round(maxScore * 0.85)));
  const level = levelOf(finalScore);
  const summary = hardCount > 0
    ? `综合 AI 倾向 ${finalScore} 分（${level}），检出 ${hardCount} 处机器排版硬证据，建议重点核查`
    : `综合 AI 倾向 ${finalScore} 分（${level}），供导师参考`;

  return { score: finalScore, level, summary, perQuestion, hardCount };
}

module.exports = { detectAi, detectRecord, levelOf };
