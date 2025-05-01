const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserData = require('../models/UserData');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      name,
      email,
      password
    });
    
    // Save user to database
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data and token
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        streakCount: user.streakCount,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log('User found:', user.email);
    
    // Check password
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last active timestamp
    user.lastActive = Date.now();
    await user.save();
    
    // Track login in UserData
    let userData = await UserData.findOne({ user: user._id });
    
    if (!userData) {
      // Create new user data record if it doesn't exist
      userData = new UserData({
        user: user._id,
        lastLogin: Date.now(),
        previousLogin: null,
        loginHistory: [{
          loginTime: Date.now()
        }],
        notifications: [{
          type: 'login',
          message: 'Welcome to Cubic E-Learning! We\'re glad to see you.',
          createdAt: Date.now()
        }]
      });
    } else {
      // Update existing user data
      userData.previousLogin = userData.lastLogin;
      userData.lastLogin = Date.now();
      
      // Add new login to history
      userData.loginHistory.push({
        loginTime: Date.now()
      });
      
      // Calculate time since last login
      const timeSinceLastLogin = Math.floor((Date.now() - new Date(userData.previousLogin)) / (1000 * 60 * 60 * 24));
      
      // Create notification if user has been away for more than 3 days
      if (userData.previousLogin && timeSinceLastLogin >= 3) {
        userData.notifications.push({
          type: 'inactivity',
          message: `Welcome back! You've been away for ${timeSinceLastLogin} days. Ready to continue learning?`,
          createdAt: Date.now()
        });
      }
    }
    
    await userData.save();
    
    // Return user data and token
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        streakCount: user.streakCount,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Log out user and update session data
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // Update user data with logout time
    const userData = await UserData.findOne({ user: req.user._id });
    
    if (userData && userData.loginHistory.length > 0) {
      // Get the last login session
      const lastLoginIndex = userData.loginHistory.length - 1;
      const lastLogin = userData.loginHistory[lastLoginIndex];
      
      // Update logout time and session duration
      if (!lastLogin.logoutTime) {
        lastLogin.logoutTime = Date.now();
        
        // Calculate session duration in minutes
        const loginTime = new Date(lastLogin.loginTime);
        const logoutTime = new Date(lastLogin.logoutTime);
        const durationMinutes = Math.floor((logoutTime - loginTime) / (1000 * 60));
        
        lastLogin.sessionDuration = durationMinutes;
        
        // Update the login history
        userData.loginHistory[lastLoginIndex] = lastLogin;
        await userData.save();
      }
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    // req.user was set in the auth middleware
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        streakCount: req.user.streakCount,
        points: req.user.points
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
