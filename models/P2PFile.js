const mongoose = require('mongoose');

const ChunkSchema = new mongoose.Schema({
  chunk_index: {
    type: Number,
    required: true
  },
  chunk_id: {
    type: String,
    required: true
  },
  chunk_hash: {
    type: String, // SHA-256 of the chunk
    required: true
  },
  chunk_size: {
    type: Number,
    required: true
  },
  storage_path: {
    type: String,
    required: true
  }
}, { _id: false });

const P2PFileSchema = new mongoose.Schema({
  file_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  file_name: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  mime_type: {
    type: String,
    default: 'application/octet-stream'
  },
  file_hash: {
    type: String, // SHA-256 whole file hash
    required: true
  },
  chunk_size: {
    type: Number,
    default: 128 * 1024 // 128KB default chunk size
  },
  total_chunks: {
    type: Number,
    required: true
  },
  chunks: [ChunkSchema],
  uploader_id: {
    type: String,
    required: true
  },
  uploader_name: {
    type: String,
    default: 'Anonymous Seeder'
  },
  description: {
    type: String,
    default: ''
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('P2PFile', P2PFileSchema);

