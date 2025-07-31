const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const MessageService = require('../../services/messageService');
const Message = require('../../models/Message');
const User = require('../../models/User');

describe('MessageService', () => {
    let mongoServer;

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
        await Message.deleteMany({});
        await User.deleteMany({});
    });

    describe('sendMessage', () => {
        let sender, recipient;

        beforeEach(async () => {
            sender = await User.create({
                email: 'sender@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Sender User',
                userType: 'freelancer',
                isActive: true
            });

            recipient = await User.create({
                email: 'recipient@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Recipient User',
                userType: 'client',
                isActive: true
            });
        });

        it('should send a message successfully', async () => {
            const message = await MessageService.sendMessage(
                sender._id,
                recipient._id,
                'Hello, this is a test message'
            );

            expect(message).toBeDefined();
            expect(message.senderId._id.toString()).toBe(sender._id.toString());
            expect(message.recipientId._id.toString()).toBe(recipient._id.toString());
            expect(message.content).toBe('Hello, this is a test message');
            expect(message.messageType).toBe('text');
        });

        it('should send message with context data', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const contextData = { projectId };

            const message = await MessageService.sendMessage(
                sender._id,
                recipient._id,
                'Project related message',
                'text',
                contextData
            );

            expect(message.projectId.toString()).toBe(projectId.toString());
        });

        it('should throw error if sender not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            await expect(
                MessageService.sendMessage(
                    nonExistentId,
                    recipient._id,
                    'Test message'
                )
            ).rejects.toThrow('Sender or recipient not found');
        });

        it('should throw error if recipient not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            await expect(
                MessageService.sendMessage(
                    sender._id,
                    nonExistentId,
                    'Test message'
                )
            ).rejects.toThrow('Sender or recipient not found');
        });

        it('should throw error if sender is inactive', async () => {
            await User.findByIdAndUpdate(sender._id, { isActive: false });

            await expect(
                MessageService.sendMessage(
                    sender._id,
                    recipient._id,
                    'Test message'
                )
            ).rejects.toThrow('Cannot send message to inactive user');
        });

        it('should throw error if recipient is inactive', async () => {
            await User.findByIdAndUpdate(recipient._id, { isActive: false });

            await expect(
                MessageService.sendMessage(
                    sender._id,
                    recipient._id,
                    'Test message'
                )
            ).rejects.toThrow('Cannot send message to inactive user');
        });

        it('should trim message content', async () => {
            const message = await MessageService.sendMessage(
                sender._id,
                recipient._id,
                '  Hello with spaces  '
            );

            expect(message.content).toBe('Hello with spaces');
        });
    });

    describe('getConversation', () => {
        let user1, user2;

        beforeEach(async () => {
            user1 = await User.create({
                email: 'user1@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User One',
                userType: 'freelancer'
            });

            user2 = await User.create({
                email: 'user2@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User Two',
                userType: 'client'
            });

            // Create test messages
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
                }
            ]);
        });

        it('should get conversation messages in chronological order', async () => {
            const messages = await MessageService.getConversation(user1._id, user2._id);

            expect(messages).toHaveLength(2);
            expect(messages[0].content).toBe('First message');
            expect(messages[1].content).toBe('Second message');
        });

        it('should support pagination', async () => {
            const messages = await MessageService.getConversation(user1._id, user2._id, 1, 1);

            expect(messages).toHaveLength(1);
        });
    });

    describe('getUserConversations', () => {
        let user1, user2, user3;

        beforeEach(async () => {
            user1 = await User.create({
                email: 'user1@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User One',
                userType: 'freelancer'
            });

            user2 = await User.create({
                email: 'user2@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User Two',
                userType: 'client'
            });

            user3 = await User.create({
                email: 'user3@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User Three',
                userType: 'mentor'
            });

            await Message.create([
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Message to user2'
                },
                {
                    senderId: user3._id,
                    recipientId: user1._id,
                    content: 'Message from user3'
                }
            ]);
        });

        it('should get user conversations', async () => {
            const conversations = await MessageService.getUserConversations(user1._id);

            expect(conversations).toHaveLength(2);
            expect(conversations.some(conv => conv.otherUser.fullName === 'User Two')).toBe(true);
            expect(conversations.some(conv => conv.otherUser.fullName === 'User Three')).toBe(true);
        });
    });

    describe('markMessagesAsRead', () => {
        let sender, recipient;

        beforeEach(async () => {
            sender = await User.create({
                email: 'sender@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Sender User',
                userType: 'freelancer'
            });

            recipient = await User.create({
                email: 'recipient@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Recipient User',
                userType: 'client'
            });

            await Message.create([
                {
                    senderId: sender._id,
                    recipientId: recipient._id,
                    content: 'Unread message 1',
                    isRead: false
                },
                {
                    senderId: sender._id,
                    recipientId: recipient._id,
                    content: 'Unread message 2',
                    isRead: false
                }
            ]);
        });

        it('should mark messages as read', async () => {
            const modifiedCount = await MessageService.markMessagesAsRead(recipient._id, sender._id);

            expect(modifiedCount).toBe(2);

            const messages = await Message.find({
                senderId: sender._id,
                recipientId: recipient._id
            });

            messages.forEach(message => {
                expect(message.isRead).toBe(true);
            });
        });
    });

    describe('searchMessages', () => {
        let user1, user2;

        beforeEach(async () => {
            user1 = await User.create({
                email: 'user1@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User One',
                userType: 'freelancer'
            });

            user2 = await User.create({
                email: 'user2@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User Two',
                userType: 'client'
            });

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

        it('should search messages by content', async () => {
            const messages = await MessageService.searchMessages(user1._id, 'Hello');

            expect(messages).toHaveLength(2);
            expect(messages.every(msg => msg.content.includes('Hello'))).toBe(true);
        });

        it('should support pagination', async () => {
            const messages = await MessageService.searchMessages(user1._id, 'Hello', 1, 1);

            expect(messages).toHaveLength(1);
        });
    });

    describe('getUnreadCount', () => {
        let sender, recipient;

        beforeEach(async () => {
            sender = await User.create({
                email: 'sender@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Sender User',
                userType: 'freelancer'
            });

            recipient = await User.create({
                email: 'recipient@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Recipient User',
                userType: 'client'
            });

            await Message.create([
                {
                    senderId: sender._id,
                    recipientId: recipient._id,
                    content: 'Unread message 1',
                    isRead: false
                },
                {
                    senderId: sender._id,
                    recipientId: recipient._id,
                    content: 'Read message',
                    isRead: true
                },
                {
                    senderId: sender._id,
                    recipientId: recipient._id,
                    content: 'Unread message 2',
                    isRead: false
                }
            ]);
        });

        it('should get unread message count', async () => {
            const count = await MessageService.getUnreadCount(recipient._id);

            expect(count).toBe(2);
        });
    });

    describe('deleteMessage', () => {
        let sender, recipient, message;

        beforeEach(async () => {
            sender = await User.create({
                email: 'sender@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Sender User',
                userType: 'freelancer'
            });

            recipient = await User.create({
                email: 'recipient@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'Recipient User',
                userType: 'client'
            });

            message = await Message.create({
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Message to delete'
            });
        });

        it('should delete message by sender', async () => {
            const deletedMessage = await MessageService.deleteMessage(message._id, sender._id);

            expect(deletedMessage._id.toString()).toBe(message._id.toString());

            const foundMessage = await Message.findById(message._id);
            expect(foundMessage).toBeNull();
        });

        it('should throw error if message not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            await expect(
                MessageService.deleteMessage(nonExistentId, sender._id)
            ).rejects.toThrow('Message not found');
        });

        it('should throw error if user is not the sender', async () => {
            await expect(
                MessageService.deleteMessage(message._id, recipient._id)
            ).rejects.toThrow('Unauthorized to delete this message');
        });
    });

    describe('validateMessageContent', () => {
        it('should validate valid content', () => {
            const result = MessageService.validateMessageContent('Hello world');

            expect(result.isValid).toBe(true);
        });

        it('should reject empty content', () => {
            const result = MessageService.validateMessageContent('');

            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('Message cannot be empty');
        });

        it('should reject null content', () => {
            const result = MessageService.validateMessageContent(null);

            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('Message content is required');
        });

        it('should reject content that is too long', () => {
            const longContent = 'a'.repeat(1001);
            const result = MessageService.validateMessageContent(longContent);

            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('Message too long (max 1000 characters)');
        });

        it('should reject inappropriate content', () => {
            const result = MessageService.validateMessageContent('This is spam content');

            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('Message contains inappropriate content');
        });

        it('should accept content with whitespace that trims to valid', () => {
            const result = MessageService.validateMessageContent('  Hello  ');

            expect(result.isValid).toBe(true);
        });

        it('should reject content that is only whitespace', () => {
            const result = MessageService.validateMessageContent('   ');

            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('Message cannot be empty');
        });
    });

    describe('getProjectMessages', () => {
        let user1, user2, projectId;

        beforeEach(async () => {
            user1 = await User.create({
                email: 'user1@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User One',
                userType: 'freelancer'
            });

            user2 = await User.create({
                email: 'user2@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User Two',
                userType: 'client'
            });

            projectId = new mongoose.Types.ObjectId();

            await Message.create([
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Project message 1',
                    projectId: projectId
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Project message 2',
                    projectId: projectId
                },
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Regular message'
                }
            ]);
        });

        it('should get messages for specific project', async () => {
            const messages = await MessageService.getProjectMessages(projectId);

            expect(messages).toHaveLength(2);
            expect(messages.every(msg => msg.projectId.toString() === projectId.toString())).toBe(true);
        });
    });

    describe('getMentorshipMessages', () => {
        let user1, user2, mentorshipId;

        beforeEach(async () => {
            user1 = await User.create({
                email: 'user1@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User One',
                userType: 'mentor'
            });

            user2 = await User.create({
                email: 'user2@test.com',
                passwordHash: 'hashedpassword',
                fullName: 'User Two',
                userType: 'freelancer'
            });

            mentorshipId = new mongoose.Types.ObjectId();

            await Message.create([
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Mentorship message 1',
                    mentorshipId: mentorshipId
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Mentorship message 2',
                    mentorshipId: mentorshipId
                },
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Regular message'
                }
            ]);
        });

        it('should get messages for specific mentorship', async () => {
            const messages = await MessageService.getMentorshipMessages(mentorshipId);

            expect(messages).toHaveLength(2);
            expect(messages.every(msg => msg.mentorshipId.toString() === mentorshipId.toString())).toBe(true);
        });
    });
});