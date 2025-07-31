const User = require('../models/User');
const Course = require('../models/Course');
const Project = require('../models/Project');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const UserProgress = require('../models/UserProgress');
const Mentorship = require('../models/Mentorship');

class AdminService {
    // User Management
    async getAllUsers(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                role = '',
                status = '',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const query = {};
            
            // Search filter
            if (search) {
                query.$or = [
                    { fullName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }
            
            // Role filter
            if (role) {
                query.role = role;
            }
            
            // Status filter
            if (status === 'active') {
                query.isActive = true;
            } else if (status === 'inactive') {
                query.isActive = false;
            }

            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const users = await User.find(query)
                .select('-password')
                .sort(sortOptions)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            const total = await User.countDocuments(query);

            return {
                success: true,
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting all users:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getUserById(userId) {
        try {
            const user = await User.findById(userId).select('-password').lean();
            
            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            // Get additional user statistics
            const [courseCount, projectCount, messageCount] = await Promise.all([
                Course.countDocuments({ instructorId: userId }),
                Project.countDocuments({ clientId: userId }),
                Message.countDocuments({ senderId: userId })
            ]);

            return {
                success: true,
                user: {
                    ...user,
                    statistics: {
                        coursesCreated: courseCount,
                        projectsPosted: projectCount,
                        messagesSent: messageCount
                    }
                }
            };
        } catch (error) {
            console.error('Error getting user by ID:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateUser(userId, updateData) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            return {
                success: true,
                user
            };
        } catch (error) {
            console.error('Error updating user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async deactivateUser(userId, reason = '') {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { 
                    isActive: false,
                    deactivatedAt: new Date(),
                    deactivationReason: reason
                },
                { new: true }
            ).select('-password');

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            return {
                success: true,
                message: 'User deactivated successfully',
                user
            };
        } catch (error) {
            console.error('Error deactivating user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async activateUser(userId) {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                { 
                    isActive: true,
                    $unset: { deactivatedAt: 1, deactivationReason: 1 }
                },
                { new: true }
            ).select('-password');

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            return {
                success: true,
                message: 'User activated successfully',
                user
            };
        } catch (error) {
            console.error('Error activating user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Platform Statistics
    async getPlatformStatistics() {
        try {
            const [
                totalUsers,
                activeUsers,
                totalCourses,
                totalProjects,
                totalMessages,
                recentUsers,
                usersByRole
            ] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ isActive: true }),
                Course.countDocuments(),
                Project.countDocuments(),
                Message.countDocuments(),
                User.countDocuments({ 
                    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }),
                User.aggregate([
                    { $group: { _id: '$role', count: { $sum: 1 } } }
                ])
            ]);

            const roleStats = usersByRole.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {});

            return {
                success: true,
                statistics: {
                    users: {
                        total: totalUsers,
                        active: activeUsers,
                        inactive: totalUsers - activeUsers,
                        recent: recentUsers,
                        byRole: roleStats
                    },
                    content: {
                        courses: totalCourses,
                        projects: totalProjects,
                        messages: totalMessages
                    }
                }
            };
        } catch (error) {
            console.error('Error getting platform statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Content Management
    async getAllCourses(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                category = '',
                status = '',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const query = {};
            
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (category) {
                query.category = category;
            }
            
            if (status) {
                query.status = status;
            }

            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const courses = await Course.find(query)
                .populate('instructorId', 'fullName email')
                .sort(sortOptions)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            const total = await Course.countDocuments(query);

            return {
                success: true,
                courses,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting all courses:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getAllProjects(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                status = '',
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const query = {};
            
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (status) {
                query.status = status;
            }

            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const projects = await Project.find(query)
                .populate('clientId', 'fullName email')
                .sort(sortOptions)
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            const total = await Project.countDocuments(query);

            return {
                success: true,
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting all projects:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // System Health
    async getSystemHealth() {
        try {
            const dbStatus = await this.checkDatabaseHealth();
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime();

            return {
                success: true,
                health: {
                    database: dbStatus,
                    memory: {
                        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                        external: Math.round(memoryUsage.external / 1024 / 1024)
                    },
                    uptime: Math.round(uptime),
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error getting system health:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkDatabaseHealth() {
        try {
            const mongoose = require('mongoose');
            const dbState = mongoose.connection.readyState;
            
            const states = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };

            return {
                status: states[dbState] || 'unknown',
                connected: dbState === 1
            };
        } catch (error) {
            return {
                status: 'error',
                connected: false,
                error: error.message
            };
        }
    }

    // Activity Logs
    async getActivityLogs(options = {}) {
        try {
            const {
                page = 1,
                limit = 50,
                userId = '',
                action = '',
                startDate = '',
                endDate = ''
            } = options;

            // This would typically come from a dedicated logging system
            // For now, we'll return recent user activities
            const query = {};
            
            if (userId) {
                query._id = userId;
            }

            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const activities = await User.find(query)
                .select('fullName email lastActive createdAt')
                .sort({ lastActive: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .lean();

            const total = await User.countDocuments(query);

            return {
                success: true,
                activities: activities.map(user => ({
                    userId: user._id,
                    userName: user.fullName,
                    email: user.email,
                    action: 'login',
                    timestamp: user.lastActive || user.createdAt,
                    details: 'User activity'
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting activity logs:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Bulk Operations
    async bulkUpdateUsers(userIds, updateData) {
        try {
            const result = await User.updateMany(
                { _id: { $in: userIds } },
                updateData
            );

            return {
                success: true,
                message: `Updated ${result.modifiedCount} users`,
                modifiedCount: result.modifiedCount
            };
        } catch (error) {
            console.error('Error bulk updating users:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async exportUserData(format = 'json') {
        try {
            const users = await User.find({})
                .select('-password')
                .lean();

            if (format === 'csv') {
                // Convert to CSV format
                const csv = this.convertToCSV(users);
                return {
                    success: true,
                    data: csv,
                    contentType: 'text/csv',
                    filename: `users_export_${Date.now()}.csv`
                };
            }

            return {
                success: true,
                data: JSON.stringify(users, null, 2),
                contentType: 'application/json',
                filename: `users_export_${Date.now()}.json`
            };
        } catch (error) {
            console.error('Error exporting user data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value}"` : value;
            }).join(',');
        });
        
        return [csvHeaders, ...csvRows].join('\n');
    }

    // Search functionality
    async searchContent(query, type = 'all') {
        try {
            const searchRegex = { $regex: query, $options: 'i' };
            const results = {};

            if (type === 'all' || type === 'users') {
                results.users = await User.find({
                    $or: [
                        { fullName: searchRegex },
                        { email: searchRegex }
                    ]
                }).select('-password').limit(10).lean();
            }

            if (type === 'all' || type === 'courses') {
                results.courses = await Course.find({
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                }).populate('instructorId', 'fullName').limit(10).lean();
            }

            if (type === 'all' || type === 'projects') {
                results.projects = await Project.find({
                    $or: [
                        { title: searchRegex },
                        { description: searchRegex }
                    ]
                }).populate('clientId', 'fullName').limit(10).lean();
            }

            return {
                success: true,
                results
            };
        } catch (error) {
            console.error('Error searching content:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Dashboard Statistics Methods
    async getUserStatistics() {
        try {
            const totalUsers = await User.countDocuments();
            const activeUsers = await User.countDocuments({ isActive: true });
            const newUsersThisMonth = await User.countDocuments({
                createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
            });
            const lastMonthUsers = await User.countDocuments({
                createdAt: { 
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                    $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            });

            const growthRate = lastMonthUsers > 0 ? 
                ((newUsersThisMonth - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : 0;

            return {
                total: totalUsers,
                active: activeUsers,
                newThisMonth: newUsersThisMonth,
                growthRate: growthRate
            };
        } catch (error) {
            console.error('Error fetching user statistics:', error);
            throw error;
        }
    }

    async getCourseStatistics() {
        try {
            const totalCourses = await Course.countDocuments();
            const totalEnrollments = await UserProgress.countDocuments();
            const completedCourses = await UserProgress.countDocuments({ 
                completionPercentage: 100 
            });

            return {
                total: totalCourses,
                enrollments: totalEnrollments,
                completed: completedCourses,
                completionRate: totalEnrollments > 0 ? 
                    ((completedCourses / totalEnrollments) * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error fetching course statistics:', error);
            throw error;
        }
    }

    async getProjectStatistics() {
        try {
            const totalProjects = await Project.countDocuments();
            const activeProjects = await Project.countDocuments({ status: 'active' });
            const completedProjects = await Project.countDocuments({ status: 'completed' });
            
            // Count total applications (assuming applications are stored as arrays in projects)
            const projectsWithApplications = await Project.find({}, 'applications').lean();
            const totalApplications = projectsWithApplications.reduce((sum, project) => {
                return sum + (project.applications ? project.applications.length : 0);
            }, 0);

            return {
                total: totalProjects,
                active: activeProjects,
                completed: completedProjects,
                applications: totalApplications
            };
        } catch (error) {
            console.error('Error fetching project statistics:', error);
            throw error;
        }
    }

    async getRevenueStatistics() {
        try {
            const currentMonth = new Date();
            const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
            const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

            // For now, return placeholder data since revenue tracking isn't fully implemented
            // In a real implementation, this would come from payment/transaction records
            const monthlyRevenue = 12450;
            const lastMonthRevenue = 11500;
            const growthRate = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1);

            return {
                monthly: monthlyRevenue,
                lastMonth: lastMonthRevenue,
                growthRate: growthRate,
                yearly: monthlyRevenue * 12 // Placeholder calculation
            };
        } catch (error) {
            console.error('Error fetching revenue statistics:', error);
            throw error;
        }
    }

    async getRecentActivity(limit = 20) {
        try {
            const activities = [];

            // Get recent user registrations
            const recentUsers = await User.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .select('fullName email userType createdAt')
                .lean();

            recentUsers.forEach(user => {
                activities.push({
                    type: 'user_registration',
                    title: 'New user registration',
                    description: `${user.email} joined as ${user.userType}`,
                    timestamp: user.createdAt,
                    icon: 'fas fa-user-plus',
                    color: 'success'
                });
            });

            // Get recent course completions
            const recentCompletions = await UserProgress.find({ completionPercentage: 100 })
                .sort({ updatedAt: -1 })
                .limit(5)
                .populate('userId', 'fullName')
                .populate('courseId', 'title')
                .lean();

            recentCompletions.forEach(completion => {
                if (completion.userId && completion.courseId) {
                    activities.push({
                        type: 'course_completion',
                        title: 'Course completed',
                        description: `${completion.courseId.title} - by ${completion.userId.fullName}`,
                        timestamp: completion.updatedAt,
                        icon: 'fas fa-graduation-cap',
                        color: 'primary'
                    });
                }
            });

            // Get recent projects
            const recentProjects = await Project.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('clientId', 'fullName')
                .select('title budget clientId createdAt')
                .lean();

            recentProjects.forEach(project => {
                activities.push({
                    type: 'project_posted',
                    title: 'Project posted',
                    description: `${project.title} - $${project.budget}`,
                    timestamp: project.createdAt,
                    icon: 'fas fa-briefcase',
                    color: 'warning'
                });
            });

            // Sort all activities by timestamp and limit
            return activities
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);

        } catch (error) {
            console.error('Error fetching recent activity:', error);
            throw error;
        }
    }

    async getChartData(period = '7d') {
        try {
            const days = period === '30d' ? 30 : 7;
            const chartData = {
                labels: [],
                datasets: [
                    {
                        label: 'New Users',
                        data: [],
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Course Enrollments',
                        data: [],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Projects Posted',
                        data: [],
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4
                    }
                ]
            };

            // Generate labels and mock data for the chart
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                if (days === 7) {
                    chartData.labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
                } else {
                    chartData.labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                }

                // Get actual counts for this date
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);

                const [userCount, enrollmentCount, projectCount] = await Promise.all([
                    User.countDocuments({
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    }),
                    UserProgress.countDocuments({
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    }),
                    Project.countDocuments({
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    })
                ]);

                chartData.datasets[0].data.push(userCount);
                chartData.datasets[1].data.push(enrollmentCount);
                chartData.datasets[2].data.push(projectCount);
            }

            return chartData;
        } catch (error) {
            console.error('Error fetching chart data:', error);
            throw error;
        }
    }
}

module.exports = new AdminService();