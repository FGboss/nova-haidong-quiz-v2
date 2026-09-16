// ===== 题库 Word 导出模块（零外部依赖，纯只读生成，不读写任何持久化数据） =====
// 设计目标：把某一场考试的题库导出为 Word（.docx），供线下打印做题/考核使用。
//
// 为什么自己实现 DOCX 生成而不用第三方库：
//   Render 免费实例的构建环境对 npm 拉取新依赖不稳定（历史上出现过 npm install 静默卡死），
//   本模块仅依赖 Node 内置 zlib 手写 ZIP + OOXML，新依赖为 0，构建风险为 0。
//
// 兼容说明（重要）：
//   现有题库由多批导入产生，字段风格不统一，本模块做统一归一化处理——
//   1) 答案格式 4 种：单选 "A"；多选 ["A","B"] 或 "ABC"；判断 true/false 或 "A"/"B"；简答 要点串或仅 keywords
//   2) 解析字段 2 种：explanation（新人/培训题库）与 explain（技术/销售/客户端题库）
//   3) 选项前缀 2 种：部分题库选项自带 "A. " 前缀，部分不带（不能重复加前缀）
//   4) 分值：部分题库无 points 字段（不显示分值，不臆造）

const zlib = require('zlib');

// ==================== 第一部分：零依赖 DOCX 生成器 ====================

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// 组装 ZIP（deflate 压缩；文件名统一 UTF-8）
function makeZip(entries) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8');
    const comp = zlib.deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);        // version needed
    lh.writeUInt16LE(0x0800, 6);    // flag: UTF-8 文件名
    lh.writeUInt16LE(8, 8);         // method: deflate
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);        // extra len
    localParts.push(lh, nameBuf, comp);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);        // version made by
    ch.writeUInt16LE(20, 6);        // version needed
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(dosTime, 12);
    ch.writeUInt16LE(dosDate, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);        // extra
    ch.writeUInt16LE(0, 32);        // comment
    ch.writeUInt16LE(0, 34);        // disk number start
    ch.writeUInt16LE(0, 36);        // internal attrs
    ch.writeUInt32LE(0, 38);        // external attrs
    ch.writeUInt32LE(offset, 42);   // local header offset
    centralParts.push(ch, nameBuf);

    offset += 30 + nameBuf.length + comp.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const FONT_ASCII = 'Times New Roman';
const FONT_EA = '宋体';

// 单个 run → XML
function runXml(r) {
  if (!r) return '';
  const parts = [];
  const rPr = [];
  rPr.push(`<w:rFonts w:ascii="${FONT_ASCII}" w:eastAsia="${r.font || FONT_EA}" w:hAnsi="${FONT_ASCII}" w:cs="${FONT_ASCII}"/>`);
  if (r.bold) rPr.push('<w:b/>');
  if (r.color) rPr.push(`<w:color w:val="${r.color}"/>`);
  if (r.size) rPr.push(`<w:sz w:val="${r.size}"/><w:szCs w:val="${r.size}"/>`);
  parts.push(`<w:rPr>${rPr.join('')}</w:rPr>`);
  if (r.break) parts.push('<w:br/>');
  if (r.pageBreak) parts.push('<w:br w:type="page"/>');
  if (r.text != null && r.text !== '') parts.push(`<w:t xml:space="preserve">${esc(r.text)}</w:t>`);
  return `<w:r>${parts.join('')}</w:r>`;
}

// 段落模型 {runs:[], align, after, before, indentLeft, line} → XML
function paraXml(p) {
  if (!p) return '';
  const pPr = [];
  if (p.pageBreak) pPr.push('<w:pageBreakBefore/>');
  if (p.align) pPr.push(`<w:jc w:val="${p.align}"/>`);
  const sp = [];
  if (p.before != null) sp.push(`w:before="${p.before}"`);
  if (p.after != null) sp.push(`w:after="${p.after}"`);
  if (p.line != null) { sp.push(`w:line="${p.line}"`); sp.push('w:lineRule="auto"'); }
  if (sp.length) pPr.push(`<w:spacing ${sp.join(' ')}/>`);
  if (p.indentLeft) pPr.push(`<w:ind w:left="${p.indentLeft}"/>`);
  const inner = (p.runs || []).map(runXml).join('');
  return `<w:p>${pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''}${inner}</w:p>`;
}

function xl(s) { return `<w:t xml:space="preserve">${esc(s)}</w:t>`; }

// A4：20mm=1134twips，22mm=1247twips
const PAGE = {
  w: 11906, h: 16838,
  top: 1134, bottom: 1134, left: 1247, right: 1247,
  header: 851, footer: 992
};

