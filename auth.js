// ══════════════════════════════════════════════════════
// HCS-ISMS — AUTENTIKASI PIN (dipakai bersama di semua halaman)
// Sertakan dengan: <script src="auth.js"></script>
// Lalu panggil: Auth.requireLogin(['ROLE-ADMIN','ROLE-OWNER']).then(user => { ...init halaman... });
// ══════════════════════════════════════════════════════

const AUTH_GAS_URL = 'https://script.google.com/macros/s/AKfycbxjdx0xB0Bi-McWDOBTgAgc-ul2wKr2M_ezZhB3Lf3O17EgJthzaR1WoHElYroPMs-cVQ/exec';

const ROLE_LABEL = {
  'ROLE-ADMIN': 'Admin',
  'ROLE-TEKNISI': 'Teknisi',
  'ROLE-HELPER': 'Helper',
  'ROLE-SUPERVISOR': 'Supervisor / Kepala Teknisi',
  'ROLE-OWNER': 'Owner / Management',
};

const Auth = {
  SESSION_KEY: 'hcsisms_session',

  getSession() {
    try { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); } catch (e) { return null; }
  },
  setSession(user) { localStorage.setItem(this.SESSION_KEY, JSON.stringify(user)); },
  clearSession() { localStorage.removeItem(this.SESSION_KEY); },

  async loginRequest(pin) {
    const res = await fetch(AUTH_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'loginPIN', pin }),
    });
    return res.json();
  },

  logout() { this.clearSession(); location.reload(); },

  injectStyles() {
    if (document.getElementById('authStyles')) return;
    const style = document.createElement('style');
    style.id = 'authStyles';
    style.textContent = `
      #authOverlay { position: fixed; inset: 0; background: #1A3557; z-index: 9999;
        display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #authBox { background: white; border-radius: 16px; padding: 32px 24px; width: 90%; max-width: 340px; text-align: center; }
      #authBox h1 { font-size: 20px; color: #1A3557; margin-bottom: 4px; }
      #authBox p { font-size: 12.5px; color: #64748B; margin-bottom: 20px; }
      #authPinInput { width: 100%; padding: 14px; font-size: 24px; text-align: center; letter-spacing: 8px;
        border: 2px solid #E2E8F0; border-radius: 10px; margin-bottom: 12px; }
      #authPinInput:focus { outline: none; border-color: #2C6AA0; }
      #authBtn { width: 100%; padding: 13px; background: #2C6AA0; color: white; border: none;
        border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
      #authError { color: #C0392B; font-size: 12.5px; margin-top: 10px; min-height: 16px; }
      #authBadge { position: fixed; top: 8px; right: 8px; background: #1A3557; color: white;
        padding: 6px 12px; border-radius: 20px; font-size: 11px; z-index: 9998; display: flex;
        align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
      #authBadge button { background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px;
        padding: 3px 8px; font-size: 10.5px; cursor: pointer; }
      #authDenied { position: fixed; inset: 0; background: white; z-index: 9999; display: flex;
        flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    `;
    document.head.appendChild(style);
  },

  showLoginModal(allowedRoles, resolve) {
    this.injectStyles();
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.innerHTML = `
      <div id="authBox">
        <h1>🔒 HCS-ISMS</h1>
        <p>Masukkan PIN untuk masuk</p>
        <input id="authPinInput" type="password" inputmode="numeric" maxlength="6" placeholder="••••">
        <button id="authBtn">Masuk</button>
        <div id="authError"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = document.getElementById('authPinInput');
    const btn = document.getElementById('authBtn');
    const errBox = document.getElementById('authError');
    input.focus();

    const doLogin = async () => {
      const pin = input.value.trim();
      if (!pin) return;
      btn.disabled = true; btn.textContent = 'Memeriksa...';
      const r = await this.loginRequest(pin);
      btn.disabled = false; btn.textContent = 'Masuk';
      if (!r.success) { errBox.textContent = r.error || 'PIN salah'; input.value = ''; input.focus(); return; }
      if (allowedRoles && !allowedRoles.includes(r.data.roleId)) {
        overlay.remove();
        this.showAccessDenied(r.data, allowedRoles);
        return;
      }
      this.setSession(r.data);
      overlay.remove();
      this.renderBadge(r.data);
      resolve(r.data);
    };
    btn.addEventListener('click', doLogin);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  },

  showAccessDenied(user, allowedRoles) {
    this.injectStyles();
    const roleNamaAllowed = (allowedRoles || []).map(r => ROLE_LABEL[r] || r).join(', ');
    const div = document.createElement('div');
    div.id = 'authDenied';
    div.innerHTML = `
      <div style="font-size:40px;margin-bottom:10px">🚫</div>
      <div style="font-weight:700;color:#1A3557;font-size:16px;margin-bottom:6px">Akses Ditolak</div>
      <div style="font-size:13px;color:#64748B;margin-bottom:4px">Halaman ini khusus untuk: <b>${roleNamaAllowed}</b></div>
      <div style="font-size:13px;color:#64748B;margin-bottom:20px">Akun Anda (${user.nama} — ${ROLE_LABEL[user.roleId] || user.roleId}) tidak punya akses ke sini.</div>
      <button onclick="Auth.logout()" style="padding:10px 20px;background:#2C6AA0;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer">Login dengan PIN Lain</button>
    `;
    document.body.appendChild(div);
  },

  renderBadge(user) {
    this.injectStyles();
    const existing = document.getElementById('authBadge');
    if (existing) existing.remove();
    const badge = document.createElement('div');
    badge.id = 'authBadge';
    badge.innerHTML = `<span>${user.nama} · ${ROLE_LABEL[user.roleId] || user.roleId}</span><button onclick="Auth.logout()">Keluar</button>`;
    document.body.appendChild(badge);
  },

  // Panggil ini di awal setiap halaman. allowedRoles = array Role_ID yang
  // boleh akses (kosongkan / null kalau semua role boleh masuk asal login).
  requireLogin(allowedRoles) {
    return new Promise((resolve) => {
      const existing = this.getSession();
      if (existing) {
        if (allowedRoles && !allowedRoles.includes(existing.roleId)) {
          this.showAccessDenied(existing, allowedRoles);
          return; // halaman diblokir, tidak resolve
        }
        this.renderBadge(existing);
        resolve(existing);
        return;
      }
      this.showLoginModal(allowedRoles, resolve);
    });
  },
};
