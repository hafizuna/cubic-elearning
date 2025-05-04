/**
 * Simple test script for video forwarding functionality
 * This script tests direct forwarding without database dependencies
 */

const axios = require('axios');

// Telegram API URL with bot token
const TELEGRAM_BOT_TOKEN = '7550433515:AAGMGXVNOYst7msCozkf7deaCtesdoODbMM';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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

/**
 * Send a message to a Telegram chat
 */
async function sendMessage(chatId, text) {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });
    
    console.log('Message sent successfully');
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.message);
    throw error;
  }
}

/**
 * Copy a message from one chat to another without showing "Forwarded from"
 */
async function copyMessage(toChatId, fromChatId, messageId, caption = null) {
  try {
    console.log(`Copying message ${messageId} from chat ${fromChatId} to chat ${toChatId}`);
    
    const params = {
      chat_id: toChatId,
      from_chat_id: fromChatId,
      message_id: messageId
    };
    
    // Add caption if provided
    if (caption) {
      params.caption = caption;
      params.parse_mode = 'HTML';
    }
    
    const response = await axios.post(`${TELEGRAM_API_URL}/copyMessage`, params);
    
    console.log('Message copied successfully');
    return response.data;
  } catch (error) {
    console.error('Error copying message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Test direct message copying
 */
async function testDirectCopying() {
  console.log('=== Testing Direct Message Copying (No "Forwarded from") ===');
  
  // First send a notification message
  await sendMessage(TEST_CHAT_ID, '🧪 <b>Starting Video Copying Test</b>\n\nTesting message copying without "Forwarded from"...');
  
  for (const video of testVideos) {
    try {
      console.log(`Copying video ${video.filename} (Message ID: ${video.messageId})...`);
      
      const result = await copyMessage(
        TEST_CHAT_ID,
        SOURCE_CHAT_ID,
        video.messageId,
        `Video: ${video.filename} (copied without forwarded tag)`
      );
      
      console.log(`✅ Successfully copied video ${video.filename}`);
      console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(`❌ Failed to copy video ${video.filename}:`, error.message);
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Send a completion message
  await sendMessage(TEST_CHAT_ID, '✅ <b>Video Copying Test Completed</b>');
}

/**
 * Run the test
 */
async function runTest() {
  try {
    console.log('Starting video copying test...');
    await testDirectCopying();
    console.log('Test completed!');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest();
