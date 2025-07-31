const mongoose = require('mongoose');
const Mentorship = require('../../models/Mentorship');
const User = require('../../models/User');

describe('Mentorship Model', () => {
    let mentor, mentee;

    beforeEach(async () => {
        // Create test users
        mentor = new User({
            email: 'mentor@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Mentor',
            userType: 'mentor',
            isVerified: true,
            mentorProfile: {
                expertiseAreas: ['JavaScript', 'React'],
                yearsExperience: 5,
                mentoringCapacity: 3,
                sessionRate: 50,
                rating: 4.5
            }
        });
        await mentor.save();

        mentee = new User({
            email: 'mentee@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Mentee',
            userType: 'freelancer',
            isVerified: true,
            freelancerProfile: {
                skills: ['JavaScript'],
                experienceLevel: 'beginner'
            }
        });
        await mentee.save();
    });

    afterEach(async () => {
        await Mentorship.deleteMany({});
        await User.deleteMany({});
    });

    describe('Schema Validation', () => {
        test('should create a valid mentorship', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript', 'React'],
                learningGoals: 'Learn React development',
                requestMessage: 'I would like to learn React'
            });

            const savedMentorship = await mentorship.save();
            expect(savedMentorship._id).toBeDefined();
            expect(savedMentorship.status).toBe('pending');
            expect(savedMentorship.focusAreas).toEqual(['JavaScript', 'React']);
        });

        test('should require mentorId', async () => {
            const mentorship = new Mentorship({
                menteeId: mentee._id,
                focusAreas: ['JavaScript']
            });

            await expect(mentorship.save()).rejects.toThrow('Mentor ID is required');
        });

        test('should require menteeId', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                focusAreas: ['JavaScript']
            });

            await expect(mentorship.save()).rejects.toThrow('Mentee ID is required');
        });

        test('should require at least one focus area', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: []
            });

            await expect(mentorship.save()).rejects.toThrow('At least one focus area is required');
        });

        test('should validate status enum', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'invalid_status'
            });

            await expect(mentorship.save()).rejects.toThrow();
        });
    });

    describe('Static Methods', () => {
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

        test('should find pending requests for mentor', async () => {
            const requests = await Mentorship.findPendingRequestsForMentor(mentor._id);
            expect(requests).toHaveLength(1);
            expect(requests[0]._id.toString()).toBe(mentorship._id.toString());
            expect(requests[0].menteeId).toBeDefined();
        });

        test('should find active mentorships', async () => {
            // Update mentorship to active
            mentorship.status = 'active';
            await mentorship.save();

            const activeMentorships = await Mentorship.findActiveMentorships(mentor._id);
            expect(activeMentorships).toHaveLength(1);
            expect(activeMentorships[0].status).toBe('active');
        });

        test('should count active mentees for mentor', async () => {
            // Create another active mentorship
            const anotherMentee = new User({
                email: 'mentee2@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Another Mentee',
                userType: 'freelancer',
                isVerified: true
            });
            await anotherMentee.save();

            const activeMentorship1 = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'active'
            });
            await activeMentorship1.save();

            const activeMentorship2 = new Mentorship({
                mentorId: mentor._id,
                menteeId: anotherMentee._id,
                focusAreas: ['React'],
                status: 'active'
            });
            await activeMentorship2.save();

            const count = await Mentorship.countActiveMenteesForMentor(mentor._id);
            expect(count).toBe(2);
        });
    });

    describe('Instance Methods', () => {
        let mentorship;

        beforeEach(async () => {
            mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'active'
            });
            await mentorship.save();
        });

        test('should add a session', async () => {
            const sessionData = {
                scheduledDate: new Date(),
                duration: 60,
                notes: 'First session'
            };

            await mentorship.addSession(sessionData);
            
            expect(mentorship.sessions).toHaveLength(1);
            expect(mentorship.sessionCount).toBe(1);
            expect(mentorship.sessions[0].duration).toBe(60);
        });

        test('should update session status', async () => {
            // Add a session first
            const sessionData = {
                scheduledDate: new Date(),
                duration: 60
            };
            await mentorship.addSession(sessionData);

            const sessionId = mentorship.sessions[0]._id;
            await mentorship.updateSessionStatus(sessionId, 'completed', 'Great session');

            const updatedMentorship = await Mentorship.findById(mentorship._id);
            expect(updatedMentorship.sessions[0].status).toBe('completed');
            expect(updatedMentorship.sessions[0].notes).toBe('Great session');
        });

        test('should throw error when updating non-existent session', async () => {
            const fakeSessionId = new mongoose.Types.ObjectId();
            
            await expect(
                mentorship.updateSessionStatus(fakeSessionId, 'completed')
            ).rejects.toThrow('Session not found');
        });

        test('should add session feedback for mentor', async () => {
            // Add a session first
            const sessionData = {
                scheduledDate: new Date(),
                duration: 60
            };
            await mentorship.addSession(sessionData);

            const sessionId = mentorship.sessions[0]._id;
            const feedback = {
                feedback: 'Great progress!',
                rating: 5
            };

            await mentorship.addSessionFeedback(sessionId, feedback, 'mentor');

            const updatedMentorship = await Mentorship.findById(mentorship._id);
            expect(updatedMentorship.sessions[0].feedback.mentorFeedback).toBe('Great progress!');
            expect(updatedMentorship.sessions[0].feedback.mentorRating).toBe(5);
        });

        test('should add session feedback for mentee', async () => {
            // Add a session first
            const sessionData = {
                scheduledDate: new Date(),
                duration: 60
            };
            await mentorship.addSession(sessionData);

            const sessionId = mentorship.sessions[0]._id;
            const feedback = {
                feedback: 'Very helpful!',
                rating: 4
            };

            await mentorship.addSessionFeedback(sessionId, feedback, 'mentee');

            const updatedMentorship = await Mentorship.findById(mentorship._id);
            expect(updatedMentorship.sessions[0].feedback.menteeFeedback).toBe('Very helpful!');
            expect(updatedMentorship.sessions[0].feedback.menteeRating).toBe(4);
        });
    });

    describe('Virtual Properties', () => {
        test('should calculate active session count', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                sessions: [
                    {
                        scheduledDate: new Date(),
                        duration: 60,
                        status: 'scheduled'
                    },
                    {
                        scheduledDate: new Date(),
                        duration: 60,
                        status: 'completed'
                    },
                    {
                        scheduledDate: new Date(),
                        duration: 60,
                        status: 'scheduled'
                    }
                ]
            });

            expect(mentorship.activeSessionCount).toBe(2);
        });
    });

    describe('Indexes', () => {
        test('should have proper indexes', async () => {
            const indexes = await Mentorship.collection.getIndexes();
            
            // Check that required indexes exist
            const indexNames = Object.keys(indexes);
            expect(indexNames).toContain('mentorId_1_status_1');
            expect(indexNames).toContain('menteeId_1_status_1');
            expect(indexNames).toContain('status_1');
        });
    });
});