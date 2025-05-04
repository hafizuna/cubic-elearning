// Import required modules
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const Course = require('../models/Course');
const User = require('../models/User');
const UserCourse = require('../models/UserCourse');
const UserData = require('../models/UserData');

// Telegram API configuration
const TELEGRAM_BOT_TOKEN = '7550433515:AAGMGXVNOYst7msCozkf7deaCtesdoODbMM';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const SOURCE_CHAT_ID = '1074390224'; // The chat where videos are stored

// Video storage - simple in-memory maps for fallback
const videoMessageIds = {
  'quifxbi9fdc4zs7nckz1.mp4': 336,
  'o7i7uuqlfuypatvkhjqs.mp4': 335, 
  'lmpfgpghckcg6qdtyspe.mp4': 338,
  'mkrbew7kg5zahgwhuazg.mp4': 334,
  'fp68skhdpulzfh2nrhop.mp4': 337
};

// Polling control
let isPolling = false;

/**
 * Extract filename from a URL
 */
function extractFilename(url) {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/**
 * Get video message ID by filename
 */
function getVideoByFilename(filename) {
  if (videoMessageIds[filename]) {
    console.log(`Found message ID ${videoMessageIds[filename]} for ${filename}`);
    return videoMessageIds[filename];
  }
  return null;
}

/**
 * Get video message ID by URL
 */
async function getVideoMessageIdByUrl(videoUrl) {
  try {
    // Extract filename from URL
    const filename = extractFilename(videoUrl);
    if (!filename) {
      console.error('Could not extract filename from URL:', videoUrl);
      return null;
    }
    
    // First check our in-memory cache
    const messageId = getVideoByFilename(filename);
    if (messageId) {
      return messageId;
    }
    
    // If not in cache, try to find it in the database
    // This will search all courses for a lesson with this video URL
    const courses = await Course.find({
      "lessons.videoUrl": videoUrl
    });
    
    if (courses && courses.length > 0) {
      console.log(`Found ${courses.length} courses with this video URL`);
      // We found at least one course with this video
      // Now we need to find the specific lesson
      for (const course of courses) {
        const lesson = course.lessons.find(l => l.videoUrl === videoUrl);
        if (lesson && lesson.telegramMessageId) {
          console.log(`Found message ID ${lesson.telegramMessageId} in database for video ${filename}`);
          // Store in our in-memory cache for future use
          videoMessageIds[filename] = lesson.telegramMessageId;
          return lesson.telegramMessageId;
        }
      }
    }
    
    // If we get here, we couldn't find the message ID
    console.log(`No message ID found for ${filename}, will need to download and send`);
    return null;
  } catch (error) {
    console.error('Error getting video message ID by URL:', error.message);
    return null;
  }
}

/**
 * Store video message ID in database
 */
async function storeVideoMessageId(videoUrl, messageId) {
  try {
    const filename = extractFilename(videoUrl);
    if (!filename) {
      console.error('Could not extract filename from URL:', videoUrl);
      return;
    }
    
    // Store in memory for immediate use
    videoMessageIds[filename] = messageId;
    
    // Also update the database for all lessons with this video URL
    const result = await Course.updateMany(
      { "lessons.videoUrl": videoUrl },
      { $set: { "lessons.$.telegramMessageId": messageId } }
    );
    
    console.log(`Updated ${result.modifiedCount} lessons with message ID ${messageId} for video ${filename}`);
  } catch (error) {
    console.error('Error storing video message ID:', error.message);
  }
}

/**
 * Send a text message to a chat
 */
async function sendMessage(chatId, text, keyboard = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (keyboard) {
      payload.reply_markup = keyboard;
    }
    
    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, payload);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.message);
    return null;
  }
}

/**
 * Forward a message from one chat to another
 */
