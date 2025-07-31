const projectService = require('../../services/projectService');
const Project = require('../../models/Project');
const User = require('../../models/User');

describe('ProjectService', () => {
    let clientUser, freelancerUser, mentorUser;

    beforeEach(async () => {
        // Create test users
        clientUser = new User({
            email: 'client@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Client',
            userType: 'client',
            isVerified: true,
            clientProfile: {
                companyName: 'Test Company',
                rating: 4.5
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
                skills: ['javascript', 'react'],
                hourlyRate: 50
            }
        });
        await freelancerUser.save();

        mentorUser = new User({
            email: 'mentor@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'Test Mentor',
            userType: 'mentor',
            isVerified: true
        });
        await mentorUser.save();
    });

    afterEach(async () => {
        await Project.deleteMany({});
        await User.deleteMany({});
    });

    describe('createProject', () => {
        const validProjectData = {
            title: 'Test Project',
            description: 'This is a test project description',
            requiredSkills: ['javascript', 'react'],
            budgetMin: 1000,
            budgetMax: 2000,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };

        it('should create project for valid client', async () => {
            const project = await projectService.createProject(validProjectData, clientUser._id);

            expect(project._id).toBeDefined();
            expect(project.title).toBe(validProjectData.title);
            expect(project.clientId._id.toString()).toBe(clientUser._id.toString());
            expect(project.clientId.fullName).toBe(clientUser.fullName);
        });

        it('should throw error for non-existent client', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            await expect(
                projectService.createProject(validProjectData, fakeId)
            ).rejects.toThrow('Client not found');
        });

        it('should throw error for non-client user', async () => {
            await expect(
                projectService.createProject(validProjectData, freelancerUser._id)
            ).rejects.toThrow('Only clients can create projects');
        });

        it('should handle validation errors', async () => {
            const invalidData = { ...validProjectData, title: '' };
            
            await expect(
                projectService.createProject(invalidData, clientUser._id)
            ).rejects.toThrow();
        });
    });

    describe('getProjects', () => {
        beforeEach(async () => {
            // Create test projects
            await Project.create([
                {
                    clientId: clientUser._id,
                    title: 'JavaScript Project',
                    description: 'JavaScript development project',
                    requiredSkills: ['javascript', 'nodejs'],
                    budgetMin: 1000,
                    budgetMax: 2000,
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    status: 'open'
                },
                {
                    clientId: clientUser._id,
                    title: 'React Project',
                    description: 'React development project',
                    requiredSkills: ['react', 'javascript'],
                    budgetMin: 1500,
                    budgetMax: 2500,
                    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                    status: 'open'
                },
                {
                    clientId: clientUser._id,
                    title: 'Python Project',
                    description: 'Python development project',
                    requiredSkills: ['python', 'django'],
                    budgetMin: 2000,
                    budgetMax: 3000,
                    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                    status: 'assigned'
                }
            ]);
        });

        it('should return projects with default filters', async () => {
            const result = await projectService.getProjects();

            expect(result.projects).toHaveLength(2); // Only open projects
            expect(result.pagination.total).toBe(2);
            expect(result.pagination.page).toBe(1);
        });

        it('should filter by skills', async () => {
            const result = await projectService.getProjects({ skills: ['javascript'] });

            expect(result.projects).toHaveLength(2);
            expect(result.projects.every(p => p.requiredSkills.includes('javascript'))).toBe(true);
        });

        it('should filter by status', async () => {
            const result = await projectService.getProjects({ status: 'assigned' });

            expect(result.projects).toHaveLength(1);
            expect(result.projects[0].status).toBe('assigned');
        });

        it('should filter by budget range', async () => {
            const result = await projectService.getProjects({ 
                budgetMin: 1500,
                budgetMax: 2500 
            });

            expect(result.projects).toHaveLength(1);
            expect(result.projects[0].title).toBe('React Project');
        });

        it('should search by title and description', async () => {
            const result = await projectService.getProjects({ search: 'React' });

            expect(result.projects).toHaveLength(1);
            expect(result.projects[0].title).toBe('React Project');
        });

        it('should handle pagination', async () => {
            const result = await projectService.getProjects({}, { page: 1, limit: 1 });

            expect(result.projects).toHaveLength(1);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.pages).toBe(2);
        });

        it('should populate client information', async () => {
            const result = await projectService.getProjects();

            expect(result.projects[0].clientId.fullName).toBeDefined();
            expect(result.projects[0].clientId.clientProfile).toBeDefined();
        });
    });

    describe('getProjectById', () => {
        let project;

        beforeEach(async () => {
            project = await Project.create({
                clientId: clientUser._id,
                title: 'Test Project',
                description: 'Test description',
                requiredSkills: ['javascript'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                applications: [{
                    freelancerId: freelancerUser._id,
                    coverLetter: 'Test application',
                    proposedRate: 50,
                    estimatedDuration: '2 weeks'
                }]
            });
        });

        it('should return project by ID', async () => {
            const foundProject = await projectService.getProjectById(project._id);

            expect(foundProject._id.toString()).toBe(project._id.toString());
            expect(foundProject.clientId.fullName).toBeDefined();
        });

        it('should populate applications when requested', async () => {
            const foundProject = await projectService.getProjectById(project._id, true);

            expect(foundProject.applications[0].freelancerId.fullName).toBeDefined();
        });

        it('should throw error for non-existent project', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            await expect(
                projectService.getProjectById(fakeId)
            ).rejects.toThrow('Project not found');
        });
    });

    describe('updateProject', () => {
        let project;

        beforeEach(async () => {
            project = await Project.create({
                clientId: clientUser._id,
                title: 'Test Project',
                description: 'Test description',
                requiredSkills: ['javascript'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
        });

        it('should update project by owner', async () => {
            const updateData = { title: 'Updated Project' };
            
            const updatedProject = await projectService.updateProject(
                project._id, 
                updateData, 
                clientUser._id
            );

            expect(updatedProject.title).toBe('Updated Project');
        });

        it('should throw error for non-owner', async () => {
            const updateData = { title: 'Updated Project' };
            
            await expect(
                projectService.updateProject(project._id, updateData, freelancerUser._id)
            ).rejects.toThrow('Unauthorized to update this project');
        });

        it('should throw error for non-existent project', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const updateData = { title: 'Updated Project' };
            
            await expect(
                projectService.updateProject(fakeId, updateData, clientUser._id)
            ).rejects.toThrow('Project not found');
        });

        it('should prevent updates to non-open projects', async () => {
            project.status = 'assigned';
            await project.save();

            const updateData = { title: 'Updated Project' };
            
            await expect(
                projectService.updateProject(project._id, updateData, clientUser._id)
            ).rejects.toThrow('Cannot update project that is not open');
        });

        it('should allow cancellation of non-open projects', async () => {
            project.status = 'assigned';
            await project.save();

            const updateData = { status: 'cancelled' };
            
            const updatedProject = await projectService.updateProject(
                project._id, 
                updateData, 
                clientUser._id
            );

            expect(updatedProject.status).toBe('cancelled');
        });
    });

    describe('deleteProject', () => {
        let project;

        beforeEach(async () => {
            project = await Project.create({
                clientId: clientUser._id,
                title: 'Test Project',
                description: 'Test description',
                requiredSkills: ['javascript'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
        });

        it('should delete project by owner', async () => {
            const result = await projectService.deleteProject(project._id, clientUser._id);

            expect(result.message).toBe('Project deleted successfully');
            
            const deletedProject = await Project.findById(project._id);
            expect(deletedProject).toBeNull();
        });

        it('should throw error for non-owner', async () => {
            await expect(
                projectService.deleteProject(project._id, freelancerUser._id)
            ).rejects.toThrow('Unauthorized to delete this project');
        });

        it('should throw error for project with applications', async () => {
            project.applications.push({
                freelancerId: freelancerUser._id,
                coverLetter: 'Test application',
                proposedRate: 50,
                estimatedDuration: '2 weeks'
            });
            await project.save();

            await expect(
                projectService.deleteProject(project._id, clientUser._id)
            ).rejects.toThrow('Cannot delete project with applications');
        });
    });

    describe('getProjectsByClient', () => {
        beforeEach(async () => {
            await Project.create([
                {
                    clientId: clientUser._id,
                    title: 'Client Project 1',
                    description: 'Description 1',
                    requiredSkills: ['javascript'],
                    budgetMin: 1000,
                    budgetMax: 2000,
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                {
                    clientId: clientUser._id,
                    title: 'Client Project 2',
                    description: 'Description 2',
                    requiredSkills: ['react'],
                    budgetMin: 1500,
                    budgetMax: 2500,
                    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                }
            ]);
        });

        it('should return projects by client', async () => {
            const result = await projectService.getProjectsByClient(clientUser._id);

            expect(result.projects).toHaveLength(2);
            expect(result.projects.every(p => p.clientId._id.toString() === clientUser._id.toString())).toBe(true);
        });
    });

    describe('getRecommendedProjects', () => {
        beforeEach(async () => {
            await Project.create([
                {
                    clientId: clientUser._id,
                    title: 'JavaScript Project',
                    description: 'JavaScript development',
                    requiredSkills: ['javascript'],
                    budgetMin: 1000,
                    budgetMax: 2000,
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                {
                    clientId: clientUser._id,
                    title: 'React Project',
                    description: 'React development',
                    requiredSkills: ['react'],
                    budgetMin: 1500,
                    budgetMax: 2500,
                    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                },
                {
                    clientId: clientUser._id,
                    title: 'Python Project',
                    description: 'Python development',
                    requiredSkills: ['python'],
                    budgetMin: 2000,
                    budgetMax: 3000,
                    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                }
            ]);
        });

        it('should return recommended projects for freelancer', async () => {
            const result = await projectService.getRecommendedProjects(freelancerUser._id);

            expect(result.projects).toHaveLength(2); // javascript and react projects
            expect(result.projects.every(p => 
                p.requiredSkills.some(skill => freelancerUser.freelancerProfile.skills.includes(skill))
            )).toBe(true);
        });

        it('should return all projects for freelancer with no skills', async () => {
            freelancerUser.freelancerProfile.skills = [];
            await freelancerUser.save();

            const result = await projectService.getRecommendedProjects(freelancerUser._id);

            expect(result.projects).toHaveLength(3);
        });

        it('should throw error for non-freelancer', async () => {
            await expect(
                projectService.getRecommendedProjects(clientUser._id)
            ).rejects.toThrow('Freelancer not found');
        });

        it('should throw error for non-existent user', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            await expect(
                projectService.getRecommendedProjects(fakeId)
            ).rejects.toThrow('Freelancer not found');
        });
    });
});    d
escribe('Application Management', () => {
        let testProject;

        beforeEach(async () => {
            // Create a test project
            const projectData = {
                title: 'Test Project',
                description: 'Test project description',
                requiredSkills: ['javascript', 'react'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            };

            testProject = await projectService.createProject(projectData, clientUser._id);
        });

        describe('applyToProject', () => {
            it('should allow freelancer to apply to project', async () => {
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                const result = await projectService.applyToProject(
                    testProject._id,
                    freelancerUser._id,
                    applicationData
                );

                expect(result.message).toBe('Application submitted successfully');
                expect(result.application.freelancerId.toString()).toBe(freelancerUser._id.toString());
                expect(result.application.coverLetter).toBe(applicationData.coverLetter);
                expect(result.application.proposedRate).toBe(applicationData.proposedRate);
                expect(result.application.status).toBe('pending');
            });

            it('should not allow non-freelancer to apply', async () => {
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await expect(
                    projectService.applyToProject(testProject._id, clientUser._id, applicationData)
                ).rejects.toThrow('Only freelancers can apply to projects');
            });

            it('should not allow client to apply to own project', async () => {
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await expect(
                    projectService.applyToProject(testProject._id, clientUser._id, applicationData)
                ).rejects.toThrow('Only freelancers can apply to projects');
            });

            it('should not allow duplicate applications', async () => {
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                // First application should succeed
                await projectService.applyToProject(
                    testProject._id,
                    freelancerUser._id,
                    applicationData
                );

                // Second application should fail
                await expect(
                    projectService.applyToProject(testProject._id, freelancerUser._id, applicationData)
                ).rejects.toThrow('Already applied to this project');
            });

            it('should not allow application to non-open project', async () => {
                // Update project status
                await Project.findByIdAndUpdate(testProject._id, { status: 'assigned' });

                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await expect(
                    projectService.applyToProject(testProject._id, freelancerUser._id, applicationData)
                ).rejects.toThrow('Project is not open for applications');
            });

            it('should validate application data', async () => {
                const invalidApplicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: -10, // Invalid negative rate
                    estimatedDuration: '2 weeks'
                };

                await expect(
                    projectService.applyToProject(testProject._id, freelancerUser._id, invalidApplicationData)
                ).rejects.toThrow('Proposed rate must be positive');
            });

            it('should validate cover letter length', async () => {
                const longCoverLetter = 'a'.repeat(1001); // Exceeds 1000 character limit
                const applicationData = {
                    coverLetter: longCoverLetter,
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await expect(
                    projectService.applyToProject(testProject._id, freelancerUser._id, applicationData)
                ).rejects.toThrow('Cover letter must be 1000 characters or less');
            });
        });

        describe('getProjectApplications', () => {
            beforeEach(async () => {
                // Add test application
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await projectService.applyToProject(
                    testProject._id,
                    freelancerUser._id,
                    applicationData
                );
            });

            it('should return applications for project owner', async () => {
                const result = await projectService.getProjectApplications(
                    testProject._id,
                    clientUser._id
                );

                expect(result.applications).toHaveLength(1);
                expect(result.applications[0].freelancerId.toString()).toBe(freelancerUser._id.toString());
                expect(result.pagination.total).toBe(1);
            });

            it('should not allow non-owner to view applications', async () => {
                await expect(
                    projectService.getProjectApplications(testProject._id, freelancerUser._id)
                ).rejects.toThrow('Unauthorized to view applications');
            });

            it('should filter applications by status', async () => {
                const result = await projectService.getProjectApplications(
                    testProject._id,
                    clientUser._id,
                    { status: 'pending' }
                );

                expect(result.applications).toHaveLength(1);
                expect(result.applications[0].status).toBe('pending');
            });
        });

        describe('updateApplicationStatus', () => {
            let applicationId;

            beforeEach(async () => {
                // Add test application
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                const result = await projectService.applyToProject(
                    testProject._id,
                    freelancerUser._id,
                    applicationData
                );

                applicationId = result.application._id;
            });

            it('should accept application and assign project', async () => {
                const result = await projectService.updateApplicationStatus(
                    testProject._id,
                    applicationId,
                    'accepted',
                    clientUser._id
                );

                expect(result.message).toBe('Application accepted successfully');
                expect(result.application.status).toBe('accepted');
                expect(result.project.status).toBe('assigned');
                expect(result.project.assignedFreelancerId.toString()).toBe(freelancerUser._id.toString());
            });

            it('should reject application', async () => {
                const result = await projectService.updateApplicationStatus(
                    testProject._id,
                    applicationId,
                    'rejected',
                    clientUser._id
                );

                expect(result.message).toBe('Application rejected successfully');
                expect(result.application.status).toBe('rejected');
                expect(result.project.status).toBe('open'); // Project should remain open
            });

            it('should not allow non-owner to update application', async () => {
                await expect(
                    projectService.updateApplicationStatus(
                        testProject._id,
                        applicationId,
                        'accepted',
                        freelancerUser._id
                    )
                ).rejects.toThrow('Unauthorized to update application');
            });

            it('should not allow updating non-pending application', async () => {
                // First accept the application
                await projectService.updateApplicationStatus(
                    testProject._id,
                    applicationId,
                    'accepted',
                    clientUser._id
                );

                // Try to reject the already accepted application
                await expect(
                    projectService.updateApplicationStatus(
                        testProject._id,
                        applicationId,
                        'rejected',
                        clientUser._id
                    )
                ).rejects.toThrow('Cannot update application that is not pending');
            });
        });

        describe('getFreelancerApplications', () => {
            beforeEach(async () => {
                // Add test application
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await projectService.applyToProject(
                    testProject._id,
                    freelancerUser._id,
                    applicationData
                );
            });

            it('should return freelancer applications', async () => {
                const result = await projectService.getFreelancerApplications(freelancerUser._id);

                expect(result.applications).toHaveLength(1);
                expect(result.applications[0].project.title).toBe('Test Project');
                expect(result.applications[0].coverLetter).toBe('I am interested in this project');
                expect(result.applications[0].status).toBe('pending');
            });

            it('should filter applications by status', async () => {
                const result = await projectService.getFreelancerApplications(
                    freelancerUser._id,
                    { status: 'pending' }
                );

                expect(result.applications).toHaveLength(1);
                expect(result.applications[0].status).toBe('pending');
            });

            it('should return empty array for freelancer with no applications', async () => {
                // Create another freelancer
                const anotherFreelancer = new User({
                    email: 'another@test.com',
                    passwordHash: 'hashedpassword',
                    fullName: 'Another Freelancer',
                    userType: 'freelancer',
                    isVerified: true
                });
                await anotherFreelancer.save();

                const result = await projectService.getFreelancerApplications(anotherFreelancer._id);

                expect(result.applications).toHaveLength(0);
            });
        });

        describe('getApplicationStatusUpdates', () => {
            it('should return application status updates since given date', async () => {
                const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

                // Add test application
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await projectService.applyToProject(
                    testProject._id,
                    freelancerUser._id,
                    applicationData
                );

                const updates = await projectService.getApplicationStatusUpdates(
                    freelancerUser._id,
                    since
                );

                expect(updates).toHaveLength(1);
                expect(updates[0].projectTitle).toBe('Test Project');
                expect(updates[0].applicationStatus).toBe('pending');
            });
        });
    });