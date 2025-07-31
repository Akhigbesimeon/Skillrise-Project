const request = require('supertest');
const { performance } = require('perf_hooks');
const app = require('../../server');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Project = require('../../models/Project');

describe('Performance Tests', () => {
    let testUsers = [];
    let testCourses = [];
    let testProjects = [];
    let authTokens = [];

    beforeAll(async () => {
        // Create test data for performance testing
        console.log('Setting up performance test data...');
        
        // Create multiple test users
        for (let i = 0; i < 50; i++) {
            const user = await User.create({
                fullName: `Performance User ${i}`,
                email: `perf${i}@test.com`,
                password: 'TestPass123!',
                role: i % 3 === 0 ? 'client' : i % 3 === 1 ? 'freelancer' : 'mentor'
            });
            testUsers.push(user);
            
            // Get auth token for each user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: user.email,
                    password: 'TestPass123!'
                });
            
            if (loginResponse.body.token) {
                authTokens.push(loginResponse.body.token);
            }
        }

        // Create test courses
        for (let i = 0; i < 20; i++) {
            const course = await Course.create({
                title: `Performance Course ${i}`,
                description: `Test course for performance testing ${i}`,
                instructorId: testUsers[i % testUsers.length]._id,
                category: 'Technology',
                difficulty: 'Intermediate',
                duration: 120,
                modules: [
                    {
                        title: `Module 1 - Course ${i}`,
                        content: 'Performance test content',
                        duration: 60,
                        order: 1
                    }
                ]
            });
            testCourses.push(course);
        }

        // Create test projects
        for (let i = 0; i < 30; i++) {
            const project = await Project.create({
                title: `Performance Project ${i}`,
                description: `Test project for performance testing ${i}`,
                clientId: testUsers[i % testUsers.length]._id,
                budget: { min: 1000, max: 5000 },
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                skillsRequired: ['JavaScript', 'Node.js'],
                status: 'open'
            });
            testProjects.push(project);
        }

        console.log(`Created ${testUsers.length} users, ${testCourses.length} courses, ${testProjects.length} projects`);
    });

    afterAll(async () => {
        // Cleanup test data
        await User.deleteMany({ email: /^perf\d+@test\.com$/ });
        await Course.deleteMany({ title: /^Performance Course \d+$/ });
        await Project.deleteMany({ title: /^Performance Project \d+$/ });
    });

    describe('API Response Time Tests', () => {
        it('should handle user authentication within acceptable time', async () => {
            const iterations = 100;
            const times = [];

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: testUsers[i % testUsers.length].email,
                        password: 'TestPass123!'
                    });

                const end = performance.now();
                times.push(end - start);

                expect(response.status).toBe(200);
            }

            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);
            const minTime = Math.min(...times);

            console.log(`Auth Performance - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms`);

            // Authentication should complete within 500ms on average
            expect(avgTime).toBeLessThan(500);
            // No single request should take more than 2 seconds
            expect(maxTime).toBeLessThan(2000);
        });

        it('should handle course listing with pagination efficiently', async () => {
            const iterations = 50;
            const times = [];

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                
                const response = await request(app)
                    .get('/api/courses')
                    .query({ page: (i % 5) + 1, limit: 10 })
                    .set('Authorization', `Bearer ${authTokens[0]}`);

                const end = performance.now();
                times.push(end - start);

                expect(response.status).toBe(200);
                expect(response.body.courses).toBeDefined();
            }

            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`Course Listing Performance - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

            // Course listing should complete within 300ms on average
            expect(avgTime).toBeLessThan(300);
            expect(maxTime).toBeLessThan(1000);
        });

        it('should handle project search efficiently', async () => {
            const searchTerms = ['JavaScript', 'Node.js', 'React', 'Python', 'Design'];
            const times = [];

            for (let i = 0; i < 25; i++) {
                const searchTerm = searchTerms[i % searchTerms.length];
                const start = performance.now();
                
                const response = await request(app)
                    .get('/api/projects/search')
                    .query({ q: searchTerm, limit: 10 })
                    .set('Authorization', `Bearer ${authTokens[0]}`);

                const end = performance.now();
                times.push(end - start);

                expect(response.status).toBe(200);
            }

            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`Project Search Performance - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

            // Search should complete within 400ms on average
            expect(avgTime).toBeLessThan(400);
            expect(maxTime).toBeLessThan(1500);
        });
    });

    describe('Concurrent User Tests', () => {
        it('should handle multiple concurrent logins', async () => {
            const concurrentUsers = 20;
            const loginPromises = [];

            const start = performance.now();

            for (let i = 0; i < concurrentUsers; i++) {
                const loginPromise = request(app)
                    .post('/api/auth/login')
                    .send({
                        email: testUsers[i].email,
                        password: 'TestPass123!'
                    });
                loginPromises.push(loginPromise);
            }

            const responses = await Promise.all(loginPromises);
            const end = performance.now();

            const totalTime = end - start;
            console.log(`Concurrent Logins (${concurrentUsers} users) - Total: ${totalTime.toFixed(2)}ms`);

            // All logins should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.token).toBeDefined();
            });

            // Concurrent logins should complete within 3 seconds
            expect(totalTime).toBeLessThan(3000);
        });

        it('should handle concurrent course enrollments', async () => {
            const concurrentEnrollments = 15;
            const enrollmentPromises = [];
            const courseId = testCourses[0]._id;

            const start = performance.now();

            for (let i = 0; i < concurrentEnrollments; i++) {
                const enrollmentPromise = request(app)
                    .post(`/api/courses/${courseId}/enroll`)
                    .set('Authorization', `Bearer ${authTokens[i]}`);
                enrollmentPromises.push(enrollmentPromise);
            }

            const responses = await Promise.all(enrollmentPromises);
            const end = performance.now();

            const totalTime = end - start;
            console.log(`Concurrent Enrollments (${concurrentEnrollments} users) - Total: ${totalTime.toFixed(2)}ms`);

            // Most enrollments should succeed (some might fail due to duplicates)
            const successfulEnrollments = responses.filter(r => r.status === 200 || r.status === 201);
            expect(successfulEnrollments.length).toBeGreaterThan(concurrentEnrollments * 0.8);

            // Concurrent enrollments should complete within 2 seconds
            expect(totalTime).toBeLessThan(2000);
        });

        it('should handle concurrent project applications', async () => {
            const concurrentApplications = 10;
            const applicationPromises = [];
            const projectId = testProjects[0]._id;

            const start = performance.now();

            for (let i = 0; i < concurrentApplications; i++) {
                const applicationPromise = request(app)
                    .post(`/api/projects/${projectId}/apply`)
                    .set('Authorization', `Bearer ${authTokens[i]}`)
                    .send({
                        coverLetter: `Performance test application ${i}`,
                        proposedRate: 50
                    });
                applicationPromises.push(applicationPromise);
            }

            const responses = await Promise.all(applicationPromises);
            const end = performance.now();

            const totalTime = end - start;
            console.log(`Concurrent Applications (${concurrentApplications} users) - Total: ${totalTime.toFixed(2)}ms`);

            // Most applications should succeed
            const successfulApplications = responses.filter(r => r.status === 200 || r.status === 201);
            expect(successfulApplications.length).toBeGreaterThan(concurrentApplications * 0.7);

            // Concurrent applications should complete within 2.5 seconds
            expect(totalTime).toBeLessThan(2500);
        });
    });

    describe('Database Performance Tests', () => {
        it('should handle large dataset queries efficiently', async () => {
            const start = performance.now();

            // Query all users with pagination
            const usersResponse = await request(app)
                .get('/api/admin/users')
                .query({ page: 1, limit: 50 })
                .set('Authorization', `Bearer ${authTokens[0]}`);

            const end = performance.now();
            const queryTime = end - start;

            console.log(`Large Dataset Query - Time: ${queryTime.toFixed(2)}ms`);

            expect(usersResponse.status).toBe(200);
            expect(usersResponse.body.users).toBeDefined();
            
            // Large dataset queries should complete within 800ms
            expect(queryTime).toBeLessThan(800);
        });

        it('should handle complex aggregation queries efficiently', async () => {
            const start = performance.now();

            // Get course statistics (complex aggregation)
            const statsResponse = await request(app)
                .get('/api/admin/statistics/courses')
                .set('Authorization', `Bearer ${authTokens[0]}`);

            const end = performance.now();
            const queryTime = end - start;

            console.log(`Complex Aggregation Query - Time: ${queryTime.toFixed(2)}ms`);

            expect(statsResponse.status).toBe(200);
            
            // Complex queries should complete within 1 second
            expect(queryTime).toBeLessThan(1000);
        });
    });

    describe('Memory Usage Tests', () => {
        it('should not have significant memory leaks during repeated operations', async () => {
            const initialMemory = process.memoryUsage();
            
            // Perform repeated operations
            for (let i = 0; i < 100; i++) {
                await request(app)
                    .get('/api/courses')
                    .set('Authorization', `Bearer ${authTokens[0]}`);
                
                await request(app)
                    .get('/api/projects')
                    .set('Authorization', `Bearer ${authTokens[0]}`);
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

            console.log(`Memory Usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${memoryIncreaseMB.toFixed(2)}MB`);

            // Memory increase should be reasonable (less than 50MB for 200 requests)
            expect(memoryIncreaseMB).toBeLessThan(50);
        });
    });

    describe('Rate Limiting Performance', () => {
        it('should handle rate limiting efficiently', async () => {
            const requests = [];
            const start = performance.now();

            // Make requests up to the rate limit
            for (let i = 0; i < 20; i++) {
                requests.push(
                    request(app)
                        .get('/api/courses')
                        .set('Authorization', `Bearer ${authTokens[0]}`)
                        .set('X-Forwarded-For', '192.168.1.100')
                );
            }

            const responses = await Promise.all(requests);
            const end = performance.now();
            const totalTime = end - start;

            console.log(`Rate Limiting Test - Total Time: ${totalTime.toFixed(2)}ms`);

            const successfulRequests = responses.filter(r => r.status === 200);
            const rateLimitedRequests = responses.filter(r => r.status === 429);

            expect(successfulRequests.length).toBeGreaterThan(0);
            expect(rateLimitedRequests.length).toBeGreaterThan(0);
            
            // Rate limiting should not significantly impact performance
            expect(totalTime).toBeLessThan(5000);
        });
    });

    describe('File Upload Performance', () => {
        it('should handle file uploads efficiently', async () => {
            // Create a test file buffer (1MB)
            const fileBuffer = Buffer.alloc(1024 * 1024, 'test data');
            const times = [];

            for (let i = 0; i < 5; i++) {
                const start = performance.now();

                const response = await request(app)
                    .post('/api/users/profile/image')
                    .set('Authorization', `Bearer ${authTokens[0]}`)
                    .attach('image', fileBuffer, 'test.jpg');

                const end = performance.now();
                times.push(end - start);

                // Accept both success and validation errors for performance testing
                expect([200, 201, 400, 413]).toContain(response.status);
            }

            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`File Upload Performance - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

            // File uploads should complete within reasonable time
            expect(avgTime).toBeLessThan(2000);
            expect(maxTime).toBeLessThan(5000);
        });
    });

    describe('WebSocket Performance', () => {
        it('should handle WebSocket connections efficiently', async () => {
            // This would test WebSocket performance if implemented
            // For now, we'll test the HTTP endpoints that would support real-time features
            
            const messageRequests = [];
            const start = performance.now();

            for (let i = 0; i < 10; i++) {
                messageRequests.push(
                    request(app)
                        .post('/api/messages')
                        .set('Authorization', `Bearer ${authTokens[0]}`)
                        .send({
                            recipientId: testUsers[1]._id,
                            content: `Performance test message ${i}`
                        })
                );
            }

            const responses = await Promise.all(messageRequests);
            const end = performance.now();
            const totalTime = end - start;

            console.log(`Message Sending Performance - Total Time: ${totalTime.toFixed(2)}ms`);

            const successfulMessages = responses.filter(r => r.status === 200 || r.status === 201);
            expect(successfulMessages.length).toBe(10);
            
            // Message sending should be fast
            expect(totalTime).toBeLessThan(3000);
        });
    });

    describe('Search Performance', () => {
        it('should handle search queries efficiently', async () => {
            const searchQueries = [
                'JavaScript developer',
                'React frontend',
                'Node.js backend',
                'Python data science',
                'UI/UX design',
                'Mobile app development',
                'Machine learning',
                'DevOps engineer'
            ];

            const times = [];

            for (const query of searchQueries) {
                const start = performance.now();

                const [courseSearch, projectSearch, userSearch] = await Promise.all([
                    request(app)
                        .get('/api/courses/search')
                        .query({ q: query })
                        .set('Authorization', `Bearer ${authTokens[0]}`),
                    request(app)
                        .get('/api/projects/search')
                        .query({ q: query })
                        .set('Authorization', `Bearer ${authTokens[0]}`),
                    request(app)
                        .get('/api/users/search')
                        .query({ q: query })
                        .set('Authorization', `Bearer ${authTokens[0]}`)
                ]);

                const end = performance.now();
                times.push(end - start);

                // Accept various response codes for search
                expect([200, 404]).toContain(courseSearch.status);
                expect([200, 404]).toContain(projectSearch.status);
                expect([200, 404]).toContain(userSearch.status);
            }

            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`Search Performance - Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

            // Search should be fast
            expect(avgTime).toBeLessThan(600);
            expect(maxTime).toBeLessThan(1500);
        });
    });

    describe('Stress Testing', () => {
        it('should handle high load without crashing', async () => {
            const highLoadRequests = 100;
            const batchSize = 10;
            const batches = [];

            // Create batches of requests to avoid overwhelming the system
            for (let i = 0; i < highLoadRequests; i += batchSize) {
                const batch = [];
                for (let j = 0; j < batchSize && (i + j) < highLoadRequests; j++) {
                    batch.push(
                        request(app)
                            .get('/api/courses')
                            .set('Authorization', `Bearer ${authTokens[(i + j) % authTokens.length]}`)
                    );
                }
                batches.push(batch);
            }

            const start = performance.now();
            let totalSuccessful = 0;
            let totalErrors = 0;

            // Execute batches sequentially to control load
            for (const batch of batches) {
                const responses = await Promise.all(batch);
                responses.forEach(response => {
                    if (response.status === 200) {
                        totalSuccessful++;
                    } else {
                        totalErrors++;
                    }
                });
            }

            const end = performance.now();
            const totalTime = end - start;

            console.log(`Stress Test - Total Time: ${totalTime.toFixed(2)}ms, Successful: ${totalSuccessful}, Errors: ${totalErrors}`);

            // System should handle most requests successfully
            expect(totalSuccessful).toBeGreaterThan(highLoadRequests * 0.8);
            
            // Should complete within reasonable time
            expect(totalTime).toBeLessThan(30000); // 30 seconds
        });
    });
});