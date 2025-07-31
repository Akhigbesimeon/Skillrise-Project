// Client Dashboard JavaScript with Integrated Messages and Profile
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let currentUser = null;
let clientType = null;
let jobPosts = [];
let applications = [];
let activeProjects = [];
let profileData = {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    jobTitle: '',
    timezone: '',
    bio: '',
    skills: [],
    socialLinks: {
        linkedin: '',
        github: '',
        twitter: '',
        website: ''
    },
    avatar: null
};

// Messages state
let conversations = [];
let currentConversation = null;
let messages = [];

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeDashboard();
    setupFormHandlers();
});

// Check if user is authenticated and is a client
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (userType !== 'client') {
        // Redirect to appropriate dashboard based on user type
        switch(userType) {
            case 'freelancer':
                window.location.href = 'freelancer-dashboard.html';
                break;
            case 'mentor':
                window.location.href = 'mentor-dashboard.html';
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
            
            // Load profile data
            loadProfileData();
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
    await loadRecentActivity();
    updateLastUpdated();
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Simulate client stats - these would come from actual API calls
        const stats = {
            activeJobs: 3,
            totalApplications: 28,
            activeProjects: 2,
            totalSpent: 3250.00
        };

        // Update dashboard cards
        document.getElementById('activeJobs').textContent = stats.activeJobs;
        document.getElementById('totalApplications').textContent = stats.totalApplications;
        document.getElementById('activeProjects').textContent = stats.activeProjects;
        document.getElementById('totalSpent').textContent = `$${stats.totalSpent.toFixed(2)}`;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load recent activity
function loadRecentActivity() {
    const activities = [
        {
            icon: 'fas fa-plus-circle text-success',
            text: 'Posted new job: "React Developer Needed"',
            time: '2 hours ago'
        },
        {
            icon: 'fas fa-user-check text-info',
            text: 'Hired freelancer for "Mobile App Design"',
            time: '1 day ago'
        },
        {
            icon: 'fas fa-star text-warning',
            text: 'Left review for completed project',
            time: '3 days ago'
        },
        {
            icon: 'fas fa-credit-card text-success',
            text: 'Payment processed for "Website Development"',
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

// Setup form handlers
function setupFormHandlers() {
    // Job post form handler
    const jobForm = document.getElementById('jobPostForm');
    if (jobForm) {
        jobForm.addEventListener('submit', function(e) {
            e.preventDefault();
            postNewJob();
        });
    }
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
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Add active class to clicked nav link
    const activeLink = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Load section-specific data
    switch (sectionName) {
        case 'messages':
            loadMessages();
            break;
        case 'edit-profile':
            loadProfileData();
            break;
        case 'jobs':
            loadJobPosts();
            break;
        case 'applications':
            loadApplications();
            break;
        case 'projects':
            loadActiveProjects();
            break;
    }
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = `Last updated: ${timeString}`;
    }
}

// Job posting functions
async function postNewJob() {
    const formData = new FormData(document.getElementById('jobPostForm'));
    const jobData = Object.fromEntries(formData);
    
    try {
        // Simulate job posting - would call actual API
        console.log('Posting job:', jobData);
        showMessage('Job posted successfully!', 'success');
        
        // Reset form and redirect to jobs section
        document.getElementById('jobPostForm').reset();
        showSection('jobs');
        
    } catch (error) {
        console.error('Error posting job:', error);
        showMessage('Failed to post job. Please try again.', 'error');
    }
}

async function loadJobPosts() {
    // Simulate loading job posts
    const sampleJobs = [
        {
            id: 1,
            title: 'React Developer Needed',
            category: 'Web Development',
            posted: '2 hours ago',
            description: 'Looking for an experienced React developer to build a modern e-commerce platform...',
            budget: '$2,000 - $5,000',
            type: 'Fixed Price',
            level: 'Expert Level',
            applications: 12
        }
    ];
    
    // Update jobs container would go here
    console.log('Loading job posts:', sampleJobs);
}

async function loadApplications() {
    // Simulate loading applications
    console.log('Loading applications...');
}

async function loadActiveProjects() {
    // Simulate loading active projects
    console.log('Loading active projects...');
}

// MESSAGES FUNCTIONALITY
async function loadMessages() {
    // Simulate loading conversations
    conversations = [
        {
            id: 1,
            name: 'John Smith',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
            lastMessage: 'Thanks for the project details...',
            time: '2h ago',
            unread: false
        },
        {
            id: 2,
            name: 'Sarah Wilson',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9a8d479?w=40&h=40&fit=crop&crop=face',
            lastMessage: 'I\'d love to work on your project...',
            time: '1d ago',
            unread: true
        }
    ];
    
    displayConversations();
}

function displayConversations() {
    const container = document.getElementById('conversationsList');
    let html = '';
    
    conversations.forEach(conv => {
        html += `
            <div class="p-3 border-bottom conversation-item ${conv.unread ? 'bg-light' : ''}" onclick="selectConversation(${conv.id})">
                <div class="d-flex align-items-center">
                    <img src="${conv.avatar}" class="rounded-circle me-3" width="40" height="40" alt="${conv.name}">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0 ${conv.unread ? 'fw-bold' : ''}">${conv.name}</h6>
                            <small class="text-muted">${conv.time}</small>
                        </div>
                        <p class="mb-0 text-muted small">${conv.lastMessage}</p>
                    </div>
                    ${conv.unread ? '<span class="badge bg-primary rounded-pill">1</span>' : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function selectConversation(conversationId) {
    currentConversation = conversations.find(c => c.id === conversationId);
    if (!currentConversation) return;
    
    // Hide empty state, show chat interface
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('chatInterface').style.display = 'flex';
    
    // Update chat header
    document.getElementById('chatAvatar').src = currentConversation.avatar;
    document.getElementById('chatName').textContent = currentConversation.name;
    
    // Load messages for this conversation
    loadConversationMessages(conversationId);
    
    // Update conversation list to show selection
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

function loadConversationMessages(conversationId) {
    // Simulate loading messages
    const sampleMessages = [
        {
            id: 1,
            sender: 'other',
            content: 'Hi! I\'m interested in your React project. I have 5+ years of experience...',
            timestamp: '10:30 AM',
            time: new Date()
        },
        {
            id: 2,
            sender: 'me',
            content: 'Great! Can you share some examples of your previous work?',
            timestamp: '10:35 AM',
            time: new Date()
        }
    ];
    
    displayMessages(sampleMessages);
}

function displayMessages(messagesList) {
    const container = document.getElementById('messagesArea');
    let html = '';
    
    messagesList.forEach(msg => {
        if (msg.sender === 'me') {
            html += `
                <div class="mb-3">
                    <div class="d-flex justify-content-end">
                        <div class="bg-primary text-white p-2 rounded shadow-sm" style="max-width: 70%;">
                            <p class="mb-1">${msg.content}</p>
                            <small class="opacity-75">${msg.timestamp}</small>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="mb-3">
                    <div class="d-flex justify-content-start">
                        <div class="bg-white p-2 rounded shadow-sm" style="max-width: 70%;">
                            <p class="mb-1">${msg.content}</p>
                            <small class="text-muted">${msg.timestamp}</small>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !currentConversation) return;
    
    // Add message to display
    const newMessage = {
        id: Date.now(),
        sender: 'me',
        content: message,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        time: new Date()
    };
    
    // Simulate adding to current conversation
    const currentMessages = []; // Would get current messages
    currentMessages.push(newMessage);
    displayMessages(currentMessages);
    
    // Clear input
    input.value = '';
    
    // Simulate API call to send message
    console.log('Sending message:', message);
}

function searchConversations() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredConversations = conversations.filter(conv => 
        conv.name.toLowerCase().includes(searchTerm) || 
        conv.lastMessage.toLowerCase().includes(searchTerm)
    );
    
    // Update display with filtered conversations
    displayFilteredConversations(filteredConversations);
}

function displayFilteredConversations(filteredConversations) {
    // Similar to displayConversations but with filtered list
    displayConversations(); // Simplified for now
}

function filterConversations(type) {
    // Update active filter button
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter and display conversations based on type
    let filtered = conversations;
    switch(type) {
        case 'unread':
            filtered = conversations.filter(c => c.unread);
            break;
        case 'archived':
            filtered = []; // No archived conversations in demo
            break;
        default:
            filtered = conversations;
    }
    
    displayFilteredConversations(filtered);
}

function showNewMessageModal() {
    // Would show modal to start new conversation
    showMessage('New message feature would open a modal here', 'info');
}

// PROFILE FUNCTIONALITY
async function loadProfileData() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const user = data.user;
            
            // Update profile data
            profileData = {
                fullName: user.fullName || '',
                email: user.email || '',
                phone: user.phone || '',
                location: user.location || '',
                jobTitle: user.jobTitle || user.professionalTitle || '',
                timezone: user.timezone || '',
                bio: user.bio || '',
                skills: user.skills || [],
                socialLinks: {
                    linkedin: user.socialLinks?.linkedin || '',
                    github: user.socialLinks?.github || '',
                    twitter: user.socialLinks?.twitter || '',
                    website: user.socialLinks?.website || ''
                },
                avatar: user.profileImageUrl || null
            };
            
            // Update UI
            updateProfileDisplay();
        } else {
            console.error('Failed to load profile data');
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

function updateProfileDisplay() {
    // Update header
    const displayName = document.querySelector('#edit-profile-section #displayName');
    const displayTitle = document.querySelector('#edit-profile-section #displayTitle');
    const displayLocation = document.querySelector('#edit-profile-section #displayLocation');
    
    if (displayName) displayName.textContent = profileData.fullName || 'User';
    if (displayTitle) displayTitle.textContent = profileData.jobTitle || 'Client';
    if (displayLocation) displayLocation.textContent = profileData.location || 'Location not set';
    
    if (profileData.avatar) {
        const avatarEl = document.querySelector('#edit-profile-section #profileAvatar');
        if (avatarEl) avatarEl.src = profileData.avatar;
    }
    
    // Update form fields
    const fields = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        location: profileData.location,
        jobTitle: profileData.jobTitle,
        timezone: profileData.timezone,
        bio: profileData.bio,
        linkedinUrl: profileData.socialLinks.linkedin,
        githubUrl: profileData.socialLinks.github,
        twitterUrl: profileData.socialLinks.twitter,
        websiteUrl: profileData.socialLinks.website
    };
    
    Object.keys(fields).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = fields[fieldId] || '';
        }
    });
    
    // Update skills
    displaySkills();
}

