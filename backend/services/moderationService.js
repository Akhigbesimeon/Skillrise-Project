const ContentFlag = require('../models/ContentFlag');
const Dispute = require('../models/Dispute');
const SystemMetric = require('../models/SystemMetric');
const User = require('../models/User');
const Message = require('../models/Message');
const Project = require('../models/Project');
const notificationService = require('./notificationService');

class ModerationService {
    // Content Flagging
    async flagContent(reporterId, contentType, contentId, targetUserId, reason, description, evidence = []) {
        try {
            // Check if content is already flagged by this user
            const existingFlag = await ContentFlag.findOne({
                reporterId,
                contentType,
                contentId,
                status: { $in: ['pending', 'under_review'] }
            });

            if (existingFlag) {
                return { success: false, error: 'Content already flagged by you' };
            }

            // Create the flag
            const flag = await ContentFlag.createFlag({
                reporterId,
                contentType,
                contentId,
                targetUserId,
                reason,
                description,
                evidence
            });

            // Notify moderators about high-priority flags
            if (flag.priority === 'high' || flag.priority === 'urgent') {
                await this.notifyModerators(flag);
            }

            // Auto-moderate if certain conditions are met
            await this.autoModerate(flag);

            return { success: true, flag };
        } catch (error) {
            console.error('Error flagging content:', error);
            return { success: false, error: error.message };
        }
    }

    async getModerationQueue(options = {}) {
        try {
            const result = await ContentFlag.getModerationQueue(options);
            return { success: true, ...result };
        } catch (error) {
            console.error('Error getting moderation queue:', error);
            return { success: false, error: error.message };
        }
    }

    async assignFlagToModerator(flagId, moderatorId) {
        try {
            const flag = await ContentFlag.findById(flagId);
            if (!flag) {
                return { success: false, error: 'Flag not found' };
            }

            await flag.assignToModerator(moderatorId);
            
            // Notify the moderator
            await notificationService.createNotification(
                moderatorId,
                'system_announcement',
                'Content Flag Assigned',
                `A ${flag.reason} flag has been assigned to you for review`,
                { flagId: flag._id, contentType: flag.contentType },
                `/admin.html#moderation`,
                'medium'
            );

            return { success: true, message: 'Flag assigned successfully' };
        } catch (error) {
            console.error('Error assigning flag to moderator:', error);
            return { success: false, error: error.message };
        }
    }

    async resolveFlag(flagId, moderatorId, resolution, moderatorNotes) {
        try {
            const flag = await ContentFlag.findById(flagId);
            if (!flag) {
                return { success: false, error: 'Flag not found' };
            }

            await flag.resolve(resolution, moderatorNotes);

            // Execute the resolution action
            await this.executeResolutionAction(flag, resolution);

            // Notify the reporter
            await notificationService.createNotification(
                flag.reporterId,
                'system_announcement',
                'Content Report Resolved',
                `Your report has been reviewed and resolved. Action taken: ${resolution}`,
                { flagId: flag._id, resolution },
                null,
                'medium'
            );

            return { success: true, message: 'Flag resolved successfully' };
        } catch (error) {
            console.error('Error resolving flag:', error);
            return { success: false, error: error.message };
        }
    }

    async executeResolutionAction(flag, resolution) {
        try {
            switch (resolution) {
                case 'content_removed':
                    await this.removeContent(flag.contentType, flag.contentId);
                    break;
                case 'user_suspended':
                    await this.suspendUser(flag.targetUserId, 7); // 7 days suspension
                    break;
                case 'user_banned':
                    await this.banUser(flag.targetUserId);
                    break;
                case 'warning_issued':
                    await this.issueWarning(flag.targetUserId, flag.reason);
                    break;
                case 'content_edited':
                    // This would require manual editing - just log for now
                    console.log(`Content editing required for ${flag.contentType}:${flag.contentId}`);
                    break;
            }
        } catch (error) {
            console.error('Error executing resolution action:', error);
        }
    }

