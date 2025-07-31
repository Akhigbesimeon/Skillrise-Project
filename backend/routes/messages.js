const express = require('express');
const router = express.Router();
const messageService = require('../services/messageService');
const { authenticateToken: auth } = require('../middleware/auth');

// Function to get Socket.IO instance from app
const getIO = (req) => req.app.get('io');

// Apply authentication middleware to all routes
router.use(auth);

// Get user's conversation list
router.get('/conversations', async (req, res) => {
    try {
        const conversations = await messageService.getUserConversations(req.user.id);
        
        res.json({
            success: true,
            data: conversations
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Send a new message
router.post('/send', async (req, res) => {
    try {
        const { recipientId, content, messageType = 'text', projectId, mentorshipId } = req.body;
        
        if (!recipientId || !content) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Recipient ID and content are required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Prepare context data
        const contextData = {};
        if (projectId) contextData.projectId = projectId;
        if (mentorshipId) contextData.mentorshipId = mentorshipId;

        const message = await messageService.sendMessage(
            req.user.id,
            recipientId,
            content,
            messageType,
            contextData
        );

        // Emit real-time message to recipient if Socket.IO is available
        const io = getIO(req);
        if (io) {
            io.to(`user_${recipientId}`).emit('new_message', {
                message: message,
                timestamp: new Date()
            });

            // Also emit to sender for confirmation
            io.to(`user_${req.user.id}`).emit('message_sent', {
                message: message,
                timestamp: new Date()
            });
        }

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get conversation with another user
router.get('/conversation/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await messageService.getConversation(req.user.id, userId, page, limit);
        
        res.json({
            success: true,
            data: messages,
            pagination: {
                page,
                limit,
                hasMore: messages.length === limit
            }
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Mark messages as read
router.put('/read/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const modifiedCount = await messageService.markMessagesAsRead(req.user.id, userId);
        
        // Emit read receipt to sender if Socket.IO is available
        const io = getIO(req);
        if (io && modifiedCount > 0) {
            io.to(`user_${userId}`).emit('messages_read', {
                readBy: req.user.id,
                readByName: req.user.fullName,
                messagesCount: modifiedCount,
                timestamp: new Date()
            });
        }
        
        res.json({
            success: true,
            data: { messagesMarkedAsRead: modifiedCount }
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get unread message count
router.get('/unread/count', async (req, res) => {
    try {
        const count = await messageService.getUnreadCount(req.user.id);
        
        res.json({
            success: true,
            data: { unreadCount: count }
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router;