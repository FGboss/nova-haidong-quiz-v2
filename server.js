// V2.3 - Module Management System with Memory Cache + Supabase Fallback (2026-08-19)
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const XLSX = require('xlsx');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Global error handlers - log but don't crash
process.on('uncaughtException', (err) => {
  console.error('[ERROR] uncaughtException:', err.message);
  console.error(err.stack);
  // Don't exit - keep server running
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] unhandledRejection:', reason);
  if (reason && reason.stack) console.error(reason.stack);
  // Don't exit - keep server running
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
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

const PASSING_SCORE = 90;
const MAX_ATTEMPTS = 10;

const TYPE_ORDER = ['single', 'multiple', 'judge', 'short'];

// ===== 数据持久化：Supabase PostgreSQL =====
const db = require('./db');

// ===== 初始化超级管理员 =====
async function initSuperAdmin() {
  const users = await db.readObj('users.json');
  if (!users['PC']) {
    users['PC'] = {
      username: 'PC',
      password: crypto.createHash('sha256').update('password123').digest('hex'),
      role: 'admin',
      name: '超级管理员',
      createdAt: new Date().toISOString()
    };
    await db.writeObj('users.json', users);
    console.log('[init] Super admin PC created.');
  }
}

// ===== 初始化模块配置 =====
async function initModuleConfig() {
  const config = await db.readObj('module_config.json');
  const defaults = {
    newbie: { id: 'newbie', name: '新人专项', icon: '📚', desc: '3周系统培训考核，每日一考+周考，15套试卷覆盖产品基础知识', bankIds: [] },
    training: { id: 'training', name: '新人培训专项（祥雨/伟桀）', icon: '🎓', desc: '嗨动产品线新人培训考核，5大产品系列，按百分比评分+随机出题', bankIds: [] },
    tech: { id: 'tech', name: '技术进阶', icon: '🔧', desc: '按产品系列深度考核，涵盖参数、性能、技术排查和系统架构', bankIds: [] },
    sales: { id: 'sales', name: '销售进阶', icon: '💼', desc: '按产品系列考核，侧重方案搭配、选型推荐和场景应用能力', bankIds: [] },
    client: { id: 'client', name: '客户端考核', icon: '🏢', desc: '客户现场培训考核，按产品系列出题，模拟纸质试卷模式', bankIds: [] },
    new_product: { id: 'new_product', name: '新品考核', icon: '🆕', desc: '新品培训考核，持续更新中', bankIds: [] }
  };
  let changed = false;
  if (!config.fixedModules) { config.fixedModules = {}; changed = true; }
  for (const k of Object.keys(defaults)) {
    if (!config.fixedModules[k]) { config.fixedModules[k] = defaults[k]; changed = true; }
  }
  if (!config.customModules) { config.customModules = {}; changed = true; }
  if (changed) {
    await db.writeObj('module_config.json', config);
    console.log('[init] Module config initialized.');
  }
}
async function getModuleConfig() { return await db.readObj('module_config.json'); }

// ===== 用户认证 =====
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

function generateToken() {
  return 'tk_' + crypto.randomBytes(24).toString('hex');
}

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: '未登录' });
    const users = await db.readObj('users.json');
    const user = Object.values(users).find(u => u.token === token);
    if (!user) return res.status(401).json({ error: '登录已过期' });
    req.currentUser = user;
    next();
  } catch(e) { next(e); }
}

async function mentorAuth(req, res, next) {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: '未登录' });
    const users = await db.readObj('users.json');
    const user = Object.values(users).find(u => u.token === token);
    if (!user || (user.role !== 'mentor' && user.role !== 'admin')) return res.status(403).json({ error: '需要导师或管理员权限' });
    req.currentUser = user;
    next();
  } catch(e) { next(e); }
}

async function adminAuth(req, res, next) {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: '未登录' });
    const users = await db.readObj('users.json');
    const user = Object.values(users).find(u => u.token === token);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
    req.currentUser = user;
    next();
  } catch(e) { next(e); }
}

// ===== 题库加载（内存缓存 + Supabase 回退，确保数据不丢） =====
const questionCache = new Map(); // 内存缓存，文件丢失时作为首要回退

function loadQuestions(filePath) {
  const fullPath = path.join(__dirname, 'questions', filePath);
  if (!fs.existsSync(fullPath)) {
    // 内存缓存回退（从 Supabase 预加载的）
    if (questionCache.has(filePath)) {
      console.log('[questions] Served from memory cache:', filePath, `(${questionCache.get(filePath).length} questions)`);
      return questionCache.get(filePath);
    }
    console.log('[questions] File not found on disk:', filePath);
    return [];
  }
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const match = content.match(/const\s+\w+\s*=\s*(\[[\s\S]*\]);?\s*$/m);
    if (match) {
      const questions = eval(match[1]);
      questionCache.set(filePath, questions); // 更新缓存
      return questions;
    }
    const m = content.match(/module\.exports\s*=\s*(\[[\s\S]*\]);?\s*$/m);
    if (m) {
      const questions = eval(m[1]);
      questionCache.set(filePath, questions);
      return questions;
    }
    return [];
  } catch(e) { console.error('[questions] Load error:', filePath, e.message); return []; }
}