async function forwardMessage(toChatId, messageId) {
  try {
    console.log(`Forwarding message ${messageId} from ${SOURCE_CHAT_ID} to ${toChatId}`);
    
    const response = await axios.post(`${TELEGRAM_API_URL}/forwardMessage`, {
      chat_id: toChatId,
      from_chat_id: SOURCE_CHAT_ID,
      message_id: messageId
    });
    
    console.log('Message forwarded successfully');
    return response.data;
  } catch (error) {
    console.error('Error forwarding message:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    return null;
  }
}

/**
 * Copy a message without showing "Forwarded from"
 */
async function copyMessage(toChatId, messageId, caption) {
  try {
    console.log(`Copying message ${messageId} from ${SOURCE_CHAT_ID} to ${toChatId}`);
    
    const payload = {
      chat_id: toChatId,
      from_chat_id: SOURCE_CHAT_ID,
      message_id: messageId,
      protect_content: true
    };
    
    if (caption) {
      payload.caption = caption;
      payload.parse_mode = 'HTML';
    }
    
    const response = await axios.post(`${TELEGRAM_API_URL}/copyMessage`, payload);
    
    console.log('Message copied successfully with protection');
    return response.data;
  } catch (error) {
    console.error('Error copying message:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    return null;
  }
}

/**
 * Send a video to a chat
 */
async function sendVideo(chatId, videoUrl, caption) {
  try {
    if (!videoUrl) {
      console.error('No video URL provided');
      await sendMessage(chatId, 'Sorry, this lesson does not have a video.');
      return;
    }
    
    console.log(`Sending video ${videoUrl} to ${chatId}`);
    
    // Get the filename from the URL
    const filename = extractFilename(videoUrl);
    if (!filename) {
      console.error('Could not extract filename from URL:', videoUrl);
      await sendMessage(chatId, 'Sorry, there was an error processing the video.');
      return;
    }
    
    // Try to get the message ID from database or memory
    const messageId = await getVideoMessageIdByUrl(videoUrl);
    
    if (messageId) {
      console.log(`Copying message ${messageId} from ${SOURCE_CHAT_ID} to ${chatId}`);
      
      try {
        // Use copyMessage to avoid "Forwarded from" text
        const response = await axios.post(`${TELEGRAM_API_URL}/copyMessage`, {
          chat_id: chatId,
          from_chat_id: SOURCE_CHAT_ID,
          message_id: messageId,
          caption: caption,
          parse_mode: 'HTML',
          protect_content: true // Prevent users from saving or forwarding the video
        });
        
        console.log('Message copied successfully with protection');
        console.log('Video copied successfully');
        return;
      } catch (error) {
        console.error('Error copying message:', error.message);
        // If copying fails, fall back to downloading and sending
      }
    }
    
    // If we get here, we need to download and send the video
    console.log(`No message ID found for ${filename}, downloading and sending...`);
    
    // Download the video
    const videoResponse = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream'
    });
    
    // Create a temporary file to store the video
    const tempFilePath = path.join(__dirname, '..', 'temp', filename);
    const tempDir = path.dirname(tempFilePath);
    
    // Create the temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Save the video to the temporary file
    const writer = fs.createWriteStream(tempFilePath);
    videoResponse.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log(`Video downloaded to ${tempFilePath}`);
    
    // Create a form to send the video
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('video', fs.createReadStream(tempFilePath));
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('protect_content', 'true');
    
    // Send the video
    const sendResponse = await axios.post(`${TELEGRAM_API_URL}/sendVideo`, form, {
      headers: form.getHeaders()
    });
    
    console.log('Video sent successfully');
    
    // Store the message ID for future use
    if (sendResponse.data && sendResponse.data.result && sendResponse.data.result.message_id) {
      const newMessageId = sendResponse.data.result.message_id;
      await storeVideoMessageId(videoUrl, newMessageId);
    }
    
    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);
    console.log(`Deleted temporary file ${tempFilePath}`);
  } catch (error) {
    console.error('Error sending video:', error.message);
    await sendMessage(chatId, 'Sorry, there was an error sending the video.');
  }
}

/**
 * Get a user by Telegram chat ID
 */
async function getUserByChatId(chatId) {
  try {
    return await User.findOne({ telegramChatId: chatId });
  } catch (error) {
    console.error('Error finding user by chat ID:', error.message);
    return null;
  }
}

/**
 * Get a course by ID
 */
async function getCourseById(courseId) {
  try {
    return await Course.findById(courseId);
  } catch (error) {
    console.error('Error finding course by ID:', error.message);
    return null;
  }
}

