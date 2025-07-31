const request = require('supertest');
const bcrypt = require('bcryptjs');
const { SecurityMiddleware } = require('../../middleware/security');
const securityMonitoringService = require('../../services/securityMonitoringService');
const gdprService = require('../../services/gdprService');
const User = require('../../models/User');

describe('Security Tests', () => {
    let app;
    let testUser;
    
    beforeAll(async () => {
        // Setup test app with security middleware
        const express = require('express');
        app = express();
        app.use(express.json());
        
        // Apply security middleware
        SecurityMiddleware.applySecurityMiddleware(app);
        
        // Test routes
        app.post('/api/auth/login', (req, res) => {
            res.json({ success: true });
        });
        
        app.get('/api/test', (req, res) => {
            res.json({ message: 'test endpoint' });
        });
        
        // Create test user
        testUser = await User.create({
            fullName: 'Security Test User',
            email: 'security@test.com',
            password: await bcrypt.hash('SecurePass123!', 12),
            role: 'freelancer'
        });
    });
    
    afterAll(async () => {
        if (testUser) {
            await User.findByIdAndDelete(testUser._id);
        }
    });
    
    describe('Password Security', () => {
        describe('Password Validation', () => {
            it('should reject weak passwords', () => {
                const weakPasswords = [
                    'password',
                    '123456',
                    'abc123',
                    'short',
                    'NOLOWERCASE123!',
                    'nouppercase123!',
                    'NoNumbers!',
                    'NoSpecialChars123'
                ];
                
                weakPasswords.forEach(password => {
                    const result = SecurityMiddleware.validatePassword(password);
                    expect(result.isValid).toBe(false);
                    expect(result.errors.length).toBeGreaterThan(0);
                });
            });
            
            it('should accept strong passwords', () => {
                const strongPasswords = [
                    'SecurePass123!',
                    'MyStr0ng@Password',
                    'C0mpl3x#P@ssw0rd',
                    'V3ry$ecur3P@ss'
                ];
                
                strongPasswords.forEach(password => {
                    const result = SecurityMiddleware.validatePassword(password);
                    expect(result.isValid).toBe(true);
                    expect(result.errors.length).toBe(0);
                });
            });
            
            it('should reject common passwords', () => {
                const commonPasswords = [
                    'Password123!',
                    'Admin123!',
                    'Welcome123!'
                ];
                
                commonPasswords.forEach(password => {
                    const result = SecurityMiddleware.validatePassword(password);
                    expect(result.isValid).toBe(false);
                    expect(result.errors.some(error => error.includes('too common'))).toBe(true);
                });
            });
        });
        
        describe('Password Hashing', () => {
            it('should hash passwords securely', async () => {
                const password = 'SecurePass123!';
                const hashedPassword = await SecurityMiddleware.hashPassword(password);
                
                expect(hashedPassword).toBeDefined();
                expect(hashedPassword).not.toBe(password);
                expect(hashedPassword.length).toBeGreaterThan(50);
                expect(hashedPassword.startsWith('$2b$')).toBe(true);
            });
            
            it('should verify passwords correctly', async () => {
                const password = 'SecurePass123!';
                const hashedPassword = await SecurityMiddleware.hashPassword(password);
                
                const isValid = await SecurityMiddleware.comparePassword(password, hashedPassword);
                expect(isValid).toBe(true);
                
                const isInvalid = await SecurityMiddleware.comparePassword('wrongpassword', hashedPassword);
                expect(isInvalid).toBe(false);
            });
        });
    });
    
    describe('Input Validation and Sanitization', () => {
        it('should sanitize malicious input', () => {
            const maliciousInputs = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src="x" onerror="alert(1)">',
                '"><script>alert("xss")</script>'
            ];
            
            maliciousInputs.forEach(input => {
                const sanitized = SecurityMiddleware.sanitizeInput(input);
                expect(sanitized).not.toContain('<script>');
                expect(sanitized).not.toContain('javascript:');
                expect(sanitized).not.toContain('onerror');
            });
        });
        
        it('should validate email addresses', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org'
            ];
            
            const invalidEmails = [
                'invalid-email',
                '@domain.com',
                'user@',
                'user@domain',
                'user space@domain.com'
            ];
            
            validEmails.forEach(email => {
                expect(SecurityMiddleware.validateEmail(email)).toBe(true);
            });
            
            invalidEmails.forEach(email => {
                expect(SecurityMiddleware.validateEmail(email)).toBe(false);
            });
        });
        
        it('should validate URLs', () => {
            const validUrls = [
                'https://example.com',
                'http://subdomain.example.com/path',
                'https://example.com:8080/path?query=value'
            ];
            
            const invalidUrls = [
                'not-a-url',
                'ftp://example.com',
                'javascript:alert(1)',
                'data:text/html,<script>alert(1)</script>'
            ];
            
            validUrls.forEach(url => {
                expect(SecurityMiddleware.validateURL(url)).toBe(true);
            });
            
            invalidUrls.forEach(url => {
                expect(SecurityMiddleware.validateURL(url)).toBe(false);
            });
        });
    });
    
    describe('Rate Limiting', () => {
        it('should enforce rate limits on API endpoints', async () => {
            const requests = [];
            
            // Make multiple requests quickly
            for (let i = 0; i < 10; i++) {
                requests.push(
                    request(app)
                        .get('/api/test')
                        .set('X-Forwarded-For', '192.168.1.100')
                );
            }
            
            const responses = await Promise.all(requests);
            
            // Some requests should be successful, others should be rate limited
            const successfulRequests = responses.filter(res => res.status === 200);
            const rateLimitedRequests = responses.filter(res => res.status === 429);
            
            expect(successfulRequests.length).toBeGreaterThan(0);
            expect(rateLimitedRequests.length).toBeGreaterThan(0);
        });
        
        it('should have stricter rate limits for auth endpoints', async () => {
            const requests = [];
            
            // Make multiple auth requests quickly
            for (let i = 0; i < 8; i++) {
                requests.push(
                    request(app)
                        .post('/api/auth/login')
                        .set('X-Forwarded-For', '192.168.1.101')
                        .send({ email: 'test@example.com', password: 'password' })
                );
            }
            
            const responses = await Promise.all(requests);
            
            // Should have more restrictive rate limiting for auth
            const rateLimitedRequests = responses.filter(res => res.status === 429);
            expect(rateLimitedRequests.length).toBeGreaterThan(0);
        });
    });
    
    describe('Security Headers', () => {
        it('should set security headers', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(response.headers['content-security-policy']).toBeDefined();
        });
        
        it('should remove server information', async () => {
            const response = await request(app).get('/api/test');
            
            expect(response.headers['x-powered-by']).toBeUndefined();
            expect(response.headers['server']).toBeUndefined();
        });
    });
    
    describe('File Upload Security', () => {
        it('should validate file types', () => {
            const allowedFile = {
                mimetype: 'image/jpeg',
                size: 1024 * 1024, // 1MB
                originalname: 'test.jpg'
            };
            
            const result = SecurityMiddleware.validateFileUpload(allowedFile);
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });
        
        it('should reject dangerous file types', () => {
            const dangerousFiles = [
                {
                    mimetype: 'application/x-executable',
                    size: 1024,
                    originalname: 'malware.exe'
                },
                {
                    mimetype: 'application/javascript',
                    size: 1024,
                    originalname: 'script.js'
                },
                {
                    mimetype: 'image/jpeg',
                    size: 1024,
                    originalname: 'image.jpg.exe'
                }
            ];
            
            dangerousFiles.forEach(file => {
                const result = SecurityMiddleware.validateFileUpload(file);
                expect(result.isValid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });
        
        it('should reject oversized files', () => {
            const oversizedFile = {
                mimetype: 'image/jpeg',
                size: 20 * 1024 * 1024, // 20MB
                originalname: 'large.jpg'
            };
            
            const result = SecurityMiddleware.validateFileUpload(oversizedFile);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('size exceeds'))).toBe(true);
        });
    });
    
    describe('Token Generation', () => {
        it('should generate secure random tokens', () => {
            const token1 = SecurityMiddleware.generateSecureToken();
            const token2 = SecurityMiddleware.generateSecureToken();
            
            expect(token1).toBeDefined();
            expect(token2).toBeDefined();
            expect(token1).not.toBe(token2);
            expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
            expect(/^[a-f0-9]+$/.test(token1)).toBe(true);
        });
        
        it('should generate secure IDs', () => {
            const id1 = SecurityMiddleware.generateSecureId();
            const id2 = SecurityMiddleware.generateSecureId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1.length).toBe(16);
            expect(/^[A-Za-z0-9]+$/.test(id1)).toBe(true);
        });
    });
    
    describe('CSRF Protection', () => {
        it('should generate CSRF tokens', () => {
            const mockReq = { session: {} };
            const token = SecurityMiddleware.generateCSRFToken(mockReq);
            
            expect(token).toBeDefined();
            expect(token.length).toBe(64);
            expect(mockReq.session.csrfToken).toBe(token);
        });
        
        it('should validate CSRF tokens', () => {
            const mockReq = {
                method: 'POST',
                path: '/api/form',
                body: { _csrf: 'valid-token' },
                session: { csrfToken: 'valid-token' }
            };
            
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            const mockNext = jest.fn();
            
            SecurityMiddleware.csrfProtection(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
        
        it('should reject invalid CSRF tokens', () => {
            const mockReq = {
                method: 'POST',
                path: '/api/form',
                body: { _csrf: 'invalid-token' },
                session: { csrfToken: 'valid-token' }
            };
            
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            const mockNext = jest.fn();
            
            SecurityMiddleware.csrfProtection(mockReq, mockRes, mockNext);
            
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid CSRF token',
                code: 'CSRF_TOKEN_INVALID'
            });
        });
    });
    
    describe('Security Monitoring', () => {
        it('should log security events', async () => {
            const eventId = await securityMonitoringService.logSecurityEvent('LOGIN_FAILED', {
                ip: '192.168.1.1',
                userId: testUser._id,
                userAgent: 'Test Agent'
            });
            
            expect(eventId).toBeDefined();
            expect(typeof eventId).toBe('string');
        });
        
        it('should detect brute force attacks', async () => {
            const ip = '192.168.1.2';
            
            // Simulate multiple failed login attempts
            for (let i = 0; i < 6; i++) {
                await securityMonitoringService.logSecurityEvent('LOGIN_FAILED', {
                    ip,
                    userId: testUser._id
                });
            }
            
            // IP should be blocked
            expect(securityMonitoringService.isIPBlocked(ip)).toBe(true);
        });
        
        it('should generate security dashboard data', async () => {
            const dashboard = await securityMonitoringService.getSecurityDashboard();
            
            expect(dashboard).toBeDefined();
            expect(dashboard.eventCounts).toBeDefined();
            expect(dashboard.activeIncidents).toBeDefined();
            expect(dashboard.blockedIPs).toBeDefined();
            expect(dashboard.systemStatus).toBeDefined();
        });
        
        it('should generate security reports', async () => {
            const report = await securityMonitoringService.generateSecurityReport(7);
            
            expect(report).toBeDefined();
            expect(report.summary).toBeDefined();
            expect(report.eventBreakdown).toBeDefined();
            expect(report.recommendations).toBeDefined();
            expect(Array.isArray(report.recommendations)).toBe(true);
        });
    });
    
    describe('GDPR Compliance', () => {
        it('should export user data', async () => {
            const result = await gdprService.exportUserData(testUser._id, testUser._id);
            
            expect(result.success).toBe(true);
            expect(result.exportPath).toBeDefined();
            expect(result.dataTypes).toBeDefined();
            expect(Array.isArray(result.dataTypes)).toBe(true);
        });
        
        it('should generate privacy reports', async () => {
            const result = await gdprService.generatePrivacyReport(testUser._id);
            
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            expect(result.report.dataCategories).toBeDefined();
            expect(result.report.userRights).toBeDefined();
            expect(Array.isArray(result.report.userRights)).toBe(true);
        });
        
        it('should handle data rectification', async () => {
            const corrections = {
                profile: {
                    fullName: 'Updated Test User'
                }
            };
            
            const result = await gdprService.rectifyUserData(testUser._id, corrections, testUser._id);
            
            expect(result.success).toBe(true);
            expect(result.results).toBeDefined();
        });
        
        it('should restrict data processing', async () => {
            const restrictions = {
                marketing: false,
                analytics: false,
                profiling: false
            };
            
            const result = await gdprService.restrictDataProcessing(testUser._id, restrictions, testUser._id);
            
            expect(result.success).toBe(true);
        });
    });
    
    describe('Vulnerability Detection', () => {
        it('should detect SQL injection attempts', () => {
            const maliciousInputs = [
                "'; DROP TABLE users; --",
                "1' OR '1'='1",
                "admin'/*",
                "1; DELETE FROM users WHERE 1=1; --"
            ];
            
            maliciousInputs.forEach(input => {
                const mockReq = {
                    originalUrl: `/api/search?q=${input}`,
                    query: { q: input },
                    body: {}
                };
                
                const isSuspicious = SecurityMiddleware.detectSuspiciousActivity(mockReq);
                expect(isSuspicious).toBe(true);
            });
        });
        
        it('should detect XSS attempts', () => {
            const xssInputs = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img src="x" onerror="alert(1)">',
                '<svg onload="alert(1)">'
            ];
            
            xssInputs.forEach(input => {
                const mockReq = {
                    originalUrl: '/api/comment',
                    query: {},
                    body: { content: input }
                };
                
                const isSuspicious = SecurityMiddleware.detectSuspiciousActivity(mockReq);
                expect(isSuspicious).toBe(true);
            });
        });
        
        it('should detect path traversal attempts', () => {
            const pathTraversalInputs = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                '....//....//....//etc/passwd'
            ];
            
            pathTraversalInputs.forEach(input => {
                const mockReq = {
                    originalUrl: `/api/file?path=${input}`,
                    query: { path: input },
                    body: {}
                };
                
                const isSuspicious = SecurityMiddleware.detectSuspiciousActivity(mockReq);
                expect(isSuspicious).toBe(true);
            });
        });
    });
    
    describe('Audit Logging', () => {
        it('should log security audit events', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            SecurityMiddleware.auditLog('USER_LOGIN', testUser._id, {
                ip: '192.168.1.1',
                userAgent: 'Test Agent',
                success: true
            });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                'AUDIT:',
                expect.stringContaining('USER_LOGIN')
            );
            
            consoleSpy.mockRestore();
        });
    });
});