// 从 Supabase 预加载所有题库到内存缓存（启动时调用）
async function preloadQuestionCache() {
  const meta = await db.readObj('new_product_meta.json');
  let loaded = 0;
  for (const [productId, product] of Object.entries(meta)) {
    if (!product.questionFile) continue;
    const filePath = product.questionFile;
    const key = 'question_file_' + filePath.replace(/\//g, '_');
    try {
      const data = await db.readJSON(key);
      if (data && data.length > 0) {
        questionCache.set(filePath, data);
        loaded++;
        console.log('[cache] Preloaded from Supabase:', filePath, `(${data.length} questions)`);
      }
    } catch(e) {
      console.error('[cache] Preload error:', filePath, e.message);
    }
  }
  if (loaded > 0) console.log(`[cache] Total preloaded: ${loaded} question files`);
}

// 同步缓存 + Supabase 备份（任何题目修改后调用）
async function syncQuestionCache(filePath, questions) {
  questionCache.set(filePath, questions);
  const key = 'question_file_' + filePath.replace(/\//g, '_');
  await db.writeJSON(key, questions);
  console.log('[cache] Synced to Supabase:', filePath, `(${questions.length} questions)`);
}

// 保存题库到 Supabase（导入时调用）
async function saveQuestionsToSupabase(filePath) {
  const questions = loadQuestions(filePath);
  if (questions.length === 0) return;
  questionCache.set(filePath, questions);
  const key = 'question_file_' + filePath.replace(/\//g, '_');
  await db.writeJSON(key, questions);
  console.log('[questions] Saved to Supabase:', filePath, `(${questions.length} questions)`);
}

function readQuestionFile(exam) {
  const fullPath = path.join(__dirname, 'questions', exam.questionFile);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

function writeQuestionFile(exam, content) {
  const fullPath = path.join(__dirname, 'questions', exam.questionFile);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

// ===== 考试配置 =====
const EXAM_CONFIGS = {
  newbie: [
    { id: 'w1d1', title: 'W1-D1 诺瓦公司+LED行业+基础知识', panel: 'newbie', week: 1, day: 1, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d2', title: 'W1-D2 信号源+控制系统+接收卡/发送卡', panel: 'newbie', week: 1, day: 2, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d3', title: 'W1-D3 LED方案+V系列+H系列', panel: 'newbie', week: 1, day: 3, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d4', title: 'W1-D4 TB系列+TU系列+一体机+配件+GTS', panel: 'newbie', week: 1, day: 4, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1week', title: 'W1-Week 诺瓦知识串讲+周考', panel: 'newbie', week: 1, day: 5, brand: '诺瓦', duration: 60, questionFile: 'newbie/week1.js', totalQuestions: 25, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d1', title: 'W2-D1 嗨动公司+LCD行业+拼接方案', panel: 'newbie', week: 2, day: 1, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d2', title: 'W2-D2 E系列+B系列+EMX+矩阵+DT分配器', panel: 'newbie', week: 2, day: 2, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d3', title: 'W2-D3 NVDS解码+传输配件+音频基础', panel: 'newbie', week: 2, day: 3, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d4', title: 'W2-D4 天韵+奥菲斯+音频处理器+选型', panel: 'newbie', week: 2, day: 4, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 20, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2week', title: 'W2-Week 嗨动知识串讲+周考', panel: 'newbie', week: 2, day: 5, brand: '嗨动', duration: 60, questionFile: 'newbie/week2.js', totalQuestions: 25, replaceCount: 5, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
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
  ],
  client: [
    { id: 'client_nova_led', title: '诺瓦 LED控制系统', panel: 'client', brand: '诺瓦', duration: 40, questionFile: 'client/nova_led.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_nova_video', title: '诺瓦 视频拼接处理器', panel: 'client', brand: '诺瓦', duration: 40, questionFile: 'client/nova_video.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_nova_integration', title: '诺瓦 整机方案与配件', panel: 'client', brand: '诺瓦', duration: 40, questionFile: 'client/nova_integration.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_video', title: '嗨动 视频拼接与矩阵', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_video.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_distributed', title: '嗨动 分布式与中控', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_distributed.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_audio', title: '嗨动 音频扩声系统', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_audio.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_multimedia', title: '嗨动 多媒体与会议', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_multimedia.js', totalQuestions: 20, replaceCount: 6, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_comprehensive', title: '全系列产品综合考核', panel: 'client', brand: '综合', duration: 60, questionFile: 'client/comprehensive.js', totalQuestions: 25, replaceCount: 8, distribution: { single: 12, multiple: 5, judge: 5, short: 3 } },
  ],
  training: [
    { id: 'tr_lcd',   title: 'LCD液晶拼接', panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/lcd.js',   totalQuestions: 18, replaceCount: 3, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_media', title: '媒体服务器',   panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/media.js', totalQuestions: 18, replaceCount: 3, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_audio', title: '音频系统',     panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/audio.js', totalQuestions: 18, replaceCount: 3, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_ctrl',  title: '中控系统',     panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/ctrl.js',  totalQuestions: 18, replaceCount: 3, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_viz',   title: '可视化系统',   panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/viz.js',   totalQuestions: 18, replaceCount: 3, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
  ]
};

// ===== Fisher-Yates 洗牌 =====
async function getAllExams() {
  const all = [];
  for (const panel of ['newbie', 'tech', 'sales', 'client', 'training']) {
    for (const exam of (EXAM_CONFIGS[panel] || [])) all.push({ ...exam });
  }
  const config = await getModuleConfig();
  const meta = await db.readObj('new_product_meta.json');
  // Fixed modules with bank assignments
  for (const [moduleId, mod] of Object.entries(config.fixedModules || {})) {
    if (moduleId === 'newbie' || moduleId === 'tech' || moduleId === 'sales' || moduleId === 'client' || moduleId === 'training') continue;
    for (const bankId of (mod.bankIds || [])) {
      const m = meta[bankId];
      if (m) all.push({
        id: m.id, title: m.title, panel: moduleId, brand: m.brand || '新品',
        duration: 40, questionFile: m.questionFile, totalQuestions: 18, replaceCount: 5,
        distribution: m.distribution || { single: 8, multiple: 5, judge: 4, short: 1 }
      });
    }
  }
  // Custom modules
  for (const [moduleId, mod] of Object.entries(config.customModules || {})) {
    for (const bankId of (mod.bankIds || [])) {
      const m = meta[bankId];
      if (m) all.push({
        id: m.id, title: m.title, panel: moduleId, brand: m.brand || '新品',
        duration: 40, questionFile: m.questionFile, totalQuestions: 18, replaceCount: 5,
        distribution: m.distribution || { single: 8, multiple: 5, judge: 4, short: 1 }
      });
    }
  }
  return all;
}

async function getAllPanels() {
  const panels = ['newbie', 'tech', 'sales', 'client', 'training'];
  const config = await getModuleConfig();
  const meta = await db.readObj('new_product_meta.json');
  for (const [moduleId, mod] of Object.entries(config.fixedModules || {})) {
    if (moduleId === 'newbie' || moduleId === 'tech' || moduleId === 'sales' || moduleId === 'client' || moduleId === 'training') continue;
    if ((mod.bankIds || []).length > 0) panels.push(moduleId);
  }
  for (const [moduleId, mod] of Object.entries(config.customModules || {})) {
    if ((mod.bankIds || []).length > 0) panels.push(moduleId);
  }
  return panels;
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

function pickQuestions(bank, config, examId) {
  const dist = config.distribution;
  const totalNeed = config.totalQuestions || Object.values(dist).reduce((a,b)=>a+b, 0);
  const replaceCount = config.replaceCount || 0;
  const result = [];
  
  // 过滤该考试专属题目
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
  
  // 全量题库（用于补充替换题目）
  const fullByType = { single: [], multiple: [], judge: [], short: [] };
  for (const q of bank) {
    const t = q.type || 'single';
    if (fullByType[t]) fullByType[t].push(q);
  }
  
  // 已选题目的 ID 集合（防止重复）
  const pickedIds = new Set();
  
  for (const type of TYPE_ORDER) {
    const need = dist[type] || 0;
    const typePool = byType[type] || [];
    const fullTypePool = fullByType[type] || [];
    
    if (typePool.length === 0) continue;
    
    // 第一步：从过滤池中随机选 need 题
    const shuffled = shuffle(typePool);
    const picked = shuffled.slice(0, Math.min(need, shuffled.length));
    for (const q of picked) pickedIds.add(q.id);
    
    // 第二步：如果有 replaceCount，从全量题库中随机替换部分题目
    if (replaceCount > 0 && fullTypePool.length > need) {
      const replaceRatio = need / totalNeed; // 按比例分配替换名额
      const toReplace = Math.max(1, Math.round(replaceCount * replaceRatio));
      const replaceCountForType = Math.min(toReplace, picked.length);
      
      // 从未被选中的全量题库中随机抽替换题
      const candidates = shuffle(fullTypePool.filter(q => !pickedIds.has(q.id)));
      const replacements = candidates.slice(0, replaceCountForType);
      
      // 执行替换：随机替换掉 picked 中的部分题目
      const replaceIndices = shuffle([...Array(picked.length).keys()]).slice(0, replacements.length);
      for (let i = 0; i < replacements.length && i < replaceIndices.length; i++) {
        const oldId = picked[replaceIndices[i]].id;
        pickedIds.delete(oldId);
        picked[replaceIndices[i]] = replacements[i];
        pickedIds.add(replacements[i].id);
      }
    }
    
    for (const q of picked) result.push({ ...q, _type: type });
  }
  if (result.length < config.totalQuestions) {
    const existingIds = new Set(result.map(q => q.id));
    const poolShuffled = shuffle(pool);
    for (const q of poolShuffled) {
      if (result.length >= config.totalQuestions) break;
      if (!existingIds.has(q.id)) { result.push({ ...q, _type: q.type || 'single' }); existingIds.add(q.id); }
    }
    if (result.length < config.totalQuestions) {
      const allShuffled = shuffle(bank);
      for (const q of allShuffled) {
        if (result.length >= config.totalQuestions) break;
        if (!existingIds.has(q.id)) { result.push({ ...q, _type: q.type || 'single' }); existingIds.add(q.id); }
      }
    }
  }
  result.sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a._type || a.type);
    const bi = TYPE_ORDER.indexOf(b._type || b.type);
    return ai - bi;
  });
  const TYPE_WEIGHT = { single: 3, multiple: 5, judge: 4, short: 8 };
  let totalWeight = 0;
  for (const q of result) totalWeight += TYPE_WEIGHT[q._type || q.type] || 3;
  const scale = totalWeight > 0 ? 100 / totalWeight : 1;
  for (const q of result) {
    const w = TYPE_WEIGHT[q._type || q.type] || 3;
    q.points = Math.round(w * scale);
  }
  const currentTotal = result.reduce((s, q) => s + q.points, 0);
  if (result.length > 0 && currentTotal !== 100) result[result.length - 1].points += (100 - currentTotal);
  return result;
}

function gradeShortAnswer(answer, keywords, maxPoints) {
  if (!answer || !keywords) return 0;
  const ans = answer.toLowerCase();
  const kwList = keywords.split(/[,，、]/).map(k => k.trim().toLowerCase()).filter(Boolean);
  if (kwList.length === 0) return 0;
  let matched = 0;
  for (const kw of kwList) { if (ans.includes(kw)) matched++; }
  const pts = maxPoints || 10;
  return Math.round((matched / kwList.length) * pts);
}

// ===== 面板中文名 =====
const PANEL_LABELS = { newbie: '新人专项', tech: '技术进阶', sales: '销售进阶', client: '客户端考核', new_product: '新品考核' };

// ====== API 路由 ======

// 健康检查
app.get('/api/health', async (req, res) => {
  res.json({ success: true, time: new Date().toISOString(), version: '2.2', panels: await getAllPanels() });
});

// ===== 用户认证 API =====

// 学员注册
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: '请填写用户名、密码和姓名' });
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名需2-20个字符' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少4位' });
  
  let result = null;
  let conflict = false;
  await db.withLock('users.json', async () => {
    const users = await db.readObjRaw('users.json');
    if (users[username]) { conflict = true; return; }
    const token = generateToken();
    users[username] = {
      username, name: name.trim(),
      password: hashPassword(password),
      role: 'student',
      token,
      createdAt: new Date().toISOString()
    };
    await db.writeRaw('users.json', users);
    result = { username, name: name.trim(), role: 'student', token };
  });
  if (conflict) return res.status(400).json({ error: '用户名已存在' });
  res.json({ success: true, user: result });
});

