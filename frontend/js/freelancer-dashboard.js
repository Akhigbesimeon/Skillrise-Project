// Freelancer Dashboard JavaScript
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let currentUser = null;
let userCourses = [];
let userProgress = {};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeDashboard();
});

// Check if user is authenticated and is a freelancer
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (userType !== 'freelancer') {
        // Redirect to appropriate dashboard based on user type
        switch(userType) {
            case 'mentor':
                window.location.href = 'mentor-dashboard.html';
                break;
            case 'client':
                window.location.href = 'client-dashboard.html';
                break;
            case 'admin':
                window.location.href = 'admin.html';
                break;
            default:
                window.location.href = 'login.html';
        }
        return;
    }

    try {
        // Verify token and get user data
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('userName').textContent = currentUser.fullName;
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        window.location.href = 'login.html';
    }
}

// Initialize dashboard data
async function initializeDashboard() {
    await loadDashboardStats();
    await loadUserCourses();
    await loadRecentActivity();
    updateLastUpdated();
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        
        // Simulate stats for now - these would come from actual API calls
        const stats = {
            coursesInProgress: 3,
            coursesCompleted: 2,
            totalEarnings: 1250.00,
            certificatesEarned: 2
        };

        // Update dashboard cards
        document.getElementById('coursesInProgress').textContent = stats.coursesInProgress;
        document.getElementById('coursesCompleted').textContent = stats.coursesCompleted;
        document.getElementById('totalEarnings').textContent = `$${stats.totalEarnings.toFixed(2)}`;
        document.getElementById('certificatesEarned').textContent = stats.certificatesEarned;

        // Update badge counts
        document.getElementById('inProgressCount').textContent = stats.coursesInProgress;
        document.getElementById('completedCount').textContent = stats.coursesCompleted;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load user's courses
async function loadUserCourses() {
    try {
        const token = localStorage.getItem('token');
        
        // Get all courses first (since we don't have user enrollment API yet)
        const response = await fetch(`${API_BASE_URL}/courses?limit=5`);
        const data = await response.json();
        
        if (data.courses) {
            userCourses = data.courses;
            displayCourseProgress();
            displayInProgressCourses();
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        document.getElementById('courseProgressContainer').innerHTML = 
            '<div class="alert alert-danger">Failed to load courses. Please try again.</div>';
    }
}

// Display course progress in overview
function displayCourseProgress() {
    const container = document.getElementById('courseProgressContainer');
    
    if (userCourses.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-book-open fa-3x text-muted mb-3"></i>
                <p>No courses enrolled yet.</p>
                <a href="courses.html" class="btn btn-primary">Browse Courses</a>
            </div>
        `;
        return;
    }

    let html = '';
    userCourses.slice(0, 3).forEach((course, index) => {
        const progress = Math.floor(Math.random() * 100); // Simulate progress
        html += `
            <div class="course-card mb-3 p-3 border rounded">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">${course.title}</h6>
                    <span class="badge bg-${course.difficultyLevel === 'beginner' ? 'success' : 
                                            course.difficultyLevel === 'intermediate' ? 'warning' : 'danger'}">
                        ${course.difficultyLevel}
                    </span>
                </div>
                <div class="progress mb-2" style="height: 8px;">
                    <div class="progress-bar" role="progressbar" style="width: ${progress}%" 
                         aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${progress}% complete</small>
                    <button class="btn btn-sm btn-outline-primary" onclick="continueCourse('${course._id}')">
                        Continue
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Display in-progress courses
function displayInProgressCourses() {
    const container = document.getElementById('inProgressCoursesContainer');
    
    if (userCourses.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-book-open fa-3x text-muted mb-3"></i>
                <p>No courses in progress.</p>
                <a href="courses.html" class="btn btn-primary">Browse Courses</a>
            </div>
        `;
        return;
    }

    let html = '<div class="row">';
    userCourses.forEach(course => {
        const progress = Math.floor(Math.random() * 100);
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card dashboard-card h-100">
                    <img src="${course.thumbnailUrl || 'https://via.placeholder.com/300x200'}" 
                         class="card-img-top" alt="${course.title}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${course.title}</h5>
                        <p class="card-text text-muted small flex-grow-1">${course.description.substring(0, 100)}...</p>
                        <div class="progress mb-3" style="height: 8px;">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${progress}% complete</small>
                            <button class="btn btn-primary btn-sm" onclick="continueCourse('${course._id}')">
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

// Load recent activity (simulated for now)
function loadRecentActivity() {
    const activities = [
        {
            icon: 'fas fa-play-circle text-success',
            text: 'Started JavaScript Fundamentals',
            time: '2 hours ago'
        },
        {
            icon: 'fas fa-certificate text-warning',
            text: 'Earned certificate in HTML/CSS',
            time: '1 day ago'
        },
        {
            icon: 'fas fa-handshake text-info',
            text: 'New mentor session scheduled',
            time: '3 days ago'
        },
        {
            icon: 'fas fa-briefcase text-primary',
            text: 'Applied to React Developer position',
            time: '1 week ago'
        }
    ];

    const container = document.getElementById('recentActivityContainer');
    let html = '';
    
    activities.forEach(activity => {
        html += `
            <div class="activity-item mb-3">
                <i class="${activity.icon} me-2"></i>
                <small>${activity.text}</small>
                <br><small class="text-muted">${activity.time}</small>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).style.display = 'block';
    
    // Add active class to clicked nav link
    event.target.classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'courses':
            loadUserCourses();
            break;
        case 'certificates':
            loadCertificates();
            break;
        case 'earnings':
            loadEarningsData();
            break;
    }
}

// Continue course function
function continueCourse(courseId) {
    // Store course ID and redirect to course player
    localStorage.setItem('currentCourse', courseId);
    window.location.href = `course-player.html?id=${courseId}`;
}

// Load certificates
function loadCertificates() {
    const container = document.getElementById('certificatesContainer');
    
    // Simulate certificate data
    const certificates = [
        {
            title: 'HTML & CSS Fundamentals',
            issueDate: '2024-01-15',
            certificateId: 'SR-001-2024'
        },
        {
            title: 'JavaScript Basics',
            issueDate: '2024-02-20',
            certificateId: 'SR-002-2024'
        }
    ];

    if (certificates.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-certificate fa-3x text-muted mb-3"></i>
                <p>Complete courses to earn certificates!</p>
            </div>
        `;
        return;
    }

    let html = '<div class="row">';
    certificates.forEach(cert => {
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card dashboard-card">
                    <div class="card-body text-center">
                        <i class="fas fa-certificate fa-3x text-warning mb-3"></i>
                        <h5 class="card-title">${cert.title}</h5>
                        <p class="text-muted">Issued: ${new Date(cert.issueDate).toLocaleDateString()}</p>
                        <p class="small text-muted">ID: ${cert.certificateId}</p>
                        <button class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-download me-1"></i>Download
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

// Load earnings data
function loadEarningsData() {
    // This would typically load from an API
    console.log('Loading earnings data...');
}

// Portfolio upload function
function uploadPortfolio() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.zip';
    input.multiple = true;
    
    input.onchange = function(event) {
        const files = event.target.files;
        if (files.length > 0) {
            // Simulate upload process
            alert(`Selected ${files.length} file(s) for upload. Portfolio upload functionality would be implemented here.`);
        }
    };
    
    input.click();
}

// Update last updated timestamp
function updateLastUpdated() {
    document.getElementById('lastUpdate').textContent = 
        `Last updated: ${new Date().toLocaleTimeString()}`;
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// Refresh dashboard data every 5 minutes
setInterval(() => {
    loadDashboardStats();
    updateLastUpdated();
}, 300000);

// Auto-save settings
document.addEventListener('change', function(event) {
    if (event.target.type === 'checkbox' && event.target.closest('#settings-section')) {
        // Simulate saving settings
        console.log(`Setting ${event.target.id} changed to ${event.target.checked}`);
    }
});