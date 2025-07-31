require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Database connection
const connectDB = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const projectRoutes = require('./routes/projects');
const mentorshipRoutes = require('./routes/mentorship');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const certificateRoutes = require('./routes/certificates');
const notificationRoutes = require('./routes/notifications');
const moderationRoutes = require('./routes/moderation');
const monitoringRoutes = require('./routes/monitoring');
const { SystemMonitoringService } = require('./services/systemMonitoringService');
const notificationService = require('./services/notificationService');
const systemMonitoringService = new SystemMonitoringService();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:8080"
        ],
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;

// Validate required environment variables
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required');
    process.exit(1);
}

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('../frontend'));

// Make io accessible to routes
app.set('io', io);

// Set up Socket.IO for services
notificationService.setSocketIO(io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Admin creation moved to scripts/create-admin.js - use npm run create-admin

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
    });
});

// WebSocket authentication middleware
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        if (!process.env.JWT_SECRET) {
            return next(new Error('JWT_SECRET not configured'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const User = require('./models/User');
        const user = await User.findById(decoded.id);
        
        if (!user || !user.isActive) {
            return next(new Error('Authentication error'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
};

// Socket.IO connection handling
io.use(authenticateSocket);

io.on('connection', (socket) => {
    console.log(`User ${socket.user.fullName} connected`);
    
    // Join user to their personal room
    socket.join(`user_${socket.userId}`);
    
    // Handle joining project rooms
    socket.on('join_project', (projectId) => {
        socket.join(`project_${projectId}`);
        console.log(`User ${socket.userId} joined project ${projectId}`);
    });
    
    // Handle joining mentorship rooms
    socket.on('join_mentorship', (mentorshipId) => {
        socket.join(`mentorship_${mentorshipId}`);
        console.log(`User ${socket.userId} joined mentorship ${mentorshipId}`);
    });
    
    // Handle typing indicators
    socket.on('typing_start', (data) => {
        socket.to(`user_${data.recipientId}`).emit('user_typing', {
            userId: socket.userId,
            userName: socket.user.fullName,
            isTyping: true
        });
    });
    
    socket.on('typing_stop', (data) => {
        socket.to(`user_${data.recipientId}`).emit('user_typing', {
            userId: socket.userId,
            userName: socket.user.fullName,
            isTyping: false
        });
    });
    
    // Handle message read receipts
    socket.on('message_read', (data) => {
        socket.to(`user_${data.senderId}`).emit('message_read_receipt', {
            messageId: data.messageId,
            readBy: socket.userId,
            readAt: new Date()
        });
    });
    
    // Handle user status updates
    socket.on('status_update', (status) => {
        socket.broadcast.emit('user_status_change', {
            userId: socket.userId,
            status: status,
            timestamp: new Date()
        });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User ${socket.user.fullName} disconnected`);
        
        // Notify others that user is offline
        socket.broadcast.emit('user_status_change', {
            userId: socket.userId,
            status: 'offline',
            timestamp: new Date()
        });
    });
    
    // Handle errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: {
            code: 'SERVER_ERROR',
            message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
            timestamp: new Date().toISOString()
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Route not found',
            timestamp: new Date().toISOString()
        }
    });
});

// Start server
server.listen(port, () => {
    console.log(`SkillRise server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Start system monitoring after a short delay to ensure DB is connected
    setTimeout(() => {
        try {
            systemMonitoringService.startMonitoring(300000); // Monitor every 5 minutes
            console.log('System monitoring started');
        } catch (error) {
            console.log('System monitoring failed to start:', error.message);
        }
    }, 3000); // 3 second delay
    
    // Cleanup old metrics daily
    setInterval(() => {
        try {
            systemMonitoringService.cleanupOldMetrics(30);
        } catch (error) {
            console.log('Metrics cleanup failed:', error.message);
        }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
});
