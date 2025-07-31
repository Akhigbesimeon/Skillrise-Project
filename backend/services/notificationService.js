const User = require('../models/User');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const emailService = require('./emailService');

class NotificationService {
    // Send notification when application is submitted
    async notifyApplicationSubmitted(projectId, freelancerId, clientId) {
        try {
            const [freelancer, client] = await Promise.all([
                User.findById(freelancerId),
                User.findById(clientId)
            ]);

            if (!freelancer || !client) {
                throw new Error('User not found');
            }

            // Email to client about new application
            await emailService.sendEmail({
                to: client.email,
                subject: 'New Project Application Received',
                html: `
                    <h2>New Application for Your Project</h2>
                    <p>Hello ${client.fullName},</p>
                    <p>You have received a new application for your project from ${freelancer.fullName}.</p>
                    <p>Please log in to your SkillRise account to review the application and make a decision.</p>
                    <p><a href="${process.env.FRONTEND_URL}/projects.html">View Applications</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `
            });

            // Email confirmation to freelancer
            await emailService.sendEmail({
                to: freelancer.email,
                subject: 'Application Submitted Successfully',
                html: `
                    <h2>Application Submitted</h2>
                    <p>Hello ${freelancer.fullName},</p>
                    <p>Your application has been successfully submitted to ${client.fullName}.</p>
                    <p>You will be notified once the client reviews your application.</p>
                    <p><a href="${process.env.FRONTEND_URL}/projects.html">View Your Applications</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `
            });

            return { success: true };
        } catch (error) {
            console.error('Error sending application notifications:', error);
            // Don't throw error to avoid breaking the main flow
            return { success: false, error: error.message };
        }
    }

