const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const UserProgress = require('../models/UserProgress');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Get courses with filtering and search
router.get('/', async (req, res) => {
    try {
        const {
            search,
            category,
            difficultyLevel,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { isActive: true };
        
        if (category) {
            filter.category = category;
        }
        
        if (difficultyLevel) {
            filter.difficultyLevel = difficultyLevel;
        }

        // Build query
        let query = Course.find(filter);

        // Add text search if provided
        if (search) {
            query = Course.find({
                ...filter,
                $text: { $search: search }
            });
        }

        // Add sorting
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
        query = query.sort(sortOptions);

        // Add pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        query = query.skip(skip).limit(parseInt(limit));

        // Execute query
        const courses = await query.populate('createdBy', 'fullName').exec();
        
        // Get total count for pagination
        const totalCourses = await Course.countDocuments(search ? 
            { ...filter, $text: { $search: search } } : 
            filter
        );

        res.json({
            courses,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCourses / parseInt(limit)),
                totalCourses,
                hasNext: skip + courses.length < totalCourses,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch courses',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get course details by ID
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const course = await Course.findById(id)
            .populate('createdBy', 'fullName')
            .exec();

        if (!course) {
            return res.status(404).json({
                error: {
                    code: 'COURSE_NOT_FOUND',
                    message: 'Course not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (!course.isActive) {
            return res.status(404).json({
                error: {
                    code: 'COURSE_INACTIVE',
                    message: 'Course is not available',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // If user is authenticated, include their progress
        let userProgress = null;
        if (req.user) {
            userProgress = await UserProgress.findOne({
                userId: req.user.id,
                courseId: id
            });
        }

        res.json({
            course,
            userProgress
        });
    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch course details',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Enroll in a course
router.post('/:id/enroll', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if course exists and is active
        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({
                error: {
                    code: 'COURSE_NOT_FOUND',
                    message: 'Course not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (!course.isActive) {
            return res.status(400).json({
                error: {
                    code: 'COURSE_INACTIVE',
                    message: 'Course is not available for enrollment',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Check if user is already enrolled
        const existingProgress = await UserProgress.findOne({
            userId,
            courseId: id
        });

        if (existingProgress) {
            return res.status(400).json({
                error: {
                    code: 'ALREADY_ENROLLED',
                    message: 'User is already enrolled in this course',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Create initial module progress entries
        const moduleProgress = course.modules.map(module => ({
            moduleId: module.moduleId,
            status: 'not_started'
        }));

        // Create user progress record
        const userProgress = new UserProgress({
            userId,
            courseId: id,
            moduleProgress,
            status: 'enrolled'
        });

        await userProgress.save();

        // Update course enrollment count
        await Course.findByIdAndUpdate(id, {
            $inc: { enrollmentCount: 1 }
        });

        res.status(201).json({
            message: 'Successfully enrolled in course',
            enrollment: userProgress
        });
    } catch (error) {
        console.error('Error enrolling in course:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to enroll in course',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get course categories for filtering
router.get('/meta/categories', async (req, res) => {
    try {
        const categories = await Course.distinct('category', { isActive: true });
        const difficultyLevels = ['beginner', 'intermediate', 'advanced'];
        
        res.json({
            categories,
            difficultyLevels
        });
    } catch (error) {
        console.error('Error fetching course categories:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch course categories',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get user's progress for a specific course
router.get('/:id/progress', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const userProgress = await UserProgress.findOne({
            userId,
            courseId: id
        }).populate('courseId', 'title modules');

        if (!userProgress) {
            return res.status(404).json({
                error: {
                    code: 'PROGRESS_NOT_FOUND',
                    message: 'User is not enrolled in this course',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({ userProgress });
    } catch (error) {
        console.error('Error fetching course progress:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to fetch course progress',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Mark a module as complete or update its status
router.post('/:id/modules/:moduleId/complete', authenticateToken, async (req, res) => {
    try {
        const { id, moduleId } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        // Validate status
        const validStatuses = ['not_started', 'in_progress', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Invalid module status',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find user progress
        const userProgress = await UserProgress.findOne({
            userId,
            courseId: id
        });

        if (!userProgress) {
            return res.status(404).json({
                error: {
                    code: 'PROGRESS_NOT_FOUND',
                    message: 'User is not enrolled in this course',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find the module progress entry
        const moduleProgressIndex = userProgress.moduleProgress.findIndex(
            mp => mp.moduleId === moduleId
        );

        if (moduleProgressIndex === -1) {
            return res.status(404).json({
                error: {
                    code: 'MODULE_NOT_FOUND',
                    message: 'Module not found in course',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Update module progress
        const moduleProgress = userProgress.moduleProgress[moduleProgressIndex];
        const now = new Date();

        // Update status and timestamps
        if (status === 'in_progress' && moduleProgress.status === 'not_started') {
            moduleProgress.startedAt = now;
        }
        
        if (status === 'completed' && moduleProgress.status !== 'completed') {
            moduleProgress.completedAt = now;
        }

        moduleProgress.status = status;

        // Update overall progress status
        if (status === 'in_progress' && userProgress.status === 'enrolled') {
            userProgress.status = 'in_progress';
        }

        // Calculate overall progress percentage
        const completedModules = userProgress.moduleProgress.filter(mp => mp.status === 'completed').length;
        const totalModules = userProgress.moduleProgress.length;
        userProgress.overallProgress = Math.round((completedModules / totalModules) * 100);

        // Check if course is completed
        if (completedModules === totalModules) {
            userProgress.status = 'completed';
            userProgress.completedAt = now;
            
            // Update course completion count
            await Course.findByIdAndUpdate(id, {
                $inc: { completionCount: 1 }
            });

            // Auto-generate certificate if not already generated
            if (!userProgress.certificateId) {
                try {
                    const certificateService = require('../services/certificateService');
                    const User = require('../models/User');
                    
                    const [user, course] = await Promise.all([
                        User.findById(userId),
                        Course.findById(id)
                    ]);

                    if (user && course) {
                        const certificateData = await certificateService.generateCertificate(user, course, userProgress);
                        
                        userProgress.certificateId = certificateData.certificateId;
                        userProgress.certificateUrl = certificateData.certificateUrl;
                        userProgress.certificateGeneratedAt = new Date();
                        userProgress.certificateIssued = true;
                    }
                } catch (certError) {
                    console.error('Error auto-generating certificate:', certError);
                    // Don't fail the module completion if certificate generation fails
                }
            }
        }

        await userProgress.save();

        res.json({
            message: 'Module status updated successfully',
            userProgress
        });
    } catch (error) {
        console.error('Error updating module status:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to update module status',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Submit assessment for a module
router.post('/:id/modules/:moduleId/assessment', authenticateToken, async (req, res) => {
    try {
        const { id, moduleId } = req.params;
        const { answers, score } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!Array.isArray(answers) || typeof score !== 'number') {
            return res.status(400).json({
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Invalid assessment data',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find course and module
        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({
                error: {
                    code: 'COURSE_NOT_FOUND',
                    message: 'Course not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const module = course.modules.find(m => m.moduleId === moduleId);
        if (!module || !module.assessment) {
            return res.status(404).json({
                error: {
                    code: 'ASSESSMENT_NOT_FOUND',
                    message: 'Assessment not found for this module',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find user progress
        const userProgress = await UserProgress.findOne({
            userId,
            courseId: id
        });

        if (!userProgress) {
            return res.status(404).json({
                error: {
                    code: 'PROGRESS_NOT_FOUND',
                    message: 'User is not enrolled in this course',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find module progress
        const moduleProgressIndex = userProgress.moduleProgress.findIndex(
            mp => mp.moduleId === moduleId
        );

        if (moduleProgressIndex === -1) {
            return res.status(404).json({
                error: {
                    code: 'MODULE_NOT_FOUND',
                    message: 'Module not found in course',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const moduleProgress = userProgress.moduleProgress[moduleProgressIndex];
        const now = new Date();

        // Update assessment results
        moduleProgress.assessmentScore = score;
        moduleProgress.attempts = (moduleProgress.attempts || 0) + 1;

        // Check if assessment passed
        const passed = score >= module.assessment.passingScore;
        if (passed) {
            moduleProgress.status = 'completed';
            moduleProgress.completedAt = now;
        }

        // Update overall progress
        const completedModules = userProgress.moduleProgress.filter(mp => mp.status === 'completed').length;
        const totalModules = userProgress.moduleProgress.length;
        userProgress.overallProgress = Math.round((completedModules / totalModules) * 100);

        // Check if course is completed
        if (completedModules === totalModules) {
            userProgress.status = 'completed';
            userProgress.completedAt = now;
            
            // Update course completion count
            await Course.findByIdAndUpdate(id, {
                $inc: { completionCount: 1 }
            });

            // Auto-generate certificate if not already generated
            if (!userProgress.certificateId) {
                try {
                    const certificateService = require('../services/certificateService');
                    const User = require('../models/User');
                    
                    const [user, course] = await Promise.all([
                        User.findById(userId),
                        Course.findById(id)
                    ]);

                    if (user && course) {
                        const certificateData = await certificateService.generateCertificate(user, course, userProgress);
                        
                        userProgress.certificateId = certificateData.certificateId;
                        userProgress.certificateUrl = certificateData.certificateUrl;
                        userProgress.certificateGeneratedAt = new Date();
                        userProgress.certificateIssued = true;
                    }
                } catch (certError) {
                    console.error('Error auto-generating certificate:', certError);
                    // Don't fail the module completion if certificate generation fails
                }
            }
        }

        await userProgress.save();

        res.json({
            message: 'Assessment submitted successfully',
            userProgress,
            passed,
            score
        });
    } catch (error) {
        console.error('Error submitting assessment:', error);
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: 'Failed to submit assessment',
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router;