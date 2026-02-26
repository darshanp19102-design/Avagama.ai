/* ── Globals ── */
const app = document.getElementById('app');
const API_URL = window.__APP_ENV__?.API_URL || '';

const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  // nav dropdowns
  ucMenuOpen: false,
  userMenuOpen: false,
  // dashboard
  dashDiscOpen: false,
  dashData: null,
  dashDateRange: 30,
  dashDateOpen: false,
  dashShortlisted: false,
  // my evaluations
  selectedIds: new Set(),
  evalFilter: 'all',
  // compare page
  compareRows: [],
  // use-case discovery
  domainResult: null,
  domainLoading: false,
  domainError: null,
  domainFilters: { domain: '', user_role: '', objective: '' },
  domainOpenIdx: -1,
  companyResult: null,
  companyLoading: false,
  companyError: null,
  companyFilter: '',
  companyOpenIdx: -1,
};

/* ── API helper ── */
async function api(path, method = 'GET', body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && path !== '/api/auth/login') {
    logout();
    go('/login');
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = data.detail || 'Request failed';
    if (Array.isArray(msg)) msg = msg.map(e => e.msg).join(', ');
    throw new Error(msg);
  }
  return data;
}

/* ── Router ── */
function go(path) { history.pushState({}, '', path); render(); }
window.onpopstate = () => render();

function logout() {
  state.token = null; state.user = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  go('/login');
}

/* ── Auto-Logout (10 mins idle) ── */
let idleTimer;
function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (state.token) {
    idleTimer = setTimeout(() => {
      alert('Your session has expired due to inactivity.');
      logout();
    }, 10 * 60 * 1000); // 10 minutes
  }
}

// Attach event listeners to reset the timer on user activity
['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => {
  document.addEventListener(evt, resetIdleTimer, { passive: true });
});

function bindLinks() {
  document.querySelectorAll('[data-link]').forEach(el => {
    el.onclick = e => { e.preventDefault(); go(el.getAttribute('href')); };
  });
}
window.go = go;
window.exportXLSX = exportXLSX;

