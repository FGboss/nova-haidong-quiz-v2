// ===== 审计日志（登录记录 / 操作记录）=====
// 设计原则：纯旁路。
//   · 只用独立 key（login_log.json / oplog.json）落盘，不碰 users/records/mentors 等业务数据
//   · 内存缓冲 + 定时批量落盘，写失败只打日志，绝不影响主流程
//   · 记录条数上限滚动淘汰，避免无限膨胀
//   · 不记录密码、token 原文、答案正文
const crypto = require('crypto');
const db = require('./db');

const LOGIN_KEY = 'login_log.json';
const OPS_KEY = 'oplog.json';
const LOGIN_CAP = 5000;
const OPS_CAP = 15000;
const FLUSH_MS = 10000;

const loginBuf = [];
const opsBuf = [];
let flushingLogin = false;
let flushingOps = false;

// ---------- 基础字段 ----------
function clientIp(req) {
  if (!req) return '';
  const raw = req.headers['x-forwarded-for']
    ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
    : (req.ip || (req.socket && req.socket.remoteAddress) || '');
  return String(raw).slice(0, 60);
}

function deviceOf(req) {
  const d = req && req.headers['x-device-id'];
  return d ? String(d).slice(0, 64) : 'unknown-device';
}

function uaOf(req) {
  return String((req && req.headers['user-agent']) || '').slice(0, 180);
}

// 会话标识：只存 token 的短哈希，用于关联「同一次登录」，不暴露 token 原文
function sessionOf(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token)).digest('hex').slice(0, 12);
}

function limitedText(v, n) {
  return String(v == null ? '' : v).slice(0, n);
}

// ---------- 落盘 ----------
async function flushLogins() {
  if (flushingLogin || loginBuf.length === 0) return;
  flushingLogin = true;
  const batch = loginBuf.splice(0, loginBuf.length);
  try {
    await db.withLock(LOGIN_KEY, async () => {
      let arr = await db.readJSONRaw(LOGIN_KEY);
      if (!Array.isArray(arr)) arr = [];
      arr.push(...batch);
      if (arr.length > LOGIN_CAP) arr = arr.slice(arr.length - LOGIN_CAP);
      await db.writeRaw(LOGIN_KEY, arr);
    });
  } catch (e) {
    console.error('[audit] flushLogins error:', e.message);
    // 写失败把数据放回缓冲（最多保留上限条，避免内存膨胀）
    if (batch.length) {
      loginBuf.unshift(...batch);
      if (loginBuf.length > LOGIN_CAP) loginBuf.splice(0, loginBuf.length - LOGIN_CAP);
    }
  } finally {
    flushingLogin = false;
  }
}

async function flushOps() {
  if (flushingOps || opsBuf.length === 0) return;
  flushingOps = true;
  const batch = opsBuf.splice(0, opsBuf.length);
  try {
    await db.withLock(OPS_KEY, async () => {
      let arr = await db.readJSONRaw(OPS_KEY);
      if (!Array.isArray(arr)) arr = [];
      arr.push(...batch);
      if (arr.length > OPS_CAP) arr = arr.slice(arr.length - OPS_CAP);
      await db.writeRaw(OPS_KEY, arr);
    });
  } catch (e) {
    console.error('[audit] flushOps error:', e.message);
    if (batch.length) {
      opsBuf.unshift(...batch);
      if (opsBuf.length > OPS_CAP) opsBuf.splice(0, opsBuf.length - OPS_CAP);
    }
  } finally {
    flushingOps = false;
  }
}

setInterval(() => {
  flushLogins().catch(() => {});
  flushOps().catch(() => {});
}, FLUSH_MS);

// ---------- 登录记录 ----------
// info: { username(输入值), user(命中的账号对象，可为空), result:'ok'|'fail', reason }
function recordLogin(req, info) {
  try {
    const u = info && info.user;
    loginBuf.push({
      t: Date.now(),
      ip: clientIp(req),
      deviceId: deviceOf(req),
      ua: uaOf(req),
      username: limitedText(info && info.username, 60), // 用户实际输入的登录名（关键：即使失败也记录）
      uid: u ? limitedText(u.username, 60) : '',
      name: u ? limitedText(u.name, 60) : '',
      role: u ? (u.role || '') : '',
      result: info && info.result === 'ok' ? 'ok' : 'fail',
      reason: limitedText(info && info.reason, 80),
      sessionId: info && info.result === 'ok' && u ? sessionOf(u.token) : ''
    });
    if (loginBuf.length >= 40) flushLogins().catch(() => {});
  } catch (e) {
    console.error('[audit] recordLogin error:', e.message);
  }
}

