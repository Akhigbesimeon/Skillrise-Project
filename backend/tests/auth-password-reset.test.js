const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Mock email service
jest.mock('../services/emailService');

describe('Password Reset API', () => {
    let testUser;

    beforeEach(async () => {
        // Clear the database
        await User.deleteMany({});
        
        // Create a test user
        testUser = new User({
            email: 'test@example.com',
            passwordHash: 'TestPassword123',
            fullName: 'Test User',
            userType: 'freelancer',
            isVerified: true,
            isActive: true
        });
        await testUser.save();

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('POST /api/auth/reset-password', () => {
        it('should send reset email for valid user', async () => {
            emailService.sendPasswordResetEmail.mockResolvedValue({ messageId: 'test-message-id' });

            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'test@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
            expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Test User',
                expect.any(String)
            );

            // Check that reset token was saved
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.passwordResetToken).toBeTruthy();
            expect(updatedUser.passwordResetExpires).toBeTruthy();
            expect(updatedUser.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
        });

        it('should return success message even for non-existent user (security)', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'nonexistent@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
            expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should return success message for inactive user (security)', async () => {
            testUser.isActive = false;
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'test@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
            expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should validate email format', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'invalid-email'
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: 'Please provide a valid email address'
                    })
                ])
            );
        });

        it('should require email field', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should handle email service failure', async () => {
            emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service error'));

            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'test@example.com'
                });

            expect(response.status).toBe(500);
            expect(response.body.error.code).toBe('EMAIL_SEND_FAILED');
            expect(response.body.error.message).toBe('Failed to send password reset email. Please try again.');

            // Check that reset token was cleared after email failure
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.passwordResetToken).toBeNull();
            expect(updatedUser.passwordResetExpires).toBeNull();
        });

        it('should normalize email to lowercase', async () => {
            emailService.sendPasswordResetEmail.mockResolvedValue({ messageId: 'test-message-id' });

            const response = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'TEST@EXAMPLE.COM'
                });

            expect(response.status).toBe(200);
            expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Test User',
                expect.any(String)
            );
        });
    });

    describe('POST /api/auth/reset-password/confirm', () => {
        let resetToken;

        beforeEach(async () => {
            // Generate reset token for test user
            resetToken = testUser.generatePasswordResetToken();
            await testUser.save();
        });

        it('should reset password with valid token', async () => {
            const newPassword = 'NewPassword123';

            const response = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: newPassword
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Password has been reset successfully. You can now log in with your new password.');

            // Check that password was updated and tokens cleared
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.passwordResetToken).toBeNull();
            expect(updatedUser.passwordResetExpires).toBeNull();

            // Verify new password works
            const isPasswordValid = await updatedUser.comparePassword(newPassword);
            expect(isPasswordValid).toBe(true);

            // Verify old password no longer works
            const isOldPasswordValid = await updatedUser.comparePassword('TestPassword123');
            expect(isOldPasswordValid).toBe(false);
        });

        it('should reject invalid token', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: 'invalid-token',
                    password: 'NewPassword123'
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('INVALID_TOKEN');
            expect(response.body.error.message).toBe('Invalid or expired password reset token');
        });

        it('should reject expired token', async () => {
            // Set token expiration to past
            testUser.passwordResetExpires = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'NewPassword123'
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('INVALID_TOKEN');
            expect(response.body.error.message).toBe('Invalid or expired password reset token');
        });

        it('should validate password requirements', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'weak'
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        msg: expect.stringContaining('Password must')
                    })
                ])
            );
        });

        it('should require token field', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    password: 'NewPassword123'
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should require password field', async () => {
            const response = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should reject reset for inactive user', async () => {
            testUser.isActive = false;
            await testUser.save();

            const response = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'NewPassword123'
                });

            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');
            expect(response.body.error.message).toBe('Your account has been deactivated. Please contact support.');
        });

        it('should validate password complexity', async () => {
            const testCases = [
                { password: '12345', expectedError: 'Password must be at least 6 characters long' },
                { password: 'password', expectedError: 'Password must contain at least one uppercase letter' },
                { password: 'PASSWORD', expectedError: 'Password must contain at least one lowercase letter' },
                { password: 'Password', expectedError: 'Password must contain at least one number' }
            ];

            for (const testCase of testCases) {
                const response = await request(app)
                    .post('/api/auth/reset-password/confirm')
                    .send({
                        token: resetToken,
                        password: testCase.password
                    });

                expect(response.status).toBe(400);
                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            }
        });
    });

    describe('Password Reset Token Generation', () => {
        it('should generate unique tokens', async () => {
            const token1 = testUser.generatePasswordResetToken();
            const token2 = testUser.generatePasswordResetToken();
            
            expect(token1).not.toBe(token2);
            expect(token1).toHaveLength(64); // 32 bytes * 2 (hex)
            expect(token2).toHaveLength(64);
        });

        it('should set expiration time to 1 hour', async () => {
            const beforeGeneration = Date.now();
            const token = testUser.generatePasswordResetToken();
            const afterGeneration = Date.now();

            expect(testUser.passwordResetToken).toBe(token);
            expect(testUser.passwordResetExpires.getTime()).toBeGreaterThanOrEqual(beforeGeneration + 60 * 60 * 1000);
            expect(testUser.passwordResetExpires.getTime()).toBeLessThanOrEqual(afterGeneration + 60 * 60 * 1000);
        });
    });

    describe('Integration Tests', () => {
        it('should complete full password reset flow', async () => {
            emailService.sendPasswordResetEmail.mockResolvedValue({ messageId: 'test-message-id' });

            // Step 1: Request password reset
            const resetResponse = await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'test@example.com'
                });

            expect(resetResponse.status).toBe(200);

            // Get the reset token from the database
            const userWithToken = await User.findById(testUser._id);
            const resetToken = userWithToken.passwordResetToken;

            // Step 2: Confirm password reset
            const confirmResponse = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'NewPassword123'
                });

            expect(confirmResponse.status).toBe(200);

            // Step 3: Verify login with new password
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'NewPassword123'
                });

            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.tokens.accessToken).toBeTruthy();
        });

        it('should not allow token reuse', async () => {
            emailService.sendPasswordResetEmail.mockResolvedValue({ messageId: 'test-message-id' });

            // Request password reset
            await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'test@example.com'
                });

            const userWithToken = await User.findById(testUser._id);
            const resetToken = userWithToken.passwordResetToken;

            // First reset should succeed
            const firstReset = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'NewPassword123'
                });

            expect(firstReset.status).toBe(200);

            // Second reset with same token should fail
            const secondReset = await request(app)
                .post('/api/auth/reset-password/confirm')
                .send({
                    token: resetToken,
                    password: 'AnotherPassword123'
                });

            expect(secondReset.status).toBe(400);
            expect(secondReset.body.error.code).toBe('INVALID_TOKEN');
        });
    });
});