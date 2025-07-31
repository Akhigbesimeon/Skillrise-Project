const mongoose = require('mongoose');
const SystemMetric = require('../../models/SystemMetric');

describe('SystemMetric Model', () => {
    afterEach(async () => {
        await SystemMetric.deleteMany({});
    });

    describe('Metric Creation', () => {
        it('should create a metric with valid data', async () => {
            const metricData = {
                metricType: 'cpu_usage',
                value: 75.5,
                unit: 'percentage',
                threshold: {
                    warning: 70,
                    critical: 90
                },
                source: 'system'
            };

            const metric = new SystemMetric(metricData);
            await metric.save();

            expect(metric.metricType).toBe('cpu_usage');
            expect(metric.value).toBe(75.5);
            expect(metric.unit).toBe('percentage');
            expect(metric.status).toBe('warning'); // Should be set based on threshold
            expect(metric.source).toBe('system');
        });

        it('should set status based on thresholds', async () => {
            const criticalMetric = new SystemMetric({
                metricType: 'memory_usage',
                value: 95,
                unit: 'percentage',
                threshold: {
                    warning: 80,
                    critical: 90
                },
                source: 'system'
            });
            await criticalMetric.save();

            expect(criticalMetric.status).toBe('critical');

            const warningMetric = new SystemMetric({
                metricType: 'memory_usage',
                value: 85,
                unit: 'percentage',
                threshold: {
                    warning: 80,
                    critical: 90
                },
                source: 'system'
            });
            await warningMetric.save();

            expect(warningMetric.status).toBe('warning');

            const healthyMetric = new SystemMetric({
                metricType: 'memory_usage',
                value: 70,
                unit: 'percentage',
                threshold: {
                    warning: 80,
                    critical: 90
                },
                source: 'system'
            });
            await healthyMetric.save();

            expect(healthyMetric.status).toBe('healthy');
        });

        it('should validate metric type', async () => {
            const invalidMetric = new SystemMetric({
                metricType: 'invalid_type',
                value: 50,
                unit: 'percentage',
                source: 'system'  
          });

            await expect(invalidMetric.save()).rejects.toThrow();
        });

        it('should require all mandatory fields', async () => {
            const incompleteMetric = new SystemMetric({
                value: 50,
                unit: 'percentage'
            });

            await expect(incompleteMetric.save()).rejects.toThrow();
        });

        it('should set default status to healthy when no threshold', async () => {
            const metric = new SystemMetric({
                metricType: 'active_users',
                value: 100,
                unit: 'count',
                source: 'application'
            });
            await metric.save();

            expect(metric.status).toBe('healthy');
        });
    });

    describe('Static Methods', () => {
        beforeEach(async () => {
            // Create test metrics
            const testMetrics = [
                {
                    metricType: 'cpu_usage',
                    value: 85,
                    unit: 'percentage',
                    threshold: { warning: 70, critical: 90 },
                    source: 'system',
                    status: 'warning'
                },
                {
                    metricType: 'memory_usage',
                    value: 95,
                    unit: 'percentage',
                    threshold: { warning: 80, critical: 90 },
                    source: 'system',
                    status: 'critical'
                },
                {
                    metricType: 'active_users',
                    value: 150,
                    unit: 'count',
                    source: 'application',
                    status: 'healthy'
                }
            ];

            await SystemMetric.insertMany(testMetrics);
        });

        describe('recordMetric', () => {
            it('should record a metric successfully', async () => {
                const metricData = {
                    metricType: 'response_time',
                    value: 250,
                    unit: 'milliseconds',
                    threshold: { warning: 500, critical: 1000 },
                    source: 'application'
                };

                const metric = await SystemMetric.recordMetric(metricData);

                expect(metric.metricType).toBe('response_time');
                expect(metric.value).toBe(250);
                expect(metric.status).toBe('healthy');
            });

            it('should trigger alert for critical metrics', async () => {
                const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

                const metricData = {
                    metricType: 'cpu_usage',
                    value: 95,
                    unit: 'percentage',
                    threshold: { warning: 70, critical: 90 },
                    source: 'system'
                };

                await SystemMetric.recordMetric(metricData);

                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('ALERT: cpu_usage is critical')
                );

                consoleSpy.mockRestore();
            });
        });

        describe('getCurrentStatus', () => {
            it('should return current system status', async () => {
                const status = await SystemMetric.getCurrentStatus();

                expect(status).toHaveProperty('overallStatus');
                expect(status).toHaveProperty('metrics');
                expect(status).toHaveProperty('statusCounts');
                expect(['healthy', 'warning', 'critical']).toContain(status.overallStatus);
            });

            it('should return critical status when critical metrics exist', async () => {
                // The beforeEach already creates a critical memory_usage metric
                const status = await SystemMetric.getCurrentStatus();

                expect(status.overallStatus).toBe('critical');
            });
        });

        describe('getMetricsHistory', () => {
            it('should return metrics history for a specific type', async () => {
                const history = await SystemMetric.getMetricsHistory('cpu_usage', 1);

                expect(Array.isArray(history)).toBe(true);
                expect(history.length).toBeGreaterThan(0);
                expect(history[0]).toHaveProperty('timestamp');
                expect(history[0]).toHaveProperty('value');
                expect(history[0]).toHaveProperty('status');
            });

            it('should return empty array for non-existent metric type', async () => {
                const history = await SystemMetric.getMetricsHistory('non_existent', 1);

                expect(Array.isArray(history)).toBe(true);
                expect(history.length).toBe(0);
            });
        });

        describe('getHealthSummary', () => {
            it('should return comprehensive health summary', async () => {
                const summary = await SystemMetric.getHealthSummary(1);

                expect(summary).toHaveProperty('uptime');
                expect(summary).toHaveProperty('avgResponseTime');
                expect(summary).toHaveProperty('maxResponseTime');
                expect(summary).toHaveProperty('alerts');
                expect(summary).toHaveProperty('metricsSummary');
                expect(summary.alerts).toHaveProperty('warning');
                expect(summary.alerts).toHaveProperty('critical');
            });

            it('should calculate uptime correctly', async () => {
                // Add response_time metrics to test uptime calculation
                await SystemMetric.create({
                    metricType: 'response_time',
                    value: 200,
                    unit: 'milliseconds',
                    source: 'application',
                    status: 'healthy'
                });

                const summary = await SystemMetric.getHealthSummary(1);

                expect(summary.uptime).toBeGreaterThanOrEqual(0);
                expect(summary.uptime).toBeLessThanOrEqual(100);
            });
        });

        describe('cleanupOldMetrics', () => {
            it('should cleanup old metrics', async () => {
                // Create an old metric
                const oldMetric = new SystemMetric({
                    metricType: 'cpu_usage',
                    value: 50,
                    unit: 'percentage',
                    source: 'system',
                    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
                });
                await oldMetric.save();

                const initialCount = await SystemMetric.countDocuments();
                const deletedCount = await SystemMetric.cleanupOldMetrics(30);

                const finalCount = await SystemMetric.countDocuments();

                expect(deletedCount).toBeGreaterThan(0);
                expect(finalCount).toBe(initialCount - deletedCount);
            });
        });
    });

    describe('Indexes and Performance', () => {
        it('should have proper indexes for efficient queries', async () => {
            const indexes = await SystemMetric.collection.getIndexes();

            expect(indexes).toHaveProperty('metricType_1_createdAt_-1');
            expect(indexes).toHaveProperty('status_1_createdAt_-1');
            expect(indexes).toHaveProperty('source_1_metricType_1_createdAt_-1');
        });
    });

    describe('TTL Index', () => {
        it('should have TTL index for automatic cleanup', async () => {
            const indexes = await SystemMetric.collection.getIndexes();
            const ttlIndex = indexes['createdAt_1'];

            expect(ttlIndex).toBeDefined();
            expect(ttlIndex.expireAfterSeconds).toBe(30 * 24 * 60 * 60); // 30 days
        });
    });

    describe('Validation', () => {
        it('should validate metric type enum', async () => {
            const validTypes = [
                'cpu_usage', 'memory_usage', 'disk_usage', 'network_io',
                'database_connections', 'response_time', 'error_rate',
                'active_users', 'concurrent_sessions', 'api_requests',
                'email_queue', 'background_jobs'
            ];

            for (const type of validTypes) {
                const metric = new SystemMetric({
                    metricType: type,
                    value: 50,
                    unit: 'count',
                    source: 'system'
                });

                await expect(metric.save()).resolves.toBeDefined();
                await metric.deleteOne();
            }
        });

        it('should validate unit enum', async () => {
            const validUnits = [
                'percentage', 'bytes', 'milliseconds', 'count',
                'requests_per_second', 'connections'
            ];

            for (const unit of validUnits) {
                const metric = new SystemMetric({
                    metricType: 'cpu_usage',
                    value: 50,
                    unit: unit,
                    source: 'system'
                });

                await expect(metric.save()).resolves.toBeDefined();
                await metric.deleteOne();
            }
        });

        it('should validate source enum', async () => {
            const validSources = ['system', 'application', 'database', 'external_service'];

            for (const source of validSources) {
                const metric = new SystemMetric({
                    metricType: 'cpu_usage',
                    value: 50,
                    unit: 'percentage',
                    source: source
                });

                await expect(metric.save()).resolves.toBeDefined();
                await metric.deleteOne();
            }
        });
    });
});