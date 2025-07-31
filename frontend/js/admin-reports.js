// Advanced Admin Reporting System
class AdminReports {
    constructor() {
        this.reportTypes = {
            users: 'User Analytics Report',
            courses: 'Course Performance Report',
            projects: 'Project Statistics Report',
            revenue: 'Revenue Analysis Report',
            system: 'System Performance Report'
        };
        this.init();
    }

    init() {
        console.log('Admin reports system initialized');
    }

    // Generate comprehensive user report
    async generateUserReport(dateRange = '30d') {
        try {
            const reportData = await this.fetchUserReportData(dateRange);
            return this.createUserReport(reportData);
        } catch (error) {
            console.error('Error generating user report:', error);
            throw error;
        }
    }

    async fetchUserReportData(dateRange) {
        // Mock data - in real implementation, this would fetch from backend
        return {
            totalUsers: 1247,
            newUsers: 156,
            activeUsers: 892,
            usersByRole: {
                freelancer: 567,
                client: 423,
                mentor: 189,
                admin: 68
            },
            usersByStatus: {
                active: 892,
                inactive: 234,
                suspended: 121
            },
            registrationTrend: [
                { date: '2024-01-01', count: 45 },
                { date: '2024-01-02', count: 52 },
                { date: '2024-01-03', count: 38 },
                { date: '2024-01-04', count: 67 },
                { date: '2024-01-05', count: 73 }
            ],
            topCountries: [
                { country: 'United States', users: 423 },
                { country: 'United Kingdom', users: 234 },
                { country: 'Canada', users: 189 },
                { country: 'Australia', users: 156 },
                { country: 'Germany', users: 134 }
            ]
        };
    }

    createUserReport(data) {
        const report = {
            title: 'User Analytics Report',
            generatedAt: new Date(),
            summary: {
                totalUsers: data.totalUsers,
                newUsers: data.newUsers,
                activeUsers: data.activeUsers,
                growthRate: ((data.newUsers / (data.totalUsers - data.newUsers)) * 100).toFixed(2)
            },
            sections: [
                {
                    title: 'User Distribution by Role',
                    type: 'chart',
                    data: data.usersByRole
                },
                {
                    title: 'User Status Breakdown',
                    type: 'chart',
                    data: data.usersByStatus
                },
                {
                    title: 'Registration Trend',
                    type: 'line-chart',
                    data: data.registrationTrend
                },
                {
                    title: 'Top Countries',
                    type: 'table',
                    data: data.topCountries
                }
            ]
        };

        return report;
    }

    // Generate course performance report
    async generateCourseReport(dateRange = '30d') {
        try {
            const reportData = await this.fetchCourseReportData(dateRange);
            return this.createCourseReport(reportData);
        } catch (error) {
            console.error('Error generating course report:', error);
            throw error;
        }
    }

    async fetchCourseReportData(dateRange) {
        return {
            totalCourses: 156,
            activeCourses: 134,
            totalEnrollments: 2456,
            completionRate: 67.8,
            coursesByCategory: {
                'Programming': 45,
                'Design': 32,
                'Marketing': 28,
                'Business': 24,
                'Data Science': 19,
                'Other': 8
            },
            topCourses: [
                { title: 'Advanced JavaScript', enrollments: 234, rating: 4.8 },
                { title: 'React Fundamentals', enrollments: 189, rating: 4.7 },
                { title: 'UI/UX Design', enrollments: 156, rating: 4.6 },
                { title: 'Python for Beginners', enrollments: 145, rating: 4.9 },
                { title: 'Digital Marketing', enrollments: 123, rating: 4.5 }
            ],
            revenueByCategory: {
                'Programming': 45600,
                'Design': 32400,
                'Marketing': 28900,
                'Business': 24300,
                'Data Science': 19800
            }
        };
    }

    createCourseReport(data) {
        return {
            title: 'Course Performance Report',
            generatedAt: new Date(),
            summary: {
                totalCourses: data.totalCourses,
                activeCourses: data.activeCourses,
                totalEnrollments: data.totalEnrollments,
                completionRate: data.completionRate
            },
            sections: [
                {
                    title: 'Courses by Category',
                    type: 'chart',
                    data: data.coursesByCategory
                },
                {
                    title: 'Top Performing Courses',
                    type: 'table',
                    data: data.topCourses
                },
                {
                    title: 'Revenue by Category',
                    type: 'bar-chart',
                    data: data.revenueByCategory
                }
            ]
        };
    }

    // Generate revenue report
    async generateRevenueReport(dateRange = '30d') {
        try {
            const reportData = await this.fetchRevenueReportData(dateRange);
            return this.createRevenueReport(reportData);
        } catch (error) {
            console.error('Error generating revenue report:', error);
            throw error;
        }
    }