/* ── SVG icons ── */
const IC = {
  layers: `<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  clock: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  brain: `<svg viewBox="0 0 24 24"><path d="M9 3a5 5 0 0 0-4.9 5.5C3 10 2 11.5 2 13a4 4 0 0 0 4 4h1v3h2v-3h6v3h2v-3h1a4 4 0 0 0 4-4c0-1.5-1-3-2.1-4.5A5 5 0 0 0 15 3a5.1 5.1 0 0 0-3 1 5.1 5.1 0 0 0-3-1z"/></svg>`,
  flow: `<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 12h4l4-7M8 12h4l4 7"/></svg>`,
  doc: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  alert: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  shield: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  scan: `<svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>`,
  bar: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  grid: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  headset: `<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeoff: `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  save: `<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  send: `<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  upload: `<svg viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  export: `<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  compare: `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="4"/><polyline points="14 8 18 4 22 8"/><line x1="6" y1="4" x2="6" y2="20"/><polyline points="10 16 6 20 2 16"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/></svg>`,
  chevdown: `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevup: `<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  arrleft: `<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`,
  mail: `<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  help: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};
function ic(name) { return IC[name] || ''; }

/* ── Logo HTML ── */
function logo(h = 24) {
  return `<img src="/logo.svg" alt="Avagama.AI" class="logo-img" style="height:${h}px;" />`;
}
function logoLarge() {
  return `<img src="/logo.svg" alt="Avagama.AI" class="logo-img logo-img-lg" style="height:36px;" />`;
}

/* ── Top Nav ── */
function topNav(active) {
  const init = (state.user?.first_name || state.user?.company_name || 'U')[0].toUpperCase();
  const limit = state.user?.evaluation_limit ?? 20;
  const count = state.user?.evaluation_count ?? 0;
  const rem = Math.max(0, limit - count);
  return `
<header class="topbar">
  <div id="logoHome" style="cursor:pointer; display:flex; align-items:center;">${logo(24)}</div>
  <nav class="tb-nav">
    <a href="/" data-link class="${active === 'dash' ? 'act' : ''}">Dashboard</a>
    <a href="/my-evaluations" data-link class="${active === 'evals' ? 'act' : ''}">My evaluations</a>
    <div class="drop-wrap">
      <button class="tb-link${active === 'uc' ? ' act' : ''}" id="ucNavBtn">AI use-case discovery <span class="chevron-sm">▾</span></button>
      <div class="drop-menu uc-drop${state.ucMenuOpen ? ' open' : ''}">
        <button id="navDomain">Domain Focus</button>
        <button id="navCompany">Company Focus</button>
      </div>
    </div>
  </nav>
  <div class="tb-meta">
    <button class="tb-icon-btn" title="Help" id="helpNavBtn">${ic('headset')}</button>
    <div class="drop-wrap">
      <button class="tb-user" id="userBtn">${init}</button>
      <div class="drop-menu profile-menu${state.userMenuOpen ? ' open' : ''}" style="width: 260px; padding: 16px;">
        <div style="display:flex; align-items:center; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
          <div class="tb-user" style="cursor:default">${init}</div>
          <div style="flex:1; overflow:hidden;">
            <div style="font-weight:600; font-size:14px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${state.user?.first_name || state.user?.company_name || 'User'}</div>
            <div style="color:#6b7280; font-size:12px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${state.user?.email || ''}</div>
          </div>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;">
            <span style="color:#6b7280">Evaluations Used</span>
            <span style="font-weight:600">${count} / ${limit}</span>
          </div>
          <div style="background:#e5e7eb; height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:var(--purple); height:100%; width:${Math.min(100, Math.max(0, (count / limit) * 100))}%;"></div>
          </div>
          <div style="text-align:right; font-size:11px; color:#6b7280; margin-top:4px;">${rem} remaining</div>
        </div>
        <button id="logoutBtn" style="color:#dc2626; justify-content:center; background:#fee2e2; border-radius:6px; width:100%; display:flex; align-items:center; padding:8px 12px; border:none; font-weight:500; cursor:pointer; font-family:inherit;">Logout</button>
      </div>
    </div>
  </div>
</header>`;
}

// Named handler for deduplication — prevents stacking on every bindNav() call
function _navOutsideClick() {
  if (state.ucMenuOpen || state.userMenuOpen) {
    state.ucMenuOpen = false;
    state.userMenuOpen = false;
    document.querySelectorAll('.drop-menu.open').forEach(m => m.classList.remove('open'));
  }
}

function bindNav() {
  document.getElementById('logoHome')?.addEventListener('click', () => go('/'));
  // User menu: click to toggle in-place
  document.getElementById('userBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    state.userMenuOpen = !state.userMenuOpen;
    state.ucMenuOpen = false;
    const userDrop = document.getElementById('userBtn')?.closest('.drop-wrap')?.querySelector('.drop-menu');
    const ucDrop = document.querySelector('.uc-drop');
    if (userDrop) userDrop.classList.toggle('open', state.userMenuOpen);
    if (ucDrop) ucDrop.classList.remove('open');
  });
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('helpNavBtn')?.addEventListener('click', () => go('/support'));
  // UC discovery: click to toggle (more reliable than hover)
  document.getElementById('ucNavBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    state.ucMenuOpen = !state.ucMenuOpen;
    state.userMenuOpen = false;
    const ucDrop = document.querySelector('.uc-drop');
    const userDrop = document.getElementById('userBtn')?.closest('.drop-wrap')?.querySelector('.drop-menu');
    if (ucDrop) ucDrop.classList.toggle('open', state.ucMenuOpen);
    if (userDrop) userDrop.classList.remove('open');
  });
  document.getElementById('navDomain')?.addEventListener('click', () => { state.ucMenuOpen = false; go('/use-cases/domain'); });
  document.getElementById('navCompany')?.addEventListener('click', () => { state.ucMenuOpen = false; go('/use-cases/company'); });
  // Close all menus on outside click — remove first to avoid duplicates
  document.removeEventListener('click', _navOutsideClick);
  document.addEventListener('click', _navOutsideClick);
  bindLinks();
}

/* ── AUTH ── */
function authPage(mode) {
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  const resetToken = new URLSearchParams(location.search).get('token') || '';

  // Forgot/reset: show minimal page (no left pane)
  if (isForgot || isReset) {
    app.innerHTML = `
<div style="min-height:100vh;background:#f5f4fc;display:flex;flex-direction:column;">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 32px;">
    ${logo()}
    <span class="auth-help" style="cursor:pointer;" id="authHelpForgot">${ic('headset')} Help &amp; Support</span>
  </div>
  <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div style="background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.1);padding:40px 48px;width:460px;max-width:100%;">
      ${isForgot ? `
        <span class="fp-back" id="fpBack">${ic('arrleft')} Back to sign in</span>
        <h2 style="font-size:24px;font-weight:700;margin:12px 0 6px;">Forgot password?</h2>
        <p style="color:#6b7280;font-size:13px;margin-bottom:22px;">Enter your email and we'll send a reset link.</p>
        <form id="authForm">
          <div class="form-group"><label>Email address</label><input name="email" type="email" placeholder="you@company.com" required /></div>
          <div id="msg" class="msg-area"></div>
          <button class="btn-cta">Send reset link</button>
        </form>` : `
        <h2 style="font-size:24px;font-weight:700;margin:0 0 6px;">Set new password</h2>
        <p style="color:#6b7280;font-size:13px;margin-bottom:22px;">Enter your new password below.</p>
        <form id="authForm">
          <input type="hidden" name="token" value="${resetToken}" />
          <div class="form-group"><label>New password</label><div class="pw-wrap"><input type="password" name="password" id="pwNew" placeholder="Min 8 characters" required /><button type="button" class="pw-eye" id="eyeNew">${ic('eye')}</button></div></div>
          <div class="form-group"><label>Confirm password</label><div class="pw-wrap"><input type="password" name="confirm" id="pwConfirm" placeholder="Repeat password" required /><button type="button" class="pw-eye" id="eyeConfirm">${ic('eye')}</button></div></div>
          <div id="msg" class="msg-area"></div>
          <button class="btn-cta">Reset password</button>
        </form>`}
    </div>
  </div>
  <div class="auth-footer">Powered by Avaali &nbsp;|&nbsp; © 2026, All Rights Reserved</div>
</div>`;
    // eye toggles for reset
    ['eyeNew', 'eyeConfirm'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => { const inp = btn.previousElementSibling; inp.type = inp.type === 'password' ? 'text' : 'password'; });
    });
    document.getElementById('fpBack')?.addEventListener('click', () => go('/login'));
    document.getElementById('authForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const msgEl = document.getElementById('msg');
      const btn = e.target.querySelector('button.btn-cta');
      const oldTxt = btn.textContent;
      msgEl.className = 'msg-area'; msgEl.textContent = '';
      btn.disabled = true; btn.textContent = 'Loading...';
      try {
        if (isForgot) {
          await api('/api/auth/forgot-password', 'POST', { email: f.email });
          msgEl.className = 'msg-area msg-success'; msgEl.textContent = 'If that email exists, a reset link has been sent.';
        } else {
          if (f.password !== f.confirm) throw new Error('Passwords do not match');
          if (f.password.length < 8) throw new Error('Password must be at least 8 characters');
          await api('/api/auth/reset-password', 'POST', { token: f.token, new_password: f.password });
          msgEl.className = 'msg-area msg-success'; msgEl.textContent = 'Password reset! Redirecting to login…';
          setTimeout(() => go('/login'), 1800);
        }
      } catch (err) {
        msgEl.className = 'msg-area msg-error'; msgEl.textContent = err.message;
      }
      btn.disabled = false; btn.textContent = oldTxt;
    });
    return;
  }

  // Sign in / Sign up — split layout matching screenshot
  const signupFields = isSignup ? `
    <div class="form-row">
      <div class="form-group"><label>First name</label><input name="first_name" placeholder="John" required /></div>
      <div class="form-group"><label>Last name</label><input name="last_name" placeholder="Doe" required /></div>
    </div>
    <div class="form-group"><label>Company name</label><input name="company_name" placeholder="Acme Corp" required /></div>` : '';

  app.innerHTML = `
<div class="auth-page">
  <div class="auth-topbar">
    <span></span>
    <span class="auth-help" style="cursor:pointer;" id="authHelpMain">${ic('headset')} Help &amp; Support</span>
  </div>
  <div class="auth-grid">
    <!-- Left pane -->
    <div class="auth-left-pane">
      <div class="auth-logo">${logoLarge()}</div>
      <div class="auth-headline"><span class="text-gradient">AI-powered process evaluation<br/>for your enterprise</span></div>
      <p class="auth-desc">Helps enterprises evaluate and prioritize business processes using AI-driven insights, risk analysis and intelligent decision making.</p>
      <ul class="feat-list">
        <li class="feat-item"><span class="feat-ic purple">${ic('layers')}</span>AI-Powered process evaluation</li>
        <li class="feat-item"><span class="feat-ic teal">${ic('clock')}</span>Automation &amp; augmentations readiness scoring</li>
        <li class="feat-item"><span class="feat-ic teal">${ic('lock')}</span>Enterprise-grade security &amp; compliance</li>
      </ul>
    </div>
    <!-- Right pane: floating card -->
    <div class="auth-right-pane">
      <div class="auth-card-wrap">
        <div class="auth-tabs">
          <button id="goLogin" class="${isSignup ? '' : 'on'}">Sign in</button>
          <button id="goSignup" class="${isSignup ? 'on' : ''}">Sign up</button>
        </div>
        <h3 class="auth-title">${isSignup ? 'Get started!' : 'Welcome back!'}</h3>
        <p class="auth-subtitle">${isSignup ? 'Create your Avagama.ai account' : 'Sign in with your Avagama.ai account'}</p>
        <form id="authForm">
          ${signupFields}
          <div class="form-group"><label>Email address</label><input name="email" type="email" placeholder="you@company.com" required /></div>
          <div class="form-group"><label>${isSignup ? 'Enter password' : 'Password'}</label><div class="pw-wrap"><input type="password" name="password" id="pwField" placeholder="••••••••" required /><button type="button" class="pw-eye" id="eyeToggle">${ic('eye')}</button></div></div>
          ${isSignup ? `<div class="form-group"><label>Re-enter password</label><div class="pw-wrap"><input type="password" name="confirm" placeholder="••••••••" required /></div></div>` : `<div class="forgot-link" id="forgotLink">Forget Password?</div>`}
          <div id="msg" class="msg-area"></div>
          <button class="btn-cta">${isSignup ? 'Create your workspace' : 'Access your workspace'}</button>
        </form>
      </div>
    </div>
  </div>
  <div class="auth-footer">Powered by Avaali &nbsp;|&nbsp; © 2026, All Rights Reserved</div>
</div>`;

  const pwField = document.getElementById('pwField');
  document.getElementById('eyeToggle')?.addEventListener('click', () => {
    pwField.type = pwField.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('goLogin')?.addEventListener('click', () => go('/login'));
  document.getElementById('goSignup')?.addEventListener('click', () => go('/signup'));
  document.getElementById('forgotLink')?.addEventListener('click', () => go('/forgot-password'));
  document.getElementById('authHelpMain')?.addEventListener('click', () => go('/support'));
  document.getElementById('authHelpForgot')?.addEventListener('click', () => go('/support'));

  document.getElementById('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const msgEl = document.getElementById('msg');
    const btn = e.target.querySelector('button.btn-cta');
    const oldTxt = btn.textContent;
    msgEl.className = 'msg-area'; msgEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Loading...';
    try {
      if (isSignup) {
        if (f.password !== f.confirm) throw new Error('Passwords do not match');
        await api('/api/auth/signup', 'POST', { first_name: f.first_name, last_name: f.last_name, company_name: f.company_name, email: f.email, password: f.password });
        msgEl.className = 'msg-area msg-success'; msgEl.textContent = 'Account created! Please check your email to verify your address.';
        setTimeout(() => go('/login'), 2500);
        return;
      }
      const data = await api('/api/auth/login', 'POST', { email: f.email, password: f.password });
      state.token = data.access_token; state.user = data.user;
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      go('/');
    } catch (err) {
      msgEl.className = 'msg-area msg-error'; msgEl.textContent = err.message;
      btn.disabled = false; btn.textContent = oldTxt;
    }
  });
}


/* ── Verify Email ── */
async function verifyEmailPage() {
  const token = new URLSearchParams(location.search).get('token');
  let msg = 'Missing verification token', ok = false;
  if (token) {
    try {
      const r = await api(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
      msg = r.message || 'Your email has been verified successfully. You can now access your workspace and start evaluating processes with AI.';
      ok = true;
    } catch (err) {
      msg = err.message || 'The verification link is invalid or has expired. Please try signing up again or contact support.';
    }
  }

  app.innerHTML = `
<div class="verify-page">
  <div class="verify-card fade-up">
    <div class="verify-icon-wrap ${ok ? 'success' : 'error'}">
      ${ok ? ic('check') : '❌'}
    </div>
    <h2>${ok ? 'Verification Successful!' : 'Verification Failed'}</h2>
    <p>${msg}</p>
    <button class="btn-cta" onclick="go('/login')" style="margin-top:0;">
      ${ok ? 'Access your workspace' : 'Back to login'}
    </button>
  </div>
  <div class="auth-footer" style="margin-top:24px;">Powered by Avaali &nbsp;|&nbsp; © 2026, All Rights Reserved</div>
</div>`;
}

/* ── Dashboard ── */
async function dashboard() {
  app.innerHTML = topNav('dash') + `<main class="page"><div class="spinner-page"><div class="spinner"></div></div></main>`;
  bindNav();
  // Fetch fresh user data and dashboard stats in parallel so greeting is accurate
  await Promise.all([
    fetchUserLimits(),
    (async () => {
      try {
        state.dashData = await api(`/api/dashboard?days=${state.dashDateRange}&shortlisted=${state.dashShortlisted}`);
      } catch {
        state.dashData = { total_evaluations: 0, evaluations_in_range: 0, average_automation_score: 0, charts: { evaluation_trend: [], technology_distribution: [] } };
      }
    })(),
  ]);
  renderDashboard();
}

async function refetchDashboard() {
  try {
    state.dashData = await api(`/api/dashboard?days=${state.dashDateRange}&shortlisted=${state.dashShortlisted}`);
  } catch { /* keep stale */ }
  renderDashboard();
}

// Named handler for deduplication — prevents stacking on dashboard re-renders
function _dashOutsideClick() {
  if (state.dashDiscOpen || state.dashDateOpen) {
    state.dashDiscOpen = false;
    state.dashDateOpen = false;
    const dateMenu = document.getElementById('dateMenu');
    const discMenu = document.getElementById('discToggle')?.closest('.disc-wrap')?.querySelector('.drop-menu');
    if (dateMenu) dateMenu.classList.remove('open');
    if (discMenu) discMenu.classList.remove('open');
  }
}

function renderDashboard() {
  const d = state.dashData || { total_evaluations: 0, average_automation_score: 0, charts: { evaluation_trend: [], technology_distribution: [] } };
  const greet = state.user?.first_name || state.user?.company_name || 'there';
  const dateLabel = `Last ${state.dashDateRange} days`;
  const inRange = d.evaluations_in_range ?? d.total_evaluations;

  // Dual-line SVG chart: evaluations completed + avg automation score per day
  const trendHtml = (() => {
    const pts = d.charts?.evaluation_trend || [];
    if (!pts.length) return `<div class="chart-empty">No evaluation data in the last ${state.dashDateRange} days</div>`;
    const W = 480, H = 150, PAD_L = 34, PAD_B = 24, PAD_T = 10, PAD_R = 34;
    const slice = pts;
    const maxC = Math.max(4, Math.ceil(Math.max(...slice.map(x => x.count), 1) / 4) * 4);
    const xs = slice.map((_, i) => PAD_L + (i / Math.max(slice.length - 1, 1)) * (W - PAD_L - PAD_R));
    const yC = v => PAD_T + (1 - v / maxC) * (H - PAD_T - PAD_B);
    const yA = v => PAD_T + (1 - v / 100) * (H - PAD_T - PAD_B);
    const linePath = (data, yFn) => data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${yFn(p).toFixed(1)}`).join(' ');
    const countPath = linePath(slice.map(x => x.count), yC);
    const scorePath = linePath(slice.map(x => x.avg_score || 0), yA);
    const gridPcts = [0, 25, 50, 75, 100];
    return `
    <div style="display:flex;gap:16px;margin-bottom:12px;font-size:11px;color:#6b7280;flex-wrap:wrap;justify-content:center;">
      <span><svg width="16" height="4" style="vertical-align:middle;margin-right:4px"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--teal)" stroke-dasharray="4 2"/></svg> Evaluations completed</span>
      <span><svg width="16" height="4" style="vertical-align:middle;margin-right:4px"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--purple)"/></svg> Avg. automation score</span>
    </div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible">
      ${gridPcts.map(v => `
      <line x1="${PAD_L}" y1="${yA(v).toFixed(1)}" x2="${W - PAD_R}" y2="${yA(v).toFixed(1)}" stroke="#e5e7eb" stroke-dasharray="4 4" stroke-width="1"/>
      <text x="${PAD_L - 8}" y="${(yA(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#9ca3af">${Math.round(v * maxC / 100)}</text>
      <text x="${W - PAD_R + 8}" y="${(yA(v) + 3).toFixed(1)}" text-anchor="start" font-size="9" fill="#9ca3af">${v}%</text>`).join('')}
      ${slice.map((p, i, arr) => (i === 0 || i === arr.length - 1 || i % Math.max(1, Math.ceil(arr.length / 5)) === 0) ? `<line x1="${xs[i].toFixed(1)}" y1="${PAD_T}" x2="${xs[i].toFixed(1)}" y2="${H - PAD_B}" stroke="#e5e7eb" stroke-dasharray="4 4" stroke-width="1"/>` : '').join('')}
      <path d="${scorePath}" fill="none" stroke="var(--purple)" stroke-width="1.5"/>
      ${slice.map((p, i) => `<circle cx="${xs[i].toFixed(1)}" cy="${yA(p.avg_score || 0).toFixed(1)}" r="3" fill="#fff" stroke="var(--purple)" stroke-width="1.5"><title>${p.date}: Avg score ${p.avg_score || 0}%</title></circle>`)}
      <path d="${countPath}" fill="none" stroke="var(--teal)" stroke-width="1.5" stroke-dasharray="4 2"/>
      ${slice.map((p, i) => `<circle cx="${xs[i].toFixed(1)}" cy="${yC(p.count).toFixed(1)}" r="3" fill="#fff" stroke="var(--teal)" stroke-width="1.5"><title>${p.date}: ${p.count} evaluation${p.count !== 1 ? 's' : ''}</title></circle>`)}
      ${slice.map((p, i, arr) => i === 0 || i === arr.length - 1 || i % Math.max(1, Math.ceil(arr.length / 5)) === 0
      ? `<text x="${xs[i].toFixed(1)}" y="${(H - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#9ca3af">${new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>` : '').join('')}
    </svg>`;
  })();

  // Horizontal bar chart with hover tooltips
  const distHtml = (() => {
    const rows = d.charts?.technology_distribution || [];
    if (!rows.length) return `<div class="chart-empty">No AI fitment data</div>`;
    const sorted = [...rows].slice(0, 8);
    const maxVal = Math.max(10, Math.ceil(Math.max(...sorted.map(x => x.count), 1) / 10) * 10);
    const barColors = ['#9b51a5', '#9b51a5', '#b896c2', '#5bbdb8', '#5bbdb8', '#5bbdb8', '#7ececa', '#7ececa'];
    const W = 480, H = 150, PAD_L = 140, PAD_B = 24, PAD_T = 10, PAD_R = 10;

    // Calculate ticks for X-axis natively mapping to intervals of 5
    const tickStep = 5;
    const maxValCeiled = Math.ceil(maxVal / 5) * 5;
    const ticks = Array.from({ length: Math.floor(maxValCeiled / tickStep) + 1 }, (_, i) => i * tickStep);
    const getX = v => PAD_L + (v / Math.max(10, maxValCeiled)) * (W - PAD_L - PAD_R);

    return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible">
      <!-- Grid lines & Ticks -->
      ${ticks.map(v => `
      <line x1="${getX(v).toFixed(1)}" y1="${PAD_T}" x2="${getX(v).toFixed(1)}" y2="${H - PAD_B + 4}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${getX(v).toFixed(1)}" y="${(H - PAD_B + 16).toFixed(1)}" text-anchor="middle" font-size="9" fill="#9ca3af">${v}</text>
      `).join('')}
      
      <!-- Bars -->
      ${sorted.map((x, i) => {
      const barH = 12;
      const totalGap = (H - PAD_T - PAD_B) - (sorted.length * barH);
      const gap = sorted.length > 1 ? totalGap / (sorted.length - 1) : 0;
      const y = PAD_T + i * (barH + gap);
      const bw = Math.max(2, getX(x.count) - PAD_L);
      return `
        <text x="${PAD_L - 8}" y="${(y + barH / 2 + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#6b7280">${x.technology}</text>
        <rect x="${PAD_L}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${barH}" fill="${barColors[i] || '#9b51a5'}">
          <title>${x.technology}: ${x.count} evaluation${x.count !== 1 ? 's' : ''}</title>
        </rect>
        `;
    }).join('')}
    </svg>`;
  })();

  app.innerHTML = topNav('dash') + `
<main class="page fade-up">
  <div class="ph">
    <h1>Dashboard</h1>
    <div style="position:relative;">
      <button class="date-btn" id="dateBtn">${ic('calendar')} ${dateLabel} &#x25BE;</button>
      <div class="drop-menu${state.dashDateOpen ? ' open' : ''}" style="right:0;min-width:140px;" id="dateMenu">
        <button data-days="30" class="${state.dashDateRange === 30 ? 'active' : ''}">Last 30 days</button>
        <button data-days="60" class="${state.dashDateRange === 60 ? 'active' : ''}">Last 60 days</button>
        <button data-days="90" class="${state.dashDateRange === 90 ? 'active' : ''}">Last 90 days</button>
      </div>
    </div>
  </div>
  <div class="welcome-card">
    <h2>Hi <span class="hl">${greet}</span>, welcome to Avagama.ai!</h2>
    <p>Discover automation opportunities, evaluate business processes, and unlock AI-powered automation for your enterprise.</p>
    <div class="welcome-btns">
      <button class="btn btn-primary" id="startEval">+ Start new evaluation</button>
      <div class="disc-wrap">
        <button class="btn btn-outline" id="discToggle">Discover AI use cases &#x25BE;</button>
        <div class="drop-menu${state.dashDiscOpen ? ' open' : ''}">
          <button id="ddDomain">Domain Focus</button>
          <button id="ddCompany">Company Focus</button>
        </div>
      </div>
    </div>
  </div>
  <div class="stat-grid">
    <div class="card stat-card" style="cursor:pointer;" onclick="go('/my-evaluations')"><div class="sc-header"><span class="sc-label">Evaluations completed</span><span class="sc-icon purple">${ic('doc')}</span></div><div class="sc-num">${d.total_evaluations}</div><div class="sc-sub">Last ${state.dashDateRange} days: ${inRange}</div></div>
    <div class="card stat-card"><div class="sc-header"><span class="sc-label">Avg automation score</span><span class="sc-icon teal">${ic('bar')}</span></div><div class="sc-num">${d.average_automation_score}%</div><div class="sc-sub">In last ${state.dashDateRange} days</div></div>
    <div class="card stat-card" style="cursor:pointer;" onclick="go('/use-cases/domain')"><div class="sc-header"><span class="sc-label">AI use cases &#x2013; Domain</span><span class="sc-icon teal">${ic('target')}</span></div><div class="sc-num">${d.total_domain_use_cases ?? 0}</div></div>
    <div class="card stat-card" style="cursor:pointer;" onclick="go('/use-cases/company')"><div class="sc-header"><span class="sc-label">AI use cases &#x2013; Company</span><span class="sc-icon purple">${ic('grid')}</span></div><div class="sc-num">${d.total_company_use_cases ?? 0}</div></div>
  </div>
  <div class="chart-grid">
    <div class="card chart-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:15px;font-weight:600;color:#111827">Evaluation trends</h3>
        <label class="ui-toggle"><input type="checkbox" class="dash-short-toggle" ${state.dashShortlisted ? 'checked' : ''}><span class="ui-tslider"></span> <span class="ui-tlabel">View shortlisted evaluations</span></label>
      </div>
      ${trendHtml}
    </div>
    <div class="card chart-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;font-size:15px;font-weight:600;color:#111827">Technology distribution</h3>
        <label class="ui-toggle"><input type="checkbox" class="dash-short-toggle" ${state.dashShortlisted ? 'checked' : ''}><span class="ui-tslider"></span> <span class="ui-tlabel">View shortlisted evaluations</span></label>
      </div>
      ${distHtml}
    </div>
  </div>
</main>`;
  bindNav();
  document.getElementById('startEval').onclick = () => go('/evaluate');
  document.getElementById('discToggle').onclick = e => {
    e.stopPropagation();
    state.dashDiscOpen = !state.dashDiscOpen;
    state.dashDateOpen = false;
    // Toggle in-place instead of renderDashboard()
    const discMenu = document.getElementById('discToggle')?.closest('.disc-wrap')?.querySelector('.drop-menu');
    const dateMenu = document.getElementById('dateMenu');
    if (discMenu) discMenu.classList.toggle('open', state.dashDiscOpen);
    if (dateMenu) dateMenu.classList.remove('open');
  };
  document.getElementById('ddDomain').onclick = () => { state.dashDiscOpen = false; go('/use-cases/domain'); };
  document.getElementById('ddCompany').onclick = () => { state.dashDiscOpen = false; go('/use-cases/company'); };
  document.getElementById('dateBtn').onclick = e => {
    e.stopPropagation();
    state.dashDateOpen = !state.dashDateOpen;
    state.dashDiscOpen = false;
    // Toggle in-place instead of renderDashboard()
    const dateMenu = document.getElementById('dateMenu');
    const discMenu = document.getElementById('discToggle')?.closest('.disc-wrap')?.querySelector('.drop-menu');
    if (dateMenu) dateMenu.classList.toggle('open', state.dashDateOpen);
    if (discMenu) discMenu.classList.remove('open');
  };
  document.querySelectorAll('#dateMenu button[data-days]').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.dashDateRange = Number(btn.dataset.days);
      state.dashDateOpen = false;
      // Close dropdown and update label in-place
      const dateMenu = document.getElementById('dateMenu');
      if (dateMenu) dateMenu.classList.remove('open');
      const dateBtn = document.getElementById('dateBtn');
      if (dateBtn) dateBtn.innerHTML = `${ic('calendar')} Last ${state.dashDateRange} days &#x25BE;`;
      // Mark active item
      document.querySelectorAll('#dateMenu button[data-days]').forEach(b => b.classList.toggle('active', Number(b.dataset.days) === state.dashDateRange));
      // Smooth fade on content while loading
      const mainEl = document.querySelector('main.page');
      if (mainEl) { mainEl.style.transition = 'opacity 0.2s'; mainEl.style.opacity = '0.5'; }
      try { state.dashData = await api(`/api/dashboard?days=${state.dashDateRange}`); } catch { /* keep stale */ }
      state.dashLoading = false;
      renderDashboard();
      // Remove fade-up so it doesn't replay animation
      const newMain = document.querySelector('main.page');
      if (newMain) { newMain.classList.remove('fade-up'); newMain.style.opacity = '1'; }
    });
  });
  document.querySelectorAll('.dash-short-toggle').forEach(t => {
    t.onchange = async (e) => {
      state.dashShortlisted = e.target.checked;
      const mainEl = document.querySelector('main.page');
      if (mainEl) { mainEl.style.transition = 'opacity 0.2s'; mainEl.style.opacity = '0.5'; }
      try { state.dashData = await api(`/api/dashboard?days=${state.dashDateRange}&shortlisted=${state.dashShortlisted}`); } catch { }
      state.dashLoading = false;
      renderDashboard();
      const newMain = document.querySelector('main.page');
      if (newMain) { newMain.classList.remove('fade-up'); newMain.style.opacity = '1'; }
    };
  });
  document.removeEventListener('click', _dashOutsideClick);
  document.addEventListener('click', _dashOutsideClick);
}



