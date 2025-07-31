const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');

// Security configuration
const securityConfig = {
    // Rate limiting configuration
    rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: {
            error: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
    },
    
    // Strict rate limiting for auth endpoints
    authRateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs for auth
        message: {
            error: 'Too many authentication attempts, please try again later.',
            code: 'AUTH_RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
    },
    
    // Password policy
    passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxLength: 128,
        preventCommonPasswords: true
    },
    
    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict'
        }
    },
    
    // CORS configuration
    cors: {
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
};

// Common passwords list (subset for demonstration)
const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1'
];

// Security middleware functions
class SecurityMiddleware {
    
    // Apply all security middleware
    static applySecurityMiddleware(app) {
        // Trust proxy for accurate IP addresses
        app.set('trust proxy', 1);
        
        // Helmet for security headers
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));
        
        // CORS
        app.use(cors(securityConfig.cors));
        
        // Rate limiting
        app.use('/api/', rateLimit(securityConfig.rateLimiting));
        app.use('/api/auth/', rateLimit(securityConfig.authRateLimiting));
        
        // Data sanitization
        app.use(mongoSanitize()); // Prevent NoSQL injection
        app.use(xss()); // Clean user input from malicious HTML
        app.use(hpp()); // Prevent HTTP Parameter Pollution
        
        // Custom security headers
        app.use(this.customSecurityHeaders);
        
        // Request logging for security monitoring
        app.use(this.securityLogger);
    }
    
    // Custom security headers
    static customSecurityHeaders(req, res, next) {
        // Remove server information
        res.removeHeader('X-Powered-By');
        
        // Add custom security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        // Add cache control for sensitive endpoints
        if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        
        next();
    }
    
    // Security logging middleware
    static securityLogger(req, res, next) {
        const startTime = Date.now();
        
        // Log security-relevant information
        const securityInfo = {
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.originalUrl,
            referer: req.get('Referer'),
            contentLength: req.get('Content-Length')
        };
        
        // Log suspicious patterns
        if (this.detectSuspiciousActivity(req)) {
            console.warn('SECURITY: Suspicious activity detected', securityInfo);
        }
        
        // Log response time for performance monitoring
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;
            if (responseTime > 5000) { // Log slow requests
                console.warn('PERFORMANCE: Slow request detected', {
                    ...securityInfo,
                    responseTime,
                    statusCode: res.statusCode
                });
            }
        });
        
        next();
    }
    
    // Detect suspicious activity patterns
    static detectSuspiciousActivity(req) {
        const suspiciousPatterns = [
            /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection
            /<script|javascript:|vbscript:|onload|onerror/i, // XSS attempts
            /\.\.\//g, // Path traversal
            /\b(admin|root|administrator)\b/i, // Admin probing
            /\b(wp-admin|phpmyadmin|cpanel)\b/i // Common admin paths
        ];
        
        const testString = `${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
        
        return suspiciousPatterns.some(pattern => pattern.test(testString));
    }
    
    // Password validation middleware
    static validatePassword(password) {
        const policy = securityConfig.passwordPolicy;
        const errors = [];
        
        if (!password || password.length < policy.minLength) {
            errors.push(`Password must be at least ${policy.minLength} characters long`);
        }
        
        if (password && password.length > policy.maxLength) {
            errors.push(`Password must not exceed ${policy.maxLength} characters`);
        }
        
        if (policy.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (policy.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (policy.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        
        if (policy.preventCommonPasswords && commonPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common, please choose a more secure password');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // Secure password hashing
    static async hashPassword(password) {
        const validation = this.validatePassword(password);
        if (!validation.isValid) {
            throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
        }
        
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }
    
    // Password comparison
    static async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
    
    // Generate secure random tokens
    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    
    // Generate cryptographically secure random string
    static generateSecureId(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomBytes = crypto.randomBytes(length);
        
        for (let i = 0; i < length; i++) {
            result += chars[randomBytes[i] % chars.length];
        }
        
        return result;
    }
    
    // Input sanitization
    static sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        // Remove potentially dangerous characters
        return validator.escape(input.trim());
    }
    
    // Email validation
    static validateEmail(email) {
        return validator.isEmail(email) && validator.isLength(email, { max: 254 });
    }
    
    // URL validation
    static validateURL(url) {
        return validator.isURL(url, {
            protocols: ['http', 'https'],
            require_protocol: true,
            require_valid_protocol: true
        });
    }
    
    // File upload security
    static validateFileUpload(file) {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        
        const errors = [];
        
        if (!allowedMimeTypes.includes(file.mimetype)) {
            errors.push('File type not allowed');
        }
        
        if (file.size > maxFileSize) {
            errors.push('File size exceeds maximum allowed size');
        }
        
        // Check for potentially dangerous file extensions
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.jar'];
        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        
        if (dangerousExtensions.includes(fileExtension)) {
            errors.push('File extension not allowed');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    // CSRF protection middleware
    static csrfProtection(req, res, next) {
        // Skip CSRF for GET requests and API endpoints with proper authentication
        if (req.method === 'GET' || req.path.startsWith('/api/')) {
            return next();
        }
        
        const token = req.body._csrf || req.headers['x-csrf-token'];
        const sessionToken = req.session.csrfToken;
        
        if (!token || !sessionToken || token !== sessionToken) {
            return res.status(403).json({
                success: false,
                error: 'Invalid CSRF token',
                code: 'CSRF_TOKEN_INVALID'
            });
        }
        
        next();
    }
    
    // Generate CSRF token
    static generateCSRFToken(req) {
        const token = this.generateSecureToken();
        req.session.csrfToken = token;
        return token;
    }
    
    // Security audit logging
    static auditLog(action, userId, details = {}) {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            action,
            userId,
            details,
            ip: details.ip || 'unknown',
            userAgent: details.userAgent || 'unknown'
        };
        
        // In production, this should be sent to a secure logging service
        console.log('AUDIT:', JSON.stringify(auditEntry));
        
        // Store in database for compliance
        // AuditLog.create(auditEntry);
    }
    
    // Check for security vulnerabilities in dependencies
    static checkSecurityVulnerabilities() {
        // This would integrate with npm audit or similar tools
        console.log('Security vulnerability check should be implemented');
    }
}

module.exports = {
    SecurityMiddleware,
    securityConfig
};