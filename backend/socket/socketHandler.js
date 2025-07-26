const { v4: uuidv4 } = require('uuid');
const { rooms, roomParticipants } = require('../routes/rooms');

// Store active socket connections
const activeConnections = new Map(); // socketId -> user info
const roomSockets = new Map(); // roomId -> Set of socketIds
const userSockets = new Map(); // userId -> socketId

// Voice chat peer connections for signaling
const voicePeers = new Map(); // roomId -> Map(userId -> peerData)

const socketHandler = (io) => {
  // Connection rate limiting per IP
  const connectionCounts = new Map();
  
  io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    
    // Basic IP-based connection limiting
    const currentConnections = connectionCounts.get(clientIp) || 0;
    if (currentConnections > 10) { // Max 10 connections per IP
      socket.emit('error', 'Too many connections from this IP');
      socket.disconnect();
      return;
    }
    
    connectionCounts.set(clientIp, currentConnections + 1);
    
    console.log(`🔌 User connected: ${socket.id} from ${clientIp}`);

    // Clean up on disconnect
    socket.on('disconnect', () => {
      const count = connectionCounts.get(clientIp) || 1;
      connectionCounts.set(clientIp, Math.max(0, count - 1));
    });

    // Handle user joining
    socket.on('user-join', (userData) => {
      try {
        const { userId, username, roomId } = userData;
        
        // Store connection info
        activeConnections.set(socket.id, {
          userId,
          username,
          roomId,
          joinedAt: new Date()
        });

        userSockets.set(userId, socket.id);

        if (roomId) {
          socket.join(roomId);
          
          // Add to room sockets
          if (!roomSockets.has(roomId)) {
            roomSockets.set(roomId, new Set());
          }
          roomSockets.get(roomId).add(socket.id);

          // Update room participant count
          const room = rooms.get(roomId);
          if (room) {
            const participants = roomParticipants.get(roomId) || new Set();
            participants.add(userId);
            room.participants = participants.size;
            room.lastActivity = new Date();

            // Notify others in room
            socket.to(roomId).emit('user-joined', {
              userId,
              username,
              participants: room.participants
            });

            // Send current room state to new user
            socket.emit('room-state', {
              currentVideo: room.currentVideo,
              videoState: room.videoState,
              participants: room.participants,
              chatMessages: (room.chatMessages || []).slice(-20) // Last 20 messages
            });
          }
        }

        console.log(`👤 User ${username} (${userId}) joined room ${roomId}`);

      } catch (error) {
        console.error('User join error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle chat messages
    socket.on('chat-message', (messageData) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection) return;

        const { roomId } = connection;
        const room = rooms.get(roomId);
        if (!room) return;

        const message = {
          id: uuidv4(),
          userId: connection.userId,
          username: connection.username,
          content: messageData.content,
          timestamp: new Date(),
          type: messageData.type || 'text'
        };

        // Store message in room
        if (!room.chatMessages) room.chatMessages = [];
        room.chatMessages.push(message);

        // Keep only last 100 messages
        if (room.chatMessages.length > 100) {
          room.chatMessages = room.chatMessages.slice(-100);
        }

        room.lastActivity = new Date();

        // Broadcast to all users in room
        io.to(roomId).emit('chat-message', message);

        console.log(`💬 Chat message in room ${roomId}: ${message.content}`);

      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // Handle video synchronization
    socket.on('video-sync', (syncData) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection) return;

        const { roomId } = connection;
        const room = rooms.get(roomId);
        if (!room) return;

        // Update room video state
        if (syncData.videoUrl !== undefined) {
          room.currentVideo = syncData.videoUrl ? {
            url: syncData.videoUrl,
            title: syncData.videoTitle || 'Unknown Video',
            addedAt: new Date(),
            addedBy: connection.username
          } : null;
        }

        if (syncData.currentTime !== undefined || syncData.isPlaying !== undefined) {
          room.videoState = {
            ...room.videoState,
            currentTime: syncData.currentTime ?? room.videoState.currentTime,
            isPlaying: syncData.isPlaying ?? room.videoState.isPlaying,
            lastUpdate: new Date()
          };
        }

        room.lastActivity = new Date();

        // Broadcast to other users in room (not sender)
        socket.to(roomId).emit('video-sync', {
          currentVideo: room.currentVideo,
          videoState: room.videoState,
          updatedBy: connection.username
        });

        console.log(`🎬 Video sync in room ${roomId}:`, {
          video: room.currentVideo?.title,
          playing: room.videoState.isPlaying,
          time: room.videoState.currentTime
        });

      } catch (error) {
        console.error('Video sync error:', error);
      }
    });

    // Handle voice chat signaling
    socket.on('voice-signal', (signalData) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection) return;

        const { roomId, userId } = connection;
        const { type, targetUserId, signal, offer, answer, candidate } = signalData;

        // Forward signaling data to target user
        const targetSocketId = userSockets.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('voice-signal', {
            type,
            fromUserId: userId,
            fromUsername: connection.username,
            signal,
            offer,
            answer,
            candidate
          });
        }

        console.log(`🎤 Voice signal ${type} from ${userId} to ${targetUserId} in room ${roomId}`);

      } catch (error) {
        console.error('Voice signal error:', error);
      }
    });

    // Handle voice chat status updates
    socket.on('voice-status', (statusData) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection) return;

        const { roomId, userId } = connection;
        const { isConnected, isMuted, isSpeaking } = statusData;

        // Initialize voice chat for room if needed
        if (!voicePeers.has(roomId)) {
          voicePeers.set(roomId, new Map());
        }

        const roomVoicePeers = voicePeers.get(roomId);
        const userData = {
          userId,
          username: connection.username,
          isConnected: isConnected ?? false,
          isMuted: isMuted ?? false,
          isSpeaking: isSpeaking ?? false,
          lastActivity: new Date()
        };

        roomVoicePeers.set(userId, userData);

        // Update room voice chat info
        const room = rooms.get(roomId);
        if (room) {
          room.voiceChat = {
            enabled: true,
            participants: Array.from(roomVoicePeers.values())
          };
        }

        // Broadcast voice status to room
        socket.to(roomId).emit('voice-status', {
          userId,
          username: connection.username,
          isConnected,
          isMuted,
          isSpeaking,
          voiceParticipants: room.voiceChat.participants
        });

        console.log(`🎤 Voice status update: ${connection.username} - connected: ${isConnected}, muted: ${isMuted}, speaking: ${isSpeaking}`);

      } catch (error) {
        console.error('Voice status error:', error);
      }
    });

    // Handle room list requests
    socket.on('get-rooms', () => {
      try {
        const publicRooms = Array.from(rooms.values())
          .filter(room => !room.isPrivate)
          .map(room => ({
            id: room.id,
            name: room.name,
            participants: room.participants,
            maxParticipants: room.maxParticipants,
            hasVideo: !!room.currentVideo,
            lastActivity: room.lastActivity
          }))
          .sort((a, b) => b.lastActivity - a.lastActivity)
          .slice(0, 20); // Limit to 20 most recent rooms

        socket.emit('rooms-list', { rooms: publicRooms });

      } catch (error) {
        console.error('Get rooms error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        const connection = activeConnections.get(socket.id);
        if (connection) {
          const { userId, username, roomId } = connection;

          // Remove from room participants
          if (roomId) {
            const participants = roomParticipants.get(roomId);
            if (participants) {
              participants.delete(userId);
              
              const room = rooms.get(roomId);
              if (room) {
                room.participants = participants.size;
                room.lastActivity = new Date();

                // Remove from voice chat
                const roomVoicePeers = voicePeers.get(roomId);
                if (roomVoicePeers) {
                  roomVoicePeers.delete(userId);
                  room.voiceChat.participants = Array.from(roomVoicePeers.values());
                }

                // Notify others in room
                socket.to(roomId).emit('user-left', {
                  userId,
                  username,
                  participants: room.participants,
                  voiceParticipants: room.voiceChat.participants
                });
              }
            }

            // Remove from room sockets
            const roomSocketSet = roomSockets.get(roomId);
            if (roomSocketSet) {
              roomSocketSet.delete(socket.id);
              if (roomSocketSet.size === 0) {
                roomSockets.delete(roomId);
              }
            }
          }

          // Clean up connections
          activeConnections.delete(socket.id);
          userSockets.delete(userId);

          console.log(`🔌 User disconnected: ${username} (${userId}) from room ${roomId}`);
        } else {
          console.log(`🔌 Unknown user disconnected: ${socket.id}`);
        }

      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Periodic cleanup of inactive rooms
  setInterval(() => {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, room] of rooms.entries()) {
      if (now - room.lastActivity > inactiveThreshold && room.participants === 0) {
        rooms.delete(roomId);
        roomParticipants.delete(roomId);
        roomSockets.delete(roomId);
        voicePeers.delete(roomId);
        console.log(`🧹 Cleaned up inactive room: ${roomId}`);
      }
    }
  }, 10 * 60 * 1000); // Check every 10 minutes

  console.log('🎭 Socket.IO handlers initialized');
};

module.exports = socketHandler;
