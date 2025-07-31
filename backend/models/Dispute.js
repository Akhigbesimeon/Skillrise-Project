const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
    disputeId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'project_payment',
            'project_quality',
            'project_deadline',
            'mentorship_session',
            'course_content',
            'user_behavior',
            'platform_issue',
            'other'
        ],
        index: true
    },
    status: {
        type: String,
        enum: ['open', 'under_review', 'mediation', 'resolved', 'closed'],
        default: 'open',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    initiatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    respondentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    mediatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    relatedEntityType: {
        type: String,
        enum: ['project', 'mentorship', 'course', 'message', 'user'],
        required: true
    },
    relatedEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    evidence: [{
        type: {
            type: String,
            enum: ['text', 'file', 'screenshot', 'link', 'message_thread']
        },
        content: String,
        fileUrl: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    timeline: [{
        action: {
            type: String,
            enum: [
                'dispute_created',
                'response_submitted',
                'evidence_added',
                'mediator_assigned',
                'mediation_started',
                'resolution_proposed',
                'resolution_accepted',
                'resolution_rejected',
                'dispute_escalated',
                'dispute_resolved',
                'dispute_closed'
            ]
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        description: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    resolution: {
        type: {
            type: String,
            enum: [
                'favor_initiator',
                'favor_respondent',
                'compromise',
                'no_fault',
                'escalated',
                'withdrawn'
            ]
        },
        description: String,
        compensationAmount: Number,
        compensationRecipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        actionRequired: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            action: String,
            deadline: Date,
            completed: {
                type: Boolean,
                default: false
            }
        }],
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: Date
    },
    communication: [{
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            required: true,
            maxlength: 1000
        },
        isPrivate: {
            type: Boolean,
            default: false
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    deadlines: {
        responseDeadline: Date,
        mediationDeadline: Date,
        resolutionDeadline: Date
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
disputeSchema.index({ status: 1, priority: 1, createdAt: -1 });
disputeSchema.index({ initiatorId: 1, status: 1 });
disputeSchema.index({ respondentId: 1, status: 1 });
disputeSchema.index({ mediatorId: 1, status: 1 });
disputeSchema.index({ type: 1, status: 1 });
disputeSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });

// Virtual for dispute age
disputeSchema.virtual('ageInDays').get(function() {
    const now = new Date();
    const diff = now - this.createdAt;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate dispute ID
disputeSchema.pre('save', async function(next) {
    if (this.isNew && !this.disputeId) {
        const count = await this.constructor.countDocuments();
        this.disputeId = `DSP-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;
    }
    next();
});

// Static method to create dispute
disputeSchema.statics.createDispute = async function(disputeData) {
    const dispute = new this(disputeData);
    
    // Set initial timeline entry
    dispute.timeline.push({
        action: 'dispute_created',
        performedBy: disputeData.initiatorId,
        description: 'Dispute was created',
        timestamp: new Date()
    });

    // Set deadlines
    const now = new Date();
    dispute.deadlines = {
        responseDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        mediationDeadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
        resolutionDeadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    await dispute.save();
    return dispute;
};

// Static method to get disputes for mediation
disputeSchema.statics.getMediationQueue = async function(options = {}) {
    const {
        page = 1,
        limit = 20,
        status = null,
        priority = null,
        type = null,
        mediatorId = null
    } = options;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (type) query.type = type;
    if (mediatorId) query.mediatorId = mediatorId;

    const disputes = await this.find(query)
        .populate('initiatorId', 'fullName email')
        .populate('respondentId', 'fullName email')
        .populate('mediatorId', 'fullName email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

    const total = await this.countDocuments(query);

    return {
        disputes,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

// Static method to get dispute statistics
disputeSchema.statics.getStatistics = async function() {
    const [
        totalDisputes,
        openDisputes,
        resolvedToday,
        disputesByType,
        disputesByStatus,
        averageResolutionTime
    ] = await Promise.all([
        this.countDocuments(),
        this.countDocuments({ status: { $in: ['open', 'under_review', 'mediation'] } }),
        this.countDocuments({
            status: 'resolved',
            'resolution.resolvedAt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        this.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        this.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        this.aggregate([
            {
                $match: {
                    status: 'resolved',
                    'resolution.resolvedAt': { $exists: true }
                }
            },
            {
                $project: {
                    resolutionTime: {
                        $subtract: ['$resolution.resolvedAt', '$createdAt']
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    averageTime: { $avg: '$resolutionTime' }
                }
            }
        ])
    ]);

    return {
        totalDisputes,
        openDisputes,
        resolvedToday,
        disputesByType: disputesByType.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        disputesByStatus: disputesByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        averageResolutionTime: averageResolutionTime[0]?.averageTime || 0
    };
};

// Method to add timeline entry
disputeSchema.methods.addTimelineEntry = function(action, performedBy, description, metadata = {}) {
    this.timeline.push({
        action,
        performedBy,
        description,
        timestamp: new Date(),
        metadata
    });
    return this.save();
};

// Method to assign mediator
disputeSchema.methods.assignMediator = function(mediatorId) {
    this.mediatorId = mediatorId;
    this.status = 'mediation';
    return this.addTimelineEntry(
        'mediator_assigned',
        mediatorId,
        'Mediator assigned to dispute'
    );
};

// Method to resolve dispute
disputeSchema.methods.resolveDispute = function(resolution, resolvedBy) {
    this.status = 'resolved';
    this.resolution = {
        ...resolution,
        resolvedBy,
        resolvedAt: new Date()
    };
    
    return this.addTimelineEntry(
        'dispute_resolved',
        resolvedBy,
        `Dispute resolved: ${resolution.type}`
    );
};

// Method to add communication
disputeSchema.methods.addCommunication = function(senderId, message, isPrivate = false) {
    this.communication.push({
        senderId,
        message,
        isPrivate,
        timestamp: new Date()
    });
    return this.save();
};

module.exports = mongoose.model('Dispute', disputeSchema);