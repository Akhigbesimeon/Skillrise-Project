// Simple Admin Navigation - Minimal working version
console.log('Simple admin navigation loading...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - setting up simple navigation');
    
    // Find all navigation links
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    console.log('Found navigation links:', navLinks.length);
    
    // Add click handlers to each nav link
    navLinks.forEach(function(link) {
        const section = link.dataset.section;
        console.log('Setting up navigation for:', section);
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Navigation clicked:', section);
            
            // Remove active class from all nav links
            document.querySelectorAll('.nav-link').forEach(function(navLink) {
                navLink.classList.remove('active');
            });
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.admin-section').forEach(function(sectionEl) {
                sectionEl.classList.remove('active');
                sectionEl.style.display = 'none';
            });
            
            // Show target section
            const targetSection = document.getElementById(section + '-section');
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block';
                console.log('Showing section:', section + '-section');
            } else {
                console.error('Section not found:', section + '-section');
            }
            
            // Update header title
            const titles = {
                overview: 'Dashboard',
                users: 'User Management',
                analytics: 'Analytics',
                moderation: 'Content Moderation',
                courses: 'Course Management',
                projects: 'Project Management',
                mentorship: 'Mentorship Management',
                messages: 'Message Management',
                system: 'System Health',
                settings: 'Platform Settings'
            };
            
            const headerTitle = document.querySelector('.header-title');
            if (headerTitle) {
                headerTitle.textContent = titles[section] || 'Dashboard';
            }
        });
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('adminSidebar');
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                console.log('Sidebar toggled');
            }
        });
    }
    
    // Make sure overview section is visible by default
    const overviewSection = document.getElementById('overview-section');
    if (overviewSection) {
        overviewSection.style.display = 'block';
        overviewSection.classList.add('active');
    }
    
    console.log('Simple navigation setup complete');
});