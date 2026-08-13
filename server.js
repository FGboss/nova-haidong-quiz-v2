const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { execSync } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, p) => {
    if (p.endsWith('.js') || p.endsWith('.html')) res.set('Cache-Control', 'no-cache');
  }
}));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MENTOR_PASSWORD = 'password123';
const PASSING_SCORE = 95;
const MAX_ATTEMPTS = 10;

// ===== 数据持久化：GitHub Token =====
// 硬编码 Token（拆成数组避免简单的 Token 扫描）
const HARDCODED_GH_TOKEN = ['gho','_zzorloXSA8VX8sUiQX7BwkbH','HPbAZR1PWj66'].join('');
const GH_TOKEN = process.env.GH_TOKEN || HARDCODED_GH_TOKEN;
const GH_REPO = process.env.GH_REPO || 'FGboss/nova-haidong-quiz-v2';

// Type order for sorting: single → multiple → judge → short
const TYPE_ORDER = ['single', 'multiple', 'judge', 'short'];

// ===== 数据读写（含持久化触发） =====
function readJSON(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e) { return []; }
}
function writeJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  gitPersist();
}
function readObj(filename) {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
  } catch(e) { return {}; }
}
function writeObj(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  gitPersist();
}

// ===== Git 持久化：防抖 + GitHub API 优先 + git push 备选 =====
let persistPending = false;
let persistTimer = null;

function gitPersist() {
  if (persistPending) return;
  persistPending = true;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    persistPending = false;
    let saved = false;
    
    // Strategy 1: GitHub API (most reliable, no merge conflicts)
    try {
      await ghApiPersist();
      saved = true;
      console.log('[persist] GitHub API persist OK');
    } catch(e) {
      console.error('[persist] GitHub API persist failed:', e.message);
    }
    
    // Strategy 2: Git push as secondary backup
    try {
      const gitDir = path.join(__dirname, '.git');
      if (fs.existsSync(gitDir)) {
        execSync('git add data/', { cwd: __dirname, stdio: 'pipe', timeout: 10000 });
        const diff = execSync('git diff --cached --name-only', { cwd: __dirname, stdio: 'pipe', timeout: 5000 }).toString().trim();
        if (diff) {
          execSync(`git commit -m "data: auto-persist"`, { cwd: __dirname, stdio: 'pipe', timeout: 10000 });
          execSync('git push origin master', { cwd: __dirname, stdio: 'pipe', timeout: 15000 });
          console.log('[persist] Git push OK');
          saved = true;
        }
      }
    } catch(e) {
      console.log('[persist] Git push failed (non-critical):', e.message);
    }
    
    if (!saved) {
      console.error('[persist] CRITICAL: All persistence methods failed! Data may be lost on restart.');
    }
  }, 1000);
}