// ---------- 操作记录 ----------
// op: { action, target, result, roleHint }
function recordOp(req, op) {
  try {
    const u = req && req.currentUser;
    opsBuf.push({
      t: Date.now(),
      uid: u ? limitedText(u.username, 60) : '',
      name: u ? limitedText(u.name, 60) : '',
      role: u ? (u.role || '') : (op && op.roleHint) || '',
      ip: clientIp(req),
      deviceId: deviceOf(req),
      action: limitedText(op && op.action, 60),
      target: limitedText(op && op.target, 120),
      result: (op && op.result) || 'ok',
      ms: (op && Number(op.ms)) || 0
    });
    if (opsBuf.length >= 60) flushOps().catch(() => {});
  } catch (e) {
    console.error('[audit] recordOp error:', e.message);
  }
}

// ---------- 操作埋点路由表 ----------
// 只记录「有审计价值」的接口：登录、看答案、评分、增删改、导出、越权
// 说明：审计查询接口本身不记录，避免刷页面把日志刷满
const OP_ROUTES = [
  // 账号
  { m: 'POST', p: /^\/api\/auth\/register\/?$/, a: '注册账号', t: (r) => (r.body && r.body.username) || '' },
  { m: 'PUT', p: /^\/api\/auth\/password\/?$/, a: '修改自己密码', t: () => '' },
  // 超管：用户与分配
  { m: 'POST', p: /^\/api\/admin\/mentors\/?$/, a: '新增导师', t: (r) => (r.body && (r.body.username || r.body.name)) || '' },
  { m: 'PUT', p: /^\/api\/admin\/users\/([^/]+)\/?$/, a: '修改用户', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'DELETE', p: /^\/api\/admin\/users\/([^/]+)\/?$/, a: '删除用户', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'PUT', p: /^\/api\/admin\/users\/([^/]+)\/reset-password\/?$/, a: '重置用户密码', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'POST', p: /^\/api\/admin\/users\/reset-all\/?$/, a: '重置全部密码', t: () => '' },
  { m: 'GET', p: /^\/api\/admin\/users\/export\/?$/, a: '导出用户列表', t: () => '' },
  { m: 'POST', p: /^\/api\/admin\/assign\/?$/, a: '管理员分配学员', t: (r) => (r.body && r.body.mentor) || '' },
  { m: 'GET', p: /^\/api\/admin\/assignments\/?$/, a: '查看全部分配', t: () => '' },
  // 导师：学员与分配
  { m: 'GET', p: /^\/api\/mentor\/assignments\/?$/, a: '查看学员分配', t: () => '' },
  { m: 'POST', p: /^\/api\/mentor\/assign\/?$/, a: '导师分配学员', t: () => '' },
  { m: 'PUT', p: /^\/api\/mentor\/students\/([^/]+)\/?$/, a: '修改学员信息', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'GET', p: /^\/api\/mentor\/students\/?$/, a: '查看学员列表', t: () => '' },
  // 答题记录（含标准答案的接口重点标记）
  { m: 'GET', p: /^\/api\/mentor\/records\/?$/, a: '查看答题记录列表', t: () => '' },
  { m: 'GET', p: /^\/api\/mentor\/records\/export\/?$/, a: '导出答题记录', t: () => '' },
  { m: 'GET', p: /^\/api\/mentor\/records\/([^/]+)\/?$/, a: '查看答卷详情（含标准答案）', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'PUT', p: /^\/api\/mentor\/records\/([^/]+)\/score\/?$/, a: '评分', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'DELETE', p: /^\/api\/mentor\/records\/([^/]+)\/score\/?$/, a: '撤销评分', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'DELETE', p: /^\/api\/mentor\/records\/([^/]+)\/?$/, a: '删除答题记录', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'DELETE', p: /^\/api\/mentor\/records\/?$/, a: '清空答题记录', t: () => '' },
  // 题库（含标准答案）
  { m: 'GET', p: /^\/api\/mentor\/questions\/?$/, a: '查看题库（含标准答案）', t: (r) => (r.query && r.query.panel) || 'all' },
  { m: 'GET', p: /^\/api\/mentor\/questions\/export\/?$/, a: '导出题库', t: () => '' },
  { m: 'PUT', p: /^\/api\/mentor\/questions\/([^/]+)\/([^/]+)\/?$/, a: '编辑题目', t: (r, m) => decodeURIComponent(m[1]) + '/' + decodeURIComponent(m[2]) },
  { m: 'POST', p: /^\/api\/mentor\/questions\/([^/]+)\/?$/, a: '新增题目', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'DELETE', p: /^\/api\/mentor\/questions\/([^/]+)\/([^/]+)\/?$/, a: '删除题目', t: (r, m) => decodeURIComponent(m[1]) + '/' + decodeURIComponent(m[2]) },
  // 薄弱点 / 次数
  { m: 'GET', p: /^\/api\/mentor\/weak-areas\/?$/, a: '查看薄弱点', t: () => '' },
  { m: 'GET', p: /^\/api\/mentor\/weak-areas\/([^/]+)\/?$/, a: '查看学员薄弱点', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'POST', p: /^\/api\/mentor\/reset-attempts\/?$/, a: '重置考试次数', t: (r) => (r.body && r.body.studentName) || '' },
  // 新品牌块
  { m: 'GET', p: /^\/api\/admin\/new-products\/?$/, a: '查看新品题库', t: () => '' },
  { m: 'POST', p: /^\/api\/admin\/new-products\/?$/, a: '新增新品题库', t: (r) => (r.body && r.body.title) || '' },
  { m: 'DELETE', p: /^\/api\/admin\/new-products\/([^/]+)\/?$/, a: '删除新品题库', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'GET', p: /^\/api\/admin\/question-template\/?$/, a: '下载题库模板', t: () => '' },
  { m: 'POST', p: /^\/api\/admin\/new-products\/import\/?$/, a: '导入新品题库', t: () => '' },
  { m: 'GET', p: /^\/api\/admin\/modules\/?$/, a: '查看板块配置', t: () => '' },
  { m: 'POST', p: /^\/api\/admin\/modules\/?$/, a: '新增板块', t: () => '' },
  { m: 'DELETE', p: /^\/api\/admin\/modules\/([^/]+)\/?$/, a: '删除板块', t: (r, m) => decodeURIComponent(m[1]) },
  { m: 'PUT', p: /^\/api\/admin\/modules\/([^/]+)\/?$/, a: '修改板块', t: (r, m) => decodeURIComponent(m[1]) },
  // 日志与考试
  { m: 'GET', p: /^\/api\/admin\/security\/logs\/?$/, a: '查看访问日志', t: () => '' },
  { m: 'POST', p: /^\/api\/start-exam\/?$/, a: '开始考试', t: (r) => (r.body && r.body.examId) || '' },
  { m: 'POST', p: /^\/api\/records\/?$/, a: '提交答卷', t: (r) => (r.body && (r.body.studentName || '')) + '|' + ((r.body && r.body.examId) || '') },
  { m: 'GET', p: /^\/api\/records\/([^/]+)\/?$/, a: '查看个人答题记录', t: (r, m) => decodeURIComponent(m[1]) }
];