// 学员登录
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
  
  const users = await db.readObjRaw('users.json');
  const user = users[username];
  if (!user) return res.status(401).json({ error: '用户名不存在' });
  if (user.password !== hashPassword(password)) return res.status(401).json({ error: '密码错误' });
  
  const token = generateToken();
  user.token = token;
  users[username] = user;
  await db.writeRaw('users.json', users);
  
  res.json({ success: true, user: { username: user.username, name: user.name, role: user.role, token } });
});

// 获取当前用户信息
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { password, ...safe } = req.currentUser;
  res.json({ success: true, user: safe });
});

// 修改密码
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '参数不完整' });
  if (newPassword.length < 4) return res.status(400).json({ error: '新密码至少4位' });
  
  const users = await db.readObj('users.json');
  const user = users[req.currentUser.username];
  if (user.password !== hashPassword(oldPassword)) return res.status(400).json({ error: '原密码错误' });
  
  user.password = hashPassword(newPassword);
  users[req.currentUser.username] = user;
  await db.writeObj('users.json', users);
  res.json({ success: true });
});

// ===== 管理员 API =====

// 管理员创建导师账号
app.post('/api/admin/mentors', adminAuth, async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: '参数不完整' });
  
  const users = await db.readObj('users.json');
  if (users[username]) return res.status(400).json({ error: '用户名已存在' });
  
  users[username] = {
    username, name: name.trim(),
    password: hashPassword(password),
    role: 'mentor',
    createdAt: new Date().toISOString()
  };
  await db.writeObj('users.json', users);
  res.json({ success: true, user: { username, name: name.trim(), role: 'mentor' } });
});

// 管理员获取所有用户列表
app.get('/api/admin/users', adminAuth, async (req, res) => {
  const users = await db.readObj('users.json');
  const list = Object.values(users)
    .filter(u => u.username && u.role)
    .map(u => ({ username: u.username, name: u.name, role: u.role, createdAt: u.createdAt }));
  const mentors = await db.readObj('mentors.json');
  // 附加导师-学员关系
  for (const u of list) {
    if (u.role === 'mentor') {
      u.assignedStudents = (mentors[u.username] || []);
    }
    if (u.role === 'student') {
      // 找到该学员被分配给哪个导师
      for (const [mname, students] of Object.entries(mentors)) {
        if (students.includes(u.username)) {
          u.assignedMentor = mname;
          break;
        }
      }
    }
  }
  res.json({ success: true, users: list });
});

// 管理员删除用户
app.delete('/api/admin/users/:username', adminAuth, async (req, res) => {
  if (req.params.username === 'PC') return res.status(400).json({ error: '不能删除超级管理员' });
  const users = await db.readObj('users.json');
  if (!users[req.params.username]) return res.status(404).json({ error: '用户不存在' });
  delete users[req.params.username];
  await db.writeObj('users.json', users);
  res.json({ success: true });
});

// 管理员重置用户密码
app.put('/api/admin/users/:username/reset-password', adminAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '新密码至少4位' });
  const users = await db.readObj('users.json');
  if (!users[req.params.username]) return res.status(404).json({ error: '用户不存在' });
  users[req.params.username].password = hashPassword(newPassword);
  await db.writeObj('users.json', users);
  res.json({ success: true });
});

// 管理员分配学员给导师
app.post('/api/admin/assign', adminAuth, async (req, res) => {
  const { mentorUsername, studentUsernames } = req.body;
  if (!mentorUsername || !studentUsernames || !Array.isArray(studentUsernames)) {
    return res.status(400).json({ error: '参数不完整' });
  }
  const users = await db.readObj('users.json');
  if (!users[mentorUsername] || users[mentorUsername].role !== 'mentor') {
    return res.status(400).json({ error: '导师不存在' });
  }
  const mentors = await db.readObj('mentors.json');
  mentors[mentorUsername] = studentUsernames.filter(s => users[s]);
  await db.writeObj('mentors.json', mentors);
  res.json({ success: true, assigned: mentors[mentorUsername] });
});

// 管理员获取导师-学员分配关系
app.get('/api/admin/assignments', adminAuth, async (req, res) => {
  const mentors = await db.readObj('mentors.json');
  const users = await db.readObj('users.json');
  const list = [];
  for (const [mentor, students] of Object.entries(mentors)) {
    const mentorInfo = users[mentor];
    list.push({
      mentor: { username: mentor, name: mentorInfo ? mentorInfo.name : mentor },
      students: students.map(s => {
        const u = users[s];
        return { username: s, name: u ? u.name : s };
      })
    });
  }
  res.json({ success: true, assignments: list });
});

// ===== 导师自主分配学员 =====
// 导师获取所有学员 + 自己的分配关系（管理员也可用）
app.get('/api/mentor/assignments', mentorAuth, async (req, res) => {
  const users = await db.readObj('users.json');
  const mentors = await db.readObj('mentors.json');
  const students = Object.values(users)
    .filter(u => u.role === 'student')
    .map(u => ({ username: u.username, name: u.name }));
  const assigned = (mentors[req.currentUser.username] || []).filter(s => users[s]);
  res.json({ success: true, students, assigned });
});

