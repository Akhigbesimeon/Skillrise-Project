const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');

// Create express app without starting server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('../routes/auth');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// Test database connection
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/skillrise_test';

describe('Authentication Endpoints', () => {
    beforeAll(async () => {
        // Close existing connection if any
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        // Connect to test database
        await mongoose.connect(MONGODB_URI);
    });

    beforeEach(async () => {
        // Clear users collection before each test
        await User.deleteMany({});
    });

    afterAll(async () => {
        // Clean up and close database connection
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    describe('POST /api/auth/register', () => {
        const getValidUserData = (suffix = '') => ({
            email: `test${suffix}@example.com`,
            password: 'TestPass123',
            fullName: 'Test User',
            userType: 'freelancer'
        });

        it('should register a new user successfully', async () => {
            const validUserData = getValidUserData('1');
            const response = await request(app)
                .post('/api/auth/register')
                .send(validUserData)
                .expect(201);

            expect(response.body.message).toContain('Registration successful');
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(validUserData.email);
            expect(response.body.user.fullName).toBe(validUserData.fullName);
            expect(response.body.user.userType).toBe(validUserData.userType);
            expect(response.body.user.isVerified).toBe(false);
            expect(response.body.user.passwordHash).toBeUndefined();

            // Wait a moment for database write to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify user was saved to database
            const savedUser = await User.findByEmail(validUserData.email);
            expect(savedUser).toBeTruthy();
            expect(savedUser.emailVerificationToken).toBeTruthy();
            expect(savedUser.emailVerificationExpires).toBeTruthy();
        });

        it('should hash the password before saving', async () => {
            const validUserData = getValidUserData('2');
            await request(app)
                .post('/api/auth/register')
                .send(validUserData)
                .expect(201);

            // Wait a moment for database write to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            const savedUser = await User.findByEmail(validUserData.email);
            expect(savedUser).toBeTruthy();
            expect(savedUser.passwordHash).not.toBe(validUserData.password);
            expect(savedUser.passwordHash.length).toBeGreaterThan(50); // bcrypt hash length
        });

        it('should reject registration with invalid email', async () => {
            const validUserData = getValidUserData('3');
            const invalidData = { ...validUserData, email: 'invalid-email' };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'Please provide a valid email address'
                    })
                ])
            );
        });

        it('should reject registration with weak password', async () => {
            const validUserData = getValidUserData('4');
            const weakPasswordData = { ...validUserData, password: '123' };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(weakPasswordData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: expect.stringContaining('Password must')
                    })
                ])
            );
        });

        it('should reject registration with missing full name', async () => {
            const validUserData = getValidUserData('5');
            const noNameData = { ...validUserData };
            delete noNameData.fullName;
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(noNameData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject registration with invalid user type', async () => {
            const validUserData = getValidUserData('6');
            const invalidTypeData = { ...validUserData, userType: 'invalid' };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(invalidTypeData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'User type must be freelancer, mentor, or client'
                    })
                ])
            );
        });

        it('should reject registration with duplicate email', async () => {
            const validUserData = getValidUserData('7');
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send(validUserData)
                .expect(201);

            // Wait a moment for database write to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            // Second registration with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send(validUserData)
                .expect(409);

            expect(response.body.error.code).toBe('USER_EXISTS');
            expect(response.body.error.message).toContain('already exists');
        });

        it('should normalize email to lowercase', async () => {
            const validUserData = getValidUserData('normalize');
            const upperCaseEmailData = { 
                ...validUserData, 
                email: 'TEST@EXAMPLE.COM' 
            };
            
            await request(app)
                .post('/api/auth/register')
                .send(upperCaseEmailData)
                .expect(201);

            // Wait a moment for database write to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            const savedUser = await User.findByEmail('test@example.com');
            expect(savedUser).toBeTruthy();
            expect(savedUser.email).toBe('test@example.com');
        });

        it('should trim whitespace from full name', async () => {
            const validUserData = getValidUserData('trim');
            const whitespaceNameData = { 
                ...validUserData, 
                fullName: '  Test User  ' 
            };
            
            const response = await request(app)
                .post('/api/auth/register')
                .send(whitespaceNameData)
                .expect(201);

            expect(response.body.user.fullName).toBe('Test User');
        });

        it('should set default profile based on user type', async () => {
            const validUserData = getValidUserData('profile');
            // Test freelancer profile
            await request(app)
                .post('/api/auth/register')
                .send({ ...validUserData, userType: 'freelancer' })
                .expect(201);

            const freelancer = await User.findByEmail(validUserData.email);
            expect(freelancer.freelancerProfile).toBeDefined();
            expect(freelancer.freelancerProfile.experienceLevel).toBe('beginner');
            expect(freelancer.freelancerProfile.skills).toEqual([]);

            // Clean up for next test
            await User.deleteMany({});

            // Test mentor profile
            const mentorData = getValidUserData('mentor');
            await request(app)
                .post('/api/auth/register')
                .send({ ...mentorData, userType: 'mentor' })
                .expect(201);

            const mentor = await User.findByEmail(mentorData.email);
            expect(mentor.mentorProfile).toBeDefined();
            expect(mentor.mentorProfile.mentoringCapacity).toBe(5);
            expect(mentor.mentorProfile.rating).toBe(0);
        });
    });

    describe('GET /api/auth/verify-email', () => {
        let user;
        let verificationToken;

        beforeEach(async () => {
            // Create a user with verification token
            user = new User({
                email: 'verify@example.com',
                passwordHash: 'hashedpassword',
                fullName: 'Verify User',
                userType: 'freelancer'
            });
            verificationToken = user.generateEmailVerificationToken();
            await user.save();
        });

        it('should verify email with valid token', async () => {
            const response = await request(app)
                .get(`/api/auth/verify-email?token=${verificationToken}`)
                .expect(200);

            expect(response.body.message).toContain('verified successfully');
            expect(response.body.user.isVerified).toBe(true);

            // Verify in database
            const verifiedUser = await User.findById(user._id);
            expect(verifiedUser.isVerified).toBe(true);
            expect(verifiedUser.emailVerificationToken).toBeNull();
            expect(verifiedUser.emailVerificationExpires).toBeNull();
        });

        it('should reject verification with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/verify-email?token=invalid-token')
                .expect(400);

            expect(response.body.error.code).toBe('INVALID_TOKEN');
            expect(response.body.error.message).toContain('Invalid or expired');
        });

        it('should reject verification with missing token', async () => {
            const response = await request(app)
                .get('/api/auth/verify-email')
                .expect(400);

            expect(response.body.error.code).toBe('MISSING_TOKEN');
            expect(response.body.error.message).toContain('required');
        });

        it('should reject verification with expired token', async () => {
            // Manually expire the token
            user.emailVerificationExpires = new Date(Date.now() - 1000); // 1 second ago
            await user.save();

            const response = await request(app)
                .get(`/api/auth/verify-email?token=${verificationToken}`)
                .expect(400);

            expect(response.body.error.code).toBe('INVALID_TOKEN');
            expect(response.body.error.message).toContain('expired');
        });
    });

    describe('POST /api/auth/login', () => {
        let verifiedUser;
        const userPassword = 'TestPass123';

        beforeEach(async () => {
            // Create a verified user for login tests
            verifiedUser = new User({
                email: 'login@example.com',
                passwordHash: userPassword, // Will be hashed by pre-save middleware
                fullName: 'Login User',
                userType: 'freelancer',
                isVerified: true
            });
            await verifiedUser.save();
        });

        it('should login successfully with valid credentials', async () => {
            const loginData = {
                email: 'login@example.com',
                password: userPassword
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body.message).toContain('Login successful');
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(loginData.email);
            expect(response.body.user.passwordHash).toBeUndefined();
            expect(response.body.tokens).toBeDefined();
            expect(response.body.tokens.accessToken).toBeDefined();
            expect(response.body.tokens.refreshToken).toBeDefined();
            expect(response.body.tokens.expiresIn).toBe(900);
        });

        it('should reject login with invalid email', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: userPassword
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
            expect(response.body.error.message).toContain('Invalid email or password');
        });

        it('should reject login with invalid password', async () => {
            const loginData = {
                email: 'login@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
            expect(response.body.error.message).toContain('Invalid email or password');
        });

        it('should reject login for unverified user', async () => {
            // Create unverified user
            const unverifiedUser = new User({
                email: 'unverified@example.com',
                passwordHash: userPassword,
                fullName: 'Unverified User',
                userType: 'freelancer',
                isVerified: false
            });
            await unverifiedUser.save();

            const loginData = {
                email: 'unverified@example.com',
                password: userPassword
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
            expect(response.body.error.message).toContain('verify your email');
        });

        it('should reject login for deactivated user', async () => {
            // Deactivate user
            verifiedUser.isActive = false;
            await verifiedUser.save();

            const loginData = {
                email: 'login@example.com',
                password: userPassword
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(401);

            expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');
            expect(response.body.error.message).toContain('deactivated');
        });

        it('should reject login with invalid email format', async () => {
            const loginData = {
                email: 'invalid-email',
                password: userPassword
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject login with missing password', async () => {
            const loginData = {
                email: 'login@example.com'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/auth/validate', () => {
        let user;
        let validToken;

        beforeEach(async () => {
            // Create a user and generate a valid token
            user = new User({
                email: 'validate@example.com',
                passwordHash: 'hashedpassword',
                fullName: 'Validate User',
                userType: 'freelancer',
                isVerified: true
            });
            await user.save();

            const jwt = require('jsonwebtoken');
            validToken = jwt.sign(
                { 
                    userId: user._id, 
                    email: user.email, 
                    userType: user.userType 
                },
                process.env.JWT_SECRET || 'fallback-secret-key',
                { expiresIn: '15m' }
            );
        });

        it('should validate valid token successfully', async () => {
            const response = await request(app)
                .get('/api/auth/validate')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(user.email);
            expect(response.body.user.passwordHash).toBeUndefined();
        });

        it('should reject request without token', async () => {
            const response = await request(app)
                .get('/api/auth/validate')
                .expect(401);

            expect(response.body.error.code).toBe('MISSING_TOKEN');
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/validate')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_TOKEN');
        });

        it('should reject token for non-existent user', async () => {
            // Delete the user but keep the token
            await User.findByIdAndDelete(user._id);

            const response = await request(app)
                .get('/api/auth/validate')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_TOKEN');
        });

        it('should reject token for deactivated user', async () => {
            // Deactivate the user
            user.isActive = false;
            await user.save();

            const response = await request(app)
                .get('/api/auth/validate')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_TOKEN');
        });
    });

    describe('POST /api/auth/refresh', () => {
        let user;
        let validRefreshToken;

        beforeEach(async () => {
            // Create a user and generate a valid refresh token
            user = new User({
                email: 'refresh@example.com',
                passwordHash: 'hashedpassword',
                fullName: 'Refresh User',
                userType: 'freelancer',
                isVerified: true
            });
            await user.save();

            const jwt = require('jsonwebtoken');
            validRefreshToken = jwt.sign(
                { 
                    userId: user._id, 
                    tokenType: 'refresh' 
                },
                process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
                { expiresIn: '7d' }
            );
        });

        it('should refresh token successfully', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: validRefreshToken })
                .expect(200);

            expect(response.body.message).toContain('refreshed successfully');
            expect(response.body.tokens).toBeDefined();
            expect(response.body.tokens.accessToken).toBeDefined();
            expect(response.body.tokens.refreshToken).toBe(validRefreshToken);
            expect(response.body.tokens.expiresIn).toBe(900);
        });

        it('should reject refresh without token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({})
                .expect(400);

            expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
        });

        it('should reject invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
        });

        it('should reject access token as refresh token', async () => {
            const jwt = require('jsonwebtoken');
            // Create an access token signed with refresh secret but without tokenType
            const accessToken = jwt.sign(
                { 
                    userId: user._id, 
                    email: user.email, 
                    userType: user.userType 
                    // Note: no tokenType property
                },
                process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key',
                { expiresIn: '15m' }
            );

            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: accessToken })
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_TOKEN_TYPE');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .expect(200);

            expect(response.body.message).toContain('Logout successful');
        });
    });

    describe('OAuth Endpoints', () => {
        describe('POST /api/auth/oauth/google', () => {
            it('should handle Google OAuth login for new user', async () => {
                const oauthData = {
                    token: 'mock_google_token',
                    userType: 'freelancer'
                };

                const response = await request(app)
                    .post('/api/auth/oauth/google')
                    .send(oauthData)
                    .expect(200);

                expect(response.body.message).toContain('Google OAuth login successful');
                expect(response.body.user).toBeDefined();
                expect(response.body.user.isVerified).toBe(true);
                expect(response.body.tokens).toBeDefined();
            });

            it('should reject Google OAuth without token', async () => {
                const response = await request(app)
                    .post('/api/auth/oauth/google')
                    .send({ userType: 'freelancer' })
                    .expect(400);

                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            });

            it('should reject Google OAuth with invalid user type', async () => {
                const oauthData = {
                    token: 'mock_google_token',
                    userType: 'invalid'
                };

                const response = await request(app)
                    .post('/api/auth/oauth/google')
                    .send(oauthData)
                    .expect(400);

                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            });
        });

        describe('POST /api/auth/oauth/facebook', () => {
            it('should handle Facebook OAuth login for new user', async () => {
                const oauthData = {
                    token: 'mock_facebook_token',
                    userType: 'mentor'
                };

                const response = await request(app)
                    .post('/api/auth/oauth/facebook')
                    .send(oauthData)
                    .expect(200);

                expect(response.body.message).toContain('Facebook OAuth login successful');
                expect(response.body.user).toBeDefined();
                expect(response.body.user.isVerified).toBe(true);
                expect(response.body.tokens).toBeDefined();
            });

            it('should reject Facebook OAuth without token', async () => {
                const response = await request(app)
                    .post('/api/auth/oauth/facebook')
                    .send({ userType: 'mentor' })
                    .expect(400);

                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            });
        });
    });
});