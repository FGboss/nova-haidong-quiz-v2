(function(){
'use strict';

// ===== 配置 =====
const API_BASE = window.location.origin;
const PASSING_SCORE = 95;
const MAX_ATTEMPTS = 10;
const PANEL_LABELS = { newbie:'新人专项', training:'新人培训专项（祥雨/伟桀）', tech:'技术进阶', sales:'销售进阶', client:'客户端考核', new_product:'新品考核' };
const PANEL_COLORS = { newbie:'newbie', training:'training', tech:'tech', sales:'sales', client:'client', new_product:'new-product' };
const PANEL_ICONS = { newbie:'📚', training:'🎓', tech:'🔧', sales:'💼', client:'🏢', new_product:'🆕' };
const PANEL_DESCS = {
  newbie:'3周系统培训考核，每日一考+周考，15套试卷覆盖产品基础知识',
  training:'嗨动产品线新人培训考核，5大产品系列，按百分比评分+随机出题',
  tech:'按产品系列深度考核，涵盖参数、性能、技术排查和系统架构',
  sales:'按产品系列考核，侧重方案搭配、选型推荐和场景应用能力',
  client:'客户现场培训考核，按产品系列出题，模拟纸质试卷模式',
  new_product:'新品培训考核，持续更新中'
};
const TYPE_LABELS = { single:'单选题', multiple:'多选题', judge:'判断题', short:'简答题' };

// ===== 状态 =====
let state = {
  page:'login',
  authToken:null,
  currentUser:null,
  panel:null,
  panelInfo:null,
  exams:[],
  currentExam:null,
  questions:[],
  answers:{},
  quizStartTime:null,
  quizTimer:null,
  quizTimeLeft:0,
  attemptNumber:0,
  remainingAttempts:0,
  _submitting:false,
  lastRecord:null,
  // Mentor/Admin
  mentorTab:'overview',
  mentorPanel:'all',
  mentorRecords:[],
  mentorStudents:[],
  mentorExams:[],
  // Admin
  adminTab:'users',
  adminUsers:[],
  adminAssignments:[],
  // Modules & products
  modules:{ fixedModules:{}, customModules:{} },
  allProducts:[],
  // Search
  searchQuery:'',
  searchStudent:'',
  // Scoring filter
  scoringFilter:'unscored',
};

// ===== 工具函数 =====
function $(sel){ return document.querySelector(sel); }
function $$(sel){ return document.querySelectorAll(sel); }
function escapeHtml(s){ const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
function jsEscape(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"'); }
function formatTime(sec){ const m=Math.floor(sec/60),s=sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function api(path, opts={}){
  const url = path.startsWith('http') ? path : API_BASE + path;
  const headers = opts.headers || { 'Content-Type':'application/json' };
  if (state.authToken) headers['x-auth-token'] = state.authToken;
  return fetch(url, { ...opts, headers }).then(r => r.json());
}
function showToast(msg, type='info'){
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.remove(); }, 2500);
}

// ===== 渲染引擎 =====
function render(){
  const app = $('#app');
  if (!app) return;
  app.innerHTML = '';
  if (!state.authToken || !state.currentUser) { state.page='login'; renderLogin(app); return; }
  switch(state.page){
    case 'login': renderLogin(app); break;
    case 'home': renderHome(app); break;
    case 'panel': renderPanel(app); break;
    case 'quiz': renderQuiz(app); break;
    case 'result': renderResult(app); break;
    case 'mentor': renderMentor(app); break;
    case 'admin': renderAdmin(app); break;
    default: renderHome(app); break;
  }
}

// ===== 登录/注册 =====
function renderLogin(app){
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:20px">
      <div style="background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:100%;max-width:420px;overflow:hidden">
        <div style="text-align:center;padding:30px 20px 10px">
          <div style="font-size:48px;margin-bottom:8px">📝</div>
          <h2 style="font-size:20px;font-weight:800">诺瓦&嗨动 产品培训考核系统</h2>
          <p style="font-size:13px;color:#64748b;margin-top:4px">V3 · 学员/导师登录</p>
        </div>
        <div style="display:flex;border-bottom:1px solid #e2e8f0">
          <div class="auth-tab active" id="tabLogin" onclick="APP.switchAuthTab('login')" style="flex:1;padding:12px;text-align:center;font-size:14px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s">登录</div>
          <div class="auth-tab" id="tabRegister" onclick="APP.switchAuthTab('register')" style="flex:1;padding:12px;text-align:center;font-size:14px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s">学员注册</div>
        </div>
        <div id="authForm" style="padding:20px 24px 24px"></div>
        
      </div>
    </div>`;
  renderLoginForm();
}

function switchAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab' + (tab === 'login' ? 'Login' : 'Register')).classList.add('active');
  renderLoginForm(tab);
}

function renderLoginForm(tab){
  tab = tab || 'login';
  const form = document.getElementById('authForm');
  if (!form) return;
  if (tab === 'login'){
    form.innerHTML = `
      <div class="form-group">
        <label class="form-label">用户名</label>
        <input class="form-input" id="loginUsername" placeholder="输入用户名" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input class="form-input" id="loginPassword" type="password" placeholder="输入密码">
      </div>
      <button class="btn btn-primary" style="width:100%;padding:12px;font-size:15px" id="loginBtn">登 录</button>`;
    setTimeout(() => {
      const userEl = $('#loginUsername');
      const pwdEl = $('#loginPassword');
      const btnEl = $('#loginBtn');
      if (!userEl || !pwdEl || !btnEl) return;
      const doLogin = () => {
        const username = userEl.value.trim();
        const password = pwdEl.value;
        if (!username || !password) { showToast('请输入用户名和密码','error'); return; }
        APP.doLogin(username, password);
      };
      pwdEl.addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
      btnEl.onclick = doLogin;
    }, 0);
  } else {
    form.innerHTML = `
      <div class="form-group">
        <label class="form-label">用户名（用于登录）</label>
        <input class="form-input" id="regUsername" placeholder="2-20个字符" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">姓名（真实姓名）</label>
        <input class="form-input" id="regName" placeholder="输入你的真实姓名">
      </div>
      <div class="form-group">
        <label class="form-label">密码</label>
        <input class="form-input" id="regPassword" type="password" placeholder="至少4位">
      </div>
      <div class="form-group">
        <label class="form-label">确认密码</label>
        <input class="form-input" id="regPassword2" type="password" placeholder="再次输入密码">
      </div>
      <button class="btn btn-primary" style="width:100%;padding:12px;font-size:15px" id="regBtn">注 册</button>`;
    setTimeout(() => {
      const btnEl = $('#regBtn');
      const pwd2El = $('#regPassword2');
      if (!btnEl || !pwd2El) return;
      const doReg = () => {
        const username = $('#regUsername').value.trim();
        const name = $('#regName').value.trim();
        const password = $('#regPassword').value;
        const password2 = $('#regPassword2').value;
        if (!username || !name || !password) { showToast('请填写所有字段','error'); return; }
        if (password !== password2) { showToast('两次密码不一致','error'); return; }
        APP.doRegister(username, password, name);
      };
      pwd2El.addEventListener('keydown', e => { if (e.key==='Enter') doReg(); });
      btnEl.onclick = doReg;
    }, 0);
  }
}

async function doLogin(username, password){
  try {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ username, password })
    }).then(r => r.json());
    if (res.success){
      state.authToken = res.user.token;
      state.currentUser = res.user;
      localStorage.setItem('quiz_auth_token', res.user.token);
      localStorage.setItem('quiz_current_user', JSON.stringify(res.user));
      state.page = 'home';
      render();
    } else {
      showToast(res.error || '登录失败','error');
    }
  } catch(e){ showToast('网络错误','error'); }
}

async function doRegister(username, password, name){
  try {
    const res = await fetch(API_BASE + '/api/auth/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ username, password, name })
    }).then(r => r.json());
    if (res.success){
      state.authToken = res.user.token;
      state.currentUser = res.user;
      localStorage.setItem('quiz_auth_token', res.user.token);
      localStorage.setItem('quiz_current_user', JSON.stringify(res.user));
      showToast('注册成功！','success');
      state.page = 'home';
      render();
    } else {
      showToast(res.error || '注册失败','error');
    }
  } catch(e){ showToast('网络错误','error'); }
}

function logout(){
  clearInterval(state.quizTimer);
  state.authToken = null;
  state.currentUser = null;
  state.page = 'login';
  localStorage.removeItem('quiz_auth_token');
  localStorage.removeItem('quiz_current_user');
  render();
}

// ===== 首页 =====
async function renderHome(app){
  const user = state.currentUser;
  const isAdmin = user.role === 'admin';
  const isMentor = user.role === 'mentor' || isAdmin;

  // Load modules from API
  try {
    const modRes = await api('/api/admin/modules');
    if (modRes.success) {
      state.modules = { fixedModules: modRes.fixedModules || {}, customModules: modRes.customModules || {} };
      state.allProducts = modRes.products || [];
    }
  } catch(e) { console.error('load modules:', e); }

  // Build panel list
  const fixedPanels = ['newbie', 'training', 'tech', 'sales', 'client'];
  const dynamicPanels = [];
  for (const [id, mod] of Object.entries(state.modules.fixedModules || {})) {
    if (fixedPanels.includes(id)) continue;
    if ((mod.bankIds || []).length > 0) dynamicPanels.push({ id, ...mod });
  }
  for (const [id, mod] of Object.entries(state.modules.customModules || {})) {
    if ((mod.bankIds || []).length > 0) dynamicPanels.push({ id, ...mod });
  }

  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div>
          <h1>诺瓦&嗨动 产品培训考核系统</h1>
          <p>Nova & Hynamic Product Training & Assessment</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:13px;opacity:.9">${escapeHtml(user.name)} (${user.role==='admin'?'管理员':user.role==='mentor'?'导师':'学员'})</span>
          ${isMentor ? `<button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="APP.goMentor()">管理面板</button>` : ''}
          ${isAdmin ? `<button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="APP.goAdmin()">用户管理</button>` : ''}
          <button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="APP.viewMyRecords()">我的记录</button>
          <button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="APP.logout()">退出</button>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="home-hero">
        <h1>选择考核板块</h1>
        <p>请根据你的培训阶段选择对应的考核板块</p>
      </div>
      <div class="panel-grid">
        ${fixedPanels.map(p => renderPanelCard(p)).join('')}
        ${dynamicPanels.map(m => renderDynamicPanelCard(m)).join('')}
      </div>
    </div>`;
}

function renderPanelCard(panel){
  const examCounts = { newbie:15, training:5, tech:8, sales:8, client:8 };
  return `
    <div class="panel-card ${panel}" onclick="APP.enterPanel('${panel}')">
      <div class="panel-icon">${PANEL_ICONS[panel]||'📋'}</div>
      <div class="panel-title">${PANEL_LABELS[panel]||panel}</div>
      <div class="panel-desc">${PANEL_DESCS[panel]||''}</div>
      <div class="panel-meta">
        <span class="badge badge-${panel}">${examCounts[panel]||8}套考试</span>
        <span class="badge badge-${panel}">18题/套</span>
        <span class="badge badge-${panel}">95分及格</span>
      </div>
    </div>`;
}

function renderDynamicPanelCard(mod){
  const examCount = (mod.bankIds || []).length;
  return `
    <div class="panel-card new-product" onclick="APP.enterPanel('${mod.id}','${escapeHtml(mod.name)}','${escapeHtml(mod.icon||'📋')}')">
      <div class="panel-icon">${mod.icon||'📋'}</div>
      <div class="panel-title">${escapeHtml(mod.name)}</div>
      <div class="panel-desc">${escapeHtml(mod.desc||'')}</div>
      <div class="panel-meta">
        <span class="badge badge-new-product">${examCount}套考试</span>
        <span class="badge badge-new-product">18题/套</span>
        <span class="badge badge-new-product">95分及格</span>
      </div>
    </div>`;
}

// ===== 进入板块 =====
async function enterPanel(panel, panelName, panelIcon){
  state.panel = panel;
  state.panelInfo = panelName ? { name: panelName, icon: panelIcon } : null;
  state.page = 'panel';
  const res = await api(`/api/exams?panel=${panel}`);
  if (res.success){
    state.exams = res.exams;
    const attRes = await api(`/api/attempts/${encodeURIComponent(state.currentUser.name)}`);
    if (attRes.success){
      state.exams = state.exams.map(e => ({
        ...e,
        _attempts: (attRes.attempts[e.id] || 0),
        _blocked: (attRes.attempts[e.id] || 0) >= MAX_ATTEMPTS
      }));
    }
    render();
  }
}

async function enterNewProduct(productId){
  state.panel = 'new_product';
  state.page = 'panel';
  const res = await api('/api/exams?panel=new_product');
  if (res.success){
    state.exams = res.exams.filter(e => e.id === productId);
    const attRes = await api(`/api/attempts/${encodeURIComponent(state.currentUser.name)}`);
    if (attRes.success){
      state.exams = state.exams.map(e => ({
        ...e,
        _attempts: (attRes.attempts[e.id] || 0),
        _blocked: (attRes.attempts[e.id] || 0) >= MAX_ATTEMPTS
      }));
    }
    render();
  }
}

// ===== 板块考试列表 =====
function renderPanel(app){
  const panel = state.panel;
  const exams = state.exams || [];
  const user = state.currentUser;

  let html = `
    <div class="header">
      <div class="header-inner">
        <div>
          <div class="nav-back" onclick="APP.goHome()">← 返回首页</div>
          <h1 style="margin-top:4px">${state.panelInfo ? (state.panelInfo.icon + ' ' + state.panelInfo.name) : (PANEL_LABELS[panel] || '考核')}</h1>
        </div>
        <div>
          <span style="font-size:13px;opacity:.9">${escapeHtml(user.name)}</span>
          <button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3);margin-left:8px" onclick="APP.goHome()">返回</button>
        </div>
      </div>
    </div>
    <div class="container">`;

  if (panel === 'newbie'){
    const weeks = [1,2,3];
    for (const w of weeks){
      const weekExams = exams.filter(e => e.week === w);
      if (weekExams.length === 0) continue;
      html += `<div class="week-section"><div class="week-title">📅 第${w}周</div>`;
      html += renderExamList(weekExams);
      html += `</div>`;
    }
  } else {
    const brands = [
      { key:'诺瓦', label:'诺瓦 (NovaStar)', dot:'nova' },
      { key:'嗨动', label:'嗨动 (Hynamic)', dot:'haidong' },
      { key:'综合', label:'综合考核', dot:'' }
    ];
    for (const b of brands){
      const brandExams = exams.filter(e => e.brand === b.key);
      if (brandExams.length === 0) continue;
      html += `<div class="brand-section"><div class="brand-title">${b.dot ? `<span class="brand-dot ${b.dot}"></span>` : ''}${b.label}</div>`;
      html += renderExamList(brandExams);
      html += `</div>`;
    }
  }

  html += `<div style="text-align:center;margin-top:20px;color:var(--text-sec);font-size:13px">
    每套考试最多 ${MAX_ATTEMPTS} 次尝试机会 · 及格线 ${PASSING_SCORE} 分 · 每次随机抽题
  </div></div>`;

  app.innerHTML = html;

  $$('.exam-item:not(.blocked)').forEach(el => {
    el.addEventListener('click', () => {
      startExam(el.dataset.examId);
    });
  });
}

function renderExamList(exams){
  return `<div class="exam-list">${exams.map(e => `
    <div class="exam-item${e._blocked ? ' blocked' : ''}" data-exam-id="${e.id}">
      <div class="exam-item-info">
        <div class="exam-item-title">${escapeHtml(e.title)}</div>
        <div class="exam-item-desc">${e.totalQuestions}题 · ${e.duration}分钟 · ${e._blocked ? '已达上限' : (e._attempts > 0 ? `已答${e._attempts}次` : '未答')}</div>
      </div>
      <div class="exam-item-meta">
        ${e._blocked ? '<span class="badge badge-danger">已达上限</span>' : '<span class="badge badge-success">可答题</span>'}
        <span style="font-size:20px">→</span>
      </div>
    </div>`).join('')}</div>`;
}

// ===== 开始考试 =====
async function startExam(examId){
  if (!state.currentUser) return;
  const res = await api('/api/start-exam', {
    method:'POST',
    body:JSON.stringify({ studentName: state.currentUser.name, examId })
  });
  if (!res.success){
    if (res.blocked){
      showToast(`该考试已达最大尝试次数（${MAX_ATTEMPTS}次）`,'warning');
      if (res.bestRecord) showToast(`历史最佳成绩：${res.bestRecord.score}分`,'info');
    } else {
      showToast(res.message || '开始考试失败','error');
    }
    return;
  }
  state.currentExam = res.exam;
  state.questions = res.questions;
  state.answers = {};
  state.attemptNumber = res.attemptNumber;
  state.remainingAttempts = res.remainingAttempts;
  state.quizTimeLeft = res.timeLimit;
  state.page = 'quiz';
  state._submitting = false;
  render();
  startTimer();
}

// ===== 答题引擎 =====
function renderQuiz(app){
  const exam = state.currentExam;
  const questions = state.questions;
  const answered = Object.keys(state.answers).length;

  app.innerHTML = `
    <div class="quiz-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="nav-back" style="color:var(--text)" onclick="APP.confirmExitQuiz()">← 退出</span>
        <span style="font-size:14px;font-weight:600">${escapeHtml(exam.title)}</span>
        <span class="quiz-timer" id="quizTimer">⏱ ${formatTime(state.quizTimeLeft)}</span>
      </div>
      <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center">
        <span class="quiz-progress" id="quizProgress">已答 ${answered} / ${questions.length} · 第${state.attemptNumber}次答题</span>
        <button class="btn btn-success btn-sm" onclick="APP.confirmSubmit()">提交试卷</button>
      </div>
    </div>
    <div class="container" style="padding-top:16px" id="questionContainer">
      ${questions.map((q, i) => renderQuestion(q, i)).join('')}
    </div>
    <div style="text-align:center;padding:20px">
      <button class="btn btn-success btn-lg" onclick="APP.confirmSubmit()">提交试卷</button>
    </div>`;

  bindQuestionEvents();
}

function renderQuestion(q, i){
  const typeLabel = TYPE_LABELS[q.type] || '单选题';
  const pts = q.points || 5;
  let html = `
    <div class="question-card" id="q_${q.id}">
      <span class="question-type ${q.type}">${typeLabel} · ${pts}分</span>
      <div class="question-text">${i+1}. ${escapeHtml(q.question)} ${q.type==='multiple' ? '<span style="color:var(--warning);font-size:12px">（多选）</span>' : ''}</div>`;

  if (q.type === 'single'){
    html += `<div class="question-options">${(q.options||[]).map((opt,oi) => `
      <div class="option-item" data-qid="${q.id}" data-answer="${String.fromCharCode(65+oi)}" data-type="single">
        <div class="option-radio"></div>
        <div class="option-text">${String.fromCharCode(65+oi)}. ${escapeHtml(opt)}</div>
      </div>`).join('')}</div>`;
  } else if (q.type === 'multiple'){
    html += `<div class="question-options">${(q.options||[]).map((opt,oi) => `
      <div class="option-item" data-qid="${q.id}" data-answer="${String.fromCharCode(65+oi)}" data-type="multiple">
        <div class="option-checkbox"></div>
        <div class="option-text">${String.fromCharCode(65+oi)}. ${escapeHtml(opt)}</div>
      </div>`).join('')}</div>`;
  } else if (q.type === 'judge'){
    html += `<div class="judge-btns">
      <div class="judge-btn" data-qid="${q.id}" data-answer="A" data-type="judge">✓ 正确</div>
      <div class="judge-btn" data-qid="${q.id}" data-answer="B" data-type="judge">✗ 错误</div>
    </div>`;
  } else if (q.type === 'short'){
    html += `<textarea class="short-answer" data-qid="${q.id}" data-type="short" placeholder="请输入你的答案..."></textarea>`;
  }

  html += `</div>`;
  return html;
}

function bindQuestionEvents(){
  $$('.option-item[data-type="single"], .judge-btn[data-type="judge"]').forEach(el => {
    el.addEventListener('click', () => {
      const qid = el.dataset.qid;
      state.answers[qid] = el.dataset.answer;
      const qEl = $(`#q_${qid}`);
      if (el.dataset.type==='single') qEl.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected'));
      else qEl.querySelectorAll('.judge-btn').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      updateProgress();
    });
  });

  $$('.option-item[data-type="multiple"]').forEach(el => {
    el.addEventListener('click', () => {
      const qid = el.dataset.qid;
      el.classList.toggle('selected');
      const selected = [];
      $(`#q_${qid}`).querySelectorAll('.option-item.selected').forEach(o => selected.push(o.dataset.answer));
      state.answers[qid] = selected.sort().join('');
      updateProgress();
    });
  });

  $$('.short-answer').forEach(el => {
    el.addEventListener('input', () => {
      state.answers[el.dataset.qid] = el.value;
      updateProgress();
    });
  });

  // 恢复已选答案
  for (const qid in state.answers){
    const ans = state.answers[qid];
    const qEl = $(`#q_${qid}`);
    if (!qEl) continue;
    const firstItem = qEl.querySelector('.option-item, .judge-btn');
    if (!firstItem) continue;
    const type = firstItem.dataset.type;
    if (type==='single' || type==='judge'){
      const target = qEl.querySelector(`[data-answer="${ans}"]`);
      if (target) target.classList.add('selected');
    } else if (type==='multiple'){
      for (const ch of ans){
        const target = qEl.querySelector(`[data-answer="${ch}"]`);
        if (target) target.classList.add('selected');
      }
    }
  }
}

function updateProgress(){
  const answered = Object.keys(state.answers).length;
  const el = $('#quizProgress');
  if (el) el.textContent = `已答 ${answered} / ${state.questions.length} · 第${state.attemptNumber}次答题`;
}

function startTimer(){
  clearInterval(state.quizTimer);
  state.quizTimer = setInterval(() => {
    state.quizTimeLeft--;
    const el = $('#quizTimer');
    if (el){
      el.textContent = `⏱ ${formatTime(state.quizTimeLeft)}`;
      if (state.quizTimeLeft <= 300) el.style.color = 'var(--danger)';
    }
    if (state.quizTimeLeft <= 0){
      clearInterval(state.quizTimer);
      showToast('时间到，自动提交！','warning');
      submitQuiz();
    }
  }, 1000);
}

function confirmExitQuiz(){
  if (Object.keys(state.answers).length > 0){
    if (!confirm('退出后答题进度将丢失，确定退出吗？')) return;
  }
  clearInterval(state.quizTimer);
  state.page = 'panel';
  render();
}

function confirmSubmit(){
  const answered = Object.keys(state.answers).length;
  const total = state.questions.length;
  if (answered < total){
    if (!confirm(`还有 ${total - answered} 题未作答，确定提交吗？`)) return;
  }
  submitQuiz();
}

async function submitQuiz(){
  if (state._submitting) return;
  state._submitting = true;
  clearInterval(state.quizTimer);

  const record = {
    studentName: state.currentUser.name,
    examId: state.currentExam.id,
    panel: state.panel,
    questions: state.questions,
    answers: state.answers,
    attemptNumber: state.attemptNumber,
    submitTime: new Date().toISOString(),
    timeSpent: (state.currentExam.duration * 60) - state.quizTimeLeft
  };

  try {
    const res = await api('/api/records', { method:'POST', body:JSON.stringify(record) });
    if (res.success){
      state.lastRecord = res.record;
      state.page = 'result';
      render();
    } else {
      showToast('提交失败，请重试','error');
      state._submitting = false;
    }
  } catch(e){
    showToast('网络错误，提交失败','error');
    state._submitting = false;
  }
}

// ===== 成绩展示 =====
function renderResult(app){
  const record = state.lastRecord;
  const exam = state.currentExam;
  if (!record) { render(); return; }

  const score = record.finalScore !== undefined ? record.finalScore : record.autoScore;
  const passed = record.passed;
  const typeScores = record.typeScores || {};

  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div class="nav-back" onclick="APP.backToPanel()">← 返回列表</div>
        <span style="font-size:14px;font-weight:600">${escapeHtml(exam.title)}</span>
        <span></span>
      </div>
    </div>
    <div class="container">
      <div class="score-display">
        <div class="score-number ${passed ? 'score-pass' : 'score-fail'}">${score}<span style="font-size:24px;font-weight:500;opacity:0.6"> / 100</span></div>
        <div class="score-label">最终得分</div>
        <div class="score-status ${passed ? 'score-pass' : 'score-fail'}">${passed ? '🎉 恭喜通过！' : '继续加油！'}</div>
        <div style="font-size:13px;color:var(--text-sec);margin-top:4px">第${record.attemptNumber}次答题 · 剩余${state.remainingAttempts}次机会</div>
      </div>
      <div class="score-breakdown">
        ${['single','multiple','judge','short'].map(t => `
          <div class="score-item">
            <div class="score-item-label">${TYPE_LABELS[t]}</div>
            <div class="score-item-value">${(typeScores[t]||{}).score||0} / ${(typeScores[t]||{}).max||0}</div>
          </div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:20px;display:flex;gap:12px;justify-content:center">
        ${state.remainingAttempts > 0 ? `<button class="btn btn-primary" onclick="APP.retryExam()">再次答题（${state.remainingAttempts}次）</button>` :
          `<button class="btn btn-outline" disabled>已达上限</button>`}
        <button class="btn btn-outline" onclick="APP.backToPanel()">返回列表</button>
      </div>
    </div>`;
}

function retryExam(){
  if (state.remainingAttempts <= 0){ showToast('已达最大尝试次数','error'); return; }
  startExam(state.currentExam.id);
}

function backToPanel(){
  state.page = 'panel';
  render();
  enterPanel(state.panel);
}

function goHome(){
  clearInterval(state.quizTimer);
  state.page = 'home';
  state.panel = null;
  state.panelInfo = null;
  state.currentExam = null;
  render();
}

// ===== 模块辅助函数 =====
function getAllModuleIds(){
  const ids = ['newbie', 'training', 'tech', 'sales', 'client'];
  for (const [id, mod] of Object.entries(state.modules.fixedModules || {})) {
    if (ids.includes(id)) continue;
    if ((mod.bankIds || []).length > 0) ids.push(id);
  }
  for (const [id, mod] of Object.entries(state.modules.customModules || {})) {
    if ((mod.bankIds || []).length > 0) ids.push(id);
  }
  return ids;
}

function getModuleName(panelId){
  if (PANEL_LABELS[panelId]) return PANEL_LABELS[panelId];
  const mod = (state.modules.fixedModules || {})[panelId] || (state.modules.customModules || {})[panelId];
  return mod ? mod.name : panelId;
}

// ===== 我的记录 =====
async function viewMyRecords(){
  try {
    const res = await api(`/api/records/${encodeURIComponent(state.currentUser.name)}`);
    if (!res.success){ showToast('加载失败','error'); return; }
    const records = res.records || [];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal fade-in" style="max-width:800px">
        <div class="modal-header">
          <span>${escapeHtml(state.currentUser.name)} - 我的答题记录（${records.length}条）</span>
          <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
          ${records.length === 0 ? '<div class="empty-state"><div class="empty-state-text">暂无答题记录</div></div>' : ''}
          ${records.sort((a,b) => new Date(b.submitTime) - new Date(a.submitTime)).map(r => {
            const score = r.finalScore !== undefined ? r.finalScore : r.autoScore;
            const panel = r.panel || 'newbie';
            return `<div class="answer-detail" style="cursor:pointer" onclick="APP.viewRecordDetailById('${r.id}')">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <span class="badge badge-${PANEL_COLORS[panel]||'newbie'}">${PANEL_LABELS[panel]||'新人'}</span>
                  <strong style="margin-left:8px">${escapeHtml(r.examId)}</strong>
                </div>
                <div>
                  <span style="font-weight:700;font-size:18px;color:${score >= PASSING_SCORE ? 'var(--success)' : 'var(--danger)'}">${score}分</span>
                  <span style="font-size:12px;color:var(--text-sec);margin-left:8px">${r.passed ? '✅通过' : '❌未通过'}</span>
                  ${r.mentorScored ? '<span class="badge badge-success" style="margin-left:4px">已评</span>' : ''}
                </div>
              </div>
              <div style="font-size:12px;color:var(--text-sec);margin-top:4px">第${r.attemptNumber||1}次 · ${new Date(r.submitTime).toLocaleString('zh-CN')}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">关闭</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  } catch(e){ showToast('加载失败','error'); }
}

async function viewRecordDetailById(recordId){
  try {
    const res = await api(`/api/mentor/records/${recordId}`);
    if (!res.success){ showToast('记录不存在','error'); return; }
    showRecordDetailModal(res.record);
  } catch(e){ showToast('加载失败','error'); }
}

function showRecordDetailModal(record){
  const questions = record.questions || [];
  const answers = record.answers || {};
  const questionScores = record.questionScores || {};
  const score = record.finalScore !== undefined ? record.finalScore : record.autoScore;

  // 移除已有的弹窗
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:700px">
      <div class="modal-header">
        <span>${escapeHtml(record.studentName)} - ${escapeHtml(record.examId)}</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto">
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div class="stat-card"><div class="stat-value">${score}</div><div class="stat-label">最终得分</div></div>
          <div class="stat-card"><div class="stat-value">${record.autoScore||0}</div><div class="stat-label">自动评分</div></div>
          <div class="stat-card"><div class="stat-value">${record.mentorScored ? '✅' : '❌'}</div><div class="stat-label">是否已评</div></div>
        </div>
        ${questions.map((q, i) => {
          const userAns = answers[q.id] || '(未作答)';
          const qs = questionScores[q.id] || {};
          const gotScore = qs.score !== undefined ? qs.score : 0;
          const maxScore = qs.maxScore || q.points || 5;
          const isCorrect = gotScore >= maxScore;
          return `<div class="answer-detail">
            <div class="answer-detail-q">${i+1}. [${TYPE_LABELS[q.type]||'单题'}] ${escapeHtml(q.question)}</div>
            <div style="font-size:13px;margin-top:4px">
              <span style="color:var(--text-sec)">你的答案：</span>${escapeHtml(userAns)}
              ${q.answer ? `<span style="margin-left:8px;color:var(--text-sec)">正确答案：</span>${escapeHtml(q.answer)}` : ''}
            </div>
            <div style="font-size:12px;margin-top:2px">
              <span class="${isCorrect ? 'answer-correct' : 'answer-wrong'}">得分：${gotScore}/${maxScore}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">关闭</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ===== 导师/管理面板 =====
async function goMentor(){
  state.page = 'mentor';
  state.mentorTab = 'overview';
  await syncAllRecords();
  render();
}

async function goAdmin(){
  state.page = 'admin';
  state.adminTab = 'users';
  await loadAdminUsers();
  render();
}

async function syncAllRecords(){
  if (!state.authToken) return;
  try {
    const res = await api('/api/mentor/records');
    if (res.success) state.mentorRecords = res.records;
    const studentsRes = await api('/api/mentor/students');
    if (studentsRes.success) state.mentorStudents = studentsRes.students;
    const examsRes = await api('/api/exams');
    if (examsRes.success) state.mentorExams = examsRes.exams;
  } catch(e){ console.error('sync error:', e); }
}

function renderMentor(app){
  const tabs = ['overview','records','scoring','question_bank','weak_areas'];
  const tabLabels = { overview:'数据看板', records:'答题记录', scoring:'评分管理', question_bank:'题库管理', weak_areas:'查缺补漏' };
  // 导师/管理员额外标签
  const extraTabs = ['product_banks'];
  const extraLabels = { product_banks:'产品题库导入管理' };

  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div class="nav-back" onclick="APP.goHome()">← 返回首页</div>
        <span style="font-size:14px;font-weight:600">${state.currentUser.role==='admin'?'管理员':'导师'}面板</span>
        <span style="font-size:13px;opacity:.9">${escapeHtml(state.currentUser.name)}</span>
      </div>
    </div>
    <div class="container">
      <div class="tabs">
        ${tabs.map(t => `<span class="tab${state.mentorTab===t?' active':''}" onclick="APP.switchMentorTab('${t}')">${tabLabels[t]}</span>`).join('')}
        ${extraTabs.map(t => `<span class="tab${state.mentorTab===t?' active':''}" onclick="APP.switchMentorTab('${t}')">${extraLabels[t]}</span>`).join('')}
      </div>
      <div id="mentorContent"></div>
    </div>`;

  switch(state.mentorTab){
    case 'overview': renderMentorOverview(); break;
    case 'records': renderMentorRecords(); break;
    case 'scoring': renderMentorScoring(); break;
    case 'question_bank': renderMentorQuestionBank(); break;
    case 'weak_areas': renderMentorWeakAreas(); break;
    case 'product_banks': renderProductBankManager(); break;
  }
}

function switchMentorTab(tab){
  state.mentorTab = tab;
  render();
}

// ===== 数据看板 =====
function renderMentorOverview(){
  const records = state.mentorRecords;
  const totalRecords = records.length;
  const passedCount = records.filter(r => r.passed).length;
  const passRate = totalRecords > 0 ? Math.round(passedCount / totalRecords * 100) : 0;
  const avgScore = totalRecords > 0 ? Math.round(records.reduce((s, r) => s + (r.finalScore !== undefined ? r.finalScore : r.autoScore), 0) / totalRecords) : 0;
  const studentCount = state.mentorStudents.length;

  const panelStats = {};
  for (const r of records){
    const p = r.panel || 'newbie';
    if (!panelStats[p]) panelStats[p] = { total:0, passed:0, score:0 };
    panelStats[p].total++;
    panelStats[p].score += (r.finalScore !== undefined ? r.finalScore : r.autoScore);
    if (r.passed) panelStats[p].passed++;
  }

  let html = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${totalRecords}</div><div class="stat-label">总答题记录</div></div>
      <div class="stat-card"><div class="stat-value">${studentCount}</div><div class="stat-label">参训学员</div></div>
      <div class="stat-card"><div class="stat-value">${passRate}%</div><div class="stat-label">通过率</div></div>
      <div class="stat-card"><div class="stat-value">${avgScore}</div><div class="stat-label">平均分</div></div>
    </div>
    <div class="card"><div class="card-title">各板块统计</div>
      <div class="stat-grid">
        ${getAllModuleIds().map(p => {
          const s = panelStats[p] || { total:0, passed:0, score:0 };
          const avg = s.total > 0 ? Math.round(s.score / s.total) : 0;
          const rate = s.total > 0 ? Math.round(s.passed / s.total * 100) : 0;
          return `<div class="stat-card">
            <div class="stat-value" style="font-size:20px">${getModuleName(p)}</div>
            <div class="stat-label">${s.total}条记录 · ${avg}分均分 · ${rate}%通过</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  $('#mentorContent').innerHTML = html;
}

// ===== 答题记录（含搜索+导出） =====
function renderMentorRecords(){
  const records = state.mentorRecords;
  let filtered = records;
  if (state.mentorPanel !== 'all') filtered = filtered.filter(r => r.panel === state.mentorPanel);
  if (state.searchQuery){
    const s = state.searchQuery.toLowerCase();
    filtered = filtered.filter(r => r.studentName.toLowerCase().includes(s) || r.examId.toLowerCase().includes(s));
  }
  if (state.searchStudent){
    filtered = filtered.filter(r => r.studentName.includes(state.searchStudent));
  }

  let html = `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-sm ${state.mentorPanel==='all'?'btn-primary':'btn-outline'}" onclick="APP.filterMentorPanel('all')">全部</button>
      ${getAllModuleIds().map(p => `<button class="btn btn-sm ${state.mentorPanel===p?'btn-primary':'btn-outline'}" onclick="APP.filterMentorPanel('${p}')">${getModuleName(p)}</button>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
      <input class="form-input" id="searchInput" placeholder="🔍 搜索学员姓名/考试ID..." style="width:220px;padding:6px 10px;font-size:13px" value="${escapeHtml(state.searchQuery)}">
      <input class="form-input" id="searchStudentInput" placeholder="按学员筛选..." style="width:160px;padding:6px 10px;font-size:13px" value="${escapeHtml(state.searchStudent)}">
      <button class="btn btn-sm btn-success" onclick="APP.exportRecords()">📥 导出Excel</button>
      <span style="font-size:13px;color:var(--text-sec);margin-left:auto">共 ${filtered.length} 条</span>
    </div>`;

  if (filtered.length === 0){
    html += `<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>`;
  } else {
    html += `<div class="table-wrap"><table class="table">
      <thead><tr><th>学员</th><th>板块</th><th>考试</th><th>得分</th><th>是否通过</th><th>时间</th><th>操作</th></tr></thead>
      <tbody>${filtered.sort((a,b) => new Date(b.submitTime) - new Date(a.submitTime)).map(r => {
        const score = r.finalScore !== undefined ? r.finalScore : r.autoScore;
        const panel = r.panel || 'newbie';
        return `<tr>
          <td>${escapeHtml(r.studentName)}</td>
          <td><span class="badge badge-${PANEL_COLORS[panel]||'newbie'}">${PANEL_LABELS[panel]||'新人'}</span></td>
          <td>${escapeHtml(r.examId)}</td>
          <td><strong>${score}</strong></td>
          <td>${r.passed ? '<span class="badge badge-success">通过</span>' : '<span class="badge badge-danger">未通过</span>'}</td>
          <td style="font-size:12px">${new Date(r.submitTime).toLocaleString('zh-CN')}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="APP.viewRecordDetail('${r.id}')">查看</button>
            <button class="btn btn-sm btn-danger" onclick="APP.deleteRecord('${r.id}')">删除</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  html += `<div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
    <button class="btn btn-danger btn-sm" onclick="APP.clearAllRecords()">清空全部记录</button>
  </div>`;

  $('#mentorContent').innerHTML = html;

  setTimeout(() => {
    const si = $('#searchInput');
    const ssi = $('#searchStudentInput');
    if (si) si.addEventListener('input', function(){ state.searchQuery = this.value; renderMentorRecords(); });
    if (ssi) ssi.addEventListener('input', function(){ state.searchStudent = this.value; renderMentorRecords(); });
  }, 0);
}

function filterMentorPanel(panel){
  state.mentorPanel = panel;
  renderMentorRecords();
}

function exportRecords(){
  const params = new URLSearchParams();
  if (state.mentorPanel !== 'all') params.set('panel', state.mentorPanel);
  if (state.searchStudent) params.set('student', state.searchStudent);
  const url = `${API_BASE}/api/mentor/records/export?${params.toString()}`;
  const a = document.createElement('a');
  a.href = url;
  // 添加 auth token
  fetch(url, { headers: { 'x-auth-token': state.authToken } })
    .then(r => r.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'quiz_records.csv';
      a.click();
      URL.revokeObjectURL(blobUrl);
      showToast('导出成功','success');
    })
    .catch(() => showToast('导出失败','error'));
}

// ===== 评分管理 =====
function renderMentorScoring(){
  const records = state.mentorRecords;
  const scored = records.filter(r => r.mentorScored);
  const unscored = records.filter(r => !r.mentorScored);

  let html = `
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn-sm ${state.scoringFilter==='all'?'btn-primary':'btn-outline'}" onclick="APP.setScoringFilter('all')">全部（${records.length}）</button>
      <button class="btn btn-sm ${state.scoringFilter==='unscored'?'btn-warning':''}" style="${state.scoringFilter==='unscored'?'background:var(--warning);color:#fff':''}" onclick="APP.setScoringFilter('unscored')">待评分（${unscored.length}）</button>
      <button class="btn btn-sm ${state.scoringFilter==='scored'?'btn-success':''}" style="${state.scoringFilter==='scored'?'background:var(--success);color:#fff':''}" onclick="APP.setScoringFilter('scored')">已评分（${scored.length}）</button>
    </div>
    <div id="scoringContent"></div>`;

  $('#mentorContent').innerHTML = html;
  renderMentorScoringSub(state.scoringFilter);
}

function setScoringFilter(filter){
  state.scoringFilter = filter;
  renderMentorScoring();
}

function renderMentorScoringSub(filter){
  const records = state.mentorRecords;
  let filtered;
  if (filter === 'scored') filtered = records.filter(r => r.mentorScored);
  else if (filter === 'unscored') filtered = records.filter(r => !r.mentorScored);
  else filtered = records;

  const content = $('#scoringContent');
  if (!content) return;

  if (filtered.length === 0){
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>`;
    return;
  }

  const groups = {};
  for (const r of filtered){
    const p = r.panel || 'newbie';
    if (!groups[p]) groups[p] = [];
    groups[p].push(r);
  }

  let html = '';
  for (const panel of getAllModuleIds()){
    const group = groups[panel];
    if (!group || group.length === 0) continue;
    html += `<div style="margin-bottom:12px"><strong>${getModuleName(panel)}</strong></div>`;
    html += `<div class="table-wrap"><table class="table">
      <thead><tr><th>学员</th><th>考试</th><th>自动评分</th><th>导师评分</th><th>最终</th><th>操作</th></tr></thead>
      <tbody>${group.sort((a,b) => new Date(b.submitTime) - new Date(a.submitTime)).map(r => {
        const autoScore = r.autoScore || 0;
        const mentorScore = r.mentorScore !== undefined && r.mentorScore !== null ? r.mentorScore : '-';
        const finalScore = r.finalScore !== undefined ? r.finalScore : autoScore;
        return `<tr>
          <td>${escapeHtml(r.studentName)}</td>
          <td>${escapeHtml(r.examId)}</td>
          <td>${autoScore}</td>
          <td>${mentorScore}</td>
          <td><strong>${finalScore}</strong> ${r.mentorScored ? '<span class="badge badge-success">已评</span>' : ''}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="APP.viewRecordDetail('${r.id}')">查看</button>
            <button class="btn btn-sm btn-primary" onclick="APP.openScoringDetail('${r.id}')">评分</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  content.innerHTML = html;
}

// ===== 题库管理 =====
let _qbankData = null;
let _qbankSearch = '';
let _qbankPanel = 'all';

async function renderMentorQuestionBank(){
  const content = $('#mentorContent');
  if (!content) return;
  content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载中...</div></div>`;

  try {
    const res = await api('/api/mentor/questions');
    if (!res.success){ content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败</div></div>`; return; }
    _qbankData = res;
    renderQBankContent();
  } catch(e){
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败: ${e.message}</div></div>`;
  }
}

function renderQBankContent(){
  const content = $('#mentorContent');
  if (!content || !_qbankData) return;

  const panels = getAllModuleIds();
  let totalQ = 0;
  for (const p of panels){
    for (const g of (_qbankData.questions[p]||[])){
      totalQ += (g.questions||[]).length;
    }
  }

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm ${_qbankPanel==='all'?'btn-primary':'btn-outline'}" onclick="APP.filterQBankPanel('all')">全部（${totalQ}题）</button>
        ${panels.map(p => {
          let count = 0;
          for (const g of (_qbankData.questions[p]||[])) count += (g.questions||[]).length;
          if (count === 0) return '';
          return `<button class="btn btn-sm ${_qbankPanel===p?'btn-primary':'btn-outline'}" onclick="APP.filterQBankPanel('${p}')">${getModuleName(p)}（${count}）</button>`;
        }).filter(Boolean).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <input class="form-input" id="qbankSearch" placeholder="搜索题目..." style="width:200px;padding:6px 10px;font-size:13px" value="${escapeHtml(_qbankSearch)}" oninput="APP.searchQBank(this.value)">
      </div>
    </div>`;

  for (const p of panels){
    if (_qbankPanel !== 'all' && _qbankPanel !== p) continue;
    const groups = _qbankData.questions[p] || [];
    if (groups.length === 0) continue;

    html += `<div style="margin-bottom:20px"><div style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--primary)">${getModuleName(p)}</div>`;

    for (const g of groups){
      let questions = g.questions || [];
      if (_qbankSearch){
        const s = _qbankSearch.toLowerCase();
        questions = questions.filter(q => q.question.toLowerCase().includes(s));
      }
      if (questions.length === 0) continue;

      html += `<div class="card" style="margin-bottom:12px">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>${escapeHtml(g.title)} <span style="font-size:12px;color:var(--text-sec);font-weight:400">（${questions.length}题）</span></span>
          <button class="btn btn-sm btn-primary" onclick="APP.openAddQuestion('${p}','${g.examId}','${jsEscape(g.title)}')">+ 新增题目</button>
        </div>
        <div style="max-height:600px;overflow-y:auto">
          ${questions.map((q,i) => {
            const typeLabel = TYPE_LABELS[q.type]||'单选题';
            const typeColor = { single:'#1e40af', multiple:'#9d174d', judge:'#065f46', short:'#92400e' }[q.type]||'#333';
            return `<div class="qbank-item" style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;background:#fafbfc">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="flex:1">
                  <span style="display:inline-block;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:600;color:${typeColor};background:${typeColor}15;margin-right:6px">${typeLabel}</span>
                  <span style="font-size:12px;color:var(--text-sec)">${q.points||5}分</span>
                  <span style="font-size:11px;color:var(--text-sec);margin-left:4px">ID: ${escapeHtml(q.id)}</span>
                  <div style="font-weight:600;margin-top:4px">${i+1}. ${escapeHtml(q.question)}</div>
                  ${q.options ? `<div style="font-size:13px;color:var(--text-sec);margin-top:4px">选项：${q.options.map(o => escapeHtml(o)).join(' / ')}</div>` : ''}
                  <div style="font-size:12px;margin-top:4px;color:var(--success)">答案：${q.type==='judge' ? (q.answer==='A'||q.answer===true?'对':'错') : escapeHtml(q.answer||'')} ${q.keywords ? '| 关键词：'+escapeHtml(q.keywords) : ''}</div>
                  ${q.explanation ? `<div style="font-size:12px;color:var(--text-sec);margin-top:2px">解析：${escapeHtml(q.explanation)}</div>` : ''}
                </div>
                <div style="display:flex;gap:4px;flex-shrink:0">
                  <button class="btn btn-sm btn-outline" onclick="APP.openEditQuestion('${p}','${g.examId}','${q.id}')">编辑</button>
                  <button class="btn btn-sm btn-danger" onclick="APP.deleteQuestion('${p}','${g.examId}','${q.id}')">删除</button>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    html += `</div>`;
  }

  content.innerHTML = html;
}

function filterQBankPanel(panel){ _qbankPanel = panel; renderQBankContent(); }
function searchQBank(val){ _qbankSearch = val; renderQBankContent(); }

async function openEditQuestion(panel, examId, questionId){
  const group = (_qbankData.questions[panel]||[]).find(g => g.examId === examId);
  if (!group) return;
  const q = (group.questions||[]).find(q => q.id === questionId);
  if (!q) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:700px">
      <div class="modal-header">
        <span>编辑题目 - ${escapeHtml(q.id)}</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">题目类型</label>
          <select class="form-select" id="editType">
            <option value="single" ${q.type==='single'?'selected':''}>单选题</option>
            <option value="multiple" ${q.type==='multiple'?'selected':''}>多选题</option>
            <option value="judge" ${q.type==='judge'?'selected':''}>判断题</option>
            <option value="short" ${q.type==='short'?'selected':''}>简答题</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">题目内容</label>
          <textarea class="form-textarea" id="editQuestion" rows="3">${escapeHtml(q.question||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">选项（每行一个）</label>
          <textarea class="form-textarea" id="editOptions" rows="4">${(q.options||[]).join('\n')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">正确答案</label>
          <input class="form-input" id="editAnswer" value="${q.type==='judge' ? (q.answer==='A'||q.answer===true?'对':'错') : escapeHtml(q.answer||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">简答关键词（逗号分隔）</label>
          <input class="form-input" id="editKeywords" value="${escapeHtml(q.keywords||'')}">
        </div>
        <div class="form-group">
          <label class="form-label">分值</label>
          <input class="form-input" id="editPoints" type="number" value="${q.points||5}" min="1" max="20">
        </div>
        <div class="form-group">
          <label class="form-label">解析/说明</label>
          <textarea class="form-textarea" id="editExplain" rows="3">${escapeHtml(q.explanation||'')}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="APP.saveEditQuestion('${panel}','${examId}','${questionId}')">保存修改</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function saveEditQuestion(panel, examId, questionId){
  const type = $('#editType').value;
  const question = $('#editQuestion').value.trim();
  const optionsStr = $('#editOptions').value.trim();
  let answer = $('#editAnswer').value.trim();
  const keywords = $('#editKeywords').value.trim();
  const points = parseInt($('#editPoints').value) || 5;
  const explanation = $('#editExplain').value.trim();
  if (!question){ showToast('请输入题目内容','error'); return; }
  if (!answer){ showToast('请输入正确答案','error'); return; }
  // 判断题答案转换：对/错 → A/B
  if (type === 'judge') {
    if (answer === '对' || answer === '正确') answer = 'A';
    else if (answer === '错' || answer === '错误') answer = 'B';
  }
  const options = optionsStr ? optionsStr.split('\n').filter(Boolean) : [];
  try {
    const res = await api(`/api/mentor/questions/${examId}/${questionId}`, {
      method:'PUT', body:JSON.stringify({ type, question, options, answer, keywords, points, explanation })
    });
    if (res.success){
      showToast('题目已更新','success');
      document.querySelector('.modal-overlay')?.remove();
      renderMentorQuestionBank();
    } else { showToast('更新失败','error'); }
  } catch(e){ showToast('保存失败','error'); }
}

async function openAddQuestion(panel, examId, title){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:700px">
      <div class="modal-header">
        <span>新增题目 - ${escapeHtml(title)}</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">题目类型</label>
          <select class="form-select" id="addType">
            <option value="single">单选题</option>
            <option value="multiple">多选题</option>
            <option value="judge">判断题</option>
            <option value="short">简答题</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">题目内容</label>
          <textarea class="form-textarea" id="addQuestion" rows="3" placeholder="请输入题目"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">选项（每行一个）</label>
          <textarea class="form-textarea" id="addOptions" rows="4" placeholder="A. 选项A&#10;B. 选项B&#10;C. 选项C&#10;D. 选项D"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">正确答案</label>
          <input class="form-input" id="addAnswer" placeholder="单选填A/B/C/D，多选填ABC">
        </div>
        <div class="form-group">
          <label class="form-label">简答关键词（逗号分隔）</label>
          <input class="form-input" id="addKeywords" placeholder="关键词1,关键词2">
        </div>
        <div class="form-group">
          <label class="form-label">分值</label>
          <input class="form-input" id="addPoints" type="number" value="5" min="1" max="20">
        </div>
        <div class="form-group">
          <label class="form-label">解析/说明</label>
          <textarea class="form-textarea" id="addExplain" rows="3" placeholder="题目解析"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="APP.saveAddQuestion('${panel}','${examId}')">添加题目</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function saveAddQuestion(panel, examId){
  const type = $('#addType').value;
  const question = $('#addQuestion').value.trim();
  const optionsStr = $('#addOptions').value.trim();
  let answer = $('#addAnswer').value.trim();
  const keywords = $('#addKeywords').value.trim();
  const points = parseInt($('#addPoints').value) || 5;
  const explanation = $('#addExplain').value.trim();
  if (!question){ showToast('请输入题目内容','error'); return; }
  if (!answer){ showToast('请输入正确答案','error'); return; }
  // 判断题答案转换：对/错 → A/B
  if (type === 'judge') {
    if (answer === '对' || answer === '正确') answer = 'A';
    else if (answer === '错' || answer === '错误') answer = 'B';
  }
  const options = optionsStr ? optionsStr.split('\n').filter(Boolean) : [];
  try {
    const res = await api(`/api/mentor/questions/${examId}`, {
      method:'POST', body:JSON.stringify({ type, question, options, answer, keywords, points, explanation })
    });
    if (res.success){
      showToast('题目已添加','success');
      document.querySelector('.modal-overlay')?.remove();
      renderMentorQuestionBank();
    } else { showToast('添加失败: '+(res.error||''),'error'); }
  } catch(e){ showToast('添加失败','error'); }
}

async function deleteQuestion(panel, examId, questionId){
  if (!confirm('确定删除该题目？此操作不可恢复。')) return;
  try {
    const res = await api(`/api/mentor/questions/${examId}/${questionId}`, { method:'DELETE' });
    if (res.success){ showToast('题目已删除','success'); renderMentorQuestionBank(); }
    else { showToast('删除失败','error'); }
  } catch(e){ showToast('删除失败','error'); }
}

// ===== 查缺补漏 =====
async function renderMentorWeakAreas(){
  const content = $('#mentorContent');
  if (!content) return;
  content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载中...</div></div>`;

  try {
    const res = await api('/api/mentor/weak-areas');
    if (!res.success){ content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败</div></div>`; return; }
    const students = res.students || [];
    if (students.length === 0){
      content.innerHTML = `<div class="empty-state"><div class="empty-state-text">暂无答题数据</div></div>`;
      return;
    }

    let html = `
      <div style="margin-bottom:16px;font-size:14px;color:var(--text-sec)">共 ${res.totalStudents} 名学员有答题记录</div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>学员</th><th>考试次数</th><th>总答题数</th><th>错题数</th><th>错误率</th><th>错题类型</th><th>最薄弱考试</th><th>操作</th></tr></thead>
        <tbody>`;
    for (const s of students){
      const worstExam = s.wrongByExam && s.wrongByExam.length > 0 ? s.wrongByExam[0] : null;
      const worstExamLabel = worstExam ? `${worstExam.examId} (${worstExam.wrongCount}错)` : '-';
      const errorRateColor = s.errorRate >= 50 ? 'var(--danger)' : s.errorRate >= 30 ? 'var(--warning)' : 'var(--success)';
      html += `<tr>
        <td><strong>${escapeHtml(s.studentName)}</strong></td>
        <td>${s.totalExams}</td><td>${s.totalQuestions}</td>
        <td><span style="color:var(--danger);font-weight:700">${s.wrongQuestions}</span></td>
        <td><span style="color:${errorRateColor};font-weight:700">${s.errorRate}%</span></td>
        <td style="font-size:12px">${['single','multiple','judge','short'].map(t => { const c=s.wrongByType[t]||0; return c>0?`${TYPE_LABELS[t]}:${c}`:''; }).filter(Boolean).join(' ')||'-'}</td>
        <td style="font-size:12px">${worstExamLabel}</td>
        <td><button class="btn btn-sm btn-outline" onclick="APP.viewStudentWeakDetail('${jsEscape(s.studentName)}')">查看详情</button></td>
      </tr>`;
    }
    html += `</tbody></table></div>`;
    content.innerHTML = html;
  } catch(e){ content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败</div></div>`; }
}

async function viewStudentWeakDetail(studentName){
  try {
    const res = await api(`/api/mentor/weak-areas/${encodeURIComponent(studentName)}`);
    if (!res.success){ showToast('加载失败','error'); return; }
    const wrong = res.wrongQuestions || [];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal fade-in" style="max-width:800px">
        <div class="modal-header">
          <span>${escapeHtml(studentName)} - 查缺补漏详情（${wrong.length}道错题）</span>
          <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
          ${wrong.length === 0 ? '<div class="empty-state"><div class="empty-state-text">该学员暂无错题！</div></div>' : ''}
          ${(() => {
            const byExam = {};
            for (const w of wrong){ if (!byExam[w.examId]) byExam[w.examId] = []; byExam[w.examId].push(w); }
            return Object.entries(byExam).map(([examId, items]) => `
              <div style="margin-bottom:16px">
                <div style="font-weight:700;font-size:14px;color:var(--danger);margin-bottom:8px">${escapeHtml(examId)} — ${items.length}道错题</div>
                ${items.map((w,i) => `
                  <div class="answer-detail">
                    <div class="answer-detail-q">${i+1}. [${TYPE_LABELS[w.type]||'单题'}] ${escapeHtml(w.question)}</div>
                    <div style="font-size:13px;margin-top:4px">
                      <span style="color:var(--text-sec)">学员答案：</span><span style="color:var(--danger)">${escapeHtml(w.userAnswer)}</span>
                      ${w.correctAnswer ? `<span style="margin-left:8px;color:var(--text-sec)">正确答案：</span><span style="color:var(--success)">${escapeHtml(w.correctAnswer)}</span>` : ''}
                    </div>
                    <div style="font-size:12px;margin-top:2px;color:var(--danger)">得分：${w.gotScore}/${w.maxScore}</div>
                  </div>`).join('')}
              </div>`).join('');
          })()}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">关闭</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  } catch(e){ showToast('加载失败','error'); }
}

// ===== 评分操作 =====
async function viewRecordDetail(recordId){
  const record = state.mentorRecords.find(r => r.id === recordId);
  if (!record){ showToast('记录不存在','error'); return; }
  showRecordDetailModal(record);
}

async function openScoringDetail(recordId){
  const record = state.mentorRecords.find(r => r.id === recordId);
  if (!record) return;
  const questions = (record.questions||[]).filter(q => q.type==='short');
  if (questions.length === 0){ showToast('无简答题','info'); return; }
  const answers = record.answers || {};
  const mentorDetails = record.mentorScoreDetails || {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:700px">
      <div class="modal-header">
        <span>评分 - ${escapeHtml(record.studentName)}</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        ${questions.map(q => {
          const userAns = answers[q.id] || '(未作答)';
          const prev = mentorDetails[q.id] || {};
          const prevScore = prev.mentorScore !== undefined ? prev.mentorScore : 0;
          return `<div class="scoring-card">
            <div class="scoring-question"><strong>${escapeHtml(q.question)}</strong>（满分${q.points||10}分）</div>
            <div class="scoring-answer">${escapeHtml(userAns)}</div>
            ${q.keywords ? `<div style="font-size:12px;color:var(--text-sec);margin-bottom:8px">关键词：${escapeHtml(q.keywords)}</div>` : ''}
            <div class="scoring-controls">
              <span>导师评分：</span>
              <input class="scoring-input" id="score_${recordId}_${q.id}" type="number" min="0" max="${q.points||10}" value="${prevScore}">
              <span> / ${q.points||10} 分</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        ${record.mentorScored ? `<button class="btn btn-warning" style="background:var(--warning);color:#fff" onclick="APP.resetMentorScore('${recordId}')">重置评分</button>` : ''}
        <button class="btn btn-primary" onclick="APP.saveMentorScore('${recordId}')">保存评分</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function saveMentorScore(recordId){
  const record = state.mentorRecords.find(r => r.id === recordId);
  if (!record) return;
  const questions = (record.questions||[]).filter(q => q.type==='short');
  let mentorScoreDetails = {};
  let shortScore = 0, shortMax = 0;
  const typeScores = record.typeScores || {};
  const objectiveScore = (typeScores.single?.score||0) + (typeScores.multiple?.score||0) + (typeScores.judge?.score||0);
  const newQuestionScores = { ...(record.questionScores||{}) };
  const newTypeScores = {
    single: { ...(typeScores.single||{score:0,max:0}) },
    multiple: { ...(typeScores.multiple||{score:0,max:0}) },
    judge: { ...(typeScores.judge||{score:0,max:0}) },
    short: { score:0, max:0 }
  };

  questions.forEach(q => {
    const input = document.getElementById(`score_${recordId}_${q.id}`);
    const rawVal = input ? parseFloat(input.value) : NaN;
    const newScore = (!isNaN(rawVal) && rawVal >= 0) ? Math.min(q.points||10, Math.max(0, rawVal)) : 0;
    const oldScore = (record.questionScores||{})[q.id]?.score || 0;
    const autoScore = (record.mentorScoreDetails && record.mentorScoreDetails[q.id]) ? record.mentorScoreDetails[q.id].autoScore : oldScore;
    mentorScoreDetails[q.id] = { autoScore, mentorScore: newScore };
    shortScore += newScore;
    shortMax += (q.points||10);
    newQuestionScores[q.id] = { score:newScore, maxScore:q.points||10 };
  });

  newTypeScores.short = { score:shortScore, max:shortMax };
  const totalScore = objectiveScore + shortScore;

  try {
    const res = await api(`/api/mentor/records/${recordId}/score`, {
      method:'PUT', body:JSON.stringify({
        mentorScore: shortScore, finalScore: totalScore,
        passed: totalScore >= PASSING_SCORE, mentorScored: true,
        mentorScoreDetails, questionScores: newQuestionScores, typeScores: newTypeScores
      })
    });
    if (res.success){
      const idx = state.mentorRecords.findIndex(r => r.id === recordId);
      if (idx >= 0) state.mentorRecords[idx] = res.record;
      showToast(`评分已保存！客观题${objectiveScore}分 + 简答题${shortScore}分 = ${totalScore}分`,'success');
      document.querySelector('.modal-overlay')?.remove();
      if (state.page==='mentor' && state.mentorTab==='scoring') renderMentorScoring();
    } else { showToast('保存失败','error'); }
  } catch(e){ showToast('保存失败','error'); }
}

async function resetMentorScore(recordId){
  if (!confirm('确定重置评分？')) return;
  try {
    const res = await api(`/api/mentor/records/${recordId}/score`, { method:'DELETE' });
    if (res.success){
      const idx = state.mentorRecords.findIndex(r => r.id === recordId);
      if (idx >= 0) state.mentorRecords[idx] = res.record;
      showToast('评分已重置','success');
      document.querySelector('.modal-overlay')?.remove();
      if (state.page==='mentor' && state.mentorTab==='scoring') renderMentorScoring();
    }
  } catch(e){ showToast('重置失败','error'); }
}

async function deleteRecord(recordId){
  if (!confirm('确定删除该记录？')) return;
  try {
    const res = await api(`/api/mentor/records/${recordId}`, { method:'DELETE' });
    if (res.success){ await syncAllRecords(); render(); showToast('记录已删除','success'); }
  } catch(e){ showToast('删除失败','error'); }
}

async function clearAllRecords(){
  if (!confirm('确定清空全部答题记录？此操作不可恢复！')) return;
  try {
    const res = await api('/api/mentor/records', { method:'DELETE' });
    if (res.success){ state.mentorRecords = []; render(); showToast(`已清空 ${res.deletedCount} 条记录`,'success'); }
  } catch(e){ showToast('操作失败','error'); }
}

// ===== 产品题库导入管理 =====
async function renderProductBankManager(){
  const content = $('#mentorContent');
  if (!content) return;
  content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载中...</div></div>`;

  try {
    const modRes = await api('/api/admin/modules');
    if (!modRes.success){ content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败</div></div>`; return; }
    state.modules = { fixedModules: modRes.fixedModules || {}, customModules: modRes.customModules || {} };
    state.allProducts = modRes.products || [];

    const allModules = [...Object.entries(state.modules.fixedModules || {}), ...Object.entries(state.modules.customModules || {})];

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <h3 style="font-size:16px">产品题库导入管理（${state.allProducts.length}个题库）</h3>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-outline" onclick="APP.downloadTemplate()">📥 下载题库模板</button>
          <button class="btn btn-sm btn-primary" onclick="APP.openImportProduct()">📤 导入产品题库</button>
          <button class="btn btn-sm btn-success" onclick="APP.openAddModule()">➕ 新建模块</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px;background:var(--warning-light);border:1px solid var(--warning)">
        <div style="font-size:13px;color:var(--warning);line-height:1.8">
          <strong>💡 使用说明：</strong><br>
          1. 下载 Excel 模板 → 填写题目 → 导入系统 → 分配题库到考核模块<br>
          2. 模板也可发给其他 AI 工具，要求按此格式批量生成题目<br>
          3. 导入后可分配到任意考核模块（新人专项/技术进阶/销售进阶/客户端考核/新品考核/自定义模块）
        </div>
      </div>`;

    // Section: 模块配置
    html += `<h4 style="font-size:14px;margin-bottom:12px">📂 考核模块配置</h4>`;
    html += `<div class="table-wrap"><table class="table">
      <thead><tr><th>模块名称</th><th>图标</th><th>已分配题库</th><th>操作</th></tr></thead>
      <tbody>`;

    for (const [id, mod] of allModules) {
      const bankNames = (mod.bankIds || []).map(bid => {
        const p = state.allProducts.find(a => a.id === bid);
        return p ? p.title : bid;
      }).join('、') || '<span style="color:#94a3b8">无</span>';
      const isCustom = (state.modules.customModules || {})[id];
      html += `<tr>
        <td><strong>${mod.icon||'📋'} ${escapeHtml(mod.name)}</strong>${isCustom ? ' <span class="badge badge-new-product">自定义</span>' : ''}</td>
        <td>${escapeHtml(mod.icon||'')}</td>
        <td style="font-size:12px">${bankNames}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm btn-outline" onclick="APP.openAssignBanks('${id}','${escapeHtml(mod.name)}')">分配题库</button>
          ${isCustom ? `<button class="btn btn-sm btn-danger" onclick="APP.deleteModule('${id}')" style="margin-left:4px">删除</button>` : ''}
        </td>
      </tr>`;
    }
    html += `</tbody></table></div>`;

    // Section: 已导入题库
    html += `<h4 style="font-size:14px;margin:20px 0 12px">📦 已导入产品题库</h4>`;
    if (state.allProducts.length === 0){
      html += `<div class="empty-state"><div class="empty-state-text">暂无导入的题库，请先导入</div></div>`;
    } else {
      html += `<div class="table-wrap"><table class="table">
        <thead><tr><th>产品名称</th><th>品牌</th><th>题目数</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody>${state.allProducts.map(np => {
          // Calculate question count from the file
          return `
          <tr>
            <td><strong>${escapeHtml(np.title)}</strong></td>
            <td>${escapeHtml(np.brand||'新品')}</td>
            <td>${np.questionCount || '-'}</td>
            <td style="font-size:12px">${new Date(np.createdAt).toLocaleString('zh-CN')}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-danger" onclick="APP.deleteNewProduct('${np.id}')">删除</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
    }

    content.innerHTML = html;
  } catch(e){ content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败</div></div>`; }
}

function openAddModule(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:500px">
      <div class="modal-header">
        <span>新建考核模块</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">模块名称 *</label>
          <input class="form-input" id="modName" placeholder="如：季度考核、产品专项">
        </div>
        <div class="form-group">
          <label class="form-label">图标（Emoji）</label>
          <input class="form-input" id="modIcon" placeholder="📋" value="📋">
        </div>
        <div class="form-group">
          <label class="form-label">描述</label>
          <input class="form-input" id="modDesc" placeholder="模块描述（选填）">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="APP.createModule()">创建模块</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function createModule(){
  const name = $('#modName').value.trim();
  if (!name){ showToast('请输入模块名称','error'); return; }
  const icon = $('#modIcon').value.trim() || '📋';
  const desc = $('#modDesc').value.trim();
  try {
    const res = await api('/api/admin/modules', { method:'POST', body:JSON.stringify({ name, icon, desc }) });
    if (res.success){
      showToast('模块创建成功','success');
      document.querySelector('.modal-overlay')?.remove();
      renderProductBankManager();
    } else { showToast(res.error||'创建失败','error'); }
  } catch(e){ showToast('网络错误','error'); }
}

async function deleteModule(moduleId){
  if (!confirm('确定删除该模块？固定模块不可删除，自定义模块删除后其题库不会丢失。')) return;
  try {
    const res = await api(`/api/admin/modules/${moduleId}`, { method:'DELETE' });
    if (res.success){
      showToast('模块已删除','success');
      renderProductBankManager();
    } else { showToast(res.error||'删除失败','error'); }
  } catch(e){ showToast('删除失败','error'); }
}

function openAssignBanks(moduleId, moduleName){
  const mod = (state.modules.fixedModules || {})[moduleId] || (state.modules.customModules || {})[moduleId];
  const currentBankIds = mod ? (mod.bankIds || []) : [];
  const products = state.allProducts;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:600px">
      <div class="modal-header">
        <span>分配题库到「${escapeHtml(moduleName)}」</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        ${products.length === 0 ? '<div class="empty-state"><div class="empty-state-text">暂无导入的题库，请先导入产品题库</div></div>' : `
          <div style="font-size:13px;color:#64748b;margin-bottom:12px">勾选需要分配到该模块的产品题库（可多选）：</div>
          ${products.map(p => {
            const checked = currentBankIds.includes(p.id);
            return `<label style="display:flex;align-items:center;padding:8px 12px;margin:4px 0;border:1px solid ${checked?'var(--primary)':'#e2e8f0'};border-radius:8px;cursor:pointer;background:${checked?'var(--primary-light)':'#fff'}">
              <input type="checkbox" class="assignBankCb" data-bankid="${p.id}" ${checked?'checked':''} style="margin-right:10px">
              <div>
                <div style="font-weight:600;font-size:14px">${escapeHtml(p.title)}</div>
                <div style="font-size:12px;color:#64748b">${escapeHtml(p.brand||'新品')} · ${p.questionCount||'?'}题</div>
              </div>
            </label>`;
          }).join('')}
        `}
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="APP.saveAssignBanks('${moduleId}')">保存分配</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function saveAssignBanks(moduleId){
  const checkboxes = document.querySelectorAll('.assignBankCb');
  const bankIds = [];
  checkboxes.forEach(cb => { if (cb.checked) bankIds.push(cb.dataset.bankid); });
  try {
    const res = await api(`/api/admin/modules/${moduleId}`, { method:'PUT', body:JSON.stringify({ bankIds }) });
    if (res.success){
      showToast('分配成功','success');
      document.querySelector('.modal-overlay')?.remove();
      renderProductBankManager();
    } else { showToast(res.error||'保存失败','error'); }
  } catch(e){ showToast('网络错误','error'); }
}

async function downloadTemplate(){
  try {
    const url = API_BASE + '/api/admin/question-template?format=xlsx';
    const headers = {};
    if (state.authToken) headers['x-auth-token'] = state.authToken;
    const resp = await fetch(url, { headers });
    if (!resp.ok) { showToast('下载失败','error'); return; }
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = '产品题库导入模板.xlsx';
    a.click();
    URL.revokeObjectURL(blobUrl);
    showToast('Excel模板已下载，请用Excel/WPS打开编辑','success');
  } catch(e){ showToast('下载失败','error'); }
}

function openImportProduct(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:600px">
      <div class="modal-header">
        <span>导入产品题库</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">产品名称 *</label>
          <input class="form-input" id="npTitle" placeholder="如：诺瓦 COEX系列">
        </div>
        <div class="form-group">
          <label class="form-label">品牌</label>
          <select class="form-select" id="npBrand">
            <option value="诺瓦">诺瓦</option>
            <option value="嗨动">嗨动</option>
            <option value="新品">新品</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">上传Excel题库文件（.xlsx）*</label>
          <div style="margin-top:6px">
            <input type="file" id="npFile" accept=".xlsx,.xls" onchange="APP.handleNpFile(this)" style="display:block;width:100%;padding:8px;border:2px dashed #cbd5e1;border-radius:8px;cursor:pointer">
          </div>
          <div id="npFileInfo" style="margin-top:8px;font-size:12px;color:#64748b;display:none"></div>
        </div>
        <div style="border-top:1px solid #e2e8f0;margin:16px 0;padding-top:12px">
          <label class="form-label" style="color:#64748b">或者粘贴JSON数据（兼容旧格式）</label>
          <textarea class="form-textarea" id="npJson" rows="6" placeholder='粘贴JSON数组，格式：[{"type":"single","question":"题目","options":["A.xx","B.xx"],"answer":"A","points":5}]' style="margin-top:6px;font-size:12px"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-outline" onclick="APP.downloadTemplate()" style="margin-right:8px">下载模板</button>
        <button class="btn btn-primary" id="npImportBtn" onclick="APP.importNewProduct()">导入题库</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function handleNpFile(input){
  const file = input.files[0];
  if (!file) return;
  const infoEl = $('#npFileInfo');
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const isJson = file.name.endsWith('.json');
  
  if (isExcel) {
    if (infoEl) {
      infoEl.innerHTML = `已选择：<strong>${escapeHtml(file.name)}</strong>（${(file.size/1024).toFixed(1)} KB）`;
      infoEl.style.display = 'block';
    }
    const jsonEl = $('#npJson');
    if (jsonEl) jsonEl.value = '';
    return;
  }
  
  if (isJson) {
    const reader = new FileReader();
    reader.onload = function(e){
      try {
        const data = JSON.parse(e.target.result);
        let questions;
        if (Array.isArray(data)) questions = data;
        else if (data.questions && Array.isArray(data.questions)) questions = data.questions;
        else { showToast('JSON格式不正确','error'); return; }
        const el = $('#npJson');
        if (el) el.value = JSON.stringify(questions, null, 2);
        if (data.title && !$('#npTitle').value) $('#npTitle').value = data.title;
        if (data.brand) $('#npBrand').value = data.brand;
        if (infoEl) { infoEl.style.display = 'none'; }
      } catch(e){ showToast('文件解析失败，请检查JSON格式','error'); }
    };
    reader.readAsText(file);
    return;
  }
  
  showToast('请上传 .xlsx 或 .json 格式的文件','error');
}

async function importNewProduct(){
  const title = $('#npTitle').value.trim();
  const brand = $('#npBrand').value;
  const fileInput = $('#npFile');
  const jsonStr = $('#npJson').value.trim();
  
  if (!title){ showToast('请输入产品名称','error'); return; }
  
  const file = fileInput && fileInput.files && fileInput.files[0];
  const isExcel = file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));
  
  if (!isExcel && !jsonStr){ showToast('请上传Excel文件或粘贴JSON数据','error'); return; }
  
  try {
    let res;
    if (isExcel) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('brand', brand);
      const headers = {};
      if (state.authToken) headers['x-auth-token'] = state.authToken;
      const resp = await fetch(API_BASE + '/api/admin/new-products/import', {
        method: 'POST', headers, body: formData
      });
      res = await resp.json();
    } else {
      let questions;
      try { questions = JSON.parse(jsonStr); } catch(e){ showToast('JSON格式错误','error'); return; }
      if (!Array.isArray(questions) || questions.length === 0){ showToast('题目列表不能为空','error'); return; }
      res = await api('/api/admin/new-products/import', {
        method:'POST', body:JSON.stringify({ title, brand, jsonData: jsonStr })
      });
    }
    
    if (res.success){
      showToast(`题库"${title}"导入成功！${res.questionCount}道题`,'success');
      document.querySelector('.modal-overlay')?.remove();
      renderProductBankManager();
    } else { showToast(res.error||'导入失败','error'); }
  } catch(e){ showToast('网络错误','error'); }
}

async function deleteNewProduct(productId){
  if (!confirm('确定删除该产品题库？题库文件也会被删除！')) return;
  try {
    const res = await api(`/api/admin/new-products/${productId}`, { method:'DELETE' });
    if (res.success){
      showToast('已删除','success');
      renderProductBankManager();
    } else { showToast('删除失败','error'); }
  } catch(e){ showToast('删除失败','error'); }
}

// ===== 管理员面板（用户管理） =====
async function loadAdminUsers(){
  try {
    const res = await api('/api/admin/users');
    if (res.success) state.adminUsers = res.users;
    const assignRes = await api('/api/admin/assignments');
    if (assignRes.success) state.adminAssignments = assignRes.assignments;
  } catch(e){ console.error('load admin users error:', e); }
}

function renderAdmin(app){
  const tabs = ['users','assignments'];
  const tabLabels = { users:'用户管理', assignments:'导师分配' };

  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div class="nav-back" onclick="APP.goHome()">← 返回首页</div>
        <span style="font-size:14px;font-weight:600">超级管理员</span>
        <span style="font-size:13px;opacity:.9">${escapeHtml(state.currentUser.name)}</span>
      </div>
    </div>
    <div class="container">
      <div class="tabs">
        ${tabs.map(t => `<span class="tab${state.adminTab===t?' active':''}" onclick="APP.switchAdminTab('${t}')">${tabLabels[t]}</span>`).join('')}
      </div>
      <div id="adminContent"></div>
    </div>`;

  switch(state.adminTab){
    case 'users': renderAdminUsers(); break;
    case 'assignments': renderAdminAssignments(); break;
  }
}

function switchAdminTab(tab){ state.adminTab = tab; render(); }

function renderAdminUsers(){
  const users = state.adminUsers;
  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:14px;color:var(--text-sec)">共 ${users.length} 名用户</span>
      <button class="btn btn-sm btn-primary" onclick="APP.openCreateMentor()">+ 创建导师</button>
    </div>`;

  if (users.length === 0){
    html += `<div class="empty-state"><div class="empty-state-text">暂无用户</div></div>`;
  } else {
    html += `<div class="table-wrap"><table class="table">
      <thead><tr><th>用户名</th><th>姓名</th><th>角色</th><th>导师</th><th>创建时间</th><th>操作</th></tr></thead>
      <tbody>${users.map(u => `
        <tr>
          <td><strong>${escapeHtml(u.username)}</strong></td>
          <td>${escapeHtml(u.name)}</td>
          <td><span class="badge ${u.role==='admin'?'badge-danger':u.role==='mentor'?'badge-tech':'badge-success'}">${u.role==='admin'?'管理员':u.role==='mentor'?'导师':'学员'}</span></td>
          <td style="font-size:12px">${u.assignedMentor ? escapeHtml(u.assignedMentor) : '-'}</td>
          <td style="font-size:12px">${u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : '-'}</td>
          <td>
            ${u.username !== 'PC' ? `
              <button class="btn btn-sm btn-outline" onclick="APP.resetUserPassword('${u.username}')">重置密码</button>
              <button class="btn btn-sm btn-danger" onclick="APP.deleteUser('${u.username}')">删除</button>
            ` : '<span style="font-size:12px;color:var(--text-sec)">超级管理员</span>'}
          </td>
        </tr>`).join('')}</tbody>
    </table></div>`;
  }

  $('#adminContent').innerHTML = html;
}

function openCreateMentor(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:450px">
      <div class="modal-header">
        <span>创建导师账号</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input class="form-input" id="mentorUsername" placeholder="导师登录用户名">
        </div>
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input class="form-input" id="mentorName" placeholder="导师真实姓名">
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input class="form-input" id="mentorPassword" type="password" placeholder="至少4位">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="APP.createMentor()">创建</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function createMentor(){
  const username = $('#mentorUsername').value.trim();
  const name = $('#mentorName').value.trim();
  const password = $('#mentorPassword').value;
  if (!username || !name || !password){ showToast('请填写所有字段','error'); return; }
  try {
    const res = await api('/api/admin/mentors', {
      method:'POST', body:JSON.stringify({ username, password, name })
    });
    if (res.success){
      showToast('导师创建成功','success');
      document.querySelector('.modal-overlay')?.remove();
      await loadAdminUsers();
      renderAdminUsers();
    } else { showToast(res.error||'创建失败','error'); }
  } catch(e){ showToast('网络错误','error'); }
}

async function resetUserPassword(username){
  const newPwd = prompt(`请输入 ${username} 的新密码（至少4位）：`);
  if (!newPwd || newPwd.length < 4) return;
  try {
    const res = await api(`/api/admin/users/${encodeURIComponent(username)}/reset-password`, {
      method:'PUT', body:JSON.stringify({ newPassword: newPwd })
    });
    if (res.success) showToast('密码已重置','success');
    else showToast(res.error||'操作失败','error');
  } catch(e){ showToast('操作失败','error'); }
}

async function deleteUser(username){
  if (!confirm(`确定删除用户 "${username}"？此操作不可恢复。`)) return;
  try {
    const res = await api(`/api/admin/users/${encodeURIComponent(username)}`, { method:'DELETE' });
    if (res.success){
      showToast('用户已删除','success');
      await loadAdminUsers();
      renderAdminUsers();
    } else { showToast(res.error||'删除失败','error'); }
  } catch(e){ showToast('删除失败','error'); }
}

function renderAdminAssignments(){
  const users = state.adminUsers;
  const mentors = users.filter(u => u.role === 'mentor');
  const students = users.filter(u => u.role === 'student');
  const assignments = state.adminAssignments;

  let html = `
    <div style="margin-bottom:16px;font-size:14px;color:var(--text-sec)">将学员分配给导师管理</div>`;

  for (const mentor of mentors){
    const currentAssign = assignments.find(a => a.mentor.username === mentor.username);
    const assignedStudents = currentAssign ? currentAssign.students.map(s => s.username) : [];

    html += `<div class="card" style="margin-bottom:12px">
      <div class="card-title">导师：${escapeHtml(mentor.name)} (${escapeHtml(mentor.username)})</div>
      <div style="font-size:13px;color:var(--text-sec);margin-bottom:8px">
        当前管理学员：${assignedStudents.length > 0 ? assignedStudents.map(s => {
          const u = users.find(u => u.username === s);
          return u ? u.name : s;
        }).join('、') : '无'}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        ${students.map(s => {
          const isAssigned = assignedStudents.includes(s.username);
          return `<span class="student-chip ${isAssigned ? 'selected' : ''}" id="chip_${mentor.username}_${s.username}" onclick="APP.toggleStudentChip('${mentor.username}','${s.username}')" style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;cursor:pointer;border:1px solid var(--border);transition:all .2s;${isAssigned ? 'background:var(--primary-light);border-color:var(--primary);color:var(--primary);font-weight:600' : ''}">
            ${escapeHtml(s.name)}
          </span>`;
        }).join('')}
      </div>
      <button class="btn btn-sm btn-primary" onclick="APP.saveAssignment('${mentor.username}')">保存分配</button>
    </div>`;
  }

  if (mentors.length === 0){
    html += `<div class="empty-state"><div class="empty-state-text">暂无导师，请先创建导师账号</div></div>`;
  }

  $('#adminContent').innerHTML = html;
}

// 临时选中学员
window._assignmentSelections = {};

function toggleStudentChip(mentorUsername, studentUsername){
  if (!window._assignmentSelections[mentorUsername]) window._assignmentSelections[mentorUsername] = new Set();
  const sel = window._assignmentSelections[mentorUsername];
  if (sel.has(studentUsername)) sel.delete(studentUsername);
  else sel.add(studentUsername);

  const chip = document.getElementById(`chip_${mentorUsername}_${studentUsername}`);
  if (chip){
    if (sel.has(studentUsername)){
      chip.style.background = 'var(--primary-light)';
      chip.style.borderColor = 'var(--primary)';
      chip.style.color = 'var(--primary)';
      chip.style.fontWeight = '600';
    } else {
      chip.style.background = '';
      chip.style.borderColor = 'var(--border)';
      chip.style.color = '';
      chip.style.fontWeight = '';
    }
  }
}

async function saveAssignment(mentorUsername){
  const sel = window._assignmentSelections[mentorUsername];
  if (!sel){ showToast('请选择学员','error'); return; }
  const studentUsernames = Array.from(sel);
  try {
    const res = await api('/api/admin/assign', {
      method:'POST', body:JSON.stringify({ mentorUsername, studentUsernames })
    });
    if (res.success){
      showToast('分配已保存','success');
      await loadAdminUsers();
      renderAdminAssignments();
    } else { showToast(res.error||'保存失败','error'); }
  } catch(e){ showToast('保存失败','error'); }
}

// ===== 恢复会话 =====
function restoreSession(){
  const token = localStorage.getItem('quiz_auth_token');
  const user = localStorage.getItem('quiz_current_user');
  if (token && user){
    try {
      state.authToken = token;
      state.currentUser = JSON.parse(user);
      state.page = 'home';
    } catch(e){
      state.page = 'login';
    }
  }
}

// ===== 暴露 API =====
window.APP = {
  // Auth
  switchAuthTab, doLogin, doRegister, logout,
  // Navigation
  goHome, enterPanel, enterNewProduct, backToPanel, retryExam,
  viewMyRecords, viewRecordDetailById,
  // Quiz
  startExam, confirmExitQuiz, confirmSubmit,
  // Mentor
  goMentor, goAdmin, switchMentorTab, switchAdminTab,
  filterMentorPanel, setScoringFilter,
  viewRecordDetail, openScoringDetail, saveMentorScore, resetMentorScore,
  deleteRecord, clearAllRecords, exportRecords,
  // Question Bank
  renderMentorQuestionBank, filterQBankPanel, searchQBank,
  openEditQuestion, saveEditQuestion, openAddQuestion, saveAddQuestion, deleteQuestion,
  // Weak Areas
  renderMentorWeakAreas, viewStudentWeakDetail,
  // New Products → Product Bank Manager
  renderProductBankManager, downloadTemplate, openImportProduct, handleNpFile, importNewProduct, deleteNewProduct,
  openAddModule, createModule, deleteModule, openAssignBanks, saveAssignBanks,
  // Admin
  openCreateMentor, createMentor, resetUserPassword, deleteUser,
  toggleStudentChip, saveAssignment,
  // Render
  render
};

// ===== 初始化 =====
restoreSession();
render();

})();