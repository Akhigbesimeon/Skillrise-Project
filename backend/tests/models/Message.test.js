const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Message = require('../../models/Message');
const User = require('../../models/User');

describe('Message Model', () => {
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

    describe('Message Creation', () => {
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
        });

        it('should create a valid message', async () => {
            const messageData = {
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Hello, this is a test message',
                messageType: 'text'
            };

            const message = new Message(messageData);
            const savedMessage = await message.save();

            expect(savedMessage._id).toBeDefined();
            expect(savedMessage.senderId.toString()).toBe(sender._id.toString());
            expect(savedMessage.recipientId.toString()).toBe(recipient._id.toString());
            expect(savedMessage.content).toBe('Hello, this is a test message');
            expect(savedMessage.messageType).toBe('text');
            expect(savedMessage.isRead).toBe(false);
            expect(savedMessage.createdAt).toBeDefined();
        });

        it('should require senderId', async () => {
            const messageData = {
                recipientId: recipient._id,
                content: 'Test message'
            };

            const message = new Message(messageData);
            
            await expect(message.save()).rejects.toThrow();
        });

        it('should require recipientId', async () => {
            const messageData = {
                senderId: sender._id,
                content: 'Test message'
            };

            const message = new Message(messageData);
            
            await expect(message.save()).rejects.toThrow();
        });

        it('should require content', async () => {
            const messageData = {
                senderId: sender._id,
                recipientId: recipient._id
            };

            const message = new Message(messageData);
            
            await expect(message.save()).rejects.toThrow();
        });

        it('should validate message type', async () => {
            const messageData = {
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Test message',
                messageType: 'invalid'
            };

            const message = new Message(messageData);
            
            await expect(message.save()).rejects.toThrow();
        });

        it('should limit content length', async () => {
            const longContent = 'a'.repeat(1001);
            const messageData = {
                senderId: sender._id,
                recipientId: recipient._id,
                content: longContent
            };

            const message = new Message(messageData);
            
            await expect(message.save()).rejects.toThrow();
        });

        it('should create message with file attachment', async () => {
            const messageData = {
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'File shared',
                messageType: 'file',
                attachment: {
                    fileName: 'document.pdf',
                    fileUrl: 'https://example.com/file.pdf',
                    fileSize: 1024,
                    mimeType: 'application/pdf'
                }
            };

            const message = new Message(messageData);
            const savedMessage = await message.save();

            expect(savedMessage.messageType).toBe('file');
            expect(savedMessage.attachment.fileName).toBe('document.pdf');
            expect(savedMessage.attachment.fileSize).toBe(1024);
        });

        it('should create message with project context', async () => {
            const projectId = new mongoose.Types.ObjectId();
            const messageData = {
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Project related message',
                projectId: projectId
            };

            const message = new Message(messageData);
            const savedMessage = await message.save();

            expect(savedMessage.projectId.toString()).toBe(projectId.toString());
        });
    });

    describe('Static Methods', () => {
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

            // Create test messages
            await Message.create([
                {
                    senderId: user1._id,
                    recipientId: user2._id,
                    content: 'Message 1 from user1 to user2',
                    createdAt: new Date('2024-01-01T10:00:00Z')
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Message 2 from user2 to user1',
                    createdAt: new Date('2024-01-01T11:00:00Z')
                },
                {
                    senderId: user1._id,
                    recipientId: user3._id,
                    content: 'Message 3 from user1 to user3',
                    createdAt: new Date('2024-01-01T12:00:00Z')
                },
                {
                    senderId: user2._id,
                    recipientId: user1._id,
                    content: 'Unread message',
                    isRead: false,
                    createdAt: new Date('2024-01-01T13:00:00Z')
                }
            ]);
        });

        describe('getConversation', () => {
            it('should get conversation between two users', async () => {
                const messages = await Message.getConversation(user1._id, user2._id);

                expect(messages).toHaveLength(3);
                expect(messages[0].content).toBe('Unread message'); // Most recent first
                expect(messages[1].content).toBe('Message 2 from user2 to user1');
                expect(messages[2].content).toBe('Message 1 from user1 to user2');
            });

            it('should populate sender and recipient info', async () => {
                const messages = await Message.getConversation(user1._id, user2._id);

                expect(messages[0].senderId.fullName).toBe('User Two');
                expect(messages[0].recipientId.fullName).toBe('User One');
            });

            it('should support pagination', async () => {
                const messages = await Message.getConversation(user1._id, user2._id, 1, 2);

                expect(messages).toHaveLength(2);
            });
        });

        describe('getUserConversations', () => {
            it('should get user conversations with last message and unread count', async () => {
                const conversations = await Message.getUserConversations(user1._id);

                expect(conversations).toHaveLength(2);
                
                // Find conversation with user2
                const convWithUser2 = conversations.find(conv => 
                    conv.otherUser._id.toString() === user2._id.toString()
                );
                
                expect(convWithUser2).toBeDefined();
                expect(convWithUser2.otherUser.fullName).toBe('User Two');
                expect(convWithUser2.lastMessage.content).toBe('Unread message');
                expect(convWithUser2.unreadCount).toBe(1);
            });

            it('should sort conversations by last message time', async () => {
                const conversations = await Message.getUserConversations(user1._id);

                // Most recent conversation should be first
                expect(conversations[0].otherUser._id.toString()).toBe(user2._id.toString());
                expect(conversations[1].otherUser._id.toString()).toBe(user3._id.toString());
            });
        });

        describe('searchMessages', () => {
            it('should search messages by content', async () => {
                const messages = await Message.searchMessages(user1._id, 'Message 1');

                expect(messages).toHaveLength(1);
                expect(messages[0].content).toBe('Message 1 from user1 to user2');
            });

            it('should be case insensitive', async () => {
                const messages = await Message.searchMessages(user1._id, 'message 1');

                expect(messages).toHaveLength(1);
                expect(messages[0].content).toBe('Message 1 from user1 to user2');
            });

            it('should only return messages involving the user', async () => {
                // Create a message between user2 and user3 (not involving user1)
                await Message.create({
                    senderId: user2._id,
                    recipientId: user3._id,
                    content: 'Private message between user2 and user3'
                });

                const messages = await Message.searchMessages(user1._id, 'Private message');

                expect(messages).toHaveLength(0);
            });

            it('should support pagination', async () => {
                const messages = await Message.searchMessages(user1._id, 'Message', 1, 2);

                expect(messages.length).toBeLessThanOrEqual(2);
            });
        });
    });

    describe('Indexes', () => {
        it('should have proper indexes for performance', async () => {
            const indexes = await Message.collection.getIndexes();
            
            // Check if required indexes exist
            const indexNames = Object.keys(indexes);
            
            expect(indexNames.some(name => 
                name.includes('senderId') && name.includes('recipientId')
            )).toBe(true);
            
            expect(indexNames.some(name => 
                name.includes('recipientId') && name.includes('isRead')
            )).toBe(true);
        });
    });
});