// Profile Setup JavaScript
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let currentStep = 1;
let currentUser = null;
let profileData = {
    fullName: '',
    phone: '',
    location: '',
    timezone: '',
    bio: '',
    avatar: null,
    skills: [],
    customSkills: []
};

// Initialize profile setup when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeSkillSelector();
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
            
            // Pre-populate form with existing user data
            document.getElementById('fullName').value = currentUser.fullName || '';
            
            // Check if user has already completed profile setup
            if (currentUser.profileCompleted) {
                // Redirect to dashboard if profile is already complete
                redirectToDashboard();
                return;
            }
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

// Initialize skill selector
function initializeSkillSelector() {
    const skillOptions = document.querySelectorAll('.skill-option');
    skillOptions.forEach(option => {
        option.addEventListener('click', function() {
            this.classList.toggle('selected');
            updateSelectedSkills();
        });
    });
}

// Update selected skills display
function updateSelectedSkills() {
    const selectedOptions = document.querySelectorAll('.skill-option.selected');
    const selectedSkillsContainer = document.getElementById('selectedSkills');
    
    profileData.skills = Array.from(selectedOptions).map(option => option.dataset.skill);
    
    if (profileData.skills.length > 0 || profileData.customSkills.length > 0) {
        const allSkills = [...profileData.skills, ...profileData.customSkills];
        selectedSkillsContainer.innerHTML = `
            <h6>Selected Skills (${allSkills.length}):</h6>
            <div class="d-flex flex-wrap gap-2">
                ${allSkills.map(skill => `
                    <span class="badge bg-primary fs-6 py-2 px-3">
                        ${skill}
                        <button type="button" class="btn-close btn-close-white ms-2" onclick="removeSkill('${skill}')" style="font-size: 0.7em;"></button>
                    </span>
                `).join('')}
            </div>
        `;
    } else {
        selectedSkillsContainer.innerHTML = '';
    }
}

// Add custom skill
function addCustomSkill() {
    const input = document.getElementById('customSkillInput');
    const skill = input.value.trim();
    
    if (skill && !profileData.skills.includes(skill) && !profileData.customSkills.includes(skill)) {
        profileData.customSkills.push(skill);
        input.value = '';
        updateSelectedSkills();
    }
}

// Handle custom skill input keypress
function handleCustomSkillKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCustomSkill();
    }
}

// Remove skill
function removeSkill(skillToRemove) {
    // Remove from custom skills
    profileData.customSkills = profileData.customSkills.filter(skill => skill !== skillToRemove);
    
    // Remove from selected predefined skills
    profileData.skills = profileData.skills.filter(skill => skill !== skillToRemove);
    
    // Update UI
    const skillOption = document.querySelector(`[data-skill="${skillToRemove}"]`);
    if (skillOption) {
        skillOption.classList.remove('selected');
    }
    
    updateSelectedSkills();
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
            
            // Update UI
            const uploadArea = document.querySelector('.avatar-upload-area');
            uploadArea.classList.add('has-image');
            uploadArea.innerHTML = `<img src="${e.target.result}" alt="Profile Picture" class="avatar-preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Skip avatar upload
function skipAvatarUpload() {
    nextStep();
}

// Next step
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 4) {
            currentStep++;
            updateStepDisplay();
        }
    }
}

// Previous step
function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

// Validate current step
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            const fullName = document.getElementById('fullName').value.trim();
            if (!fullName) {
                showMessage('Please enter your full name', 'error');
                return false;
            }
            profileData.fullName = fullName;
            profileData.phone = document.getElementById('phone').value.trim();
            profileData.location = document.getElementById('location').value.trim();
            profileData.timezone = document.getElementById('timezone').value;
            profileData.bio = document.getElementById('bio').value.trim();
            return true;
            
        case 2:
            // Avatar is optional
            return true;
            
        case 3:
            // Skills are optional but recommended
            if (profileData.skills.length === 0 && profileData.customSkills.length === 0) {
                if (!confirm('Are you sure you want to continue without selecting any skills? This will help us recommend better content for you.')) {
                    return false;
                }
            }
            return true;
            
        default:
            return true;
    }
}

// Update step display
function updateStepDisplay() {
    // Hide all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`stepContent${currentStep}`).classList.add('active');
    
    // Update progress indicators
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.innerHTML = '<i class="fas fa-check"></i>';
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.innerHTML = stepNumber;
        } else {
            step.innerHTML = stepNumber;
        }
    });
    
    // Update progress lines
    document.querySelectorAll('.progress-line').forEach((line, index) => {
        if (index < currentStep - 1) {
            line.classList.add('completed');
        } else {
            line.classList.remove('completed');
        }
    });
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const navigationButtons = document.getElementById('navigationButtons');
    
    if (currentStep === 1) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'inline-block';
    }
    
    if (currentStep === 4) {
        navigationButtons.style.display = 'none';
    } else {
        navigationButtons.style.display = 'flex';
        nextBtn.innerHTML = currentStep === 3 ? 'Complete Setup <i class="fas fa-check ms-2"></i>' : 'Next <i class="fas fa-arrow-right ms-2"></i>';
    }
}

// Skip setup
function skipSetup() {
    if (confirm('Are you sure you want to skip the profile setup? You can complete it later in your profile settings.')) {
        redirectToDashboard();
    }
}

// Complete setup
async function completeSetup() {
    try {
        // Save profile data to backend
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
        
        const profileUpdateData = {
            fullName: profileData.fullName,
            phone: profileData.phone,
            location: profileData.location,
            timezone: profileData.timezone,
            bio: profileData.bio,
            skills: [...profileData.skills, ...profileData.customSkills],
            profileCompleted: true
        };

        // If avatar exists, we would normally upload it separately
        // For now, we'll skip avatar upload to the backend

        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileUpdateData)
        });

        if (response.ok) {
            showMessage('Profile setup completed successfully!', 'success');
            setTimeout(() => {
                redirectToDashboard();
            }, 1500);
        } else {
            throw new Error('Failed to save profile');
        }
    } catch (error) {
        console.error('Profile setup error:', error);
        showMessage('Failed to complete profile setup. Please try again.', 'error');
    }
}

// Edit profile
function editProfile() {
    window.location.href = 'profile.html';
}

// Redirect to dashboard based on user type
function redirectToDashboard() {
    const userType = localStorage.getItem('userType') || currentUser?.userType;
    
    const dashboardUrls = {
        'freelancer': 'freelancer-dashboard.html',
        'mentor': 'mentor-dashboard.html',
        'client': 'client-dashboard.html',
        'admin': 'admin.html'
    };
    
    const dashboardUrl = dashboardUrls[userType] || 'client-dashboard.html';
    window.location.href = dashboardUrl;
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