    async fetchRevenueReportData(dateRange) {
        return {
            totalRevenue: 125600,
            monthlyRevenue: 31200,
            revenueGrowth: 15.6,
            revenueBySource: {
                'Course Sales': 78400,
                'Project Commissions': 32100,
                'Mentorship Fees': 15100
            },
            monthlyTrend: [
                { month: 'Jan', revenue: 12500 },
                { month: 'Feb', revenue: 15600 },
                { month: 'Mar', revenue: 18900 },
                { month: 'Apr', revenue: 22300 },
                { month: 'May', revenue: 26700 },
                { month: 'Jun', revenue: 31200 }
            ],
            topPayingUsers: [
                { name: 'John Doe', amount: 2400 },
                { name: 'Jane Smith', amount: 1890 },
                { name: 'Mike Johnson', amount: 1650 },
                { name: 'Sarah Wilson', amount: 1420 },
                { name: 'David Brown', amount: 1280 }
            ]
        };
    }

    createRevenueReport(data) {
        return {
            title: 'Revenue Analysis Report',
            generatedAt: new Date(),
            summary: {
                totalRevenue: data.totalRevenue,
                monthlyRevenue: data.monthlyRevenue,
                revenueGrowth: data.revenueGrowth,
                averagePerUser: (data.totalRevenue / 1247).toFixed(2)
            },
            sections: [
                {
                    title: 'Revenue by Source',
                    type: 'chart',
                    data: data.revenueBySource
                },
                {
                    title: 'Monthly Revenue Trend',
                    type: 'line-chart',
                    data: data.monthlyTrend
                },
                {
                    title: 'Top Paying Users',
                    type: 'table',
                    data: data.topPayingUsers
                }
            ]
        };
    }

    // Export report to different formats
    exportToPDF(report) {
        // Mock PDF export - in real implementation, would use a PDF library
        const pdfContent = this.generatePDFContent(report);
        this.downloadFile(pdfContent, `${report.title.replace(/\s+/g, '_')}.pdf`, 'application/pdf');
        console.log('Report exported to PDF');
    }

    exportToCSV(report) {
        const csvContent = this.generateCSVContent(report);
        this.downloadFile(csvContent, `${report.title.replace(/\s+/g, '_')}.csv`, 'text/csv');
        console.log('Report exported to CSV');
    }

    exportToExcel(report) {
        // Mock Excel export
        const excelContent = this.generateExcelContent(report);
        this.downloadFile(excelContent, `${report.title.replace(/\s+/g, '_')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        console.log('Report exported to Excel');
    }

    generatePDFContent(report) {
        // Mock PDF content generation
        return `PDF Report: ${report.title}\nGenerated: ${report.generatedAt}\n\nSummary:\n${JSON.stringify(report.summary, null, 2)}`;
    }

    generateCSVContent(report) {
        let csv = `Report: ${report.title}\nGenerated: ${report.generatedAt}\n\n`;
        
        // Add summary
        csv += 'Summary\n';
        Object.entries(report.summary).forEach(([key, value]) => {
            csv += `${key},${value}\n`;
        });
        
        csv += '\n';
        
        // Add sections data
        report.sections.forEach(section => {
            csv += `${section.title}\n`;
            if (section.type === 'table' && Array.isArray(section.data)) {
                // Handle table data
                if (section.data.length > 0) {
                    const headers = Object.keys(section.data[0]);
                    csv += headers.join(',') + '\n';
                    section.data.forEach(row => {
                        csv += headers.map(header => row[header]).join(',') + '\n';
                    });
                }
            } else if (typeof section.data === 'object') {
                // Handle chart data
                Object.entries(section.data).forEach(([key, value]) => {
                    csv += `${key},${value}\n`;
                });
            }
            csv += '\n';
        });
        
        return csv;
    }

    generateExcelContent(report) {
        // Mock Excel content - in real implementation, would use a library like SheetJS
        return this.generateCSVContent(report); // Simplified for demo
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Schedule automatic report generation
    scheduleReport(reportType, frequency, recipients) {
        console.log(`Scheduled ${reportType} report with ${frequency} frequency for:`, recipients);
        
        // Mock scheduling - in real implementation, would save to backend
        const schedule = {
            id: Date.now(),
            reportType,
            frequency,
            recipients,
            nextRun: this.calculateNextRun(frequency),
            active: true
        };
        
        // Store in localStorage for demo
        const schedules = JSON.parse(localStorage.getItem('reportSchedules') || '[]');
        schedules.push(schedule);
        localStorage.setItem('reportSchedules', JSON.stringify(schedules));
        
        return schedule;
    }

    calculateNextRun(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            case 'monthly':
                const nextMonth = new Date(now);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                return nextMonth;
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }

    // Get scheduled reports
    getScheduledReports() {
        return JSON.parse(localStorage.getItem('reportSchedules') || '[]');
    }

    // Cancel scheduled report
    cancelScheduledReport(scheduleId) {
        const schedules = this.getScheduledReports();
        const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
        localStorage.setItem('reportSchedules', JSON.stringify(updatedSchedules));
        console.log(`Cancelled scheduled report ${scheduleId}`);
    }

    // Create report dashboard
    createReportDashboard() {
        return `
            <div class="reports-dashboard" style="padding: 2rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                    <div class="report-card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: var(--admin-shadow);">
                        <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900);">
                            <i class="fas fa-users" style="margin-right: 0.5rem; color: var(--admin-primary);"></i>
                            User Analytics
                        </h3>
                        <p style="color: var(--admin-gray-600); margin-bottom: 1.5rem;">
                            Comprehensive user behavior and registration analytics
                        </p>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="adminReports.generateAndShowReport('users')" class="btn btn-primary">
                                Generate Report
                            </button>
                            <button onclick="adminReports.scheduleReportModal('users')" class="btn btn-outline">
                                Schedule
                            </button>
                        </div>
                    </div>

                    <div class="report-card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: var(--admin-shadow);">
                        <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900);">
                            <i class="fas fa-graduation-cap" style="margin-right: 0.5rem; color: var(--admin-success);"></i>
                            Course Performance
                        </h3>
                        <p style="color: var(--admin-gray-600); margin-bottom: 1.5rem;">
                            Course enrollment, completion, and revenue metrics
                        </p>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="adminReports.generateAndShowReport('courses')" class="btn btn-primary">
                                Generate Report
                            </button>
                            <button onclick="adminReports.scheduleReportModal('courses')" class="btn btn-outline">
                                Schedule
                            </button>
                        </div>
                    </div>

