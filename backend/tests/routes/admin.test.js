const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const adminRoutes = require('../../routes/admin');
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const adminService = require('../../services/adminService');

// Mock the admin service
jest.mock('../../services/adminService');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes', () => {
    let testAdmin;
    let testUser;
    let adminToken;
    let userToken;

    beforeEach(async () => {
        // Create test admin
        testAdmin = new User({
            fullName: 'Admin User',
            email: 'admin@example.com',
            password: 'hashedpassword',
            role: 'admin',
            isActive: true,
            isEmailVerified: true
        });
        await testAdmin.save();

        // Create test regular user
        testUser = new User({
            fullName: 'Regular User',
            email: 'user@example.com',
            password: 'hashedpassword',
            role: 'freelancer',
            isActive: true,
            isEmailVerified: true
        });
        await testUser.save();

        // Generate tokens
        adminToken = jwt.sign(
            { id: testAdmin._id },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );

        userToken = jwt.sign(
            { id: testUser._id },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );

        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    describe('Authentication and Authorization', () => {
        it('should require authentication', async () => {
            await request(app)
                .get('/api/admin/users')
                .expect(401);
        });

        it('should require admin role', async () => {
            await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            expect(await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${userToken}`)
                .then(res => res.body.message))
                .toContain('Admin privileges required');
        });

        it('should allow admin access', async () => {
            adminService.getAllUsers.mockResolvedValue({
                success: true,
                users: [],
                pagination: { page: 1, limit: 20, total: 0, pages: 0 }
            });

            await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });
    });

    describe('GET /api/admin/users', () => {
        it('should get all users with default parameters', async () => {
            const mockUsers = [
                { _id: 'user1', fullName: 'User 1', email: 'user1@example.com', role: 'freelancer' },
                { _id: 'user2', fullName: 'User 2', email: 'user2@example.com', role: 'mentor' }
            ];

            adminService.getAllUsers.mockResolvedValue({
                success: true,
                users: mockUsers,
                pagination: { page: 1, limit: 20, total: 2, pages: 1 }
            });

            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockUsers);
            expect(response.body.pagination).toBeDefined();
            expect(adminService.getAllUsers).toHaveBeenCalledWith({
                page: 1,
                limit: 20,
                search: '',
                role: '',
                status: '',
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });
        });

        it('should handle query parameters', async () => {
            adminService.getAllUsers.mockResolvedValue({
                success: true,
                users: [],
                pagination: { page: 2, limit: 10, total: 0, pages: 0 }
            });

            await request(app)
                .get('/api/admin/users?page=2&limit=10&search=john&role=freelancer&status=active&sortBy=fullName&sortOrder=asc')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(adminService.getAllUsers).toHaveBeenCalledWith({
                page: 2,
                limit: 10,
                search: 'john',
                role: 'freelancer',
                status: 'active',
                sortBy: 'fullName',
                sortOrder: 'asc'
            });
        });

        it('should handle service errors', async () => {
            adminService.getAllUsers.mockResolvedValue({
                success: false,
                error: 'Database error'
            });

            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Failed to fetch users');
        });
    });

    describe('GET /api/admin/users/:id', () => {
        it('should get specific user details', async () => {
            const mockUser = {
                _id: 'user1',
                fullName: 'User 1',
                email: 'user1@example.com',
                role: 'freelancer',
                statistics: { projects: { applied: 5 } },
                activityLog: []
            };

            adminService.getUserById.mockResolvedValue({
                success: true,
                user: mockUser
            });

            const response = await request(app)
                .get('/api/admin/users/user1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockUser);
            expect(adminService.getUserById).toHaveBeenCalledWith('user1');
        });

        it('should handle user not found', async () => {
            adminService.getUserById.mockResolvedValue({
                success: false,
                error: 'User not found'
            });

            const response = await request(app)
                .get('/api/admin/users/nonexistent')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User not found');
        });
    });

    describe('PUT /api/admin/users/:id/status', () => {
        it('should update user status successfully', async () => {
            adminService.updateUserStatus.mockResolvedValue({
                success: true,
                message: 'User activated successfully'
            });

            const response = await request(app)
                .put('/api/admin/users/user1/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'active', reason: 'Test activation' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('User activated successfully');
            expect(adminService.updateUserStatus).toHaveBeenCalledWith('user1', 'active', 'Test activation');
        });

        it('should validate status parameter', async () => {
            const response = await request(app)
                .put('/api/admin/users/user1/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'invalid' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Valid status');
        });

        it('should require status parameter', async () => {
            const response = await request(app)
                .put('/api/admin/users/user1/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Valid status');
        });

        it('should handle service errors', async () => {
            adminService.updateUserStatus.mockResolvedValue({
                success: false,
                error: 'User not found'
            });

            const response = await request(app)
                .put('/api/admin/users/user1/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'active' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User not found');
        });
    });

    describe('PUT /api/admin/users/bulk', () => {
        it('should perform bulk update successfully', async () => {
            adminService.bulkUpdateUsers.mockResolvedValue({
                success: true,
                results: { success: 2, failed: 0, errors: [] }
            });

            const response = await request(app)
                .put('/api/admin/users/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    userIds: ['user1', 'user2'],
                    updates: { status: 'active', reason: 'Bulk activation' }
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.results.success).toBe(2);
            expect(adminService.bulkUpdateUsers).toHaveBeenCalledWith(
                ['user1', 'user2'],
                { status: 'active', reason: 'Bulk activation' }
            );
        });

        it('should validate userIds parameter', async () => {
            const response = await request(app)
                .put('/api/admin/users/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ updates: { status: 'active' } })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('User IDs array is required');
        });

        it('should validate updates parameter', async () => {
            const response = await request(app)
                .put('/api/admin/users/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ userIds: ['user1'] })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Updates object is required');
        });

        it('should validate userIds is not empty', async () => {
            const response = await request(app)
                .put('/api/admin/users/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ userIds: [], updates: { status: 'active' } })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('User IDs array is required');
        });
    });

    describe('GET /api/admin/users/export/:format', () => {
        it('should export users in JSON format', async () => {
            const mockData = [
                { id: 'user1', fullName: 'User 1', email: 'user1@example.com' }
            ];

            adminService.exportUsers.mockResolvedValue({
                success: true,
                data: mockData,
                contentType: 'application/json',
                filename: 'users_export_2024-01-01.json'
            });

            const response = await request(app)
                .get('/api/admin/users/export/json')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.headers['content-type']).toContain('application/json');
            expect(response.headers['content-disposition']).toContain('users_export_2024-01-01.json');
            expect(adminService.exportUsers).toHaveBeenCalledWith('json', {});
        });

        it('should export users in CSV format', async () => {
            const mockCSV = 'ID,Name,Email\nuser1,User 1,user1@example.com';

            adminService.exportUsers.mockResolvedValue({
                success: true,
                data: mockCSV,
                contentType: 'text/csv',
                filename: 'users_export_2024-01-01.csv'
            });

            const response = await request(app)
                .get('/api/admin/users/export/csv')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.text).toBe(mockCSV);
        });

        it('should validate export format', async () => {
            const response = await request(app)
                .get('/api/admin/users/export/xml')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Format must be json or csv');
        });

        it('should handle export filters', async () => {
            adminService.exportUsers.mockResolvedValue({
                success: true,
                data: [],
                contentType: 'application/json',
                filename: 'users_export_2024-01-01.json'
            });

            await request(app)
                .get('/api/admin/users/export/json?role=freelancer&status=active')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(adminService.exportUsers).toHaveBeenCalledWith('json', {
                role: 'freelancer',
                status: 'active'
            });
        });
    });

    describe('GET /api/admin/analytics', () => {
        it('should get platform analytics', async () => {
            const mockAnalytics = {
                overview: { totalUsers: 100, activeUsers: 85 },
                userRoles: { freelancer: 50, mentor: 30, client: 20 },
                monthlyRegistrations: []
            };

            adminService.getPlatformStatistics.mockResolvedValue({
                success: true,
                statistics: mockAnalytics
            });

            const response = await request(app)
                .get('/api/admin/analytics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockAnalytics);
            expect(adminService.getPlatformStatistics).toHaveBeenCalled();
        });

        it('should handle analytics service errors', async () => {
            adminService.getPlatformStatistics.mockResolvedValue({
                success: false,
                error: 'Analytics error'
            });

            const response = await request(app)
                .get('/api/admin/analytics')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Failed to fetch analytics');
        });
    });

    describe('GET /api/admin/system/health', () => {
        it('should get system health status', async () => {
            const mockHealth = {
                database: { status: 'healthy' },
                connections: { active: 10 },
                timestamp: new Date()
            };

            adminService.getSystemHealth.mockResolvedValue({
                success: true,
                health: mockHealth
            });

            const response = await request(app)
                .get('/api/admin/system/health')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockHealth);
            expect(adminService.getSystemHealth).toHaveBeenCalled();
        });
    });

    describe('GET /api/admin/moderation/flagged', () => {
        it('should get flagged content', async () => {
            const mockFlagged = [];

            adminService.getFlaggedContent.mockResolvedValue({
                success: true,
                flaggedContent: mockFlagged,
                pagination: { page: 1, limit: 20, total: 0, pages: 0 }
            });

            const response = await request(app)
                .get('/api/admin/moderation/flagged')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockFlagged);
            expect(adminService.getFlaggedContent).toHaveBeenCalledWith({
                page: 1,
                limit: 20,
                type: '',
                status: 'pending'
            });
        });

        it('should handle query parameters for moderation', async () => {
            adminService.getFlaggedContent.mockResolvedValue({
                success: true,
                flaggedContent: [],
                pagination: { page: 1, limit: 20, total: 0, pages: 0 }
            });

            await request(app)
                .get('/api/admin/moderation/flagged?page=2&limit=10&type=message&status=resolved')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(adminService.getFlaggedContent).toHaveBeenCalledWith({
                page: 2,
                limit: 10,
                type: 'message',
                status: 'resolved'
            });
        });
    });

    describe('GET /api/admin/reports (Legacy)', () => {
        it('should redirect to analytics endpoint', async () => {
            const response = await request(app)
                .get('/api/admin/reports')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(302);

            expect(response.headers.location).toBe('/api/admin/analytics');
        });
    });

    describe('Error Handling', () => {
        it('should handle unexpected errors', async () => {
            adminService.getAllUsers.mockRejectedValue(new Error('Unexpected error'));

            const response = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Server error');
        });

        it('should handle malformed JSON', async () => {
            await request(app)
                .put('/api/admin/users/user1/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);
        });
    });

    describe('Input Validation', () => {
        it('should handle invalid user ID in status update', async () => {
            adminService.updateUserStatus.mockResolvedValue({
                success: false,
                error: 'Invalid user ID'
            });

            const response = await request(app)
                .put('/api/admin/users/invalid-id/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'active' })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should handle empty request body in bulk update', async () => {
            const response = await request(app)
                .put('/api/admin/users/bulk')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('User IDs array is required');
        });
    });
});