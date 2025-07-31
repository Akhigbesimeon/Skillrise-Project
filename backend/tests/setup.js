// Test setup file
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test environment
process.env.NODE_ENV = 'test';

// Set JWT secrets for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';

// Disable email sending in tests
process.env.EMAIL_HOST = '';
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';

let mongoServer;

// Mock console.log to reduce test output noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(async () => {
    // Suppress console.log in tests unless explicitly needed
    console.log = jest.fn();
    // Keep console.error for debugging
    console.error = originalConsoleError;
    
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Set the test database URI
    process.env.MONGODB_TEST_URI = mongoUri;
});

afterAll(async () => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Stop in-memory MongoDB server
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Global test utilities
global.testUtils = {
    createValidUser: (overrides = {}) => ({
        email: 'test@example.com',
        passwordHash: 'TestPass123',
        fullName: 'Test User',
        userType: 'freelancer',
        ...overrides
    }),
    
    createValidRegistrationData: (overrides = {}) => ({
        email: 'test@example.com',
        password: 'TestPass123',
        fullName: 'Test User',
        userType: 'freelancer',
        ...overrides
    })
};