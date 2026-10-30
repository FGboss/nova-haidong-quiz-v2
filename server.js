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
app.use('/api', (req, res, next) => { recordAccess(req); next(); });
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

// ===== AI 倾向检测（本地多维，可解释，供导师参考） =====
const aiDetect = require('./aiDetect');

// ===== 审计日志（登录记录/操作记录，纯旁路） =====
const auditLog = require('./auditLog');
// 审计埋点：注册在业务路由之前，响应结束时旁路记录，不影响主流程
app.use('/api', auditLog.middleware());

// ===== 访问日志（IP/UA/时间/路径，可追溯爬虫与异常访问） =====
const ACCESS_LOG_KEY = 'access_log.json';
const _accessBuf = [];
async function recordAccess(req) {
  try {
    const ip = req.headers['x-forwarded-for']
      ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
      : (req.ip || (req.socket && req.socket.remoteAddress) || '');
    const ua = String(req.headers['user-agent'] || '').slice(0, 140);
    const tk = req.headers['x-auth-token'];
    let name = '';
    if (tk) {
      try {
        const users = await db.readObj('users.json');
        const u = Object.values(users).find(x => x.token === tk);
        name = u ? (u.name || u.username) : '';
      } catch (e) {}
    }
    _accessBuf.push({
      t: Date.now(), ip: String(ip).slice(0, 60), m: req.method,
      p: String(req.originalUrl || req.url || '').slice(0, 200),
      ua, n: name
    });
    if (_accessBuf.length >= 60) flushAccessLog();
  } catch (e) {}
}
async function flushAccessLog() {
  if (_accessBuf.length === 0) return;
  const batch = _accessBuf.splice(0, _accessBuf.length);
  try {
    await db.withLock(ACCESS_LOG_KEY, async () => {
      let arr = await db.readJSONRaw(ACCESS_LOG_KEY);
      if (!Array.isArray(arr)) arr = [];
      arr.push(...batch);
      if (arr.length > 3000) arr = arr.slice(arr.length - 3000);
      await db.writeRaw(ACCESS_LOG_KEY, arr);
    });
  } catch (e) { console.error('[access-log] flush error:', e.message); }
}
setInterval(() => flushAccessLog(), 10000); // 每 10s 落盘一次

// ===== 防刷限流（内存滑动窗口） =====
const _rate = new Map();
function rateLimit(winMs, max, keyFn) {
  return (req, res, next) => {
    try {
      const key = String(keyFn ? keyFn(req) : (req.ip || ''));
      const now = Date.now();
      const cur = _rate.get(key);
      if (!cur || now - cur.resetAt > winMs) {
        _rate.set(key, { count: 1, resetAt: now + winMs });
        return next();
      }
      cur.count++;
      if (cur.count > max) return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    } catch (e) {}
    next();
  };
}

// ===== 服务端发卷会话（隔离题库答案：start-exam 建会话，submit 用会话取权威题判分） =====
const examSessions = new Map(); // sessionId -> { examId, studentName, questions, createdAt, expiresAt, used }
const SESSION_KEY = 'exam_sessions.json';
let _sessionsLoaded = false;
async function loadExamSessions() {
  if (_sessionsLoaded) return;
  try {
    const obj = await db.readObjRaw(SESSION_KEY);
    const now = Date.now();
    for (const k in obj) {
      const s = obj[k];
      if (s && !s.used && s.expiresAt > now && Array.isArray(s.questions)) examSessions.set(k, s);
    }
  } catch (e) {}
  _sessionsLoaded = true;
}
async function persistExamSessions() {
  const obj = {};
  const now = Date.now();
  for (const [k, s] of examSessions) if (!s.used && s.expiresAt > now) obj[k] = s;
  try {
    await db.withLock(SESSION_KEY, async () => { await db.writeRaw(SESSION_KEY, obj); });
  } catch (e) { console.error('[session] persist error:', e.message); }
}

