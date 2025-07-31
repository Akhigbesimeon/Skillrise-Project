// Debug navigation - run this in browser console to test
function testNavigation() {
    console.log('=== NAVIGATION DEBUG TEST ===');
    
    // Check if sections exist
    const sections = ['overview', 'users', 'analytics', 'moderation', 'courses', 'projects', 'mentorship', 'messages', 'system', 'settings'];
    
    sections.forEach(section => {
        const sectionEl = document.getElementById(section + '-section');
        const navLink = document.querySelector(`.nav-link[data-section="${section}"]`);
        
        console.log(`Section: ${section}`);
        console.log(`  - Section element exists: ${!!sectionEl}`);
        console.log(`  - Nav link exists: ${!!navLink}`);
        
        if (sectionEl) {
            console.log(`  - Section classes: ${sectionEl.className}`);
            console.log(`  - Section display: ${getComputedStyle(sectionEl).display}`);
        }
    });
    
    console.log('=== END DEBUG TEST ===');
}

// Auto-run test after page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(testNavigation, 1000);
});

// Make function available globally
window.testNavigation = testNavigation;