    async removeContent(contentType, contentId) {
        try {
            switch (contentType) {
                case 'message':
                    await Message.findByIdAndUpdate(contentId, { 
                        content: '[Content removed by moderator]',
                        isModerated: true 
                    });
                    break;
                case 'project':
                    await Project.findByIdAndUpdate(contentId, { 
                        status: 'removed',
                        moderationReason: 'Content violation' 
                    });
                    break;
                // Add other content types as needed
            }
        } catch (error) {
            console.error('Error removing content:', error);
        }
    }

    async suspendUser(userId, days) {
        try {
            const suspensionEnd = new Date();
            suspensionEnd.setDate(suspensionEnd.getDate() + days);

            await User.findByIdAndUpdate(userId, {
                isActive: false,
                suspensionEnd,
                suspensionReason: 'Content policy violation'
            });

            // Notify user
            await notificationService.createNotification(
                userId,
                'system_announcement',
                'Account Suspended',
                `Your account has been suspended for ${days} days due to content policy violation`,
                { suspensionEnd },
                null,
                'high'
            );
        } catch (error) {
            console.error('Error suspending user:', error);
        }
    }

    async banUser(userId) {
        try {
            await User.findByIdAndUpdate(userId, {
                isActive: false,
                isBanned: true,
                banReason: 'Severe content policy violation'
            });

            // Notify user
            await notificationService.createNotification(
                userId,
                'system_announcement',
                'Account Banned',
                'Your account has been permanently banned due to severe content policy violations',
                {},
                null,
                'urgent'
            );
        } catch (error) {
            console.error('Error banning user:', error);
        }
    }

    async issueWarning(userId, reason) {
        try {
            const user = await User.findById(userId);
            if (!user.warnings) user.warnings = [];
            
            user.warnings.push({
                reason,
                issuedAt: new Date(),
                type: 'content_violation'
            });

            await user.save();

            // Notify user
            await notificationService.createNotification(
                userId,
                'system_announcement',
                'Warning Issued',
                `You have received a warning for: ${reason}. Please review our community guidelines.`,
                { reason },
                null,
                'medium'
            );
        } catch (error) {
            console.error('Error issuing warning:', error);
        }
    }

    async autoModerate(flag) {
        try {
            // Auto-moderate based on certain criteria
            if (flag.reason === 'spam' && flag.autoDetected) {
                // Auto-resolve obvious spam
                await flag.resolve('content_removed', 'Auto-moderated: Spam detected');
                await this.removeContent(flag.contentType, flag.contentId);
            }

            // Check for repeat offenders
            const userFlags = await ContentFlag.countDocuments({
                targetUserId: flag.targetUserId,
                status: 'resolved',
                resolution: { $in: ['warning_issued', 'content_removed'] }
            });

            if (userFlags >= 3) {
                flag.priority = 'high';
                flag.severity = 9;
                await flag.save();
            }
        } catch (error) {
            console.error('Error in auto-moderation:', error);
        }
    }

    async notifyModerators(flag) {
        try {
            // Get all active moderators
            const moderators = await User.find({ 
                role: 'admin', 
                isActive: true 
            }).select('_id');

            // Notify all moderators
            for (const moderator of moderators) {
                await notificationService.createNotification(
                    moderator._id,
                    'system_announcement',
                    'High Priority Content Flag',
                    `A ${flag.priority} priority ${flag.reason} flag requires immediate attention`,
                    { flagId: flag._id, contentType: flag.contentType },
                    `/admin.html#moderation`,
                    'high'
                );
            }
        } catch (error) {
            console.error('Error notifying moderators:', error);
        }
    }

    // Dispute Resolution
    async createDispute(disputeData) {
        try {
            const dispute = await Dispute.createDispute(disputeData);

            // Notify respondent
            await notificationService.createNotification(
                disputeData.respondentId,
                'system_announcement',
                'New Dispute Filed',
                `A dispute has been filed against you: ${disputeData.title}`,
                { disputeId: dispute.disputeId },
                `/disputes/${dispute.disputeId}`,
                'high'
            );

            // Notify admins for high-priority disputes
            if (dispute.priority === 'high' || dispute.priority === 'urgent') {
                await this.notifyAdminsOfDispute(dispute);
            }

            return { success: true, dispute };
        } catch (error) {
            console.error('Error creating dispute:', error);
            return { success: false, error: error.message };
        }
    }

