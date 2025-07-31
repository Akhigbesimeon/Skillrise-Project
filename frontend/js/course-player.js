class CoursePlayer {
    constructor() {
        this.courseId = null;
        this.course = null;
        this.userProgress = null;
        this.currentModuleIndex = 0;
        this.currentModule = null;
        this.assessmentData = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.init();
    }

    async init() {
        // Get course ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.courseId = urlParams.get('id');

        if (!this.courseId) {
            this.showError('No course ID provided');
            return;
        }

        // Check authentication
        const token = localStorage.getItem('accessToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Load user profile info for navbar
        await this.loadUserProfile();
        
        this.setupEventListeners();
        await this.loadCourse();
        
        // Add logout functionality
        window.logout = () => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = 'login.html';
        };
    }

    async loadUserProfile() {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                const userName = document.getElementById('userName');
                if (userName && userData.user) {
                    userName.textContent = userData.user.fullName || userData.user.email || 'Student';
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    setupEventListeners() {
        // Navigation (now handled by link in sidebar)
        // No need for back-to-courses button listener

        // Module actions
        document.getElementById('mark-complete').addEventListener('click', () => {
            this.markModuleComplete();
        });

        document.getElementById('take-assessment').addEventListener('click', () => {
            this.startAssessment();
        });

        // Assessment navigation
        document.getElementById('prev-question').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('next-question').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('submit-assessment').addEventListener('click', () => {
            this.submitAssessment();
        });

        // Assessment results actions
        document.getElementById('continue-learning').addEventListener('click', () => {
            this.goToNextModule();
        });

        document.getElementById('retake-assessment').addEventListener('click', () => {
            this.retakeAssessment();
        });

        document.getElementById('back-to-module').addEventListener('click', () => {
            this.showModuleContent();
        });
    }

    async loadCourse() {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/courses/${this.courseId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load course');
            }

            const data = await response.json();
            this.course = data.course;
            this.userProgress = data.userProgress;

            if (!this.userProgress) {
                this.showError('You are not enrolled in this course');
                return;
            }

            this.renderCourse();
            this.loadModule(0); // Load first module by default
        } catch (error) {
            console.error('Error loading course:', error);
            this.showError('Failed to load course: ' + error.message);
        }
    }

    renderCourse() {
        // Update course header
        document.getElementById('course-title').textContent = this.course.title;
        this.updateOverallProgress();

        // Render module list
        this.renderModuleList();
    }

    renderModuleList() {
        const moduleList = document.getElementById('module-list');
        moduleList.innerHTML = '';

        this.course.modules.forEach((module, index) => {
            const moduleProgress = this.userProgress.moduleProgress.find(
                mp => mp.moduleId === module.moduleId
            );

            const moduleItem = document.createElement('div');
            const status = moduleProgress?.status || 'not_started';
            const isUnlocked = this.isModuleUnlocked(index);
            
            moduleItem.className = `module-item ${status} ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            // Calculate module progress percentage
            const moduleProgressPercent = this.getModuleProgressPercent(moduleProgress);
            
            moduleItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        <div class="badge ${this.getStatusBadgeClass(status)}">
                            ${index + 1}
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${module.title}</h6>
                        <div class="d-flex align-items-center">
                            <div class="progress me-2" style="width: 80px; height: 4px;">
                                <div class="progress-bar" style="width: ${moduleProgressPercent}%"></div>
                            </div>
                            <small class="text-muted">${this.formatStatus(status)}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        ${this.getStatusIcon(status)}
                        ${!isUnlocked ? '<i class="fas fa-lock text-muted ms-2"></i>' : ''}
                    </div>
                </div>
            `;

            // Add click handler if module is unlocked
            if (isUnlocked) {
                moduleItem.addEventListener('click', () => {
                    this.loadModule(index);
                });
                moduleItem.style.cursor = 'pointer';
            } else {
                moduleItem.style.cursor = 'not-allowed';
            }

            moduleList.appendChild(moduleItem);
        });
    }

    isModuleUnlocked(moduleIndex) {
        // First module is always unlocked
        if (moduleIndex === 0) return true;

        // Check if previous module is completed
        const previousModule = this.course.modules[moduleIndex - 1];
        const previousProgress = this.userProgress.moduleProgress.find(
            mp => mp.moduleId === previousModule.moduleId
        );

        return previousProgress?.status === 'completed';
    }

    getStatusIcon(status) {
        switch (status) {
            case 'completed':
                return '<i class="fas fa-check-circle text-success"></i>';
            case 'in_progress':
                return '<i class="fas fa-play-circle text-primary"></i>';
            case 'not_started':
            default:
                return '<i class="far fa-circle text-muted"></i>';
        }
    }

    getStatusBadgeClass(status) {
        switch (status) {
            case 'completed':
                return 'bg-success';
            case 'in_progress':
                return 'bg-primary';
            case 'not_started':
            default:
                return 'bg-secondary';
        }
    }

    getModuleProgressPercent(moduleProgress) {
        if (!moduleProgress) return 0;
        switch (moduleProgress.status) {
            case 'completed':
                return 100;
            case 'in_progress':
                return 50;
            case 'not_started':
            default:
                return 0;
        }
    }

    formatStatus(status) {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'in_progress':
                return 'In Progress';
            case 'not_started':
            default:
                return 'Not Started';
        }
    }

    async loadModule(moduleIndex) {
        if (!this.isModuleUnlocked(moduleIndex)) {
            this.showErrorToast('This module is locked. Complete the previous module first.');
            return;
        }

        this.currentModuleIndex = moduleIndex;
        this.currentModule = this.course.modules[moduleIndex];

        // Update active module in sidebar
        document.querySelectorAll('.module-item').forEach((item, index) => {
            item.classList.toggle('active', index === moduleIndex);
        });

        // Mark module as in progress if not started
        await this.updateModuleStatus('in_progress');

        this.showModuleContent();
    }

    showModuleContent() {
        // Hide other content areas
        document.getElementById('loading').style.display = 'none';
        document.getElementById('assessment-content').style.display = 'none';
        document.getElementById('assessment-results').style.display = 'none';
        
        // Show module content
        const moduleContent = document.getElementById('module-content');
        moduleContent.style.display = 'block';

        // Update module header
        document.getElementById('module-title').textContent = this.currentModule.title;
        document.getElementById('module-number').textContent = `Module ${this.currentModuleIndex + 1}`;
        
        const moduleProgress = this.userProgress.moduleProgress.find(
            mp => mp.moduleId === this.currentModule.moduleId
        );
        const status = moduleProgress?.status || 'not_started';
        const statusBadge = document.getElementById('module-status');
        statusBadge.textContent = this.formatStatus(status);
        statusBadge.className = `badge ${this.getStatusBadgeClass(status)}`;

        // Update module content
        document.getElementById('module-description').textContent = this.currentModule.description;

        // Handle video content
        const videoContainer = document.getElementById('video-container');
        const moduleVideo = document.getElementById('module-video');
        if (this.currentModule.videoUrl) {
            moduleVideo.src = this.currentModule.videoUrl;
            videoContainer.style.display = 'block';
        } else {
            videoContainer.style.display = 'none';
        }

        // Handle text content
        const textContent = document.getElementById('text-content');
        if (this.currentModule.content) {
            textContent.innerHTML = this.currentModule.content;
        } else {
            textContent.innerHTML = '';
        }

        // Handle resources
        const resourcesSection = document.getElementById('resources-section');
        const resourcesList = document.getElementById('resources-list');
        if (this.currentModule.resources && this.currentModule.resources.length > 0) {
            resourcesList.innerHTML = this.currentModule.resources.map(resource => 
                `<li class="mb-2">
                    <a href="${resource}" target="_blank" class="text-decoration-none">
                        <i class="fas fa-external-link-alt me-2"></i>${resource}
                    </a>
                </li>`
            ).join('');
            resourcesSection.style.display = 'block';
        } else {
            resourcesSection.style.display = 'none';
        }

        // Show appropriate action buttons
        const markCompleteBtn = document.getElementById('mark-complete');
        const takeAssessmentBtn = document.getElementById('take-assessment');
        
        const isCompleted = moduleProgress?.status === 'completed';
        
        if (this.currentModule.assessment) {
            // Module has assessment
            takeAssessmentBtn.style.display = 'inline-block';
            markCompleteBtn.style.display = 'none';
            
            if (isCompleted) {
                takeAssessmentBtn.textContent = 'Retake Assessment';
            } else {
                takeAssessmentBtn.textContent = 'Take Assessment';
            }
        } else {
            // Module has no assessment
            markCompleteBtn.style.display = isCompleted ? 'none' : 'inline-block';
            takeAssessmentBtn.style.display = 'none';
        }
    }

    async markModuleComplete() {
        try {
            await this.updateModuleStatus('completed');
            this.showModuleContent(); // Refresh to update UI
            this.updateOverallProgress();
            this.renderModuleList(); // Update sidebar
            
            // Check if this unlocks the next module or completes the course
            if (this.currentModuleIndex < this.course.modules.length - 1) {
                this.showSuccessToast('Module completed! The next module is now unlocked.');
            } else {
                // Check if course is now completed
                if (this.userProgress.overallProgress === 100) {
                    this.showCourseCompletionModal();
                } else {
                    this.showSuccessToast('Congratulations! You have completed all modules in this course.');
                }
            }
        } catch (error) {
            console.error('Error marking module complete:', error);
            this.showErrorToast('Failed to mark module as complete. Please try again.');
        }
    }

    async updateModuleStatus(status) {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/courses/${this.courseId}/modules/${this.currentModule.moduleId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error('Failed to update module status');
            }

            const data = await response.json();
            this.userProgress = data.userProgress;
        } catch (error) {
            console.error('Error updating module status:', error);
            throw error;
        }
    }

    startAssessment() {
        if (!this.currentModule.assessment) {
            this.showErrorToast('This module does not have an assessment.');
            return;
        }

        this.assessmentData = this.currentModule.assessment;
        this.currentQuestionIndex = 0;
        this.userAnswers = new Array(this.assessmentData.questions.length).fill('');

        this.showAssessmentContent();
    }

    showAssessmentContent() {
        // Hide other content areas
        document.getElementById('module-content').style.display = 'none';
        document.getElementById('assessment-results').style.display = 'none';
        
        // Show assessment content
        document.getElementById('assessment-content').style.display = 'block';

        // Update assessment header
        document.getElementById('passing-score').textContent = `Passing Score: ${this.assessmentData.passingScore}%`;

        this.renderQuestion();
    }

    renderQuestion() {
        const question = this.assessmentData.questions[this.currentQuestionIndex];
        const questionContainer = document.getElementById('question-container');

        // Update question counter
        document.getElementById('question-counter').textContent = 
            `Question ${this.currentQuestionIndex + 1} of ${this.assessmentData.questions.length}`;

        // Render question based on type
        let questionHTML = `<div class="question">
            <h4 class="mb-4">${question.question}</h4>
            <div class="answer-options">`;

        switch (question.type) {
            case 'multiple-choice':
                question.options.forEach((option, index) => {
                    const isSelected = this.userAnswers[this.currentQuestionIndex] === option;
                    questionHTML += `
                        <div class="option-card ${isSelected ? 'selected' : ''}" data-option="${option}">
                            <div class="d-flex align-items-center">
                                <input type="radio" name="answer" value="${option}" ${isSelected ? 'checked' : ''} class="me-3">
                                <span>${option}</span>
                            </div>
                        </div>
                    `;
                });
                break;

            case 'text':
                questionHTML += `
                    <textarea name="answer" class="form-control" placeholder="Enter your answer here..." rows="4">${this.userAnswers[this.currentQuestionIndex]}</textarea>
                `;
                break;

            case 'code':
                questionHTML += `
                    <textarea name="answer" class="form-control font-monospace" placeholder="Enter your code here..." rows="8" style="background: #f8f9fa;">${this.userAnswers[this.currentQuestionIndex]}</textarea>
                `;
                break;
        }

        questionHTML += `</div></div>`;
        questionContainer.innerHTML = questionHTML;

        // Add event listeners for answer selection
        if (question.type === 'multiple-choice') {
            questionContainer.querySelectorAll('.option-card').forEach(optionCard => {
                optionCard.addEventListener('click', () => {
                    const input = optionCard.querySelector('input[name="answer"]');
                    input.checked = true;
                    this.userAnswers[this.currentQuestionIndex] = input.value;
                    
                    // Update visual selection
                    questionContainer.querySelectorAll('.option-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    optionCard.classList.add('selected');
                });
            });
            
            questionContainer.querySelectorAll('input[name="answer"]').forEach(input => {
                input.addEventListener('change', (e) => {
                    this.userAnswers[this.currentQuestionIndex] = e.target.value;
                });
            });
        } else {
            const textarea = questionContainer.querySelector('textarea[name="answer"]');
            textarea.addEventListener('input', (e) => {
                this.userAnswers[this.currentQuestionIndex] = e.target.value;
            });
        }

        // Update navigation buttons
        document.getElementById('prev-question').disabled = this.currentQuestionIndex === 0;
        
        const nextBtn = document.getElementById('next-question');
        const submitBtn = document.getElementById('submit-assessment');
        
        if (this.currentQuestionIndex === this.assessmentData.questions.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.assessmentData.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        }
    }

    async submitAssessment() {
        try {
            // Calculate score
            let correctAnswers = 0;
            this.assessmentData.questions.forEach((question, index) => {
                const userAnswer = this.userAnswers[index];
                if (userAnswer && userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()) {
                    correctAnswers++;
                }
            });

            const score = Math.round((correctAnswers / this.assessmentData.questions.length) * 100);
            const passed = score >= this.assessmentData.passingScore;

            // Submit assessment to backend
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/courses/${this.courseId}/modules/${this.currentModule.moduleId}/assessment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    answers: this.userAnswers,
                    score: score
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit assessment');
            }

            const data = await response.json();
            this.userProgress = data.userProgress;

            this.showAssessmentResults(score, correctAnswers, passed);
        } catch (error) {
            console.error('Error submitting assessment:', error);
            this.showErrorToast('Failed to submit assessment. Please try again.');
        }
    }

    showAssessmentResults(score, correctAnswers, passed) {
        // Hide assessment content
        document.getElementById('assessment-content').style.display = 'none';
        
        // Show results
        document.getElementById('assessment-results').style.display = 'block';

        // Update results display
        document.getElementById('final-score').textContent = `${score}%`;
        
        // Update circular progress for results
        const resultsProgressCircle = document.getElementById('results-progress-circle');
        if (resultsProgressCircle) {
            resultsProgressCircle.style.setProperty('--progress', `${score * 3.6}deg`);
        }
        
        const scoreMessage = document.getElementById('score-message');
        const scoreDetails = document.getElementById('score-details');
        
        if (passed) {
            scoreMessage.textContent = 'Congratulations! You passed!';
            scoreMessage.className = 'text-success';
        } else {
            scoreMessage.textContent = 'You need to retake this assessment.';
            scoreMessage.className = 'text-danger';
        }

        scoreDetails.textContent = `You answered ${correctAnswers} out of ${this.assessmentData.questions.length} questions correctly.`;

        // Show appropriate action buttons
        const continueBtn = document.getElementById('continue-learning');
        const retakeBtn = document.getElementById('retake-assessment');

        if (passed) {
            continueBtn.style.display = this.currentModuleIndex < this.course.modules.length - 1 ? 'inline-block' : 'none';
            retakeBtn.style.display = 'inline-block';
        } else {
            continueBtn.style.display = 'none';
            retakeBtn.style.display = 'inline-block';
        }

        // Update progress displays
        this.updateOverallProgress();
        this.renderModuleList();

        // Check if course is completed after assessment
        if (passed && this.userProgress.overallProgress === 100) {
            setTimeout(() => {
                this.showCourseCompletionModal();
            }, 2000); // Show after 2 seconds to let user see the results first
        }
    }

    retakeAssessment() {
        this.userAnswers = new Array(this.assessmentData.questions.length).fill('');
        this.currentQuestionIndex = 0;
        this.showAssessmentContent();
    }

    goToNextModule() {
        if (this.currentModuleIndex < this.course.modules.length - 1) {
            this.loadModule(this.currentModuleIndex + 1);
        }
    }

    updateOverallProgress() {
        const progressFill = document.getElementById('overall-progress');
        const progressText = document.getElementById('progress-text');
        const progressCircle = document.getElementById('progress-circle');
        const progressPercentage = document.getElementById('progress-percentage');
        
        const progress = this.userProgress.overallProgress || 0;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${progress}% Complete`;
        
        // Update circular progress
        if (progressCircle && progressPercentage) {
            progressCircle.style.setProperty('--progress', `${progress * 3.6}deg`);
            progressPercentage.textContent = `${progress}%`;
        }
    }

    showCourseCompletionModal() {
        // Create modal HTML
        const modalHTML = `
            <div id="completion-modal" class="modal-overlay">
                <div class="modal-content">
                    <div class="completion-header">
                        <div class="completion-icon">🎉</div>
                        <h2>Congratulations!</h2>
                        <p>You have successfully completed the course:</p>
                        <h3>${this.course.title}</h3>
                    </div>
                    
                    <div class="certificate-section">
                        ${this.userProgress.certificateId ? `
                            <div class="certificate-info">
                                <div class="certificate-icon">📜</div>
                                <h4>Your Certificate is Ready!</h4>
                                <p>Certificate ID: <strong>${this.userProgress.certificateId}</strong></p>
                                <div class="certificate-actions">
                                    <button id="view-certificate" class="btn btn-primary">
                                        View Certificate
                                    </button>
                                    <button id="download-certificate" class="btn btn-secondary">
                                        Download Certificate
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <div class="certificate-generating">
                                <div class="spinner"></div>
                                <p>Generating your certificate...</p>
                            </div>
                        `}
                    </div>
                    
                    <div class="completion-actions">
                        <button id="view-profile" class="btn btn-secondary">
                            View Profile
                        </button>
                        <button id="browse-courses" class="btn btn-primary">
                            Browse More Courses
                        </button>
                        <button id="close-modal" class="btn btn-outline">
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('completion-modal').remove();
        });

        document.getElementById('browse-courses').addEventListener('click', () => {
            window.location.href = 'courses.html';
        });

        document.getElementById('view-profile').addEventListener('click', () => {
            window.location.href = 'profile.html';
        });

        if (this.userProgress.certificateId) {
            document.getElementById('view-certificate').addEventListener('click', () => {
                window.open(this.userProgress.certificateUrl, '_blank');
            });

            document.getElementById('download-certificate').addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = this.userProgress.certificateUrl;
                link.download = `certificate-${this.userProgress.certificateId}.html`;
                link.click();
            });
        }

        // If certificate is not yet generated, poll for it
        if (!this.userProgress.certificateId) {
            this.pollForCertificate();
        }
    }

    async pollForCertificate() {
        const maxAttempts = 10;
        let attempts = 0;

        const checkCertificate = async () => {
            attempts++;
            
            try {
                // Reload course data to check for certificate
                await this.loadCourse();
                
                if (this.userProgress.certificateId) {
                    // Certificate is ready, update the modal
                    const certificateSection = document.querySelector('.certificate-section');
                    if (certificateSection) {
                        certificateSection.innerHTML = `
                            <div class="certificate-info">
                                <div class="certificate-icon">📜</div>
                                <h4>Your Certificate is Ready!</h4>
                                <p>Certificate ID: <strong>${this.userProgress.certificateId}</strong></p>
                                <div class="certificate-actions">
                                    <button id="view-certificate" class="btn btn-primary">
                                        View Certificate
                                    </button>
                                    <button id="download-certificate" class="btn btn-secondary">
                                        Download Certificate
                                    </button>
                                </div>
                            </div>
                        `;

                        // Re-add event listeners
                        document.getElementById('view-certificate').addEventListener('click', () => {
                            window.open(this.userProgress.certificateUrl, '_blank');
                        });

                        document.getElementById('download-certificate').addEventListener('click', () => {
                            const link = document.createElement('a');
                            link.href = this.userProgress.certificateUrl;
                            link.download = `certificate-${this.userProgress.certificateId}.html`;
                            link.click();
                        });
                    }
                    return;
                }
                
                if (attempts < maxAttempts) {
                    setTimeout(checkCertificate, 2000); // Check again in 2 seconds
                } else {
                    // Max attempts reached, show error
                    const certificateSection = document.querySelector('.certificate-section');
                    if (certificateSection) {
                        certificateSection.innerHTML = `
                            <div class="certificate-error">
                                <p>Certificate generation is taking longer than expected.</p>
                                <p>You can view your certificates in your profile later.</p>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.error('Error checking for certificate:', error);
                if (attempts < maxAttempts) {
                    setTimeout(checkCertificate, 2000);
                }
            }
        };

        checkCertificate();
    }

    showSuccessToast(message) {
        this.showToast(message, 'success');
    }

    showErrorToast(message) {
        this.showToast(message, 'danger');
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '1055';
            document.body.appendChild(toastContainer);
        }

        // Create toast
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="fas ${
                        type === 'success' ? 'fa-check-circle text-success' :
                        type === 'danger' ? 'fa-exclamation-circle text-danger' :
                        'fa-info-circle text-info'
                    } me-2"></i>
                    <strong class="me-auto">Course Player</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        // Initialize and show toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
        
        toast.show();
        
        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    showError(message) {
        document.getElementById('loading').innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle text-danger fa-3x mb-3"></i>
                <h4 class="text-danger">Error</h4>
                <p class="text-muted mb-4">${message}</p>
                <button class="btn btn-primary" onclick="window.location.href='courses.html'">
                    <i class="fas fa-arrow-left me-2"></i>Back to Courses
                </button>
            </div>
        `;
    }
}

// Initialize course player when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CoursePlayer();
});