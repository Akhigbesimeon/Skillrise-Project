const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            unreadOnly = false,
            type = null
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            unreadOnly: unreadOnly === 'true',
            type
        };

        const result = await notificationService.getUserNotifications(req.user.id, options);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.notifications,
            pagination: result.pagination,
            unreadCount: result.unreadCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const result = await notificationService.getUnreadCount(req.user.id);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get unread count',
                error: result.error
            });
        }

        res.json({
            success: true,
            count: result.count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Mark notifications as read
router.put('/mark-read', authenticateToken, async (req, res) => {
    try {
        const { notificationIds } = req.body;

        const result = await notificationService.markNotificationsAsRead(
            req.user.id,
            notificationIds
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to mark notifications as read',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const result = await notificationService.markNotificationsAsRead(req.user.id);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;

        const result = await notificationService.deleteNotification(
            req.user.id,
            notificationId
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete notification',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const result = await notificationService.getNotificationPreferences(req.user.id);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get notification preferences',
                error: result.error
            });
        }

        res.json({
            success: true,
            preferences: result.preferences
        });
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const updates = req.body;

        // Validate the updates structure
        const allowedFields = ['emailNotifications', 'inAppNotifications', 'quietHours', 'frequency'];
        const filteredUpdates = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        const result = await notificationService.updateNotificationPreferences(
            req.user.id,
            filteredUpdates
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update notification preferences',
                error: result.error
            });
        }

        res.json({
            success: true,
            message: 'Notification preferences updated',
            preferences: result.preferences
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Create test notification (development only)
if (process.env.NODE_ENV === 'development') {
    router.post('/test', authenticateToken, async (req, res) => {
        try {
            const {
                type = 'system_announcement',
                title = 'Test Notification',
                message = 'This is a test notification',
                priority = 'medium'
            } = req.body;

            const result = await notificationService.createNotification(
                req.user.id,
                type,
                title,
                message,
                {},
                null,
                priority
            );

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create test notification',
                    error: result.error
                });
            }

            res.json({
                success: true,
                message: 'Test notification created',
                notification: result.notification
            });
        } catch (error) {
            console.error('Error creating test notification:', error);
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    });
}

module.exports = router;