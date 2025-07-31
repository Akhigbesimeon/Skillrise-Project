// Mentorship functionality
let currentUser = null;
let selectedMentorId = null;

// Initialize mentorship page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check authentication (but don't redirect if not logged in)
        const token = localStorage.getItem('accessToken');
        if (token) {
            // Get current user info if logged in
            currentUser = await getCurrentUser();
            if (currentUser) {
                // Show appropriate view based on user type
                showUserTypeView();

                // Load initial data
                if (currentUser.userType === 'freelancer') {
                    loadMyMentorships();
                } else if (currentUser.userType === 'mentor') {
                    loadMentorshipRequests();
                    loadMyMentees();
                }
            }
        }

        // Set up event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Error initializing mentorship page:', error);
        showError('Failed to load mentorship page');
    }
});

// Show appropriate view based on user type
function showUserTypeView() {
    const freelancerView = document.getElementById('freelancer-view');
    const mentorView = document.getElementById('mentor-view');
    const unauthorizedMessage = document.getElementById('unauthorized-message');

    // Handle case where user is not logged in
    if (!currentUser) {
        // For non-logged-in users, we can show a general view or login prompt
        // The static content on the page (hero section, info cards) will still be visible
        return;
    }

    if (currentUser.userType === 'freelancer') {
        if (freelancerView) {
            freelancerView.classList.remove('d-none');
            // Set experience level from profile
            const experienceSelect = document.getElementById('experience-level');
            if (experienceSelect && currentUser.freelancerProfile && currentUser.freelancerProfile.experienceLevel) {
                experienceSelect.value = currentUser.freelancerProfile.experienceLevel;
            }
        }
    } else if (currentUser.userType === 'mentor') {
        if (mentorView) {
            mentorView.classList.remove('d-none');
        }
    } else {
        if (unauthorizedMessage) {
            unauthorizedMessage.classList.remove('d-none');
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    // Mentor search form
    const searchForm = document.getElementById('mentor-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleMentorSearch);
    }

    // Tab change events
    const mentorshipTabs = document.getElementById('mentorshipTabs');
    if (mentorshipTabs) {
        mentorshipTabs.addEventListener('shown.bs.tab', function(event) {
            if (event.target.id === 'my-mentorships-tab') {
                loadMyMentorships();
            }
        });
    }

    const mentorTabs = document.getElementById('mentorTabs');
    if (mentorTabs) {
        mentorTabs.addEventListener('shown.bs.tab', function(event) {
            if (event.target.id === 'requests-tab') {
                loadMentorshipRequests();
            } else if (event.target.id === 'my-mentees-tab') {
                loadMyMentees();
            }
        });
    }
}

// Handle mentor search
async function handleMentorSearch(event) {
    event.preventDefault();
    
    const focusAreas = document.getElementById('focus-areas').value.trim();
    const experienceLevel = document.getElementById('experience-level').value;

    try {
        showLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (focusAreas) {
            params.append('focusAreas', focusAreas);
        }
        params.append('experienceLevel', experienceLevel);

        const response = await fetch(`/api/mentorship/matches?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayMentorResults(data.data);
        } else {
            throw new Error(data.error?.message || 'Failed to find mentors');
        }

    } catch (error) {
        console.error('Error searching for mentors:', error);
        showError('Failed to search for mentors: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Display mentor search results
function displayMentorResults(mentors) {
    const resultsDiv = document.getElementById('mentor-results');
    const mentorList = document.getElementById('mentor-list');
    const noResultsMessage = document.getElementById('no-mentors-message');

    if (mentors.length === 0) {
        resultsDiv.classList.add('d-none');
        noResultsMessage.classList.remove('d-none');
        return;
    }

    noResultsMessage.classList.add('d-none');
    resultsDiv.classList.remove('d-none');

    mentorList.innerHTML = mentors.map(match => {
        const mentor = match.mentor;
        const profile = mentor.mentorProfile;
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="avatar-circle me-3">
                                ${mentor.profileImageUrl ? 
                                    `<img src="${mentor.profileImageUrl}" alt="${mentor.fullName}" class="rounded-circle" width="50" height="50">` :
                                    `<i class="fas fa-user"></i>`
                                }
                            </div>
                            <div>
                                <h6 class="card-title mb-1">${mentor.fullName}</h6>
                                <div class="text-muted small">
                                    <i class="fas fa-star text-warning"></i>
                                    ${profile.rating.toFixed(1)} (${profile.totalMentees} mentees)
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <div class="badge bg-success mb-2">
                                ${match.matchScore}% Match
                            </div>
                            <div class="small text-muted">
                                <i class="fas fa-users me-1"></i>
                                ${match.availableCapacity} spots available
                            </div>
                        </div>

                        <div class="mb-3">
                            <strong>Expertise:</strong>
                            <div class="mt-1">
                                ${profile.expertiseAreas.slice(0, 3).map(area => 
                                    `<span class="badge bg-light text-dark me-1">${area}</span>`
                                ).join('')}
                                ${profile.expertiseAreas.length > 3 ? 
                                    `<span class="badge bg-light text-dark">+${profile.expertiseAreas.length - 3} more</span>` : 
                                    ''
                                }
                            </div>
                        </div>

                        ${mentor.bio ? `
                            <div class="mb-3">
                                <small class="text-muted">${mentor.bio.substring(0, 100)}${mentor.bio.length > 100 ? '...' : ''}</small>
                            </div>
                        ` : ''}

                        <div class="mb-3">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                ${profile.yearsExperience} years experience
                            </small>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary btn-sm w-100" onclick="requestMentorship('${mentor._id}', '${mentor.fullName}')">
                            <i class="fas fa-paper-plane me-2"></i>Request Mentorship
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Request mentorship from a mentor
function requestMentorship(mentorId, mentorName) {
    selectedMentorId = mentorId;
    
    // Pre-fill focus areas from search
    const searchFocusAreas = document.getElementById('focus-areas').value;
    if (searchFocusAreas) {
        document.getElementById('request-focus-areas').value = searchFocusAreas;
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('mentorshipRequestModal'));
    modal.show();
}

// Submit mentorship request
async function submitMentorshipRequest() {
    const focusAreas = document.getElementById('request-focus-areas').value.trim();
    const learningGoals = document.getElementById('learning-goals').value.trim();
    const requestMessage = document.getElementById('request-message').value.trim();

    if (!focusAreas) {
        showError('Please specify focus areas');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('/api/mentorship/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({
                mentorId: selectedMentorId,
                focusAreas: focusAreas.split(',').map(area => area.trim()),
                learningGoals,
                requestMessage
            })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('mentorshipRequestModal'));
            modal.hide();

            // Clear form
            document.getElementById('mentorship-request-form').reset();

            showSuccess('Mentorship request sent successfully!');
            
            // Refresh my mentorships
            loadMyMentorships();

        } else {
            throw new Error(data.error?.message || 'Failed to send mentorship request');
        }

    } catch (error) {
        console.error('Error sending mentorship request:', error);
        showError('Failed to send mentorship request: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Load my mentorships (for freelancers)
async function loadMyMentorships() {
    try {
        const [activeResponse, historyResponse] = await Promise.all([
            fetch('/api/mentorship/active', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            }),
            fetch('/api/mentorship/history', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
        ]);

        const activeData = await activeResponse.json();
        const historyData = await historyResponse.json();

        if (activeData.success) {
            displayActiveMentorships(activeData.data);
        }

        if (historyData.success) {
            displayMentorshipHistory(historyData.data);
        }

    } catch (error) {
        console.error('Error loading mentorships:', error);
        showError('Failed to load mentorships');
    }
}

// Display active mentorships
function displayActiveMentorships(mentorships) {
    const container = document.getElementById('active-mentorships');
    
    if (mentorships.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-users fa-3x mb-3"></i>
                <p>No active mentorships yet. Find a mentor to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = mentorships.map(mentorship => {
        const mentor = mentorship.mentorId;
        const isFreelancer = currentUser.userType === 'freelancer';
        const otherUser = isFreelancer ? mentor : mentorship.menteeId;
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1">
                                ${isFreelancer ? 'Mentor' : 'Mentee'}: ${otherUser.fullName}
                            </h6>
                            <div class="mb-2">
                                <strong>Focus Areas:</strong>
                                ${mentorship.focusAreas.map(area => 
                                    `<span class="badge bg-primary me-1">${area}</span>`
                                ).join('')}
                            </div>
                            <div class="text-muted small">
                                <i class="fas fa-calendar me-1"></i>
                                Started: ${new Date(mentorship.startDate).toLocaleDateString()}
                                <span class="ms-3">
                                    <i class="fas fa-clock me-1"></i>
                                    ${mentorship.sessionCount} sessions
                                </span>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge bg-success mb-2">${mentorship.status}</span>
                            <div>
                                <button class="btn btn-outline-primary btn-sm me-2" onclick="showScheduleModal('${mentorship._id}')">
                                    <i class="fas fa-calendar me-1"></i>Schedule
                                </button>
                                <button class="btn btn-outline-info btn-sm me-2" onclick="viewSessions('${mentorship._id}')">
                                    <i class="fas fa-clock me-1"></i>Sessions
                                </button>
                                <button class="btn btn-outline-secondary btn-sm">
                                    <i class="fas fa-comments me-1"></i>Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Display mentorship history
function displayMentorshipHistory(mentorships) {
    const container = document.getElementById('mentorship-history');
    
    if (mentorships.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-history fa-3x mb-3"></i>
                <p>No mentorship history yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = mentorships.map(mentorship => {
        const isFreelancer = currentUser.userType === 'freelancer';
        const otherUser = isFreelancer ? mentorship.mentorId : mentorship.menteeId;
        const statusClass = {
            'active': 'success',
            'completed': 'info',
            'cancelled': 'secondary',
            'pending': 'warning'
        }[mentorship.status] || 'secondary';
        
        return `
            <div class="card mb-2">
                <div class="card-body py-3">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1">
                                ${isFreelancer ? 'Mentor' : 'Mentee'}: ${otherUser.fullName}
                            </h6>
                            <div class="text-muted small">
                                ${mentorship.focusAreas.slice(0, 2).join(', ')}
                                ${mentorship.focusAreas.length > 2 ? ` +${mentorship.focusAreas.length - 2} more` : ''}
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge bg-${statusClass}">${mentorship.status}</span>
                            <div class="text-muted small mt-1">
                                ${mentorship.sessionCount} sessions
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load mentorship requests (for mentors)
async function loadMentorshipRequests() {
    try {
        const response = await fetch('/api/mentorship/requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayMentorshipRequests(data.data);
            updateRequestsBadge(data.data.length);
        } else {
            throw new Error(data.error?.message || 'Failed to load requests');
        }

    } catch (error) {
        console.error('Error loading mentorship requests:', error);
        showError('Failed to load mentorship requests');
    }
}

// Display mentorship requests
function displayMentorshipRequests(requests) {
    const container = document.getElementById('mentorship-requests');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-inbox fa-3x mb-3"></i>
                <p>No pending mentorship requests.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(request => {
        const mentee = request.menteeId;
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="mb-2">${mentee.fullName}</h6>
                            <div class="mb-2">
                                <strong>Focus Areas:</strong>
                                ${request.focusAreas.map(area => 
                                    `<span class="badge bg-primary me-1">${area}</span>`
                                ).join('')}
                            </div>
                            <div class="mb-2">
                                <strong>Experience Level:</strong>
                                <span class="badge bg-info">${mentee.freelancerProfile.experienceLevel}</span>
                            </div>
                            ${request.learningGoals ? `
                                <div class="mb-2">
                                    <strong>Learning Goals:</strong>
                                    <p class="text-muted small mb-0">${request.learningGoals}</p>
                                </div>
                            ` : ''}
                            ${request.requestMessage ? `
                                <div class="mb-2">
                                    <strong>Message:</strong>
                                    <p class="text-muted small mb-0">${request.requestMessage}</p>
                                </div>
                            ` : ''}
                            <div class="text-muted small">
                                <i class="fas fa-clock me-1"></i>
                                Requested: ${new Date(request.requestedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="d-grid gap-2">
                                <button class="btn btn-success btn-sm" onclick="acceptMentorshipRequest('${request._id}')">
                                    <i class="fas fa-check me-2"></i>Accept
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="declineMentorshipRequest('${request._id}')">
                                    <i class="fas fa-times me-2"></i>Decline
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Accept mentorship request
async function acceptMentorshipRequest(mentorshipId) {
    try {
        showLoading(true);

        const response = await fetch('/api/mentorship/accept', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ mentorshipId })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Mentorship request accepted successfully!');
            loadMentorshipRequests();
            loadMyMentees();
        } else {
            throw new Error(data.error?.message || 'Failed to accept request');
        }

    } catch (error) {
        console.error('Error accepting mentorship request:', error);
        showError('Failed to accept mentorship request: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Decline mentorship request
async function declineMentorshipRequest(mentorshipId) {
    if (!confirm('Are you sure you want to decline this mentorship request?')) {
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('/api/mentorship/decline', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ mentorshipId })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Mentorship request declined');
            loadMentorshipRequests();
        } else {
            throw new Error(data.error?.message || 'Failed to decline request');
        }

    } catch (error) {
        console.error('Error declining mentorship request:', error);
        showError('Failed to decline mentorship request: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Load my mentees (for mentors)
async function loadMyMentees() {
    try {
        const response = await fetch('/api/mentorship/active', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayMyMentees(data.data);
        } else {
            throw new Error(data.error?.message || 'Failed to load mentees');
        }

    } catch (error) {
        console.error('Error loading mentees:', error);
        showError('Failed to load mentees');
    }
}

// Display my mentees
function displayMyMentees(mentorships) {
    const container = document.getElementById('active-mentees');
    
    if (mentorships.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-users fa-3x mb-3"></i>
                <p>No active mentees yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = mentorships.map(mentorship => {
        const mentee = mentorship.menteeId;
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1">${mentee.fullName}</h6>
                            <div class="mb-2">
                                <strong>Focus Areas:</strong>
                                ${mentorship.focusAreas.map(area => 
                                    `<span class="badge bg-primary me-1">${area}</span>`
                                ).join('')}
                            </div>
                            <div class="text-muted small">
                                <i class="fas fa-calendar me-1"></i>
                                Started: ${new Date(mentorship.startDate).toLocaleDateString()}
                                <span class="ms-3">
                                    <i class="fas fa-clock me-1"></i>
                                    ${mentorship.sessionCount} sessions
                                </span>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div>
                                <button class="btn btn-outline-primary btn-sm me-2" onclick="showScheduleModal('${mentorship._id}')">
                                    <i class="fas fa-calendar me-1"></i>Schedule
                                </button>
                                <button class="btn btn-outline-info btn-sm me-2" onclick="viewSessions('${mentorship._id}')">
                                    <i class="fas fa-clock me-1"></i>Sessions
                                </button>
                                <button class="btn btn-outline-secondary btn-sm">
                                    <i class="fas fa-comments me-1"></i>Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update requests badge
function updateRequestsBadge(count) {
    const badge = document.getElementById('requests-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }
}

// Utility functions
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }
}

function showError(message) {
    // Create and show error alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showSuccess(message) {
    // Create and show success alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// Session management functions
function showScheduleModal(mentorshipId) {
    // Set the mentorship ID for scheduling
    document.getElementById('schedule-mentorship-id').value = mentorshipId;
    
    // Set minimum date to today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().slice(0, 16);
    document.getElementById('session-date').min = minDate;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('scheduleSessionModal'));
    modal.show();
}

async function scheduleSession() {
    const mentorshipId = document.getElementById('schedule-mentorship-id').value;
    const scheduledDate = document.getElementById('session-date').value;
    const duration = document.getElementById('session-duration').value;
    const notes = document.getElementById('session-notes').value;

    if (!scheduledDate) {
        showError('Please select a date and time for the session');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('/api/mentorship/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({
                mentorshipId,
                scheduledDate,
                duration: parseInt(duration),
                notes
            })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleSessionModal'));
            modal.hide();

            // Clear form
            document.getElementById('schedule-session-form').reset();

            showSuccess('Session scheduled successfully!');
            
            // Refresh mentorships
            loadMyMentorships();

        } else {
            throw new Error(data.error?.message || 'Failed to schedule session');
        }

    } catch (error) {
        console.error('Error scheduling session:', error);
        showError('Failed to schedule session: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function viewSessions(mentorshipId) {
    try {
        showLoading(true);

        const response = await fetch(`/api/mentorship/sessions/${mentorshipId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displaySessionsModal(data.data);
        } else {
            throw new Error(data.error?.message || 'Failed to load sessions');
        }

    } catch (error) {
        console.error('Error loading sessions:', error);
        showError('Failed to load sessions: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function displaySessionsModal(sessionData) {
    const { mentorship, sessions } = sessionData;
    const modalBody = document.getElementById('sessions-modal-body');
    
    if (sessions.length === 0) {
        modalBody.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-calendar fa-3x mb-3"></i>
                <p>No sessions scheduled yet.</p>
            </div>
        `;
    } else {
        modalBody.innerHTML = sessions.map(session => {
            const sessionDate = new Date(session.scheduledDate);
            const isPast = sessionDate < new Date();
            const statusClass = {
                'scheduled': 'primary',
                'completed': 'success',
                'cancelled': 'secondary'
            }[session.status] || 'secondary';

            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h6 class="mb-1">
                                    <i class="fas fa-calendar me-2"></i>
                                    ${sessionDate.toLocaleDateString()} at ${sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </h6>
                                <div class="mb-2">
                                    <span class="badge bg-${statusClass}">${session.status}</span>
                                    <span class="text-muted ms-2">
                                        <i class="fas fa-clock me-1"></i>
                                        ${session.duration} minutes
                                    </span>
                                </div>
                                ${session.notes ? `
                                    <div class="text-muted small mb-2">
                                        <strong>Notes:</strong> ${session.notes}
                                    </div>
                                ` : ''}
                                ${session.feedback && (session.feedback.mentorFeedback || session.feedback.menteeFeedback) ? `
                                    <div class="mt-2">
                                        <small class="text-muted">
                                            <strong>Feedback:</strong>
                                            ${session.feedback.mentorFeedback || session.feedback.menteeFeedback}
                                        </small>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                ${session.status === 'scheduled' ? `
                                    <div class="btn-group-vertical">
                                        <button class="btn btn-success btn-sm mb-1" onclick="updateSessionStatus('${session._id}', 'completed')">
                                            <i class="fas fa-check me-1"></i>Complete
                                        </button>
                                        <button class="btn btn-outline-danger btn-sm" onclick="updateSessionStatus('${session._id}', 'cancelled')">
                                            <i class="fas fa-times me-1"></i>Cancel
                                        </button>
                                    </div>
                                ` : ''}
                                ${session.status === 'completed' && !session.feedback[currentUser.userType === 'mentor' ? 'mentorFeedback' : 'menteeFeedback'] ? `
                                    <button class="btn btn-outline-primary btn-sm" onclick="showFeedbackModal('${session._id}')">
                                        <i class="fas fa-comment me-1"></i>Add Feedback
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('sessionsModal'));
    modal.show();
}

async function updateSessionStatus(sessionId, status) {
    try {
        showLoading(true);

        const response = await fetch(`/api/mentorship/sessions/${sessionId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(`Session ${status} successfully!`);
            
            // Close sessions modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('sessionsModal'));
            modal.hide();
            
            // Refresh mentorships
            loadMyMentorships();

        } else {
            throw new Error(data.error?.message || 'Failed to update session status');
        }

    } catch (error) {
        console.error('Error updating session status:', error);
        showError('Failed to update session status: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function showFeedbackModal(sessionId) {
    document.getElementById('feedback-session-id').value = sessionId;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('sessionFeedbackModal'));
    modal.show();
}

async function submitSessionFeedback() {
    const sessionId = document.getElementById('feedback-session-id').value;
    const feedback = document.getElementById('session-feedback').value;
    const rating = document.getElementById('session-rating').value;

    try {
        showLoading(true);

        const response = await fetch(`/api/mentorship/sessions/${sessionId}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({
                feedback,
                rating: rating ? parseInt(rating) : null
            })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('sessionFeedbackModal'));
            modal.hide();

            // Clear form
            document.getElementById('session-feedback-form').reset();

            showSuccess('Feedback submitted successfully!');

        } else {
            throw new Error(data.error?.message || 'Failed to submit feedback');
        }

    } catch (error) {
        console.error('Error submitting feedback:', error);
        showError('Failed to submit feedback: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.success ? data.user : null;
        }
        return null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}