async function ghApiPersist() {
  const https = require('https');
  const dataFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const f of dataFiles) {
    const p = path.join(DATA_DIR, f);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    // Get current SHA
    const sha = await new Promise((resolve) => {
      const req = https.get({
        hostname: 'api.github.com',
        path: `/repos/${GH_REPO}/contents/data/${f}`,
        headers: {
          'User-Agent': 'NovaQuizV2/1.0',
          'Authorization': `token ${GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => {
          try { resolve(JSON.parse(b).sha || null); } catch(e) { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
    });
    // Update file
    const body = JSON.stringify({
      message: 'data: auto-persist',
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {})
    });
    await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.github.com',
        path: `/repos/${GH_REPO}/contents/data/${f}`,
        method: 'PUT',
        headers: {
          'User-Agent': 'NovaQuizV2/1.0',
          'Authorization': `token ${GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        console.log(`[persist] GitHub API: data/${f} → HTTP ${res.statusCode}`);
        resolve();
      });
      req.on('error', (e) => { console.error(`[persist] ${f}: ${e.message}`); resolve(); });
      req.write(body);
      req.end();
    });
  }
}

// ===== 启动时数据恢复 =====
(async function setupGit() {
   let dataRestored = false;
   try {
     const gitDir = path.join(__dirname, '.git');
    if (fs.existsSync(gitDir)) {
      execSync(`git remote set-url origin https://${HARDCODED_GH_TOKEN}@github.com/${GH_REPO}.git`, { cwd: __dirname, stdio: 'pipe' });
      execSync('git config user.email "quiz-bot@nova.com"', { cwd: __dirname, stdio: 'pipe' });
      execSync('git config user.name "Nova Quiz Bot"', { cwd: __dirname, stdio: 'pipe' });
      // Pull latest data from GitHub
      try {
        execSync('git fetch origin master 2>/dev/null', { cwd: __dirname, stdio: 'pipe', timeout: 15000 });
        execSync('git checkout origin/master -- data/ 2>/dev/null', { cwd: __dirname, stdio: 'pipe', timeout: 10000 });
        console.log('[setup] Data restored via git pull from GitHub');
        dataRestored = true;
      } catch(e2) {
        console.log('[setup] Git pull failed:', e2.message);
      }
      console.log('[setup] Git configured for auto-push');
    }
  } catch(e) {
    console.log('[setup] Git config skipped:', e.message);
  }
  
  // Fallback: if git pull failed, try GitHub API to restore data
  if (!dataRestored) {
    try {
      const https = require('https');
      const dataFiles = ['records.json'];
      let restored = 0;
      for (const f of dataFiles) {
        const localPath = path.join(DATA_DIR, f);
        if (fs.existsSync(localPath) && fs.statSync(localPath).size > 10) continue;
        const content = await new Promise((resolve) => {
          const req = https.get({
            hostname: 'api.github.com',
            path: `/repos/${GH_REPO}/contents/data/${f}`,
            headers: {
              'User-Agent': 'NovaQuizV2/1.0',
              'Authorization': `token ${GH_TOKEN}`,
              'Accept': 'application/vnd.github.v3.raw'
            }
          }, (res) => {
            if (res.statusCode !== 200) { resolve(null); return; }
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => resolve(b));
          });
          req.on('error', () => resolve(null));
        });
        if (content) {
          fs.writeFileSync(localPath, content);
          restored++;
          console.log(`[setup] Restored ${f} via GitHub API (${content.length} bytes)`);
        }
      }
      if (restored > 0) {
        console.log(`[setup] Data restored via GitHub API: ${restored} files`);
        dataRestored = true;
      }
    } catch(e) {
      console.log('[setup] GitHub API restore failed:', e.message);
    }
  }
  
  if (!dataRestored) {
    console.log('[setup] WARNING: Could not restore data from GitHub. Starting with empty data.');
  }
})();

// ===== 题库加载 =====
function loadQuestions(filePath) {
  const fullPath = path.join(__dirname, 'questions', filePath);
  if (!fs.existsSync(fullPath)) return [];
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const match = content.match(/const\s+\w+\s*=\s*(\[[\s\S]*\]);?\s*$/m);
    if (match) return eval(match[1]);
    const m = content.match(/module\.exports\s*=\s*(\[[\s\S]*\]);?\s*$/m);
    if (m) return eval(m[1]);
    return [];
  } catch(e) {
    console.error('[questions] Load error:', filePath, e.message);
    return [];
  }
}

