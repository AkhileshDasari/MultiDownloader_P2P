const mongoose = require('mongoose');

const PeerSchema = new mongoose.Schema({
  peer_id: {
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
  socket_id: {
    type: String,
    default: ''
  },
  peer_name: {
    type: String,
    default: 'Peer-Node'
  },
  status: {
    type: String,
    enum: ['Online', 'Offline'],
    default: 'Online'
  },
  shared_files: [{
    type: String // file_ids
  }],
  last_seen: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Peer', PeerSchema);

