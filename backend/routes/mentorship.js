const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const mentorshipService = require('../services/mentorshipService');
const User = require('../models/User');

// Request mentorship
router.post('/request', auth, async (req, res) => {
    try {
        const menteeId = req.user.id;
        const { mentorId, focusAreas, learningGoals, requestMessage } = req.body;

        // Validate required fields
        if (!mentorId || !focusAreas || !Array.isArray(focusAreas) || focusAreas.length === 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Mentor ID and focus areas are required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Validate that the requesting user is a freelancer
        if (req.user.userType !== 'freelancer') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only freelancers can request mentorship',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const mentorship = await mentorshipService.createMentorshipRequest(menteeId, mentorId, {
            focusAreas,
            learningGoals: learningGoals || '',
            requestMessage: requestMessage || ''
        });

        res.status(201).json({
            success: true,
            data: mentorship,
            message: 'Mentorship request sent successfully'
        });

    } catch (error) {
        console.error('Error creating mentorship request:', error);
        
        if (error.message.includes('not found') || error.message.includes('not available')) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('capacity') || error.message.includes('already exists')) {
            return res.status(409).json({
                error: {
                    code: 'CONFLICT',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create mentorship request',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get potential mentor matches for a freelancer
router.get('/matches', auth, async (req, res) => {
    try {
        // Validate that the requesting user is a freelancer
        if (req.user.userType !== 'freelancer') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only freelancers can search for mentors',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Extract mentee data for matching
        const menteeData = {
            skills: user.freelancerProfile.skills || [],
            experienceLevel: user.freelancerProfile.experienceLevel || 'beginner',
            focusAreas: req.query.focusAreas ? req.query.focusAreas.split(',') : user.freelancerProfile.skills || []
        };

        const matches = await mentorshipService.findPotentialMentors(menteeData);

        res.json({
            success: true,
            data: matches,
            message: `Found ${matches.length} potential mentors`
        });

    } catch (error) {
        console.error('Error finding mentor matches:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to find mentor matches',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Accept mentorship request (mentor only)
router.post('/accept', auth, async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { mentorshipId } = req.body;

        // Validate required fields
        if (!mentorshipId) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Mentorship ID is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Validate that the requesting user is a mentor
        if (req.user.userType !== 'mentor') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only mentors can accept mentorship requests',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const mentorship = await mentorshipService.acceptMentorshipRequest(mentorshipId, mentorId);

        res.json({
            success: true,
            data: mentorship,
            message: 'Mentorship request accepted successfully'
        });

    } catch (error) {
        console.error('Error accepting mentorship request:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Unauthorized') || error.message.includes('not pending')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('capacity')) {
            return res.status(409).json({
                error: {
                    code: 'CONFLICT',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to accept mentorship request',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Decline mentorship request (mentor only)
router.post('/decline', auth, async (req, res) => {
    try {
        const mentorId = req.user.id;
        const { mentorshipId } = req.body;

        // Validate required fields
        if (!mentorshipId) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Mentorship ID is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Validate that the requesting user is a mentor
        if (req.user.userType !== 'mentor') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only mentors can decline mentorship requests',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const mentorship = await mentorshipService.declineMentorshipRequest(mentorshipId, mentorId);

        res.json({
            success: true,
            data: mentorship,
            message: 'Mentorship request declined'
        });

    } catch (error) {
        console.error('Error declining mentorship request:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Unauthorized') || error.message.includes('not pending')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to decline mentorship request',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get mentorship requests for mentor
router.get('/requests', auth, async (req, res) => {
    try {
        // Validate that the requesting user is a mentor
        if (req.user.userType !== 'mentor') {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Only mentors can view mentorship requests',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const requests = await mentorshipService.getMentorshipRequestsForMentor(req.user.id);

        res.json({
            success: true,
            data: requests,
            message: `Found ${requests.length} mentorship requests`
        });

    } catch (error) {
        console.error('Error getting mentorship requests:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get mentorship requests',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get active mentorships for user
router.get('/active', auth, async (req, res) => {
    try {
        const mentorships = await mentorshipService.getActiveMentorships(req.user.id);

        res.json({
            success: true,
            data: mentorships,
            message: `Found ${mentorships.length} active mentorships`
        });

    } catch (error) {
        console.error('Error getting active mentorships:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get active mentorships',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get mentorship history for user
router.get('/history', auth, async (req, res) => {
    try {
        const mentorships = await mentorshipService.getMentorshipHistory(req.user.id);

        res.json({
            success: true,
            data: mentorships,
            message: `Found ${mentorships.length} mentorships in history`
        });

    } catch (error) {
        console.error('Error getting mentorship history:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get mentorship history',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Schedule a mentorship session
router.post('/schedule', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { mentorshipId, scheduledDate, duration, notes } = req.body;

        // Validate required fields
        if (!mentorshipId || !scheduledDate) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Mentorship ID and scheduled date are required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Validate date is in the future
        const sessionDate = new Date(scheduledDate);
        if (sessionDate <= new Date()) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Session date must be in the future',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const session = await mentorshipService.scheduleSession(userId, {
            mentorshipId,
            scheduledDate: sessionDate,
            duration: duration || 60,
            notes: notes || ''
        });

        res.status(201).json({
            success: true,
            data: session,
            message: 'Session scheduled successfully'
        });

    } catch (error) {
        console.error('Error scheduling session:', error);
        
        if (error.message.includes('not found') || error.message.includes('not authorized')) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('not active')) {
            return res.status(409).json({
                error: {
                    code: 'CONFLICT',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to schedule session',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get sessions for a mentorship
router.get('/sessions/:mentorshipId', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { mentorshipId } = req.params;

        const sessions = await mentorshipService.getMentorshipSessions(userId, mentorshipId);

        res.json({
            success: true,
            data: sessions,
            message: `Found ${sessions.length} sessions`
        });

    } catch (error) {
        console.error('Error getting sessions:', error);
        
        if (error.message.includes('not found') || error.message.includes('not authorized')) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get sessions',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Update session status
router.put('/sessions/:sessionId/status', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const { status, notes } = req.body;

        // Validate status
        const validStatuses = ['scheduled', 'completed', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Valid status is required (scheduled, completed, cancelled)',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const session = await mentorshipService.updateSessionStatus(userId, sessionId, status, notes);

        res.json({
            success: true,
            data: session,
            message: 'Session status updated successfully'
        });

    } catch (error) {
        console.error('Error updating session status:', error);
        
        if (error.message.includes('not found') || error.message.includes('not authorized')) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update session status',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Add session feedback
router.post('/sessions/:sessionId/feedback', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const { feedback, rating } = req.body;

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Rating must be between 1 and 5',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const session = await mentorshipService.addSessionFeedback(userId, sessionId, {
            feedback: feedback || '',
            rating: rating || null
        });

        res.json({
            success: true,
            data: session,
            message: 'Feedback added successfully'
        });

    } catch (error) {
        console.error('Error adding session feedback:', error);
        
        if (error.message.includes('not found') || error.message.includes('not authorized')) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to add session feedback',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get upcoming sessions for user
router.get('/sessions/upcoming', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await mentorshipService.getUpcomingSessions(userId);

        res.json({
            success: true,
            data: sessions,
            message: `Found ${sessions.length} upcoming sessions`
        });

    } catch (error) {
        console.error('Error getting upcoming sessions:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get upcoming sessions',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get session history for user
router.get('/sessions/history', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await mentorshipService.getSessionHistory(userId);

        res.json({
            success: true,
            data: sessions,
            message: `Found ${sessions.length} sessions in history`
        });

    } catch (error) {
        console.error('Error getting session history:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to get session history',
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router;