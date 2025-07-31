const testConfig = require('../config/testConfig');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Project = require('../../models/Project');
const Message = require('../../models/Message');
const Notification = require('../../models/Notification');
const UserProgress = require('../../models/UserProgress');
const Mentorship = require('../../models/Mentorship');
const mongoose = require('mongoose');

describe('Database Integration Tests', () => {
    let testFixtures;

    beforeAll(async () => {
        await testConfig.setupTestEnvironment();
        testFixtures = await testConfig.createTestFixtures();
    });

    afterAll(async () => {
        await testConfig.cleanupTestEnvironment();
    });

    beforeEach(async () => {
        // Clear database before each test (except fixtures)
        const collections = ['messages', 'notifications', 'userprogresses', 'mentorships'];
        for (const collection of collections) {
            await mongoose.connection.db.collection(collection).deleteMany({});
        }
    });

    describe('User Model Integration', () => {
        it('should create user with encrypted password', async () => {
            const userData = {
                fullName: 'Integration Test User',
                email: 'integration@test.com',
                password: 'TestPass123!',
                role: 'freelancer'
            };

            const user = new User(userData);
            await user.save();

            expect(user._id).toBeDefined();
            expect(user.password).not.toBe(userData.password);
            expect(user.password.length).toBeGreaterThan(50);
            expect(user.createdAt).toBeDefined();
        });

        it('should enforce unique email constraint', async () => {
            const userData1 = {
                fullName: 'User One',
                email: 'duplicate@test.com',
                password: 'TestPass123!',
                role: 'freelancer'
            };

            const userData2 = {
                fullName: 'User Two',
                email: 'duplicate@test.com',
                password: 'TestPass123!',
                role: 'client'
            };

            await User.create(userData1);

            await expect(User.create(userData2)).rejects.toThrow();
        });

        it('should validate email format', async () => {
            const userData = {
                fullName: 'Test User',
                email: 'invalid-email',
                password: 'TestPass123!',
                role: 'freelancer'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should handle user profile updates', async () => {
            const user = testFixtures.users[1]; // freelancer
            
            const updateData = {
                bio: 'Updated bio for integration test',
                skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
                hourlyRate: 75
            };

            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                updateData,
                { new: true, runValidators: true }
            );

            expect(updatedUser.bio).toBe(updateData.bio);
            expect(updatedUser.skills).toEqual(updateData.skills);
            expect(updatedUser.hourlyRate).toBe(updateData.hourlyRate);
        });

        it('should perform complex user queries', async () => {
            // Test aggregation pipeline
            const userStats = await User.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 },
                        avgHourlyRate: { $avg: '$hourlyRate' }
                    }
                },
                {
                    $sort: { count: -1 }
                }
            ]);

            expect(Array.isArray(userStats)).toBe(true);
            expect(userStats.length).toBeGreaterThan(0);
            
            const freelancerStats = userStats.find(stat => stat._id === 'freelancer');
            expect(freelancerStats).toBeDefined();
            expect(freelancerStats.count).toBeGreaterThan(0);
        });
    });

    describe('Course Model Integration', () => {
        it('should create course with modules and lessons', async () => {
            const instructor = testFixtures.users[0];
            
            const courseData = {
                title: 'Integration Test Course',
                description: 'A course for testing database integration',
                instructorId: instructor._id,
                category: 'Programming',
                difficulty: 'intermediate',
                duration: 15,
                price: 199.99,
                modules: [
                    {
                        title: 'Module 1',
                        description: 'First module',
                        order: 1,
                        lessons: [
                            {
                                title: 'Lesson 1.1',
                                content: 'First lesson content',
                                type: 'video',
                                duration: 20,
                                order: 1
                            },
                            {
                                title: 'Lesson 1.2',
                                content: 'Second lesson content',
                                type: 'text',
                                duration: 10,
                                order: 2
                            }
                        ]
                    },
                    {
                        title: 'Module 2',
                        description: 'Second module',
                        order: 2,
                        lessons: [
                            {
                                title: 'Lesson 2.1',
                                content: 'Third lesson content',
                                type: 'quiz',
                                duration: 15,
                                order: 1
                            }
                        ]
                    }
                ]
            };

            const course = await Course.create(courseData);

            expect(course._id).toBeDefined();
            expect(course.modules.length).toBe(2);
            expect(course.modules[0].lessons.length).toBe(2);
            expect(course.modules[1].lessons.length).toBe(1);
            
            // Test virtual fields
            expect(course.totalLessons).toBe(3);
        });

        it('should handle course enrollment', async () => {
            const course = testFixtures.courses[0];
            const student = testFixtures.users[1];

            // Enroll student
            course.enrolledUsers.push({
                userId: student._id,
                enrolledAt: new Date(),
                progress: 0
            });

            await course.save();

            const updatedCourse = await Course.findById(course._id);
            expect(updatedCourse.enrolledUsers.length).toBe(1);
            expect(updatedCourse.enrolledUsers[0].userId.toString()).toBe(student._id.toString());
        });

        it('should populate instructor information', async () => {
            const course = await Course.findById(testFixtures.courses[0]._id)
                .populate('instructorId', 'fullName email');

            expect(course.instructorId.fullName).toBeDefined();
            expect(course.instructorId.email).toBeDefined();
            expect(course.instructorId.password).toBeUndefined();
        });

        it('should filter courses by category and difficulty', async () => {
            const courses = await Course.find({
                category: 'Programming',
                difficulty: 'beginner',
                isPublished: true
            });

            expect(Array.isArray(courses)).toBe(true);
            courses.forEach(course => {
                expect(course.category).toBe('Programming');
                expect(course.difficulty).toBe('beginner');
                expect(course.isPublished).toBe(true);
            });
        });
    });

    describe('Project Model Integration', () => {
        it('should create project with applications', async () => {
            const client = testFixtures.users[2];
            const freelancer = testFixtures.users[1];

            const projectData = {
                title: 'Integration Test Project',
                description: 'A project for testing database integration',
                clientId: client._id,
                category: 'Web Development',
                budget: 3000,
                timeline: 21,
                skillsRequired: ['JavaScript', 'React'],
                status: 'open'
            };

            const project = await Project.create(projectData);

            // Add application
            project.applications.push({
                freelancerId: freelancer._id,
                coverLetter: 'I am interested in this project',
                proposedRate: 60,
                estimatedHours: 50,
                status: 'pending'
            });

            await project.save();

            const updatedProject = await Project.findById(project._id);
            expect(updatedProject.applications.length).toBe(1);
            expect(updatedProject.applications[0].freelancerId.toString()).toBe(freelancer._id.toString());
        });

        it('should handle project status transitions', async () => {
            const project = testFixtures.projects[0];
            const freelancer = testFixtures.users[1];

            // Apply to project
            project.applications.push({
                freelancerId: freelancer._id,
                coverLetter: 'Test application',
                proposedRate: 55,
                estimatedHours: 40,
                status: 'pending'
            });

            await project.save();

            // Accept application
            project.applications[0].status = 'accepted';
            project.assignedFreelancerId = freelancer._id;
            project.status = 'in_progress';

            await project.save();

            const updatedProject = await Project.findById(project._id);
            expect(updatedProject.status).toBe('in_progress');
            expect(updatedProject.assignedFreelancerId.toString()).toBe(freelancer._id.toString());
            expect(updatedProject.applications[0].status).toBe('accepted');
        });

        it('should perform project search with filters', async () => {
            const searchResults = await Project.find({
                $and: [
                    { status: 'open' },
                    { budget: { $gte: 2000, $lte: 10000 } },
                    { skillsRequired: { $in: ['JavaScript'] } }
                ]
            }).populate('clientId', 'fullName companyName');

            expect(Array.isArray(searchResults)).toBe(true);
            searchResults.forEach(project => {
                expect(project.status).toBe('open');
                expect(project.budget).toBeGreaterThanOrEqual(2000);
                expect(project.budget).toBeLessThanOrEqual(10000);
                expect(project.skillsRequired).toContain('JavaScript');
                expect(project.clientId.fullName).toBeDefined();
            });
        });
    });

    describe('Message Model Integration', () => {
        it('should create and retrieve messages', async () => {
            const sender = testFixtures.users[1];
            const recipient = testFixtures.users[2];

            const messageData = {
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Integration test message',
                type: 'text'
            };

            const message = await Message.create(messageData);

            expect(message._id).toBeDefined();
            expect(message.senderId.toString()).toBe(sender._id.toString());
            expect(message.recipientId.toString()).toBe(recipient._id.toString());
            expect(message.isRead).toBe(false);
            expect(message.createdAt).toBeDefined();
        });

        it('should retrieve conversation between users', async () => {
            const user1 = testFixtures.users[1];
            const user2 = testFixtures.users[2];

            // Create multiple messages
            const messages = [
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Hello from user 1',
                    type: 'text'
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Hello back from user 2',
                    type: 'text'
                },
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'How are you?',
                    type: 'text'
                }
            ];

            await Message.insertMany(messages);

            // Retrieve conversation
            const conversation = await Message.find({
                $or: [
                    { senderId: user1._id, recipientId: user2._id },
                    { senderId: user2._id, recipientId: user1._id }
                ]
            }).sort({ createdAt: 1 });

            expect(conversation.length).toBe(3);
            expect(conversation[0].content).toBe('Hello from user 1');
            expect(conversation[1].content).toBe('Hello back from user 2');
            expect(conversation[2].content).toBe('How are you?');
        });

        it('should mark messages as read', async () => {
            const sender = testFixtures.users[1];
            const recipient = testFixtures.users[2];

            const message = await Message.create({
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Test message for read status',
                type: 'text'
            });

            expect(message.isRead).toBe(false);

            // Mark as read
            await Message.findByIdAndUpdate(message._id, {
                isRead: true,
                readAt: new Date()
            });

            const updatedMessage = await Message.findById(message._id);
            expect(updatedMessage.isRead).toBe(true);
            expect(updatedMessage.readAt).toBeDefined();
        });
    });

    describe('User Progress Integration', () => {
        it('should track course progress', async () => {
            const user = testFixtures.users[1];
            const course = testFixtures.courses[0];

            const progressData = {
                userId: user._id,
                courseId: course._id,
                completedLessons: [
                    {
                        lessonId: course.modules[0].lessons[0]._id,
                        completedAt: new Date(),
                        timeSpent: 15
                    }
                ],
                currentModule: 0,
                currentLesson: 1,
                overallProgress: 50
            };

            const progress = await UserProgress.create(progressData);

            expect(progress._id).toBeDefined();
            expect(progress.completedLessons.length).toBe(1);
            expect(progress.overallProgress).toBe(50);
        });

        it('should update progress incrementally', async () => {
            const user = testFixtures.users[1];
            const course = testFixtures.courses[0];

            // Create initial progress
            const progress = await UserProgress.create({
                userId: user._id,
                courseId: course._id,
                completedLessons: [],
                currentModule: 0,
                currentLesson: 0,
                overallProgress: 0
            });

            // Complete first lesson
            progress.completedLessons.push({
                lessonId: course.modules[0].lessons[0]._id,
                completedAt: new Date(),
                timeSpent: 20
            });
            progress.currentLesson = 1;
            progress.overallProgress = 33;

            await progress.save();

            // Complete second lesson
            progress.completedLessons.push({
                lessonId: course.modules[0].lessons[0]._id, // Using same lesson for test
                completedAt: new Date(),
                timeSpent: 15
            });
            progress.currentLesson = 2;
            progress.overallProgress = 67;

            await progress.save();

            const updatedProgress = await UserProgress.findById(progress._id);
            expect(updatedProgress.completedLessons.length).toBe(2);
            expect(updatedProgress.overallProgress).toBe(67);
        });
    });

    describe('Mentorship Integration', () => {
        it('should create mentorship relationship', async () => {
            const mentor = testFixtures.users[3];
            const mentee = testFixtures.users[1];

            const mentorshipData = {
                mentorId: mentor._id,
                menteeId: mentee._id,
                goals: ['Improve leadership skills', 'Career guidance'],
                duration: 90,
                status: 'active'
            };

            const mentorship = await Mentorship.create(mentorshipData);

            expect(mentorship._id).toBeDefined();
            expect(mentorship.mentorId.toString()).toBe(mentor._id.toString());
            expect(mentorship.menteeId.toString()).toBe(mentee._id.toString());
            expect(mentorship.goals.length).toBe(2);
        });

        it('should schedule mentorship sessions', async () => {
            const mentor = testFixtures.users[3];
            const mentee = testFixtures.users[1];

            const mentorship = await Mentorship.create({
                mentorId: mentor._id,
                menteeId: mentee._id,
                goals: ['Test goal'],
                duration: 60,
                status: 'active'
            });

            // Add session
            mentorship.sessions.push({
                scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
                duration: 60,
                agenda: 'Initial consultation',
                status: 'scheduled'
            });

            await mentorship.save();

            const updatedMentorship = await Mentorship.findById(mentorship._id);
            expect(updatedMentorship.sessions.length).toBe(1);
            expect(updatedMentorship.sessions[0].status).toBe('scheduled');
        });
    });

    describe('Database Performance Tests', () => {
        it('should handle bulk operations efficiently', async () => {
            const bulkUsers = [];
            for (let i = 0; i < 100; i++) {
                bulkUsers.push({
                    fullName: `Bulk User ${i}`,
                    email: `bulk${i}@test.com`,
                    password: 'BulkPass123!',
                    role: 'freelancer'
                });
            }

            const startTime = Date.now();
            const createdUsers = await User.insertMany(bulkUsers);
            const endTime = Date.now();

            expect(createdUsers.length).toBe(100);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds

            // Cleanup
            await User.deleteMany({ email: { $regex: /^bulk\d+@test\.com$/ } });
        });

        it('should perform complex aggregations efficiently', async () => {
            const startTime = Date.now();
            
            const stats = await User.aggregate([
                {
                    $lookup: {
                        from: 'courses',
                        localField: '_id',
                        foreignField: 'instructorId',
                        as: 'courses'
                    }
                },
                {
                    $lookup: {
                        from: 'projects',
                        localField: '_id',
                        foreignField: 'clientId',
                        as: 'projects'
                    }
                },
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 },
                        avgCourses: { $avg: { $size: '$courses' } },
                        avgProjects: { $avg: { $size: '$projects' } }
                    }
                }
            ]);

            const endTime = Date.now();

            expect(Array.isArray(stats)).toBe(true);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
        });

        it('should handle concurrent database operations', async () => {
            const concurrentOperations = [];

            // Create 20 concurrent user creation operations
            for (let i = 0; i < 20; i++) {
                concurrentOperations.push(
                    User.create({
                        fullName: `Concurrent User ${i}`,
                        email: `concurrent${i}@test.com`,
                        password: 'ConcurrentPass123!',
                        role: 'freelancer'
                    })
                );
            }

            const startTime = Date.now();
            const results = await Promise.all(concurrentOperations);
            const endTime = Date.now();

            expect(results.length).toBe(20);
            expect(endTime - startTime).toBeLessThan(3000); // Should complete in less than 3 seconds

            // Cleanup
            await User.deleteMany({ email: { $regex: /^concurrent\d+@test\.com$/ } });
        });
    });

    describe('Database Constraints and Validation', () => {
        it('should enforce required field constraints', async () => {
            const invalidUser = {
                email: 'test@example.com',
                password: 'TestPass123!'
                // Missing required fullName and role
            };

            await expect(User.create(invalidUser)).rejects.toThrow();
        });

        it('should validate enum values', async () => {
            const invalidUser = {
                fullName: 'Test User',
                email: 'test@example.com',
                password: 'TestPass123!',
                role: 'invalid_role' // Invalid enum value
            };

            await expect(User.create(invalidUser)).rejects.toThrow();
        });

        it('should enforce custom validation rules', async () => {
            const invalidCourse = {
                title: 'Test Course',
                description: 'Test description',
                instructorId: testFixtures.users[0]._id,
                category: 'Programming',
                difficulty: 'beginner',
                duration: -5, // Invalid negative duration
                price: 99.99
            };

            await expect(Course.create(invalidCourse)).rejects.toThrow();
        });
    });

    describe('Database Transactions', () => {
        it('should handle transaction rollback on error', async () => {
            const session = await mongoose.startSession();
            
            try {
                await session.withTransaction(async () => {
                    // Create a user
                    const user = await User.create([{
                        fullName: 'Transaction Test User',
                        email: 'transaction@test.com',
                        password: 'TransactionPass123!',
                        role: 'freelancer'
                    }], { session });

                    // Create a course
                    await Course.create([{
                        title: 'Transaction Test Course',
                        description: 'Test course for transaction',
                        instructorId: user[0]._id,
                        category: 'Programming',
                        difficulty: 'beginner',
                        duration: 10,
                        price: 99.99
                    }], { session });

                    // Intentionally cause an error
                    throw new Error('Intentional transaction error');
                });
            } catch (error) {
                expect(error.message).toBe('Intentional transaction error');
            } finally {
                await session.endSession();
            }

            // Verify that no data was saved due to rollback
            const user = await User.findOne({ email: 'transaction@test.com' });
            expect(user).toBeNull();
        });

        it('should commit transaction on success', async () => {
            const session = await mongoose.startSession();
            let userId;

            try {
                await session.withTransaction(async () => {
                    // Create a user
                    const user = await User.create([{
                        fullName: 'Successful Transaction User',
                        email: 'success-transaction@test.com',
                        password: 'SuccessPass123!',
                        role: 'freelancer'
                    }], { session });

                    userId = user[0]._id;

                    // Create a course
                    await Course.create([{
                        title: 'Successful Transaction Course',
                        description: 'Test course for successful transaction',
                        instructorId: user[0]._id,
                        category: 'Programming',
                        difficulty: 'beginner',
                        duration: 10,
                        price: 99.99
                    }], { session });
                });
            } finally {
                await session.endSession();
            }

            // Verify that data was saved
            const user = await User.findOne({ email: 'success-transaction@test.com' });
            expect(user).toBeDefined();
            expect(user.fullName).toBe('Successful Transaction User');

            const course = await Course.findOne({ instructorId: userId });
            expect(course).toBeDefined();
            expect(course.title).toBe('Successful Transaction Course');

            // Cleanup
            await User.findByIdAndDelete(userId);
            await Course.deleteOne({ instructorId: userId });
        });
    });
});