const User = require('../models/User');
const Mentorship = require('../models/Mentorship');

class MentorshipService {
    /**
     * Find potential mentors for a mentee based on skills and availability
     * @param {Object} menteeData - The mentee's data including skills and goals
     * @returns {Array} Array of potential mentors with match scores
     */
    async findPotentialMentors(menteeData) {
        const { skills, experienceLevel, focusAreas } = menteeData;
        
        // Find all active mentors
        const mentors = await User.find({
            userType: 'mentor',
            isActive: true,
            isVerified: true
        }).select('fullName email mentorProfile bio location');

        const potentialMatches = [];

        for (const mentor of mentors) {
            // Check if mentor has capacity
            const activeMenteeCount = await Mentorship.countActiveMenteesForMentor(mentor._id);
            if (activeMenteeCount >= mentor.mentorProfile.mentoringCapacity) {
                continue; // Skip if mentor is at capacity
            }

            // Calculate match score
            const matchScore = this.calculateMatchScore(mentor, {
                skills,
                experienceLevel,
                focusAreas
            });

            if (matchScore > 0) {
                potentialMatches.push({
                    mentor,
                    matchScore,
                    availableCapacity: mentor.mentorProfile.mentoringCapacity - activeMenteeCount,
                    rating: mentor.mentorProfile.rating,
                    totalMentees: mentor.mentorProfile.totalMentees
                });
            }
        }

        // Sort by match score (descending), then by rating (descending)
        potentialMatches.sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }
            return b.rating - a.rating;
        });

        return potentialMatches.slice(0, 10); // Return top 10 matches
    }

    /**
     * Calculate match score between mentor and mentee
     * @param {Object} mentor - Mentor user object
     * @param {Object} menteeData - Mentee's skills and preferences
     * @returns {number} Match score (0-100)
     */
    calculateMatchScore(mentor, menteeData) {
        let score = 0;
        const { skills, experienceLevel, focusAreas } = menteeData;
        const mentorProfile = mentor.mentorProfile;

        // Skill matching (40% of score)
        const skillScore = this.calculateSkillMatch(mentorProfile.expertiseAreas, skills);
        score += skillScore * 0.4;

        // Focus area matching (30% of score)
        const focusScore = this.calculateFocusAreaMatch(mentorProfile.expertiseAreas, focusAreas);
        score += focusScore * 0.3;

        // Experience level compatibility (20% of score)
        const experienceScore = this.calculateExperienceMatch(mentorProfile.yearsExperience, experienceLevel);
        score += experienceScore * 0.2;

        // Mentor rating bonus (10% of score)
        const ratingScore = (mentorProfile.rating / 5) * 100;
        score += ratingScore * 0.1;

        return Math.round(score);
    }

    /**
     * Calculate skill match percentage
     * @param {Array} mentorSkills - Mentor's expertise areas
     * @param {Array} menteeSkills - Mentee's skills/interests
     * @returns {number} Match percentage (0-100)
     */
    calculateSkillMatch(mentorSkills, menteeSkills) {
        if (!mentorSkills || !menteeSkills || mentorSkills.length === 0 || menteeSkills.length === 0) {
            return 0;
        }

        const mentorSkillsLower = mentorSkills.map(skill => skill.toLowerCase());
        const menteeSkillsLower = menteeSkills.map(skill => skill.toLowerCase());

        let matches = 0;
        for (const menteeSkill of menteeSkillsLower) {
            for (const mentorSkill of mentorSkillsLower) {
                // Exact match
                if (menteeSkill === mentorSkill) {
                    matches += 1;
                    break;
                }
                // Partial match (contains)
                if (mentorSkill.includes(menteeSkill) || menteeSkill.includes(mentorSkill)) {
                    matches += 0.5;
                    break;
                }
            }
        }

        return Math.min(100, (matches / menteeSkills.length) * 100);
    }

    /**
     * Calculate focus area match percentage
     * @param {Array} mentorExpertise - Mentor's expertise areas
     * @param {Array} focusAreas - Mentee's focus areas
     * @returns {number} Match percentage (0-100)
     */
    calculateFocusAreaMatch(mentorExpertise, focusAreas) {
        if (!mentorExpertise || !focusAreas || mentorExpertise.length === 0 || focusAreas.length === 0) {
            return 0;
        }

        return this.calculateSkillMatch(mentorExpertise, focusAreas);
    }

    /**
     * Calculate experience level compatibility
     * @param {number} mentorYears - Mentor's years of experience
     * @param {string} menteeLevel - Mentee's experience level
     * @returns {number} Compatibility score (0-100)
     */
    calculateExperienceMatch(mentorYears, menteeLevel) {
        const levelMap = {
            'beginner': { min: 0, max: 2 },
            'intermediate': { min: 2, max: 5 },
            'advanced': { min: 5, max: Infinity }
        };

        const menteeRange = levelMap[menteeLevel];
        if (!menteeRange) return 50; // Default score if level is unknown

        // Ideal mentor should have at least 2 years more experience than mentee's level
        const idealMinYears = menteeRange.max + 2;
        
        if (mentorYears >= idealMinYears) {
            return 100;
        } else if (mentorYears >= menteeRange.max) {
            return 80;
        } else if (mentorYears >= menteeRange.min) {
            return 60;
        } else {
            return 20; // Mentor has less experience than mentee
        }
    }

    /**
     * Create a mentorship request
     * @param {string} menteeId - ID of the mentee
     * @param {string} mentorId - ID of the mentor
     * @param {Object} requestData - Request details
     * @returns {Object} Created mentorship request
     */
    async createMentorshipRequest(menteeId, mentorId, requestData) {
        const { focusAreas, learningGoals, requestMessage } = requestData;

        // Validate that mentor exists and is available
        const mentor = await User.findById(mentorId);
        if (!mentor || mentor.userType !== 'mentor' || !mentor.isActive) {
            throw new Error('Mentor not found or not available');
        }

        // Check mentor capacity
        const activeMenteeCount = await Mentorship.countActiveMenteesForMentor(mentorId);
        if (activeMenteeCount >= mentor.mentorProfile.mentoringCapacity) {
            throw new Error('Mentor has reached maximum capacity');
        }

        // Check if there's already a pending or active mentorship between these users
        const existingMentorship = await Mentorship.findOne({
            mentorId,
            menteeId,
            status: { $in: ['pending', 'active'] }
        });

        if (existingMentorship) {
            throw new Error('A mentorship request already exists between these users');
        }

        // Create the mentorship request
        const mentorship = new Mentorship({
            mentorId,
            menteeId,
            focusAreas,
            learningGoals,
            requestMessage,
            status: 'pending'
        });

        await mentorship.save();
        
        // Populate mentor and mentee details
        await mentorship.populate('mentorId', 'fullName email mentorProfile.expertiseAreas');
        await mentorship.populate('menteeId', 'fullName email freelancerProfile.skills freelancerProfile.experienceLevel');

        return mentorship;
    }

    /**
     * Accept a mentorship request
     * @param {string} mentorshipId - ID of the mentorship request
     * @param {string} mentorId - ID of the mentor accepting
     * @returns {Object} Updated mentorship
     */
    async acceptMentorshipRequest(mentorshipId, mentorId) {
        const mentorship = await Mentorship.findById(mentorshipId);
        
        if (!mentorship) {
            throw new Error('Mentorship request not found');
        }

        if (mentorship.mentorId.toString() !== mentorId) {
            throw new Error('Unauthorized: You can only accept your own mentorship requests');
        }

        if (mentorship.status !== 'pending') {
            throw new Error('Mentorship request is not pending');
        }

        // Check mentor capacity again
        const activeMenteeCount = await Mentorship.countActiveMenteesForMentor(mentorId);
        const mentor = await User.findById(mentorId);
        
        if (activeMenteeCount >= mentor.mentorProfile.mentoringCapacity) {
            throw new Error('Mentor has reached maximum capacity');
        }

        // Accept the mentorship
        mentorship.status = 'active';
        mentorship.startDate = new Date();
        mentorship.respondedAt = new Date();

        await mentorship.save();

        // Update mentor's total mentees count
        mentor.mentorProfile.totalMentees += 1;
        await mentor.save();

        // Populate details for response
        await mentorship.populate('mentorId', 'fullName email mentorProfile.expertiseAreas');
        await mentorship.populate('menteeId', 'fullName email freelancerProfile.skills freelancerProfile.experienceLevel');

        return mentorship;
    }

    /**
     * Decline a mentorship request
     * @param {string} mentorshipId - ID of the mentorship request
     * @param {string} mentorId - ID of the mentor declining
     * @returns {Object} Updated mentorship
     */
    async declineMentorshipRequest(mentorshipId, mentorId) {
        const mentorship = await Mentorship.findById(mentorshipId);
        
        if (!mentorship) {
            throw new Error('Mentorship request not found');
        }

        if (mentorship.mentorId.toString() !== mentorId) {
            throw new Error('Unauthorized: You can only decline your own mentorship requests');
        }

        if (mentorship.status !== 'pending') {
            throw new Error('Mentorship request is not pending');
        }

        // Decline the mentorship
        mentorship.status = 'cancelled';
        mentorship.respondedAt = new Date();

        await mentorship.save();

        return mentorship;
    }

    /**
     * Get mentorship requests for a mentor
     * @param {string} mentorId - ID of the mentor
     * @returns {Array} Array of mentorship requests
     */
    async getMentorshipRequestsForMentor(mentorId) {
        return await Mentorship.findPendingRequestsForMentor(mentorId);
    }

    /**
     * Get active mentorships for a user
     * @param {string} userId - ID of the user
     * @returns {Array} Array of active mentorships
     */
    async getActiveMentorships(userId) {
        return await Mentorship.findActiveMentorships(userId);
    }

    /**
     * Get mentorship history for a user
     * @param {string} userId - ID of the user
     * @returns {Array} Array of mentorships
     */
    async getMentorshipHistory(userId) {
        return await Mentorship.find({
            $or: [
                { mentorId: userId },
                { menteeId: userId }
            ]
        })
        .populate('mentorId', 'fullName email mentorProfile.expertiseAreas')
        .populate('menteeId', 'fullName email freelancerProfile.skills freelancerProfile.experienceLevel')
        .sort({ createdAt: -1 });
    }

    /**
     * Schedule a mentorship session
     * @param {string} userId - ID of the user scheduling (mentor or mentee)
     * @param {Object} sessionData - Session details
     * @returns {Object} Updated mentorship with new session
     */
    async scheduleSession(userId, sessionData) {
        const { mentorshipId, scheduledDate, duration, notes } = sessionData;

        // Find the mentorship and verify user is part of it
        const mentorship = await Mentorship.findById(mentorshipId);
        if (!mentorship) {
            throw new Error('Mentorship not found');
        }

        // Check if user is authorized (mentor or mentee)
        const isMentor = mentorship.mentorId.toString() === userId;
        const isMentee = mentorship.menteeId.toString() === userId;
        
        if (!isMentor && !isMentee) {
            throw new Error('You are not authorized to schedule sessions for this mentorship');
        }

        // Check if mentorship is active
        if (mentorship.status !== 'active') {
            throw new Error('Mentorship is not active');
        }

        // Create session data
        const sessionInfo = {
            scheduledDate,
            duration: duration || 60,
            status: 'scheduled',
            notes: notes || ''
        };

        // Add session to mentorship
        await mentorship.addSession(sessionInfo);

        // Populate details for response
        await mentorship.populate('mentorId', 'fullName email');
        await mentorship.populate('menteeId', 'fullName email');

        return {
            mentorship,
            session: mentorship.sessions[mentorship.sessions.length - 1] // Return the newly added session
        };
    }

    /**
     * Get sessions for a mentorship
     * @param {string} userId - ID of the user requesting
     * @param {string} mentorshipId - ID of the mentorship
     * @returns {Array} Array of sessions
     */
    async getMentorshipSessions(userId, mentorshipId) {
        // Find the mentorship and verify user is part of it
        const mentorship = await Mentorship.findById(mentorshipId);
        if (!mentorship) {
            throw new Error('Mentorship not found');
        }

        // Check if user is authorized (mentor or mentee)
        const isMentor = mentorship.mentorId.toString() === userId;
        const isMentee = mentorship.menteeId.toString() === userId;
        
        if (!isMentor && !isMentee) {
            throw new Error('You are not authorized to view sessions for this mentorship');
        }

        // Populate mentor and mentee details
        await mentorship.populate('mentorId', 'fullName email');
        await mentorship.populate('menteeId', 'fullName email');

        return {
            mentorship: {
                _id: mentorship._id,
                mentorId: mentorship.mentorId,
                menteeId: mentorship.menteeId,
                focusAreas: mentorship.focusAreas,
                status: mentorship.status
            },
            sessions: mentorship.sessions.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))
        };
    }

    /**
     * Update session status
     * @param {string} userId - ID of the user updating
     * @param {string} sessionId - ID of the session
     * @param {string} status - New status
     * @param {string} notes - Optional notes
     * @returns {Object} Updated session
     */
    async updateSessionStatus(userId, sessionId, status, notes = '') {
        // Find mentorship containing the session
        const mentorship = await Mentorship.findOne({
            'sessions._id': sessionId
        });

        if (!mentorship) {
            throw new Error('Session not found');
        }

        // Check if user is authorized (mentor or mentee)
        const isMentor = mentorship.mentorId.toString() === userId;
        const isMentee = mentorship.menteeId.toString() === userId;
        
        if (!isMentor && !isMentee) {
            throw new Error('You are not authorized to update this session');
        }

        // Update session status
        await mentorship.updateSessionStatus(sessionId, status, notes);

        // Get updated mentorship
        const updatedMentorship = await Mentorship.findById(mentorship._id)
            .populate('mentorId', 'fullName email')
            .populate('menteeId', 'fullName email');

        const session = updatedMentorship.sessions.id(sessionId);
        
        return {
            mentorship: {
                _id: updatedMentorship._id,
                mentorId: updatedMentorship.mentorId,
                menteeId: updatedMentorship.menteeId,
                focusAreas: updatedMentorship.focusAreas,
                status: updatedMentorship.status
            },
            session
        };
    }

    /**
     * Add feedback to a session
     * @param {string} userId - ID of the user adding feedback
     * @param {string} sessionId - ID of the session
     * @param {Object} feedbackData - Feedback details
     * @returns {Object} Updated session
     */
    async addSessionFeedback(userId, sessionId, feedbackData) {
        // Find mentorship containing the session
        const mentorship = await Mentorship.findOne({
            'sessions._id': sessionId
        });

        if (!mentorship) {
            throw new Error('Session not found');
        }

        // Check if user is authorized and determine user type
        const isMentor = mentorship.mentorId.toString() === userId;
        const isMentee = mentorship.menteeId.toString() === userId;
        
        if (!isMentor && !isMentee) {
            throw new Error('You are not authorized to add feedback to this session');
        }

        // Determine user type for feedback
        const userType = isMentor ? 'mentor' : 'mentee';

        // Add feedback
        await mentorship.addSessionFeedback(sessionId, feedbackData, userType);

        // Get updated mentorship
        const updatedMentorship = await Mentorship.findById(mentorship._id)
            .populate('mentorId', 'fullName email')
            .populate('menteeId', 'fullName email');

        const session = updatedMentorship.sessions.id(sessionId);
        
        return {
            mentorship: {
                _id: updatedMentorship._id,
                mentorId: updatedMentorship.mentorId,
                menteeId: updatedMentorship.menteeId,
                focusAreas: updatedMentorship.focusAreas,
                status: updatedMentorship.status
            },
            session
        };
    }

    /**
     * Get upcoming sessions for a user
     * @param {string} userId - ID of the user
     * @returns {Array} Array of upcoming sessions
     */
    async getUpcomingSessions(userId) {
        const now = new Date();
        
        const mentorships = await Mentorship.find({
            $or: [
                { mentorId: userId },
                { menteeId: userId }
            ],
            status: 'active',
            'sessions.scheduledDate': { $gte: now },
            'sessions.status': 'scheduled'
        })
        .populate('mentorId', 'fullName email')
        .populate('menteeId', 'fullName email');

        const upcomingSessions = [];

        for (const mentorship of mentorships) {
            const sessions = mentorship.sessions.filter(session => 
                session.scheduledDate >= now && session.status === 'scheduled'
            );

            for (const session of sessions) {
                upcomingSessions.push({
                    sessionId: session._id,
                    mentorshipId: mentorship._id,
                    mentorId: mentorship.mentorId,
                    menteeId: mentorship.menteeId,
                    focusAreas: mentorship.focusAreas,
                    scheduledDate: session.scheduledDate,
                    duration: session.duration,
                    notes: session.notes,
                    status: session.status
                });
            }
        }

        // Sort by scheduled date
        upcomingSessions.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

        return upcomingSessions;
    }

    /**
     * Get session history for a user
     * @param {string} userId - ID of the user
     * @returns {Array} Array of past sessions
     */
    async getSessionHistory(userId) {
        const mentorships = await Mentorship.find({
            $or: [
                { mentorId: userId },
                { menteeId: userId }
            ],
            'sessions.0': { $exists: true } // Has at least one session
        })
        .populate('mentorId', 'fullName email')
        .populate('menteeId', 'fullName email');

        const sessionHistory = [];

        for (const mentorship of mentorships) {
            for (const session of mentorship.sessions) {
                sessionHistory.push({
                    sessionId: session._id,
                    mentorshipId: mentorship._id,
                    mentorId: mentorship.mentorId,
                    menteeId: mentorship.menteeId,
                    focusAreas: mentorship.focusAreas,
                    scheduledDate: session.scheduledDate,
                    duration: session.duration,
                    status: session.status,
                    notes: session.notes,
                    feedback: session.feedback
                });
            }
        }

        // Sort by scheduled date (most recent first)
        sessionHistory.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

        return sessionHistory;
    }
}

module.exports = new MentorshipService();