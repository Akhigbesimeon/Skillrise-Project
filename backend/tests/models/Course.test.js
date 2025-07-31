const mongoose = require('mongoose');
const Course = require('../../models/Course');
const User = require('../../models/User');

describe('Course Model', () => {
    let testUser;

    beforeEach(async () => {
        // Create a test user for course creation
        testUser = new User({
            email: 'admin@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Admin',
            userType: 'admin'
        });
        await testUser.save();
    });

    afterEach(async () => {
        await Course.deleteMany({});
        await User.deleteMany({});
    });

    describe('Course Creation', () => {
        it('should create a valid course', async () => {
            const courseData = {
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
                    }
                ],
                createdBy: testUser._id
            };

            const course = new Course(courseData);
            const savedCourse = await course.save();

            expect(savedCourse._id).toBeDefined();
            expect(savedCourse.title).toBe(courseData.title);
            expect(savedCourse.description).toBe(courseData.description);
            expect(savedCourse.category).toBe(courseData.category);
            expect(savedCourse.difficultyLevel).toBe(courseData.difficultyLevel);
            expect(savedCourse.estimatedDuration).toBe(courseData.estimatedDuration);
            expect(savedCourse.modules).toHaveLength(1);
            expect(savedCourse.isActive).toBe(true);
            expect(savedCourse.enrollmentCount).toBe(0);
            expect(savedCourse.completionCount).toBe(0);
            expect(savedCourse.createdAt).toBeDefined();
            expect(savedCourse.updatedAt).toBeDefined();
        });

        it('should require all mandatory fields', async () => {
            const course = new Course({});

            let error;
            try {
                await course.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.title).toBeDefined();
            expect(error.errors.description).toBeDefined();
            expect(error.errors.category).toBeDefined();
            expect(error.errors.difficultyLevel).toBeDefined();
            expect(error.errors.estimatedDuration).toBeDefined();
            expect(error.errors.createdBy).toBeDefined();
        });

        it('should validate difficulty level enum', async () => {
            const courseData = {
                title: 'Test Course',
                description: 'Test description',
                category: 'Test',
                difficultyLevel: 'invalid-level',
                estimatedDuration: 10,
                createdBy: testUser._id
            };

            const course = new Course(courseData);

            let error;
            try {
                await course.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors.difficultyLevel).toBeDefined();
        });

        it('should validate module structure', async () => {
            const courseData = {
                title: 'Test Course',
                description: 'Test description',
                category: 'Test',
                difficultyLevel: 'beginner',
                estimatedDuration: 10,
                modules: [
                    {
                        // Missing required fields
                        title: 'Test Module'
                    }
                ],
                createdBy: testUser._id
            };

            const course = new Course(courseData);

            let error;
            try {
                await course.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
            expect(error.errors['modules.0.moduleId']).toBeDefined();
            expect(error.errors['modules.0.description']).toBeDefined();
        });

        it('should validate assessment structure', async () => {
            const courseData = {
                title: 'Test Course',
                description: 'Test description',
                category: 'Test',
                difficultyLevel: 'beginner',
                estimatedDuration: 10,
                modules: [
                    {
                        moduleId: 'test-001',
                        title: 'Test Module',
                        description: 'Test description',
                        assessment: {
                            questions: [
                                {
                                    question: 'Test question?',
                                    type: 'invalid-type',
                                    correctAnswer: 'Test answer'
                                }
                            ],
                            passingScore: 150 // Invalid score > 100
                        }
                    }
                ],
                createdBy: testUser._id
            };

            const course = new Course(courseData);

            let error;
            try {
                await course.save();
            } catch (err) {
                error = err;
            }

            expect(error).toBeDefined();
        });
    });

    describe('Course Queries', () => {
        let courses;

        beforeEach(async () => {
            courses = await Course.create([
                {
                    title: 'JavaScript Basics',
                    description: 'Learn JavaScript fundamentals',
                    category: 'Programming',
                    difficultyLevel: 'beginner',
                    estimatedDuration: 15,
                    modules: [],
                    createdBy: testUser._id,
                    isActive: true
                },
                {
                    title: 'Advanced React',
                    description: 'Master React development',
                    category: 'Programming',
                    difficultyLevel: 'advanced',
                    estimatedDuration: 30,
                    modules: [],
                    createdBy: testUser._id,
                    isActive: true
                },
                {
                    title: 'UI/UX Design',
                    description: 'Learn design principles',
                    category: 'Design',
                    difficultyLevel: 'intermediate',
                    estimatedDuration: 25,
                    modules: [],
                    createdBy: testUser._id,
                    isActive: false
                }
            ]);
        });

        it('should find active courses only', async () => {
            const activeCourses = await Course.find({ isActive: true });
            expect(activeCourses).toHaveLength(2);
        });

        it('should filter by category', async () => {
            const programmingCourses = await Course.find({ 
                category: 'Programming',
                isActive: true 
            });
            expect(programmingCourses).toHaveLength(2);
        });

        it('should filter by difficulty level', async () => {
            const beginnerCourses = await Course.find({ 
                difficultyLevel: 'beginner',
                isActive: true 
            });
            expect(beginnerCourses).toHaveLength(1);
            expect(beginnerCourses[0].title).toBe('JavaScript Basics');
        });

        it('should support text search', async () => {
            // Create text index for testing
            await Course.collection.createIndex({ title: 'text', description: 'text' });
            
            const searchResults = await Course.find({
                $text: { $search: 'JavaScript' },
                isActive: true
            });
            
            expect(searchResults).toHaveLength(1);
            expect(searchResults[0].title).toBe('JavaScript Basics');
        });

        it('should get distinct categories', async () => {
            const categories = await Course.distinct('category', { isActive: true });
            expect(categories).toContain('Programming');
            expect(categories).toHaveLength(1); // Only active courses
        });
    });

    describe('Course Updates', () => {
        let course;

        beforeEach(async () => {
            course = new Course({
                title: 'Test Course',
                description: 'Test description',
                category: 'Test',
                difficultyLevel: 'beginner',
                estimatedDuration: 10,
                modules: [],
                createdBy: testUser._id
            });
            await course.save();
        });

        it('should update enrollment count', async () => {
            await Course.findByIdAndUpdate(course._id, {
                $inc: { enrollmentCount: 1 }
            });

            const updatedCourse = await Course.findById(course._id);
            expect(updatedCourse.enrollmentCount).toBe(1);
        });

        it('should update completion count', async () => {
            await Course.findByIdAndUpdate(course._id, {
                $inc: { completionCount: 1 }
            });

            const updatedCourse = await Course.findById(course._id);
            expect(updatedCourse.completionCount).toBe(1);
        });

        it('should deactivate course', async () => {
            await Course.findByIdAndUpdate(course._id, {
                isActive: false
            });

            const updatedCourse = await Course.findById(course._id);
            expect(updatedCourse.isActive).toBe(false);
        });
    });
});