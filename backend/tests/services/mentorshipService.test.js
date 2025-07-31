const mentorshipService = require('../../services/mentorshipService');
const User = require('../../models/User');
const Mentorship = require('../../models/Mentorship');

describe('MentorshipService', () => {
    let mentor1, mentor2, mentee;

    beforeEach(async () => {
        // Create test mentors
        mentor1 = new User({
            email: 'mentor1@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'JavaScript Mentor',
            userType: 'mentor',
            isVerified: true,
            isActive: true,
            bio: 'Experienced JavaScript developer',
            mentorProfile: {
                expertiseAreas: ['JavaScript', 'React', 'Node.js'],
                yearsExperience: 5,
                mentoringCapacity: 3,
                sessionRate: 50,
                rating: 4.5,
                totalMentees: 10
            }
        });
        await mentor1.save();

        mentor2 = new User({
            email: 'mentor2@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Python Mentor',
            userType: 'mentor',
            isVerified: true,
            isActive: true,
            bio: 'Python and data science expert',
            mentorProfile: {
                expertiseAreas: ['Python', 'Django', 'Data Science'],
                yearsExperience: 8,
                mentoringCapacity: 2,
                sessionRate: 75,
                rating: 4.8,
                totalMentees: 15
            }
        });
        await mentor2.save();

        // Create test mentee
        mentee = new User({
            email: 'mentee@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Mentee',
            userType: 'freelancer',
            isVerified: true,
            isActive: true,
            freelancerProfile: {
                skills: ['JavaScript', 'HTML', 'CSS'],
                experienceLevel: 'beginner'
            }
        });
        await mentee.save();
    });

    afterEach(async () => {
        await Mentorship.deleteMany({});
        await User.deleteMany({});
    });

    describe('findPotentialMentors', () => {
        test('should find mentors matching skills', async () => {
            const menteeData = {
                skills: ['JavaScript', 'React'],
                experienceLevel: 'beginner',
                focusAreas: ['JavaScript', 'React']
            };

            const matches = await mentorshipService.findPotentialMentors(menteeData);

            expect(matches).toHaveLength(1);
            expect(matches[0].mentor._id.toString()).toBe(mentor1._id.toString());
            expect(matches[0].matchScore).toBeGreaterThan(0);
        });

        test('should exclude mentors at capacity', async () => {
            // Create mentorships to fill mentor1 capacity
            for (let i = 0; i < 3; i++) {
                const tempMentee = new User({
                    email: `temp${i}@test.com`,
                    passwordHash: 'hashedpassword',
                    fullName: `Temp Mentee ${i}`,
                    userType: 'freelancer',
                    isVerified: true
                });
                await tempMentee.save();

                const mentorship = new Mentorship({
                    mentorId: mentor1._id,
                    menteeId: tempMentee._id,
                    focusAreas: ['JavaScript'],
                    status: 'active'
                });
                await mentorship.save();
            }

            const menteeData = {
                skills: ['JavaScript'],
                experienceLevel: 'beginner',
                focusAreas: ['JavaScript']
            };

            const matches = await mentorshipService.findPotentialMentors(menteeData);

            // Should not include mentor1 as they're at capacity
            const mentorIds = matches.map(match => match.mentor._id.toString());
            expect(mentorIds).not.toContain(mentor1._id.toString());
        });

        test('should sort by match score and rating', async () => {
            // Create another mentor with lower rating but similar skills
            const mentor3 = new User({
                email: 'mentor3@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Another JS Mentor',
                userType: 'mentor',
                isVerified: true,
                isActive: true,
                mentorProfile: {
                    expertiseAreas: ['JavaScript', 'Vue.js'],
                    yearsExperience: 3,
                    mentoringCapacity: 5,
                    sessionRate: 40,
                    rating: 3.5,
                    totalMentees: 5
                }
            });
            await mentor3.save();

            const menteeData = {
                skills: ['JavaScript'],
                experienceLevel: 'beginner',
                focusAreas: ['JavaScript']
            };

            const matches = await mentorshipService.findPotentialMentors(menteeData);

            expect(matches.length).toBeGreaterThan(1);
            // First match should have higher score or rating
            expect(matches[0].matchScore).toBeGreaterThanOrEqual(matches[1].matchScore);
        });

        test('should return empty array when no mentors match', async () => {
            const menteeData = {
                skills: ['Rust', 'Go'],
                experienceLevel: 'advanced',
                focusAreas: ['Rust', 'Go']
            };

            const matches = await mentorshipService.findPotentialMentors(menteeData);

            expect(matches).toHaveLength(0);
        });
    });

    describe('calculateMatchScore', () => {
        test('should calculate skill match correctly', () => {
            const mentorSkills = ['JavaScript', 'React', 'Node.js'];
            const menteeSkills = ['JavaScript', 'HTML'];

            const score = mentorshipService.calculateSkillMatch(mentorSkills, menteeSkills);

            expect(score).toBe(50); // 1 exact match out of 2 skills = 50%
        });

        test('should handle partial skill matches', () => {
            const mentorSkills = ['JavaScript Development', 'React Framework'];
            const menteeSkills = ['JavaScript', 'React'];

            const score = mentorshipService.calculateSkillMatch(mentorSkills, menteeSkills);

            expect(score).toBeGreaterThan(0);
        });

        test('should return 0 for no skill matches', () => {
            const mentorSkills = ['Python', 'Django'];
            const menteeSkills = ['JavaScript', 'React'];

            const score = mentorshipService.calculateSkillMatch(mentorSkills, menteeSkills);

            expect(score).toBe(0);
        });

        test('should calculate experience match correctly', () => {
            // Mentor with 5 years experience should be good for beginner
            const score1 = mentorshipService.calculateExperienceMatch(5, 'beginner');
            expect(score1).toBe(100);

            // Mentor with 1 year experience for intermediate mentee
            const score2 = mentorshipService.calculateExperienceMatch(1, 'intermediate');
            expect(score2).toBe(20);

            // Mentor with 10 years for advanced mentee
            const score3 = mentorshipService.calculateExperienceMatch(10, 'advanced');
            expect(score3).toBe(100);
        });
    });

    describe('createMentorshipRequest', () => {
        test('should create mentorship request successfully', async () => {
            const requestData = {
                focusAreas: ['JavaScript', 'React'],
                learningGoals: 'Learn React development',
                requestMessage: 'I would like to learn React'
            };

            const mentorship = await mentorshipService.createMentorshipRequest(
                mentee._id,
                mentor1._id,
                requestData
            );

            expect(mentorship._id).toBeDefined();
            expect(mentorship.status).toBe('pending');
            expect(mentorship.focusAreas).toEqual(['JavaScript', 'React']);
            expect(mentorship.mentorId._id.toString()).toBe(mentor1._id.toString());
            expect(mentorship.menteeId._id.toString()).toBe(mentee._id.toString());
        });

        test('should throw error for non-existent mentor', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const requestData = {
                focusAreas: ['JavaScript'],
                learningGoals: 'Learn JavaScript',
                requestMessage: 'Please help me'
            };

            await expect(
                mentorshipService.createMentorshipRequest(mentee._id, fakeId, requestData)
            ).rejects.toThrow('Mentor not found or not available');
        });

        test('should throw error when mentor is at capacity', async () => {
            // Fill mentor capacity
            for (let i = 0; i < 3; i++) {
                const tempMentee = new User({
                    email: `temp${i}@test.com`,
                    passwordHash: 'hashedpassword',
                    fullName: `Temp Mentee ${i}`,
                    userType: 'freelancer',
                    isVerified: true
                });
                await tempMentee.save();

                const mentorship = new Mentorship({
                    mentorId: mentor1._id,
                    menteeId: tempMentee._id,
                    focusAreas: ['JavaScript'],
                    status: 'active'
                });
                await mentorship.save();
            }

            const requestData = {
                focusAreas: ['JavaScript'],
                learningGoals: 'Learn JavaScript',
                requestMessage: 'Please help me'
            };

            await expect(
                mentorshipService.createMentorshipRequest(mentee._id, mentor1._id, requestData)
            ).rejects.toThrow('Mentor has reached maximum capacity');
        });

        test('should throw error for duplicate request', async () => {
            // Create first request
            const requestData = {
                focusAreas: ['JavaScript'],
                learningGoals: 'Learn JavaScript',
                requestMessage: 'Please help me'
            };

            await mentorshipService.createMentorshipRequest(
                mentee._id,
                mentor1._id,
                requestData
            );

            // Try to create duplicate request
            await expect(
                mentorshipService.createMentorshipRequest(mentee._id, mentor1._id, requestData)
            ).rejects.toThrow('A mentorship request already exists between these users');
        });
    });

    describe('acceptMentorshipRequest', () => {
        let mentorship;

        beforeEach(async () => {
            mentorship = new Mentorship({
                mentorId: mentor1._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'pending'
            });
            await mentorship.save();
        });

        test('should accept mentorship request successfully', async () => {
            const acceptedMentorship = await mentorshipService.acceptMentorshipRequest(
                mentorship._id,
                mentor1._id
            );

            expect(acceptedMentorship.status).toBe('active');
            expect(acceptedMentorship.startDate).toBeDefined();
            expect(acceptedMentorship.respondedAt).toBeDefined();

            // Check that mentor's total mentees count increased
            const updatedMentor = await User.findById(mentor1._id);
            expect(updatedMentor.mentorProfile.totalMentees).toBe(11);
        });

        test('should throw error for non-existent mentorship', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            await expect(
                mentorshipService.acceptMentorshipRequest(fakeId, mentor1._id)
            ).rejects.toThrow('Mentorship request not found');
        });

        test('should throw error for unauthorized mentor', async () => {
            await expect(
                mentorshipService.acceptMentorshipRequest(mentorship._id, mentor2._id)
            ).rejects.toThrow('Unauthorized: You can only accept your own mentorship requests');
        });

        test('should throw error for non-pending request', async () => {
            mentorship.status = 'active';
            await mentorship.save();

            await expect(
                mentorshipService.acceptMentorshipRequest(mentorship._id, mentor1._id)
            ).rejects.toThrow('Mentorship request is not pending');
        });
    });

    describe('declineMentorshipRequest', () => {
        let mentorship;

        beforeEach(async () => {
            mentorship = new Mentorship({
                mentorId: mentor1._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'pending'
            });
            await mentorship.save();
        });

        test('should decline mentorship request successfully', async () => {
            const declinedMentorship = await mentorshipService.declineMentorshipRequest(
                mentorship._id,
                mentor1._id
            );

            expect(declinedMentorship.status).toBe('cancelled');
            expect(declinedMentorship.respondedAt).toBeDefined();
        });

        test('should throw error for unauthorized mentor', async () => {
            await expect(
                mentorshipService.declineMentorshipRequest(mentorship._id, mentor2._id)
            ).rejects.toThrow('Unauthorized: You can only decline your own mentorship requests');
        });
    });

    describe('getMentorshipRequestsForMentor', () => {
        test('should get pending requests for mentor', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor1._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'pending'
            });
            await mentorship.save();

            const requests = await mentorshipService.getMentorshipRequestsForMentor(mentor1._id);

            expect(requests).toHaveLength(1);
            expect(requests[0]._id.toString()).toBe(mentorship._id.toString());
        });
    });

    describe('getActiveMentorships', () => {
        test('should get active mentorships for user', async () => {
            const mentorship = new Mentorship({
                mentorId: mentor1._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'active'
            });
            await mentorship.save();

            const activeMentorships = await mentorshipService.getActiveMentorships(mentor1._id);

            expect(activeMentorships).toHaveLength(1);
            expect(activeMentorships[0].status).toBe('active');
        });
    });

    describe('getMentorshipHistory', () => {
        test('should get mentorship history for user', async () => {
            const mentorship1 = new Mentorship({
                mentorId: mentor1._id,
                menteeId: mentee._id,
                focusAreas: ['JavaScript'],
                status: 'active'
            });
            await mentorship1.save();

            const mentorship2 = new Mentorship({
                mentorId: mentor1._id,
                menteeId: mentee._id,
                focusAreas: ['React'],
                status: 'completed'
            });
            await mentorship2.save();

            const history = await mentorshipService.getMentorshipHistory(mentor1._id);

            expect(history).toHaveLength(2);
            expect(history[0].createdAt.getTime()).toBeGreaterThanOrEqual(history[1].createdAt.getTime());
        });
    });
});