/**
 * Mark a lesson as completed for a user
 */
async function markLessonAsCompleted(userId, courseId, lessonOrder) {
  try {
    console.log(`Marking lesson ${lessonOrder} as completed for user ${userId} in course ${courseId}`);
    
    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      console.error(`Course ${courseId} not found`);
      return null;
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User ${userId} not found`);
      return null;
    }
    
    // Find or create user course record
    let userCourse = await UserCourse.findOne({
      user: userId,
      course: courseId
    });
    
    if (!userCourse) {
      userCourse = new UserCourse({
        user: userId,
        course: courseId,
        completedLessons: [],
        progress: 0
      });
    }
    
    // Check if lesson is already completed
    if (!userCourse.completedLessons.includes(lessonOrder)) {
      userCourse.completedLessons.push(lessonOrder);
      userCourse.lastAccessed = Date.now();
      
      // Calculate progress percentage
      userCourse.progress = Math.round((userCourse.completedLessons.length / course.lessons.length) * 100);
      
      await userCourse.save();
      
      // Update user streak and points
      user.points += 5;
      
      // Check if user was active today already
      const today = new Date();
      const lastActive = new Date(user.lastActive || Date.now());
      
      if (today.getDate() !== lastActive.getDate() || 
          today.getMonth() !== lastActive.getMonth() || 
          today.getFullYear() !== lastActive.getFullYear()) {
        // New day, increment streak
        user.streakCount = (user.streakCount || 0) + 1;
      }
      
      user.lastActive = Date.now();
      await user.save();
      
      // Create notifications for progress milestones
      try {
        let userData = await UserData.findOne({ user: userId });
        
        if (!userData) {
          userData = new UserData({
            user: userId,
            lastLogin: Date.now(),
            notifications: []
          });
        }
        
        // Add notification for completing a lesson
        userData.notifications.push({
          type: 'course_completion',
          message: `You completed a lesson in "${course.title}"!`,
          createdAt: Date.now(),
          relatedCourse: courseId
        });
        
        // Check if course is now 100% complete
        if (userCourse.progress === 100) {
          userData.notifications.push({
            type: 'achievement',
            message: `Congratulations! You've completed the entire "${course.title}" course!`,
            createdAt: Date.now(),
            relatedCourse: courseId
          });
        }
        // Check for 50% milestone
        else if (userCourse.progress === 50) {
          userData.notifications.push({
            type: 'achievement',
            message: `You're halfway through the "${course.title}" course. Keep going!`,
            createdAt: Date.now(),
            relatedCourse: courseId
          });
        }
        
        await userData.save();
      } catch (error) {
        console.error('Error creating notifications:', error);
        // Don't fail the main operation if notifications fail
      }
      
      return {
        newCompletion: true,
        completedLessons: userCourse.completedLessons,
        progress: userCourse.progress,
        streakCount: user.streakCount,
        points: user.points
      };
    }
    
    return {
      newCompletion: false,
      completedLessons: userCourse.completedLessons,
      progress: userCourse.progress,
      streakCount: user.streakCount || 0,
      points: user.points
    };
  } catch (error) {
    console.error('Error marking lesson as completed:', error.message);
    return null;
  }
}

/**
 * Send the course menu (list of lessons)
 */
async function sendCourseMenu(chatId, course) {
  try {
    let menuText = `<b>📚 All Lessons in this Course:</b>\n\n`;
    
    course.lessons.forEach((lesson, index) => {
      menuText += `${index + 1}. ${lesson.title}\n`;
    });
    
    menuText += `\n<i>Use the /lesson command followed by the lesson number to access a specific lesson. For example:</i>\n/lesson 2`;
    
    // Create an inline keyboard with buttons for each lesson
    const keyboard = {
      inline_keyboard: course.lessons.map((lesson, index) => {
        return [{
          text: `${index + 1}. ${lesson.title}`,
          callback_data: `lesson_${index + 1}`
        }];
      })
    };
    
    await sendMessage(chatId, menuText, keyboard);
  } catch (error) {
    console.error('Error sending course menu:', error.message);
  }
}

