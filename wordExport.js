// ===== 题库 Word 导出模块（纯只读生成，不读写任何持久化数据） =====
// 设计目标：把某一场考试的题库导出为 Word（.docx），供线下打印做题/考核使用。
//
// 兼容说明（重要）：
//   现有题库由多批导入产生，字段风格不统一，本模块做了统一归一化处理——
//   1) 答案格式 4 种：单选 "A"；多选 ["A","B"] 或 "ABC"；判断 true/false 或 "A"/"B"；简答 要点串或仅 keywords
//   2) 解析字段 2 种：explanation（新人/培训题库）与 explain（技术/销售/客户端题库）
//   3) 选项前缀 2 种：部分题库选项自带 "A. " 前缀，部分不带（不能重复加前缀）
//   4) 分值：部分题库无 points 字段（不显示分值，不臆造）

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak,
  Footer, PageNumber, convertMillimetersToTwip
} = require('docx');

const FONT_BODY = { ascii: 'Times New Roman', eastAsia: '宋体', hAnsi: '宋体', hint: 'eastAsia' };
const FONT_HEAD = { ascii: 'Arial', eastAsia: '黑体', hAnsi: '黑体', hint: 'eastAsia' };

const TYPE_LABELS = { single: '单选题', multiple: '多选题', judge: '判断题', short: '简答题' };
const TYPE_ORDER = ['single', 'multiple', 'judge', 'short'];
const CN_NUM = ['一', '二', '三', '四', '五', '六'];

function letterOf(i) { return String.fromCharCode(65 + i); }

function normType(q) {
  const t = q && q.type;
  return TYPE_LABELS[t] ? t : 'single';
}

// 选项是否已自带字母前缀（同一题内风格一致，无混用；已全量校验）
function hasOwnPrefix(options) {
  if (!Array.isArray(options) || options.length === 0) return false;
  return options.every(o => /^\s*[A-H]\s*[.、．)）]/.test(String(o == null ? '' : o)));
}

function optionLines(q) {
  const ops = Array.isArray(q.options)
    ? q.options.map(o => String(o == null ? '' : o).trim()).filter(Boolean)
    : [];
  if (ops.length === 0) return [];
  if (hasOwnPrefix(ops)) return ops;
  return ops.map((o, i) => letterOf(i) + '. ' + o);
}

// 答案归一化为可打印文本
function normalizeAnswer(q) {
  const t = normType(q);
  const a = q.answer;

  if (t === 'judge') {
    if (a === true || a === 1) return '正确';
    if (a === false || a === 0) return '错误';
    const s = String(a == null ? '' : a).trim();
    if (!s) return '';
    if (/^(A|T|Y|对|正确|是|√|TRUE)$/i.test(s)) return '正确';
    if (/^(B|F|N|错|错误|否|×|FALSE)$/i.test(s)) return '错误';
    return s;
  }

  if (t === 'multiple') {
    let letters = [];
    if (Array.isArray(a)) {
      letters = a.map(x => String(x == null ? '' : x).trim().toUpperCase());
    } else {
      letters = (String(a == null ? '' : a).toUpperCase().match(/[A-H]/g) || []);
    }
    letters = [...new Set(letters.filter(Boolean))].sort();
    return letters.join('');
  }

  if (t === 'short') {
    const main = (typeof a === 'string' && a.trim()) ? a.trim() : '';
    const kw = (typeof q.keywords === 'string' && q.keywords.trim()) ? q.keywords.trim() : '';
    return main || kw || '';
  }

  return String(a == null ? '' : a).trim();
}

function explanationOf(q) {
  const e1 = (typeof q.explanation === 'string' && q.explanation.trim()) ? q.explanation.trim() : '';
  const e2 = (typeof q.explain === 'string' && q.explain.trim()) ? q.explain.trim() : '';
  return e1 || e2 || '';
}

function pointText(q) {
  const p = q.points;
  if (p === undefined || p === null || p === '') return '';
  const n = Number(p);
  if (!isFinite(n) || n <= 0) return '';
  return `${Number.isInteger(n) ? n : n}分`;
}

function t(text, opts) {
  return new TextRun(Object.assign({ text: String(text == null ? '' : text), font: FONT_BODY, size: 21 }, opts || {}));
}

function p(children, opts) {
  return new Paragraph(Object.assign({ children: Array.isArray(children) ? children : [children], spacing: { after: 60 } }, opts || {}));
}

function indentTwip(mm) { return convertMillimetersToTwip(mm); }

// 生成单题段落
function buildQuestionBlocks(q, no) {
  const type = normType(q);
  const blocks = [];
  const marks = [];
  if (type === 'multiple') marks.push('多选');
  const pts = pointText(q);
  if (pts) marks.push(pts);
  const markStr = marks.length ? `（${marks.join('，')}）` : '';

  if (type === 'judge') {
    blocks.push(p([
      t(`${no}. `, { bold: true }),
      t(String(q.question || '')),
      t('（　　）', { bold: true }),
      t(markStr)
    ]));
  } else {
    blocks.push(p([
      t(`${no}. `, { bold: true }),
      t(String(q.question || '')),
      t(markStr)
    ]));
  }

  const opts = optionLines(q);
  for (const line of opts) {
    blocks.push(p([t(line)], { indent: { left: indentTwip(6) }, spacing: { after: 20 } }));
  }

  if (type === 'short') {
    for (let i = 0; i < 3; i++) {
      blocks.push(p([t('＿'.repeat(40), { color: '999999' })], { indent: { left: indentTwip(6) }, spacing: { after: 120 } }));
    }
  }

  return blocks;
}

