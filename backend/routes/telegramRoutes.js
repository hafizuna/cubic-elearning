// telegramRoutes.js
const express = require('express');
const router = express.Router();
const telegramBotService = require('../services/telegramBotService');

/**
 * Webhook endpoint for Telegram bot updates
 * This endpoint receives updates from the Telegram API when users interact with the bot
 */
router.post('/webhook', async (req, res) => {
  try {
    // Process the update from Telegram
    await telegramBotService.processUpdate(req.body);
    
    // Always respond with 200 OK to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    // Still respond with 200 OK to prevent Telegram from retrying
    res.status(200).send('OK');
  }
});

/**
 * Endpoint to set up the webhook for the Telegram bot
 * This should be called once to configure the bot to send updates to our server
 */
router.post('/setup-webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }
    
    // Set the webhook URL for the Telegram bot
    const result = await telegramBotService.setWebhook(webhookUrl);
    
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Error setting up Telegram webhook:', error);
    res.status(500).json({ error: 'Failed to set up webhook' });
  }
});

/**
 * Test endpoint to send a message to a specific chat
 */
router.post('/send-message', async (req, res) => {
  try {
    const { chatId, text } = req.body;
    
    if (!chatId || !text) {
      return res.status(400).json({ error: 'Chat ID and text are required' });
    }
    
    // Send a message to the specified chat
    const result = await telegramBotService.sendMessage(chatId, text);
    
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
