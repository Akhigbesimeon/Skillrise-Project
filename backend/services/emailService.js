const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    async initializeTransporter() {
        try {
            // Check if Gmail credentials are provided
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS && 
                process.env.EMAIL_USER !== 'your-email@gmail.com' && 
                process.env.EMAIL_PASS !== 'your-16-character-app-password') {
                
                // Use Gmail configuration
                this.transporter = nodemailer.createTransport({
                    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                    port: parseInt(process.env.EMAIL_PORT) || 587,
                    secure: process.env.EMAIL_SECURE === 'true' || false,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                console.log('Using Gmail configuration for email service');
            } else {
                // Development: Use Ethereal Email for testing
                console.log('Gmail not configured, using Ethereal Email for testing');
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
            }

            // Verify transporter configuration
            await this.transporter.verify();
            console.log('Email service initialized successfully');
        } catch (error) {
            console.error('Email service initialization failed:', error);
            // Create a mock transporter for development if email fails
            this.transporter = {
                sendMail: async (mailOptions) => {
                    console.log('Mock email sent:', mailOptions);
                    return { messageId: 'mock-message-id' };
                }
            };
        }
    }

    async sendVerificationEmail(email, fullName, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: `${process.env.EMAIL_FROM_NAME || 'SkillRise Platform'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@skillrise.com'}>`,
            to: email,
            subject: 'Verify Your SkillRise Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0d6efd;">Welcome to SkillRise, ${fullName}!</h2>
                    <p>Thank you for registering with SkillRise. To complete your registration, please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #0d6efd; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    
                    <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                    
                    <p style="margin-top: 30px; font-size: 14px; color: #666;">
                        This verification link will expire in 24 hours. If you didn't create an account with SkillRise, please ignore this email.
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        SkillRise Platform - Digital Workforce Development
                    </p>
                </div>
            `
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Verification email sent:', result.messageId);
            
            // Log preview URL for development
            if (process.env.NODE_ENV !== 'production') {
                console.log('Preview URL:', nodemailer.getTestMessageUrl(result));
            }
            
            return result;
        } catch (error) {
            console.error('Failed to send verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }

    async sendPasswordResetEmail(email, fullName, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: `${process.env.EMAIL_FROM_NAME || 'SkillRise Platform'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@skillrise.com'}>`,
            to: email,
            subject: 'Reset Your SkillRise Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0d6efd;">Password Reset Request</h2>
                    <p>Hello ${fullName},</p>
                    <p>We received a request to reset your password for your SkillRise account. Click the button below to reset your password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                    
                    <p style="margin-top: 30px; font-size: 14px; color: #666;">
                        This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        SkillRise Platform - Digital Workforce Development
                    </p>
                </div>
            `
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent:', result.messageId);
            
            // Log preview URL for development
            if (process.env.NODE_ENV !== 'production') {
                console.log('Preview URL:', nodemailer.getTestMessageUrl(result));
            }
            
            return result;
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }
}

module.exports = new EmailService();