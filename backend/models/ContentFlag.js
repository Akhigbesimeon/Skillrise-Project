const mongoose = require('mongoose');

const contentFlagSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    contentType: {
        type: String,
        required: true,
        enum: ['message', 'project', 'profile', 'course', 'comment', 'mentorship_session'],
        index: true
    },
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    reason: {
        type: String,
        required: true,
        enum: [
            'spam',
            'harassment',
            'inappropriate_content',
            'hate_speech',
            'violence',
            'copyright_violation',
            'fraud',
            'impersonation',
            'other'
        ]
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'under_review', 'resolved', 'dismissed'],
        default: 'pending',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    moderatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    moderatorNotes: {
        type: String,
        maxlength: 2000
    },
    resolution: {
        type: String,
        enum: [
            'no_action',
            'warning_issued',
            'content_removed',
            'user_suspended',
            'user_banned',
            'content_edited',
            'escalated'
        ]
    },
    resolutionDate: {
        type: Date
    },
    evidence: [{
        type: {
            type: String,
            enum: ['screenshot', 'text', 'url', 'file']
        },
        content: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    relatedFlags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentFlag'
    }],
    autoDetected: {
        type: Boolean,
        default: false
    },
    severity: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
contentFlagSchema.index({ status: 1, priority: 1, createdAt: -1 });
contentFlagSchema.index({ contentType: 1, contentId: 1 });
contentFlagSchema.index({ targetUserId: 1, status: 1 });
contentFlagSchema.index({ moderatorId: 1, status: 1 });
contentFlagSchema.index({ createdAt: -1 });

// Virtual for time since reported
contentFlagSchema.virtual('timeSinceReported').get(function() {
    const now = new Date();
    const diff = now - this.createdAt;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
});

// Static method to create a flag
contentFlagSchema.statics.createFlag = async function(flagData) {
    const flag = new this(flagData);
    
    // Auto-assign priority based on reason
    if (['hate_speech', 'violence', 'harassment'].includes(flagData.reason)) {
        flag.priority = 'high';
        flag.severity = 8;
    } else if (['spam', 'fraud'].includes(flagData.reason)) {
        flag.priority = 'medium';
        flag.severity = 6;
    }
    
    await flag.save();
    return flag;
};

// Static method to get moderation queue
contentFlagSchema.statics.getModerationQueue = async function(options = {}) {
    const {
        page = 1,
        limit = 20,
        status = 'pending',
        priority = null,
        contentType = null,
        moderatorId = null
    } = options;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (contentType) query.contentType = contentType;
    if (moderatorId) query.moderatorId = moderatorId;

    const flags = await this.find(query)
        .populate('reporterId', 'fullName email')
        .populate('targetUserId', 'fullName email')
        .populate('moderatorId', 'fullName email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

    const total = await this.countDocuments(query);

    return {
        flags,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Static method to get statistics
contentFlagSchema.statics.getStatistics = async function() {
    const [
        totalFlags,
        pendingFlags,
        resolvedToday,
        flagsByReason,
        flagsByStatus,
        flagsByPriority
    ] = await Promise.all([
        this.countDocuments(),
        this.countDocuments({ status: 'pending' }),
        this.countDocuments({
            status: 'resolved',
            resolutionDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        this.aggregate([
            { $group: { _id: '$reason', count: { $sum: 1 } } }
        ]),
        this.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        this.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
    ]);

    return {
        totalFlags,
        pendingFlags,
        resolvedToday,
        flagsByReason: flagsByReason.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        flagsByStatus: flagsByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        flagsByPriority: flagsByPriority.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {})
    };
};

// Method to assign to moderator
contentFlagSchema.methods.assignToModerator = async function(moderatorId) {
    this.moderatorId = moderatorId;
    this.status = 'under_review';
    await this.save();
    return this;
};

// Method to resolve flag
contentFlagSchema.methods.resolve = async function(resolution, moderatorNotes) {
    this.status = 'resolved';
    this.resolution = resolution;
    this.moderatorNotes = moderatorNotes;
    this.resolutionDate = new Date();
    await this.save();
    return this;
};

module.exports = mongoose.model('ContentFlag', contentFlagSchema);