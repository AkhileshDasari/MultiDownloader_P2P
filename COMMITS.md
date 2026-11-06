# Git Commit Commands Guide

Here is the structured, chronological sequence of Git commit commands for the **Peer-to-Peer (P2P) Downloader** repository. Run these commands step-by-step from your terminal in the project root directory (`c:\Users\Voriganti\Downloads\webanalyticssite\p2p`).

---

### Step 0: Ensure Repository Initialization
```bash
git init
```

---

### Commit 1: Project configuration, environment & dependencies
```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: initialize project configuration, dependencies, and environment templates"
```

---

### Commit 2: Database connection configuration
```bash
git add config/db.js
git commit -m "feat(config): add MongoDB connection handler with Mongoose"
```

---

### Commit 3: Mongoose schemas & data models
```bash
git add models/User.js models/Download.js models/History.js models/P2PFile.js models/Peer.js
git commit -m "feat(models): define User, Download, History, P2PFile, and Peer schemas"
```

---

### Commit 4: Authentication & role-based access middleware
```bash
git add middleware/auth.js middleware/adminOnly.js
git commit -m "feat(middleware): add JWT authentication and admin authorization with frozen account checks"
```

---

### Commit 5: Cryptographic chunk management & activity logging services
```bash
git add services/chunkManager.js services/activityLogger.js
git commit -m "feat(services): implement SHA-256 chunk partitioning engine and audit logging service"
```

---

### Commit 6: User API routes
```bash
git add routes/userRoutes.js
git commit -m "feat(routes): implement user endpoints for register, login, profile, P2P download, and history"
```

---

### Commit 7: Administrator management & telemetry routes
```bash
git add routes/adminRoutes.js
git commit -m "feat(routes): implement admin endpoints for user freeze/unfreeze and download audit"
```

---

### Commit 8: File sharing & chunk transfer endpoints
```bash
git add routes/fileRoutes.js
git commit -m "feat(routes): implement file upload partitioning, chunk streaming, and assembled downloads"
```

---

### Commit 9: P2P Socket.io signaling and peer mesh coordinator
```bash
git add services/p2pNetwork.js
git commit -m "feat(p2p): add Socket.io signaling protocol for peer discovery and chunk requests"
```

---

### Commit 10: Initial demo seed dataset and sample P2P files
```bash
git add scripts/seed.js storage/samples/
git commit -m "feat(seed): add bootstrap script for admin/user accounts and sample chunked files"
```

---

### Commit 11: Express application entry point & server setup
```bash
git add server.js
git commit -m "feat(server): assemble Express HTTP and Socket.io server with route mounting"
```

---

### Commit 12: Automated Windows runup & startup scripts
```bash
git add run.bat start.ps1 run.ps1 start.bat
git commit -m "chore(scripts): add 1-click launcher scripts for Windows batch and PowerShell"
```

---

### Commit 13: Frontend Single Page Application & design system
```bash
git add public/index.html public/css/styles.css public/js/api.js public/js/socketClient.js public/js/app.js
git commit -m "feat(ui): implement technical desktop interface with BitTorrent piece map visualizer"
```

---

### Commit 14: Skill customization & agent configurations
```bash
git add .agents/
git commit -m "chore(agents): add unslop UI skill configuration"
```

---

### Commit 15: Project documentation & architecture specification
```bash
git add README.md COMMITS.md
git commit -m "docs: add comprehensive architecture specification and commit history documentation"
```

---

### Verify Commit History
To review the complete commit tree:
```bash
git log --oneline
```
