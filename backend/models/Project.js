const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    requiredSkills: [{
        type: String,
        required: true,
        trim: true
    }],
    budgetMin: {
        type: Number,
        required: true,
        min: 0
    },
    budgetMax: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function(value) {
                return value >= this.budgetMin;
            },
            message: 'Budget maximum must be greater than or equal to minimum'
        }
    },
    deadline: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value > new Date();
            },
            message: 'Deadline must be in the future'
        }
    },
    status: {
        type: String,
        enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
        default: 'open'
    },
    assignedFreelancerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    applications: [{
        freelancerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        coverLetter: {
            type: String,
            required: true,
            maxlength: 1000
        },
        proposedRate: {
            type: Number,
            required: true,
            min: 0
        },
        estimatedDuration: {
            type: String,
            required: true,
            trim: true
        },
        appliedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        }
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
projectSchema.index({ clientId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ requiredSkills: 1 });
projectSchema.index({ createdAt: -1 });

// Virtual for application count
projectSchema.virtual('applicationCount').get(function() {
    return this.applications.length;
});

// Method to check if user can apply
projectSchema.methods.canUserApply = function(userId) {
    // Check if project is open
    if (this.status !== 'open') {
        return false;
    }
    
    // Check if user is not the client
    if (this.clientId.toString() === userId.toString()) {
        return false;
    }
    
    // Check if user hasn't already applied
    const hasApplied = this.applications.some(app => 
        app.freelancerId.toString() === userId.toString()
    );
    
    return !hasApplied;
};

// Method to get application by freelancer
projectSchema.methods.getApplicationByFreelancer = function(freelancerId) {
    return this.applications.find(app => 
        app.freelancerId.toString() === freelancerId.toString()
    );
};

// Static method to find projects by skills
projectSchema.statics.findBySkills = function(skills, options = {}) {
    const query = {
        status: 'open',
        requiredSkills: { $in: skills }
    };
    
    return this.find(query)
        .populate('clientId', 'fullName clientProfile.companyName clientProfile.rating')
        .sort({ createdAt: -1 })
        .limit(options.limit || 20)
        .skip(options.skip || 0);
};

module.exports = mongoose.model('Project', projectSchema);