    async getDisputeQueue(options = {}) {
        try {
            const result = await Dispute.getMediationQueue(options);
            return { success: true, ...result };
        } catch (error) {
            console.error('Error getting dispute queue:', error);
            return { success: false, error: error.message };
        }
    }

    async assignDispute(disputeId, mediatorId) {
        try {
            const dispute = await Dispute.findById(disputeId);
            if (!dispute) {
                return { success: false, error: 'Dispute not found' };
            }

            await dispute.assignMediator(mediatorId);

            // Notify all parties
            const notifications = [
                {
                    userId: dispute.initiatorId,
                    message: 'A mediator has been assigned to your dispute'
                },
                {
                    userId: dispute.respondentId,
                    message: 'A mediator has been assigned to the dispute'
                },
                {
                    userId: mediatorId,
                    message: `You have been assigned to mediate dispute ${dispute.disputeId}`
                }
            ];

            for (const notification of notifications) {
                await notificationService.createNotification(
                    notification.userId,
                    'system_announcement',
                    'Dispute Update',
                    notification.message,
                    { disputeId: dispute.disputeId },
                    `/disputes/${dispute.disputeId}`,
                    'medium'
                );
            }

            return { success: true, message: 'Dispute assigned successfully' };
        } catch (error) {
            console.error('Error assigning dispute:', error);
            return { success: false, error: error.message };
        }
    }

    async resolveDispute(disputeId, resolution, resolvedBy) {
        try {
            const dispute = await Dispute.findById(disputeId);
            if (!dispute) {
                return { success: false, error: 'Dispute not found' };
            }

            await dispute.resolveDispute(resolution, resolvedBy);

            // Execute resolution actions
            await this.executeDisputeResolution(dispute, resolution);

            // Notify all parties
            const parties = [dispute.initiatorId, dispute.respondentId];
            for (const partyId of parties) {
                await notificationService.createNotification(
                    partyId,
                    'system_announcement',
                    'Dispute Resolved',
                    `Dispute ${dispute.disputeId} has been resolved: ${resolution.description}`,
                    { disputeId: dispute.disputeId, resolution: resolution.type },
                    `/disputes/${dispute.disputeId}`,
                    'high'
                );
            }

            return { success: true, message: 'Dispute resolved successfully' };
        } catch (error) {
            console.error('Error resolving dispute:', error);
            return { success: false, error: error.message };
        }
    }

    async executeDisputeResolution(dispute, resolution) {
        try {
            // Handle compensation if specified
            if (resolution.compensationAmount && resolution.compensationRecipient) {
                // This would integrate with payment system
                console.log(`Compensation of ${resolution.compensationAmount} to be paid to ${resolution.compensationRecipient}`);
            }

            // Execute required actions
            if (resolution.actionRequired && resolution.actionRequired.length > 0) {
                for (const action of resolution.actionRequired) {
                    await notificationService.createNotification(
                        action.userId,
                        'system_announcement',
                        'Action Required',
                        `You are required to: ${action.action}`,
                        { disputeId: dispute.disputeId, deadline: action.deadline },
                        `/disputes/${dispute.disputeId}`,
                        'high'
                    );
                }
            }
        } catch (error) {
            console.error('Error executing dispute resolution:', error);
        }
    }

    async notifyAdminsOfDispute(dispute) {
        try {
            const admins = await User.find({ 
                role: 'admin', 
                isActive: true 
            }).select('_id');

            for (const admin of admins) {
                await notificationService.createNotification(
                    admin._id,
                    'system_announcement',
                    'High Priority Dispute',
                    `A ${dispute.priority} priority dispute requires attention: ${dispute.title}`,
                    { disputeId: dispute.disputeId },
                    `/admin.html#disputes`,
                    'high'
                );
            }
        } catch (error) {
            console.error('Error notifying admins of dispute:', error);
        }
    }

