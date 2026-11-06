const mongoose = require('mongoose');

const DownloadSchema = new mongoose.Schema({
  download_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  file_id: {
    type: String,
    required: true,
    index: true
  },
  file_name: {
    type: String,
    required: true
  },
  source_peer: {
    type: String,
    default: 'P2P-Swarm'
  },
  file_size: {
    type: Number,
    required: true
  },
  download_status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Failed'],
    default: 'Pending'
  },
  chunks_completed: {
    type: Number,
    default: 0
  },
  total_chunks: {
    type: Number,
    default: 1
  },
  started_at: {
    type: Date,
    default: Date.now
  },
  completed_at: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Download', DownloadSchema);