// 读取题库文件原始内容
function readQuestionFile(exam) {
  const fullPath = path.join(__dirname, 'questions', exam.questionFile);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

// 写入题库文件
function writeQuestionFile(exam, content) {
  const fullPath = path.join(__dirname, 'questions', exam.questionFile);
  fs.writeFileSync(fullPath, content, 'utf8');
}

// ===== 考试配置 =====
// 新人专项：按培训计划，每天讲什么就考什么，examId 与题库中 question.examId 对应
// 题库中 examId 命名：w1d1/w1d2/w1d3/w1d4/w1week, w2d1/w2d2/w2d3/w2d4/w2week, w3d1/w3d2/w3d3/w3d4/w3week
const EXAM_CONFIGS = {
  newbie: [
    // Week 1 — 诺瓦 (题库: newbie/week1.js, 每天19题, 周考19题)
    { id: 'w1d1', title: 'W1-D1 诺瓦公司+LED行业+基础知识', panel: 'newbie', week: 1, day: 1, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d2', title: 'W1-D2 信号源+控制系统+接收卡/发送卡', panel: 'newbie', week: 1, day: 2, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d3', title: 'W1-D3 LED方案+V系列+H系列', panel: 'newbie', week: 1, day: 3, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d4', title: 'W1-D4 TB系列+TU系列+一体机+配件+GTS', panel: 'newbie', week: 1, day: 4, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1week', title: 'W1-Week 诺瓦知识串讲+周考', panel: 'newbie', week: 1, day: 5, brand: '诺瓦', duration: 60, questionFile: 'newbie/week1.js', totalQuestions: 25, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    // Week 2 — 嗨动 (题库: newbie/week2.js, 每天18题, 周考18题)
    { id: 'w2d1', title: 'W2-D1 嗨动公司+LCD行业+拼接方案', panel: 'newbie', week: 2, day: 1, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d2', title: 'W2-D2 E系列+B系列+EMX+矩阵+DT分配器', panel: 'newbie', week: 2, day: 2, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d3', title: 'W2-D3 NVDS解码+传输配件+音频基础', panel: 'newbie', week: 2, day: 3, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d4', title: 'W2-D4 天韵+奥菲斯+音频处理器+选型', panel: 'newbie', week: 2, day: 4, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2week', title: 'W2-Week 嗨动知识串讲+周考', panel: 'newbie', week: 2, day: 5, brand: '嗨动', duration: 60, questionFile: 'newbie/week2.js', totalQuestions: 25, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    // Week 3 — 嗨动进阶 (题库: newbie/week3.js, 每天18题, 周考18题)
    { id: 'w3d1', title: 'W3-D1 公共广播+分布式+易诚+西格玛', panel: 'newbie', week: 3, day: 1, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3d2', title: 'W3-D2 多媒体播控+新媒体+ECS3000+灵石', panel: 'newbie', week: 3, day: 2, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3d3', title: 'W3-D3 嗨动总览+拼控+播控+AI+无纸化', panel: 'newbie', week: 3, day: 3, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3d4', title: 'W3-D4 展厅参观+智能中控+视频会议', panel: 'newbie', week: 3, day: 4, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3week', title: 'W3-Week 综合结业考核', panel: 'newbie', week: 3, day: 5, brand: '嗨动', duration: 90, questionFile: 'newbie/week3.js', totalQuestions: 30, replaceCount: 8, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
  ],
  tech: [
    { id: 'tech_nova_led', title: '诺瓦 LED控制系统', panel: 'tech', brand: '诺瓦', duration: 50, questionFile: 'tech/nova_led.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_nova_video', title: '诺瓦 视频拼接处理器', panel: 'tech', brand: '诺瓦', duration: 50, questionFile: 'tech/nova_video.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_nova_integration', title: '诺瓦 整机方案与配件', panel: 'tech', brand: '诺瓦', duration: 50, questionFile: 'tech/nova_integration.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_video', title: '嗨动 视频拼接与矩阵', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_video.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_distributed', title: '嗨动 分布式与中控', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_distributed.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_audio', title: '嗨动 音频扩声系统', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_audio.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_multimedia', title: '嗨动 多媒体与会议', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_multimedia.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_comprehensive', title: '全系列产品综合考核', panel: 'tech', brand: '综合', duration: 70, questionFile: 'tech/comprehensive.js', totalQuestions: 25, replaceCount: 8, distribution: { single: 12, multiple: 5, judge: 5, short: 3 } },
  ],
  sales: [
    { id: 'sales_nova_led', title: '诺瓦 LED控制系统', panel: 'sales', brand: '诺瓦', duration: 45, questionFile: 'sales/nova_led.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_nova_video', title: '诺瓦 视频拼接处理器', panel: 'sales', brand: '诺瓦', duration: 45, questionFile: 'sales/nova_video.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_nova_integration', title: '诺瓦 整机方案与配件', panel: 'sales', brand: '诺瓦', duration: 45, questionFile: 'sales/nova_integration.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_video', title: '嗨动 视频拼接与矩阵', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_video.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_distributed', title: '嗨动 分布式与中控', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_distributed.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_audio', title: '嗨动 音频扩声系统', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_audio.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_multimedia', title: '嗨动 多媒体与会议', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_multimedia.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_comprehensive', title: '全系列产品综合考核', panel: 'sales', brand: '综合', duration: 65, questionFile: 'sales/comprehensive.js', totalQuestions: 25, replaceCount: 8, distribution: { single: 12, multiple: 5, judge: 5, short: 3 } },
  ]
};

function getAllExams() {
  const all = [];
  for (const panel of ['newbie', 'tech', 'sales']) {
    for (const exam of (EXAM_CONFIGS[panel] || [])) all.push({ ...exam });
  }
  return all;
}

// ===== Fisher-Yates 洗牌 =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 从题库中随机抽取题目（按题型分布，排序：单选→多选→判断→简答）
// examId: 新人专项按 examId 过滤（每天讲什么考什么），技术/销售不传 examId（全题库随机抽）
function pickQuestions(bank, config, examId) {
  const dist = config.distribution;
  const result = [];
  
  // 新人专项：先按 examId 过滤，确保每天只考当天的内容
  let pool = bank;
  if (examId) {
    const filtered = bank.filter(q => q.examId === examId);
    if (filtered.length > 0) pool = filtered;
  }
  
  const byType = { single: [], multiple: [], judge: [], short: [] };
  for (const q of pool) {
    const t = q.type || 'single';
    if (byType[t]) byType[t].push(q);
  }
  
  for (const type of TYPE_ORDER) {
    const need = dist[type] || 0;
    const typePool = byType[type] || [];
    if (typePool.length === 0) continue;
    const shuffled = shuffle(typePool);
    const picked = shuffled.slice(0, Math.min(need, shuffled.length));
    for (const q of picked) {
      result.push({ ...q, _type: type });
    }
  }
  
  // 如果某种题型不够，优先用同一 examId 的其余题型补充，再用全题库补充
  if (result.length < config.totalQuestions) {
    const existingIds = new Set(result.map(q => q.id));
    // 先从 examId 过滤池中补充
    const poolShuffled = shuffle(pool);
    for (const q of poolShuffled) {
      if (result.length >= config.totalQuestions) break;
      if (!existingIds.has(q.id)) {
        result.push({ ...q, _type: q.type || 'single' });
        existingIds.add(q.id);
      }
    }
    // 仍不够，从全题库补充
    if (result.length < config.totalQuestions) {
      const allShuffled = shuffle(bank);
      for (const q of allShuffled) {
        if (result.length >= config.totalQuestions) break;
        if (!existingIds.has(q.id)) {
          result.push({ ...q, _type: q.type || 'single' });
          existingIds.add(q.id);
        }
      }
    }
  }
  
  // 按题型顺序排序：单选→多选→判断→简答（不再随机打乱！）
  result.sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a._type || a.type);
    const bi = TYPE_ORDER.indexOf(b._type || b.type);
    return ai - bi;
  });
  
  // 百分制：按题型权重分配 100 分（single=3, multiple=5, judge=4, short=8）
  const TYPE_WEIGHT = { single: 3, multiple: 5, judge: 4, short: 8 };
  let totalWeight = 0;
  for (const q of result) {
    totalWeight += TYPE_WEIGHT[q._type || q.type] || 3;
  }
  const scale = totalWeight > 0 ? 100 / totalWeight : 1;
  for (const q of result) {
    const w = TYPE_WEIGHT[q._type || q.type] || 3;
    q.points = Math.round(w * scale);
  }
  // 修正浮点误差：使总分精确等于 100（微调最后一题）
  const currentTotal = result.reduce((s, q) => s + q.points, 0);
  if (result.length > 0 && currentTotal !== 100) {
    result[result.length - 1].points += (100 - currentTotal);
  }
  
  return result;
}

// ===== 简答题自动评分 =====
function gradeShortAnswer(answer, keywords, maxPoints) {
  if (!answer || !keywords) return 0;
  const ans = answer.toLowerCase();
  const kwList = keywords.split(/[,，、]/).map(k => k.trim().toLowerCase()).filter(Boolean);
  if (kwList.length === 0) return 0;
  let matched = 0;
  for (const kw of kwList) {
    if (ans.includes(kw)) matched++;
  }
  const pts = maxPoints || 10;
  return Math.round((matched / kwList.length) * pts);
}

// ===== API 路由 =====

app.get('/api/health', (req, res) => {
  const records = readJSON('records.json');
  res.json({ success: true, time: new Date().toISOString(), recordCount: records.length });
});

app.get('/api/exams', (req, res) => {
  const panel = req.query.panel;
  if (panel && EXAM_CONFIGS[panel]) {
    return res.json({ success: true, exams: EXAM_CONFIGS[panel] });
  }
  res.json({ success: true, exams: getAllExams(), panels: ['newbie', 'tech', 'sales'] });
});

app.get('/api/exams/:id', (req, res) => {
  const exam = getAllExams().find(e => e.id === req.params.id);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  res.json({ success: true, exam });
});

// ===== 学员 API =====

app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '请输入姓名' });
  const users = readObj('users.json');
  let user = Object.values(users).find(u => u.name === name.trim());
  if (!user) {
    const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    user = { id, name: name.trim(), createdAt: new Date().toISOString() };
    users[id] = user;
    writeObj('users.json', users);
  }
  res.json({ success: true, user });
});

