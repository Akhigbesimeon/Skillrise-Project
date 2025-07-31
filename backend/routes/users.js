const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/avatars');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            error: {
                code: 'NO_TOKEN',
                message: 'Access token is required',
                timestamp: new Date().toISOString()
            }
        });
    }

    try {
        const jwt = require('jsonwebtoken');
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: { code: 'JWT_SECRET_MISSING', message: 'Server configuration error' } });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid or expired token',
                timestamp: new Date().toISOString()
            }
        });
    }
};

// GET /api/users/profile - Get user profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-passwordHash');
        
        if (!user) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to retrieve profile',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', 
    verifyToken,
    [
        body('fullName')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Full name must be between 2 and 100 characters'),
        body('bio')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Bio cannot exceed 500 characters'),
        body('location')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Location cannot exceed 100 characters'),
        body('phone')
            .optional()
            .matches(/^\+?[\d\s\-\(\)]+$/)
            .withMessage('Please enter a valid phone number'),
        body('timezone')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Timezone cannot exceed 100 characters'),
        body('jobTitle')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Job title cannot exceed 100 characters'),
        body('skills')
            .optional()
            .isArray()
            .withMessage('Skills must be an array'),
        body('skills.*')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Each skill must be between 1 and 50 characters'),
        body('socialLinks')
            .optional()
            .isObject()
            .withMessage('Social links must be an object'),
        body('profileCompleted')
            .optional()
            .isBoolean()
            .withMessage('Profile completed must be a boolean'),
        // Freelancer profile validations
        body('freelancerProfile.skills')
            .optional()
            .isArray()
            .withMessage('Skills must be an array'),
        body('freelancerProfile.skills.*')
            .optional()
            .trim()
            .isLength({ min: 1, max: 50 })
            .withMessage('Each skill must be between 1 and 50 characters'),
        body('freelancerProfile.experienceLevel')
            .optional()
            .isIn(['beginner', 'intermediate', 'advanced'])
            .withMessage('Experience level must be beginner, intermediate, or advanced'),
        body('freelancerProfile.hourlyRate')
            .optional()
            .isFloat({ min: 0, max: 10000 })
            .withMessage('Hourly rate must be between 0 and 10000'),
        body('freelancerProfile.portfolioUrl')
            .optional()
            .isURL()
            .withMessage('Portfolio URL must be a valid URL'),
        body('freelancerProfile.availability')
            .optional()
            .isIn(['available', 'busy', 'unavailable'])
            .withMessage('Availability must be available, busy, or unavailable'),
        // Mentor profile validations
        body('mentorProfile.expertiseAreas')
            .optional()
            .isArray()
            .withMessage('Expertise areas must be an array'),
        body('mentorProfile.expertiseAreas.*')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Each expertise area must be between 1 and 100 characters'),
        body('mentorProfile.yearsExperience')
            .optional()
            .isInt({ min: 0, max: 50 })
            .withMessage('Years of experience must be between 0 and 50'),
        body('mentorProfile.mentoringCapacity')
            .optional()
            .isInt({ min: 1, max: 20 })
            .withMessage('Mentoring capacity must be between 1 and 20'),
        body('mentorProfile.sessionRate')
            .optional()
            .isFloat({ min: 0, max: 10000 })
            .withMessage('Session rate must be between 0 and 10000'),
        body('mentorProfile.availabilitySchedule')
            .optional()
            .isObject()
            .withMessage('Availability schedule must be an object'),
        // Client profile validations
        body('clientProfile.companyName')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Company name cannot exceed 100 characters'),
        body('clientProfile.companySize')
            .optional()
            .isIn(['1-10', '11-50', '51-200', '201-500', '500+'])
            .withMessage('Invalid company size'),
        body('clientProfile.industry')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Industry cannot exceed 100 characters')
    ],
    async (req, res) => {
        try {
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: errors.array(),
                        timestamp: new Date().toISOString()
                    }
                });
            }

            const user = await User.findById(req.user.userId);
            
            if (!user) {
                return res.status(404).json({
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found',
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Update basic profile fields
            const allowedFields = ['fullName', 'bio', 'location', 'phone', 'timezone', 'jobTitle', 'skills', 'socialLinks', 'profileCompleted'];
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    user[field] = req.body[field];
                }
            });

            // Update role-specific profile data
            if (user.userType === 'freelancer' && req.body.freelancerProfile) {
                const freelancerFields = ['skills', 'experienceLevel', 'portfolioUrl', 'hourlyRate', 'availability'];
                freelancerFields.forEach(field => {
                    if (req.body.freelancerProfile[field] !== undefined) {
                        user.freelancerProfile[field] = req.body.freelancerProfile[field];
                    }
                });
            }

            if (user.userType === 'mentor' && req.body.mentorProfile) {
                const mentorFields = ['expertiseAreas', 'yearsExperience', 'mentoringCapacity', 'availabilitySchedule', 'sessionRate'];
                mentorFields.forEach(field => {
                    if (req.body.mentorProfile[field] !== undefined) {
                        user.mentorProfile[field] = req.body.mentorProfile[field];
                    }
                });
            }

            if (user.userType === 'client' && req.body.clientProfile) {
                const clientFields = ['companyName', 'companySize', 'industry'];
                clientFields.forEach(field => {
                    if (req.body.clientProfile[field] !== undefined) {
                        user.clientProfile[field] = req.body.clientProfile[field];
                    }
                });
            }

            await user.save();

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: user
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Failed to update profile',
                    timestamp: new Date().toISOString()
                }
            });
        }
    }
);

