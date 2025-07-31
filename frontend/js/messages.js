// Messages functionality
class MessagesApp {
    constructor() {
        this.socket = null;
        this.currentConversation = null;
        this.conversations = [];
        this.typingTimeout = null;
        this.isTyping = false;
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!checkAuth()) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize Socket.IO
        this.initSocket();
        
        // Load conversations
        await this.loadConversations();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update user info in navigation
        this.updateNavigation();
    }

    initSocket() {
        const token = localStorage.getItem('token');
        this.socket = io('http://localhost:3000', {
            auth: {
                token: token
            }
        });

        // Socket event listeners
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data.message);
        });

        this.socket.on('message_sent', (data) => {
            this.handleMessageSent(data.message);
        });

        this.socket.on('messages_read', (data) => {
            this.handleMessagesRead(data);
        });

        this.socket.on('user_typing', (data) => {
            this.handleTypingIndicator(data);
        });

        this.socket.on('user_status_change', (data) => {
            this.handleUserStatusChange(data);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/messages/conversations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.conversations = data.data;
                this.renderConversations();
            } else {
                throw new Error('Failed to load conversations');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            showAlert('Failed to load conversations', 'danger');
        }
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="p-3 text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>No conversations yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.conversations.map(conv => {
            const lastMessage = conv.lastMessage;
            const otherUser = conv.otherUser;
            const timeAgo = this.formatTimeAgo(lastMessage.createdAt);
            
            return `
                <div class="list-group-item conversation-item" onclick="messagesApp.selectConversation('${otherUser._id}')">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="mb-1">${otherUser.fullName}</h6>
                                <small class="text-muted">${timeAgo}</small>
                            </div>
                            <p class="mb-1 text-truncate">${lastMessage.content}</p>
                            <small class="text-muted">${otherUser.userType}</small>
                        </div>
                        ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async selectConversation(userId) {
        this.currentConversation = userId;
        
        // Update UI
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        // Load conversation messages
        await this.loadConversationMessages(userId);
        
        // Mark messages as read
        await this.markMessagesAsRead(userId);
        
        // Show message form
        document.getElementById('messageForm').style.display = 'block';
        
        // Update chat header
        const otherUser = this.conversations.find(c => c.otherUser._id === userId)?.otherUser;
        if (otherUser) {
            document.getElementById('chatTitle').textContent = otherUser.fullName;
            document.getElementById('chatSubtitle').textContent = otherUser.userType;
        }
    }

    async loadConversationMessages(userId) {
        try {
            const response = await fetch(`/api/messages/conversation/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.data);
            } else {
                throw new Error('Failed to load messages');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            showAlert('Failed to load messages', 'danger');
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        const currentUserId = JSON.parse(localStorage.getItem('user')).id;
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-comments fa-3x mb-3"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(message => {
            const isSent = message.senderId._id === currentUserId;
            const messageClass = isSent ? 'sent' : 'received';
            const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="message ${messageClass}">
                    <div class="message-bubble">
                        <div class="message-content">${this.escapeHtml(message.content)}</div>
                        <div class="message-time">${timeFormatted}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentConversation) return;

        try {
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recipientId: this.currentConversation,
                    content: content
                })
            });

            if (response.ok) {
                input.value = '';
                // Message will be added via Socket.IO event
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showAlert('Failed to send message', 'danger');
        }
    }

    async markMessagesAsRead(userId) {
        try {
            await fetch(`/api/messages/read/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    handleNewMessage(message) {
        // If this message is for the current conversation, add it to the chat
        if (this.currentConversation && 
            (message.senderId._id === this.currentConversation || 
             message.recipientId._id === this.currentConversation)) {
            this.addMessageToChat(message);
        }
        
        // Update conversations list
        this.loadConversations();
        
        // Show notification if not in current conversation
        if (!this.currentConversation || message.senderId._id !== this.currentConversation) {
            this.showMessageNotification(message);
        }
    }

    handleMessageSent(message) {
        // Add sent message to current conversation
        if (this.currentConversation && message.recipientId._id === this.currentConversation) {
            this.addMessageToChat(message);
        }
        
        // Update conversations list
        this.loadConversations();
    }

    addMessageToChat(message) {
        const container = document.getElementById('messagesContainer');
        const currentUserId = JSON.parse(localStorage.getItem('user')).id;
        const isSent = message.senderId._id === currentUserId;
        const messageClass = isSent ? 'sent' : 'received';
        const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        const messageElement = document.createElement('div');
        messageElement.className = `message ${messageClass}`;
        messageElement.innerHTML = `
            <div class="message-bubble">
                <div class="message-content">${this.escapeHtml(message.content)}</div>
                <div class="message-time">${timeFormatted}</div>
            </div>
        `;

        container.appendChild(messageElement);
        container.scrollTop = container.scrollHeight;
    }

    handleMessagesRead(data) {
        // Update UI to show messages as read
        console.log('Messages read by:', data.readByName);
    }

    handleTypingIndicator(data) {
        if (data.userId === this.currentConversation) {
            const indicator = document.getElementById('typingIndicator');
            if (data.isTyping) {
                indicator.textContent = `${data.userName} is typing...`;
                indicator.style.display = 'block';
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    handleUserStatusChange(data) {
        // Update online status indicators
        console.log('User status change:', data);
    }

    showMessageNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${message.senderId.fullName}`, {
                body: message.content.substring(0, 100),
                icon: '/favicon.ico'
            });
        }
    }

    setupEventListeners() {
        // Message form submission
        document.getElementById('messageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Typing indicators
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', () => {
            if (!this.isTyping && this.currentConversation) {
                this.isTyping = true;
                this.socket.emit('typing_start', { recipientId: this.currentConversation });
            }

            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                if (this.isTyping && this.currentConversation) {
                    this.isTyping = false;
                    this.socket.emit('typing_stop', { recipientId: this.currentConversation });
                }
            }, 1000);
        });

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    updateNavigation() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            document.getElementById('navUserName').textContent = user.fullName;
        }
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions
function startNewConversation() {
    const modal = new bootstrap.Modal(document.getElementById('newConversationModal'));
    modal.show();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Initialize app when DOM is loaded
let messagesApp;
document.addEventListener('DOMContentLoaded', () => {
    messagesApp = new MessagesApp();
});