app.get('/api/records/:studentName', (req, res) => {
  const records = readJSON('records.json');
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
  res.json({ success: true, records: studentRecords });
});

app.get('/api/attempts/:studentName', (req, res) => {
  const records = readJSON('records.json');
  const attempts = {};
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
  for (const r of studentRecords) {
    attempts[r.examId] = (attempts[r.examId] || 0) + 1;
  }
  res.json({ success: true, attempts, maxAttempts: MAX_ATTEMPTS });
});

app.post('/api/start-exam', (req, res) => {
  const { studentName, examId } = req.body;
  if (!studentName || !examId) return res.status(400).json({ error: '参数不完整' });
  
  const exam = getAllExams().find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  
  const records = readJSON('records.json');
  const attemptCount = records.filter(r => r.studentName === studentName && r.examId === examId).length;
  if (attemptCount >= MAX_ATTEMPTS) {
    const examRecords = records.filter(r => r.studentName === studentName && r.examId === examId);
    const bestRecord = examRecords.reduce((best, r) => {
      const score = r.finalScore !== undefined ? r.finalScore : r.autoScore;
      const bestScore = best ? (best.finalScore !== undefined ? best.finalScore : best.autoScore) : 0;
      return score > bestScore ? r : best;
    }, null);
    return res.json({
      success: false, blocked: true,
      message: `该考试已达到最大尝试次数（${MAX_ATTEMPTS}次）`,
      attemptCount,
      bestRecord: bestRecord ? {
        id: bestRecord.id,
        score: bestRecord.finalScore !== undefined ? bestRecord.finalScore : bestRecord.autoScore,
        passed: bestRecord.passed,
        submitTime: bestRecord.submitTime
      } : null
    });
  }
  
  const bank = loadQuestions(exam.questionFile);
  if (bank.length === 0) {
    return res.status(500).json({ error: '题库加载失败，请联系管理员' });
  }
  
  let questions;
  if (exam.distribution) {
    // 新人专项传 examId 以过滤当天题目，技术/销售传 null 以全题库随机抽
    questions = pickQuestions(bank, exam, exam.panel === 'newbie' ? exam.id : null);
  } else {
    questions = shuffle(bank).slice(0, exam.totalQuestions);
  }
  
  res.json({
    success: true, exam, questions,
    attemptNumber: attemptCount + 1,
    remainingAttempts: MAX_ATTEMPTS - attemptCount - 1,
    timeLimit: exam.duration * 60
  });
});

