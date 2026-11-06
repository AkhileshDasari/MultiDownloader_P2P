// P2P WebSocket & Mesh Network Client
class P2PNetworkClient {
  constructor() {
    this.socket = null;
    this.peerId = 'peer_' + Math.random().toString(36).substring(2, 8);
    this.connected = false;
    this.activePeers = new Map();
  }

  init(user) {
    if (typeof io === 'undefined') {
      return;
    }

    this.socket = io({
      reconnectionAttempts: 5,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      this.connected = true;

      this.socket.emit('peer:announce', {
        peer_id: this.peerId,
        user_id: user ? user.user_id : 'anonymous',
        peer_name: user ? `${user.name} (Local Node)` : 'Web-Peer',
        shared_files: []
      });

      this.updateStatusBadge(true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.updateStatusBadge(false);
    });

    this.socket.on('peer:joined', (peer) => {
      this.activePeers.set(peer.peer_id, peer);
      this.notifyPeerChange();
    });

    this.socket.on('peer:left', (data) => {
      this.activePeers.delete(data.peer_id);
      this.notifyPeerChange();
    });
  }

  updateStatusBadge(online) {
    const badge = document.getElementById('p2pStatusBadge');
    if (badge) {
      badge.innerHTML = online
        ? `<span class="status-dot online"></span><span class="font-mono text-[11px] text-[#8b949e]">Online (${this.peerId})</span>`
        : `<span class="status-dot offline"></span><span class="font-mono text-[11px] text-[#8b949e]">Offline</span>`;
    }
  }

  notifyPeerChange() {
    const event = new CustomEvent('p2p:peer-update', { detail: { count: this.activePeers.size } });
    window.dispatchEvent(event);
  }
}

window.p2pClient = new P2PNetworkClient();
