const mongoose = require('mongoose');
const User = require('../../models/User');
const notificationService = require('../../services/notificationService');
const emailService = require('../../services/emailService');

// Mock the email service
jest.mock('../../services/emailService');

describe('Notification Service', () => {
    let clientUser, freelancerUser;

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Mock email service to resolve successfully
        emailService.sendEmail.mockResolvedValue({ success: true });

        // Create test users
        clientUser = new User({
            email: 'client@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Client',
            userType: 'client',
            isVerified: true,
            clientProfile: {
                companyName: 'Test Company',
                industry: 'Technology'
            }
        });
        await clientUser.save();

        freelancerUser = new User({
            email: 'freelancer@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Freelancer',
            userType: 'freelancer',
            isVerified: true,
            freelancerProfile: {
                skills: ['javascript', 'react', 'nodejs'],
                experienceLevel: 'intermediate',
                hourlyRate: 50
            }
        });
        await freelancerUser.save();
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    describe('Application Submitted Notifications', () => {
        test('should send notification when application is submitted', async () => {
            const projectId = new mongoose.Types.ObjectId();
            
            const result = await notificationService.notifyApplicationSubmitted(
                projectId,
                freelancerUser._id,
                clientUser._id
            );

            expect(result.success).toBe(true);
            expect(emailService.sendEmail).toHaveBeenCalledTimes(2);

            // Check client notification
            const clientCall = emailService.sendEmail.mock.calls.find(
                call => call[0].to === clientUser.email
            );
            expect(clientCall).toBeDefined();
            expect(clientCall[0].subject).toBe('New Project Application Received');
            expect(clientCall[0].html).toContain(clientUser.fullName);
            expect(clientCall[0].html).toContain(freelancerUser.fullName);

            // Check freelancer confirmation
            const freelancerCall = emailService.sendEmail.mock.calls.find(
                call => call[0].to === freelancerUser.email
            );
            expect(freelancerCall).toBeDefined();
            expect(freelancerCall[0].subject).toBe('Application Submitted Successfully');
            expect(freelancerCall[0].html).toContain(freelancerUser.fullName);
            expect(freelancerCall[0].html).toContain(clientUser.fullName);
        });

        test('should handle email service failure gracefully', async () => {
            emailService.sendEmail.mockRejectedValue(new Error('Email service error'));
            
            const projectId = new mongoose.Types.ObjectId();
            
            const result = await notificationService.notifyApplicationSubmitted(
                projectId,
                freelancerUser._id,
                clientUser._id
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Email service error');
        });

        test('should handle missing user gracefully', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const nonExistentUserId = new mongoose.Types.ObjectId();
            
            const result = await notificationService.notifyApplicationSubmitted(
                projectId,
                nonExistentUserId,
                clientUser._id
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });
    });

    describe('Application Status Update Notifications', () => {
        test('should send notification when application is accepted', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const applicationId = new mongoose.Types.ObjectId();
            const projectTitle = 'Test Project';
            
            const result = await notificationService.notifyApplicationStatusUpdate(
                projectId,
                applicationId,
                'accepted',
                freelancerUser._id,
                clientUser._id,
                projectTitle
            );

            expect(result.success).toBe(true);
            expect(emailService.sendEmail).toHaveBeenCalledTimes(2);

            // Check freelancer notification
            const freelancerCall = emailService.sendEmail.mock.calls.find(
                call => call[0].to === freelancerUser.email
            );
            expect(freelancerCall).toBeDefined();
            expect(freelancerCall[0].subject).toContain('Application Accepted');
            expect(freelancerCall[0].subject).toContain(projectTitle);
            expect(freelancerCall[0].html).toContain('Congratulations!');
            expect(freelancerCall[0].html).toContain(freelancerUser.fullName);
            expect(freelancerCall[0].html).toContain(clientUser.fullName);
            expect(freelancerCall[0].html).toContain('🎉');

            // Check client notification
            const clientCall = emailService.sendEmail.mock.calls.find(
                call => call[0].to === clientUser.email
            );
            expect(clientCall).toBeDefined();
            expect(clientCall[0].subject).toContain('Project Assigned');
            expect(clientCall[0].subject).toContain(projectTitle);
            expect(clientCall[0].html).toContain(clientUser.fullName);
            expect(clientCall[0].html).toContain(freelancerUser.fullName);
        });

        test('should send notification when application is rejected', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const applicationId = new mongoose.Types.ObjectId();
            const projectTitle = 'Test Project';
            
            const result = await notificationService.notifyApplicationStatusUpdate(
                projectId,
                applicationId,
                'rejected',
                freelancerUser._id,
                clientUser._id,
                projectTitle
            );

            expect(result.success).toBe(true);
            expect(emailService.sendEmail).toHaveBeenCalledTimes(1); // Only to freelancer

            // Check freelancer notification
            const freelancerCall = emailService.sendEmail.mock.calls.find(
                call => call[0].to === freelancerUser.email
            );
            expect(freelancerCall).toBeDefined();
            expect(freelancerCall[0].subject).toContain('Application Rejected');
            expect(freelancerCall[0].subject).toContain(projectTitle);
            expect(freelancerCall[0].html).toContain('not selected');
            expect(freelancerCall[0].html).toContain(freelancerUser.fullName);
            expect(freelancerCall[0].html).toContain('📝');
        });

        test('should handle email service failure gracefully', async () => {
            emailService.sendEmail.mockRejectedValue(new Error('Email service error'));
            
            const projectId = new mongoose.Types.ObjectId();
            const applicationId = new mongoose.Types.ObjectId();
            const projectTitle = 'Test Project';
            
            const result = await notificationService.notifyApplicationStatusUpdate(
                projectId,
                applicationId,
                'accepted',
                freelancerUser._id,
                clientUser._id,
                projectTitle
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Email service error');
        });
    });

    describe('Project Completion Notifications', () => {
        test('should send notifications when project is completed', async () => {
            const projectId = new mongoose.Types.ObjectId();
            
            const result = await notificationService.notifyProjectCompleted(
                projectId,
                freelancerUser._id,
                clientUser._id
            );

            expect(result.success).toBe(true);
            expect(emailService.sendEmail).toHaveBeenCalledTimes(2);

            // Check freelancer notification
            const freelancerCall = emailService.sendEmail.mock.calls.find(
                call => call[0].to === freelancerUser.email
            );
            expect(freelancerCall).toBeDefined();
            expect(freelancerCall[0].subject).toBe('Project Completed Successfully');
            expect(freelancerCall[0].html).toContain('🎉');
            expect(freelancerCall[0].html).toContain(freelancerUser.fullName);
            expect(freelancerCall[0].html).toContain(clientUser.fullName);
            expect(freelancerCall[0].html).toContain('Congratulations');

            // Check client notification
            const clientCall = emailService.sendEmail.mock.calls.find(
                call => call[0].to === clientUser.email
            );
            expect(clientCall).toBeDefined();
            expect(clientCall[0].subject).toBe('Project Completed Successfully');
            expect(clientCall[0].html).toContain('🎉');
            expect(clientCall[0].html).toContain(clientUser.fullName);
            expect(clientCall[0].html).toContain(freelancerUser.fullName);
        });

        test('should handle missing users gracefully', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const nonExistentUserId = new mongoose.Types.ObjectId();
            
            const result = await notificationService.notifyProjectCompleted(
                projectId,
                nonExistentUserId,
                clientUser._id
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });
    });

    describe('Deadline Approaching Notifications', () => {
        test('should handle deadline notifications', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const daysRemaining = 3;
            
            const result = await notificationService.notifyDeadlineApproaching(
                projectId,
                daysRemaining
            );

            // Currently just returns success - implementation can be expanded
            expect(result.success).toBe(true);
        });
    });
});