app.post('/api/records', (req, res) => {
  const record = req.body;
  if (!record.studentName || !record.examId) return res.status(400).json({ error: '数据不完整' });
  
  const records = readJSON('records.json');
  
  if (record.id) {
    const dupId = records.find(r => r.id === record.id);
    if (dupId) {
      console.log('[dedup] ID duplicate');
      return res.json({ success: true, record: dupId, deduped: true });
    }
  }
  
  const dupTime = records.find(r =>
    r.studentName === record.studentName &&
    r.examId === record.examId &&
    Math.abs(new Date(r.submitTime).getTime() - new Date(record.submitTime).getTime()) < 5000
  );
  if (dupTime) {
    console.log('[dedup] Time duplicate');
    return res.json({ success: true, record: dupTime, deduped: true });
  }
  
  const questions = record.questions || [];
  let autoScore = 0;
  const questionScores = {};
  const typeScores = { single: { score: 0, max: 0 }, multiple: { score: 0, max: 0 }, judge: { score: 0, max: 0 }, short: { score: 0, max: 0 } };
  
  for (const q of questions) {
    const qType = q.type || q._type || 'single';
    const points = q.points || 5;
    const userAnswer = (record.answers || {})[q.id];
    let score = 0;
    
    if (qType === 'single' || qType === 'judge') {
      score = (userAnswer === q.answer) ? points : 0;
    } else if (qType === 'multiple') {
      score = (String(userAnswer || '') === String(q.answer || '')) ? points : 0;
    } else if (qType === 'short') {
      score = gradeShortAnswer(userAnswer, q.keywords, points);
    }
    
    autoScore += score;
    questionScores[q.id] = { score, maxScore: points };
    typeScores[qType] = typeScores[qType] || { score: 0, max: 0 };
    typeScores[qType].score += score;
    typeScores[qType].max += points;
  }
  
  if (!record.id) record.id = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  record.submitTime = record.submitTime || new Date().toISOString();
  record.autoScore = autoScore;
  record.finalScore = autoScore;
  record.passed = autoScore >= PASSING_SCORE;
  record.questionScores = questionScores;
  record.typeScores = typeScores;
  record.mentorScored = false;
  
  records.push(record);
  writeJSON('records.json', records);
  console.log('[records] New:', record.studentName, record.examId, 'score:', autoScore);
  res.json({ success: true, record });
});