    // Send notification when application status is updated
    async notifyApplicationStatusUpdate(projectId, applicationId, status, freelancerId, clientId, projectTitle) {
        try {
            const [freelancer, client] = await Promise.all([
                User.findById(freelancerId),
                User.findById(clientId)
            ]);

            if (!freelancer || !client) {
                throw new Error('User not found');
            }

            const isAccepted = status === 'accepted';
            const statusText = isAccepted ? 'accepted' : 'rejected';
            const statusEmoji = isAccepted ? '🎉' : '📝';

            // Email to freelancer about status update
            await emailService.sendEmail({
                to: freelancer.email,
                subject: `Application ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - ${projectTitle}`,
                html: `
                    <h2>${statusEmoji} Application ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
                    <p>Hello ${freelancer.fullName},</p>
                    ${isAccepted ? `
                        <p><strong>Congratulations!</strong> Your application for "${projectTitle}" has been accepted by ${client.fullName}.</p>
                        <p>You can now start working on this project. Please coordinate with the client for next steps.</p>
                        <p><a href="${process.env.FRONTEND_URL}/projects.html">View Project Details</a></p>
                    ` : `
                        <p>Thank you for your interest in "${projectTitle}". Unfortunately, your application was not selected this time.</p>
                        <p>Don't be discouraged! Keep applying to other projects that match your skills.</p>
                        <p><a href="${process.env.FRONTEND_URL}/projects.html">Browse More Projects</a></p>
                    `}
                    <p>Best regards,<br>The SkillRise Team</p>
                `
            });

            // If accepted, also notify client
            if (isAccepted) {
                await emailService.sendEmail({
                    to: client.email,
                    subject: `Project Assigned - ${projectTitle}`,
                    html: `
                        <h2>Project Successfully Assigned</h2>
                        <p>Hello ${client.fullName},</p>
                        <p>Your project "${projectTitle}" has been successfully assigned to ${freelancer.fullName}.</p>
                        <p>All other pending applications have been automatically rejected.</p>
                        <p>You can now communicate with your selected freelancer to coordinate project details.</p>
                        <p><a href="${process.env.FRONTEND_URL}/projects.html">View Project</a></p>
                        <p>Best regards,<br>The SkillRise Team</p>
                    `
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error sending status update notifications:', error);
            // Don't throw error to avoid breaking the main flow
            return { success: false, error: error.message };
        }
    }

    // Send notification when project deadline is approaching
    async notifyDeadlineApproaching(projectId, daysRemaining) {
        try {
            // This would be called by a scheduled job
            // Implementation for deadline reminders
            return { success: true };
        } catch (error) {
            console.error('Error sending deadline notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Send notification when project is completed
    async notifyProjectCompleted(projectId, freelancerId, clientId) {
        try {
            const [freelancer, client] = await Promise.all([
                User.findById(freelancerId),
                User.findById(clientId)
            ]);

            if (!freelancer || !client) {
                throw new Error('User not found');
            }

            // Email to both parties about project completion
            const completionEmails = [
                {
                    to: freelancer.email,
                    subject: 'Project Completed Successfully',
                    html: `
                        <h2>🎉 Project Completed!</h2>
                        <p>Hello ${freelancer.fullName},</p>
                        <p>Congratulations on successfully completing your project with ${client.fullName}!</p>
                        <p>We hope you had a great experience. Please consider leaving feedback for your client.</p>
                        <p><a href="${process.env.FRONTEND_URL}/projects.html">View Completed Projects</a></p>
                        <p>Best regards,<br>The SkillRise Team</p>
                    `
                },
                {
                    to: client.email,
                    subject: 'Project Completed Successfully',
                    html: `
                        <h2>🎉 Project Completed!</h2>
                        <p>Hello ${client.fullName},</p>
                        <p>Your project has been successfully completed by ${freelancer.fullName}!</p>
                        <p>We hope you're satisfied with the results. Please consider leaving feedback for your freelancer.</p>
                        <p><a href="${process.env.FRONTEND_URL}/projects.html">View Completed Projects</a></p>
                        <p>Best regards,<br>The SkillRise Team</p>
                    `
                }
            ];

            await Promise.all(completionEmails.map(email => emailService.sendEmail(email)));

            return { success: true };
        } catch (error) {
            console.error('Error sending completion notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Core notification creation method
    async createNotification(userId, type, title, message, data = {}, actionUrl = null, priority = 'medium') {
        try {
            const preferences = await NotificationPreference.getOrCreatePreferences(userId);
            
            // Check if in-app notifications are enabled for this type
            if (!preferences.isNotificationEnabled(type, 'inApp')) {
                return { success: false, reason: 'In-app notifications disabled for this type' };
            }

            // Check quiet hours for non-urgent notifications
            if (priority !== 'urgent' && preferences.isInQuietHours()) {
                // Queue for later delivery or skip based on preferences
                return { success: false, reason: 'In quiet hours' };
            }

            // Set expiration date (30 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const notification = await Notification.createNotification({
                userId,
                type,
                title,
                message,
                data,
                actionUrl,
                priority,
                expiresAt
            });

            // TODO: Emit real-time notification via WebSocket
            this.emitRealTimeNotification(userId, notification);

            return { success: true, notification };
        } catch (error) {
            console.error('Error creating notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Send email notification
    async sendEmailNotification(userId, type, subject, htmlContent) {
        try {
            const [user, preferences] = await Promise.all([
                User.findById(userId),
                NotificationPreference.getOrCreatePreferences(userId)
            ]);

            if (!user) {
                throw new Error('User not found');
            }

            // Check if email notifications are enabled for this type
            if (!preferences.isNotificationEnabled(type, 'email')) {
                return { success: false, reason: 'Email notifications disabled for this type' };
            }

            await emailService.sendEmail({
                to: user.email,
                subject,
                html: htmlContent
            });

            return { success: true };
        } catch (error) {
            console.error('Error sending email notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Combined notification method (in-app + email)
    async sendNotification(userId, type, title, message, emailSubject = null, emailContent = null, data = {}, actionUrl = null, priority = 'medium') {
        const results = {
            inApp: { success: false },
            email: { success: false }
        };

        // Send in-app notification
        results.inApp = await this.createNotification(userId, type, title, message, data, actionUrl, priority);

        // Send email notification if content provided
        if (emailSubject && emailContent) {
            results.email = await this.sendEmailNotification(userId, type, emailSubject, emailContent);
        }

        return results;
    }

    // Get notifications for a user
    async getUserNotifications(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                unreadOnly = false,
                type = null
            } = options;

            const query = { userId };
            if (unreadOnly) query.isRead = false;
            if (type) query.type = type;

            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            const total = await Notification.countDocuments(query);
            const unreadCount = await Notification.getUnreadCount(userId);

            return {
                success: true,
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                unreadCount
            };
        } catch (error) {
            console.error('Error getting user notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Mark notifications as read
    async markNotificationsAsRead(userId, notificationIds = null) {
        try {
            await Notification.markAsRead(userId, notificationIds);
            
            // TODO: Emit real-time update via WebSocket
            this.emitNotificationUpdate(userId, { type: 'marked_read', notificationIds });

            return { success: true };
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            return { success: false, error: error.message };
        }
    }

    // Get unread count
    async getUnreadCount(userId) {
        try {
            const count = await Notification.getUnreadCount(userId);
            return { success: true, count };
        } catch (error) {
            console.error('Error getting unread count:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete notification
    async deleteNotification(userId, notificationId) {
        try {
            await Notification.findOneAndDelete({ _id: notificationId, userId });
            
            // TODO: Emit real-time update via WebSocket
            this.emitNotificationUpdate(userId, { type: 'deleted', notificationId });

            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Get or create notification preferences
    async getNotificationPreferences(userId) {
        try {
            const preferences = await NotificationPreference.getOrCreatePreferences(userId);
            return { success: true, preferences };
        } catch (error) {
            console.error('Error getting notification preferences:', error);
            return { success: false, error: error.message };
        }
    }

    // Update notification preferences
    async updateNotificationPreferences(userId, updates) {
        try {
            const preferences = await NotificationPreference.findOneAndUpdate(
                { userId },
                updates,
                { new: true, upsert: true }
            );

            return { success: true, preferences };
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return { success: false, error: error.message };
        }
    }

    // Set Socket.IO instance
    setSocketIO(io) {
        this.io = io;
    }

    // Emit real-time notification
    emitRealTimeNotification(userId, notification) {
        if (this.io) {
            this.io.to(`user_${userId}`).emit('new_notification', {
                notification,
                timestamp: new Date()
            });
        }
        console.log(`Real-time notification for user ${userId}:`, notification.title);
    }

    // Emit notification update
    emitNotificationUpdate(userId, update) {
        if (this.io) {
            this.io.to(`user_${userId}`).emit('notification_update', {
                ...update,
                timestamp: new Date()
            });
        }
        console.log(`Notification update for user ${userId}:`, update);
    }

    // Cleanup old notifications (to be called by scheduled job)
    async cleanupOldNotifications(daysOld = 30) {
        try {
            const result = await Notification.cleanupOld(daysOld);
            console.log(`Cleaned up ${result.deletedCount} old notifications`);
            return { success: true, deletedCount: result.deletedCount };
        } catch (error) {
            console.error('Error cleaning up old notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Enhanced notification methods for specific events
    async notifyMentorshipRequest(mentorId, menteeId, mentorshipId) {
        try {
            const [mentor, mentee] = await Promise.all([
                User.findById(mentorId),
                User.findById(menteeId)
            ]);

            if (!mentor || !mentee) {
                throw new Error('User not found');
            }

            const title = 'New Mentorship Request';
            const message = `${mentee.fullName} has requested mentorship from you`;
            const actionUrl = `/mentorship.html?tab=requests`;

            await this.sendNotification(
                mentorId,
                'mentorship_request',
                title,
                message,
                'New Mentorship Request - SkillRise',
                `
                    <h2>New Mentorship Request</h2>
                    <p>Hello ${mentor.fullName},</p>
                    <p>You have received a new mentorship request from ${mentee.fullName}.</p>
                    <p>Please log in to your SkillRise account to review and respond to the request.</p>
                    <p><a href="${process.env.FRONTEND_URL}/mentorship.html?tab=requests">View Request</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `,
                { mentorshipId, menteeId },
                actionUrl,
                'high'
            );

            return { success: true };
        } catch (error) {
            console.error('Error sending mentorship request notification:', error);
            return { success: false, error: error.message };
        }
    }

    async notifySessionScheduled(mentorId, menteeId, sessionId, sessionDate) {
        try {
            const [mentor, mentee] = await Promise.all([
                User.findById(mentorId),
                User.findById(menteeId)
            ]);

            if (!mentor || !mentee) {
                throw new Error('User not found');
            }

            const sessionDateFormatted = new Date(sessionDate).toLocaleString();
            
            // Notify mentor
            await this.sendNotification(
                mentorId,
                'session_scheduled',
                'Mentorship Session Scheduled',
                `Session scheduled with ${mentee.fullName} on ${sessionDateFormatted}`,
                'Mentorship Session Scheduled - SkillRise',
                `
                    <h2>Mentorship Session Scheduled</h2>
                    <p>Hello ${mentor.fullName},</p>
                    <p>A mentorship session has been scheduled with ${mentee.fullName} on ${sessionDateFormatted}.</p>
                    <p><a href="${process.env.FRONTEND_URL}/mentorship.html">View Session Details</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `,
                { sessionId, menteeId, sessionDate },
                '/mentorship.html',
                'high'
            );

            // Notify mentee
            await this.sendNotification(
                menteeId,
                'session_scheduled',
                'Mentorship Session Scheduled',
                `Session scheduled with ${mentor.fullName} on ${sessionDateFormatted}`,
                'Mentorship Session Scheduled - SkillRise',
                `
                    <h2>Mentorship Session Scheduled</h2>
                    <p>Hello ${mentee.fullName},</p>
                    <p>Your mentorship session with ${mentor.fullName} has been scheduled for ${sessionDateFormatted}.</p>
                    <p><a href="${process.env.FRONTEND_URL}/mentorship.html">View Session Details</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `,
                { sessionId, mentorId, sessionDate },
                '/mentorship.html',
                'high'
            );

            return { success: true };
        } catch (error) {
            console.error('Error sending session scheduled notifications:', error);
            return { success: false, error: error.message };
        }
    }

    async notifyCourseCompleted(userId, courseId, courseTitle) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const title = 'Course Completed!';
            const message = `Congratulations! You've completed "${courseTitle}"`;
            const actionUrl = `/courses.html?courseId=${courseId}`;

            await this.sendNotification(
                userId,
                'course_completed',
                title,
                message,
                'Course Completed - SkillRise',
                `
                    <h2>🎉 Course Completed!</h2>
                    <p>Hello ${user.fullName},</p>
                    <p>Congratulations on completing "${courseTitle}"!</p>
                    <p>Your certificate is being generated and will be available shortly.</p>
                    <p><a href="${process.env.FRONTEND_URL}/courses.html">View Your Courses</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `,
                { courseId, courseTitle },
                actionUrl,
                'high'
            );

            return { success: true };
        } catch (error) {
            console.error('Error sending course completion notification:', error);
            return { success: false, error: error.message };
        }
    }

    async notifyCertificateIssued(userId, certificateId, courseTitle) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const title = 'Certificate Ready!';
            const message = `Your certificate for "${courseTitle}" is ready for download`;
            const actionUrl = `/profile.html?tab=certificates`;

            await this.sendNotification(
                userId,
                'certificate_issued',
                title,
                message,
                'Certificate Ready - SkillRise',
                `
                    <h2>🏆 Certificate Ready!</h2>
                    <p>Hello ${user.fullName},</p>
                    <p>Your certificate for completing "${courseTitle}" is now ready!</p>
                    <p>You can download it from your profile page.</p>
                    <p><a href="${process.env.FRONTEND_URL}/profile.html?tab=certificates">Download Certificate</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `,
                { certificateId, courseTitle },
                actionUrl,
                'medium'
            );

            return { success: true };
        } catch (error) {
            console.error('Error sending certificate notification:', error);
            return { success: false, error: error.message };
        }
    }

    async notifyNewMessage(recipientId, senderId, messageContent) {
        try {
            const [recipient, sender] = await Promise.all([
                User.findById(recipientId),
                User.findById(senderId)
            ]);

            if (!recipient || !sender) {
                throw new Error('User not found');
            }

            const title = 'New Message';
            const message = `${sender.fullName} sent you a message`;
            const actionUrl = `/messages.html`;

            await this.sendNotification(
                recipientId,
                'message_received',
                title,
                message,
                'New Message - SkillRise',
                `
                    <h2>New Message</h2>
                    <p>Hello ${recipient.fullName},</p>
                    <p>You have received a new message from ${sender.fullName}.</p>
                    <p><a href="${process.env.FRONTEND_URL}/messages.html">View Message</a></p>
                    <p>Best regards,<br>The SkillRise Team</p>
                `,
                { senderId, messagePreview: messageContent.substring(0, 100) },
                actionUrl,
                'medium'
            );

            return { success: true };
        } catch (error) {
            console.error('Error sending message notification:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new NotificationService();