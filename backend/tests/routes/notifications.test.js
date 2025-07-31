const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const notificationRoutes = require('../../routes/notifications');
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const NotificationPreference = require('../../models/NotificationPreference');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('Notification Routes', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
        // Create test user
        testUser = new User({
            fullName: 'Test User',
            email: 'test@example.com',
            password: 'hashedpassword',
            role: 'freelancer',
            isActive: true,
            isEmailVerified: true
        });
        await testUser.save();

        // Generate auth token
        authToken = jwt.sign(
            { id: testUser._id },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );

        // Create test notifications
        await Notification.createNotification({
            userId: testUser._id,
            type: 'project_application',
            title: 'New Application',
            message: 'You have a new project application',
            isRead: false
        });

        await Notification.createNotification({
            userId: testUser._id,
            type: 'message_received',
            title: 'New Message',
            message: 'You have a new message',
            isRead: true
        });
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Notification.deleteMany({});
        await NotificationPreference.deleteMany({});
    });

    describe('GET /api/notifications', () => {
        it('should get user notifications', async () => {
            const response = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.unreadCount).toBe(1);
            expect(response.body.pagination).toBeDefined();
        });

        it('should filter unread notifications only', async () => {
            const response = await request(app)
                .get('/api/notifications?unreadOnly=true')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].isRead).toBe(false);
        });

        it('should filter by notification type', async () => {
            const response = await request(app)
                .get('/api/notifications?type=project_application')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].type).toBe('project_application');
        });

        it('should paginate results', async () => {
            const response = await request(app)
                .get('/api/notifications?page=1&limit=1')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(1);
            expect(response.body.pagination.total).toBe(2);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/notifications')
                .expect(401);
        });
    });

    describe('GET /api/notifications/unread-count', () => {
        it('should get unread count', async () => {
            const response = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.count).toBe(1);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/notifications/unread-count')
                .expect(401);
        });
    });

    describe('PUT /api/notifications/mark-read', () => {
        it('should mark specific notifications as read', async () => {
            const notifications = await Notification.find({ userId: testUser._id, isRead: false });
            const notificationIds = notifications.map(n => n._id.toString());

            const response = await request(app)
                .put('/api/notifications/mark-read')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ notificationIds })
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify notifications are marked as read
            const updatedNotifications = await Notification.find({ 
                _id: { $in: notificationIds } 
            });
            updatedNotifications.forEach(notification => {
                expect(notification.isRead).toBe(true);
            });
        });

        it('should mark all notifications as read when no IDs provided', async () => {
            const response = await request(app)
                .put('/api/notifications/mark-read')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify all notifications are marked as read
            const unreadCount = await Notification.getUnreadCount(testUser._id);
            expect(unreadCount).toBe(0);
        });

        it('should require authentication', async () => {
            await request(app)
                .put('/api/notifications/mark-read')
                .send({ notificationIds: [] })
                .expect(401);
        });
    });

    describe('PUT /api/notifications/mark-all-read', () => {
        it('should mark all notifications as read', async () => {
            const response = await request(app)
                .put('/api/notifications/mark-all-read')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify all notifications are marked as read
            const unreadCount = await Notification.getUnreadCount(testUser._id);
            expect(unreadCount).toBe(0);
        });

        it('should require authentication', async () => {
            await request(app)
                .put('/api/notifications/mark-all-read')
                .expect(401);
        });
    });

    describe('DELETE /api/notifications/:notificationId', () => {
        it('should delete a notification', async () => {
            const notification = await Notification.findOne({ userId: testUser._id });

            const response = await request(app)
                .delete(`/api/notifications/${notification._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify notification is deleted
            const deletedNotification = await Notification.findById(notification._id);
            expect(deletedNotification).toBeNull();
        });

        it('should require authentication', async () => {
            const notification = await Notification.findOne({ userId: testUser._id });

            await request(app)
                .delete(`/api/notifications/${notification._id}`)
                .expect(401);
        });

        it('should handle non-existent notification', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .delete(`/api/notifications/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/notifications/preferences', () => {
        it('should get notification preferences', async () => {
            const response = await request(app)
                .get('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.preferences).toBeDefined();
            expect(response.body.preferences.userId.toString()).toBe(testUser._id.toString());
            expect(response.body.preferences.emailNotifications).toBeDefined();
            expect(response.body.preferences.inAppNotifications).toBeDefined();
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/notifications/preferences')
                .expect(401);
        });
    });

    describe('PUT /api/notifications/preferences', () => {
        it('should update notification preferences', async () => {
            const updates = {
                emailNotifications: {
                    projectApplications: false,
                    messageReceived: false
                },
                quietHours: {
                    enabled: true,
                    startTime: '22:00',
                    endTime: '08:00'
                }
            };

            const response = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.preferences.emailNotifications.projectApplications).toBe(false);
            expect(response.body.preferences.emailNotifications.messageReceived).toBe(false);
            expect(response.body.preferences.quietHours.enabled).toBe(true);
            expect(response.body.preferences.quietHours.startTime).toBe('22:00');
        });

        it('should filter out invalid fields', async () => {
            const updates = {
                emailNotifications: {
                    projectApplications: false
                },
                invalidField: 'should be ignored',
                anotherInvalidField: { nested: 'value' }
            };

            const response = await request(app)
                .put('/api/notifications/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.preferences.emailNotifications.projectApplications).toBe(false);
            expect(response.body.preferences.invalidField).toBeUndefined();
            expect(response.body.preferences.anotherInvalidField).toBeUndefined();
        });

        it('should require authentication', async () => {
            await request(app)
                .put('/api/notifications/preferences')
                .send({ emailNotifications: { projectApplications: false } })
                .expect(401);
        });
    });

    describe('POST /api/notifications/test (development only)', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        afterEach(() => {
            delete process.env.NODE_ENV;
        });

        it('should create test notification in development', async () => {
            const testData = {
                type: 'system_announcement',
                title: 'Test Notification',
                message: 'This is a test',
                priority: 'high'
            };

            const response = await request(app)
                .post('/api/notifications/test')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.notification).toBeDefined();
            expect(response.body.notification.title).toBe('Test Notification');
            expect(response.body.notification.priority).toBe('high');
        });

        it('should use default values for test notification', async () => {
            const response = await request(app)
                .post('/api/notifications/test')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.notification.type).toBe('system_announcement');
            expect(response.body.notification.title).toBe('Test Notification');
            expect(response.body.notification.message).toBe('This is a test notification');
            expect(response.body.notification.priority).toBe('medium');
        });

        it('should require authentication', async () => {
            await request(app)
                .post('/api/notifications/test')
                .send({})
                .expect(401);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid notification ID format', async () => {
            await request(app)
                .delete('/api/notifications/invalid-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);
        });

        it('should handle malformed request body', async () => {
            await request(app)
                .put('/api/notifications/mark-read')
                .set('Authorization', `Bearer ${authToken}`)
                .send('invalid json')
                .expect(400);
        });
    });
});