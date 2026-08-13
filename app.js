(function(){
'use strict';

// ===== 配置 =====
const API_BASE = window.location.origin;
const PASSING_SCORE = 95;
const MAX_ATTEMPTS = 10;
const PANEL_LABELS = { newbie: '新人专项', tech: '技术进阶', sales: '销售进阶' };
const PANEL_COLORS = { newbie: 'newbie', tech: 'tech', sales: 'sales' };
const TYPE_LABELS = { single: '单选题', multiple: '多选题', judge: '判断题', short: '简答题' };

// ===== 状态 =====
let state = {
  page: 'home',       // home | panel | exam | quiz | result | mentor
  panel: null,        // newbie | tech | sales
  user: null,         // { id, name }
  exams: [],          // 当前板块的考试列表
  currentExam: null,
  questions: [],
  answers: {},
  quizStartTime: null,
  quizTimer: null,
  quizTimeLeft: 0,
  attemptNumber: 0,
  remainingAttempts: 0,
  _submitting: false,
  // 导师
  mentorToken: null,
  mentorRecords: [],
  mentorTab: 'overview',
  mentorPanel: 'all',
  mentorStudents: [],
  mentorExams: [],
};

// ===== 工具函数 =====
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }
function escapeHtml(s) { const d=document.createElement('div');d.textContent=s;return d.innerHTML; }
function jsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"'); }
function formatTime(sec) { const m=Math.floor(sec/60),s=sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
function api(path, opts={}) {
  const url = path.startsWith('http') ? path : API_BASE + path;
  const headers = opts.headers || { 'Content-Type': 'application/json' };
  if (state.mentorToken) headers['x-mentor-token'] = state.mentorToken;
  return fetch(url, { ...opts, headers }).then(r => r.json());
}
function showToast(msg, type='info') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.remove(); }, 2500);
}

// ===== 渲染引擎 =====
function render() {
  const app = $('#app');
  if (!app) return;
  app.innerHTML = '';
  
  switch(state.page) {
    case 'home': renderHome(app); break;
    case 'panel': renderPanel(app); break;
    case 'exam': renderExam(app); break;
    case 'quiz': renderQuiz(app); break;
    case 'result': renderResult(app); break;
    case 'mentor': renderMentor(app); break;
    default: renderHome(app); break;
  }
}

// ===== 首页 =====
function renderHome(app) {
  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div>
          <h1>诺瓦&嗨动 产品培训考核系统</h1>
          <p>Nova & Hynamic Product Training & Assessment</p>
        </div>
        <div>
          <button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="APP.goMentor()">导师管理</button>
        </div>
      </div>
    </div>
    <div class="container">
      <div class="home-hero">
        <h1>选择考核板块</h1>
        <p>请根据你的培训阶段选择对应的考核板块</p>
      </div>
      <div class="panel-grid">
        <div class="panel-card newbie" onclick="APP.enterPanel('newbie')">
          <div class="panel-icon">📚</div>
          <div class="panel-title">新人专项答题</div>
          <div class="panel-desc">3周系统培训考核，每日一考+周考，15套试卷覆盖产品基础知识</div>
          <div class="panel-meta">
            <span class="badge badge-newbie">15套考试</span>
            <span class="badge badge-newbie">20题/套</span>
            <span class="badge badge-newbie">95分及格</span>
          </div>
        </div>
        <div class="panel-card tech" onclick="APP.enterPanel('tech')">
          <div class="panel-icon">🔧</div>
          <div class="panel-title">技术进阶产品考核</div>
          <div class="panel-desc">按产品系列深度考核，涵盖参数、性能、技术排查和系统架构</div>
          <div class="panel-meta">
            <span class="badge badge-tech">8套考试</span>
            <span class="badge badge-tech">20题/套</span>
            <span class="badge badge-tech">95分及格</span>
          </div>
        </div>
        <div class="panel-card sales" onclick="APP.enterPanel('sales')">
          <div class="panel-icon">💼</div>
          <div class="panel-title">销售进阶产品考核</div>
          <div class="panel-desc">按产品系列考核，侧重方案搭配、选型推荐和场景应用能力</div>
          <div class="panel-meta">
            <span class="badge badge-sales">8套考试</span>
            <span class="badge badge-sales">20题/套</span>
            <span class="badge badge-sales">95分及格</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ===== 进入板块 =====
async function enterPanel(panel) {
  state.panel = panel;
  state.page = 'panel';
  
  // 检查登录状态
  const saved = localStorage.getItem(`quiz_user_${panel}`);
  if (saved) {
    try { state.user = JSON.parse(saved); } catch(e) {}
  }
  
  if (!state.user) {
    showLoginModal(panel);
    return;
  }
  
  // 加载考试列表
  const res = await api(`/api/exams?panel=${panel}`);
  if (res.success) {
    state.exams = res.exams;
    // 获取尝试次数
    const attRes = await api(`/api/attempts/${encodeURIComponent(state.user.name)}`);
    if (attRes.success) {
      state.exams = state.exams.map(e => ({
        ...e,
        _attempts: (attRes.attempts[e.id] || 0),
        _blocked: (attRes.attempts[e.id] || 0) >= MAX_ATTEMPTS
      }));
    }
    render();
  }
}

function showLoginModal(panel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in">
      <div class="modal-header">${PANEL_LABELS[panel]} - 学员登录</div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">请输入你的姓名</label>
          <input class="form-input" id="loginNameInput" placeholder="输入姓名后开始考核" autofocus>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="APP.goHome()">返回首页</button>
        <button class="btn btn-primary" id="loginBtn">确认登录</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  
  $('#loginNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#loginBtn').click();
  });
  
  $('#loginBtn').onclick = async () => {
    const name = $('#loginNameInput').value.trim();
    if (!name) return showToast('请输入姓名', 'error');
    const res = await api('/api/login', { method: 'POST', body: JSON.stringify({ name }) });
    if (res.success) {
      state.user = res.user;
      localStorage.setItem(`quiz_user_${panel}`, JSON.stringify(res.user));
      overlay.remove();
      await enterPanel(panel);
    }
  };
}

