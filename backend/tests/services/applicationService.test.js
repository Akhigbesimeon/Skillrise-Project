const mongoose = require('mongoose');
const Project = require('../../models/Project');
const User = require('../../models/User');
const projectService = require('../../services/projectService');
const notificationService = require('../../services/notificationService');

// Mock the notification service
jest.mock('../../services/notificationService');

describe('Project Application and Assignment Service', () => {
    let clientUser, freelancerUser, freelancerUser2, project;

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();

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

        freelancerUser2 = new User({
            email: 'freelancer2@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Freelancer 2',
            userType: 'freelancer',
            isVerified: true,
            freelancerProfile: {
                skills: ['python', 'django', 'postgresql'],
                experienceLevel: 'advanced',
                hourlyRate: 75
            }
        });
        await freelancerUser2.save();

        // Create test project
        const projectData = {
            title: 'Test Project',
            description: 'A test project for application testing',
            requiredSkills: ['javascript', 'react'],
            budgetMin: 1000,
            budgetMax: 2000,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        };

        project = await projectService.createProject(projectData, clientUser._id);
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Project.deleteMany({});
    });

    describe('Project Application', () => {
        test('should allow freelancer to apply to project', async () => {
            const applicationData = {
                coverLetter: 'I am interested in this project and have the required skills.',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            const result = await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData
            );

            expect(result.message).toBe('Application submitted successfully');
            expect(result.application).toBeDefined();
            expect(result.application.freelancerId).toEqual(freelancerUser._id);
            expect(result.application.coverLetter).toBe(applicationData.coverLetter);
            expect(result.application.proposedRate).toBe(applicationData.proposedRate);
            expect(result.application.status).toBe('pending');

            // Verify notification was sent
            expect(notificationService.notifyApplicationSubmitted).toHaveBeenCalledWith(
                project._id,
                freelancerUser._id,
                clientUser._id
            );
        });

        test('should prevent duplicate applications from same freelancer', async () => {
            const applicationData = {
                coverLetter: 'First application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            // First application should succeed
            await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData
            );

            // Second application should fail
            await expect(
                projectService.applyToProject(
                    project._id,
                    freelancerUser._id,
                    applicationData
                )
            ).rejects.toThrow('Already applied to this project');
        });

        test('should prevent client from applying to own project', async () => {
            const applicationData = {
                coverLetter: 'Applying to my own project',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            await expect(
                projectService.applyToProject(
                    project._id,
                    clientUser._id,
                    applicationData
                )
            ).rejects.toThrow('Cannot apply to your own project');
        });

        test('should prevent application to non-open project', async () => {
            // Update project status to assigned
            await Project.findByIdAndUpdate(project._id, { status: 'assigned' });

            const applicationData = {
                coverLetter: 'Late application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            await expect(
                projectService.applyToProject(
                    project._id,
                    freelancerUser._id,
                    applicationData
                )
            ).rejects.toThrow('Project is not open for applications');
        });

        test('should validate application data', async () => {
            const invalidApplicationData = {
                coverLetter: '',
                proposedRate: -10,
                estimatedDuration: '2 weeks'
            };

            await expect(
                projectService.applyToProject(
                    project._id,
                    freelancerUser._id,
                    invalidApplicationData
                )
            ).rejects.toThrow();
        });

        test('should validate cover letter length', async () => {
            const longCoverLetter = 'a'.repeat(1001); // Exceeds 1000 character limit
            const applicationData = {
                coverLetter: longCoverLetter,
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            await expect(
                projectService.applyToProject(
                    project._id,
                    freelancerUser._id,
                    applicationData
                )
            ).rejects.toThrow('Cover letter must be 1000 characters or less');
        });
    });

    describe('Application Management', () => {
        let application1, application2;

        beforeEach(async () => {
            // Create applications from both freelancers
            const applicationData1 = {
                coverLetter: 'Application from freelancer 1',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            const applicationData2 = {
                coverLetter: 'Application from freelancer 2',
                proposedRate: 60,
                estimatedDuration: '3 weeks'
            };

            const result1 = await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData1
            );

            const result2 = await projectService.applyToProject(
                project._id,
                freelancerUser2._id,
                applicationData2
            );

            application1 = result1.application;
            application2 = result2.application;
        });

        test('should allow client to view project applications', async () => {
            const result = await projectService.getProjectApplications(
                project._id,
                clientUser._id
            );

            expect(result.applications).toHaveLength(2);
            expect(result.applications[0].freelancerId).toBeDefined();
            expect(result.applications[0].coverLetter).toBeDefined();
            expect(result.applications[0].status).toBe('pending');
        });

        test('should prevent non-owner from viewing applications', async () => {
            await expect(
                projectService.getProjectApplications(
                    project._id,
                    freelancerUser._id
                )
            ).rejects.toThrow('Unauthorized to view applications');
        });

        test('should allow client to accept application', async () => {
            const result = await projectService.updateApplicationStatus(
                project._id,
                application1._id,
                'accepted',
                clientUser._id
            );

            expect(result.message).toBe('Application accepted successfully');
            expect(result.application.status).toBe('accepted');
            expect(result.project.status).toBe('assigned');
            expect(result.project.assignedFreelancerId).toEqual(freelancerUser._id);

            // Verify notification was sent
            expect(notificationService.notifyApplicationStatusUpdate).toHaveBeenCalledWith(
                project._id,
                application1._id,
                'accepted',
                freelancerUser._id,
                clientUser._id,
                project.title
            );

            // Check that other applications were rejected
            const updatedProject = await Project.findById(project._id);
            const otherApplication = updatedProject.applications.find(
                app => app._id.toString() !== application1._id.toString()
            );
            expect(otherApplication.status).toBe('rejected');
        });

        test('should allow client to reject application', async () => {
            const result = await projectService.updateApplicationStatus(
                project._id,
                application1._id,
                'rejected',
                clientUser._id
            );

            expect(result.message).toBe('Application rejected successfully');
            expect(result.application.status).toBe('rejected');
            expect(result.project.status).toBe('open'); // Project should remain open

            // Verify notification was sent
            expect(notificationService.notifyApplicationStatusUpdate).toHaveBeenCalledWith(
                project._id,
                application1._id,
                'rejected',
                freelancerUser._id,
                clientUser._id,
                project.title
            );
        });

        test('should prevent non-owner from updating application status', async () => {
            await expect(
                projectService.updateApplicationStatus(
                    project._id,
                    application1._id,
                    'accepted',
                    freelancerUser._id
                )
            ).rejects.toThrow('Unauthorized to update application');
        });

        test('should prevent updating non-pending application', async () => {
            // First accept the application
            await projectService.updateApplicationStatus(
                project._id,
                application1._id,
                'accepted',
                clientUser._id
            );

            // Try to update it again
            await expect(
                projectService.updateApplicationStatus(
                    project._id,
                    application1._id,
                    'rejected',
                    clientUser._id
                )
            ).rejects.toThrow('Cannot update application that is not pending');
        });
    });

    describe('Freelancer Application Tracking', () => {
        beforeEach(async () => {
            // Create application
            const applicationData = {
                coverLetter: 'Test application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData
            );
        });

        test('should allow freelancer to view their applications', async () => {
            const result = await projectService.getFreelancerApplications(freelancerUser._id);

            expect(result.applications).toHaveLength(1);
            expect(result.applications[0].project.title).toBe(project.title);
            expect(result.applications[0].coverLetter).toBe('Test application');
            expect(result.applications[0].status).toBe('pending');
        });

        test('should filter freelancer applications by status', async () => {
            // Accept the application
            const updatedProject = await Project.findById(project._id);
            const application = updatedProject.applications[0];

            await projectService.updateApplicationStatus(
                project._id,
                application._id,
                'accepted',
                clientUser._id
            );

            // Get accepted applications
            const acceptedResult = await projectService.getFreelancerApplications(
                freelancerUser._id,
                { status: 'accepted' }
            );

            expect(acceptedResult.applications).toHaveLength(1);
            expect(acceptedResult.applications[0].status).toBe('accepted');

            // Get pending applications (should be empty)
            const pendingResult = await projectService.getFreelancerApplications(
                freelancerUser._id,
                { status: 'pending' }
            );

            expect(pendingResult.applications).toHaveLength(0);
        });

        test('should paginate freelancer applications', async () => {
            const result = await projectService.getFreelancerApplications(
                freelancerUser._id,
                { page: 1, limit: 10 }
            );

            expect(result.pagination).toBeDefined();
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(10);
            expect(result.pagination.total).toBe(1);
        });
    });

    describe('Project Assignment Logic', () => {
        test('should assign project when application is accepted', async () => {
            // Create application
            const applicationData = {
                coverLetter: 'Test application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            const applicationResult = await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData
            );

            // Accept application
            const result = await projectService.updateApplicationStatus(
                project._id,
                applicationResult.application._id,
                'accepted',
                clientUser._id
            );

            // Verify project assignment
            expect(result.project.status).toBe('assigned');
            expect(result.project.assignedFreelancerId).toEqual(freelancerUser._id);
        });

        test('should reject other pending applications when one is accepted', async () => {
            // Create applications from both freelancers
            const applicationData1 = {
                coverLetter: 'Application 1',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            const applicationData2 = {
                coverLetter: 'Application 2',
                proposedRate: 60,
                estimatedDuration: '3 weeks'
            };

            const result1 = await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData1
            );

            const result2 = await projectService.applyToProject(
                project._id,
                freelancerUser2._id,
                applicationData2
            );

            // Accept first application
            await projectService.updateApplicationStatus(
                project._id,
                result1.application._id,
                'accepted',
                clientUser._id
            );

            // Check that second application was rejected
            const updatedProject = await Project.findById(project._id);
            const secondApplication = updatedProject.applications.find(
                app => app.freelancerId.toString() === freelancerUser2._id.toString()
            );

            expect(secondApplication.status).toBe('rejected');
        });

        test('should not affect other applications when rejecting one', async () => {
            // Create applications from both freelancers
            const applicationData1 = {
                coverLetter: 'Application 1',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            const applicationData2 = {
                coverLetter: 'Application 2',
                proposedRate: 60,
                estimatedDuration: '3 weeks'
            };

            const result1 = await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData1
            );

            const result2 = await projectService.applyToProject(
                project._id,
                freelancerUser2._id,
                applicationData2
            );

            // Reject first application
            await projectService.updateApplicationStatus(
                project._id,
                result1.application._id,
                'rejected',
                clientUser._id
            );

            // Check that second application is still pending
            const updatedProject = await Project.findById(project._id);
            const secondApplication = updatedProject.applications.find(
                app => app.freelancerId.toString() === freelancerUser2._id.toString()
            );

            expect(secondApplication.status).toBe('pending');
            expect(updatedProject.status).toBe('open');
        });
    });

    describe('Application Status Tracking', () => {
        test('should track application status updates for notifications', async () => {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

            // Create application
            const applicationData = {
                coverLetter: 'Test application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            await projectService.applyToProject(
                project._id,
                freelancerUser._id,
                applicationData
            );

            const updates = await projectService.getApplicationStatusUpdates(
                freelancerUser._id,
                since
            );

            expect(updates).toHaveLength(1);
            expect(updates[0].projectTitle).toBe(project.title);
            expect(updates[0].applicationStatus).toBe('pending');
        });
    });
});