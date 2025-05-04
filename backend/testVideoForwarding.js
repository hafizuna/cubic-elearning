/**
 * Test script for video forwarding functionality
 * This script tests different methods of sending videos through the Telegram bot
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const telegramService = require('./services/telegramBotService');

// Configuration
const TEST_CHAT_ID = process.env.TEST_CHAT_ID || '1074390224'; // Replace with your chat ID for testing
const SOURCE_CHAT_ID = '1074390224'; // The source chat where videos are stored

// Test videos (filename to message ID mapping)
const testVideos = [
  { filename: 'quifxbi9fdc4zs7nckz1.mp4', messageId: 336 },
  { filename: 'o7i7uuqlfuypatvkhjqs.mp4', messageId: 335 },
  { filename: 'lmpfgpghckcg6qdtyspe.mp4', messageId: 338 },
  { filename: 'mkrbew7kg5zahgwhuazg.mp4', messageId: 334 },
  { filename: 'fp68skhdpulzfh2nrhop.mp4', messageId: 337 }
];

// Cloudinary URLs for testing
const cloudinaryUrls = [
  'https://res.cloudinary.com/dwmgsa1fx/video/upload/v1746102276/cubic-elearning/lessons/quifxbi9fdc4zs7nckz1.mp4',
  'https://res.cloudinary.com/dwmgsa1fx/video/upload/v1746102276/cubic-elearning/lessons/o7i7uuqlfuypatvkhjqs.mp4',
  'https://res.cloudinary.com/dwmgsa1fx/video/upload/v1746102276/cubic-elearning/lessons/lmpfgpghckcg6qdtyspe.mp4',
  'https://res.cloudinary.com/dwmgsa1fx/video/upload/v1746102276/cubic-elearning/lessons/mkrbew7kg5zahgwhuazg.mp4',
  'https://res.cloudinary.com/dwmgsa1fx/video/upload/v1746102276/cubic-elearning/lessons/fp68skhdpulzfh2nrhop.mp4'
];

/**
 * Test direct message forwarding
 */
async function testDirectForwarding() {
  console.log('=== Testing Direct Message Forwarding ===');
  
  for (const video of testVideos) {
    try {
      console.log(`Forwarding video ${video.filename} (Message ID: ${video.messageId})...`);
      
      const result = await telegramService.forwardMessage(
        TEST_CHAT_ID,
        SOURCE_CHAT_ID,
        video.messageId
      );
      
      console.log(`✅ Successfully forwarded video ${video.filename}`);
      console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`❌ Failed to forward video ${video.filename}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Test forwarding by filename
 */
async function testFilenameForwarding() {
  console.log('=== Testing Filename-Based Forwarding ===');
  
  for (const video of testVideos) {
    try {
      console.log(`Forwarding video by filename: ${video.filename}...`);
      
      const result = await telegramService.forwardVideoByFilename(
        TEST_CHAT_ID,
        video.filename,
        `Test forwarding for ${video.filename}`
      );
      
      if (result) {
        console.log(`✅ Successfully forwarded video ${video.filename} by filename`);
        console.log('Response:', JSON.stringify(result, null, 2));
      } else {
        console.log(`❌ No result returned for ${video.filename}`);
      }
    } catch (error) {
      console.error(`❌ Failed to forward video ${video.filename} by filename:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Test sending videos via the sendVideo function
 */
async function testSendVideo() {
  console.log('=== Testing sendVideo Function ===');
  
  for (let i = 0; i < cloudinaryUrls.length; i++) {
    const url = cloudinaryUrls[i];
    const filename = testVideos[i].filename;
    
    try {
      console.log(`Sending video from URL: ${url}...`);
      
      const result = await telegramService.sendVideo(
        TEST_CHAT_ID,
        url,
        `Test sending for ${filename}`,
        '68134b0bd2f8467ea5c9d0b5' // Sample course ID
      );
      
      if (result) {
        console.log(`✅ Successfully sent video ${filename} via sendVideo`);
        console.log('Response:', JSON.stringify(result, null, 2));
      } else {
        console.log(`❌ No result returned for ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send video ${filename} via sendVideo:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    console.log('Starting video forwarding tests...');
    
    // First test direct forwarding
    await testDirectForwarding();
    
    console.log('\n');
    
    // Then test filename-based forwarding
    await testFilenameForwarding();
    
    console.log('\n');
    
    // Finally test the sendVideo function
    await testSendVideo();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Check if this script is being run directly
if (require.main === module) {
  // Run the tests
  runAllTests();
}

module.exports = {
  testDirectForwarding,
  testFilenameForwarding,
  testSendVideo,
  runAllTests
};