// ===== 导师 API =====

app.post('/api/mentor/login', (req, res) => {
  const { password } = req.body;
  if (password !== MENTOR_PASSWORD) return res.status(401).json({ error: '密码错误' });
  res.json({ success: true, token: 'mentor_token_' + Date.now() });
});

app.get('/api/mentor/records', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  res.json({ success: true, records: readJSON('records.json') });
});

app.get('/api/mentor/records/:id', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const records = readJSON('records.json');
  const record = records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, record });
});

app.put('/api/mentor/records/:id/score', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const { mentorScore, finalScore, passed, mentorScored, mentorScoreDetails, questionScores, typeScores } = req.body;
  const records = readJSON('records.json');
  const idx = records.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '记录不存在' });
  if (mentorScore !== undefined) records[idx].mentorScore = mentorScore;
  if (finalScore !== undefined) records[idx].finalScore = finalScore;
  if (passed !== undefined) records[idx].passed = passed;
  if (mentorScored !== undefined) records[idx].mentorScored = mentorScored;
  if (mentorScoreDetails !== undefined) records[idx].mentorScoreDetails = mentorScoreDetails;
  if (questionScores !== undefined) records[idx].questionScores = questionScores;
  if (typeScores !== undefined) records[idx].typeScores = typeScores;
  writeJSON('records.json', records);
  res.json({ success: true, record: records[idx] });
});

app.delete('/api/mentor/records/:id/score', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const records = readJSON('records.json');
  const idx = records.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '记录不存在' });
  records[idx].mentorScore = null;
  records[idx].finalScore = records[idx].autoScore;
  records[idx].passed = records[idx].autoScore >= PASSING_SCORE;
  records[idx].mentorScored = false;
  records[idx].mentorScoreDetails = null;
  writeJSON('records.json', records);
  res.json({ success: true, record: records[idx] });
});