function matchRoute(method, pathname) {
  for (const rule of OP_ROUTES) {
    if (rule.m !== method) continue;
    const m = rule.p.exec(pathname);
    if (m) return { rule, m };
  }
  return null;
}

// 解析请求身份（auth 中间件在 finish 阶段已执行完毕，一般可直接取到）
async function resolveUser(req) {
  if (req.currentUser) return req.currentUser;
  const tk = req.headers['x-auth-token'];
  if (!tk) return null;
  try {
    const users = await db.readObj('users.json');
    return Object.values(users).find(u => u.token === tk) || null;
  } catch (e) {
    return null;
  }
}

// Express 中间件：注册在业务路由之前，响应结束时旁路记一条操作日志
function middleware() {
  return function auditMiddleware(req, res, next) {
    try {
      const url = String(req.originalUrl || '');
      if (!url.startsWith('/api/')) return next();
      const pathname = url.split('?')[0];
      const hit = matchRoute(req.method, pathname);
      if (!hit) return next();
      const started = Date.now();
      res.on('finish', () => {
        resolveUser(req).then(u => {
          if (u && !req.currentUser) req.currentUser = u;
          const result = res.statusCode < 400 ? 'ok' : ('HTTP ' + res.statusCode);
          let target = '';
          try { target = hit.rule.t(req, hit.m) || ''; } catch (e) { target = ''; }
          recordOp(req, {
            action: hit.rule.a + (res.statusCode === 403 ? '（被拒绝）' : ''),
            target,
            result,
            ms: Date.now() - started,
            roleHint: u && u.role ? u.role : ''
          });
        }).catch(() => {});
      });
    } catch (e) {
      console.error('[audit] middleware error:', e.message);
    }
    next();
  };
}

// ---------- 查询 ----------
// 可见性：超管可见全部；导师及其他角色看不到 role === 'admin' 的记录
function visible(entry, viewerRole) {
  if (viewerRole === 'admin') return true;
  return entry.role !== 'admin';
}

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function filterByTime(arr, from, to) {
  const f = Number(from) || 0;
  const t = Number(to) || 0;
  if (!f && !t) return arr;
  return arr.filter(e => (!f || e.t >= f) && (!t || e.t <= t));
}

