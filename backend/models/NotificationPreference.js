const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    emailNotifications: {
        projectApplications: { type: Boolean, default: true },
        applicationStatus: { type: Boolean, default: true },
        projectAssigned: { type: Boolean, default: true },
        projectCompleted: { type: Boolean, default: true },
        messageReceived: { type: Boolean, default: true },
        mentorshipRequests: { type: Boolean, default: true },
        mentorshipAccepted: { type: Boolean, default: true },
        sessionScheduled: { type: Boolean, default: true },
        courseCompleted: { type: Boolean, default: true },
        certificateIssued: { type: Boolean, default: true },
        deadlineReminders: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: false }
    },
    inAppNotifications: {
        projectApplications: { type: Boolean, default: true },
        applicationStatus: { type: Boolean, default: true },
        projectAssigned: { type: Boolean, default: true },
        projectCompleted: { type: Boolean, default: true },
        messageReceived: { type: Boolean, default: true },
        mentorshipRequests: { type: Boolean, default: true },
        mentorshipAccepted: { type: Boolean, default: true },
        sessionScheduled: { type: Boolean, default: true },
        courseCompleted: { type: Boolean, default: true },
        certificateIssued: { type: Boolean, default: true },
        deadlineReminders: { type: Boolean, default: true },
        systemAnnouncements: { type: Boolean, default: true }
    },
    quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: '22:00' }, // 24-hour format
        endTime: { type: String, default: '08:00' },
        timezone: { type: String, default: 'UTC' }
    },
    frequency: {
        type: String,
        enum: ['immediate', 'hourly', 'daily', 'weekly'],
        default: 'immediate'
    }
}, {
    timestamps: true
});

// Static method to get or create preferences for a user
notificationPreferenceSchema.statics.getOrCreatePreferences = async function(userId) {
    let preferences = await this.findOne({ userId });
    
    if (!preferences) {
        preferences = new this({ userId });
        await preferences.save();
    }
    
    return preferences;
};

// Method to check if notifications should be sent based on quiet hours
notificationPreferenceSchema.methods.isInQuietHours = function() {
    if (!this.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const { startTime, endTime } = this.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
    }
    
    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= startTime && currentTime <= endTime;
};

// Method to check if specific notification type is enabled
notificationPreferenceSchema.methods.isNotificationEnabled = function(type, channel = 'inApp') {
    const channelKey = channel === 'email' ? 'emailNotifications' : 'inAppNotifications';
    const typeKey = this.getNotificationTypeKey(type);
    
    return this[channelKey][typeKey] !== false;
};

// Helper method to map notification types to preference keys
notificationPreferenceSchema.methods.getNotificationTypeKey = function(type) {
    const typeMap = {
        'project_application': 'projectApplications',
        'application_status': 'applicationStatus',
        'project_assigned': 'projectAssigned',
        'project_completed': 'projectCompleted',
        'message_received': 'messageReceived',
        'mentorship_request': 'mentorshipRequests',
        'mentorship_accepted': 'mentorshipAccepted',
        'session_scheduled': 'sessionScheduled',
        'course_completed': 'courseCompleted',
        'certificate_issued': 'certificateIssued',
        'deadline_reminder': 'deadlineReminders',
        'system_announcement': 'systemAnnouncements'
    };
    
    return typeMap[type] || 'systemAnnouncements';
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);