// 导师保存自己的学员分配（只允许修改自己的分配，不影响他人）
app.post('/api/mentor/assign', mentorAuth, async (req, res) => {
  const { studentUsernames } = req.body;
  if (!studentUsernames || !Array.isArray(studentUsernames)) {
    return res.status(400).json({ error: '参数不完整' });
  }
  const users = await db.readObj('users.json');
  const mentors = await db.readObj('mentors.json');
  const valid = studentUsernames.filter(s => users[s] && users[s].role === 'student');
  mentors[req.currentUser.username] = valid;
  await db.writeObj('mentors.json', mentors);
  res.json({ success: true, assigned: valid });
});

// ===== 排行榜（只读，学员/导师/管理员均可查看） =====
// 积分规则：每场考试取最高分，>=90 得3分，80-89 得2分，<80 得1分
// 徽章规则：满分学霸(100分) / 高分达人(>=95) / 首战告捷(首次通过) / 稳定发挥(通过>=3场) / 多面手(>=3个板块)
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  const records = await db.readJSON('records.json');
  const users = await db.readObj('users.json');
  const panels = await getAllPanels();
  const config = await getModuleConfig();

  // 面板名称：优先内置映射，其次模块配置
  function panelName(id){
    if (PANEL_LABELS[id]) return PANEL_LABELS[id];
    const mod = (config.fixedModules || {})[id] || (config.customModules || {})[id];
    return mod ? mod.name : id;
  }

  // 按学生分组，每场考试(panel+examId)取最高分
  const studentMap = {};
  for (const r of records) {
    const name = r.studentName;
    if (!studentMap[name]) studentMap[name] = { records: [], exams: {} };
    studentMap[name].records.push(r);
    const key = `${r.panel || 'newbie'}|${r.examId}`;
    const score = r.finalScore !== undefined ? r.finalScore : (r.autoScore !== undefined ? r.autoScore : 0);
    if (!studentMap[name].exams[key] || score > studentMap[name].exams[key].score) {
      studentMap[name].exams[key] = { score, panel: r.panel || 'newbie', passed: r.passed, examId: r.examId, submitTime: r.submitTime };
    }
  }

  const leaderboard = [];
  for (const [name, data] of Object.entries(studentMap)) {
    // 按姓名反查角色（防止测试账号/管理员误入学员榜）
    const byName = Object.values(users).find(u => u.name === name);
    const role = byName ? byName.role : (users[name] ? users[name].role : 'student');
    if (role !== 'student') continue;

    const examScores = Object.values(data.exams);
    let totalPoints = 0;
    let passedCount = 0;
    let bestScore = 0;
    const panelBest = {};
    for (const e of examScores) {
      const pts = e.score >= 90 ? 3 : (e.score >= 80 ? 2 : 1);
      totalPoints += pts;
      if (e.passed) passedCount++;
      if (e.score > bestScore) bestScore = e.score;
      const p = e.panel;
      if (!panelBest[p] || e.score > panelBest[p]) panelBest[p] = e.score;
    }

    // 徽章计算
    const badges = [];
    if (bestScore >= 100) badges.push({ id: 'perfect', icon: '🏆', name: '满分学霸', desc: '单场考试拿到100分' });
    if (bestScore >= 95) badges.push({ id: 'high', icon: '💯', name: '高分达人', desc: '单场考试95分以上' });
    const firstRecord = data.records.sort((a,b) => new Date(a.submitTime) - new Date(b.submitTime))[0];
    if (firstRecord && (firstRecord.finalScore !== undefined ? firstRecord.finalScore : firstRecord.autoScore) >= PASSING_SCORE) {
      badges.push({ id: 'firstwin', icon: '🚀', name: '首战告捷', desc: '第一次答题即通过' });
    }
    if (passedCount >= 3) badges.push({ id: 'steady', icon: '🌟', name: '稳定发挥', desc: '3场以上考试通过' });
    if (Object.keys(panelBest).length >= 3) badges.push({ id: 'versatile', icon: '🎯', name: '多面手', desc: '在3个以上板块有记录' });

    leaderboard.push({
      name,
      totalPoints,
      passedCount,
      bestScore,
      examCount: examScores.length,
      badges,
      panelBest
    });
  }

  leaderboard.sort((a,b) => b.totalPoints - a.totalPoints || b.bestScore - a.bestScore);

  res.json({
    success: true,
    leaderboard,
    panels: panels.map(p => ({ id: p, name: panelName(p) })),
    rule: '每场考试取最高分计积分：≥90分+3分，80-89分+2分，80分以下+1分；徽章为达标自动解锁'
  });
});

// ===== 考试配置 API =====

app.get('/api/exams', async (req, res) => {
  const panel = req.query.panel;
  if (panel && EXAM_CONFIGS[panel]) {
    return res.json({ success: true, exams: EXAM_CONFIGS[panel] });
  }
  if (panel) {
    const config = await getModuleConfig();
    const mod = (config.fixedModules || {})[panel] || (config.customModules || {})[panel];
    if (mod) {
      const meta = await db.readObj('new_product_meta.json');
      const exams = (mod.bankIds || []).map(bankId => {
        const m = meta[bankId];
        if (!m) return null;
        return {
          id: m.id, title: m.title, panel, brand: m.brand || '新品',
          duration: 40, questionFile: m.questionFile, totalQuestions: 18, replaceCount: 5,
          distribution: m.distribution || { single: 8, multiple: 5, judge: 4, short: 1 }
        };
      }).filter(Boolean);
      return res.json({ success: true, exams });
    }
    return res.json({ success: true, exams: [] });
  }
  res.json({ success: true, exams: await getAllExams(), panels: await getAllPanels() });
});

app.get('/api/exams/:id', async (req, res) => {
  const exam = (await getAllExams()).find(e => e.id === req.params.id);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  res.json({ success: true, exam });
});

// ===== 学员答题 API =====

app.get('/api/records/:studentName', async (req, res) => {
  const records = await db.readJSON('records.json');
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
  res.json({ success: true, records: studentRecords });
});

app.get('/api/attempts/:studentName', async (req, res) => {
  const records = await db.readJSON('records.json');
  const attempts = {};
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
  for (const r of studentRecords) attempts[r.examId] = (attempts[r.examId] || 0) + 1;
  res.json({ success: true, attempts, maxAttempts: MAX_ATTEMPTS });
});