/**
 * Get course by ID
 */
async function getCourseById(courseId) {
  try {
    return await Course.findById(courseId);
  } catch (error) {
    console.error('Error getting course by ID:', error.message);
    return null;
  }
}

/**
 * Get user by Telegram chat ID
 */
async function getUserByChatId(chatId) {
  try {
    return await User.findOne({ telegramChatId: chatId });
  } catch (error) {
    console.error('Error getting user by chat ID:', error.message);
    return null;
  }
}

/**
 * Create or update a user for Telegram
 */
async function createOrUpdateUser(chatId, username, firstName, lastName) {
  try {
    // Check if user already exists
    let user = await User.findOne({ telegramChatId: chatId });
    
    if (user) {
      // Update existing user
      user.telegramUsername = username || user.telegramUsername;
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      // Make sure name is set
      if (!user.name) {
        user.name = `${firstName || ''} ${lastName || ''}`.trim() || `Telegram User ${chatId}`;
      }
      await user.save();
      console.log(`Updated user for Telegram chat ${chatId}`);
      return user;
    } else {
      // Create a new user with random credentials to satisfy validation
      const randomString = Math.random().toString(36).substring(2, 12);
      const email = `telegram_${randomString}@example.com`;
      const password = randomString;
      
      // Construct a name from first and last name, or use a default
      const name = `${firstName || ''} ${lastName || ''}`.trim() || `Telegram User ${chatId}`;
      
      user = new User({
        name, // Required field in the User schema
        email,
        password,
        telegramChatId: chatId,
        telegramUsername: username,
        points: 0,
        streakCount: 0,
        lastActive: new Date()
      });
      
      await user.save();
      console.log(`Created new user for Telegram chat ${chatId}`);
      return user;
    }
  } catch (error) {
    console.error('Error creating/updating user:', error.message);
    return null;
  }
}

/**
 * Mark a lesson as completed and update user progress
 */
async function markLessonAsCompleted(userId, courseId, lessonNumber) {
  try {
    // Get the user course record
    let userCourse = await UserCourse.findOne({
      user: userId,
      course: courseId
    });
    
    // If no user course record exists, create one
    if (!userCourse) {
      userCourse = new UserCourse({
        user: userId,
        course: courseId,
        completedLessons: [],
        progress: 0
      });
    }
    
    // Check if the lesson is already completed
    const isAlreadyCompleted = userCourse.completedLessons.includes(lessonNumber);
    
    // If not already completed, add it to the list
    if (!isAlreadyCompleted) {
      userCourse.completedLessons.push(lessonNumber);
      
      // Get the course to calculate progress
      const course = await Course.findById(courseId);
      if (course) {
        // Calculate progress percentage
        const totalLessons = course.lessons.length;
        const completedCount = userCourse.completedLessons.length;
        userCourse.progress = Math.round((completedCount / totalLessons) * 100);
      }
      
      await userCourse.save();
      
      // Update user points and streak
      const user = await User.findById(userId);
      if (user) {
        // Add points for completing a lesson
        user.points = (user.points || 0) + 5;
        
        // Update streak if active today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastActive = user.lastActive ? new Date(user.lastActive) : null;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        if (lastActive && lastActive.getTime() === yesterday.getTime()) {
          // User was active yesterday, increment streak
          user.streakCount = (user.streakCount || 0) + 1;
        } else if (!lastActive || lastActive.getTime() < yesterday.getTime()) {
          // User wasn't active yesterday, reset streak
          user.streakCount = 1;
        }
        // If user was already active today, don't change streak
        
        user.lastActive = new Date();
        await user.save();
        
        return {
          newCompletion: true,
          progress: userCourse.progress,
          points: user.points,
          streakCount: user.streakCount
        };
      }
    }
    
    return {
      newCompletion: false,
      progress: userCourse.progress,
      points: 0,
      streakCount: 0
    };
  } catch (error) {
    console.error('Error marking lesson as completed:', error.message);
    return null;
  }
}

/**
 * Display all available courses
 */
