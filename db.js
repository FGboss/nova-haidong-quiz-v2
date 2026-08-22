// 数据持久化层 — Supabase REST API
// 通过 HTTPS 访问 Supabase PostgreSQL，沙箱和 Render 均可使用
// 替代了原来不稳定的 SQLite + GitHub 备份方案

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://bmwygbfgdsgmixzspurs.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtd3lnYmZnZHNnbWl4enNwdXJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzAyNTU5OCwiZXhwIjoyMTAyNjAxNTk4fQ.zUBYC8tDfHfBvT0QsNJDDNo7qEtJbWuW9tMDrqil2JU';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// ===== 内存缓存层 =====
// 解决：每个请求反复访问 Supabase（4次往返≈1.5~3s）
// 策略：读缓存 5 秒 TTL + 写入成功后才更新缓存 + 读-改-写整段串行锁（防并发覆盖丢记录）
const CACHE_TTL = 5000; // 5 秒
const _cache = new Map();       // key -> { value, expireAt }
const _writeLocks = new Map();  // key -> Promise 链（串行化）

function cacheGet(key) {
  const item = _cache.get(key);
  if (!item) return undefined;
  if (Date.now() > item.expireAt) { _cache.delete(key); return undefined; }
  return item.value;
}

function cacheSet(key, value) {
  _cache.set(key, { value, expireAt: Date.now() + CACHE_TTL });
}

function cacheInvalidate(key) {
  _cache.delete(key);
}

// 通用串行锁：同一 key 的整段操作（读-改-写）排队执行
function withLock(key, fn) {
  const prev = _writeLocks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  _writeLocks.set(key, next.catch(() => {}));
  return next;
}

// ===== 原始读写（不带缓存/不带锁，供锁内使用） =====
async function readJSONRaw(key) {
  try {
    const { data, error } = await supabase
      .from('store')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return [];
    return JSON.parse(data.value);
  } catch(e) {
    console.error(`[db] readJSONRaw(${key}) error:`, e.message);
    return [];
  }
}

async function readObjRaw(key) {
  try {
    const { data, error } = await supabase
      .from('store')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return {};
    const parsed = JSON.parse(data.value);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch(e) {
    console.error(`[db] readObjRaw(${key}) error:`, e.message);
    return {};
  }
}

async function writeRaw(key, data) {
  const json = JSON.stringify(data);
  const { error } = await supabase
    .from('store')
    .upsert({ key, value: json }, { onConflict: 'key' });
  if (error) {
    console.error(`[db] writeRaw(${key}) error:`, error.message);
    cacheInvalidate(key);
    return false;
  }
  cacheSet(key, data); // 写库成功后才更新缓存
  return true;
}

// ===== 初始化数据库 =====
async function init() {
  // 测试连接：尝试查询 store 表
  const { data, error } = await supabase.from('store').select('key', { count: 'exact', head: true });
  if (error) {
    console.log('[db] Supabase client initialized. (Table may need SQL setup: CREATE TABLE IF NOT EXISTS store...)');
  } else {
    console.log('[db] Supabase connected — cloud database ready');
  }
  return supabase;
}

// ===== 数据读写（API 与旧版本完全兼容） =====
async function readJSON(key) {
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  const parsed = await readJSONRaw(key);
  if (Array.isArray(parsed)) cacheSet(key, parsed);
  return parsed;
}

async function readObj(key) {
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  const obj = await readObjRaw(key);
  cacheSet(key, obj);
  return obj;
}

async function writeJSON(key, data) {
  return withLock(key, () => writeRaw(key, data));
}

async function writeObj(key, data) {
  return withLock(key, () => writeRaw(key, data));
}

// ===== 事务包装 =====
// Supabase REST API 不支持原生事务，但单条 upsert 是原子操作
// 对于需要批量操作的场景，多次连续调用即可
async function transaction(fn) {
  return await fn();
}

// ===== 数据库统计 =====
async function stats() {
  try {
    const { count, error } = await supabase
      .from('store')
      .select('*', { count: 'exact', head: true });
    if (error) return { totalKeys: 0 };
    return { totalKeys: count || 0 };
  } catch(e) {
    return { totalKeys: 0 };
  }
}

// ===== 关闭连接（Supabase 客户端无需显式关闭） =====
async function close() {
  console.log('[db] Supabase client released');
}

module.exports = {
  init, close, stats,
  readJSON, readObj, writeJSON, writeObj,
  readJSONRaw, readObjRaw, writeRaw, withLock,
  transaction
};
