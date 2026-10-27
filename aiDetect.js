// aiDetect.js — 本地多维 AI 倾向检测器
// 说明：无外部依赖、零成本、结果可解释。给出 0-100 的「AI 写作倾向分」+命中特征，
// 分三档（低/中/高）。定位为「导师参考信号」而非定罪证据，最终由导师结合原文与
// 命中证据人工判断。所有命中点都会回传给评分页展示，保证「为什么判高分」可解释。
//
// 特征说明：AI 生成的中文简答普遍具备——①大量总分/列举连接词（首先/其次/综上）
// ②过度规整的枚举分点（；/1.）。③高频书面套话词（提升/优化/赋能/有效）。④缺少
// 口语化表达（我觉得/说白了/比如）。⑤句长高度均匀、像机器排版。⑥Markdown 排版残留。

// 总分结构 / 列举连接词
const STRUCT_WORDS = [
  '首先','其次','再次','然后','最后','第一','第二','第三','第四','一方面','另一方面',
  '综上','综上所述','总的来看','总体来说','总而言之','因此','此外','所以说','也就是',
  '换言之','更重要的是','同时','整体来看','可以看出','面向','围绕','针对','对于','关于'
];
// 高频书面套话 / AI 易用词
const FORMAL_WORDS = [
  '提升','优化','加强','强化','改进','优化','确保','充分','有效','合理','系统','整体',
  '全面','高效','便捷','多样化','满足需求','用户体验','赋能','联动','协同','规范','完善',
  '保障','切实','实现','促进','体现了','具备','重要','关键','核心','主要','具有','结合',
  '根据','按照','达到','增强','显著','从而','进而','有助于','有利于','旨在','目标'
];
// 口语化 / AI 少用的表达（出现则降低倾向分）
const COLLOQUIAL_WORDS = [
  '我觉得','我认为','说白了','举个例子','比如说','比如','嗯','吧','反正','感觉','其实',
  '咱','咱们','这玩意','没啥','挺','大概','听说','讲真','换句话说其实','我们一般','客户现场'
];

const LIST_PATTERN = /(；|^\s*\d+[\.、．)\s]|\d+[\.、．）]\s|（\d+）|\(\d+\)|[①-⑩])/gm;
const MARKDOWN_PATTERN = /(###|\*{1,2}|^[-*]\s|^#{1,3}\s)/m;

function matchCount(text, arr) {
  const set = arr.slice().sort((a, b) => b.length - a.length); // 长词优先
  let count = 0;
  for (const w of set) {
    if (w.length === 0) continue;
    let i = text.indexOf(w);
    while (i !== -1) {
      count++;
      i = text.indexOf(w, i + Math.max(1, w.length));
    }
  }
  return count;
}

function levelOf(score) {
  if (score >= 65) return '高';
  if (score >= 40) return '中';
  return '低';
}

/**
 * 单题检测
 * @param {string} text 学员简答原文
 * @returns {{score:number, level:string, hits:string[], short?:boolean, len?:number}}
 */
function detectAi(text) {
  const raw = text == null ? '' : String(text);
  const t = raw.trim();
  const len = t.length;

  if (len < 20) {
    // 内容过短，倾向判定置信度低，不给高分也不扣分，提示导师人工看
    return { score: 15, level: '低', hits: [`内容过短（${len}字），AI 倾向无法可靠判定`], short: true, len };
  }

  const hits = [];
  let score = 0;

  // 1) 结构连接词密度
  const structCount = matchCount(t, STRUCT_WORDS);
  if (structCount >= 4) { score += 20; hits.push(`出现 ${structCount} 处总分/列举连接词（首先/其次/综上类），结构感强`); }
  else if (structCount >= 2) { score += 12; hits.push(`出现 ${structCount} 处结构连接词`); }

  // 2) 规整枚举 / 分号列表
  const listMatches = t.match(LIST_PATTERN) || [];
  const listCount = listMatches.length;
  if (listCount >= 5) { score += 16; hits.push(`高度规整地分成 ${listCount} 个枚举点（分号/编号），排版感强`); }
  else if (listCount >= 3) { score += 10; hits.push(`出现 ${listCount} 处枚举/分号分点`); }

  // 3) AI 高频书面套话词
  const formalCount = matchCount(t, FORMAL_WORDS);
  if (formalCount >= 6) { score += 16; hits.push(`${formalCount} 处书面套话/高频词（提升/优化/有效/系统类）`); }
  else if (formalCount >= 3) { score += 9; hits.push(`含 ${formalCount} 处书面套话词`); }

  // 4) 口语化表达（反向信号）
  const collCount = matchCount(t, COLLOQUIAL_WORDS);
  if (collCount === 0 && len >= 60) { score += 8; hits.push('全文几乎无口语化表达（如“我觉得/大概/反正”），行文偏正式'); }
  else if (collCount >= 1) { score -= 12; hits.push(`含 ${collCount} 处口语表达（更接近真人作答）`); }

  // 5) 句长均匀度：AI 常输出长度相近的整齐段落，真人稿参差
  const segs = t.split(/[。！？；!?；\n]/).map(s => s.length).filter(n => n > 0);
  if (segs.length >= 3) {
    const mean = segs.reduce((a, b) => a + b, 0) / segs.length;
    const variance = segs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / segs.length;
    const cv = Math.sqrt(variance) / mean; // 变异系数
    if (cv < 0.3) { score += 10; hits.push('各句长度高度均匀（变异系数小），像统一模板输出'); }
    else if (cv > 0.8) { score -= 5; hits.push('各句长短参差明显，更接近真人手写'); }
  }

  // 6) Markdown 排版残留（AI 粘贴常见）
  if (MARKDOWN_PATTERN.test(t)) { score += 8; hits.push('检测到 Markdown 排版残留（如 # / ** / 列表符）'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, level: levelOf(score), hits, len };
}

/**
 * 一份答卷（多题简答）聚合检测
 * @param {Array<{id,question,points,manual}>} shortQuestions
 * @param {Record<string,string>} answers
 * @returns {{score:number, level:string, summary:string, perQuestion:Object}}
 */
function detectRecord(shortQuestions, answers) {
  const perQuestion = {};
  let weightedScore = 0, weightSum = 0, maxScore = 0, any = false;

  for (const q of shortQuestions) {
    const ans = (answers || {})[q.id] || '';
    const r = detectAi(ans);
    perQuestion[q.id] = { ...r, question: q.question, maxPoints: q.points || q.maxScore || 10 };
    const w = Math.max(0, r.short ? 0.5 : (q.points || 10)); // 短答降权
    weightedScore += r.score * w;
    weightSum += w;
    maxScore = Math.max(maxScore, r.score);
    any = true;
  }
  if (!any || weightSum === 0) return { score: 0, level: '低', summary: '本文卷无简答题可检测', perQuestion: {} };

  const score = Math.round(weightedScore / weightSum);
  // 采用「加权平均 + 任一题命中高风险则抬升」的保守融合，避免漏报高倾向单题
  const finalScore = Math.min(100, Math.max(score, maxScore > 65 ? Math.round((score + maxScore) / 2) : score));
  const level = levelOf(finalScore);
  return { score: finalScore, level, summary: `综合 AI 倾向 ${finalScore} 分（${level}），供导师参考`, perQuestion };
}

module.exports = { detectAi, detectRecord, levelOf };