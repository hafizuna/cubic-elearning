const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage for course images
const courseImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cubic-elearning/courses',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 300, crop: 'fill' }]
  }
});

// Configure storage for lesson videos
const lessonVideoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cubic-elearning/lessons',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'wmv'],
    chunk_size: 6000000 // 6MB chunks for faster uploads
  }
});

// Create multer upload instances
const uploadCourseImage = multer({ storage: courseImageStorage });
const uploadLessonVideo = multer({ storage: lessonVideoStorage });

module.exports = {
  cloudinary,
  uploadCourseImage,
  uploadLessonVideo
};
