const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');
const crypto = require('crypto');

const router = express.Router();

// Registration endpoint with validation
router.post('/register', [
    // Validation middleware
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),
    body('userType')
        .isIn(['freelancer', 'mentor', 'client'])
        .withMessage('User type must be freelancer, mentor, or client')
], async (req, res) => {
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

        const { email, password, fullName, userType } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: {
                    code: 'USER_EXISTS',
                    message: 'A user with this email address already exists',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Create new user
        const user = new User({
            email,
            passwordHash: password, // Will be hashed by pre-save middleware
            fullName,
            userType
        });

        // Generate email verification token
        const verificationToken = user.generateEmailVerificationToken();

        // Save user to database
        await user.save();

        // Send verification email
        try {
            await emailService.sendVerificationEmail(email, fullName, verificationToken);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Don't fail registration if email fails, just log the error
        }

        // Return success response (without sensitive data)
        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                isVerified: user.isVerified
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            return res.status(409).json({
                error: {
                    code: 'DUPLICATE_EMAIL',
                    message: 'Email address is already registered',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Registration failed. Please try again.',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Login endpoint with validation
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], async (req, res) => {
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

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                error: {
                    code: 'ACCOUNT_DEACTIVATED',
                    message: 'Your account has been deactivated. Please contact support.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Email verification check disabled for easier development
        // if (!user.isVerified) {
        //     return res.status(401).json({
        //         error: {
        //             code: 'EMAIL_NOT_VERIFIED',
        //             message: 'Please verify your email address before logging in.',
        //             timestamp: new Date().toISOString()
        //         }
        //     });
        // }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                userType: user.userType 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { 
                userId: user._id, 
                tokenType: 'refresh' 
            },
            process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
            { expiresIn: '7d' }
        );

        // Return success response
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                isVerified: user.isVerified,
                profileImageUrl: user.profileImageUrl
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900 // 15 minutes in seconds
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Login failed. Please try again.',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    // For JWT-based auth, logout is handled client-side by removing tokens
    // In a production system, you might want to maintain a blacklist of tokens
    res.status(200).json({
        message: 'Logout successful',
        timestamp: new Date().toISOString()
    });
});

// Password reset request endpoint
router.post('/reset-password', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
], async (req, res) => {
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

        const { email } = req.body;

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent.',
                timestamp: new Date().toISOString()
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent.',
                timestamp: new Date().toISOString()
            });
        }

        // Generate password reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Send password reset email
        try {
            await emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // Reset the token if email fails
            user.passwordResetToken = null;
            user.passwordResetExpires = null;
            await user.save({ validateBeforeSave: false });
            
            return res.status(500).json({
                error: {
                    code: 'EMAIL_SEND_FAILED',
                    message: 'Failed to send password reset email. Please try again.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent.',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Password reset request failed. Please try again.',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Password reset confirmation endpoint
router.post('/reset-password/confirm', [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
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

        const { token, password } = req.body;

        // Find user with matching reset token
        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired password reset token',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                error: {
                    code: 'ACCOUNT_DEACTIVATED',
                    message: 'Your account has been deactivated. Please contact support.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Update password and clear reset token
        user.passwordHash = password; // Will be hashed by pre-save middleware
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        res.status(200).json({
            message: 'Password has been reset successfully. You can now log in with your new password.',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Password reset confirmation error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Password reset failed. Please try again.',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Verification token is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find user with matching verification token
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired verification token',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Verify the user
        user.isVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            message: 'Email verified successfully. You can now log in to your account.',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                isVerified: user.isVerified
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Email verification failed. Please try again.',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Token validation endpoint
// Token validation endpoint
router.get('/validate', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Authorization token is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify JWT token
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: { code: 'JWT_SECRET_MISSING', message: 'Server configuration error' } });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user to ensure they still exist and are active
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Token is invalid or user no longer exists',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Return user data
        res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                isVerified: user.isVerified,
                profileImageUrl: user.profileImageUrl
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Token is invalid',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token has expired',
                    timestamp: new Date().toISOString()
                }
            });
        }

        console.error('Token validation error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Token validation failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_REFRESH_TOKEN',
                    message: 'Refresh token is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key');

        // Check if this is actually a refresh token (has tokenType property)
        if (!decoded.tokenType || decoded.tokenType !== 'refresh') {
            return res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN_TYPE',
                    message: 'Invalid token type',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find user to ensure they still exist and are active
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Token is invalid or user no longer exists',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                userType: user.userType 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            message: 'Token refreshed successfully',
            tokens: {
                accessToken: newAccessToken,
                refreshToken: refreshToken, // Keep the same refresh token
                expiresIn: 900 // 15 minutes in seconds
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: {
                    code: 'INVALID_REFRESH_TOKEN',
                    message: 'Refresh token is invalid',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: {
                    code: 'REFRESH_TOKEN_EXPIRED',
                    message: 'Refresh token has expired. Please log in again.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        console.error('Token refresh error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Token refresh failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// OAuth Google login endpoint
router.post('/oauth/google', [
    body('token')
        .notEmpty()
        .withMessage('Google token is required'),
    body('userType')
        .optional()
        .isIn(['freelancer', 'mentor', 'client'])
        .withMessage('User type must be freelancer, mentor, or client')
], async (req, res) => {
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

        const { token, userType = 'freelancer' } = req.body;

        // In a real implementation, you would verify the Google token here
        // For now, we'll simulate the OAuth flow
        // const googleUser = await verifyGoogleToken(token);
        
        // Simulated Google user data (replace with actual Google API verification)
        const googleUser = {
            id: 'google_' + crypto.randomBytes(8).toString('hex'),
            email: 'user@gmail.com', // This would come from Google
            name: 'Google User', // This would come from Google
            picture: 'https://example.com/avatar.jpg' // This would come from Google
        };

        // Check if user already exists
        let user = await User.findByEmail(googleUser.email);

        if (user) {
            // User exists, log them in
            if (!user.isActive) {
                return res.status(401).json({
                    error: {
                        code: 'ACCOUNT_DEACTIVATED',
                        message: 'Your account has been deactivated. Please contact support.',
                        timestamp: new Date().toISOString()
                    }
                });
            }
        } else {
            // Create new user from Google data
            user = new User({
                email: googleUser.email,
                passwordHash: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
                fullName: googleUser.name,
                userType: userType,
                profileImageUrl: googleUser.picture,
                isVerified: true // OAuth users are automatically verified
            });

            await user.save();
        }

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                userType: user.userType 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { 
                userId: user._id, 
                tokenType: 'refresh' 
            },
            process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Google OAuth login successful',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                isVerified: user.isVerified,
                profileImageUrl: user.profileImageUrl
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).json({
            error: {
                code: 'OAUTH_ERROR',
                message: 'Google authentication failed. Please try again.',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// OAuth Facebook login endpoint
router.post('/oauth/facebook', [
    body('token')
        .notEmpty()
        .withMessage('Facebook token is required'),
    body('userType')
        .optional()
        .isIn(['freelancer', 'mentor', 'client'])
        .withMessage('User type must be freelancer, mentor, or client')
], async (req, res) => {
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

        const { token, userType = 'freelancer' } = req.body;

        // In a real implementation, you would verify the Facebook token here
        // For now, we'll simulate the OAuth flow
        // const facebookUser = await verifyFacebookToken(token);
        
        // Simulated Facebook user data (replace with actual Facebook API verification)
        const facebookUser = {
            id: 'facebook_' + crypto.randomBytes(8).toString('hex'),
            email: 'user@facebook.com', // This would come from Facebook
            name: 'Facebook User', // This would come from Facebook
            picture: 'https://example.com/fb-avatar.jpg' // This would come from Facebook
        };

        // Check if user already exists
        let user = await User.findByEmail(facebookUser.email);

        if (user) {
            // User exists, log them in
            if (!user.isActive) {
                return res.status(401).json({
                    error: {
                        code: 'ACCOUNT_DEACTIVATED',
                        message: 'Your account has been deactivated. Please contact support.',
                        timestamp: new Date().toISOString()
                    }
                });
            }
        } else {
            // Create new user from Facebook data
            user = new User({
                email: facebookUser.email,
                passwordHash: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
                fullName: facebookUser.name,
                userType: userType,
                profileImageUrl: facebookUser.picture,
                isVerified: true // OAuth users are automatically verified
            });

            await user.save();
        }

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                userType: user.userType 
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { 
                userId: user._id, 
                tokenType: 'refresh' 
            },
            process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Facebook OAuth login successful',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                isVerified: user.isVerified,
                profileImageUrl: user.profileImageUrl
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Facebook OAuth error:', error);
        res.status(500).json({
            error: {
                code: 'OAUTH_ERROR',
                message: 'Facebook authentication failed. Please try again.',
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router;