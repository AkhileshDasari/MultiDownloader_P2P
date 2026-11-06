const Peer = require('../models/Peer');
const P2PFile = require('../models/P2PFile');
const { getChunkBuffer, verifyChunk } = require('./chunkManager');

function setupP2PNetwork(io) {
  io.on('connection', (socket) => {
    let currentPeerId = null;

    // Register / announce peer
    socket.on('peer:announce', async (data) => {
      try {
        const { peer_id, user_id, peer_name, shared_files } = data;
        currentPeerId = peer_id;

        const peer = await Peer.findOneAndUpdate(
          { peer_id },
          {
            peer_id,
            user_id: user_id || 'guest',
            socket_id: socket.id,
            peer_name: peer_name || `Peer-${socket.id.slice(0, 5)}`,
            status: 'Online',
            shared_files: shared_files || [],
            last_seen: new Date()
          },
          { upsert: true, new: true }
        );

        socket.broadcast.emit('peer:joined', {
          peer_id: peer.peer_id,
          peer_name: peer.peer_name,
          shared_files: peer.shared_files
        });

        socket.emit('peer:registered', { success: true, peer });
      } catch (err) {
        console.error('Peer announce error:', err.message);
      }
    });

    // Request chunk data from peer or network
    socket.on('chunk:request', async (data, callback) => {
      try {
        const { file_id, chunk_index, chunk_id, expected_hash } = data;
        const chunkBuffer = getChunkBuffer(chunk_id);

        if (!chunkBuffer) {
          if (callback) callback({ error: 'Chunk not available on this node' });
          return;
        }

        const verification = verifyChunk(chunkBuffer, expected_hash);

        const responsePayload = {
          success: true,
          chunk_id,
          chunk_index,
          file_id,
          data_base64: chunkBuffer.toString('base64'),
          hash_verified: verification.valid,
          chunk_hash: verification.actualHash,
          seeder_socket: socket.id
        };

        if (callback) {
          callback(responsePayload);
        } else {
          socket.emit('chunk:response', responsePayload);
        }
      } catch (err) {
        console.error('Chunk request error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // Peer discovery request
    socket.on('peer:discover', async (data, callback) => {
      try {
        const { file_id } = data;
        const peers = await Peer.find({
          status: 'Online',
          shared_files: file_id
        });

        const result = peers.map(p => ({
          peer_id: p.peer_id,
          peer_name: p.peer_name,
          status: p.status,
          socket_id: p.socket_id
        }));

        if (callback) callback({ peers: result });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', async () => {
      if (currentPeerId) {
        try {
          await Peer.findOneAndUpdate(
            { peer_id: currentPeerId },
            { status: 'Offline', last_seen: new Date() }
          );
          io.emit('peer:left', { peer_id: currentPeerId });
        } catch (err) {
          console.error('Error updating peer disconnect:', err.message);
        }
      }
    });
  });
}

module.exports = { setupP2PNetwork };

