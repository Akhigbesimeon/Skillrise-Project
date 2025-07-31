const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const systemMonitoringService = require('../services/systemMonitoringService');
const SystemMetric = require('../models/SystemMetric');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get system health status
router.get('/health', async (req, res) => {
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
            message: 'Failed to get system health',
            error: error.message
        });
    }
});

// Get dashboard metrics
router.get('/dashboard', async (req, res) => {
    try {
        const metricsData = await systemMonitoringService.getSecurityDashboard();
        
        res.json({
            success: true,
            data: metricsData
        });
    } catch (error) {
        console.error('Error getting dashboard metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard metrics',
            error: error.message
        });
    }
});

// Get specific metric history
router.get('/metrics/:metricType', async (req, res) => {
    try {
        const { metricType } = req.params;
        const { timeframe = 24 } = req.query;

        const validMetricTypes = [
            'cpu_usage',
            'memory_usage',
            'disk_usage',
            'network_io',
            'database_connections',
            'response_time',
            'error_rate',
            'active_users',
            'concurrent_sessions',
            'api_requests',
            'email_queue',
            'background_jobs'
        ];

        if (!validMetricTypes.includes(metricType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid metric type'
            });
        }

        const history = await SystemMetric.getMetricsHistory(metricType, parseInt(timeframe));
        
        res.json({
            success: true,
            data: {
                metricType,
                timeframe: parseInt(timeframe),
                history
            }
        });
    } catch (error) {
        console.error('Error getting metric history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get metric history',
            error: error.message
        });
    }
});

// Get current system status
router.get('/status', async (req, res) => {
    try {
        const currentStatus = await SystemMetric.getCurrentStatus();
        
        res.json({
            success: true,
            data: currentStatus
        });
    } catch (error) {
        console.error('Error getting current status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get current status',
            error: error.message
        });
    }
});

// Get system health summary
router.get('/health-summary', async (req, res) => {
    try {
        const { timeframe = 24 } = req.query;
        const healthSummary = await SystemMetric.getHealthSummary(parseInt(timeframe));
        
        res.json({
            success: true,
            data: {
                timeframe: parseInt(timeframe),
                summary: healthSummary
            }
        });
    } catch (error) {
        console.error('Error getting health summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get health summary',
            error: error.message
        });
    }
});

// Generate system report
router.get('/report', async (req, res) => {
    try {
        const report = await systemMonitoringService.generateSecurityReport(7);
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error generating system report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate system report',
            error: error.message
        });
    }
});

// Start/Stop monitoring
router.post('/monitoring/start', async (req, res) => {
    try {
        const { intervalMinutes = 5 } = req.body;
        
        systemMonitoringService.startMonitoring(intervalMinutes);
        
        res.json({
            success: true,
            message: `System monitoring started with ${intervalMinutes} minute intervals`
        });
    } catch (error) {
        console.error('Error starting monitoring:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start monitoring',
            error: error.message
        });
    }
});

router.post('/monitoring/stop', async (req, res) => {
    try {
        systemMonitoringService.stopMonitoring();
        
        res.json({
            success: true,
            message: 'System monitoring stopped'
        });
    } catch (error) {
        console.error('Error stopping monitoring:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop monitoring',
            error: error.message
        });
    }
});

// Get monitoring status
router.get('/monitoring/status', async (req, res) => {
    try {
        const status = {
            isMonitoring: systemMonitoringService.isMonitoring,
            intervalActive: !!systemMonitoringService.monitoringInterval,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date()
        };
        
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting monitoring status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring status',
            error: error.message
        });
    }
});

module.exports = router;