// POST /api/users/upload-avatar - Upload profile image
router.post('/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: {
                    code: 'NO_FILE',
                    message: 'No file uploaded',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const user = await User.findById(req.user.userId);
        
        if (!user) {
            // Clean up uploaded file if user not found
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Delete old avatar file if it exists
        if (user.profileImageUrl) {
            const oldFilePath = path.join(__dirname, '../uploads/avatars', path.basename(user.profileImageUrl));
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        // Update user with new avatar URL
        user.profileImageUrl = `/uploads/avatars/${req.file.filename}`;
        await user.save();

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            profileImageUrl: user.profileImageUrl
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to upload avatar',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// DELETE /api/users/account - Delete user account
router.delete('/account', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Delete avatar file if it exists
        if (user.profileImageUrl) {
            const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(user.profileImageUrl));
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }

        // Delete user account
        await User.findByIdAndDelete(req.user.userId);

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to delete account',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Dashboard Data Endpoints
router.get('/dashboard/freelancer', verifyToken, async (req, res) => {
    try {
        const User = require('../models/User');
        const Course = require('../models/Course');
        const Project = require('../models/Project');
        const UserProgress = require('../models/UserProgress');
        const Mentorship = require('../models/Mentorship');

        const userId = req.user.userId;

        // Get user's course progress
        const courseProgress = await UserProgress.find({ userId })
            .populate('courseId', 'title description category')
            .sort({ updatedAt: -1 })
            .limit(10)
            .lean();

        // Get projects the user has applied to (assuming applications stored in projects)
        const appliedProjects = await Project.find({
            'applications.freelancerId': userId
        })
        .populate('clientId', 'fullName')
        .select('title description budget status createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

        // Get user's mentorship sessions
        const mentorshipSessions = await Mentorship.find({
            $or: [{ menteeId: userId }, { mentorId: userId }]
        })
        .populate('mentorId', 'fullName')
        .populate('menteeId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

        // Calculate statistics
        const stats = {
            coursesInProgress: courseProgress.filter(p => p.completionPercentage < 100).length,
            coursesCompleted: courseProgress.filter(p => p.completionPercentage === 100).length,
            projectsApplied: appliedProjects.length,
            mentoringSessions: mentorshipSessions.length,
            totalEarnings: 0 // Placeholder - would come from actual payment records
        };

        res.json({
            success: true,
            data: {
                stats,
                courseProgress,
                appliedProjects,
                mentorshipSessions
            }
        });
    } catch (error) {
        console.error('Freelancer dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
});

router.get('/dashboard/client', verifyToken, async (req, res) => {
    try {
        const Project = require('../models/Project');
        const User = require('../models/User');

        const userId = req.user.userId;

        // Get user's posted projects
        const postedProjects = await Project.find({ clientId: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Calculate applications received
        let totalApplications = 0;
        let activeProjects = 0;
        let completedProjects = 0;

        postedProjects.forEach(project => {
            if (project.applications) {
                totalApplications += project.applications.length;
            }
            if (project.status === 'active') activeProjects++;
            if (project.status === 'completed') completedProjects++;
        });

        // Get recent applicants
        const recentApplications = [];
        for (const project of postedProjects.slice(0, 5)) {
            if (project.applications && project.applications.length > 0) {
                for (const app of project.applications.slice(-3)) {
                    try {
                        const freelancer = await User.findById(app.freelancerId).select('fullName profileImageUrl').lean();
                        if (freelancer) {
                            recentApplications.push({
                                freelancer,
                                project: { title: project.title, _id: project._id },
                                appliedAt: app.appliedAt || project.createdAt,
                                status: app.status || 'pending'
                            });
                        }
                    } catch (err) {
                        console.error('Error fetching freelancer:', err);
                    }
                }
            }
        }

        // Sort recent applications by date
        recentApplications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        const stats = {
            projectsPosted: postedProjects.length,
            activeProjects,
            completedProjects,
            totalApplications,
            totalSpent: 0 // Placeholder - would come from actual payment records
        };

        res.json({
            success: true,
            data: {
                stats,
                postedProjects,
                recentApplications: recentApplications.slice(0, 10)
            }
        });
    } catch (error) {
        console.error('Client dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
});

router.get('/dashboard/mentor', verifyToken, async (req, res) => {
    try {
        const Mentorship = require('../models/Mentorship');
        const User = require('../models/User');

        const userId = req.user.userId;

        // Get mentorship sessions where user is the mentor
        const mentoringSessions = await Mentorship.find({ mentorId: userId })
            .populate('menteeId', 'fullName profileImageUrl')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Get unique mentees
        const uniqueMentees = [...new Map(
            mentoringSessions.map(session => [session.menteeId._id.toString(), session.menteeId])
        ).values()];

        // Calculate statistics
        const stats = {
            totalMentees: uniqueMentees.length,
            activeSessions: mentoringSessions.filter(s => s.status === 'active').length,
            completedSessions: mentoringSessions.filter(s => s.status === 'completed').length,
            totalEarnings: 0, // Placeholder - would come from actual payment records
            rating: 4.8 // Placeholder - would come from actual reviews
        };

        // Get recent mentee progress (placeholder data)
        const menteeProgress = uniqueMentees.slice(0, 5).map(mentee => ({
            mentee,
            progress: Math.floor(Math.random() * 100), // Placeholder
            lastSession: mentoringSessions.find(s => s.menteeId._id.toString() === mentee._id.toString())?.createdAt
        }));

        res.json({
            success: true,
            data: {
                stats,
                mentoringSessions,
                menteeProgress,
                uniqueMentees
            }
        });
    } catch (error) {
        console.error('Mentor dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
});

module.exports = router;