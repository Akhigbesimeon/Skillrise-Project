const request = require('supertest');
const testConfig = require('../config/testConfig');
const app = require('../../server');
const User = require('../../models/User');
const Course = require('../../models/Course');
const Project = require('../../models/Project');
const Message = require('../../models/Message');
const Mentorship = require('../../models/Mentorship');

describe('End-to-End User Workflows', () => {
    let testUsers = {};
    let testCourse;
    let testProject;
    let authTokens = {};

    beforeAll(async () => {
        // Create test users for different roles
        const userData = [
            {
                role: 'freelancer',
                fullName: 'John Freelancer',
                email: 'john.freelancer@test.com',
                password: 'TestPass123!',
                skills: ['JavaScript', 'React', 'Node.js'],
                bio: 'Experienced full-stack developer'
            },
            {
                role: 'client',
                fullName: 'Jane Client',
                email: 'jane.client@test.com',
                password: 'TestPass123!',
                companyName: 'Tech Corp',
                bio: 'Looking for talented developers'
            },
            {
                role: 'mentor',
                fullName: 'Bob Mentor',
                email: 'bob.mentor@test.com',
                password: 'TestPass123!',
                skills: ['Leadership', 'Career Development', 'Technical Mentoring'],
                bio: 'Senior developer with 10+ years experience'
            },
            {
                role: 'admin',
                fullName: 'Admin User',
                email: 'admin@test.com',
                password: 'TestPass123!',
                bio: 'Platform administrator'
            }
        ];

        // Create users and get auth tokens
        for (const data of userData) {
            const user = await User.create(data);
            testUsers[data.role] = user;

            // Login to get auth token
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: data.email,
                    password: data.password
                });

            authTokens[data.role] = loginResponse.body.token;
        }

        // Create a test course
        testCourse = await Course.create({
            title: 'E2E Test Course',
            description: 'Course for end-to-end testing',
            instructorId: testUsers.mentor._id,
            category: 'Technology',
            difficulty: 'Intermediate',
            duration: 120,
            modules: [
                {
                    title: 'Module 1: Introduction',
                    content: 'Introduction to the course',
                    duration: 30,
                    order: 1
                },
                {
                    title: 'Module 2: Advanced Topics',
                    content: 'Advanced course content',
                    duration: 90,
                    order: 2
                }
            ]
        });

        // Create a test project
        testProject = await Project.create({
            title: 'E2E Test Project',
            description: 'Project for end-to-end testing',
            clientId: testUsers.client._id,
            budget: { min: 1000, max: 5000 },
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            skillsRequired: ['JavaScript', 'React'],
            status: 'open'
        });
    });

    afterAll(async () => {
        // Cleanup test data
        await User.deleteMany({ email: /test\.com$/ });
        await Course.deleteMany({ title: /E2E Test/ });
        await Project.deleteMany({ title: /E2E Test/ });
        await Message.deleteMany({});
        await Mentorship.deleteMany({});
    });

    describe('User Registration and Authentication Flow', () => {
        it('should complete full registration workflow', async () => {
            const newUserData = {
                fullName: 'New Test User',
                email: 'newuser@test.com',
                password: 'TestPass123!',
                role: 'freelancer'
            };

            // Step 1: Register new user
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send(newUserData);

            expect(registerResponse.status).toBe(201);
            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.user.email).toBe(newUserData.email);

            // Step 2: Login with new user
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: newUserData.email,
                    password: newUserData.password
                });

            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.token).toBeDefined();

            // Step 3: Access protected route
            const profileResponse = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${loginResponse.body.token}`);

            expect(profileResponse.status).toBe(200);
            expect(profileResponse.body.user.email).toBe(newUserData.email);

            // Cleanup
            await User.findOneAndDelete({ email: newUserData.email });
        });

        it('should handle password reset workflow', async () => {
            // Step 1: Request password reset
            const resetRequest = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: testUsers.freelancer.email
                });

            expect(resetRequest.status).toBe(200);
            expect(resetRequest.body.success).toBe(true);

            // Step 2: Get reset token (in real app, this would come from email)
            const user = await User.findById(testUsers.freelancer._id);
            const resetToken = user.resetPasswordToken;

            // Step 3: Reset password
            const newPassword = 'NewTestPass123!';
            const resetResponse = await request(app)
                .post(`/api/auth/reset-password/${resetToken}`)
                .send({
                    password: newPassword
                });

            expect(resetResponse.status).toBe(200);
            expect(resetResponse.body.success).toBe(true);

            // Step 4: Login with new password
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUsers.freelancer.email,
                    password: newPassword
                });

            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.success).toBe(true);

            // Update token for future tests
            authTokens.freelancer = loginResponse.body.token;
        });
    });

    describe('Course Learning Workflow', () => {
        it('should complete full course learning journey', async () => {
            // Step 1: Browse and search courses
            const browseResponse = await request(app)
                .get('/api/courses')
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(browseResponse.status).toBe(200);
            expect(browseResponse.body.courses).toBeDefined();
            expect(browseResponse.body.courses.length).toBeGreaterThan(0);

            // Step 2: Get course details
            const courseDetailsResponse = await request(app)
                .get(`/api/courses/${testCourse._id}`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(courseDetailsResponse.status).toBe(200);
            expect(courseDetailsResponse.body.course.title).toBe(testCourse.title);

            // Step 3: Enroll in course
            const enrollResponse = await request(app)
                .post(`/api/courses/${testCourse._id}/enroll`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(enrollResponse.status).toBe(200);
            expect(enrollResponse.body.success).toBe(true);

            // Step 4: Start learning - complete first module
            const progressResponse1 = await request(app)
                .post(`/api/courses/${testCourse._id}/progress`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .send({
                    moduleId: testCourse.modules[0]._id,
                    completed: true,
                    timeSpent: 30
                });

            expect(progressResponse1.status).toBe(200);
            expect(progressResponse1.body.success).toBe(true);

            // Step 5: Complete second module
            const progressResponse2 = await request(app)
                .post(`/api/courses/${testCourse._id}/progress`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .send({
                    moduleId: testCourse.modules[1]._id,
                    completed: true,
                    timeSpent: 90
                });

            expect(progressResponse2.status).toBe(200);
            expect(progressResponse2.body.success).toBe(true);

            // Step 6: Check overall progress
            const overallProgressResponse = await request(app)
                .get(`/api/courses/${testCourse._id}/progress`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(overallProgressResponse.status).toBe(200);
            expect(overallProgressResponse.body.progress.completionPercentage).toBe(100);

            // Step 7: Get certificate
            const certificateResponse = await request(app)
                .get(`/api/certificates/course/${testCourse._id}`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(certificateResponse.status).toBe(200);
            expect(certificateResponse.body.certificate).toBeDefined();
        });
    });

    describe('Project Marketplace Workflow', () => {
        it('should complete full project workflow from posting to completion', async () => {
            // Step 1: Client posts a new project
            const newProjectData = {
                title: 'E2E Workflow Project',
                description: 'A project for testing the complete workflow',
                budget: { min: 2000, max: 4000 },
                deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                skillsRequired: ['JavaScript', 'React', 'Node.js']
            };

            const projectResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authTokens.client}`)
                .send(newProjectData);

            expect(projectResponse.status).toBe(201);
            expect(projectResponse.body.success).toBe(true);
            const workflowProject = projectResponse.body.project;

            // Step 2: Freelancer searches for projects
            const searchResponse = await request(app)
                .get('/api/projects/search')
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .query({ q: 'JavaScript' });

            expect(searchResponse.status).toBe(200);
            expect(searchResponse.body.projects.length).toBeGreaterThan(0);

            // Step 3: Freelancer applies to project
            const applicationData = {
                coverLetter: 'I am very interested in this project and have the required skills.',
                proposedRate: 75,
                estimatedDuration: 30
            };

            const applyResponse = await request(app)
                .post(`/api/projects/${workflowProject._id}/apply`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .send(applicationData);

            expect(applyResponse.status).toBe(200);
            expect(applyResponse.body.success).toBe(true);

            // Step 4: Client reviews applications
            const applicationsResponse = await request(app)
                .get(`/api/projects/${workflowProject._id}/applications`)
                .set('Authorization', `Bearer ${authTokens.client}`);

            expect(applicationsResponse.status).toBe(200);
            expect(applicationsResponse.body.applications.length).toBe(1);

            // Step 5: Client selects freelancer
            const selectResponse = await request(app)
                .post(`/api/projects/${workflowProject._id}/select-freelancer`)
                .set('Authorization', `Bearer ${authTokens.client}`)
                .send({
                    freelancerId: testUsers.freelancer._id
                });

            expect(selectResponse.status).toBe(200);
            expect(selectResponse.body.success).toBe(true);

            // Step 6: Project status updates
            const statusResponse = await request(app)
                .get(`/api/projects/${workflowProject._id}`)
                .set('Authorization', `Bearer ${authTokens.client}`);

            expect(statusResponse.status).toBe(200);
            expect(statusResponse.body.project.status).toBe('in_progress');
            expect(statusResponse.body.project.assignedFreelancerId.toString()).toBe(testUsers.freelancer._id.toString());

            // Cleanup
            await Project.findByIdAndDelete(workflowProject._id);
        });
    });

    describe('Mentorship Workflow', () => {
        it('should complete mentorship request and session workflow', async () => {
            // Step 1: Freelancer requests mentorship
            const mentorshipData = {
                mentorId: testUsers.mentor._id,
                goals: ['Career advancement', 'Technical skills improvement'],
                preferredSchedule: 'weekends',
                message: 'I would like guidance on advancing my career in web development.'
            };

            const requestResponse = await request(app)
                .post('/api/mentorship/request')
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .send(mentorshipData);

            expect(requestResponse.status).toBe(201);
            expect(requestResponse.body.success).toBe(true);
            const mentorship = requestResponse.body.mentorship;

            // Step 2: Mentor accepts the request
            const acceptResponse = await request(app)
                .post(`/api/mentorship/${mentorship._id}/accept`)
                .set('Authorization', `Bearer ${authTokens.mentor}`)
                .send({
                    message: 'I would be happy to mentor you!'
                });

            expect(acceptResponse.status).toBe(200);
            expect(acceptResponse.body.success).toBe(true);

            // Step 3: Schedule a session
            const sessionData = {
                scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
                duration: 60,
                agenda: 'Career planning and goal setting',
                meetingLink: 'https://meet.example.com/session123'
            };

            const sessionResponse = await request(app)
                .post(`/api/mentorship/${mentorship._id}/sessions`)
                .set('Authorization', `Bearer ${authTokens.mentor}`)
                .send(sessionData);

            expect(sessionResponse.status).toBe(201);
            expect(sessionResponse.body.success).toBe(true);

            // Step 4: Complete session with feedback
            const sessionId = sessionResponse.body.session._id;
            const feedbackData = {
                mentorFeedback: 'Great session, mentee is very motivated and has clear goals.',
                menteeFeedback: 'Very helpful session, learned a lot about career planning.',
                rating: 5,
                nextSteps: ['Update resume', 'Apply to senior positions', 'Schedule follow-up']
            };

            const feedbackResponse = await request(app)
                .post(`/api/mentorship/sessions/${sessionId}/feedback`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .send(feedbackData);

            expect(feedbackResponse.status).toBe(200);
            expect(feedbackResponse.body.success).toBe(true);

            // Cleanup
            await Mentorship.findByIdAndDelete(mentorship._id);
        });
    });

    describe('Messaging and Communication Workflow', () => {
        it('should handle complete messaging workflow', async () => {
            // Step 1: Send initial message
            const messageData = {
                recipientId: testUsers.client._id,
                content: 'Hello! I saw your project and I am interested in discussing it further.',
                subject: 'Project Inquiry'
            };

            const sendResponse = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .send(messageData);

            expect(sendResponse.status).toBe(201);
            expect(sendResponse.body.success).toBe(true);
            const messageId = sendResponse.body.message._id;

            // Step 2: Recipient reads message
            const readResponse = await request(app)
                .put(`/api/messages/${messageId}/read`)
                .set('Authorization', `Bearer ${authTokens.client}`);

            expect(readResponse.status).toBe(200);
            expect(readResponse.body.success).toBe(true);

            // Step 3: Reply to message
            const replyData = {
                recipientId: testUsers.freelancer._id,
                content: 'Thank you for your interest! I would love to discuss the project details with you.',
                subject: 'Re: Project Inquiry'
            };

            const replyResponse = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${authTokens.client}`)
                .send(replyData);

            expect(replyResponse.status).toBe(201);
            expect(replyResponse.body.success).toBe(true);

            // Step 4: Get conversation history
            const conversationResponse = await request(app)
                .get(`/api/messages/conversation/${testUsers.client._id}`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(conversationResponse.status).toBe(200);
            expect(conversationResponse.body.messages.length).toBeGreaterThanOrEqual(2);

            // Step 5: Get inbox
            const inboxResponse = await request(app)
                .get('/api/messages/inbox')
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(inboxResponse.status).toBe(200);
            expect(inboxResponse.body.messages).toBeDefined();
        });
    });

    describe('Notification Workflow', () => {
        it('should handle notification creation and management', async () => {
            // Step 1: Get current notifications
            const notificationsResponse = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(notificationsResponse.status).toBe(200);
            expect(notificationsResponse.body.notifications).toBeDefined();

            // Step 2: Mark notifications as read
            if (notificationsResponse.body.notifications.length > 0) {
                const notificationId = notificationsResponse.body.notifications[0]._id;

                const markReadResponse = await request(app)
                    .put(`/api/notifications/${notificationId}/read`)
                    .set('Authorization', `Bearer ${authTokens.freelancer}`);

                expect(markReadResponse.status).toBe(200);
                expect(markReadResponse.body.success).toBe(true);
            }

            // Step 3: Get notification preferences
            const preferencesResponse = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(preferencesResponse.status).toBe(200);
            expect(preferencesResponse.body.preferences).toBeDefined();

            // Step 4: Update notification preferences
            const updatePreferencesResponse = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authTokens.freelancer}`)
                .send({
                    email: {
                        messages: true,
                        projectUpdates: true,
                        mentorshipUpdates: false
                    },
                    push: {
                        messages: true,
                        projectUpdates: false,
                        mentorshipUpdates: true
                    }
                });

            expect(updatePreferencesResponse.status).toBe(200);
            expect(updatePreferencesResponse.body.success).toBe(true);
        });
    });

    describe('Admin Workflow', () => {
        it('should handle admin dashboard and management tasks', async () => {
            // Step 1: Access admin dashboard
            const dashboardResponse = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${authTokens.admin}`);

            expect(dashboardResponse.status).toBe(200);
            expect(dashboardResponse.body.statistics).toBeDefined();

            // Step 2: Get user management data
            const usersResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${authTokens.admin}`)
                .query({ page: 1, limit: 10 });

            expect(usersResponse.status).toBe(200);
            expect(usersResponse.body.users).toBeDefined();
            expect(usersResponse.body.pagination).toBeDefined();

            // Step 3: Get system health
            const healthResponse = await request(app)
                .get('/api/admin/system/health')
                .set('Authorization', `Bearer ${authTokens.admin}`);

            expect(healthResponse.status).toBe(200);
            expect(healthResponse.body.health).toBeDefined();

            // Step 4: Get platform statistics
            const statsResponse = await request(app)
                .get('/api/admin/statistics')
                .set('Authorization', `Bearer ${authTokens.admin}`);

            expect(statsResponse.status).toBe(200);
            expect(statsResponse.body.statistics).toBeDefined();
        });

        it('should handle content moderation workflow', async () => {
            // Step 1: Get moderation queue
            const queueResponse = await request(app)
                .get('/api/moderation/queue')
                .set('Authorization', `Bearer ${authTokens.admin}`);

            expect(queueResponse.status).toBe(200);
            expect(queueResponse.body.flags).toBeDefined();

            // Step 2: Get moderation statistics
            const statsResponse = await request(app)
                .get('/api/moderation/statistics')
                .set('Authorization', `Bearer ${authTokens.admin}`);

            expect(statsResponse.status).toBe(200);
            expect(statsResponse.body.statistics).toBeDefined();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle unauthorized access attempts', async () => {
            // Try to access admin endpoint without admin token
            const unauthorizedResponse = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(unauthorizedResponse.status).toBe(403);

            // Try to access protected endpoint without token
            const noTokenResponse = await request(app)
                .get('/api/users/profile');

            expect(noTokenResponse.status).toBe(401);
        });

        it('should handle invalid data submissions', async () => {
            // Try to create project with invalid data
            const invalidProjectResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authTokens.client}`)
                .send({
                    title: '', // Empty title
                    budget: { min: -100 } // Invalid budget
                });

            expect(invalidProjectResponse.status).toBe(400);

            // Try to register with invalid email
            const invalidRegisterResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    fullName: 'Test User',
                    email: 'invalid-email',
                    password: 'weak'
                });

            expect(invalidRegisterResponse.status).toBe(400);
        });

        it('should handle resource not found scenarios', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';

            // Try to get non-existent course
            const courseResponse = await request(app)
                .get(`/api/courses/${nonExistentId}`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(courseResponse.status).toBe(404);

            // Try to get non-existent project
            const projectResponse = await request(app)
                .get(`/api/projects/${nonExistentId}`)
                .set('Authorization', `Bearer ${authTokens.freelancer}`);

            expect(projectResponse.status).toBe(404);
        });
    });

    describe('Performance and Load Handling', () => {
        it('should handle concurrent requests efficiently', async () => {
            const concurrentRequests = 10;
            const requests = [];

            // Create multiple concurrent requests
            for (let i = 0; i < concurrentRequests; i++) {
                requests.push(
                    request(app)
                        .get('/api/courses')
                        .set('Authorization', `Bearer ${authTokens.freelancer}`)
                );
            }

            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const endTime = Date.now();

            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });

            // Should complete within reasonable time (5 seconds for 10 requests)
            expect(endTime - startTime).toBeLessThan(5000);
        });

        it('should handle rate limiting properly', async () => {
            const requests = [];

            // Make many requests quickly to trigger rate limiting
            for (let i = 0; i < 25; i++) {
                requests.push(
                    request(app)
                        .get('/api/courses')
                        .set('Authorization', `Bearer ${authTokens.freelancer}`)
                        .set('X-Forwarded-For', '192.168.1.100')
                );
            }

            const responses = await Promise.all(requests);

            // Some requests should be successful, others rate limited
            const successfulRequests = responses.filter(r => r.status === 200);
            const rateLimitedRequests = responses.filter(r => r.status === 429);

            expect(successfulRequests.length).toBeGreaterThan(0);
            expect(rateLimitedRequests.length).toBeGreaterThan(0);
        });
    });
});