async function displayAvailableCourses(chatId) {
  try {
    const courses = await Course.find({ published: true }).sort({ createdAt: -1 }).limit(10);
    
    if (!courses || courses.length === 0) {
      await sendMessage(chatId, 'No courses available at the moment.');
      return;
    }
    
    let courseList = '<b>📚 Available Courses:</b>\n\n';
    
    // Create an inline keyboard with buttons for each course
    const keyboard = {
      inline_keyboard: courses.map((course, index) => {
        // Format the course title and add emoji based on difficulty
        let difficultyEmoji = '🟢'; // Beginner
        if (course.difficulty === 'Intermediate') difficultyEmoji = '🟠';
        if (course.difficulty === 'Advanced') difficultyEmoji = '🔴';
        
        courseList += `${index + 1}. ${difficultyEmoji} <b>${course.title}</b>\n` +
                      `   <i>${course.description.substring(0, 60)}...</i>\n\n`;
        
        return [{
          text: `${index + 1}. ${course.title}`,
          callback_data: `start_${course._id}`
        }];
      })
    };
    
    await sendMessage(chatId, courseList, keyboard);
  } catch (error) {
    console.error('Error displaying available courses:', error.message);
    await sendMessage(chatId, 'Sorry, there was an error fetching the courses.');
  }
}

/**
 * Handle the /start command
 */
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  
  console.log(`Handling /start command from ${chatId}`);
  
  try {
    // Create or update user
    const user = await createOrUpdateUser(
      chatId,
      msg.from.username,
      msg.from.first_name,
      msg.from.last_name
    );
    
    if (!user) {
      await sendMessage(chatId, 'Sorry, there was an error creating your account.');
      return;
    }
    
    // Check if a course ID was provided
    const parts = text.split(' ');
    if (parts.length > 1) {
      const courseId = parts[1];
      console.log(`Course ID from /start command: ${courseId}`);
      
      // Get the course
      const course = await getCourseById(courseId);
      if (!course) {
        await sendMessage(chatId, 'Sorry, I could not find that course.');
        await displayAvailableCourses(chatId);
        return;
      }
      
      // Set as active course
      user.activeCourse = courseId;
      await user.save();
      
      // Create user course record if it doesn't exist
      let userCourse = await UserCourse.findOne({
        user: user._id,
        course: courseId
      });
      
      if (!userCourse) {
        userCourse = new UserCourse({
          user: user._id,
          course: courseId,
          completedLessons: [],
          progress: 0
        });
        await userCourse.save();
      }
      
      // Send welcome message
      await sendMessage(
        chatId,
        `<b>Welcome to "${course.title}"!</b>\n\n` +
        `${course.description}\n\n` +
        `This course has ${course.lessons.length} lessons. Use /lesson followed by the lesson number to access a specific lesson (e.g., /lesson 1).`
      );
      
      // Send course menu
      await sendCourseMenu(chatId, course);
    } else {
      // No course ID provided, show welcome message and available courses
      await sendMessage(
        chatId,
        `<b>👋 Welcome to EduBoost!</b>\n\n` +
        `I'm your personal learning assistant. I can help you access your course materials and track your progress.\n\n` +
        `<b>Available Commands:</b>\n` +
        `/start - Begin learning a course\n` +
        `/lesson [number] - Access a specific lesson\n` +
        `/help - Show help information\n` +
        `/progress - View your course progress\n\n` +
        `Let's get started by choosing a course:`
      );
      
      await displayAvailableCourses(chatId);
    }
  } catch (error) {
    console.error('Error handling /start command:', error.message);
    await sendMessage(chatId, 'Sorry, an error occurred. Please try again later.');
  }
}

/**
 * Handle the /lesson command
 */
