const mongoose = require('mongoose');

const mentorshipSchema = new mongoose.Schema({
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Mentor ID is required']
    },
    menteeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Mentee ID is required']
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'active', 'completed', 'cancelled'],
            message: 'Status must be pending, active, completed, or cancelled'
        },
        default: 'pending'
    },
    focusAreas: [{
        type: String,
        trim: true,
        required: [true, 'At least one focus area is required']
    }],
    learningGoals: {
        type: String,
        maxlength: [1000, 'Learning goals cannot exceed 1000 characters'],
        default: ''
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    sessions: [{
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            default: () => new mongoose.Types.ObjectId()
        },
        scheduledDate: {
            type: Date,
            required: [true, 'Session date is required']
        },
        duration: {
            type: Number,
            min: [15, 'Session duration must be at least 15 minutes'],
            max: [180, 'Session duration cannot exceed 180 minutes'],
            default: 60
        },
        status: {
            type: String,
            enum: ['scheduled', 'completed', 'cancelled'],
            default: 'scheduled'
        },
        notes: {
            type: String,
            maxlength: [1000, 'Session notes cannot exceed 1000 characters'],
            default: ''
        },
        feedback: {
            mentorFeedback: {
                type: String,
                maxlength: [500, 'Mentor feedback cannot exceed 500 characters'],
                default: ''
            },
            menteeFeedback: {
                type: String,
                maxlength: [500, 'Mentee feedback cannot exceed 500 characters'],
                default: ''
            },
            mentorRating: {
                type: Number,
                min: [1, 'Rating must be at least 1'],
                max: [5, 'Rating cannot exceed 5'],
                default: null
            },
            menteeRating: {
                type: Number,
                min: [1, 'Rating must be at least 1'],
                max: [5, 'Rating cannot exceed 5'],
                default: null
            }
        }
    }],
    sessionCount: {
        type: Number,
        min: [0, 'Session count cannot be negative'],
        default: 0
    },
    // Request details
    requestMessage: {
        type: String,
        maxlength: [500, 'Request message cannot exceed 500 characters'],
        default: ''
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    respondedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for efficient queries
mentorshipSchema.index({ mentorId: 1, status: 1 });
mentorshipSchema.index({ menteeId: 1, status: 1 });
mentorshipSchema.index({ status: 1 });
mentorshipSchema.index({ focusAreas: 1 });

// Compound index for mentor availability queries
mentorshipSchema.index({ mentorId: 1, status: 1, createdAt: -1 });

// Virtual for active session count
mentorshipSchema.virtual('activeSessionCount').get(function() {
    return this.sessions.filter(session => session.status === 'scheduled').length;
});

// Static method to find pending requests for a mentor
mentorshipSchema.statics.findPendingRequestsForMentor = function(mentorId) {
    return this.find({ 
        mentorId: mentorId, 
        status: 'pending' 
    }).populate('menteeId', 'fullName email freelancerProfile.skills freelancerProfile.experienceLevel');
};

// Static method to find active mentorships for a user
mentorshipSchema.statics.findActiveMentorships = function(userId) {
    return this.find({
        $or: [
            { mentorId: userId, status: 'active' },
            { menteeId: userId, status: 'active' }
        ]
    }).populate('mentorId menteeId', 'fullName email mentorProfile.expertiseAreas freelancerProfile.skills');
};

// Static method to count active mentees for a mentor
mentorshipSchema.statics.countActiveMenteesForMentor = function(mentorId) {
    return this.countDocuments({ 
        mentorId: mentorId, 
        status: 'active' 
    });
};

// Instance method to add a session
mentorshipSchema.methods.addSession = function(sessionData) {
    this.sessions.push(sessionData);
    this.sessionCount = this.sessions.length;
    return this.save();
};

// Instance method to update session status
mentorshipSchema.methods.updateSessionStatus = function(sessionId, status, notes = '') {
    const session = this.sessions.id(sessionId);
    if (session) {
        session.status = status;
        if (notes) session.notes = notes;
        return this.save();
    }
    throw new Error('Session not found');
};

// Instance method to add session feedback
mentorshipSchema.methods.addSessionFeedback = function(sessionId, feedback, userType) {
    const session = this.sessions.id(sessionId);
    if (session) {
        if (userType === 'mentor') {
            session.feedback.mentorFeedback = feedback.feedback || '';
            session.feedback.mentorRating = feedback.rating || null;
        } else if (userType === 'mentee') {
            session.feedback.menteeFeedback = feedback.feedback || '';
            session.feedback.menteeRating = feedback.rating || null;
        }
        return this.save();
    }
    throw new Error('Session not found');
};

module.exports = mongoose.model('Mentorship', mentorshipSchema);