/* ── Evaluate Form ── */

async function evaluateForm(draftId = null) {
  let draftDoc = null;
  if (draftId) {
    try {
      draftDoc = await api(`/api/evaluations/${draftId}`);
    } catch (e) { console.error('Failed to load draft', e); }
  }

  const limit = state.user?.evaluation_limit ?? 20;
  const count = state.user?.evaluation_count ?? 0;
  const rem = Math.max(0, limit - count);
  app.innerHTML = topNav('evals') + `
<main class="page fade-up">
  <div class="eval-header">
    <div class="eval-title-row">
      <button class="back-btn" id="evalBack">${ic('arrleft')}</button>
      <h1>Evaluate a process</h1>
      <span class="token-badge"><span class="star">✦</span> ${rem} / ${limit} evaluations remaining</span>
    </div>
    <div class="eval-actions">
      <button class="btn-ghost" id="draftBtn">${ic('save')} Save as draft</button>
      <button class="btn-submit" id="submitBtn">${ic('send')} Submit details</button>
    </div>
  </div>
  <div class="eval-form">
    <div class="fgroup">
      <label>Process name</label>
      <input id="f_name" placeholder="Enter a clear, descriptive name for the process you want to evaluate" />
    </div>
    <div class="fgroup">
      <label>Process description</label>
      <textarea id="f_desc" placeholder="Describe the process in detail including what it does, key steps, stakeholders involved, current challenges…" style="min-height:110px"></textarea>
    </div>
    <div class="fgroup">
      <label>SOP document upload <span class="flabel-sub">(Optional)</span></label>
      <div class="upload-zone" id="uploadZone">
        <div class="up-icon">${ic('upload')}</div>
        <div class="up-title">Click to upload or drag and drop</div>
        <div class="up-hint">PDF or TXT up to 10 MB</div>
      </div>
      <input type="file" id="fileInput" style="display:none" accept=".pdf,.txt" />
    </div>
    <div class="f3">
      <div class="fgroup">
        <label>Process volume <span class="flabel-sub">(txns/month)</span></label>
        <input id="f_vol" placeholder="e.g. 5000" />
      </div>
      <div class="fgroup">
        <label>Process frequency</label>
        <div class="cselect-wrap" id="freqWrap">
          <button type="button" class="cselect-btn" id="f_freq_btn"><span>Select frequency…</span> <span class="cselect-arrow">▾</span></button>
          <input type="hidden" id="f_freq" value="" />
          <div class="cselect-menu" id="f_freq_menu">
            <div class="cselect-opt" data-val="Daily">Daily</div>
            <div class="cselect-opt" data-val="Weekly">Weekly</div>
            <div class="cselect-opt" data-val="Monthly">Monthly</div>
            <div class="cselect-opt" data-val="Quarterly">Quarterly</div>
            <div class="cselect-opt" data-val="Ad-hoc">Ad-hoc</div>
          </div>
        </div>
      </div>
      <div class="fgroup">
        <label>Exception rate <span class="flabel-sub">ⓘ</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="f_exc" min="0" max="100" value="15" />
            <span class="slider-val" id="f_exc_v">15%</span>
          </div>
          <div class="slider-hints"><span>0%</span><span>100%</span></div>
        </div>
      </div>
    </div>
    <div class="f3">
      <div class="fgroup">
        <label>Process complexity <span class="flabel-sub">ⓘ</span></label>
        <div class="slider-group">
          <div class="slider-row">
            <input type="range" id="f_cplx" min="0" max="10" value="3" />
            <span class="slider-val" id="f_cplx_v">3</span>
          </div>
          <div class="slider-hints"><span>Low 0</span><span>10 High</span></div>
        </div>
      </div>
      <div class="fgroup">
        <label>Risk tolerance</label>
        <div class="cselect-wrap" id="riskWrap">
          <button type="button" class="cselect-btn" id="f_risk_btn"><span>Select risk level…</span> <span class="cselect-arrow">▾</span></button>
          <input type="hidden" id="f_risk" value="" />
          <div class="cselect-menu" id="f_risk_menu">
            <div class="cselect-opt" data-val="Low">Low – minimal risk acceptable</div>
            <div class="cselect-opt" data-val="Medium">Medium – moderate risk acceptable</div>
            <div class="cselect-opt" data-val="High">High – risk-tolerant</div>
          </div>
        </div>
      </div>
      <div class="fgroup">
        <label>Compliance sensitivity</label>
        <input id="f_comp" placeholder="e.g., GDPR, SOX, HIPAA or None" />
      </div>
    </div>
    <div class="fgroup">
      <label>Decision points</label>
      <textarea id="f_dec" placeholder="Describe decision points where human judgment or AI is required…"></textarea>
    </div>
  </div>
</main>

  <!-- Confirm modal (outside main to avoid fade-up animation) -->
  <div class="modal-overlay hidden" id="confirmModal">
    <div class="modal-box">
      <div class="m-icon-wrap">${ic('check')}</div>
      <h3>Confirm Submission</h3>
      <p>Are you sure you want to submit this evaluation?<br>Once submitted, the process will be evaluated and results will be generated.</p>
      <div class="modal-btns">
        <button class="mbtn-cancel" id="cancelBtn">Cancel</button>
        <button class="mbtn-confirm" id="confirmBtn">Confirm</button>
      </div>
    </div>
  </div>`;

  bindNav();
  document.getElementById('evalBack').onclick = () => history.back();
  const exc = document.getElementById('f_exc'), excV = document.getElementById('f_exc_v');
  exc.oninput = () => excV.textContent = exc.value + '%';
  const cplx = document.getElementById('f_cplx'), cplxV = document.getElementById('f_cplx_v');
  cplx.oninput = () => cplxV.textContent = cplx.value;
  document.getElementById('uploadZone').onclick = () => document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange = e => {
    const f = e.target.files[0];
    if (f) document.querySelector('.up-title').textContent = `📎 ${f.name}`;
  };

  // Custom dropdown wiring
  document.querySelectorAll('.cselect-wrap').forEach(wrap => {
    const btn = wrap.querySelector('.cselect-btn');
    const menu = wrap.querySelector('.cselect-menu');
    const hidden = wrap.querySelector('input[type=hidden]');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      // Close other custom selects
      document.querySelectorAll('.cselect-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
      menu.classList.toggle('open');
    });
    wrap.querySelectorAll('.cselect-opt').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        hidden.value = opt.dataset.val;
        btn.querySelector('span:first-child').textContent = opt.textContent;
        btn.classList.add('selected');
        menu.classList.remove('open');
      });
    });
  });
  // Close custom selects on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.cselect-menu.open').forEach(m => m.classList.remove('open'));
  });

  // Pre-fill from draft
  if (draftDoc && draftDoc.submitted_payload) {
    const p = draftDoc.submitted_payload;
    document.getElementById('f_name').value = p.process_name || '';
    document.getElementById('f_desc').value = p.description || '';
    document.getElementById('f_vol').value = p.volume || '';
    if (p.frequency) {
      document.getElementById('f_freq').value = p.frequency;
      document.getElementById('f_freq_btn').querySelector('span:first-child').textContent = p.frequency;
      document.getElementById('f_freq_btn').classList.add('selected');
    }
    document.getElementById('f_exc').value = p.exception_rate || 0;
    document.getElementById('f_exc_v').textContent = (p.exception_rate || 0) + '%';
    document.getElementById('f_cplx').value = p.complexity || 0;
    document.getElementById('f_cplx_v').textContent = p.complexity || 0;
    if (p.risk_tolerance) {
      document.getElementById('f_risk').value = p.risk_tolerance;
      document.getElementById('f_risk_btn').querySelector('span:first-child').textContent = p.risk_tolerance;
      document.getElementById('f_risk_btn').classList.add('selected');
    }
    document.getElementById('f_comp').value = p.compliance_sensitivity || '';
    document.getElementById('f_dec').value = p.decision_points || '';
    if (p.sop_metadata) {
      document.querySelector('.up-title').textContent = `📎 ${p.sop_metadata.filename}`;
    }
  }

  const getFormData = () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0] || null;
    const formData = new FormData();
    formData.append('process_name', document.getElementById('f_name').value.trim());
    formData.append('description', document.getElementById('f_desc').value.trim());
    formData.append('volume', document.getElementById('f_vol').value.trim());
    formData.append('frequency', document.getElementById('f_freq').value);
    formData.append('exception_rate', document.getElementById('f_exc').value);
    formData.append('complexity', document.getElementById('f_cplx').value);
    formData.append('risk_tolerance', document.getElementById('f_risk').value);
    formData.append('compliance_sensitivity', document.getElementById('f_comp').value.trim());
    formData.append('decision_points', document.getElementById('f_dec').value.trim());
    if (file) formData.append('sop_file', file);
    return formData;
  };

  document.getElementById('draftBtn').onclick = () => {
    const formData = getFormData();
    if (!formData.get('process_name')) { alert('Please enter a process name to save draft'); return; }
    submitEvalForm(formData, true, draftId);
  };

  document.getElementById('submitBtn').onclick = () => document.getElementById('confirmModal').classList.remove('hidden');
  document.getElementById('cancelBtn').onclick = () => document.getElementById('confirmModal').classList.add('hidden');
  document.getElementById('confirmBtn').onclick = async () => {
    document.getElementById('confirmModal').classList.add('hidden');
    const formData = getFormData();
    if (!formData.get('process_name')) { alert('Please enter a process name'); return; }
    await submitEvalForm(formData, false, draftId);
  };
}