async function handleLesson(msg) {
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  
  console.log(`Handling /lesson command from ${chatId}: ${text}`);
  
  try {
    // Get the lesson number
    const parts = text.split(' ');
    let lessonNumber = 1;
    
    if (parts.length > 1) {
      lessonNumber = parseInt(parts[1]);
      if (isNaN(lessonNumber) || lessonNumber < 1) {
        lessonNumber = 1;
      }
    }
    
    // Get the user's active course
    const user = await getUserByChatId(chatId);
    if (!user || !user.activeCourse) {
      // If no active course, show a list of available courses
      const courses = await Course.find().limit(5);
      
      if (courses && courses.length > 0) {
        let courseList = '<b>📚 Available Courses:</b>\n\n';
        
        courses.forEach((course, index) => {
          courseList += `${index + 1}. ${course.title}\n`;
        });
        
        courseList += '\n<i>Use /start followed by the course ID to begin learning. For example:</i>\n/start ' + courses[0]._id;
        
        await sendMessage(chatId, courseList);
      } else {
        await sendMessage(chatId, 'You don\'t have an active course. Use the "Continue Learning in Telegram" button from the website.');
      }
      return;
    }
    
    // Get the course
    const course = await getCourseById(user.activeCourse);
    if (!course) {
      await sendMessage(chatId, 'Sorry, I could not find your active course.');
      return;
    }
    
    // Check if the lesson number is valid
    if (lessonNumber > course.lessons.length) {
      await sendMessage(chatId, `This course only has ${course.lessons.length} lessons. Please choose a valid lesson number.`);
      await sendCourseMenu(chatId, course);
      return;
    }
    
    // Get the lesson
    const lesson = course.lessons[lessonNumber - 1];
    
    // Get user's progress for this course
    let userCourse = await UserCourse.findOne({
      user: user._id,
      course: course._id
    });
    
    const isLessonCompleted = userCourse && userCourse.completedLessons.includes(lessonNumber);
    
    // Send the lesson with a beautiful header
    await sendMessage(
      chatId,
      `🎓 <b>${course.title}</b>\n\n` +
      `📝 <b>Lesson ${lessonNumber}: ${lesson.title}</b>\n\n` +
      `${lesson.description}\n\n` +
      `${isLessonCompleted ? '✅ You have completed this lesson!' : '⏳ Lesson in progress...'}\n\n` +
      `Preparing your video lesson...`
    );
    
    // Send a progress update
    if (userCourse) {
      const progressBar = generateProgressBar(userCourse.progress);
      await sendMessage(
        chatId,
        `📊 <b>Your Progress:</b>\n\n` +
        `${progressBar} ${userCourse.progress}%\n\n` +
        `🔥 Streak: ${user.streakCount || 0} days\n` +
        `⭐ Points: ${user.points || 0}`
      );
    }
    
    // Send the video
    if (lesson.videoUrl) {
      await sendVideo(chatId, lesson.videoUrl, lesson.title);
      
      // Create the keyboard with Mark as Complete button if not already completed
      const keyboard = {
        inline_keyboard: [
          // Only show Mark as Complete if not already completed
          ...(!isLessonCompleted ? [[{
            text: "✅ Mark as Complete",
            callback_data: `complete_${lessonNumber}`
          }]] : []),
          
          // Navigation buttons
          [
            ...(lessonNumber > 1 ? [{
              text: "⬅️ Previous Lesson",
              callback_data: `lesson_${lessonNumber - 1}`
            }] : []),
            
            ...(lessonNumber < course.lessons.length ? [{
              text: "Next Lesson ➡️",
              callback_data: `lesson_${lessonNumber + 1}`
            }] : [])
          ],
          
          // Course menu button
          [{
            text: "📚 Course Menu",
            callback_data: "course_menu"
          }]
        ]
      };
      
      await sendMessage(
        chatId,
        `<b>📝 Lesson Controls</b>\n\n` +
        `Use the buttons below to navigate or mark this lesson as complete.`,
        keyboard
      );
    } else {
      await sendMessage(chatId, 'This lesson does not have a video.');
    }
  } catch (error) {
    console.error('Error handling /lesson command:', error.message);
    await sendMessage(chatId, 'Sorry, an error occurred. Please try again later.');
  }
}

/**
 * Generate a visual progress bar
 */
function generateProgressBar(percentage, length = 10) {
  const filledCount = Math.round(percentage * length / 100);
  const emptyCount = length - filledCount;
  
  const filledBar = '🟩'.repeat(filledCount);
  const emptyBar = '⬜'.repeat(emptyCount);
  
  return filledBar + emptyBar;
}

/**
 * Handle lesson completion
 */
