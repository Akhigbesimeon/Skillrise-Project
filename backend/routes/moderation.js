const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const moderationService = require('../services/moderationService');

// Apply authentication to all routes
router.use(authenticateToken);

// Flag content
router.post('/flag', async (req, res) => {
    try {
        const {
            contentType,
            contentId,
            targetUserId,
            reason,
            description,
            evidence = []
        } = req.body;

        // Validate required fields
        if (!contentType || !contentId || !targetUserId || !reason || !description) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Validate content type
        const validContentTypes = ['message', 'project', 'profile', 'course', 'comment', 'mentorship_session'];
        if (!validContentTypes.includes(contentType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid content type'
            });
        }

        // Validate reason
        const validReasons = [
            'spam',
            'harassment',
            'inappropriate_content',
            'hate_speech',
            'violence',
            'copyright_violation',
            'fraud',
            'impersonation',
            'other'
        ];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reason'
            });
        }

        const result = await moderationService.flagContent(
            req.user.id,
            contentType,
            contentId,
            targetUserId,
            reason,
            description,
            evidence
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.status(201).json({
            success: true,
            message: 'Content flagged successfully',
            flagId: result.flag._id
        });
    } catch (error) {
        console.error('Error flagging content:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get user's flags
router.get('/flags', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = null
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            reporterId: req.user.id
        };

        if (status) options.status = status;

        const result = await moderationService.getModerationQueue(options);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch your flags',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.flags,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching user flags:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Create dispute
router.post('/disputes', async (req, res) => {
    try {
        const {
            type,
            respondentId,
            relatedEntityType,
            relatedEntityId,
            title,
            description,
            evidence = [],
            priority = 'medium'
        } = req.body;

        // Validate required fields
        if (!type || !respondentId || !relatedEntityType || !relatedEntityId || !title || !description) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Validate dispute type
        const validTypes = [
            'project_payment',
            'project_quality',
            'project_deadline',
            'mentorship_session',
            'course_content',
            'user_behavior',
            'platform_issue',
            'other'
        ];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid dispute type'
            });
        }

        // Validate related entity type
        const validEntityTypes = ['project', 'mentorship', 'course', 'message', 'user'];
        if (!validEntityTypes.includes(relatedEntityType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid related entity type'
            });
        }

        const disputeData = {
            type,
            initiatorId: req.user.id,
            respondentId,
            relatedEntityType,
            relatedEntityId,
            title,
            description,
            evidence,
            priority
        };

        const result = await moderationService.createDispute(disputeData);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.status(201).json({
            success: true,
            message: 'Dispute created successfully',
            disputeId: result.dispute.disputeId
        });
    } catch (error) {
        console.error('Error creating dispute:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get user's disputes
router.get('/disputes', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = null,
            type = null
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit)
        };

        if (status) options.status = status;
        if (type) options.type = type;

        // Get disputes where user is either initiator or respondent
        const result = await moderationService.getDisputeQueue({
            ...options,
            $or: [
                { initiatorId: req.user.id },
                { respondentId: req.user.id }
            ]
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch your disputes',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.disputes,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching user disputes:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get specific dispute details
router.get('/disputes/:disputeId', async (req, res) => {
    try {
        const { disputeId } = req.params;
        
        const Dispute = require('../models/Dispute');
        const dispute = await Dispute.findOne({ disputeId })
            .populate('initiatorId', 'fullName email')
            .populate('respondentId', 'fullName email')
            .populate('mediatorId', 'fullName email')
            .lean();

        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: 'Dispute not found'
            });
        }

        // Check if user is authorized to view this dispute
        const userId = req.user.id;
        const isAuthorized = dispute.initiatorId._id.toString() === userId ||
                           dispute.respondentId._id.toString() === userId ||
                           dispute.mediatorId?._id.toString() === userId ||
                           req.user.role === 'admin';

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: dispute
        });
    } catch (error) {
        console.error('Error fetching dispute details:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Add communication to dispute
router.post('/disputes/:disputeId/communicate', async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { message, isPrivate = false } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const Dispute = require('../models/Dispute');
        const dispute = await Dispute.findOne({ disputeId });

        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: 'Dispute not found'
            });
        }

        // Check if user is authorized to communicate in this dispute
        const userId = req.user.id;
        const isAuthorized = dispute.initiatorId.toString() === userId ||
                           dispute.respondentId.toString() === userId ||
                           dispute.mediatorId?.toString() === userId ||
                           req.user.role === 'admin';

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await dispute.addCommunication(userId, message.trim(), isPrivate);

        res.json({
            success: true,
            message: 'Communication added successfully'
        });
    } catch (error) {
        console.error('Error adding communication to dispute:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Add evidence to dispute
router.post('/disputes/:disputeId/evidence', async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { type, content, fileUrl } = req.body;

        if (!type || (!content && !fileUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Evidence type and content/file URL are required'
            });
        }

        const validEvidenceTypes = ['text', 'file', 'screenshot', 'link', 'message_thread'];
        if (!validEvidenceTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid evidence type'
            });
        }

        const Dispute = require('../models/Dispute');
        const dispute = await Dispute.findOne({ disputeId });

        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: 'Dispute not found'
            });
        }

        // Check if user is authorized to add evidence
        const userId = req.user.id;
        const isAuthorized = dispute.initiatorId.toString() === userId ||
                           dispute.respondentId.toString() === userId;

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        dispute.evidence.push({
            type,
            content,
            fileUrl,
            uploadedBy: userId,
            uploadedAt: new Date()
        });

        await dispute.save();
        await dispute.addTimelineEntry(
            'evidence_added',
            userId,
            `New ${type} evidence added`
        );

        res.json({
            success: true,
            message: 'Evidence added successfully'
        });
    } catch (error) {
        console.error('Error adding evidence to dispute:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;