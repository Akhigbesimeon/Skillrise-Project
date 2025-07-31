const mongoose = require('mongoose');
const NotificationPreference = require('../../models/NotificationPreference');
const User = require('../../models/User');

describe('NotificationPreference Model', () => {
    let testUser;

    beforeEach(async () => {
        // Create a test user
        testUser = new User({
            fullName: 'Test User',
            email: 'test@example.com',
            password: 'hashedpassword',
            role: 'freelancer',
            isActive: true,
            isEmailVerified: true
        });
        await testUser.save();
    });

    afterEach(async () => {
        await NotificationPreference.deleteMany({});
        await User.deleteMany({});
    });

    describe('Preference Creation', () => {
        it('should create default preferences for a user', async () => {
            const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);

            expect(preferences).toBeDefined();
            expect(preferences.userId.toString()).toBe(testUser._id.toString());
            expect(preferences.emailNotifications.projectApplications).toBe(true);
            expect(preferences.inAppNotifications.projectApplications).toBe(true);
            expect(preferences.frequency).toBe('immediate');
            expect(preferences.quietHours.enabled).toBe(false);
        });

        it('should return existing preferences if they exist', async () => {
            // Create initial preferences
            const initialPrefs = await NotificationPreference.getOrCreatePreferences(testUser._id);
            
            // Modify them
            initialPrefs.emailNotifications.projectApplications = false;
            await initialPrefs.save();

            // Get preferences again
            const retrievedPrefs = await NotificationPreference.getOrCreatePreferences(testUser._id);

            expect(retrievedPrefs._id.toString()).toBe(initialPrefs._id.toString());
            expect(retrievedPrefs.emailNotifications.projectApplications).toBe(false);
        });
    });

    describe('Quiet Hours', () => {
        let preferences;

        beforeEach(async () => {
            preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
            preferences.quietHours.enabled = true;
            preferences.quietHours.startTime = '22:00';
            preferences.quietHours.endTime = '08:00';
            await preferences.save();
        });

        it('should detect quiet hours correctly for overnight period', () => {
            // Mock current time to be within quiet hours
            const originalToTimeString = Date.prototype.toTimeString;
            Date.prototype.toTimeString = jest.fn().mockReturnValue('23:30:00 GMT+0000 (UTC)');

            expect(preferences.isInQuietHours()).toBe(true);

            // Mock current time to be outside quiet hours
            Date.prototype.toTimeString = jest.fn().mockReturnValue('10:30:00 GMT+0000 (UTC)');

            expect(preferences.isInQuietHours()).toBe(false);

            // Restore original method
            Date.prototype.toTimeString = originalToTimeString;
        });

        it('should detect quiet hours correctly for same-day period', async () => {
            preferences.quietHours.startTime = '12:00';
            preferences.quietHours.endTime = '14:00';
            await preferences.save();

            // Mock current time to be within quiet hours
            const originalToTimeString = Date.prototype.toTimeString;
            Date.prototype.toTimeString = jest.fn().mockReturnValue('13:30:00 GMT+0000 (UTC)');

            expect(preferences.isInQuietHours()).toBe(true);

            // Mock current time to be outside quiet hours
            Date.prototype.toTimeString = jest.fn().mockReturnValue('15:30:00 GMT+0000 (UTC)');

            expect(preferences.isInQuietHours()).toBe(false);

            // Restore original method
            Date.prototype.toTimeString = originalToTimeString;
        });

        it('should return false when quiet hours are disabled', async () => {
            preferences.quietHours.enabled = false;
            await preferences.save();

            // Mock current time to be within what would be quiet hours
            const originalToTimeString = Date.prototype.toTimeString;
            Date.prototype.toTimeString = jest.fn().mockReturnValue('23:30:00 GMT+0000 (UTC)');

            expect(preferences.isInQuietHours()).toBe(false);

            // Restore original method
            Date.prototype.toTimeString = originalToTimeString;
        });
    });

    describe('Notification Type Checking', () => {
        let preferences;

        beforeEach(async () => {
            preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
        });

        it('should check if notification type is enabled for in-app', () => {
            expect(preferences.isNotificationEnabled('project_application', 'inApp')).toBe(true);
            
            preferences.inAppNotifications.projectApplications = false;
            expect(preferences.isNotificationEnabled('project_application', 'inApp')).toBe(false);
        });

        it('should check if notification type is enabled for email', () => {
            expect(preferences.isNotificationEnabled('project_application', 'email')).toBe(true);
            
            preferences.emailNotifications.projectApplications = false;
            expect(preferences.isNotificationEnabled('project_application', 'email')).toBe(false);
        });

        it('should handle unknown notification types', () => {
            expect(preferences.isNotificationEnabled('unknown_type', 'inApp')).toBe(true);
        });

        it('should map notification types correctly', () => {
            expect(preferences.getNotificationTypeKey('project_application')).toBe('projectApplications');
            expect(preferences.getNotificationTypeKey('message_received')).toBe('messageReceived');
            expect(preferences.getNotificationTypeKey('unknown_type')).toBe('systemAnnouncements');
        });
    });

    describe('Preference Updates', () => {
        it('should update email notification preferences', async () => {
            const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
            
            preferences.emailNotifications.projectApplications = false;
            preferences.emailNotifications.messageReceived = false;
            await preferences.save();

            const updated = await NotificationPreference.findOne({ userId: testUser._id });
            expect(updated.emailNotifications.projectApplications).toBe(false);
            expect(updated.emailNotifications.messageReceived).toBe(false);
            expect(updated.emailNotifications.applicationStatus).toBe(true); // Should remain unchanged
        });

        it('should update quiet hours settings', async () => {
            const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
            
            preferences.quietHours.enabled = true;
            preferences.quietHours.startTime = '20:00';
            preferences.quietHours.endTime = '09:00';
            preferences.quietHours.timezone = 'America/New_York';
            await preferences.save();

            const updated = await NotificationPreference.findOne({ userId: testUser._id });
            expect(updated.quietHours.enabled).toBe(true);
            expect(updated.quietHours.startTime).toBe('20:00');
            expect(updated.quietHours.endTime).toBe('09:00');
            expect(updated.quietHours.timezone).toBe('America/New_York');
        });

        it('should update notification frequency', async () => {
            const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);
            
            preferences.frequency = 'daily';
            await preferences.save();

            const updated = await NotificationPreference.findOne({ userId: testUser._id });
            expect(updated.frequency).toBe('daily');
        });
    });

    describe('Validation', () => {
        it('should validate frequency enum values', async () => {
            const preferences = new NotificationPreference({
                userId: testUser._id,
                frequency: 'invalid_frequency'
            });

            await expect(preferences.save()).rejects.toThrow();
        });

        it('should enforce unique userId constraint', async () => {
            await NotificationPreference.getOrCreatePreferences(testUser._id);

            const duplicate = new NotificationPreference({
                userId: testUser._id
            });

            await expect(duplicate.save()).rejects.toThrow();
        });
    });

    describe('Default Values', () => {
        it('should have correct default values for email notifications', async () => {
            const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);

            expect(preferences.emailNotifications.projectApplications).toBe(true);
            expect(preferences.emailNotifications.applicationStatus).toBe(true);
            expect(preferences.emailNotifications.projectAssigned).toBe(true);
            expect(preferences.emailNotifications.projectCompleted).toBe(true);
            expect(preferences.emailNotifications.messageReceived).toBe(true);
            expect(preferences.emailNotifications.mentorshipRequests).toBe(true);
            expect(preferences.emailNotifications.mentorshipAccepted).toBe(true);
            expect(preferences.emailNotifications.sessionScheduled).toBe(true);
            expect(preferences.emailNotifications.courseCompleted).toBe(true);
            expect(preferences.emailNotifications.certificateIssued).toBe(true);
            expect(preferences.emailNotifications.deadlineReminders).toBe(true);
            expect(preferences.emailNotifications.systemAnnouncements).toBe(false);
        });

        it('should have correct default values for in-app notifications', async () => {
            const preferences = await NotificationPreference.getOrCreatePreferences(testUser._id);

            expect(preferences.inAppNotifications.projectApplications).toBe(true);
            expect(preferences.inAppNotifications.applicationStatus).toBe(true);
            expect(preferences.inAppNotifications.projectAssigned).toBe(true);
            expect(preferences.inAppNotifications.projectCompleted).toBe(true);
            expect(preferences.inAppNotifications.messageReceived).toBe(true);
            expect(preferences.inAppNotifications.mentorshipRequests).toBe(true);
            expect(preferences.inAppNotifications.mentorshipAccepted).toBe(true);
            expect(preferences.inAppNotifications.sessionScheduled).toBe(true);
            expect(preferences.inAppNotifications.courseCompleted).toBe(true);
            expect(preferences.inAppNotifications.certificateIssued).toBe(true);
            expect(preferences.inAppNotifications.deadlineReminders).toBe(true);
            expect(preferences.inAppNotifications.systemAnnouncements).toBe(true);
        });
    });
});