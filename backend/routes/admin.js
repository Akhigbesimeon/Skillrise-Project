const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const adminService = require('../services/adminService');
const moderationService = require('../services/moderationService');
const systemMonitoringService = require('../services/systemMonitoringService');

// Admin authentication middleware
router.use(authenticateToken);
router.use(requireRole(['admin']));

// User Management Routes

// Get all users with filtering and pagination
router.get('/users', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            role = '',
            status = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            role,
            status,
            sortBy,
            sortOrder
        };

        const result = await adminService.getAllUsers(options);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get specific user details
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await adminService.getUserById(id);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            data: result.user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Update user status (activate/deactivate)
router.put('/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!status || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status (active/inactive) is required'
            });
        }

        const result = await adminService.updateUserStatus(id, status, reason);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Bulk update users
router.put('/users/bulk', async (req, res) => {
    try {
        const { userIds, updates } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required'
            });
        }

        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Updates object is required'
            });
        }

        const result = await adminService.bulkUpdateUsers(userIds, updates);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: 'Bulk update completed',
            results: result.results
        });
    } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Export users data
router.get('/users/export/:format', async (req, res) => {
    try {
        const { format } = req.params;
        const filters = req.query;

        if (!['json', 'csv'].includes(format)) {
            return res.status(400).json({
                success: false,
                message: 'Format must be json or csv'
            });
        }

        const result = await adminService.exportUsers(format, filters);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.error
            });
        }

        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        
        if (format === 'csv') {
            res.send(result.data);
        } else {
            res.json(result.data);
        }
    } catch (error) {
        console.error('Error exporting users:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Analytics and Reporting Routes

// Get platform statistics
router.get('/analytics', async (req, res) => {
    try {
        const result = await adminService.getPlatformStatistics();

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch analytics',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.statistics
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get system health status
router.get('/system/health', async (req, res) => {
    try {
        const result = await adminService.getSystemHealth();

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch system health',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.health
        });
    } catch (error) {
        console.error('Error fetching system health:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Content Moderation Routes

// Get moderation queue
router.get('/moderation/queue', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = 'pending',
            priority = null,
            contentType = null,
            moderatorId = null
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            priority,
            contentType,
            moderatorId
        };

        const result = await moderationService.getModerationQueue(options);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch moderation queue',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.flags,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching moderation queue:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Assign flag to moderator
router.put('/moderation/flags/:flagId/assign', async (req, res) => {
    try {
        const { flagId } = req.params;
        const { moderatorId } = req.body;

        if (!moderatorId) {
            return res.status(400).json({
                success: false,
                message: 'Moderator ID is required'
            });
        }

        const result = await moderationService.assignFlagToModerator(flagId, moderatorId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error assigning flag:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Resolve content flag
router.put('/moderation/flags/:flagId/resolve', async (req, res) => {
    try {
        const { flagId } = req.params;
        const { resolution, moderatorNotes } = req.body;

        if (!resolution) {
            return res.status(400).json({
                success: false,
                message: 'Resolution is required'
            });
        }

        const result = await moderationService.resolveFlag(
            flagId,
            req.user.id,
            resolution,
            moderatorNotes
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error resolving flag:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get moderation statistics
router.get('/moderation/statistics', async (req, res) => {
    try {
        const result = await moderationService.getModerationStatistics();

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch moderation statistics',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.statistics
        });
    } catch (error) {
        console.error('Error fetching moderation statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Generate moderation report
router.get('/moderation/report', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const result = await moderationService.generateModerationReport(startDate, endDate);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate moderation report',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.report
        });
    } catch (error) {
        console.error('Error generating moderation report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Dispute Resolution Routes

// Get dispute queue
router.get('/disputes/queue', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status = null,
            priority = null,
            type = null,
            mediatorId = null
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            priority,
            type,
            mediatorId
        };

        const result = await moderationService.getDisputeQueue(options);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch dispute queue',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.disputes,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching dispute queue:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Assign dispute to mediator
router.put('/disputes/:disputeId/assign', async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { mediatorId } = req.body;

        if (!mediatorId) {
            return res.status(400).json({
                success: false,
                message: 'Mediator ID is required'
            });
        }

        const result = await moderationService.assignDispute(disputeId, mediatorId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error assigning dispute:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Resolve dispute
router.put('/disputes/:disputeId/resolve', async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { resolution } = req.body;

        if (!resolution) {
            return res.status(400).json({
                success: false,
                message: 'Resolution is required'
            });
        }

        const result = await moderationService.resolveDispute(
            disputeId,
            resolution,
            req.user.id
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Error resolving dispute:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// System Monitoring Routes

// Get system health
router.get('/system/health', async (req, res) => {
    try {
        const healthData = await systemMonitoringService.getSystemHealth();

        res.json({
            success: true,
            data: healthData
        });
    } catch (error) {
        console.error('Error getting system health:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get system metrics
router.get('/system/metrics', async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        const result = await systemMonitoringService.getSecurityDashboard();

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch system metrics',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.metrics
        });
    } catch (error) {
        console.error('Error fetching system metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get system alerts
router.get('/system/alerts', async (req, res) => {
    try {
        const alerts = await systemMonitoringService.checkAlertConditions();

        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        console.error('Error fetching system alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Generate system report
router.get('/system/report', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const result = await systemMonitoringService.generateSecurityReport(30);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate system report',
                error: result.error
            });
        }

        res.json({
            success: true,
            data: result.report
        });
    } catch (error) {
        console.error('Error generating system report:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Legacy route for backward compatibility
router.get('/moderation/flagged', async (req, res) => {
    // Redirect to new moderation queue endpoint
    res.redirect('/api/admin/moderation/queue');
});

// Dashboard Statistics Endpoints
router.get('/dashboard/stats', async (req, res) => {
    try {
        const [userStats, courseStats, projectStats, revenueStats] = await Promise.all([
            adminService.getUserStatistics(),
            adminService.getCourseStatistics(),
            adminService.getProjectStatistics(),
            adminService.getRevenueStatistics()
        ]);

        res.json({
            success: true,
            data: {
                users: userStats,
                courses: courseStats,
                projects: projectStats,
                revenue: revenueStats
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
});

router.get('/dashboard/activity', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const recentActivity = await adminService.getRecentActivity(parseInt(limit));

        res.json({
            success: true,
            data: recentActivity
        });
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity',
            error: error.message
        });
    }
});

router.get('/dashboard/alerts', async (req, res) => {
    try {
        const systemAlerts = await systemMonitoringService.getActiveAlerts();

        res.json({
            success: true,
            data: systemAlerts
        });
    } catch (error) {
        console.error('Error fetching system alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system alerts',
            error: error.message
        });
    }
});

router.get('/dashboard/chart-data', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        const chartData = await adminService.getChartData(period);

        res.json({
            success: true,
            data: chartData
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chart data',
            error: error.message
        });
    }
});

// Legacy routes for backward compatibility
router.get('/reports', async (req, res) => {
    // Redirect to analytics
    res.redirect('/api/admin/analytics');
});

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('Admin route error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

module.exports = router;