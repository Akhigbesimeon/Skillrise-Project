const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

class TestConfig {
    constructor() {
        this.mongoServer = null;
        this.testDatabase = null;
        this.originalEnv = {};
    }

    // Setup test environment
    async setupTestEnvironment() {
        try {
            // Store original environment variables
            this.originalEnv = {
                NODE_ENV: process.env.NODE_ENV,
                MONGODB_URI: process.env.MONGODB_URI,
                JWT_SECRET: process.env.JWT_SECRET,
                EMAIL_SERVICE: process.env.EMAIL_SERVICE,
                REDIS_URL: process.env.REDIS_URL
            };

            // Set test environment variables
            process.env.NODE_ENV = 'test';
            process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
            process.env.EMAIL_SERVICE = 'test';
            process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use test database

            // Start in-memory MongoDB server
            this.mongoServer = await MongoMemoryServer.create({
                instance: {
                    dbName: 'skillrise-test'
                }
            });

            const mongoUri = this.mongoServer.getUri();
            process.env.MONGODB_URI = mongoUri;

            // Connect to test database
            await this.connectTestDatabase(mongoUri);

            console.log('Test environment setup completed');
            return true;

        } catch (error) {
            console.error('Error setting up test environment:', error);
            throw error;
        }
    }

    // Connect to test database
    async connectTestDatabase(uri) {
        try {
            await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.testDatabase = mongoose.connection;
            console.log('Connected to test database');

        } catch (error) {
            console.error('Error connecting to test database:', error);
            throw error;
        }
    }

    // Cleanup test environment
    async cleanupTestEnvironment() {
        try {
            // Close database connection
            if (this.testDatabase) {
                await mongoose.connection.close();
            }

            // Stop MongoDB server
            if (this.mongoServer) {
                await this.mongoServer.stop();
            }

            // Restore original environment variables
            Object.keys(this.originalEnv).forEach(key => {
                if (this.originalEnv[key] !== undefined) {
                    process.env[key] = this.originalEnv[key];
                } else {
                    delete process.env[key];
                }
            });

            console.log('Test environment cleanup completed');

        } catch (error) {
            console.error('Error cleaning up test environment:', error);
            throw error;
        }
    }

    // Clear test database
    async clearTestDatabase() {
        try {
            if (this.testDatabase) {
                const collections = await this.testDatabase.db.collections();
                
                for (const collection of collections) {
                    await collection.deleteMany({});
                }
            }
        } catch (error) {
            console.error('Error clearing test database:', error);
            throw error;
        }
    }

    // Create test data fixtures
    async createTestFixtures() {
        const User = require('../../models/User');
        const Course = require('../../models/Course');
        const Project = require('../../models/Project');
        const bcrypt = require('bcryptjs');

        try {
            // Create test users
            const testUsers = [
                {
                    fullName: 'Test Admin',
                    email: 'admin@test.com',
                    password: await bcrypt.hash('AdminPass123!', 12),
                    role: 'admin',
                    isActive: true,
                    emailVerified: true
                },
                {
                    fullName: 'Test Freelancer',
                    email: 'freelancer@test.com',
                    password: await bcrypt.hash('FreelancerPass123!', 12),
                    role: 'freelancer',
                    isActive: true,
                    emailVerified: true,
                    skills: ['JavaScript', 'React', 'Node.js'],
                    hourlyRate: 50
                },
                {
                    fullName: 'Test Client',
                    email: 'client@test.com',
                    password: await bcrypt.hash('ClientPass123!', 12),
                    role: 'client',
                    isActive: true,
                    emailVerified: true,
                    companyName: 'Test Company'
                },
                {
                    fullName: 'Test Mentor',
                    email: 'mentor@test.com',
                    password: await bcrypt.hash('MentorPass123!', 12),
                    role: 'mentor',
                    isActive: true,
                    emailVerified: true,
                    skills: ['Leadership', 'Project Management', 'Strategy'],
                    mentorshipCapacity: 5
                }
            ];

            const createdUsers = await User.insertMany(testUsers);

            // Create test courses
            const testCourses = [
                {
                    title: 'Test JavaScript Course',
                    description: 'Learn JavaScript fundamentals',
                    instructorId: createdUsers[0]._id,
                    category: 'Programming',
                    difficulty: 'beginner',
                    duration: 10,
                    price: 99.99,
                    isPublished: true,
                    modules: [
                        {
                            title: 'Introduction to JavaScript',
                            description: 'Basic concepts',
                            order: 1,
                            lessons: [
                                {
                                    title: 'Variables and Data Types',
                                    content: 'Learn about variables',
                                    type: 'video',
                                    duration: 15,
                                    order: 1
                                }
                            ]
                        }
                    ]
                },
                {
                    title: 'Test React Course',
                    description: 'Learn React development',
                    instructorId: createdUsers[1]._id,
                    category: 'Programming',
                    difficulty: 'intermediate',
                    duration: 20,
                    price: 149.99,
                    isPublished: true
                }
            ];

            const createdCourses = await Course.insertMany(testCourses);

            // Create test projects
            const testProjects = [
                {
                    title: 'Test Web Development Project',
                    description: 'Build a modern web application',
                    clientId: createdUsers[2]._id,
                    category: 'Web Development',
                    budget: 5000,
                    timeline: 30,
                    skillsRequired: ['JavaScript', 'React', 'Node.js'],
                    status: 'open',
                    isActive: true
                },
                {
                    title: 'Test Mobile App Project',
                    description: 'Create a mobile application',
                    clientId: createdUsers[2]._id,
                    category: 'Mobile Development',
                    budget: 8000,
                    timeline: 45,
                    skillsRequired: ['React Native', 'JavaScript'],
                    status: 'open',
                    isActive: true
                }
            ];

            const createdProjects = await Project.insertMany(testProjects);

            return {
                users: createdUsers,
                courses: createdCourses,
                projects: createdProjects
            };

        } catch (error) {
            console.error('Error creating test fixtures:', error);
            throw error;
        }
    }

