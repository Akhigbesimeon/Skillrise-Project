// Real-time WebSocket Integration for Admin Dashboard
class AdminWebSocket {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.messageHandlers = new Map();
        this.init();
    }

    init() {
        this.setupMessageHandlers();
        this.connect();
        console.log('Admin WebSocket system initialized');
    }

    connect() {
        try {
            // In production, this would be wss:// for secure connections
            const wsUrl = `ws://${window.location.host}/admin-ws`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Admin WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                this.authenticate();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('Admin WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('Admin WebSocket error:', error);
                this.updateConnectionStatus(false);
            };

        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.simulateWebSocketData(); // Fallback to simulated data
        }
    }

    authenticate() {
        const token = localStorage.getItem('accessToken');
        if (token) {
            this.send({
                type: 'auth',
                token: token
            });
        }
    }

    setupMessageHandlers() {
        // Real-time user activity
        this.messageHandlers.set('user_activity', (data) => {
            this.handleUserActivity(data);
        });

        // System alerts
        this.messageHandlers.set('system_alert', (data) => {
            this.handleSystemAlert(data);
        });

        // Content moderation alerts
        this.messageHandlers.set('content_flagged', (data) => {
            this.handleContentFlagged(data);
        });

        // Revenue updates
        this.messageHandlers.set('revenue_update', (data) => {
            this.handleRevenueUpdate(data);
        });

        // User registrations
        this.messageHandlers.set('user_registered', (data) => {
            this.handleUserRegistered(data);
        });

        // Course enrollments
        this.messageHandlers.set('course_enrolled', (data) => {
            this.handleCourseEnrolled(data);
        });

        // Project applications
        this.messageHandlers.set('project_application', (data) => {
            this.handleProjectApplication(data);
        });
    }

    handleMessage(data) {
        const handler = this.messageHandlers.get(data.type);
        if (handler) {
            handler(data);
        } else {
            console.log('Unhandled WebSocket message:', data);
        }
    }

    handleUserActivity(data) {
        // Update real-time user activity indicators
        this.updateActiveUserCount(data.activeUsers);
        
        // Add to recent activity feed if adminSections is available
        if (window.adminSections) {
            const activity = {
                id: Date.now(),
                type: 'user_activity',
                message: `${data.activeUsers} users currently online`,
                timestamp: new Date(),
                icon: 'fas fa-users',
                color: 'info'
            };
            this.addToActivityFeed(activity);
        }
    }

    handleSystemAlert(data) {
        // Trigger notification
        if (window.adminNotifications) {
            window.adminNotifications.notifySystemAlert(data.message);
        }

        // Update system health indicators
        this.updateSystemHealthIndicator(data.severity, data.component);
    }

    handleContentFlagged(data) {
        // Trigger notification
        if (window.adminNotifications) {
            window.adminNotifications.notifyContentFlagged(data.contentType);
        }

        // Update moderation queue count
        this.updateModerationQueueCount(data.queueCount);
    }

    handleRevenueUpdate(data) {
        // Update revenue displays in real-time
        this.updateRevenueDisplay(data.totalRevenue, data.todayRevenue);
        
        // Add to activity feed
        const activity = {
            id: Date.now(),
            type: 'revenue_update',
            message: `New revenue: $${data.amount} from ${data.source}`,
            timestamp: new Date(),
            icon: 'fas fa-dollar-sign',
            color: 'success'
        };
        this.addToActivityFeed(activity);
    }

    handleUserRegistered(data) {
        // Trigger notification
        if (window.adminNotifications) {
            window.adminNotifications.notifyUserRegistration(1);
        }

        // Update user count displays
        this.updateUserCount(data.totalUsers);
        
        // Add to activity feed
        const activity = {
            id: Date.now(),
            type: 'user_registration',
            message: `New user registered: ${data.userEmail}`,
            timestamp: new Date(),
            icon: 'fas fa-user-plus',
            color: 'success'
        };
        this.addToActivityFeed(activity);
    }

    handleCourseEnrolled(data) {
        // Update course enrollment displays
        this.updateCourseEnrollments(data.courseId, data.enrollmentCount);
        
        // Add to activity feed
        const activity = {
            id: Date.now(),
            type: 'course_enrollment',
            message: `New enrollment in "${data.courseTitle}"`,
            timestamp: new Date(),
            icon: 'fas fa-graduation-cap',
            color: 'info'
        };
        this.addToActivityFeed(activity);
    }

    handleProjectApplication(data) {
        // Update project application counts
        this.updateProjectApplications(data.projectId, data.applicationCount);
        
        // Add to activity feed
        const activity = {
            id: Date.now(),
            type: 'project_application',
            message: `New application for "${data.projectTitle}"`,
            timestamp: new Date(),
            icon: 'fas fa-briefcase',
            color: 'warning'
        };
        this.addToActivityFeed(activity);
    }

    // UI Update Methods
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('ws-connection-indicator');
        if (!indicator) {
            this.createConnectionIndicator();
        }
        
        const statusIndicator = document.getElementById('ws-connection-indicator');
        if (statusIndicator) {
            statusIndicator.className = `connection-indicator ${connected ? 'connected' : 'disconnected'}`;
            statusIndicator.title = connected ? 'Real-time updates active' : 'Real-time updates disconnected';
        }
    }

    createConnectionIndicator() {
        const header = document.querySelector('.admin-header .header-right');
        if (!header) return;

        const indicator = document.createElement('div');
        indicator.id = 'ws-connection-indicator';
        indicator.className = 'connection-indicator disconnected';
        indicator.style.cssText = `
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 1rem;
            margin-top: 0.5rem;
            transition: all 0.3s ease;
        `;
        
        header.insertBefore(indicator, header.firstChild);
    }

    updateActiveUserCount(count) {
        const element = document.getElementById('active-users');
        if (element && window.adminSections) {
            window.adminSections.animateNumber(element, parseInt(element.textContent.replace(/,/g, '')) || 0, count, 500);
        }
    }

    updateUserCount(count) {
        const element = document.getElementById('total-users');
        if (element && window.adminSections) {
            window.adminSections.animateNumber(element, parseInt(element.textContent.replace(/,/g, '')) || 0, count, 500);
        }
    }

    updateRevenueDisplay(total, today) {
        // Update total revenue if displayed
        const totalElement = document.querySelector('[data-metric="total-revenue"]');
        if (totalElement) {
            totalElement.textContent = `$${total.toLocaleString()}`;
        }

        // Update today's revenue if displayed
        const todayElement = document.querySelector('[data-metric="today-revenue"]');
        if (todayElement) {
            todayElement.textContent = `$${today.toLocaleString()}`;
        }
    }

    updateModerationQueueCount(count) {
        const badge = document.querySelector('[data-metric="moderation-queue"]');
        if (badge) {
            badge.textContent = count;
            if (count > 0) {
                badge.style.background = 'var(--admin-danger)';
                badge.style.animation = 'pulse 2s infinite';
            }
        }
    }

    updateCourseEnrollments(courseId, count) {
        // Update course enrollment count in tables if visible
        const courseRow = document.querySelector(`[data-course-id="${courseId}"]`);
        if (courseRow) {
            const enrollmentCell = courseRow.querySelector('.enrollment-count');
            if (enrollmentCell) {
                enrollmentCell.textContent = count;
            }
        }
    }

    updateProjectApplications(projectId, count) {
        // Update project application count in tables if visible
        const projectRow = document.querySelector(`[data-project-id="${projectId}"]`);
        if (projectRow) {
            const applicationCell = projectRow.querySelector('.application-count');
            if (applicationCell) {
                applicationCell.textContent = count;
            }
        }
    }

    updateSystemHealthIndicator(severity, component) {
        const healthSection = document.querySelector('#system-section');
        if (healthSection) {
            const componentIndicator = healthSection.querySelector(`[data-component="${component}"]`);
            if (componentIndicator) {
                const statusDot = componentIndicator.querySelector('.health-status-dot');
                if (statusDot) {
                    statusDot.className = `health-status-dot ${severity}`;
                }
            }
        }
    }

    addToActivityFeed(activity) {
        // Add to the recent activity feed if it exists
        if (window.adminSections && window.adminSections.addRecentActivity) {
            window.adminSections.addRecentActivity(activity);
        }
    }

    // WebSocket Communication Methods
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, cannot send message:', data);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached. Switching to simulated data.');
            this.simulateWebSocketData();
        }
    }

    // Fallback simulation for when WebSocket is not available
    simulateWebSocketData() {
        console.log('Starting WebSocket data simulation...');
        
        // Simulate periodic updates
        setInterval(() => {
            // Simulate user activity updates
            this.handleUserActivity({
                activeUsers: Math.floor(Math.random() * 50) + 800
            });
        }, 30000);

        setInterval(() => {
            // Simulate occasional new user registrations
            if (Math.random() > 0.7) {
                this.handleUserRegistered({
                    userEmail: `user${Date.now()}@example.com`,
                    totalUsers: Math.floor(Math.random() * 10) + 1250
                });
            }
        }, 45000);

        setInterval(() => {
            // Simulate revenue updates
            if (Math.random() > 0.8) {
                this.handleRevenueUpdate({
                    amount: Math.floor(Math.random() * 500) + 50,
                    source: 'Course Purchase',
                    totalRevenue: Math.floor(Math.random() * 1000) + 125000,
                    todayRevenue: Math.floor(Math.random() * 500) + 2000
                });
            }
        }, 60000);

        // Mark as simulated
        this.updateConnectionStatus(false);
    }

    // Public methods for other components to subscribe to real-time updates
    subscribe(eventType, callback) {
        if (!this.messageHandlers.has(eventType)) {
            this.messageHandlers.set(eventType, callback);
        }
    }

    unsubscribe(eventType) {
        this.messageHandlers.delete(eventType);
    }

    // Request specific data updates
    requestUserStats() {
        this.send({ type: 'request_user_stats' });
    }

    requestSystemHealth() {
        this.send({ type: 'request_system_health' });
    }

    requestRevenueUpdate() {
        this.send({ type: 'request_revenue_update' });
    }
}

// Initialize WebSocket when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminWebSocket = new AdminWebSocket();
});

// Add CSS for connection indicator and animations
const style = document.createElement('style');
style.textContent = `
    .connection-indicator.connected {
        background: var(--admin-success);
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }
    
    .connection-indicator.disconnected {
        background: var(--admin-danger);
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
    }
    
    .health-status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 0.5rem;
    }
    
    .health-status-dot.healthy {
        background: var(--admin-success);
    }
    
    .health-status-dot.warning {
        background: var(--admin-warning);
    }
    
    .health-status-dot.critical {
        background: var(--admin-danger);
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);