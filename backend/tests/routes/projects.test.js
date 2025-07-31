const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Project = require('../../models/Project');
const jwt = require('jsonwebtoken');

describe('Projects Routes', () => {
    let clientUser, freelancerUser, clientToken, freelancerToken;

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

        // Generate tokens
        clientToken = jwt.sign(
            { id: clientUser._id, email: clientUser.email },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        freelancerToken = jwt.sign(
            { id: freelancerUser._id, email: freelancerUser.email },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    afterEach(async () => {
        await Project.deleteMany({});
        await User.deleteMany({});
    });

    describe('GET /api/projects', () => {
        beforeEach(async () => {
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
                }
            ]);
        });

        it('should return projects without authentication', async () => {
            const response = await request(app)
                .get('/api/projects')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination).toBeDefined();
        });

        it('should filter projects by skills', async () => {
            const response = await request(app)
                .get('/api/projects?skills=javascript')
                .expect(200);

            expect(response.body.data).toHaveLength(2);
        });

        it('should filter projects by budget', async () => {
            const response = await request(app)
                .get('/api/projects?budgetMin=1400&budgetMax=2600')
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe('React Project');
        });

        it('should search projects by title', async () => {
            const response = await request(app)
                .get('/api/projects?search=React')
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].title).toBe('React Project');
        });

        it('should handle pagination', async () => {
            const response = await request(app)
                .get('/api/projects?page=1&limit=1')
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.pages).toBe(2);
        });
    });

    describe('POST /api/projects', () => {
        const validProjectData = {
            title: 'Test Project',
            description: 'This is a test project description',
            requiredSkills: ['javascript', 'react'],
            budgetMin: 1000,
            budgetMax: 2000,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        it('should create project for authenticated client', async () => {
            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${clientToken}`)
                .send(validProjectData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(validProjectData.title);
            expect(response.body.data.clientId._id).toBe(clientUser._id.toString());
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/projects')
                .send(validProjectData)
                .expect(401);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should reject non-client users', async () => {
            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send(validProjectData)
                .expect(403);

            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        it('should validate required fields', async () => {
            const invalidData = { ...validProjectData };
            delete invalidData.title;

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${clientToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate required skills array', async () => {
            const invalidData = { ...validProjectData, requiredSkills: [] };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${clientToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should handle validation errors from model', async () => {
            const invalidData = {
                ...validProjectData,
                budgetMin: 2000,
                budgetMax: 1000 // Invalid: max < min
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${clientToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/projects/:id', () => {
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

        it('should return project by ID', async () => {
            const response = await request(app)
                .get(`/api/projects/${project._id}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(project._id.toString());
            expect(response.body.data.clientId.fullName).toBeDefined();
        });

        it('should include applications when requested', async () => {
            // Add an application
            project.applications.push({
                freelancerId: freelancerUser._id,
                coverLetter: 'Test application',
                proposedRate: 50,
                estimatedDuration: '2 weeks'
            });
            await project.save();

            const response = await request(app)
                .get(`/api/projects/${project._id}?includeApplications=true`)
                .expect(200);

            expect(response.body.data.applications).toHaveLength(1);
            expect(response.body.data.applications[0].freelancerId.fullName).toBeDefined();
        });

        it('should return 404 for non-existent project', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            const response = await request(app)
                .get(`/api/projects/${fakeId}`)
                .expect(404);

            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        it('should handle invalid ObjectId', async () => {
            const response = await request(app)
                .get('/api/projects/invalid-id')
                .expect(500);

            expect(response.body.error.code).toBe('SERVER_ERROR');
        });
    });

    describe('PUT /api/projects/:id', () => {
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

            const response = await request(app)
                .put(`/api/projects/${project._id}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Updated Project');
        });

        it('should require authentication', async () => {
            const updateData = { title: 'Updated Project' };

            const response = await request(app)
                .put(`/api/projects/${project._id}`)
                .send(updateData)
                .expect(401);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should reject non-owner updates', async () => {
            const updateData = { title: 'Updated Project' };

            const response = await request(app)
                .put(`/api/projects/${project._id}`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send(updateData)
                .expect(403);

            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        it('should return 404 for non-existent project', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const updateData = { title: 'Updated Project' };

            const response = await request(app)
                .put(`/api/projects/${fakeId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send(updateData)
                .expect(404);

            expect(response.body.error.code).toBe('NOT_FOUND');
        });
    });

    describe('DELETE /api/projects/:id', () => {
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
            const response = await request(app)
                .delete(`/api/projects/${project._id}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Project deleted successfully');

            // Verify project is deleted
            const deletedProject = await Project.findById(project._id);
            expect(deletedProject).toBeNull();
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .delete(`/api/projects/${project._id}`)
                .expect(401);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should reject non-owner deletion', async () => {
            const response = await request(app)
                .delete(`/api/projects/${project._id}`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(403);

            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        it('should prevent deletion of project with applications', async () => {
            project.applications.push({
                freelancerId: freelancerUser._id,
                coverLetter: 'Test application',
                proposedRate: 50,
                estimatedDuration: '2 weeks'
            });
            await project.save();

            const response = await request(app)
                .delete(`/api/projects/${project._id}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /api/projects/my/projects', () => {
        beforeEach(async () => {
            await Project.create([
                {
                    clientId: clientUser._id,
                    title: 'My Project 1',
                    description: 'Description 1',
                    requiredSkills: ['javascript'],
                    budgetMin: 1000,
                    budgetMax: 2000,
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                {
                    clientId: clientUser._id,
                    title: 'My Project 2',
                    description: 'Description 2',
                    requiredSkills: ['react'],
                    budgetMin: 1500,
                    budgetMax: 2500,
                    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
                }
            ]);
        });

        it('should return client projects', async () => {
            const response = await request(app)
                .get('/api/projects/my/projects')
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.every(p => p.clientId._id === clientUser._id.toString())).toBe(true);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/projects/my/projects')
                .expect(401);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should handle pagination', async () => {
            const response = await request(app)
                .get('/api/projects/my/projects?page=1&limit=1')
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination.pages).toBe(2);
        });
    });

    describe('GET /api/projects/recommended/freelancer', () => {
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
            const response = await request(app)
                .get('/api/projects/recommended/freelancer')
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2); // javascript and react projects
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/api/projects/recommended/freelancer')
                .expect(401);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should handle pagination', async () => {
            const response = await request(app)
                .get('/api/projects/recommended/freelancer?page=1&limit=1')
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
        });
    });

    describe('POST /api/projects/:id/apply', () => {
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

        it('should return not implemented', async () => {
            const response = await request(app)
                .post(`/api/projects/${project._id}/apply`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(501);

            expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
            expect(response.body.error.message).toContain('task 6.2');
        });
    });
});    des
cribe('Project Application Routes', () => {
        let testProject;

        beforeEach(async () => {
            // Create a test project
            const projectData = {
                title: 'Test Project',
                description: 'Test project description',
                requiredSkills: ['javascript', 'react'],
                budgetMin: 1000,
                budgetMax: 2000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${clientToken}`)
                .send(projectData);

            testProject = response.body.data;
        });

        describe('POST /api/projects/:id/apply', () => {
            it('should allow freelancer to apply to project', async () => {
                const applicationData = {
                    coverLetter: 'I am very interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                const response = await request(app)
                    .post(`/api/projects/${testProject._id}/apply`)
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .send(applicationData)
                    .expect(201);

                expect(response.body.success).toBe(true);
                expect(response.body.data.message).toBe('Application submitted successfully');
                expect(response.body.data.application.coverLetter).toBe(applicationData.coverLetter);
            });

            it('should require authentication', async () => {
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await request(app)
                    .post(`/api/projects/${testProject._id}/apply`)
                    .send(applicationData)
                    .expect(401);
            });

            it('should validate required fields', async () => {
                const incompleteData = {
                    coverLetter: 'I am interested in this project'
                    // Missing proposedRate and estimatedDuration
                };

                const response = await request(app)
                    .post(`/api/projects/${testProject._id}/apply`)
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .send(incompleteData)
                    .expect(400);

                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            });

            it('should not allow client to apply to project', async () => {
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                const response = await request(app)
                    .post(`/api/projects/${testProject._id}/apply`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .send(applicationData)
                    .expect(400);

                expect(response.body.error.message).toContain('Only freelancers can apply');
            });
        });

        describe('GET /api/projects/:id/applications', () => {
            beforeEach(async () => {
                // Add test application
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await request(app)
                    .post(`/api/projects/${testProject._id}/apply`)
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .send(applicationData);
            });

            it('should return applications for project owner', async () => {
                const response = await request(app)
                    .get(`/api/projects/${testProject._id}/applications`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(1);
                expect(response.body.data[0].coverLetter).toBe('I am interested in this project');
            });

            it('should not allow non-owner to view applications', async () => {
                const response = await request(app)
                    .get(`/api/projects/${testProject._id}/applications`)
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .expect(403);

                expect(response.body.error.code).toBe('FORBIDDEN');
            });

            it('should require authentication', async () => {
                await request(app)
                    .get(`/api/projects/${testProject._id}/applications`)
                    .expect(401);
            });
        });

        describe('PUT /api/projects/:id/applications/:applicationId', () => {
            let applicationId;

            beforeEach(async () => {
                // Add test application
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                const applyResponse = await request(app)
                    .post(`/api/projects/${testProject._id}/apply`)
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .send(applicationData);

                applicationId = applyResponse.body.data.application._id;
            });

            it('should allow project owner to accept application', async () => {
                const response = await request(app)
                    .put(`/api/projects/${testProject._id}/applications/${applicationId}`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .send({ status: 'accepted' })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.message).toBe('Application accepted successfully');
                expect(response.body.data.project.status).toBe('assigned');
            });

            it('should allow project owner to reject application', async () => {
                const response = await request(app)
                    .put(`/api/projects/${testProject._id}/applications/${applicationId}`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .send({ status: 'rejected' })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.message).toBe('Application rejected successfully');
            });

            it('should validate status field', async () => {
                const response = await request(app)
                    .put(`/api/projects/${testProject._id}/applications/${applicationId}`)
                    .set('Authorization', `Bearer ${clientToken}`)
                    .send({ status: 'invalid_status' })
                    .expect(400);

                expect(response.body.error.code).toBe('VALIDATION_ERROR');
            });

            it('should not allow non-owner to update application', async () => {
                const response = await request(app)
                    .put(`/api/projects/${testProject._id}/applications/${applicationId}`)
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .send({ status: 'accepted' })
                    .expect(403);

                expect(response.body.error.code).toBe('FORBIDDEN');
            });
        });

        describe('GET /api/projects/my/applications', () => {
            beforeEach(async () => {
                // Add test application
                const applicationData = {
                    coverLetter: 'I am interested in this project',
                    proposedRate: 45,
                    estimatedDuration: '2 weeks'
                };

                await request(app)
                    .post(`/api/projects/${testProject._id}/apply`)
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .send(applicationData);
            });

            it('should return freelancer applications', async () => {
                const response = await request(app)
                    .get('/api/projects/my/applications')
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(1);
                expect(response.body.data[0].project.title).toBe('Test Project');
                expect(response.body.data[0].coverLetter).toBe('I am interested in this project');
            });

            it('should require authentication', async () => {
                await request(app)
                    .get('/api/projects/my/applications')
                    .expect(401);
            });

            it('should support status filtering', async () => {
                const response = await request(app)
                    .get('/api/projects/my/applications?status=pending')
                    .set('Authorization', `Bearer ${freelancerToken}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(1);
                expect(response.body.data[0].status).toBe('pending');
            });
        });
    });