const mongoose = require('mongoose');
const Notification = require('../../models/Notification');
const User = require('../../models/User');

describe('Notification Model', () => {
    let testUser;

    beforeEach(async () => {
        // Create a test user
        testUser = new User({
            fullName: 'Test User',
            email: 'test@example.com',
            password: 'hashedpassword',
            role: 'freelancer',
            isActive: true,
            isEmailVerified: true
        });
        await testUser.save();
    });

    afterEach(async () => {
        await Notification.deleteMany({});
        await User.deleteMany({});
    });

    describe('Notification Creation', () => {
        it('should create a notification with required fields', async () => {
            const notificationData = {
                userId: testUser._id,
                type: 'project_application',
                title: 'New Project Application',
                message: 'You have received a new project application'
            };

            const notification = await Notification.createNotification(notificationData);

            expect(notification).toBeDefined();
            expect(notification.userId.toString()).toBe(testUser._id.toString());
            expect(notification.type).toBe('project_application');
            expect(notification.title).toBe('New Project Application');
            expect(notification.message).toBe('You have received a new project application');
            expect(notification.isRead).toBe(false);
            expect(notification.priority).toBe('medium');
        });

        it('should create a notification with optional fields', async () => {
            const notificationData = {
                userId: testUser._id,
                type: 'system_announcement',
                title: 'System Maintenance',
                message: 'Scheduled maintenance tonight',
                data: { maintenanceTime: '2024-01-01T02:00:00Z' },
                actionUrl: '/announcements',
                priority: 'high'
            };

            const notification = await Notification.createNotification(notificationData);

            expect(notification.data.maintenanceTime).toBe('2024-01-01T02:00:00Z');
            expect(notification.actionUrl).toBe('/announcements');
            expect(notification.priority).toBe('high');
        });

        it('should fail to create notification without required fields', async () => {
            const notificationData = {
                userId: testUser._id,
                type: 'project_application'
                // Missing title and message
            };

            await expect(Notification.createNotification(notificationData))
                .rejects.toThrow();
        });

        it('should fail to create notification with invalid type', async () => {
            const notificationData = {
                userId: testUser._id,
                type: 'invalid_type',
                title: 'Test',
                message: 'Test message'
            };

            await expect(Notification.createNotification(notificationData))
                .rejects.toThrow();
        });
    });

    describe('Notification Queries', () => {
        beforeEach(async () => {
            // Create test notifications
            await Notification.createNotification({
                userId: testUser._id,
                type: 'project_application',
                title: 'Application 1',
                message: 'First application',
                isRead: false
            });

            await Notification.createNotification({
                userId: testUser._id,
                type: 'message_received',
                title: 'Message 1',
                message: 'First message',
                isRead: true
            });

            await Notification.createNotification({
                userId: testUser._id,
                type: 'project_application',
                title: 'Application 2',
                message: 'Second application',
                isRead: false
            });
        });

        it('should get unread count correctly', async () => {
            const count = await Notification.getUnreadCount(testUser._id);
            expect(count).toBe(2);
        });

        it('should mark notifications as read', async () => {
            const notifications = await Notification.find({ userId: testUser._id, isRead: false });
            const notificationIds = notifications.map(n => n._id);

            await Notification.markAsRead(testUser._id, notificationIds);

            const unreadCount = await Notification.getUnreadCount(testUser._id);
            expect(unreadCount).toBe(0);
        });

        it('should mark all notifications as read', async () => {
            await Notification.markAsRead(testUser._id);

            const unreadCount = await Notification.getUnreadCount(testUser._id);
            expect(unreadCount).toBe(0);
        });

        it('should cleanup old notifications', async () => {
            // Create an old notification
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 35);

            const oldNotification = new Notification({
                userId: testUser._id,
                type: 'system_announcement',
                title: 'Old Announcement',
                message: 'This is old',
                isRead: true,
                createdAt: oldDate
            });
            await oldNotification.save();

            const result = await Notification.cleanupOld(30);
            expect(result.deletedCount).toBe(1);

            const remainingNotifications = await Notification.find({ userId: testUser._id });
            expect(remainingNotifications.length).toBe(3); // Original 3 notifications remain
        });
    });

    describe('Notification Virtual Fields', () => {
        it('should calculate timeAgo correctly', async () => {
            const notification = await Notification.createNotification({
                userId: testUser._id,
                type: 'project_application',
                title: 'Test',
                message: 'Test message'
            });

            expect(notification.timeAgo).toBe('Just now');
        });
    });

    describe('Notification Indexing', () => {
        it('should have proper indexes for efficient queries', async () => {
            const indexes = await Notification.collection.getIndexes();
            
            // Check for compound indexes
            const hasUserIdCreatedAtIndex = Object.keys(indexes).some(key => 
                indexes[key].some(index => 
                    index.userId === 1 && index.createdAt === -1
                )
            );
            
            expect(hasUserIdCreatedAtIndex).toBe(true);
        });
    });

    describe('Notification Expiration', () => {
        it('should set expiration date correctly', async () => {
            const notification = await Notification.createNotification({
                userId: testUser._id,
                type: 'project_application',
                title: 'Test',
                message: 'Test message'
            });

            expect(notification.expiresAt).toBeDefined();
            expect(notification.expiresAt).toBeInstanceOf(Date);
            
            // Should expire in about 30 days
            const daysDiff = Math.floor((notification.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
            expect(daysDiff).toBeCloseTo(30, 0);
        });
    });
});