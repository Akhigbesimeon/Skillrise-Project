// Password Reset JavaScript
class PasswordResetManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.resetToken = null;
        this.init();
    }

    init() {
        // Check if we have a reset token in URL
        const urlParams = new URLSearchParams(window.location.search);
        this.resetToken = urlParams.get('token');

        if (this.resetToken) {
            // Show password reset confirmation form
            this.showConfirmationForm();
        } else {
            // Show password reset request form
            this.showRequestForm();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Password reset request form
        const resetForm = document.getElementById('resetPasswordForm');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handleResetRequest(e));
        }

        // Password reset confirmation form
        const confirmForm = document.getElementById('confirmResetForm');
        if (confirmForm) {
            confirmForm.addEventListener('submit', (e) => this.handleResetConfirmation(e));
        }

        // Password confirmation validation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        }

        const newPasswordInput = document.getElementById('newPassword');
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => this.validatePasswordMatch());
        }
    }

    showRequestForm() {
        document.getElementById('resetPasswordForm').classList.remove('d-none');
        document.getElementById('confirmResetForm').classList.add('d-none');
    }

    showConfirmationForm() {
        document.getElementById('resetPasswordForm').classList.add('d-none');
        document.getElementById('confirmResetForm').classList.remove('d-none');
        
        // Update page title and description
        document.querySelector('h2').textContent = 'Set New Password';
        document.querySelector('.text-muted').textContent = 'Enter your new password below.';
    }

    async handleResetRequest(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get('email');

        // Validate form
        if (!form.checkValidity()) {
            event.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        // Show loading state
        this.setLoadingState('resetBtn', true);
        this.clearAlerts();

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                this.showAlert('success', data.message);
                form.reset();
                form.classList.remove('was-validated');
            } else {
                this.showAlert('danger', data.error?.message || 'Failed to send reset email');
            }
        } catch (error) {
            console.error('Reset request error:', error);
            this.showAlert('danger', 'Network error. Please check your connection and try again.');
        } finally {
            this.setLoadingState('resetBtn', false);
        }
    }

    async handleResetConfirmation(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validate form
        if (!form.checkValidity() || !this.validatePasswordMatch()) {
            event.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        // Show loading state
        this.setLoadingState('confirmBtn', true);
        this.clearAlerts();

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/reset-password/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    token: this.resetToken,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showAlert('success', data.message);
                
                // Redirect to login after successful reset
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                this.showAlert('danger', data.error?.message || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Reset confirmation error:', error);
            this.showAlert('danger', 'Network error. Please check your connection and try again.');
        } finally {
            this.setLoadingState('confirmBtn', false);
        }
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (!newPassword || !confirmPassword) return true;

        const password = newPassword.value;
        const confirm = confirmPassword.value;

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        const isPasswordValid = passwordRegex.test(password);
        
        if (password && !isPasswordValid) {
            newPassword.setCustomValidity('Password must be at least 6 characters long and contain uppercase, lowercase, and number');
            newPassword.classList.add('is-invalid');
        } else {
            newPassword.setCustomValidity('');
            newPassword.classList.remove('is-invalid');
        }

        // Validate password match
        if (confirm && password !== confirm) {
            confirmPassword.setCustomValidity('Passwords must match');
            confirmPassword.classList.add('is-invalid');
            return false;
        } else {
            confirmPassword.setCustomValidity('');
            confirmPassword.classList.remove('is-invalid');
            return true;
        }
    }

    setLoadingState(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        const spinner = button.querySelector('.spinner-border');
        
        if (isLoading) {
            button.disabled = true;
            spinner.classList.remove('d-none');
        } else {
            button.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    showAlert(type, message) {
        const alertContainer = document.getElementById('alertContainer');
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alertHtml;
    }

    clearAlerts() {
        const alertContainer = document.getElementById('alertContainer');
        alertContainer.innerHTML = '';
    }
}

// Initialize password reset manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PasswordResetManager();
});