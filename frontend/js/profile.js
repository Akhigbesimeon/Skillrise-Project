// New Profile Page JavaScript
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let currentUser = null;
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

// Initialize profile when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
});

// Check authentication
async function checkAuthentication() {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/validate`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            
            // Update navigation
            document.getElementById('userName').textContent = currentUser.fullName;
            updateDashboardLink();
            
            // Load profile data
            await loadProfileData();
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userType');
        window.location.href = 'login.html';
    }
}

// Update dashboard link based on user type
function updateDashboardLink() {
    const dashboardLink = document.getElementById('dashboardLink');
    const userType = localStorage.getItem('userType') || currentUser?.userType;
    
    const dashboardUrls = {
        'freelancer': 'freelancer-dashboard.html',
        'mentor': 'mentor-dashboard.html',
        'client': 'client-dashboard.html',
        'admin': 'admin.html'
    };
    
    const dashboardUrl = dashboardUrls[userType] || 'client-dashboard.html';
    dashboardLink.href = dashboardUrl;
}

// Load profile data from API
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

// Update profile display
function updateProfileDisplay() {
    // Update header
    document.getElementById('displayName').textContent = profileData.fullName || 'User';
    document.getElementById('displayTitle').textContent = profileData.jobTitle || 'SkillRise Member';
    document.getElementById('displayLocation').textContent = profileData.location || 'Location not set';
    
    if (profileData.avatar) {
        document.getElementById('profileAvatar').src = profileData.avatar;
    }
    
    // Update form fields
    document.getElementById('fullName').value = profileData.fullName;
    document.getElementById('email').value = profileData.email;
    document.getElementById('phone').value = profileData.phone;
    document.getElementById('location').value = profileData.location;
    document.getElementById('jobTitle').value = profileData.jobTitle;
    document.getElementById('timezone').value = profileData.timezone;
    document.getElementById('bio').value = profileData.bio;
    
    // Update social links
    document.getElementById('linkedinUrl').value = profileData.socialLinks.linkedin;
    document.getElementById('githubUrl').value = profileData.socialLinks.github;
    document.getElementById('twitterUrl').value = profileData.socialLinks.twitter;
    document.getElementById('websiteUrl').value = profileData.socialLinks.website;
    
    // Update skills
    displaySkills();
}

// Display skills
function displaySkills() {
    const container = document.getElementById('skillsContainer');
    
    if (profileData.skills && profileData.skills.length > 0) {
        container.innerHTML = profileData.skills.map(skill => `
            <span class="skill-tag">
                ${skill}
                <button type="button" class="remove-skill" onclick="removeSkill('${skill}')">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-muted">No skills added yet. Add some skills to showcase your expertise.</p>';
    }
}

// Add new skill
function addSkill() {
    const input = document.getElementById('newSkillInput');
    const skill = input.value.trim();
    
    if (skill && !profileData.skills.includes(skill)) {
        profileData.skills.push(skill);
        displaySkills();
        input.value = '';
        updateProfile();
        showSaveIndicator();
    }
}

// Handle skill input keypress
function handleSkillKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addSkill();
    }
}

// Remove skill
function removeSkill(skillToRemove) {
    profileData.skills = profileData.skills.filter(skill => skill !== skillToRemove);
    displaySkills();
    updateProfile();
    showSaveIndicator();
}

// Trigger avatar upload
function triggerAvatarUpload() {
    document.getElementById('avatarUpload').click();
}

// Handle avatar upload
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
            document.getElementById('profileAvatar').src = e.target.result;
            updateProfile();
            showSaveIndicator();
        };
        reader.readAsDataURL(file);
    }
}

// Update profile data from form
function updateProfile() {
    profileData.fullName = document.getElementById('fullName').value.trim();
    profileData.phone = document.getElementById('phone').value.trim();
    profileData.location = document.getElementById('location').value.trim();
    profileData.jobTitle = document.getElementById('jobTitle').value.trim();
    profileData.timezone = document.getElementById('timezone').value;
    profileData.bio = document.getElementById('bio').value.trim();
    
    profileData.socialLinks.linkedin = document.getElementById('linkedinUrl').value.trim();
    profileData.socialLinks.github = document.getElementById('githubUrl').value.trim();
    profileData.socialLinks.twitter = document.getElementById('twitterUrl').value.trim();
    profileData.socialLinks.website = document.getElementById('websiteUrl').value.trim();
    
    // Update display
    document.getElementById('displayName').textContent = profileData.fullName || 'User';
    document.getElementById('displayTitle').textContent = profileData.jobTitle || 'SkillRise Member';
    document.getElementById('displayLocation').textContent = profileData.location || 'Location not set';
    
    // Auto-save after a delay
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        saveProfile(true);
    }, 2000);
}

// Save profile to backend
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

// Reset form to original values
function resetForm() {
    if (confirm('Are you sure you want to reset all changes? This will discard any unsaved modifications.')) {
        loadProfileData();
        showMessage('Form reset to saved values', 'info');
    }
}

// Show save indicator
function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    indicator.classList.add('show');
    
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// Show message
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

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userType');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}