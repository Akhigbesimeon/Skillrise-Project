const mongoose = require('mongoose');
const moderationService = require('../../services/moderationService');
const ContentFlag = require('../../models/ContentFlag');
const Dispute = require('../../models/Dispute');
const User = require('../../models/User');
const Message = require('../../models/Message');
const Project = require('../../models/Project');

describe('ModerationService', () => {
    let testUser, testModerator, testMessage, testProject;

    beforeEach(async () => {
        // Create test users
        testUser = await User.create({
            fullName: 'Test User',
            email: 'testuser@example.com',
            password: 'password123',
            role: 'freelancer',
            isActive: true
        });

        testModerator = await User.create({
            fullName: 'Test Moderator',
            email: 'moderator@example.com',
            password: 'password123',
            role: 'admin',
            isActive: true
        });

        // Create test content
        testMessage = await Message.create({
            senderId: testUser._id,
            receiverId: testModerator._id,
            content: 'Test message content',
            messageType: 'text'
        });

        testProject = await Project.create({
            title: 'Test Project',
            description: 'Test project description',
            clientId: testUser._id,
            budget: { min: 100, max: 500 },
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            skillsRequired: ['JavaScript'],
            status: 'open'
        });
    });

    describe('Content Flagging', () => {
        describe('flagContent', () => {
            it('should successfully flag content', async () => {
                const flagData = {
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    flagType: 'spam',
                    description: 'This message appears to be spam'
                };

                const result = await moderationService.flagContent(flagData);

                expect(result.success).toBe(true);
                expect(result.flag).toBeDefined();
                expect(result.flag.contentType).toBe('message');
                expect(result.flag.flagType).toBe('spam');
                expect(result.flag.status).toBe('pending');
            });

            it('should prevent duplicate flags from same user', async () => {
                const flagData = {
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    flagType: 'spam',
                    description: 'This message appears to be spam'
                };

                // Create first flag
                await moderationService.flagContent(flagData);

                // Try to create duplicate flag
                const result = await moderationService.flagContent(flagData);

                expect(result.success).toBe(false);
                expect(result.error).toBe('You have already flagged this content');
            });

            it('should return error for non-existent content', async () => {
                const flagData = {
                    contentType: 'message',
                    contentId: new mongoose.Types.ObjectId(),
                    reportedBy: testModerator._id,
                    flagType: 'spam',
                    description: 'This message appears to be spam'
                };

                const result = await moderationService.flagContent(flagData);

                expect(result.success).toBe(false);
                expect(result.error).toBe('Content not found');
            });

            it('should auto-escalate when multiple flags exist', async () => {
                const flagData1 = {
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    flagType: 'spam',
                    description: 'This message appears to be spam'
                };

                const user2 = await User.create({
                    fullName: 'Test User 2',
                    email: 'testuser2@example.com',
                    password: 'password123',
                    role: 'client',
                    isActive: true
                });

                const user3 = await User.create({
                    fullName: 'Test User 3',
                    email: 'testuser3@example.com',
                    password: 'password123',
                    role: 'freelancer',
                    isActive: true
                });

                // Create multiple flags
                await moderationService.flagContent(flagData1);
                await moderationService.flagContent({ ...flagData1, reportedBy: user2._id });
                const result = await moderationService.flagContent({ ...flagData1, reportedBy: user3._id });

                expect(result.success).toBe(true);
                expect(result.flag.priority).toBe('high');
                expect(result.flag.status).toBe('escalated');
            });
        });

        describe('getModerationQueue', () => {
            it('should return moderation queue with pagination', async () => {
                // Create test flags
                await ContentFlag.create({
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'spam',
                    description: 'Test flag 1',
                    status: 'pending'
                });

                await ContentFlag.create({
                    contentType: 'project',
                    contentId: testProject._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'inappropriate_content',
                    description: 'Test flag 2',
                    status: 'pending'
                });

                const result = await moderationService.getModerationQueue({
                    page: 1,
                    limit: 10,
                    status: 'pending'
                });

                expect(result.success).toBe(true);
                expect(result.flags).toHaveLength(2);
                expect(result.pagination.total).toBe(2);
                expect(result.pagination.page).toBe(1);
            });

            it('should filter by status', async () => {
                await ContentFlag.create({
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'spam',
                    description: 'Pending flag',
                    status: 'pending'
                });

                await ContentFlag.create({
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'spam',
                    description: 'Resolved flag',
                    status: 'resolved'
                });

                const result = await moderationService.getModerationQueue({
                    status: 'pending'
                });

                expect(result.success).toBe(true);
                expect(result.flags).toHaveLength(1);
                expect(result.flags[0].status).toBe('pending');
            });
        });

        describe('moderateContent', () => {
            it('should successfully moderate content with warning action', async () => {
                const flag = await ContentFlag.create({
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'spam',
                    description: 'Test flag',
                    status: 'pending'
                });

                const result = await moderationService.moderateContent(
                    flag._id,
                    testModerator._id,
                    'warning',
                    'Content violates community guidelines'
                );

                expect(result.success).toBe(true);
                expect(result.message).toBe('Content moderated successfully');

                // Verify flag was resolved
                const updatedFlag = await ContentFlag.findById(flag._id);
                expect(updatedFlag.status).toBe('resolved');
                expect(updatedFlag.resolution.action).toBe('warning');
            });

            it('should return error for non-existent flag', async () => {
                const result = await moderationService.moderateContent(
                    new mongoose.Types.ObjectId(),
                    testModerator._id,
                    'warning',
                    'Test reason'
                );

                expect(result.success).toBe(false);
                expect(result.error).toBe('Flag not found');
            });
        });

        describe('bulkModerateContent', () => {
            it('should moderate multiple flags', async () => {
                const flag1 = await ContentFlag.create({
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'spam',
                    description: 'Test flag 1',
                    status: 'pending'
                });

                const flag2 = await ContentFlag.create({
                    contentType: 'project',
                    contentId: testProject._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'inappropriate_content',
                    description: 'Test flag 2',
                    status: 'pending'
                });

                const result = await moderationService.bulkModerateContent(
                    [flag1._id, flag2._id],
                    testModerator._id,
                    'no_action',
                    'False positive'
                );

                expect(result.success).toBe(true);
                expect(result.results.success).toBe(2);
                expect(result.results.failed).toBe(0);
            });
        });
    });

    describe('Dispute Resolution', () => {
        describe('createDispute', () => {
            it('should successfully create a dispute', async () => {
                const disputeData = {
                    disputeType: 'project_dispute',
                    relatedId: testProject._id,
                    relatedType: 'Project',
                    initiatedBy: testUser._id,
                    respondent: testModerator._id,
                    title: 'Payment Dispute',
                    description: 'Client has not paid for completed work'
                };

                const result = await moderationService.createDispute(disputeData);

                expect(result.success).toBe(true);
                expect(result.dispute).toBeDefined();
                expect(result.dispute.disputeType).toBe('project_dispute');
                expect(result.dispute.status).toBe('pending');
                expect(result.dispute.timeline).toHaveLength(1);
                expect(result.dispute.timeline[0].action).toBe('created');
            });
        });

        describe('getDisputeQueue', () => {
            it('should return dispute queue with pagination', async () => {
                await Dispute.create({
                    disputeType: 'project_dispute',
                    relatedId: testProject._id,
                    relatedType: 'Project',
                    initiatedBy: testUser._id,
                    title: 'Test Dispute 1',
                    description: 'Test dispute description',
                    status: 'pending'
                });

                await Dispute.create({
                    disputeType: 'payment_dispute',
                    relatedId: testProject._id,
                    relatedType: 'Project',
                    initiatedBy: testUser._id,
                    title: 'Test Dispute 2',
                    description: 'Test dispute description',
                    status: 'under_review'
                });

                const result = await moderationService.getDisputeQueue({
                    page: 1,
                    limit: 10
                });

                expect(result.success).toBe(true);
                expect(result.disputes).toHaveLength(2);
                expect(result.pagination.total).toBe(2);
            });
        });

        describe('addDisputeMessage', () => {
            it('should add message to dispute', async () => {
                const dispute = await Dispute.create({
                    disputeType: 'project_dispute',
                    relatedId: testProject._id,
                    relatedType: 'Project',
                    initiatedBy: testUser._id,
                    title: 'Test Dispute',
                    description: 'Test dispute description',
                    status: 'pending'
                });

                const result = await moderationService.addDisputeMessage(
                    dispute._id,
                    testUser._id,
                    'This is my response to the dispute',
                    false
                );

                expect(result.success).toBe(true);
                expect(result.message).toBe('Message added successfully');

                // Verify message was added
                const updatedDispute = await Dispute.findById(dispute._id);
                expect(updatedDispute.messages).toHaveLength(1);
                expect(updatedDispute.messages[0].content).toBe('This is my response to the dispute');
                expect(updatedDispute.timeline).toHaveLength(2); // created + response_added
            });
        });

        describe('resolveDispute', () => {
            it('should successfully resolve dispute', async () => {
                const dispute = await Dispute.create({
                    disputeType: 'project_dispute',
                    relatedId: testProject._id,
                    relatedType: 'Project',
                    initiatedBy: testUser._id,
                    title: 'Test Dispute',
                    description: 'Test dispute description',
                    status: 'under_review',
                    assignedMediatorId: testModerator._id
                });

                const resolution = {
                    outcome: 'upheld',
                    description: 'Dispute resolved in favor of the initiator',
                    compensationAwarded: {
                        amount: 100,
                        currency: 'USD',
                        recipient: testUser._id
                    }
                };

                const result = await moderationService.resolveDispute(
                    dispute._id,
                    resolution,
                    testModerator._id
                );

                expect(result.success).toBe(true);
                expect(result.message).toBe('Dispute resolved successfully');

                // Verify dispute was resolved
                const updatedDispute = await Dispute.findById(dispute._id);
                expect(updatedDispute.status).toBe('resolved');
                expect(updatedDispute.resolution.outcome).toBe('upheld');
                expect(updatedDispute.resolution.resolvedBy.toString()).toBe(testModerator._id.toString());
            });
        });
    });

    describe('Statistics and Reporting', () => {
        describe('getModerationStatistics', () => {
            it('should return moderation statistics', async () => {
                // Create test data
                await ContentFlag.create({
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testModerator._id,
                    contentOwnerId: testUser._id,
                    flagType: 'spam',
                    description: 'Test flag',
                    status: 'resolved'
                });

                await Dispute.create({
                    disputeType: 'project_dispute',
                    relatedId: testProject._id,
                    relatedType: 'Project',
                    initiatedBy: testUser._id,
                    title: 'Test Dispute',
                    description: 'Test dispute',
                    status: 'resolved'
                });

                const result = await moderationService.getModerationStatistics(30);

                expect(result.success).toBe(true);
                expect(result.statistics).toBeDefined();
                expect(result.statistics.flags).toBeDefined();
                expect(result.statistics.disputes).toBeDefined();
                expect(result.statistics.timeframe).toBe(30);
            });
        });

        describe('getModeratorPerformance', () => {
            it('should return moderator performance metrics', async () => {
                // Create resolved flag by moderator
                await ContentFlag.create({
                    contentType: 'message',
                    contentId: testMessage._id,
                    reportedBy: testUser._id,
                    contentOwnerId: testUser._id,
                    flagType: 'spam',
                    description: 'Test flag',
                    status: 'resolved',
                    moderatorId: testModerator._id,
                    resolution: {
                        action: 'warning',
                        reason: 'Test resolution',
                        resolvedAt: new Date()
                    }
                });

                const result = await moderationService.getModeratorPerformance(testModerator._id, 30);

                expect(result.success).toBe(true);
                expect(result.performance).toBeDefined();
                expect(result.performance.flagsResolved).toBe(1);
                expect(result.performance.disputesResolved).toBe(0);
                expect(typeof result.performance.avgResolutionTime).toBe('number');
            });
        });
    });

    describe('Helper Methods', () => {
        describe('validateContentExists', () => {
            it('should return true for existing message', async () => {
                const exists = await moderationService.validateContentExists('message', testMessage._id);
                expect(exists).toBe(true);
            });

            it('should return false for non-existent message', async () => {
                const exists = await moderationService.validateContentExists('message', new mongoose.Types.ObjectId());
                expect(exists).toBe(false);
            });

            it('should return false for unsupported content type', async () => {
                const exists = await moderationService.validateContentExists('unsupported', testMessage._id);
                expect(exists).toBe(false);
            });
        });

        describe('getContentOwner', () => {
            it('should return correct owner for message', async () => {
                const owner = await moderationService.getContentOwner('message', testMessage._id);
                expect(owner.toString()).toBe(testUser._id.toString());
            });

            it('should return correct owner for project', async () => {
                const owner = await moderationService.getContentOwner('project', testProject._id);
                expect(owner.toString()).toBe(testUser._id.toString());
            });

            it('should return null for non-existent content', async () => {
                const owner = await moderationService.getContentOwner('message', new mongoose.Types.ObjectId());
                expect(owner).toBeNull();
            });
        });
    });
});