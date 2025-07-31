const mongoose = require('mongoose');
const UserProgress = require('../../models/UserProgress');
const User = require('../../models/User');
const Course = require('../../models/Course');

describe('UserProgress Model', () => {
    let testUser, testCourse;

    beforeEach(async () => {
        // Create test user
        testUser = new User({
            email: 'student@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Student',
            userType: 'freelancer'
        });
        await testUser.save();

        // Create test course
        testCourse = new Course({
            title: 'Test Course',
            description: 'Test description',
            category: 'Test',
            difficultyLevel: 'beginner',
            estimatedDuration: 10,
            modules: [
                {
                    moduleId: 'mod-001',
                    title: 'Module 1',
                    description: 'First module'
                },
                {
                    moduleId: 'mod-002',
                    title: 'Module 2',
                    description: 'Second module'
                }
            ],
            createdBy: testUser._id
        });
        await testCourse.save();
    });

    afterEach(async () => {
        await UserProgress.deleteMany({});
        await Course.deleteMany({});
        await User.deleteMany({});
    });

    describe('UserProgress Creation', () => {
        it('should create valid user progress', async () => {
            const progressData = {
                userId: testUser._id,
                courseId: testCourse._id,
                moduleProgress: [
                    {
                        moduleId: 'mod-001',
                        status: 'not_started'
                    },
                    {
                        moduleId: 'mod-002',
                        status: 'not_started'
                    }
                ]
            };

            const userProgress = new UserProgress(progressData);
            const savedProgress = await userProgress.save();

            expect(savedProgress._id).toBeDefined();
            expect(savedProgress.userId.toString()).toBe(testUser._id.toString());
            expect(savedProgress.courseId.toString()).toBe(testCourse._id.toString());
            expect(savedProgress.status).toBe('enrolled');
            expect(savedProgress.overallProgress).toBe(0);
            expect(savedProgress.certificateIssued).toBe(false);
            expect(savedProgress.moduleProgress).toHaveLength(2);
            expect(savedProgress.enrolledAt).toBeDefined();
        });

        it('should require userId and courseId', async () => {
            const userProgress = new UserProgress({});

            let error;
            try {
                await userProgress.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.userId).toBeDefined();
            expect(error.errors.courseId).toBeDefined();
        });

        it('should validate status enum', async () => {
            const progressData = {
                userId: testUser._id,
                courseId: testCourse._id,
                status: 'invalid-status'
            };

            const userProgress = new UserProgress(progressData);

            let error;
            try {
                await userProgress.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.status).toBeDefined();
        });

        it('should validate module progress status enum', async () => {
            const progressData = {
                userId: testUser._id,
                courseId: testCourse._id,
                moduleProgress: [
                    {
                        moduleId: 'mod-001',
                        status: 'invalid-status'
                    }
                ]
            };

            const userProgress = new UserProgress(progressData);

            let error;
            try {
                await userProgress.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
        });

        it('should enforce unique user-course combination', async () => {
            const progressData = {
                userId: testUser._id,
                courseId: testCourse._id
            };

            // Create first progress record
            const userProgress1 = new UserProgress(progressData);
            await userProgress1.save();

            // Try to create duplicate
            const userProgress2 = new UserProgress(progressData);

            let error;
            try {
                await userProgress2.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.code).toBe(11000); // MongoDB duplicate key error
        });
    });

    describe('Progress Tracking', () => {
        let userProgress;

        beforeEach(async () => {
            userProgress = new UserProgress({
                userId: testUser._id,
                courseId: testCourse._id,
                moduleProgress: [
                    {
                        moduleId: 'mod-001',
                        status: 'not_started'
                    },
                    {
                        moduleId: 'mod-002',
                        status: 'not_started'
                    }
                ]
            });
            await userProgress.save();
        });

        it('should update module progress', async () => {
            // Start first module
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'in_progress',
                    'moduleProgress.0.startedAt': new Date(),
                    status: 'in_progress'
                }
            });

            const updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].status).toBe('in_progress');
            expect(updated.moduleProgress[0].startedAt).toBeDefined();
            expect(updated.status).toBe('in_progress');
        });

        it('should complete module with assessment score', async () => {
            const completionDate = new Date();
            
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'completed',
                    'moduleProgress.0.completedAt': completionDate,
                    'moduleProgress.0.assessmentScore': 85,
                    'moduleProgress.0.attempts': 1,
                    overallProgress: 50 // 1 of 2 modules completed
                }
            });

            const updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].status).toBe('completed');
            expect(updated.moduleProgress[0].completedAt).toEqual(completionDate);
            expect(updated.moduleProgress[0].assessmentScore).toBe(85);
            expect(updated.moduleProgress[0].attempts).toBe(1);
            expect(updated.overallProgress).toBe(50);
        });

        it('should complete entire course', async () => {
            const completionDate = new Date();
            
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'completed',
                    'moduleProgress.1.status': 'completed',
                    status: 'completed',
                    completedAt: completionDate,
                    overallProgress: 100
                }
            });

            const updated = await UserProgress.findById(userProgress._id);
            expect(updated.status).toBe('completed');
            expect(updated.completedAt).toEqual(completionDate);
            expect(updated.overallProgress).toBe(100);
            expect(updated.moduleProgress.every(m => m.status === 'completed')).toBe(true);
        });

        it('should issue certificate upon completion', async () => {
            const certificateUrl = 'https://example.com/certificate/123';
            
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                    overallProgress: 100,
                    certificateIssued: true,
                    certificateUrl: certificateUrl
                }
            });

            const updated = await UserProgress.findById(userProgress._id);
            expect(updated.certificateIssued).toBe(true);
            expect(updated.certificateUrl).toBe(certificateUrl);
        });
    });

    describe('Progress Queries', () => {
        let user2, course2, progresses;

        beforeEach(async () => {
            // Create additional test data
            user2 = new User({
                email: 'student2@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Test Student 2',
                userType: 'freelancer'
            });
            await user2.save();

            course2 = new Course({
                title: 'Test Course 2',
                description: 'Test description 2',
                category: 'Test',
                difficultyLevel: 'intermediate',
                estimatedDuration: 15,
                modules: [],
                createdBy: testUser._id
            });
            await course2.save();

            // Create multiple progress records
            progresses = await UserProgress.create([
                {
                    userId: testUser._id,
                    courseId: testCourse._id,
                    status: 'in_progress',
                    overallProgress: 50
                },
                {
                    userId: testUser._id,
                    courseId: course2._id,
                    status: 'completed',
                    overallProgress: 100,
                    certificateIssued: true
                },
                {
                    userId: user2._id,
                    courseId: testCourse._id,
                    status: 'enrolled',
                    overallProgress: 0
                }
            ]);
        });

        it('should find progress by user', async () => {
            const userProgresses = await UserProgress.find({ userId: testUser._id });
            expect(userProgresses).toHaveLength(2);
        });

        it('should find progress by course', async () => {
            const courseProgresses = await UserProgress.find({ courseId: testCourse._id });
            expect(courseProgresses).toHaveLength(2);
        });

        it('should find completed courses', async () => {
            const completedProgresses = await UserProgress.find({ 
                status: 'completed' 
            });
            expect(completedProgresses).toHaveLength(1);
            expect(completedProgresses[0].userId.toString()).toBe(testUser._id.toString());
        });

        it('should find courses with certificates', async () => {
            const certificatedProgresses = await UserProgress.find({ 
                certificateIssued: true 
            });
            expect(certificatedProgresses).toHaveLength(1);
        });

        it('should populate user and course data', async () => {
            const progress = await UserProgress.findOne({ userId: testUser._id })
                .populate('userId', 'fullName email')
                .populate('courseId', 'title category');

            expect(progress.userId.fullName).toBe('Test Student');
            expect(progress.courseId.title).toBeDefined();
        });
    });

    describe('Module Unlocking Logic', () => {
        let userProgress;

        beforeEach(async () => {
            userProgress = new UserProgress({
                userId: testUser._id,
                courseId: testCourse._id,
                moduleProgress: [
                    {
                        moduleId: 'mod-001',
                        status: 'not_started'
                    },
                    {
                        moduleId: 'mod-002',
                        status: 'not_started'
                    }
                ]
            });
            await userProgress.save();
        });

        it('should track module start and completion times', async () => {
            const startTime = new Date();
            
            // Start module
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'in_progress',
                    'moduleProgress.0.startedAt': startTime
                }
            });

            let updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].startedAt).toEqual(startTime);

            // Complete module
            const completionTime = new Date(startTime.getTime() + 3600000); // 1 hour later
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'completed',
                    'moduleProgress.0.completedAt': completionTime
                }
            });

            updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].completedAt).toEqual(completionTime);
            expect(updated.moduleProgress[0].completedAt.getTime()).toBeGreaterThan(
                updated.moduleProgress[0].startedAt.getTime()
            );
        });

        it('should handle multiple assessment attempts', async () => {
            // First attempt - failed
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'in_progress',
                    'moduleProgress.0.assessmentScore': 60,
                    'moduleProgress.0.attempts': 1
                }
            });

            let updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].attempts).toBe(1);
            expect(updated.moduleProgress[0].assessmentScore).toBe(60);
            expect(updated.moduleProgress[0].status).toBe('in_progress');

            // Second attempt - passed
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'completed',
                    'moduleProgress.0.assessmentScore': 85,
                    'moduleProgress.0.attempts': 2,
                    'moduleProgress.0.completedAt': new Date()
                }
            });

            updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].attempts).toBe(2);
            expect(updated.moduleProgress[0].assessmentScore).toBe(85);
            expect(updated.moduleProgress[0].status).toBe('completed');
        });

        it('should calculate overall progress correctly', async () => {
            // Complete first module (50% progress)
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.status': 'completed',
                    overallProgress: 50
                }
            });

            let updated = await UserProgress.findById(userProgress._id);
            expect(updated.overallProgress).toBe(50);

            // Complete second module (100% progress)
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.1.status': 'completed',
                    overallProgress: 100,
                    status: 'completed',
                    completedAt: new Date()
                }
            });

            updated = await UserProgress.findById(userProgress._id);
            expect(updated.overallProgress).toBe(100);
            expect(updated.status).toBe('completed');
            expect(updated.completedAt).toBeDefined();
        });

        it('should validate progress percentage bounds', async () => {
            const userProgress = new UserProgress({
                userId: testUser._id,
                courseId: testCourse._id,
                overallProgress: 150 // Invalid: > 100
            });

            let error;
            try {
                await userProgress.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.overallProgress).toBeDefined();
        });

        it('should handle course status transitions', async () => {
            // Start as enrolled
            expect(userProgress.status).toBe('enrolled');

            // Update to in_progress
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: { status: 'in_progress' }
            });

            let updated = await UserProgress.findById(userProgress._id);
            expect(updated.status).toBe('in_progress');

            // Update to completed
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: { 
                    status: 'completed',
                    completedAt: new Date(),
                    overallProgress: 100
                }
            });

            updated = await UserProgress.findById(userProgress._id);
            expect(updated.status).toBe('completed');
            expect(updated.completedAt).toBeDefined();
            expect(updated.overallProgress).toBe(100);
        });
    });

    describe('Assessment Scoring', () => {
        let userProgress;

        beforeEach(async () => {
            userProgress = new UserProgress({
                userId: testUser._id,
                courseId: testCourse._id,
                moduleProgress: [
                    {
                        moduleId: 'mod-001',
                        status: 'not_started'
                    }
                ]
            });
            await userProgress.save();
        });

        it('should store assessment scores and attempts', async () => {
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.assessmentScore': 85,
                    'moduleProgress.0.attempts': 1,
                    'moduleProgress.0.status': 'completed'
                }
            });

            const updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].assessmentScore).toBe(85);
            expect(updated.moduleProgress[0].attempts).toBe(1);
            expect(updated.moduleProgress[0].status).toBe('completed');
        });

        it('should track multiple attempts with score improvement', async () => {
            // First attempt
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.assessmentScore': 65,
                    'moduleProgress.0.attempts': 1,
                    'moduleProgress.0.status': 'in_progress'
                }
            });

            // Second attempt with better score
            await UserProgress.findByIdAndUpdate(userProgress._id, {
                $set: {
                    'moduleProgress.0.assessmentScore': 90,
                    'moduleProgress.0.attempts': 2,
                    'moduleProgress.0.status': 'completed',
                    'moduleProgress.0.completedAt': new Date()
                }
            });

            const updated = await UserProgress.findById(userProgress._id);
            expect(updated.moduleProgress[0].assessmentScore).toBe(90);
            expect(updated.moduleProgress[0].attempts).toBe(2);
            expect(updated.moduleProgress[0].status).toBe('completed');
            expect(updated.moduleProgress[0].completedAt).toBeDefined();
        });
    });
});