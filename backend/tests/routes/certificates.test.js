const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Course = require('../../models/Course');
const UserProgress = require('../../models/UserProgress');
const certificateService = require('../../services/certificateService');

// Mock the certificate service
jest.mock('../../services/certificateService');

describe('Certificate Routes', () => {
    let authToken;
    let testUser;
    let testCourse;
    let testUserProgress;

    beforeEach(async () => {
        // Create test user
        testUser = new User({
            fullName: 'John Doe',
            email: 'john@example.com',
            password: 'hashedpassword',
            userType: 'freelancer',
            emailVerified: true
        });
        await testUser.save();

        // Create test course
        testCourse = new Course({
            title: 'JavaScript Fundamentals',
            description: 'Learn JavaScript basics',
            category: 'Programming',
            difficultyLevel: 'beginner',
            estimatedDuration: 40,
            modules: [
                {
                    moduleId: 'module1',
                    title: 'Introduction',
                    description: 'Getting started',
                    content: 'Basic content'
                }
            ],
            createdBy: testUser._id,
            isActive: true
        });
        await testCourse.save();

        // Create completed user progress
        testUserProgress = new UserProgress({
            userId: testUser._id,
            courseId: testCourse._id,
            status: 'completed',
            overallProgress: 100,
            completedAt: new Date(),
            moduleProgress: [{
                moduleId: 'module1',
                status: 'completed',
                completedAt: new Date()
            }]
        });
        await testUserProgress.save();

        // Generate auth token
        authToken = testUser.generateAccessToken();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Course.deleteMany({});
        await UserProgress.deleteMany({});
        jest.clearAllMocks();
    });

    describe('POST /api/certificates/generate', () => {
        it('should generate certificate for completed course', async () => {
            const mockCertificateData = {
                certificateId: 'CERT-123',
                certificateUrl: '/api/certificates/CERT-123/download',
                verificationCode: 'VERIFY123',
                issueDate: new Date()
            };

            certificateService.generateCertificate.mockResolvedValue(mockCertificateData);

            const response = await request(app)
                .post('/api/certificates/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ courseId: testCourse._id });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockCertificateData);

            // Verify certificate service was called correctly
            expect(certificateService.generateCertificate).toHaveBeenCalledWith(
                expect.objectContaining({ _id: testUser._id }),
                expect.objectContaining({ _id: testCourse._id }),
                expect.objectContaining({ _id: testUserProgress._id })
            );

            // Verify user progress was updated
            const updatedProgress = await UserProgress.findById(testUserProgress._id);
            expect(updatedProgress.certificateId).toBe('CERT-123');
            expect(updatedProgress.certificateUrl).toBe('/api/certificates/CERT-123/download');
            expect(updatedProgress.certificateGeneratedAt).toBeDefined();
        });

        it('should return 400 if course ID is missing', async () => {
            const response = await request(app)
                .post('/api/certificates/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Course ID is required');
        });

        it('should return 404 if course not found', async () => {
            const nonExistentCourseId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .post('/api/certificates/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ courseId: nonExistentCourseId });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Course not found');
        });

        it('should return 400 if course not completed', async () => {
            // Update progress to incomplete
            testUserProgress.overallProgress = 50;
            await testUserProgress.save();

            const response = await request(app)
                .post('/api/certificates/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ courseId: testCourse._id });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Course must be completed to generate certificate');
        });

        it('should return 400 if certificate already exists', async () => {
            // Add certificate to progress
            testUserProgress.certificateId = 'EXISTING-CERT';
            await testUserProgress.save();

            const response = await request(app)
                .post('/api/certificates/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ courseId: testCourse._id });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Certificate already generated for this course');
            expect(response.body.certificateId).toBe('EXISTING-CERT');
        });

        it('should return 401 if not authenticated', async () => {
            const response = await request(app)
                .post('/api/certificates/generate')
                .send({ courseId: testCourse._id });

            expect(response.status).toBe(401);
        });

        it('should handle certificate service errors', async () => {
            certificateService.generateCertificate.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .post('/api/certificates/generate')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ courseId: testCourse._id });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Server error while generating certificate');
        });
    });

    describe('GET /api/certificates/:certificateId/download', () => {
        it('should download certificate by ID', async () => {
            const mockCertificateData = {
                certificateHtml: '<html><body>Certificate content</body></html>'
            };

            certificateService.getCertificateById.mockResolvedValue(mockCertificateData);

            const response = await request(app)
                .get('/api/certificates/CERT-123/download');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
            expect(response.headers['content-disposition']).toBe('inline; filename="certificate-CERT-123.html"');
            expect(response.text).toBe(mockCertificateData.certificateHtml);

            expect(certificateService.getCertificateById).toHaveBeenCalledWith('CERT-123');
        });

        it('should return 404 if certificate not found', async () => {
            certificateService.getCertificateById.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/certificates/NONEXISTENT/download');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Certificate not found');
        });

        it('should handle service errors', async () => {
            certificateService.getCertificateById.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .get('/api/certificates/CERT-123/download');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Server error while downloading certificate');
        });
    });

    describe('POST /api/certificates/verify', () => {
        it('should verify valid certificate', async () => {
            const mockVerificationData = {
                isValid: true,
                certificateId: 'CERT-123',
                recipientName: 'John Doe',
                courseName: 'JavaScript Fundamentals',
                completionDate: new Date('2024-01-15'),
                issueDate: new Date('2024-01-15')
            };

            certificateService.verifyCertificate.mockResolvedValue(mockVerificationData);

            const response = await request(app)
                .post('/api/certificates/verify')
                .send({ verificationCode: 'VALID123' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockVerificationData);

            expect(certificateService.verifyCertificate).toHaveBeenCalledWith('VALID123');
        });

        it('should return 400 if verification code is missing', async () => {
            const response = await request(app)
                .post('/api/certificates/verify')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Verification code is required');
        });

        it('should return 404 for invalid verification code', async () => {
            certificateService.verifyCertificate.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/certificates/verify')
                .send({ verificationCode: 'INVALID123' });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid verification code');
        });

        it('should handle service errors', async () => {
            certificateService.verifyCertificate.mockRejectedValue(new Error('Service error'));

            const response = await request(app)
                .post('/api/certificates/verify')
                .send({ verificationCode: 'VALID123' });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Server error while verifying certificate');
        });
    });

    describe('GET /api/certificates/user/:userId', () => {
        beforeEach(async () => {
            // Add certificate data to user progress
            testUserProgress.certificateId = 'CERT-123';
            testUserProgress.certificateUrl = '/api/certificates/CERT-123/download';
            testUserProgress.certificateGeneratedAt = new Date();
            await testUserProgress.save();
        });

        it('should get user certificates for own account', async () => {
            const response = await request(app)
                .get(`/api/certificates/user/${testUser._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);

            const certificate = response.body.data[0];
            expect(certificate.certificateId).toBe('CERT-123');
            expect(certificate.courseName).toBe('JavaScript Fundamentals');
            expect(certificate.courseCategory).toBe('Programming');
            expect(certificate.courseDuration).toBe(40);
        });

        it('should return 403 for accessing other user certificates', async () => {
            const otherUser = new User({
                fullName: 'Jane Doe',
                email: 'jane@example.com',
                password: 'hashedpassword',
                userType: 'freelancer',
                emailVerified: true
            });
            await otherUser.save();

            const response = await request(app)
                .get(`/api/certificates/user/${otherUser._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Access denied');
        });

        it('should allow admin to access any user certificates', async () => {
            // Make user admin
            testUser.role = 'admin';
            await testUser.save();

            const otherUser = new User({
                fullName: 'Jane Doe',
                email: 'jane@example.com',
                password: 'hashedpassword',
                userType: 'freelancer',
                emailVerified: true
            });
            await otherUser.save();

            const response = await request(app)
                .get(`/api/certificates/user/${otherUser._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should return empty array for user with no certificates', async () => {
            // Remove certificate from progress
            testUserProgress.certificateId = undefined;
            testUserProgress.overallProgress = 50; // Make incomplete
            await testUserProgress.save();

            const response = await request(app)
                .get(`/api/certificates/user/${testUser._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });

        it('should return 401 if not authenticated', async () => {
            const response = await request(app)
                .get(`/api/certificates/user/${testUser._id}`);

            expect(response.status).toBe(401);
        });

        it('should handle database errors', async () => {
            // Mock UserProgress.find to throw error
            jest.spyOn(UserProgress, 'find').mockImplementationOnce(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .get(`/api/certificates/user/${testUser._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Server error while retrieving certificates');
        });
    });
});