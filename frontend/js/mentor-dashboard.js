// Mentor Dashboard JavaScript
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let currentUser = null;
let mentees = [];
let sessions = [];
let requests = [];

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeDashboard();
});

// Check if user is authenticated and is a mentor
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (userType !== 'mentor') {
        // Redirect to appropriate dashboard based on user type
        switch(userType) {
            case 'freelancer':
                window.location.href = 'freelancer-dashboard.html';
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
    await loadTodaysSchedule();
    await loadRecentNotifications();
    updateLastUpdated();
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Simulate mentor stats - these would come from actual API calls
        const stats = {
            activeMentees: 8,
            upcomingSessions: 5,
            newRequests: 3,
            averageRating: 4.8
        };

        // Update dashboard cards
        document.getElementById('activeMentees').textContent = stats.activeMentees;
        document.getElementById('upcomingSessions').textContent = stats.upcomingSessions;
        document.getElementById('newRequests').textContent = stats.newRequests;
        document.getElementById('averageRating').textContent = stats.averageRating.toFixed(1);

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load today's schedule
function loadTodaysSchedule() {
    // Simulate today's sessions
    const todaysSessions = [
        {
            id: 1,
            title: 'JavaScript Fundamentals',
            mentee: 'John Doe',
            time: '2:00 PM - 3:00 PM',
            status: 'upcoming'
        },
        {
            id: 2,
            title: 'React Development',
            mentee: 'Jane Smith',
            time: '4:00 PM - 5:00 PM',
            status: 'upcoming'
        }
    ];

    const container = document.getElementById('todayScheduleContainer');
    
    if (todaysSessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-calendar-day fa-3x text-muted mb-3"></i>
                <p>No sessions scheduled for today</p>
            </div>
        `;
        return;
    }

    let html = '';
    todaysSessions.forEach(session => {
        html += `
            <div class="session-card p-3 mb-3 border rounded">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${session.title}</h6>
                        <p class="text-muted mb-1">with ${session.mentee}</p>
                        <small class="text-info">
                            <i class="fas fa-clock me-1"></i>${session.time}
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-success me-2" onclick="joinSession(${session.id})">
                            <i class="fas fa-video me-1"></i>Join
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="messageMentee('${session.mentee.toLowerCase().replace(' ', '-')}')">
                            <i class="fas fa-envelope me-1"></i>Message
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Load recent notifications
function loadRecentNotifications() {
    const notifications = [
        {
            icon: 'fas fa-user-plus text-success',
            text: 'New mentorship request from Alex Johnson',
            time: '1 hour ago'
        },
        {
            icon: 'fas fa-star text-warning',
            text: 'Sarah Wilson left a 5-star review',
            time: '3 hours ago'
        },
        {
            icon: 'fas fa-calendar text-info',
            text: 'Session scheduled for tomorrow',
            time: '5 hours ago'
        },
        {
            icon: 'fas fa-dollar-sign text-success',
            text: 'Payment received for completed session',
            time: '1 day ago'
        }
    ];

    const container = document.getElementById('recentNotificationsContainer');
    let html = '';
    
    notifications.forEach(notification => {
        html += `
            <div class="notification-item mb-3">
                <i class="${notification.icon} me-2"></i>
                <small>${notification.text}</small>
                <br><small class="text-muted">${notification.time}</small>
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
        case 'mentees':
            loadMentees();
            break;
        case 'sessions':
            loadSessions();
            break;
        case 'requests':
            loadRequests();
            break;
    }
}

// Load mentees data
function loadMentees() {
    // Simulate mentees data
    mentees = [
        {
            id: 'john-doe',
            name: 'John Doe',
            title: 'JavaScript Developer',
            description: 'Learning React.js and Node.js development',
            status: 'active',
            avatar: 'https://via.placeholder.com/50'
        },
        {
            id: 'jane-smith',
            name: 'Jane Smith',
            title: 'UI/UX Designer',
            description: 'Transitioning to frontend development',
            status: 'active',
            avatar: 'https://via.placeholder.com/50'
        },
        {
            id: 'alex-wilson',
            name: 'Alex Wilson',
            title: 'Backend Developer',
            description: 'Learning microservices architecture',
            status: 'active',
            avatar: 'https://via.placeholder.com/50'
        }
    ];

    displayMentees('all');
}

// Display mentees based on filter
function displayMentees(filter) {
    const container = document.getElementById('menteesContainer');
    let filteredMentees = mentees;

    if (filter !== 'all') {
        filteredMentees = mentees.filter(mentee => mentee.status === filter);
    }

    if (filteredMentees.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <i class="fas fa-users fa-3x text-muted mb-3"></i>
                <p>No mentees found for this filter</p>
            </div>
        `;
        return;
    }

    let html = '';
    filteredMentees.forEach(mentee => {
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card dashboard-card mentee-card">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <img src="${mentee.avatar}" class="rounded-circle me-3" alt="Mentee">
                            <div>
                                <h6 class="mb-0">${mentee.name}</h6>
                                <small class="text-muted">${mentee.title}</small>
                            </div>
                        </div>
                        <p class="card-text small">${mentee.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-${mentee.status === 'active' ? 'success' : 'secondary'}">${mentee.status}</span>
                            <div>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="scheduleMenteeSession('${mentee.id}')">
                                    <i class="fas fa-calendar me-1"></i>Schedule
                                </button>
                                <button class="btn btn-sm btn-outline-success" onclick="messageMentee('${mentee.id}')">
                                    <i class="fas fa-envelope me-1"></i>Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Filter mentees
function filterMentees(filter) {
    // Update active button
    document.querySelectorAll('#mentees-section .btn-group button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    displayMentees(filter);
}

// Load sessions
function loadSessions() {
    sessions = [
        {
            id: 1,
            title: 'JavaScript Fundamentals',
            mentee: 'John Doe',
            datetime: 'Today, 2:00 PM - 3:00 PM',
            status: 'upcoming'
        },
        {
            id: 2,
            title: 'React Development',
            mentee: 'Jane Smith',
            datetime: 'Today, 4:00 PM - 5:00 PM',
            status: 'upcoming'
        },
        {
            id: 3,
            title: 'Node.js Backend',
            mentee: 'Alex Wilson',
            datetime: 'Tomorrow, 10:00 AM - 11:00 AM',
            status: 'scheduled'
        }
    ];

    const container = document.getElementById('sessionsContainer');
    let html = '';

    sessions.forEach(session => {
        const statusColor = session.status === 'upcoming' ? 'warning' : 'info';
        html += `
            <div class="session-card p-3 mb-3 border rounded">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <h6 class="mb-1">${session.title}</h6>
                        <p class="text-muted mb-1">with ${session.mentee}</p>
                        <small class="text-info">
                            <i class="fas fa-calendar me-1"></i>${session.datetime}
                        </small>
                    </div>
                    <div class="col-md-3">
                        <span class="badge bg-${statusColor}">${session.status}</span>
                    </div>
                    <div class="col-md-3 text-end">
                        ${session.status === 'upcoming' ? 
                            `<button class="btn btn-sm btn-success me-2" onclick="joinSession(${session.id})">
                                <i class="fas fa-video me-1"></i>Join
                            </button>` : 
                            `<button class="btn btn-sm btn-outline-primary me-2" onclick="editSession(${session.id})">
                                <i class="fas fa-edit me-1"></i>Edit
                            </button>`
                        }
                        <button class="btn btn-sm btn-outline-danger" onclick="cancelSession(${session.id})">
                            <i class="fas fa-times me-1"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Load mentorship requests
function loadRequests() {
    requests = [
        {
            id: 'alex-johnson',
            name: 'Alex Johnson',
            description: 'Junior Developer looking for React mentorship',
            requestTime: '2 hours ago',
            skills: ['React', 'JavaScript', 'HTML/CSS']
        },
        {
            id: 'maria-garcia',
            name: 'Maria Garcia',
            description: 'Career changer seeking guidance in web development',
            requestTime: '5 hours ago',
            skills: ['Beginner', 'Career Change', 'Motivation']
        }
    ];

    const container = document.getElementById('requestsContainer');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p>No new mentorship requests</p>
            </div>
        `;
        return;
    }

    let html = '';
    requests.forEach(request => {
        html += `
            <div class="request-card p-3 mb-3 border rounded">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${request.name}</h6>
                        <p class="text-muted mb-2">${request.description}</p>
                        <div class="mb-2">
                            ${request.skills.map(skill => `<span class="badge bg-light text-dark me-1">${skill}</span>`).join('')}
                        </div>
                        <small class="text-info">Requested ${request.requestTime}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-success me-2" onclick="acceptRequest('${request.id}')">
                            <i class="fas fa-check me-1"></i>Accept
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="declineRequest('${request.id}')">
                            <i class="fas fa-times me-1"></i>Decline
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Action functions
function joinSession(sessionId) {
    alert(`Joining session ${sessionId}. Video call functionality would be implemented here.`);
}

function scheduleMenteeSession(menteeId) {
    alert(`Opening scheduling interface for mentee: ${menteeId}`);
}

function messageMentee(menteeId) {
    // Redirect to messages with mentee pre-selected
    window.location.href = `messages-new.html?mentee=${menteeId}`;
}

function scheduleNewSession() {
    alert('Opening new session scheduling interface');
}

function acceptRequest(requestId) {
    if (confirm('Accept this mentorship request?')) {
        // Remove request from list
        requests = requests.filter(r => r.id !== requestId);
        loadRequests();
        
        // Update stats
        const newRequestsElement = document.getElementById('newRequests');
        const currentCount = parseInt(newRequestsElement.textContent);
        newRequestsElement.textContent = Math.max(0, currentCount - 1);
        
        alert('Mentorship request accepted!');
    }
}

function declineRequest(requestId) {
    if (confirm('Decline this mentorship request?')) {
        // Remove request from list
        requests = requests.filter(r => r.id !== requestId);
        loadRequests();
        
        // Update stats
        const newRequestsElement = document.getElementById('newRequests');
        const currentCount = parseInt(newRequestsElement.textContent);
        newRequestsElement.textContent = Math.max(0, currentCount - 1);
        
        alert('Mentorship request declined.');
    }
}

function cancelSession(sessionId) {
    if (confirm('Cancel this session?')) {
        sessions = sessions.filter(s => s.id !== sessionId);
        loadSessions();
        alert('Session cancelled.');
    }
}

function editSession(sessionId) {
    alert(`Opening edit interface for session ${sessionId}`);
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
        console.log(`Setting ${event.target.id} changed to ${event.target.checked}`);
    }
});