/* ── Evaluating (Loading) Screen – sequential icon highlight ── */
function evaluatingScreen() {
  const dims = [
    { label: 'Decision\nintensity', icon: 'flow', top: '10%', left: '50%' },
    { label: 'Process\nvolume', icon: 'doc', top: '18%', left: '74%' },
    { label: 'Data\nstructure', icon: 'layers', top: '38%', left: '88%' },
    { label: 'Process\nfrequency', icon: 'clock', top: '62%', left: '88%' },
    { label: 'Context\nawareness', icon: 'scan', top: '82%', left: '74%' },
    { label: 'Exception\nhandling', icon: 'alert', top: '90%', left: '50%' },
    { label: 'Risk\ntolerance', icon: 'shield', top: '82%', left: '26%' },
    { label: 'Compliance\nsensitivity', icon: 'lock', top: '62%', left: '12%' },
    { label: 'Knowledge\nintensity', icon: 'brain', top: '38%', left: '12%' },
    { label: 'Orchestration\ncomplexity', icon: 'target', top: '18%', left: '26%' },
  ];
  app.innerHTML = topNav('evals') + `
<main class="page fade-up">
  <div class="ph"><h1><button class="back-btn" onclick="go('/evaluate')">${ic('arrleft')}</button> Evaluating..</h1></div>
  <div class="card">
    <div class="evaling-page">
      <h2>Evaluating your process..</h2>
      <p class="sub" id="evalDimLabel">Analysing across 10 key dimensions&hellip;</p>
      <div class="dim-ring">
        ${dims.map((d, i) => `
        <div class="dim-node" id="dnode${i}" style="top:${d.top};left:${d.left}">
          <div class="dim-ic" id="dic${i}">${ic(d.icon)}</div>
          <span>${d.label.replace(/\n/g, '<br>')}</span>
        </div>`).join('')}
        <div class="dim-center">
          <div class="spinner"></div>
          <span>AI Processing</span>
        </div>
      </div>
    </div>
  </div>
</main>`;
  bindNav();

  // Sequential icon highlight: cycle through one at a time
  let cur = 0;
  const labels = dims.map(d => d.label.replace(/\n/g, ' '));
  const interval = setInterval(() => {
    dims.forEach((_, i) => {
      const ic = document.getElementById(`dic${i}`);
      const nd = document.getElementById(`dnode${i}`);
      if (!ic) return;
      if (i === cur) { ic.classList.add('active'); nd.classList.add('active'); }
      else { ic.classList.remove('active'); nd.classList.remove('active'); }
    });
    const lbl = document.getElementById('evalDimLabel');
    if (lbl) lbl.textContent = `Analysing: ${labels[cur]}`;
    cur = (cur + 1) % dims.length;
  }, 900);
  // Store interval so submitEval can clear it if page changes
  window._evalInterval = interval;
}

