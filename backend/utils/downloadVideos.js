// downloadVideos.js
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define the Lesson schema
const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    default: null
  },
  videoPublicId: {
    type: String,
    default: null
  },
  duration: {
    type: Number,
    default: 0 // Duration in seconds
  },
  order: {
    type: Number,
    required: true
  }
});

// Define the Course schema
const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  imagePublicId: {
    type: String,
    default: null
  },
  category: {
    type: String,
    default: 'General'
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  purchasedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  published: {
    type: Boolean,
    default: false
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lessons: [LessonSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create the Course model
const Course = mongoose.model('Course', CourseSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    downloadAllVideos();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

/**
 * Download a file from a URL to a local path
 * @param {string} url - The URL of the file to download
 * @param {string} localPath - The local path to save the file to
 * @returns {Promise<string>} - The local path of the downloaded file
 */
const downloadFile = async (url, localPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Download the file using axios
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });
      
      // Create a write stream and pipe the response data to it
      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);
      
      // Wait for the download to complete
      writer.on('finish', () => {
        console.log(`Downloaded: ${localPath}`);
        resolve(localPath);
      });
      
      writer.on('error', (err) => {
        console.error(`Error writing file: ${localPath}`, err);
        reject(err);
      });
    } catch (error) {
      console.error(`Error downloading file from ${url}:`, error);
      reject(error);
    }
  });
};

/**
 * Extract the filename from a Cloudinary URL
 * @param {string} url - The Cloudinary URL
 * @returns {string} - The extracted filename
 */
const extractFilenameFromUrl = (url) => {
  // Extract the filename from the Cloudinary URL
  // Example URL: https://res.cloudinary.com/dwmgsa1fx/video/upload/v1746102276/cubic-elearning/lessons/quifxbi9fdc4zs7nckz1.mp4
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename;
};

/**
 * Download all videos from the database
 */
const downloadAllVideos = async () => {
  try {
    console.log('Starting to download all videos from the database...');
    
    // Create videos directory if it doesn't exist
    const videosDir = path.join(__dirname, '../videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    
    // Create a tracking file to keep track of downloaded videos
    const trackingFilePath = path.join(videosDir, 'downloaded_videos.json');
    let downloadedVideosTracker = {};
    
    // Load existing tracking data if it exists
    if (fs.existsSync(trackingFilePath)) {
      try {
        const trackingData = fs.readFileSync(trackingFilePath, 'utf8');
        downloadedVideosTracker = JSON.parse(trackingData);
        console.log(`Loaded tracking data for ${Object.keys(downloadedVideosTracker).length} previously downloaded videos`);
      } catch (err) {
        console.error('Error loading tracking data:', err);
        // Continue with empty tracker
      }
    }
    
    // Get all courses from the database
    const courses = await Course.find({}).lean();
    console.log(`Found ${courses.length} courses in the database`);
    
    let totalVideos = 0;
    let downloadedVideos = 0;
    let skippedVideos = 0;
    let failedVideos = 0;
    
    // Process each course
    for (const course of courses) {
      console.log(`\n[Course] ${course.title} (${course._id})`);
      
      // Create course directory
      const courseDir = path.join(videosDir, course._id.toString());
      if (!fs.existsSync(courseDir)) {
        fs.mkdirSync(courseDir, { recursive: true });
      }
      
      // Process each lesson in the course
      if (course.lessons && course.lessons.length > 0) {
        console.log(`Course has ${course.lessons.length} lessons`);
        
        for (const lesson of course.lessons) {
          if (lesson.videoUrl) {
            totalVideos++;
            
            // Check if the URL is a Cloudinary URL
            if (lesson.videoUrl.includes('cloudinary.com')) {
              try {
                // Extract filename from the URL
                const filename = extractFilenameFromUrl(lesson.videoUrl);
                
                // Create the local path for the video
                const localPath = path.join(courseDir, filename);
                
                // Create a unique key for this video
                const videoKey = `${course._id}_${filename}`;
                
                // Check if the file already exists in the tracker
                if (downloadedVideosTracker[videoKey]) {
                  console.log(`[Skipped] Video already downloaded: ${filename}`);
                  skippedVideos++;
                  continue;
                }
                
                // Check if the file already exists on disk
                if (fs.existsSync(localPath)) {
                  console.log(`[Skipped] Video already exists on disk: ${filename}`);
                  // Add to tracker
                  downloadedVideosTracker[videoKey] = {
                    courseId: course._id.toString(),
                    lessonTitle: lesson.title,
                    filename: filename,
                    downloadDate: new Date().toISOString()
                  };
                  skippedVideos++;
                  continue;
                }
                
                // Download the video
                console.log(`[Downloading] ${lesson.title}: ${filename}`);
                console.log(`URL: ${lesson.videoUrl}`);
                
                const startTime = Date.now();
                await downloadFile(lesson.videoUrl, localPath);
                const endTime = Date.now();
                const downloadTime = ((endTime - startTime) / 1000).toFixed(2);
                
                // Add to tracker
                downloadedVideosTracker[videoKey] = {
                  courseId: course._id.toString(),
                  lessonTitle: lesson.title,
                  filename: filename,
                  downloadDate: new Date().toISOString()
                };
                
                // Save the tracker after each successful download
                fs.writeFileSync(trackingFilePath, JSON.stringify(downloadedVideosTracker, null, 2));
                
                downloadedVideos++;
                console.log(`[Success] Downloaded in ${downloadTime} seconds: ${filename}`);
                console.log(`Progress: ${downloadedVideos + skippedVideos}/${totalVideos} videos processed`);
                
              } catch (error) {
                console.error(`[Error] Failed to download video for lesson "${lesson.title}":`, error.message);
                failedVideos++;
              }
            } else {
              console.log(`[Skipped] Not a Cloudinary URL: ${lesson.videoUrl}`);
            }
          }
        }
      } else {
        console.log(`Course has no lessons`);
      }
    }
    
    // Save the final tracker
    fs.writeFileSync(trackingFilePath, JSON.stringify(downloadedVideosTracker, null, 2));
    
    console.log('\n=== Download Summary ===');
    console.log(`Total videos found: ${totalVideos}`);
    console.log(`Successfully downloaded: ${downloadedVideos}`);
    console.log(`Skipped (already downloaded): ${skippedVideos}`);
    console.log(`Failed downloads: ${failedVideos}`);
    console.log(`Videos directory: ${videosDir}`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    console.log('\nDownload process completed!');
  } catch (error) {
    console.error('Error downloading videos:', error);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.error('Disconnected from MongoDB due to error');
    
    process.exit(1);
  }
};

// If this script is run directly
if (require.main === module) {
  console.log('Running video download script...');
}