app.post('/api/start-exam', async (req, res) => {
  const { studentName, examId } = req.body;
  if (!studentName || !examId) return res.status(400).json({ error: '参数不完整' });
  
  const exam = (await getAllExams()).find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  
  const records = await db.readJSON('records.json');
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
      bestRecord: bestRecord ? { id: bestRecord.id, score: bestRecord.finalScore !== undefined ? bestRecord.finalScore : bestRecord.autoScore, passed: bestRecord.passed, submitTime: bestRecord.submitTime } : null
    });
  }
  
  const bank = loadQuestions(exam.questionFile);
  if (bank.length === 0) return res.status(500).json({ error: '题库加载失败，请联系管理员' });
  
  let questions;
  if (exam.distribution) {
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

app.post('/api/records', async (req, res) => {
  const record = req.body;
  if (!record.studentName || !record.examId) return res.status(400).json({ error: '数据不完整' });
  
  // 整段「读-改-写」加锁：防止多人同时提交时互相覆盖丢记录
  let savedRecord = null;
  let dupResult = null;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');
    
    if (record.id) {
      const dupId = records.find(r => r.id === record.id);
      if (dupId) { console.log('[dedup] ID duplicate'); dupResult = { record: dupId, deduped: true }; return; }
    }
    
    const dupTime = records.find(r =>
      r.studentName === record.studentName && r.examId === record.examId &&
      Math.abs(new Date(r.submitTime).getTime() - new Date(record.submitTime).getTime()) < 5000
    );
    if (dupTime) { console.log('[dedup] Time duplicate'); dupResult = { record: dupTime, deduped: true }; return; }
    
    const questions = record.questions || [];
    let autoScore = 0;
    const questionScores = {};
    const typeScores = { single: { score: 0, max: 0 }, multiple: { score: 0, max: 0 }, judge: { score: 0, max: 0 }, short: { score: 0, max: 0 } };
    
    // 归一化答案格式：数组→排序字符串，布尔→A/B，字符串→原样
    function normalizeAns(ans) {
      if (ans === null || ans === undefined) return '';
      if (Array.isArray(ans)) return ans.map(String).sort().join('');
      if (typeof ans === 'boolean') return ans ? 'A' : 'B';
      return String(ans);
    }
    
    for (const q of questions) {
      const qType = q.type || q._type || 'single';
      const points = q.points || 5;
      const userAnswer = (record.answers || {})[q.id];
      let score = 0;
      if (qType === 'single' || qType === 'judge') {
        score = (normalizeAns(userAnswer) === normalizeAns(q.answer)) ? points : 0;
      } else if (qType === 'multiple') {
        score = (normalizeAns(userAnswer) === normalizeAns(q.answer)) ? points : 0;
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
    await db.writeRaw('records.json', records);
    savedRecord = record;
  });
  
  if (dupResult) return res.json({ success: true, ...dupResult });
  if (savedRecord) {
    console.log('[records] New:', savedRecord.studentName, savedRecord.examId, 'score:', savedRecord.autoScore);
    return res.json({ success: true, record: savedRecord });
  }
  res.status(500).json({ error: '提交失败，请重试' });
});

// ===== 导师/管理员 API =====

// 获取可查看的学员列表（导师只看自己分配的学员，管理员看全部）
app.get('/api/mentor/students', mentorAuth, async (req, res) => {
  const users = await db.readObj('users.json');
  const mentors = await db.readObj('mentors.json');
  let students;
  if (req.currentUser.role === 'admin') {
    students = Object.values(users).filter(u => u.role === 'student').map(u => ({ username: u.username, name: u.name }));
  } else {
    const assigned = mentors[req.currentUser.username] || [];
    students = assigned.map(s => {
      const u = users[s];
      return { username: s, name: u ? u.name : s };
    });
  }
  res.json({ success: true, students });
});

// 获取答题记录（导师看自己学员的，管理员看全部）
app.get('/api/mentor/records', mentorAuth, async (req, res) => {
  const records = await db.readJSON('records.json');
  const { search, panel, student } = req.query;
  let filtered = records;
  
  if (req.currentUser.role !== 'admin') {
    const mentors = await db.readObj('mentors.json');
    const assigned = mentors[req.currentUser.username] || [];
    const assignedNames = new Set();
    for (const s of assigned) {
      const users = await db.readObj('users.json');
      const u = users[s];
      if (u) assignedNames.add(u.name);
    }
    filtered = filtered.filter(r => assignedNames.has(r.studentName));
  }
  
  if (panel && panel !== 'all') filtered = filtered.filter(r => r.panel === panel);
  if (student) filtered = filtered.filter(r => r.studentName.includes(student));
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(r => r.studentName.toLowerCase().includes(s) || r.examId.toLowerCase().includes(s));
  }
  
  res.json({ success: true, records: filtered, total: filtered.length });
});

// 导出 CSV
app.get('/api/mentor/records/export', mentorAuth, async (req, res) => {
  const records = await db.readJSON('records.json');
  let filtered = records;
  
  if (req.currentUser.role !== 'admin') {
    const mentors = await db.readObj('mentors.json');
    const assigned = mentors[req.currentUser.username] || [];
    const users = await db.readObj('users.json');
    const assignedNames = new Set(assigned.map(s => { const u = users[s]; return u ? u.name : s; }));
    filtered = filtered.filter(r => assignedNames.has(r.studentName));
  }
  
  if (req.query.panel && req.query.panel !== 'all') filtered = filtered.filter(r => r.panel === req.query.panel);
  if (req.query.student) filtered = filtered.filter(r => r.studentName.includes(req.query.student));
  
  const panelLabels = PANEL_LABELS;
  const rows = [['学员姓名', '板块', '考试ID', '考试标题', '自动评分', '导师评分', '最终得分', '是否通过', '是否已评', '答题次数', '提交时间', '用时(秒)']];
  for (const r of filtered) {
    const exam = (await getAllExams()).find(e => e.id === r.examId);
    rows.push([
      r.studentName,
      panelLabels[r.panel] || r.panel || '',
      r.examId,
      exam ? exam.title : r.examId,
      r.autoScore || 0,
      r.mentorScore !== undefined && r.mentorScore !== null ? r.mentorScore : '',
      r.finalScore !== undefined ? r.finalScore : r.autoScore,
      r.passed ? '是' : '否',
      r.mentorScored ? '是' : '否',
      r.attemptNumber || 1,
      r.submitTime || '',
      r.timeSpent || ''
    ]);
  }
  
  const csv = rows.map(row => row.map(c => {
    const s = String(c);
    return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  
  // 添加 BOM 支持中文
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename=quiz_records.csv');
  res.send('\uFEFF' + csv);
});

// 学生查看自己的答题记录
app.get('/api/student/records', authMiddleware, async (req, res) => {
  const records = await db.readJSON('records.json');
  const studentName = req.currentUser.name;
  const filtered = records.filter(r => r.studentName === studentName);
  // 按时间倒序
  filtered.sort((a, b) => new Date(b.submitTime || 0).getTime() - new Date(a.submitTime || 0).getTime());
  res.json({ success: true, records: filtered, total: filtered.length });
});

app.get('/api/mentor/records/:id', mentorAuth, async (req, res) => {
  const records = await db.readJSON('records.json');
  const record = records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, record });
});

app.put('/api/mentor/records/:id/score', mentorAuth, async (req, res) => {
  const { mentorScore, finalScore, passed, mentorScored, mentorScoreDetails, questionScores, typeScores } = req.body;
  let saved = null;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');
    const idx = records.findIndex(r => r.id === req.params.id);
    if (idx < 0) return;
    if (mentorScore !== undefined) records[idx].mentorScore = mentorScore;
    if (finalScore !== undefined) records[idx].finalScore = finalScore;
    if (passed !== undefined) records[idx].passed = passed;
    if (mentorScored !== undefined) records[idx].mentorScored = mentorScored;
    if (mentorScoreDetails !== undefined) records[idx].mentorScoreDetails = mentorScoreDetails;
    if (questionScores !== undefined) records[idx].questionScores = questionScores;
    if (typeScores !== undefined) records[idx].typeScores = typeScores;
    await db.writeRaw('records.json', records);
    saved = records[idx];
  });
  if (!saved) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, record: saved });
});

app.delete('/api/mentor/records/:id/score', mentorAuth, async (req, res) => {
  let saved = null;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');
    const idx = records.findIndex(r => r.id === req.params.id);
    if (idx < 0) return;
    records[idx].mentorScore = null;
    records[idx].finalScore = records[idx].autoScore;
    records[idx].passed = records[idx].autoScore >= PASSING_SCORE;
    records[idx].mentorScored = false;
    records[idx].mentorScoreDetails = null;
    await db.writeRaw('records.json', records);
    saved = records[idx];
  });
  if (!saved) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, record: saved });
});

