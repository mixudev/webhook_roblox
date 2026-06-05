document.addEventListener('DOMContentLoaded', () => {

  // ============================================
  // NAVIGATION ROUTING
  // ============================================
  const navTabs = document.querySelectorAll('.nav-tab');
  const pages = document.querySelectorAll('.page-view');
  let currentPage = 'dashboard';

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const page = tab.dataset.page;
      if (page === currentPage) return;
      currentPage = page;

      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      pages.forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`)?.classList.add('active');

      hideAlerts();

      if (page === 'dashboard') fetchStatus();
      else if (page === 'settings') loadSettings();
      else if (page === 'logs') loadLogs();
      else if (page === 'health') loadHealth();
    });
  });

  // ============================================
  // ALERT HELPERS
  // ============================================
  const alertSuccess = document.getElementById('alert-success');
  const alertError = document.getElementById('alert-error');

  function showSuccess(msg) {
    alertError.classList.remove('visible');
    alertSuccess.textContent = msg;
    alertSuccess.classList.add('visible');
    setTimeout(() => alertSuccess.classList.remove('visible'), 4000);
  }

  function showError(msg) {
    alertSuccess.classList.remove('visible');
    alertError.textContent = msg;
    alertError.classList.add('visible');
    setTimeout(() => alertError.classList.remove('visible'), 6000);
  }

  function hideAlerts() {
    alertSuccess.classList.remove('visible');
    alertError.classList.remove('visible');
  }

  // ============================================
  // STATUS LABEL & COLOR HELPER
  // ============================================
  const STATUS_LABEL = {
    offline: 'Offline',
    online: 'Online',
    in_game: 'In Game',
    studio: 'In Studio'
  };

  // ============================================
  // DASHBOARD - FETCH STATUS
  // ============================================
  const userList = document.getElementById('user-list');
  const checkBtn = document.getElementById('check-btn');
  const checkBtnText = document.getElementById('check-btn-text');
  const statOnline = document.getElementById('stat-online');
  const statIngame = document.getElementById('stat-ingame');
  const statOffline = document.getElementById('stat-offline');

  async function fetchStatus() {
    checkBtn.disabled = true;
    checkBtnText.innerHTML = '<div class="spinner"></div>';

    try {
      // Use /api/status (no auth) — read cached state for display
      const res = await fetch('/api/status');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || d.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const items = data.results ? data.results : (data.username ? [data] : []);

      if (items.length === 0) {
        userList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <p>No users configured.<br>Go to <strong>Settings</strong> to add players.</p>
          </div>`;
        statOnline.textContent = '0';
        statIngame.textContent = '0';
        statOffline.textContent = '0';
        return;
      }

      // Update stats
      const counts = { online: 0, in_game: 0, offline: 0, studio: 0 };
      items.forEach(i => {
        if (counts[i.new_status] !== undefined) counts[i.new_status]++;
        else counts.offline++;
      });
      statOnline.textContent = counts.online;
      statIngame.textContent = counts.in_game;
      statOffline.textContent = counts.offline + counts.studio;

      // Build list
      userList.innerHTML = '';
      items.forEach(item => {
        const status = item.new_status || 'offline';
        const userId = item.userId || null;
        const avatarSrc = userId
          ? `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`
          : null;

        const div = document.createElement('div');
        div.className = 'user-item';

        const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

        div.innerHTML = `
          <div class="user-avatar-wrap">
            ${avatarSrc
              ? `<img class="user-avatar" src="${avatarSrc}" alt="${item.username}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.user-avatar-fallback').style.display='flex'">
                 <div class="user-avatar-fallback" style="display:none">${(item.displayName || item.username).charAt(0).toUpperCase()}</div>`
              : `<div class="user-avatar-fallback">${(item.displayName || item.username).charAt(0).toUpperCase()}</div>`
            }
            <div class="user-status-badge ${status}"></div>
          </div>
          <div class="user-info">
            <div class="user-display-name">${item.displayName || item.username}</div>
            <div class="user-username">@${item.username}</div>
          </div>
          <div class="user-meta">
            <span class="status-label ${status}">${STATUS_LABEL[status] || status}</span>
            <span class="user-timestamp">${time}</span>
            ${item.webhook_sent ? '<span class="webhook-chip">Notified</span>' : ''}
          </div>
        `;

        userList.appendChild(div);
      });

    } catch (err) {
      showError(`Status check failed: ${err.message}`);
      userList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>Could not fetch status.<br>Check your connection or config.</p>
        </div>`;
    } finally {
      checkBtn.disabled = false;
      checkBtnText.textContent = 'Refresh';
    }
  }

  checkBtn.addEventListener('click', fetchStatus);

  // ============================================
  // DASHBOARD - TEST WEBHOOK
  // ============================================
  const testWebhookBtn = document.getElementById('test-webhook-btn');
  const testWebhookText = document.getElementById('test-webhook-text');

  testWebhookBtn.addEventListener('click', async () => {
    testWebhookBtn.disabled = true;
    testWebhookText.innerHTML = '<div class="spinner"></div> Sending...';

    try {
      const res = await fetch('/api/test-webhook');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      showSuccess('✓ Test notification sent to Discord!');
    } catch (err) {
      showError(`Webhook failed: ${err.message}`);
    } finally {
      testWebhookBtn.disabled = false;
      testWebhookText.textContent = 'Send Test Notification';
    }
  });

  // ============================================
  // DASHBOARD - RESET STATUS
  // ============================================
  const resetStatusBtn = document.getElementById('reset-status-btn');
  const resetStatusText = document.getElementById('reset-status-text');

  resetStatusBtn.addEventListener('click', async () => {
    if (!confirm('Reset status semua user?\n\nStatus tersimpan akan dihapus, sehingga notifikasi akan dikirim ulang pada pengecekan berikutnya.')) return;

    resetStatusBtn.disabled = true;
    resetStatusText.innerHTML = '<div class="spinner"></div> Resetting...';

    try {
      const res = await fetch('/api/reset-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
      showSuccess(`✓ ${data.message}`);
    } catch (err) {
      showError(`Reset failed: ${err.message}`);
    } finally {
      resetStatusBtn.disabled = false;
      resetStatusText.textContent = 'Reset Status';
    }
  });

  // ============================================
  // SETTINGS - LOAD & MANAGE USERS
  // ============================================
  const settingsList = document.getElementById('settings-list');
  const settingsCount = document.getElementById('settings-count');
  const addUserForm = document.getElementById('add-user-form');
  const newUsernameInput = document.getElementById('new-username');
  const addUserBtn = document.getElementById('add-user-btn');
  const addUserText = document.getElementById('add-user-text');

  async function loadSettings() {
    settingsList.innerHTML = `<div class="empty-state"><p>Loading...</p></div>`;
    try {
      const res = await fetch('/api/manage-users');
      const data = await res.json();
      const users = data.users || [];

      settingsCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;

      if (users.length === 0) {
        settingsList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p>Watch list is empty.<br>Add a Roblox username above.</p>
          </div>`;
        return;
      }

      settingsList.innerHTML = '';
      users.forEach(username => {
        const div = document.createElement('div');
        div.className = 'settings-user-item';
        div.innerHTML = `
          <div class="settings-user-name">${username}</div>
          <button class="btn btn-danger btn-sm" data-remove="${username}">Remove</button>
        `;
        div.querySelector('button').addEventListener('click', () => removeUser(username));
        settingsList.appendChild(div);
      });
    } catch (err) {
      settingsList.innerHTML = `<div class="empty-state"><p>Failed to load users.</p></div>`;
      showError(`Load error: ${err.message}`);
    }
  }

  async function removeUser(username) {
    if (!confirm(`Remove "${username}" from watch list?`)) return;
    try {
      const res = await fetch('/api/manage-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', username })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showSuccess(data.message);
      loadSettings();
    } catch (err) {
      showError(`Remove failed: ${err.message}`);
    }
  }

  addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = newUsernameInput.value.trim();
    if (!username) return;

    addUserBtn.disabled = true;
    addUserText.innerHTML = '<div class="spinner"></div> Verifying...';

    try {
      const res = await fetch('/api/manage-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', username })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      newUsernameInput.value = '';
      showSuccess(`✓ ${data.message}`);
      loadSettings();
    } catch (err) {
      showError(`Add failed: ${err.message}`);
    } finally {
      addUserBtn.disabled = false;
      addUserText.textContent = 'Add to Watch List';
    }
  });

  // ============================================
  // LOGS - LOAD & CLEAR
  // ============================================
  const logsList = document.getElementById('logs-list');
  const clearLogsBtn = document.getElementById('clear-logs-btn');

  async function loadLogs() {
    logsList.innerHTML = `<div class="empty-state"><p>Loading...</p></div>`;
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      const logs = data.logs || [];

      if (logs.length === 0) {
        logsList.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>No activity yet.<br>Logs appear when presence changes.</p>
          </div>`;
        return;
      }

      logsList.innerHTML = '';
      logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-item';

        const oldStatus = log.old_status || 'offline';
        const newStatus = log.new_status || 'offline';
        const timeStr = log.timestamp
          ? new Date(log.timestamp).toLocaleString('id-ID', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : '—';

        div.innerHTML = `
          <div class="log-user">${log.displayName || log.username} <span style="font-weight: 400; color: var(--text-3); font-size: 0.8rem;">@${log.username}</span></div>
          <div class="log-transition">
            <span class="status-label ${oldStatus}">${STATUS_LABEL[oldStatus] || oldStatus}</span>
            <span class="log-arrow">→</span>
            <span class="status-label ${newStatus}">${STATUS_LABEL[newStatus] || newStatus}</span>
          </div>
          <div class="log-meta">
            <span class="log-time">${timeStr}</span>
            <span class="log-badge ${log.webhook_sent ? 'sent' : 'fail'}">${log.webhook_sent ? 'Notified' : 'Failed'}</span>
          </div>
        `;
        logsList.appendChild(div);
      });
    } catch (err) {
      logsList.innerHTML = `<div class="empty-state"><p>Failed to load logs.</p></div>`;
      showError(`Log error: ${err.message}`);
    }
  }

  clearLogsBtn.addEventListener('click', async () => {
    if (!confirm('Clear all activity logs?')) return;
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showSuccess(data.message);
      loadLogs();
    } catch (err) {
      showError(`Clear failed: ${err.message}`);
    }
  });

  // ============================================
  // HEALTH - LOAD DIAGNOSTICS
  // ============================================
  const healthSkeleton      = document.getElementById('health-skeleton');
  const healthChecksGrid    = document.getElementById('health-checks-grid');
  const healthBanner        = document.getElementById('health-banner');
  const healthBannerIcon    = document.getElementById('health-banner-icon');
  const healthBannerTitle   = document.getElementById('health-banner-title');
  const healthBannerSub     = document.getElementById('health-banner-sub');
  const healthRefreshBtn    = document.getElementById('health-refresh-btn');
  const healthRefreshBtn2   = document.getElementById('health-refresh-btn-2');
  const healthDebugCard     = document.getElementById('health-debug-card');
  const healthDebugToggle   = document.getElementById('health-debug-toggle');
  const healthDebugBody     = document.getElementById('health-debug-body');
  const healthDebugPre      = document.getElementById('health-debug-pre');
  const healthDebugChevron  = document.getElementById('health-debug-chevron');
  const healthLastActivityCard = document.getElementById('health-last-activity-card');
  const healthLastActivity  = document.getElementById('health-last-activity');

  // Icons per check id
  const CHECK_ICONS = {
    cron_secret:    `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    discord_webhook:`<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    upstash_redis:  `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    monitored_users:`<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    roblox_api:     `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    github_actions: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`
  };

  const CHECK_BADGE = { ok: 'OK', warn: 'Warning', error: 'Error', info: 'Info' };

  const BANNER_CONFIG = {
    ok:    { icon: '✓', title: 'Semua sistem berjalan normal', emoji: '🟢' },
    warn:  { icon: '!', title: 'Ada konfigurasi yang perlu diperhatikan', emoji: '🟡' },
    error: { icon: '✕', title: 'Ada masalah yang perlu diperbaiki', emoji: '🔴' }
  };

  async function loadHealth() {
    // Show skeleton, hide rest
    healthSkeleton.style.display = 'flex';
    healthSkeleton.style.flexDirection = 'column';
    healthSkeleton.style.gap = '0.5rem';
    healthChecksGrid.style.display = 'none';
    healthBanner.style.display = 'none';
    healthDebugCard.style.display = 'none';
    healthLastActivityCard.style.display = 'none';
    if (healthRefreshBtn) healthRefreshBtn.classList.add('spinning');

    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      // Banner
      const overall = data.overall || 'ok';
      const bc = BANNER_CONFIG[overall] || BANNER_CONFIG.ok;
      healthBanner.className = `health-banner ${overall}`;
      healthBannerIcon.textContent = bc.icon;
      healthBannerTitle.textContent = bc.title;
      healthBannerSub.textContent = new Date(data.timestamp).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      healthBanner.style.display = 'flex';

      // Hide skeleton, build cards
      healthSkeleton.style.display = 'none';
      healthChecksGrid.innerHTML = '';
      healthChecksGrid.className = 'health-checks-grid';

      (data.checks || []).forEach(check => {
        const card = document.createElement('div');
        card.className = `health-check-card ${check.status}`;

        const icon = CHECK_ICONS[check.id] || CHECK_ICONS.roblox_api;
        const badge = CHECK_BADGE[check.status] || check.status;
        const ping = check.ping != null ? `<div class="health-check-ping">⚡ ${check.ping}ms latency</div>` : '';

        card.innerHTML = `
          <div class="health-check-icon">${icon}</div>
          <div class="health-check-body">
            <div class="health-check-label">${check.label}</div>
            <div class="health-check-msg">${check.message}</div>
            ${ping}
          </div>
          <div class="health-check-badge">${badge}</div>
        `;
        healthChecksGrid.appendChild(card);
      });

      healthChecksGrid.style.display = 'flex';
      healthChecksGrid.style.flexDirection = 'column';

      // Debug panel
      if (data._debug) {
        healthDebugPre.textContent = JSON.stringify(data._debug, null, 2);
        healthDebugCard.style.display = 'block';
      }

      // Last activity
      if (data.lastActivity) {
        const la = data.lastActivity;
        const timeStr = la.timestamp
          ? new Date(la.timestamp).toLocaleString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';
        const STATUS_LABEL_HEALTH = { offline: 'Offline', online: 'Online', in_game: 'In Game', studio: 'Studio' };
        healthLastActivity.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.25rem;">
            <span style="font-weight:700; color:var(--text-1);">${la.displayName || la.username}</span>
            <span style="color: var(--text-3); font-size: 0.75rem; font-family:'Courier New',monospace;">${timeStr}</span>
          </div>
          <div style="margin-top:0.5rem; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <span class="status-label ${la.old_status}">${STATUS_LABEL_HEALTH[la.old_status] || la.old_status}</span>
            <span style="color:var(--text-3); font-size:0.75rem;">→</span>
            <span class="status-label ${la.new_status}">${STATUS_LABEL_HEALTH[la.new_status] || la.new_status}</span>
            ${la.webhook_sent
              ? '<span style="margin-left:auto; font-size:0.65rem; font-weight:700; background:var(--green-dim); color:var(--green); border:1px solid rgba(16,185,129,0.3); padding:2px 7px; text-transform:uppercase; letter-spacing:0.5px;">✓ Notified</span>'
              : '<span style="margin-left:auto; font-size:0.65rem; font-weight:700; background:var(--red-dim); color:var(--red); border:1px solid rgba(239,68,68,0.3); padding:2px 7px; text-transform:uppercase; letter-spacing:0.5px;">✕ Not sent</span>'}
          </div>
        `;
        healthLastActivityCard.style.display = 'block';
      }

      document.getElementById('health-refresh-fallback').style.display = 'none';

    } catch (err) {
      healthSkeleton.style.display = 'none';
      healthChecksGrid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p>Gagal memuat diagnostik:<br>${err.message}</p>
        </div>`;
      healthChecksGrid.style.display = 'block';
      showError(`Health check failed: ${err.message}`);
    } finally {
      if (healthRefreshBtn) healthRefreshBtn.classList.remove('spinning');
    }
  }

  healthRefreshBtn?.addEventListener('click', loadHealth);
  healthRefreshBtn2?.addEventListener('click', loadHealth);

  // Debug toggle accordion
  healthDebugToggle?.addEventListener('click', () => {
    const open = healthDebugBody.style.display !== 'none';
    healthDebugBody.style.display = open ? 'none' : 'block';
    healthDebugChevron.style.transform = open ? '' : 'rotate(180deg)';
  });

  // ============================================
  // INITIAL LOAD
  // ============================================
  fetchStatus();
});
