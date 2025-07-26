const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Input sanitization function
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 100); // Limit length
};

// In-memory room storage (replace with database in production)
const rooms = new Map();
const roomParticipants = new Map(); // roomId -> Set of userIds

// Middleware to authenticate token (optional for room creation)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// Create a new room
router.post('/create', authenticateToken, (req, res) => {
  try {
    const { roomName, isPrivate = false, maxParticipants = 10 } = req.body;

    // Sanitize input
    const cleanRoomName = sanitizeInput(roomName);

    if (!cleanRoomName || cleanRoomName.length < 2) {
      return res.status(400).json({
        error: 'Room name must be at least 2 characters long'
      });
    }

    if (cleanRoomName.length > 50) {
      return res.status(400).json({
        error: 'Room name must be less than 50 characters'
      });
    }

    // Validate maxParticipants
    const maxParts = parseInt(maxParticipants);
    if (isNaN(maxParts) || maxParts < 1 || maxParts > 50) {
      return res.status(400).json({
        error: 'Max participants must be between 1 and 50'
      });
    }

    const roomId = uuidv4();
    const room = {
      id: roomId,
      name: cleanRoomName,
      isPrivate,
      maxParticipants: Math.min(Math.max(maxParticipants, 2), 50),
      createdBy: req.user ? req.user.id : null,
      createdAt: new Date(),
      lastActivity: new Date(),
      participants: 0,
      currentVideo: null,
      videoState: {
        isPlaying: false,
        currentTime: 0,
        lastUpdate: new Date()
      },
      chatMessages: [],
      voiceChat: {
        enabled: true,
        participants: []
      }
    };

    rooms.set(roomId, room);
    roomParticipants.set(roomId, new Set());

    res.status(201).json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        isPrivate: room.isPrivate,
        maxParticipants: room.maxParticipants,
        participants: room.participants,
        createdAt: room.createdAt
      }
    });

  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a room
router.post('/join/:roomId', authenticateToken, (req, res) => {
  try {
    const { roomId } = req.params;
    const { username } = req.body;

    if (!username || username.trim().length < 2) {
      return res.status(400).json({
        error: 'Username is required to join room'
      });
    }

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    const participants = roomParticipants.get(roomId);
    if (participants.size >= room.maxParticipants) {
      return res.status(409).json({
        error: 'Room is full'
      });
    }

    const userId = req.user ? req.user.id : uuidv4();
    
    // Add participant
    participants.add(userId);
    room.participants = participants.size;
    room.lastActivity = new Date();

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        participants: room.participants,
        maxParticipants: room.maxParticipants,
        currentVideo: room.currentVideo,
        videoState: room.videoState,
        voiceChat: room.voiceChat
      },
      userId
    });

  } catch (error) {
    console.error('Room join error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room info
router.get('/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = rooms.get(roomId);

    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    const participants = roomParticipants.get(roomId);

    res.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        isPrivate: room.isPrivate,
        participants: participants ? participants.size : 0,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        currentVideo: room.currentVideo,
        videoState: room.videoState
      }
    });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List public rooms
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 50);

    const publicRooms = Array.from(rooms.values())
      .filter(room => !room.isPrivate)
      .map(room => {
        const participants = roomParticipants.get(room.id);
        return {
          id: room.id,
          name: room.name,
          participants: participants ? participants.size : 0,
          maxParticipants: room.maxParticipants,
          createdAt: room.createdAt,
          lastActivity: room.lastActivity,
          hasVideo: !!room.currentVideo
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedRooms = publicRooms.slice(startIndex, endIndex);

    res.json({
      success: true,
      rooms: paginatedRooms,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: publicRooms.length,
        pages: Math.ceil(publicRooms.length / limitNum)
      }
    });

  } catch (error) {
    console.error('List rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave room
router.post('/leave/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required'
      });
    }

    const room = rooms.get(roomId);
    const participants = roomParticipants.get(roomId);

    if (room && participants) {
      participants.delete(userId);
      room.participants = participants.size;
      room.lastActivity = new Date();

      // Remove room if no participants and not permanent
      if (participants.size === 0) {
        // Keep room for 5 minutes after last participant leaves
        setTimeout(() => {
          const currentParticipants = roomParticipants.get(roomId);
          if (currentParticipants && currentParticipants.size === 0) {
            rooms.delete(roomId);
            roomParticipants.delete(roomId);
            console.log(`Removed empty room: ${roomId}`);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    }

    res.json({
      success: true,
      message: 'Left room successfully'
    });

  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update room video
router.post('/:roomId/video', (req, res) => {
  try {
    const { roomId } = req.params;
    const { videoUrl, videoTitle, currentTime = 0, isPlaying = false } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    room.currentVideo = videoUrl ? {
      url: videoUrl,
      title: videoTitle || 'Unknown Video',
      addedAt: new Date()
    } : null;

    room.videoState = {
      isPlaying,
      currentTime,
      lastUpdate: new Date()
    };

    room.lastActivity = new Date();

    res.json({
      success: true,
      currentVideo: room.currentVideo,
      videoState: room.videoState
    });

  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room chat messages
router.get('/:roomId/chat', (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found'
      });
    }

    let messages = room.chatMessages || [];
    
    // Filter messages before timestamp if provided
    if (before) {
      const beforeDate = new Date(before);
      messages = messages.filter(msg => new Date(msg.timestamp) < beforeDate);
    }

    // Limit and sort messages
    messages = messages
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit))
      .reverse();

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export rooms and participants for socket handlers
module.exports = router;
module.exports.rooms = rooms;
module.exports.roomParticipants = roomParticipants;