function displaySkills() {
    const container = document.getElementById('skillsContainer');
    if (!container) return;
    
    if (profileData.skills && profileData.skills.length > 0) {
        container.innerHTML = profileData.skills.map(skill => `
            <span class="badge bg-primary me-2 mb-2 p-2">
                ${skill}
                <button type="button" class="btn-close btn-close-white ms-2" onclick="removeSkill('${skill}')" style="font-size: 0.7em;"></button>
            </span>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-muted">No skills added yet. Add some skills to showcase your interests.</p>';
    }
}

function addSkill() {
    const input = document.getElementById('newSkillInput');
    if (!input) return;
    
    const skill = input.value.trim();
    
    if (skill && !profileData.skills.includes(skill)) {
        profileData.skills.push(skill);
        displaySkills();
        input.value = '';
        updateProfile();
        showSaveIndicator();
    }
}

function handleSkillKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addSkill();
    }
}

function removeSkill(skillToRemove) {
    profileData.skills = profileData.skills.filter(skill => skill !== skillToRemove);
    displaySkills();
    updateProfile();
    showSaveIndicator();
}

function triggerAvatarUpload() {
    document.getElementById('avatarUpload').click();
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('File size must be less than 5MB', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showMessage('Please select a valid image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            profileData.avatar = e.target.result;
            const avatarEl = document.querySelector('#edit-profile-section #profileAvatar');
            if (avatarEl) avatarEl.src = e.target.result;
            updateProfile();
            showSaveIndicator();
        };
        reader.readAsDataURL(file);
    }
}

function updateProfile() {
    // Get form data
    const fields = ['fullName', 'phone', 'location', 'jobTitle', 'timezone', 'bio', 'companyName', 'industry'];
    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            profileData[fieldId] = element.value.trim();
        }
    });
    
    // Update social links
    profileData.socialLinks.linkedin = document.getElementById('linkedinUrl')?.value.trim() || '';
    profileData.socialLinks.github = document.getElementById('githubUrl')?.value.trim() || '';
    profileData.socialLinks.twitter = document.getElementById('twitterUrl')?.value.trim() || '';
    profileData.socialLinks.website = document.getElementById('websiteUrl')?.value.trim() || '';
    
    // Update display
    updateProfileDisplay();
    
    // Auto-save after a delay
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        saveProfile(true);
    }, 2000);
}

async function saveProfile(autoSave = false) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        
        const updateData = {
            fullName: profileData.fullName,
            phone: profileData.phone,
            location: profileData.location,
            jobTitle: profileData.jobTitle,
            timezone: profileData.timezone,
            bio: profileData.bio,
            skills: profileData.skills,
            socialLinks: profileData.socialLinks
        };

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            if (!autoSave) {
                showMessage('Profile updated successfully!', 'success');
            }
            showSaveIndicator();
            
            // Update stored user data
            localStorage.setItem('currentUser', JSON.stringify({
                ...currentUser,
                fullName: profileData.fullName
            }));
            
        } else {
            throw new Error('Failed to save profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        if (!autoSave) {
            showMessage('Failed to save profile. Please try again.', 'error');
        }
    }
}

function resetForm() {
    if (confirm('Are you sure you want to reset all changes? This will discard any unsaved modifications.')) {
        loadProfileData();
        showMessage('Form reset to saved values', 'info');
    }
}

function showSaveIndicator() {
    // Would show a save indicator - simplified for dashboard
    console.log('Changes saved');
}

// UTILITY FUNCTIONS
function showMessage(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userType');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// Auto-save profile data periodically
setInterval(() => {
    // In a real application, this would save profile data to the server
    console.log('Auto-saving dashboard data...');
}, 300000); // Every 5 minutes