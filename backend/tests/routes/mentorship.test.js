const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Mentorship = require('../../models/Mentorship');
const jwt = require('jsonwebtoken');

describe('Mentorship Routes', () => {
    let mentor, mentee, mentorToken, menteeToken;

    beforeEach(async () => {
        // Create test mentor
        mentor = new User({
            email: 'mentor@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Mentor',
            userType: 'mentor',
            isVerified: true,
            isActive: true,
            mentorProfile: {
                expertiseAreas: ['JavaScript', 'React'],
                yearsExperience: 5,
                mentoringCapacity: 3,
                sessionRate: 50,
                rating: 4.5,
                totalMentees: 10
            }
        });
        await mentor.save();

        // Create test mentee
        mentee = new User({
            email: 'mentee@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Mentee',
            userType: 'freelancer',
            isVerified: true,
            isActive: true,
            freelancerProfile: {
                skills: ['JavaScript', 'HTML'],
                experienceLevel: 'beginner'
            }
        });
        await mentee.save();

        // Generate tokens
        mentorToken = jwt.sign(
            { id: mentor._id, userType: mentor.userType },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );

        menteeToken = jwt.sign(
            { id: mentee._id, userType: mentee.userType },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );
    });

    afterEach(async () => {
        await Mentorship.deleteMany({});
        await User.deleteMany({});
    });

    describe('POST /api/mentorship/request', () => {
        test('should create mentorship request successfully', async () => {
            const requestData = {
                mentorId: mentor._id,
                focusAreas: ['JavaScript', 'React'],
                learningGoals: 'Learn React development',
                requestMessage: 'I would like to learn React'
            };

            const response = await request(app)
                .post('/api/mentorship/request')
                .set('Authorization', `Bearer ${menteeToken}`)
                .send(requestData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('pending');
            expect(response.body.data.focusAreas).toEqual(['JavaScript', 'React']);
        });

        test('should require authentication', async () => {
            const requestData = {
                mentorId: mentor._id,
                focusAreas: ['JavaScript']
            };

            const response = await request(app)
                .post('/api/mentorship/request')
                .send(requestData);

            expect(response.status).toBe(401);
        });

        test('should require freelancer user type', async () => {
            const requestData = {
                mentorId: mentor._id,
                focusAreas: ['JavaScript']
            };

            const response = await request(app)
                .post('/api/mentorship/request')
                .set('Authorization', `Bearer ${mentorToken}`)
                .send(requestData);

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/mentorship/request')
                .set('Authorization', `Bearer ${menteeToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        test('should handle non-existent mentor', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const requestData = {
                mentorId: fakeId,
                focusAreas: ['JavaScript']
            };

            const response = await request(app)
                .post('/api/mentorship/request')
                .set('Authorization', `Bearer ${menteeToken}`)
                .send(requestData);

            expect(response.status).toBe(404);
            expect(response.body.error.code).toBe('NOT_FOUND');
        });
    });

    describe('GET /api/mentorship/matches', () => {
        test('should find mentor matches successfully', async () => {
            const response = await request(app)
                .get('/api/mentorship/matches')
                .set('Authorization', `Bearer ${menteeToken}`)
                .query({ focusAreas: 'JavaScript,React' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('should require freelancer user type', async () => {
            const response = await request(app)
                .get('/api/mentorship/matches')
                .set('Authorization', `Bearer ${mentorToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        test('should require authentication', async () => {
            const response = await request(app)
                .get('/api/mentorship/matches');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/mentorship/accept', () => {
        let mentorship;

        beforeEach(async () => {
            mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'pending'
            });
            await mentorship.save();
        });

        test('should accept mentorship request successfully', async () => {
            const response = await request(app)
                .post('/api/mentorship/accept')
                .set('Authorization', `Bearer ${mentorToken}`)
                .send({ mentorshipId: mentorship._id });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('active');
        });

        test('should require mentor user type', async () => {
            const response = await request(app)
                .post('/api/mentorship/accept')
                .set('Authorization', `Bearer ${menteeToken}`)
                .send({ mentorshipId: mentorship._id });

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        test('should validate mentorship ownership', async () => {
            // Create another mentor
            const anotherMentor = new User({
                email: 'another@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Another Mentor',
                userType: 'mentor',
                isVerified: true
            });
            await anotherMentor.save();

            const anotherToken = jwt.sign(
                { id: anotherMentor._id, userType: 'mentor' },
                process.env.JWT_SECRET || 'test_secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .post('/api/mentorship/accept')
                .set('Authorization', `Bearer ${anotherToken}`)
                .send({ mentorshipId: mentorship._id });

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        test('should require valid mentorship ID', async () => {
            const response = await request(app)
                .post('/api/mentorship/accept')
                .set('Authorization', `Bearer ${mentorToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('POST /api/mentorship/decline', () => {
        let mentorship;

        beforeEach(async () => {
            mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'pending'
            });
            await mentorship.save();
        });

        test('should decline mentorship request successfully', async () => {
            const response = await request(app)
                .post('/api/mentorship/decline')
                .set('Authorization', `Bearer ${mentorToken}`)
                .send({ mentorshipId: mentorship._id });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('cancelled');
        });

        test('should require mentor user type', async () => {
            const response = await request(app)
                .post('/api/mentorship/decline')
                .set('Authorization', `Bearer ${menteeToken}`)
                .send({ mentorshipId: mentorship._id });

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });
    });

    describe('GET /api/mentorship/requests', () => {
        test('should get mentorship requests for mentor', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'pending'
            });
            await mentorship.save();

            const response = await request(app)
                .get('/api/mentorship/requests')
                .set('Authorization', `Bearer ${mentorToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        test('should require mentor user type', async () => {
            const response = await request(app)
                .get('/api/mentorship/requests')
                .set('Authorization', `Bearer ${menteeToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error.code).toBe('FORBIDDEN');
        });
    });

    describe('GET /api/mentorship/active', () => {
        test('should get active mentorships', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'active'
            });
            await mentorship.save();

            const response = await request(app)
                .get('/api/mentorship/active')
                .set('Authorization', `Bearer ${mentorToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        test('should work for both mentors and mentees', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'active'
            });
            await mentorship.save();

            // Test mentor view
            const mentorResponse = await request(app)
                .get('/api/mentorship/active')
                .set('Authorization', `Bearer ${mentorToken}`);

            expect(mentorResponse.status).toBe(200);
            expect(mentorResponse.body.data).toHaveLength(1);

            // Test mentee view
            const menteeResponse = await request(app)
                .get('/api/mentorship/active')
                .set('Authorization', `Bearer ${menteeToken}`);

            expect(menteeResponse.status).toBe(200);
            expect(menteeResponse.body.data).toHaveLength(1);
        });
    });

    describe('GET /api/mentorship/history', () => {
        test('should get mentorship history', async () => {
            const mentorship1 = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'active'
            });
            await mentorship1.save();

            const mentorship2 = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['React'],
                status: 'completed'
            });
            await mentorship2.save();

            const response = await request(app)
                .get('/api/mentorship/history')
                .set('Authorization', `Bearer ${mentorToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        test('should require authentication', async () => {
            const response = await request(app)
                .get('/api/mentorship/history');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/mentorship/schedule', () => {
        test('should return not implemented', async () => {
            const response = await request(app)
                .post('/api/mentorship/schedule')
                .set('Authorization', `Bearer ${mentorToken}`)
                .send({});

            expect(response.status).toBe(501);
            expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
        });
    });
});