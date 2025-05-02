const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const activityTracker = require('./middleware/activityTracker');
const { checkAllUserConsistency } = require('./utils/scheduledTasks');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/api', activityTracker);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const discountRoutes = require('./routes/discounts');
const aiRoutes = require('./routes/ai');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/discounts', discountRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Cubic E-Learning API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Schedule daily consistency check for discounts
// Run the check once at server startup
setTimeout(() => {
  checkAllUserConsistency()
    .then(() => console.log('Initial consistency check completed'))
    .catch(err => console.error('Error in initial consistency check:', err));
}, 10000); // Wait 10 seconds after server start

// Then schedule it to run every 24 hours
setInterval(() => {
  checkAllUserConsistency()
    .then(() => console.log('Scheduled consistency check completed'))
    .catch(err => console.error('Error in scheduled consistency check:', err));
}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