function buildDocxXml(opts) {
  const { paragraphs = [], title = '', creator = '诺瓦&嗨动产品培训考核系统', createdAt = new Date().toISOString() } = opts;

  const body = paragraphs.map(paraXml).join('');

  const documentXml = XML_HEAD +
    `<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}` +
    `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/>` +
    `<w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/>` +
    `<w:pgMar w:top="${PAGE.top}" w:right="${PAGE.right}" w:bottom="${PAGE.bottom}" w:left="${PAGE.left}" w:header="${PAGE.header}" w:footer="${PAGE.footer}" w:gutter="0"/>` +
    `<w:cols w:space="425"/><w:docGrid w:type="lines" w:linePitch="312"/></w:sectPr>` +
    `</w:body></w:document>`;

  const stylesXml = XML_HEAD +
    `<w:styles xmlns:w="${W_NS}"><w:docDefaults>` +
    `<w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT_ASCII}" w:eastAsia="${FONT_EA}" w:hAnsi="${FONT_ASCII}" w:cs="${FONT_ASCII}"/>` +
    `<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault>` +
    `</w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    `</w:styles>`;

  const footerXml = XML_HEAD +
    `<w:ftr xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="${FONT_ASCII}" w:eastAsia="${FONT_EA}" w:hAnsi="${FONT_ASCII}"/><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>${xl('第 ')}</w:r>` +
    `<w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>${xl('1')}</w:r></w:fldSimple>` +
    `<w:r><w:rPr><w:rFonts w:eastAsia="${FONT_EA}"/><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>${xl(' 页 / 共 ')}</w:r>` +
    `<w:fldSimple w:instr=" NUMPAGES "><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>${xl('1')}</w:r></w:fldSimple>` +
    `<w:r><w:rPr><w:rFonts w:eastAsia="${FONT_EA}"/><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr>${xl(' 页')}</w:r>` +
    `</w:p></w:ftr>`;

  const contentTypes = XML_HEAD +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`;

  const rootRels = XML_HEAD +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${R_NS}/officeDocument" Target="word/document.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="${R_NS}/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`;

  const docRels = XML_HEAD +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${R_NS}/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId2" Type="${R_NS}/footer" Target="footer1.xml"/>` +
    `</Relationships>`;

  const coreXml = XML_HEAD +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${esc(title)}</dc:title>` +
    `<dc:creator>${esc(creator)}</dc:creator><cp:lastModifiedBy>${esc(creator)}</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>` +
    `</cp:coreProperties>`;

  const appXml = XML_HEAD +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ` +
    `xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
    `<Application>NovaQuiz</Application><Company>诺瓦&amp;嗨动</Company></Properties>`;

  return makeZip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'docProps/core.xml', data: coreXml },
    { name: 'docProps/app.xml', data: appXml },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/footer1.xml', data: footerXml },
  ]);
}

// ==================== 第二部分：题库归一化 ====================

const TYPE_LABELS = { single: '单选题', multiple: '多选题', judge: '判断题', short: '简答题' };
const TYPE_ORDER = ['single', 'multiple', 'judge', 'short'];
const CN_NUM = ['一', '二', '三', '四', '五', '六'];

function letterOf(i) { return String.fromCharCode(65 + i); }

function normType(q) {
  const t = q && q.type;
  return TYPE_LABELS[t] ? t : 'single';
}

// 选项是否已自带字母前缀（同题内风格一致，无混用；已全量校验）
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
  return `${n}分`;
}

// ==================== 第三部分：题库文档装配 ====================

function t(text, opt) { return Object.assign({ text: String(text == null ? '' : text) }, opt || {}); }
function p(runs, opt) { return Object.assign({ runs: Array.isArray(runs) ? runs : [runs] }, opt || {}); }

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
    ], { after: 60 }));
  } else {
    blocks.push(p([
      t(`${no}. `, { bold: true }),
      t(String(q.question || '')),
      t(markStr)
    ], { after: 60 }));
  }

  for (const line of optionLines(q)) {
    blocks.push(p([t(line)], { indentLeft: 340, after: 20 }));
  }

  if (type === 'short') {
    for (let i = 0; i < 3; i++) {
      blocks.push(p([t('＿'.repeat(40), { color: '999999' })], { indentLeft: 340, after: 120 }));
    }
  }

  return blocks;
}

function buildAnswerEntry(q, no) {
  const type = normType(q);
  const ans = normalizeAnswer(q);
  const exp = explanationOf(q);

  if (type === 'short') {
    const runs = [t(`${no}. `, { bold: true })];
    runs.push(t(ans ? `参考答案：${ans}` : '参考答案：见解析'));
    if (exp) runs.push({ break: true }, t(`解析：${exp}`, { color: '555555' }));
    return p(runs, { after: 80 });
  }

  const runs = [t(`${no}. `, { bold: true }), t(ans || '—', { bold: true })];
  if (exp) runs.push({ break: true }, t(`解析：${exp}`, { color: '555555' }));
  return p(runs, { after: 80 });
}

/**
 * 生成题库 Word 文档
 * @param {Object} o
 * @param {Object} o.exam        考试配置（title/id/panel/brand/duration）
 * @param {string} o.panelLabel  板块中文名
 * @param {Array}  o.questions   题目数组（调用方已按 scope 决定范围）
 * @param {boolean} o.withAnswers 是否附参考答案与解析
 * @param {string} o.generatedAt  生成时间文本
 * @param {string} [o.scope]     'exam'（本场考试卷，默认）| 'bank'（整个题库）
 * @param {string} [o.notice]    scope='bank' 时的补充说明（该题库覆盖哪几场考试）
 * @returns {Buffer} .docx 二进制
 */
function buildQuestionBankDocx(o) {
  const opt = o || {};
  const exam = opt.exam || {};
  const panelLabel = opt.panelLabel || '';
  const questions = Array.isArray(opt.questions) ? opt.questions : [];
  const withAnswers = opt.withAnswers !== false;
  const generatedAt = opt.generatedAt || '';

  const grouped = {};
  for (const k of TYPE_ORDER) grouped[k] = [];
  for (const q of questions) grouped[normType(q)].push(q);

  const paragraphs = [];

  // ===== 抬头 =====
  paragraphs.push(p([t(String(exam.title || '题库'), { bold: true, size: 34, font: '黑体' })], { align: 'center', after: 100 }));
  const scopeLabel = opt.scope === 'bank' ? '完整题库导出' : '题库导出';
  paragraphs.push(p([t(`${scopeLabel} · ${panelLabel ? panelLabel + ' · ' : ''}共 ${questions.length} 题`, { size: 20, color: '555555' })], { align: 'center', after: 60 }));

  const statParts = TYPE_ORDER
    .filter(k => grouped[k].length > 0)
    .map(k => `${TYPE_LABELS[k]} ${grouped[k].length} 题`);
  if (statParts.length) {
    paragraphs.push(p([t(statParts.join(' · '), { size: 19, color: '555555' })], { align: 'center', after: 60 }));
  }

  const metaParts = [];
  if (exam.brand) metaParts.push(`品牌：${exam.brand}`);
  if (exam.duration) metaParts.push(`建议时长：${exam.duration} 分钟`);
  metaParts.push(`考试编号：${exam.id || ''}`);
  paragraphs.push(p([t(metaParts.join('　|　'), { size: 19, color: '777777' })], { align: 'center', after: 40 }));

  if (generatedAt) {
    paragraphs.push(p([t(`导出时间：${generatedAt}`, { size: 17, color: '999999' })], { align: 'center', after: opt.notice ? 40 : 200 }));
  }

  // 「整个题库」导出时，说明该题库覆盖了哪几场考试
  if (opt.notice) {
    paragraphs.push(p([t(String(opt.notice), { size: 18, color: '999999' })], { align: 'center', after: 200 }));
  }

  // 打印用填写栏：本场考试卷 或 任何「仅试题」版本都需要（要发给学员做）
  const needFillBar = opt.scope !== 'bank' || !withAnswers;
  if (needFillBar) {
    paragraphs.push(p([t('姓名：＿＿＿＿＿＿＿＿　　部门：＿＿＿＿＿＿＿＿　　日期：＿＿＿＿＿＿＿＿　　得分：＿＿＿＿＿＿')], { after: 200 }));
  }

  // ===== 题目区 =====
  let no = 0;
  let cnIdx = 0;
  for (const typeKey of TYPE_ORDER) {
    const list = grouped[typeKey];
    if (!list.length) continue;
    paragraphs.push(p([t(`${CN_NUM[cnIdx] || ''}、${TYPE_LABELS[typeKey]}（共 ${list.length} 题）`, { bold: true, size: 24, font: '黑体' })], { before: 200, after: 120 }));
    cnIdx++;
    for (const q of list) {
      no++;
      for (const blk of buildQuestionBlocks(q, no)) paragraphs.push(blk);
    }
  }

  // ===== 答案区（可选） =====
  if (withAnswers) {
    paragraphs.push(p([{ pageBreak: true }]));
    paragraphs.push(p([t('参考答案与解析', { bold: true, size: 30, font: '黑体' })], { align: 'center', after: 160 }));
    paragraphs.push(p([t('（导师用，打印学员卷时请勿附带本页）', { size: 18, color: '999999' })], { align: 'center', after: 200 }));

    let ano = 0;
    for (const typeKey of TYPE_ORDER) {
      const list = grouped[typeKey];
      if (!list.length) continue;
      paragraphs.push(p([t(TYPE_LABELS[typeKey], { bold: true, size: 22, font: '黑体' })], { before: 160, after: 100 }));
      for (const q of list) {
        ano++;
        paragraphs.push(buildAnswerEntry(q, ano));
      }
    }
  }

  return buildDocxXml({
    paragraphs,
    title: String(exam.title || exam.id || '题库'),
    createdAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  });
}

// 文件名安全化（去掉路径分隔符等在下载时可能出问题的字符）
function safeFileName(s) {
  return String(s == null ? '' : s)
    .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || '题库';
}

module.exports = {
  buildQuestionBankDocx, safeFileName,
  normType, normalizeAnswer, optionLines, explanationOf,
  makeZip, crc32
};