app.delete('/api/mentor/records/:id', mentorAuth, async (req, res) => {
  let deleted = null;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');
    const idx = records.findIndex(r => r.id === req.params.id);
    if (idx < 0) return;
    deleted = records.splice(idx, 1)[0];
    await db.writeRaw('records.json', records);
  });
  if (!deleted) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, deleted });
});

app.delete('/api/mentor/records', mentorAuth, async (req, res) => {
  let count = 0;
  await db.withLock('records.json', async () => {
    count = (await db.readJSONRaw('records.json')).length;
    await db.writeRaw('records.json', []);
  });
  res.json({ success: true, deletedCount: count });
});

// ===== 题库管理 =====

app.get('/api/mentor/questions', mentorAuth, async (req, res) => {
  const panel = req.query.panel || 'all';
  const allQuestions = {};
  const searchPanels = panel === 'all' ? await getAllPanels() : [panel];
  const allExams = await getAllExams();
  for (const p of searchPanels) {
    allQuestions[p] = [];
    const exams = allExams.filter(e => e.panel === p);
    for (const exam of exams) {
      allQuestions[p].push({
        examId: exam.id, title: exam.title, panel: p,
        questions: loadQuestions(exam.questionFile)
      });
    }
  }
  res.json({ success: true, questions: allQuestions, exams: allExams });
});

app.put('/api/mentor/questions/:examId/:questionId', mentorAuth, async (req, res) => {
  const { examId, questionId } = req.params;
  const updated = req.body;
  const exam = (await getAllExams()).find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  const questions = loadQuestions(exam.questionFile);
  const idx = questions.findIndex(q => q.id === questionId);
  if (idx < 0) return res.status(404).json({ error: '题目不存在' });
  Object.assign(questions[idx], updated);
  const varName = 'QUESTIONS_' + examId;
  const content = `// ${exam.title} - 题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  writeQuestionFile(exam, content);
  await syncQuestionCache(exam.questionFile, questions); // 同步到 Supabase
  res.json({ success: true, question: questions[idx] });
});

app.post('/api/mentor/questions/:examId', mentorAuth, async (req, res) => {
  const { examId } = req.params;
  const newQ = req.body;
  const exam = (await getAllExams()).find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  if (!newQ.id) newQ.id = examId + '_q' + Date.now();
  if (!newQ.points) newQ.points = 5;
  const questions = loadQuestions(exam.questionFile);
  questions.push(newQ);
  const varName = 'QUESTIONS_' + examId;
  const content = `// ${exam.title} - 题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  writeQuestionFile(exam, content);
  await syncQuestionCache(exam.questionFile, questions); // 同步到 Supabase
  res.json({ success: true, question: newQ });
});

app.delete('/api/mentor/questions/:examId/:questionId', mentorAuth, async (req, res) => {
  const { examId, questionId } = req.params;
  const exam = (await getAllExams()).find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  const questions = loadQuestions(exam.questionFile);
  const idx = questions.findIndex(q => q.id === questionId);
  if (idx < 0) return res.status(404).json({ error: '题目不存在' });
  const deleted = questions.splice(idx, 1)[0];
  const varName = 'QUESTIONS_' + examId;
  const content = `// ${exam.title} - 题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  writeQuestionFile(exam, content);
  await syncQuestionCache(exam.questionFile, questions); // 同步到 Supabase
  res.json({ success: true, deleted });
});

// ===== 新品日常考核管理 =====

// 获取新品列表（所有登录用户可查看，但只有导师/管理员可管理）
app.get('/api/admin/new-products', authMiddleware, async (req, res) => {
  const meta = await db.readObj('new_product_meta.json');
  res.json({ success: true, products: Object.values(meta) });
});

// 创建新品考核（通过题库模板导入）
app.post('/api/admin/new-products', mentorAuth, async (req, res) => {
  const { title, brand, questions } = req.body;
  if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: '请提供产品名称和题目列表' });
  }
  
  const productId = 'np_' + Date.now();
  const fileName = `new_product/${productId}.js`;
  const filePath = path.join(__dirname, 'questions', fileName);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // 确保每道题有ID
  for (let i = 0; i < questions.length; i++) {
    if (!questions[i].id) questions[i].id = productId + '_q' + (i + 1);
    if (!questions[i].points) questions[i].points = 5;
    if (!questions[i].type) questions[i].type = 'single';
  }
  
  const varName = 'QUESTIONS_' + productId;
  const content = `// ${title} - 新品题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  
  const meta = await db.readObj('new_product_meta.json');
  meta[productId] = {
    id: productId, title, brand: brand || '新品',
    questionFile: fileName, questionCount: questions.length,
    distribution: { single: 8, multiple: 5, judge: 4, short: 1 },
    createdAt: new Date().toISOString()
  };
  await db.writeObj('new_product_meta.json', meta);
  
  res.json({ success: true, product: meta[productId], questionCount: questions.length });
});

// 删除产品题库
app.delete('/api/admin/new-products/:productId', mentorAuth, async (req, res) => {
  const meta = await db.readObj('new_product_meta.json');
  if (!meta[req.params.productId]) return res.status(404).json({ error: '新品不存在' });
  const product = meta[req.params.productId];
  // 删除题库文件
  const filePath = path.join(__dirname, 'questions', product.questionFile);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  delete meta[req.params.productId];
  await db.writeObj('new_product_meta.json', meta);
  res.json({ success: true });
});