async function submitEvalForm(formData, isDraft = false, evaluationId = null) {
  if (!isDraft) go('/evaluating');
  try {
    if (isDraft) formData.append('is_draft', 'true');
    if (evaluationId) formData.append('evaluation_id', evaluationId);

    const res = await fetch(`${API_URL}/api/evaluations`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` },
      body: formData,
    });
    if (!res.ok) { const err = await res.text(); throw new Error(err); }
    const data = await res.json();

    if (isDraft) {
      alert('Draft saved successfully!');
      go('/my-evaluations');
      return;
    }

    if (window._evalInterval) { clearInterval(window._evalInterval); window._evalInterval = null; }
    go(`/results/${data.id}`);
  } catch (err) {
    if (window._evalInterval) { clearInterval(window._evalInterval); window._evalInterval = null; }
    app.innerHTML = topNav('evals') + `<main class="page"><div class="empty-wrap">
      <p style="color:#dc2626;font-size:15px;margin-bottom:8px">&#x26A0; Evaluation failed</p>
      <p style="color:#6b7280;font-size:13px;margin-bottom:20px">${err.message}</p>
      <button class="btn btn-primary" onclick="go('/evaluate')">Try again</button>
      <button class="btn btn-outline" style="margin-left:8px" onclick="go('/my-evaluations')">My Evaluations</button>
    </div></main>`;
    bindNav();
  }
}

/* ── Results Page ── */
function scoreNum(v) {
  const n = Number(String(v ?? '').replace('%', ''));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}
function dotClass(n) { return n >= 80 ? 'g' : n >= 50 ? 'o' : 'r'; }
function barClass(v) {
  const s = String(v || '').toLowerCase();
  if (['high', 'unstructured', 'complex'].some(x => s.includes(x))) return 'red';
  if (['medium', 'moderate'].some(x => s.includes(x))) return 'orange';
  return 'green';
}
function barW(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('high') || s.includes('unstructured')) return '85%';
  if (s.includes('medium') || s.includes('moderate')) return '55%';
  if (s.includes('low')) return '25%';
  const n = Number(v); if (Number.isFinite(n)) return `${Math.min(100, n)}%`;
  return '40%';
}
function donut(pct) {
  const r = 34, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return `<div class="donut-wrap"><svg viewBox="0 0 80 80"><circle class="dtrack" cx="40" cy="40" r="${r}"/><circle class="dfill" cx="40" cy="40" r="${r}" stroke-dasharray="${dash} ${circ}"/></svg><div class="dlabel">${pct}%</div></div>`;
}
function llmLabel(v) {
  if (!v) return '-';
  return { 'large_LLM': 'Large LLM', 'small_LLM': 'Small LLM' }[v] || v;
}

async function resultsPage(id) {
  app.innerHTML = topNav('evals') + `<main class="page"><div class="spinner-page"><div class="spinner"></div></div></main>`;
  bindNav();
  let doc;
  try { doc = await api(`/api/evaluations/${id}`); } catch { app.innerHTML = topNav('evals') + `<main class="page"><div class="empty-wrap"><p>Could not load results.</p><button class="btn btn-primary" onclick="go('/my-evaluations')">Back</button></div></main>`; bindNav(); return; }

  const data = (doc.parsed_content && typeof doc.parsed_content === 'object') ? doc.parsed_content : null;
  if (!data) { app.innerHTML = topNav('evals') + `<main class="page"><div class="empty-wrap"><p>Results not yet available. Please check back shortly.</p><button class="btn btn-primary" onclick="go('/my-evaluations')">My Evaluations</button></div></main>`; bindNav(); return; }

  const autoScore = scoreNum(data.automation_feasibility_score);
  const feasScore = scoreNum(data.business_benefit_score?.score ?? data.business_benefit_score ?? data.feasibility_score);
  const fitment = data.fitment || data.fitment_recommendation || '-';
  const recs = data.recommendations || {};
  const dims = data.dimensions || data.process_characteristics || {};
  const llmRec = llmLabel(recs.llm_recommendation || data.llm_recommendation);
  // Only use Mistral-provided reasons, no hardcoded fallbacks
  const fitReason = data.fitment_reason || recs.fitment_reason || '';
  const llmReason = data.llm_reason || recs.llm_reason || '';
  // Dynamic score labels
  const autoLabel = autoScore >= 70 ? 'High automation potential' : autoScore >= 40 ? 'Medium automation potential' : 'Low automation potential';
  const feasLabel = feasScore >= 70 ? 'Easy integration effort' : feasScore >= 40 ? 'Moderate integration effort' : 'Difficult integration effort';
  // Notes from Mistral
  const notes = data.notes || data.additional_notes || recs.notes || recs.additional_notes || '';
  const isShortlisted = doc.is_shortlisted || false;

  app.innerHTML = topNav('evals') + `
<main class="page fade-up">
  <div class="ph" style="display:flex; justify-content:space-between; align-items:center;">
    <h1 style="margin:0"><button class="back-btn" onclick="go('/my-evaluations')">${ic('arrleft')}</button> Evaluation results: ${doc.process_name}</h1>
    <button class="btn btn-outline" id="resShortlistBtn" data-status="${isShortlisted}" style="margin-left: 16px;">
        ${isShortlisted ? '<span style="color:var(--orange)">&#9733;</span> Shortlisted' : '<span style="color:#9ca3af">&#9734;</span> Shortlist'}
    </button>
  </div>
  <div class="res-summary">
    <div class="score-card purple">
      <h5>Automation score</h5>
      ${donut(autoScore)}
      <div class="score-sub">${autoLabel}</div>
    </div>
    <div class="score-card lilac">
      <h5>Feasibility score</h5>
      ${donut(feasScore)}
      <div class="score-sub">${feasLabel}</div>
    </div>
    <div class="fitm-card aqua">
      <h5>Fitment recommendation</h5>
      <div class="fitm-pill">${fitment}</div>
      ${fitReason ? `<div class="fitm-reason">${fitReason}</div>` : ''}
    </div>
    <div class="fitm-card mint">
      <h5>LLM recommendation</h5>
      <div class="fitm-pill">${llmRec}</div>
      ${llmReason ? `<div class="fitm-reason">${llmReason}</div>` : ''}
    </div>
  </div>
  <div class="sec-title">Process Dimensions</div>
  <div class="dim-cards">
    ${Object.entries(dims).map(([k, v]) => {
    let scoreVal = v.score !== undefined && v.score !== null ? v.score : '';
    let weightVal = v.weight !== undefined && v.weight !== null ? v.weight : '';
    let justification = v.justification || v.reason || v.rationale || v.details || '';
    let valDisplay = v.value || v.level || v.rating || '-';

    let bWidth = '0%';
    let bColor = 'red';

    if (scoreVal !== '') {
      let sNum = Number(scoreVal) / 10;
      let wNum = Number(weightVal) / 10;
      let pct = 0;
      if (!isNaN(sNum) && !isNaN(wNum) && wNum !== 0) {
        pct = (sNum / wNum) * 100;
      } else if (!isNaN(sNum)) {
        pct = sNum <= 10 ? sNum * 10 : sNum;
      }
      scoreVal = sNum;
      weightVal = wNum;

      if (pct > 0) {
        bWidth = `${Math.min(100, Math.round(pct))}%`;
        bColor = pct >= 70 ? 'green' : pct >= 40 ? 'orange' : 'red';
      }
      if (valDisplay === '-') {
        valDisplay = String(sNum);
      }
    }

    let badges = '';
    if (weightVal !== '') badges += `<span class="ucv-w-badge">Weight: ${weightVal}</span>`;
    if (scoreVal !== '') badges += `<span class="ucv-s-badge">Score: ${scoreVal}</span>`;

    return `
    <div class="dim-card tooltip-container">
      <div class="dl" style="display:flex; justify-content:space-between; align-items:center;">
        <span>${k.replace(/_/g, ' ')}</span>
        <div class="ucv-param-scores" style="display:flex; gap:6px;">${badges}</div>
      </div>
      <div class="dv">${valDisplay}</div>
      <div class="dim-bar"><i class="${bColor}" style="width:${bWidth}"></i></div>
      ${justification ? `<div class="ucv-tooltip-hover">${justification}</div>` : ''}
    </div>`;
  }).join('')}
  </div>
  <div class="sec-title">Recommendations</div>
  <div class="rec-grid">
    <div class="card rec-card"><h4>Top point solutions</h4>${(recs.top_point_solutions || []).map(s => `<div class="rec-pill">${s}</div>`).join('') || '<div class="rec-pill" style="color:#9ca3af">No data</div>'}</div>
    <div class="card rec-card"><h4>Top language models</h4>${(recs.top_models || recs.recommended_models || []).map(m => `<div class="rec-pill">${m}</div>`).join('') || '<div class="rec-pill" style="color:#9ca3af">No data</div>'}</div>
  </div>
  ${notes ? `<div class="sec-title">Additional Notes</div><div class="card" style="padding:18px 22px;font-size:13px;line-height:1.7;color:#374151">${notes}</div>` : ''}
</main>`;
  bindNav();

  document.getElementById('resShortlistBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const currentStatus = btn.dataset.status === 'true';
    if (currentStatus) {
      alert('This evaluation is already shortlisted.');
      return;
    }
    try {
      await api('/api/evaluations/shortlist', 'PUT', { evaluation_ids: [id], shortlist_status: true });
      btn.dataset.status = 'true';
      btn.innerHTML = '<span style="color:var(--orange)">&#9733;</span> Shortlisted';
    } catch (err) { alert('Failed to change shortlist status: ' + err.message); }
  });
}

function exportXLSX(rows, filename, customCols = null, customHeaders = null) {
  if (!rows || !rows.length) {
    alert('No data to export.');
    return;
  }
  const cols = customCols || ['process_name', 'created_at', 'automation_score', 'feasibility_score', 'fitment', 'llm_type', 'status'];
  const headers = customHeaders || ['Process Name', 'Created On', 'Automation Score', 'Feasibility Score', 'Fitment', 'LLM Type', 'Status'];

  const cell = (v, col) => {
    try {
      if (col === 'created_at' && v) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB');
      }
      if ((col === 'automation_score' || col === 'feasibility_score') && v != null) {
        if (typeof v === 'object') v = v.score ?? v.value ?? JSON.stringify(v);
        return v + '%';
      }
      if (col === 'llm_type' && v) return typeof llmLabel === 'function' ? llmLabel(v) : v;
      return v ?? '';
    } catch (e) {
      console.warn('Cell format error', e);
      return v ?? '';
    }
  };

  try {
    const data = [headers];
    rows.forEach(r => {
      data.push(cols.map(c => cell(r[c], c)));
    });

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, (filename || 'export') + '.xlsx');
    } else {
      console.error('XLSX library not found');
      alert("Export library is not loaded. Please check your internet connection and refresh the page.");
    }
  } catch (err) {
    console.error('Export failed', err);
    alert('Export failed: ' + err.message);
  }
}

/* ── My Evaluations ── */
async function evaluationsPage() {
  app.innerHTML = topNav('evals') + `<main class="page"><div class="spinner-page"><div class="spinner"></div></div></main>`;
  bindNav();
  let rows = [];
  try { rows = await api('/api/evaluations'); } catch { }

  // Pagination state
  if (!state.evalPage) state.evalPage = 1;
  if (!state.evalPerPage) state.evalPerPage = 10;

  // Close any portal menu on re-render
  document.getElementById('_portalMenu')?.remove();

  function renderEvalPage() {
    document.getElementById('_portalMenu')?.remove();
    const filtered = state.evalFilter === 'shortlisted' ? rows.filter(r => r.is_shortlisted) : rows;
    const selCount = state.selectedIds.size;
    const total = filtered.length;
    const perPage = state.evalPerPage;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    state.evalPage = Math.min(state.evalPage, totalPages);
    const startIdx = (state.evalPage - 1) * perPage;
    const pageRows = filtered.slice(startIdx, startIdx + perPage);
    const allSelected = pageRows.length > 0 && pageRows.every(r => state.selectedIds.has(r.id));

    const tableBody = (() => {
      if (!filtered.length) return `<tr><td colspan="9" style="text-align:center;padding:36px;color:#9ca3af">No evaluations yet. <button class="btn btn-primary btn-sm" onclick="go('/evaluate')" style="margin-left:10px;padding:5px 12px;font-size:12px">+ New evaluation</button></td></tr>`;
      return pageRows.map(r => {
        const an = scoreNum(r.automation_score);
        const fn = scoreNum(r.feasibility_score);
        const chk = state.selectedIds.has(r.id);
        const dt = r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '-';
        const status = (r.status || 'completed').toLowerCase();
        const statusLabel = status === 'draft' ? 'Draft' : status === 'shortlisted' ? 'Shortlisted' : 'Completed';
        return `<tr data-id="${r.id}">
          ${state.evalFilter === 'all' ? `<td onclick="event.stopPropagation()"><input type="checkbox" ${chk ? 'checked' : ''} class="sel-cb" data-id="${r.id}" /></td>` : ''}
          <td><span class="proc-link" title="${r.process_name || ''}">${r.process_name || '-'}</span></td>
          <td>${dt}</td>
          <td>${r.automation_score != null ? `<span class="sdot ${dotClass(an)}">${an}%</span>` : '<span style="color:#9ca3af">-</span>'}</td>
          <td>${r.feasibility_score != null ? `<span class="sdot ${dotClass(fn)}">${fn}%</span>` : '<span style="color:#9ca3af">-</span>'}</td>
          <td><span class="fit-badge">${r.fitment || '-'}</span></td>
          <td>${r.llm_type ? llmLabel(r.llm_type) : '-'}</td>
          <td><span class="st-badge ${status}">${statusLabel}</span></td>
          <td onclick="event.stopPropagation()" style="position:relative; width: 40px; text-align:right;">
            <button class="ev-more" data-id="${r.id}">&#8943;</button>
          </td>
        </tr>`;
      }).join('');
    })();

    const pagerHtml = `
    <div class="pager">
      <span class="pager-info">${total > 0 ? `${startIdx + 1}&#x2013;${Math.min(startIdx + perPage, total)} of ${total}` : `${total} records`}</span>
      ${totalPages > 1 ? `<button class="pager-btn" id="prevPage" ${state.evalPage <= 1 ? 'disabled' : ''}>&lsaquo; Prev</button>
      ${Array.from({ length: totalPages }, (_, i) => `<button class="pager-btn page-num ${state.evalPage === i + 1 ? 'on' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')}
      <button class="pager-btn" id="nextPage" ${state.evalPage >= totalPages ? 'disabled' : ''}>Next &rsaquo;</button>` : ''}
      <select class="pager-per" id="perPageSel">
        ${[10, 25, 50].map(n => `<option value="${n}" ${state.evalPerPage === n ? 'selected' : ''}>${n} / page</option>`).join('')}
      </select>
    </div>`;

    const numAll = rows.length;
    const numShort = rows.filter(r => r.is_shortlisted).length;

    app.innerHTML = topNav('evals') + `
<main class="page fade-up">
  <div class="evlist-head">
    <h1>My Evaluations</h1>
    <div class="evlist-actions">
      ${state.evalFilter === 'all' ? `
      <button class="btn btn-outline" id="cmpBtn">${ic('compare')} Use Case Positioning <span style="background:#e5e7eb;border-radius:99px;padding:1px 7px;font-size:11px;margin-left:2px">${selCount}</span></button>
      <button class="btn btn-outline" id="bulkShortlistBtn">${ic('star')} Shortlist <span style="background:#e5e7eb;border-radius:99px;padding:1px 7px;font-size:11px;margin-left:2px">${selCount}</span></button>
      <button class="btn btn-outline" style="color:#dc2626;border-color:#fca5a5" id="bulkDelBtn">${ic('alert')} Delete <span style="background:#fee2e2;border-radius:99px;padding:1px 7px;font-size:11px;margin-left:2px;color:#dc2626">${selCount}</span></button>
      ` : ''}
      <button class="btn btn-outline" id="exportBtn">${ic('export')} Export</button>
      <button class="btn btn-primary" onclick="window.go('/evaluate')">+ Evaluate a process</button>
    </div>
  </div>
  <div class="filter-tabs">
    <button class="tab-pill${state.evalFilter === 'all' ? ' on' : ''}" id="tabAll">All (${numAll})</button>
    <button class="tab-pill${state.evalFilter === 'shortlisted' ? ' on' : ''}" id="tabShort">Shortlisted (${numShort})</button>
  </div>
  <div class="table-wrap" id="evalTableWrap">
    <table class="ev-table">
      <thead><tr>
        ${state.evalFilter === 'all' ? `<th><input type="checkbox" id="selAll" ${allSelected ? 'checked' : ''} /></th>` : ''}
        <th>Process name</th><th>Created on</th>
        <th>Automation score</th><th>Feasibility score</th>
        <th>Fitment type</th><th>LLM type</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>${tableBody}</tbody>
    </table>
  </div>
  ${pagerHtml}
</main>
<!-- Delete Modal -->
<div class="modal-overlay hidden" id="deleteModal">
  <div class="modal-box">
    <div class="m-icon-wrap delete">${ic('alert')}</div>
    <h3>Delete Evaluation?</h3>
    <p id="deleteModalMsg">Are you sure you want to delete this evaluation? This action cannot be undone and all associated data will be permanently removed.</p>
    <div class="modal-btns">
      <button class="mbtn-cancel" id="deleteCancelBtn">Cancel</button>
      <button class="mbtn-confirm delete" id="deleteConfirmBtn">Delete</button>
    </div>
  </div>
</div>`;
    bindNav();

    document.getElementById('tabAll').onclick = () => { state.evalFilter = 'all'; state.evalPage = 1; renderEvalPage(); };
    document.getElementById('tabShort').onclick = () => { state.evalFilter = 'shortlisted'; state.evalPage = 1; renderEvalPage(); };
    document.getElementById('exportBtn').onclick = () => exportXLSX(filtered, 'evaluations');
    document.getElementById('prevPage')?.addEventListener('click', () => { state.evalPage--; renderEvalPage(); });
    document.getElementById('nextPage')?.addEventListener('click', () => { state.evalPage++; renderEvalPage(); });
    document.querySelectorAll('.page-num').forEach(btn => {
      btn.addEventListener('click', () => { state.evalPage = Number(btn.dataset.page); renderEvalPage(); });
    });
    document.getElementById('perPageSel')?.addEventListener('change', e => {
      state.evalPerPage = Number(e.target.value); state.evalPage = 1; renderEvalPage();
    });

    if (state.evalFilter === 'all') {
      document.getElementById('cmpBtn').onclick = () => {
        if (state.selectedIds.size < 1) { alert('Select at least 1 evaluation for positioning'); return; }
        state.compareRows = rows.filter(r => state.selectedIds.has(r.id));
        go('/compare');
      };
      // Bulk shortlist handler
      document.getElementById('bulkShortlistBtn')?.addEventListener('click', async () => {
        if (state.selectedIds.size === 0) { alert('Select at least 1 evaluation to shortlist'); return; }
        const ids = [...state.selectedIds];
        const items = rows.filter(r => state.selectedIds.has(r.id));
        if (items.some(r => r.is_shortlisted)) {
          alert('This evaluation is already shortlisted.');
          return;
        }
        try {
          await api('/api/evaluations/shortlist', 'PUT', { evaluation_ids: ids, shortlist_status: true });
          rows.forEach(r => {
            if (state.selectedIds.has(r.id)) {
              r.is_shortlisted = true;
              r.status = 'Shortlisted';
            }
          });
          state.selectedIds.clear();
          renderEvalPage();
        } catch (err) { alert('Shortlist failed: ' + err.message); }
      });
      // Bulk delete handler
      document.getElementById('bulkDelBtn')?.addEventListener('click', () => {
        if (state.selectedIds.size === 0) { alert('Select at least 1 evaluation to delete'); return; }

        // Check if any selected items are shortlisted
        const selectedItems = rows.filter(r => state.selectedIds.has(r.id));
        const shortlisted = selectedItems.filter(r => (r.status || '').toLowerCase() === 'shortlisted' || r.is_shortlisted);

        if (shortlisted.length > 0) {
          alert(`Selected evaluations contain shortlisted items which cannot be deleted.`);
          return;
        }

        const count = state.selectedIds.size;
        document.getElementById('deleteModalMsg').textContent = `Are you sure you want to delete ${count} evaluation(s)? This action cannot be undone and all associated data will be permanently removed.`;
        const modal = document.getElementById('deleteModal');
        modal.classList.remove('hidden');

        document.getElementById('deleteCancelBtn').onclick = () => modal.classList.add('hidden');
        document.getElementById('deleteConfirmBtn').onclick = async () => {
          modal.classList.add('hidden');
          const ids = [...state.selectedIds];
          let failed = 0;
          for (const id of ids) {
            try {
              await api(`/api/evaluations/${id}`, 'DELETE');
              rows = rows.filter(r => r.id !== id);
              state.selectedIds.delete(id);
            } catch { failed++; }
          }
          if (failed) alert(`${failed} deletion(s) failed.`);
          renderEvalPage();
        };
      });
    } // End if (state.evalFilter === 'all')

    // Select-all: toggle in-place without full re-render
    document.getElementById('selAll')?.addEventListener('change', e => {
      if (e.target.checked) filtered.forEach(r => state.selectedIds.add(r.id));
      else state.selectedIds.clear();
      // Update checkboxes in-place
      document.querySelectorAll('.sel-cb').forEach(cb => { cb.checked = state.selectedIds.has(cb.dataset.id); });
      // Update count badges
      const cnt = state.selectedIds.size;
      document.querySelectorAll('.evlist-actions span[style]').forEach(s => { if (s.textContent.match(/^\d+$/)) s.textContent = cnt; });
    });
    // Individual checkboxes: toggle in-place without full re-render
    document.querySelectorAll('.sel-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.checked ? state.selectedIds.add(cb.dataset.id) : state.selectedIds.delete(cb.dataset.id);
        // Update select-all checkbox
        const selAllCb = document.getElementById('selAll');
        if (selAllCb) selAllCb.checked = pageRows.length > 0 && pageRows.every(r => state.selectedIds.has(r.id));
        // Update count badges
        const cnt = state.selectedIds.size;
        document.querySelectorAll('.evlist-actions span[style]').forEach(s => { if (s.textContent.match(/^\d+$/)) s.textContent = cnt; });
      });
    });
    document.querySelectorAll('tbody tr[data-id]').forEach(tr =>
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        const row = rows.find(r => r.id === id);
        if (row && (row.status || '').toLowerCase() === 'draft') go(`/evaluate?draftId=${id}`);
        else go(`/results/${id}`);
      })
    );

    // Portal-based 3-dot menu (appended to body to avoid overflow clipping)
    document.querySelectorAll('.ev-more').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('_portalMenu')?.remove();
        const id = btn.dataset.id;
        const rect = btn.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.id = '_portalMenu';
        menu.className = 'portal-menu';
        menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left - 80}px;z-index:9999;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:120px;overflow:hidden`;
        const row = rows.find(r => r.id === id);
        const isShortlisted = row && ((row.status || '').toLowerCase() === 'shortlisted' || row.is_shortlisted);
        menu.innerHTML = `
          <button class="more-item" data-action="view" data-id="${id}">${ic('doc')} View</button>
          ${state.evalFilter === 'all' ? `
          <button class="more-item" data-action="shortlist" data-id="${id}">${ic('star')} Shortlist</button>
          ${isShortlisted ? '' : `<button class="more-item del" data-action="delete" data-id="${id}">${ic('alert')} Delete</button>`}
          ` : ''}`;
        document.body.appendChild(menu);
        menu.querySelectorAll('.more-item').forEach(item => {
          item.addEventListener('click', async e2 => {
            e2.stopPropagation();
            menu.remove();
            const { action } = item.dataset;
            if (action === 'view') {
              const row = rows.find(r => r.id === id);
              if (row && (row.status || '').toLowerCase() === 'draft') go(`/evaluate?draftId=${id}`);
              else go(`/results/${id}`);
            }
            if (action === 'shortlist') {
              const row = rows.find(r => r.id === id);
              if (row.is_shortlisted) {
                alert('This evaluation is already shortlisted.');
                return;
              }
              try {
                await api('/api/evaluations/shortlist', 'PUT', { evaluation_ids: [id], shortlist_status: true });
                row.is_shortlisted = true;
                row.status = 'Shortlisted';
                renderEvalPage();
              } catch (err) { alert('Shortlist failed: ' + err.message); }
            }
            if (action === 'delete') {
              document.getElementById('deleteModalMsg').textContent = 'Are you sure you want to delete this evaluation? This action cannot be undone and all associated data will be permanently removed.';
              const modal = document.getElementById('deleteModal');
              modal.classList.remove('hidden');

              document.getElementById('deleteCancelBtn').onclick = () => modal.classList.add('hidden');
              document.getElementById('deleteConfirmBtn').onclick = async () => {
                modal.classList.add('hidden');
                try {
                  await api(`/api/evaluations/${id}`, 'DELETE');
                  rows = rows.filter(r => r.id !== id);
                  state.selectedIds.delete(id);
                  renderEvalPage();
                } catch (err) { alert('Delete failed: ' + err.message); }
              };
            }
          });
        });
      });
    });
    document.addEventListener('click', () => document.getElementById('_portalMenu')?.remove(), { once: true });
  }

  renderEvalPage();
}



/* ── Compare Page ── */
function comparePage() {
  const rows = state.compareRows;
  if (!rows.length) { go('/my-evaluations'); return; }

  // Place each process in a quadrant based on automation score + business value
  function getQuad(r) {
    const auto = scoreNum(r.automation_score);
    const biz = scoreNum(r.feasibility_score);
    if (biz >= 50 && auto < 50) return 0; // Implement quick wins (Top-Left)
    if (biz >= 50 && auto >= 50) return 1; // Focus and implement (Top-Right)
    if (biz < 50 && auto < 50) return 2; // Test & learn (Bottom-Left)
    return 3; // Avoid (Bottom-Right)
  }
  const quadLabels = ['Implement quick wins', 'Focus and implement', 'Test & learn', 'Avoid'];
  const quadCls = ['q1', 'q2', 'q3', 'q4'];
  const byQuad = [[], [], [], []];
  rows.forEach((r, i) => byQuad[getQuad(r)].push({ label: r.process_name || `Process ${i + 1}`, r }));

  app.innerHTML = topNav('evals') + `