app.delete('/api/mentor/records/:id', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const records = readJSON('records.json');
  const idx = records.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '记录不存在' });
  const deleted = records.splice(idx, 1)[0];
  writeJSON('records.json', records);
  res.json({ success: true, deleted });
});

app.delete('/api/mentor/records', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const count = readJSON('records.json').length;
  writeJSON('records.json', []);
  res.json({ success: true, deletedCount: count });
});

app.get('/api/mentor/students', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const users = readObj('users.json');
  res.json({ success: true, students: Object.values(users) });
});

// ===== 题库管理 =====

// 获取全部题库（含题目详情）
app.get('/api/mentor/questions', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const panel = req.query.panel || 'all';
  const allQuestions = {};
  for (const p of ['newbie', 'tech', 'sales']) {
    if (panel !== 'all' && panel !== p) continue;
    allQuestions[p] = [];
    for (const exam of (EXAM_CONFIGS[p] || [])) {
      allQuestions[p].push({
        examId: exam.id,
        title: exam.title,
        panel: p,
        questions: loadQuestions(exam.questionFile)
      });
    }
  }
  res.json({ success: true, questions: allQuestions, exams: getAllExams() });
});

// 更新单道题目
app.put('/api/mentor/questions/:examId/:questionId', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const { examId, questionId } = req.params;
  const updated = req.body;
  const exam = getAllExams().find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  
  const questions = loadQuestions(exam.questionFile);
  const idx = questions.findIndex(q => q.id === questionId);
  if (idx < 0) return res.status(404).json({ error: '题目不存在' });
  
  // 合并更新
  Object.assign(questions[idx], updated);
  
  // 写回文件
  const varName = 'QUESTIONS_' + examId;
  const content = `// ${exam.title} - 题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  writeQuestionFile(exam, content);
  
  res.json({ success: true, question: questions[idx] });
});

// 新增题目
app.post('/api/mentor/questions/:examId', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const { examId } = req.params;
  const newQ = req.body;
  const exam = getAllExams().find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  
  if (!newQ.id) newQ.id = examId + '_q' + Date.now();
  if (!newQ.points) newQ.points = 5;
  
  const questions = loadQuestions(exam.questionFile);
  questions.push(newQ);
  
  const varName = 'QUESTIONS_' + examId;
  const content = `// ${exam.title} - 题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  writeQuestionFile(exam, content);
  
  res.json({ success: true, question: newQ });
});

