const mongoose = require('mongoose');
const Project = require('../../models/Project');
const User = require('../../models/User');

describe('Project Model', () => {
    let clientUser, freelancerUser;

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
    });

    afterEach(async () => {
        await Project.deleteMany({});
        await User.deleteMany({});
    });

    describe('Project Creation', () => {
        it('should create a valid project', async () => {
            const projectData = {
                clientId: clientUser._id,
                title: 'Test Project',
                description: 'This is a test project description',
                requiredSkills: ['javascript', 'react'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            };

            const project = new Project(projectData);
            const savedProject = await project.save();

            expect(savedProject._id).toBeDefined();
            expect(savedProject.title).toBe(projectData.title);
            expect(savedProject.status).toBe('open');
            expect(savedProject.applications).toHaveLength(0);
        });

        it('should require all mandatory fields', async () => {
            const project = new Project({});

            await expect(project.save()).rejects.toThrow();
        });

        it('should validate budget constraints', async () => {
            const projectData = {
                clientId: clientUser._id,
                title: 'Test Project',
                description: 'This is a test project description',
                requiredSkills: ['javascript'],
                budgetMin: 2000,
                budgetMax: 1000, // Invalid: max < min
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            const project = new Project(projectData);
            await expect(project.save()).rejects.toThrow();
        });

        it('should validate future deadline', async () => {
            const projectData = {
                clientId: clientUser._id,
                title: 'Test Project',
                description: 'This is a test project description',
                requiredSkills: ['javascript'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
            };

            const project = new Project(projectData);
            await expect(project.save()).rejects.toThrow();
        });
    });

    describe('Project Methods', () => {
        let project;

        beforeEach(async () => {
            project = new Project({
                clientId: clientUser._id,
                title: 'Test Project',
                description: 'This is a test project description',
                requiredSkills: ['javascript', 'react'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            await project.save();
        });

        describe('canUserApply', () => {
            it('should allow freelancer to apply to open project', () => {
                const canApply = project.canUserApply(freelancerUser._id);
                expect(canApply).toBe(true);
            });

            it('should not allow client to apply to their own project', () => {
                const canApply = project.canUserApply(clientUser._id);
                expect(canApply).toBe(false);
            });

            it('should not allow application to non-open project', () => {
                project.status = 'assigned';
                const canApply = project.canUserApply(freelancerUser._id);
                expect(canApply).toBe(false);
            });

            it('should not allow duplicate applications', () => {
                // Add an application
                project.applications.push({
                    freelancerId: freelancerUser._id,
                    coverLetter: 'Test application',
                    proposedRate: 50,
                    estimatedDuration: '2 weeks'
                });

                const canApply = project.canUserApply(freelancerUser._id);
                expect(canApply).toBe(false);
            });
        });

        describe('getApplicationByFreelancer', () => {
            it('should return application if exists', () => {
                const application = {
                    freelancerId: freelancerUser._id,
                    coverLetter: 'Test application',
                    proposedRate: 50,
                    estimatedDuration: '2 weeks'
                };
                project.applications.push(application);

                const foundApplication = project.getApplicationByFreelancer(freelancerUser._id);
                expect(foundApplication).toBeDefined();
                expect(foundApplication.coverLetter).toBe('Test application');
            });

            it('should return undefined if no application exists', () => {
                const foundApplication = project.getApplicationByFreelancer(freelancerUser._id);
                expect(foundApplication).toBeUndefined();
            });
        });

        describe('applicationCount virtual', () => {
            it('should return correct application count', () => {
                expect(project.applicationCount).toBe(0);

                project.applications.push({
                    freelancerId: freelancerUser._id,
                    coverLetter: 'Test application',
                    proposedRate: 50,
                    estimatedDuration: '2 weeks'
                });

                expect(project.applicationCount).toBe(1);
            });
        });
    });

    describe('Static Methods', () => {
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

        describe('findBySkills', () => {
            it('should find projects matching skills', async () => {
                const projects = await Project.findBySkills(['javascript']);
                expect(projects).toHaveLength(2);
                expect(projects.every(p => p.status === 'open')).toBe(true);
            });

            it('should return empty array for non-matching skills', async () => {
                const projects = await Project.findBySkills(['php']);
                expect(projects).toHaveLength(0);
            });

            it('should respect limit option', async () => {
                const projects = await Project.findBySkills(['javascript'], { limit: 1 });
                expect(projects).toHaveLength(1);
            });

            it('should populate client information', async () => {
                const projects = await Project.findBySkills(['javascript']);
                expect(projects[0].clientId.fullName).toBeDefined();
            });
        });
    });

    describe('Indexes', () => {
        it('should have proper indexes', async () => {
            const indexes = await Project.collection.getIndexes();
            
            // Check that required indexes exist
            const indexNames = Object.keys(indexes);
            expect(indexNames).toContain('clientId_1');
            expect(indexNames).toContain('status_1');
            expect(indexNames).toContain('requiredSkills_1');
            expect(indexNames).toContain('createdAt_-1');
        });
    });
});