// 生成答案条目
function buildAnswerEntry(q, no) {
  const type = normType(q);
  const ans = normalizeAnswer(q);
  if (type === 'short') {
    const exp = explanationOf(q);
    const runs = [t(`${no}. `, { bold: true })];
    runs.push(t(ans ? `参考答案：${ans}` : '参考答案：见解析'));
    if (exp) runs.push(new TextRun({ text: '', break: 1 }), t(`解析：${exp}`, { color: '555555' }));
    return p(runs);
  }
  const runs = [
    t(`${no}. `, { bold: true }),
    t(ans || '—', { bold: true }),
  ];
  const exp = explanationOf(q);
  if (exp) runs.push(new TextRun({ text: '', break: 1 }), t(`解析：${exp}`, { color: '555555' }));
  return p(runs);
}

/**
 * 生成题库 Word 文档
 * @param {Object} o
 * @param {Object} o.exam        考试配置（title/id/panel/brand/duration）
 * @param {string} o.panelLabel  板块中文名
 * @param {Array}  o.questions   已归一化到本考试的题目数组
 * @param {boolean} o.withAnswers 是否附参考答案与解析
 * @param {string} o.generatedAt  生成时间文本
 * @returns {Promise<Buffer>} .docx 二进制
 */
async function buildQuestionBankDocx(o) {
  const exam = o.exam || {};
  const panelLabel = o.panelLabel || '';
  const questions = Array.isArray(o.questions) ? o.questions : [];
  const withAnswers = o.withAnswers !== false;
  const generatedAt = o.generatedAt || '';

  const grouped = {};
  for (const k of TYPE_ORDER) grouped[k] = [];
  for (const q of questions) grouped[normType(q)].push(q);

  const children = [];

  // ===== 抬头 =====
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: String(exam.title || '题库'), bold: true, size: 34, font: FONT_HEAD })]
  }));

  const statParts = TYPE_ORDER
    .filter(k => grouped[k].length > 0)
    .map(k => `${TYPE_LABELS[k]} ${grouped[k].length} 题`);

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: `题库导出 · ${panelLabel ? panelLabel + ' · ' : ''}共 ${questions.length} 题`, size: 20, color: '555555', font: FONT_BODY })]
  }));

  if (statParts.length) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: statParts.join(' · '), size: 19, color: '555555', font: FONT_BODY })]
    }));
  }

  const metaParts = [];
  if (exam.brand) metaParts.push(`品牌：${exam.brand}`);
  if (exam.duration) metaParts.push(`建议时长：${exam.duration} 分钟`);
  metaParts.push(`考试编号：${exam.id || ''}`);

  if (metaParts.length) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: metaParts.join('　|　'), size: 19, color: '777777', font: FONT_BODY })]
    }));
  }

  if (generatedAt) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `导出时间：${generatedAt}`, size: 17, color: '999999', font: FONT_BODY })]
    }));
  }

  // 打印用填写栏
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [t('姓名：＿＿＿＿＿＿＿＿　　部门：＿＿＿＿＿＿＿＿　　日期：＿＿＿＿＿＿＿＿　　得分：＿＿＿＿＿＿', { size: 21 })]
  }));

  // ===== 题目区 =====
  let no = 0;
  let cnIdx = 0;
  for (const typeKey of TYPE_ORDER) {
    const list = grouped[typeKey];
    if (!list.length) continue;

    children.push(new Paragraph({
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: `${CN_NUM[cnIdx] || ''}、${TYPE_LABELS[typeKey]}（共 ${list.length} 题）`, bold: true, size: 24, font: FONT_HEAD })]
    }));
    cnIdx++;

    for (const q of list) {
      no++;
      for (const blk of buildQuestionBlocks(q, no)) children.push(blk);
    }
  }

  // ===== 答案区（可选） =====
  if (withAnswers) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: '参考答案与解析', bold: true, size: 30, font: FONT_HEAD })]
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: '（导师用，打印学员卷时请勿附带本页）', size: 18, color: '999999', font: FONT_BODY })]
    }));

    let ano = 0;
    for (const typeKey of TYPE_ORDER) {
      const list = grouped[typeKey];
      if (!list.length) continue;
      children.push(new Paragraph({
        spacing: { before: 160, after: 100 },
        children: [new TextRun({ text: `${TYPE_LABELS[typeKey]}`, bold: true, size: 22, font: FONT_HEAD })]
      }));
      for (const q of list) {
        ano++;
        children.push(buildAnswerEntry(q, ano));
      }
    }
  }

  // ===== 页脚页码 =====
  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: '第 ', size: 18, color: '888888', font: FONT_BODY }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: FONT_BODY }),
        new TextRun({ text: ' 页 / 共 ', size: 18, color: '888888', font: FONT_BODY }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888', font: FONT_BODY }),
        new TextRun({ text: ' 页', size: 18, color: '888888', font: FONT_BODY }),
      ]
    })]
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: 21 },
          paragraph: { spacing: { line: 300 } }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(20),
            bottom: convertMillimetersToTwip(20),
            left: convertMillimetersToTwip(22),
            right: convertMillimetersToTwip(22)
          }
        }
      },
      footers: { default: footer },
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

// 文件名安全化（去掉路径分隔符等在下载时可能出问题的字符）
function safeFileName(s) {
  return String(s == null ? '' : s)
    .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || '题库';
}

module.exports = { buildQuestionBankDocx, safeFileName, normType, normalizeAnswer, optionLines, explanationOf };