                    <div class="report-card" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: var(--admin-shadow);">
                        <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900);">
                            <i class="fas fa-dollar-sign" style="margin-right: 0.5rem; color: var(--admin-warning);"></i>
                            Revenue Analysis
                        </h3>
                        <p style="color: var(--admin-gray-600); margin-bottom: 1.5rem;">
                            Financial performance and revenue trend analysis
                        </p>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="adminReports.generateAndShowReport('revenue')" class="btn btn-primary">
                                Generate Report
                            </button>
                            <button onclick="adminReports.scheduleReportModal('revenue')" class="btn btn-outline">
                                Schedule
                            </button>
                        </div>
                    </div>
                </div>

                <div class="scheduled-reports" style="background: white; border-radius: 8px; padding: 1.5rem; box-shadow: var(--admin-shadow);">
                    <h3 style="margin-bottom: 1rem; color: var(--admin-gray-900);">Scheduled Reports</h3>
                    <div id="scheduled-reports-list">
                        <!-- Scheduled reports will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    async generateAndShowReport(reportType) {
        try {
            let report;
            switch (reportType) {
                case 'users':
                    report = await this.generateUserReport();
                    break;
                case 'courses':
                    report = await this.generateCourseReport();
                    break;
                case 'revenue':
                    report = await this.generateRevenueReport();
                    break;
                default:
                    throw new Error('Unknown report type');
            }

            this.showReportModal(report);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        }
    }

    showReportModal(report) {
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
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; color: var(--admin-gray-900);">${report.title}</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--admin-gray-500);">×</button>
            </div>
            
            <div style="margin-bottom: 2rem; padding: 1rem; background: var(--admin-gray-50); border-radius: 8px;">
                <h3 style="margin-bottom: 1rem;">Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                    ${Object.entries(report.summary).map(([key, value]) => `
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: var(--admin-primary);">${value}</div>
                            <div style="font-size: 0.875rem; color: var(--admin-gray-600);">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom: 2rem;">
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <button onclick="adminReports.exportToPDF(${JSON.stringify(report).replace(/"/g, '&quot;')})" class="btn btn-outline">
                        <i class="fas fa-file-pdf"></i> Export PDF
                    </button>
                    <button onclick="adminReports.exportToCSV(${JSON.stringify(report).replace(/"/g, '&quot;')})" class="btn btn-outline">
                        <i class="fas fa-file-csv"></i> Export CSV
                    </button>
                    <button onclick="adminReports.exportToExcel(${JSON.stringify(report).replace(/"/g, '&quot;')})" class="btn btn-outline">
                        <i class="fas fa-file-excel"></i> Export Excel
                    </button>
                </div>
            </div>

            <div style="text-align: center; color: var(--admin-gray-500); font-size: 0.875rem;">
                Generated on ${report.generatedAt.toLocaleString()}
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

    scheduleReportModal(reportType) {
        // Implementation for scheduling modal
        alert(`Schedule ${this.reportTypes[reportType]} - Modal will be implemented`);
    }
}

// Initialize reports system
document.addEventListener('DOMContentLoaded', function() {
    window.adminReports = new AdminReports();
});