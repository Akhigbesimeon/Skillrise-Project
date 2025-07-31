const mongoose = require('mongoose');
const ContentFlag = require('../../models/ContentFlag');
const User = require('../../models/User');

describe('ContentFlag Model', () => {
    let testReporter;
    let testTarget;

    beforeEach(async () => {
        // Create test users
        testReporter = new User({
            fullName: 'Reporter User',
            email: 'reporter@example.com',
            password: 'hashedpassword',
            role: 'freelancer',
            isActive: true,
            isEmailVerified: true
        });
        await testReporter.save();

        testTarget = new User({
            fullName: 'Target User',
            email: 'target@example.com',
            password: 'hashedpassword',
            role: 'freelancer',
            isActive: true,
            isEmailVerified: true
        });
        await testTarget.save();
    });

    afterEach(async () => {
        await ContentFlag.deleteMany({});
        await User.deleteMany({});
    });

    describe('Flag Creation', () => {
        it('should create a content flag with required fields', async () => {
            const flagData = {
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'spam',
                description: 'This is spam content'
            };

            const flag = await ContentFlag.createFlag(flagData);

            expect(flag).toBeDefined();
            expect(flag.reporterId.toString()).toBe(testReporter._id.toString());
            expect(flag.contentType).toBe('message');
            expect(flag.reason).toBe('spam');
            expect(flag.status).toBe('pending');
            expect(flag.priority).toBe('medium');
        });

        it('should auto-assign high priority for serious violations', async () => {
            const flagData = {
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'hate_speech',
                description: 'Contains hate speech'
            };

            const flag = await ContentFlag.createFlag(flagData);

            expect(flag.priority).toBe('high');
            expect(flag.severity).toBe(8);
        });

        it('should validate content type enum', async () => {
            const flagData = {
                reporterId: testReporter._id,
                contentType: 'invalid_type',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'spam',
                description: 'Test description'
            };

            await expect(ContentFlag.createFlag(flagData)).rejects.toThrow();
        });

        it('should validate reason enum', async () => {
            const flagData = {
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'invalid_reason',
                description: 'Test description'
            };

            await expect(ContentFlag.createFlag(flagData)).rejects.toThrow();
        });
    });

    describe('Flag Management', () => {
        let testFlag;

        beforeEach(async () => {
            testFlag = await ContentFlag.createFlag({
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'spam',
                description: 'Test spam content'
            });
        });

        it('should assign flag to moderator', async () => {
            const moderatorId = new mongoose.Types.ObjectId();
            await testFlag.assignToModerator(moderatorId);

            expect(testFlag.moderatorId.toString()).toBe(moderatorId.toString());
            expect(testFlag.status).toBe('under_review');
        });

        it('should resolve flag with resolution', async () => {
            const resolution = 'content_removed';
            const notes = 'Content violated community guidelines';

            await testFlag.resolve(resolution, notes);

            expect(testFlag.status).toBe('resolved');
            expect(testFlag.resolution).toBe(resolution);
            expect(testFlag.moderatorNotes).toBe(notes);
            expect(testFlag.resolutionDate).toBeDefined();
        });
    });

    describe('Moderation Queue', () => {
        beforeEach(async () => {
            // Create test flags with different statuses and priorities
            await ContentFlag.createFlag({
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'spam',
                description: 'Spam message 1'
            });

            await ContentFlag.createFlag({
                reporterId: testReporter._id,
                contentType: 'project',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'hate_speech',
                description: 'Hate speech in project'
            });

            await ContentFlag.createFlag({
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'harassment',
                description: 'Harassment message'
            });
        });

        it('should get moderation queue with pagination', async () => {
            const result = await ContentFlag.getModerationQueue({
                page: 1,
                limit: 2
            });

            expect(result.flags).toHaveLength(2);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.total).toBe(3);
            expect(result.pagination.pages).toBe(2);
        });

        it('should filter by status', async () => {
            const result = await ContentFlag.getModerationQueue({
                status: 'pending'
            });

            expect(result.flags).toHaveLength(3);
            result.flags.forEach(flag => {
                expect(flag.status).toBe('pending');
            });
        });

        it('should filter by content type', async () => {
            const result = await ContentFlag.getModerationQueue({
                contentType: 'message'
            });

            expect(result.flags).toHaveLength(2);
            result.flags.forEach(flag => {
                expect(flag.contentType).toBe('message');
            });
        });

        it('should sort by priority and creation date', async () => {
            const result = await ContentFlag.getModerationQueue();

            // Should be sorted by priority (high first) then by creation date
            expect(result.flags[0].reason).toBe('hate_speech'); // High priority
            expect(result.flags[0].priority).toBe('high');
        });
    });

    describe('Statistics', () => {
        beforeEach(async () => {
            // Create flags with different statuses and reasons
            await ContentFlag.createFlag({
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'spam',
                description: 'Spam 1'
            });

            const flag2 = await ContentFlag.createFlag({
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'harassment',
                description: 'Harassment 1'
            });

            // Resolve one flag
            await flag2.resolve('warning_issued', 'Warning given');
        });

        it('should get flag statistics', async () => {
            const stats = await ContentFlag.getStatistics();

            expect(stats.totalFlags).toBe(2);
            expect(stats.pendingFlags).toBe(1);
            expect(stats.flagsByReason.spam).toBe(1);
            expect(stats.flagsByReason.harassment).toBe(1);
            expect(stats.flagsByStatus.pending).toBe(1);
            expect(stats.flagsByStatus.resolved).toBe(1);
        });
    });

    describe('Virtual Fields', () => {
        it('should calculate time since reported', async () => {
            const flag = await ContentFlag.createFlag({
                reporterId: testReporter._id,
                contentType: 'message',
                contentId: new mongoose.Types.ObjectId(),
                targetUserId: testTarget._id,
                reason: 'spam',
                description: 'Test spam'
            });

            expect(flag.timeSinceReported).toBe('Just now');
        });
    });

    describe('Indexes', () => {
        it('should have proper indexes for efficient queries', async () => {
            const indexes = await ContentFlag.collection.getIndexes();
            
            // Check for compound indexes
            const indexNames = Object.keys(indexes);
            expect(indexNames.some(name => name.includes('status_1_priority_1'))).toBe(true);
            expect(indexNames.some(name => name.includes('contentType_1_contentId_1'))).toBe(true);
        });
    });
});