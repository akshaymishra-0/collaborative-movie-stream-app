const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Upload-specific rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per windowMs
  message: 'Too many uploads from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all upload routes
router.use(uploadLimiter);

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const avatarsDir = path.join(uploadDir, 'avatars');
const videosDir = path.join(uploadDir, 'videos');

[uploadDir, avatarsDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File type validation
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, AVI, MOV, WMV, FLV, and WebM videos are allowed.'), false);
  }
};

// Avatar upload configuration
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `avatar-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1
  }
});

// Video upload configuration
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `video-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB default
    files: 1
  }
});

// Middleware to authenticate token (optional)
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

// Upload avatar
router.post('/avatar', authenticateToken, (req, res) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/avatars/${req.file.filename}`;
    
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        type: 'avatar'
      },
      message: 'Avatar uploaded successfully'
    });
  });
});

// Upload video for room
router.post('/video', authenticateToken, (req, res) => {
  videoUpload.single('video')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE || '100MB'}.` 
          });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/videos/${req.file.filename}`;
    
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        type: 'video',
        duration: null, // Could be extracted using ffprobe if needed
        thumbnail: null // Could be generated using ffmpeg if needed
      },
      message: 'Video uploaded successfully'
    });
  });
});

// Get file info
router.get('/info/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!['avatars', 'videos'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(uploadDir, type, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      file: {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${type}/${filename}`,
        type
      }
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete file
router.delete('/:type/:filename', authenticateToken, (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!['avatars', 'videos'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(uploadDir, type, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List files (with pagination)
router.get('/list/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    if (!['avatars', 'videos'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);

    const dirPath = path.join(uploadDir, type);
    
    if (!fs.existsSync(dirPath)) {
      return res.json({
        success: true,
        files: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 }
      });
    }

    const files = fs.readdirSync(dirPath)
      .filter(file => fs.statSync(path.join(dirPath, file)).isFile())
      .map(filename => {
        const filePath = path.join(dirPath, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${type}/${filename}`,
          type
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedFiles = files.slice(startIndex, endIndex);

    res.json({
      success: true,
      files: paginatedFiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: files.length,
        pages: Math.ceil(files.length / limitNum)
      }
    });

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
