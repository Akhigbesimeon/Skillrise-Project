const express = require('express');
const router = express.Router();
const projectService = require('../services/projectService');
const { authenticateToken: auth } = require('../middleware/auth');

// Get projects with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const {
            skills,
            budgetMin,
            budgetMax,
            status,
            search,
            page,
            limit,
            sortBy,
            sortOrder
        } = req.query;

        const filters = {};
        const options = {};

        // Parse filters
        if (skills) {
            filters.skills = Array.isArray(skills) ? skills : skills.split(',');
        }
        if (budgetMin) filters.budgetMin = parseFloat(budgetMin);
        if (budgetMax) filters.budgetMax = parseFloat(budgetMax);
        if (status) filters.status = status;
        if (search) filters.search = search;

        // Parse options
        if (page) options.page = parseInt(page);
        if (limit) options.limit = parseInt(limit);
        if (sortBy) options.sortBy = sortBy;
        if (sortOrder) options.sortOrder = sortOrder;

        const result = await projectService.getProjects(filters, options);
        
        res.json({
            success: true,
            data: result.projects,
            pagination: result.pagination
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Create new project (clients only)
router.post('/', auth, async (req, res) => {
    try {
        const {
            title,
            description,
            requiredSkills,
            budgetMin,
            budgetMax,
            deadline
        } = req.body;

        // Validation
        if (!title || !description || !requiredSkills || !budgetMin || !budgetMax || !deadline) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Required skills must be a non-empty array',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const projectData = {
            title,
            description,
            requiredSkills,
            budgetMin: parseFloat(budgetMin),
            budgetMax: parseFloat(budgetMax),
            deadline: new Date(deadline)
        };

        const project = await projectService.createProject(projectData, req.user.id);
        
        res.status(201).json({
            success: true,
            data: project
        });
    } catch (error) {
        if (error.message.includes('Only clients can create projects')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get project by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { includeApplications } = req.query;

        const project = await projectService.getProjectById(id, includeApplications === 'true');
        
        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        if (error.message === 'Project not found') {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Update project (project owner only)
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const project = await projectService.updateProject(id, updateData, req.user.id);
        
        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        if (error.message === 'Project not found') {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Delete project (project owner only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await projectService.deleteProject(id, req.user.id);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        if (error.message === 'Project not found') {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Cannot delete project with applications')) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get projects by current user (client's projects)
router.get('/my/projects', auth, async (req, res) => {
    try {
        const { page, limit, sortBy, sortOrder } = req.query;
        
        const options = {};
        if (page) options.page = parseInt(page);
        if (limit) options.limit = parseInt(limit);
        if (sortBy) options.sortBy = sortBy;
        if (sortOrder) options.sortOrder = sortOrder;

        const result = await projectService.getProjectsByClient(req.user.id, options);
        
        res.json({
            success: true,
            data: result.projects,
            pagination: result.pagination
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get recommended projects for freelancer
router.get('/recommended/freelancer', auth, async (req, res) => {
    try {
        const { page, limit } = req.query;
        
        const options = {};
        if (page) options.page = parseInt(page);
        if (limit) options.limit = parseInt(limit);

        const result = await projectService.getRecommendedProjects(req.user.id, options);
        
        res.json({
            success: true,
            data: result.projects,
            pagination: result.pagination
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Apply to project (freelancers only)
router.post('/:id/apply', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { coverLetter, proposedRate, estimatedDuration } = req.body;

        // Validation
        if (!coverLetter || !proposedRate || !estimatedDuration) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Cover letter, proposed rate, and estimated duration are required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const applicationData = {
            coverLetter: coverLetter.trim(),
            proposedRate: parseFloat(proposedRate),
            estimatedDuration: estimatedDuration.trim()
        };

        const result = await projectService.applyToProject(id, req.user.id, applicationData);
        
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        if (error.message === 'Project not found') {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Only freelancers can apply') || 
            error.message.includes('Cannot apply to your own project') ||
            error.message.includes('Project is not open') ||
            error.message.includes('Already applied')) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get applications for a project (project owner only)
router.get('/:id/applications', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { page, limit, status } = req.query;

        const options = {};
        if (page) options.page = parseInt(page);
        if (limit) options.limit = parseInt(limit);
        if (status) options.status = status;

        const result = await projectService.getProjectApplications(id, req.user.id, options);
        
        res.json({
            success: true,
            data: result.applications,
            pagination: result.pagination
        });
    } catch (error) {
        if (error.message === 'Project not found') {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Accept/reject application (project owner only)
router.put('/:id/applications/:applicationId', auth, async (req, res) => {
    try {
        const { id, applicationId } = req.params;
        const { status } = req.body;

        if (!status || !['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Status must be either "accepted" or "rejected"',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const result = await projectService.updateApplicationStatus(id, applicationId, status, req.user.id);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        if (error.message === 'Project not found' || error.message === 'Application not found') {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (error.message.includes('Unauthorized') || 
            error.message.includes('Cannot update application')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get freelancer's applications
router.get('/my/applications', auth, async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        
        const options = {};
        if (page) options.page = parseInt(page);
        if (limit) options.limit = parseInt(limit);
        if (status) options.status = status;

        const result = await projectService.getFreelancerApplications(req.user.id, options);
        
        res.json({
            success: true,
            data: result.applications,
            pagination: result.pagination
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'SERVER_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router;