const certificateService = require('../../services/certificateService');
const fs = require('fs').promises;
const path = require('path');

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        mkdir: jest.fn(),
        writeFile: jest.fn(),
        readFile: jest.fn(),
        readdir: jest.fn()
    }
}));

describe('CertificateService', () => {
    const mockUser = {
        _id: 'user123',
        fullName: 'John Doe',
        email: 'john@example.com'
    };

    const mockCourse = {
        _id: 'course123',
        title: 'JavaScript Fundamentals',
        category: 'Programming',
        estimatedDuration: 40
    };

    const mockUserProgress = {
        _id: 'progress123',
        completedAt: new Date('2024-01-15'),
        overallProgress: 100
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateCertificate', () => {
        it('should generate a certificate with valid data', async () => {
            // Mock file system operations
            fs.mkdir.mockResolvedValue();
            fs.writeFile.mockResolvedValue();

            const result = await certificateService.generateCertificate(mockUser, mockCourse, mockUserProgress);

            expect(result).toHaveProperty('certificateId');
            expect(result).toHaveProperty('certificateUrl');
            expect(result).toHaveProperty('verificationCode');
            expect(result).toHaveProperty('issueDate');

            expect(result.certificateId).toMatch(/^CERT-[A-Z0-9]+-[A-Z0-9]+$/);
            expect(result.certificateUrl).toBe(`/api/certificates/${result.certificateId}/download`);
            expect(result.verificationCode).toHaveLength(32);
            expect(result.issueDate).toBeInstanceOf(Date);

            // Verify file system calls
            expect(fs.mkdir).toHaveBeenCalledWith(
                expect.stringContaining('certificates'),
                { recursive: true }
            );
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining(`${result.certificateId}.json`),
                expect.any(String)
            );
        });

        it('should handle file system errors gracefully', async () => {
            fs.mkdir.mockRejectedValue(new Error('File system error'));

            await expect(
                certificateService.generateCertificate(mockUser, mockCourse, mockUserProgress)
            ).rejects.toThrow('Failed to generate certificate');
        });

        it('should generate unique certificate IDs', async () => {
            fs.mkdir.mockResolvedValue();
            fs.writeFile.mockResolvedValue();

            const result1 = await certificateService.generateCertificate(mockUser, mockCourse, mockUserProgress);
            const result2 = await certificateService.generateCertificate(mockUser, mockCourse, mockUserProgress);

            expect(result1.certificateId).not.toBe(result2.certificateId);
            expect(result1.verificationCode).not.toBe(result2.verificationCode);
        });

        it('should generate valid HTML certificate', async () => {
            fs.mkdir.mockResolvedValue();
            fs.writeFile.mockResolvedValue();

            const result = await certificateService.generateCertificate(mockUser, mockCourse, mockUserProgress);

            // Check that writeFile was called with certificate data
            const writeFileCall = fs.writeFile.mock.calls[0];
            const certificateData = JSON.parse(writeFileCall[1]);

            expect(certificateData.certificateHtml).toContain(mockUser.fullName);
            expect(certificateData.certificateHtml).toContain(mockCourse.title);
            expect(certificateData.certificateHtml).toContain(mockCourse.category);
            expect(certificateData.certificateHtml).toContain(result.certificateId);
            expect(certificateData.certificateHtml).toContain(result.verificationCode);
        });
    });

    describe('verifyCertificate', () => {
        it('should verify a valid certificate', async () => {
            const mockCertificateData = {
                certificateId: 'CERT-123',
                verificationCode: 'VALID123',
                recipientName: 'John Doe',
                courseName: 'JavaScript Fundamentals',
                completionDate: new Date('2024-01-15'),
                issueDate: new Date('2024-01-15')
            };

            fs.readdir.mockResolvedValue(['CERT-123.json']);
            fs.readFile.mockResolvedValue(JSON.stringify(mockCertificateData));

            const result = await certificateService.verifyCertificate('VALID123');

            expect(result).toEqual({
                isValid: true,
                certificateId: 'CERT-123',
                recipientName: 'John Doe',
                courseName: 'JavaScript Fundamentals',
                completionDate: mockCertificateData.completionDate.toISOString(),
                issueDate: mockCertificateData.issueDate.toISOString()
            });
        });

        it('should return null for invalid verification code', async () => {
            fs.readdir.mockResolvedValue(['CERT-123.json']);
            fs.readFile.mockResolvedValue(JSON.stringify({
                verificationCode: 'DIFFERENT123'
            }));

            const result = await certificateService.verifyCertificate('INVALID123');

            expect(result).toBeNull();
        });

        it('should handle file system errors during verification', async () => {
            fs.readdir.mockRejectedValue(new Error('File system error'));

            const result = await certificateService.verifyCertificate('VALID123');

            expect(result).toBeNull();
        });

        it('should handle empty certificate directory', async () => {
            fs.readdir.mockResolvedValue([]);

            const result = await certificateService.verifyCertificate('VALID123');

            expect(result).toBeNull();
        });
    });

    describe('getCertificateById', () => {
        it('should retrieve certificate by ID', async () => {
            const mockCertificateData = {
                certificateId: 'CERT-123',
                certificateHtml: '<html>Certificate content</html>'
            };

            fs.readFile.mockResolvedValue(JSON.stringify(mockCertificateData));

            const result = await certificateService.getCertificateById('CERT-123');

            expect(result).toEqual(mockCertificateData);
            expect(fs.readFile).toHaveBeenCalledWith(
                expect.stringContaining('CERT-123.json'),
                'utf8'
            );
        });

        it('should return null for non-existent certificate', async () => {
            fs.readFile.mockRejectedValue({ code: 'ENOENT' });

            const result = await certificateService.getCertificateById('NONEXISTENT');

            expect(result).toBeNull();
        });

        it('should handle other file system errors', async () => {
            fs.readFile.mockRejectedValue(new Error('Permission denied'));

            const result = await certificateService.getCertificateById('CERT-123');
            expect(result).toBeNull();
        });
    });

    describe('generateCertificateId', () => {
        it('should generate valid certificate ID format', () => {
            const id = certificateService.generateCertificateId();

            expect(id).toMatch(/^CERT-[A-Z0-9]+-[A-Z0-9]+$/);
            expect(id.length).toBeGreaterThan(10);
        });

        it('should generate unique IDs', () => {
            const id1 = certificateService.generateCertificateId();
            const id2 = certificateService.generateCertificateId();

            expect(id1).not.toBe(id2);
        });
    });

    describe('generateVerificationCode', () => {
        it('should generate valid verification code', () => {
            const code = certificateService.generateVerificationCode();

            expect(code).toHaveLength(32);
            expect(code).toMatch(/^[A-F0-9]+$/);
        });

        it('should generate unique codes', () => {
            const code1 = certificateService.generateVerificationCode();
            const code2 = certificateService.generateVerificationCode();

            expect(code1).not.toBe(code2);
        });
    });

    describe('generateCertificateHtml', () => {
        it('should generate valid HTML with all placeholders replaced', () => {
            const certificateData = {
                certificateId: 'CERT-123',
                recipientName: 'John Doe',
                courseName: 'JavaScript Fundamentals',
                courseCategory: 'Programming',
                completionDate: new Date('2024-01-15'),
                issueDate: new Date('2024-01-15'),
                verificationCode: 'VERIFY123',
                courseDuration: 40
            };

            const html = certificateService.generateCertificateHtml(certificateData);

            expect(html).toContain('CERT-123');
            expect(html).toContain('John Doe');
            expect(html).toContain('JavaScript Fundamentals');
            expect(html).toContain('Programming');
            expect(html).toContain('VERIFY123');
            expect(html).toContain('40');
            expect(html).toContain('January 15, 2024');

            // Ensure no placeholders remain
            expect(html).not.toContain('{{');
            expect(html).not.toContain('}}');
        });
    });

    describe('formatDate', () => {
        it('should format dates correctly', () => {
            const date = new Date('2024-01-15');
            const formatted = certificateService.formatDate(date);

            expect(formatted).toBe('January 15, 2024');
        });

        it('should handle different date formats', () => {
            const date1 = certificateService.formatDate('2024-12-25');
            const date2 = certificateService.formatDate(new Date(2024, 5, 1)); // June 1, 2024

            expect(date1).toBe('December 25, 2024');
            expect(date2).toBe('June 1, 2024');
        });
    });
});