async function handleLessonCompletion(chatId, lessonNumber) {
  try {
    // Get the user
    const user = await getUserByChatId(chatId);
    if (!user || !user.activeCourse) {
      await sendMessage(chatId, 'You don\'t have an active course.');
      return;
    }
    
    // Mark the lesson as completed
    const result = await markLessonAsCompleted(user._id, user.activeCourse, lessonNumber);
    
    if (!result) {
      await sendMessage(chatId, 'Sorry, I couldn\'t mark this lesson as completed.');
      return;
    }
    
    if (result.newCompletion) {
      // Send a congratulatory message with rewards
      const progressBar = generateProgressBar(result.progress);
      
      await sendMessage(
        chatId,
        `🎉 <b>Congratulations!</b> 🎉\n\n` +
        `You've completed Lesson ${lessonNumber}!\n\n` +
        `🏆 <b>Rewards:</b>\n` +
        `⭐ +5 points (Total: ${result.points})\n` +
        `🔥 ${result.streakCount} day streak\n\n` +
        `📊 <b>Course Progress:</b>\n` +
        `${progressBar} ${result.progress}%\n\n` +
        `Keep up the great work! 💪`
      );
      
      // If course is 100% complete, send a special message
      if (result.progress === 100) {
        await sendMessage(
          chatId,
          `🏆 <b>COURSE COMPLETED!</b> 🏆\n\n` +
          `Amazing job! You've completed the entire course.\n\n` +
          `Continue your learning journey with another course from our catalog!`
        );
      }
      
      // Offer to go to the next lesson if available
      const course = await getCourseById(user.activeCourse);
      if (course && lessonNumber < course.lessons.length) {
        const nextLessonNumber = lessonNumber + 1;
        const nextLesson = course.lessons[nextLessonNumber - 1];
        
        const keyboard = {
          inline_keyboard: [
            [{
              text: `Next Lesson: ${nextLesson.title}`,
              callback_data: `lesson_${nextLessonNumber}`
            }],
            [{
              text: "📚 Course Menu",
              callback_data: "course_menu"
            }]
          ]
        };
        
        await sendMessage(
          chatId,
          `<b>Ready for more?</b>\nContinue to the next lesson when you're ready.`,
          keyboard
        );
      }
    } else {
      // Lesson was already completed
      await sendMessage(
        chatId,
        `You've already completed this lesson.\n\n` +
        `📊 <b>Course Progress:</b> ${result.progress}%`
      );
    }
  } catch (error) {
    console.error('Error handling lesson completion:', error.message);
    await sendMessage(chatId, 'Sorry, an error occurred while marking the lesson as completed.');
  }
}

/**
 * Process an update from Telegram
 */