<main class="page fade-up">
  <div class="ph">
    <h1><button class="back-btn" onclick="go('/my-evaluations')">${ic('arrleft')}</button> Use Case Positioning</h1>
    <button class="btn btn-outline" id="cmpExport">${ic('export')} Export</button>
  </div>
  <div class="cmp-page">
    <div class="card cmp-left">
      <h4>Selected processes:</h4>
      <table class="cmp-proc-table">
        <tr><th>Process no.</th><th>Process name</th></tr>
        ${rows.map((r, i) => `<tr><td>${String(i + 1).padStart(2, '0')}.</td><td>${r.process_name || '-'}</td></tr>`).join('')}
      </table>
    </div>
    <div class="card cmp-matrix-wrap" style="display:flex;justify-content:center;">
      <div style="position:relative;padding-left:48px;">
        <div class="cmp-axis-y">
          <span>↑ High</span>
          <span class="cmp-axis-y-text">High business value</span>
          <span>Low ↓</span>
        </div>
        <div class="cmp-matrix">
          ${quadCls.map((cls, qi) => `
          <div class="cmp-quad ${cls}">
            <span class="cmp-quad-label">${quadLabels[qi]}</span>
            <div>${byQuad[qi].map(p => `<span class="cmp-proc-dot">${p.label}</span>`).join(' ')}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>
</main>`;
  bindNav();
  document.getElementById('cmpExport').onclick = () => {
    exportXLSX(rows, 'comparison',
      ['process_name', 'automation_score', 'feasibility_score'],
      ['Process Name', 'Automation Score', 'Business Value']);
  };
}

/* ── Use Case helpers ── */
function extractUC(resp) {
  if (!resp) return [];
  // Direct array
  if (Array.isArray(resp)) return resp;
  // { use_cases: [...] } (from parsed Mistral)
  if (Array.isArray(resp?.use_cases)) return resp.use_cases;
  // { agent_response: { ... } } (from backend doc stored before extracting)
  if (resp?.agent_response) return extractUC(resp.agent_response);
  // Other common keys top level
  for (const key of ['items', 'results', 'data']) if (Array.isArray(resp[key])) return resp[key];

  // Recursive search for an array named 'use_cases' anywhere in the object structure
  function findDeepArray(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj.use_cases)) return obj.use_cases;
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
          // If we found an array of objects that look like use cases
          if (val.length > 0 && typeof val[0] === 'object' && (val[0].title || val[0].use_case || val[0].name)) return val;
        } else {
          const found = findDeepArray(val);
          if (found) return found;
        }
      }
    }
    return null;
  }

  const deepRes = findDeepArray(resp);
  if (deepRes) return deepRes;

  // Try parsing Mistral text content
  try {
    let txt = (resp?.choices?.[0]?.message?.content || '').trim();
    const m = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m) txt = m[1].trim();
    else txt = txt.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();

    const p = JSON.parse(txt);
    if (Array.isArray(p)) return p;
    // Aggressive deep search on parsed JSON as well
    const deepP = findDeepArray(p);
    return deepP || [];
  } catch { return []; }
}

/* Parse the FULL company response object (preserving company_name, industry, and all nested fields) */
function parseCompanyFullResponse(resp) {
  if (!resp) return null;
  // Already a parsed object with use_cases
  if (resp.use_cases && Array.isArray(resp.use_cases)) return resp;
  // Wrapped in agent_response
  if (resp.agent_response) return parseCompanyFullResponse(resp.agent_response);
  // Mistral-style: choices[0].message.content
  try {
    let txt = (resp?.choices?.[0]?.message?.content || '').trim();
    if (!txt) return null;
    const m = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m) txt = m[1].trim();
    else txt = txt.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(txt);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.use_cases)) return parsed;
      // Deep search for an object containing use_cases
      function findObj(obj) {
        if (!obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj.use_cases)) return obj;
        for (const v of Object.values(obj)) {
          const found = findObj(v);
          if (found) return found;
        }
        return null;
      }
      return findObj(parsed);
    }
  } catch { }
  return null;
}

function starHtml(rating) {
  const r = Number(rating || 0);
  return `<span class="uc-rrating"><span style="color:var(--orange);font-size:15px;vertical-align:middle;">&#9733;</span> ${r % 1 === 0 ? r : r.toFixed(1)}</span>`;
}

/* ── Domain Use Case Page ── */
async function domainPage() {
  const items = extractUC(state.domainResult);
  const f = state.domainFilters;

  app.innerHTML = topNav('uc') + `
<main class="page fade-up">
  <div class="uc-head">
    <h1>AI use-case discovery – By domain</h1>
    <button class="btn btn-outline" id="ucExport">${ic('export')} Export</button>
  </div>
  <div class="card uc-search">
    <div class="uc-fields dom">
      <div class="ucf"><label>Domain</label><input id="uc_domain" value="${f.domain}" placeholder="Finance, Healthcare, Retail…" /></div>
      <div class="ucf"><label>User role</label><input id="uc_role" value="${f.user_role}" placeholder="Operations manager, CTO…" /></div>
      <div class="ucf"><label>Objective</label><input id="uc_obj" value="${f.objective}" placeholder="Increase efficiency, reduce costs…" /></div>
      <button class="disc-cta" id="discDomain">${ic('search')} Discover</button>
    </div>
  </div>
  ${state.domainLoading
      ? `<div class="card uc-results-wrap"><div class="uc-loading"><div class="spinner"></div> Discovering use cases…</div></div>`
      : state.domainError && !items.length
        ? `<div class="card uc-results-wrap"><div class="uc-error-state" style="color:#d97706;padding:40px;text-align:center">⚠️ ${state.domainError}</div></div>`
        : items.length
          ? `<div class="uc-results-wrap">
            ${state.domainError ? `<div class="uc-warn-banner" style="background:#fef3c7;color:#92400e;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;font-weight:500;">⚠️ ${state.domainError}</div>` : ''}
            <div class="uc-results-hdr dom"><span>Use case</span><span>Ratings</span><span></span><span></span></div>
            ${items.sort((a, b) => {
            const scoreA = Number(a.rating || (a.business_benefit_score?.score ? a.business_benefit_score.score / 10 : 0));
            const scoreB = Number(b.rating || (b.business_benefit_score?.score ? b.business_benefit_score.score / 10 : 0));
            return scoreB - scoreA;
          }).map((item, idx) => {
            const title = item.title || item.use_case || item.name || '';
            const desc = item.description || item.benefits || item.details || '';
            const open = idx === state.domainOpenIdx;
            const itemRating = item.rating || (item.business_benefit_score?.score ? item.business_benefit_score.score / 10 : 0);
            return `<div class="uc-row-outer">
                  <div class="uc-row dom" data-idx="${idx}">
                    <span class="uc-rtitle">${title}</span>
                    ${starHtml(itemRating)}
                    <button class="btn btn-outline btn-sm uc-view-btn" data-view-idx="${idx}">View</button>
                    <span class="uc-chevron">${open ? ic('chevup') : ic('chevdown')}</span>
                  </div>
                  ${open && desc ? `<div class="uc-detail-box"><div class="uc-detail-label">Process Details:</div><div class="uc-detail-text">${desc}</div></div>` : ''}
                </div>`;
          }).join('')}
          </div>`
          : `<div class="card uc-results-wrap"><div class="uc-empty-state">${ic('search')}<span>Enter domain details above and click Discover</span></div></div>`
    }
</main>`;
  bindNav();
  document.getElementById('ucExport').onclick = () => {
    const rData = items.map(i => ({
      process_name: i.title || i.name || i.use_case || '',
      rating: i.rating || (i.business_benefit_score?.score ? i.business_benefit_score.score / 10 : '') || i.score || '',
      details: i.description || i.benefits || i.details || '',
      domain: i.domain || i.category || i.industry || '',
    }));
    exportXLSX(rData, 'domain_use_cases', ['process_name', 'domain', 'rating', 'details'], ['Use Case / Title', 'Domain', 'Rating', 'Details']);
  };
  document.getElementById('discDomain').onclick = async () => {
    state.domainFilters = { domain: document.getElementById('uc_domain').value, user_role: document.getElementById('uc_role').value, objective: document.getElementById('uc_obj').value };
    state.domainLoading = true; state.domainError = null; state.domainOpenIdx = -1;
    domainPage();
    try {
      const resp = await api('/api/use-cases/domain', 'POST', state.domainFilters);
      state.domainResult = resp.agent_response ?? resp;
      state.domainError = null;
    } catch (err) {
      state.domainResult = null;
      state.domainError = err.message || 'Failed to discover use cases. Please try again.';
    }
    state.domainLoading = false;
    domainPage();
  };
  // Toggle row detail in-place without full re-render
  document.querySelectorAll('.uc-row[data-idx]').forEach(row => {
    row.onclick = () => {
      const idx = Number(row.dataset.idx);
      const outer = row.closest('.uc-row-outer');
      const existingDetail = outer.querySelector('.uc-detail-box');
      // Close other open details
      document.querySelectorAll('.uc-detail-box').forEach(d => { if (d !== existingDetail) d.remove(); });
      document.querySelectorAll('.uc-row .uc-chevron').forEach(ch => { ch.innerHTML = ic('chevdown'); });
      if (existingDetail) {
        existingDetail.remove();
        row.querySelector('.uc-chevron').innerHTML = ic('chevdown');
        state.domainOpenIdx = -1;
      } else {
        const item = items[idx];
        const desc = item?.description || item?.benefits || item?.details || '';
        if (desc) {
          const detailDiv = document.createElement('div');
          detailDiv.className = 'uc-detail-box';
          detailDiv.innerHTML = `<div class="uc-detail-label">Process Details:</div><div class="uc-detail-text">${desc}</div>`;
          outer.appendChild(detailDiv);
        }
        row.querySelector('.uc-chevron').innerHTML = ic('chevup');
        state.domainOpenIdx = idx;
      }
    };
  });
  // Connect View buttons
  document.querySelectorAll('.uc-view-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      state.domainUseCaseViewData = { use_cases: items, domainFilters: state.domainFilters };
      go('/use-cases/domain/' + btn.dataset.viewIdx);
    };
  });
}

