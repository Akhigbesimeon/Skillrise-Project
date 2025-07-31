const mentorshipService = require('../../services/mentorshipService');
const User = require('../../models/User');
const Mentorship = require('../../models/Mentorship');

describe('MentorshipService - Session Management', () => {
    let mentor, mentee, mentorship;

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

        // Create active mentorship
        mentorship = new Mentorship({
            mentorId: mentor._id,
            menteeId: mentee._id,
            focusAreas: ['JavaScript'],
            status: 'active',
            startDate: new Date()
        });
        await mentorship.save();
    });

    afterEach(async () => {
        await Mentorship.deleteMany({});
        await User.deleteMany({});
    });

    describe('scheduleSession', () => {
        test('should schedule session successfully', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const sessionData = {
                mentorshipId: mentorship._id,
                scheduledDate: tomorrow,
                duration: 60,
                notes: 'First session'
            };

            const result = await mentorshipService.scheduleSession(mentor._id, sessionData);

            expect(result.session).toBeDefined();
            expect(result.session.scheduledDate).toEqual(tomorrow);
            expect(result.session.duration).toBe(60);
            expect(result.session.status).toBe('scheduled');
            expect(result.mentorship.sessionCount).toBe(1);
        });

        test('should allow mentee to schedule session', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const sessionData = {
                mentorshipId: mentorship._id,
                scheduledDate: tomorrow,
                duration: 90,
                notes: 'Learning session'
            };

            const result = await mentorshipService.scheduleSession(mentee._id, sessionData);

            expect(result.session).toBeDefined();
            expect(result.session.duration).toBe(90);
        });

        test('should throw error for non-existent mentorship', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const sessionData = {
                mentorshipId: fakeId,
                scheduledDate: tomorrow,
                duration: 60
            };

            await expect(
                mentorshipService.scheduleSession(mentor._id, sessionData)
            ).rejects.toThrow('Mentorship not found');
        });

        test('should throw error for unauthorized user', async () => {
            const unauthorizedUser = new User({
                email: 'unauthorized@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Unauthorized User',
                userType: 'freelancer',
                isVerified: true
            });
            await unauthorizedUser.save();

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const sessionData = {
                mentorshipId: mentorship._id,
                scheduledDate: tomorrow,
                duration: 60
            };

            await expect(
                mentorshipService.scheduleSession(unauthorizedUser._id, sessionData)
            ).rejects.toThrow('You are not authorized to schedule sessions for this mentorship');
        });

        test('should throw error for inactive mentorship', async () => {
            mentorship.status = 'completed';
            await mentorship.save();

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const sessionData = {
                mentorshipId: mentorship._id,
                scheduledDate: tomorrow,
                duration: 60
            };

            await expect(
                mentorshipService.scheduleSession(mentor._id, sessionData)
            ).rejects.toThrow('Mentorship is not active');
        });
    });

    describe('getMentorshipSessions', () => {
        beforeEach(async () => {
            // Add some sessions
            const session1 = {
                scheduledDate: new Date(),
                duration: 60,
                status: 'completed'
            };
            const session2 = {
                scheduledDate: new Date(),
                duration: 90,
                status: 'scheduled'
            };

            await mentorship.addSession(session1);
            await mentorship.addSession(session2);
        });

        test('should get sessions for mentor', async () => {
            const result = await mentorshipService.getMentorshipSessions(mentor._id, mentorship._id);

            expect(result.mentorship).toBeDefined();
            expect(result.sessions).toHaveLength(2);
            expect(result.sessions[0].scheduledDate).toBeDefined();
        });

        test('should get sessions for mentee', async () => {
            const result = await mentorshipService.getMentorshipSessions(mentee._id, mentorship._id);

            expect(result.mentorship).toBeDefined();
            expect(result.sessions).toHaveLength(2);
        });

        test('should throw error for unauthorized user', async () => {
            const unauthorizedUser = new User({
                email: 'unauthorized@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Unauthorized User',
                userType: 'freelancer',
                isVerified: true
            });
            await unauthorizedUser.save();

            await expect(
                mentorshipService.getMentorshipSessions(unauthorizedUser._id, mentorship._id)
            ).rejects.toThrow('You are not authorized to view sessions for this mentorship');
        });
    });

    describe('updateSessionStatus', () => {
        let sessionId;

        beforeEach(async () => {
            const session = {
                scheduledDate: new Date(),
                duration: 60,
                status: 'scheduled'
            };

            await mentorship.addSession(session);
            sessionId = mentorship.sessions[0]._id;
        });

        test('should update session status successfully', async () => {
            const result = await mentorshipService.updateSessionStatus(
                mentor._id, 
                sessionId, 
                'completed', 
                'Great session!'
            );

            expect(result.session.status).toBe('completed');
            expect(result.session.notes).toBe('Great session!');
        });

        test('should allow mentee to update session status', async () => {
            const result = await mentorshipService.updateSessionStatus(
                mentee._id, 
                sessionId, 
                'cancelled'
            );

            expect(result.session.status).toBe('cancelled');
        });

        test('should throw error for non-existent session', async () => {
            const fakeSessionId = '507f1f77bcf86cd799439011';

            await expect(
                mentorshipService.updateSessionStatus(mentor._id, fakeSessionId, 'completed')
            ).rejects.toThrow('Session not found');
        });

        test('should throw error for unauthorized user', async () => {
            const unauthorizedUser = new User({
                email: 'unauthorized@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Unauthorized User',
                userType: 'freelancer',
                isVerified: true
            });
            await unauthorizedUser.save();

            await expect(
                mentorshipService.updateSessionStatus(unauthorizedUser._id, sessionId, 'completed')
            ).rejects.toThrow('You are not authorized to update this session');
        });
    });

    describe('addSessionFeedback', () => {
        let sessionId;

        beforeEach(async () => {
            const session = {
                scheduledDate: new Date(),
                duration: 60,
                status: 'completed'
            };

            await mentorship.addSession(session);
            sessionId = mentorship.sessions[0]._id;
        });

        test('should add mentor feedback successfully', async () => {
            const feedbackData = {
                feedback: 'Great progress!',
                rating: 5
            };

            const result = await mentorshipService.addSessionFeedback(
                mentor._id, 
                sessionId, 
                feedbackData
            );

            expect(result.session.feedback.mentorFeedback).toBe('Great progress!');
            expect(result.session.feedback.mentorRating).toBe(5);
        });

        test('should add mentee feedback successfully', async () => {
            const feedbackData = {
                feedback: 'Very helpful session!',
                rating: 4
            };

            const result = await mentorshipService.addSessionFeedback(
                mentee._id, 
                sessionId, 
                feedbackData
            );

            expect(result.session.feedback.menteeFeedback).toBe('Very helpful session!');
            expect(result.session.feedback.menteeRating).toBe(4);
        });

        test('should throw error for non-existent session', async () => {
            const fakeSessionId = '507f1f77bcf86cd799439011';
            const feedbackData = { feedback: 'Test feedback' };

            await expect(
                mentorshipService.addSessionFeedback(mentor._id, fakeSessionId, feedbackData)
            ).rejects.toThrow('Session not found');
        });

        test('should throw error for unauthorized user', async () => {
            const unauthorizedUser = new User({
                email: 'unauthorized@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Unauthorized User',
                userType: 'freelancer',
                isVerified: true
            });
            await unauthorizedUser.save();

            const feedbackData = { feedback: 'Test feedback' };

            await expect(
                mentorshipService.addSessionFeedback(unauthorizedUser._id, sessionId, feedbackData)
            ).rejects.toThrow('You are not authorized to add feedback to this session');
        });
    });

    describe('getUpcomingSessions', () => {
        test('should get upcoming sessions for user', async () => {
            // Add future session
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            const session = {
                scheduledDate: futureDate,
                duration: 60,
                status: 'scheduled'
            };

            await mentorship.addSession(session);

            const upcomingSessions = await mentorshipService.getUpcomingSessions(mentor._id);

            expect(upcomingSessions).toHaveLength(1);
            expect(upcomingSessions[0].status).toBe('scheduled');
            expect(new Date(upcomingSessions[0].scheduledDate)).toBeInstanceOf(Date);
        });

        test('should not include past sessions', async () => {
            // Add past session
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            const session = {
                scheduledDate: pastDate,
                duration: 60,
                status: 'scheduled'
            };

            await mentorship.addSession(session);

            const upcomingSessions = await mentorshipService.getUpcomingSessions(mentor._id);

            expect(upcomingSessions).toHaveLength(0);
        });
    });

    describe('getSessionHistory', () => {
        test('should get session history for user', async () => {
            // Add sessions
            const session1 = {
                scheduledDate: new Date(),
                duration: 60,
                status: 'completed'
            };
            const session2 = {
                scheduledDate: new Date(),
                duration: 90,
                status: 'cancelled'
            };

            await mentorship.addSession(session1);
            await mentorship.addSession(session2);

            const sessionHistory = await mentorshipService.getSessionHistory(mentor._id);

            expect(sessionHistory).toHaveLength(2);
            expect(sessionHistory[0].scheduledDate).toBeDefined();
            expect(sessionHistory[0].status).toBeDefined();
        });

        test('should sort sessions by date (most recent first)', async () => {
            // Add sessions with different dates
            const olderDate = new Date();
            olderDate.setDate(olderDate.getDate() - 2);

            const newerDate = new Date();
            newerDate.setDate(newerDate.getDate() - 1);

            const session1 = {
                scheduledDate: olderDate,
                duration: 60,
                status: 'completed'
            };
            const session2 = {
                scheduledDate: newerDate,
                duration: 90,
                status: 'completed'
            };

            await mentorship.addSession(session1);
            await mentorship.addSession(session2);

            const sessionHistory = await mentorshipService.getSessionHistory(mentor._id);

            expect(sessionHistory).toHaveLength(2);
            expect(new Date(sessionHistory[0].scheduledDate).getTime())
                .toBeGreaterThan(new Date(sessionHistory[1].scheduledDate).getTime());
        });
    });
});