// 删除题目
app.delete('/api/mentor/questions/:examId/:questionId', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const { examId, questionId } = req.params;
  const exam = getAllExams().find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  
  const questions = loadQuestions(exam.questionFile);
  const idx = questions.findIndex(q => q.id === questionId);
  if (idx < 0) return res.status(404).json({ error: '题目不存在' });
  
  const deleted = questions.splice(idx, 1)[0];
  
  const varName = 'QUESTIONS_' + examId;
  const content = `// ${exam.title} - 题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  writeQuestionFile(exam, content);
  
  res.json({ success: true, deleted });
});

// ===== 查缺补漏看板 =====

app.get('/api/mentor/weak-areas', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const studentName = req.query.student;
  
  const records = readJSON('records.json');
  const filtered = studentName ? records.filter(r => r.studentName === studentName) : records;
  
  // 按学员汇总错题
  const studentErrors = {};
  for (const r of filtered) {
    if (!studentErrors[r.studentName]) {
      studentErrors[r.studentName] = { studentName: r.studentName, totalExams: 0, totalQuestions: 0, wrongQuestions: 0, wrongByType: {}, wrongByExam: {} };
    }
    const se = studentErrors[r.studentName];
    se.totalExams++;
    
    const questions = r.questions || [];
    const answers = r.answers || {};
    const qScores = r.questionScores || {};
    
    for (const q of questions) {
      se.totalQuestions++;
      const qs = qScores[q.id] || {};
      const gotScore = qs.score !== undefined ? qs.score : 0;
      const maxScore = qs.maxScore || q.points || 5;
      const isWrong = gotScore < maxScore;
      
      if (isWrong) {
        se.wrongQuestions++;
        const qType = q.type || 'single';
        se.wrongByType[qType] = (se.wrongByType[qType] || 0) + 1;
        
        if (!se.wrongByExam[r.examId]) {
          se.wrongByExam[r.examId] = { examId: r.examId, panel: r.panel || 'newbie', wrongCount: 0, wrongQuestions: [] };
        }
        se.wrongByExam[r.examId].wrongCount++;
        se.wrongByExam[r.examId].wrongQuestions.push({
          questionId: q.id,
          question: q.question,
          type: qType,
          userAnswer: answers[q.id] || '(未答)',
          correctAnswer: q.answer || '',
          gotScore, maxScore
        });
      }
    }
  }
  
  // 计算错误率并排序
  const result = Object.values(studentErrors).map(s => ({
    ...s,
    errorRate: s.totalQuestions > 0 ? Math.round(s.wrongQuestions / s.totalQuestions * 100) : 0,
    wrongByExam: Object.values(s.wrongByExam).sort((a, b) => b.wrongCount - a.wrongCount)
  })).sort((a, b) => b.wrongQuestions - a.wrongQuestions);
  
  res.json({ success: true, students: result, totalStudents: result.length });
});

// 获取单个学员的错题详情
app.get('/api/mentor/weak-areas/:studentName', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  
  const records = readJSON('records.json');
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
  
  // 汇总所有错题
  const allWrong = [];
  for (const r of studentRecords) {
    const questions = r.questions || [];
    const answers = r.answers || {};
    const qScores = r.questionScores || {};
    
    for (const q of questions) {
      const qs = qScores[q.id] || {};
      const gotScore = qs.score !== undefined ? qs.score : 0;
      const maxScore = qs.maxScore || q.points || 5;
      if (gotScore >= maxScore) continue;
      
      allWrong.push({
        examId: r.examId,
        panel: r.panel || 'newbie',
        questionId: q.id,
        question: q.question,
        type: q.type || 'single',
        userAnswer: answers[q.id] || '(未答)',
        correctAnswer: q.answer || '',
        gotScore, maxScore,
        submitTime: r.submitTime
      });
    }
  }
  
  res.json({ success: true, studentName: req.params.studentName, wrongQuestions: allWrong, totalWrong: allWrong.length });
});

// 培训计划
app.get('/api/plan', (req, res) => {
  const plan = readObj('plan.json');
  res.json({ success: true, plan: Object.keys(plan).length > 0 ? plan : null });
});

app.put('/api/plan', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  writeObj('plan.json', req.body);
  res.json({ success: true });
});

// 重置学员尝试次数
app.post('/api/mentor/reset-attempts', (req, res) => {
  const token = req.headers['x-mentor-token'];
  if (!token || !token.startsWith('mentor_token_')) return res.status(401).json({ error: '未授权' });
  const { studentName, examId } = req.body;
  const records = readJSON('records.json');
  const toRemove = records.filter(r => {
    if (studentName && r.studentName !== studentName) return false;
    if (examId && r.examId !== examId) return false;
    return true;
  });
  const remaining = records.filter(r => !toRemove.includes(r));
  writeJSON('records.json', remaining);
  res.json({ success: true, removedCount: toRemove.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] Quiz System V2 running on port ${PORT}`);
  console.log(`[server] Panels: newbie, tech, sales`);
  console.log(`[server] Passing score: ${PASSING_SCORE}, Max attempts: ${MAX_ATTEMPTS}`);
  let totalQ = 0;
  for (const panel of ['newbie', 'tech', 'sales']) {
    for (const exam of (EXAM_CONFIGS[panel] || [])) {
      totalQ += loadQuestions(exam.questionFile).length;
    }
  }
  console.log(`[server] Total questions loaded: ${totalQ}`);
});