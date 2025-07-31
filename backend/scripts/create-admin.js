const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createAdminUser() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        console.log('Connection string:', process.env.MONGODB_URI ? 'Found' : 'Missing');
        
        // Connect to MongoDB with timeout
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            socketTimeoutMS: 45000, // 45 second socket timeout
        });
        console.log('✅ Connected to MongoDB successfully!');

        // Check if admin already exists
        console.log('🔍 Checking for existing admin user...');
        const existingAdmin = await User.findOne({ email: 'admin@skillrise.com' });
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists!');
            console.log('📧 Email: admin@skillrise.com');
            console.log('🌐 Access: http://localhost:3000/admin.html');
            console.log('💡 You can use this account to access the admin dashboard.');
            return;
        }

        // Create admin user - note: using passwordHash field as per User model
        console.log('👤 Creating new admin user...');
        const adminData = {
            fullName: 'System Administrator',
            email: 'admin@skillrise.com',
            passwordHash: 'admin123', // This will be hashed by the pre-save middleware
            userType: 'admin',
            isVerified: true,
            bio: 'System administrator for SkillRise platform',
            location: 'System',
            freelancerProfile: {
                skills: ['System Administration', 'Platform Management'],
                experienceLevel: 'advanced',
                hourlyRate: 0,
                availability: 'available'
            }
        };

        const admin = new User(adminData);
        await admin.save();

        console.log('');
        console.log('🎉 Admin user created successfully!');
        console.log('📧 Email: admin@skillrise.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 Access: http://localhost:3000/admin.html');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password after first login!');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error creating admin user:');
        if (error.name === 'MongoServerSelectionError') {
            console.error('🔌 Database connection failed. Please check:');
            console.error('   - MongoDB Atlas cluster is running');
            console.error('   - Network connection is stable');
            console.error('   - IP address is whitelisted in MongoDB Atlas');
            console.error('   - Connection string is correct in .env file');
        } else if (error.name === 'ValidationError') {
            console.error('📝 Validation error:', error.message);
        } else {
            console.error('🐛 Unexpected error:', error.message);
        }
        console.error('');
        console.error('Full error details:', error);
    } finally {
        try {
            await mongoose.disconnect();
            console.log('🔌 Disconnected from MongoDB');
        } catch (disconnectError) {
            console.error('Error disconnecting:', disconnectError.message);
        }
        process.exit(0);
    }
}

// Run the script
createAdminUser();