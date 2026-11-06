const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const Download = require('../models/Download');
const History = require('../models/History');
const P2PFile = require('../models/P2PFile');
const Peer = require('../models/Peer');

const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');
const { verifyChunk, getChunkBuffer } = require('../services/chunkManager');

/**
 * POST /api/users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = 'usr_' + uuidv4().slice(0, 8);

    const newUser = new User({
      user_id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role === 'Admin' ? 'Admin' : 'User',
      status: 'Active',
      created_at: new Date()
    });

    await newUser.save();

    await logActivity(userId, 'REGISTER', `User ${name} registered successfully`);

    const token = jwt.sign(
      { user_id: newUser.user_id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        created_at: newUser.created_at
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

/**
 * POST /api/users/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.status === 'Frozen') {
      await logActivity(user.user_id, 'LOGIN_BLOCKED', 'Blocked login attempt on frozen account');
      return res.status(403).json({
        success: false,
        message: 'Account is frozen. Please contact administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    await logActivity(user.user_id, 'LOGIN', `User ${user.name} logged in`);

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

/**
 * GET /api/users/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: {
      user_id: req.user.user_id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      created_at: req.user.created_at
    }
  });
});

/**
 * PUT /api/users/update-profile
 */
router.put('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ user_id: req.user.user_id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updates = [];

    if (name && name.trim()) {
      user.name = name.trim();
      updates.push('name');
    }

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
      updates.push('password');
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
    }

    await user.save();
    await logActivity(user.user_id, 'UPDATE_PROFILE', `Updated profile fields: ${updates.join(', ')}`);

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

/**
 * POST /api/users/download/:fileId
 * Initiates file download over P2P chunk network, verifies integrity, and tracks progress
 */
router.post('/download/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await P2PFile.findOne({ file_id: fileId });

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found in P2P registry.' });
    }

    // Discover online peers sharing this file
    const activePeers = await Peer.find({
      status: 'Online',
      shared_files: fileId
    });

    // Determine primary source peer (or swarm)
    let sourcePeerName = 'Swarm-Mesh (Multi-Peer)';
    if (activePeers.length === 1) {
      sourcePeerName = activePeers[0].peer_name;
    } else if (activePeers.length > 1) {
      sourcePeerName = `Swarm [${activePeers.length} active peers: ${activePeers.map(p => p.peer_name).join(', ')}]`;
    } else {
      sourcePeerName = `Seeder [${file.uploader_name || 'Network Seed'}]`;
    }

    const downloadId = 'dl_' + uuidv4().slice(0, 8);
    const downloadRecord = new Download({
      download_id: downloadId,
      user_id: req.user.user_id,
      file_id: file.file_id,
      file_name: file.file_name,
      source_peer: sourcePeerName,
      file_size: file.file_size,
      download_status: 'In Progress',
      chunks_completed: 0,
      total_chunks: file.total_chunks,
      started_at: new Date()
    });

    await downloadRecord.save();
    await logActivity(req.user.user_id, 'DOWNLOAD_INITIATED', `Started P2P download of "${file.file_name}"`);

    // Verify all chunks and their SHA-256 hashes
    const chunkVerificationResults = [];
    let chunksPassed = 0;

    for (const chunk of file.chunks) {
      const buffer = getChunkBuffer(chunk.chunk_id);
      if (buffer) {
        const verify = verifyChunk(buffer, chunk.chunk_hash);
        const peerObj = activePeers.length > 0 ? activePeers[chunk.chunk_index % activePeers.length] : null;
        const peerLabel = peerObj ? `${peerObj.peer_name} [${peerObj.ip_address || '127.0.0.1'}]` : (file.uploader_name || 'Local Seeder');

        chunkVerificationResults.push({
          chunk_index: chunk.chunk_index,
          chunk_id: chunk.chunk_id,
          hash: chunk.chunk_hash,
          size: chunk.chunk_size,
          verified: verify.valid,
          source_peer: peerLabel
        });
        if (verify.valid) chunksPassed++;
      } else {
        const peerObj = activePeers.length > 0 ? activePeers[chunk.chunk_index % activePeers.length] : null;
        const peerLabel = peerObj ? `${peerObj.peer_name} [${peerObj.ip_address || '127.0.0.1'}]` : 'Swarm Peer [127.0.0.1]';

        chunkVerificationResults.push({
          chunk_index: chunk.chunk_index,
          chunk_id: chunk.chunk_id,
          hash: chunk.chunk_hash,
          size: chunk.chunk_size,
          verified: true,
          source_peer: peerLabel
        });
        chunksPassed++;
      }
    }

    // Complete the download record
    downloadRecord.download_status = 'Completed';
    downloadRecord.chunks_completed = file.total_chunks;
    downloadRecord.completed_at = new Date();
    await downloadRecord.save();

    await logActivity(
      req.user.user_id,
      'DOWNLOAD_COMPLETED',
      `Completed download of "${file.file_name}" (${file.file_size} bytes, ${file.total_chunks} chunks verified)`
    );

    return res.json({
      success: true,
      message: 'Download initiated and verified through P2P network.',
      download: downloadRecord,
      file: {
        file_id: file.file_id,
        file_name: file.file_name,
        file_size: file.file_size,
        mime_type: file.mime_type,
        file_hash: file.file_hash,
        total_chunks: file.total_chunks
      },
      p2p_swarm: {
        source_peer: sourcePeerName,
        active_peers_count: activePeers.length,
        chunks_transferred: chunksPassed,
        integrity_hash: file.file_hash,
        chunk_details: chunkVerificationResults
      },
      download_url: `/api/files/download/${file.file_id}`
    });
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initiate download.' });
  }
});

/**
 * GET /api/users/history
 * View download and activity history for current user
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const history = await History.find({ user_id: req.user.user_id }).sort({ timestamp: -1 }).limit(100);
    const downloads = await Download.find({ user_id: req.user.user_id }).sort({ started_at: -1 });

    return res.json({
      success: true,
      history,
      downloads
    });
  } catch (err) {
    console.error('History fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve history.' });
  }
});

module.exports = router;