async function queryLogins(q, viewerRole) {
  let arr = await db.readJSONRaw(LOGIN_KEY);
  if (!Array.isArray(arr)) arr = [];
  arr = arr.filter(e => visible(e, viewerRole));

  if (q.user) {
    const s = String(q.user).toLowerCase();
    arr = arr.filter(e => (e.username || '').toLowerCase().includes(s)
      || (e.name || '').toLowerCase().includes(s)
      || (e.uid || '').toLowerCase().includes(s));
  }
  if (q.result === 'ok' || q.result === 'fail') arr = arr.filter(e => e.result === q.result);
  if (q.ip) {
    const s = String(q.ip);
    arr = arr.filter(e => (e.ip || '').includes(s));
  }
  arr = filterByTime(arr, q.from, q.to);

  const total = arr.length;
  const limit = num(q.limit, 200);
  const offset = num(q.offset, 0) || 0;
  const items = arr.slice().reverse().slice(offset, offset + limit);
  return { total, items };
}

async function queryOps(q, viewerRole) {
  let arr = await db.readJSONRaw(OPS_KEY);
  if (!Array.isArray(arr)) arr = [];
  arr = arr.filter(e => visible(e, viewerRole));

  if (q.user) {
    const s = String(q.user).toLowerCase();
    arr = arr.filter(e => (e.name || '').toLowerCase().includes(s) || (e.uid || '').toLowerCase().includes(s));
  }
  if (q.action) {
    const s = String(q.action);
    arr = arr.filter(e => (e.action || '').includes(s));
  }
  if (q.target) {
    const s = String(q.target).toLowerCase();
    arr = arr.filter(e => (e.target || '').toLowerCase().includes(s));
  }
  arr = filterByTime(arr, q.from, q.to);

  const total = arr.length;
  const limit = num(q.limit, 200);
  const offset = num(q.offset, 0) || 0;
  const items = arr.slice().reverse().slice(offset, offset + limit);
  return { total, items };
}

// 账号-设备-IP 关系聚合：一眼看出「同一台设备登录过哪些账号」
async function queryIdentity(q, viewerRole) {
  const from = q.from, to = q.to;
  const logins = filterByTime(await allLogins(viewerRole), from, to);
  const ops = filterByTime(await allOps(viewerRole), from, to);

  const byDevice = new Map();
  const byIp = new Map();

  function add(map, key, e) {
    if (!key || key === 'unknown-device') return;
    let item = map.get(key);
    if (!item) {
      item = { key, accounts: {}, ips: {}, devices: {}, lastSeen: 0, logins: 0, ops: 0, fails: 0 };
      map.set(key, item);
    }
    if (e.uid || e.username) {
      const label = e.name ? (e.name + '(' + (e.uid || e.username) + ')') : (e.uid || e.username);
      item.accounts[label] = (item.accounts[label] || 0) + 1;
    }
    if (e.ip) item.ips[e.ip] = (item.ips[e.ip] || 0) + 1;
    if (e.deviceId) item.devices[e.deviceId] = (item.devices[e.deviceId] || 0) + 1;
    if (e.t > item.lastSeen) item.lastSeen = e.t;
    if (e.result === 'fail') item.fails++;
  }

  for (const e of logins) {
    add(byDevice, e.deviceId, e);
    add(byIp, e.ip, e);
    const d = byDevice.get(e.deviceId); if (d) d.logins++;
    const p = byIp.get(e.ip); if (p) p.logins++;
  }
  for (const e of ops) {
    add(byDevice, e.deviceId, e);
    add(byIp, e.ip, e);
    const d = byDevice.get(e.deviceId); if (d) d.ops++;
    const p = byIp.get(e.ip); if (p) p.ops++;
  }

  function dump(map) {
    return Array.from(map.values())
      .map(it => ({
        key: it.key,
        accounts: Object.keys(it.accounts),
        accountCount: Object.keys(it.accounts).length,
        ips: Object.keys(it.ips),
        devices: Object.keys(it.devices),
        lastSeen: it.lastSeen,
        logins: it.logins,
        ops: it.ops,
        fails: it.fails
      }))
      .sort((a, b) => b.accountCount - a.accountCount || b.lastSeen - a.lastSeen)
      .slice(0, 50);
  }

  return { byDevice: dump(byDevice), byIp: dump(byIp) };
}

async function allLogins(viewerRole) {
  let arr = await db.readJSONRaw(LOGIN_KEY);
  if (!Array.isArray(arr)) arr = [];
  return arr.filter(e => visible(e, viewerRole));
}

async function allOps(viewerRole) {
  let arr = await db.readJSONRaw(OPS_KEY);
  if (!Array.isArray(arr)) arr = [];
  return arr.filter(e => visible(e, viewerRole));
}

module.exports = {
  recordLogin,
  recordOp,
  middleware,
  queryLogins,
  queryOps,
  queryIdentity,
  flush: async () => { await flushLogins(); await flushOps(); }
};
