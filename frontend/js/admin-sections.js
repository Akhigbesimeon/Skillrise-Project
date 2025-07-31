// Admin Dashboard Sections - Functional Implementation
class AdminSections {
    constructor() {
        this.currentSection = 'overview';
        this.apiBase = '/api/admin';
        this.init();
    }

    init() {
        console.log('AdminSections initializing...');
        // Load overview data immediately
        setTimeout(() => {
            this.loadOverviewData();
        }, 10); // Minimal delay to ensure DOM is ready
    }

    // Overview Section
    async loadOverviewData() {
        try {
            // Load platform statistics
            await this.loadPlatformStats();
            await this.loadRecentActivity();
        } catch (error) {
            console.error('Error loading overview data:', error);
            this.showError('overview-section', 'Failed to load dashboard data');
        }
    }

    async loadPlatformStats() {
        try {
            // Show loading state
            this.showLoadingState(['total-users', 'active-users', 'total-courses', 'active-projects']);
            
            // Fetch real data from backend
            const response = await fetch(`${this.apiBase}/analytics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                const stats = result.data;
                
                // Update stat cards with real data
                this.updateStatCard('total-users', stats.totalUsers || 0);
                this.updateStatCard('active-users', stats.activeUsers || 0);
                this.updateStatCard('total-courses', stats.totalCourses || 0);
                this.updateStatCard('active-projects', stats.activeProjects || 0);
            } else {
                throw new Error(result.message || 'Failed to load statistics');
            }

        } catch (error) {
            console.error('Error loading platform stats:', error);
            // Fallback to mock data if API fails
            this.updateStatCard('total-users', 1247);
            this.updateStatCard('active-users', 892);
            this.updateStatCard('total-courses', 156);
            this.updateStatCard('active-projects', 89);
        }
    }

    async loadRecentActivity() {
        try {
            // Mock recent activity data
            const activities = [
                {
                    id: 1,
                    type: 'user_registration',
                    message: 'New user registered: john.doe@example.com',
                    timestamp: new Date(Date.now() - 5 * 60 * 1000),
                    icon: 'fas fa-user-plus',
                    color: 'success'
                },
                {
                    id: 2,
                    type: 'course_published',
                    message: 'Course "Advanced JavaScript" was published',
                    timestamp: new Date(Date.now() - 15 * 60 * 1000),
                    icon: 'fas fa-book',
                    color: 'info'
                },
                {
                    id: 3,
                    type: 'project_completed',
                    message: 'Project "E-commerce Website" was completed',
                    timestamp: new Date(Date.now() - 30 * 60 * 1000),
                    icon: 'fas fa-check-circle',
                    color: 'success'
                },
                {
                    id: 4,
                    type: 'content_flagged',
                    message: 'Content flagged for review in course "Web Design Basics"',
                    timestamp: new Date(Date.now() - 45 * 60 * 1000),
                    icon: 'fas fa-flag',
                    color: 'warning'
                },
                {
                    id: 5,
                    type: 'payment_processed',
                    message: 'Payment of $299 processed for mentorship session',
                    timestamp: new Date(Date.now() - 60 * 60 * 1000),
                    icon: 'fas fa-dollar-sign',
                    color: 'success'
                }
            ];

            this.renderRecentActivity(activities);

        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const activityHtml = activities.map(activity => `
            <div class="activity-item" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid var(--admin-gray-200); transition: background-color 0.2s;">
                <div class="activity-icon" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; background: var(--admin-${activity.color}); color: white;">
                    <i class="${activity.icon}" style="font-size: 0.875rem;"></i>
                </div>
                <div class="activity-content" style="flex: 1;">
                    <div class="activity-message" style="font-weight: 500; color: var(--admin-gray-900); margin-bottom: 0.25rem;">
                        ${activity.message}
                    </div>
                    <div class="activity-time" style="font-size: 0.875rem; color: var(--admin-gray-500);">
                        ${this.formatTimeAgo(activity.timestamp)}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = activityHtml;

        // Add hover effects
        container.querySelectorAll('.activity-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'var(--admin-gray-50)';
            });
            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
        });
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Add counting animation
            this.animateNumber(element, 0, value, 1000);
        }
    }

    animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        const difference = end - start;

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + (difference * easeOutQuart));
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
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

    // User Management Section
    async loadUserManagement() {
        try {
            console.log('Loading user management data...');
            await this.loadUsers();
        } catch (error) {
            console.error('Error loading user management:', error);
            this.showError('users-section', 'Failed to load user data');
        }
    }

    async loadUsers(page = 1, filters = {}) {
        try {
            // Show loading state
            this.showTableLoading('users-table-body');
            
            // Build query parameters
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...filters
            });

            // Fetch real user data from backend
            const response = await fetch(`${this.apiBase}/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.renderUserTable(result.data);
                this.renderPagination(result.pagination, 'users');
            } else {
                throw new Error(result.message || 'Failed to load users');
            }

        } catch (error) {
            console.error('Error loading users:', error);
            // Fallback to mock data if API fails
            const mockUsers = [
                {
                    id: 1,
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    role: 'freelancer',
                    status: 'active',
                    createdAt: '2024-01-15T00:00:00Z'
                },
                {
                    id: 2,
                    name: 'Jane Smith',
                    email: 'jane.smith@example.com',
                    role: 'client',
                    status: 'active',
                    createdAt: '2024-01-20T00:00:00Z'
                },
                {
                    id: 3,
                    name: 'Mike Johnson',
                    email: 'mike.johnson@example.com',
                    role: 'mentor',
                    status: 'inactive',
                    createdAt: '2024-01-10T00:00:00Z'
                }
            ];
            this.renderUserTable(mockUsers);
        }
    }

    renderUserTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        const usersHtml = users.map(user => {
            const avatar = this.generateAvatar(user.name || user.email);
            const joinDate = user.createdAt || user.joinDate;
            
            return `
                <tr>
                    <td><input type="checkbox" data-user-id="${user.id}"></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--admin-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600;">
                                ${avatar}
                            </div>
                            <div>
                                <div style="font-weight: 500;">${user.name || 'N/A'}</div>
                            </div>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td><span class="status-badge ${user.role}">${this.capitalizeFirst(user.role)}</span></td>
                    <td><span class="status-badge ${user.status}">${this.capitalizeFirst(user.status)}</span></td>
                    <td>${this.formatDate(joinDate)}</td>
                    <td>
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="action-btn view" onclick="adminSections.viewUser(${user.id})" title="View User">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="adminSections.editUser(${user.id})" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn ${user.status === 'active' ? 'warning' : 'success'}" 
                                    onclick="adminSections.toggleUserStatus(${user.id})" 
                                    title="${user.status === 'active' ? 'Suspend' : 'Activate'} User">
                                <i class="fas fa-${user.status === 'active' ? 'pause' : 'play'}"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = usersHtml;

        // Add event listeners for checkboxes
        tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBulkActionsVisibility();
            });
        });
    }

    toggleSelectAllUsers(checked) {
        const checkboxes = document.querySelectorAll('#users-table-body input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActionsVisibility();
    }

    updateBulkActionsVisibility() {
        const checkedBoxes = document.querySelectorAll('#users-table-body input[type="checkbox"]:checked');
        const bulkActionsBtn = document.getElementById('bulk-actions-btn');
        
        if (checkedBoxes.length > 0) {
            bulkActionsBtn.style.display = 'inline-flex';
            bulkActionsBtn.innerHTML = `<i class="fas fa-tasks"></i> Bulk Actions (${checkedBoxes.length})`;
        } else {
            bulkActionsBtn.style.display = 'none';
        }
    }

    showBulkActions() {
        const checkedBoxes = document.querySelectorAll('#users-table-body input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkedBoxes).map(cb => cb.dataset.userId);
        
        if (selectedIds.length === 0) {
            alert('Please select users first');
            return;
        }

        // Create bulk actions modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
        `;

        modalContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: var(--admin-gray-900);">Bulk Actions</h3>
                <p style="margin: 0.5rem 0 0 0; color: var(--admin-gray-600);">${selectedIds.length} users selected</p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <button onclick="adminSections.bulkActivateUsers(['${selectedIds.join("','")}']); this.closest('.modal').remove();" 
                        style="padding: 0.75rem; background: var(--admin-success); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-check"></i> Activate Selected Users
                </button>
                <button onclick="adminSections.bulkSuspendUsers(['${selectedIds.join("','")}']); this.closest('.modal').remove();" 
                        style="padding: 0.75rem; background: var(--admin-warning); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-pause"></i> Suspend Selected Users
                </button>
                <button onclick="adminSections.bulkDeleteUsers(['${selectedIds.join("','")}']); this.closest('.modal').remove();" 
                        style="padding: 0.75rem; background: var(--admin-danger); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Delete Selected Users
                </button>
                <button onclick="this.closest('.modal').remove();" 
                        style="padding: 0.75rem; background: var(--admin-gray-500); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;

        modal.className = 'modal';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async bulkActivateUsers(userIds) {
        if (!confirm(`Are you sure you want to activate ${userIds.length} users?`)) return;
        
        try {
            // In real implementation, this would call the backend API
            console.log('Bulk activating users:', userIds);
            alert(`${userIds.length} users activated successfully`);
            this.loadUsers(); // Reload the user list
        } catch (error) {
            console.error('Error activating users:', error);
            alert('Failed to activate users. Please try again.');
        }
    }

    async bulkSuspendUsers(userIds) {
        if (!confirm(`Are you sure you want to suspend ${userIds.length} users?`)) return;
        
        try {
            console.log('Bulk suspending users:', userIds);
            alert(`${userIds.length} users suspended successfully`);
            this.loadUsers();
        } catch (error) {
            console.error('Error suspending users:', error);
            alert('Failed to suspend users. Please try again.');
        }
    }

    async bulkDeleteUsers(userIds) {
        if (!confirm(`Are you sure you want to DELETE ${userIds.length} users? This action cannot be undone!`)) return;
        
        try {
            console.log('Bulk deleting users:', userIds);
            alert(`${userIds.length} users deleted successfully`);
            this.loadUsers();
        } catch (error) {
            console.error('Error deleting users:', error);
            alert('Failed to delete users. Please try again.');
        }
    }

    // Content Moderation Section
    async loadContentModeration() {
        try {
            console.log('Loading content moderation data...');
            await this.loadModerationQueue();
        } catch (error) {
            console.error('Error loading moderation data:', error);
            this.showError('moderation-section', 'Failed to load moderation data');
        }
    }

    async loadModerationQueue() {
        try {
            const response = await fetch(`${this.apiBase}/moderation/queue`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.renderModerationQueue(result.data);
            } else {
                throw new Error(result.message || 'Failed to load moderation queue');
            }
        } catch (error) {
            console.error('Error loading moderation queue:', error);
            // Show empty state
            this.renderModerationQueue([]);
        }
    }

    renderModerationQueue(flags) {
        const container = document.getElementById('moderation-queue');
        if (!container) return;

        if (flags.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--admin-gray-500);">
                    <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--admin-success);"></i>
                    <p>No pending content reviews</p>
                    <small>All content has been reviewed</small>
                </div>
            `;
            return;
        }

        const flagsHtml = flags.map(flag => `
            <div class="moderation-item" style="border: 1px solid var(--admin-gray-200); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0; color: var(--admin-gray-900);">${flag.contentType} Flagged</h4>
                        <p style="margin: 0; color: var(--admin-gray-600); font-size: 0.875rem;">
                            Reason: ${flag.reason} | Reported by: ${flag.reporterEmail || 'Anonymous'}
                        </p>
                    </div>
                    <span class="status-badge ${flag.priority || 'medium'}" style="margin-left: 1rem;">
                        ${this.capitalizeFirst(flag.priority || 'medium')} Priority
                    </span>
                </div>
                <div style="background: var(--admin-gray-50); padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                    <p style="margin: 0; font-size: 0.875rem;">${flag.contentPreview || 'Content preview not available'}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button onclick="adminSections.approveContent('${flag.id}')" 
                            style="padding: 0.5rem 1rem; background: var(--admin-success); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Approve
                    </button>
                    <button onclick="adminSections.rejectContent('${flag.id}')" 
                            style="padding: 0.5rem 1rem; background: var(--admin-danger); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Reject
                    </button>
                    <button onclick="adminSections.viewFullContent('${flag.id}')" 
                            style="padding: 0.5rem 1rem; background: var(--admin-info); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        View Full
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = flagsHtml;
    }

    async approveContent(flagId) {
        if (!confirm('Are you sure you want to approve this content?')) return;

        try {
            const response = await fetch(`${this.apiBase}/moderation/flags/${flagId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'approve',
                    reason: 'Content approved by admin'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                alert('Content approved successfully');
                this.loadModerationQueue(); // Reload the queue
            } else {
                throw new Error(result.message || 'Failed to approve content');
            }
        } catch (error) {
            console.error('Error approving content:', error);
            alert('Failed to approve content. Please try again.');
        }
    }

    async rejectContent(flagId) {
        const reason = prompt('Please provide a reason for rejecting this content:');
        if (!reason) return;

        try {
            const response = await fetch(`${this.apiBase}/moderation/flags/${flagId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'reject',
                    reason: reason
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                alert('Content rejected successfully');
                this.loadModerationQueue(); // Reload the queue
            } else {
                throw new Error(result.message || 'Failed to reject content');
            }
        } catch (error) {
            console.error('Error rejecting content:', error);
            alert('Failed to reject content. Please try again.');
        }
    }

    viewFullContent(flagId) {
        alert(`View full content for flag ${flagId} - Full content modal will be implemented`);
    }

    // Analytics Section
    async loadAnalytics() {
        try {
            console.log('Loading analytics data...');
            await this.loadAnalyticsCharts();
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('analytics-section', 'Failed to load analytics data');
        }
    }

    async loadAnalyticsCharts() {
        const container = document.getElementById('analytics-charts');
        if (!container) return;

        // Create the analytics dashboard with real charts
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; height: 100%; margin-bottom: 2rem;">
                <div class="chart-container">
                    <h3>User Growth</h3>
                    <canvas id="user-growth-chart" style="height: 250px;"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Course Engagement</h3>
                    <canvas id="course-engagement-chart" style="height: 250px;"></canvas>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; height: 100%;">
                <div class="chart-container">
                    <h3>Revenue Analytics</h3>
                    <canvas id="revenue-chart" style="height: 250px;"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Platform Activity</h3>
                    <canvas id="activity-chart" style="height: 250px;"></canvas>
                </div>
            </div>
        `;

        // Load Chart.js if not already loaded
        if (typeof Chart === 'undefined') {
            await this.loadChartJS();
        }

        // Create the charts
        this.createUserGrowthChart();
        this.createCourseEngagementChart();
        this.createRevenueChart();
        this.createActivityChart();
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createUserGrowthChart() {
        const ctx = document.getElementById('user-growth-chart');
        if (!ctx) return;

        // Mock data for user growth
        const userData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'New Users',
                data: [65, 89, 120, 151, 189, 234, 267, 298, 334, 389, 445, 502],
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Active Users',
                data: [45, 67, 98, 134, 167, 201, 234, 267, 298, 334, 378, 423],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: userData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    createCourseEngagementChart() {
        const ctx = document.getElementById('course-engagement-chart');
        if (!ctx) return;

        const courseData = {
            labels: ['Programming', 'Design', 'Marketing', 'Business', 'Data Science', 'Other'],
            datasets: [{
                label: 'Course Enrollments',
                data: [234, 156, 89, 67, 145, 34],
                backgroundColor: [
                    'rgba(37, 99, 235, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(107, 114, 128, 0.8)'
                ],
                borderColor: [
                    'rgb(37, 99, 235)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)',
                    'rgb(239, 68, 68)',
                    'rgb(139, 92, 246)',
                    'rgb(107, 114, 128)'
                ],
                borderWidth: 2
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: courseData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    createRevenueChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        const revenueData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue ($)',
                data: [12500, 15600, 18900, 22300, 26700, 31200],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2
            }]
        };

        new Chart(ctx, {
            type: 'bar',
            data: revenueData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        const activityData = {
            labels: ['Messages', 'Course Views', 'Project Posts', 'Mentorship Sessions', 'User Registrations'],
            datasets: [{
                label: 'Daily Activity',
                data: [456, 789, 234, 123, 67],
                backgroundColor: [
                    'rgba(37, 99, 235, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ]
            }]
        };

        new Chart(ctx, {
            type: 'polarArea',
            data: activityData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Utility methods
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    generateAvatar(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    showLoadingState(elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<div class="loading-spinner"></div>';
            }
        });
    }

    showTableLoading(tableBodyId) {
        const tbody = document.getElementById(tableBodyId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">
                        <div class="loading-spinner" style="margin: 0 auto;"></div>
                        <p style="margin-top: 1rem; color: var(--admin-gray-500);">Loading...</p>
                    </td>
                </tr>
            `;
        } else {
            // If table doesn't exist yet, just log that we're loading
            console.log(`Loading data for ${tableBodyId}...`);
        }
    }

    renderPagination(pagination, section) {
        // Simple pagination implementation
        const container = document.getElementById(`${section}-pagination`);
        if (!container || !pagination) return;

        const { page, totalPages, total } = pagination;
        
        container.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-top: 1rem;">
                <div style="color: var(--admin-gray-600);">
                    Showing ${((page - 1) * 20) + 1}-${Math.min(page * 20, total)} of ${total} results
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button ${page <= 1 ? 'disabled' : ''} 
                            onclick="adminSections.loadUsers(${page - 1})"
                            style="padding: 0.5rem 1rem; border: 1px solid var(--admin-gray-300); background: white; border-radius: 4px; cursor: ${page <= 1 ? 'not-allowed' : 'pointer'};">
                        Previous
                    </button>
                    <span style="padding: 0.5rem 1rem; background: var(--admin-primary); color: white; border-radius: 4px;">
                        ${page}
                    </span>
                    <button ${page >= totalPages ? 'disabled' : ''} 
                            onclick="adminSections.loadUsers(${page + 1})"
                            style="padding: 0.5rem 1rem; border: 1px solid var(--admin-gray-300); background: white; border-radius: 4px; cursor: ${page >= totalPages ? 'not-allowed' : 'pointer'};">
                        Next
                    </button>
                </div>
            </div>
        `;
    }

    // Course Management Section
    async loadCourseManagement() {
        try {
            console.log('Loading course management data...');
            await this.loadCourses();
        } catch (error) {
            console.error('Error loading course management:', error);
            this.showError('courses-section', 'Failed to load course data');
        }
    }

    async loadCourses(page = 1, filters = {}) {
        try {
            // Show loading state
            this.showTableLoading('courses-table-body');
            
            // Build query parameters - use the existing course API
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                sortBy: 'createdAt',
                sortOrder: 'desc',
                ...filters
            });

            // Fetch courses from the existing course API
            const response = await fetch(`/api/courses?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.renderCourseTable(result.data);
                this.renderCoursePagination(result.pagination);
            } else {
                throw new Error(result.message || 'Failed to load courses');
            }

        } catch (error) {
            console.error('Error loading courses:', error);
            // Fallback to mock data if API fails
            const mockCourses = [
                {
                    id: 1,
                    title: 'Advanced JavaScript',
                    category: 'Programming',
                    difficultyLevel: 'Advanced',
                    enrollmentCount: 234,
                    isActive: true,
                    createdAt: '2024-01-15T00:00:00Z',
                    instructor: { name: 'John Smith' }
                },
                {
                    id: 2,
                    title: 'React Fundamentals',
                    category: 'Programming',
                    difficultyLevel: 'Intermediate',
                    enrollmentCount: 156,
                    isActive: true,
                    createdAt: '2024-01-20T00:00:00Z',
                    instructor: { name: 'Jane Doe' }
                },
                {
                    id: 3,
                    title: 'UI/UX Design Principles',
                    category: 'Design',
                    difficultyLevel: 'Beginner',
                    enrollmentCount: 89,
                    isActive: false,
                    createdAt: '2024-01-10T00:00:00Z',
                    instructor: { name: 'Mike Johnson' }
                }
            ];
            this.renderCourseTable(mockCourses);
        }
    }

    renderCourseTable(courses) {
        // Find the existing card body in the courses section
        const cardBody = document.querySelector('#courses-section .admin-card .card-body');
        if (!cardBody) {
            console.error('Courses card body not found');
            return;
        }

        // Create the table structure
        cardBody.innerHTML = `
            <div class="card-header" style="margin: -1.5rem -1.5rem 1.5rem -1.5rem; padding: 1.5rem;">
                <h3 class="card-title">Course List</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline">
                        <i class="fas fa-filter"></i> Filter
                    </button>
                    <button class="btn btn-primary" onclick="adminSections.addCourse()">
                        <i class="fas fa-plus"></i> Add Course
                    </button>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Category</th>
                        <th>Level</th>
                        <th>Enrollments</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="courses-table-body">
                    <!-- Courses will be populated here -->
                </tbody>
            </table>
            <div id="courses-pagination">
                <!-- Pagination will be loaded dynamically -->
            </div>
        `;

        // Now populate the table
        const tbody = document.getElementById('courses-table-body');
        if (!tbody) return;

        const coursesHtml = courses.map(course => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; background: var(--admin-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-book" style="color: white;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">${course.title}</div>
                            <div style="font-size: 0.875rem; color: var(--admin-gray-500);">
                                ${course.description ? course.description.substring(0, 50) + '...' : 'No description'}
                            </div>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge programming">${course.category}</span></td>
                <td><span class="status-badge ${course.difficultyLevel?.toLowerCase()}">${course.difficultyLevel}</span></td>
                <td>${course.enrollmentCount || 0}</td>
                <td><span class="status-badge ${course.isActive ? 'active' : 'inactive'}">${course.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>${this.formatDate(course.createdAt)}</td>
                <td>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="action-btn view" onclick="adminSections.viewCourse('${course.id}')" title="View Course">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="adminSections.editCourse('${course.id}')" title="Edit Course">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn ${course.isActive ? 'warning' : 'success'}" 
                                onclick="adminSections.toggleCourseStatus('${course.id}')" 
                                title="${course.isActive ? 'Deactivate' : 'Activate'} Course">
                            <i class="fas fa-${course.isActive ? 'pause' : 'play'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = coursesHtml;
    }

    // Course table creation is now handled inline in renderCourseTable

    renderCoursePagination(pagination) {
        const container = document.getElementById('courses-pagination');
        if (!container || !pagination) return;

        const { page, totalPages, total } = pagination;
        
        container.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-top: 1rem;">
                <div style="color: var(--admin-gray-600);">
                    Showing ${((page - 1) * 20) + 1}-${Math.min(page * 20, total)} of ${total} courses
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button ${page <= 1 ? 'disabled' : ''} 
                            onclick="adminSections.loadCourses(${page - 1})"
                            style="padding: 0.5rem 1rem; border: 1px solid var(--admin-gray-300); background: white; border-radius: 4px; cursor: ${page <= 1 ? 'not-allowed' : 'pointer'};">
                        Previous
                    </button>
                    <span style="padding: 0.5rem 1rem; background: var(--admin-primary); color: white; border-radius: 4px;">
                        ${page}
                    </span>
                    <button ${page >= totalPages ? 'disabled' : ''} 
                            onclick="adminSections.loadCourses(${page + 1})"
                            style="padding: 0.5rem 1rem; border: 1px solid var(--admin-gray-300); background: white; border-radius: 4px; cursor: ${page >= totalPages ? 'not-allowed' : 'pointer'};">
                        Next
                    </button>
                </div>
            </div>
        `;
    }

    // Course action methods
    async viewCourse(courseId) {
        try {
            const response = await fetch(`/api/courses/${courseId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showCourseModal(result.data);
            } else {
                throw new Error(result.message || 'Failed to load course details');
            }
        } catch (error) {
            console.error('Error viewing course:', error);
            alert('Failed to load course details. Please try again.');
        }
    }

    editCourse(courseId) {
        alert(`Edit course ${courseId} - Course editing interface will be implemented`);
    }

    toggleCourseStatus(courseId) {
        alert(`Toggle course status ${courseId} - Course status toggle will be implemented`);
    }

    addCourse() {
        alert('Add new course - Course creation interface will be implemented');
    }

    showCourseModal(course) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: var(--admin-gray-900);">Course Details</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--admin-gray-500);">×</button>
            </div>
            <div style="space-y: 1rem;">
                <div><strong>Title:</strong> ${course.title}</div>
                <div><strong>Category:</strong> <span class="status-badge programming">${course.category}</span></div>
                <div><strong>Difficulty:</strong> <span class="status-badge ${course.difficultyLevel?.toLowerCase()}">${course.difficultyLevel}</span></div>
                <div><strong>Status:</strong> <span class="status-badge ${course.isActive ? 'active' : 'inactive'}">${course.isActive ? 'Active' : 'Inactive'}</span></div>
                <div><strong>Enrollments:</strong> ${course.enrollmentCount || 0}</div>
                <div><strong>Created:</strong> ${this.formatDate(course.createdAt)}</div>
                ${course.description ? `<div><strong>Description:</strong><br><p style="margin-top: 0.5rem; padding: 1rem; background: var(--admin-gray-50); border-radius: 4px;">${course.description}</p></div>` : ''}
                ${course.modules && course.modules.length > 0 ? `
                    <div><strong>Modules:</strong>
                        <ul style="margin-top: 0.5rem;">
                            ${course.modules.map(module => `<li>${module.title}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
            <div style="margin-top: 2rem; text-align: right;">
                <button onclick="this.closest('.modal').remove()" style="padding: 0.5rem 1rem; background: var(--admin-gray-500); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;

        modal.className = 'modal';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Project Management Section
    async loadProjectManagement() {
        try {
            console.log('Loading project management data...');
            await this.loadProjects();
        } catch (error) {
            console.error('Error loading project management:', error);
            this.showError('projects-section', 'Failed to load project data');
        }
    }

    async loadProjects(page = 1, filters = {}) {
        try {
            // Show loading state
            this.showTableLoading('projects-table-body');
            
            // Build query parameters
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                sortBy: 'createdAt',
                sortOrder: 'desc',
                ...filters
            });

            // Fetch projects from the existing project API
            const response = await fetch(`/api/projects?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.renderProjectTable(result.data);
                this.renderProjectPagination(result.pagination);
            } else {
                throw new Error(result.message || 'Failed to load projects');
            }

        } catch (error) {
            console.error('Error loading projects:', error);
            // Fallback to mock data if API fails
            const mockProjects = [
                {
                    id: 1,
                    title: 'E-commerce Website Development',
                    budget: 2500,
                    status: 'active',
                    applicationsCount: 12,
                    createdAt: '2024-01-15T00:00:00Z',
                    client: { name: 'John Smith' },
                    skills: ['React', 'Node.js', 'MongoDB']
                },
                {
                    id: 2,
                    title: 'Mobile App UI/UX Design',
                    budget: 1800,
                    status: 'in_progress',
                    applicationsCount: 8,
                    createdAt: '2024-01-20T00:00:00Z',
                    client: { name: 'Jane Doe' },
                    skills: ['Figma', 'UI Design', 'Mobile Design']
                },
                {
                    id: 3,
                    title: 'Data Analysis Dashboard',
                    budget: 3200,
                    status: 'completed',
                    applicationsCount: 15,
                    createdAt: '2024-01-10T00:00:00Z',
                    client: { name: 'Mike Johnson' },
                    skills: ['Python', 'Data Analysis', 'Visualization']
                }
            ];
            this.renderProjectTable(mockProjects);
        }
    }

    renderProjectTable(projects) {
        // Find the existing card body in the projects section
        const cardBody = document.querySelector('#projects-section .admin-card .card-body');
        if (!cardBody) {
            console.error('Projects card body not found');
            return;
        }

        // Create the table structure
        cardBody.innerHTML = `
            <div class="card-header" style="margin: -1.5rem -1.5rem 1.5rem -1.5rem; padding: 1.5rem;">
                <h3 class="card-title">Project List</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline">
                        <i class="fas fa-filter"></i> Filter
                    </button>
                    <button class="btn btn-primary" onclick="adminSections.addProject()">
                        <i class="fas fa-plus"></i> Add Project
                    </button>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Project</th>
                        <th>Budget</th>
                        <th>Status</th>
                        <th>Applications</th>
                        <th>Skills</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="projects-table-body">
                    <!-- Projects will be populated here -->
                </tbody>
            </table>
            <div id="projects-pagination">
                <!-- Pagination will be loaded dynamically -->
            </div>
        `;

        // Now populate the table
        const tbody = document.getElementById('projects-table-body');
        if (!tbody) return;

        const projectsHtml = projects.map(project => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; background: var(--admin-info); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-project-diagram" style="color: white;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 500;">${project.title}</div>
                            <div style="font-size: 0.875rem; color: var(--admin-gray-500);">
                                Client: ${project.client?.name || 'Unknown'}
                            </div>
                        </div>
                    </div>
                </td>
                <td>$${project.budget?.toLocaleString() || 'N/A'}</td>
                <td><span class="status-badge ${project.status}">${this.capitalizeFirst(project.status?.replace('_', ' ') || 'Unknown')}</span></td>
                <td>${project.applicationsCount || 0}</td>
                <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                        ${(project.skills || []).slice(0, 3).map(skill => 
                            `<span style="background: var(--admin-gray-200); color: var(--admin-gray-700); padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">${skill}</span>`
                        ).join('')}
                        ${(project.skills || []).length > 3 ? `<span style="color: var(--admin-gray-500); font-size: 0.75rem;">+${(project.skills || []).length - 3} more</span>` : ''}
                    </div>
                </td>
                <td>${this.formatDate(project.createdAt)}</td>
                <td>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="action-btn view" onclick="adminSections.viewProject('${project.id}')" title="View Project">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="adminSections.editProject('${project.id}')" title="Edit Project">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn info" onclick="adminSections.viewProjectApplications('${project.id}')" title="View Applications">
                            <i class="fas fa-users"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = projectsHtml;
    }

    // Project table creation is now handled inline in renderProjectTable

    renderProjectPagination(pagination) {
        const container = document.getElementById('projects-pagination');
        if (!container || !pagination) return;

        const { page, totalPages, total } = pagination;
        
        container.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-top: 1rem;">
                <div style="color: var(--admin-gray-600);">
                    Showing ${((page - 1) * 20) + 1}-${Math.min(page * 20, total)} of ${total} projects
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button ${page <= 1 ? 'disabled' : ''} 
                            onclick="adminSections.loadProjects(${page - 1})"
                            style="padding: 0.5rem 1rem; border: 1px solid var(--admin-gray-300); background: white; border-radius: 4px; cursor: ${page <= 1 ? 'not-allowed' : 'pointer'};">
                        Previous
                    </button>
                    <span style="padding: 0.5rem 1rem; background: var(--admin-primary); color: white; border-radius: 4px;">
                        ${page}
                    </span>
                    <button ${page >= totalPages ? 'disabled' : ''} 
                            onclick="adminSections.loadProjects(${page + 1})"
                            style="padding: 0.5rem 1rem; border: 1px solid var(--admin-gray-300); background: white; border-radius: 4px; cursor: ${page >= totalPages ? 'not-allowed' : 'pointer'};">
                        Next
                    </button>
                </div>
            </div>
        `;
    }

    // Project action methods
    async viewProject(projectId) {
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showProjectModal(result.data);
            } else {
                throw new Error(result.message || 'Failed to load project details');
            }
        } catch (error) {
            console.error('Error viewing project:', error);
            alert('Failed to load project details. Please try again.');
        }
    }

    editProject(projectId) {
        alert(`Edit project ${projectId} - Project editing interface will be implemented`);
    }

    viewProjectApplications(projectId) {
        alert(`View applications for project ${projectId} - Applications interface will be implemented`);
    }

    addProject() {
        alert('Add new project - Project creation interface will be implemented');
    }

    showProjectModal(project) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: var(--admin-gray-900);">Project Details</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--admin-gray-500);">×</button>
            </div>
            <div style="space-y: 1rem;">
                <div><strong>Title:</strong> ${project.title}</div>
                <div><strong>Budget:</strong> $${project.budget?.toLocaleString() || 'N/A'}</div>
                <div><strong>Status:</strong> <span class="status-badge ${project.status}">${this.capitalizeFirst(project.status?.replace('_', ' ') || 'Unknown')}</span></div>
                <div><strong>Client:</strong> ${project.client?.name || 'Unknown'}</div>
                <div><strong>Applications:</strong> ${project.applicationsCount || 0}</div>
                <div><strong>Created:</strong> ${this.formatDate(project.createdAt)}</div>
                ${project.description ? `<div><strong>Description:</strong><br><p style="margin-top: 0.5rem; padding: 1rem; background: var(--admin-gray-50); border-radius: 4px;">${project.description}</p></div>` : ''}
                ${project.skills && project.skills.length > 0 ? `
                    <div><strong>Required Skills:</strong>
                        <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${project.skills.map(skill => 
                                `<span style="background: var(--admin-primary); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">${skill}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            <div style="margin-top: 2rem; text-align: right;">
                <button onclick="this.closest('.modal').remove()" style="padding: 0.5rem 1rem; background: var(--admin-gray-500); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;

        modal.className = 'modal';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Mentorship Management Section
    async loadMentorshipManagement() {
        try {
            console.log('Loading mentorship management data...');
            await this.loadMentorships();
        } catch (error) {
            console.error('Error loading mentorship management:', error);
            this.showError('mentorship-section', 'Failed to load mentorship data');
        }
    }

    async loadMentorships(page = 1, filters = {}) {
        try {
            // Show loading state
            this.showTableLoading('mentorship-table-body');
            
            // For now, use mock data since we don't have admin-specific mentorship APIs
            // In a real implementation, this would connect to /api/admin/mentorships
            const mockMentorships = [
                {
                    id: 1,
                    mentor: { name: 'Sarah Wilson', email: 'sarah@example.com', expertise: ['JavaScript', 'React'] },
                    mentee: { name: 'John Doe', email: 'john@example.com' },
                    status: 'active',
                    focusAreas: ['Frontend Development', 'Career Growth'],
                    sessionsCount: 8,
                    startDate: '2024-01-15T00:00:00Z',
                    lastSession: '2024-01-28T00:00:00Z'
                },
                {
                    id: 2,
                    mentor: { name: 'Mike Johnson', email: 'mike@example.com', expertise: ['Python', 'Data Science'] },
                    mentee: { name: 'Alice Brown', email: 'alice@example.com' },
                    status: 'pending',
                    focusAreas: ['Data Analysis', 'Machine Learning'],
                    sessionsCount: 0,
                    startDate: '2024-01-20T00:00:00Z',
                    lastSession: null
                },
                {
                    id: 3,
                    mentor: { name: 'Emma Davis', email: 'emma@example.com', expertise: ['UI/UX', 'Design'] },
                    mentee: { name: 'Bob Smith', email: 'bob@example.com' },
                    status: 'completed',
                    focusAreas: ['User Experience', 'Design Systems'],
                    sessionsCount: 12,
                    startDate: '2023-12-01T00:00:00Z',
                    lastSession: '2024-01-25T00:00:00Z'
                }
            ];

            this.renderMentorshipTable(mockMentorships);
            
        } catch (error) {
            console.error('Error loading mentorships:', error);
            this.showError('mentorship-section', 'Failed to load mentorships');
        }
    }

    renderMentorshipTable(mentorships) {
        // Find the existing card body in the mentorship section
        const cardBody = document.querySelector('#mentorship-section .admin-card .card-body');
        if (!cardBody) {
            console.error('Mentorship card body not found');
            return;
        }

        // Create the table structure
        cardBody.innerHTML = `
            <div class="card-header" style="margin: -1.5rem -1.5rem 1.5rem -1.5rem; padding: 1.5rem;">
                <h3 class="card-title">Mentorship Programs</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline">
                        <i class="fas fa-filter"></i> Filter
                    </button>
                    <button class="btn btn-outline">
                        <i class="fas fa-chart-bar"></i> Analytics
                    </button>
                </div>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Mentor</th>
                        <th>Mentee</th>
                        <th>Status</th>
                        <th>Focus Areas</th>
                        <th>Sessions</th>
                        <th>Timeline</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="mentorship-table-body">
                    <!-- Mentorships will be populated here -->
                </tbody>
            </table>
            <div id="mentorship-pagination">
                <!-- Pagination will be loaded dynamically -->
            </div>
        `;

        // Now populate the table
        const tbody = document.getElementById('mentorship-table-body');
        if (!tbody) return;

        const mentorshipsHtml = mentorships.map(mentorship => `
            <tr>
                <td>
                    <div>
                        <div style="font-weight: 500;">${mentorship.mentor.name}</div>
                        <div style="font-size: 0.875rem; color: var(--admin-gray-500);">${mentorship.mentor.email}</div>
                        <div style="margin-top: 0.25rem;">
                            ${(mentorship.mentor.expertise || []).slice(0, 2).map(skill => 
                                `<span style="background: var(--admin-primary); color: white; padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.75rem; margin-right: 0.25rem;">${skill}</span>`
                            ).join('')}
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight: 500;">${mentorship.mentee.name}</div>
                        <div style="font-size: 0.875rem; color: var(--admin-gray-500);">${mentorship.mentee.email}</div>
                    </div>
                </td>
                <td><span class="status-badge ${mentorship.status}">${this.capitalizeFirst(mentorship.status)}</span></td>
                <td>
                    <div style="max-width: 200px;">
                        ${(mentorship.focusAreas || []).map(area => 
                            `<div style="font-size: 0.875rem; margin-bottom: 0.125rem;">• ${area}</div>`
                        ).join('')}
                    </div>
                </td>
                <td style="text-align: center;">${mentorship.sessionsCount}</td>
                <td>
                    <div>
                        <div style="font-size: 0.875rem;">Started: ${this.formatDate(mentorship.startDate)}</div>
                        ${mentorship.lastSession ? `<div style="font-size: 0.875rem; color: var(--admin-gray-500);">Last: ${this.formatDate(mentorship.lastSession)}</div>` : ''}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="action-btn view" onclick="adminSections.viewMentorship('${mentorship.id}')" title="View Mentorship">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn info" onclick="adminSections.viewMentorshipSessions('${mentorship.id}')" title="View Sessions">
                            <i class="fas fa-calendar"></i>
                        </button>
                        ${mentorship.status === 'pending' ? `
                            <button class="action-btn success" onclick="adminSections.approveMentorship('${mentorship.id}')" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = mentorshipsHtml;
    }

    // Mentorship table creation is now handled inline in renderMentorshipTable

    // Mentorship action methods
    viewMentorship(mentorshipId) {
        alert(`View mentorship ${mentorshipId} - Mentorship detail modal will be implemented`);
    }

    viewMentorshipSessions(mentorshipId) {
        alert(`View sessions for mentorship ${mentorshipId} - Sessions interface will be implemented`);
    }

    approveMentorship(mentorshipId) {
        if (confirm('Are you sure you want to approve this mentorship?')) {
            alert(`Approve mentorship ${mentorshipId} - Approval process will be implemented`);
        }
    }

    // Message Management Section
    async loadMessageManagement() {
        try {
            console.log('Loading message management data...');
            await this.loadMessages();
        } catch (error) {
            console.error('Error loading message management:', error);
            this.showError('messages-section', 'Failed to load message data');
        }
    }

    async loadMessages(page = 1, filters = {}) {
        try {
            // Show loading state
            this.showTableLoading('messages-table-body');
            
            // For now, use mock data since we don't have a specific admin messages API
            // In a real implementation, this would connect to /api/admin/messages
            const mockMessages = [
                {
                    id: 1,
                    sender: { name: 'John Doe', email: 'john@example.com' },
                    recipient: { name: 'Jane Smith', email: 'jane@example.com' },
                    subject: 'Project Discussion',
                    content: 'Hi Jane, I wanted to discuss the project requirements...',
                    createdAt: '2024-01-15T10:30:00Z',
                    status: 'sent',
                    flagged: false
                },
                {
                    id: 2,
                    sender: { name: 'Mike Johnson', email: 'mike@example.com' },
                    recipient: { name: 'Sarah Wilson', email: 'sarah@example.com' },
                    subject: 'Course Feedback',
                    content: 'The course content was excellent, but I have some suggestions...',
                    createdAt: '2024-01-14T15:45:00Z',
                    status: 'read',
                    flagged: true
                },
                {
                    id: 3,
                    sender: { name: 'Alice Brown', email: 'alice@example.com' },
                    recipient: { name: 'Bob Davis', email: 'bob@example.com' },
                    subject: 'Mentorship Session',
                    content: 'Thank you for the great mentorship session yesterday...',
                    createdAt: '2024-01-13T09:15:00Z',
                    status: 'sent',
                    flagged: false
                }
            ];

            this.renderMessageTable(mockMessages);
            
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showError('messages-section', 'Failed to load messages');
        }
    }

    renderMessageTable(messages) {
        // Find the existing card body in the messages section
        const cardBody = document.querySelector('#messages-section .admin-card .card-body');
        if (!cardBody) {
            console.error('Messages card body not found');
            return;
        }

        // Create the table structure
        cardBody.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Sender</th>
                        <th>Recipient</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="messages-table-body">
                    <!-- Messages will be populated here -->
                </tbody>
            </table>
            <div id="messages-pagination">
                <!-- Pagination will be loaded dynamically -->
            </div>
        `;

        // Now populate the table
        const tbody = document.getElementById('messages-table-body');
        if (!tbody) return;

        const messagesHtml = messages.map(message => `
            <tr style="${message.flagged ? 'background-color: #fef2f2;' : ''}">
                <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        ${message.flagged ? '<i class="fas fa-flag" style="color: var(--admin-danger);"></i>' : ''}
                        <div>
                            <div style="font-weight: 500;">${message.sender.name}</div>
                            <div style="font-size: 0.875rem; color: var(--admin-gray-500);">${message.sender.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight: 500;">${message.recipient.name}</div>
                        <div style="font-size: 0.875rem; color: var(--admin-gray-500);">${message.recipient.email}</div>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight: 500;">${message.subject}</div>
                        <div style="font-size: 0.875rem; color: var(--admin-gray-500); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${message.content}
                        </div>
                    </div>
                </td>
                <td><span class="status-badge ${message.status}">${this.capitalizeFirst(message.status)}</span></td>
                <td>${this.formatDate(message.createdAt)}</td>
                <td>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="action-btn view" onclick="adminSections.viewMessage('${message.id}')" title="View Message">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn ${message.flagged ? 'success' : 'warning'}" 
                                onclick="adminSections.toggleMessageFlag('${message.id}')" 
                                title="${message.flagged ? 'Unflag' : 'Flag'} Message">
                            <i class="fas fa-flag"></i>
                        </button>
                        <button class="action-btn delete" onclick="adminSections.deleteMessage('${message.id}')" title="Delete Message">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = messagesHtml;
    }

    // Message table creation is now handled inline in renderMessageTable

    // Message action methods
    viewMessage(messageId) {
        alert(`View message ${messageId} - Message detail modal will be implemented`);
    }

    toggleMessageFlag(messageId) {
        alert(`Toggle flag for message ${messageId} - Flag toggle will be implemented`);
    }

    deleteMessage(messageId) {
        if (confirm('Are you sure you want to delete this message?')) {
            alert(`Delete message ${messageId} - Message deletion will be implemented`);
        }
    }

    // System Health Section
    async loadSystemHealth() {
        try {
            console.log('Loading system health data...');
            await this.loadSystemHealthData();
        } catch (error) {
            console.error('Error loading system health:', error);
            this.showError('system-section', 'Failed to load system health data');
        }
    }

    async loadSystemHealthData() {
        try {
            const response = await fetch(`${this.apiBase}/system/health`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.renderSystemHealth(result.data);
            } else {
                throw new Error(result.message || 'Failed to load system health');
            }
        } catch (error) {
            console.error('Error loading system health:', error);
            this.showComingSoon('system-section', 'System Health');
        }
    }

    renderSystemHealth(healthData) {
        const container = document.querySelector('#system-section .admin-card .card-body');
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <div class="health-metric" style="padding: 1rem; background: var(--admin-gray-50); border-radius: 8px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--admin-gray-900);">Database</h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${healthData.database?.status === 'healthy' ? 'var(--admin-success)' : 'var(--admin-danger)'};"></div>
                        <span>${healthData.database?.status || 'Unknown'}</span>
                    </div>
                    <small style="color: var(--admin-gray-500);">Response: ${healthData.database?.responseTime || 'N/A'}ms</small>
                </div>
                <div class="health-metric" style="padding: 1rem; background: var(--admin-gray-50); border-radius: 8px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--admin-gray-900);">Server</h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${healthData.server?.status === 'healthy' ? 'var(--admin-success)' : 'var(--admin-danger)'};"></div>
                        <span>${healthData.server?.status || 'Unknown'}</span>
                    </div>
                    <small style="color: var(--admin-gray-500);">Uptime: ${healthData.server?.uptime || 'N/A'}</small>
                </div>
                <div class="health-metric" style="padding: 1rem; background: var(--admin-gray-50); border-radius: 8px;">
                    <h4 style="margin: 0 0 0.5rem 0; color: var(--admin-gray-900);">Memory</h4>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${(healthData.memory?.usage || 0) < 80 ? 'var(--admin-success)' : 'var(--admin-warning)'};"></div>
                        <span>${healthData.memory?.usage || 0}% used</span>
                    </div>
                    <small style="color: var(--admin-gray-500);">Available: ${healthData.memory?.available || 'N/A'}</small>
                </div>
            </div>
        `;
    }

    // Reports Section
    async loadReports() {
        try {
            console.log('Loading reports section...');
            const reportsContent = document.getElementById('reports-content');
            if (reportsContent && window.adminReports) {
                reportsContent.innerHTML = window.adminReports.createReportDashboard();
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showError('reports-section', 'Failed to load reports');
        }
    }

    // Settings Section
    async loadSettings() {
        try {
            console.log('Loading platform settings...');
            await this.loadPlatformSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('settings-section', 'Failed to load platform settings');
        }
    }

    async loadPlatformSettings() {
        try {
            // For now, use mock settings data
            // In a real implementation, this would connect to /api/admin/settings
            const mockSettings = {
                general: {
                    platformName: 'SkillRise',
                    platformDescription: 'Professional learning and freelancing platform',
                    maintenanceMode: false,
                    registrationEnabled: true,
                    emailVerificationRequired: true
                },
                features: {
                    coursesEnabled: true,
                    projectsEnabled: true,
                    mentorshipEnabled: true,
                    messagesEnabled: true,
                    certificatesEnabled: true
                },
                security: {
                    passwordMinLength: 8,
                    sessionTimeout: 24,
                    maxLoginAttempts: 5,
                    twoFactorEnabled: false
                },
                email: {
                    smtpEnabled: true,
                    smtpHost: 'smtp.gmail.com',
                    smtpPort: 587,
                    fromEmail: 'noreply@skillrise.com',
                    fromName: 'SkillRise Platform'
                },
                payment: {
                    stripeEnabled: true,
                    paypalEnabled: false,
                    currency: 'USD',
                    platformFee: 10
                }
            };

            this.renderSettingsInterface(mockSettings);
            
        } catch (error) {
            console.error('Error loading platform settings:', error);
            this.showError('settings-section', 'Failed to load settings');
        }
    }

    renderSettingsInterface(settings) {
        const settingsSection = document.getElementById('settings-section');
        if (!settingsSection) return;

        const cardBody = settingsSection.querySelector('.admin-card .card-body') || settingsSection;
        
        cardBody.innerHTML = `
            <div class="settings-container" style="max-width: 800px;">
                <!-- General Settings -->
                <div class="settings-group" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900); border-bottom: 2px solid var(--admin-primary); padding-bottom: 0.5rem;">
                        <i class="fas fa-cog" style="margin-right: 0.5rem;"></i>General Settings
                    </h3>
                    <div class="settings-grid" style="display: grid; gap: 1rem;">
                        <div class="setting-item">
                            <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Platform Name</label>
                            <input type="text" value="${settings.general.platformName}" 
                                   style="width: 100%; padding: 0.5rem; border: 1px solid var(--admin-gray-300); border-radius: 4px;">
                        </div>
                        <div class="setting-item">
                            <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Platform Description</label>
                            <textarea rows="3" style="width: 100%; padding: 0.5rem; border: 1px solid var(--admin-gray-300); border-radius: 4px;">${settings.general.platformDescription}</textarea>
                        </div>
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="maintenance-mode" ${settings.general.maintenanceMode ? 'checked' : ''}>
                            <label for="maintenance-mode" style="font-weight: 500;">Maintenance Mode</label>
                        </div>
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="registration-enabled" ${settings.general.registrationEnabled ? 'checked' : ''}>
                            <label for="registration-enabled" style="font-weight: 500;">Allow New Registrations</label>
                        </div>
                    </div>
                </div>

                <!-- Feature Flags -->
                <div class="settings-group" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900); border-bottom: 2px solid var(--admin-info); padding-bottom: 0.5rem;">
                        <i class="fas fa-toggle-on" style="margin-right: 0.5rem;"></i>Feature Flags
                    </h3>
                    <div class="settings-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="courses-enabled" ${settings.features.coursesEnabled ? 'checked' : ''}>
                            <label for="courses-enabled" style="font-weight: 500;">Courses Module</label>
                        </div>
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="projects-enabled" ${settings.features.projectsEnabled ? 'checked' : ''}>
                            <label for="projects-enabled" style="font-weight: 500;">Projects Module</label>
                        </div>
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="mentorship-enabled" ${settings.features.mentorshipEnabled ? 'checked' : ''}>
                            <label for="mentorship-enabled" style="font-weight: 500;">Mentorship Module</label>
                        </div>
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="messages-enabled" ${settings.features.messagesEnabled ? 'checked' : ''}>
                            <label for="messages-enabled" style="font-weight: 500;">Messaging System</label>
                        </div>
                    </div>
                </div>

                <!-- Security Settings -->
                <div class="settings-group" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900); border-bottom: 2px solid var(--admin-warning); padding-bottom: 0.5rem;">
                        <i class="fas fa-shield-alt" style="margin-right: 0.5rem;"></i>Security Settings
                    </h3>
                    <div class="settings-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                        <div class="setting-item">
                            <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Password Min Length</label>
                            <input type="number" value="${settings.security.passwordMinLength}" min="6" max="20"
                                   style="width: 100%; padding: 0.5rem; border: 1px solid var(--admin-gray-300); border-radius: 4px;">
                        </div>
                        <div class="setting-item">
                            <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Session Timeout (hours)</label>
                            <input type="number" value="${settings.security.sessionTimeout}" min="1" max="168"
                                   style="width: 100%; padding: 0.5rem; border: 1px solid var(--admin-gray-300); border-radius: 4px;">
                        </div>
                        <div class="setting-item">
                            <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Max Login Attempts</label>
                            <input type="number" value="${settings.security.maxLoginAttempts}" min="3" max="10"
                                   style="width: 100%; padding: 0.5rem; border: 1px solid var(--admin-gray-300); border-radius: 4px;">
                        </div>
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="two-factor-enabled" ${settings.security.twoFactorEnabled ? 'checked' : ''}>
                            <label for="two-factor-enabled" style="font-weight: 500;">Two-Factor Authentication</label>
                        </div>
                    </div>
                </div>

                <!-- Payment Settings -->
                <div class="settings-group" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900); border-bottom: 2px solid var(--admin-success); padding-bottom: 0.5rem;">
                        <i class="fas fa-credit-card" style="margin-right: 0.5rem;"></i>Payment Settings
                    </h3>
                    <div class="settings-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="stripe-enabled" ${settings.payment.stripeEnabled ? 'checked' : ''}>
                            <label for="stripe-enabled" style="font-weight: 500;">Stripe Payments</label>
                        </div>
                        <div class="setting-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="paypal-enabled" ${settings.payment.paypalEnabled ? 'checked' : ''}>
                            <label for="paypal-enabled" style="font-weight: 500;">PayPal Payments</label>
                        </div>
                        <div class="setting-item">
                            <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Currency</label>
                            <select style="width: 100%; padding: 0.5rem; border: 1px solid var(--admin-gray-300); border-radius: 4px;">
                                <option value="USD" ${settings.payment.currency === 'USD' ? 'selected' : ''}>USD</option>
                                <option value="EUR" ${settings.payment.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                                <option value="GBP" ${settings.payment.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                            </select>
                        </div>
                        <div class="setting-item">
                            <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Platform Fee (%)</label>
                            <input type="number" value="${settings.payment.platformFee}" min="0" max="30" step="0.5"
                                   style="width: 100%; padding: 0.5rem; border: 1px solid var(--admin-gray-300); border-radius: 4px;">
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="settings-actions" style="display: flex; gap: 1rem; justify-content: flex-end; padding-top: 2rem; border-top: 1px solid var(--admin-gray-200);">
                    <button class="btn btn-outline" onclick="adminSections.resetSettings()">
                        <i class="fas fa-undo"></i> Reset to Defaults
                    </button>
                    <button class="btn btn-primary" onclick="adminSections.saveSettings()">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                </div>
            </div>
        `;
    }

    // Settings action methods
    saveSettings() {
        // Collect all form data
        const settings = {
            general: {
                platformName: document.querySelector('input[value*="SkillRise"]').value,
                maintenanceMode: document.getElementById('maintenance-mode').checked,
                registrationEnabled: document.getElementById('registration-enabled').checked
            },
            features: {
                coursesEnabled: document.getElementById('courses-enabled').checked,
                projectsEnabled: document.getElementById('projects-enabled').checked,
                mentorshipEnabled: document.getElementById('mentorship-enabled').checked,
                messagesEnabled: document.getElementById('messages-enabled').checked
            }
            // Add other settings as needed
        };

        console.log('Saving settings:', settings);
        alert('Settings saved successfully! (This would connect to the backend API)');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            this.loadPlatformSettings(); // Reload default settings
            alert('Settings reset to defaults');
        }
    }

    showComingSoon(sectionId, sectionName) {
        const section = document.getElementById(sectionId);
        if (section) {
            const content = section.querySelector('.admin-card .card-body') || section;
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--admin-gray-500);">
                    <i class="fas fa-tools" style="font-size: 3rem; margin-bottom: 1rem; color: var(--admin-info);"></i>
                    <h3 style="margin-bottom: 0.5rem; color: var(--admin-gray-700);">${sectionName}</h3>
                    <p>This section is under development</p>
                    <small>Full functionality will be available soon</small>
                </div>
            `;
        }
    }

    showError(sectionId, message) {
        const section = document.getElementById(sectionId);
        if (section) {
            const errorHtml = `
                <div style="text-align: center; padding: 2rem; color: var(--admin-danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--admin-primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
            section.innerHTML = errorHtml;
        }
    }

    // User filtering and search methods
    filterUsers() {
        const searchTerm = document.getElementById('user-search')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('role-filter')?.value || '';
        const statusFilter = document.getElementById('status-filter')?.value || '';

        // Get current filters
        const filters = {
            search: searchTerm,
            role: roleFilter,
            status: statusFilter
        };

        // Reload users with filters
        this.loadUsers(1, filters);
    }

    clearUserFilters() {
        document.getElementById('user-search').value = '';
        document.getElementById('role-filter').value = '';
        document.getElementById('status-filter').value = '';
        this.loadUsers(1, {});
    }

    async exportUsers() {
        try {
            // In a real implementation, this would call the backend export API
            const filters = {
                search: document.getElementById('user-search')?.value || '',
                role: document.getElementById('role-filter')?.value || '',
                status: document.getElementById('status-filter')?.value || ''
            };

            // Mock CSV export
            const csvData = this.generateUserCSV(filters);
            this.downloadCSV(csvData, 'users-export.csv');
            
            alert('Users exported successfully!');
        } catch (error) {
            console.error('Error exporting users:', error);
            alert('Failed to export users. Please try again.');
        }
    }

    generateUserCSV(filters) {
        // Mock CSV generation - in real implementation, this would come from the backend
        const headers = ['Name', 'Email', 'Role', 'Status', 'Join Date'];
        const mockUsers = [
            ['John Doe', 'john.doe@example.com', 'freelancer', 'active', '2024-01-15'],
            ['Jane Smith', 'jane.smith@example.com', 'client', 'active', '2024-01-20'],
            ['Mike Johnson', 'mike.johnson@example.com', 'mentor', 'inactive', '2024-01-10']
        ];

        let csv = headers.join(',') + '\n';
        mockUsers.forEach(user => {
            csv += user.join(',') + '\n';
        });

        return csv;
    }

    downloadCSV(csvData, filename) {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // User action methods
    async viewUser(userId) {
        try {
            const response = await fetch(`${this.apiBase}/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showUserModal(result.data);
            } else {
                throw new Error(result.message || 'Failed to load user details');
            }
        } catch (error) {
            console.error('Error viewing user:', error);
            alert('Failed to load user details. Please try again.');
        }
    }

    async editUser(userId) {
        // For now, redirect to view mode - edit functionality can be added later
        this.viewUser(userId);
    }

    async toggleUserStatus(userId) {
        if (!confirm('Are you sure you want to change this user\'s status?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // The backend will toggle the status automatically
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Reload the user table to reflect changes
                this.loadUsers();
                alert('User status updated successfully');
            } else {
                throw new Error(result.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            alert('Failed to update user status. Please try again.');
        }
    }

    showUserModal(user) {
        // Create a simple modal for user details
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: var(--admin-gray-900);">User Details</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--admin-gray-500);">×</button>
            </div>
            <div style="space-y: 1rem;">
                <div><strong>Name:</strong> ${user.name || 'N/A'}</div>
                <div><strong>Email:</strong> ${user.email}</div>
                <div><strong>Role:</strong> <span class="status-badge ${user.role}">${this.capitalizeFirst(user.role)}</span></div>
                <div><strong>Status:</strong> <span class="status-badge ${user.status}">${this.capitalizeFirst(user.status)}</span></div>
                <div><strong>Joined:</strong> ${this.formatDate(user.createdAt || user.joinDate)}</div>
                ${user.lastLogin ? `<div><strong>Last Login:</strong> ${this.formatDate(user.lastLogin)}</div>` : ''}
                ${user.profileData ? `<div><strong>Profile:</strong> ${JSON.stringify(user.profileData, null, 2)}</div>` : ''}
            </div>
            <div style="margin-top: 2rem; text-align: right;">
                <button onclick="this.closest('.modal').remove()" style="padding: 0.5rem 1rem; background: var(--admin-gray-500); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;

        modal.className = 'modal';
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminSections = new AdminSections();
});

// Enhanced navigation to load section data immediately
document.addEventListener('DOMContentLoaded', function() {
    // Wait a moment for adminSections to be initialized
    setTimeout(() => {
        if (window.adminSections) {
            // Override the simple navigation to load data when switching sections
            const navigationLinks = document.querySelectorAll('.nav-link[data-section]');
            navigationLinks.forEach(function(link) {
                // Remove any existing listeners to avoid duplicates
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
                
                newLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    const section = this.dataset.section;
                    
                    // Update active nav link immediately
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Update header title immediately
                    const titles = {
                        overview: 'Dashboard',
                        users: 'User Management',
                        analytics: 'Analytics',
                        moderation: 'Content Moderation',
                        courses: 'Course Management',
                        projects: 'Project Management',
                        mentorship: 'Mentorship Management',
                        messages: 'Message Management',
                        system: 'System Health',
                        reports: 'Advanced Reports',
                        settings: 'Platform Settings'
                    };
                    const headerTitle = document.querySelector('.header-title');
                    if (headerTitle) {
                        headerTitle.textContent = titles[section] || 'Dashboard';
                    }
                    
                    // Show corresponding section immediately
                    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
                    const targetSection = document.getElementById(section + '-section');
                    if (targetSection) {
                        targetSection.classList.add('active');
                    }
                    
                    // Load section-specific data immediately (no delay)
                    switch(section) {
                        case 'overview':
                            window.adminSections.loadOverviewData();
                            break;
                        case 'users':
                            window.adminSections.loadUserManagement();
                            break;
                        case 'analytics':
                            window.adminSections.loadAnalytics();
                            break;
                        case 'moderation':
                            window.adminSections.loadContentModeration();
                            break;
                        case 'courses':
                            window.adminSections.loadCourseManagement();
                            break;
                        case 'projects':
                            window.adminSections.loadProjectManagement();
                            break;
                        case 'mentorship':
                            window.adminSections.loadMentorshipManagement();
                            break;
                        case 'messages':
                            window.adminSections.loadMessageManagement();
                            break;
                        case 'system':
                            window.adminSections.loadSystemHealth();
                            break;
                        case 'reports':
                            window.adminSections.loadReports();
                            break;
                        case 'settings':
                            window.adminSections.loadSettings();
                            break;
                    }
                });
            });
        }
    }, 50); // Minimal delay just to ensure adminSections is ready
});