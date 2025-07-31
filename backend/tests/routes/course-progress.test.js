const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Course = require('../../models/Course');
const UserProgress = require('../../models/UserProgress');
const jwt = require('jsonwebtoken');

describe('Course Progress API', () => {
    let testUser;
    let testCourse;
    let testProgress;
    let authToken;

    beforeEach(async () => {
        // Clear test data
        await User.deleteMany({});
        await Course.deleteMany({});
        await UserProgress.deleteMany({});

        // Create test user
        testUser = new User({
            email: 'test@example.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test User',
            userType: 'freelancer',
            isVerified: true
        });
        await testUser.save();

        // Create auth token
        authToken = jwt.sign(
            { id: testUser._id, email: testUser.email },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Create test course
        testCourse = new Course({
            title: 'Test Course',
            description: 'A test course',
            category: 'Programming',
            difficultyLevel: 'beginner',
            estimatedDuration: 10,
            modules: [
                {
                    moduleId: 'module-1',
                    title: 'Module 1',
                    description: 'First module',
                    content: 'Module content',
                    assessment: {
                        questions: [
                            {
                                question: 'What is 2+2?',
                                type: 'multiple-choice',
                                options: ['3', '4', '5'],
                                correctAnswer: '4'
                            }
                        ],
                        passingScore: 70
                    }
                },
                {
                    moduleId: 'module-2',
                    title: 'Module 2',
                    description: 'Second module',
                    content: 'Module 2 content'
                }
            ],
            createdBy: testUser._id
        });
        await testCourse.save();

        // Create test progress
        testProgress = new UserProgress({
            userId: testUser._id,
            courseId: testCourse._id,
            moduleProgress: [
                {
                    moduleId: 'module-1',
                    status: 'not_started'
                },
                {
                    moduleId: 'module-2',
                    status: 'not_started'
                }
            ]
        });
        await testProgress.save();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('GET /api/courses/:id/progress', () => {
        it('should return user progress for enrolled course', async () => {
            const response = await request(app)
                .get(`/api/courses/${testCourse._id}/progress`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.userProgress).toBeDefined();
            expect(response.body.userProgress.userId.toString()).toBe(testUser._id.toString());
            expect(response.body.userProgress.courseId.toString()).toBe(testCourse._id.toString());
            expect(response.body.userProgress.moduleProgress).toHaveLength(2);
        });

        it('should return 404 if user is not enrolled', async () => {
            // Delete the progress record
            await UserProgress.deleteOne({ _id: testProgress._id });

            const response = await request(app)
                .get(`/api/courses/${testCourse._id}/progress`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error.code).toBe('PROGRESS_NOT_FOUND');
        });

        it('should return 401 without authentication', async () => {
            await request(app)
                .get(`/api/courses/${testCourse._id}/progress`)
                .expect(401);
        });
    });

    describe('POST /api/courses/:id/modules/:moduleId/complete', () => {
        it('should mark module as in progress', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'in_progress' })
                .expect(200);

            expect(response.body.userProgress).toBeDefined();
            const moduleProgress = response.body.userProgress.moduleProgress.find(
                mp => mp.moduleId === 'module-1'
            );
            expect(moduleProgress.status).toBe('in_progress');
            expect(moduleProgress.startedAt).toBeDefined();
        });

        it('should mark module as completed', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' })
                .expect(200);

            expect(response.body.userProgress).toBeDefined();
            const moduleProgress = response.body.userProgress.moduleProgress.find(
                mp => mp.moduleId === 'module-1'
            );
            expect(moduleProgress.status).toBe('completed');
            expect(moduleProgress.completedAt).toBeDefined();
            expect(response.body.userProgress.overallProgress).toBe(50); // 1 of 2 modules completed
        });

        it('should update overall progress when all modules completed', async () => {
            // Complete first module
            await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' });

            // Complete second module
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-2/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' })
                .expect(200);

            expect(response.body.userProgress.overallProgress).toBe(100);
            expect(response.body.userProgress.status).toBe('completed');
            expect(response.body.userProgress.completedAt).toBeDefined();
        });

        it('should return 400 for invalid status', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'invalid_status' })
                .expect(400);

            expect(response.body.error.code).toBe('INVALID_STATUS');
        });

        it('should return 404 for non-existent module', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/non-existent/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' })
                .expect(404);

            expect(response.body.error.code).toBe('MODULE_NOT_FOUND');
        });

        it('should return 404 if user is not enrolled', async () => {
            await UserProgress.deleteOne({ _id: testProgress._id });

            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' })
                .expect(404);

            expect(response.body.error.code).toBe('PROGRESS_NOT_FOUND');
        });
    });

    describe('POST /api/courses/:id/modules/:moduleId/assessment', () => {
        it('should submit assessment with passing score', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/assessment`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    answers: ['4'],
                    score: 100
                })
                .expect(200);

            expect(response.body.passed).toBe(true);
            expect(response.body.score).toBe(100);
            
            const moduleProgress = response.body.userProgress.moduleProgress.find(
                mp => mp.moduleId === 'module-1'
            );
            expect(moduleProgress.status).toBe('completed');
            expect(moduleProgress.assessmentScore).toBe(100);
            expect(moduleProgress.attempts).toBe(1);
        });

        it('should submit assessment with failing score', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/assessment`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    answers: ['3'],
                    score: 0
                })
                .expect(200);

            expect(response.body.passed).toBe(false);
            expect(response.body.score).toBe(0);
            
            const moduleProgress = response.body.userProgress.moduleProgress.find(
                mp => mp.moduleId === 'module-1'
            );
            expect(moduleProgress.status).not.toBe('completed');
            expect(moduleProgress.assessmentScore).toBe(0);
            expect(moduleProgress.attempts).toBe(1);
        });

        it('should increment attempt count on retake', async () => {
            // First attempt
            await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/assessment`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    answers: ['3'],
                    score: 0
                });

            // Second attempt
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/assessment`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    answers: ['4'],
                    score: 100
                })
                .expect(200);

            const moduleProgress = response.body.userProgress.moduleProgress.find(
                mp => mp.moduleId === 'module-1'
            );
            expect(moduleProgress.attempts).toBe(2);
        });

        it('should return 400 for invalid input', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/assessment`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    answers: 'invalid',
                    score: 'invalid'
                })
                .expect(400);

            expect(response.body.error.code).toBe('INVALID_INPUT');
        });

        it('should return 404 for module without assessment', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-2/assessment`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    answers: ['answer'],
                    score: 100
                })
                .expect(404);

            expect(response.body.error.code).toBe('ASSESSMENT_NOT_FOUND');
        });

        it('should return 404 if user is not enrolled', async () => {
            await UserProgress.deleteOne({ _id: testProgress._id });

            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/assessment`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    answers: ['4'],
                    score: 100
                })
                .expect(404);

            expect(response.body.error.code).toBe('PROGRESS_NOT_FOUND');
        });
    });

    describe('Progress Calculation', () => {
        it('should calculate correct progress percentage', async () => {
            // Complete first module (50% progress)
            const response1 = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' });

            expect(response1.body.userProgress.overallProgress).toBe(50);

            // Complete second module (100% progress)
            const response2 = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-2/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' });

            expect(response2.body.userProgress.overallProgress).toBe(100);
            expect(response2.body.userProgress.status).toBe('completed');
        });

        it('should update course completion count when course is completed', async () => {
            const initialCourse = await Course.findById(testCourse._id);
            const initialCompletionCount = initialCourse.completionCount;

            // Complete all modules
            await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' });

            await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-2/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' });

            const updatedCourse = await Course.findById(testCourse._id);
            expect(updatedCourse.completionCount).toBe(initialCompletionCount + 1);
        });
    });

    describe('Module Unlocking Logic', () => {
        it('should allow access to first module without prerequisites', async () => {
            // First module should always be accessible
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'in_progress' })
                .expect(200);

            expect(response.body.userProgress).toBeDefined();
        });

        it('should track module start and completion times', async () => {
            const startTime = new Date();

            // Start module
            const response1 = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'in_progress' });

            const moduleProgress1 = response1.body.userProgress.moduleProgress.find(
                mp => mp.moduleId === 'module-1'
            );
            expect(new Date(moduleProgress1.startedAt)).toBeInstanceOf(Date);
            expect(new Date(moduleProgress1.startedAt).getTime()).toBeGreaterThanOrEqual(startTime.getTime());

            // Complete module
            const response2 = await request(app)
                .post(`/api/courses/${testCourse._id}/modules/module-1/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'completed' });

            const moduleProgress2 = response2.body.userProgress.moduleProgress.find(
                mp => mp.moduleId === 'module-1'
            );
            expect(new Date(moduleProgress2.completedAt)).toBeInstanceOf(Date);
            expect(new Date(moduleProgress2.completedAt).getTime()).toBeGreaterThanOrEqual(
                new Date(moduleProgress2.startedAt).getTime()
            );
        });
    });
});