const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory user storage (for demo - replace with database in production)
const users = new Map();
const sessions = new Map();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email 
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Guest login (no registration required)
router.post('/guest', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Username must be at least 2 characters long' 
      });
    }

    if (username.trim().length > 20) {
      return res.status(400).json({ 
        error: 'Username must be less than 20 characters' 
      });
    }

    const guestUser = {
      id: uuidv4(),
      username: username.trim(),
      isGuest: true,
      createdAt: new Date(),
      lastActive: new Date()
    };

    const token = generateToken(guestUser);

    res.json({
      success: true,
      user: {
        id: guestUser.id,
        username: guestUser.username,
        isGuest: true
      },
      token
    });

  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ 
        error: 'Username must be between 3 and 20 characters' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(
      user => user.email === email || user.username === username
    );

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Username or email already exists' 
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      isGuest: false,
      createdAt: new Date(),
      lastActive: new Date()
    };

    users.set(user.id, user);

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isGuest: false
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = Array.from(users.values()).find(user => user.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active
    user.lastActive = new Date();

    const token = generateToken(user);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isGuest: false
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token and get user info
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.id);
    
    if (!user && !req.user.isGuest) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        isGuest: req.user.isGuest || false
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (invalidate token - in production use token blacklist)
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // In a real application, you'd add the token to a blacklist
    // For now, we'll just return success as JWT tokens are stateless
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3 || username.trim().length > 20) {
      return res.status(400).json({ 
        error: 'Username must be between 3 and 20 characters' 
      });
    }

    // Check if username is taken by another user
    const existingUser = Array.from(users.values()).find(
      user => user.username === username.trim() && user.id !== req.user.id
    );

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Username already taken' 
      });
    }

    const user = users.get(req.user.id);
    if (user) {
      user.username = username.trim();
      user.lastActive = new Date();
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: username.trim(),
        email: req.user.email,
        isGuest: req.user.isGuest || false
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