/* ── Company Use Case Page ── */
async function companyPage() {
  const items = extractUC(state.companyResult);

  let rootDomain = '';
  try {
    const rawContent = (state.companyResult?.choices?.[0]?.message?.content || '').trim();
    let txt = rawContent;
    const m = txt.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m) txt = m[1].trim();
    else txt = txt.replace(/^```[a-z]*\n?/, '').replace(/```$/, '').trim();
    const p = JSON.parse(txt);
    if (p && !Array.isArray(p)) {
      rootDomain = p.industry || p.category || p.domain || '';
    }
  } catch (e) { }

  app.innerHTML = topNav('uc') + `
  <main class="page fade-up">
  <div class="uc-head">
    <h1>AI use-case discovery – By company</h1>
    <button class="btn btn-outline" id="ucExportC">${ic('export')} Export</button>
  </div>
  <div class="card uc-search">
    <div class="uc-fields com">
      <div class="ucf"><label>Company name</label><input id="uc_co" value="${state.companyFilter}" placeholder="e.g., Avaali Solutions, TCS, Infosys…" /></div>
      <button class="disc-cta" id="discCompany">${ic('search')} Discover</button>
    </div>
  </div>
  ${state.companyLoading
      ? `<div class="card uc-results-wrap"><div class="uc-loading"><div class="spinner"></div> Discovering use cases…</div></div>`
      : state.companyError && !items.length
        ? `<div class="card uc-results-wrap"><div class="uc-error-state" style="color:#d97706;padding:40px;text-align:center">⚠️ ${state.companyError}</div></div>`
        : items.length
          ? `<div class="uc-results-wrap">
            ${state.companyError ? `<div class="uc-warn-banner" style="background:#fef3c7;color:#92400e;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;font-weight:500;">⚠️ ${state.companyError}</div>` : ''}
            <div class="uc-results-hdr com"><span>Use case</span><span>Domain</span><span>Rating</span><span></span><span></span></div>
          ${items.sort((a, b) => {
            const scoreA = Number(a.rating || (a.business_benefit_score?.score ? a.business_benefit_score.score / 10 : 0));
            const scoreB = Number(b.rating || (b.business_benefit_score?.score ? b.business_benefit_score.score / 10 : 0));
            return scoreB - scoreA;
          }).map((item, idx) => {
            const title = item.title || item.use_case || item.name || '';
            const domain = item.domain || item.category || item.industry || rootDomain;
            const desc = item.description || item.benefits || item.details || '';
            const open = idx === state.companyOpenIdx;
            const itemRating = item.rating || (item.business_benefit_score?.score ? item.business_benefit_score.score / 10 : 0);
            return `<div class="uc-row-outer">
              <div class="uc-row com" data-idx="${idx}">
                <span class="uc-rtitle">${title}</span>
                <span class="uc-rdomain">${domain}</span>
                ${starHtml(itemRating)}
                <button class="btn btn-outline btn-sm uc-view-btn" data-view-idx="${idx}">View</button>
                <span class="uc-chevron">${open ? ic('chevup') : ic('chevdown')}</span>
              </div>
              ${open && desc ? `<div class="uc-detail-box"><div class="uc-detail-label">Process Details:</div><div class="uc-detail-text">${desc}</div></div>` : ''}
            </div>`;
          }).join('')}
        </div>`
          : `<div class="card uc-results-wrap"><div class="uc-empty-state">${ic('search')}<span>Enter a company name above and click Discover</span></div></div>`
    }
</main>`;
  bindNav();
  document.getElementById('ucExportC').onclick = () => {
    const rData = items.map(i => ({
      process_name: i.title || i.name || i.use_case || '',
      domain: i.domain || i.category || i.industry || rootDomain || '',
      rating: i.rating || (i.business_benefit_score?.score ? i.business_benefit_score.score / 10 : '') || i.score || '',
      details: i.description || i.benefits || i.details || '',
    }));
    exportXLSX(rData, 'company_use_cases', ['process_name', 'domain', 'rating', 'details'], ['Use Case / Title', 'Domain', 'Rating', 'Details']);
  };
  document.getElementById('discCompany').onclick = async () => {
    state.companyFilter = document.getElementById('uc_co').value;
    state.companyLoading = true; state.companyError = null; state.companyOpenIdx = -1;
    companyPage();
    try {
      const resp = await api('/api/use-cases/company', 'POST', { company_name: state.companyFilter });
      state.companyResult = resp.agent_response ?? resp;
      state.companyError = null;
    } catch (err) {
      state.companyResult = null;
      state.companyError = err.message || 'Failed to discover use cases. Please try again.';
    }
    state.companyLoading = false;
    companyPage();
  };
  // Toggle row detail in-place without full re-render
  document.querySelectorAll('.uc-row[data-idx]').forEach(row => {
    row.onclick = () => {
      const idx = Number(row.dataset.idx);
      const outer = row.closest('.uc-row-outer');
      const existingDetail = outer.querySelector('.uc-detail-box');
      // Close other open details
      document.querySelectorAll('.uc-detail-box').forEach(d => { if (d !== existingDetail) d.remove(); });
      document.querySelectorAll('.uc-row .uc-chevron').forEach(ch => { ch.innerHTML = ic('chevdown'); });
      if (existingDetail) {
        existingDetail.remove();
        row.querySelector('.uc-chevron').innerHTML = ic('chevdown');
        state.companyOpenIdx = -1;
      } else {
        const item = items[idx];
        const desc = item?.description || item?.benefits || item?.details || '';
        if (desc) {
          const detailDiv = document.createElement('div');
          detailDiv.className = 'uc-detail-box';
          detailDiv.innerHTML = `<div class="uc-detail-label">Process Details:</div><div class="uc-detail-text">${desc}</div>`;
          outer.appendChild(detailDiv);
        }
        row.querySelector('.uc-chevron').innerHTML = ic('chevup');
        state.companyOpenIdx = idx;
      }
    };
  });
  // View button navigates to detail page
  document.querySelectorAll('.uc-view-btn[data-view-idx]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = Number(btn.dataset.viewIdx);
      // Parse the full response to get company_name, industry, and complete use case objects
      const fullResp = parseCompanyFullResponse(state.companyResult);
      state.companyUseCaseViewData = {
        company_name: fullResp?.company_name || state.companyFilter || '',
        industry: fullResp?.industry || '',
        use_cases: fullResp?.use_cases || items,
        index: idx,
      };
      go(`/use-cases/company/${idx}`);
    };
  });
}

/* ── Support Page ── */
function supportPage() {
  const faqs = [
    { q: "How does the evaluation process work?", a: "To run an evaluation, click 'Evaluate a process' on the dashboard. You will provide the process name, description, frequency, and related scores. Avagama.ai will then process this information and map it against LLMs and known industry solutions to give you a definitive automation score and feasibility rating." },
    { q: "How many evaluations do I get after signing up?", a: "By default, new users receive 20 free evaluations to explore the platform. You can track your usage by clicking on your profile icon in the top right corner." },
    { q: "Why am I unable to run an evaluation?", a: "If you are unable to run an evaluation, please ensure you have filled out all required fields on the evaluation form. If the problem persists, you may have reached your evaluation limit, or our AI service might be temporarily unavailable." },
    { q: "How do I shortlist an evaluation?", a: "You can shortlist an evaluation by clicking the 'Shortlist' button on the results page of a specific evaluation, or by using the bulk 'Shortlist' button in the 'My Evaluations' tab." },
    { q: "Where can I see my shortlisted evaluations?", a: "Navigate to the 'My Evaluations' page using the sidebar. There, you can click on the 'Shortlisted' tab to view all evaluations you have marked as shortlisted." },
    { q: "How do I contact support?", a: "You can write to us directly using the 'Write to us' section on this very page." }
  ];

  const headerHtml = state.token ? topNav('dash') : `
<div style="display:flex;justify-content:space-between;align-items:center;padding:18px 32px;background:#fff;border-bottom:1px solid #e5e7eb;">
  <div style="cursor:pointer;" onclick="window.go('/login')">${logo()}</div>
  <span class="fp-back" style="margin:0;" onclick="window.history.back()">${ic('arrleft')} Back</span>
</div>`;

  app.innerHTML = headerHtml + `
<main class="page fade-up" style="max-width:800px; margin:0 auto; padding:40px 20px;">
  <div style="text-align:center; padding:20px 0 40px;">
    <h1 style="font-size:36px; font-weight:800; display:inline-block;" class="text-gradient">Help & Support</h1>
    <p style="color:#6b7280; margin-top:12px; font-size:16px;">Find answers to common questions or reach out to our team.</p>
  </div>
  
  <div class="sec-title" style="margin-top:0;">Frequently Asked Questions</div>
  <div class="faq-list">
    ${faqs.map((f, i) => `
    <div class="faq-item">
      <button class="faq-btn" data-idx="${i}">
        <span>${f.q}</span>
        <span class="faq-icon">${ic('chevdown')}</span>
      </button>
      <div class="faq-content" id="faq-content-${i}">
        <p>${f.a}</p>
      </div>
    </div>`).join('')}
  </div>

  <div class="sec-title" style="margin-top:40px;">Write to Us</div>
  <div class="card" style="padding:24px;">
    <p style="color:#374151; font-size:14px; margin-bottom:16px; line-height:1.6;">
      If you are facing any issues or need assistance, please write to us at <a href="mailto:${state.user?.support_email || 'support@avagama.com'}" style="color:var(--purple);font-weight:600;text-decoration:none;">${state.user?.support_email || 'support@avagama.com'}</a>.
    </p>
    <a href="mailto:${state.user?.support_email || 'support@avagama.com'}" class="btn btn-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px;">
      ${ic('mail')} Contact Support
    </a>
  </div>
</main>`;
  bindNav();

  // Accordion Logic
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.idx;
      const content = document.getElementById(`faq-content-${idx}`);
      const icon = btn.querySelector('.faq-icon');

      const isOpen = content.classList.contains('open');

      // Close all others
      document.querySelectorAll('.faq-content').forEach(c => c.classList.remove('open'));
      document.querySelectorAll('.faq-icon').forEach(i => i.innerHTML = ic('chevdown'));
      document.querySelectorAll('.faq-btn').forEach(b => b.classList.remove('active'));

      if (!isOpen) {
        content.classList.add('open');
        icon.innerHTML = ic('chevup');
        btn.classList.add('active');
      }
    });
  });
}

async function fetchUserLimits() {
  if (!state.token) return;
  try {
    const data = await api('/api/auth/me');
    if (data && data.id) {
      state.user = data;
      localStorage.setItem('user', JSON.stringify(data));
      // Re-render Top_Nav to catch the new counts without disrupting input
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        const temp = document.createElement('div');
        const activeNav = window.location.pathname.startsWith('/my-evaluations') ? 'evals' : window.location.pathname.startsWith('/compare') || window.location.pathname.startsWith('/results') ? 'evals' : 'dash';
        temp.innerHTML = topNav(activeNav);
        topbar.replaceWith(temp.firstElementChild);
        bindNav();
      }
      // Update dashboard welcome greeting if visible
      const hlSpan = document.querySelector('.welcome-card .hl');
      if (hlSpan) {
        hlSpan.textContent = data.first_name || data.company_name || 'there';
      }
    }
  } catch (e) { console.error('Failed to sync user limits:', e) }
}

/* ── Router ── */
async function render() {
  const path = window.location.pathname;
  app.className = '';
  document.body.className = '';

  fetchUserLimits(); // async refresh of limits in background

  if (!state.token && !['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/support'].includes(path)) return go('/login');
  if (path === '/login') return authPage('login');
  if (path === '/signup') return authPage('signup');
  if (path === '/forgot-password') return authPage('forgot');
  if (path === '/reset-password') return authPage('reset');
  if (path === '/verify-email') return verifyEmailPage();
  if (path === '/') return dashboard();
  if (path === '/evaluate') {
    const params = new URLSearchParams(window.location.search);
    return evaluateForm(params.get('draftId'));
  }
  if (path === '/evaluating') return evaluatingScreen();
  if (path === '/my-evaluations') return evaluationsPage();
  if (path === '/compare') return comparePage();
  if (path === '/use-cases/domain') return domainPage();
  if (path.startsWith('/use-cases/domain/')) return domainUseCaseDetailPage(Number(path.split('/').pop()));
  if (path === '/use-cases/company') return companyPage();
  if (path.startsWith('/use-cases/company/')) return companyUseCaseDetailPage(Number(path.split('/').pop()));
  if (path === '/support') return supportPage();
  if (path.startsWith('/results/')) return resultsPage(path.split('/').pop());
  go('/');
}

