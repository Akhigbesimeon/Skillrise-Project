const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
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
            throw new Error('JWT_SECRET not configured');
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

        // Add user info to request object
        req.user = {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            userType: user.userType,
            isVerified: user.isVerified
        };

        next();
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

        console.error('Token authentication error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Authentication failed',
                timestamp: new Date().toISOString()
            }
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without user info
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7);
        if (!process.env.JWT_SECRET) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
            req.user = {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: user.userType,
                isVerified: user.isVerified
            };
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // If token is invalid, continue without user info
        req.user = null;
        next();
    }
};

// Middleware to check user roles
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (!roles.includes(req.user.userType)) {
            return res.status(403).json({
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'You do not have permission to access this resource',
                    timestamp: new Date().toISOString()
                }
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole
};