require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
});

async function seed30Courses() {
    try {
        console.log('🌱 Starting course seeding...');
        
        // Find or create admin user
        let adminUser = await User.findOne({ userType: 'admin' });
        if (!adminUser) {
            console.log('Creating admin user...');
            adminUser = new User({
                email: 'admin@skillrise.com',
                passwordHash: 'admin123', // Will be hashed by pre-save middleware
                fullName: 'System Administrator',
                userType: 'admin',
                isVerified: true,
                isActive: true
            });
            await adminUser.save();
        }

        // Clear existing courses
        await Course.deleteMany({});
        console.log('🗑️ Cleared existing courses');

        // 30 Comprehensive Courses Data
        const coursesData = [
            // === TECHNOLOGY COURSES (10) ===
            {
                title: 'JavaScript Fundamentals for Beginners',
                description: 'Master the basics of JavaScript programming. Learn variables, functions, objects, and DOM manipulation with hands-on projects.',
                category: 'Technology',
                difficultyLevel: 'beginner',
                estimatedDuration: 25,
                thumbnailUrl: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=500&h=300',
                modules: [
                    {
                        moduleId: 'js-001',
                        title: 'JavaScript Basics',
                        description: 'Variables, data types, and basic syntax',
                        content: '<h2>Welcome to JavaScript</h2><p>JavaScript is the programming language of the web...</p>',
                        videoUrl: 'https://example.com/js-basics',
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
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 1247,
                completionCount: 892
            },
            {
                title: 'React.js Complete Masterclass',
                description: 'Build modern web applications with React. Master hooks, context, routing, and state management with real-world projects.',
                category: 'Technology',
                difficultyLevel: 'advanced',
                estimatedDuration: 45,
                thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&h=300',
                modules: [
                    {
                        moduleId: 'react-001',
                        title: 'React Fundamentals',
                        description: 'Components, JSX, and the React ecosystem',
                        content: '<h2>Getting Started with React</h2><p>React is a powerful JavaScript library...</p>',
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
                    }
                ],
                prerequisites: ['JavaScript Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 892,
                completionCount: 456
            },
            {
                title: 'Python for Data Science',
                description: 'Learn Python programming for data analysis, visualization, and machine learning. Master pandas, numpy, and matplotlib.',
                category: 'Technology',
                difficultyLevel: 'intermediate',
                estimatedDuration: 40,
                thumbnailUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=500&h=300',
                modules: [
                    {
                        moduleId: 'python-001',
                        title: 'Python Basics for Data Science',
                        description: 'Python syntax, data structures, and libraries',
                        content: '<h2>Python for Data</h2><p>Python is the leading language for data science...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'Which library is used for data manipulation in Python?',
                                    type: 'multiple-choice',
                                    options: ['pandas', 'requests', 'flask'],
                                    correctAnswer: 'pandas'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Basic Programming'],
                createdBy: adminUser._id,
                enrollmentCount: 756,
                completionCount: 423
            },
            {
                title: 'Full-Stack Web Development with Node.js',
                description: 'Build complete web applications using Node.js, Express, and MongoDB. Learn server-side development and API creation.',
                category: 'Technology',
                difficultyLevel: 'advanced',
                estimatedDuration: 50,
                thumbnailUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&h=300',
                modules: [
                    {
                        moduleId: 'node-001',
                        title: 'Node.js Fundamentals',
                        description: 'Server-side JavaScript and npm',
                        content: '<h2>Node.js Introduction</h2><p>Node.js allows you to run JavaScript on the server...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is Node.js?',
                                    type: 'multiple-choice',
                                    options: ['JavaScript runtime', 'Database', 'Web browser'],
                                    correctAnswer: 'JavaScript runtime'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['JavaScript Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 634,
                completionCount: 287
            },
            {
                title: 'Mobile App Development with Flutter',
                description: 'Create cross-platform mobile apps using Flutter and Dart. Build for iOS and Android with a single codebase.',
                category: 'Technology',
                difficultyLevel: 'intermediate',
                estimatedDuration: 38,
                thumbnailUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=500&h=300',
                modules: [
                    {
                        moduleId: 'flutter-001',
                        title: 'Flutter Basics',
                        description: 'Widgets, layouts, and Dart programming',
                        content: '<h2>Flutter Development</h2><p>Flutter is Google\'s UI toolkit for mobile...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What language does Flutter use?',
                                    type: 'multiple-choice',
                                    options: ['Dart', 'JavaScript', 'Java'],
                                    correctAnswer: 'Dart'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Basic Programming'],
                createdBy: adminUser._id,
                enrollmentCount: 523,
                completionCount: 298
            },
            {
                title: 'Cloud Computing with AWS',
                description: 'Master Amazon Web Services cloud platform. Learn EC2, S3, Lambda, and cloud architecture best practices.',
                category: 'Technology',
                difficultyLevel: 'advanced',
                estimatedDuration: 42,
                thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=300',
                modules: [
                    {
                        moduleId: 'aws-001',
                        title: 'AWS Fundamentals',
                        description: 'Cloud concepts and AWS core services',
                        content: '<h2>Amazon Web Services</h2><p>AWS is the world\'s most comprehensive cloud platform...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What does EC2 stand for?',
                                    type: 'multiple-choice',
                                    options: ['Elastic Compute Cloud', 'Enhanced Cloud Computing', 'Easy Computer Connection'],
                                    correctAnswer: 'Elastic Compute Cloud'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Basic Networking', 'Linux Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 445,
                completionCount: 201
            },
            {
                title: 'Cybersecurity Fundamentals',
                description: 'Learn essential cybersecurity concepts, threat detection, and security best practices for modern organizations.',
                category: 'Technology',
                difficultyLevel: 'intermediate',
                estimatedDuration: 35,
                thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&h=300',
                modules: [
                    {
                        moduleId: 'cyber-001',
                        title: 'Security Fundamentals',
                        description: 'Threats, vulnerabilities, and risk management',
                        content: '<h2>Cybersecurity Basics</h2><p>Cybersecurity protects digital systems from attacks...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a firewall?',
                                    type: 'multiple-choice',
                                    options: ['Network security system', 'Antivirus software', 'Password manager'],
                                    correctAnswer: 'Network security system'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Basic Networking'],
                createdBy: adminUser._id,
                enrollmentCount: 678,
                completionCount: 389
            },
            {
                title: 'Machine Learning with Python',
                description: 'Dive into machine learning algorithms, neural networks, and AI development using Python and scikit-learn.',
                category: 'Technology',
                difficultyLevel: 'advanced',
                estimatedDuration: 48,
                thumbnailUrl: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=500&h=300',
                modules: [
                    {
                        moduleId: 'ml-001',
                        title: 'ML Fundamentals',
                        description: 'Algorithms, data preprocessing, and model evaluation',
                        content: '<h2>Machine Learning Basics</h2><p>Machine learning enables computers to learn from data...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is supervised learning?',
                                    type: 'multiple-choice',
                                    options: ['Learning with labeled data', 'Learning without data', 'Learning with unlabeled data'],
                                    correctAnswer: 'Learning with labeled data'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Python for Data Science', 'Statistics'],
                createdBy: adminUser._id,
                enrollmentCount: 567,
                completionCount: 234
            },
            {
                title: 'Database Design and SQL Mastery',
                description: 'Master relational database design, SQL queries, and database optimization for enterprise applications.',
                category: 'Technology',
                difficultyLevel: 'intermediate',
                estimatedDuration: 32,
                thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=500&h=300',
                modules: [
                    {
                        moduleId: 'sql-001',
                        title: 'SQL Fundamentals',
                        description: 'SELECT, INSERT, UPDATE, DELETE operations',
                        content: '<h2>Structured Query Language</h2><p>SQL is the standard language for database operations...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'Which SQL command is used to retrieve data?',
                                    type: 'multiple-choice',
                                    options: ['SELECT', 'GET', 'FETCH'],
                                    correctAnswer: 'SELECT'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Basic Programming'],
                createdBy: adminUser._id,
                enrollmentCount: 789,
                completionCount: 456
            },
            {
                title: 'DevOps and CI/CD Pipelines',
                description: 'Learn DevOps practices, Docker containerization, and automated deployment with Jenkins and GitLab.',
                category: 'Technology',
                difficultyLevel: 'advanced',
                estimatedDuration: 40,
                thumbnailUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=500&h=300',
                modules: [
                    {
                        moduleId: 'devops-001',
                        title: 'DevOps Fundamentals',
                        description: 'CI/CD, automation, and collaboration practices',
                        content: '<h2>DevOps Culture</h2><p>DevOps combines development and operations...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What does CI/CD stand for?',
                                    type: 'multiple-choice',
                                    options: ['Continuous Integration/Continuous Deployment', 'Code Integration/Code Deployment', 'Computer Integration/Computer Deployment'],
                                    correctAnswer: 'Continuous Integration/Continuous Deployment'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Linux Fundamentals', 'Git Version Control'],
                createdBy: adminUser._id,
                enrollmentCount: 398,
                completionCount: 178
            },

            // === DESIGN COURSES (10) ===
            {
                title: 'UI/UX Design Fundamentals',
                description: 'Master user interface and user experience design principles. Learn design thinking, wireframing, and prototyping.',
                category: 'Design',
                difficultyLevel: 'beginner',
                estimatedDuration: 30,
                thumbnailUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=300',
                modules: [
                    {
                        moduleId: 'uiux-001',
                        title: 'Design Fundamentals',
                        description: 'Color theory, typography, and layout principles',
                        content: '<h2>Design Basics</h2><p>Great design solves problems and creates experiences...</p>',
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
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 934,
                completionCount: 667
            },
            {
                title: 'Adobe Creative Suite Mastery',
                description: 'Master Photoshop, Illustrator, and InDesign for professional graphic design and digital art creation.',
                category: 'Design',
                difficultyLevel: 'advanced',
                estimatedDuration: 45,
                thumbnailUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&h=300',
                modules: [
                    {
                        moduleId: 'adobe-001',
                        title: 'Photoshop Fundamentals',
                        description: 'Image editing, layers, and photo manipulation',
                        content: '<h2>Adobe Photoshop</h2><p>Photoshop is the industry standard for image editing...</p>',
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
                prerequisites: ['Design Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 567,
                completionCount: 289
            },
            {
                title: 'Web Design with Figma',
                description: 'Create stunning web designs using Figma. Learn design systems, prototyping, and collaborative design workflows.',
                category: 'Design',
                difficultyLevel: 'intermediate',
                estimatedDuration: 28,
                thumbnailUrl: 'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=500&h=300',
                modules: [
                    {
                        moduleId: 'figma-001',
                        title: 'Figma Basics',
                        description: 'Interface, tools, and basic design operations',
                        content: '<h2>Figma Design Tool</h2><p>Figma is a powerful collaborative design platform...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is Figma primarily used for?',
                                    type: 'multiple-choice',
                                    options: ['UI/UX design', 'Video editing', 'Photo manipulation'],
                                    correctAnswer: 'UI/UX design'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['UI/UX Design Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 723,
                completionCount: 445
            },
            {
                title: 'Brand Identity Design',
                description: 'Create compelling brand identities including logos, color palettes, and brand guidelines for businesses.',
                category: 'Design',
                difficultyLevel: 'intermediate',
                estimatedDuration: 35,
                thumbnailUrl: 'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=500&h=300',
                modules: [
                    {
                        moduleId: 'brand-001',
                        title: 'Brand Strategy',
                        description: 'Brand positioning, target audience, and brand values',
                        content: '<h2>Brand Identity</h2><p>A strong brand identity communicates your values...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a brand identity?',
                                    type: 'multiple-choice',
                                    options: ['Visual representation of a brand', 'Company name', 'Product description'],
                                    correctAnswer: 'Visual representation of a brand'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Design Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 456,
                completionCount: 278
            },
            {
                title: 'Motion Graphics with After Effects',
                description: 'Create stunning animations and motion graphics for videos, presentations, and digital media.',
                category: 'Design',
                difficultyLevel: 'advanced',
                estimatedDuration: 40,
                thumbnailUrl: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=500&h=300',
                modules: [
                    {
                        moduleId: 'motion-001',
                        title: 'After Effects Basics',
                        description: 'Timeline, keyframes, and basic animations',
                        content: '<h2>Motion Graphics</h2><p>After Effects is the industry standard for motion graphics...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a keyframe in animation?',
                                    type: 'multiple-choice',
                                    options: ['A point in time that defines animation values', 'A type of layer', 'A video format'],
                                    correctAnswer: 'A point in time that defines animation values'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Adobe Creative Suite Basics'],
                createdBy: adminUser._id,
                enrollmentCount: 345,
                completionCount: 156
            },
            {
                title: '3D Design with Blender',
                description: 'Master 3D modeling, texturing, and rendering using the free and powerful Blender software.',
                category: 'Design',
                difficultyLevel: 'advanced',
                estimatedDuration: 50,
                thumbnailUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=300',
                modules: [
                    {
                        moduleId: 'blender-001',
                        title: 'Blender Fundamentals',
                        description: '3D modeling basics, navigation, and tools',
                        content: '<h2>3D Design with Blender</h2><p>Blender is a free, open-source 3D creation suite...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is 3D modeling?',
                                    type: 'multiple-choice',
                                    options: ['Creating 3D objects digitally', 'Photo editing', 'Video editing'],
                                    correctAnswer: 'Creating 3D objects digitally'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Basic Computer Graphics'],
                createdBy: adminUser._id,
                enrollmentCount: 289,
                completionCount: 123
            },
            {
                title: 'Print Design and Layout',
                description: 'Design for print media including brochures, posters, and magazines using professional design principles.',
                category: 'Design',
                difficultyLevel: 'intermediate',
                estimatedDuration: 32,
                thumbnailUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=500&h=300',
                modules: [
                    {
                        moduleId: 'print-001',
                        title: 'Print Design Basics',
                        description: 'Layout, typography, and print specifications',
                        content: '<h2>Print Design</h2><p>Print design requires understanding of physical media...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is CMYK color mode used for?',
                                    type: 'multiple-choice',
                                    options: ['Print design', 'Web design', 'Mobile apps'],
                                    correctAnswer: 'Print design'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Design Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 378,
                completionCount: 234
            },
            {
                title: 'Photography and Photo Editing',
                description: 'Learn digital photography techniques and master photo editing with Lightroom and Photoshop.',
                category: 'Design',
                difficultyLevel: 'beginner',
                estimatedDuration: 26,
                thumbnailUrl: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=300',
                modules: [
                    {
                        moduleId: 'photo-001',
                        title: 'Photography Basics',
                        description: 'Composition, lighting, and camera settings',
                        content: '<h2>Digital Photography</h2><p>Photography is the art of capturing light and moments...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is the rule of thirds in photography?',
                                    type: 'multiple-choice',
                                    options: ['A composition guideline', 'A camera setting', 'A lens type'],
                                    correctAnswer: 'A composition guideline'
                                }
                            ],
                            passingScore: 70
                        }
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 612,
                completionCount: 389
            },
            {
                title: 'Illustration and Digital Art',
                description: 'Create digital illustrations and artwork using Adobe Illustrator and digital drawing techniques.',
                category: 'Design',
                difficultyLevel: 'intermediate',
                estimatedDuration: 38,
                thumbnailUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&h=300',
                modules: [
                    {
                        moduleId: 'illust-001',
                        title: 'Digital Illustration Basics',
                        description: 'Drawing tools, brushes, and illustration techniques',
                        content: '<h2>Digital Illustration</h2><p>Digital art opens up endless creative possibilities...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is vector graphics?',
                                    type: 'multiple-choice',
                                    options: ['Graphics made of mathematical paths', 'Pixel-based images', 'Video graphics'],
                                    correctAnswer: 'Graphics made of mathematical paths'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Design Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 445,
                completionCount: 267
            },
            {
                title: 'Game Art and Character Design',
                description: 'Design characters, environments, and assets for video games using industry-standard techniques.',
                category: 'Design',
                difficultyLevel: 'advanced',
                estimatedDuration: 42,
                thumbnailUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=500&h=300',
                modules: [
                    {
                        moduleId: 'game-001',
                        title: 'Character Design Fundamentals',
                        description: 'Anatomy, proportions, and character development',
                        content: '<h2>Game Art Design</h2><p>Game art brings virtual worlds to life...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is concept art in game development?',
                                    type: 'multiple-choice',
                                    options: ['Early visual development artwork', 'Final game graphics', 'Code documentation'],
                                    correctAnswer: 'Early visual development artwork'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Digital Art Fundamentals', 'Anatomy for Artists'],
                createdBy: adminUser._id,
                enrollmentCount: 267,
                completionCount: 134
            },

            // === CREATIVE WRITING COURSES (10) ===
            {
                title: 'Creative Writing Fundamentals',
                description: 'Discover your writer\'s voice and master the basics of creative writing including character development and plot structure.',
                category: 'Creative Writing',
                difficultyLevel: 'beginner',
                estimatedDuration: 24,
                thumbnailUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500&h=300',
                modules: [
                    {
                        moduleId: 'writing-001',
                        title: 'Finding Your Voice',
                        description: 'Discovering your unique writing style and perspective',
                        content: '<h2>Creative Writing Basics</h2><p>Every writer has a unique voice waiting to be discovered...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a writer\'s voice?',
                                    type: 'multiple-choice',
                                    options: ['A writer\'s unique style and perspective', 'How loud you read', 'The genre you write'],
                                    correctAnswer: 'A writer\'s unique style and perspective'
                                }
                            ],
                            passingScore: 70
                        }
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 823,
                completionCount: 567
            },
            {
                title: 'Novel Writing Workshop',
                description: 'Write your first novel with structured guidance on plotting, character development, and the writing process.',
                category: 'Creative Writing',
                difficultyLevel: 'intermediate',
                estimatedDuration: 40,
                thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=300',
                modules: [
                    {
                        moduleId: 'novel-001',
                        title: 'Plot Structure and Outlining',
                        description: 'Three-act structure, plot points, and story arcs',
                        content: '<h2>Novel Structure</h2><p>A well-structured novel keeps readers engaged from start to finish...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is the climax of a story?',
                                    type: 'multiple-choice',
                                    options: ['The turning point of maximum tension', 'The beginning', 'The conclusion'],
                                    correctAnswer: 'The turning point of maximum tension'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Creative Writing Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 456,
                completionCount: 234
            },
            {
                title: 'Short Story Mastery',
                description: 'Master the art of short story writing with focus on concise storytelling and powerful endings.',
                category: 'Creative Writing',
                difficultyLevel: 'intermediate',
                estimatedDuration: 22,
                thumbnailUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=300',
                modules: [
                    {
                        moduleId: 'short-001',
                        title: 'Short Story Elements',
                        description: 'Character, setting, conflict, and resolution in short form',
                        content: '<h2>Short Story Craft</h2><p>Short stories are like photographs - they capture a moment...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is the key difference between a short story and a novel?',
                                    type: 'multiple-choice',
                                    options: ['Length and scope', 'Genre', 'Character count'],
                                    correctAnswer: 'Length and scope'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Creative Writing Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 678,
                completionCount: 445
            },
            {
                title: 'Poetry and Verse',
                description: 'Explore different forms of poetry, from traditional sonnets to modern free verse and spoken word.',
                category: 'Creative Writing',
                difficultyLevel: 'beginner',
                estimatedDuration: 18,
                thumbnailUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&h=300',
                modules: [
                    {
                        moduleId: 'poetry-001',
                        title: 'Poetry Forms and Structure',
                        description: 'Rhyme, rhythm, meter, and poetic devices',
                        content: '<h2>The Art of Poetry</h2><p>Poetry is the music of language, expressing emotions in verse...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a metaphor?',
                                    type: 'multiple-choice',
                                    options: ['A direct comparison without using like or as', 'A rhyming pattern', 'A line break'],
                                    correctAnswer: 'A direct comparison without using like or as'
                                }
                            ],
                            passingScore: 70
                        }
                    }
                ],
                prerequisites: [],
                createdBy: adminUser._id,
                enrollmentCount: 567,
                completionCount: 389
            },
            {
                title: 'Screenwriting for Beginners',
                description: 'Learn the fundamentals of screenplay writing including format, dialogue, and visual storytelling.',
                category: 'Creative Writing',
                difficultyLevel: 'beginner',
                estimatedDuration: 28,
                thumbnailUrl: 'https://images.unsplash.com/photo-1489599651618-cabc241b2fac?w=500&h=300',
                modules: [
                    {
                        moduleId: 'screen-001',
                        title: 'Screenplay Format and Structure',
                        description: 'Industry-standard formatting and three-act structure',
                        content: '<h2>Screenwriting Basics</h2><p>Screenplays are blueprints for movies, written in a specific format...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is the standard font for screenplays?',
                                    type: 'multiple-choice',
                                    options: ['Courier', 'Arial', 'Times New Roman'],
                                    correctAnswer: 'Courier'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Creative Writing Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 445,
                completionCount: 267
            },
            {
                title: 'Memoir and Personal Narrative',
                description: 'Write compelling personal stories and memoirs that connect with readers through authentic storytelling.',
                category: 'Creative Writing',
                difficultyLevel: 'intermediate',
                estimatedDuration: 26,
                thumbnailUrl: 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?w=500&h=300',
                modules: [
                    {
                        moduleId: 'memoir-001',
                        title: 'Truth and Memory in Writing',
                        description: 'Crafting personal stories with honesty and impact',
                        content: '<h2>Personal Narrative</h2><p>Memoir writing transforms life experiences into universal stories...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is the main difference between memoir and autobiography?',
                                    type: 'multiple-choice',
                                    options: ['Memoir focuses on specific themes or periods', 'Memoir is fictional', 'There is no difference'],
                                    correctAnswer: 'Memoir focuses on specific themes or periods'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Creative Writing Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 356,
                completionCount: 223
            },
            {
                title: 'Fantasy and Science Fiction Writing',
                description: 'Create immersive fantasy and sci-fi worlds with compelling characters and imaginative storytelling.',
                category: 'Creative Writing',
                difficultyLevel: 'advanced',
                estimatedDuration: 35,
                thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=500&h=300',
                modules: [
                    {
                        moduleId: 'fantasy-001',
                        title: 'World Building Fundamentals',
                        description: 'Creating believable fantasy and sci-fi worlds',
                        content: '<h2>Speculative Fiction</h2><p>Fantasy and science fiction allow writers to explore unlimited possibilities...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is world-building in fiction?',
                                    type: 'multiple-choice',
                                    options: ['Creating the setting and rules of a fictional world', 'Character development', 'Plot structure'],
                                    correctAnswer: 'Creating the setting and rules of a fictional world'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Creative Writing Fundamentals', 'Character Development'],
                createdBy: adminUser._id,
                enrollmentCount: 389,
                completionCount: 178
            },
            {
                title: 'Romance Writing Workshop',
                description: 'Write compelling romance novels with authentic relationships, emotional depth, and satisfying character arcs.',
                category: 'Creative Writing',
                difficultyLevel: 'intermediate',
                estimatedDuration: 30,
                thumbnailUrl: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=500&h=300',
                modules: [
                    {
                        moduleId: 'romance-001',
                        title: 'Romance Story Structure',
                        description: 'Meet-cute, conflict, and happily ever after',
                        content: '<h2>Romance Writing</h2><p>Romance is about the journey of two people finding love...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a "meet-cute" in romance writing?',
                                    type: 'multiple-choice',
                                    options: ['The first encounter between romantic leads', 'The climax', 'The resolution'],
                                    correctAnswer: 'The first encounter between romantic leads'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Creative Writing Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 523,
                completionCount: 334
            },
            {
                title: 'Mystery and Thriller Writing',
                description: 'Master the art of suspense writing with plot twists, red herrings, and page-turning tension.',
                category: 'Creative Writing',
                difficultyLevel: 'advanced',
                estimatedDuration: 32,
                thumbnailUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=300',
                modules: [
                    {
                        moduleId: 'mystery-001',
                        title: 'Building Suspense and Tension',
                        description: 'Pacing, clues, and maintaining reader engagement',
                        content: '<h2>Mystery Writing</h2><p>Mystery writing is about creating puzzles that readers want to solve...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a red herring in mystery writing?',
                                    type: 'multiple-choice',
                                    options: ['A false clue meant to mislead readers', 'The detective', 'The murder weapon'],
                                    correctAnswer: 'A false clue meant to mislead readers'
                                }
                            ],
                            passingScore: 80
                        }
                    }
                ],
                prerequisites: ['Creative Writing Fundamentals', 'Plot Development'],
                createdBy: adminUser._id,
                enrollmentCount: 412,
                completionCount: 189
            },
            {
                title: 'Content Writing and Copywriting',
                description: 'Master persuasive writing for marketing, blogs, and digital content that converts readers into customers.',
                category: 'Creative Writing',
                difficultyLevel: 'intermediate',
                estimatedDuration: 25,
                thumbnailUrl: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=500&h=300',
                modules: [
                    {
                        moduleId: 'copy-001',
                        title: 'Persuasive Writing Techniques',
                        description: 'Headlines, calls-to-action, and audience psychology',
                        content: '<h2>Copywriting Fundamentals</h2><p>Copywriting is writing that sells, persuades, and converts...</p>',
                        assessment: {
                            questions: [
                                {
                                    question: 'What is a call-to-action (CTA)?',
                                    type: 'multiple-choice',
                                    options: ['A prompt that encourages readers to take action', 'The main headline', 'The conclusion'],
                                    correctAnswer: 'A prompt that encourages readers to take action'
                                }
                            ],
                            passingScore: 75
                        }
                    }
                ],
                prerequisites: ['Writing Fundamentals'],
                createdBy: adminUser._id,
                enrollmentCount: 645,
                completionCount: 423
            }
        ];

        // Create all courses
        console.log('📚 Creating 30 courses...');
        const courses = await Course.create(coursesData);
        
        // Create search indexes
        try {
            await Course.collection.createIndex({ title: 'text', description: 'text' });
            console.log('🔍 Created text search indexes');
        } catch (error) {
            console.log('ℹ️ Search indexes may already exist');
        }

        console.log('✅ Successfully created 30 courses!');
        console.log('📊 Course breakdown:');
        
        const categoryCounts = {};
        courses.forEach(course => {
            categoryCounts[course.category] = (categoryCounts[course.category] || 0) + 1;
        });
        
        Object.entries(categoryCounts).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} courses`);
        });

        console.log('\\n🎯 Sample courses created:');
        courses.slice(0, 5).forEach(course => {
            console.log(`   • ${course.title} (${course.category} - ${course.difficultyLevel})`);
        });

    } catch (error) {
        console.error('❌ Error seeding courses:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔚 Database connection closed');
    }
}

// Run the seeding script
if (require.main === module) {
    seed30Courses();
}

module.exports = seed30Courses;