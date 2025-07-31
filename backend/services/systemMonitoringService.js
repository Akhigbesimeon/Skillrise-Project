const os = require('os');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const SystemMetric = require('../models/SystemMetric');
const moderationService = require('./moderationService');

class SystemMonitoringService {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.alertThresholds = {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 80, critical: 95 },
            disk: { warning: 85, critical: 95 },
            errorRate: { warning: 5, critical: 10 },
            responseTime: { warning: 1000, critical: 3000 }
        };
    }

    // Start system monitoring
    startMonitoring(intervalMs = 60000) { // Default: 1 minute
        if (this.isMonitoring) {
            console.log('System monitoring is already running');
            return;
        }

        this.isMonitoring = true;
        console.log('Starting system monitoring...');

        // Collect metrics immediately
        this.collectAllMetrics();

        // Set up periodic collection
        this.monitoringInterval = setInterval(() => {
            this.collectAllMetrics();
        }, intervalMs);
    }

    // Stop system monitoring
    stopMonitoring() {
        if (!this.isMonitoring) {
            console.log('System monitoring is not running');
            return;
        }

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('System monitoring stopped');
    }

    // Collect all system metrics
    async collectAllMetrics() {
        try {
            await Promise.all([
                this.collectCPUMetrics(),
                this.collectMemoryMetrics(),
                this.collectDiskMetrics(),
                this.collectDatabaseMetrics(),
                this.collectApplicationMetrics()
            ]);
        } catch (error) {
            console.error('Error collecting system metrics:', error);
        }
    }

    // CPU Metrics
    async collectCPUMetrics() {
        try {
            const cpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;

            cpus.forEach(cpu => {
                for (const type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            });

            const idle = totalIdle / cpus.length;
            const total = totalTick / cpus.length;
            const usage = 100 - ~~(100 * idle / total);

            await moderationService.recordSystemMetric(
                'cpu_usage',
                usage,
                'percentage',
                { cores: cpus.length, loadAvg: os.loadavg() }
            );

            return usage;
        } catch (error) {
            console.error('Error collecting CPU metrics:', error);
            return null;
        }
    }

    // Memory Metrics
    async collectMemoryMetrics() {
        try {
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const memoryUsage = (usedMemory / totalMemory) * 100;

            await moderationService.recordSystemMetric(
                'memory_usage',
                memoryUsage,
                'percentage',
                {
                    total: totalMemory,
                    used: usedMemory,
                    free: freeMemory,
                    totalGB: (totalMemory / 1024 / 1024 / 1024).toFixed(2),
                    usedGB: (usedMemory / 1024 / 1024 / 1024).toFixed(2)
                }
            );

            return memoryUsage;
        } catch (error) {
            console.error('Error collecting memory metrics:', error);
            return null;
        }
    }

    // Disk Metrics
    async collectDiskMetrics() {
        try {
            // This is a simplified version - in production, you'd want to check actual disk usage
            const stats = await fs.stat(process.cwd());
            
            // Simulate disk usage for demo purposes
            const diskUsage = Math.random() * 50 + 20; // Random between 20-70%

            await moderationService.recordSystemMetric(
                'disk_usage',
                diskUsage,
                'percentage',
                {
                    path: process.cwd(),
                    timestamp: new Date()
                }
            );

            return diskUsage;
        } catch (error) {
            console.error('Error collecting disk metrics:', error);
            return null;
        }
    }

    // Database Metrics
    async collectDatabaseMetrics() {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                console.log('Database not connected');
                return null;
            }

            // Get database stats
            const stats = await db.stats();
            const connectionCount = mongoose.connections.length;

            await moderationService.recordSystemMetric(
                'database_connections',
                connectionCount,
                'count',
                {
                    collections: stats.collections,
                    dataSize: stats.dataSize,
                    indexSize: stats.indexSize,
                    storageSize: stats.storageSize
                }
            );

            // Record storage usage
            const storageUsage = (stats.dataSize / (stats.dataSize + stats.freeStorageSize || stats.dataSize * 2)) * 100;
            await moderationService.recordSystemMetric(
                'storage_usage',
                storageUsage || 0,
                'percentage',
                {
                    dataSize: stats.dataSize,
                    indexSize: stats.indexSize,
                    storageSize: stats.storageSize
                }
            );

            return { connectionCount, storageUsage };
        } catch (error) {
            console.error('Error collecting database metrics:', error);
            return null;
        }
    }

    // Application Metrics
    async collectApplicationMetrics() {
        try {
            // Get active users (simplified - would need session tracking in production)
            const User = require('../models/User');
            const activeUsers = await User.countDocuments({ 
                isActive: true,
                lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            await moderationService.recordSystemMetric(
                'active_users',
                activeUsers,
                'count',
                { period: '24h' }
            );

            // Process metrics
            const processMemory = process.memoryUsage();
            const processUptime = process.uptime();

            await moderationService.recordSystemMetric(
                'uptime',
                processUptime,
                'seconds',
                {
                    heapUsed: processMemory.heapUsed,
                    heapTotal: processMemory.heapTotal,
                    external: processMemory.external,
                    rss: processMemory.rss
                }
            );

            return { activeUsers, uptime: processUptime };
        } catch (error) {
            console.error('Error collecting application metrics:', error);
            return null;
        }
    }

    // API Performance Metrics
    recordAPIMetric(endpoint, method, responseTime, statusCode) {
        try {
            // Record response time
            moderationService.recordSystemMetric(
                'response_time',
                responseTime,
                'milliseconds',
                { endpoint, method, statusCode }
            );

            // Record error rate if it's an error
            if (statusCode >= 400) {
                moderationService.recordSystemMetric(
                    'error_rate',
                    1,
                    'count',
                    { endpoint, method, statusCode }
                );
            }

            // Record API request
            moderationService.recordSystemMetric(
                'api_requests',
                1,
                'count',
                { endpoint, method, statusCode }
            );
        } catch (error) {
            console.error('Error recording API metric:', error);
        }
    }

    // Health Check
    async performHealthCheck() {
        try {
            const healthData = {
                timestamp: new Date(),
                status: 'healthy',
                services: {},
                metrics: {}
            };

            // Check database connection
            try {
                await mongoose.connection.db.admin().ping();
                healthData.services.database = { status: 'healthy', responseTime: Date.now() };
            } catch (error) {
                healthData.services.database = { status: 'unhealthy', error: error.message };
                healthData.status = 'unhealthy';
            }

            // Check memory usage
            const memoryUsage = await this.collectMemoryMetrics();
            if (memoryUsage > this.alertThresholds.memory.critical) {
                healthData.status = 'critical';
            } else if (memoryUsage > this.alertThresholds.memory.warning) {
                healthData.status = 'warning';
            }
            healthData.metrics.memory = memoryUsage;

            // Check CPU usage
            const cpuUsage = await this.collectCPUMetrics();
            if (cpuUsage > this.alertThresholds.cpu.critical) {
                healthData.status = 'critical';
            } else if (cpuUsage > this.alertThresholds.cpu.warning && healthData.status === 'healthy') {
                healthData.status = 'warning';
            }
            healthData.metrics.cpu = cpuUsage;

            // Check disk usage
            const diskUsage = await this.collectDiskMetrics();
            if (diskUsage > this.alertThresholds.disk.critical) {
                healthData.status = 'critical';
            } else if (diskUsage > this.alertThresholds.disk.warning && healthData.status === 'healthy') {
                healthData.status = 'warning';
            }
            healthData.metrics.disk = diskUsage;

            return healthData;
        } catch (error) {
            console.error('Error performing health check:', error);
            return {
                timestamp: new Date(),
                status: 'error',
                error: error.message
            };
        }
    }

    // Get system metrics for dashboard
    async getMetricsForDashboard(timeRange = '24h') {
        try {
            const metricTypes = [
                'cpu_usage',
                'memory_usage',
                'disk_usage',
                'database_connections',
                'active_users',
                'response_time',
                'error_rate'
            ];

            const metricsData = {};
            
            for (const metricType of metricTypes) {
                const result = await moderationService.getSystemMetrics(metricType, timeRange);
                if (result.success) {
                    metricsData[metricType] = result.metrics;
                }
            }

            return { success: true, metrics: metricsData };
        } catch (error) {
            console.error('Error getting metrics for dashboard:', error);
            return { success: false, error: error.message };
        }
    }

    // Alert Management
    async checkAlerts() {
        try {
            const latestMetrics = await SystemMetric.getLatestMetrics();
            const alerts = [];

            for (const [metricType, metric] of Object.entries(latestMetrics)) {
                const threshold = this.alertThresholds[metricType.replace('_usage', '')];
                if (threshold && metric.value >= threshold.critical) {
                    alerts.push({
                        type: 'critical',
                        metric: metricType,
                        value: metric.value,
                        threshold: threshold.critical,
                        message: `${metricType} is critically high at ${metric.value}${metric.unit}`
                    });
                } else if (threshold && metric.value >= threshold.warning) {
                    alerts.push({
                        type: 'warning',
                        metric: metricType,
                        value: metric.value,
                        threshold: threshold.warning,
                        message: `${metricType} is high at ${metric.value}${metric.unit}`
                    });
                }
            }

            return alerts;
        } catch (error) {
            console.error('Error checking alerts:', error);
            return [];
        }
    }

    // Generate system report
    async generateSystemReport(startDate, endDate) {
        try {
            const dateFilter = {
                timestamp: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            const [
                cpuMetrics,
                memoryMetrics,
                diskMetrics,
                responseTimeMetrics,
                errorMetrics,
                uptimeMetrics
            ] = await Promise.all([
                SystemMetric.find({ metricType: 'cpu_usage', ...dateFilter }).lean(),
                SystemMetric.find({ metricType: 'memory_usage', ...dateFilter }).lean(),
                SystemMetric.find({ metricType: 'disk_usage', ...dateFilter }).lean(),
                SystemMetric.find({ metricType: 'response_time', ...dateFilter }).lean(),
                SystemMetric.find({ metricType: 'error_rate', ...dateFilter }).lean(),
                SystemMetric.find({ metricType: 'uptime', ...dateFilter }).lean()
            ]);

            // Calculate averages and peaks
            const calculateStats = (metrics) => {
                if (!metrics.length) return { avg: 0, min: 0, max: 0, count: 0 };
                
                const values = metrics.map(m => m.value);
                return {
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    count: values.length
                };
            };

            return {
                success: true,
                report: {
                    period: { startDate, endDate },
                    summary: {
                        cpu: calculateStats(cpuMetrics),
                        memory: calculateStats(memoryMetrics),
                        disk: calculateStats(diskMetrics),
                        responseTime: calculateStats(responseTimeMetrics),
                        errors: errorMetrics.length,
                        uptime: uptimeMetrics.length ? uptimeMetrics[uptimeMetrics.length - 1].value : 0
                    },
                    metrics: {
                        cpu: cpuMetrics,
                        memory: memoryMetrics,
                        disk: diskMetrics,
                        responseTime: responseTimeMetrics,
                        errors: errorMetrics
                    }
                }
            };
        } catch (error) {
            console.error('Error generating system report:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup old metrics
    async cleanupOldMetrics(daysOld = 30) {
        try {
            const result = await SystemMetric.cleanupOldMetrics(daysOld);
            console.log(`Cleaned up ${result.deletedCount} old system metrics`);
            return result;
        } catch (error) {
            console.error('Error cleaning up old metrics:', error);
            return { deletedCount: 0 };
        }
    }
}

// Middleware to track API performance
const apiMetricsMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const systemMonitoring = new SystemMonitoringService();
        systemMonitoring.recordAPIMetric(
            req.route?.path || req.path,
            req.method,
            responseTime,
            res.statusCode
        );
    });
    
    next();
};

module.exports = {
    SystemMonitoringService,
    apiMetricsMiddleware
};