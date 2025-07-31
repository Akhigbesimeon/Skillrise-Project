const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const User = require('../../models/User');
const Course = require('../../models/Course');
const UserProgress = require('../../models/UserProgress');

describe('Course Routes', () => {
    let testUser, adminUser, testCourse, authToken;

    beforeEach(async () => {
        // Create test users
        testUser = new User({
            email: 'student@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Student',
            userType: 'freelancer',
            isVerified: true,
            isActive: true
        });
        await testUser.save();

        adminUser = new User({
            email: 'admin@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Admin',
            userType: 'admin',
            isVerified: true,
            isActive: true
        });
        await adminUser.save();

        // Create test course
        testCourse = new Course({
            title: 'JavaScript Fundamentals',
            description: 'Learn the basics of JavaScript programming',
            category: 'Programming',
            difficultyLevel: 'beginner',
            estimatedDuration: 20,
            modules: [
                {
                    moduleId: 'js-001',
                    title: 'Introduction to JavaScript',
                    description: 'Basic concepts and syntax',
                    content: '<h1>Welcome to JavaScript</h1>',
                    assessment: {
                        questions: [
                            {
                                question: 'What is JavaScript?',
                                type: 'multiple-choice',
                                options: ['Programming language', 'Markup language', 'Database'],
                                correctAnswer: 'Programming language'
                            }
                        ],
                        passingScore: 70
                    }
                },
                {
                    moduleId: 'js-002',
                    title: 'Variables and Data Types',
                    description: 'Understanding JavaScript variables',
                    content: '<h1>Variables in JavaScript</h1>'
                }
            ],
            createdBy: adminUser._id,
            enrollmentCount: 5,
            completionCount: 2
        });
        await testCourse.save();

        // Generate auth token
        authToken = jwt.sign(
            { 
                userId: testUser._id, 
                email: testUser.email, 
                userType: testUser.userType 
            },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '1h' }
        );
    });

    afterEach(async () => {
        await UserProgress.deleteMany({});
        await Course.deleteMany({});
        await User.deleteMany({});
    });

    describe('GET /api/courses', () => {
        beforeEach(async () => {
            // Create additional test courses
            await Course.create([
                {
                    title: 'Advanced React',
                    description: 'Master React development',
                    category: 'Programming',
                    difficultyLevel: 'advanced',
                    estimatedDuration: 30,
                    modules: [],
                    createdBy: adminUser._id,
                    enrollmentCount: 10
                },
                {
                    title: 'UI/UX Design',
                    description: 'Learn design principles',
                    category: 'Design',
                    difficultyLevel: 'intermediate',
                    estimatedDuration: 25,
                    modules: [],
                    createdBy: adminUser._id,
                    isActive: false // Inactive course
                }
            ]);
        });

        it('should get all active courses', async () => {
            const response = await request(app)
                .get('/api/courses')
                .expect(200);

            expect(response.body.courses).toHaveLength(2); // Only active courses
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.totalCourses).toBe(2);
        });

        it('should filter courses by category', async () => {
            const response = await request(app)
                .get('/api/courses?category=Programming')
                .expect(200);

            expect(response.body.courses).toHaveLength(2);
            expect(response.body.courses.every(c => c.category === 'Programming')).toBe(true);
        });

        it('should filter courses by difficulty level', async () => {
            const response = await request(app)
                .get('/api/courses?difficultyLevel=beginner')
                .expect(200);

            expect(response.body.courses).toHaveLength(1);
            expect(response.body.courses[0].difficultyLevel).toBe('beginner');
        });

        it('should search courses by text', async () => {
            const response = await request(app)
                .get('/api/courses?search=JavaScript')
                .expect(200);

            expect(response.body.courses).toHaveLength(1);
            expect(response.body.courses[0].title).toContain('JavaScript');
        });

        it('should sort courses', async () => {
            const response = await request(app)
                .get('/api/courses?sortBy=enrollmentCount&sortOrder=desc')
                .expect(200);

            expect(response.body.courses).toHaveLength(2);
            expect(response.body.courses[0].enrollmentCount).toBeGreaterThan(
                response.body.courses[1].enrollmentCount
            );
        });

        it('should paginate results', async () => {
            const response = await request(app)
                .get('/api/courses?page=1&limit=1')
                .expect(200);

            expect(response.body.courses).toHaveLength(1);
            expect(response.body.pagination.currentPage).toBe(1);
            expect(response.body.pagination.totalPages).toBe(2);
            expect(response.body.pagination.hasNext).toBe(true);
        });

        it('should handle server errors gracefully', async () => {
            // Mock Course.find to throw an error
            jest.spyOn(Course, 'find').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .get('/api/courses')
                .expect(500);

            expect(response.body.error.code).toBe('SERVER_ERROR');
        });
    });

    describe('GET /api/courses/:id', () => {
        it('should get course details without authentication', async () => {
            const response = await request(app)
                .get(`/api/courses/${testCourse._id}`)
                .expect(200);

            expect(response.body.course).toBeDefined();
            expect(response.body.course.title).toBe(testCourse.title);
            expect(response.body.course.modules).toHaveLength(2);
            expect(response.body.userProgress).toBeNull();
        });

        it('should get course details with user progress when authenticated', async () => {
            // Create user progress
            const userProgress = new UserProgress({
                userId: testUser._id,
                courseId: testCourse._id,
                status: 'in_progress',
                overallProgress: 50
            });
            await userProgress.save();

            const response = await request(app)
                .get(`/api/courses/${testCourse._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.course).toBeDefined();
            expect(response.body.userProgress).toBeDefined();
            expect(response.body.userProgress.overallProgress).toBe(50);
        });

        it('should return 404 for non-existent course', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .get(`/api/courses/${fakeId}`)
                .expect(404);

            expect(response.body.error.code).toBe('COURSE_NOT_FOUND');
        });

        it('should return 404 for inactive course', async () => {
            await Course.findByIdAndUpdate(testCourse._id, { isActive: false });

            const response = await request(app)
                .get(`/api/courses/${testCourse._id}`)
                .expect(404);

            expect(response.body.error.code).toBe('COURSE_INACTIVE');
        });

        it('should handle invalid course ID', async () => {
            const response = await request(app)
                .get('/api/courses/invalid-id')
                .expect(500);

            expect(response.body.error.code).toBe('SERVER_ERROR');
        });
    });

    describe('POST /api/courses/:id/enroll', () => {
        it('should enroll user in course', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/enroll`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(201);

            expect(response.body.message).toContain('Successfully enrolled');
            expect(response.body.enrollment).toBeDefined();
            expect(response.body.enrollment.userId.toString()).toBe(testUser._id.toString());
            expect(response.body.enrollment.courseId.toString()).toBe(testCourse._id.toString());

            // Verify enrollment count increased
            const updatedCourse = await Course.findById(testCourse._id);
            expect(updatedCourse.enrollmentCount).toBe(6);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/enroll`)
                .expect(401);

            expect(response.body.error.code).toBe('MISSING_TOKEN');
        });

        it('should prevent duplicate enrollment', async () => {
            // First enrollment
            await request(app)
                .post(`/api/courses/${testCourse._id}/enroll`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(201);

            // Second enrollment attempt
            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/enroll`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.error.code).toBe('ALREADY_ENROLLED');
        });

        it('should return 404 for non-existent course', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const response = await request(app)
                .post(`/api/courses/${fakeId}/enroll`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error.code).toBe('COURSE_NOT_FOUND');
        });

        it('should prevent enrollment in inactive course', async () => {
            await Course.findByIdAndUpdate(testCourse._id, { isActive: false });

            const response = await request(app)
                .post(`/api/courses/${testCourse._id}/enroll`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.error.code).toBe('COURSE_INACTIVE');
        });

        it('should create module progress entries', async () => {
            await request(app)
                .post(`/api/courses/${testCourse._id}/enroll`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(201);

            const userProgress = await UserProgress.findOne({
                userId: testUser._id,
                courseId: testCourse._id
            });

            expect(userProgress.moduleProgress).toHaveLength(2);
            expect(userProgress.moduleProgress[0].moduleId).toBe('js-001');
            expect(userProgress.moduleProgress[0].status).toBe('not_started');
            expect(userProgress.moduleProgress[1].moduleId).toBe('js-002');
            expect(userProgress.moduleProgress[1].status).toBe('not_started');
        });
    });

    describe('GET /api/courses/meta/categories', () => {
        beforeEach(async () => {
            await Course.create([
                {
                    title: 'Design Course',
                    description: 'Learn design',
                    category: 'Design',
                    difficultyLevel: 'beginner',
                    estimatedDuration: 15,
                    modules: [],
                    createdBy: adminUser._id
                },
                {
                    title: 'Marketing Course',
                    description: 'Learn marketing',
                    category: 'Marketing',
                    difficultyLevel: 'intermediate',
                    estimatedDuration: 20,
                    modules: [],
                    createdBy: adminUser._id,
                    isActive: false // Should not be included
                }
            ]);
        });

        it('should get course categories and difficulty levels', async () => {
            const response = await request(app)
                .get('/api/courses/meta/categories')
                .expect(200);

            expect(response.body.categories).toContain('Programming');
            expect(response.body.categories).toContain('Design');
            expect(response.body.categories).not.toContain('Marketing'); // Inactive course
            expect(response.body.difficultyLevels).toEqual(['beginner', 'intermediate', 'advanced']);
        });

        it('should handle server errors', async () => {
            jest.spyOn(Course, 'distinct').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .get('/api/courses/meta/categories')
                .expect(500);

            expect(response.body.error.code).toBe('SERVER_ERROR');
        });
    });
});