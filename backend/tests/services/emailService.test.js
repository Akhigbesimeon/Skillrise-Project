const emailService = require('../../services/emailService');

// Mock nodemailer
jest.mock('nodemailer', () => ({
    createTransporter: jest.fn(() => ({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({
            messageId: 'mock-message-id',
            response: '250 OK'
        })
    })),
    createTestAccount: jest.fn().mockResolvedValue({
        user: 'test@ethereal.email',
        pass: 'testpassword'
    }),
    getTestMessageUrl: jest.fn().mockReturnValue('https://ethereal.email/message/mock-url')
}));

describe('EmailService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendVerificationEmail', () => {
        it('should send verification email successfully', async () => {
            const email = 'test@example.com';
            const fullName = 'Test User';
            const verificationToken = 'mock-token-123';

            const result = await emailService.sendVerificationEmail(email, fullName, verificationToken);

            expect(result).toBeDefined();
            expect(result.messageId).toBe('mock-message-id');
        });

        it('should include verification URL in email content', async () => {
            const email = 'test@example.com';
            const fullName = 'Test User';
            const verificationToken = 'mock-token-123';
            const expectedUrl = `http://localhost:8080/verify-email?token=${verificationToken}`;

            // Mock the transporter to capture the mail options
            const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
            emailService.transporter = { sendMail: mockSendMail };

            await emailService.sendVerificationEmail(email, fullName, verificationToken);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: email,
                    subject: 'Verify Your SkillRise Account',
                    html: expect.stringContaining(expectedUrl)
                })
            );
        });

        it('should personalize email with user name', async () => {
            const email = 'test@example.com';
            const fullName = 'John Doe';
            const verificationToken = 'mock-token-123';

            const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
            emailService.transporter = { sendMail: mockSendMail };

            await emailService.sendVerificationEmail(email, fullName, verificationToken);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining(`Welcome to SkillRise, ${fullName}!`)
                })
            );
        });

        it('should throw error when email sending fails', async () => {
            const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP Error'));
            emailService.transporter = { sendMail: mockSendMail };

            await expect(
                emailService.sendVerificationEmail('test@example.com', 'Test User', 'token')
            ).rejects.toThrow('Failed to send verification email');
        });
    });

    describe('sendPasswordResetEmail', () => {
        it('should send password reset email successfully', async () => {
            const email = 'test@example.com';
            const fullName = 'Test User';
            const resetToken = 'reset-token-123';

            const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
            emailService.transporter = { sendMail: mockSendMail };

            const result = await emailService.sendPasswordResetEmail(email, fullName, resetToken);

            expect(result).toBeDefined();
            expect(result.messageId).toBe('test-id');
        });

        it('should include reset URL in email content', async () => {
            const email = 'test@example.com';
            const fullName = 'Test User';
            const resetToken = 'reset-token-123';
            const expectedUrl = `http://localhost:8080/reset-password?token=${resetToken}`;

            const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
            emailService.transporter = { sendMail: mockSendMail };

            await emailService.sendPasswordResetEmail(email, fullName, resetToken);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: email,
                    subject: 'Reset Your SkillRise Password',
                    html: expect.stringContaining(expectedUrl)
                })
            );
        });

        it('should personalize email with user name', async () => {
            const email = 'test@example.com';
            const fullName = 'Jane Smith';
            const resetToken = 'reset-token-123';

            const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
            emailService.transporter = { sendMail: mockSendMail };

            await emailService.sendPasswordResetEmail(email, fullName, resetToken);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    html: expect.stringContaining(`Hello ${fullName}`)
                })
            );
        });

        it('should throw error when email sending fails', async () => {
            const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP Error'));
            emailService.transporter = { sendMail: mockSendMail };

            await expect(
                emailService.sendPasswordResetEmail('test@example.com', 'Test User', 'token')
            ).rejects.toThrow('Failed to send password reset email');
        });
    });
});