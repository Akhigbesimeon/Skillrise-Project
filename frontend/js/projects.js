class ProjectManager {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedSkills = [];
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check authentication
        const token = localStorage.getItem('accessToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Get current user info
            this.currentUser = await this.getCurrentUser();
            this.setupUI();
            this.setupEventListeners();
            await this.loadProjects();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize page');
        }
    }

    async getCurrentUser() {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get user profile');
        }

        const data = await response.json();
        return data.success ? data.user : null;
    }

    setupUI() {
        // Show/hide buttons based on user type
        const createBtn = document.getElementById('create-project-btn');
        const myProjectsBtn = document.getElementById('my-projects-btn');
        const myApplicationsBtn = document.getElementById('my-applications-btn');

        if (this.currentUser.userType === 'client') {
            createBtn.style.display = 'inline-block';
            myProjectsBtn.style.display = 'inline-block';
        } else if (this.currentUser.userType === 'freelancer') {
            myApplicationsBtn.style.display = 'inline-block';
        }

        // Set minimum date for deadline
        const deadlineInput = document.getElementById('project-deadline');
        if (deadlineInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            deadlineInput.min = tomorrow.toISOString().split('T')[0];
        }
    }

    setupEventListeners() {
        // Filter controls
        document.getElementById('apply-filters-btn').addEventListener('click', () => {
            this.currentPage = 1;
            this.loadProjects();
        });

        document.getElementById('clear-filters-btn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Search on Enter
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.currentPage = 1;
                this.loadProjects();
            }
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadProjects();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadProjects();
            }
        });

        // Create project modal
        const createBtn = document.getElementById('create-project-btn');
        const createModal = document.getElementById('create-project-modal');
        const cancelBtn = document.getElementById('cancel-create');

        if (createBtn) {
            createBtn.addEventListener('click', () => {
                createModal.style.display = 'block';
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                createModal.style.display = 'none';
                this.resetCreateForm();
            });
        }

        // Create project form
        document.getElementById('create-project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProject();
        });

        // Skills input
        document.getElementById('skill-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addSkill();
            }
        });

        // My projects button
        const myProjectsBtn = document.getElementById('my-projects-btn');
        if (myProjectsBtn) {
            myProjectsBtn.addEventListener('click', () => {
                this.loadMyProjects();
            });
        }

        // My applications button
        const myApplicationsBtn = document.getElementById('my-applications-btn');
        if (myApplicationsBtn) {
            myApplicationsBtn.addEventListener('click', () => {
                this.viewMyApplications();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal .close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    async loadProjects() {
        this.showLoading(true);

        try {
            const filters = this.getFilters();
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: 12,
                ...filters
            });

            const response = await fetch(`/api/projects?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                this.displayProjects(data.data);
                this.updatePagination(data.pagination);
            } else {
                throw new Error('Failed to load projects');
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            this.showError('Failed to load projects');
        } finally {
            this.showLoading(false);
        }
    }

    async loadMyProjects() {
        this.showLoading(true);

        try {
            const response = await fetch('/api/projects/my/projects', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();

            if (data.success) {
                this.displayProjects(data.data, true);
                this.updatePagination(data.pagination);
            } else {
                throw new Error('Failed to load my projects');
            }
        } catch (error) {
            console.error('Error loading my projects:', error);
            this.showError('Failed to load your projects');
        } finally {
            this.showLoading(false);
        }
    }

    getFilters() {
        const filters = {};
        
        const search = document.getElementById('search-input').value.trim();
        if (search) filters.search = search;

        const skills = Array.from(document.getElementById('skills-filter').selectedOptions)
            .map(option => option.value);
        if (skills.length > 0) filters.skills = skills.join(',');

        const budgetMin = document.getElementById('budget-min').value;
        if (budgetMin) filters.budgetMin = budgetMin;

        const budgetMax = document.getElementById('budget-max').value;
        if (budgetMax) filters.budgetMax = budgetMax;

        const status = document.getElementById('status-filter').value;
        if (status) filters.status = status;

        return filters;
    }

    clearFilters() {
        document.getElementById('search-input').value = '';
        document.getElementById('skills-filter').selectedIndex = -1;
        document.getElementById('budget-min').value = '';
        document.getElementById('budget-max').value = '';
        document.getElementById('status-filter').value = 'open';
        
        this.currentPage = 1;
        this.loadProjects();
    }

    displayProjects(projects, isMyProjects = false) {
        const container = document.getElementById('projects-container');
        const noProjects = document.getElementById('no-projects');

        if (projects.length === 0) {
            container.innerHTML = '';
            noProjects.style.display = 'block';
            return;
        }

        noProjects.style.display = 'none';
        container.innerHTML = projects.map(project => this.createProjectCard(project, isMyProjects)).join('');

        // Add click listeners to project cards
        container.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                const projectId = card.dataset.projectId;
                this.showProjectDetails(projectId);
            });
        });
    }

    createProjectCard(project, isMyProjects = false) {
        const deadline = new Date(project.deadline).toLocaleDateString();
        const created = new Date(project.createdAt).toLocaleDateString();
        const statusClass = `status-${project.status.replace('_', '-')}`;
        
        return `
            <div class="project-card" data-project-id="${project._id}">
                <div class="project-header">
                    <h3 class="project-title">${this.escapeHtml(project.title)}</h3>
                    <span class="project-status ${statusClass}">${project.status.replace('_', ' ').toUpperCase()}</span>
                </div>
                
                <div class="project-meta">
                    <div class="project-client">
                        <strong>Client:</strong> ${this.escapeHtml(project.clientId.fullName)}
                        ${project.clientId.clientProfile?.companyName ? 
                            `(${this.escapeHtml(project.clientId.clientProfile.companyName)})` : ''}
                    </div>
                    <div class="project-budget">
                        <strong>Budget:</strong> $${project.budgetMin} - $${project.budgetMax}
                    </div>
                    <div class="project-deadline">
                        <strong>Deadline:</strong> ${deadline}
                    </div>
                </div>
                
                <div class="project-description">
                    ${this.escapeHtml(project.description.substring(0, 150))}${project.description.length > 150 ? '...' : ''}
                </div>
                
                <div class="project-skills">
                    ${project.requiredSkills.map(skill => 
                        `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                    ).join('')}
                </div>
                
                <div class="project-footer">
                    <div class="project-applications">
                        <strong>Applications:</strong> ${project.applicationCount || 0}
                    </div>
                    <div class="project-created">
                        Posted: ${created}
                    </div>
                </div>
                
                ${isMyProjects ? `
                    <div class="project-actions">
                        ${project.applicationCount > 0 ? `
                            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); projectManager.viewApplications('${project._id}')">
                                View Applications (${project.applicationCount})
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); projectManager.editProject('${project._id}')">
                            Edit
                        </button>
                        ${project.status === 'open' && project.applicationCount === 0 ? `
                            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); projectManager.deleteProject('${project._id}')">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    async showProjectDetails(projectId) {
        try {
            const response = await fetch(`/api/projects/${projectId}?includeApplications=true`);
            const data = await response.json();

            if (data.success) {
                this.displayProjectDetails(data.data);
            } else {
                throw new Error('Failed to load project details');
            }
        } catch (error) {
            console.error('Error loading project details:', error);
            this.showError('Failed to load project details');
        }
    }

    displayProjectDetails(project) {
        const modal = document.getElementById('project-detail-modal');
        const content = document.getElementById('project-detail-content');
        const title = document.getElementById('detail-title');

        title.textContent = project.title;

        const deadline = new Date(project.deadline).toLocaleDateString();
        const created = new Date(project.createdAt).toLocaleDateString();
        const statusClass = `status-${project.status.replace('_', '-')}`;

        content.innerHTML = `
            <div class="project-detail">
                <div class="project-detail-header">
                    <div class="project-status-badge ${statusClass}">
                        ${project.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div class="project-budget-large">
                        $${project.budgetMin} - $${project.budgetMax}
                    </div>
                </div>

                <div class="project-detail-section">
                    <h4>Description</h4>
                    <p>${this.escapeHtml(project.description)}</p>
                </div>

                <div class="project-detail-section">
                    <h4>Required Skills</h4>
                    <div class="skills-list">
                        ${project.requiredSkills.map(skill => 
                            `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                        ).join('')}
                    </div>
                </div>

                <div class="project-detail-section">
                    <h4>Project Information</h4>
                    <div class="project-info-grid">
                        <div class="info-item">
                            <strong>Client:</strong> ${this.escapeHtml(project.clientId.fullName)}
                            ${project.clientId.clientProfile?.companyName ? 
                                `<br><small>${this.escapeHtml(project.clientId.clientProfile.companyName)}</small>` : ''}
                        </div>
                        <div class="info-item">
                            <strong>Deadline:</strong> ${deadline}
                        </div>
                        <div class="info-item">
                            <strong>Posted:</strong> ${created}
                        </div>
                        <div class="info-item">
                            <strong>Applications:</strong> ${project.applicationCount || 0}
                        </div>
                    </div>
                </div>

                ${this.currentUser.userType === 'freelancer' && project.status === 'open' ? `
                    <div class="project-detail-actions">
                        <button class="btn btn-primary" onclick="projectManager.applyToProject('${project._id}')">
                            Apply to Project
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'block';
    }

    async createProject() {
        try {
            const formData = {
                title: document.getElementById('project-title').value.trim(),
                description: document.getElementById('project-description').value.trim(),
                requiredSkills: this.selectedSkills,
                budgetMin: parseFloat(document.getElementById('project-budget-min').value),
                budgetMax: parseFloat(document.getElementById('project-budget-max').value),
                deadline: document.getElementById('project-deadline').value
            };

            // Validation
            if (!formData.title || !formData.description || !formData.deadline) {
                this.showError('Please fill in all required fields');
                return;
            }

            if (this.selectedSkills.length === 0) {
                this.showError('Please add at least one required skill');
                return;
            }

            if (formData.budgetMin >= formData.budgetMax) {
                this.showError('Maximum budget must be greater than minimum budget');
                return;
            }

            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Project created successfully!');
                document.getElementById('create-project-modal').style.display = 'none';
                this.resetCreateForm();
                this.loadProjects();
            } else {
                throw new Error(data.error?.message || 'Failed to create project');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            this.showError(error.message);
        }
    }

    addSkill() {
        const input = document.getElementById('skill-input');
        const skill = input.value.trim().toLowerCase();

        if (skill && !this.selectedSkills.includes(skill)) {
            this.selectedSkills.push(skill);
            this.updateSkillsDisplay();
            input.value = '';
        }
    }

    removeSkill(skill) {
        this.selectedSkills = this.selectedSkills.filter(s => s !== skill);
        this.updateSkillsDisplay();
    }

    updateSkillsDisplay() {
        const container = document.getElementById('selected-skills');
        container.innerHTML = this.selectedSkills.map(skill => `
            <span class="skill-tag">
                ${this.escapeHtml(skill)}
                <button type="button" onclick="projectManager.removeSkill('${skill}')">&times;</button>
            </span>
        `).join('');
    }

    resetCreateForm() {
        document.getElementById('create-project-form').reset();
        this.selectedSkills = [];
        this.updateSkillsDisplay();
    }

    async applyToProject(projectId) {
        try {
            // Get project details first
            const response = await fetch(`/api/projects/${projectId}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error('Failed to load project details');
            }

            const project = data.data;

            // Check if user can apply
            if (project.status !== 'open') {
                this.showError('This project is no longer accepting applications');
                return;
            }

            // Show application modal
            this.showApplicationModal(project);
        } catch (error) {
            console.error('Error preparing application:', error);
            this.showError('Failed to prepare application form');
        }
    }

    showApplicationModal(project) {
        const modal = document.getElementById('application-modal');
        const form = document.getElementById('application-form');
        
        // Reset form
        form.reset();
        this.updateCharCount();
        
        // Store project ID for submission
        form.dataset.projectId = project._id;
        
        // Set up character counter
        const coverLetter = document.getElementById('cover-letter');
        coverLetter.addEventListener('input', () => this.updateCharCount());
        
        // Set up form submission
        form.onsubmit = (e) => {
            e.preventDefault();
            this.submitApplication();
        };
        
        // Set up cancel button
        document.getElementById('cancel-application').onclick = () => {
            modal.style.display = 'none';
        };
        
        modal.style.display = 'block';
    }

    updateCharCount() {
        const coverLetter = document.getElementById('cover-letter');
        const charCount = document.querySelector('.char-count');
        const count = coverLetter.value.length;
        charCount.textContent = `${count}/1000 characters`;
        
        if (count > 1000) {
            charCount.style.color = 'red';
        } else {
            charCount.style.color = '';
        }
    }

    async submitApplication() {
        try {
            const form = document.getElementById('application-form');
            const projectId = form.dataset.projectId;
            
            const applicationData = {
                coverLetter: document.getElementById('cover-letter').value.trim(),
                proposedRate: parseFloat(document.getElementById('proposed-rate').value),
                estimatedDuration: document.getElementById('estimated-duration').value.trim()
            };

            // Validation
            if (!applicationData.coverLetter || !applicationData.proposedRate || !applicationData.estimatedDuration) {
                this.showError('Please fill in all required fields');
                return;
            }

            if (applicationData.coverLetter.length > 1000) {
                this.showError('Cover letter must be 1000 characters or less');
                return;
            }

            if (applicationData.proposedRate <= 0) {
                this.showError('Proposed rate must be greater than 0');
                return;
            }

            const response = await fetch(`/api/projects/${projectId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(applicationData)
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Application submitted successfully!');
                document.getElementById('application-modal').style.display = 'none';
                
                // Close project detail modal and refresh projects
                document.getElementById('project-detail-modal').style.display = 'none';
                this.loadProjects();
            } else {
                throw new Error(data.error?.message || 'Failed to submit application');
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            this.showError(error.message);
        }
    }

    async editProject(projectId) {
        // Basic edit functionality - could be expanded
        this.showError('Project editing feature will be enhanced in future updates');
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Project deleted successfully');
                this.loadProjects();
            } else {
                throw new Error(data.error?.message || 'Failed to delete project');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            this.showError(error.message);
        }
    }

    updatePagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        this.totalPages = pagination.pages;

        if (pagination.pages > 1) {
            paginationDiv.style.display = 'flex';
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.pages}`;
            prevBtn.disabled = pagination.page === 1;
            nextBtn.disabled = pagination.page === pagination.pages;
        } else {
            paginationDiv.style.display = 'none';
        }
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        alert('Error: ' + message);
    }

    showSuccess(message) {
        // Simple success display - could be enhanced with a proper notification system
        alert('Success: ' + message);
    }

    async viewApplications(projectId) {
        try {
            const response = await fetch(`/api/projects/${projectId}/applications`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.displayApplications(projectId, data.data);
            } else {
                throw new Error(data.error?.message || 'Failed to load applications');
            }
        } catch (error) {
            console.error('Error loading applications:', error);
            this.showError('Failed to load applications');
        }
    }

    displayApplications(projectId, applications) {
        const modal = document.getElementById('applications-modal');
        const content = document.getElementById('applications-content');

        if (applications.length === 0) {
            content.innerHTML = `
                <div class="no-results">
                    <h3>No applications yet</h3>
                    <p>Applications will appear here when freelancers apply to your project.</p>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="applications-list">
                    ${applications.map(app => this.createApplicationCard(projectId, app)).join('')}
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    createApplicationCard(projectId, application) {
        const appliedDate = new Date(application.appliedAt).toLocaleDateString();
        const statusClass = `status-${application.status}`;
        
        return `
            <div class="application-card ${statusClass}">
                <div class="application-header">
                    <div class="freelancer-info">
                        <h4>${this.escapeHtml(application.freelancerId.fullName)}</h4>
                        <div class="freelancer-details">
                            <span class="experience-level">
                                ${application.freelancerId.freelancerProfile?.experienceLevel || 'Not specified'}
                            </span>
                            <span class="hourly-rate">
                                Current Rate: $${application.freelancerId.freelancerProfile?.hourlyRate || 'Not specified'}/hr
                            </span>
                        </div>
                    </div>
                    <div class="application-status">
                        <span class="status-badge ${statusClass}">
                            ${application.status.toUpperCase()}
                        </span>
                        <small>Applied: ${appliedDate}</small>
                    </div>
                </div>

                <div class="application-details">
                    <div class="proposal-info">
                        <div class="proposed-rate">
                            <strong>Proposed Rate:</strong> $${application.proposedRate}/hr
                        </div>
                        <div class="estimated-duration">
                            <strong>Estimated Duration:</strong> ${this.escapeHtml(application.estimatedDuration)}
                        </div>
                    </div>

                    <div class="freelancer-skills">
                        <strong>Skills:</strong>
                        ${(application.freelancerId.freelancerProfile?.skills || []).map(skill => 
                            `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                        ).join('')}
                    </div>

                    <div class="cover-letter">
                        <strong>Cover Letter:</strong>
                        <p>${this.escapeHtml(application.coverLetter)}</p>
                    </div>
                </div>

                ${application.status === 'pending' ? `
                    <div class="application-actions">
                        <button class="btn btn-success" onclick="projectManager.updateApplicationStatus('${projectId}', '${application._id}', 'accepted')">
                            Accept Application
                        </button>
                        <button class="btn btn-danger" onclick="projectManager.updateApplicationStatus('${projectId}', '${application._id}', 'rejected')">
                            Reject Application
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async updateApplicationStatus(projectId, applicationId, status) {
        try {
            const action = status === 'accepted' ? 'accept' : 'reject';
            if (!confirm(`Are you sure you want to ${action} this application?`)) {
                return;
            }

            const response = await fetch(`/api/projects/${projectId}/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(`Application ${status} successfully!`);
                
                // Close applications modal and refresh project list
                document.getElementById('applications-modal').style.display = 'none';
                this.loadProjects();
                
                // If accepted, show assignment confirmation
                if (status === 'accepted') {
                    this.showSuccess(`Project has been assigned to ${data.data.application.freelancerId.fullName}. Other pending applications have been automatically rejected.`);
                }
            } else {
                throw new Error(data.error?.message || `Failed to ${action} application`);
            }
        } catch (error) {
            console.error(`Error ${status === 'accepted' ? 'accepting' : 'rejecting'} application:`, error);
            this.showError(error.message);
        }
    }

    async viewMyApplications() {
        try {
            const response = await fetch('/api/projects/my/applications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.displayMyApplications(data.data);
            } else {
                throw new Error(data.error?.message || 'Failed to load applications');
            }
        } catch (error) {
            console.error('Error loading my applications:', error);
            this.showError('Failed to load your applications');
        }
    }

    displayMyApplications(applications) {
        const container = document.getElementById('projects-container');
        const noProjects = document.getElementById('no-projects');

        if (applications.length === 0) {
            container.innerHTML = '';
            noProjects.innerHTML = `
                <h3>No applications found</h3>
                <p>You haven't applied to any projects yet. Browse available projects to get started!</p>
            `;
            noProjects.style.display = 'block';
            return;
        }

        noProjects.style.display = 'none';
        container.innerHTML = applications.map(app => this.createMyApplicationCard(app)).join('');
    }

    createMyApplicationCard(application) {
        const appliedDate = new Date(application.appliedAt).toLocaleDateString();
        const deadline = new Date(application.project.deadline).toLocaleDateString();
        const statusClass = `status-${application.status}`;
        
        return `
            <div class="application-card ${statusClass}">
                <div class="application-header">
                    <h3 class="project-title">${this.escapeHtml(application.project.title)}</h3>
                    <span class="application-status ${statusClass}">
                        ${application.status.toUpperCase()}
                    </span>
                </div>
                
                <div class="project-meta">
                    <div class="project-client">
                        <strong>Client:</strong> ${this.escapeHtml(application.project.client.fullName)}
                        ${application.project.client.companyName ? 
                            `(${this.escapeHtml(application.project.client.companyName)})` : ''}
                    </div>
                    <div class="project-budget">
                        <strong>Project Budget:</strong> $${application.project.budgetMin} - $${application.project.budgetMax}
                    </div>
                    <div class="project-deadline">
                        <strong>Deadline:</strong> ${deadline}
                    </div>
                </div>
                
                <div class="application-details">
                    <div class="proposal-summary">
                        <div class="proposed-rate">
                            <strong>Your Rate:</strong> $${application.proposedRate}/hr
                        </div>
                        <div class="estimated-duration">
                            <strong>Duration:</strong> ${this.escapeHtml(application.estimatedDuration)}
                        </div>
                        <div class="applied-date">
                            <strong>Applied:</strong> ${appliedDate}
                        </div>
                    </div>
                    
                    <div class="cover-letter-preview">
                        <strong>Cover Letter:</strong>
                        <p>${this.escapeHtml(application.coverLetter.substring(0, 200))}${application.coverLetter.length > 200 ? '...' : ''}</p>
                    </div>
                </div>

                <div class="application-footer">
                    <div class="project-status">
                        <strong>Project Status:</strong> ${application.project.status.replace('_', ' ').toUpperCase()}
                    </div>
                    ${application.status === 'accepted' ? `
                        <div class="success-message">
                            🎉 Congratulations! You've been selected for this project.
                        </div>
                    ` : application.status === 'rejected' ? `
                        <div class="rejection-message">
                            This application was not selected. Keep applying to other projects!
                        </div>
                    ` : `
                        <div class="pending-message">
                            Your application is under review by the client.
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
}

// Initialize the project manager when the page loads
let projectManager;
document.addEventListener('DOMContentLoaded', () => {
    projectManager = new ProjectManager();
});
                    </div>

                    <div class="cover-letter">
                        <strong>Cover Letter:</strong>
                        <p>${this.escapeHtml(application.coverLetter)}</p>
                    </div>
                </div>

                ${application.status === 'pending' ? `
                    <div class="application-actions">
                        <button class="btn btn-success" onclick="projectManager.updateApplicationStatus('${projectId}', '${application._id}', 'accepted')">
                            Accept
                        </button>
                        <button class="btn btn-danger" onclick="projectManager.updateApplicationStatus('${projectId}', '${application._id}', 'rejected')">
                            Reject
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async updateApplicationStatus(projectId, applicationId, status) {
        try {
            const action = status === 'accepted' ? 'accept' : 'reject';
            
            if (!confirm(`Are you sure you want to ${action} this application?`)) {
                return;
            }

            const response = await fetch(`/api/projects/${projectId}/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(`Application ${status} successfully!`);
                
                // Refresh applications view
                this.viewApplications(projectId);
                
                // Refresh projects list
                this.loadProjects();
            } else {
                throw new Error(data.error?.message || `Failed to ${action} application`);
            }
        } catch (error) {
            console.error('Error updating application status:', error);
            this.showError(error.message);
        }
    }

    // Add method to view freelancer's own applications
    async viewMyApplications() {
        try {
            const response = await fetch('/api/projects/my/applications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.displayMyApplications(data.data);
            } else {
                throw new Error(data.error?.message || 'Failed to load applications');
            }
        } catch (error) {
            console.error('Error loading my applications:', error);
            this.showError('Failed to load your applications');
        }
    }

    displayMyApplications(applications) {
        const container = document.getElementById('projects-container');
        const noProjects = document.getElementById('no-projects');

        if (applications.length === 0) {
            container.innerHTML = '';
            noProjects.style.display = 'block';
            noProjects.innerHTML = `
                <h3>No applications found</h3>
                <p>You haven't applied to any projects yet. Browse available projects to get started!</p>
            `;
            return;
        }

        noProjects.style.display = 'none';
        container.innerHTML = applications.map(app => this.createMyApplicationCard(app)).join('');
    }

    createMyApplicationCard(application) {
        const appliedDate = new Date(application.appliedAt).toLocaleDateString();
        const deadline = new Date(application.project.deadline).toLocaleDateString();
        const statusClass = `status-${application.status}`;
        
        return `
            <div class="application-card ${statusClass}">
                <div class="application-header">
                    <h3>${this.escapeHtml(application.project.title)}</h3>
                    <span class="status-badge ${statusClass}">
                        ${application.status.toUpperCase()}
                    </span>
                </div>

                <div class="project-info">
                    <div class="client-info">
                        <strong>Client:</strong> ${this.escapeHtml(application.project.client.fullName)}
                        ${application.project.client.companyName ? 
                            `(${this.escapeHtml(application.project.client.companyName)})` : ''}
                    </div>
                    <div class="project-budget">
                        <strong>Budget:</strong> $${application.project.budgetMin} - $${application.project.budgetMax}
                    </div>
                    <div class="project-deadline">
                        <strong>Deadline:</strong> ${deadline}
                    </div>
                </div>

                <div class="application-details">
                    <div class="my-proposal">
                        <div class="proposed-rate">
                            <strong>Your Rate:</strong> $${application.proposedRate}/hr
                        </div>
                        <div class="estimated-duration">
                            <strong>Duration:</strong> ${this.escapeHtml(application.estimatedDuration)}
                        </div>
                    </div>
                    <div class="applied-date">
                        <strong>Applied:</strong> ${appliedDate}
                    </div>
                </div>

                <div class="cover-letter-preview">
                    <strong>Cover Letter:</strong>
                    <p>${this.escapeHtml(application.coverLetter.substring(0, 150))}${application.coverLetter.length > 150 ? '...' : ''}</p>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when page loads
const projectManager = new ProjectManager();
