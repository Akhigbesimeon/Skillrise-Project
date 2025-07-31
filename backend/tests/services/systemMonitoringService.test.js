const SystemMonitoringService = require('../../services/systemMonitoringService');
const SystemMetric = require('../../models/SystemMetric');
const User = require('../../models/User');
const mongoose = require('mongoose');

describe('SystemMonitoringService', () => {
    let systemMonitoring;

    beforeEach(() => {
        systemMonitoring = new SystemMonitoringService();
    });

    afterEach(async () => {
        if (systemMonitoring.isMonitoring) {
            systemMonitoring.stopMonitoring();
        }
        await SystemMetric.deleteMany({});
    });

    describe('Monitoring Control', () => {
        describe('startMonitoring', () => {
            it('should start monitoring successfully', async () => {
                expect(systemMonitoring.isMonitoring).toBe(false);

                await systemMonitoring.startMonitoring(0.01); // Very short interval for testing     

                expect(systemMonitoring.isMonitoring).toBe(true);
                expect(systemMonitoring.monitoringInterval).toBeDefined();
            });

            it('should not start monitoring if already running', async () => {
                const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

                await systemMonitoring.startMonitoring(0.01);
                await systemMonitoring.startMonitoring(0.01);

                expect(consoleSpy).toHaveBeenCalledWith('System monitoring is already running');
                consoleSpy.mockRestore();
            });
        });

        describe('stopMonitoring', () => {
            it('should stop monitoring successfully', async () => {
                await systemMonitoring.startMonitoring(0.01);
                expect(systemMonitoring.isMonitoring).toBe(true);

                systemMonitoring.stopMonitoring();

                expect(systemMonitoring.isMonitoring).toBe(false);
                expect(systemMonitoring.monitoringInterval).toBeNull();
            });

            it('should handle stopping when not running', () => {
                expect(() => systemMonitoring.stopMonitoring()).not.toThrow();
            });
        });
    });

    describe('Metric Collection', () => {
        describe('collectAllMetrics', () => {
            it('should collect all types of metrics', async () => {
                const collectSystemSpy = jest.spyOn(systemMonitoring, 'collectSystemMetrics').mockResolvedValue();
                const collectAppSpy = jest.spyOn(systemMonitoring, 'collectApplicationMetrics').mockResolvedValue();
                const collectDbSpy = jest.spyOn(systemMonitoring, 'collectDatabaseMetrics').mockResolvedValue();

                await systemMonitoring.collectAllMetrics();

                expect(collectSystemSpy).toHaveBeenCalled();
                expect(collectAppSpy).toHaveBeenCalled();
                expect(collectDbSpy).toHaveBeenCalled();

                collectSystemSpy.mockRestore();
                collectAppSpy.mockRestore();
                collectDbSpy.mockRestore();
            });

            it('should handle errors gracefully', async () => {
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                jest.spyOn(systemMonitoring, 'collectSystemMetrics').mockRejectedValue(new Error('Test error'));

                await systemMonitoring.collectAllMetrics();

                expect(consoleSpy).toHaveBeenCalledWith('Error in collectAllMetrics:', expect.any(Error));
                consoleSpy.mockRestore();
            });
        });

        describe('recordMetric', () => {
            it('should record a metric successfully', async () => {
                const metricData = {
                    metricType: 'cpu_usage',
                    value: 75,
                    unit: 'percentage',
                    threshold: { warning: 70, critical: 90 },
                    source: 'system'
                };

                const result = await systemMonitoring.recordMetric(metricData);

                expect(result.success).toBe(true);
                expect(result.metric).toBeDefined();
                expect(result.metric.metricType).toBe('cpu_usage');
                expect(result.metric.value).toBe(75);
            });

            it('should handle recording errors', async () => {
                const invalidData = {
                    metricType: 'invalid_type',
                    value: 'invalid_value',
                    unit: 'percentage',
                    source: 'system'
                };

                const result = await systemMonitoring.recordMetric(invalidData);

                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            });
        });
    });

    describe('System Metrics', () => {
        describe('getCPUUsage', () => {
            it('should return CPU usage as percentage', async () => {
                const cpuUsage = await systemMonitoring.getCPUUsage();

                expect(typeof cpuUsage).toBe('number');
                expect(cpuUsage).toBeGreaterThanOrEqual(0);
                expect(cpuUsage).toBeLessThanOrEqual(100);
            });
        });

        describe('getMemoryUsage', () => {
            it('should return memory usage as percentage', () => {
                const memoryUsage = systemMonitoring.getMemoryUsage();

                expect(typeof memoryUsage).toBe('number');
                expect(memoryUsage).toBeGreaterThanOrEqual(0);
                expect(memoryUsage).toBeLessThanOrEqual(100);
            });
        });

        describe('getDiskUsage', () => {
            it('should return disk usage as percentage', async () => {
                const diskUsage = await systemMonitoring.getDiskUsage();

                expect(typeof diskUsage).toBe('number');
                expect(diskUsage).toBeGreaterThanOrEqual(0);
                expect(diskUsage).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('Application Metrics', () => {
        describe('measureResponseTime', () => {
            it('should measure response time', async () => {
                const responseTime = await systemMonitoring.measureResponseTime();

                expect(typeof responseTime).toBe('number');
                expect(responseTime).toBeGreaterThan(0);
            });
        });

        describe('getActiveUsersCount', () => {
            it('should return active users count', async () => {
                // Create test users
                const testUsers = [
                    { fullName: 'User 1', email: 'user1@test.com', password: 'password', lastActive: new Date() },
                    { fullName: 'User 2', email: 'user2@test.com', password: 'password', lastActive: new Date(Date.now() - 10 * 60 * 1000) }
                ];
                await User.insertMany(testUsers);

                const activeCount = await systemMonitoring.getActiveUsersCount();

                expect(typeof activeCount).toBe('number');
                expect(activeCount).toBeGreaterThanOrEqual(0);

                await User.deleteMany({});
            });
        });

        describe('getErrorRate', () => {
            it('should return error rate as percentage', async () => {
                const errorRate = await systemMonitoring.getErrorRate();

                expect(typeof errorRate).toBe('number');
                expect(errorRate).toBeGreaterThanOrEqual(0);
                expect(errorRate).toBeLessThanOrEqual(100);
            });
        });
    });

    describe('Database Metrics', () => {
        describe('getDatabaseConnections', () => {
            it('should return database connection info', () => {
                const connections = systemMonitoring.getDatabaseConnections();

                expect(connections).toHaveProperty('active');
                expect(connections).toHaveProperty('total');
                expect(connections).toHaveProperty('idle');
                expect(typeof connections.active).toBe('number');
                expect(typeof connections.total).toBe('number');
                expect(typeof connections.idle).toBe('number');
            });
        });

        describe('measureDatabaseResponseTime', () => {
            it('should measure database response time', async () => {
                const responseTime = await systemMonitoring.measureDatabaseResponseTime();

                expect(typeof responseTime).toBe('number');
                expect(responseTime).toBeGreaterThan(0);
            });
        });
    });

    describe('Health Monitoring', () => {
        describe('getSystemHealth', () => {
            it('should return comprehensive system health', async () => {
                // Create some test metrics
                await SystemMetric.create({
                    metricType: 'cpu_usage',
                    value: 75,
                    unit: 'percentage',
                    source: 'system',
                    status: 'warning'
                });

                const health = await systemMonitoring.getSystemHealth();

                expect(health.success).toBe(true);
                expect(health.health).toHaveProperty('overallStatus');
                expect(health.health).toHaveProperty('metrics');
                expect(health.health).toHaveProperty('alerts');
                expect(health.health).toHaveProperty('uptime');
            });
        });

        describe('getDetailedMetrics', () => {
            it('should return detailed metrics for a specific type', async () => {
                // Create test metrics
                await SystemMetric.create({
                    metricType: 'cpu_usage',
                    value: 80,
                    unit: 'percentage',
                    source: 'system'
                });

                const result = await systemMonitoring.getDetailedMetrics('cpu_usage', 1);

                expect(result.success).toBe(true);
                expect(result.metrics).toBeDefined();
                expect(Array.isArray(result.metrics)).toBe(true);
            });

            it('should handle invalid metric type', async () => {
                const result = await systemMonitoring.getDetailedMetrics('invalid_type', 1);

                expect(result.success).toBe(true);
                expect(Array.isArray(result.metrics)).toBe(true);
                expect(result.metrics.length).toBe(0);
            });
        });
    });

    describe('Alert Management', () => {
        describe('checkAlertConditions', () => {
            it('should identify metrics requiring alerts', async () => {
                // Create critical metric
                await SystemMetric.create({
                    metricType: 'cpu_usage',
                    value: 95,
                    unit: 'percentage',
                    threshold: { warning: 70, critical: 90 },
                    source: 'system',
                    status: 'critical'
                });

                const alerts = await systemMonitoring.checkAlertConditions();

                expect(alerts.success).toBe(true);
                expect(Array.isArray(alerts.alerts)).toBe(true);
                expect(alerts.alerts.length).toBeGreaterThan(0);
                expect(alerts.alerts[0]).toHaveProperty('metricType');
                expect(alerts.alerts[0]).toHaveProperty('status');
                expect(alerts.alerts[0]).toHaveProperty('value');
            });
        });

        describe('updateAlertThresholds', () => {
            it('should update alert thresholds successfully', async () => {
                const newThresholds = {
                    cpu_usage: { warning: 75, critical: 95 },
                    memory_usage: { warning: 85, critical: 98 }
                };

                const result = await systemMonitoring.updateAlertThresholds(newThresholds);

                expect(result.success).toBe(true);
                expect(systemMonitoring.alertThresholds.cpu_usage.warning).toBe(75);
                expect(systemMonitoring.alertThresholds.cpu_usage.critical).toBe(95);
            });
        });
    });

    describe('Performance Optimization', () => {
        describe('optimizeMetricCollection', () => {
            it('should optimize collection intervals based on system load', async () => {
                const result = await systemMonitoring.optimizeMetricCollection();

                expect(result.success).toBe(true);
                expect(result.optimizations).toBeDefined();
                expect(typeof result.recommendedInterval).toBe('number');
            });
        });

        describe('cleanupOldMetrics', () => {
            it('should cleanup old metrics successfully', async () => {
                // Create old metric
                const oldMetric = new SystemMetric({
                    metricType: 'cpu_usage',
                    value: 50,
                    unit: 'percentage',
                    source: 'system',
                    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
                });
                await oldMetric.save();

                const result = await systemMonitoring.cleanupOldMetrics(30);

                expect(result.success).toBe(true);
                expect(result.deletedCount).toBeGreaterThan(0);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle metric collection errors gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Mock a method to throw an error
            jest.spyOn(systemMonitoring, 'getCPUUsage').mockRejectedValue(new Error('CPU error'));

            await systemMonitoring.collectSystemMetrics();

            expect(consoleSpy).toHaveBeenCalledWith('Error collecting system metrics:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should handle database connection errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Mock mongoose connection error
            jest.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

            await systemMonitoring.collectDatabaseMetrics();

            consoleSpy.mockRestore();
        });
    });

    describe('Configuration', () => {
        it('should have default alert thresholds', () => {
            expect(systemMonitoring.alertThresholds).toBeDefined();
            expect(systemMonitoring.alertThresholds.cpu_usage).toBeDefined();
            expect(systemMonitoring.alertThresholds.memory_usage).toBeDefined();
            expect(systemMonitoring.alertThresholds.disk_usage).toBeDefined();
        });

        it('should allow threshold customization', () => {
            const newThresholds = {
                cpu_usage: { warning: 80, critical: 95 }
            };

            systemMonitoring.alertThresholds = {
                ...systemMonitoring.alertThresholds,
                ...newThresholds
            };

            expect(systemMonitoring.alertThresholds.cpu_usage.warning).toBe(80);
            expect(systemMonitoring.alertThresholds.cpu_usage.critical).toBe(95);
        });
    });
});