// 下载题库模板（Excel格式）
app.get('/api/admin/question-template', mentorAuth, async (req, res) => {
  const format = req.query.format || 'xlsx';

  if (format === 'json') {
    // 保留 JSON 格式作为兼容
    const template = {
      title: '产品名称', brand: '诺瓦/嗨动',
      questions: [
        { type: 'single', question: '示例单选题：LED显示屏的像素间距是指？', options: ['A. 两个像素点中心之间的距离', 'B. LED灯珠的直径', 'C. 模组的尺寸', 'D. 箱体的尺寸'], answer: 'A', points: 5, explanation: '像素间距是LED显示屏的核心参数之一' },
        { type: 'multiple', question: '示例多选题：以下哪些是诺瓦的控制系统产品？', options: ['A. V系列', 'B. H系列', 'C. TB系列', 'D. iPhone'], answer: 'ABC', points: 5 },
        { type: 'judge', question: '示例判断题：诺瓦科技成立于2008年。', answer: 'A', points: 5, explanation: 'A=正确，B=错误' },
        { type: 'short', question: '示例简答题：请简述LED显示屏的主要应用场景。', keywords: '广告,舞台,会议,监控,体育', points: 10 }
      ]
    };
    return res.json({ success: true, template });
  }

  // ===== Excel 模板生成 =====
  const wb = XLSX.utils.book_new();

  // ---- Sheet 1: 使用说明 ----
  const instructions = [
    ['诺瓦&嗨动 产品题库导入模板 - 使用说明'],
    [''],
    ['📌 本模板用于批量导入产品考核题目，请按照以下规则填写"题库模板"工作表：'],
    [''],
    ['一、列说明：'],
    ['  题型', '必填。可选值：单选题 / 多选题 / 判断题 / 简答题'],
    ['  题目内容', '必填。题目的完整文字描述'],
    ['  选项A', '单选题、多选题必填。第一个选项的文本'],
    ['  选项B', '单选题、多选题必填。第二个选项的文本'],
    ['  选项C', '单选题、多选题选填。第三个选项的文本'],
    ['  选项D', '单选题、多选题选填。第四个选项的文本'],
    ['  正确答案', '必填。单选题填A/B/C/D；多选题填选项组合如ABC；判断题填"对"或"错"；简答题填参考答案'],
    ['  分值', '必填。默认5分，简答题建议8-10分。系统会自动归一化到100分'],
    ['  答案解析', '选填。对答案的补充说明，学员提交后可查看'],
    ['  关键词', '简答题必填。多个关键词用逗号分隔，用于自动评分匹配'],
    [''],
    ['二、题目类型与数量建议（18题/套）：'],
    ['  单选题（8题）', '只有一个正确答案，学员从A/B/C/D中选一个'],
    ['  多选题（5题）', '有多个正确答案，学员从A/B/C/D中选多个，如"ABC"'],
    ['  判断题（4题）', '只有"对"或"错"两个选项，正确答案填"对"或"错"'],
    ['  简答题（1题）', '学员自由输入文字答案，系统根据关键词自动评分'],
    [''],
    ['三、注意事项：'],
    ['  1. 请勿修改表头行（第1行）'],
    ['  2. 每行一道题目，示例数据可以直接删除'],
    ['  3. 系统会自动为每道题生成唯一ID，无需手动填写'],
    ['  4. 总分值系统会自动归一化到100分，建议18题总分值约90-100分'],
    ['  5. 导入时需填写产品名称和选择品牌'],
    ['  6. 导入后可分配到任意考核模块（新人专项/技术进阶/销售进阶/客户端考核/新品考核）'],
    ['  7. 也可将此模板发给其他AI工具，要求按此格式批量生成题目'],
    [''],
    ['四、模板中的示例数据仅供参考，导入前请删除或替换为实际题目。'],
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInst, '使用说明');

  // ---- Sheet 2: 题库模板 ----
  const headers = ['题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值', '答案解析', '关键词'];
  const sampleData = [
    ['单选题', 'LED显示屏的像素间距是指什么？', 'A. 两个像素点中心之间的距离', 'B. LED灯珠的直径', 'C. 模组的尺寸', 'D. 箱体的尺寸', 'A', 5, '像素间距（Pixel Pitch）是LED显示屏最核心的参数之一，单位是mm，数值越小清晰度越高。'],
    ['单选题', '诺瓦科技成立于哪一年？', 'A. 2006年', 'B. 2008年', 'C. 2010年', 'D. 2012年', 'B', 5, '诺瓦科技（NovaStar）成立于2008年，总部位于西安。'],
    ['多选题', '以下哪些是诺瓦的控制系统产品系列？', 'A. V系列', 'B. H系列', 'C. TB系列', 'D. iPhone系列', 'ABC', 5, 'V系列、H系列、TB系列均为诺瓦控制系统产品线。'],
    ['多选题', 'LED显示屏的主要应用场景包括？', 'A. 户外广告', 'B. 舞台演出', 'C. 会议显示', 'D. 监控指挥', 'ABCD', 5, ''],
    ['判断题', '像素间距越小，LED显示屏的清晰度越高。', '', '', '', '', '对', 5, '像素间距越小意味着单位面积内像素点越多，显示效果越清晰。'],
    ['判断题', '诺瓦科技只做LED控制系统，不做视频拼接处理器。', '', '', '', '', '错', 5, '诺瓦科技产品线包括LED控制系统、视频拼接处理器、整机方案等。'],
    ['简答题', '请简述LED显示屏的主要组成部分。', '', '', '', '', 'LED灯珠,驱动IC,控制系统,电源,箱体结构', 10, ''],
    ['简答题', '请列举诺瓦控制系统在LED显示屏中的主要功能。', '', '', '', '', '亮度调节,色温校准,画面拼接,信号传输,监控管理', 10, ''],
  ];

  const sheetData = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 设置列宽
  ws['!cols'] = [
    { wch: 10 },  // 题型
    { wch: 45 },  // 题目内容
    { wch: 30 },  // 选项A
    { wch: 30 },  // 选项B
    { wch: 30 },  // 选项C
    { wch: 30 },  // 选项D
    { wch: 15 },  // 正确答案
    { wch: 8 },   // 分值
    { wch: 40 },  // 答案解析
    { wch: 30 },  // 关键词
  ];

  XLSX.utils.book_append_sheet(wb, ws, '题库模板');

  // 生成 Buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition', 'attachment; filename="' + encodeURIComponent('产品题库导入模板') + '.xlsx"');
  res.send(buf);
});

