const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixAdmin() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');

        // Find and delete the corrupted admin user
        console.log('🗑️ Removing corrupted admin user...');
        await User.deleteOne({ email: 'admin@skillrise.com' });
        console.log('✅ Corrupted admin user removed');

        // Create a fresh admin user with correct data
        console.log('👤 Creating fresh admin user...');
        const adminData = {
            fullName: 'System Administrator',
            email: 'admin@skillrise.com',
            passwordHash: 'admin123', // Will be hashed by pre-save middleware
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
        console.log('✅ Fresh admin user created successfully!');

        // Verify the new admin user
        console.log('🔍 Verifying new admin user...');
        const verifyAdmin = await User.findByEmail('admin@skillrise.com');
        console.log('📧 Email:', verifyAdmin.email);
        console.log('👤 Full Name:', verifyAdmin.fullName);
        console.log('🔐 User Type:', verifyAdmin.userType);
        console.log('✔️ Verified:', verifyAdmin.isVerified);

        // Test password
        console.log('🔑 Testing password...');
        const isPasswordValid = await verifyAdmin.comparePassword('admin123');
        console.log('Password test result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');

        console.log('');
        console.log('🎯 Admin Login Credentials:');
        console.log('📧 Email: admin@skillrise.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 Admin URL: http://localhost:3000/admin.html');
        console.log('');
        console.log('✅ Admin user is ready for login!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

fixAdmin();