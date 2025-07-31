// New Messaging System JavaScript
const API_BASE_URL = 'http://localhost:3000/api';

// Global state
let currentUser = null;
let conversations = [];
let currentConversation = null;
let messages = [];
let socket = null;
let typingTimeout = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeMessaging();
    connectWebSocket();
});

// Check authentication
async function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('userName').textContent = currentUser.fullName;
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
}

// Initialize messaging system
async function initializeMessaging() {
    await loadConversations();
    setupEventListeners();
}

// Connect to WebSocket for real-time messaging
function connectWebSocket() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        // This would connect to the Socket.io server for real-time messaging
        console.log('WebSocket connection would be established here');
        // socket = io('http://localhost:3000', { auth: { token } });
        
        // Simulate real-time features
        setupMockRealTimeFeatures();
    } catch (error) {
        console.error('WebSocket connection failed:', error);
    }
}

// Setup mock real-time features for demonstration
function setupMockRealTimeFeatures() {
    // Simulate receiving messages every 30 seconds for demo
    setInterval(() => {
        if (Math.random() > 0.7 && conversations.length > 0) {
            simulateIncomingMessage();
        }
    }, 30000);

    // Simulate user typing
    setInterval(() => {
        if (currentConversation && Math.random() > 0.8) {
            showTypingIndicator(currentConversation.name);
        }
    }, 45000);
}

// Load conversations
async function loadConversations() {
    try {
        // Simulate loading conversations - in real app, this would be an API call
        conversations = [
            {
                id: 1,
                name: 'John Doe',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
                lastMessage: 'Thanks for the help with the React project!',
                lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                unread: true,
                online: true,
                userType: 'client'
            },
            {
                id: 2,
                name: 'Sarah Wilson',
                avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612c0c8?w=40&h=40&fit=crop&crop=face',
                lastMessage: 'Can we schedule a mentorship session for next week?',
                lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                unread: false,
                online: false,
                userType: 'mentor'
            },
            {
                id: 3,
                name: 'Alex Johnson',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
                lastMessage: 'The UI designs look great! When can we start development?',
                lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
                unread: true,
                online: true,
                userType: 'freelancer'
            },
            {
                id: 4,
                name: 'Maria Garcia',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
                lastMessage: 'I\'ve completed the course. Could you provide feedback?',
                lastMessageTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                unread: false,
                online: false,
                userType: 'freelancer'
            }
        ];

        displayConversations();
        updateUnreadCount();
    } catch (error) {
        console.error('Error loading conversations:', error);
        document.getElementById('conversationsList').innerHTML = 
            '<div class="text-center py-4"><p class="text-muted">Failed to load conversations</p></div>';
    }
}

