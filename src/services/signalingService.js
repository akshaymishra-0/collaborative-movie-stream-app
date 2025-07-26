import { io } from 'socket.io-client';

class SignalingService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
    this.isConnected = false;
    this.currentRoom = null;
    this.currentUserId = null;
  }

  // Initialize socket connection
  init(userId) {
    if (this.socket && this.isConnected) {
      console.log('SignalingService already initialized and connected');
      return Promise.resolve();
    }

    if (this.socket && !this.isConnected) {
      console.log('Reusing existing socket, waiting for connection...');
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Reconnection timeout'));
        }, 10000);

        if (this.socket.connected) {
          clearTimeout(timeout);
          this.isConnected = true;
          resolve();
        } else {
          this.socket.once('connect', () => {
            clearTimeout(timeout);
            this.isConnected = true;
            this.emit('connected');
            resolve();
          });

          this.socket.once('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        }
      });
    }

    console.log('Creating new SignalingService connection for user:', userId);

    return new Promise((resolve, reject) => {
      try {
        // Connect to actual backend server
        const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: false // Allow connection reuse
        });

        this.currentUserId = userId;
        
        this.socket.on('connect', () => {
          console.log('✅ Connected to signaling server');
          this.isConnected = true;
          this.emit('connected');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });

        this.setupSocketListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from signaling server');
      this.isConnected = false;
      this.emit('disconnected');
    });

    // Room events
    this.socket.on('user-joined', (data) => {
      console.log('👤 User joined:', data);
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      console.log('👋 User left:', data);
      this.emit('user-left', data);
    });

    this.socket.on('room-state', (data) => {
      console.log('🏠 Room state update:', data);
      this.emit('room-state', data);
    });

    // Voice chat events
    this.socket.on('voice-signal', (data) => {
      console.log('🎤 Voice signal received:', data.type);
      this.emit('voice-signal', data);
    });

    this.socket.on('voice-status', (data) => {
      console.log('🔊 Voice status update:', data);
      this.emit('voice-status', data);
    });

    // Chat events
    this.socket.on('chat-message', (data) => {
      console.log('💬 Chat message:', data);
      this.emit('chat-message', data);
    });

    // Video sync events
    this.socket.on('video-sync', (data) => {
      console.log('🎬 Video sync:', data);
      this.emit('video-sync', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  // Join a room
  joinRoom(roomId, username) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return Promise.reject(new Error('Not connected'));
    }

    // Prevent redundant joins to the same room
    if (this.currentRoom === roomId) {
      console.log('Already in room:', roomId);
      return Promise.resolve({ roomId, message: 'Already in room' });
    }

    // Leave current room if in a different one
    if (this.currentRoom && this.currentRoom !== roomId) {
      console.log('Leaving current room before joining new one');
      this.leaveRoom();
    }

    this.currentRoom = roomId;

    return new Promise((resolve, reject) => {
      console.log('Emitting user-join for room:', roomId);
      this.socket.emit('user-join', {
        roomId,
        userId: this.currentUserId,
        username
      });

      // Set a timeout for joining
      const timeout = setTimeout(() => {
        console.error('Join room timeout for room:', roomId);
        reject(new Error('Join room timeout'));
      }, 10000);

      // Listen for successful join (room state)
      const onRoomState = (data) => {
        console.log('Received room-state after join:', data);
        clearTimeout(timeout);
        this.off('room-state', onRoomState);
        resolve(data);
      };

      this.on('room-state', onRoomState);
    });
  }

  // Leave current room
  leaveRoom() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('user-leave', {
        roomId: this.currentRoom,
        userId: this.currentUserId
      });
    }
    this.currentRoom = null;
  }

  // Send chat message
  sendChatMessage(content) {
    if (!this.socket || !this.currentRoom) {
      console.error('Cannot send chat message: not connected or not in room');
      return;
    }

    this.socket.emit('chat-message', {
      content,
      type: 'text'
    });
  }

  // Send WebRTC signaling data
  sendSignal(targetUserId, signalData) {
    if (!this.socket || !this.currentRoom) {
      console.error('Cannot send signal: not connected or not in room');
      return;
    }

    this.socket.emit('voice-signal', {
      targetUserId,
      ...signalData
    });
  }

  // Update voice chat status
  updateVoiceStatus(status) {
    if (!this.socket || !this.currentRoom) {
      console.error('Cannot update voice status: not connected or not in room');
      return;
    }

    this.socket.emit('voice-status', status);
  }

  // Send chat message
  sendChatMessage(message) {
    if (!this.socket || !this.currentRoom) {
      console.error('Cannot send chat message: not connected or not in room');
      return;
    }

    this.socket.emit('chat-message', {
      content: message,
      type: 'text'
    });
  }

  // Send video sync data
  sendVideoSync(videoData) {
    if (!this.socket || !this.currentRoom) {
      console.error('Cannot send video sync: not connected or not in room');
      return;
    }

    this.socket.emit('video-sync', videoData);
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.leaveRoom();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
    }
  }

  // Event system
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  off(event, callback) {
    if (!callback) {
      // Remove all callbacks for this event
      this.callbacks.delete(event);
      return;
    }
    
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.callbacks.delete(event);
      }
    }
  }

  // Clean up all event listeners for a specific event type
  removeAllListeners(event) {
    if (event) {
      this.callbacks.delete(event);
    } else {
      this.callbacks.clear();
    }
  }

  emit(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  // Disconnect and cleanup
  disconnect() {
    console.log('Disconnecting SignalingService...');
    
    if (this.currentRoom) {
      this.leaveRoom();
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.currentRoom = null;
    this.currentUserId = null;
    this.callbacks.clear();
  }

  // API helper methods
  async createRoom(roomData) {
    try {
      const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }

  async joinRoomAPI(roomId, userData) {
    try {
      const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/rooms/join/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  async getIceServers() {
    try {
      const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/api/ice-servers`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.iceServers;
    } catch (error) {
      console.error('Failed to get ICE servers:', error);
      // Fallback to free STUN servers
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ];
    }
  }
}

// Create and export singleton instance
const signalingService = new SignalingService();

export { signalingService as default };
