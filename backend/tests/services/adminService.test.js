const mongoose = require('mongoose');
const adminService = require('../../services/adminService');
const User = require('../../models/User');
const Project = require('../../models/Project');
const Course = require('../../models/Course');
const UserProgress = require('../../models/UserProgress');
const Mentorship = require('../../models/Mentorship');
const Message = require('../../models/Message');

describe('AdminService', () => {
    let testUsers = [];
    let testAdmin;

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

        // Create test users
        const userRoles = ['freelancer', 'mentor', 'client'];
        for (let i = 0; i < 6; i++) {
            const user = new User({
                fullName: `Test User ${i + 1}`,
                email: `user${i + 1}@example.com`,
                password: 'hashedpassword',
                role: userRoles[i % 3],
                isActive: i % 2 === 0, // Alternate active/inactive
                isEmailVerified: true
            });
            await user.save();
            testUsers.push(user);
        }
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Project.deleteMany({});
        await Course.deleteMany({});
        await UserProgress.deleteMany({});
        await Mentorship.deleteMany({});
        await Message.deleteMany({});
        testUsers = [];
    });

    describe('getAllUsers', () => {
        it('should get all users with default pagination', async () => {
            const result = await adminService.getAllUsers();

            expect(result.success).toBe(true);
            expect(result.users).toHaveLength(7); // 6 test users + 1 admin
            expect(result.pagination).toBeDefined();
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.total).toBe(7);
        });

        it('should filter users by role', async () => {
            const result = await adminService.getAllUsers({ role: 'freelancer' });

            expect(result.success).toBe(true);
            expect(result.users.length).toBe(2); // 2 freelancers
            result.users.forEach(user => {
                expect(user.role).toBe('freelancer');
            });
        });

        it('should filter users by status', async () => {
            const result = await adminService.getAllUsers({ status: 'active' });

            expect(result.success).toBe(true);
            result.users.forEach(user => {
                expect(user.isActive).toBe(true);
            });
        });

        it('should search users by name and email', async () => {
            const result = await adminService.getAllUsers({ search: 'User 1' });

            expect(result.success).toBe(true);
            expect(result.users.length).toBe(1);
            expect(result.users[0].fullName).toBe('Test User 1');
        });

        it('should paginate results correctly', async () => {
            const result = await adminService.getAllUsers({ page: 1, limit: 3 });

            expect(result.success).toBe(true);
            expect(result.users.length).toBe(3);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.pages).toBe(3); // 7 users / 3 per page = 3 pages
        });

        it('should sort users correctly', async () => {
            const result = await adminService.getAllUsers({ 
                sortBy: 'fullName', 
                sortOrder: 'asc' 
            });

            expect(result.success).toBe(true);
            expect(result.users[0].fullName).toBe('Admin User');
        });
    });

    describe('getUserById', () => {
        it('should get user details with statistics', async () => {
            const userId = testUsers[0]._id;
            const result = await adminService.getUserById(userId);

            expect(result.success).toBe(true);
            expect(result.user._id.toString()).toBe(userId.toString());
            expect(result.user.statistics).toBeDefined();
            expect(result.user.activityLog).toBeDefined();
        });

        it('should return error for non-existent user', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const result = await adminService.getUserById(fakeId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });
    });

    describe('updateUserStatus', () => {
        it('should activate inactive user', async () => {
            const inactiveUser = testUsers.find(user => !user.isActive);
            const result = await adminService.updateUserStatus(
                inactiveUser._id, 
                'active', 
                'Test activation'
            );

            expect(result.success).toBe(true);
            expect(result.message).toContain('activated');

            // Verify user is now active
            const updatedUser = await User.findById(inactiveUser._id);
            expect(updatedUser.isActive).toBe(true);
            expect(updatedUser.adminActions).toHaveLength(1);
            expect(updatedUser.adminActions[0].action).toBe('activated');
        });

        it('should deactivate active user', async () => {
            const activeUser = testUsers.find(user => user.isActive);
            const result = await adminService.updateUserStatus(
                activeUser._id, 
                'inactive', 
                'Test deactivation'
            );

            expect(result.success).toBe(true);
            expect(result.message).toContain('deactivated');

            // Verify user is now inactive
            const updatedUser = await User.findById(activeUser._id);
            expect(updatedUser.isActive).toBe(false);
            expect(updatedUser.adminActions).toHaveLength(1);
            expect(updatedUser.adminActions[0].action).toBe('deactivated');
        });

        it('should return error for non-existent user', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const result = await adminService.updateUserStatus(fakeId, 'active');

            expect(result.success).toBe(false);
            expect(result.error).toBe('User not found');
        });
    });

    describe('getUserStatistics', () => {
        beforeEach(async () => {
            const userId = testUsers[0]._id;

            // Create test data for statistics
            const project = new Project({
                clientId: testUsers[1]._id,
                title: 'Test Project',
                description: 'Test description',
                requiredSkills: ['JavaScript'],
                budgetMin: 100,
                budgetMax: 500,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'open',
                applications: [{
                    freelancerId: userId,
                    coverLetter: 'Test cover letter',
                    proposedRate: 50,
                    estimatedDuration: '1 week',
                    appliedAt: new Date(),
                    status: 'pending'
                }]
            });
            await project.save();

            const course = new Course({
                title: 'Test Course',
                description: 'Test course description',
                category: 'Programming',
                difficultyLevel: 'beginner',
                estimatedDuration: 10,
                modules: [],
                isActive: true,
                createdBy: testAdmin._id
            });
            await course.save();

            const userProgress = new UserProgress({
                userId: userId,
                courseId: course._id,
                enrolledAt: new Date(),
                status: 'enrolled',
                moduleProgress: [],
                overallProgress: 0
            });
            await userProgress.save();

            const message = new Message({
                senderId: userId,
                recipientId: testUsers[1]._id,
                content: 'Test message',
                messageType: 'text'
            });
            await message.save();
        });

        it('should calculate user statistics correctly', async () => {
            const userId = testUsers[0]._id;
            const stats = await adminService.getUserStatistics(userId);

            expect(stats.projects.applied).toBe(1);
            expect(stats.courses.enrolled).toBe(1);
            expect(stats.messages.sent).toBe(1);
        });
    });

    describe('bulkUpdateUsers', () => {
        it('should update multiple users successfully', async () => {
            const userIds = testUsers.slice(0, 3).map(user => user._id);
            const result = await adminService.bulkUpdateUsers(userIds, {
                status: 'active',
                reason: 'Bulk activation test'
            });

            expect(result.success).toBe(true);
            expect(result.results.success).toBe(3);
            expect(result.results.failed).toBe(0);

            // Verify all users are now active
            const updatedUsers = await User.find({ _id: { $in: userIds } });
            updatedUsers.forEach(user => {
                expect(user.isActive).toBe(true);
            });
        });

        it('should handle partial failures in bulk update', async () => {
            const userIds = [
                testUsers[0]._id,
                new mongoose.Types.ObjectId(), // Non-existent user
                testUsers[1]._id
            ];

            const result = await adminService.bulkUpdateUsers(userIds, {
                status: 'active',
                reason: 'Bulk test with failure'
            });

            expect(result.success).toBe(true);
            expect(result.results.success).toBe(2);
            expect(result.results.failed).toBe(1);
            expect(result.results.errors).toHaveLength(1);
        });
    });

    describe('exportUsers', () => {
        it('should export users in JSON format', async () => {
            const result = await adminService.exportUsers('json');

            expect(result.success).toBe(true);
            expect(result.contentType).toBe('application/json');
            expect(result.filename).toMatch(/users_export_\d{4}-\d{2}-\d{2}\.json/);
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data.length).toBe(7); // All users
        });

        it('should export users in CSV format', async () => {
            const result = await adminService.exportUsers('csv');

            expect(result.success).toBe(true);
            expect(result.contentType).toBe('text/csv');
            expect(result.filename).toMatch(/users_export_\d{4}-\d{2}-\d{2}\.csv/);
            expect(typeof result.data).toBe('string');
            expect(result.data).toContain('ID,Full Name,Email'); // CSV headers
        });

        it('should apply filters when exporting', async () => {
            const result = await adminService.exportUsers('json', { role: 'freelancer' });

            expect(result.success).toBe(true);
            expect(result.data.length).toBe(2); // Only freelancers
            result.data.forEach(user => {
                expect(user.role).toBe('freelancer');
            });
        });
    });

    describe('getPlatformStatistics', () => {
        beforeEach(async () => {
            // Create additional test data for statistics
            const course = new Course({
                title: 'Test Course',
                description: 'Test course description',
                category: 'Programming',
                difficultyLevel: 'beginner',
                estimatedDuration: 10,
                modules: [],
                isActive: true,
                createdBy: testAdmin._id
            });
            await course.save();

            const project = new Project({
                clientId: testUsers[0]._id,
                title: 'Test Project',
                description: 'Test description',
                requiredSkills: ['JavaScript'],
                budgetMin: 100,
                budgetMax: 500,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'open'
            });
            await project.save();
        });

        it('should return comprehensive platform statistics', async () => {
            const result = await adminService.getPlatformStatistics();

            expect(result.success).toBe(true);
            expect(result.statistics.overview).toBeDefined();
            expect(result.statistics.overview.totalUsers).toBe(7);
            expect(result.statistics.overview.totalCourses).toBe(1);
            expect(result.statistics.overview.totalProjects).toBe(1);
            expect(result.statistics.userRoles).toBeDefined();
            expect(result.statistics.monthlyRegistrations).toBeDefined();
        });

        it('should calculate user role distribution correctly', async () => {
            const result = await adminService.getPlatformStatistics();

            expect(result.statistics.userRoles.freelancer).toBe(2);
            expect(result.statistics.userRoles.mentor).toBe(2);
            expect(result.statistics.userRoles.client).toBe(2);
            expect(result.statistics.userRoles.admin).toBe(1);
        });
    });

    describe('convertToCSV', () => {
        it('should convert user data to CSV format', async () => {
            const userData = [
                {
                    id: 'user1',
                    fullName: 'John Doe',
                    email: 'john@example.com',
                    role: 'freelancer',
                    isActive: true,
                    isEmailVerified: true,
                    createdAt: new Date(),
                    statistics: {
                        projects: { applied: 5, completed: 3 },
                        courses: { enrolled: 2, completed: 1 },
                        messages: { sent: 10 }
                    }
                }
            ];

            const csv = adminService.convertToCSV(userData);

            expect(csv).toContain('ID,Full Name,Email');
            expect(csv).toContain('user1,"John Doe","john@example.com"');
            expect(csv).toContain('freelancer');
        });

        it('should handle empty data array', async () => {
            const csv = adminService.convertToCSV([]);
            expect(csv).toBe('');
        });
    });

    describe('getSystemHealth', () => {
        it('should return system health information', async () => {
            const result = await adminService.getSystemHealth();

            expect(result.success).toBe(true);
            expect(result.health).toBeDefined();
            expect(result.health.timestamp).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            // Mock a database error
            const originalFind = User.find;
            User.find = jest.fn().mockRejectedValue(new Error('Database error'));

            const result = await adminService.getAllUsers();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');

            // Restore original method
            User.find = originalFind;
        });

        it('should handle invalid user ID format', async () => {
            const result = await adminService.getUserById('invalid-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('getUserActivityLog', () => {
        beforeEach(async () => {
            const userId = testUsers[0]._id;

            // Create test activities
            const project = new Project({
                clientId: testUsers[1]._id,
                title: 'Test Project',
                description: 'Test description',
                requiredSkills: ['JavaScript'],
                budgetMin: 100,
                budgetMax: 500,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'open',
                assignedFreelancerId: userId
            });
            await project.save();

            const message = new Message({
                senderId: userId,
                recipientId: testUsers[1]._id,
                content: 'Test message',
                messageType: 'text'
            });
            await message.save();
        });

        it('should return user activity log', async () => {
            const userId = testUsers[0]._id;
            const activities = await adminService.getUserActivityLog(userId);

            expect(Array.isArray(activities)).toBe(true);
            expect(activities.length).toBeGreaterThan(0);
            
            const projectActivity = activities.find(a => a.type === 'project');
            expect(projectActivity).toBeDefined();
            expect(projectActivity.action).toBe('assigned');
            
            const messageActivity = activities.find(a => a.type === 'message');
            expect(messageActivity).toBeDefined();
            expect(messageActivity.action).toBe('sent');
        });

        it('should limit activity log results', async () => {
            const userId = testUsers[0]._id;
            const activities = await adminService.getUserActivityLog(userId, 1);

            expect(activities.length).toBeLessThanOrEqual(1);
        });
    });
});