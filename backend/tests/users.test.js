const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = require('../server');
const User = require('../models/User');

describe('User Profile Management', () => {
    let testUser;
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
        // Clear users collection
        await User.deleteMany({});

        // Create test user
        testUser = new User({
            email: 'testuser@example.com',
            passwordHash: 'hashedpassword123',
            fullName: 'Test User',
            userType: 'freelancer',
            isVerified: true,
            isActive: true
        });
        await testUser.save();

        // Generate tokens for authentication
        const jwt = require('jsonwebtoken');
        accessToken = jwt.sign(
            { userId: testUser._id, email: testUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        refreshToken = jwt.sign(
            { userId: testUser._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
    });

    afterEach(async () => {
        // Clean up uploaded files
        const uploadsDir = path.join(__dirname, '../uploads/avatars');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            files.forEach(file => {
                fs.unlinkSync(path.join(uploadsDir, file));
            });
        }
    });

    describe('GET /api/users/profile', () => {
        it('should get user profile successfully', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(testUser.email);
            expect(response.body.user.fullName).toBe(testUser.fullName);
            expect(response.body.user.passwordHash).toBeUndefined(); // Should be excluded
        });

        it('should return 401 without valid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .expect(401);

            expect(response.body.error.code).toBe('NO_TOKEN');
        });

        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer invalid_token')
                .expect(401);

            expect(response.body.error.code).toBe('INVALID_TOKEN');
        });

        it('should return 404 if user not found', async () => {
            // Delete the user
            await User.findByIdAndDelete(testUser._id);

            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.error.code).toBe('USER_NOT_FOUND');
        });
    });

    describe('PUT /api/users/profile', () => {
        it('should update basic profile information successfully', async () => {
            const updateData = {
                fullName: 'Updated Test User',
                bio: 'This is my updated bio',
                location: 'New York, USA',
                phone: '+1-555-0123'
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user.fullName).toBe(updateData.fullName);
            expect(response.body.user.bio).toBe(updateData.bio);
            expect(response.body.user.location).toBe(updateData.location);
            expect(response.body.user.phone).toBe(updateData.phone);

            // Verify in database
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.fullName).toBe(updateData.fullName);
            expect(updatedUser.bio).toBe(updateData.bio);
            expect(updatedUser.location).toBe(updateData.location);
            expect(updatedUser.phone).toBe(updateData.phone);
        });

        it('should update freelancer profile successfully', async () => {
            const updateData = {
                freelancerProfile: {
                    skills: ['JavaScript', 'React', 'Node.js'],
                    experienceLevel: 'intermediate',
                    hourlyRate: 50.00,
                    portfolioUrl: 'https://myportfolio.com',
                    availability: 'available'
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user.freelancerProfile.skills).toEqual(updateData.freelancerProfile.skills);
            expect(response.body.user.freelancerProfile.experienceLevel).toBe(updateData.freelancerProfile.experienceLevel);
            expect(response.body.user.freelancerProfile.hourlyRate).toBe(updateData.freelancerProfile.hourlyRate);
            expect(response.body.user.freelancerProfile.portfolioUrl).toBe(updateData.freelancerProfile.portfolioUrl);
            expect(response.body.user.freelancerProfile.availability).toBe(updateData.freelancerProfile.availability);
        });

        it('should update mentor profile successfully', async () => {
            // Update user type to mentor
            testUser.userType = 'mentor';
            await testUser.save();

            const updateData = {
                mentorProfile: {
                    expertiseAreas: ['Web Development', 'UI/UX Design'],
                    yearsExperience: 5,
                    mentoringCapacity: 10,
                    sessionRate: 75.00
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user.mentorProfile.expertiseAreas).toEqual(updateData.mentorProfile.expertiseAreas);
            expect(response.body.user.mentorProfile.yearsExperience).toBe(updateData.mentorProfile.yearsExperience);
            expect(response.body.user.mentorProfile.mentoringCapacity).toBe(updateData.mentorProfile.mentoringCapacity);
            expect(response.body.user.mentorProfile.sessionRate).toBe(updateData.mentorProfile.sessionRate);
        });

        it('should update client profile successfully', async () => {
            // Update user type to client
            testUser.userType = 'client';
            await testUser.save();

            const updateData = {
                clientProfile: {
                    companyName: 'Test Company Inc.',
                    companySize: '11-50',
                    industry: 'Technology'
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user.clientProfile.companyName).toBe(updateData.clientProfile.companyName);
            expect(response.body.user.clientProfile.companySize).toBe(updateData.clientProfile.companySize);
            expect(response.body.user.clientProfile.industry).toBe(updateData.clientProfile.industry);
        });

        it('should return validation errors for invalid data', async () => {
            const invalidData = {
                fullName: 'A', // Too short
                bio: 'A'.repeat(501), // Too long
                phone: 'invalid-phone',
                freelancerProfile: {
                    experienceLevel: 'invalid-level',
                    hourlyRate: -10 // Negative rate
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.details).toBeDefined();
            expect(Array.isArray(response.body.error.details)).toBe(true);
        });

        it('should return 401 without valid token', async () => {
            const updateData = { fullName: 'Updated Name' };

            const response = await request(app)
                .put('/api/users/profile')
                .send(updateData)
                .expect(401);

            expect(response.body.error.code).toBe('NO_TOKEN');
        });

        it('should return 404 if user not found', async () => {
            // Delete the user
            await User.findByIdAndDelete(testUser._id);

            const updateData = { fullName: 'Updated Name' };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(404);

            expect(response.body.error.code).toBe('USER_NOT_FOUND');
        });
    });

    describe('POST /api/users/upload-avatar', () => {
        it('should upload avatar successfully', async () => {
            // Create a test image file
            const testImagePath = path.join(__dirname, 'test-avatar.jpg');
            const testImageBuffer = Buffer.from('fake-image-data');
            fs.writeFileSync(testImagePath, testImageBuffer);

            const response = await request(app)
                .post('/api/users/upload-avatar')
                .set('Authorization', `Bearer ${accessToken}`)
                .attach('avatar', testImagePath)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.profileImageUrl).toBeDefined();
            expect(response.body.profileImageUrl).toMatch(/^\/uploads\/avatars\/avatar-\d+-\d+\.jpg$/);

            // Verify file was created
            const filename = path.basename(response.body.profileImageUrl);
            const uploadedFilePath = path.join(__dirname, '../uploads/avatars', filename);
            expect(fs.existsSync(uploadedFilePath)).toBe(true);

            // Clean up test file
            fs.unlinkSync(testImagePath);
        });

        it('should return error when no file is uploaded', async () => {
            const response = await request(app)
                .post('/api/users/upload-avatar')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);

            expect(response.body.error.code).toBe('NO_FILE');
        });

        it('should return 401 without valid token', async () => {
            const response = await request(app)
                .post('/api/users/upload-avatar')
                .expect(401);

            expect(response.body.error.code).toBe('NO_TOKEN');
        });

        it('should return 404 if user not found', async () => {
            // Delete the user
            await User.findByIdAndDelete(testUser._id);

            // Create a test image file
            const testImagePath = path.join(__dirname, 'test-avatar.jpg');
            const testImageBuffer = Buffer.from('fake-image-data');
            fs.writeFileSync(testImagePath, testImageBuffer);

            const response = await request(app)
                .post('/api/users/upload-avatar')
                .set('Authorization', `Bearer ${accessToken}`)
                .attach('avatar', testImagePath)
                .expect(404);

            expect(response.body.error.code).toBe('USER_NOT_FOUND');

            // Clean up test file
            fs.unlinkSync(testImagePath);
        });
    });

    describe('DELETE /api/users/account', () => {
        it('should delete user account successfully', async () => {
            const response = await request(app)
                .delete('/api/users/account')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Account deleted successfully');

            // Verify user was deleted from database
            const deletedUser = await User.findById(testUser._id);
            expect(deletedUser).toBeNull();
        });

        it('should delete avatar file when deleting account', async () => {
            // First upload an avatar
            const testImagePath = path.join(__dirname, 'test-avatar.jpg');
            const testImageBuffer = Buffer.from('fake-image-data');
            fs.writeFileSync(testImagePath, testImageBuffer);

            const uploadResponse = await request(app)
                .post('/api/users/upload-avatar')
                .set('Authorization', `Bearer ${accessToken}`)
                .attach('avatar', testImagePath);

            const avatarFilename = path.basename(uploadResponse.body.profileImageUrl);
            const avatarPath = path.join(__dirname, '../uploads/avatars', avatarFilename);
            
            // Verify avatar file exists
            expect(fs.existsSync(avatarPath)).toBe(true);

            // Delete account
            await request(app)
                .delete('/api/users/account')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Verify avatar file was deleted
            expect(fs.existsSync(avatarPath)).toBe(false);

            // Clean up test file
            fs.unlinkSync(testImagePath);
        });

        it('should return 401 without valid token', async () => {
            const response = await request(app)
                .delete('/api/users/account')
                .expect(401);

            expect(response.body.error.code).toBe('NO_TOKEN');
        });

        it('should return 404 if user not found', async () => {
            // Delete the user
            await User.findByIdAndDelete(testUser._id);

            const response = await request(app)
                .delete('/api/users/account')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);

            expect(response.body.error.code).toBe('USER_NOT_FOUND');
        });
    });

    describe('Profile Validation', () => {
        it('should validate freelancer profile fields', async () => {
            const invalidData = {
                freelancerProfile: {
                    experienceLevel: 'invalid',
                    hourlyRate: -5,
                    portfolioUrl: 'not-a-url'
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate mentor profile fields', async () => {
            // Update user type to mentor
            testUser.userType = 'mentor';
            await testUser.save();

            const invalidData = {
                mentorProfile: {
                    yearsExperience: -1,
                    mentoringCapacity: 25, // Exceeds max
                    sessionRate: -10
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate client profile fields', async () => {
            // Update user type to client
            testUser.userType = 'client';
            await testUser.save();

            const invalidData = {
                clientProfile: {
                    companyName: 'A'.repeat(101), // Too long
                    companySize: 'invalid-size',
                    industry: 'B'.repeat(101) // Too long
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate basic profile fields', async () => {
            const invalidData = {
                fullName: 'A', // Too short
                bio: 'C'.repeat(501), // Too long
                location: 'D'.repeat(101), // Too long
                phone: 'invalid-phone-format'
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('Role-specific Profile Updates', () => {
        it('should only update freelancer profile for freelancer users', async () => {
            const updateData = {
                freelancerProfile: {
                    skills: ['JavaScript', 'React'],
                    experienceLevel: 'advanced'
                },
                mentorProfile: {
                    expertiseAreas: ['Teaching'],
                    yearsExperience: 10
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            // Should update freelancer profile
            expect(response.body.user.freelancerProfile.skills).toEqual(['JavaScript', 'React']);
            expect(response.body.user.freelancerProfile.experienceLevel).toBe('advanced');

            // Should not update mentor profile (user is freelancer)
            expect(response.body.user.mentorProfile.expertiseAreas).not.toEqual(['Teaching']);
        });

        it('should only update mentor profile for mentor users', async () => {
            // Update user type to mentor
            testUser.userType = 'mentor';
            await testUser.save();

            const updateData = {
                mentorProfile: {
                    expertiseAreas: ['Web Development'],
                    yearsExperience: 5
                },
                freelancerProfile: {
                    skills: ['JavaScript'],
                    experienceLevel: 'advanced'
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            // Should update mentor profile
            expect(response.body.user.mentorProfile.expertiseAreas).toEqual(['Web Development']);
            expect(response.body.user.mentorProfile.yearsExperience).toBe(5);

            // Should not update freelancer profile (user is mentor)
            expect(response.body.user.freelancerProfile.skills).not.toEqual(['JavaScript']);
        });

        it('should only update client profile for client users', async () => {
            // Update user type to client
            testUser.userType = 'client';
            await testUser.save();

            const updateData = {
                clientProfile: {
                    companyName: 'Test Corp',
                    industry: 'Technology'
                },
                freelancerProfile: {
                    skills: ['JavaScript'],
                    experienceLevel: 'advanced'
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            // Should update client profile
            expect(response.body.user.clientProfile.companyName).toBe('Test Corp');
            expect(response.body.user.clientProfile.industry).toBe('Technology');

            // Should not update freelancer profile (user is client)
            expect(response.body.user.freelancerProfile.skills).not.toEqual(['JavaScript']);
        });

        it('should update mentor availability schedule', async () => {
            // Update user type to mentor
            testUser.userType = 'mentor';
            await testUser.save();

            const updateData = {
                mentorProfile: {
                    availabilitySchedule: {
                        monday: ['09:00-12:00', '14:00-17:00'],
                        tuesday: ['10:00-15:00'],
                        wednesday: [],
                        thursday: ['09:00-17:00'],
                        friday: ['09:00-12:00'],
                        saturday: [],
                        sunday: []
                    }
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.user.mentorProfile.availabilitySchedule.monday).toEqual(['09:00-12:00', '14:00-17:00']);
            expect(response.body.user.mentorProfile.availabilitySchedule.tuesday).toEqual(['10:00-15:00']);
            expect(response.body.user.mentorProfile.availabilitySchedule.wednesday).toEqual([]);
            expect(response.body.user.mentorProfile.availabilitySchedule.thursday).toEqual(['09:00-17:00']);
        });

        it('should validate freelancer skills array', async () => {
            const updateData = {
                freelancerProfile: {
                    skills: ['JavaScript', 'React', 'A'.repeat(51)] // One skill too long
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate mentor expertise areas', async () => {
            // Update user type to mentor
            testUser.userType = 'mentor';
            await testUser.save();

            const updateData = {
                mentorProfile: {
                    expertiseAreas: ['Web Development', 'B'.repeat(101)] // One area too long
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate hourly rate limits', async () => {
            const updateData = {
                freelancerProfile: {
                    hourlyRate: 15000 // Exceeds maximum
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate years of experience limits', async () => {
            // Update user type to mentor
            testUser.userType = 'mentor';
            await testUser.save();

            const updateData = {
                mentorProfile: {
                    yearsExperience: 60 // Exceeds maximum
                }
            };

            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(updateData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });
});