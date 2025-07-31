const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkAdmin() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        console.log('🔍 Looking for admin user...');
        const admin = await User.findByEmail('admin@skillrise.com');
        
        if (!admin) {
            console.log('❌ Admin user not found');
            console.log('Creating admin user now...');
            
            // Create admin user
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

            const newAdmin = new User(adminData);
            await newAdmin.save();
            console.log('✅ Admin user created successfully!');
        } else {
            console.log('✅ Admin user found!');
            console.log('📧 Email:', admin.email);
            console.log('👤 Full Name:', admin.fullName);
            console.log('🔐 User Type:', admin.userType);
            console.log('✔️ Verified:', admin.isVerified);
            
            // Test password comparison
            console.log('🔑 Testing password...');
            const isPasswordValid = await admin.comparePassword('admin123');
            console.log('Password test result:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
            
            if (!isPasswordValid) {
                console.log('🔧 Updating password...');
                admin.passwordHash = 'admin123';
                await admin.save();
                console.log('✅ Password updated!');
            }
        }

        console.log('');
        console.log('🎯 Admin Login Credentials:');
        console.log('📧 Email: admin@skillrise.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 Admin URL: http://localhost:3000/admin.html');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

checkAdmin();