async function processUpdate(update) {
  try {
    // Check if this is a message
    if (update.message) {
      const msg = update.message;
      
      // Check if this is a command
      if (msg.text && msg.text.startsWith('/')) {
        const command = msg.text.split(' ')[0].toLowerCase();
        
        if (command === '/start') {
          await handleStart(msg);
        } else if (command === '/lesson') {
          await handleLesson(msg);
        } else if (command === '/help') {
          await sendMessage(
            msg.chat.id,
            '🤖 <b>EduBoost Bot Help</b>\n\n' +
            'I can help you access your course materials and track your progress.\n\n' +
            '<b>Available Commands:</b>\n' +
            '/start - Begin learning a course\n' +
            '/lesson [number] - Access a specific lesson\n' +
            '/help - Show this help message\n' +
            '/progress - View your course progress\n\n' +
            'You can also use the buttons below messages to navigate.'
          );
        } else if (command === '/progress') {
          // Show user progress
          const user = await getUserByChatId(msg.chat.id);
          if (!user || !user.activeCourse) {
            await sendMessage(msg.chat.id, 'You don\'t have an active course.');
            return;
          }
          
          const userCourse = await UserCourse.findOne({
            user: user._id,
            course: user.activeCourse
          });
          
          if (!userCourse) {
            await sendMessage(msg.chat.id, 'No progress data found for your active course.');
            return;
          }
          
          const course = await getCourseById(user.activeCourse);
          if (!course) {
            await sendMessage(msg.chat.id, 'Course not found.');
            return;
          }
          
          const progressBar = generateProgressBar(userCourse.progress);
          
          await sendMessage(
            msg.chat.id,
            `📊 <b>Your Progress in "${course.title}"</b>\n\n` +
            `${progressBar} ${userCourse.progress}%\n\n` +
            `✅ Completed Lessons: ${userCourse.completedLessons.length}/${course.lessons.length}\n` +
            `🔥 Streak: ${user.streakCount || 0} days\n` +
            `⭐ Points: ${user.points || 0}\n\n` +
            `Keep up the great work! 💪`
          );
        } else if (command === '/list' && msg.chat.id.toString() === SOURCE_CHAT_ID) {
          // Special command to list stored videos
          let listText = '<b>Stored Video Message IDs:</b>\n\n';
          
          for (const [filename, messageId] of Object.entries(videoMessageIds)) {
            listText += `Filename: ${filename}\nMessage ID: ${messageId}\n\n`;
          }
          
          await sendMessage(msg.chat.id, listText);
        } else {
          await sendMessage(msg.chat.id, 'Unknown command. Try /start, /help, /lesson, or /progress.');
        }
      }
    }
    // Handle callback queries (for inline buttons)
    else if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      
      console.log(`Received callback query: ${data}`);
      
      // Handle different callback types
      if (data.startsWith('lesson_')) {
        const lessonNumber = parseInt(data.split('_')[1]);
        if (!isNaN(lessonNumber)) {
          // Create a fake message object to pass to handleLesson
          const fakeMsg = {
            chat: { id: chatId },
            text: `/lesson ${lessonNumber}`
          };
          
          await handleLesson(fakeMsg);
        }
      } else if (data.startsWith('complete_')) {
        const lessonNumber = parseInt(data.split('_')[1]);
        if (!isNaN(lessonNumber)) {
          await handleLessonCompletion(chatId, lessonNumber);
        }
      } else if (data === 'course_menu') {
        // Show course menu
        const user = await getUserByChatId(chatId);
        if (user && user.activeCourse) {
          const course = await getCourseById(user.activeCourse);
          if (course) {
            await sendCourseMenu(chatId, course);
          }
        }
      }
      
      // Answer the callback query to remove the loading state
      try {
        await axios.post(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
          callback_query_id: callbackQuery.id
        });
      } catch (error) {
        console.error('Error answering callback query:', error.message);
      }
    }
  } catch (error) {
    console.error('Error processing update:', error.message);
  }
}

/**
 * Start polling for updates
 */
async function startPolling() {
  console.log('Starting Telegram bot polling...');
  
  try {
    // Delete any existing webhook
    const response = await axios.get(`${TELEGRAM_API_URL}/deleteWebhook`);
    if (response.data && response.data.ok) {
      console.log('Deleted existing webhook');
    }
  } catch (error) {
    console.error('Error deleting webhook:', error.message);
    return;
  }
  
  isPolling = true;
  
  // Start the polling loop
  poll();
  
  console.log('Telegram bot polling started successfully');
}

/**
 * Poll for updates
 */
let lastUpdateId = 0;

async function poll() {
  if (!isPolling) {
    console.log('Polling stopped');
    return;
  }
  
  try {
    const response = await axios.get(`${TELEGRAM_API_URL}/getUpdates`, {
      params: {
        offset: lastUpdateId + 1,
        timeout: 30
      }
    });
    
    if (response.data && response.data.ok && response.data.result) {
      const updates = response.data.result;
      
      if (updates.length > 0) {
        console.log(`Received ${updates.length} updates`);
        
        // Process each update
        for (const update of updates) {
          await processUpdate(update);
          lastUpdateId = update.update_id;
        }
      }
    }
  } catch (error) {
    console.error('Error polling for updates:', error.message);
  }
  
  // Continue polling
  setTimeout(poll, 1000);
}

/**
 * Stop polling
 */
function stopPolling() {
  isPolling = false;
  console.log('Stopping Telegram bot polling...');
}

module.exports = {
  sendMessage,
  sendVideo,
  startPolling,
  stopPolling,
  processUpdate,
  markLessonAsCompleted
};
