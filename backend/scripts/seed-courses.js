const mongoose = require('mongoose');
const Course = require('../models/Course');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillrise', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function seedCourses() {
    try {
        // Create an admin user for course creation
        let adminUser = await User.findOne({ userType: 'admin' });
        if (!adminUser) {
            adminUser = new User({
                email: 'admin@skillrise.com',
                passwordHash: 'hashedpassword',
                fullName: 'System Admin',
                userType: 'admin',
                isVerified: true,
                isActive: true
            });
            await adminUser.save();
            console.log('Created admin user');
        }

        // Clear existing courses
        await Course.deleteMany({});
        console.log('Cleared existing courses');

        // Sample courses data
        const coursesData = [
            {
                title: 'JavaScript Fundamentals',
                description: 'Learn the basics of JavaScript programming language. This comprehensive course covers variables, functions, objects, and modern ES6+ features.',
                category: 'Programming',
                difficultyLevel: 'beginner',
                estimatedDuration: 25,
                modules: [
                    {
                        moduleId: 'js-001',
                        title: 'Introduction to JavaScript',
                        description: 'Basic concepts, syntax, and setting up your development environment',
                        content: '<h1>Welcome to JavaScript</h1><p>JavaScript is a versatile programming language...</p>',
                        videoUrl: 'https://example.com/video1',
                        resources: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript'],
                        assessment: {
                            questions: [
                                {
                                    question: 'What is JavaScript primarily used for?',
                                    type: 'multiple-choice',
                                    options: ['Web development', 'Database management', 'Operating systems'],
                                    correctAnswer: 'Web development'
                                }
                            ],
                            passingScore: 70
                        }
                    },
                    {
                        moduleId: 'js-002',
                        title: 'Variables and Data Types',
                        description: 'Understanding JavaScript variables, data types, and type conversion',
                        content: '<h1>Variables in JavaScript</h1><p>Variables are containers for storing data...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'Which keyword is used to declare a constant in JavaScript?',
                                    type: 'multiple-choice',
                                    options: ['var', 'let', 'const'],
                                    correctAnswer: 'const'
                                }
                            ],
                            passingScore: 70
                        }
                    },
                    {
                        moduleId: 'js-003',
                        title: 'Functions and Scope',
                        description: 'Learn about functions, parameters, return values, and variable scope',
                        content: '<h1>Functions in JavaScript</h1><p>Functions are reusable blocks of code...</p>'
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 156,
                completionCount: 89
            },
            {
                title: 'React Development Masterclass',
                description: 'Master React.js development with hooks, context, and modern patterns. Build real-world applications from scratch.',
                category: 'Programming',
                difficultyLevel: 'advanced',
                estimatedDuration: 45,
                modules: [
                    {
                        moduleId: 'react-001',
                        title: 'React Fundamentals',
                        description: 'Components, JSX, and the React ecosystem',
                        content: '<h1>Getting Started with React</h1><p>React is a JavaScript library...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is JSX?',
                                    type: 'multiple-choice',
                                    options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML'],
                                    correctAnswer: 'JavaScript XML'
                                }
                            ],
                            passingScore: 80
                        }
                    },
                    {
                        moduleId: 'react-002',
                        title: 'Hooks and State Management',
                        description: 'useState, useEffect, and custom hooks',
                        content: '<h1>React Hooks</h1><p>Hooks let you use state and other React features...</p>'
                    }
                ],
                prerequisites: ['JavaScript Fundamentals', 'HTML/CSS Basics'],
                createdBy: adminUser._id,
                enrollmentCount: 89,
                completionCount: 34
            },
            {
                title: 'UI/UX Design Principles',
                description: 'Learn the fundamentals of user interface and user experience design. Create beautiful and functional designs.',
                category: 'Design',
                difficultyLevel: 'intermediate',
                estimatedDuration: 30,
                modules: [
                    {
                        moduleId: 'design-001',
                        title: 'Design Fundamentals',
                        description: 'Color theory, typography, and layout principles',
                        content: '<h1>Design Basics</h1><p>Good design is about solving problems...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What are the primary colors?',
                                    type: 'multiple-choice',
                                    options: ['Red, Blue, Yellow', 'Red, Green, Blue', 'Cyan, Magenta, Yellow'],
                                    correctAnswer: 'Red, Blue, Yellow'
                                }
                            ],
                            passingScore: 75
                        }
                    },
                    {
                        moduleId: 'design-002',
                        title: 'User Experience Research',
                        description: 'Understanding users and their needs',
                        content: '<h1>UX Research</h1><p>Understanding your users is crucial...</p>'
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 67,
                completionCount: 23
            },
            {
                title: 'Digital Marketing Fundamentals',
                description: 'Learn the basics of digital marketing including SEO, social media, and content marketing strategies.',
                category: 'Marketing',
                difficultyLevel: 'beginner',
                estimatedDuration: 20,
                modules: [
                    {
                        moduleId: 'marketing-001',
                        title: 'Introduction to Digital Marketing',
                        description: 'Overview of digital marketing channels and strategies',
                        content: '<h1>Digital Marketing Overview</h1><p>Digital marketing encompasses...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What does SEO stand for?',
                                    type: 'multiple-choice',
                                    options: ['Search Engine Optimization', 'Social Engagement Online', 'Site Enhancement Operations'],
                                    correctAnswer: 'Search Engine Optimization'
                                }
                            ],
                            passingScore: 70
                        }
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 234,
                completionCount: 145
            },
            {
                title: 'Python for Data Science',
                description: 'Learn Python programming with a focus on data analysis, visualization, and machine learning basics.',
                category: 'Programming',
                difficultyLevel: 'intermediate',
                estimatedDuration: 35,
                modules: [
                    {
                        moduleId: 'python-001',
                        title: 'Python Basics',
                        description: 'Python syntax, data structures, and control flow',
                        content: '<h1>Python Programming</h1><p>Python is a versatile language...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'Which of these is a Python data type?',
                                    type: 'multiple-choice',
                                    options: ['list', 'array', 'vector'],
                                    correctAnswer: 'list'
                                }
                            ],
                            passingScore: 75
                        }
                    },
                    {
                        moduleId: 'python-002',
                        title: 'Data Analysis with Pandas',
                        description: 'Working with data using the Pandas library',
                        content: '<h1>Pandas for Data Analysis</h1><p>Pandas is a powerful data manipulation library...</p>'
                    }
                ],
                prerequisites: ['Basic Programming Concepts'],
                createdBy: adminUser._id,
                enrollmentCount: 123,
                completionCount: 67
            },
            {
                title: 'Graphic Design with Adobe Creative Suite',
                description: 'Master Adobe Photoshop, Illustrator, and InDesign for professional graphic design work.',
                category: 'Design',
                difficultyLevel: 'advanced',
                estimatedDuration: 40,
                modules: [
                    {
                        moduleId: 'adobe-001',
                        title: 'Photoshop Fundamentals',
                        description: 'Image editing, layers, and photo manipulation',
                        content: '<h1>Adobe Photoshop</h1><p>Photoshop is the industry standard...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a layer in Photoshop?',
                                    type: 'multiple-choice',
                                    options: ['A separate image element', 'A file format', 'A color mode'],
                                    correctAnswer: 'A separate image element'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Basic Computer Skills', 'Design Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 78,
                completionCount: 29
            }
        ];

        // Create courses
        const courses = await Course.create(coursesData);
        console.log(`Created ${courses.length} courses successfully`);

        // Create text indexes for search
        await Course.collection.createIndex({ title: 'text', description: 'text' });
        console.log('Created text search indexes');

        console.log('Course seeding completed successfully!');
        
        // Display created courses
        courses.forEach(course => {
            console.log(`- ${course.title} (${course.category}, ${course.difficultyLevel})`);
        });

    } catch (error) {
        console.error('Error seeding courses:', error);
    } finally {
        mongoose.connection.close();
    }
}

// Run the seeding script
seedCourses();