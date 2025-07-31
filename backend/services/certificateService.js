const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CertificateService {
    constructor() {
        this.certificateTemplate = this.getDefaultTemplate();
    }

    /**
     * Generate a certificate for a user upon course completion
     * @param {Object} user - User object
     * @param {Object} course - Course object
     * @param {Object} userProgress - UserProgress object
     * @returns {Object} Certificate data with URL and verification code
     */
    async generateCertificate(user, course, userProgress) {
        try {
            // Generate unique certificate ID and verification code
            const certificateId = this.generateCertificateId();
            const verificationCode = this.generateVerificationCode();
            
            // Create certificate data
            const certificateData = {
                certificateId,
                verificationCode,
                recipientName: user.fullName,
                recipientEmail: user.email,
                courseName: course.title,
                courseCategory: course.category,
                courseDuration: course.estimatedDuration,
                completionDate: userProgress.completedAt || new Date(),
                issueDate: new Date(),
                overallProgress: userProgress.overallProgress,
                userId: user._id,
                courseId: course._id,
                userProgressId: userProgress._id
            };

            // Generate certificate HTML
            const certificateHtml = this.generateCertificateHtml(certificateData);
            
            // In a production environment, you would:
            // 1. Convert HTML to PDF using libraries like puppeteer or html-pdf
            // 2. Upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
            // 3. Return the public URL
            
            // For this implementation, we'll simulate the certificate URL
            const certificateUrl = `/api/certificates/${certificateId}/download`;
            
            // Store certificate data (in production, this would be in a database)
            await this.storeCertificateData(certificateId, {
                ...certificateData,
                certificateHtml,
                certificateUrl
            });

            return {
                certificateId,
                certificateUrl,
                verificationCode,
                issueDate: certificateData.issueDate
            };
        } catch (error) {
            console.error('Error generating certificate:', error);
            throw new Error('Failed to generate certificate');
        }
    }

    /**
     * Verify a certificate using its verification code
     * @param {string} verificationCode - Certificate verification code
     * @returns {Object|null} Certificate data if valid, null if invalid
     */
    async verifyCertificate(verificationCode) {
        try {
            // In production, this would query a database
            const certificateData = await this.getCertificateByVerificationCode(verificationCode);
            
            if (!certificateData) {
                return null;
            }

            return {
                isValid: true,
                certificateId: certificateData.certificateId,
                recipientName: certificateData.recipientName,
                courseName: certificateData.courseName,
                completionDate: certificateData.completionDate,
                issueDate: certificateData.issueDate
            };
        } catch (error) {
            console.error('Error verifying certificate:', error);
            return null;
        }
    }

    /**
     * Get certificate by ID for download
     * @param {string} certificateId - Certificate ID
     * @returns {Object|null} Certificate data with HTML content
     */
    async getCertificateById(certificateId) {
        try {
            return await this.getCertificateFromStorage(certificateId);
        } catch (error) {
            console.error('Error retrieving certificate:', error);
            return null;
        }
    }

    /**
     * Generate unique certificate ID
     * @returns {string} Certificate ID
     */
    generateCertificateId() {
        const timestamp = Date.now().toString(36);
        const randomStr = crypto.randomBytes(8).toString('hex');
        return `CERT-${timestamp}-${randomStr}`.toUpperCase();
    }

    /**
     * Generate verification code
     * @returns {string} Verification code
     */
    generateVerificationCode() {
        return crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    /**
     * Generate certificate HTML from template
     * @param {Object} data - Certificate data
     * @returns {string} Certificate HTML
     */
    generateCertificateHtml(data) {
        return this.certificateTemplate
            .replace('{{CERTIFICATE_ID}}', data.certificateId)
            .replace('{{RECIPIENT_NAME}}', data.recipientName)
            .replace('{{COURSE_NAME}}', data.courseName)
            .replace('{{COURSE_CATEGORY}}', data.courseCategory)
            .replace('{{COMPLETION_DATE}}', this.formatDate(data.completionDate))
            .replace('{{ISSUE_DATE}}', this.formatDate(data.issueDate))
            .replace('{{VERIFICATION_CODE}}', data.verificationCode)
            .replace('{{COURSE_DURATION}}', data.courseDuration);
    }

    /**
     * Format date for certificate display
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Store certificate data (simulated - in production use database)
     * @param {string} certificateId - Certificate ID
     * @param {Object} data - Certificate data
     */
    async storeCertificateData(certificateId, data) {
        // In production, this would store in a database
        // For now, we'll use a simple file-based storage simulation
        const certificatesDir = path.join(__dirname, '../certificates');
        
        try {
            await fs.mkdir(certificatesDir, { recursive: true });
            await fs.writeFile(
                path.join(certificatesDir, `${certificateId}.json`),
                JSON.stringify(data, null, 2)
            );
        } catch (error) {
            console.error('Error storing certificate data:', error);
            throw error;
        }
    }

    /**
     * Get certificate data from storage
     * @param {string} certificateId - Certificate ID
     * @returns {Object|null} Certificate data
     */
    async getCertificateFromStorage(certificateId) {
        try {
            const certificatesDir = path.join(__dirname, '../certificates');
            const filePath = path.join(certificatesDir, `${certificateId}.json`);
            
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get certificate by verification code
     * @param {string} verificationCode - Verification code
     * @returns {Object|null} Certificate data
     */
    async getCertificateByVerificationCode(verificationCode) {
        try {
            const certificatesDir = path.join(__dirname, '../certificates');
            const files = await fs.readdir(certificatesDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(certificatesDir, file);
                    const data = await fs.readFile(filePath, 'utf8');
                    const certificateData = JSON.parse(data);
                    
                    if (certificateData.verificationCode === verificationCode) {
                        return certificateData;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error searching for certificate by verification code:', error);
            return null;
        }
    }

    /**
     * Get default certificate template
     * @returns {string} HTML template
     */
    getDefaultTemplate() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkillRise Certificate</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .certificate {
            background: white;
            width: 800px;
            padding: 60px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            position: relative;
            border: 8px solid #f8f9fa;
        }
        .certificate::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 3px solid #667eea;
            border-radius: 10px;
        }
        .header {
            margin-bottom: 40px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .title {
            font-size: 48px;
            color: #2c3e50;
            margin: 30px 0;
            font-weight: normal;
        }
        .subtitle {
            font-size: 18px;
            color: #7f8c8d;
            margin-bottom: 40px;
        }
        .recipient {
            font-size: 36px;
            color: #2c3e50;
            margin: 30px 0;
            font-weight: bold;
            border-bottom: 2px solid #667eea;
            display: inline-block;
            padding-bottom: 10px;
        }
        .course-info {
            font-size: 24px;
            color: #34495e;
            margin: 30px 0;
            line-height: 1.6;
        }
        .course-name {
            font-weight: bold;
            color: #667eea;
        }
        .details {
            display: flex;
            justify-content: space-between;
            margin: 40px 0;
            font-size: 14px;
            color: #7f8c8d;
        }
        .verification {
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 12px;
            color: #6c757d;
        }
        .verification-code {
            font-family: 'Courier New', monospace;
            font-weight: bold;
            color: #495057;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .certificate {
                box-shadow: none;
                border: 2px solid #000;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <div class="logo">SkillRise</div>
            <div class="subtitle">Digital Workforce Development Platform</div>
        </div>
        
        <h1 class="title">Certificate of Completion</h1>
        
        <p class="subtitle">This is to certify that</p>
        
        <div class="recipient">{{RECIPIENT_NAME}}</div>
        
        <p class="subtitle">has successfully completed the course</p>
        
        <div class="course-info">
            <span class="course-name">{{COURSE_NAME}}</span><br>
            <small>Category: {{COURSE_CATEGORY}} | Duration: {{COURSE_DURATION}} hours</small>
        </div>
        
        <div class="details">
            <div>
                <strong>Completion Date:</strong><br>
                {{COMPLETION_DATE}}
            </div>
            <div>
                <strong>Issue Date:</strong><br>
                {{ISSUE_DATE}}
            </div>
            <div>
                <strong>Certificate ID:</strong><br>
                {{CERTIFICATE_ID}}
            </div>
        </div>
        
        <div class="verification">
            <strong>Verification Code:</strong> <span class="verification-code">{{VERIFICATION_CODE}}</span><br>
            <small>Verify this certificate at: skillrise.com/verify</small>
        </div>
    </div>
</body>
</html>`;
    }
}

module.exports = new CertificateService();