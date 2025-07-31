const mongoose = require('mongoose');
const User = require('../../models/User');

// Test database connection
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/skillrise_test';

describe('User Model', () => {
    beforeAll(async () => {
        // Close existing connection if any
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        await mongoose.connect(MONGODB_URI);
    });

    beforeEach(async () => {
        await User.deleteMany({});
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    describe('User Creation', () => {
        const validUserData = {
            email: 'test@example.com',
            passwordHash: 'TestPass123',
            fullName: 'Test User',
            userType: 'freelancer'
        };

        it('should create a user with valid data', async () => {
            const user = new User(validUserData);
            const savedUser = await user.save();

            expect(savedUser._id).toBeDefined();
            expect(savedUser.email).toBe(validUserData.email);
            expect(savedUser.fullName).toBe(validUserData.fullName);
            expect(savedUser.userType).toBe(validUserData.userType);
            expect(savedUser.isVerified).toBe(false);
            expect(savedUser.isActive).toBe(true);
            expect(savedUser.createdAt).toBeDefined();
            expect(savedUser.updatedAt).toBeDefined();
        });

        it('should hash password on save', async () => {
            const user = new User(validUserData);
            await user.save();

            expect(user.passwordHash).not.toBe(validUserData.passwordHash);
            expect(user.passwordHash.length).toBeGreaterThan(50);
        });

        it('should not hash password if not modified', async () => {
            const user = new User(validUserData);
            await user.save();
            const originalHash = user.passwordHash;

            user.fullName = 'Updated Name';
            await user.save();

            expect(user.passwordHash).toBe(originalHash);
        });

        it('should require email', async () => {
            const userData = { ...validUserData };
            delete userData.email;
            const user = new User(userData);

            await expect(user.save()).rejects.toThrow(/email.*required/i);
        });

        it('should require unique email', async () => {
            const user1 = new User(validUserData);
            await user1.save();

            const user2 = new User(validUserData);
            await expect(user2.save()).rejects.toThrow(/duplicate key/i);
        });

        it('should validate email format', async () => {
            const userData = { ...validUserData, email: 'invalid-email' };
            const user = new User(userData);

            await expect(user.save()).rejects.toThrow(/valid email/i);
        });

        it('should require password', async () => {
            const userData = { ...validUserData };
            delete userData.passwordHash;
            const user = new User(userData);

            await expect(user.save()).rejects.toThrow(/password.*required/i);
        });

        it('should require full name', async () => {
            const userData = { ...validUserData };
            delete userData.fullName;
            const user = new User(userData);

            await expect(user.save()).rejects.toThrow(/full name.*required/i);
        });

        it('should validate user type', async () => {
            const userData = { ...validUserData, userType: 'invalid' };
            const user = new User(userData);

            await expect(user.save()).rejects.toThrow(/user type/i);
        });

        it('should convert email to lowercase', async () => {
            const userData = { ...validUserData, email: 'TEST@EXAMPLE.COM' };
            const user = new User(userData);
            await user.save();

            expect(user.email).toBe('test@example.com');
        });

        it('should trim full name', async () => {
            const userData = { ...validUserData, fullName: '  Test User  ' };
            const user = new User(userData);
            await user.save();

            expect(user.fullName).toBe('Test User');
        });
    });

    describe('Profile Initialization', () => {
        it('should initialize freelancer profile for freelancer user type', async () => {
            const user = new User({
                email: 'freelancer@example.com',
                passwordHash: 'password123',
                fullName: 'Freelancer User',
                userType: 'freelancer'
            });
            await user.save();

            expect(user.freelancerProfile).toBeDefined();
            expect(user.freelancerProfile.skills).toEqual([]);
            expect(user.freelancerProfile.experienceLevel).toBe('beginner');
            expect(user.freelancerProfile.hourlyRate).toBe(0);
            expect(user.freelancerProfile.availability).toBe('available');
            expect(user.freelancerProfile.certifications).toEqual([]);
        });

        it('should initialize mentor profile for mentor user type', async () => {
            const user = new User({
                email: 'mentor@example.com',
                passwordHash: 'password123',
                fullName: 'Mentor User',
                userType: 'mentor'
            });
            await user.save();

            expect(user.mentorProfile).toBeDefined();
            expect(user.mentorProfile.expertiseAreas).toEqual([]);
            expect(user.mentorProfile.yearsExperience).toBe(0);
            expect(user.mentorProfile.mentoringCapacity).toBe(5);
            expect(user.mentorProfile.sessionRate).toBe(0);
            expect(user.mentorProfile.rating).toBe(0);
            expect(user.mentorProfile.totalMentees).toBe(0);
        });

        it('should initialize client profile for client user type', async () => {
            const user = new User({
                email: 'client@example.com',
                passwordHash: 'password123',
                fullName: 'Client User',
                userType: 'client'
            });
            await user.save();

            expect(user.clientProfile).toBeDefined();
            expect(user.clientProfile.companyName).toBe('');
            expect(user.clientProfile.companySize).toBe('1-10');
            expect(user.clientProfile.industry).toBe('');
            expect(user.clientProfile.projectsPosted).toBe(0);
            expect(user.clientProfile.rating).toBe(0);
        });
    });

    describe('Instance Methods', () => {
        let user;

        beforeEach(async () => {
            user = new User({
                email: 'test@example.com',
                passwordHash: 'TestPass123',
                fullName: 'Test User',
                userType: 'freelancer'
            });
            await user.save();
        });

        describe('comparePassword', () => {
            it('should return true for correct password', async () => {
                const isMatch = await user.comparePassword('TestPass123');
                expect(isMatch).toBe(true);
            });

            it('should return false for incorrect password', async () => {
                const isMatch = await user.comparePassword('wrongpassword');
                expect(isMatch).toBe(false);
            });
        });

        describe('generateEmailVerificationToken', () => {
            it('should generate verification token and set expiration', () => {
                const token = user.generateEmailVerificationToken();

                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                expect(token.length).toBe(64); // 32 bytes hex = 64 characters
                expect(user.emailVerificationToken).toBe(token);
                expect(user.emailVerificationExpires).toBeDefined();
                expect(user.emailVerificationExpires.getTime()).toBeGreaterThan(Date.now());
            });

            it('should set expiration to 24 hours from now', () => {
                const beforeGeneration = Date.now();
                user.generateEmailVerificationToken();
                const afterGeneration = Date.now();

                const expectedExpiration = 24 * 60 * 60 * 1000; // 24 hours in ms
                const actualExpiration = user.emailVerificationExpires.getTime() - beforeGeneration;

                expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
                expect(actualExpiration).toBeLessThanOrEqual(expectedExpiration + (afterGeneration - beforeGeneration));
            });
        });

        describe('generatePasswordResetToken', () => {
            it('should generate password reset token and set expiration', () => {
                const token = user.generatePasswordResetToken();

                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
                expect(token.length).toBe(64);
                expect(user.passwordResetToken).toBe(token);
                expect(user.passwordResetExpires).toBeDefined();
                expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
            });

            it('should set expiration to 1 hour from now', () => {
                const beforeGeneration = Date.now();
                user.generatePasswordResetToken();
                const afterGeneration = Date.now();

                const expectedExpiration = 60 * 60 * 1000; // 1 hour in ms
                const actualExpiration = user.passwordResetExpires.getTime() - beforeGeneration;

                expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
                expect(actualExpiration).toBeLessThanOrEqual(expectedExpiration + (afterGeneration - beforeGeneration));
            });
        });
    });

    describe('Static Methods', () => {
        beforeEach(async () => {
            await User.create([
                {
                    email: 'user1@example.com',
                    passwordHash: 'password123',
                    fullName: 'User One',
                    userType: 'freelancer',
                    isVerified: true
                },
                {
                    email: 'user2@example.com',
                    passwordHash: 'password123',
                    fullName: 'User Two',
                    userType: 'mentor',
                    isVerified: false
                },
                {
                    email: 'user3@example.com',
                    passwordHash: 'password123',
                    fullName: 'User Three',
                    userType: 'client',
                    isVerified: true,
                    isActive: false
                }
            ]);
        });

        describe('findByEmail', () => {
            it('should find user by email', async () => {
                const user = await User.findByEmail('user1@example.com');
                expect(user).toBeTruthy();
                expect(user.fullName).toBe('User One');
            });

            it('should find user by email case-insensitive', async () => {
                const user = await User.findByEmail('USER1@EXAMPLE.COM');
                expect(user).toBeTruthy();
                expect(user.fullName).toBe('User One');
            });

            it('should return null for non-existent email', async () => {
                const user = await User.findByEmail('nonexistent@example.com');
                expect(user).toBeNull();
            });
        });

        describe('findVerifiedUsers', () => {
            it('should return only verified and active users', async () => {
                const users = await User.findVerifiedUsers();
                expect(users).toHaveLength(1);
                expect(users[0].email).toBe('user1@example.com');
            });
        });
    });

    describe('JSON Transformation', () => {
        it('should exclude sensitive fields from JSON output', async () => {
            const user = new User({
                email: 'test@example.com',
                passwordHash: 'TestPass123',
                fullName: 'Test User',
                userType: 'freelancer'
            });
            user.generateEmailVerificationToken();
            user.generatePasswordResetToken();
            await user.save();

            const userJSON = user.toJSON();

            expect(userJSON.passwordHash).toBeUndefined();
            expect(userJSON.emailVerificationToken).toBeUndefined();
            expect(userJSON.passwordResetToken).toBeUndefined();
            expect(userJSON.__v).toBeUndefined();
            expect(userJSON.email).toBeDefined();
            expect(userJSON.fullName).toBeDefined();
        });
    });
});