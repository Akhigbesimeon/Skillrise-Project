const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

class MessageService {
    // Send a new message
    async sendMessage(senderId, recipientId, content, messageType = 'text', contextData = {}) {
        try {
            // Validate users exist
            const [sender, recipient] = await Promise.all([
                User.findById(senderId),
                User.findById(recipientId)
            ]);

            if (!sender || !recipient) {
                throw new Error('Sender or recipient not found');
            }

            if (!sender.isActive || !recipient.isActive) {
                throw new Error('Cannot send message to inactive user');
            }

            // Create message
            const messageData = {
                senderId,
                recipientId,
                content: content.trim(),
                messageType,
                ...contextData
            };

            const message = new Message(messageData);
            await message.save();

            // Populate sender and recipient info
            await message.populate([
                { path: 'senderId', select: 'fullName profileImageUrl userType' },
                { path: 'recipientId', select: 'fullName profileImageUrl userType' }
            ]);

            return message;
        } catch (error) {
            throw new Error(`Failed to send message: ${error.message}`);
        }
    }

    // Get conversation between two users
    async getConversation(userId1, userId2, page = 1, limit = 50) {
        try {
            const messages = await Message.find({
                $or: [
                    { senderId: userId1, recipientId: userId2 },
                    { senderId: userId2, recipientId: userId1 }
                ]
            })
            .populate('senderId', 'fullName profileImageUrl')
            .populate('recipientId', 'fullName profileImageUrl')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

            return messages.reverse(); // Return in chronological order
        } catch (error) {
            throw new Error(`Failed to get conversation: ${error.message}`);
        }
    }

    // Get user's conversations list
    async getUserConversations(userId) {
        try {
            const conversations = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            { senderId: new mongoose.Types.ObjectId(userId) },
                            { recipientId: new mongoose.Types.ObjectId(userId) }
                        ]
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
                                '$recipientId',
                                '$senderId'
                            ]
                        },
                        lastMessage: { $first: '$$ROOT' },
                        unreadCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ['$recipientId', new mongoose.Types.ObjectId(userId)] },
                                            { $eq: ['$isRead', false] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'otherUser'
                    }
                },
                {
                    $unwind: '$otherUser'
                },
                {
                    $project: {
                        otherUser: {
                            _id: 1,
                            fullName: 1,
                            profileImageUrl: 1,
                            userType: 1
                        },
                        lastMessage: 1,
                        unreadCount: 1
                    }
                },
                {
                    $sort: { 'lastMessage.createdAt': -1 }
                }
            ]);

            return conversations;
        } catch (error) {
            throw new Error(`Failed to get user conversations: ${error.message}`);
        }
    }

    // Mark messages as read
    async markMessagesAsRead(recipientId, senderId) {
        try {
            const result = await Message.updateMany(
                {
                    senderId: senderId,
                    recipientId: recipientId,
                    isRead: false
                },
                {
                    isRead: true
                }
            );

            return result.modifiedCount;
        } catch (error) {
            throw new Error(`Failed to mark messages as read: ${error.message}`);
        }
    }

    // Get unread message count for user
    async getUnreadCount(userId) {
        try {
            const count = await Message.countDocuments({
                recipientId: userId,
                isRead: false
            });

            return count;
        } catch (error) {
            throw new Error(`Failed to get unread count: ${error.message}`);
        }
    }
}

module.exports = new MessageService();