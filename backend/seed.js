const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Course = require('./models/Course');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedData();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

const courses = [
  {
    title: 'Introduction to Programming',
    description: 'Learn the basics of programming with this beginner-friendly course.',
    image: 'https://via.placeholder.com/300x160?text=Programming',
    lessons: [
      {
        title: 'What is Programming?',
        description: 'An introduction to programming concepts',
        content: 'Programming is the process of creating a set of instructions that tell a computer how to perform a task.',
        order: 0
      },
      {
        title: 'Variables and Data Types',
        description: 'Understanding how to store and manipulate data',
        content: 'Variables are containers for storing data values. Different data types include numbers, strings, and booleans.',
        order: 1
      },
      {
        title: 'Control Structures',
        description: 'Learn about if statements and loops',
        content: 'Control structures like if statements and loops allow you to control the flow of your program.',
        order: 2
      },
      {
        title: 'Functions and Methods',
        description: 'Creating reusable blocks of code',
        content: 'Functions are reusable blocks of code that perform a specific task.',
        order: 3
      },
      {
        title: 'Arrays and Lists',
        description: 'Working with collections of data',
        content: 'Arrays and lists are data structures that store collections of items.',
        order: 4
      }
    ]
  },
  {
    title: 'Advanced Mathematics',
    description: 'Master complex mathematical concepts with interactive lessons.',
    image: 'https://via.placeholder.com/300x160?text=Mathematics',
    lessons: [
      {
        title: 'Linear Algebra Fundamentals',
        description: 'Introduction to vectors and matrices',
        content: 'Linear algebra is the branch of mathematics concerning linear equations, linear functions, and their representations through matrices and vector spaces.',
        order: 0
      },
      {
        title: 'Calculus: Derivatives',
        description: 'Understanding rates of change',
        content: 'Derivatives measure the rate at which a quantity changes with respect to another quantity.',
        order: 1
      },
      {
        title: 'Calculus: Integrals',
        description: 'Finding the area under curves',
        content: 'Integration is the process of finding the area under a curve.',
        order: 2
      },
      {
        title: 'Differential Equations',
        description: 'Solving equations with derivatives',
        content: 'Differential equations are mathematical equations that relate a function with its derivatives.',
        order: 3
      }
    ]
  },
  {
    title: 'Biology Fundamentals',
    description: 'Explore the fascinating world of biology with detailed illustrations.',
    image: 'https://via.placeholder.com/300x160?text=Biology',
    lessons: [
      {
        title: 'Introduction to Cells',
        description: 'The building blocks of life',
        content: 'Cells are the basic structural and functional units of all living organisms.',
        order: 0
      },
      {
        title: 'DNA and Genetics',
        description: 'Understanding heredity and genetic information',
        content: 'DNA is the molecule that carries the genetic instructions for the development, functioning, growth, and reproduction of all known organisms.',
        order: 1
      },
      {
        title: 'Evolution and Natural Selection',
        description: 'How species change over time',
        content: 'Evolution is the process by which different kinds of living organisms developed from earlier forms during the history of the Earth.',
        order: 2
      }
    ]
  }
];

async function seedData() {
  try {
    // Clear existing data
    await Course.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing courses and users');
    
    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123', // Will be hashed by the User model's pre-save hook
      role: 'admin',
      streakCount: 5,
      points: 100
    });
    
    // Create regular user
    const regularUser = new User({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'admin123', // Will be hashed by the User model's pre-save hook
      role: 'user',
      streakCount: 3,
      points: 50
    });
    
    // Save users
    const savedAdmin = await adminUser.save();
    const savedUser = await regularUser.save();
    console.log('Created admin and regular users');
    
    // Add author to courses
    const coursesWithAuthor = courses.map(course => ({
      ...course,
      author: savedAdmin._id
    }));
    
    // Insert courses
    await Course.insertMany(coursesWithAuthor);
    console.log('Inserted sample courses');
    
    console.log('\nAdmin User Credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('\nRegular User Credentials:');
    console.log('Email: user@example.com');
    console.log('Password: admin123');
    
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}
