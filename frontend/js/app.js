// SkillRise Platform Frontend Application

class SkillRiseApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentUser = null;
        this.init();
    }

    init() {
        // Initialize the application
        this.checkAuthStatus();
        this.bindEvents();
        this.handleEmailVerification();
        console.log('SkillRise Platform initialized');
    }

    handleEmailVerification() {
        // Check if we're on the email verification page
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token && window.location.pathname.includes('verify-email')) {
            this.verifyEmail(token);
        }
    }

    async verifyEmail(token) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/verify-email?token=${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Email verified successfully! You can now log in to your account.', 'success');
                // Redirect to login after a delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                this.showMessage(result.error.message || 'Email verification failed', 'error');
            }
        } catch (error) {
            console.error('Email verification error:', error);
            this.showMessage('Email verification failed. Please try again.', 'error');
        }
    }

    checkAuthStatus() {
        // Check if user is logged in (support both token formats)
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const userData = localStorage.getItem('currentUser');
        const userType = localStorage.getItem('userType');
        
        if (accessToken && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                // Validate token with backend
                this.validateToken(accessToken);
                
                // Check if we should redirect to dashboard
                if (userType && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
                    this.redirectToDashboard(userType);
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.clearAuthData();
            }
        } else if (accessToken && userType) {
            // Even if no cached user data, validate token and redirect
            this.validateToken(accessToken);
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                this.redirectToDashboard(userType);
            }
        }
    }

    // Redirect to appropriate dashboard based on user type
    redirectToDashboard(userType) {
        // Check if user needs profile setup first (only for brand new users)
        if (this.currentUser && !this.currentUser.profileCompleted && userType !== 'admin' && 
            !window.location.href.includes('profile-setup.html') && 
            localStorage.getItem('isNewUser') === 'true') {
            console.log('Redirecting to profile setup for new user');
            window.location.href = 'profile-setup.html';
            return;
        }

        const dashboardUrls = {
            'freelancer': 'freelancer-dashboard.html',
            'mentor': 'mentor-dashboard.html',
            'client': 'client-dashboard.html',
            'admin': 'admin.html'
        };
        
        const dashboardUrl = dashboardUrls[userType];
        if (dashboardUrl && !window.location.href.includes(dashboardUrl) && 
            !window.location.href.includes('profile-setup.html')) {
            console.log(`Redirecting ${userType} to dashboard: ${dashboardUrl}`);
            window.location.href = dashboardUrl;
        }
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.currentUser = result.user;
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                this.updateUIForLoggedInUser();
            } else if (response.status === 401) {
                // Token expired or invalid, try to refresh
                await this.refreshToken();
            } else {
                this.clearAuthData();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            this.clearAuthData();
        }
    }

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                this.clearAuthData();
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('accessToken', result.tokens.accessToken);
                // Refresh token stays the same
                
                // Retry the original request that failed
                const accessToken = result.tokens.accessToken;
                await this.validateToken(accessToken);
            } else {
                this.clearAuthData();
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuthData();
        }
    }

    clearAuthData() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userType');
        this.currentUser = null;
    }

    bindEvents() {
        // Bind navigation events
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.getAttribute('data-action');
                this.handleAction(action, e);
            }
        });

        // Bind form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('form[data-form]')) {
                e.preventDefault();
                const formType = e.target.getAttribute('data-form');
                this.handleFormSubmission(formType, e.target);
            }
        });

        // Bind real-time form validation
        document.addEventListener('input', (e) => {
            if (e.target.form && e.target.form.getAttribute('data-form') === 'register') {
                this.validateFieldRealTime(e.target);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.form && e.target.form.getAttribute('data-form') === 'register') {
                this.validateFieldRealTime(e.target);
            }
        });
    }

    validateFieldRealTime(field) {
        const form = field.form;
        const formData = new FormData(form);
        
        switch (field.name) {
            case 'fullName':
                const fullName = field.value.trim();
                if (fullName.length >= 2 && fullName.length <= 100) {
                    field.classList.remove('is-invalid');
                    field.classList.add('is-valid');
                } else if (fullName.length > 0) {
                    field.classList.remove('is-valid');
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-valid', 'is-invalid');
                }
                break;
                
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(field.value.trim())) {
                    field.classList.remove('is-invalid');
                    field.classList.add('is-valid');
                } else if (field.value.length > 0) {
                    field.classList.remove('is-valid');
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-valid', 'is-invalid');
                }
                break;
                
            case 'password':
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
                if (passwordRegex.test(field.value)) {
                    field.classList.remove('is-invalid');
                    field.classList.add('is-valid');
                } else if (field.value.length > 0) {
                    field.classList.remove('is-valid');
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-valid', 'is-invalid');
                }
                // Also validate confirm password if it has a value
                const confirmPasswordField = form.querySelector('#confirmPassword');
                if (confirmPasswordField.value) {
                    this.validateFieldRealTime(confirmPasswordField);
                }
                break;
                
            case 'confirmPassword':
                const password = formData.get('password');
                if (field.value && field.value === password) {
                    field.classList.remove('is-invalid');
                    field.classList.add('is-valid');
                } else if (field.value.length > 0) {
                    field.classList.remove('is-valid');
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-valid', 'is-invalid');
                }
                break;
                
            case 'userType':
                if (['freelancer', 'mentor', 'client'].includes(field.value)) {
                    field.classList.remove('is-invalid');
                    field.classList.add('is-valid');
                } else {
                    field.classList.remove('is-valid');
                    field.classList.add('is-invalid');
                }
                break;
        }
    }

    handleAction(action, event) {
        switch (action) {
            case 'login':
                this.showLoginForm();
                break;
            case 'register':
                this.showRegisterForm();
                break;
            case 'logout':
                this.logout();
                break;
            case 'forgot-password':
                this.showForgotPasswordForm();
                break;
            default:
                console.log(`Action ${action} not implemented yet`);
        }
    }

    handleFormSubmission(formType, form) {
        switch (formType) {
            case 'login':
                this.handleLogin(form);
                break;
            case 'register':
                this.handleRegister(form);
                break;
            default:
                console.log(`Form ${formType} not implemented yet`);
        }
    }

    validateRegistrationForm(form) {
        let isValid = true;
        const formData = new FormData(form);
        
        // Clear previous validation states
        form.querySelectorAll('.form-control, .form-select').forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });

        // Validate full name
        const fullName = formData.get('fullName').trim();
        const fullNameField = form.querySelector('#fullName');
        if (!fullName || fullName.length < 2 || fullName.length > 100) {
            fullNameField.classList.add('is-invalid');
            isValid = false;
        } else {
            fullNameField.classList.add('is-valid');
        }

        // Validate email
        const email = formData.get('email').trim();
        const emailField = form.querySelector('#email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            emailField.classList.add('is-invalid');
            isValid = false;
        } else {
            emailField.classList.add('is-valid');
        }

        // Validate password
        const password = formData.get('password');
        const passwordField = form.querySelector('#password');
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!password || !passwordRegex.test(password)) {
            passwordField.classList.add('is-invalid');
            isValid = false;
        } else {
            passwordField.classList.add('is-valid');
        }

        // Validate password confirmation
        const confirmPassword = formData.get('confirmPassword');
        const confirmPasswordField = form.querySelector('#confirmPassword');
        if (!confirmPassword || confirmPassword !== password) {
            confirmPasswordField.classList.add('is-invalid');
            isValid = false;
        } else {
            confirmPasswordField.classList.add('is-valid');
        }

        // Validate user type
        const userType = formData.get('userType');
        const userTypeField = form.querySelector('#userType');
        if (!userType || !['freelancer', 'mentor', 'client'].includes(userType)) {
            userTypeField.classList.add('is-invalid');
            isValid = false;
        } else {
            userTypeField.classList.add('is-valid');
        }

        // Validate terms agreement
        const agreeTerms = form.querySelector('#agreeTerms').checked;
        const agreeTermsField = form.querySelector('#agreeTerms');
        if (!agreeTerms) {
            agreeTermsField.classList.add('is-invalid');
            isValid = false;
        } else {
            agreeTermsField.classList.remove('is-invalid');
        }

        return isValid;
    }

    validateLoginForm(form) {
        let isValid = true;
        const formData = new FormData(form);
        
        // Clear previous validation states
        form.querySelectorAll('.form-control').forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });

        // Validate email
        const email = formData.get('email').trim();
        const emailField = form.querySelector('#loginEmail');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            emailField.classList.add('is-invalid');
            isValid = false;
        } else {
            emailField.classList.add('is-valid');
        }

        // Validate password
        const password = formData.get('password');
        const passwordField = form.querySelector('#loginPassword');
        if (!password || password.length === 0) {
            passwordField.classList.add('is-invalid');
            isValid = false;
        } else {
            passwordField.classList.add('is-valid');
        }

        return isValid;
    }

    async handleLogin(form) {
        // Validate form before submission
        if (!this.validateLoginForm(form)) {
            this.showMessage('Please correct the errors in the form.', 'error');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const spinner = submitButton.querySelector('.spinner-border');
        const icon = submitButton.querySelector('.fas');
        
        // Show loading state
        submitButton.disabled = true;
        spinner.classList.remove('d-none');
        icon.style.display = 'none';
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Signing In...';

        const formData = new FormData(form);
        const loginData = {
            email: formData.get('email').trim(),
            password: formData.get('password')
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                // Store both tokens (support both formats for compatibility)
                localStorage.setItem('accessToken', result.tokens.accessToken);
                localStorage.setItem('token', result.tokens.accessToken); // For dashboard compatibility
                localStorage.setItem('refreshToken', result.tokens.refreshToken);
                
                // Store user data and type
                this.currentUser = result.user;
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                localStorage.setItem('userType', result.user.userType);
                
                this.showMessage('Login successful! Redirecting...', 'success');
                
                // Check if profile setup is needed before redirecting to dashboard (only for new users)
                setTimeout(() => {
                    if (!result.user.profileCompleted && result.user.userType !== 'admin' && 
                        localStorage.getItem('isNewUser') === 'true') {
                        window.location.href = 'profile-setup.html';
                    } else {
                        // Clear new user flag after first successful login
                        localStorage.removeItem('isNewUser');
                        switch (result.user.userType) {
                            case 'admin':
                                window.location.href = 'admin.html';
                                break;
                            case 'freelancer':
                                window.location.href = 'freelancer-dashboard.html';
                                break;
                            case 'mentor':
                                window.location.href = 'mentor-dashboard.html';
                                break;
                            case 'client':
                                window.location.href = 'client-dashboard.html';
                                break;
                            default:
                                window.location.href = 'index.html';
                        }
                    }
                }, 1500);
                
            } else {
                // Handle specific error cases
                if (result.error.code === 'EMAIL_NOT_VERIFIED') {
                    this.showMessage('Please verify your email address before logging in. Check your inbox for the verification link.', 'warning');
                } else if (result.error.code === 'ACCOUNT_DEACTIVATED') {
                    this.showMessage('Your account has been deactivated. Please contact support.', 'error');
                } else {
                    this.showMessage(result.error.message || 'Login failed', 'error');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed. Please check your connection and try again.', 'error');
        } finally {
            // Reset loading state
            submitButton.disabled = false;
            spinner.classList.add('d-none');
            icon.style.display = 'inline';
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> Sign In';
        }
    }

    async handleRegister(form) {
        // Validate form before submission
        if (!this.validateRegistrationForm(form)) {
            this.showMessage('Please correct the errors in the form.', 'error');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const spinner = submitButton.querySelector('.spinner-border');
        
        // Show loading state
        submitButton.disabled = true;
        spinner.classList.remove('d-none');
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Creating Account...';

        const formData = new FormData(form);
        const registerData = {
            email: formData.get('email').trim(),
            password: formData.get('password'),
            fullName: formData.get('fullName').trim(),
            userType: formData.get('userType')
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });

            const result = await response.json();

            if (response.ok) {
                // Mark as new user so profile setup will show on first login
                localStorage.setItem('isNewUser', 'true');
                this.showMessage('Registration successful! Please check your email to verify your account.', 'success');
                form.reset();
                form.querySelectorAll('.form-control, .form-select').forEach(field => {
                    field.classList.remove('is-valid', 'is-invalid');
                });
            } else {
                // Handle specific validation errors from backend
                if (result.error.code === 'VALIDATION_ERROR' && result.error.details) {
                    result.error.details.forEach(error => {
                        if (error.path === 'email') {
                            form.querySelector('#email').classList.add('is-invalid');
                        } else if (error.path === 'password') {
                            form.querySelector('#password').classList.add('is-invalid');
                        }
                    });
                }
                this.showMessage(result.error.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage('Registration failed. Please check your connection and try again.', 'error');
        } finally {
            // Reset loading state
            submitButton.disabled = false;
            spinner.classList.add('d-none');
            submitButton.innerHTML = 'Create Account';
        }
    }



    logout() {
        this.clearAuthData();
        this.updateUIForLoggedOutUser();
        this.showMessage('Logged out successfully', 'success');
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('login.html')) {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
    }

    updateUIForLoggedInUser() {
        // Update navigation and UI for logged in user
        console.log('User logged in:', this.currentUser);
        // Implementation will be added in later tasks
    }

    updateUIForLoggedOutUser() {
        // Update navigation and UI for logged out user
        console.log('User logged out');
        // Implementation will be added in later tasks
    }

    showLoginForm() {
        // Show login modal/form
        console.log('Show login form');
        // Implementation will be added in later tasks
    }

    showRegisterForm() {
        // Redirect to registration page
        window.location.href = 'index.html';
    }

    showForgotPasswordForm() {
        // Show forgot password modal or redirect to forgot password page
        this.showMessage('Forgot password functionality will be implemented in the next task.', 'info');
        // Implementation will be added in task 2.3
    }

    showMessage(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const alertHtml = `
            <div id="${alertId}" class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <strong>${type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info:'}</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.skillRiseApp = new SkillRiseApp();
});