# Peer-to-Peer (P2P) Downloader

A full-stack, distributed **Peer-to-Peer (P2P) Downloader** application inspired by [anmolkapil/plexo](https://github.com/anmolkapil/plexo) and BitTorrent swarm architectures. Built with **Node.js, Express, Socket.io, MongoDB (Mongoose), and cryptographic SHA-256 chunk verification**.

---

## 🚀 Live Demo & Quick Start

* **Git Commits Guide**: See [COMMITS.md](COMMITS.md) for the complete list of commit commands.
* **Server URL**: [**http://localhost:5000**](http://localhost:5000)

### Pre-Seeded Accounts:
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@p2p.com` | `admin123` | View all users, Freeze / Unfreeze accounts, Monitor global downloads & swarm stats |
| **Regular User** | `user@p2p.com` | `user123` | Browse files, Download via P2P swarm, Upload/Seed files, Update profile, View personal history |

---

## 🏗️ Architecture & Component Design

```
+-----------------------------------------------------------------------------------+
|                                  USER BROWSER                                    |
|   - Single Page App (SPA)                                                        |
|   - Real-time BitTorrent-style piece/chunk map visualizer                        |
|   - File seeder & hasher (splits files into 64KB-256KB chunks)                   |
|   - Admin dashboard (user freeze/unfreeze controls & global download audit)      |
+----------------------------------------+------------------------------------------+
                                         | HTTP REST APIs & WebSocket Mesh
                                         v
+-----------------------------------------------------------------------------------+
|                             P2P NODE.JS BACKEND                                  |
|   - Express REST API (/api/users, /api/admin, /api/files)                        |
|   - Socket.io P2P signaling, peer heartbeat & swarm coordination                 |
|   - Cryptographic chunk engine (SHA-256 hash per chunk & root checksum)         |
|   - JWT authentication & account status enforcement (Frozen accounts blocked)    |
+----------------------------------------+------------------------------------------+
                                         | Mongoose ODM
                                         v
+-----------------------------------------------------------------------------------+
|                                 MONGODB DATABASE                                 |
|   - users: [user_id, name, email, password (bcrypt), role, status, created_at]   |
|   - downloads: [download_id, user_id, file_id, file_name, source_peer, status..] |
|   - histories: [history_id, user_id, activity, description, timestamp]           |
|   - p2pfiles:  [file_id, file_name, file_hash, chunks: [{ chunk_hash, size }]]   |
|   - peers:     [peer_id, user_id, socket_id, status, shared_files, last_seen]    |
+-----------------------------------------------------------------------------------+
```

---

## 🗄️ Database Design (MongoDB Schemas)

### 1. `User` Collection
* `user_id` (String, Unique index)
* `name` (String)
* `email` (String, Unique index)
* `password` (Hashed via bcrypt)
* `role` (`User` | `Admin`)
* `status` (`Active` | `Frozen`)
* `created_at` (Date)

### 2. `Download` Collection
* `download_id` (String, Unique index)
* `user_id` (String, User who initiated download)
* `file_id` (String, Reference to file)
* `file_name` (String, File name)
* `source_peer` (String, Swarm peer or seeder node)
* `file_size` (Number, Total bytes)
* `download_status` (`Pending` | `In Progress` | `Completed` | `Failed`)
* `chunks_completed` (Number)
* `total_chunks` (Number)
* `started_at` (Date)
* `completed_at` (Date)

### 3. `History` Collection
* `history_id` (String, Unique index)
* `user_id` (String, User identifier)
* `activity` (String, e.g. `REGISTER`, `LOGIN`, `DOWNLOAD_COMPLETED`, `ACCOUNT_FROZEN`)
* `description` (String, Detailed event audit log)
* `timestamp` (Date)

### 4. `P2PFile` & `Chunk` Sub-collection
* `file_id` (String, Unique index)
* `file_name` (String)
* `file_size` (Number)
* `mime_type` (String)
* `file_hash` (String, Overall SHA-256)
* `chunk_size` (Number, e.g. 128KB)
* `total_chunks` (Number)
* `chunks`: Array of:
  * `chunk_index` (Number)
  * `chunk_id` (String)
  * `chunk_hash` (String, Chunk SHA-256)
  * `chunk_size` (Number)
  * `storage_path` (String)
* `uploader_id` (String)
* `uploader_name` (String)

### 5. `Peer` Collection
* `peer_id` (String, Unique index)
* `user_id` (String)
* `socket_id` (String)
* `peer_name` (String)
* `status` (`Online` | `Offline`)
* `shared_files` (Array of file_ids)
* `last_seen` (Date)

---

## 📡 API Routes Specification

### User Routes – `/api/users`
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register new account (hashes password, logs audit history) | No |
| `POST` | `/login` | Authenticate user & issue JWT token (verifies active/frozen status) | No |
| `GET` | `/me` | Get currently authenticated profile | Yes |
| `PUT` | `/update-profile`| Update user name and/or password | Yes |
| `POST` | `/download/:fileId` | Initiate P2P chunk download, verify SHA-256 pieces & track progress | Yes |
| `GET` | `/history` | View personal download and account audit history | Yes |

### Admin Routes – `/api/admin`
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | View all registered users with status, download counts, and last activity | Admin |
| `PATCH` | `/users/:id/freeze` | Freeze user account (blocks login and file downloading immediately) | Admin |
| `PATCH` | `/users/:id/unfreeze`| Unfreeze user account (restores full privileges) | Admin |
| `GET` | `/downloads` | View all download activities across the entire network swarm | Admin |
| `GET` | `/stats` | Aggregate network telemetry: total users, active peers, downloads, files | Admin |

### File & Swarm Routes – `/api/files`
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List all available files seeded in the P2P network |
| `GET` | `/:id` | Get file metadata, chunk manifest, and active seeders |
| `POST` | `/upload` | Partition uploaded file into chunks, hash with SHA-256, and seed to swarm |
| `GET` | `/chunk/:chunkId` | Fetch raw binary chunk for peer-to-peer data transfer |
| `GET` | `/download/:fileId` | Download final assembled file directly to user storage |

---

## 🧩 P2P Architecture Highlights (Plexo-Inspired)

1. **Piece / Chunk Partitioning**:
   Files are divided into manageable byte chunks (64KB - 256KB). This allows concurrent, non-blocking transfer across distinct swarm nodes.
2. **Cryptographic SHA-256 Integrity Verification**:
   Every piece has an individual SHA-256 hash stored in MongoDB. As chunks are acquired, their SHA-256 hash is computed in real time. If any byte is altered, it is immediately discarded.
3. **Interactive Swarm Piece Map Visualizer**:
   The web UI features a live visualizer grid showing individual chunk blocks turning from waiting to downloading to green (verified) with multi-peer attribution.
4. **Peer Discovery & Mesh Signaling**:
   Socket.io coordinates peer discovery, announcing new seeder nodes and broadcasting chunk availability without exposing private peer networking details.
5. **Account Access Enforcement**:
   When an administrator freezes a user account, all subsequent login and download requests are immediately blocked by middleware with HTTP `403 Forbidden`.