// 导入新品题库（支持 Excel .xlsx 和 JSON）
app.post('/api/admin/new-products/import', mentorAuth, upload.single('file'), async (req, res) => {
  const title = req.body.title;
  const brand = req.body.brand || '新品';
  if (!title) return res.status(400).json({ error: '请提供产品名称' });

  let questions = [];

  // 优先处理 Excel 文件上传
  if (req.file) {
    try {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames.find(n => n.includes('模板') || n.includes('题库')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) return res.status(400).json({ error: 'Excel文件中没有数据，请至少填写一行题目' });

      // 找表头行
      let headerRow = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        if (row[0] && (String(row[0]).includes('题型') || row[0] === '题型')) { headerRow = i; break; }
      }
      if (headerRow < 0) return res.status(400).json({ error: '未找到表头行，请保留"题型"表头' });

      const typeMap = {
        '单选题': 'single', '单选': 'single', 'single': 'single',
        '多选题': 'multiple', '多选': 'multiple', 'multiple': 'multiple',
        '判断题': 'judge', '判断': 'judge', 'judge': 'judge',
        '简答题': 'short', '简答': 'short', 'short': 'short',
      };

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const typeRaw = String(row[0] || '').trim();
        const questionText = String(row[1] || '').trim();
        if (!typeRaw || !questionText) continue; // 跳过空行

        const type = typeMap[typeRaw] || 'single';
        const options = [];
        if (row[2]) options.push(String(row[2]).trim());
        if (row[3]) options.push(String(row[3]).trim());
        if (row[4]) options.push(String(row[4]).trim());
        if (row[5]) options.push(String(row[5]).trim());

        let answer = String(row[6] || '').trim();
        // 判断题答案标准化
        if (type === 'judge') {
          if (answer === '对' || answer === '正确' || answer === 'A') answer = 'A';
          else if (answer === '错' || answer === '错误' || answer === 'B') answer = 'B';
        }

        const points = parseInt(row[7]) || 5;
        const explanation = String(row[8] || '').trim();
        const keywords = String(row[9] || '').trim();

        questions.push({
          type, question: questionText,
          options: options.length > 0 ? options : undefined,
          answer, points,
          explanation: explanation || undefined,
          keywords: keywords || undefined,
        });
      }

      if (questions.length === 0) return res.status(400).json({ error: '未解析到有效题目，请检查格式是否正确' });
    } catch (e) {
      console.error('[import] Excel parse error:', e);
      return res.status(400).json({ error: 'Excel文件解析失败：' + e.message });
    }
  }
  // JSON 文本导入
  else if (req.body.jsonData) {
    try {
      const data = JSON.parse(req.body.jsonData);
      if (Array.isArray(data)) questions = data;
      else if (data.questions && Array.isArray(data.questions)) questions = data.questions;
      else return res.status(400).json({ error: 'JSON格式不正确' });
    } catch (e) {
      return res.status(400).json({ error: 'JSON解析失败：' + e.message });
    }
  }
  else {
    return res.status(400).json({ error: '请上传Excel文件或粘贴JSON数据' });
  }

  if (questions.length === 0) return res.status(400).json({ error: '题目列表不能为空' });

  // 创建新品考核
  const productId = 'np_' + Date.now();
  const fileName = `new_product/${productId}.js`;
  const filePath = path.join(__dirname, 'questions', fileName);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < questions.length; i++) {
    if (!questions[i].id) questions[i].id = productId + '_q' + (i + 1);
    if (!questions[i].points) questions[i].points = 5;
    if (!questions[i].type) questions[i].type = 'single';
  }

  const varName = 'QUESTIONS_' + productId;
  const content = `// ${title} - 新品题库\n// 共 ${questions.length} 题\nconst ${varName} = ${JSON.stringify(questions, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
  fs.writeFileSync(filePath, content, 'utf8');

  // 同时保存到 Supabase 作为备份
  await saveQuestionsToSupabase(fileName);

  const meta = await db.readObj('new_product_meta.json');
  meta[productId] = {
    id: productId, title, brand: brand || '新品',
    questionFile: fileName, questionCount: questions.length,
    distribution: { single: 8, multiple: 5, judge: 4, short: 1 },
    createdAt: new Date().toISOString()
  };
  await db.writeObj('new_product_meta.json', meta);

  res.json({ success: true, product: meta[productId], questionCount: questions.length });
});

// ===== 模块管理 API =====

// 获取所有模块和产品题库
app.get('/api/admin/modules', authMiddleware, async (req, res) => {
  const config = await getModuleConfig();
  const meta = await db.readObj('new_product_meta.json');
  res.json({ success: true, fixedModules: config.fixedModules, customModules: config.customModules, products: Object.values(meta) });
});

// 创建自定义模块
app.post('/api/admin/modules', mentorAuth, async (req, res) => {
  const { name, icon, desc } = req.body;
  if (!name) return res.status(400).json({ error: '请提供模块名称' });
  const config = await getModuleConfig();
  const id = 'custom_' + Date.now();
  config.customModules[id] = { id, name, icon: icon || '📋', desc: desc || '', bankIds: [] };
  await db.writeObj('module_config.json', config);
  res.json({ success: true, module: config.customModules[id] });
});

// 删除自定义模块
app.delete('/api/admin/modules/:moduleId', mentorAuth, async (req, res) => {
  const config = await getModuleConfig();
  if (config.customModules[req.params.moduleId]) {
    delete config.customModules[req.params.moduleId];
    await db.writeObj('module_config.json', config);
    return res.json({ success: true });
  }
  res.status(404).json({ error: '模块不存在或不可删除固定模块' });
});

// 更新模块（分配产品题库、修改名称等）
app.put('/api/admin/modules/:moduleId', mentorAuth, async (req, res) => {
  const { bankIds, name, icon, desc } = req.body;
  const config = await getModuleConfig();
  const mod = (config.fixedModules || {})[req.params.moduleId] || (config.customModules || {})[req.params.moduleId];
  if (!mod) return res.status(404).json({ error: '模块不存在' });
  if (bankIds !== undefined) mod.bankIds = bankIds;
  if (name !== undefined) mod.name = name;
  if (icon !== undefined) mod.icon = icon;
  if (desc !== undefined) mod.desc = desc;
  await db.writeObj('module_config.json', config);
  res.json({ success: true, module: mod });
});

// ===== 查缺补漏看板 =====

app.get('/api/mentor/weak-areas', mentorAuth, async (req, res) => {
  const studentName = req.query.student;
  const records = await db.readJSON('records.json');
  let filtered = records;
  
  if (req.currentUser.role !== 'admin') {
    const mentors = await db.readObj('mentors.json');
    const assigned = mentors[req.currentUser.username] || [];
    const users = await db.readObj('users.json');
    const assignedNames = new Set(assigned.map(s => { const u = users[s]; return u ? u.name : s; }));
    filtered = filtered.filter(r => assignedNames.has(r.studentName));
  }
  
  if (studentName) filtered = filtered.filter(r => r.studentName === studentName);
  
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
      if (gotScore < maxScore) {
        se.wrongQuestions++;
        const qType = q.type || 'single';
        se.wrongByType[qType] = (se.wrongByType[qType] || 0) + 1;
        if (!se.wrongByExam[r.examId]) se.wrongByExam[r.examId] = { examId: r.examId, panel: r.panel || 'newbie', wrongCount: 0, wrongQuestions: [] };
        se.wrongByExam[r.examId].wrongCount++;
        se.wrongByExam[r.examId].wrongQuestions.push({
          questionId: q.id, question: q.question, type: qType,
          userAnswer: answers[q.id] || '(未答)', correctAnswer: q.answer || '',
          gotScore, maxScore
        });
      }
    }
  }
  
  const result = Object.values(studentErrors).map(s => ({
    ...s,
    errorRate: s.totalQuestions > 0 ? Math.round(s.wrongQuestions / s.totalQuestions * 100) : 0,
    wrongByExam: Object.values(s.wrongByExam).sort((a, b) => b.wrongCount - a.wrongCount)
  })).sort((a, b) => b.wrongQuestions - a.wrongQuestions);
  
  res.json({ success: true, students: result, totalStudents: result.length });
});

app.get('/api/mentor/weak-areas/:studentName', mentorAuth, async (req, res) => {
  const records = await db.readJSON('records.json');
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
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
        examId: r.examId, panel: r.panel || 'newbie',
        questionId: q.id, question: q.question, type: q.type || 'single',
        userAnswer: answers[q.id] || '(未答)', correctAnswer: q.answer || '',
        gotScore, maxScore, submitTime: r.submitTime
      });
    }
  }
  res.json({ success: true, studentName: req.params.studentName, wrongQuestions: allWrong, totalWrong: allWrong.length });
});

// 重置学员尝试次数
app.post('/api/mentor/reset-attempts', mentorAuth, async (req, res) => {
  const { studentName, examId } = req.body;
  let removedCount = 0;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');
    const remaining = records.filter(r => {
      if (studentName && r.studentName !== studentName) return true;
      if (examId && r.examId !== examId) return true;
      removedCount++;
      return false;
    });
    await db.writeRaw('records.json', remaining);
  });
  res.json({ success: true, removedCount });
});

// ===== 从 Supabase 恢复题库文件（启动时） =====
async function restoreQuestionsFromSupabase() {
  const meta = await db.readObj('new_product_meta.json');
  let restored = 0;
  for (const [productId, product] of Object.entries(meta)) {
    if (!product.questionFile) continue;
    const fullPath = path.join(__dirname, 'questions', product.questionFile);
    const key = 'question_file_' + product.questionFile.replace(/\//g, '_');
    const data = await db.readJSON(key);
    if (data && data.length > 0) {
      // 确保缓存有数据
      if (!questionCache.has(product.questionFile)) {
        questionCache.set(product.questionFile, data);
      }
      if (fs.existsSync(fullPath)) continue; // 文件已存在，跳过
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const varName = 'QUESTIONS_' + productId;
      const content = `// Restored from Supabase\nconst ${varName} = ${JSON.stringify(data, null, 2)};\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${varName};\n}\n`;
      fs.writeFileSync(fullPath, content, 'utf8');
      restored++;
      console.log('[restore] Restored question file:', product.questionFile, `(${data.length} questions)`);
    }
  }
  if (restored > 0) console.log(`[restore] Total restored: ${restored} files`);
}

const PORT = process.env.PORT || 3000;
(async () => {
  await db.init();
  await initSuperAdmin();
  await initModuleConfig();
  await preloadQuestionCache();   // 从 Supabase 预加载题库到内存缓存
  await restoreQuestionsFromSupabase(); // 恢复本地文件
  
  app.listen(PORT, () => {
    console.log(`[server] Quiz System V3 running on port ${PORT}`);
    console.log(`[server] Database: Supabase PostgreSQL (cloud)`);
    console.log(`[server] Passing score: ${PASSING_SCORE}, Max attempts: ${MAX_ATTEMPTS}`);
  });
})().catch(e => {
  console.error('[server] Startup failed:', e);
  process.exit(1);
});