// ===== 板块考试列表 =====
function renderPanel(app) {
  const panel = state.panel;
  const color = PANEL_COLORS[panel];
  const exams = state.exams || [];
  
  // 分组
  let html = `
    <div class="header">
      <div class="header-inner">
        <div>
          <div class="nav-back" onclick="APP.goHome()">← 返回首页</div>
          <h1 style="margin-top:4px">${PANEL_LABELS[panel]}</h1>
        </div>
        <div>
          <span style="font-size:13px;opacity:.9">${escapeHtml(state.user ? state.user.name : '')}</span>
          <button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3);margin-left:8px" onclick="APP.logout()">退出</button>
        </div>
      </div>
    </div>
    <div class="container">`;
  
  if (panel === 'newbie') {
    // 按周分组
    const weeks = [1, 2, 3];
    for (const w of weeks) {
      const weekExams = exams.filter(e => e.week === w);
      if (weekExams.length === 0) continue;
      html += `<div class="week-section"><div class="week-title">📅 第${w}周</div>`;
      html += renderExamList(weekExams);
      html += `</div>`;
    }
  } else {
    // 按品牌分组
    const brands = [
      { key: '诺瓦', label: '诺瓦 (NovaStar)', dot: 'nova' },
      { key: '嗨动', label: '嗨动 (Hynamic)', dot: 'haidong' },
      { key: '综合', label: '综合考核', dot: '' }
    ];
    for (const b of brands) {
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
  
  // 绑定点击事件
  $$('.exam-item:not(.blocked)').forEach(el => {
    el.addEventListener('click', () => {
      const examId = el.dataset.examId;
      startExam(examId);
    });
  });
}

function renderExamList(exams) {
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
async function startExam(examId) {
  if (!state.user) return;
  
  const res = await api('/api/start-exam', {
    method: 'POST',
    body: JSON.stringify({ studentName: state.user.name, examId })
  });
  
  if (!res.success) {
    if (res.blocked) {
      showToast(`该考试已达最大尝试次数（${MAX_ATTEMPTS}次）`, 'warning');
      if (res.bestRecord) {
        showToast(`历史最佳成绩：${res.bestRecord.score}分 ${res.bestRecord.passed ? '✅ 及格' : '❌ 未及格'}`, 'info');
      }
    } else {
      showToast(res.message || '开始考试失败', 'error');
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
function renderQuiz(app) {
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
        <span class="quiz-progress">已答 ${answered} / ${questions.length} · 第${state.attemptNumber}次答题</span>
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

function renderQuestion(q, i) {
  const typeLabel = TYPE_LABELS[q.type] || '单选题';
  const pts = q.points || 5;
  let html = `
    <div class="question-card" id="q_${q.id}">
      <span class="question-type ${q.type}">${typeLabel} · ${pts}分</span>
      <div class="question-text">${i + 1}. ${escapeHtml(q.question)} ${q.type === 'multiple' ? '<span style="color:var(--warning);font-size:12px">（多选）</span>' : ''}</div>`;
  
  if (q.type === 'single') {
    html += `<div class="question-options">${(q.options || []).map((opt, oi) => `
      <div class="option-item" data-qid="${q.id}" data-answer="${String.fromCharCode(65 + oi)}" data-type="single">
        <div class="option-radio"></div>
        <div class="option-text">${String.fromCharCode(65 + oi)}. ${escapeHtml(opt)}</div>
      </div>`).join('')}</div>`;
  } else if (q.type === 'multiple') {
    html += `<div class="question-options">${(q.options || []).map((opt, oi) => `
      <div class="option-item" data-qid="${q.id}" data-answer="${String.fromCharCode(65 + oi)}" data-type="multiple">
        <div class="option-checkbox"></div>
        <div class="option-text">${String.fromCharCode(65 + oi)}. ${escapeHtml(opt)}</div>
      </div>`).join('')}</div>`;
  } else if (q.type === 'judge') {
    html += `<div class="judge-btns">
      <div class="judge-btn" data-qid="${q.id}" data-answer="A" data-type="judge">✓ 正确</div>
      <div class="judge-btn" data-qid="${q.id}" data-answer="B" data-type="judge">✗ 错误</div>
    </div>`;
  } else if (q.type === 'short') {
    html += `<textarea class="short-answer" data-qid="${q.id}" data-type="short" placeholder="请输入你的答案..."></textarea>`;
  }
  
  html += `</div>`;
  return html;
}

function bindQuestionEvents() {
  // 单选/判断
  $$('.option-item[data-type="single"], .judge-btn[data-type="judge"]').forEach(el => {
    el.addEventListener('click', () => {
      const qid = el.dataset.qid;
      const answer = el.dataset.answer;
      const type = el.dataset.type;
      state.answers[qid] = answer;
      // 更新UI
      const qEl = $(`#q_${qid}`);
      if (type === 'single') {
        qEl.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected'));
      }
      if (type === 'judge') {
        qEl.querySelectorAll('.judge-btn').forEach(o => o.classList.remove('selected'));
      }
      el.classList.add('selected');
      updateProgress();
    });
  });
  
  // 多选
  $$('.option-item[data-type="multiple"]').forEach(el => {
    el.addEventListener('click', () => {
      const qid = el.dataset.qid;
      const answer = el.dataset.answer;
      el.classList.toggle('selected');
      const selected = [];
      $(`#q_${qid}`).querySelectorAll('.option-item.selected').forEach(o => {
        selected.push(o.dataset.answer);
      });
      state.answers[qid] = selected.sort().join('');
      updateProgress();
    });
  });
  
  // 简答
  $$('.short-answer').forEach(el => {
    el.addEventListener('input', () => {
      state.answers[el.dataset.qid] = el.value;
      updateProgress();
    });
  });
  
  // 恢复已选答案
  for (const qid in state.answers) {
    const ans = state.answers[qid];
    const qEl = $(`#q_${qid}`);
    if (!qEl) continue;
    
    const firstItem = qEl.querySelector('.option-item, .judge-btn');
    if (!firstItem) continue;
    
    const type = firstItem.dataset.type;
    if (type === 'single' || type === 'judge') {
      const target = qEl.querySelector(`[data-answer="${ans}"]`);
      if (target) target.classList.add('selected');
    } else if (type === 'multiple') {
      for (const ch of ans) {
        const target = qEl.querySelector(`[data-answer="${ch}"]`);
        if (target) target.classList.add('selected');
      }
    } else if (type === 'short') {
      const ta = qEl.querySelector('textarea');
      if (ta) ta.value = ans;
    }
  }
}

function updateProgress() {
  const answered = Object.keys(state.answers).length;
  const el = $('#quizProgress');
  if (el) el.textContent = `已答 ${answered} / ${state.questions.length}`;
}

// ===== 计时器 =====
function startTimer() {
  clearInterval(state.quizTimer);
  state.quizTimer = setInterval(() => {
    state.quizTimeLeft--;
    const el = $('#quizTimer');
    if (el) {
      el.textContent = `⏱ ${formatTime(state.quizTimeLeft)}`;
      if (state.quizTimeLeft <= 300) el.style.color = 'var(--danger)';
    }
    if (state.quizTimeLeft <= 0) {
      clearInterval(state.quizTimer);
      showToast('时间到，自动提交！', 'warning');
      submitQuiz();
    }
  }, 1000);
}

// ===== 提交 =====
function confirmExitQuiz() {
  if (Object.keys(state.answers).length > 0) {
    if (!confirm('退出后答题进度将丢失，确定退出吗？')) return;
  }
  clearInterval(state.quizTimer);
  state.page = 'panel';
  render();
}

function confirmSubmit() {
  const answered = Object.keys(state.answers).length;
  const total = state.questions.length;
  if (answered < total) {
    if (!confirm(`还有 ${total - answered} 题未作答，确定提交吗？`)) return;
  }
  submitQuiz();
}

async function submitQuiz() {
  if (state._submitting) return;
  state._submitting = true;
  clearInterval(state.quizTimer);
  
  const record = {
    studentName: state.user.name,
    examId: state.currentExam.id,
    panel: state.panel,
    questions: state.questions,
    answers: state.answers,
    attemptNumber: state.attemptNumber,
    submitTime: new Date().toISOString(),
    timeSpent: (state.currentExam.duration * 60) - state.quizTimeLeft
  };
  
  try {
    const res = await api('/api/records', {
      method: 'POST',
      body: JSON.stringify(record)
    });
    
    if (res.success) {
      state.lastRecord = res.record;
      state.page = 'result';
      render();
    } else {
      showToast('提交失败，请重试', 'error');
      state._submitting = false;
    }
  } catch(e) {
    showToast('网络错误，提交失败', 'error');
    state._submitting = false;
  }
}

// ===== 成绩展示 =====
function renderResult(app) {
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
            <div class="score-item-value">${(typeScores[t] || {}).score || 0} / ${(typeScores[t] || {}).max || 0}</div>
          </div>`).join('')}
      </div>
      
      <div style="text-align:center;margin-top:20px;display:flex;gap:12px;justify-content:center">
        ${state.remainingAttempts > 0 ? `<button class="btn btn-primary" onclick="APP.retryExam()">再次答题（${state.remainingAttempts}次）</button>` : 
          `<button class="btn btn-outline" disabled>已达上限</button>`}
        <button class="btn btn-outline" onclick="APP.backToPanel()">返回列表</button>
      </div>
    </div>`;
}

// ===== 导师端 =====
function goMentor() {
  if (state.mentorToken) {
    state.page = 'mentor';
    state.mentorTab = 'overview';
    syncAllRecords();
    render();
    return;
  }
  showMentorLogin();
}

function showMentorLogin() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in">
      <div class="modal-header">导师管理登录</div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">请输入导师密码</label>
          <input class="form-input" id="mentorPwdInput" type="password" placeholder="输入密码" autofocus>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" id="mentorLoginBtn">登录</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  
  $('#mentorPwdInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#mentorLoginBtn').click();
  });
  
  $('#mentorLoginBtn').onclick = async () => {
    const pwd = $('#mentorPwdInput').value;
    if (!pwd) return showToast('请输入密码', 'error');
    try {
      const res = await api('/api/mentor/login', { method: 'POST', body: JSON.stringify({ password: pwd }) });
      if (res.success) {
        state.mentorToken = res.token;
        localStorage.setItem('quiz_mentor_token', res.token);
        overlay.remove();
        state.page = 'mentor';
        state.mentorTab = 'overview';
        await syncAllRecords();
        render();
      } else {
        showToast('密码错误', 'error');
      }
    } catch(e) {
      showToast('登录失败，请检查网络', 'error');
    }
  };
}

async function syncAllRecords() {
  if (!state.mentorToken) return;
  try {
    const res = await api('/api/mentor/records');
    if (res.success) {
      state.mentorRecords = res.records;
      localStorage.setItem('quiz_mentor_records', JSON.stringify(res.records));
    }
    const studentsRes = await api('/api/mentor/students');
    if (studentsRes.success) {
      state.mentorStudents = studentsRes.students;
    }
    const examsRes = await api('/api/exams');
    if (examsRes.success) {
      state.mentorExams = examsRes.exams;
    }
  } catch(e) {
    const cached = localStorage.getItem('quiz_mentor_records');
    if (cached) state.mentorRecords = JSON.parse(cached);
  }
}

function renderMentor(app) {
  const tabs = ['overview', 'records', 'scoring', 'question_bank', 'weak_areas'];
  const tabLabels = { overview: '数据看板', records: '答题记录', scoring: '评分管理', question_bank: '题库管理', weak_areas: '查缺补漏' };
  
  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div class="nav-back" onclick="APP.goHome()">← 返回首页</div>
        <span style="font-size:14px;font-weight:600">导师管理</span>
        <button class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="APP.logoutMentor()">退出</button>
      </div>
    </div>
    <div class="container">
      <div class="tabs">
        ${tabs.map(t => `<span class="tab${state.mentorTab === t ? ' active' : ''}" onclick="APP.switchMentorTab('${t}')">${tabLabels[t]}</span>`).join('')}
      </div>
      <div id="mentorContent"></div>
    </div>`;
  
  switch(state.mentorTab) {
    case 'overview': renderMentorOverview(); break;
    case 'records': renderMentorRecords(); break;
    case 'scoring': renderMentorScoring(); break;
    case 'question_bank': renderMentorQuestionBank(); break;
    case 'weak_areas': renderMentorWeakAreas(); break;
  }
}

function switchMentorTab(tab) {
  state.mentorTab = tab;
  render();
}

function renderMentorOverview() {
  const records = state.mentorRecords;
  const totalRecords = records.length;
  const passedCount = records.filter(r => r.passed).length;
  const passRate = totalRecords > 0 ? Math.round(passedCount / totalRecords * 100) : 0;
  const avgScore = totalRecords > 0 ? Math.round(records.reduce((s, r) => s + (r.finalScore !== undefined ? r.finalScore : r.autoScore), 0) / totalRecords) : 0;
  const studentCount = state.mentorStudents.length;
  
  // 按板块统计
  const panelStats = {};
  for (const r of records) {
    const p = r.panel || 'newbie';
    if (!panelStats[p]) panelStats[p] = { total: 0, passed: 0, score: 0 };
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
        ${['newbie','tech','sales'].map(p => {
          const s = panelStats[p] || { total: 0, passed: 0, score: 0 };
          const avg = s.total > 0 ? Math.round(s.score / s.total) : 0;
          const rate = s.total > 0 ? Math.round(s.passed / s.total * 100) : 0;
          return `<div class="stat-card">
            <div class="stat-value" style="font-size:20px">${PANEL_LABELS[p]}</div>
            <div class="stat-label">${s.total}条记录 · ${avg}分均分 · ${rate}%通过</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  
  $('#mentorContent').innerHTML = html;
}

function renderMentorRecords() {
  const records = state.mentorRecords;
  // 按板块筛选
  let html = `
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-sm ${state.mentorPanel === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="APP.filterMentorPanel('all')">全部</button>
      <button class="btn btn-sm ${state.mentorPanel === 'newbie' ? 'btn-primary' : 'btn-outline'}" onclick="APP.filterMentorPanel('newbie')">新人专项</button>
      <button class="btn btn-sm ${state.mentorPanel === 'tech' ? 'btn-primary' : 'btn-outline'}" onclick="APP.filterMentorPanel('tech')">技术进阶</button>
      <button class="btn btn-sm ${state.mentorPanel === 'sales' ? 'btn-primary' : 'btn-outline'}" onclick="APP.filterMentorPanel('sales')">销售进阶</button>
    </div>`;
  
  const filtered = state.mentorPanel === 'all' ? records : records.filter(r => r.panel === state.mentorPanel);
  
  if (filtered.length === 0) {
    html += `<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>`;
  } else {
    html += `<div class="table-wrap"><table class="table">
      <thead><tr><th>学员</th><th>板块</th><th>考试</th><th>得分</th><th>是否通过</th><th>时间</th><th>操作</th></tr></thead>
      <tbody>${filtered.sort((a,b) => new Date(b.submitTime) - new Date(a.submitTime)).map(r => {
        const score = r.finalScore !== undefined ? r.finalScore : r.autoScore;
        const panel = r.panel || 'newbie';
        return `<tr>
          <td>${escapeHtml(r.studentName)}</td>
          <td><span class="badge badge-${PANEL_COLORS[panel] || 'newbie'}">${PANEL_LABELS[panel] || '新人'}</span></td>
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
}

function filterMentorPanel(panel) {
  state.mentorPanel = panel;
  renderMentorRecords();
}

function renderMentorScoring() {
  const records = state.mentorRecords;
  const scored = records.filter(r => r.mentorScored);
  const unscored = records.filter(r => !r.mentorScored);
  
  let html = `
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn btn-sm btn-outline" onclick="APP.renderMentorScoringSub('all')">全部（${records.length}）</button>
      <button class="btn btn-sm btn-warning" style="background:var(--warning);color:#fff" onclick="APP.renderMentorScoringSub('unscored')">待评分（${unscored.length}）</button>
      <button class="btn btn-sm btn-success" onclick="APP.renderMentorScoringSub('scored')">已评分（${scored.length}）</button>
    </div>
    <div id="scoringContent"></div>`;
  
  $('#mentorContent').innerHTML = html;
  renderMentorScoringSub('unscored');
}

function renderMentorScoringSub(filter) {
  const records = state.mentorRecords;
  let filtered;
  if (filter === 'scored') filtered = records.filter(r => r.mentorScored);
  else if (filter === 'unscored') filtered = records.filter(r => !r.mentorScored);
  else filtered = records;
  
  if (filtered.length === 0) {
    $('#scoringContent').innerHTML = `<div class="empty-state"><div class="empty-state-text">暂无记录</div></div>`;
    return;
  }
  
  // 按板块分组
  const groups = {};
  for (const r of filtered) {
    const p = r.panel || 'newbie';
    if (!groups[p]) groups[p] = [];
    groups[p].push(r);
  }
  
  let html = '';
  for (const panel of ['newbie','tech','sales']) {
    const group = groups[panel];
    if (!group || group.length === 0) continue;
    html += `<div style="margin-bottom:12px"><strong>${PANEL_LABELS[panel]}</strong></div>`;
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
  
  $('#scoringContent').innerHTML = html;
}

async function viewRecordDetail(recordId) {
  const record = state.mentorRecords.find(r => r.id === recordId);
  if (!record) {
    showToast('记录不存在', 'error');
    return;
  }
  
  const questions = record.questions || [];
  const answers = record.answers || {};
  const questionScores = record.questionScores || {};
  const score = record.finalScore !== undefined ? record.finalScore : record.autoScore;
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal fade-in" style="max-width:700px">
      <div class="modal-header">
        <span>${escapeHtml(record.studentName)} - ${escapeHtml(record.examId)}</span>
        <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div class="stat-card"><div class="stat-value">${score}</div><div class="stat-label">最终得分</div></div>
          <div class="stat-card"><div class="stat-value">${record.autoScore || 0}</div><div class="stat-label">自动评分</div></div>
          <div class="stat-card"><div class="stat-value">${record.mentorScored ? '✅' : '❌'}</div><div class="stat-label">是否已评</div></div>
        </div>
        ${questions.map((q, i) => {
          const userAns = answers[q.id] || '(未作答)';
          const qs = questionScores[q.id] || {};
          const gotScore = qs.score !== undefined ? qs.score : 0;
          const maxScore = qs.maxScore || q.points || 5;
          const isCorrect = gotScore >= maxScore;
          const typeLabel = TYPE_LABELS[q.type] || '单题';
          return `<div class="answer-detail">
            <div class="answer-detail-q">${i+1}. [${typeLabel}] ${escapeHtml(q.question)}</div>
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

// ===== 题库管理 =====
let _qbankData = null;
let _qbankSearch = '';
let _qbankPanel = 'all';

async function renderMentorQuestionBank() {
  const content = $('#mentorContent');
  if (!content) return;
  
  content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载中...</div></div>`;
  
  try {
    const res = await api('/api/mentor/questions');
    if (!res.success) { content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败</div></div>`; return; }
    _qbankData = res;
    
    renderQBankContent();
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败: ${e.message}</div></div>`;
  }
}

function renderQBankContent() {
  const content = $('#mentorContent');
  if (!content || !_qbankData) return;
  
  const panels = ['newbie', 'tech', 'sales'];
  const panelLabels = { newbie: '新人专项', tech: '技术进阶', sales: '销售进阶' };
  
  // 统计
  let totalQ = 0;
  for (const p of panels) {
    for (const g of (_qbankData.questions[p] || [])) {
      totalQ += (g.questions || []).length;
    }
  }
  
  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm ${_qbankPanel === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="APP.filterQBankPanel('all')">全部（${totalQ}题）</button>
        ${panels.map(p => `<button class="btn btn-sm ${_qbankPanel === p ? 'btn-primary' : 'btn-outline'}" onclick="APP.filterQBankPanel('${p}')">${panelLabels[p]}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <input class="form-input" id="qbankSearch" placeholder="搜索题目..." style="width:200px;padding:6px 10px;font-size:13px" value="${escapeHtml(_qbankSearch)}" oninput="APP.searchQBank(this.value)">
      </div>
    </div>`;
  
  for (const p of panels) {
    if (_qbankPanel !== 'all' && _qbankPanel !== p) continue;
    const groups = _qbankData.questions[p] || [];
    if (groups.length === 0) continue;
    
    html += `<div style="margin-bottom:20px"><div style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--primary)">${panelLabels[p]}</div>`;
    
    for (const g of groups) {
      let questions = g.questions || [];
      if (_qbankSearch) {
        const s = _qbankSearch.toLowerCase();
        questions = questions.filter(q => q.question.toLowerCase().includes(s));
      }
      if (questions.length === 0) continue;
      
      html += `<div class="card" style="margin-bottom:12px">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>${escapeHtml(g.title)} <span style="font-size:12px;color:var(--text-sec);font-weight:400">（${questions.length}题）</span></span>
          <button class="btn btn-sm btn-primary" onclick="APP.openAddQuestion('${p}', '${g.examId}', '${jsEscape(g.title)}')">+ 新增题目</button>
        </div>
        <div style="max-height:600px;overflow-y:auto">
          ${questions.map((q, i) => {
            const typeLabel = TYPE_LABELS[q.type] || '单选题';
            const typeColor = { single: '#1e40af', multiple: '#9d174d', judge: '#065f46', short: '#92400e' }[q.type] || '#333';
            return `<div class="qbank-item" style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;background:#fafbfc">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="flex:1">
                  <span style="display:inline-block;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:600;color:${typeColor};background:${typeColor}15;margin-right:6px">${typeLabel}</span>
                  <span style="font-size:12px;color:var(--text-sec)">${q.points || 5}分</span>
                  <span style="font-size:11px;color:var(--text-sec);margin-left:4px">ID: ${escapeHtml(q.id)}</span>
                  ${q.knowledgePoint ? `<span style="font-size:11px;color:var(--text-sec);margin-left:4px">知识点: ${escapeHtml(q.knowledgePoint)}</span>` : ''}
                  <div style="font-weight:600;margin-top:4px">${i+1}. ${escapeHtml(q.question)}</div>
                  ${q.options ? `<div style="font-size:13px;color:var(--text-sec);margin-top:4px">选项：${q.options.map(o => escapeHtml(o)).join(' / ')}</div>` : ''}
                  <div style="font-size:12px;margin-top:4px;color:var(--success)">答案：${escapeHtml(q.answer || '')} ${q.keywords ? '| 关键词：' + escapeHtml(q.keywords) : ''}</div>
                  ${q.explanation ? `<div style="font-size:12px;color:var(--text-sec);margin-top:2px">解析：${escapeHtml(q.explanation)}</div>` : ''}
                </div>
                <div style="display:flex;gap:4px;flex-shrink:0">
                  <button class="btn btn-sm btn-outline" onclick="APP.openEditQuestion('${p}', '${g.examId}', '${q.id}')">编辑</button>
                  <button class="btn btn-sm btn-danger" onclick="APP.deleteQuestion('${p}', '${g.examId}', '${q.id}')">删除</button>
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

function filterQBankPanel(panel) {
  _qbankPanel = panel;
  renderQBankContent();
}

function searchQBank(val) {
  _qbankSearch = val;
  renderQBankContent();
}

async function openEditQuestion(panel, examId, questionId) {
  const group = (_qbankData.questions[panel] || []).find(g => g.examId === examId);
  if (!group) return;
  const q = (group.questions || []).find(q => q.id === questionId);
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
            <option value="single" ${q.type === 'single' ? 'selected' : ''}>单选题</option>
            <option value="multiple" ${q.type === 'multiple' ? 'selected' : ''}>多选题</option>
            <option value="judge" ${q.type === 'judge' ? 'selected' : ''}>判断题</option>
            <option value="short" ${q.type === 'short' ? 'selected' : ''}>简答题</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">题目内容</label>
          <textarea class="form-textarea" id="editQuestion" rows="3">${escapeHtml(q.question || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">选项（每行一个，如：A. 选项内容）</label>
          <textarea class="form-textarea" id="editOptions" rows="4">${(q.options || []).join('\n')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">正确答案（单选/判断填A/B/C/D，多选填ABC，简答填关键词逗号分隔）</label>
          <input class="form-input" id="editAnswer" value="${escapeHtml(q.answer || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">简答关键词（逗号分隔，仅简答题需要）</label>
          <input class="form-input" id="editKeywords" value="${escapeHtml(q.keywords || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">分值</label>
          <input class="form-input" id="editPoints" type="number" value="${q.points || 5}" min="1" max="20">
        </div>
        <div class="form-group">
          <label class="form-label">解析/说明</label>
          <textarea class="form-textarea" id="editExplain" rows="3">${escapeHtml(q.explanation || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">知识点标签</label>
          <input class="form-input" id="editKnowledge" value="${escapeHtml(q.knowledgePoint || '')}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="APP.saveEditQuestion('${panel}', '${examId}', '${questionId}')">保存修改</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function saveEditQuestion(panel, examId, questionId) {
  const type = $('#editType').value;
  const question = $('#editQuestion').value.trim();
  const optionsStr = $('#editOptions').value.trim();
  const answer = $('#editAnswer').value.trim();
  const keywords = $('#editKeywords').value.trim();
  const points = parseInt($('#editPoints').value) || 5;
  const explanation = $('#editExplain').value.trim();
  const knowledgePoint = $('#editKnowledge').value.trim();
  
  if (!question) { showToast('请输入题目内容', 'error'); return; }
  if (!answer) { showToast('请输入正确答案', 'error'); return; }
  
  const options = optionsStr ? optionsStr.split('\n').filter(Boolean) : [];
  
  try {
    const res = await api(`/api/mentor/questions/${examId}/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify({ type, question, options, answer, keywords, points, explanation, knowledgePoint })
    });
    if (res.success) {
      showToast('题目已更新', 'success');
      document.querySelector('.modal-overlay')?.remove();
      renderMentorQuestionBank();
    } else {
      showToast('更新失败', 'error');
    }
  } catch(e) {
    showToast('保存失败', 'error');
  }
}

async function openAddQuestion(panel, examId, title) {
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
          <label class="form-label">选项（每行一个，如：A. 选项内容）</label>
          <textarea class="form-textarea" id="addOptions" rows="4" placeholder="A. 选项A&#10;B. 选项B&#10;C. 选项C&#10;D. 选项D"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">正确答案</label>
          <input class="form-input" id="addAnswer" placeholder="单选填A/B/C/D，多选填ABC，判断填A或B，简答填关键词">
        </div>
        <div class="form-group">
          <label class="form-label">简答关键词（逗号分隔）</label>
          <input class="form-input" id="addKeywords" placeholder="关键词1,关键词2,关键词3">
        </div>
        <div class="form-group">
          <label class="form-label">分值</label>
          <input class="form-input" id="addPoints" type="number" value="5" min="1" max="20">
        </div>
        <div class="form-group">
          <label class="form-label">解析/说明</label>
          <textarea class="form-textarea" id="addExplain" rows="3" placeholder="题目解析"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">知识点标签</label>
          <input class="form-input" id="addKnowledge" placeholder="如：LED显示基础-像素间距">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">取消</button>
        <button class="btn btn-primary" onclick="APP.saveAddQuestion('${panel}', '${examId}')">添加题目</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function saveAddQuestion(panel, examId) {
  const type = $('#addType').value;
  const question = $('#addQuestion').value.trim();
  const optionsStr = $('#addOptions').value.trim();
  const answer = $('#addAnswer').value.trim();
  const keywords = $('#addKeywords').value.trim();
  const points = parseInt($('#addPoints').value) || 5;
  const explanation = $('#addExplain').value.trim();
  const knowledgePoint = $('#addKnowledge').value.trim();
  
  if (!question) { showToast('请输入题目内容', 'error'); return; }
  if (!answer) { showToast('请输入正确答案', 'error'); return; }
  
  const options = optionsStr ? optionsStr.split('\n').filter(Boolean) : [];
  
  try {
    const res = await api(`/api/mentor/questions/${examId}`, {
      method: 'POST',
      body: JSON.stringify({ type, question, options, answer, keywords, points, explanation, knowledgePoint })
    });
    if (res.success) {
      showToast('题目已添加', 'success');
      document.querySelector('.modal-overlay')?.remove();
      renderMentorQuestionBank();
    } else {
      showToast('添加失败: ' + (res.error || ''), 'error');
    }
  } catch(e) {
    showToast('添加失败', 'error');
  }
}

async function deleteQuestion(panel, examId, questionId) {
  if (!confirm('确定删除该题目？此操作不可恢复。')) return;
  try {
    const res = await api(`/api/mentor/questions/${examId}/${questionId}`, { method: 'DELETE' });
    if (res.success) {
      showToast('题目已删除', 'success');
      renderMentorQuestionBank();
    } else {
      showToast('删除失败', 'error');
    }
  } catch(e) {
    showToast('删除失败', 'error');
  }
}

// ===== 查缺补漏看板 =====
async function renderMentorWeakAreas() {
  const content = $('#mentorContent');
  if (!content) return;
  
  content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载中...</div></div>`;
  
  try {
    const res = await api('/api/mentor/weak-areas');
    if (!res.success) { content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败</div></div>`; return; }
    
    const students = res.students || [];
    if (students.length === 0) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-text">暂无答题数据，学员答题后即可查看查缺补漏分析</div></div>`;
      return;
    }
    
    let html = `
      <div style="margin-bottom:16px;font-size:14px;color:var(--text-sec)">
        共 ${res.totalStudents} 名学员有答题记录，按错题数从高到低排序
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th>学员</th><th>考试次数</th><th>总答题数</th><th>错题数</th><th>错误率</th>
          <th>错题类型分布</th><th>最薄弱考试</th><th>操作</th>
        </tr></thead>
        <tbody>`;
    
    for (const s of students) {
      const worstExam = s.wrongByExam && s.wrongByExam.length > 0 ? s.wrongByExam[0] : null;
      const worstExamLabel = worstExam ? `${worstExam.examId} (${worstExam.wrongCount}错)` : '-';
      const errorRateColor = s.errorRate >= 50 ? 'var(--danger)' : s.errorRate >= 30 ? 'var(--warning)' : 'var(--success)';
      
      html += `<tr>
        <td><strong>${escapeHtml(s.studentName)}</strong></td>
        <td>${s.totalExams}</td>
        <td>${s.totalQuestions}</td>
        <td><span style="color:var(--danger);font-weight:700">${s.wrongQuestions}</span></td>
        <td><span style="color:${errorRateColor};font-weight:700">${s.errorRate}%</span></td>
        <td style="font-size:12px">
          ${['single','multiple','judge','short'].map(t => {
            const count = s.wrongByType[t] || 0;
            if (count === 0) return '';
            return `<span style="margin-right:4px">${TYPE_LABELS[t]}: ${count}</span>`;
          }).filter(Boolean).join('') || '-'}
        </td>
        <td style="font-size:12px">${worstExamLabel}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="APP.viewStudentWeakDetail('${jsEscape(s.studentName)}')">查看详情</button>
        </td>
      </tr>`;
    }
    
    html += `</tbody></table></div>`;
    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-text">加载失败: ${e.message}</div></div>`;
  }
}

async function viewStudentWeakDetail(studentName) {
  try {
    const res = await api(`/api/mentor/weak-areas/${encodeURIComponent(studentName)}`);
    if (!res.success) { showToast('加载失败', 'error'); return; }
    
    const wrong = res.wrongQuestions || [];
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal fade-in" style="max-width:800px">
        <div class="modal-header">
          <span>${escapeHtml(studentName)} - 查缺补漏详情（共${wrong.length}道错题）</span>
          <span onclick="this.closest('.modal-overlay').remove()" style="cursor:pointer">✕</span>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
          ${wrong.length === 0 ? '<div class="empty-state"><div class="empty-state-text">该学员暂无错题！</div></div>' : ''}
          ${(() => {
            // 按考试分组
            const byExam = {};
            for (const w of wrong) {
              if (!byExam[w.examId]) byExam[w.examId] = [];
              byExam[w.examId].push(w);
            }
            return Object.entries(byExam).map(([examId, items]) => `
              <div style="margin-bottom:16px">
                <div style="font-weight:700;font-size:14px;color:var(--danger);margin-bottom:8px">
                  ${escapeHtml(examId)} — ${items.length}道错题
                </div>
                ${items.map((w, i) => `
                  <div class="answer-detail">
                    <div class="answer-detail-q">${i+1}. [${TYPE_LABELS[w.type] || '单题'}] ${escapeHtml(w.question)}</div>
                    <div style="font-size:13px;margin-top:4px">
                      <span style="color:var(--text-sec)">学员答案：</span><span style="color:var(--danger)">${escapeHtml(w.userAnswer)}</span>
                      ${w.correctAnswer ? `<span style="margin-left:8px;color:var(--text-sec)">正确答案：</span><span style="color:var(--success)">${escapeHtml(w.correctAnswer)}</span>` : ''}
                    </div>
                    <div style="font-size:12px;margin-top:2px;color:var(--danger)">
                      得分：${w.gotScore}/${w.maxScore}
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('');
          })()}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">关闭</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  } catch(e) {
    showToast('加载失败', 'error');
  }
}

async function openScoringDetail(recordId) {
  const record = state.mentorRecords.find(r => r.id === recordId);
  if (!record) return;
  
  const questions = (record.questions || []).filter(q => q.type === 'short');
  if (questions.length === 0) {
    showToast('该考试无简答题，无需评分', 'info');
    return;
  }
  
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
      <div class="modal-body" id="scoringDetailBody">
        ${questions.map(q => {
          const userAns = answers[q.id] || '(未作答)';
          const prev = mentorDetails[q.id] || {};
          const prevScore = prev.mentorScore !== undefined ? prev.mentorScore : 0;
          return `<div class="scoring-card">
            <div class="scoring-question">${escapeHtml(q.question)}（满分${q.points || 10}分）</div>
            <div class="scoring-answer">${escapeHtml(userAns)}</div>
            ${q.keywords ? `<div class="scoring-keywords">关键词：${escapeHtml(q.keywords)}</div>` : ''}
            <div class="scoring-controls">
              <span>导师评分：</span>
              <input class="scoring-input" id="score_${recordId}_${q.id}" type="number" min="0" max="${q.points || 10}" value="${prevScore}" data-prev="${prevScore}">
              <span> / ${q.points || 10} 分</span>
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

async function saveMentorScore(recordId) {
  const record = state.mentorRecords.find(r => r.id === recordId);
  if (!record) return;
  
  const questions = (record.questions || []).filter(q => q.type === 'short');
  let mentorScoreDetails = {};
  let totalScore = 0;
  let shortScore = 0, shortMax = 0;
  
  // 从typeScores计算客观题分数
  const typeScores = record.typeScores || {};
  const objectiveScore = (typeScores.single?.score || 0) + (typeScores.multiple?.score || 0) + (typeScores.judge?.score || 0);
  
  const newQuestionScores = { ...(record.questionScores || {}) };
  const newTypeScores = {
    single: { ...(typeScores.single || { score: 0, max: 0 }) },
    multiple: { ...(typeScores.multiple || { score: 0, max: 0 }) },
    judge: { ...(typeScores.judge || { score: 0, max: 0 }) },
    short: { score: 0, max: 0 }
  };
  
  let hasError = false;
  questions.forEach(q => {
    const input = document.getElementById(`score_${recordId}_${q.id}`);
    const rawVal = input ? parseFloat(input.value) : NaN;
    const newScore = (!isNaN(rawVal) && rawVal >= 0) ? Math.min(q.points || 10, Math.max(0, rawVal)) : 0;
    
    const oldScore = (record.questionScores || {})[q.id]?.score || 0;
    const autoScore = (record.mentorScoreDetails && record.mentorScoreDetails[q.id]) 
      ? record.mentorScoreDetails[q.id].autoScore : oldScore;
    
    mentorScoreDetails[q.id] = { autoScore, mentorScore: newScore };
    shortScore += newScore;
    shortMax += (q.points || 10);
    newQuestionScores[q.id] = { score: newScore, maxScore: q.points || 10 };
  });
  
  newTypeScores.short = { score: shortScore, max: shortMax };
  totalScore = objectiveScore + shortScore;
  
  try {
    const res = await api(`/api/mentor/records/${recordId}/score`, {
      method: 'PUT',
      body: JSON.stringify({
        mentorScore: shortScore,
        finalScore: totalScore,
        passed: totalScore >= PASSING_SCORE,
        mentorScored: true,
        mentorScoreDetails,
        questionScores: newQuestionScores,
        typeScores: newTypeScores
      })
    });
    
    if (res.success) {
      // 更新本地缓存
      const idx = state.mentorRecords.findIndex(r => r.id === recordId);
      if (idx >= 0) {
        state.mentorRecords[idx] = res.record;
      }
      localStorage.setItem('quiz_mentor_records', JSON.stringify(state.mentorRecords));
      showToast(`评分已保存！客观题${objectiveScore}分 + 简答题${shortScore}分 = ${totalScore}分`, 'success');
      // 关闭弹窗
      document.querySelector('.modal-overlay')?.remove();
      // 刷新评分列表
      if (state.page === 'mentor' && state.mentorTab === 'scoring') {
        renderMentorScoring();
      }
    } else {
      showToast('保存失败', 'error');
    }
  } catch(e) {
    showToast('保存失败，请检查网络', 'error');
  }
}

async function resetMentorScore(recordId) {
  if (!confirm('确定重置评分？将恢复为自动评分结果。')) return;
  try {
    const res = await api(`/api/mentor/records/${recordId}/score`, { method: 'DELETE' });
    if (res.success) {
      const idx = state.mentorRecords.findIndex(r => r.id === recordId);
      if (idx >= 0) state.mentorRecords[idx] = res.record;
      localStorage.setItem('quiz_mentor_records', JSON.stringify(state.mentorRecords));
      showToast('评分已重置', 'success');
      document.querySelector('.modal-overlay')?.remove();
      if (state.page === 'mentor' && state.mentorTab === 'scoring') renderMentorScoring();
    }
  } catch(e) {
    showToast('重置失败', 'error');
  }
}

async function deleteRecord(recordId) {
  if (!confirm('确定删除该记录？此操作不可恢复。')) return;
  try {
    const res = await api(`/api/mentor/records/${recordId}`, { method: 'DELETE' });
    if (res.success) {
      await syncAllRecords();
      render();
      showToast('记录已删除', 'success');
    }
  } catch(e) {
    showToast('删除失败', 'error');
  }
}

async function clearAllRecords() {
  if (!confirm('确定清空全部答题记录？此操作不可恢复！')) return;
  try {
    const res = await api('/api/mentor/records', { method: 'DELETE' });
    if (res.success) {
      state.mentorRecords = [];
      localStorage.setItem('quiz_mentor_records', JSON.stringify([]));
      render();
      showToast(`已清空 ${res.deletedCount} 条记录`, 'success');
    }
  } catch(e) {
    showToast('操作失败', 'error');
  }
}

function retryExam() {
  if (state.remainingAttempts <= 0) {
    showToast('已达最大尝试次数', 'error');
    return;
  }
  startExam(state.currentExam.id);
}

function backToPanel() {
  state.page = 'panel';
  render();
  // 刷新考试列表
  enterPanel(state.panel);
}

function goHome() {
  clearInterval(state.quizTimer);
  state.page = 'home';
  state.panel = null;
  state.currentExam = null;
  render();
}

function logout() {
  clearInterval(state.quizTimer);
  state.user = null;
  state.exams = [];
  if (state.panel) localStorage.removeItem(`quiz_user_${state.panel}`);
  state.page = 'home';
  state.panel = null;
  render();
}

function logoutMentor() {
  state.mentorToken = null;
  state.mentorRecords = [];
  localStorage.removeItem('quiz_mentor_token');
  localStorage.removeItem('quiz_mentor_records');
  state.page = 'home';
  render();
}

// 恢复导师登录状态
function restoreMentorSession() {
  const token = localStorage.getItem('quiz_mentor_token');
  if (token) {
    state.mentorToken = token;
    const cached = localStorage.getItem('quiz_mentor_records');
    if (cached) {
      try { state.mentorRecords = JSON.parse(cached); } catch(e) {}
    }
  }
}

// ===== 暴露 API =====
window.APP = {
  goHome, enterPanel, startExam, confirmExitQuiz, confirmSubmit,
  retryExam, backToPanel, logout, goMentor, logoutMentor,
  switchMentorTab, filterMentorPanel, viewRecordDetail, openScoringDetail,
  saveMentorScore, resetMentorScore, deleteRecord, clearAllRecords,
  renderMentorScoringSub, render, showLoginModal,
  // 题库管理
  renderMentorQuestionBank, filterQBankPanel, searchQBank,
  openEditQuestion, saveEditQuestion, openAddQuestion, saveAddQuestion, deleteQuestion,
  // 查缺补漏
  renderMentorWeakAreas, viewStudentWeakDetail
};

// ===== 初始化 =====
restoreMentorSession();
render();

})();