class CourseCatalog {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {
            search: '',
            category: '',
            difficulty: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Check if backend is available
        const backendAvailable = await this.checkBackendConnection();
        if (!backendAvailable) {
            console.warn('Backend not available, using sample data');
            this.populateCategoryFilter(['Programming', 'Design', 'Marketing']);
            this.renderSampleCourses();
            return;
        }
        
        this.loadCategories();
        this.loadCourses();
    }

    async checkBackendConnection() {
        try {
            const response = await fetch('/api/courses/meta/categories', {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.log('Backend connection check failed:', error.message);
            return false;
        }
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => {
            this.handleSearch();
        });

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Filter changes
        document.getElementById('category-filter').addEventListener('change', () => {
            this.handleFilterChange();
        });

        document.getElementById('difficulty-filter').addEventListener('change', () => {
            this.handleFilterChange();
        });

        document.getElementById('sort-filter').addEventListener('change', () => {
            this.handleSortChange();
        });

        // Clear filters
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadCourses();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            this.currentPage++;
            this.loadCourses();
        });

        // Modal close
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        document.getElementById('course-modal').addEventListener('click', (e) => {
            if (e.target.id === 'course-modal') {
                this.closeModal();
            }
        });
    }

    async loadCategories() {
        try {
            console.log('Loading categories...');
            const response = await fetch('/api/courses/meta/categories');
            console.log('Categories response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Categories data:', data);
                this.populateCategoryFilter(data.categories);
            } else {
                console.warn('Failed to load categories, using defaults');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            // Add some default categories if API fails
            this.populateCategoryFilter(['Programming', 'Design', 'Marketing']);
        }
    }

    populateCategoryFilter(categories) {
        const categoryFilter = document.getElementById('category-filter');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryFilter.appendChild(option);
        });
    }

    async loadCourses() {
        const loading = document.getElementById('loading');
        const container = document.getElementById('courses-container');
        
        loading.style.display = 'block';
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 12,
                ...this.currentFilters
            });

            console.log('Loading courses with params:', params.toString());
            const response = await fetch(`/api/courses?${params}`);
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Courses data:', data);
                this.renderCourses(data.courses);
                this.updatePagination(data.pagination);
            } else {
                const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading courses:', error);
            
            // Show sample data for demonstration when backend is not available
            if (error.message.includes('fetch')) {
                console.log('Backend not available, showing sample data');
                this.renderSampleCourses();
                return;
            }
            
            container.innerHTML = `
                <div class="error">
                    <h3>Failed to load courses</h3>
                    <p>${error.message}</p>
                    <p>Please make sure the backend server is running on port 3000.</p>
                    <button class="btn btn-primary" onclick="courseCatalog.loadCourses()">Try Again</button>
                    <button class="btn btn-secondary" onclick="courseCatalog.renderSampleCourses()">Show Sample Data</button>
                </div>
            `;
        } finally {
            loading.style.display = 'none';
        }
    }

    renderCourses(courses) {
        const container = document.getElementById('courses-container');
        
        // Remove any existing sample data notice
        const existingNotice = container.querySelector('.sample-data-notice');
        if (existingNotice) {
            existingNotice.remove();
        }
        
        if (courses.length === 0) {
            container.innerHTML = '<div class="no-results">No courses found matching your criteria.</div>';
            return;
        }

        const coursesHTML = courses.map(course => `
            <div class="course-card" data-course-id="${course._id}">
                <div class="course-header">
                    <h3 class="course-title">${course.title || 'Untitled Course'}</h3>
                    <span class="course-difficulty ${course.difficultyLevel || 'beginner'}">${course.difficultyLevel || 'beginner'}</span>
                </div>
                <div class="course-meta">
                    <span class="course-category">${course.category || 'General'}</span>
                    <span class="course-duration">${course.estimatedDuration || 0}h</span>
                </div>
                <p class="course-description">${course.description || 'No description available.'}</p>
                <div class="course-stats">
                    <span class="enrollment-count">${course.enrollmentCount || 0} enrolled</span>
                    <span class="module-count">${(course.modules || []).length} modules</span>
                </div>
                <div class="course-actions">
                    <button class="btn btn-primary view-course" data-course-id="${course._id}">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = coursesHTML;

        // Add click listeners to course cards and buttons
        container.querySelectorAll('.view-course').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewCourseDetails(btn.dataset.courseId);
            });
        });

        container.querySelectorAll('.course-card').forEach(card => {
            card.addEventListener('click', () => {
                this.viewCourseDetails(card.dataset.courseId);
            });
        });
    }

    updatePagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        if (pagination.totalPages > 1) {
            paginationDiv.style.display = 'flex';
            prevBtn.disabled = !pagination.hasPrev;
            nextBtn.disabled = !pagination.hasNext;
            pageInfo.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;
        } else {
            paginationDiv.style.display = 'none';
        }
    }

    async viewCourseDetails(courseId) {
        try {
            const token = localStorage.getItem('accessToken');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`/api/courses/${courseId}`, { headers });
            
            if (response.ok) {
                const data = await response.json();
                this.showCourseModal(data.course, data.userProgress);
            } else {
                throw new Error('Failed to load course details');
            }
        } catch (error) {
            console.error('Error loading course details:', error);
            alert('Failed to load course details. Please try again.');
        }
    }

    showCourseModal(course, userProgress) {
        const modal = document.getElementById('course-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = course.title;

        const isEnrolled = userProgress !== null;
        const isLoggedIn = localStorage.getItem('accessToken') !== null;

        body.innerHTML = `
            <div class="course-detail">
                <div class="course-info">
                    <div class="course-meta-detail">
                        <span class="badge ${course.difficultyLevel}">${course.difficultyLevel}</span>
                        <span class="category">${course.category}</span>
                        <span class="duration">${course.estimatedDuration} hours</span>
                    </div>
                    
                    <p class="course-description-full">${course.description}</p>
                    
                    ${course.prerequisites.length > 0 ? `
                        <div class="prerequisites">
                            <h4>Prerequisites:</h4>
                            <ul>
                                ${course.prerequisites.map(prereq => `<li>${prereq}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="course-stats-detail">
                        <div class="stat">
                            <span class="stat-number">${course.enrollmentCount}</span>
                            <span class="stat-label">Students Enrolled</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${course.completionCount}</span>
                            <span class="stat-label">Completed</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${course.modules.length}</span>
                            <span class="stat-label">Modules</span>
                        </div>
                    </div>
                </div>
                
                <div class="course-modules">
                    <h4>Course Modules</h4>
                    <div class="modules-list">
                        ${course.modules.map((module, index) => `
                            <div class="module-item">
                                <div class="module-header">
                                    <span class="module-number">${index + 1}</span>
                                    <h5 class="module-title">${module.title}</h5>
                                </div>
                                <p class="module-description">${module.description}</p>
                                ${module.videoUrl ? '<span class="module-type">Video</span>' : ''}
                                ${module.assessment ? '<span class="module-type">Assessment</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="course-actions-modal">
                    ${!isLoggedIn ? `
                        <p class="login-prompt">Please <a href="login.html">login</a> to enroll in this course.</p>
                    ` : isEnrolled ? `
                        <div class="enrollment-status">
                            <span class="enrolled-badge">✓ Enrolled</span>
                            <div class="progress-info">
                                <span>Progress: ${userProgress.overallProgress}%</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${userProgress.overallProgress}%"></div>
                                </div>
                            </div>
                            <button class="btn btn-primary" onclick="window.location.href='course-player.html?id=${course._id}'">
                                Continue Learning
                            </button>
                        </div>
                    ` : `
                        <button class="btn btn-primary btn-large" onclick="courseCatalog.enrollInCourse('${course._id}')">
                            Enroll Now
                        </button>
                    `}
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    async enrollInCourse(courseId) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const response = await fetch(`/api/courses/${courseId}/enroll`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                alert('Successfully enrolled in course!');
                this.closeModal();
                // Refresh the course details to show enrollment status
                this.viewCourseDetails(courseId);
            } else {
                const error = await response.json();
                throw new Error(error.error.message);
            }
        } catch (error) {
            console.error('Error enrolling in course:', error);
            alert('Failed to enroll in course: ' + error.message);
        }
    }

    closeModal() {
        document.getElementById('course-modal').style.display = 'none';
    }

    handleSearch() {
        this.currentFilters.search = document.getElementById('search-input').value.trim();
        this.currentPage = 1;
        this.loadCourses();
    }

    handleFilterChange() {
        this.currentFilters.category = document.getElementById('category-filter').value;
        this.currentFilters.difficulty = document.getElementById('difficulty-filter').value;
        this.currentPage = 1;
        this.loadCourses();
    }

    handleSortChange() {
        const sortValue = document.getElementById('sort-filter').value;
        const [sortBy, sortOrder] = sortValue.split('-');
        this.currentFilters.sortBy = sortBy;
        this.currentFilters.sortOrder = sortOrder;
        this.currentPage = 1;
        this.loadCourses();
    }

    clearFilters() {
        document.getElementById('search-input').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('difficulty-filter').value = '';
        document.getElementById('sort-filter').value = 'createdAt-desc';
        
        this.currentFilters = {
            search: '',
            category: '',
            difficulty: '',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        this.currentPage = 1;
        this.loadCourses();
    }

    renderSampleCourses() {
        const sampleCourses = [
            {
                _id: 'sample-1',
                title: 'JavaScript Fundamentals',
                description: 'Learn the basics of JavaScript programming language. This comprehensive course covers variables, functions, objects, and modern ES6+ features.',
                category: 'Programming',
                difficultyLevel: 'beginner',
                estimatedDuration: 25,
                enrollmentCount: 156,
                modules: [
                    { title: 'Introduction to JavaScript' },
                    { title: 'Variables and Data Types' },
                    { title: 'Functions and Scope' }
                ]
            },
            {
                _id: 'sample-2',
                title: 'React Development Masterclass',
                description: 'Master React.js development with hooks, context, and modern patterns. Build real-world applications from scratch.',
                category: 'Programming',
                difficultyLevel: 'advanced',
                estimatedDuration: 45,
                enrollmentCount: 89,
                modules: [
                    { title: 'React Fundamentals' },
                    { title: 'Hooks and State Management' }
                ]
            },
            {
                _id: 'sample-3',
                title: 'UI/UX Design Principles',
                description: 'Learn the fundamentals of user interface and user experience design. Create beautiful and functional designs.',
                category: 'Design',
                difficultyLevel: 'intermediate',
                estimatedDuration: 30,
                enrollmentCount: 67,
                modules: [
                    { title: 'Design Fundamentals' },
                    { title: 'User Experience Research' }
                ]
            },
            {
                _id: 'sample-4',
                title: 'Digital Marketing Fundamentals',
                description: 'Learn the basics of digital marketing including SEO, social media, and content marketing strategies.',
                category: 'Marketing',
                difficultyLevel: 'beginner',
                estimatedDuration: 20,
                enrollmentCount: 234,
                modules: [
                    { title: 'Introduction to Digital Marketing' }
                ]
            }
        ];

        this.renderCourses(sampleCourses);
        
        // Hide pagination for sample data
        document.getElementById('pagination').style.display = 'none';
        
        // Add a notice that this is sample data
        const container = document.getElementById('courses-container');
        const notice = document.createElement('div');
        notice.className = 'sample-data-notice';
        notice.innerHTML = `
            <div style="background: #fff3cd; color: #856404; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; text-align: center;">
                <strong>Demo Mode:</strong> Showing sample course data. Start the backend server to see real data.
            </div>
        `;
        container.insertBefore(notice, container.firstChild);
    }
}

// Initialize course catalog when page loads
let courseCatalog;
document.addEventListener('DOMContentLoaded', () => {
    courseCatalog = new CourseCatalog();
});