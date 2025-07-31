const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    userType: {
        type: String,
        required: [true, 'User type is required'],
        enum: {
            values: ['freelancer', 'mentor', 'client', 'admin'],
            message: 'User type must be freelancer, mentor, client, or admin'
        }
    },
    profileImageUrl: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        default: ''
    },
    location: {
        type: String,
        maxlength: [100, 'Location cannot exceed 100 characters'],
        default: ''
    },
    phone: {
        type: String,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
        default: ''
    },
    timezone: {
        type: String,
        default: ''
    },
    jobTitle: {
        type: String,
        maxlength: [100, 'Job title cannot exceed 100 characters'],
        default: ''
    },
    skills: [{
        type: String,
        trim: true
    }],
    socialLinks: {
        linkedin: {
            type: String,
            default: ''
        },
        github: {
            type: String,
            default: ''  
        },
        twitter: {
            type: String,
            default: ''
        },
        website: {
            type: String,
            default: ''
        }
    },
    profileCompleted: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    
    // Embedded profile data based on user type
    freelancerProfile: {
        skills: [{
            type: String,
            trim: true
        }],
        experienceLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        },
        portfolioUrl: {
            type: String,
            default: ''
        },
        hourlyRate: {
            type: Number,
            min: [0, 'Hourly rate cannot be negative'],
            default: 0
        },
        availability: {
            type: String,
            default: 'available'
        },
        certifications: [{
            courseId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Course'
            },
            courseName: String,
            issuedDate: Date,
            certificateUrl: String
        }]
    },
    
    mentorProfile: {
        expertiseAreas: [{
            type: String,
            trim: true
        }],
        yearsExperience: {
            type: Number,
            min: [0, 'Years of experience cannot be negative'],
            default: 0
        },
        mentoringCapacity: {
            type: Number,
            min: [1, 'Mentoring capacity must be at least 1'],
            max: [20, 'Mentoring capacity cannot exceed 20'],
            default: 5
        },
        availabilitySchedule: {
            monday: [String],
            tuesday: [String],
            wednesday: [String],
            thursday: [String],
            friday: [String],
            saturday: [String],
            sunday: [String]
        },
        sessionRate: {
            type: Number,
            min: [0, 'Session rate cannot be negative'],
            default: 0
        },
        rating: {
            type: Number,
            min: [0, 'Rating cannot be negative'],
            max: [5, 'Rating cannot exceed 5'],
            default: 0
        },
        totalMentees: {
            type: Number,
            min: [0, 'Total mentees cannot be negative'],
            default: 0
        }
    },
    
    clientProfile: {
        companyName: {
            type: String,
            maxlength: [100, 'Company name cannot exceed 100 characters'],
            default: ''
        },
        companySize: {
            type: String,
            enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
            default: '1-10'
        },
        industry: {
            type: String,
            maxlength: [100, 'Industry cannot exceed 100 characters'],
            default: ''
        },
        projectsPosted: {
            type: Number,
            min: [0, 'Projects posted cannot be negative'],
            default: 0
        },
        rating: {
            type: Number,
            min: [0, 'Rating cannot be negative'],
            max: [5, 'Rating cannot exceed 5'],
            default: 0
        }
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.passwordHash;
            delete ret.emailVerificationToken;
            delete ret.passwordResetToken;
            delete ret.__v;
            return ret;
        }
    }
});

// Index for user type queries
userSchema.index({ userType: 1 });

// Index for verification status
userSchema.index({ isVerified: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('passwordHash')) return next();
    
    try {
        // Hash password with cost of 12
        const saltRounds = 12;
        this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.passwordHash);
    } catch (error) {
        throw error;
    }
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = token;
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    return token;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    this.passwordResetToken = token;
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    return token;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Static method to find verified users
userSchema.statics.findVerifiedUsers = function() {
    return this.find({ isVerified: true, isActive: true });
};

module.exports = mongoose.model('User', userSchema);