const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const discountService = require('../services/discountService');

// @route   GET /api/discounts/status
// @desc    Get user's current discount status
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const result = await discountService.getUserDiscountStatus(req.user._id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error getting discount status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/discounts/initialize/:courseId
// @desc    Initialize discount for a course
// @access  Private
router.post('/initialize/:courseId', auth, async (req, res) => {
  try {
    const result = await discountService.initializeDiscount(req.user._id, req.params.courseId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error initializing discount:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/discounts/check/:courseId
// @desc    Check consistency and update discount
// @access  Private
router.post('/check/:courseId', auth, async (req, res) => {
  try {
    const result = await discountService.checkConsistency(req.user._id, req.params.courseId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error checking consistency:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/discounts/complete/:courseId
// @desc    Complete a course and apply earned discount
// @access  Private
router.post('/complete/:courseId', auth, async (req, res) => {
  try {
    const result = await discountService.completeCourseAndApplyDiscount(req.user._id, req.params.courseId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error completing course and applying discount:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/discounts/apply/:courseId
// @desc    Apply discount to a course purchase
// @access  Private
router.post('/apply/:courseId', auth, async (req, res) => {
  try {
    const result = await discountService.applyDiscountToPurchase(req.user._id, req.params.courseId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error applying discount:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
