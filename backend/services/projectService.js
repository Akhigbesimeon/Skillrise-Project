const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const notificationService = require('./notificationService');

class ProjectService {
    // Create a new project
    async createProject(projectData, clientId) {
        try {
            // Validate client exists and is a client
            const client = await User.findById(clientId);
            if (!client) {
                throw new Error('Client not found');
            }
            
            if (client.userType !== 'client') {
                throw new Error('Only clients can create projects');
            }

            const project = new Project({
                ...projectData,
                clientId
            });

            await project.save();
            
            // Populate client information
            await project.populate('clientId', 'fullName clientProfile.companyName clientProfile.rating');
            
            return project;
        } catch (error) {
            throw error;
        }
    }

    // Get projects with filtering and pagination
    async getProjects(filters = {}, options = {}) {
        try {
            const {
                skills,
                budgetMin,
                budgetMax,
                status = 'open',
                clientId,
                search
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            // Build query
            const query = {};
            
            if (status) {
                query.status = status;
            }
            
            if (clientId) {
                query.clientId = clientId;
            }
            
            if (skills && skills.length > 0) {
                query.requiredSkills = { $in: skills };
            }
            
            if (budgetMin !== undefined) {
                query.budgetMin = { $gte: budgetMin };
            }
            
            if (budgetMax !== undefined) {
                query.budgetMax = { $lte: budgetMax };
            }
            
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            // Calculate pagination
            const skip = (page - 1) * limit;
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Execute query
            const projects = await Project.find(query)
                .populate('clientId', 'fullName clientProfile.companyName clientProfile.rating')
                .sort(sortOptions)
                .skip(skip)
                .limit(limit);

            const total = await Project.countDocuments(query);

            return {
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Get project by ID
    async getProjectById(projectId, populateApplications = false) {
        try {
            let query = Project.findById(projectId)
                .populate('clientId', 'fullName clientProfile.companyName clientProfile.rating');

            if (populateApplications) {
                query = query.populate('applications.freelancerId', 'fullName freelancerProfile.skills freelancerProfile.hourlyRate');
            }

            const project = await query;
            
            if (!project) {
                throw new Error('Project not found');
            }

            return project;
        } catch (error) {
            throw error;
        }
    }

    // Update project
    async updateProject(projectId, updateData, clientId) {
        try {
            const project = await Project.findById(projectId);
            
            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is the project owner
            if (project.clientId.toString() !== clientId.toString()) {
                throw new Error('Unauthorized to update this project');
            }

            // Prevent certain updates based on project status
            if (project.status !== 'open' && updateData.status !== 'cancelled') {
                throw new Error('Cannot update project that is not open');
            }

            Object.assign(project, updateData);
            await project.save();
            
            await project.populate('clientId', 'fullName clientProfile.companyName clientProfile.rating');
            
            return project;
        } catch (error) {
            throw error;
        }
    }

    // Delete project (only if no applications)
    async deleteProject(projectId, clientId) {
        try {
            const project = await Project.findById(projectId);
            
            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is the project owner
            if (project.clientId.toString() !== clientId.toString()) {
                throw new Error('Unauthorized to delete this project');
            }

            // Check if project has applications
            if (project.applications.length > 0) {
                throw new Error('Cannot delete project with applications');
            }

            await Project.findByIdAndDelete(projectId);
            
            return { message: 'Project deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    // Get projects by client
    async getProjectsByClient(clientId, options = {}) {
        try {
            return await this.getProjects({ clientId }, options);
        } catch (error) {
            throw error;
        }
    }

    // Get recommended projects for freelancer
    async getRecommendedProjects(freelancerId, options = {}) {
        try {
            const freelancer = await User.findById(freelancerId);
            
            if (!freelancer || freelancer.userType !== 'freelancer') {
                throw new Error('Freelancer not found');
            }

            const skills = freelancer.freelancerProfile?.skills || [];
            
            if (skills.length === 0) {
                // Return general open projects if no skills specified
                return await this.getProjects({}, options);
            }

            return await this.getProjects({ skills }, options);
        } catch (error) {
            throw error;
        }
    }

    // Apply to project
    async applyToProject(projectId, freelancerId, applicationData) {
        try {
            const project = await Project.findById(projectId);
            
            if (!project) {
                throw new Error('Project not found');
            }

            // Validate freelancer
            const freelancer = await User.findById(freelancerId);
            if (!freelancer || freelancer.userType !== 'freelancer') {
                throw new Error('Only freelancers can apply to projects');
            }

            // Check if project is open for applications
            if (project.status !== 'open') {
                throw new Error('Project is not open for applications');
            }

            // Check if freelancer is not the project owner
            if (project.clientId.toString() === freelancerId.toString()) {
                throw new Error('Cannot apply to your own project');
            }

            // Check if freelancer hasn't already applied
            if (!project.canUserApply(freelancerId)) {
                throw new Error('Already applied to this project');
            }

            // Validate application data
            if (applicationData.proposedRate < 0) {
                throw new Error('Proposed rate must be positive');
            }

            if (applicationData.coverLetter.length > 1000) {
                throw new Error('Cover letter must be 1000 characters or less');
            }

            // Add application to project
            const application = {
                freelancerId,
                coverLetter: applicationData.coverLetter,
                proposedRate: applicationData.proposedRate,
                estimatedDuration: applicationData.estimatedDuration,
                appliedAt: new Date(),
                status: 'pending'
            };

            project.applications.push(application);
            await project.save();

            // Populate freelancer info for response
            await project.populate('applications.freelancerId', 'fullName freelancerProfile.skills freelancerProfile.hourlyRate');
            
            // Send notification (don't await to avoid blocking)
            notificationService.notifyApplicationSubmitted(projectId, freelancerId, project.clientId)
                .catch(error => console.error('Notification error:', error));
            
            return {
                message: 'Application submitted successfully',
                application: project.applications[project.applications.length - 1]
            };
        } catch (error) {
            throw error;
        }
    }

    // Get project applications (for project owner)
    async getProjectApplications(projectId, clientId, options = {}) {
        try {
            const project = await Project.findById(projectId);
            
            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is the project owner
            if (project.clientId.toString() !== clientId.toString()) {
                throw new Error('Unauthorized to view applications');
            }

            const {
                page = 1,
                limit = 20,
                status
            } = options;

            let applications = project.applications;

            // Filter by status if provided
            if (status) {
                applications = applications.filter(app => app.status === status);
            }

            // Pagination
            const skip = (page - 1) * limit;
            const paginatedApplications = applications.slice(skip, skip + limit);

            // Populate freelancer information
            await project.populate('applications.freelancerId', 'fullName freelancerProfile.skills freelancerProfile.hourlyRate freelancerProfile.experienceLevel');

            return {
                applications: paginatedApplications,
                pagination: {
                    page,
                    limit,
                    total: applications.length,
                    pages: Math.ceil(applications.length / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Update application status (accept/reject)
    async updateApplicationStatus(projectId, applicationId, status, clientId) {
        try {
            const project = await Project.findById(projectId);
            
            if (!project) {
                throw new Error('Project not found');
            }

            // Check if user is the project owner
            if (project.clientId.toString() !== clientId.toString()) {
                throw new Error('Unauthorized to update application');
            }

            // Find the application
            const application = project.applications.id(applicationId);
            if (!application) {
                throw new Error('Application not found');
            }

            // Check if application can be updated
            if (application.status !== 'pending') {
                throw new Error('Cannot update application that is not pending');
            }

            // Update application status
            application.status = status;

            // If accepting, assign project and reject other applications
            if (status === 'accepted') {
                project.status = 'assigned';
                project.assignedFreelancerId = application.freelancerId;
                
                // Reject all other pending applications
                project.applications.forEach(app => {
                    if (app._id.toString() !== applicationId && app.status === 'pending') {
                        app.status = 'rejected';
                    }
                });
            }

            await project.save();

            // Populate freelancer info
            await project.populate('applications.freelancerId', 'fullName freelancerProfile.skills freelancerProfile.hourlyRate');
            
            // Send notification (don't await to avoid blocking)
            notificationService.notifyApplicationStatusUpdate(
                projectId, 
                applicationId, 
                status, 
                application.freelancerId, 
                clientId, 
                project.title
            ).catch(error => console.error('Notification error:', error));
            
            return {
                message: `Application ${status} successfully`,
                application,
                project
            };
        } catch (error) {
            throw error;
        }
    }

    // Get freelancer's applications
    async getFreelancerApplications(freelancerId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                status
            } = options;

            // Build aggregation pipeline
            const pipeline = [
                { $unwind: '$applications' },
                { $match: { 'applications.freelancerId': new mongoose.Types.ObjectId(freelancerId) } }
            ];

            // Filter by status if provided
            if (status) {
                pipeline.push({ $match: { 'applications.status': status } });
            }

            // Add project info and sort
            pipeline.push(
                {
                    $lookup: {
                        from: 'users',
                        localField: 'clientId',
                        foreignField: '_id',
                        as: 'client'
                    }
                },
                { $unwind: '$client' },
                { $sort: { 'applications.appliedAt': -1 } }
            );

            // Execute aggregation
            const applications = await Project.aggregate(pipeline);

            // Pagination
            const skip = (page - 1) * limit;
            const paginatedApplications = applications.slice(skip, skip + limit);

            // Format response
            const formattedApplications = paginatedApplications.map(item => ({
                _id: item.applications._id,
                project: {
                    _id: item._id,
                    title: item.title,
                    description: item.description,
                    budgetMin: item.budgetMin,
                    budgetMax: item.budgetMax,
                    deadline: item.deadline,
                    status: item.status,
                    client: {
                        fullName: item.client.fullName,
                        companyName: item.client.clientProfile?.companyName
                    }
                },
                coverLetter: item.applications.coverLetter,
                proposedRate: item.applications.proposedRate,
                estimatedDuration: item.applications.estimatedDuration,
                appliedAt: item.applications.appliedAt,
                status: item.applications.status
            }));

            return {
                applications: formattedApplications,
                pagination: {
                    page,
                    limit,
                    total: applications.length,
                    pages: Math.ceil(applications.length / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Get application status tracking for notifications
    async getApplicationStatusUpdates(freelancerId, since) {
        try {
            const pipeline = [
                { $unwind: '$applications' },
                { 
                    $match: { 
                        'applications.freelancerId': new mongoose.Types.ObjectId(freelancerId),
                        'applications.appliedAt': { $gte: since }
                    } 
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'clientId',
                        foreignField: '_id',
                        as: 'client'
                    }
                },
                { $unwind: '$client' },
                { $sort: { 'applications.appliedAt': -1 } }
            ];

            const updates = await Project.aggregate(pipeline);
            
            return updates.map(item => ({
                projectId: item._id,
                projectTitle: item.title,
                clientName: item.client.fullName,
                applicationStatus: item.applications.status,
                appliedAt: item.applications.appliedAt
            }));
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ProjectService();