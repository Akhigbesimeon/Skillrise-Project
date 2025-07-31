const User = require('../models/User');
const Course = require('../models/Course');
const Project = require('../models/Project');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const UserProgress = require('../models/UserProgress');
const Mentorship = require('../models/Mentorship');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

class GDPRService {
    
    // Data export for GDPR compliance
    async exportUserData(userId, requestedBy) {
        try {
            console.log(`GDPR: Starting data export for user ${userId}`);
            
            // Verify the request is authorized
            if (requestedBy !== userId) {
                const requestingUser = await User.findById(requestedBy);
                if (!requestingUser || requestingUser.role !== 'admin') {
                    throw new Error('Unauthorized data export request');
                }
            }
            
            // Collect all user data
            const userData = await this.collectUserData(userId);
            
            // Create export package
            const exportData = {
                exportDate: new Date().toISOString(),
                userId: userId,
                dataTypes: Object.keys(userData),
                data: userData,
                metadata: {
                    exportVersion: '1.0',
                    gdprCompliant: true,
                    retentionPolicy: 'As per SkillRise Privacy Policy',
                    contactInfo: 'privacy@skillrise.com'
                }
            };
            
            // Generate export file
            const exportPath = await this.generateExportFile(userId, exportData);
            
            // Log the export for audit purposes
            this.logGDPRActivity('DATA_EXPORT', userId, {
                requestedBy,
                exportPath,
                dataTypes: Object.keys(userData)
            });
            
            return {
                success: true,
                exportPath,
                dataTypes: Object.keys(userData),
                recordCount: this.countRecords(userData)
            };
            
        } catch (error) {
            console.error('GDPR Export Error:', error);
            this.logGDPRActivity('DATA_EXPORT_FAILED', userId, {
                error: error.message,
                requestedBy
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Collect all user data from various collections
    async collectUserData(userId) {
        const userData = {};
        
        try {
            // User profile data
            const user = await User.findById(userId).lean();
            if (user) {
                // Remove sensitive fields that shouldn't be exported
                delete user.password;
                delete user.resetPasswordToken;
                delete user.resetPasswordExpires;
                userData.profile = user;
            }
            
            // Course progress data
            const courseProgress = await UserProgress.find({ userId }).lean();
            if (courseProgress.length > 0) {
                userData.courseProgress = courseProgress;
            }
            
            // Enrolled courses
            const enrolledCourses = await Course.find({ 
                'enrolledUsers.userId': userId 
            }).select('title description enrolledUsers.$').lean();
            if (enrolledCourses.length > 0) {
                userData.enrolledCourses = enrolledCourses;
            }
            
            // Created courses (if user is an instructor)
            const createdCourses = await Course.find({ instructorId: userId }).lean();
            if (createdCourses.length > 0) {
                userData.createdCourses = createdCourses;
            }
            
            // Project data (as client)
            const clientProjects = await Project.find({ clientId: userId }).lean();
            if (clientProjects.length > 0) {
                userData.clientProjects = clientProjects;
            }
            
            // Project applications (as freelancer)
            const freelancerApplications = await Project.find({
                'applications.freelancerId': userId
            }).select('title applications.$').lean();
            if (freelancerApplications.length > 0) {
                userData.projectApplications = freelancerApplications;
            }
            
            // Messages sent
            const sentMessages = await Message.find({ senderId: userId }).lean();
            if (sentMessages.length > 0) {
                userData.sentMessages = sentMessages;
            }
            
            // Messages received
            const receivedMessages = await Message.find({ recipientId: userId }).lean();
            if (receivedMessages.length > 0) {
                userData.receivedMessages = receivedMessages;
            }
            
            // Notifications
            const notifications = await Notification.find({ userId }).lean();
            if (notifications.length > 0) {
                userData.notifications = notifications;
            }
            
            // Mentorship data (as mentor)
            const mentorships = await Mentorship.find({ mentorId: userId }).lean();
            if (mentorships.length > 0) {
                userData.mentorships = mentorships;
            }
            
            // Mentorship data (as mentee)
            const menteeships = await Mentorship.find({ menteeId: userId }).lean();
            if (menteeships.length > 0) {
                userData.menteeships = menteeships;
            }
            
            return userData;
            
        } catch (error) {
            console.error('Error collecting user data:', error);
            throw new Error('Failed to collect user data');
        }
    }
    
    // Generate export file (JSON and optionally ZIP)
    async generateExportFile(userId, exportData) {
        try {
            const exportDir = path.join(__dirname, '../exports');
            await fs.mkdir(exportDir, { recursive: true });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `user-data-export-${userId}-${timestamp}`;
            const jsonPath = path.join(exportDir, `${filename}.json`);
            
            // Write JSON file
            await fs.writeFile(jsonPath, JSON.stringify(exportData, null, 2));
            
            // Create ZIP archive
            const zipPath = path.join(exportDir, `${filename}.zip`);
            await this.createZipArchive(jsonPath, zipPath);
            
            // Clean up JSON file (keep only ZIP)
            await fs.unlink(jsonPath);
            
            return zipPath;
            
        } catch (error) {
            console.error('Error generating export file:', error);
            throw new Error('Failed to generate export file');
        }
    }
    
    // Create ZIP archive
    async createZipArchive(sourcePath, zipPath) {
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            output.on('close', () => resolve());
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.file(sourcePath, { name: 'user-data-export.json' });
            archive.finalize();
        });
    }
    
    // Count records in export data
    countRecords(userData) {
        let count = 0;
        for (const [key, value] of Object.entries(userData)) {
            if (Array.isArray(value)) {
                count += value.length;
            } else if (typeof value === 'object' && value !== null) {
                count += 1;
            }
        }
        return count;
    }
    
    // Delete user data (Right to be forgotten)
    async deleteUserData(userId, requestedBy, options = {}) {
        try {
            console.log(`GDPR: Starting data deletion for user ${userId}`);
            
            // Verify the request is authorized
            if (requestedBy !== userId) {
                const requestingUser = await User.findById(requestedBy);
                if (!requestingUser || requestingUser.role !== 'admin') {
                    throw new Error('Unauthorized data deletion request');
                }
            }
            
            const deletionResults = {};
            
            // Export data before deletion (for compliance)
            if (!options.skipExport) {
                const exportResult = await this.exportUserData(userId, requestedBy);
                deletionResults.exportCreated = exportResult.success;
            }
            
            // Delete user data from various collections
            if (!options.preserveProfile) {
                // Anonymize or delete user profile
                const userResult = await this.anonymizeUserProfile(userId);
                deletionResults.userProfile = userResult;
            }
            
            // Delete course progress
            const progressResult = await UserProgress.deleteMany({ userId });
            deletionResults.courseProgress = progressResult.deletedCount;
            
            // Remove user from course enrollments
            const courseUpdateResult = await Course.updateMany(
                { 'enrolledUsers.userId': userId },
                { $pull: { enrolledUsers: { userId } } }
            );
            deletionResults.courseEnrollments = courseUpdateResult.modifiedCount;
            
            // Handle created courses (transfer ownership or delete)
            if (options.transferCourses && options.newOwnerId) {
                const courseTransferResult = await Course.updateMany(
                    { instructorId: userId },
                    { instructorId: options.newOwnerId }
                );
                deletionResults.coursesTransferred = courseTransferResult.modifiedCount;
            } else {
                const courseDeleteResult = await Course.deleteMany({ instructorId: userId });
                deletionResults.coursesDeleted = courseDeleteResult.deletedCount;
            }
            
            // Delete or anonymize messages
            const messageDeleteResult = await this.anonymizeMessages(userId);
            deletionResults.messages = messageDeleteResult;
            
            // Delete notifications
            const notificationResult = await Notification.deleteMany({ userId });
            deletionResults.notifications = notificationResult.deletedCount;
            
            // Handle projects and applications
            const projectResult = await this.handleProjectDeletion(userId, options);
            deletionResults.projects = projectResult;
            
            // Handle mentorships
            const mentorshipResult = await this.handleMentorshipDeletion(userId, options);
            deletionResults.mentorships = mentorshipResult;
            
            // Log the deletion for audit purposes
            this.logGDPRActivity('DATA_DELETION', userId, {
                requestedBy,
                deletionResults,
                options
            });
            
            return {
                success: true,
                deletionResults,
                message: 'User data has been successfully deleted/anonymized'
            };
            
        } catch (error) {
            console.error('GDPR Deletion Error:', error);
            this.logGDPRActivity('DATA_DELETION_FAILED', userId, {
                error: error.message,
                requestedBy
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Anonymize user profile instead of deleting
    async anonymizeUserProfile(userId) {
        try {
            const anonymizedData = {
                fullName: 'Deleted User',
                email: `deleted-${crypto.randomBytes(8).toString('hex')}@deleted.local`,
                isActive: false,
                isDeleted: true,
                deletedAt: new Date(),
                // Keep essential fields for referential integrity
                role: 'deleted',
                skills: [],
                bio: 'This user account has been deleted',
                profileImage: null,
                socialLinks: {},
                preferences: {}
            };
            
            const result = await User.findByIdAndUpdate(userId, anonymizedData);
            return result ? 1 : 0;
            
        } catch (error) {
            console.error('Error anonymizing user profile:', error);
            return 0;
        }
    }
    
    // Anonymize messages instead of deleting (preserve conversation flow)
    async anonymizeMessages(userId) {
        try {
            const anonymizedContent = '[Message deleted by user request]';
            
            const sentResult = await Message.updateMany(
                { senderId: userId },
                { 
                    content: anonymizedContent,
                    isDeleted: true,
                    deletedAt: new Date()
                }
            );
            
            const receivedResult = await Message.updateMany(
                { recipientId: userId },
                { 
                    recipientId: null,
                    isRecipientDeleted: true
                }
            );
            
            return {
                sentMessages: sentResult.modifiedCount,
                receivedMessages: receivedResult.modifiedCount
            };
            
        } catch (error) {
            console.error('Error anonymizing messages:', error);
            return { sentMessages: 0, receivedMessages: 0 };
        }
    }
    
    // Handle project deletion/anonymization
    async handleProjectDeletion(userId, options) {
        try {
            const results = {};
            
            // Handle projects where user is client
            if (options.transferProjects && options.newOwnerId) {
                const transferResult = await Project.updateMany(
                    { clientId: userId },
                    { clientId: options.newOwnerId }
                );
                results.projectsTransferred = transferResult.modifiedCount;
            } else {
                // Anonymize project data
                const anonymizeResult = await Project.updateMany(
                    { clientId: userId },
                    { 
                        clientId: null,
                        isClientDeleted: true,
                        clientName: 'Deleted User'
                    }
                );
                results.projectsAnonymized = anonymizeResult.modifiedCount;
            }
            
            // Remove user from project applications
            const applicationResult = await Project.updateMany(
                { 'applications.freelancerId': userId },
                { $pull: { applications: { freelancerId: userId } } }
            );
            results.applicationsRemoved = applicationResult.modifiedCount;
            
            return results;
            
        } catch (error) {
            console.error('Error handling project deletion:', error);
            return {};
        }
    }
    
    // Handle mentorship deletion/anonymization
    async handleMentorshipDeletion(userId, options) {
        try {
            const results = {};
            
            // Anonymize mentorships where user is mentor
            const mentorResult = await Mentorship.updateMany(
                { mentorId: userId },
                { 
                    mentorId: null,
                    isMentorDeleted: true,
                    mentorName: 'Deleted User'
                }
            );
            results.mentorshipsAsmentor = mentorResult.modifiedCount;
            
            // Anonymize mentorships where user is mentee
            const menteeResult = await Mentorship.updateMany(
                { menteeId: userId },
                { 
                    menteeId: null,
                    isMenteeDeleted: true,
                    menteeName: 'Deleted User'
                }
            );
            results.mentorshipsAsMentee = menteeResult.modifiedCount;
            
            return results;
            
        } catch (error) {
            console.error('Error handling mentorship deletion:', error);
            return {};
        }
    }
    
    // Data portability - export in standard formats
    async exportDataPortable(userId, format = 'json') {
        try {
            const userData = await this.collectUserData(userId);
            
            switch (format.toLowerCase()) {
                case 'csv':
                    return await this.exportToCSV(userData);
                case 'xml':
                    return await this.exportToXML(userData);
                case 'json':
                default:
                    return await this.exportToJSON(userData);
            }
            
        } catch (error) {
            console.error('Error exporting portable data:', error);
            throw new Error('Failed to export data in requested format');
        }
    }
    
    // Export to CSV format
    async exportToCSV(userData) {
        // Implementation for CSV export
        // This would convert the nested JSON to flattened CSV format
        return 'CSV export not implemented yet';
    }
    
    // Export to XML format
    async exportToXML(userData) {
        // Implementation for XML export
        return 'XML export not implemented yet';
    }
    
    // Export to JSON format
    async exportToJSON(userData) {
        return JSON.stringify(userData, null, 2);
    }
    
    // Data rectification - update incorrect data
    async rectifyUserData(userId, corrections, requestedBy) {
        try {
            // Verify authorization
            if (requestedBy !== userId) {
                const requestingUser = await User.findById(requestedBy);
                if (!requestingUser || requestingUser.role !== 'admin') {
                    throw new Error('Unauthorized data rectification request');
                }
            }
            
            const results = {};
            
            // Update user profile data
            if (corrections.profile) {
                const updateResult = await User.findByIdAndUpdate(
                    userId,
                    corrections.profile,
                    { new: true, runValidators: true }
                );
                results.profileUpdated = !!updateResult;
            }
            
            // Log the rectification
            this.logGDPRActivity('DATA_RECTIFICATION', userId, {
                corrections,
                requestedBy,
                results
            });
            
            return {
                success: true,
                results,
                message: 'Data has been successfully rectified'
            };
            
        } catch (error) {
            console.error('GDPR Rectification Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Data processing restriction
    async restrictDataProcessing(userId, restrictions, requestedBy) {
        try {
            // Add processing restrictions to user account
            const updateResult = await User.findByIdAndUpdate(
                userId,
                { 
                    processingRestrictions: restrictions,
                    restrictedAt: new Date(),
                    restrictedBy: requestedBy
                },
                { new: true }
            );
            
            this.logGDPRActivity('DATA_PROCESSING_RESTRICTED', userId, {
                restrictions,
                requestedBy
            });
            
            return {
                success: true,
                message: 'Data processing has been restricted as requested'
            };
            
        } catch (error) {
            console.error('GDPR Restriction Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Generate privacy report
    async generatePrivacyReport(userId) {
        try {
            const userData = await this.collectUserData(userId);
            const user = await User.findById(userId);
            
            const report = {
                userId,
                reportDate: new Date().toISOString(),
                dataCategories: Object.keys(userData),
                recordCounts: this.countRecords(userData),
                dataRetentionInfo: {
                    accountCreated: user.createdAt,
                    lastActive: user.lastActive,
                    retentionPeriod: '7 years after account deletion'
                },
                processingPurposes: [
                    'Providing educational services',
                    'Facilitating mentorship connections',
                    'Project marketplace functionality',
                    'Communication between users',
                    'Platform improvement and analytics'
                ],
                dataSharing: {
                    thirdParties: 'None',
                    internationalTransfers: 'None',
                    legalBasis: 'Legitimate interest and consent'
                },
                userRights: [
                    'Right to access',
                    'Right to rectification',
                    'Right to erasure',
                    'Right to restrict processing',
                    'Right to data portability',
                    'Right to object'
                ]
            };
            
            return {
                success: true,
                report
            };
            
        } catch (error) {
            console.error('Error generating privacy report:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Log GDPR activities for audit trail
    logGDPRActivity(action, userId, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            userId,
            details,
            compliance: 'GDPR'
        };
        
        // In production, this should be sent to a secure, immutable logging service
        console.log('GDPR_AUDIT:', JSON.stringify(logEntry));
        
        // Store in database for compliance
        // GDPRAuditLog.create(logEntry);
    }
    
    // Clean up old export files
    async cleanupExportFiles(olderThanDays = 30) {
        try {
            const exportDir = path.join(__dirname, '../exports');
            const files = await fs.readdir(exportDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(exportDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    deletedCount++;
                }
            }
            
            console.log(`GDPR: Cleaned up ${deletedCount} old export files`);
            return deletedCount;
            
        } catch (error) {
            console.error('Error cleaning up export files:', error);
            return 0;
        }
    }
}

module.exports = new GDPRService();