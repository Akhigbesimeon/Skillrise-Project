const express = require('express');
const router = express.Router();
const certificateService = require('../services/certificateService');
const { authenticateToken: auth } = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const UserProgress = require('../models/UserProgress');

/**
 * @route   POST /api/certificates/generate
 * @desc    Generate certificate for completed course
 * @access  Private
 */
router.post('/generate', auth, async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required'
            });
        }

        // Get user, course, and progress data
        const [user, course, userProgress] = await Promise.all([
            User.findById(userId),
            Course.findById(courseId),
            UserProgress.findOne({ userId, courseId })
        ]);

        // Validate data exists
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        if (!userProgress) {
            return res.status(404).json({
                success: false,
                message: 'Course progress not found'
            });
        }

        // Check if course is completed
        if (userProgress.overallProgress < 100) {
            return res.status(400).json({
                success: false,
                message: 'Course must be completed to generate certificate'
            });
        }

        // Check if certificate already exists
        if (userProgress.certificateId) {
            return res.status(400).json({
                success: false,
                message: 'Certificate already generated for this course',
                certificateId: userProgress.certificateId
            });
        }

        // Generate certificate
        const certificateData = await certificateService.generateCertificate(user, course, userProgress);

        // Update user progress with certificate info
        userProgress.certificateId = certificateData.certificateId;
        userProgress.certificateUrl = certificateData.certificateUrl;
        userProgress.certificateGeneratedAt = new Date();
        await userProgress.save();

        res.json({
            success: true,
            message: 'Certificate generated successfully',
            data: certificateData
        });

    } catch (error) {
        console.error('Error generating certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating certificate'
        });
    }
});

/**
 * @route   GET /api/certificates/:certificateId/download
 * @desc    Download certificate by ID
 * @access  Public
 */
router.get('/:certificateId/download', async (req, res) => {
    try {
        const { certificateId } = req.params;

        // Get certificate data
        const certificateData = await certificateService.getCertificateById(certificateId);

        if (!certificateData) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        // Set headers for HTML response
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `inline; filename="certificate-${certificateId}.html"`);

        // Send certificate HTML
        res.send(certificateData.certificateHtml);

    } catch (error) {
        console.error('Error downloading certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while downloading certificate'
        });
    }
});

/**
 * @route   POST /api/certificates/verify
 * @desc    Verify certificate using verification code
 * @access  Public
 */
router.post('/verify', async (req, res) => {
    try {
        const { verificationCode } = req.body;

        // Validate verification code
        if (!verificationCode) {
            return res.status(400).json({
                success: false,
                message: 'Verification code is required'
            });
        }

        // Verify certificate
        const certificateData = await certificateService.verifyCertificate(verificationCode);

        if (!certificateData) {
            return res.status(404).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        res.json({
            success: true,
            message: 'Certificate verified successfully',
            data: certificateData
        });

    } catch (error) {
        console.error('Error verifying certificate:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while verifying certificate'
        });
    }
});

/**
 * @route   GET /api/certificates/user/:userId
 * @desc    Get all certificates for a user
 * @access  Private (Admin or own certificates)
 */
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;

        // Check if user is requesting their own certificates or is admin
        if (userId !== requestingUserId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get all completed courses with certificates for the user
        const userProgressRecords = await UserProgress.find({
            userId,
            overallProgress: 100,
            certificateId: { $exists: true, $ne: null }
        }).populate('courseId', 'title category estimatedDuration');

        const certificates = userProgressRecords.map(progress => ({
            certificateId: progress.certificateId,
            certificateUrl: progress.certificateUrl,
            courseName: progress.courseId.title,
            courseCategory: progress.courseId.category,
            courseDuration: progress.courseId.estimatedDuration,
            completionDate: progress.completedAt,
            certificateGeneratedAt: progress.certificateGeneratedAt
        }));

        res.json({
            success: true,
            message: 'Certificates retrieved successfully',
            data: certificates
        });

    } catch (error) {
        console.error('Error retrieving user certificates:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while retrieving certificates'
        });
    }
});

module.exports = router;