const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const messageRoutes = require('../../routes/messages');
const User = require('../../models/User');
const Message = require('../../models/Message');
const jwt = require('jsonwebtoken');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);

// Mock Socket.IO
app.set('io', {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
});

describe('Message Routes', () => {
    let mongoServer;
    let user1, user2, user1Token, user2Token;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await User.deleteMany({});
        await Message.deleteMany({});

        // Create test users
        user1 = await User.create({
            email: 'user1@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'User One',
            userType: 'freelancer',
            isActive: true,
            isVerified: true
        });

        user2 = await User.create({
            email: 'user2@test.com',
            passwordHash: 'hashedpassword',
            fullName: 'User Two',
            userType: 'client',
            isActive: true,
            isVerified: true
        });

        // Create JWT tokens
        user1Token = jwt.sign(
            { id: user1._id, email: user1.email },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );

        user2Token = jwt.sign(
            { id: user2._id, email: user2.email },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1h' }
        );
    });

    describe('GET /api/messages/conversations', () => {
        beforeEach(async () => {
            await Message.create([
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Hello from user1',
                    createdAt: new Date('2024-01-01T10:00:00Z')
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Reply from user2',
                    createdAt: new Date('2024-01-01T11:00:00Z')
                }
            ]);
        });

        it('should get user conversations', async () => {
            const response = await request(app)
                .get('/api/messages/conversations')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].otherUser.fullName).toBe('User Two');
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/messages/conversations')
                .expect(401);
        });
    });

    describe('POST /api/messages/send', () => {
        it('should send a message', async () => {
            const messageData = {
                recipientId: user2._id.toString(),
                content: 'Hello, this is a test message'
            };

            const response = await request(app)
                .post('/api/messages/send')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(messageData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe('Hello, this is a test message');
            expect(response.body.data.senderId._id).toBe(user1._id.toString());
            expect(response.body.data.recipientId._id).toBe(user2._id.toString());
        });

        it('should send message with project context', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const messageData = {
                recipientId: user2._id.toString(),
                content: 'Project related message',
                projectId: projectId.toString()
            };

            const response = await request(app)
                .post('/api/messages/send')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(messageData)
                .expect(201);

            expect(response.body.data.projectId).toBe(projectId.toString());
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/messages/send')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({})
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate recipient ID format', async () => {
            const messageData = {
                recipientId: 'invalid-id',
                content: 'Test message'
            };

            const response = await request(app)
                .post('/api/messages/send')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(messageData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate message content length', async () => {
            const messageData = {
                recipientId: user2._id.toString(),
                content: 'a'.repeat(1001)
            };

            const response = await request(app)
                .post('/api/messages/send')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(messageData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate message type', async () => {
            const messageData = {
                recipientId: user2._id.toString(),
                content: 'Test message',
                messageType: 'invalid'
            };

            const response = await request(app)
                .post('/api/messages/send')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(messageData)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should require authentication', async () => {
            const messageData = {
                recipientId: user2._id.toString(),
                content: 'Test message'
            };

            await request(app)
                .post('/api/messages/send')
                .send(messageData)
                .expect(401);
        });
    });

    describe('GET /api/messages/conversation/:userId', () => {
        beforeEach(async () => {
            await Message.create([
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'First message',
                    createdAt: new Date('2024-01-01T10:00:00Z')
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Second message',
                    createdAt: new Date('2024-01-01T11:00:00Z')
                },
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Third message',
                    createdAt: new Date('2024-01-01T12:00:00Z')
                }
            ]);
        });

        it('should get conversation messages', async () => {
            const response = await request(app)
                .get(`/api/messages/conversation/${user2._id}`)
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(3);
            expect(response.body.data[0].content).toBe('First message');
            expect(response.body.data[2].content).toBe('Third message');
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get(`/api/messages/conversation/${user2._id}?page=1&limit=2`)
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(2);
        });

        it('should validate user ID format', async () => {
            const response = await request(app)
                .get('/api/messages/conversation/invalid-id')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should require authentication', async () => {
            await request(app)
                .get(`/api/messages/conversation/${user2._id}`)
                .expect(401);
        });
    });

    describe('PUT /api/messages/read/:userId', () => {
        beforeEach(async () => {
            await Message.create([
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Unread message 1',
                    isRead: false
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Unread message 2',
                    isRead: false
                }
            ]);
        });

        it('should mark messages as read', async () => {
            const response = await request(app)
                .put(`/api/messages/read/${user2._id}`)
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.messagesMarkedAsRead).toBe(2);

            // Verify messages are marked as read
            const messages = await Message.find({
                senderId: user2._id,
                recipientId: user1._id
            });

            messages.forEach(message => {
                expect(message.isRead).toBe(true);
            });
        });

        it('should validate user ID format', async () => {
            const response = await request(app)
                .put('/api/messages/read/invalid-id')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should require authentication', async () => {
            await request(app)
                .put(`/api/messages/read/${user2._id}`)
                .expect(401);
        });
    });

    describe('GET /api/messages/search', () => {
        beforeEach(async () => {
            await Message.create([
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Hello world'
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Hello there'
                },
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Goodbye'
                }
            ]);
        });

        it('should search messages', async () => {
            const response = await request(app)
                .get('/api/messages/search?q=Hello')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.every(msg => msg.content.includes('Hello'))).toBe(true);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/messages/search?q=Hello&page=1&limit=1')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(1);
        });

        it('should require search query', async () => {
            const response = await request(app)
                .get('/api/messages/search')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should validate minimum query length', async () => {
            const response = await request(app)
                .get('/api/messages/search?q=a')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/messages/search?q=Hello')
                .expect(401);
        });
    });

    describe('GET /api/messages/unread/count', () => {
        beforeEach(async () => {
            await Message.create([
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Unread message 1',
                    isRead: false
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Read message',
                    isRead: true
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Unread message 2',
                    isRead: false
                }
            ]);
        });

        it('should get unread message count', async () => {
            const response = await request(app)
                .get('/api/messages/unread/count')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.unreadCount).toBe(2);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/messages/unread/count')
                .expect(401);
        });
    });

    describe('DELETE /api/messages/:messageId', () => {
        let message;

        beforeEach(async () => {
            message = await Message.create({
                senderId: user1._id,
                recipientId: user2._id,
                content: 'Message to delete'
            });
        });

        it('should delete message by sender', async () => {
            const response = await request(app)
                .delete(`/api/messages/${message._id}`)
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify message is deleted
            const deletedMessage = await Message.findById(message._id);
            expect(deletedMessage).toBeNull();
        });

        it('should not allow non-sender to delete message', async () => {
            const response = await request(app)
                .delete(`/api/messages/${message._id}`)
                .set('Authorization', `Bearer ${user2Token}`)
                .expect(403);

            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });

        it('should return 404 for non-existent message', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .delete(`/api/messages/${nonExistentId}`)
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(404);

            expect(response.body.error.code).toBe('NOT_FOUND');
        });

        it('should validate message ID format', async () => {
            const response = await request(app)
                .delete('/api/messages/invalid-id')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(400);

            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });

        it('should require authentication', async () => {
            await request(app)
                .delete(`/api/messages/${message._id}`)
                .expect(401);
        });
    });

    describe('Error Handling', () => {
        it('should handle server errors gracefully', async () => {
            // Mock MessageService to throw an error
            const MessageService = require('../../services/messageService');
            const originalMethod = MessageService.getUserConversations;
            MessageService.getUserConversations = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/messages/conversations')
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(500);

            expect(response.body.error.code).toBe('SERVER_ERROR');
            expect(response.body.error.message).toBe('Failed to get user conversations: Database error');

            // Restore original method
            MessageService.getUserConversations = originalMethod;
        });
    });
});