    // Generate test JWT token
    generateTestToken(userId, role = 'freelancer') {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { userId, role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    }

    // Mock external services
    setupMocks() {
        // Mock email service
        jest.mock('../../services/emailService', () => ({
            sendEmail: jest.fn().mockResolvedValue({ success: true }),
            sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
            sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
            sendNotificationEmail: jest.fn().mockResolvedValue({ success: true })
        }));

        // Mock file upload service
        jest.mock('../../services/fileUploadService', () => ({
            uploadFile: jest.fn().mockResolvedValue({
                success: true,
                url: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
                filename: 'test-file.jpg'
            }),
            deleteFile: jest.fn().mockResolvedValue({ success: true })
        }));

        // Mock payment service
        jest.mock('../../services/paymentService', () => ({
            processPayment: jest.fn().mockResolvedValue({
                success: true,
                transactionId: 'test-transaction-123',
                amount: 100.00
            }),
            refundPayment: jest.fn().mockResolvedValue({
                success: true,
                refundId: 'test-refund-123'
            })
        }));

        // Mock notification service
        jest.mock('../../services/notificationService', () => ({
            createNotification: jest.fn().mockResolvedValue({ success: true }),
            sendPushNotification: jest.fn().mockResolvedValue({ success: true }),
            markAsRead: jest.fn().mockResolvedValue({ success: true })
        }));
    }

    // Performance testing helpers
    async measureExecutionTime(fn) {
        const start = process.hrtime.bigint();
        const result = await fn();
        const end = process.hrtime.bigint();
        const executionTime = Number(end - start) / 1000000; // Convert to milliseconds
        
        return {
            result,
            executionTime
        };
    }

    // Load testing helper
    async simulateConcurrentRequests(requestFn, concurrency = 10, iterations = 100) {
        const results = {
            successful: 0,
            failed: 0,
            totalTime: 0,
            averageTime: 0,
            errors: []
        };

        const startTime = Date.now();
        const promises = [];

        for (let i = 0; i < iterations; i++) {
            const batch = [];
            
            for (let j = 0; j < concurrency; j++) {
                batch.push(
                    requestFn()
                        .then(result => {
                            results.successful++;
                            return result;
                        })
                        .catch(error => {
                            results.failed++;
                            results.errors.push(error.message);
                            return null;
                        })
                );
            }

            promises.push(...batch);
            
            // Small delay between batches to prevent overwhelming
            if (i < iterations - 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        await Promise.all(promises);

        results.totalTime = Date.now() - startTime;
        results.averageTime = results.totalTime / (results.successful + results.failed);

        return results;
    }

    // Memory usage monitoring
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
            external: Math.round(usage.external / 1024 / 1024), // MB
            arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
        };
    }

    // Database performance monitoring
    async measureDatabasePerformance(operation) {
        const startMemory = this.getMemoryUsage();
        const startTime = Date.now();

        const result = await operation();

        const endTime = Date.now();
        const endMemory = this.getMemoryUsage();

        return {
            result,
            executionTime: endTime - startTime,
            memoryDelta: {
                rss: endMemory.rss - startMemory.rss,
                heapUsed: endMemory.heapUsed - startMemory.heapUsed
            }
        };
    }

    // Test data validation helpers
    validateTestData(data, schema) {
        const errors = [];

        Object.keys(schema).forEach(key => {
            const rule = schema[key];
            const value = data[key];

            if (rule.required && (value === undefined || value === null)) {
                errors.push(`${key} is required`);
                return;
            }

            if (value !== undefined && value !== null) {
                if (rule.type && typeof value !== rule.type) {
                    errors.push(`${key} must be of type ${rule.type}`);
                }

                if (rule.minLength && value.length < rule.minLength) {
                    errors.push(`${key} must be at least ${rule.minLength} characters`);
                }

                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push(`${key} must be no more than ${rule.maxLength} characters`);
                }

                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push(`${key} does not match required pattern`);
                }

                if (rule.enum && !rule.enum.includes(value)) {
                    errors.push(`${key} must be one of: ${rule.enum.join(', ')}`);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // API response validation
    validateApiResponse(response, expectedSchema) {
        const validation = this.validateTestData(response, expectedSchema);
        
        if (!validation.isValid) {
            throw new Error(`API response validation failed: ${validation.errors.join(', ')}`);
        }

        return true;
    }

    // Test utilities
    generateRandomString(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    generateRandomEmail() {
        return `test-${this.generateRandomString(8)}@example.com`;
    }

    generateRandomUser(role = 'freelancer') {
        return {
            fullName: `Test User ${this.generateRandomString(5)}`,
            email: this.generateRandomEmail(),
            password: 'TestPass123!',
            role,
            isActive: true,
            emailVerified: true
        };
    }

    // Wait for async operations
    async waitFor(condition, timeout = 5000, interval = 100) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        throw new Error(`Condition not met within ${timeout}ms`);
    }

    // Cleanup helpers
    async cleanupTestUser(userId) {
        const User = require('../../models/User');
        await User.findByIdAndDelete(userId);
    }

    async cleanupTestCourse(courseId) {
        const Course = require('../../models/Course');
        await Course.findByIdAndDelete(courseId);
    }

    async cleanupTestProject(projectId) {
        const Project = require('../../models/Project');
        await Project.findByIdAndDelete(projectId);
    }
}

module.exports = new TestConfig();