const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SecurityMonitoringService {
    constructor() {
        this.alertThresholds = {
            failedLogins: { count: 5, timeWindow: 15 * 60 * 1000 }, // 5 attempts in 15 minutes
            suspiciousRequests: { count: 20, timeWindow: 5 * 60 * 1000 }, // 20 requests in 5 minutes
            dataExports: { count: 3, timeWindow: 24 * 60 * 60 * 1000 }, // 3 exports in 24 hours
            adminActions: { count: 10, timeWindow: 60 * 60 * 1000 } // 10 admin actions in 1 hour
        };
        
        this.securityEvents = new Map(); // In-memory storage for recent events
        this.activeIncidents = new Map();
        this.blockedIPs = new Set();
        
        // Start cleanup interval
        this.startCleanupInterval();
    }
    
    // Monitor and log security events
    async logSecurityEvent(eventType, details = {}) {
        try {
            const event = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: eventType,
                severity: this.determineSeverity(eventType),
                details: {
                    ...details,
                    userAgent: details.userAgent || 'unknown',
                    ip: details.ip || 'unknown'
                },
                processed: false
            };
            
            // Store event
            this.storeSecurityEvent(event);
            
            // Check for patterns and potential threats
            await this.analyzeSecurityEvent(event);
            
            // Log to console (in production, send to SIEM)
            console.log(`SECURITY_EVENT: ${eventType}`, event);
            
            return event.id;
            
        } catch (error) {
            console.error('Error logging security event:', error);
            return null;
        }
    }
    
    // Determine event severity
    determineSeverity(eventType) {
        const severityMap = {
            'LOGIN_FAILED': 'low',
            'LOGIN_SUCCESS': 'info',
            'PASSWORD_RESET_REQUEST': 'low',
            'PASSWORD_CHANGED': 'medium',
            'ACCOUNT_LOCKED': 'medium',
            'SUSPICIOUS_REQUEST': 'medium',
            'SQL_INJECTION_ATTEMPT': 'high',
            'XSS_ATTEMPT': 'high',
            'BRUTE_FORCE_DETECTED': 'high',
            'DATA_EXPORT_REQUEST': 'medium',
            'ADMIN_ACTION': 'medium',
            'UNAUTHORIZED_ACCESS_ATTEMPT': 'high',
            'FILE_UPLOAD_BLOCKED': 'medium',
            'RATE_LIMIT_EXCEEDED': 'low',
            'CSRF_TOKEN_INVALID': 'medium',
            'SESSION_HIJACK_ATTEMPT': 'high',
            'PRIVILEGE_ESCALATION_ATTEMPT': 'critical',
            'DATA_BREACH_SUSPECTED': 'critical'
        };
        
        return severityMap[eventType] || 'medium';
    }
    
    // Store security event
    storeSecurityEvent(event) {
        const key = `${event.type}_${event.details.ip}_${Date.now()}`;
        this.securityEvents.set(key, event);
        
        // Also store in persistent storage for audit
        this.persistSecurityEvent(event);
    }
    
    // Persist security event to file/database
    async persistSecurityEvent(event) {
        try {
            const logDir = path.join(__dirname, '../logs/security');
            await fs.mkdir(logDir, { recursive: true });
            
            const logFile = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
            const logEntry = JSON.stringify(event) + '\n';
            
            await fs.appendFile(logFile, logEntry);
            
        } catch (error) {
            console.error('Error persisting security event:', error);
        }
    }
    
    // Analyze security events for patterns
    async analyzeSecurityEvent(event) {
        try {
            // Check for brute force attacks
            if (event.type === 'LOGIN_FAILED') {
                await this.checkBruteForceAttack(event);
            }
            
            // Check for suspicious request patterns
            if (event.type === 'SUSPICIOUS_REQUEST') {
                await this.checkSuspiciousActivity(event);
            }
            
            // Check for data export anomalies
            if (event.type === 'DATA_EXPORT_REQUEST') {
                await this.checkDataExportAnomaly(event);
            }
            
            // Check for admin action anomalies
            if (event.type === 'ADMIN_ACTION') {
                await this.checkAdminActionAnomaly(event);
            }
            
            // Auto-escalate critical events
            if (event.severity === 'critical') {
                await this.createSecurityIncident(event);
            }
            
        } catch (error) {
            console.error('Error analyzing security event:', error);
        }
    }
    
    // Check for brute force attacks
    async checkBruteForceAttack(event) {
        const ip = event.details.ip;
        const threshold = this.alertThresholds.failedLogins;
        
        // Count recent failed login attempts from this IP
        const recentEvents = this.getRecentEvents('LOGIN_FAILED', ip, threshold.timeWindow);
        
        if (recentEvents.length >= threshold.count) {
            // Brute force detected
            await this.handleBruteForceDetection(ip, recentEvents);
        }
    }
    
    // Handle brute force detection
    async handleBruteForceDetection(ip, events) {
        try {
            // Block the IP
            this.blockedIPs.add(ip);
            
            // Create security incident
            const incident = await this.createSecurityIncident({
                type: 'BRUTE_FORCE_DETECTED',
                severity: 'high',
                details: {
                    ip,
                    attemptCount: events.length,
                    timespan: events[events.length - 1].timestamp - events[0].timestamp,
                    affectedUsers: [...new Set(events.map(e => e.details.userId).filter(Boolean))]
                }
            });
            
            // Send alert
            await this.sendSecurityAlert('Brute Force Attack Detected', {
                ip,
                attemptCount: events.length,
                incidentId: incident.id
            });
            
            console.log(`SECURITY: Brute force attack detected from IP ${ip}, blocked automatically`);
            
        } catch (error) {
            console.error('Error handling brute force detection:', error);
        }
    }
    
    // Check for suspicious activity patterns
    async checkSuspiciousActivity(event) {
        const ip = event.details.ip;
        const threshold = this.alertThresholds.suspiciousRequests;
        
        const recentEvents = this.getRecentEvents('SUSPICIOUS_REQUEST', ip, threshold.timeWindow);
        
        if (recentEvents.length >= threshold.count) {
            await this.handleSuspiciousActivity(ip, recentEvents);
        }
    }
    
    // Handle suspicious activity
    async handleSuspiciousActivity(ip, events) {
        try {
            // Temporarily block the IP
            this.blockedIPs.add(ip);
            
            // Create incident
            const incident = await this.createSecurityIncident({
                type: 'SUSPICIOUS_ACTIVITY_DETECTED',
                severity: 'medium',
                details: {
                    ip,
                    requestCount: events.length,
                    patterns: events.map(e => e.details.pattern).filter(Boolean)
                }
            });
            
            await this.sendSecurityAlert('Suspicious Activity Detected', {
                ip,
                requestCount: events.length,
                incidentId: incident.id
            });
            
        } catch (error) {
            console.error('Error handling suspicious activity:', error);
        }
    }
    
    // Check for data export anomalies
    async checkDataExportAnomaly(event) {
        const userId = event.details.userId;
        const threshold = this.alertThresholds.dataExports;
        
        const recentExports = this.getRecentEventsByUser('DATA_EXPORT_REQUEST', userId, threshold.timeWindow);
        
        if (recentExports.length >= threshold.count) {
            await this.handleDataExportAnomaly(userId, recentExports);
        }
    }
    
    // Handle data export anomaly
    async handleDataExportAnomaly(userId, events) {
        try {
            const incident = await this.createSecurityIncident({
                type: 'EXCESSIVE_DATA_EXPORTS',
                severity: 'medium',
                details: {
                    userId,
                    exportCount: events.length,
                    timespan: events[events.length - 1].timestamp - events[0].timestamp
                }
            });
            
            await this.sendSecurityAlert('Excessive Data Export Activity', {
                userId,
                exportCount: events.length,
                incidentId: incident.id
            });
            
        } catch (error) {
            console.error('Error handling data export anomaly:', error);
        }
    }
    
    // Check for admin action anomalies
    async checkAdminActionAnomaly(event) {
        const userId = event.details.userId;
        const threshold = this.alertThresholds.adminActions;
        
        const recentActions = this.getRecentEventsByUser('ADMIN_ACTION', userId, threshold.timeWindow);
        
        if (recentActions.length >= threshold.count) {
            await this.handleAdminActionAnomaly(userId, recentActions);
        }
    }
    
    // Handle admin action anomaly
    async handleAdminActionAnomaly(userId, events) {
        try {
            const incident = await this.createSecurityIncident({
                type: 'EXCESSIVE_ADMIN_ACTIVITY',
                severity: 'medium',
                details: {
                    userId,
                    actionCount: events.length,
                    actions: events.map(e => e.details.action).filter(Boolean)
                }
            });
            
            await this.sendSecurityAlert('Excessive Admin Activity', {
                userId,
                actionCount: events.length,
                incidentId: incident.id
            });
            
        } catch (error) {
            console.error('Error handling admin action anomaly:', error);
        }
    }
    
    // Get recent events by IP
    getRecentEvents(eventType, ip, timeWindow) {
        const cutoff = Date.now() - timeWindow;
        const events = [];
        
        for (const [key, event] of this.securityEvents) {
            if (event.type === eventType && 
                event.details.ip === ip && 
                new Date(event.timestamp).getTime() > cutoff) {
                events.push(event);
            }
        }
        
        return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    // Get recent events by user
    getRecentEventsByUser(eventType, userId, timeWindow) {
        const cutoff = Date.now() - timeWindow;
        const events = [];
        
        for (const [key, event] of this.securityEvents) {
            if (event.type === eventType && 
                event.details.userId === userId && 
                new Date(event.timestamp).getTime() > cutoff) {
                events.push(event);
            }
        }
        
        return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    // Create security incident
    async createSecurityIncident(eventOrDetails) {
        try {
            const incident = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                type: eventOrDetails.type,
                severity: eventOrDetails.severity,
                status: 'open',
                details: eventOrDetails.details || {},
                assignedTo: null,
                resolution: null,
                createdBy: 'system'
            };
            
            this.activeIncidents.set(incident.id, incident);
            
            // Persist incident
            await this.persistIncident(incident);
            
            console.log(`SECURITY_INCIDENT: Created incident ${incident.id} - ${incident.type}`);
            
            return incident;
            
        } catch (error) {
            console.error('Error creating security incident:', error);
            return null;
        }
    }
    
    // Persist incident to storage
    async persistIncident(incident) {
        try {
            const incidentDir = path.join(__dirname, '../logs/incidents');
            await fs.mkdir(incidentDir, { recursive: true });
            
            const incidentFile = path.join(incidentDir, `incident-${incident.id}.json`);
            await fs.writeFile(incidentFile, JSON.stringify(incident, null, 2));
            
        } catch (error) {
            console.error('Error persisting incident:', error);
        }
    }
    
    // Send security alert
    async sendSecurityAlert(title, details) {
        try {
            // In production, this would integrate with:
            // - Email notifications to security team
            // - Slack/Teams notifications
            // - SIEM system alerts
            // - SMS alerts for critical incidents
            
            const alert = {
                timestamp: new Date().toISOString(),
                title,
                details,
                alertLevel: this.determineAlertLevel(details)
            };
            
            console.log('SECURITY_ALERT:', JSON.stringify(alert, null, 2));
            
            // Store alert for dashboard
            await this.storeAlert(alert);
            
        } catch (error) {
            console.error('Error sending security alert:', error);
        }
    }
    
    // Determine alert level
    determineAlertLevel(details) {
        if (details.severity === 'critical') return 'CRITICAL';
        if (details.severity === 'high') return 'HIGH';
        if (details.severity === 'medium') return 'MEDIUM';
        return 'LOW';
    }
    
    // Store alert for dashboard
    async storeAlert(alert) {
        try {
            const alertDir = path.join(__dirname, '../logs/alerts');
            await fs.mkdir(alertDir, { recursive: true });
            
            const alertFile = path.join(alertDir, `alerts-${new Date().toISOString().split('T')[0]}.log`);
            const alertEntry = JSON.stringify(alert) + '\n';
            
            await fs.appendFile(alertFile, alertEntry);
            
        } catch (error) {
            console.error('Error storing alert:', error);
        }
    }
    
    // Check if IP is blocked
    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }
    
    // Unblock IP
    unblockIP(ip) {
        this.blockedIPs.delete(ip);
        console.log(`SECURITY: Unblocked IP ${ip}`);
    }
    
    // Get security dashboard data
    async getSecurityDashboard() {
        try {
            const now = Date.now();
            const last24Hours = now - (24 * 60 * 60 * 1000);
            const last7Days = now - (7 * 24 * 60 * 60 * 1000);
            
            // Count events by type and time period
            const eventCounts = {
                last24Hours: {},
                last7Days: {}
            };
            
            for (const [key, event] of this.securityEvents) {
                const eventTime = new Date(event.timestamp).getTime();
                
                if (eventTime > last24Hours) {
                    eventCounts.last24Hours[event.type] = (eventCounts.last24Hours[event.type] || 0) + 1;
                }
                
                if (eventTime > last7Days) {
                    eventCounts.last7Days[event.type] = (eventCounts.last7Days[event.type] || 0) + 1;
                }
            }
            
            // Get active incidents
            const activeIncidents = Array.from(this.activeIncidents.values())
                .filter(incident => incident.status === 'open');
            
            // Get blocked IPs
            const blockedIPs = Array.from(this.blockedIPs);
            
            return {
                eventCounts,
                activeIncidents: activeIncidents.length,
                blockedIPs: blockedIPs.length,
                recentIncidents: activeIncidents.slice(0, 10),
                topThreats: this.getTopThreats(),
                systemStatus: this.getSystemSecurityStatus()
            };
            
        } catch (error) {
            console.error('Error getting security dashboard:', error);
            return null;
        }
    }
    
    // Get top threats
    getTopThreats() {
        const threatCounts = {};
        const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
        
        for (const [key, event] of this.securityEvents) {
            if (new Date(event.timestamp).getTime() > last24Hours && 
                ['high', 'critical'].includes(event.severity)) {
                threatCounts[event.type] = (threatCounts[event.type] || 0) + 1;
            }
        }
        
        return Object.entries(threatCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
    }
    
    // Get system security status
    getSystemSecurityStatus() {
        const criticalIncidents = Array.from(this.activeIncidents.values())
            .filter(incident => incident.severity === 'critical' && incident.status === 'open');
        
        const highIncidents = Array.from(this.activeIncidents.values())
            .filter(incident => incident.severity === 'high' && incident.status === 'open');
        
        if (criticalIncidents.length > 0) {
            return { status: 'CRITICAL', message: `${criticalIncidents.length} critical incidents active` };
        }
        
        if (highIncidents.length > 0) {
            return { status: 'WARNING', message: `${highIncidents.length} high-severity incidents active` };
        }
        
        if (this.blockedIPs.size > 10) {
            return { status: 'WARNING', message: `${this.blockedIPs.size} IPs currently blocked` };
        }
        
        return { status: 'HEALTHY', message: 'No active security threats detected' };
    }
    
    // Resolve security incident
    async resolveIncident(incidentId, resolution, resolvedBy) {
        try {
            const incident = this.activeIncidents.get(incidentId);
            if (!incident) {
                throw new Error('Incident not found');
            }
            
            incident.status = 'resolved';
            incident.resolution = {
                ...resolution,
                resolvedBy,
                resolvedAt: new Date().toISOString()
            };
            
            // Update persistent storage
            await this.persistIncident(incident);
            
            console.log(`SECURITY: Resolved incident ${incidentId}`);
            
            return incident;
            
        } catch (error) {
            console.error('Error resolving incident:', error);
            return null;
        }
    }
    
    // Start cleanup interval for old events
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupOldEvents();
        }, 60 * 60 * 1000); // Run every hour
    }
    
    // Cleanup old events from memory
    cleanupOldEvents() {
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
        let cleanedCount = 0;
        
        for (const [key, event] of this.securityEvents) {
            if (new Date(event.timestamp).getTime() < cutoff) {
                this.securityEvents.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`SECURITY: Cleaned up ${cleanedCount} old security events`);
        }
    }
    
    // Generate security report
    async generateSecurityReport(timeframe = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeframe);
            
            const report = {
                reportDate: new Date().toISOString(),
                timeframe: `${timeframe} days`,
                summary: {
                    totalEvents: 0,
                    incidentCount: 0,
                    blockedIPs: this.blockedIPs.size,
                    topThreats: this.getTopThreats()
                },
                eventBreakdown: {},
                incidentSummary: [],
                recommendations: []
            };
            
            // Count events by type
            for (const [key, event] of this.securityEvents) {
                if (new Date(event.timestamp) >= startDate) {
                    report.summary.totalEvents++;
                    report.eventBreakdown[event.type] = (report.eventBreakdown[event.type] || 0) + 1;
                }
            }
            
            // Add incidents
            for (const [id, incident] of this.activeIncidents) {
                if (new Date(incident.timestamp) >= startDate) {
                    report.summary.incidentCount++;
                    report.incidentSummary.push({
                        id: incident.id,
                        type: incident.type,
                        severity: incident.severity,
                        status: incident.status,
                        timestamp: incident.timestamp
                    });
                }
            }
            
            // Generate recommendations
            report.recommendations = this.generateSecurityRecommendations(report);
            
            return report;
            
        } catch (error) {
            console.error('Error generating security report:', error);
            return null;
        }
    }
    
    // Generate security recommendations
    generateSecurityRecommendations(report) {
        const recommendations = [];
        
        if (report.summary.incidentCount > 10) {
            recommendations.push('High incident count detected. Consider reviewing security policies and implementing additional preventive measures.');
        }
        
        if (report.blockedIPs > 50) {
            recommendations.push('Large number of blocked IPs. Consider implementing geographic restrictions or enhanced bot detection.');
        }
        
        if (report.eventBreakdown['LOGIN_FAILED'] > 100) {
            recommendations.push('High number of failed login attempts. Consider implementing CAPTCHA or account lockout policies.');
        }
        
        if (report.eventBreakdown['SUSPICIOUS_REQUEST'] > 50) {
            recommendations.push('Significant suspicious activity detected. Review and update WAF rules and input validation.');
        }
        
        return recommendations;
    }
}

module.exports = new SecurityMonitoringService();