    // System Monitoring
    async recordSystemMetric(metricType, value, unit, metadata = {}) {
        try {
            const metric = await SystemMetric.recordMetric(metricType, value, unit, metadata);
            
            // Check for alerts
            if (metric.status === 'critical') {
                await this.sendSystemAlert(metric);
            }

            return { success: true, metric };
        } catch (error) {
            console.error('Error recording system metric:', error);
            return { success: false, error: error.message };
        }
    }

    async getSystemHealth() {
        try {
            const healthSummary = await SystemMetric.getHealthSummary();
            return { success: true, health: healthSummary };
        } catch (error) {
            console.error('Error getting system health:', error);
            return { success: false, error: error.message };
        }
    }

    async getSystemMetrics(metricType, timeRange = '24h') {
        try {
            const metrics = await SystemMetric.getMetricsOverTime(metricType, timeRange);
            return { success: true, metrics };
        } catch (error) {
            console.error('Error getting system metrics:', error);
            return { success: false, error: error.message };
        }
    }

    async sendSystemAlert(metric) {
        try {
            const admins = await User.find({ 
                role: 'admin', 
                isActive: true 
            }).select('_id');

            const alertMessage = `System alert: ${metric.metricType} is at ${metric.value}${metric.unit} (${metric.status} level)`;

            for (const admin of admins) {
                await notificationService.createNotification(
                    admin._id,
                    'system_announcement',
                    'System Alert',
                    alertMessage,
                    { metricType: metric.metricType, value: metric.value, status: metric.status },
                    `/admin.html#system`,
                    'urgent'
                );
            }
        } catch (error) {
            console.error('Error sending system alert:', error);
        }
    }

    // Statistics and Reporting
    async getModerationStatistics() {
        try {
            const [flagStats, disputeStats] = await Promise.all([
                ContentFlag.getStatistics(),
                Dispute.getStatistics()
            ]);

            return {
                success: true,
                statistics: {
                    flags: flagStats,
                    disputes: disputeStats
                }
            };
        } catch (error) {
            console.error('Error getting moderation statistics:', error);
            return { success: false, error: error.message };
        }
    }

    async generateModerationReport(startDate, endDate) {
        try {
            const dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };

            const [
                flagsInPeriod,
                disputesInPeriod,
                resolutionTimes,
                moderatorActivity
            ] = await Promise.all([
                ContentFlag.find(dateFilter).lean(),
                Dispute.find(dateFilter).lean(),
                ContentFlag.aggregate([
                    { $match: { ...dateFilter, status: 'resolved' } },
                    {
                        $project: {
                            resolutionTime: {
                                $subtract: ['$resolutionDate', '$createdAt']
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            averageTime: { $avg: '$resolutionTime' },
                            minTime: { $min: '$resolutionTime' },
                            maxTime: { $max: '$resolutionTime' }
                        }
                    }
                ]),
                ContentFlag.aggregate([
                    { $match: { ...dateFilter, moderatorId: { $exists: true } } },
                    {
                        $group: {
                            _id: '$moderatorId',
                            flagsHandled: { $sum: 1 },
                            avgResolutionTime: {
                                $avg: {
                                    $subtract: ['$resolutionDate', '$createdAt']
                                }
                            }
                        }
                    }
                ])
            ]);

            return {
                success: true,
                report: {
                    period: { startDate, endDate },
                    summary: {
                        totalFlags: flagsInPeriod.length,
                        totalDisputes: disputesInPeriod.length,
                        resolutionMetrics: resolutionTimes[0] || {},
                        moderatorActivity
                    },
                    flags: flagsInPeriod,
                    disputes: disputesInPeriod
                }
            };
        } catch (error) {
            console.error('Error generating moderation report:', error);
            return { success: false, error: error.message };
        }
    }

    // Cleanup and Maintenance
    async cleanupOldData() {
        try {
            const [metricsDeleted] = await Promise.all([
                SystemMetric.cleanupOldMetrics(30)
            ]);

            return {
                success: true,
                cleaned: {
                    metrics: metricsDeleted.deletedCount
                }
            };
        } catch (error) {
            console.error('Error cleaning up old data:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ModerationService();