const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    try {
        console.log('🔄 Testing MongoDB connection...');
        console.log('Connection string exists:', !!process.env.MONGODB_URI);
        
        // Try to connect with a shorter timeout
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 10000, // 10 second socket timeout
        });
        
        console.log('✅ MongoDB connection successful!');
        
        // Test a simple query
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📊 Available collections:', collections.map(c => c.name));
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('ENOTFOUND')) {
            console.log('🌐 DNS resolution failed - check internet connection');
        } else if (error.message.includes('authentication failed')) {
            console.log('🔐 Authentication failed - check username/password in connection string');
        } else if (error.message.includes('timeout')) {
            console.log('⏰ Connection timeout - check network or MongoDB Atlas status');
        }
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

testConnection();