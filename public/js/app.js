// P2P Downloader Controller
const app = {
  currentTab: 'files',
  authMode: 'login',
  activeDownloads: [],
  allFiles: [],
  adminUsersList: [],

  async init() {
    this.checkSession();
    await this.refreshFiles();

    window.addEventListener('p2p:peer-update', (e) => {
      // Peer count update
    });
  },

  checkSession() {
    const user = API.getCurrentUser();
    const token = API.getToken();

    const btnOpenAuth = document.getElementById('btnOpenAuth');
    const userProfilePill = document.getElementById('userProfilePill');
    const adminTabBtn = document.getElementById('adminTabBtn');

    if (token && user) {
      btnOpenAuth.classList.add('hidden');
      userProfilePill.classList.remove('hidden');
      userProfilePill.classList.add('flex');

      document.getElementById('headerUserName').textContent = user.name;
      document.getElementById('headerUserRole').textContent = user.role;
      const statusEl = document.getElementById('headerUserStatus');
      statusEl.textContent = user.status;
      statusEl.className = user.status === 'Frozen' ? 'badge badge-frozen' : 'badge badge-active';

      if (user.role === 'Admin') {
        adminTabBtn.classList.remove('hidden');
        adminTabBtn.classList.add('flex');
      } else {
        adminTabBtn.classList.add('hidden');
      }

      window.p2pClient.init(user);
      this.populateProfile(user);
    } else {
      btnOpenAuth.classList.remove('hidden');
      userProfilePill.classList.add('hidden');
      adminTabBtn.classList.add('hidden');
      window.p2pClient.init(null);
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    document.querySelectorAll('.nav-btn').forEach((btn) => {
      const target = btn.getAttribute('data-tab');
      if (target === tabName) {
        btn.className =
          'nav-btn px-3 py-1.5 rounded text-xs font-medium text-[#f0f6fc] bg-[#21262d] border border-[#30363d] flex items-center gap-1.5';
      } else if (target === 'admin') {
        btn.className =
          'nav-btn px-3 py-1.5 rounded text-xs font-medium text-[#d29922] hover:bg-[#21262d] flex items-center gap-1.5';
      } else {
        btn.className =
          'nav-btn px-3 py-1.5 rounded text-xs font-medium text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] flex items-center gap-1.5';
      }
    });

    document.querySelectorAll('.tab-view').forEach((view) => {
      view.classList.add('hidden');
    });

    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) activeView.classList.remove('hidden');

    if (tabName === 'history') {
      this.loadUserHistory();
    } else if (tabName === 'admin') {
      this.loadAdminData();
    }
  },

  openAuthModal() {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('authModal').classList.add('flex');
    this.setAuthMode('login');
  },

  closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('authModal').classList.remove('flex');
    document.getElementById('authErrorMsg').classList.add('hidden');
  },

  setAuthMode(mode) {
    this.authMode = mode;
    const tabBtnLogin = document.getElementById('tabBtnLogin');
    const tabBtnRegister = document.getElementById('tabBtnRegister');
    const nameField = document.getElementById('authNameField');
    const roleField = document.getElementById('authRoleField');
    const submitBtn = document.getElementById('authSubmitBtn');
    const errorBox = document.getElementById('authErrorMsg');
    errorBox.classList.add('hidden');

    if (mode === 'login') {
      tabBtnLogin.className = 'flex-1 pb-2 border-b-2 border-[#388bfd] text-[#f0f6fc]';
      tabBtnRegister.className = 'flex-1 pb-2 border-b-2 border-transparent text-[#8b949e] hover:text-[#f0f6fc]';
      nameField.classList.add('hidden');
      roleField.classList.add('hidden');
      submitBtn.textContent = 'Sign in';
    } else {
      tabBtnRegister.className = 'flex-1 pb-2 border-b-2 border-[#388bfd] text-[#f0f6fc]';
      tabBtnLogin.className = 'flex-1 pb-2 border-b-2 border-transparent text-[#8b949e] hover:text-[#f0f6fc]';
      nameField.classList.remove('hidden');
      roleField.classList.remove('hidden');
      submitBtn.textContent = 'Create account';
    }
  },

  fillDemoAccount(type) {
    if (type === 'admin') {
      document.getElementById('authEmail').value = 'admin@p2p.com';
      document.getElementById('authPassword').value = 'admin123';
      this.setAuthMode('login');
    } else {
      document.getElementById('authEmail').value = 'user@p2p.com';
      document.getElementById('authPassword').value = 'user123';
      this.setAuthMode('login');
    }
  },

  async handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;
    const role = document.getElementById('authRole').value;
    const errorBox = document.getElementById('authErrorMsg');

    errorBox.classList.add('hidden');

    try {
      if (this.authMode === 'login') {
        await API.login(email, password);
        this.notify('Signed in successfully', 'success');
      } else {
        await API.register(name, email, password, role);
        this.notify('Account created', 'success');
      }
      this.closeAuthModal();
      this.checkSession();
      this.refreshFiles();
    } catch (err) {
      errorBox.textContent = err.message || 'Authentication failed';
      errorBox.classList.remove('hidden');
    }
  },

  async refreshFiles() {
    const grid = document.getElementById('filesGrid');
    try {
      const res = await API.getFiles();
      this.allFiles = res.files || [];

      if (this.allFiles.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full panel p-8 text-center text-[#8b949e] text-xs">
            No files currently seeded in the network.
          </div>
        `;
        return;
      }

      grid.innerHTML = this.allFiles
        .map((f) => {
          const formattedSize = this.formatBytes(f.file_size);
          const shortHash = f.file_hash ? f.file_hash.slice(0, 10) + '...' : 'n/a';

          return `
            <div class="card p-4 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-start justify-between gap-2">
                  <div class="font-medium text-xs text-[#f0f6fc] truncate" title="${this.escapeHtml(f.file_name)}">
                    ${this.escapeHtml(f.file_name)}
                  </div>
                  <span class="badge font-mono text-[10px]">
                    ${f.total_chunks} chunks
                  </span>
                </div>

                <p class="text-xs text-[#8b949e] mt-1 line-clamp-2">
                  ${this.escapeHtml(f.description || 'P2P network file')}
                </p>

                <div class="mt-3 pt-2.5 border-t border-[#21262d] space-y-1 text-xs text-[#8b949e]">
                  <div class="flex justify-between">
                    <span>Size</span>
                    <span class="font-mono text-[#f0f6fc]">${formattedSize}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Seeder</span>
                    <span class="text-[#f0f6fc] truncate max-w-[130px]">${this.escapeHtml(f.uploader_name || 'Node')}</span>
                  </div>
                  <div class="flex justify-between font-mono text-[11px]">
                    <span>SHA-256</span>
                    <span class="text-[#8b949e] hover:text-[#f0f6fc] cursor-pointer" title="Copy hash" onclick="app.copyText('${f.file_hash}')">${shortHash}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1 border-t border-[#21262d]">
                <button onclick="app.inspectFileManifest('${f.file_id}')" class="btn-secondary flex-1 justify-center text-xs py-1">
                  Manifest
                </button>
                <button onclick="app.startDownload('${f.file_id}')" class="btn-primary flex-1 justify-center text-xs py-1">
                  Download
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      grid.innerHTML = `
        <div class="col-span-full panel p-6 text-center text-[#f85149] text-xs">
          Failed to load files: ${err.message}
        </div>
      `;
    }
  },

  openShareModal() {
    const user = API.getCurrentUser();
    if (!user) {
      this.openAuthModal();
      this.notify('Sign in to share files', 'warning');
      return;
    }
    if (user.status === 'Frozen') {
      this.notify('Account is frozen', 'error');
      return;
    }
    document.getElementById('shareModal').classList.remove('hidden');
    document.getElementById('shareModal').classList.add('flex');
    document.getElementById('shareLoadingBar').classList.add('hidden');
  },

  closeShareModal() {
    document.getElementById('shareModal').classList.add('hidden');
    document.getElementById('shareModal').classList.remove('flex');
    document.getElementById('shareFileForm').reset();
  },

  async handleShareFile(e) {
    e.preventDefault();
    const fileInput = document.getElementById('shareFileInput');
    const descInput = document.getElementById('shareFileDesc');
    const submitBtn = document.getElementById('btnShareSubmit');
    const loadingBar = document.getElementById('shareLoadingBar');

    if (!fileInput.files || fileInput.files.length === 0) {
      this.notify('Select a file to share', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('description', descInput.value);

    try {
      submitBtn.disabled = true;
      loadingBar.classList.remove('hidden');

      const res = await API.uploadFile(formData);
      this.notify(`Seeded "${res.file.file_name}" (${res.file.total_chunks} chunks)`, 'success');

      this.closeShareModal();
      await this.refreshFiles();
    } catch (err) {
      this.notify(err.message || 'Upload failed', 'error');
    } finally {
      submitBtn.disabled = false;
      loadingBar.classList.add('hidden');
    }
  },

  async inspectFileManifest(fileId) {
    try {
      const res = await API.getFileDetails(fileId);
      const file = res.file;

      document.getElementById('manifestFileName').textContent = file.file_name;
      document.getElementById('manifestMeta').textContent = `${this.formatBytes(file.file_size)} · ${file.total_chunks} chunks · SHA-256: ${file.file_hash.slice(0, 16)}...`;

      const listContainer = document.getElementById('manifestChunksList');
      listContainer.innerHTML = file.chunks
        .map(
          (c) => `
          <div class="p-2.5 rounded bg-[#0d1117] border border-[#21262d] text-xs flex items-center justify-between font-mono">
            <div>
              <div class="text-[#f0f6fc] font-medium">Piece #${c.chunk_index} (${this.formatBytes(c.chunk_size)})</div>
              <div class="text-[11px] text-[#8b949e] truncate max-w-sm mt-0.5">SHA-256: ${c.chunk_hash}</div>
            </div>
            <a href="/api/files/chunk/${c.chunk_id}" download="${c.chunk_id}.bin" class="btn-secondary text-[11px] py-0.5 px-2">
              Binary
            </a>
          </div>
        `
        )
        .join('');

      document.getElementById('manifestModal').classList.remove('hidden');
      document.getElementById('manifestModal').classList.add('flex');
    } catch (err) {
      this.notify('Failed to load manifest: ' + err.message, 'error');
    }
  },

  closeManifestModal() {
    document.getElementById('manifestModal').classList.add('hidden');
    document.getElementById('manifestModal').classList.remove('flex');
  },

  async startDownload(fileId) {
    const user = API.getCurrentUser();
    if (!user) {
      this.openAuthModal();
      this.notify('Sign in to download files', 'warning');
      return;
    }
    if (user.status === 'Frozen') {
      this.notify('Account is frozen', 'error');
      return;
    }

    try {
      this.notify('Connecting to swarm peers...', 'info');
      const res = await API.initiateDownload(fileId);

      this.switchTab('downloads');
      this.renderDownloadProgressCard(res);
      this.notify(`Downloaded "${res.file.file_name}"`, 'success');
    } catch (err) {
      this.notify(err.message || 'Download failed', 'error');
    }
  },

  renderDownloadProgressCard(dlData) {
    const container = document.getElementById('downloadsContainer');
    const file = dlData.file;
    const swarm = dlData.p2p_swarm;
    const chunks = swarm.chunk_details || [];

    if (container.querySelector('.ph-tray')) {
      container.innerHTML = '';
    }

    const token = API.getToken();
    const saveUrl = token ? `${dlData.download_url}?token=${encodeURIComponent(token)}` : dlData.download_url;
    const cardId = `dl-card-${dlData.download.download_id}`;
    const cardHtml = `
      <div id="${cardId}" class="panel p-4 space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#21262d] pb-2.5">
          <div>
            <div class="flex items-center space-x-2">
              <span class="badge badge-active font-mono text-[10px]">Verified</span>
              <h3 class="text-sm font-semibold text-[#f0f6fc]">${this.escapeHtml(file.file_name)}</h3>
            </div>
            <p class="text-xs text-[#8b949e] mt-0.5">
              Source: <span class="font-mono text-[#f0f6fc]">${swarm.source_peer}</span> · Size: ${this.formatBytes(file.file_size)}
            </p>
          </div>
          <div>
            <a href="${saveUrl}" download="${this.escapeHtml(file.file_name)}" class="btn-primary text-xs py-1">
              Save file
            </a>
          </div>
        </div>

        <div class="space-y-1">
          <div class="flex justify-between text-xs text-[#8b949e] font-mono">
            <span>Progress: 100%</span>
            <span>${file.total_chunks}/${file.total_chunks} chunks</span>
          </div>
          <div class="w-full bg-[#0d1117] h-1.5 rounded overflow-hidden border border-[#21262d]">
            <div class="bg-[#238636] h-full w-full"></div>
          </div>
        </div>

        <div>
          <div class="text-[11px] text-[#8b949e] mb-1 font-mono">Piece map (${chunks.length} chunks):</div>
          <div class="chunk-grid">
            ${chunks
              .map(
                (c) => `
                <div class="chunk-block verified" title="Piece #${c.chunk_index} | ${this.formatBytes(c.size)} | Seeder: ${c.source_peer}"></div>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="p-2 rounded bg-[#0d1117] border border-[#21262d] text-xs font-mono text-[#8b949e] flex justify-between items-center">
          <span class="truncate">Root SHA-256: <span class="text-[#f0f6fc]">${swarm.integrity_hash}</span></span>
          <span class="text-[#3fb950] font-medium shrink-0 ml-2">Verified</span>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('afterbegin', cardHtml);
  },

  async loadUserHistory() {
    const user = API.getCurrentUser();
    if (!user) {
      this.openAuthModal();
      return;
    }

    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-[#8b949e]">Loading history...</td></tr>`;

    try {
      const res = await API.getHistory();
      const history = res.history || [];

      if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-[#8b949e]">No activity recorded.</td></tr>`;
        return;
      }

      tbody.innerHTML = history
        .map(
          (h) => `
          <tr>
            <td class="font-mono text-[11px] text-[#8b949e]">${h.history_id}</td>
            <td>
              <span class="badge font-mono text-[10px]">
                ${h.activity}
              </span>
            </td>
            <td class="text-[#f0f6fc] text-xs">${this.escapeHtml(h.description)}</td>
            <td class="text-right font-mono text-[11px] text-[#8b949e]">${new Date(h.timestamp).toLocaleString()}</td>
          </tr>
        `
        )
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-[#f85149]">${err.message}</td></tr>`;
    }
  },

  populateProfile(user) {
    document.getElementById('profileCardName').textContent = user.name;
    document.getElementById('profileCardEmail').textContent = user.email;
    document.getElementById('profileCardId').textContent = user.user_id;
    document.getElementById('profileCardRole').textContent = user.role;
    const statusBadge = document.getElementById('profileCardStatus');
    statusBadge.textContent = user.status;
    statusBadge.className = user.status === 'Frozen' ? 'badge badge-frozen' : 'badge badge-active';
    document.getElementById('profileCardCreated').textContent = new Date(user.created_at || Date.now()).toLocaleDateString();

    document.getElementById('updateProfileName').value = user.name;
  },

  async handleUpdateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('updateProfileName').value;
    const password = document.getElementById('updateProfilePassword').value;

    const data = {};
    if (name.trim()) data.name = name.trim();
    if (password.trim()) data.password = password.trim();

    try {
      await API.updateProfile(data);
      this.notify('Profile updated', 'success');
      document.getElementById('updateProfilePassword').value = '';
      this.checkSession();
    } catch (err) {
      this.notify(err.message || 'Update failed', 'error');
    }
  },

  async loadAdminData() {
    const user = API.getCurrentUser();
    if (!user || user.role !== 'Admin') {
      this.notify('Admin access required', 'error');
      this.switchTab('files');
      return;
    }

    try {
      const statsRes = await API.getAdminStats();
      if (statsRes.stats) {
        const s = statsRes.stats;
        document.getElementById('statTotalUsers').textContent = s.totalUsers;
        document.getElementById('statActiveUsers').textContent = s.activeUsers;
        document.getElementById('statFrozenUsers').textContent = s.frozenUsers;
        document.getElementById('statTotalDownloads').textContent = s.totalDownloads;
        document.getElementById('statTotalFiles').textContent = s.totalFiles;
        document.getElementById('statActivePeers').textContent = s.activePeers;
      }

      const usersRes = await API.getAdminUsers();
      this.adminUsersList = usersRes.users || [];
      this.renderAdminUsers(this.adminUsersList);

      const dlRes = await API.getAdminDownloads();
      this.renderAdminDownloads(dlRes.downloads || []);
    } catch (err) {
      this.notify('Admin data error: ' + err.message, 'error');
    }
  },

  renderAdminUsers(users) {
    const tbody = document.getElementById('adminUsersTableBody');
    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-[#8b949e]">No users found</td></tr>`;
      return;
    }

    tbody.innerHTML = users
      .map((u) => {
        const isFrozen = u.status === 'Frozen';
        const isAdmin = u.role === 'Admin';

        return `
        <tr>
          <td class="font-mono text-[11px] text-[#8b949e]">${u.user_id}</td>
          <td class="font-medium text-[#f0f6fc] text-xs">${this.escapeHtml(u.name)}</td>
          <td class="font-mono text-xs text-[#8b949e]">${this.escapeHtml(u.email)}</td>
          <td>
            <span class="badge ${isAdmin ? 'badge-admin' : ''}">${u.role}</span>
          </td>
          <td>
            <span class="badge ${isFrozen ? 'badge-frozen' : 'badge-active'}">${u.status}</span>
          </td>
          <td class="font-mono text-xs text-[#f0f6fc]">${u.total_downloads || 0}</td>
          <td class="text-right">
            ${
              isAdmin
                ? `<span class="text-[11px] text-[#6e7681]">Protected</span>`
                : isFrozen
                ? `<button onclick="app.unfreezeUser('${u.user_id}')" class="btn-outline-green">Unfreeze</button>`
                : `<button onclick="app.freezeUser('${u.user_id}')" class="btn-danger">Freeze</button>`
            }
          </td>
        </tr>
      `;
      })
      .join('');
  },

  filterAdminUsers() {
    const q = (document.getElementById('adminUserFilter').value || '').toLowerCase();
    const filtered = this.adminUsersList.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q)
    );
    this.renderAdminUsers(filtered);
  },

  async freezeUser(userId) {
    if (!confirm('Freeze this user account?')) return;
    try {
      const res = await API.freezeUser(userId);
      this.notify(res.message, 'success');
      await this.loadAdminData();
    } catch (err) {
      this.notify(err.message || 'Freeze failed', 'error');
    }
  },

  async unfreezeUser(userId) {
    try {
      const res = await API.unfreezeUser(userId);
      this.notify(res.message, 'success');
      await this.loadAdminData();
    } catch (err) {
      this.notify(err.message || 'Unfreeze failed', 'error');
    }
  },

  renderAdminDownloads(downloads) {
    const tbody = document.getElementById('adminDownloadsTableBody');
    if (downloads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-[#8b949e]">No downloads recorded</td></tr>`;
      return;
    }

    tbody.innerHTML = downloads
      .map(
        (d) => `
        <tr>
          <td class="font-mono text-[11px] text-[#8b949e]">${d.download_id}</td>
          <td class="text-xs text-[#f0f6fc]">
            <div>${this.escapeHtml(d.user_name)}</div>
            <div class="text-[#6e7681] text-[10px] font-mono">${d.user_id}</div>
          </td>
          <td class="text-xs text-[#f0f6fc] font-medium">${this.escapeHtml(d.file_name)}</td>
          <td class="text-xs font-mono text-[#8b949e] truncate max-w-[140px]">${this.escapeHtml(d.source_peer)}</td>
          <td class="text-xs font-mono text-[#f0f6fc]">${this.formatBytes(d.file_size)}</td>
          <td>
            <span class="badge ${d.download_status === 'Completed' ? 'badge-active' : ''}">
              ${d.download_status}
            </span>
          </td>
          <td class="text-right font-mono text-[11px] text-[#8b949e]">${new Date(d.started_at).toLocaleString()}</td>
        </tr>
      `
      )
      .join('');
  },

  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  copyText(text) {
    navigator.clipboard.writeText(text);
    this.notify('Hash copied', 'info');
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  notify(msg, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const toast = document.createElement('div');
    const colorClass =
      type === 'error'
        ? 'border-[#da3633] text-[#f85149]'
        : type === 'success'
        ? 'border-[#238636] text-[#3fb950]'
        : 'border-[#30363d] text-[#f0f6fc]';

    toast.className = `p-2.5 rounded bg-[#161b22] border shadow-lg text-xs flex items-center gap-2 pointer-events-auto transition-opacity duration-150 opacity-0 ${colorClass}`;
    toast.innerHTML = `<span>${this.escapeHtml(msg)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 150);
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  app.init();
});
