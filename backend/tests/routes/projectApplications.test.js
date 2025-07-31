const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Project = require('../../models/Project');
const jwt = require('jsonwebtoken');

describe('Project Application Routes', () => {
    let clientUser, freelancerUser, freelancerUser2, project;
    let clientToken, freelancerToken, freelancerToken2;

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
                skills: ['python', 'django'],
                experienceLevel: 'advanced',
                hourlyRate: 75
            }
        });
        await freelancerUser2.save();

        // Generate tokens
        clientToken = jwt.sign(
            { id: clientUser._id, userType: 'client' },
            process.env.JWT_SECRET || 'test-secret'
        );

        freelancerToken = jwt.sign(
            { id: freelancerUser._id, userType: 'freelancer' },
            process.env.JWT_SECRET || 'test-secret'
        );

        freelancerToken2 = jwt.sign(
            { id: freelancerUser2._id, userType: 'freelancer' },
            process.env.JWT_SECRET || 'test-secret'
        );

        // Create test project
        project = new Project({
            clientId: clientUser._id,
            title: 'Test Project',
            description: 'A test project for application testing',
            requiredSkills: ['javascript', 'react'],
            budgetMin: 1000,
            budgetMax: 2000,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'open'
        });
        await project.save();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Project.deleteMany({});
    });

    describe('POST /api/projects/:id/apply', () => {
        test('should allow freelancer to apply to project', async () => {
            const applicationData = {
                coverLetter: 'I am interested in this project and have the required skills.',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            const response = await request(app)
                .post(`/api/projects/${project._id}/apply`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send(applicationData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe('Application submitted successfully');
            expect(response.body.data.application).toBeDefined();
            expect(response.body.data.application.coverLetter).toBe(applicationData.coverLetter);
            expect(response.body.data.application.proposedRate).toBe(applicationData.proposedRate);
            expect(response.body.data.application.status).toBe('pending');
        });

        test('should require authentication', async () => {
            const applicationData = {
                coverLetter: 'Test application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            await request(app)
                .post(`/api/projects/${project._id}/apply`)
                .send(applicationData)
                .expect(401);
        });

        test('should validate required fields', async () => {
            const incompleteData = {
                coverLetter: 'Test application'
                // Missing proposedRate and estimatedDuration
            };

            const response = await request(app)
                .post(`/api/projects/${project._id}/apply`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send(incompleteData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toContain('required');
        });

        test('should prevent duplicate applications', async () => {
            const applicationData = {
                coverLetter: 'First application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            // First application should succeed
            await request(app)
                .post(`/api/projects/${project._id}/apply`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send(applicationData)
                .expect(201);

            // Second application should fail
            const response = await request(app)
                .post(`/api/projects/${project._id}/apply`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send(applicationData)
                .expect(400);

            expect(response.body.error.message).toContain('Already applied');
        });

        test('should prevent client from applying to own project', async () => {
            const applicationData = {
                coverLetter: 'Applying to my own project',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            const response = await request(app)
                .post(`/api/projects/${project._id}/apply`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send(applicationData)
                .expect(400);

            expect(response.body.error.message).toContain('Cannot apply to your own project');
        });

        test('should return 404 for non-existent project', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const applicationData = {
                coverLetter: 'Test application',
                proposedRate: 45,
                estimatedDuration: '2 weeks'
            };

            await request(app)
                .post(`/api/projects/${nonExistentId}/apply`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send(applicationData)
                .expect(404);
        });
    });

    describe('GET /api/projects/:id/applications', () => {
        beforeEach(async () => {
            // Add applications to the project
            const applicationData1 = {
                freelancerId: freelancerUser._id,
                coverLetter: 'Application from freelancer 1',
                proposedRate: 45,
                estimatedDuration: '2 weeks',
                status: 'pending'
            };

            const applicationData2 = {
                freelancerId: freelancerUser2._id,
                coverLetter: 'Application from freelancer 2',
                proposedRate: 60,
                estimatedDuration: '3 weeks',
                status: 'pending'
            };

            project.applications.push(applicationData1, applicationData2);
            await project.save();
        });

        test('should allow project owner to view applications', async () => {
            const response = await request(app)
                .get(`/api/projects/${project._id}/applications`)
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data[0].coverLetter).toBeDefined();
            expect(response.body.data[0].proposedRate).toBeDefined();
            expect(response.body.data[0].status).toBe('pending');
        });

        test('should prevent non-owner from viewing applications', async () => {
            const response = await request(app)
                .get(`/api/projects/${project._id}/applications`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(403);

            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        test('should filter applications by status', async () => {
            // Update one application to accepted
            project.applications[0].status = 'accepted';
            await project.save();

            const response = await request(app)
                .get(`/api/projects/${project._id}/applications?status=accepted`)
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].status).toBe('accepted');
        });

        test('should support pagination', async () => {
            const response = await request(app)
                .get(`/api/projects/${project._id}/applications?page=1&limit=1`)
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(1);
        });

        test('should require authentication', async () => {
            await request(app)
                .get(`/api/projects/${project._id}/applications`)
                .expect(401);
        });

        test('should return 404 for non-existent project', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            await request(app)
                .get(`/api/projects/${nonExistentId}/applications`)
                .set('Authorization', `Bearer ${clientToken}`)
                .expect(404);
        });
    });

    describe('PUT /api/projects/:id/applications/:applicationId', () => {
        let applicationId;

        beforeEach(async () => {
            // Add application to the project
            const applicationData = {
                freelancerId: freelancerUser._id,
                coverLetter: 'Test application',
                proposedRate: 45,
                estimatedDuration: '2 weeks',
                status: 'pending'
            };

            project.applications.push(applicationData);
            await project.save();
            applicationId = project.applications[0]._id;
        });

        test('should allow project owner to accept application', async () => {
            const response = await request(app)
                .put(`/api/projects/${project._id}/applications/${applicationId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'accepted' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('accepted successfully');
            expect(response.body.data.application.status).toBe('accepted');
            expect(response.body.data.project.status).toBe('assigned');
        });

        test('should allow project owner to reject application', async () => {
            const response = await request(app)
                .put(`/api/projects/${project._id}/applications/${applicationId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'rejected' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toContain('rejected successfully');
            expect(response.body.data.application.status).toBe('rejected');
        });

        test('should prevent non-owner from updating application', async () => {
            const response = await request(app)
                .put(`/api/projects/${project._id}/applications/${applicationId}`)
                .set('Authorization', `Bearer ${freelancerToken}`)
                .send({ status: 'accepted' })
                .expect(403);

            expect(response.body.error.code).toBe('FORBIDDEN');
        });

        test('should validate status values', async () => {
            const response = await request(app)
                .put(`/api/projects/${project._id}/applications/${applicationId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'invalid_status' })
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toContain('accepted');
            expect(response.body.error.message).toContain('rejected');
        });

        test('should require authentication', async () => {
            await request(app)
                .put(`/api/projects/${project._id}/applications/${applicationId}`)
                .send({ status: 'accepted' })
                .expect(401);
        });

        test('should return 404 for non-existent application', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            await request(app)
                .put(`/api/projects/${project._id}/applications/${nonExistentId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'accepted' })
                .expect(404);
        });
    });

    describe('GET /api/projects/my/applications', () => {
        beforeEach(async () => {
            // Create application
            const applicationData = {
                freelancerId: freelancerUser._id,
                coverLetter: 'My test application',
                proposedRate: 45,
                estimatedDuration: '2 weeks',
                status: 'pending'
            };

            project.applications.push(applicationData);
            await project.save();
        });

        test('should allow freelancer to view their applications', async () => {
            const response = await request(app)
                .get('/api/projects/my/applications')
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].project.title).toBe(project.title);
            expect(response.body.data[0].coverLetter).toBe('My test application');
            expect(response.body.data[0].status).toBe('pending');
        });

        test('should filter applications by status', async () => {
            // Update application status
            project.applications[0].status = 'accepted';
            await project.save();

            const response = await request(app)
                .get('/api/projects/my/applications?status=accepted')
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].status).toBe('accepted');
        });

        test('should support pagination', async () => {
            const response = await request(app)
                .get('/api/projects/my/applications?page=1&limit=10')
                .set('Authorization', `Bearer ${freelancerToken}`)
                .expect(200);

            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(10);
        });

        test('should return empty array for freelancer with no applications', async () => {
            const response = await request(app)
                .get('/api/projects/my/applications')
                .set('Authorization', `Bearer ${freelancerToken2}`)
                .expect(200);

            expect(response.body.data).toHaveLength(0);
        });

        test('should require authentication', async () => {
            await request(app)
                .get('/api/projects/my/applications')
                .expect(401);
        });
    });

    describe('Application Assignment Logic', () => {
        beforeEach(async () => {
            // Add multiple applications
            const applicationData1 = {
                freelancerId: freelancerUser._id,
                coverLetter: 'Application 1',
                proposedRate: 45,
                estimatedDuration: '2 weeks',
                status: 'pending'
            };

            const applicationData2 = {
                freelancerId: freelancerUser2._id,
                coverLetter: 'Application 2',
                proposedRate: 60,
                estimatedDuration: '3 weeks',
                status: 'pending'
            };

            project.applications.push(applicationData1, applicationData2);
            await project.save();
        });

        test('should reject other applications when one is accepted', async () => {
            const applicationId = project.applications[0]._id;

            // Accept first application
            await request(app)
                .put(`/api/projects/${project._id}/applications/${applicationId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'accepted' })
                .expect(200);

            // Check that project is assigned and other application is rejected
            const updatedProject = await Project.findById(project._id);
            expect(updatedProject.status).toBe('assigned');
            expect(updatedProject.assignedFreelancerId.toString()).toBe(freelancerUser._id.toString());
            
            const otherApplication = updatedProject.applications.find(
                app => app._id.toString() !== applicationId.toString()
            );
            expect(otherApplication.status).toBe('rejected');
        });

        test('should not affect other applications when rejecting one', async () => {
            const applicationId = project.applications[0]._id;

            // Reject first application
            await request(app)
                .put(`/api/projects/${project._id}/applications/${applicationId}`)
                .set('Authorization', `Bearer ${clientToken}`)
                .send({ status: 'rejected' })
                .expect(200);

            // Check that project is still open and other application is still pending
            const updatedProject = await Project.findById(project._id);
            expect(updatedProject.status).toBe('open');
            
            const otherApplication = updatedProject.applications.find(
                app => app._id.toString() !== applicationId.toString()
            );
            expect(otherApplication.status).toBe('pending');
        });
    });
});