// ===== 初始化超级管理员 =====
async function initSuperAdmin() {
  const users = await db.readObj('users.json');
  if (!users['PC']) {
    users['PC'] = {
      username: 'PC',
      password: 'password123', // 明文（超管可查看）
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

// ===== 用户信息修改（改名/重置密码） — 带关联数据安全迁移 =====
// 数据关联关系：
//   - records.json（答题记录/排行榜）按「姓名 name」归属（studentName）
//   - mentors.json（导师分配）按「用户名 username」关联（导师键 = 学员数组）
// 因此修改时：
//   - username 变化 → 迁移 users.json 键 + mentors.json 中全部引用（导师键 / 学员数组）
//   - name 变化（学员）→ 迁移 records.json 中 studentName 旧名→新名，历史成绩不丢失
// 加锁顺序固定：users.json → mentors.json → records.json（逐步释放，绝不嵌套交叉，防死锁）
// patch 可选字段：newUsername / name / newPassword（至少一项），改动均为增量。
function applyUserEdit(oldUsername, patch, editor) {
  return new Promise(async (resolve) => {
    try {
      const newUsername = (typeof patch.newUsername === 'string' && patch.newUsername.trim()) ? patch.newUsername.trim() : null;
      const newName = (typeof patch.name === 'string' && patch.name.trim()) ? patch.name.trim() : null;
      const newPassword = (typeof patch.newPassword === 'string' && patch.newPassword) ? patch.newPassword : null;

      if (!newUsername && !newName && !newPassword) return resolve({ error: '没有需要修改的内容', status: 400 });
      if (newUsername !== null && (newUsername.length < 2 || newUsername.length > 20)) return resolve({ error: '用户名需2-20个字符', status: 400 });
      if (newName !== null && newName.length === 0) return resolve({ error: '姓名不能为空', status: 400 });
      if (newPassword !== null && newPassword.length < 4) return resolve({ error: '新密码至少4位', status: 400 });

      // 导师作用域预检：只能改自己名下、且角色为学员的账号
      if (editor.role !== 'admin') {
        const preUsers = await db.readObj('users.json');
        const preTarget = preUsers[oldUsername];
        if (!preTarget) return resolve({ error: '用户不存在', status: 404 });
        if (preTarget.role !== 'student') return resolve({ error: '只能修改学员账号', status: 403 });
        const preMentors = await db.readObj('mentors.json');
        const preAssigned = preMentors[editor.username] || [];
        if (!preAssigned.includes(oldUsername)) return resolve({ error: '该学员不在你的名下，无权限修改', status: 403 });
      }

      let result = null;
      let userRole = '';
      let migrateUsername = null; // { from, to }
      let migrateName = null;     // { from, to }

      // 第 1 步：users.json（含唯一性校验）
      await db.withLock('users.json', async () => {
        const users = await db.readObjRaw('users.json');
        const user = users[oldUsername];
        if (!user) { result = { error: '用户不存在', status: 404 }; return; }
        if (user.username === 'PC') { result = { error: '不能修改超级管理员账号', status: 400 }; return; }

        userRole = user.role;
        const finalName = newName !== null ? newName : user.name;

        if (newUsername !== null && newUsername !== oldUsername) {
          if (users[newUsername]) { result = { error: `用户名「${newUsername}」已被占用`, status: 400 }; return; }
          if (userRole === 'admin') { result = { error: '不能修改管理员账号的用户名', status: 400 }; return; }
        }
        // 允许重名（同名多账号合法，后台统计按姓名合并、登录遇重名提示用用户名区分）
        const updated = { ...user, name: finalName };
        if (newPassword !== null) updated.password = newPassword; // 明文存储（超管可查看/导出）

        let finalUsername = oldUsername;
        if (newUsername !== null && newUsername !== oldUsername) {
          finalUsername = newUsername;
          updated.username = newUsername;
          migrateUsername = { from: oldUsername, to: newUsername };
        }
        if (finalName !== user.name && userRole === 'student') {
          migrateName = { from: user.name, to: finalName };
        }

        delete users[oldUsername];
        users[finalUsername] = updated;
        await db.writeRaw('users.json', users);
        result = {
          success: true,
          user: { username: finalUsername, name: finalName, role: userRole },
          renamed: !!migrateUsername,
          nameChanged: !!migrateName
        };
      });
      if (!result || !result.success) return resolve(result);

      // 第 2 步：mentors.json（导师被改名则迁移键；学员被改名则替换分配数组中的引用）
      if (migrateUsername) {
        await db.withLock('mentors.json', async () => {
          const mentors = await db.readObjRaw('mentors.json');
          let changed = false;
          if (userRole === 'mentor' && mentors[migrateUsername.from]) {
            mentors[migrateUsername.to] = mentors[migrateUsername.from];
            delete mentors[migrateUsername.from];
            changed = true;
          }
          for (const key of Object.keys(mentors)) {
            const arr = mentors[key];
            if (Array.isArray(arr) && arr.includes(migrateUsername.from)) {
              mentors[key] = arr.map(x => x === migrateUsername.from ? migrateUsername.to : x);
              changed = true;
            }
          }
          if (changed) await db.writeRaw('mentors.json', mentors);
        });
      }

      // 第 3 步：records.json（学员改名时把历史答题记录同步改归属，避免"记录消失"）
      if (migrateName) {
        await db.withLock('records.json', async () => {
          const records = await db.readJSONRaw('records.json');
          let changed = false;
          for (const r of records) {
            if (r.studentName === migrateName.from) { r.studentName = migrateName.to; changed = true; }
          }
          if (changed) await db.writeRaw('records.json', records);
        });
      }

      resolve(result);
    } catch (e) {
      console.error('[user-edit] error:', e.message);
      resolve({ error: '修改失败，请重试', status: 500 });
    }
  });
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
    { id: 'w1d1', title: 'W1-D1 诺瓦公司+LED行业+基础知识', panel: 'newbie', week: 1, day: 1, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d2', title: 'W1-D2 信号源+控制系统+视频处理+接收卡/发送卡', panel: 'newbie', week: 1, day: 2, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d3', title: 'W1-D3 LED方案+V系列+H系列', panel: 'newbie', week: 1, day: 3, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1d4', title: 'W1-D4 TB系列+TU系列+一体机+配件+GTS', panel: 'newbie', week: 1, day: 4, brand: '诺瓦', duration: 30, questionFile: 'newbie/week1.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w1week', title: 'W1-Week 诺瓦知识串讲+周考', panel: 'newbie', week: 1, day: 5, brand: '诺瓦', duration: 60, questionFile: 'newbie/week1.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d1', title: 'W2-D1 嗨动公司+LCD行业+拼接方案', panel: 'newbie', week: 2, day: 1, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d2', title: 'W2-D2 E系列+B系列+EMX+矩阵+DT分配器', panel: 'newbie', week: 2, day: 2, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d3', title: 'W2-D3 NVDS解码+传输配件+音频基础', panel: 'newbie', week: 2, day: 3, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2d4', title: 'W2-D4 天韵+奥菲斯+音频处理器+选型', panel: 'newbie', week: 2, day: 4, brand: '嗨动', duration: 30, questionFile: 'newbie/week2.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w2week', title: 'W2-Week 嗨动知识串讲+周考', panel: 'newbie', week: 2, day: 5, brand: '嗨动', duration: 60, questionFile: 'newbie/week2.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3d1', title: 'W3-D1 公共广播+分布式+易诚+西格玛', panel: 'newbie', week: 3, day: 1, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3d2', title: 'W3-D2 多媒体播控+新媒体+ECS3000+灵石', panel: 'newbie', week: 3, day: 2, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3d3', title: 'W3-D3 嗨动总览+阿尔法/阿丽塔拼控+缪斯播控', panel: 'newbie', week: 3, day: 3, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3d4', title: 'W3-D4 泰山坐席+科赛无纸化+展厅+艾欧塔中控+灵曜会议', panel: 'newbie', week: 3, day: 4, brand: '嗨动', duration: 30, questionFile: 'newbie/week3.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
    { id: 'w3week', title: 'W3-Week 综合结业考核', panel: 'newbie', week: 3, day: 5, brand: '嗨动', duration: 90, questionFile: 'newbie/week3.js', totalQuestions: 18, distribution: { single: 8, multiple: 4, judge: 4, short: 2 } },
  ],
  tech: [
    { id: 'tech_nova_led', title: '诺瓦 LED控制系统', panel: 'tech', brand: '诺瓦', duration: 50, questionFile: 'tech/nova_led.js', totalQuestions: 20, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_nova_video', title: '诺瓦 视频拼接处理器', panel: 'tech', brand: '诺瓦', duration: 50, questionFile: 'tech/nova_video.js', totalQuestions: 20, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_nova_integration', title: '诺瓦 整机方案与配件', panel: 'tech', brand: '诺瓦', duration: 50, questionFile: 'tech/nova_integration.js', totalQuestions: 20, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_video', title: '嗨动 视频拼接与矩阵', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_video.js', totalQuestions: 20, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_distributed', title: '嗨动 分布式与中控', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_distributed.js', totalQuestions: 20, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_audio', title: '嗨动 音频扩声系统', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_audio.js', totalQuestions: 20, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_hd_multimedia', title: '嗨动 多媒体与会议', panel: 'tech', brand: '嗨动', duration: 50, questionFile: 'tech/hd_multimedia.js', totalQuestions: 20, distribution: { single: 8, multiple: 5, judge: 4, short: 3 } },
    { id: 'tech_comprehensive', title: '全系列产品综合考核', panel: 'tech', brand: '综合', duration: 70, questionFile: 'tech/comprehensive.js', totalQuestions: 25, distribution: { single: 12, multiple: 5, judge: 5, short: 3 } },
  ],
  sales: [
    { id: 'sales_nova_led', title: '诺瓦 LED控制系统', panel: 'sales', brand: '诺瓦', duration: 45, questionFile: 'sales/nova_led.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_nova_video', title: '诺瓦 视频拼接处理器', panel: 'sales', brand: '诺瓦', duration: 45, questionFile: 'sales/nova_video.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_nova_integration', title: '诺瓦 整机方案与配件', panel: 'sales', brand: '诺瓦', duration: 45, questionFile: 'sales/nova_integration.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_video', title: '嗨动 视频拼接与矩阵', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_video.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_distributed', title: '嗨动 分布式与中控', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_distributed.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_audio', title: '嗨动 音频扩声系统', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_audio.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_hd_multimedia', title: '嗨动 多媒体与会议', panel: 'sales', brand: '嗨动', duration: 45, questionFile: 'sales/hd_multimedia.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'sales_comprehensive', title: '全系列产品综合考核', panel: 'sales', brand: '综合', duration: 65, questionFile: 'sales/comprehensive.js', totalQuestions: 25, distribution: { single: 12, multiple: 5, judge: 5, short: 3 } },
  ],
  client: [
    { id: 'client_nova_led', title: '诺瓦 LED控制系统', panel: 'client', brand: '诺瓦', duration: 40, questionFile: 'client/nova_led.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_nova_video', title: '诺瓦 视频拼接处理器', panel: 'client', brand: '诺瓦', duration: 40, questionFile: 'client/nova_video.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_nova_integration', title: '诺瓦 整机方案与配件', panel: 'client', brand: '诺瓦', duration: 40, questionFile: 'client/nova_integration.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_video', title: '嗨动 视频拼接与矩阵', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_video.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_distributed', title: '嗨动 分布式与中控', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_distributed.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_audio', title: '嗨动 音频扩声系统', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_audio.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_hd_multimedia', title: '嗨动 多媒体与会议', panel: 'client', brand: '嗨动', duration: 40, questionFile: 'client/hd_multimedia.js', totalQuestions: 20, distribution: { single: 10, multiple: 5, judge: 4, short: 1 } },
    { id: 'client_comprehensive', title: '全系列产品综合考核', panel: 'client', brand: '综合', duration: 60, questionFile: 'client/comprehensive.js', totalQuestions: 25, distribution: { single: 12, multiple: 5, judge: 5, short: 3 } },
  ],
  training: [
    { id: 'tr_lcd',   title: 'LCD液晶拼接', panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/lcd.js',   totalQuestions: 18, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_media', title: '媒体服务器',   panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/media.js', totalQuestions: 18, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_audio', title: '音频系统',     panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/audio.js', totalQuestions: 18, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_ctrl',  title: '中控系统',     panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/ctrl.js',  totalQuestions: 18, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
    { id: 'tr_viz',   title: '可视化系统',   panel: 'training', brand: '嗨动', duration: 40, questionFile: 'training/viz.js',   totalQuestions: 18, distribution: { single: 10, multiple: 4, judge: 2, short: 2 } },
  ],
  scene: [
    // 场景化赋能专项 · 5 场闯关式固定卷（不抽题）。fixed=true 时 start-exam 走固定整卷逻辑。
    // 层层递进：集成全景 → 会议室 → 展厅 → 需求澄清与跨系统配单 → 结业综合。
    // 每卷满分 100、统一通过线 80；客观题总分均低于 80，必须经导师完成主观题评分后才可能通过。
    { id: 'sceneT1', title: '阶段测一 · 集成全景与产品地图', panel: 'scene', stage: 1, duration: 35, questionFile: 'scene/scene.js', fixed: true, examIdFilter: 'sceneT1', passScore: 80, totalQuestions: 25 },
    { id: 'sceneT2', title: '阶段测二 · 会议室拓扑与配单', panel: 'scene', stage: 2, duration: 45, questionFile: 'scene/scene.js', fixed: true, examIdFilter: 'sceneT2', passScore: 80, totalQuestions: 29 },
    { id: 'sceneT3', title: '阶段测三 · 展厅拓扑与配单', panel: 'scene', stage: 3, duration: 45, questionFile: 'scene/scene.js', fixed: true, examIdFilter: 'sceneT3', passScore: 80, totalQuestions: 28 },
    { id: 'sceneT4', title: '阶段测四 · 需求澄清与跨系统配单', panel: 'scene', stage: 4, duration: 55, questionFile: 'scene/scene.js', fixed: true, examIdFilter: 'sceneT4', passScore: 80, totalQuestions: 24 },
    { id: 'sceneFinal', title: '结业综合测试', panel: 'scene', stage: 5, duration: 70, questionFile: 'scene/scene.js', fixed: true, examIdFilter: 'sceneFinal', passScore: 80, totalQuestions: 30 },
  ]
};

// ===== 场景化专项 · 闯关顺序与合格判定 =====
// 闯关规则：按顺序考核，前一场「通过且主观题已由导师评分」后才解锁下一场。
const SCENE_EXAM_SEQUENCE = ['sceneT1', 'sceneT2', 'sceneT3', 'sceneT4', 'sceneFinal'];

// 取一组记录中最终得分最高的一条（finalScore 优先，其次 autoScore）
function bestRecordOf(list) {
  return (list || []).reduce((best, r) => {
    const s = (r.finalScore !== undefined && r.finalScore !== null) ? r.finalScore : (r.autoScore || 0);
    const bs = best ? ((best.finalScore !== undefined && best.finalScore !== null) ? best.finalScore : (best.autoScore || 0)) : -1;
    return Number(s) > Number(bs) ? r : best;
  }, null);
}

// 场景化单场「合格」：达到通过线，且（导师已评分 或 该卷无主观题）
function sceneRecordQualified(r) {
  if (!r || !r.passed) return false;
  if (r.mentorScored) return true;
  const qs = Array.isArray(r.questions) ? r.questions : [];
  return !qs.some(q => q && q.manual);
}

// ===== Fisher-Yates 洗牌 =====
async function getAllExams() {
  const all = [];
  for (const panel of ['newbie', 'tech', 'sales', 'client', 'training', 'scene']) {
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
        duration: 40, questionFile: m.questionFile, totalQuestions: 18,
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
        duration: 40, questionFile: m.questionFile, totalQuestions: 18,
        distribution: m.distribution || { single: 8, multiple: 5, judge: 4, short: 1 }
      });
    }
  }
  return all;
}

async function getAllPanels() {
  const panels = ['newbie', 'tech', 'sales', 'client', 'training', 'scene'];
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

// ===== 抽题（课目隔离 —— 原则性规则）=====
// 一次考试只能出现「本场考试自己」的题目：
//   · 题库文件带 examId 标签（新人专项：一个文件 = 一周 5 场考试）
//     → 抽题、备选轮换、补足题量，全部限制在本场 examId 的题池内，绝不跨课目捞题。
//   · 题库文件不带 examId（技术/销售/客户端/新品：一个文件即一场考试）
//     → 整份文件就是本场题池。
// 随机只做两件事：打乱本场考题顺序 + 题池大于题量时轮换备选题。
function pickQuestions(bank, config, examId) {
  const dist = config.distribution || {};
  const needSum = TYPE_ORDER.reduce((a, t) => a + (dist[t] || 0), 0);
  // 题量以题型分布为准，避免配置的 totalQuestions 大于题池时向其他课目借题
  const target = Math.min(config.totalQuestions || needSum, needSum) || needSum;
  const result = [];

  // ---- 第一步：确定本场考试题池（课目隔离）----
  let pool = Array.isArray(bank) ? bank : [];
  const tagged = pool.some(q => q && q.examId);
  if (tagged) {
    if (!examId) {
      console.error('[pick] 题库带课目标签但未指定 examId，拒绝抽题');
      return [];
    }
    pool = pool.filter(q => q.examId === examId);
    if (pool.length === 0) {
      console.error('[pick] 本场课目题池为空，拒绝跨课目兜底:', examId);
      return [];
    }
  }

  const byType = { single: [], multiple: [], judge: [], short: [] };
  for (const q of pool) {
    const t = q.type || 'single';
    if (byType[t]) byType[t].push(q);
  }

  // ---- 第二步：按题型在「本场题池」内随机抽取（题池有余量时即备选题轮换）----
  for (const type of TYPE_ORDER) {
    const need = dist[type] || 0;
    const typePool = byType[type] || [];
    if (need <= 0 || typePool.length === 0) continue;
    const picked = shuffle(typePool).slice(0, Math.min(need, typePool.length));
    for (const q of picked) result.push({ ...q, _type: type });
  }

  // ---- 第三步：题量不足时只在本场题池内补足（绝不跨课目）----
  if (result.length < target) {
    const existingIds = new Set(result.map(q => q.id));
    for (const q of shuffle(pool)) {
      if (result.length >= target) break;
      if (!existingIds.has(q.id)) { result.push({ ...q, _type: q.type || 'single' }); existingIds.add(q.id); }
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
const PANEL_LABELS = { newbie: '新人专项', tech: '技术进阶', sales: '销售进阶', client: '客户端考核', new_product: '新品考核', scene: '场景化赋能专项' };

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
      password, // 明文存储（超管可查看/导出；内部考核场景采用）
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

// 登录 — 支持「用户名 + 密码」或「姓名 + 密码」
// 匹配规则：
//   1) 优先按用户名精确匹配；
//   2) 用户名匹配不到时，按姓名匹配；姓名唯一 → 登录成功；重复姓名 → 提示用用户名登录，避免歧义。
// 密码校验：兼容明文密码（password 字段为明文，超管可查看/导出）与历史哈希（旧账号为 SHA-256）。
function checkPassword(user, input) {
  if (!user || !user.password) return false;
  if (user.password === input) return true;              // 明文匹配
  if (user.password === hashPassword(input)) return true; // 历史哈希兜底
  return false;
}

app.post('/api/auth/login', rateLimit(60000, 20, req => 'lg:' + (req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : (req.ip || ''))), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请输入用户名（或姓名）和密码' });
  
  const users = await db.readObjRaw('users.json');
  let user = users[username];

  if (!user) {
    // 按姓名匹配
    const byName = Object.values(users).filter(u => u.name === username);
    if (byName.length === 0) {
      auditLog.recordLogin(req, { username, user: null, result: 'fail', reason: '账号不存在' });
      return res.status(401).json({ error: '账号不存在，请核对用户名或姓名' });
    }
    if (byName.length > 1) {
      auditLog.recordLogin(req, { username, user: byName[0], result: 'fail', reason: `姓名重复(${byName.length}个账号)` });
      return res.status(401).json({ error: `该姓名对应 ${byName.length} 个账号，请改用用户名登录` });
    }
    user = byName[0];
  }

  if (!checkPassword(user, password)) {
    auditLog.recordLogin(req, { username, user, result: 'fail', reason: '密码错误' });
    return res.status(401).json({ error: '密码错误' });
  }

  const token = generateToken();
  user.token = token;
  users[user.username] = user;
  await db.writeRaw('users.json', users);

  auditLog.recordLogin(req, { username, user, result: 'ok', reason: '' });
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
  if (!checkPassword(user, oldPassword)) return res.status(400).json({ error: '原密码错误' });
  
  user.password = newPassword; // 明文存储
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
    password, // 明文存储（超管可查看/导出）
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
    .map(u => ({ username: u.username, name: u.name, role: u.role, createdAt: u.createdAt, password: u.password || '' }));
  const mentors = await db.readObj('mentors.json');
  // 附带重名提示（同名多账号检测）
  const nameCount = {};
  for (const u of list) nameCount[u.name] = (nameCount[u.name] || 0) + 1;
  // 附加导师-学员关系
  for (const u of list) {
    u.duplicateName = (nameCount[u.name] || 0) > 1;
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
  users[req.params.username].password = newPassword; // 明文存储
  await db.writeObj('users.json', users);
  res.json({ success: true });
});

// 管理员：修改用户（登录用户名/姓名/重置密码）— 用户名与姓名变更会安全迁移关联数据
app.put('/api/admin/users/:username', adminAuth, async (req, res) => {
  const result = await applyUserEdit(req.params.username, req.body || {}, req.currentUser);
  if (!result.success) return res.status(result.status || 400).json({ error: result.error });
  res.json(result);
});

// 管理员：一键重置全部账号密码（保留超级管理员 PC 不动）
app.post('/api/admin/users/reset-all', adminAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '请提供至少4位的新密码' });
  let count = 0;
  await db.withLock('users.json', async () => {
    const users = await db.readObjRaw('users.json');
    for (const u of Object.values(users)) {
      if (u.username === 'PC') continue; // 超级管理员不重置
      u.password = newPassword; // 明文存储
      users[u.username] = u;
      count++;
    }
    await db.writeRaw('users.json', users);
  });
  res.json({ success: true, resetCount: count });
});

// 管理员：导出全部账号（含密码、导师、重名标记）为 Excel
app.get('/api/admin/users/export', adminAuth, async (req, res) => {
  const users = await db.readObj('users.json');
  const mentors = await db.readObj('mentors.json');
  const rows = [];
  for (const u of Object.values(users)) {
    if (!u.username || !u.role) continue;
    let assignedMentor = '-';
    if (u.role === 'student') {
      for (const [mname, students] of Object.entries(mentors)) {
        if (students.includes(u.username)) { assignedMentor = mname; break; }
      }
    }
    // 超管密码不导出（避免把超管哈希/密码明文外泄），其余账号导出明文密码
    const pwdCell = (u.role === 'admin') ? '(超管，不导出)' : (u.password !== undefined && u.password !== null ? String(u.password) : '');
    rows.push({
      用户名: u.username,
      姓名: u.name || '',
      角色: u.role === 'admin' ? '超级管理员' : (u.role === 'mentor' ? '导师' : '学员'),
      导师: assignedMentor,
      密码: pwdCell,
      创建时间: u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : '-'
    });
  }
  try {
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '账号');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.xlsx`);
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: '导出失败：' + e.message });
  }
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

// 导师：修改自己名下学员（登录用户名/姓名/重置密码）— 同样带关联数据安全迁移
app.put('/api/mentor/students/:username', mentorAuth, async (req, res) => {
  const result = await applyUserEdit(req.params.username, req.body || {}, req.currentUser);
  if (!result.success) return res.status(result.status || 400).json({ error: result.error });
  res.json(result);
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
  // 场景化专项（panel=scene）不进全局排行榜与积分，保持两套独立
  const studentMap = {};
  for (const r of records) {
    if (r.panel === 'scene') continue;
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
          duration: 40, questionFile: m.questionFile, totalQuestions: 18,
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

app.get('/api/records/:studentName', authMiddleware, async (req, res) => {
  const me = req.currentUser;
  if (me.name !== req.params.studentName && me.role !== 'mentor' && me.role !== 'admin') {
    return res.status(403).json({ error: '无权查看该学员记录' });
  }
  const records = await db.readJSON('records.json');
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
  res.json({ success: true, records: studentRecords });
});

app.get('/api/attempts/:studentName', authMiddleware, async (req, res) => {
  const me = req.currentUser;
  if (me.name !== req.params.studentName && me.role !== 'mentor' && me.role !== 'admin') {
    return res.status(403).json({ error: '无权查看该学员记录' });
  }
  const records = await db.readJSON('records.json');
  const attempts = {};
  const studentRecords = records.filter(r => r.studentName === req.params.studentName);
  for (const r of studentRecords) attempts[r.examId] = (attempts[r.examId] || 0) + 1;
  res.json({ success: true, attempts, maxAttempts: MAX_ATTEMPTS });
});

app.post('/api/start-exam', authMiddleware, rateLimit(60000, 15, req => 'ex:' + (req.currentUser && req.currentUser.name ? req.currentUser.name : req.ip)), async (req, res) => {
  await loadExamSessions();
  const studentName = req.currentUser ? req.currentUser.name : '';
  if (!studentName) return res.status(401).json({ error: '未登录' });
  const { examId } = req.body || {};
  if (!examId) return res.status(400).json({ error: '参数不完整' });

  const allExams = await getAllExams();
  const exam = allExams.find(e => e.id === examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });

  const records = await db.readJSON('records.json');

  // ===== 场景化专项 · 闯关校验：上一场达到通过线并完成导师评分后，才允许开始本场 =====
  if (exam.panel === 'scene') {
    const seqIdx = SCENE_EXAM_SEQUENCE.indexOf(examId);
    if (seqIdx > 0) {
      const prevId = SCENE_EXAM_SEQUENCE[seqIdx - 1];
      const prevRecords = records.filter(r => r.studentName === studentName && r.examId === prevId);
      if (!prevRecords.some(sceneRecordQualified)) {
        const prevExam = allExams.find(e => e.id === prevId);
        const prevBest = bestRecordOf(prevRecords);
        return res.json({
          success: false,
          locked: true,
          message: `请先通过「${prevExam ? prevExam.title : prevId}」（通过线 ${prevExam ? prevExam.passScore : 80} 分，主观题需导师评分）后再进行本场考核`,
          prevExam: prevId,
          bestRecord: prevBest ? {
            id: prevBest.id,
            score: (prevBest.finalScore !== undefined && prevBest.finalScore !== null) ? prevBest.finalScore : prevBest.autoScore,
            passed: !!prevBest.passed,
            mentorScored: !!prevBest.mentorScored,
            submitTime: prevBest.submitTime
          } : null
        });
      }
    }
  }

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
  // ===== 场景化专项 · 固定整卷：不抽题不放回，按 examIdFilter 精确取全部题，保持题目顺序 =====
  if (exam && exam.fixed && exam.examIdFilter) {
    const picked = bank
      .filter(q => q.examId === exam.examIdFilter)
      .sort((a, b) => String(a.id).localeCompare(String(b.id), 'zh'));
    // 按题目自带分值定分（固定整卷每卷合计 100 分），不随机权重缩放，保证通过线可信
    for (const q of picked) q.points = (q.points !== undefined && q.points !== null) ? q.points : 5;
    if (picked.length < exam.totalQuestions) {
      console.error('[fixed] 固定整卷题数不足:', exam.examIdFilter, picked.length, '/', exam.totalQuestions);
      return res.status(500).json({ error: '该固定卷题库配置不完整，请联系管理员' });
    }
    questions = picked;
  } else if (exam.distribution) {
    // 一律传本场 exam.id：题库是否按课目隔离由 pickQuestions 依据题库是否有 examId 标签判定
    questions = pickQuestions(bank, exam, exam.id);
  } else {
    // 兜底分支同样遵守课目隔离：带 examId 标签的题库必须按本场 examId 过滤，绝不跨课目捞题
    let pool = bank;
    if (bank.some(q => q && q.examId)) {
      pool = bank.filter(q => q.examId === exam.id);
      if (pool.length === 0) {
        console.error('[exam] 兜底分支题池为空，拒绝跨课目兜底:', exam.id);
        return res.status(500).json({ error: '题库配置异常，请联系管理员' });
      }
    }
    questions = shuffle(pool).slice(0, exam.totalQuestions);
  }

  // ===== 安全（服务端发卷）：记录权威题目建会话，客户端只下发去答案版 =====
  const sessionId = 'sess_' + crypto.randomBytes(12).toString('hex');
  examSessions.set(sessionId, {
    examId, studentName,
    questions, // 含 answer/explain/keywords（仅供服务端判分与导师评分，绝不下发）
    createdAt: Date.now(),
    expiresAt: Date.now() + (exam.duration * 60 + 5) * 1000,
    used: false
  });
  await persistExamSessions();

  // 客户端答卷只需题型/题干/选项/分值，剥离答案、解析、关键词与评分细则
  const clientQuestions = questions.map(q => {
    const { answer, explain, keywords, examineRule, ...rest } = q || {};
    return rest;
  });

  res.json({
    success: true, exam, sessionId,
    questions: clientQuestions,
    attemptNumber: attemptCount + 1,
    remainingAttempts: MAX_ATTEMPTS - attemptCount - 1,
    timeLimit: exam.duration * 60
  });
});

app.post('/api/records', authMiddleware, rateLimit(60000, 15, req => 'rc:' + (req.currentUser && req.currentUser.name ? req.currentUser.name : req.ip)), async (req, res) => {
  const body = req.body || {};
  const studentName = req.currentUser ? req.currentUser.name : '';
  if (!studentName) return res.status(401).json({ error: '未登录' });
  if (!body.examId) return res.status(400).json({ error: '数据不完整' });

  // ===== 安全（服务端发卷会话）：只信任会话内的权威题目，不信任客户端回传的 questions =====
  await loadExamSessions();
  const session = examSessions.get(body.sessionId);
  if (!session) return res.status(400).json({ error: '试卷会话不存在，请重新开始考试' });
  if (session.used) return res.status(400).json({ error: '该试卷已提交过，请勿重复提交' });
  if (session.expiresAt < Date.now()) return res.status(400).json({ error: '试卷已超时，请重新开始考试' });
  if (session.studentName !== studentName) return res.status(403).json({ error: '身份校验失败' });
  if (session.examId !== body.examId) return res.status(400).json({ error: '考试不匹配，请重新开始' });

  const seed = { ...body, studentName };
  let record = null;
  // 整段「读-改-写」加锁：防止多人同时提交时互相覆盖丢记录
  let savedRecord = null;
  let dupResult = null;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');

    if (seed.id) {
      const dupId = records.find(r => r.id === seed.id);
      if (dupId) { console.log('[dedup] ID duplicate'); dupResult = { record: dupId, deduped: true }; return; }
    }

    const dupTime = records.find(r =>
      r.studentName === studentName && r.examId === seed.examId &&
      Math.abs(new Date(r.submitTime).getTime() - new Date(seed.submitTime).getTime()) < 5000
    );
    if (dupTime) { console.log('[dedup] Time duplicate'); dupResult = { record: dupTime, deduped: true }; return; }

    // 以会话内权威题目为准（含 answer/explain/keywords），服务端重新判分，不信任客户端任何分数
    const questions = session.questions || [];
    const recordSafe = { ...seed };
    recordSafe.questions = questions; // 服务端保存权威题目，供导师评分/导出复核
    recordSafe.studentName = studentName;
    recordSafe.sessionId = seed.sessionId;

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
      const userAnswer = (recordSafe.answers || {})[q.id];
      let score = 0;
      // 主观题（简答/配推/情景/大案例，manual=true）不自动评分，由导师人工评分；此处仅登记答题内容
      if (q.manual) {
        typeScores[qType] = typeScores[qType] || { score: 0, max: 0 };
        typeScores[qType].max += points;
        questionScores[q.id] = { score: 0, maxScore: points, manual: true };
        continue;
      }
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

    // ===== AI 倾向检测（简答题）：本地多维，0-100 分 + 等级 + 命中证据，导师评分时参考 =====
    try {
      const shortQs = questions.filter(q => q.type === 'short');
      recordSafe.aiCheck = aiDetect.detectRecord(shortQs, recordSafe.answers || {});
    } catch (e) { console.error('[ai] detect error:', e.message); }

    if (!recordSafe.id) recordSafe.id = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    recordSafe.submitTime = recordSafe.submitTime || new Date().toISOString();
    recordSafe.autoScore = autoScore;
    recordSafe.finalScore = autoScore;
    // 板块归属以服务端考试配置为准，不信任客户端传入的 panel
    const examCfg = (await getAllExams()).find(e => e.id === recordSafe.examId);
    recordSafe.panel = examCfg ? examCfg.panel : (recordSafe.panel || 'newbie');
    // 固定整卷按该卷通过线判定；其余沿用全局通过线
    const passLine = (examCfg && examCfg.passScore) ? examCfg.passScore : PASSING_SCORE;
    recordSafe.passScore = passLine;
    recordSafe.passed = autoScore >= passLine;
    recordSafe.questionScores = questionScores;
    recordSafe.typeScores = typeScores;
    recordSafe.mentorScored = false;
    recordSafe.mentorPending = (recordSafe.panel === 'scene');

    records.push(recordSafe);
    await db.writeRaw('records.json', records);
    session.used = true; // 标记会话已使用，防止同一试卷会话重复提交
    savedRecord = recordSafe;
  });
  await persistExamSessions(); // 持久化会话已使用状态

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
  const { search, panel, student, exam } = req.query;
  let filtered = records;
  
  if (req.currentUser.role !== 'admin') {
    const mentors = await db.readObj('mentors.json');
    const assigned = mentors[req.currentUser.username] || [];
    const users = await db.readObj('users.json');
    const assignedNames = new Set();
    for (const s of assigned) {
      const u = users[s];
      if (u) assignedNames.add(u.name);
    }
    // 场景化专项为独立培养计划（名单在 scene_progress.json 维护，且总览对全体导师可见），
    // 其记录不受 mentors.json 分配限制，否则导师在「评分管理」看不到场景卷、无法二次评分
    filtered = filtered.filter(r => assignedNames.has(r.studentName) || r.panel === 'scene');
  }
  
  // 考试标题映射（供按「考试名称」筛选 + 展示，考试ID/标题均可命中）
  const exams = await getAllExams();
  const titleMap = new Map(exams.map(e => [e.id, e.title]));
  const examTextOf = r => (r.examTitle || titleMap.get(r.examId) || r.examId || '');
  
  if (panel && panel !== 'all') filtered = filtered.filter(r => r.panel === panel);
  if (student) {
    const s = String(student).toLowerCase();
    filtered = filtered.filter(r => (r.studentName || '').toLowerCase().includes(s));
  }
  if (exam) {
    const s = String(exam).toLowerCase();
    filtered = filtered.filter(r =>
      (r.examId || '').toLowerCase().includes(s) || examTextOf(r).toLowerCase().includes(s)
    );
  }
  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(r =>
      (r.studentName || '').toLowerCase().includes(s) ||
      (r.examId || '').toLowerCase().includes(s) ||
      examTextOf(r).toLowerCase().includes(s)
    );
  }
  
  // 附加考试标题（不改底层数据，仅响应时补充，方便导师识别）
  filtered = filtered.map(r => ({ ...r, examTitle: examTextOf(r) }));
  
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
    // 场景化专项记录不受分配限制，导出时一并包含
    filtered = filtered.filter(r => assignedNames.has(r.studentName) || r.panel === 'scene');
  }
  
  const exams = await getAllExams();
  const titleMap = new Map(exams.map(e => [e.id, e.title]));
  const examTextOf = r => titleMap.get(r.examId) || r.examId || '';
  
  if (req.query.panel && req.query.panel !== 'all') filtered = filtered.filter(r => r.panel === req.query.panel);
  if (req.query.student) {
    const s = String(req.query.student).toLowerCase();
    filtered = filtered.filter(r => (r.studentName || '').toLowerCase().includes(s));
  }
  if (req.query.exam) {
    const s = String(req.query.exam).toLowerCase();
    filtered = filtered.filter(r =>
      (r.examId || '').toLowerCase().includes(s) || examTextOf(r).toLowerCase().includes(s)
    );
  }
  
  const panelLabels = PANEL_LABELS;
  const rows = [['学员姓名', '板块', '考试ID', '考试标题', '自动评分', '导师评分', '最终得分', '是否通过', '是否已评', '答题次数', '提交时间', '用时(秒)', 'AI倾向', '导师点评']];
  for (const r of filtered) {
    const exam = exams.find(e => e.id === r.examId);
    const ai = r.aiCheck || {};
    const aiLabel = ai.score !== undefined ? `${ai.score}分(${ai.level})` : '';
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
      r.timeSpent || '',
      aiLabel,
      r.mentorComment !== undefined && r.mentorComment !== null ? String(r.mentorComment) : ''
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
  let filtered = records.filter(r => r.studentName === studentName);
  // 按时间倒序
  filtered.sort((a, b) => new Date(b.submitTime || 0).getTime() - new Date(a.submitTime || 0).getTime());
  // 附加考试标题（不改底层数据，仅响应时补充）
  const exams = await getAllExams();
  const titleMap = new Map(exams.map(e => [e.id, e.title]));
  filtered = filtered.map(r => ({ ...r, examTitle: titleMap.get(r.examId) || r.examId }));
  res.json({ success: true, records: filtered, total: filtered.length });
});

app.get('/api/mentor/records/:id', mentorAuth, async (req, res) => {
  const records = await db.readJSON('records.json');
  const record = records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: '记录不存在' });
  // 附加考试标题
  const exams = await getAllExams();
  const titleMap = new Map(exams.map(e => [e.id, e.title]));
  const enriched = { ...record, examTitle: titleMap.get(record.examId) || record.examId };
  res.json({ success: true, record: enriched });
});

app.put('/api/mentor/records/:id/score', mentorAuth, async (req, res) => {
  const { mentorScore, finalScore, mentorScored, mentorScoreDetails, questionScores, typeScores, mentorComment } = req.body;
  let saved = null;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');
    const idx = records.findIndex(r => r.id === req.params.id);
    if (idx < 0) return;
    const target = records[idx];
    if (mentorScore !== undefined) target.mentorScore = mentorScore;
    if (finalScore !== undefined) target.finalScore = finalScore;
    if (mentorScored !== undefined) target.mentorScored = !!mentorScored;
    if (mentorScoreDetails !== undefined) target.mentorScoreDetails = mentorScoreDetails;
    if (questionScores !== undefined) target.questionScores = questionScores;
    if (typeScores !== undefined) target.typeScores = typeScores;
    if (mentorComment !== undefined) target.mentorComment = String(mentorComment).slice(0, 2000);
    // 通过线由服务端按该场考试配置判定（场景化固定卷为 80 分），不信任客户端传入的 passed
    const examCfg = (await getAllExams()).find(e => e.id === target.examId);
    const line = (examCfg && examCfg.passScore) ? examCfg.passScore : PASSING_SCORE;
    const score = (target.finalScore !== undefined && target.finalScore !== null) ? target.finalScore : (target.autoScore || 0);
    target.passScore = line;
    target.passed = Number(score) >= line;
    if (target.panel === 'scene') target.mentorPending = !target.mentorScored;
    await db.writeRaw('records.json', records);
    saved = target;
  });
  if (!saved) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, record: saved });
});

// ===== 管理端：安全/访问日志（导师/管理员可查，用于追溯爬虫与异常访问） =====
app.get('/api/admin/security/logs', mentorAuth, async (req, res) => {
  let arr = [];
  try { const stored = await db.readJSONRaw(ACCESS_LOG_KEY); if (Array.isArray(stored)) arr = stored; } catch (e) {}
  // 合并内存中尚未落盘的日志（最新在前）
  const merged = [..._accessBuf, ...arr];
  const q = req.query.q ? String(req.query.q).toLowerCase() : '';
  const limit = Math.min(500, parseInt(req.query.limit, 10) || 200);
  let rows = merged.slice().reverse(); // 最新在前
  if (q) rows = rows.filter(r => (r.ip||'').includes(q) || (r.n||'').toLowerCase().includes(q) || (r.p||'').toLowerCase().includes(q) || (r.ua||'').toLowerCase().includes(q));
  rows = rows.slice(0, limit).map(r => ({ ...r, time: new Date(r.t).toLocaleString('zh-CN') }));
  res.json({ success: true, total: merged.length, filter: q || '', logs: rows });
});

app.delete('/api/mentor/records/:id/score', mentorAuth, async (req, res) => {
  let saved = null;
  await db.withLock('records.json', async () => {
    const records = await db.readJSONRaw('records.json');
    const idx = records.findIndex(r => r.id === req.params.id);
    if (idx < 0) return;
    records[idx].mentorScore = null;
    records[idx].finalScore = records[idx].autoScore;
    // 撤销评分后：场景化固定卷按该卷通过线重判，其余沿用全局通过线
    if (records[idx].panel === 'scene') {
      const examCfg = (await getAllExams()).find(e => e.id === records[idx].examId);
      records[idx].passScore = (examCfg && examCfg.passScore) ? examCfg.passScore : PASSING_SCORE;
      records[idx].passed = records[idx].autoScore >= records[idx].passScore;
    } else {
      records[idx].passed = records[idx].autoScore >= PASSING_SCORE;
    }
    records[idx].mentorScored = false;
    records[idx].mentorPending = (records[idx].panel === 'scene');
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

// ================= 场景化赋能专项 =================
// 独立于全局排行榜/积分体系；推进区 + 固定整卷 + 结业答辩评分
// 数据文件：scene_progress.json（任务卡状态+纳入学员+执行计划元信息）、scene_defense.json（答辩评分记录）
const SCENE_TASKS = [
  // 结构：{ id, week, stage, name, material, practice, deliverable, status }
  { id: 'T1',  week: 1, stage: '一 拆场景', name: '拆解会议室已成交项目', material: '本方案 2.2 子系统角色表；智能会议室解决方案 2025V1.5', practice: '拿一个已成交会议室项目，凭配置清单反推每个系统为什么配', deliverable: '反推记录 8 至 10 条' },
  { id: 'T2',  week: 1, stage: '一 拆场景', name: '拆解展厅已成交项目', material: '本方案 2.2；数字化智慧展厅解决方案 1.3', practice: '同法拆一个已成交展厅项目，指出至少一处本可以不配的系统', deliverable: '反推记录' },
  { id: 'T3',  week: 2, stage: '一 拆场景', name: '跟访现场勘察', material: '本方案附录 A 速查卡；勘察记录九问', practice: '跟访一次现场勘察，只做记录不做判断', deliverable: '勘察记录（九问填满）' },
  { id: 'T4',  week: 2, stage: '一 拆场景', name: '四层拓扑归位', material: '本方案 2.3 四层拓扑', practice: '把 T1 与 T2 的设备按四层拓扑重新归位，画两张草图', deliverable: '两张拓扑草图' },
  { id: 'T5',  week: 3, stage: '二 出方案', name: '会议室需求转配置', material: '本方案 4.2 推演链；4.3 交付物标准', practice: '会议室需求转配置，七步逐条写判断，含决定不配的结论', deliverable: '配置草表' },
  { id: 'T6',  week: 4, stage: '二 出方案', name: '会议室方案成稿', material: '本方案 4.3；音频扩声系统项目方案设计 V1.0', practice: '会议室成稿：拓扑图与配置表互相校验', deliverable: '方案包 A' },
  { id: 'T7',  week: 5, stage: '二 出方案', name: '展厅需求转配置', material: '展厅音频方案设计专项培训；本方案 2.2 展厅列', practice: '展厅需求转配置，先定馆型与参观动线，音频按讲解方式分档', deliverable: '配置草表' },
  { id: 'T8',  week: 6, stage: '二 出方案', name: '展厅方案成稿', material: '本方案 4.3；数字化智慧展厅解决方案 1.3', practice: '展厅成稿，多屏同步与信号调度须单独说明', deliverable: '方案包 B' },
  { id: 'T9',  week: 6, stage: '二 出方案', name: '方案交叉评审', material: '本方案 4.3 验收要点', practice: '两套方案交叉评审，互挑漏项，每人至少挑出对方 3 处', deliverable: '评审单' },
  { id: 'T10', week: 6, stage: '二 出方案', name: '方案修订终版', material: '本方案 4.3', practice: '按评审意见修订，出终版', deliverable: '方案包 A、B 终版' },
  { id: 'T11', week: 7, stage: '三 讲方案', name: '写 10 页讲解稿', material: '本方案 4.4 讲解稿固定骨架', practice: '按 10 页骨架写讲解稿', deliverable: '讲解稿' },
  { id: 'T12', week: 7, stage: '三 讲方案', name: '内测试讲', material: '本方案 4.4；4.1 三条组织规则', practice: '内测试讲一次并录音回听，超时即重写', deliverable: '试讲记录' },
  { id: 'T13', week: 8, stage: '三 讲方案', name: '准备三个必答问题', material: '本方案 5.1 三个必答问题', practice: '准备三个必答问题的答案，每题不超过三句话', deliverable: '应答卡' },
  { id: 'T14', week: 8, stage: '三 讲方案', name: '终期答辩', material: '本方案 5.1 评分表', practice: '终期答辩，五维各 20 分', deliverable: '答辩记录' }
];
// 结业答辩评分维度（五维各 20 分，70 分通过；三必答 + 五否决项）
const SCENE_DEFENSE_DIMS = [
  { key: 'req',   name: '需求理解', detail: '是否抓住真实痛点，而非罗列功能；能否复述客户原话', max: 20 },
  { key: 'config', name: '系统配置', detail: '有无漏项，有无多余项；配置是否能被推演链解释', max: 20 },
  { key: 'figure', name: '图与表', detail: '拓扑与清单是否一致，四层是否清楚', max: 20 },
  { key: 'speech', name: '讲解表达', detail: '15 分钟内是否讲完，结构是否清楚', max: 20 },
  { key: 'reply',  name: '异议应答', detail: '三个必答问题是否答得住', max: 20 }
];
const SCENE_DEFENSE_QUESTIONS = [
  { key: 'Q1', q: '你这个方案里最贵的一项是哪个，为什么值这个钱？' },
  { key: 'Q2', q: '如果预算砍掉 30%，你先砍哪个，为什么？' },
  { key: 'Q3', q: '客户拿竞品来比，你怎么说？' }
];
const SCENE_DEFENSE_VETOES = [
  { key: 'V1', v: '漏项超过 5%', why: '报价失真，后期扯皮' },
  { key: 'V2', v: '带载或功率算错', why: '现场点不亮、带不动，直接事故' },
  { key: 'V3', v: '承诺产品不具备的功能', why: '交付即违约' },
  { key: 'V4', v: '违反强制标准', why: '验收过不了' },
  { key: 'V5', v: '竞品对标不实', why: '丢单且伤品牌' }
];

// 读取/初始化推进区数据
async function getSceneProgress() {
  let p = await db.readObj('scene_progress.json');
  if (!p || typeof p !== 'object') p = {};
  if (!p.taskStatus) p.taskStatus = {};
  if (!p.students) p.students = []; // 纳入本专项的学员用户名
  return p;
}

// ===== 学员端：场景化闯关状态（解锁 / 待评分 / 已通过） =====
app.get('/api/scene/status', authMiddleware, async (req, res) => {
  try {
    const studentName = req.currentUser ? req.currentUser.name : '';
    if (!studentName) return res.status(401).json({ error: '未登录' });
    const records = await db.readJSON('records.json');
    const mine = records.filter(r => r.studentName === studentName && SCENE_EXAM_SEQUENCE.includes(r.examId));

    const exams = [];
    let prevQualified = true;
    for (const cfg of EXAM_CONFIGS.scene) {
      const rs = mine.filter(r => r.examId === cfg.id);
      const best = bestRecordOf(rs);
      const qualified = rs.some(sceneRecordQualified);
      const pending = !qualified && rs.some(r => r.mentorPending || (r.passed && !r.mentorScored));
      const unlocked = prevQualified;
      let status = 'unstarted';
      if (qualified) status = 'passed';
      else if (!unlocked) status = 'locked';
      else if (pending) status = 'pending';
      else if (rs.length > 0) status = 'failed';
      exams.push({
        id: cfg.id,
        title: cfg.title,
        stage: cfg.stage,
        duration: cfg.duration,
        passScore: cfg.passScore,
        totalQuestions: cfg.totalQuestions,
        unlocked,
        qualified,
        pending,
        status,
        attempts: rs.length,
        bestScore: best ? ((best.finalScore !== undefined && best.finalScore !== null) ? best.finalScore : (best.autoScore || 0)) : null,
        lastRecordId: best ? best.id : null
      });
      prevQualified = qualified;
    }
    res.json({
      success: true,
      studentName,
      passScore: 80,
      exams,
      allPassed: exams.every(e => e.qualified)
    });
  } catch (e) {
    console.error('[scene/status] error:', e.message);
    res.status(500).json({ error: '获取闯关状态失败：' + e.message });
  }
});

app.get('/api/scene/overview', mentorAuth, async (req, res) => {
  try {
    const cfg = (await getModuleConfig());
    const users = await db.readObj('users.json');
    const records = await db.readJSON('records.json');
    const progress = await getSceneProgress();

    // 任务卡列表（合并状态）
    const tasks = SCENE_TASKS.map(t => ({
      ...t,
      status: progress.taskStatus[t.id] || '未开始'
    }));
    const doneCount = tasks.filter(t => t.status === '已完成').length;
    const doingCount = tasks.filter(t => t.status === '进行中').length;
    const delayedCount = tasks.filter(t => t.status === '延期').length;

    // 纳入学员名单（解析姓名）
    const students = progress.students.map(u => {
      const uu = users[u];
      return { username: u, name: uu ? uu.name : u };
    });

    // 已实际参加场景考核但未纳入名单的学员也补进成绩表，避免导师看不到已发生的考试记录
    const nameToUsername = {};
    for (const [un, uu] of Object.entries(users)) nameToUsername[uu.name || un] = un;
    const scoreUsernames = progress.students.slice();
    for (const r of records) {
      if ((r.panel || '') !== 'scene' || !SCENE_EXAM_SEQUENCE.includes(r.examId)) continue;
      const un = nameToUsername[r.studentName];
      if (un && !scoreUsernames.includes(un)) scoreUsernames.push(un);
    }

    // 按纳入学员聚合五场成绩（取每人每场最高 finalScore）
    const recordKeys = SCENE_EXAM_SEQUENCE;
    const scoreMap = {}; // username -> { sceneT1:{score,passed,count}, ... }
    for (const u of scoreUsernames) {
      const uname = (users[u] && users[u].name) || u;
      scoreMap[u] = { uname, exams: {}, qualified: {}, pending: {} };
    }
    for (const r of records) {
      if ((r.panel || '') !== 'scene') continue;
      if (!recordKeys.includes(r.examId)) continue;
      const uname = r.studentName;
      // 通过学员名字匹配到用户（可能存在同名，按姓名匹配取一个）
      const matchedUser = scoreUsernames.find(u => (users[u] && users[u].name) === uname) || nameToUsername[uname];
      if (!matchedUser || !scoreMap[matchedUser]) continue;
      const holder = scoreMap[matchedUser];
      const score = r.finalScore !== undefined ? r.finalScore : (r.autoScore !== undefined ? r.autoScore : 0);
      // 单场合格：达到通过线 + 主观题已完成导师评分
      if (sceneRecordQualified(r)) holder.qualified[r.examId] = true;
      // 已交卷但主观题尚未评分 → 标记待评，导师端可直观看到
      if (!r.mentorScored && Array.isArray(r.questions) && r.questions.some(q => q && q.manual)) holder.pending[r.examId] = true;
      if (!holder.exams[r.examId] || score > holder.exams[r.examId].score) {
        holder.exams[r.examId] = { score, passed: !!r.passed, count: (holder.exams[r.examId] ? holder.exams[r.examId].count : 0) + 1, id: r.id };
      } else if (holder.exams[r.examId]) {
        holder.exams[r.examId].count += 1;
      }
    }

    // 成绩汇总（五场统一通过线 80 分）
    const examPasses = { sceneT1: 80, sceneT2: 80, sceneT3: 80, sceneT4: 80, sceneFinal: 80 };
    const scoreRows = scoreUsernames.map(u => {
      const holder = scoreMap[u];
      const exams = {};
      let valid = 0, sum = 0;
      for (const k of recordKeys) {
        const e = holder.exams[k];
        exams[k] = e ? { score: e.score, passed: e.passed, qualified: !!holder.qualified[k], pending: !!holder.pending[k], count: e.count, id: e.id } : null;
        if (e) { valid++; sum += e.score; }
      }
      const avg = valid > 0 ? Math.round((sum / valid) * 10) / 10 : null;
      // 最弱科目
      let weakest = null;
      for (const k of recordKeys) {
        if (!exams[k]) continue;
        if (!weakest || exams[k].score < weakest.score) weakest = { key: k, score: exams[k].score, pass: examPasses[k], title: k };
      }
      const allPassed = recordKeys.every(k => exams[k] && exams[k].qualified);
      return { username: u, name: holder.uname, exams, avg, weakest: weakest ? { ...weakest, title: { sceneT1: '阶段测一', sceneT2: '阶段测二', sceneT3: '阶段测三', sceneT4: '阶段测四', sceneFinal: '结业综合' }[weakest.key] || weakest.key } : null, allPassed };
    });

    res.json({
      success: true,
      meta: { name: '场景化赋能专项', passLines: examPasses },
      tasks, doneCount, doingCount, delayedCount, totalCount: tasks.length,
      students, scoreRows,
      defenseDims: SCENE_DEFENSE_DIMS,
      defenseQuestions: SCENE_DEFENSE_QUESTIONS,
      defenseVetoes: SCENE_DEFENSE_VETOES,
      canEdit: req.currentUser.role === 'admin' || req.currentUser.role === 'mentor'
    });
  } catch (e) {
    console.error('[scene/overview] error:', e.message);
    res.status(500).json({ error: '获取专项数据失败：' + e.message });
  }
});

// 更新任务卡状态（导师/超管）
app.put('/api/scene/task', mentorAuth, async (req, res) => {
  const { id, status } = req.body;
  const validStatuses = ['未开始', '进行中', '已完成', '延期'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: '非法状态' });
  const validId = SCENE_TASKS.some(t => t.id === id);
  if (!validId) return res.status(400).json({ error: '任务卡不存在' });
  await db.withLock('scene_progress.json', async () => {
    const p = await getSceneProgress();
    p.taskStatus[id] = status;
    await db.writeRaw('scene_progress.json', p);
  });
  res.json({ success: true });
});

// 纳入 / 移除学员（导师/超管）。body: { action:'add'|'remove', username }
app.post('/api/scene/students', mentorAuth, async (req, res) => {
  const { action, username } = req.body;
  if (!username || !['add', 'remove'].includes(action)) return res.status(400).json({ error: '参数不完整' });
  const users = await db.readObj('users.json');
  const u = users[username];
  if (!u) return res.status(400).json({ error: '用户不存在' });
  await db.withLock('scene_progress.json', async () => {
    const p = await getSceneProgress();
    if (action === 'add') {
      if (!p.students.includes(username)) p.students.push(username);
    } else {
      p.students = p.students.filter(s => s !== username);
    }
    await db.writeRaw('scene_progress.json', p);
  });
  res.json({ success: true });
});

// ===== 结业答辩评分 =====

app.get('/api/scene/defense', mentorAuth, async (req, res) => {
  const defense = await db.readObj('scene_defense.json');
  const users = await db.readObj('users.json');
  const list = Object.entries(defense).map(([id, d]) => {
    const uname = (users[d.username] && users[d.username].name) || d.username;
    return { id, username: d.username, studentName: uname, ...d };
  }).filter(d => d.studentName);
  res.json({ success: true, records: list, dims: SCENE_DEFENSE_DIMS, questions: SCENE_DEFENSE_QUESTIONS, vetoes: SCENE_DEFENSE_VETOES });
});

app.post('/api/scene/defense', mentorAuth, async (req, res) => {
  const { username, studentName, scores, questions, vetoes, note } = req.body;
  if (!studentName) return res.status(400).json({ error: '请选择学员' });
  const users = await db.readObj('users.json');
  // 解析最终判定
  const dims = SCENE_DEFENSE_DIMS;
  const total = dims.reduce((s, d) => s + Number(scores && scores[d.key] || 0), 0);
  const allAnswered = (questions && questions.every(q => q.answered === true)) || false;
  const hasVeto = (vetoes && vetoes.some(v => v.hit === true)) || false;
  const passed = dims.every(d => (Number(scores && scores[d.key]) || 0) <= d.max) && total >= 70 && allAnswered && !hasVeto;
  const id = 'df_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const rec = { id, username: username || studentName, studentName, scores: scores || {}, questions: questions || [], vetoes: vetoes || [], total, allAnswered, hasVeto, passed, note: note || '', createdAt: new Date().toISOString() };
  await db.withLock('scene_defense.json', async () => {
    const defense = await db.readObj('scene_defense.json');
    defense[id] = rec;
    await db.writeRaw('scene_defense.json', defense);
  });
  res.json({ success: true, record: rec });
});

app.put('/api/scene/defense/:id', mentorAuth, async (req, res) => {
  const { scores, questions, vetoes, note, studentName } = req.body;
  let rec = null;
  await db.withLock('scene_defense.json', async () => {
    const defense = await db.readObj('scene_defense.json');
    const r = defense[req.params.id];
    if (!r) return;
    if (studentName !== undefined) r.studentName = studentName;
    if (scores) r.scores = scores;
    if (questions) r.questions = questions;
    if (vetoes) r.vetoes = vetoes;
    if (note !== undefined) r.note = note;
    const dims = SCENE_DEFENSE_DIMS;
    const total = dims.reduce((s, d) => s + Number(r.scores && r.scores[d.key] || 0), 0);
    r.total = total;
    r.allAnswered = (r.questions && r.questions.every(q => q.answered === true)) || false;
    r.hasVeto = (r.vetoes && r.vetoes.some(v => v.hit === true)) || false;
    r.passed = dims.every(d => (Number(r.scores && r.scores[d.key]) || 0) <= d.max) && total >= 70 && r.allAnswered && !r.hasVeto;
    defense[req.params.id] = r;
    await db.writeRaw('scene_defense.json', defense);
    rec = r;
  });
  if (!rec) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, record: rec });
});

app.delete('/api/scene/defense/:id', mentorAuth, async (req, res) => {
  let deleted = null;
  await db.withLock('scene_defense.json', async () => {
    const defense = await db.readObj('scene_defense.json');
    if (defense[req.params.id]) { deleted = defense[req.params.id]; delete defense[req.params.id]; await db.writeRaw('scene_defense.json', defense); }
  });
  if (!deleted) return res.status(404).json({ error: '记录不存在' });
  res.json({ success: true, deleted });
});

// ===== 题库管理 =====

// 题库归属判定（唯一实现：题库列表页「本场题量」与导出接口共用，避免两处口径不一致产生 BUG）
//   带 examId 的题库（新人专项/日常培训，一个文件含多场考试）→ 按 examId 过滤
//   不带 examId 的题库（技术/销售/客户端/新品，一个文件即一场考试）→ 整份归属该考试
function resolveExamQuestions(bank, exam) {
  const list = Array.isArray(bank) ? bank : [];
  const hasAnyExamId = list.some(q => q.examId);
  return hasAnyExamId ? list.filter(q => !q.examId || q.examId === exam.id) : list;
}

// 共用同一题库文件的考试列表（用于提示「整个题库」覆盖了哪几场考试）
function sharedExamsOf(allExams, exam) {
  return allExams.filter(e => e.questionFile === exam.questionFile);
}

app.get('/api/mentor/questions', mentorAuth, async (req, res) => {
  const panel = req.query.panel || 'all';
  const allQuestions = {};
  const searchPanels = panel === 'all' ? await getAllPanels() : [panel];
  const allExams = await getAllExams();
  for (const p of searchPanels) {
    allQuestions[p] = [];
    const exams = allExams.filter(e => e.panel === p);
    for (const exam of exams) {
      const bank = loadQuestions(exam.questionFile);
      allQuestions[p].push({
        examId: exam.id, title: exam.title, panel: p,
        questions: bank,
        bankCount: bank.length,                              // 题库全部题量
        examCount: resolveExamQuestions(bank, exam).length,  // 本场考试题量
        sharedExamIds: sharedExamsOf(allExams, exam).map(e => e.id) // 共用该题库的考试
      });
    }
  }
  res.json({ success: true, questions: allQuestions, exams: allExams });
});

// ===== 题库导出为 Word（只读接口：不写库、不改内存缓存、不影响任何现有数据） =====
// 板块中文名（导出专用，含 training；未收录的模块从 module_config 取 name）
const EXPORT_PANEL_LABELS = {
  newbie: '新人专项', training: '新人培训专项（祥雨/伟桀）', tech: '技术进阶',
  sales: '销售进阶', client: '客户端考核', new_product: '新品考核', scene: '场景化赋能专项'
};
async function exportPanelLabel(panelId) {
  if (EXPORT_PANEL_LABELS[panelId]) return EXPORT_PANEL_LABELS[panelId];
  try {
    const config = await getModuleConfig();
    const mod = (config.fixedModules || {})[panelId] || (config.customModules || {})[panelId];
    if (mod && mod.name) return mod.name;
  } catch (e) { /* 取不到名称时退回模块 id */ }
  return panelId || '';
}

app.get('/api/mentor/questions/export', mentorAuth, async (req, res) => {
  try {
    const examId = String(req.query.examId || '').trim();
    if (!examId) return res.status(400).json({ error: '缺少考试编号 examId' });
    const allExams = await getAllExams();
    const exam = allExams.find(e => e.id === examId);
    if (!exam) return res.status(404).json({ error: '考试不存在' });

    // withAnswers=0 → 仅试题（学员打印卷）；默认含参考答案页（导师用）
    const withAnswers = String(req.query.withAnswers == null ? '1' : req.query.withAnswers) !== '0';
    // scope=exam（默认，兼容既有链接）→ 本场考试题库；scope=bank → 该题库全部题目（供导师手动筛选）
    const scope = String(req.query.scope || 'exam').trim() === 'bank' ? 'bank' : 'exam';

    // 取题库：与「题库管理」页面完全同源（同一个 loadQuestions / resolveExamQuestions），
    // 保证导师在页面上看到什么，导出的就是什么
    const bank = loadQuestions(exam.questionFile) || [];
    const questions = scope === 'bank' ? bank.slice() : resolveExamQuestions(bank, exam);
    if (questions.length === 0) return res.status(404).json({ error: '该考试暂无题目，无法导出' });

    // 懒加载导出模块：即使模块异常也只让本接口失败，不影响整个系统启动与运行
    let buildQuestionBankDocx, safeFileName;
    try {
      ({ buildQuestionBankDocx, safeFileName } = require('./wordExport'));
    } catch (e) {
      console.error('[questions-export] wordExport 模块不可用:', e.message);
      return res.status(500).json({ error: '服务端缺少 Word 导出组件，请稍后重试' });
    }

    // 导出「整个题库」时标注该题库覆盖了哪几场考试，避免导师误以为只有本场题目
    let notice = '';
    if (scope === 'bank') {
      const shared = sharedExamsOf(allExams, exam);
      if (shared.length > 1) {
        notice = `本题库共 ${bank.length} 题，同时供 ${shared.length} 场考试抽题：` + shared.map(e => e.title).join('；');
      }
    }

    const panelLabel = await exportPanelLabel(exam.panel);
    const generatedAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
    const buffer = await buildQuestionBankDocx({
      exam, panelLabel, questions, withAnswers, generatedAt, scope, notice
    });

    const baseName = safeFileName(exam.title || exam.id);
    const fname = scope === 'bank'
      ? `${baseName}_整个题库${questions.length}题${withAnswers ? '_含答案' : '_仅试题'}.docx`
      : `${baseName}${withAnswers ? '_题库含答案' : '_试卷'}.docx`;
    const asciiName = `quiz_bank_${String(exam.id || 'exam').replace(/[^\w.-]/g, '_')}${scope === 'bank' ? '_bank' : ''}${withAnswers ? '_full' : ''}.docx`;
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fname)}`);
    res.set('Content-Length', String(buffer.length));
    res.set('Cache-Control', 'no-store');
    console.log('[questions-export]', exam.id, `范围=${scope}`, `题量=${questions.length}`, '含答案=' + withAnswers, `大小=${buffer.length}B`, 'by', req.currentUser && req.currentUser.username);
    return res.send(buffer);
  } catch (e) {
    console.error('[questions-export] error:', e && e.message);
    return res.status(500).json({ error: '导出失败，请重试' });
  }
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
    // 未完成导师评分的主观题不计入「错题/薄弱点」，避免把待评分误判为答错
    const pendingManual = !r.mentorScored && questions.some(q => q && q.manual);
    for (const q of questions) {
      if (pendingManual && q.manual) continue;
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
  
  // 附加考试标题（不改底层数据，仅响应时补充）
  const exams = await getAllExams();
  const titleMap = new Map(exams.map(e => [e.id, e.title]));
  for (const s of result) {
    for (const we of s.wrongByExam) we.examTitle = titleMap.get(we.examId) || we.examId;
  }
  
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
    // 未完成导师评分的主观题不计入错题，避免待评分记录被统计为薄弱点
    const pendingManual = !r.mentorScored && questions.some(q => q && q.manual);
    for (const q of questions) {
      if (pendingManual && q.manual) continue;
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
  // 附加考试标题（不改底层数据，仅响应时补充）
  const exams = await getAllExams();
  const titleMap = new Map(exams.map(e => [e.id, e.title]));
  for (const w of allWrong) w.examTitle = titleMap.get(w.examId) || w.examId;
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

// ===== 审计日志查询（仅导师/管理员） =====
// 可见性规则：
//   · 超管（admin）可见全部记录，包括超管自己的
//   · 导师（mentor）可见除超管以外的所有记录（学员/导师）
app.get('/api/audit/logins', mentorAuth, async (req, res) => {
  try {
    const viewerRole = req.currentUser.role;
    const data = await auditLog.queryLogins(req.query, viewerRole);
    res.json({ success: true, ...data });
  } catch (e) {
    res.status(500).json({ error: '读取登录记录失败' });
  }
});

app.get('/api/audit/ops', mentorAuth, async (req, res) => {
  try {
    const viewerRole = req.currentUser.role;
    const data = await auditLog.queryOps(req.query, viewerRole);
    res.json({ success: true, ...data });
  } catch (e) {
    res.status(500).json({ error: '读取操作记录失败' });
  }
});

app.get('/api/audit/identity', mentorAuth, async (req, res) => {
  try {
    const viewerRole = req.currentUser.role;
    const data = await auditLog.queryIdentity(req.query, viewerRole);
    res.json({ success: true, ...data, viewerRole });
  } catch (e) {
    res.status(500).json({ error: '读取账号关系失败' });
  }
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
