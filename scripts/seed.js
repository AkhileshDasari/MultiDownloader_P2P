const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const P2PFile = require('../models/P2PFile');
const Peer = require('../models/Peer');
const History = require('../models/History');
const { splitFileIntoChunks } = require('../services/chunkManager');

async function seedInitialData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(' Database already initialized with users.');
      return;
    }

    console.log('🌱 Seeding initial demo users and sample P2P files...');

    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const userPassword = await bcrypt.hash('user123', salt);
    const peerPassword = await bcrypt.hash('peer123', salt);

    const admin = new User({
      user_id: 'usr_admin001',
      name: 'System Administrator',
      email: 'admin@p2p.com',
      password: adminPassword,
      role: 'Admin',
      status: 'Active',
      created_at: new Date()
    });
    await admin.save();

    const user = new User({
      user_id: 'usr_user001',
      name: 'Alex Mercer',
      email: 'user@p2p.com',
      password: userPassword,
      role: 'User',
      status: 'Active',
      created_at: new Date()
    });
    await user.save();

    const seederUser = new User({
      user_id: 'usr_peer002',
      name: 'Elena Rostova (Node-Alpha)',
      email: 'elena@p2p.com',
      password: peerPassword,
      role: 'User',
      status: 'Active',
      created_at: new Date()
    });
    await seederUser.save();

    // Create initial sample files to share on P2P network
    const sampleDir = path.join(__dirname, '..', 'storage', 'samples');
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }

    // Sample File 1: P2P Architecture Whitepaper (Markdown)
    const file1Path = path.join(sampleDir, 'p2p_network_protocol_v1.md');
    const file1Content = `# P2P Network Protocol & Chunk Verification Specification
## Overview
This specification details peer discovery, SHA-256 chunk partitioning, and distributed verification.
Every file shared over this network is split into fixed-size chunks (64KB - 256KB).
Each chunk is verified individually against its cryptographically signed hash before assembly.

## Swarm Discovery
Peers maintain active heartbeat pings with the tracker/signaling layer and advertise hosted file identifiers.
Downloads occur concurrently across multiple swarm peers (inspired by Plexo and BitTorrent architectures).
` + '--- End of Document Specification ---\n'.repeat(30);
    fs.writeFileSync(file1Path, file1Content, 'utf8');

    // Sample File 2: High Velocity Benchmark Dataset (CSV)
    const file2Path = path.join(sampleDir, 'global_network_metrics.csv');
    let file2Content = 'timestamp,peer_id,latency_ms,download_kbps,chunks_served,status\n';
    for (let i = 1; i <= 250; i++) {
      file2Content += `${new Date().toISOString()},node_${1000 + i},${(Math.random() * 40 + 5).toFixed(1)},${(Math.random() * 8000 + 1200).toFixed(0)},${Math.floor(Math.random() * 50 + 1)},Online\n`;
    }
    fs.writeFileSync(file2Path, file2Content, 'utf8');

    // Sample File 3: Linux Kernel Patch Simulation
    const file3Path = path.join(sampleDir, 'linux_kernel_tcp_bbr_patch.patch');
    let file3Content = `diff --git a/net/ipv4/tcp_bbr.c b/net/ipv4/tcp_bbr.c
--- a/net/ipv4/tcp_bbr.c
+++ b/net/ipv4/tcp_bbr.c
@@ -102,6 +102,14 @@ static void bbr_init(struct sock *sk)
+    /* P2P Low-Latency Bandwidth Aggregation Engine */
+    bbr->has_seen_rtt = 1;
+    bbr->init_cwnd = 32;
+    bbr->min_rtt_us = tcp_min_rtt(tp);
` + `+    // Multi-peer chunk streaming pipeline\n`.repeat(200);
    fs.writeFileSync(file3Path, file3Content, 'utf8');

    // Split and register sample files
    const res1 = await splitFileIntoChunks(file1Path, 'p2p_network_protocol_v1.md', admin.user_id, 'text/markdown', 1024);
    const res2 = await splitFileIntoChunks(file2Path, 'global_network_metrics.csv', seederUser.user_id, 'text/csv', 2048);
    const res3 = await splitFileIntoChunks(file3Path, 'linux_kernel_tcp_bbr_patch.patch', user.user_id, 'text/x-diff', 1024);

    const p2pFile1 = new P2PFile({
      file_id: res1.file_id,
      file_name: res1.file_name,
      file_size: res1.file_size,
      mime_type: res1.mime_type,
      file_hash: res1.file_hash,
      chunk_size: res1.chunk_size,
      total_chunks: res1.total_chunks,
      chunks: res1.chunks,
      uploader_id: admin.user_id,
      uploader_name: admin.name,
      description: 'Official P2P Network protocol & cryptographic chunk specification.',
      created_at: new Date()
    });
    await p2pFile1.save();

    const p2pFile2 = new P2PFile({
      file_id: res2.file_id,
      file_name: res2.file_name,
      file_size: res2.file_size,
      mime_type: res2.mime_type,
      file_hash: res2.file_hash,
      chunk_size: res2.chunk_size,
      total_chunks: res2.total_chunks,
      chunks: res2.chunks,
      uploader_id: seederUser.user_id,
      uploader_name: seederUser.name,
      description: 'Benchmark dataset containing peer throughput and chunk latency metrics.',
      created_at: new Date()
    });
    await p2pFile2.save();

    const p2pFile3 = new P2PFile({
      file_id: res3.file_id,
      file_name: res3.file_name,
      file_size: res3.file_size,
      mime_type: res3.mime_type,
      file_hash: res3.file_hash,
      chunk_size: res3.chunk_size,
      total_chunks: res3.total_chunks,
      chunks: res3.chunks,
      uploader_id: user.user_id,
      uploader_name: user.name,
      description: 'TCP BBR multi-peer acceleration patch for Linux kernel transport.',
      created_at: new Date()
    });
    await p2pFile3.save();

    // Register active demo peers in the network
    const peers = [
      new Peer({
        peer_id: 'peer_node_alpha',
        user_id: seederUser.user_id,
        peer_name: 'Node-Alpha (Stockholm Seeder)',
        ip_address: '192.168.1.104',
        status: 'Online',
        shared_files: [p2pFile1.file_id, p2pFile2.file_id],
        last_seen: new Date()
      }),
      new Peer({
        peer_id: 'peer_node_beta',
        user_id: admin.user_id,
        peer_name: 'Node-Beta (Frankfurt High-Speed Swarm)',
        ip_address: '192.168.1.189',
        status: 'Online',
        shared_files: [p2pFile1.file_id, p2pFile3.file_id],
        last_seen: new Date()
      }),
      new Peer({
        peer_id: 'peer_node_gamma',
        user_id: user.user_id,
        peer_name: 'Node-Gamma (Tokyo Peer Relay)',
        ip_address: '192.168.1.215',
        status: 'Online',
        shared_files: [p2pFile2.file_id, p2pFile3.file_id],
        last_seen: new Date()
      })
    ];
    await Peer.insertMany(peers);

    // Initial history entries
    await History.create([
      {
        history_id: 'hist_init_01',
        user_id: admin.user_id,
        activity: 'SYSTEM_INIT',
        description: 'P2P Downloader system initialized with MongoDB cluster.',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        history_id: 'hist_init_02',
        user_id: seederUser.user_id,
        activity: 'FILE_SHARED',
        description: `Shared dataset "${p2pFile2.file_name}" to the swarm.`,
        timestamp: new Date(Date.now() - 1800000)
      }
    ]);

    console.log('✅ Demo seed completed:');
    console.log('   Admin: admin@p2p.com / admin123');
    console.log('   User:  user@p2p.com  / user123');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

module.exports = seedInitialData;