// Display conversations in sidebar
function displayConversations(filter = 'all') {
    const container = document.getElementById('conversationsList');
    let filteredConversations = conversations;

    // Apply filters
    switch(filter) {
        case 'unread':
            filteredConversations = conversations.filter(c => c.unread);
            break;
        case 'archived':
            filteredConversations = conversations.filter(c => c.archived);
            break;
    }

    if (filteredConversations.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                <p class="text-muted">No conversations found</p>
                <button class="btn btn-primary btn-sm" onclick="showNewMessageModal()">
                    Start New Conversation
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    filteredConversations.forEach(conversation => {
        const timeAgo = getTimeAgo(conversation.lastMessageTime);
        const unreadClass = conversation.unread ? 'unread' : '';
        const activeClass = currentConversation && currentConversation.id === conversation.id ? 'active' : '';
        
        html += `
            <div class="conversation-item ${unreadClass} ${activeClass}" onclick="selectConversation(${conversation.id})">
                <div class="d-flex align-items-center">
                    <div class="position-relative me-3">
                        <img src="${conversation.avatar}" class="rounded-circle" width="50" height="50" alt="${conversation.name}">
                        <span class="position-absolute bottom-0 end-0 ${conversation.online ? 'online-status' : 'offline-status'}"></span>
                    </div>
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="mb-0 text-truncate">${conversation.name}</h6>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                        <p class="mb-0 text-muted small text-truncate">${conversation.lastMessage}</p>
                        <div class="d-flex justify-content-between align-items-center mt-1">
                            <span class="badge bg-secondary small">${conversation.userType}</span>
                            ${conversation.unread ? '<i class="fas fa-circle text-primary" style="font-size: 8px;"></i>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Select conversation
function selectConversation(conversationId) {
    currentConversation = conversations.find(c => c.id === conversationId);
    if (!currentConversation) return;

    // Mark as read
    currentConversation.unread = false;
    updateUnreadCount();
    displayConversations();

    // Show chat interface
    showChatInterface();
    loadMessages(conversationId);

    // Hide sidebar on mobile
    if (window.innerWidth < 768) {
        document.getElementById('messagesSidebar').classList.remove('show');
    }
}

// Show chat interface
function showChatInterface() {
    // Hide empty state
    document.getElementById('emptyState').style.display = 'none';
    
    // Show chat elements
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('chatMessages').style.display = 'block';
    document.getElementById('messageInputArea').style.display = 'block';

    // Update header info
    document.getElementById('recipientAvatar').src = currentConversation.avatar;
    document.getElementById('recipientName').textContent = currentConversation.name;
    document.getElementById('recipientStatus').textContent = currentConversation.online ? 'Online' : 'Offline';
    document.getElementById('statusIndicator').className = currentConversation.online ? 'online-status' : 'offline-status';
}

// Load messages for conversation
async function loadMessages(conversationId) {
    try {
        // Simulate loading messages - in real app, this would be an API call
        messages = generateMockMessages(conversationId);
        displayMessages();
        scrollToBottom();
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Generate mock messages for demonstration
function generateMockMessages(conversationId) {
    const mockMessages = [
        {
            id: 1,
            senderId: conversationId === 1 ? currentConversation.id : currentUser.id,
            content: 'Hi! I saw your profile and I\'m interested in working with you.',
            timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            type: 'text'
        },
        {
            id: 2,
            senderId: conversationId === 1 ? currentUser.id : currentConversation.id,
            content: 'Thank you for reaching out! I\'d be happy to discuss the project.',
            timestamp: new Date(Date.now() - 55 * 60 * 1000),
            type: 'text'
        },
        {
            id: 3,
            senderId: conversationId === 1 ? currentConversation.id : currentUser.id,
            content: 'Great! Can you tell me more about your experience with React?',
            timestamp: new Date(Date.now() - 50 * 60 * 1000),
            type: 'text'
        },
        {
            id: 4,
            senderId: conversationId === 1 ? currentUser.id : currentConversation.id,
            content: 'I have 5+ years of experience with React and have built several large-scale applications.',
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
            type: 'text'
        },
        {
            id: 5,
            senderId: conversationId === 1 ? currentConversation.id : currentUser.id,
            content: 'That sounds perfect! When can we schedule a call to discuss the project details?',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            type: 'text'
        }
    ];

    return mockMessages;
}

// Display messages
function displayMessages() {
    const container = document.getElementById('chatMessages');
    let html = '';

    messages.forEach(message => {
        const isSent = message.senderId === currentUser.id;
        const messageClass = isSent ? 'sent' : 'received';
        const time = message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        html += `
            <div class="message ${messageClass}">
                ${!isSent ? `<img src="${currentConversation.avatar}" class="rounded-circle me-2" width="32" height="32" alt="User">` : ''}
                <div class="message-content">
                    ${message.content}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Send message
function sendMessage(event) {
    event.preventDefault();
    
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !currentConversation) return;

    // Create new message
    const newMessage = {
        id: messages.length + 1,
        senderId: currentUser.id,
        content: content,
        timestamp: new Date(),
        type: 'text'
    };

    // Add to messages
    messages.push(newMessage);
    
    // Update conversation last message
    currentConversation.lastMessage = content;
    currentConversation.lastMessageTime = new Date();

    // Clear input
    input.value = '';

    // Update display
    displayMessages();
    displayConversations();
    scrollToBottom();

    // Simulate response after delay (for demo)
    setTimeout(() => {
        simulateResponse();
    }, 2000 + Math.random() * 3000);
}

// Simulate incoming message
function simulateIncomingMessage() {
    if (!currentConversation) return;

    const responses = [
        "Thanks for your message!",
        "I'll get back to you soon.",
        "That sounds great!",
        "Let me check and update you.",
        "Perfect! Looking forward to it."
    ];

    const newMessage = {
        id: messages.length + 1,
        senderId: currentConversation.id,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        type: 'text'
    };

    messages.push(newMessage);
    currentConversation.lastMessage = newMessage.content;
    currentConversation.lastMessageTime = new Date();

    displayMessages();
    displayConversations();
    scrollToBottom();
}

// Simulate response
function simulateResponse() {
    const responses = [
        "Thanks for reaching out!",
        "I'll review this and get back to you.",
        "Sounds good to me!",
        "Let me check my schedule.",
        "Great! I'm looking forward to working together."
    ];

    const newMessage = {
        id: messages.length + 1,
        senderId: currentConversation.id,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        type: 'text'
    };

    messages.push(newMessage);
    currentConversation.lastMessage = newMessage.content;
    currentConversation.lastMessageTime = new Date();

    displayMessages();
    displayConversations();
    scrollToBottom();
}

// Handle typing indicator
function handleTyping() {
    // Simulate sending typing indicator to other user
    console.log('User is typing...');
    
    // Clear existing timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Set new timeout
    typingTimeout = setTimeout(() => {
        console.log('User stopped typing');
    }, 3000);
}

// Show typing indicator
function showTypingIndicator(userName) {
    const indicator = document.getElementById('typingIndicator');
    const userSpan = document.getElementById('typingUser');
    
    userSpan.textContent = userName;
    indicator.style.display = 'block';
    
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 3000);
}

// Search conversations
function searchConversations() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    if (!query) {
        displayConversations();
        return;
    }

    const filtered = conversations.filter(conv => 
        conv.name.toLowerCase().includes(query) || 
        conv.lastMessage.toLowerCase().includes(query)
    );

    displayFilteredConversations(filtered);
}

// Display filtered conversations
function displayFilteredConversations(filteredConversations) {
    const container = document.getElementById('conversationsList');
    
    if (filteredConversations.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-search fa-2x text-muted mb-2"></i>
                <p class="text-muted">No conversations found</p>
            </div>
        `;
        return;
    }

    let html = '';
    filteredConversations.forEach(conversation => {
        const timeAgo = getTimeAgo(conversation.lastMessageTime);
        const unreadClass = conversation.unread ? 'unread' : '';
        
        html += `
            <div class="conversation-item ${unreadClass}" onclick="selectConversation(${conversation.id})">
                <div class="d-flex align-items-center">
                    <img src="${conversation.avatar}" class="rounded-circle me-3" width="50" height="50" alt="${conversation.name}">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="mb-0">${conversation.name}</h6>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                        <p class="mb-0 text-muted small">${conversation.lastMessage}</p>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Filter conversations
function filterConversations(filter) {
    // Update active button
    document.querySelectorAll('.btn-group button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    displayConversations(filter);
}

// Show new message modal
function showNewMessageModal() {
    const modal = new bootstrap.Modal(document.getElementById('newMessageModal'));
    modal.show();
}

// Search users for new conversation
async function searchUsers() {
    const query = document.getElementById('userSearchInput').value.toLowerCase();
    const container = document.getElementById('userSearchResults');
    
    if (!query) {
        container.innerHTML = '';
        return;
    }

    // Simulate user search - in real app, this would be an API call
    const mockUsers = [
        { id: 5, name: 'Emma Thompson', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face', userType: 'client' },
        { id: 6, name: 'David Chen', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face', userType: 'mentor' },
        { id: 7, name: 'Lisa Rodriguez', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612c0c8?w=40&h=40&fit=crop&crop=face', userType: 'freelancer' }
    ];

    const filtered = mockUsers.filter(user => 
        user.name.toLowerCase().includes(query)
    );

    let html = '';
    filtered.forEach(user => {
        html += `
            <div class="d-flex align-items-center p-2 border rounded mb-2 user-result" 
                 onclick="startNewConversation(${user.id}, '${user.name}', '${user.avatar}', '${user.userType}')">
                <img src="${user.avatar}" class="rounded-circle me-3" width="40" height="40" alt="${user.name}">
                <div>
                    <h6 class="mb-0">${user.name}</h6>
                    <small class="text-muted">${user.userType}</small>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Start new conversation
function startNewConversation(userId, userName, userAvatar, userType) {
    // Check if conversation already exists
    const existing = conversations.find(c => c.id === userId);
    if (existing) {
        selectConversation(userId);
        bootstrap.Modal.getInstance(document.getElementById('newMessageModal')).hide();
        return;
    }

    // Create new conversation
    const newConversation = {
        id: userId,
        name: userName,
        avatar: userAvatar,
        lastMessage: '',
        lastMessageTime: new Date(),
        unread: false,
        online: Math.random() > 0.5,
        userType: userType
    };

    conversations.unshift(newConversation);
    displayConversations();
    selectConversation(userId);
    
    bootstrap.Modal.getInstance(document.getElementById('newMessageModal')).hide();
}

// Utility functions
function getTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return date.toLocaleDateString();
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

function updateUnreadCount() {
    const unreadCount = conversations.filter(c => c.unread).length;
    document.getElementById('unreadCount').textContent = unreadCount;
}

function toggleSidebar() {
    document.getElementById('messagesSidebar').classList.toggle('show');
}

// Event listeners
function setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            document.getElementById('messagesSidebar').classList.remove('show');
        }
    });

    // Handle enter key in message input
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    });
}

// Attachment and emoji functions (placeholders)
function showAttachmentOptions() {
    const modal = new bootstrap.Modal(document.getElementById('attachmentModal'));
    modal.show();
}

function showEmojiPicker() {
    alert('Emoji picker would be implemented here');
}

function selectFile(type) {
    const fileInput = document.getElementById('fileInput');
    
    switch(type) {
        case 'image':
            fileInput.accept = 'image/*';
            break;
        case 'document':
            fileInput.accept = '.pdf,.doc,.docx,.txt';
            break;
        case 'video':
            fileInput.accept = 'video/*';
            break;
    }
    
    fileInput.click();
    bootstrap.Modal.getInstance(document.getElementById('attachmentModal')).hide();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Simulate file upload
        alert(`File "${file.name}" would be uploaded and sent`);
    }
}

// Action functions (placeholders)
function viewProfile() {
    alert(`View profile for ${currentConversation.name}`);
}

function muteConversation() {
    alert('Conversation muted');
}

function archiveConversation() {
    if (confirm('Archive this conversation?')) {
        currentConversation.archived = true;
        displayConversations();
        alert('Conversation archived');
    }
}

function deleteConversation() {
    if (confirm('Delete this conversation? This action cannot be undone.')) {
        conversations = conversations.filter(c => c.id !== currentConversation.id);
        displayConversations();
        
        // Show empty state
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('chatHeader').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'none';
        document.getElementById('messageInputArea').style.display = 'none';
        
        currentConversation = null;
        alert('Conversation deleted');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}