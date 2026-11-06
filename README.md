<div align="center">

# MultiDownloader P2P

**A distributed peer-to-peer file downloader with chunk partitioning, swarm mesh discovery, and cryptographic SHA-256 integrity verification.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB-brightgreen.svg)](https://www.mongodb.com/)
[![WebSockets](https://img.shields.io/badge/Signaling-Socket.IO-black.svg)](https://socket.io/)

</div>

---

## Overview

MultiDownloader P2P is a distributed transfer system inspired by protocols like BitTorrent and multi-source tools like Plexo. Instead of relying on a single monolithic client-server download stream, files are partitioned into uniform byte chunks, mapped to cryptographic SHA-256 digests, and transferred concurrently across active peers in the swarm.

---

## Key Highlights

- **Chunk Partitioning Engine**: Files are divided into discrete blocks (64 KB to 256 KB) allowing concurrent acquisition from multiple seeders.
- **Zero-Trust Piece Verification**: Every piece is verified against its pre-computed SHA-256 fingerprint before assembly. Corrupted pieces are rejected immediately.
- **WebSocket Signaling Mesh**: Dynamic peer discovery, state heartbeats, and swarm peer registries coordinated in real time.
- **BitTorrent-Style Piece Map**: Visual progress grid showing per-block transfer status, active peer attribution, and integrity state.
- **Access Governance**: Role-based access control with administrative account freezing and structured activity auditing.

---

## How It Works

```
File Upload (Seeder)
   │
   ▼
[Chunk Engine] ── Slices into 64–256 KB blocks + Computes SHA-256 per chunk
   │
   ▼
[Swarm Tracker] ── Registers manifest & advertises availability to peers
   │
   ▼
Peer Discovery & Transfer (Socket.IO Mesh)
   ├── Peer A provides Chunks [0, 2, 4]
   └── Peer B provides Chunks [1, 3, 5]
   │
   ▼
[Integrity Check] ── Verifies piece SHA-256 ──> Reassembles full file locally
```

---

## Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) (running locally or remote URI)

### 2. Setup

```bash
# Clone the repository
git clone https://github.com/Deekshith-goud/MultiDownloader_P2P.git
cd MultiDownloader_P2P

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### 3. Run

```bash
# Start server
npm start
```

The application will be accessible at `http://localhost:5000` (and `http://<your-lan-ip>:5000` across your local network).

---

## Multi-Peer Testing

To test peer transfers on a single machine:

1. **Seeder Node**: Open `http://localhost:5000` in a browser window, log in as `user@p2p.com` (password: `user123`), and share a file.
2. **Leecher Node**: Open `http://localhost:5000` in an Incognito window or a second browser. It receives a unique peer identity and can download the file from the seeder with live chunk verification.

---

## License

This project is open-source and available under the [MIT License](LICENSE).