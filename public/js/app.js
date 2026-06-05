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
      const res = await fetch('/api/check-roblox');
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
        const isActive = status === 'online' || status === 'in_game';

        const div = document.createElement('div');
        div.className = 'user-item';

        const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';

        div.innerHTML = `
          <div class="status-dot ${status}">
            <div class="status-dot-inner"></div>
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
  // INITIAL LOAD
  // ============================================
  fetchStatus();
});
