// Real-time Admin Notifications System
class AdminNotifications {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 50;
        this.unreadCount = 0;
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.setupEventListeners();
        this.startPeriodicChecks();
        console.log('Admin notifications system initialized');
    }

    createNotificationContainer() {
        // Create notification container in the header
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const notificationBell = document.createElement('div');
        notificationBell.innerHTML = `
            <div class="notification-bell" onclick="adminNotifications.toggleNotifications()" style="
                position: relative;
                margin-right: 1rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 50%;
                background: var(--admin-gray-100);
                transition: all 0.2s;
            ">
                <i class="fas fa-bell" style="font-size: 1.25rem; color: var(--admin-gray-600);"></i>
                <span id="notification-badge" class="notification-badge" style="
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    background: var(--admin-danger);
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 0.75rem;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                ">0</span>
            </div>
        `;

        // Insert before the user info
        const userInfo = headerRight.querySelector('.header-user');
        headerRight.insertBefore(notificationBell, userInfo);

        // Create notification dropdown
        this.createNotificationDropdown();
    }

    createNotificationDropdown() {
        const dropdown = document.createElement('div');
        dropdown.id = 'notification-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            width: 400px;
            max-height: 500px;
            background: white;
            border-radius: 8px;
            box-shadow: var(--admin-shadow-lg);
            border: 1px solid var(--admin-gray-200);
            z-index: 1000;
            display: none;
            overflow: hidden;
        `;

        dropdown.innerHTML = `
            <div style="padding: 1rem; border-bottom: 1px solid var(--admin-gray-200); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 1rem; color: var(--admin-gray-900);">Notifications</h3>
                <button onclick="adminNotifications.markAllAsRead()" style="background: none; border: none; color: var(--admin-primary); cursor: pointer; font-size: 0.875rem;">
                    Mark all as read
                </button>
            </div>
            <div id="notification-list" style="max-height: 400px; overflow-y: auto;">
                <div style="padding: 2rem; text-align: center; color: var(--admin-gray-500);">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>No notifications yet</p>
                </div>
            </div>
        `;

        document.body.appendChild(dropdown);
    }

    setupEventListeners() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notification-dropdown');
            const bell = document.querySelector('.notification-bell');
            
            if (dropdown && !dropdown.contains(e.target) && !bell.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    startPeriodicChecks() {
        // Check for new notifications every 30 seconds
        setInterval(() => {
            this.fetchNotifications();
        }, 30000);

        // Initial load
        this.fetchNotifications();
    }

    async fetchNotifications() {
        try {
            // In a real implementation, this would fetch from the backend
            // For now, we'll simulate notifications
            this.simulateNotifications();
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }

    simulateNotifications() {
        // Simulate some admin notifications
        const mockNotifications = [
            {
                id: Date.now() + 1,
                type: 'user_registration',
                title: 'New User Registration',
                message: '5 new users registered in the last hour',
                timestamp: new Date(),
                read: false,
                icon: 'fas fa-user-plus',
                color: 'success'
            },
            {
                id: Date.now() + 2,
                type: 'content_flagged',
                title: 'Content Flagged',
                message: 'A course has been flagged for review',
                timestamp: new Date(Date.now() - 15 * 60 * 1000),
                read: false,
                icon: 'fas fa-flag',
                color: 'warning'
            },
            {
                id: Date.now() + 3,
                type: 'system_alert',
                title: 'System Alert',
                message: 'High memory usage detected on server',
                timestamp: new Date(Date.now() - 30 * 60 * 1000),
                read: false,
                icon: 'fas fa-exclamation-triangle',
                color: 'danger'
            }
        ];

        // Only add new notifications (simulate real-time)
        if (this.notifications.length === 0) {
            this.notifications = mockNotifications;
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Keep only the latest notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.updateNotificationBadge();
        this.renderNotifications();
        this.showToast(notification);
    }

    updateNotificationBadge() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (badge) {
            if (this.unreadCount > 0) {
                badge.style.display = 'flex';
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }
    }

    renderNotifications() {
        const list = document.getElementById('notification-list');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--admin-gray-500);">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }

        const notificationsHtml = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 onclick="adminNotifications.markAsRead('${notification.id}')"
                 style="
                    padding: 1rem;
                    border-bottom: 1px solid var(--admin-gray-100);
                    cursor: pointer;
                    transition: background-color 0.2s;
                    ${!notification.read ? 'background-color: var(--admin-gray-50);' : ''}
                 ">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <div style="
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: var(--admin-${notification.color});
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <i class="${notification.icon}" style="font-size: 0.875rem;"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; color: var(--admin-gray-900); margin-bottom: 0.25rem;">
                            ${notification.title}
                        </div>
                        <div style="font-size: 0.875rem; color: var(--admin-gray-600); margin-bottom: 0.5rem;">
                            ${notification.message}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--admin-gray-500);">
                            ${this.formatTimeAgo(notification.timestamp)}
                        </div>
                    </div>
                    ${!notification.read ? '<div style="width: 8px; height: 8px; background: var(--admin-primary); border-radius: 50%; flex-shrink: 0; margin-top: 0.5rem;"></div>' : ''}
                </div>
            </div>
        `).join('');

        list.innerHTML = notificationsHtml;

        // Add hover effects
        list.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                if (!this.classList.contains('read')) {
                    this.style.backgroundColor = 'var(--admin-gray-100)';
                }
            });
            item.addEventListener('mouseleave', function() {
                if (!this.classList.contains('read')) {
                    this.style.backgroundColor = 'var(--admin-gray-50)';
                } else {
                    this.style.backgroundColor = 'transparent';
                }
            });
        });
    }

    toggleNotifications() {
        const dropdown = document.getElementById('notification-dropdown');
        if (!dropdown) return;

        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            // Position the dropdown
            const bell = document.querySelector('.notification-bell');
            const rect = bell.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + 10) + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateNotificationBadge();
            this.renderNotifications();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.updateNotificationBadge();
        this.renderNotifications();
    }

    showToast(notification) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: var(--admin-shadow-lg);
            border-left: 4px solid var(--admin-${notification.color});
            padding: 1rem;
            max-width: 300px;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: start; gap: 0.75rem;">
                <div style="
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: var(--admin-${notification.color});
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <i class="${notification.icon}" style="font-size: 0.75rem;"></i>
                </div>
                <div>
                    <div style="font-weight: 500; font-size: 0.875rem; margin-bottom: 0.25rem;">
                        ${notification.title}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--admin-gray-600);">
                        ${notification.message}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: var(--admin-gray-400);
                    cursor: pointer;
                    padding: 0;
                    margin-left: auto;
                ">×</button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    // Public methods for other parts of the admin to trigger notifications
    notifyUserRegistration(count) {
        this.addNotification({
            id: Date.now(),
            type: 'user_registration',
            title: 'New User Registration',
            message: `${count} new user${count > 1 ? 's' : ''} registered`,
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-user-plus',
            color: 'success'
        });
    }

    notifyContentFlagged(contentType) {
        this.addNotification({
            id: Date.now(),
            type: 'content_flagged',
            title: 'Content Flagged',
            message: `A ${contentType} has been flagged for review`,
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-flag',
            color: 'warning'
        });
    }

    notifySystemAlert(message) {
        this.addNotification({
            id: Date.now(),
            type: 'system_alert',
            title: 'System Alert',
            message: message,
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-exclamation-triangle',
            color: 'danger'
        });
    }
}

// Initialize notifications when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminNotifications = new AdminNotifications();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .notification-bell:hover {
        background: var(--admin-gray-200) !important;
    }
`;
document.head.appendChild(style);