/* ── Domain Use Case Detail Page ── */
function domainUseCaseDetailPage(idx) {
  const viewData = state.domainUseCaseViewData;
  if (!viewData || !viewData.use_cases || !viewData.use_cases[idx]) {
    app.innerHTML = topNav('disc') + `<main class="page"><div class="empty-wrap"><p>Use case data not available. Please go back and discover use cases first.</p><button class="btn btn-primary" onclick="go('/use-cases/domain')">Back</button></div></main>`;
    bindNav(); return;
  }

  const uc = viewData.use_cases[idx];
  const domainName = viewData.domainFilters?.domain || 'Unknown Domain';
  const roleName = viewData.domainFilters?.user_role || '';
  const objectiveName = viewData.domainFilters?.objective || '';
  const industrySubtitle = [roleName, objectiveName].filter(Boolean).join(' • ') || 'Domain Focus';
  const title = uc.title || uc.use_case || uc.name || 'Use Case';

  const desc = uc.description || uc.objective || uc.summary || uc.details || '';
  let stepsRaw = uc.functional_steps || uc.steps || [];
  const steps = Array.isArray(stepsRaw) ? stepsRaw : (typeof stepsRaw === 'object' && stepsRaw !== null ? Object.values(stepsRaw) : [stepsRaw]);
  const params = uc.parameter_scoring || uc.parameters || [];

  const bbs = uc.business_benefit_score || {};
  const bbsScore = typeof bbs === 'object' && bbs !== null ? (bbs.score ?? 0) : Number(bbs) || 0;
  const bbsInterp = (typeof bbs === 'object' && bbs !== null ? bbs.interpretation : '') || uc.business_benefit_interpretation || uc.interpretation || '';

  const stepsHtml = steps.length ? steps.filter(s => s).map((s) => {
    const rendered = String(s)
      .replace(/^(?:Step\\s*\\d+\\s*[:\\-\\.]?\\s*)+/gi, '')
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    return `<li class="ucv-step">${rendered}</li>`;
  }).join('') : '<li class="ucv-step" style="color:#9ca3af">No functional steps provided</li>';

  const paramsHtml = params.length ? params.map(p => {
    const pName = p.parameter || p.name || '';
    const rawW = p.weight;
    const rawS = p.score;
    const pWeight = rawW !== undefined && rawW !== null && rawW !== '' ? Number(rawW) : NaN;
    const pScore = rawS !== undefined && rawS !== null && rawS !== '' ? Number(rawS) : NaN;
    const hasWeight = !isNaN(pWeight) && pWeight !== 0;
    const hasScore = !isNaN(pScore);
    const pJust = p.justification || p.reason || p.rationale || '';

    let pct = 0;
    if (hasScore && hasWeight) {
      pct = Math.min(100, Math.round((pScore / pWeight) * 100));
    } else if (hasScore) {
      pct = Math.min(100, Math.round(pScore <= 10 ? pScore * 10 : pScore));
    }
    const barColor = pct >= 70 ? 'green' : pct >= 40 ? 'orange' : 'red';

    const weightBadge = hasWeight ? `<span class="ucv-w-badge">W: ${pWeight}</span>` : '';
    const scoreBadge = hasScore ? `<span class="ucv-s-badge">S: ${pScore}</span>` : '';

    return `<div class="ucv-param-card card tooltip-container">
      <div class="ucv-param-header">
        <span class="ucv-param-name">${pName}</span>
        <div class="ucv-param-scores">${weightBadge}${scoreBadge}</div>
      </div>
      <div class="dim-bar" style="margin:8px 0"><i class="${barColor}" style="width:${pct}%"></i></div>
      ${pJust ? `<div class="ucv-tooltip-hover" style="bottom: 100%; top: auto; margin-bottom: 8px;">${pJust}</div>` : ''}
    </div>`;
  }).join('') : '<div class="card" style="padding:20px;color:#9ca3af">No parameter scoring data available</div>';

  const bbsLabel = bbsScore >= 80 ? 'Excellent' : bbsScore >= 60 ? 'Strong' : bbsScore >= 40 ? 'Moderate' : 'Low';
  const bbsGrad = bbsScore >= 80 ? 'linear-gradient(135deg,#10b981,#059669)' : bbsScore >= 60 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : bbsScore >= 40 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#ef4444,#dc2626)';

  const knownKeys = new Set(['title', 'use_case', 'name', 'description', 'functional_steps', 'steps', 'parameter_scoring', 'parameters', 'business_benefit_score', 'rating', 'domain', 'category', 'industry', 'benefits', 'details', 'score']);
  const extraSections = Object.entries(uc).filter(([k]) => !knownKeys.has(k)).map(([k, v]) => {
    if (v === null || v === undefined || v === '') return '';
    const label = k.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    if (typeof v === 'string') return `<div class="sec-title">${label}</div><div class="card ucv-interp-card"><p>${v}</p></div>`;
    if (Array.isArray(v)) return `<div class="sec-title">${label}</div><div class="card ucv-interp-card"><ul style="margin:0;padding-left:18px">${v.map(i => `<li style="margin-bottom:6px;line-height:1.65">${typeof i === 'object' ? JSON.stringify(i) : i}</li>`).join('')}</ul></div>`;
    return '';
  }).join('');

  app.innerHTML = topNav('disc') + `
<main class="page fade-up">
  <div class="ph" style="display:flex;justify-content:space-between;align-items:center;">
    <h1 style="margin:0"><button class="back-btn" onclick="go('/use-cases/domain')">${ic('arrleft')}</button> Use Case Details: ${title}</h1>
  </div>

  <div class="ucv-company-header card">
    <div class="ucv-company-info">
      <div class="ucv-company-icon">${domainName ? domainName[0].toUpperCase() : 'D'}</div>
      <div>
        <div class="ucv-company-name">${domainName}</div>
        ${industrySubtitle ? `<div class="ucv-company-industry">${industrySubtitle}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="ucv-hero-grid">
    <div class="ucv-bbs-card" style="background:${bbsGrad}">
      <h5>Business Benefit Score</h5>
      ${donut(bbsScore)}
      <div class="score-sub">${bbsLabel} ROI potential</div>
    </div>
    <div class="ucv-desc-card card">
      <h4>Description</h4>
      <p>${desc}</p>
    </div>
  </div>

  ${bbsInterp ? `<div class="sec-title">Business Benefit Interpretation</div><div class="card ucv-interp-card"><p>${bbsInterp}</p></div>` : ''}

  <div class="sec-title">Functional Steps</div>
  <div class="card ucv-steps-card">
    <ol class="ucv-steps-list">${stepsHtml}</ol>
  </div>

  <div class="sec-title">Parameter Scoring</div>
  <div class="ucv-params-grid">${paramsHtml}</div>

  ${extraSections}
</main>`;
  bindNav();
}

/* ── Company Use Case Detail Page ── */
function companyUseCaseDetailPage(idx) {
  const viewData = state.companyUseCaseViewData;
  if (!viewData || !viewData.use_cases || !viewData.use_cases[idx]) {
    app.innerHTML = topNav('disc') + `<main class="page"><div class="empty-wrap"><p>Use case data not available. Please go back and discover use cases first.</p><button class="btn btn-primary" onclick="go('/use-cases/company')">Back</button></div></main>`;
    bindNav(); return;
  }

  const uc = viewData.use_cases[idx];
  const companyName = viewData.company_name;
  const industry = viewData.industry;
  const title = uc.title || uc.use_case || uc.name || 'Use Case';

  // Description might be under various keys
  const desc = uc.description || uc.objective || uc.summary || uc.details || '';

  // Steps might be an object instead of array
  let stepsRaw = uc.functional_steps || uc.steps || [];
  const steps = Array.isArray(stepsRaw) ? stepsRaw : (typeof stepsRaw === 'object' && stepsRaw !== null ? Object.values(stepsRaw) : [stepsRaw]);

  // Parameters
  const params = uc.parameter_scoring || uc.parameters || [];

  // Business Benefit Score & Interpretation
  const bbs = uc.business_benefit_score || {};
  const bbsScore = typeof bbs === 'object' && bbs !== null ? (bbs.score ?? 0) : Number(bbs) || 0;
  const bbsInterp = (typeof bbs === 'object' && bbs !== null ? bbs.interpretation : '') || uc.business_benefit_interpretation || uc.interpretation || '';

  // Build functional steps HTML
  const stepsHtml = steps.length ? steps.filter(s => s).map((s) => {
    // Parse bold markdown (**text**) and remove Step X prefix
    const rendered = String(s)
      .replace(/^(?:Step\\s*\\d+\\s*[:\\-\\.]?\\s*)+/gi, '')
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    return `<li class="ucv-step">${rendered}</li>`;
  }).join('') : '<li class="ucv-step" style="color:#9ca3af">No functional steps provided</li>';

  // Build parameter scoring HTML — score is typically out of weight (max), bar shows score/weight %
  const paramsHtml = params.length ? params.map(p => {
    const pName = p.parameter || p.name || '';

    // Robustly parse weight and score, even if they are strings or missing
    const rawW = p.weight;
    const rawS = p.score;
    const pWeight = rawW !== undefined && rawW !== null && rawW !== '' ? Number(rawW) : NaN;
    const pScore = rawS !== undefined && rawS !== null && rawS !== '' ? Number(rawS) : NaN;

    // Weight is valid if it's a number. Treat 0 as invalid/missing weight to avoid div by zero.
    const hasWeight = !isNaN(pWeight) && pWeight !== 0;
    const hasScore = !isNaN(pScore);
    const pJust = p.justification || p.reason || p.rationale || '';

    // Bar percentage: score / weight if both exist, otherwise score / 10 as fallback if score < 10
    let pct = 0;
    if (hasScore && hasWeight) {
      pct = Math.min(100, Math.round((pScore / pWeight) * 100));
    } else if (hasScore) {
      // If we only have score, assume it's out of 10 if score <= 10, else out of 100
      pct = Math.min(100, Math.round(pScore <= 10 ? pScore * 10 : pScore));
    }
    const barColor = pct >= 70 ? 'green' : pct >= 40 ? 'orange' : 'red';

    // Build badges — only show if value exists
    const weightBadge = hasWeight ? `<span class="ucv-param-badge">Weight: <strong>${pWeight}</strong></span>` : '';
    const scoreBadge = hasScore ? `<span class="ucv-param-badge score">Score: <strong>${pScore}</strong></span>` : '';

    return `<div class="ucv-param-card card tooltip-container">
      <div class="ucv-param-header">
        <span class="ucv-param-name">${pName}</span>
        <div class="ucv-param-scores">${weightBadge}${scoreBadge}</div>
      </div>
      <div class="dim-bar" style="margin:8px 0"><i class="${barColor}" style="width:${pct}%"></i></div>
      ${pJust ? `<div class="ucv-tooltip-hover">${pJust}</div>` : ''}
    </div>`;
  }).join('') : '<div class="card" style="padding:20px;color:#9ca3af">No parameter scoring data available</div>';

  // Business benefit score label
  const bbsLabel = bbsScore >= 80 ? 'Excellent' : bbsScore >= 60 ? 'Strong' : bbsScore >= 40 ? 'Moderate' : 'Low';
  const bbsGrad = bbsScore >= 80 ? 'linear-gradient(135deg,#10b981,#059669)' : bbsScore >= 60 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : bbsScore >= 40 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#ef4444,#dc2626)';

  // Render any extra top-level fields from the use case dynamically (skip known ones)
  const knownKeys = new Set(['title', 'use_case', 'name', 'description', 'functional_steps', 'steps', 'parameter_scoring', 'parameters', 'business_benefit_score', 'rating', 'domain', 'category', 'industry', 'benefits', 'details', 'score']);
  const extraSections = Object.entries(uc)
    .filter(([k]) => !knownKeys.has(k))
    .map(([k, v]) => {
      if (v === null || v === undefined || v === '') return '';
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (typeof v === 'string') return `<div class="sec-title">${label}</div><div class="card ucv-interp-card"><p>${v}</p></div>`;
      if (Array.isArray(v)) return `<div class="sec-title">${label}</div><div class="card ucv-interp-card"><ul style="margin:0;padding-left:18px">${v.map(i => `<li style="margin-bottom:6px;line-height:1.65">${typeof i === 'object' ? JSON.stringify(i) : i}</li>`).join('')}</ul></div>`;
      return '';
    }).join('');

  app.innerHTML = topNav('disc') + `
<main class="page fade-up">
  <div class="ph" style="display:flex;justify-content:space-between;align-items:center;">
    <h1 style="margin:0"><button class="back-btn" onclick="go('/use-cases/company')">${ic('arrleft')}</button> Use Case Details: ${title}</h1>
  </div>

  <div class="ucv-company-header card">
    <div class="ucv-company-info">
      <div class="ucv-company-icon">${companyName ? companyName[0].toUpperCase() : 'C'}</div>
      <div>
        <div class="ucv-company-name">${companyName}</div>
        ${industry ? `<div class="ucv-company-industry">${industry}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="ucv-hero-grid">
    <div class="ucv-bbs-card" style="background:${bbsGrad}">
      <h5>Business Benefit Score</h5>
      ${donut(bbsScore)}
      <div class="score-sub">${bbsLabel} ROI potential</div>
    </div>
    <div class="ucv-desc-card card">
      <h4>Description</h4>
      <p>${desc}</p>
    </div>
  </div>

  ${bbsInterp ? `<div class="sec-title">Business Benefit Interpretation</div><div class="card ucv-interp-card"><p>${bbsInterp}</p></div>` : ''}

  <div class="sec-title">Functional Steps</div>
  <div class="card ucv-steps-card">
    <ol class="ucv-steps-list">${stepsHtml}</ol>
  </div>

  <div class="sec-title">Parameter Scoring</div>
  <div class="ucv-params-grid">${paramsHtml}</div>

  ${extraSections}
</main>`;
  bindNav();
}

render();

