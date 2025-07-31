const mongoose = require('mongoose');

const systemMetricSchema = new mongoose.Schema({
    metricType: {
        type: String,
        required: true,
        enum: [
            'cpu_usage',
            'memory_usage',
            'disk_usage',
            'database_connections',
            'active_users',
            'api_requests',
            'error_rate',
            'response_time',
            'uptime',
            'storage_usage'
        ],
        index: true
    },
    value: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['percentage', 'bytes', 'count', 'milliseconds', 'seconds', 'minutes', 'hours']
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    threshold: {
        warning: Number,
        critical: Number
    },
    status: {
        type: String,
        enum: ['normal', 'warning', 'critical'],
        default: 'normal'
    }
}, {
    timestamps: false // We use timestamp field instead
});

// TTL index to automatically delete old metrics after 30 days
systemMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound indexes for efficient queries
systemMetricSchema.index({ metricType: 1, timestamp: -1 });
systemMetricSchema.index({ status: 1, timestamp: -1 });

// Static method to record a metric
systemMetricSchema.statics.recordMetric = async function(metricType, value, unit, metadata = {}) {
    const metric = new this({
        metricType,
        value,
        unit,
        metadata
    });

    // Determine status based on thresholds
    const thresholds = this.getThresholds(metricType);
    if (thresholds) {
        metric.threshold = thresholds;
        if (value >= thresholds.critical) {
            metric.status = 'critical';
        } else if (value >= thresholds.warning) {
            metric.status = 'warning';
        }
    }

    await metric.save();
    return metric;
};

// Static method to get thresholds for different metrics
systemMetricSchema.statics.getThresholds = function(metricType) {
    const thresholds = {
        cpu_usage: { warning: 70, critical: 90 },
        memory_usage: { warning: 80, critical: 95 },
        disk_usage: { warning: 85, critical: 95 },
        database_connections: { warning: 80, critical: 95 },
        error_rate: { warning: 5, critical: 10 },
        response_time: { warning: 1000, critical: 3000 }
    };
    
    return thresholds[metricType] || null;
};

// Static method to get latest metrics
systemMetricSchema.statics.getLatestMetrics = async function() {
    const metricTypes = [
        'cpu_usage',
        'memory_usage',
        'disk_usage',
        'database_connections',
        'active_users',
        'api_requests',
        'error_rate',
        'response_time'
    ];

    const latestMetrics = {};
    
    for (const type of metricTypes) {
        const metric = await this.findOne({ metricType: type })
            .sort({ timestamp: -1 })
            .lean();
        
        if (metric) {
            latestMetrics[type] = metric;
        }
    }

    return latestMetrics;
};

// Static method to get metrics over time
systemMetricSchema.statics.getMetricsOverTime = async function(metricType, timeRange = '24h') {
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
        case '1h':
            startTime = new Date(now - 60 * 60 * 1000);
            break;
        case '24h':
            startTime = new Date(now - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    return await this.find({
        metricType,
        timestamp: { $gte: startTime }
    }).sort({ timestamp: 1 }).lean();
};

// Static method to get system health summary
systemMetricSchema.statics.getHealthSummary = async function() {
    const latestMetrics = await this.getLatestMetrics();
    const criticalAlerts = await this.countDocuments({
        status: 'critical',
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });
    const warningAlerts = await this.countDocuments({
        status: 'warning',
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    // Calculate overall health score
    let healthScore = 100;
    Object.values(latestMetrics).forEach(metric => {
        if (metric.status === 'critical') healthScore -= 20;
        else if (metric.status === 'warning') healthScore -= 10;
    });

    return {
        healthScore: Math.max(0, healthScore),
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
        criticalAlerts,
        warningAlerts,
        lastUpdated: new Date(),
        metrics: latestMetrics
    };
};

// Static method to cleanup old metrics
systemMetricSchema.statics.cleanupOldMetrics = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return await this.deleteMany({
        timestamp: { $lt: cutoffDate }
    });
};

module.exports = mongoose.model('SystemMetric', systemMetricSchema);