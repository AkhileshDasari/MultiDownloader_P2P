const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const P2PFile = require('../models/P2PFile');
const Peer = require('../models/Peer');
const { authenticateToken } = require('../middleware/auth');
const { splitFileIntoChunks, getChunkBuffer, FILES_DIR } = require('../services/chunkManager');
const { logActivity } = require('../services/activityLogger');

const upload = multer({
  dest: path.join(__dirname, '..', 'storage', 'temp'),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max for demo
});

// Ensure temp directory exists
const tempDir = path.join(__dirname, '..', 'storage', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * GET /api/files
 * List all shared files available across the P2P network
 */
router.get('/', async (req, res) => {
  try {
    const files = await P2PFile.find().sort({ created_at: -1 });
    return res.json({ success: true, files });
  } catch (err) {
    console.error('Fetch files error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve files.' });
  }
});

/**
 * GET /api/files/:id
 * Get file details with chunk manifest
 */
router.get('/:id', async (req, res) => {
  try {
    const file = await P2PFile.findOne({ file_id: req.params.id });
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // Find peers currently seeding this file
    const peers = await Peer.find({ status: 'Online', shared_files: file.file_id });

    return res.json({
      success: true,
      file,
      peers: peers.map(p => ({ peer_id: p.peer_id, peer_name: p.peer_name, status: p.status }))
    });
  } catch (err) {
    console.error('File info error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get file details.' });
  }
});

/**
 * POST /api/files/upload
 * Split file into chunks, hash them, and register as a P2P shared file
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { description } = req.body;
    const originalName = req.file.originalname;
    const tempPath = req.file.path;
    const mimeType = req.file.mimetype || 'application/octet-stream';

    // Chunk size: 64KB for small files, 128KB or 256KB for larger files
    let chunkSize = 64 * 1024;
    if (req.file.size > 2 * 1024 * 1024) chunkSize = 256 * 1024;

    const chunkResult = await splitFileIntoChunks(
      tempPath,
      originalName,
      req.user.user_id,
      mimeType,
      chunkSize
    );

    // Remove temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    // Save to database
    const newP2PFile = new P2PFile({
      file_id: chunkResult.file_id,
      file_name: chunkResult.file_name,
      file_size: chunkResult.file_size,
      mime_type: chunkResult.mime_type,
      file_hash: chunkResult.file_hash,
      chunk_size: chunkResult.chunk_size,
      total_chunks: chunkResult.total_chunks,
      chunks: chunkResult.chunks,
      uploader_id: req.user.user_id,
      uploader_name: req.user.name,
      description: description || 'P2P Shared File',
      created_at: new Date()
    });

    await newP2PFile.save();

    // Register current user as seeder peer for this file
    let peer = await Peer.findOne({ user_id: req.user.user_id });
    if (!peer) {
      peer = new Peer({
        peer_id: 'peer_' + req.user.user_id,
        user_id: req.user.user_id,
        peer_name: req.user.name + '-Node',
        status: 'Online',
        shared_files: [newP2PFile.file_id],
        last_seen: new Date()
      });
    } else {
      if (!peer.shared_files.includes(newP2PFile.file_id)) {
        peer.shared_files.push(newP2PFile.file_id);
      }
      peer.status = 'Online';
      peer.last_seen = new Date();
    }
    await peer.save();

    await logActivity(
      req.user.user_id,
      'FILE_SHARED',
      `Shared file "${originalName}" (${chunkResult.file_size} bytes, ${chunkResult.total_chunks} chunks)`
    );

    return res.status(201).json({
      success: true,
      message: 'File processed, chunked, and shared to P2P network.',
      file: newP2PFile
    });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process file upload.' });
  }
});

/**
 * GET /api/files/chunk/:chunkId
 * Deliver individual raw binary chunk to peer
 */
router.get('/chunk/:chunkId', async (req, res) => {
  try {
    const chunkBuffer = getChunkBuffer(req.params.chunkId);
    if (!chunkBuffer) {
      return res.status(404).json({ success: false, message: 'Chunk not found.' });
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', chunkBuffer.length);
    return res.send(chunkBuffer);
  } catch (err) {
    console.error('Chunk download error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch chunk.' });
  }
});

const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * GET /api/files/download/:fileId
 * Download assembled file directly
 */
router.get('/download/:fileId', async (req, res) => {
  try {
    const token = (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]) || req.query.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findOne({ user_id: decoded.user_id });
        if (user && user.status === 'Frozen') {
          return res.status(403).json({ success: false, message: 'Your account is frozen. Download is disabled.' });
        }
      } catch (e) {
        // Continue if token verification has minor issue so browser download isn't abruptly broken
      }
    }
    const file = await P2PFile.findOne({ file_id: req.params.fileId });
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const assembledPath = path.join(FILES_DIR, `${file.file_id}_${file.file_name}`);
    if (fs.existsSync(assembledPath)) {
      return res.download(assembledPath, file.file_name);
    }

    // Assemble on the fly from chunks if whole file was not kept
    const buffers = [];
    for (const chunk of file.chunks) {
      const buf = getChunkBuffer(chunk.chunk_id);
      if (!buf) {
        return res.status(404).json({ success: false, message: `Missing chunk ${chunk.chunk_index}` });
      }
      buffers.push(buf);
    }

    const fullBuffer = Buffer.concat(buffers);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', fullBuffer.length);
    return res.send(fullBuffer);
  } catch (err) {
    console.error('File download error:', err);
    return res.status(500).json({ success: false, message: 'Failed to download file.' });
  }
});

module.exports = router;

