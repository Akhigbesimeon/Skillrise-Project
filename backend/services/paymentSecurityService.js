const crypto = require('crypto');
const validator = require('validator');

class PaymentSecurityService {
    constructor() {
        this.encryptionKey = process.env.PAYMENT_ENCRYPTION_KEY || this.generateEncryptionKey();
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        
        // PCI DSS compliance settings
        this.pciCompliance = {
            encryptCardData: true,
            tokenizeCards: true,
            logPaymentEvents: true,
            validateCardNumbers: true,
            maskSensitiveData: true
        };
        
        // Fraud detection thresholds
        this.fraudThresholds = {
            maxDailyAmount: 10000, // $10,000
            maxTransactionAmount: 5000, // $5,000
            maxFailedAttempts: 3,
            suspiciousVelocity: 5, // 5 transactions in 10 minutes
            velocityWindow: 10 * 60 * 1000 // 10 minutes
        };
        
        this.recentTransactions = new Map(); // In-memory storage for fraud detection
    }
    
    // Generate encryption key for payment data
    generateEncryptionKey() {
        return crypto.randomBytes(this.keyLength).toString('hex');
    }
    
    // Encrypt sensitive payment data
    encryptPaymentData(data) {
        try {
            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
            cipher.setAAD(Buffer.from('payment-data'));
            
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                tag: tag.toString('hex')
            };
            
        } catch (error) {
            console.error('Error encrypting payment data:', error);
            throw new Error('Failed to encrypt payment data');
        }
    }
    
    // Decrypt sensitive payment data
    decryptPaymentData(encryptedData) {
        try {
            const { encrypted, iv, tag } = encryptedData;
            
            const decipher = crypto.createDecipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
            decipher.setAAD(Buffer.from('payment-data'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
            
        } catch (error) {
            console.error('Error decrypting payment data:', error);
            throw new Error('Failed to decrypt payment data');
        }
    }
    
    // Validate credit card number using Luhn algorithm
    validateCardNumber(cardNumber) {
        try {
            // Remove spaces and dashes
            const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
            
            // Check if it's all digits
            if (!/^\d+$/.test(cleanCardNumber)) {
                return { isValid: false, error: 'Card number must contain only digits' };
            }
            
            // Check length
            if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
                return { isValid: false, error: 'Invalid card number length' };
            }
            
            // Luhn algorithm validation
            let sum = 0;
            let isEven = false;
            
            for (let i = cleanCardNumber.length - 1; i >= 0; i--) {
                let digit = parseInt(cleanCardNumber[i]);
                
                if (isEven) {
                    digit *= 2;
                    if (digit > 9) {
                        digit -= 9;
                    }
                }
                
                sum += digit;
                isEven = !isEven;
            }
            
            const isValid = sum % 10 === 0;
            
            if (!isValid) {
                return { isValid: false, error: 'Invalid card number' };
            }
            
            // Determine card type
            const cardType = this.determineCardType(cleanCardNumber);
            
            return {
                isValid: true,
                cardType,
                maskedNumber: this.maskCardNumber(cleanCardNumber)
            };
            
        } catch (error) {
            console.error('Error validating card number:', error);
            return { isValid: false, error: 'Card validation failed' };
        }
    }
    
    // Determine card type from number
    determineCardType(cardNumber) {
        const patterns = {
            visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
            mastercard: /^5[1-5][0-9]{14}$/,
            amex: /^3[47][0-9]{13}$/,
            discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
            diners: /^3[0689][0-9]{11}$/,
            jcb: /^(?:2131|1800|35\d{3})\d{11}$/
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(cardNumber)) {
                return type;
            }
        }
        
        return 'unknown';
    }
    
    // Mask card number for display
    maskCardNumber(cardNumber) {
        if (cardNumber.length <= 4) {
            return cardNumber;
        }
        
        const lastFour = cardNumber.slice(-4);
        const masked = '*'.repeat(cardNumber.length - 4);
        
        return masked + lastFour;
    }
    
    // Validate CVV
    validateCVV(cvv, cardType) {
        if (!cvv || !/^\d+$/.test(cvv)) {
            return { isValid: false, error: 'CVV must contain only digits' };
        }
        
        const expectedLength = cardType === 'amex' ? 4 : 3;
        
        if (cvv.length !== expectedLength) {
            return { 
                isValid: false, 
                error: `CVV must be ${expectedLength} digits for ${cardType} cards` 
            };
        }
        
        return { isValid: true };
    }
    
    // Validate expiry date
    validateExpiryDate(month, year) {
        try {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            
            const expMonth = parseInt(month);
            const expYear = parseInt(year);
            
            // Validate month
            if (expMonth < 1 || expMonth > 12) {
                return { isValid: false, error: 'Invalid expiry month' };
            }
            
            // Validate year (support both 2-digit and 4-digit years)
            let fullYear = expYear;
            if (expYear < 100) {
                fullYear = 2000 + expYear;
            }
            
            if (fullYear < currentYear) {
                return { isValid: false, error: 'Card has expired' };
            }
            
            if (fullYear === currentYear && expMonth < currentMonth) {
                return { isValid: false, error: 'Card has expired' };
            }
            
            // Check if expiry is too far in the future (more than 10 years)
            if (fullYear > currentYear + 10) {
                return { isValid: false, error: 'Invalid expiry year' };
            }
            
            return { isValid: true };
            
        } catch (error) {
            console.error('Error validating expiry date:', error);
            return { isValid: false, error: 'Invalid expiry date format' };
        }
    }
    
    // Tokenize card data for secure storage
    tokenizeCard(cardData) {
        try {
            const token = crypto.randomBytes(16).toString('hex');
            const encryptedData = this.encryptPaymentData({
                cardNumber: cardData.cardNumber,
                expiryMonth: cardData.expiryMonth,
                expiryYear: cardData.expiryYear,
                cardholderName: cardData.cardholderName
            });
            
            return {
                token,
                encryptedData,
                maskedNumber: this.maskCardNumber(cardData.cardNumber),
                cardType: this.determineCardType(cardData.cardNumber),
                expiryMonth: cardData.expiryMonth,
                expiryYear: cardData.expiryYear
            };
            
        } catch (error) {
            console.error('Error tokenizing card:', error);
            throw new Error('Failed to tokenize card data');
        }
    }
    
    // Validate payment amount
    validatePaymentAmount(amount, currency = 'USD') {
        try {
            const numAmount = parseFloat(amount);
            
            if (isNaN(numAmount) || numAmount <= 0) {
                return { isValid: false, error: 'Invalid payment amount' };
            }
            
            if (numAmount > this.fraudThresholds.maxTransactionAmount) {
                return { 
                    isValid: false, 
                    error: `Amount exceeds maximum transaction limit of $${this.fraudThresholds.maxTransactionAmount}`,
                    requiresApproval: true
                };
            }
            
            // Check for decimal places (max 2 for most currencies)
            const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
            }
            
            return { isValid: true, amount: numAmount };
            
        } catch (error) {
            console.error('Error validating payment amount:', error);
            return { isValid: false, error: 'Invalid amount format' };
        }
    }
    
    // Fraud detection for transactions
    async detectFraud(transactionData) {
        try {
            const fraudScore = 0;\n            const fraudReasons = [];\n            const userId = transactionData.userId;\n            const amount = parseFloat(transactionData.amount);\n            const ip = transactionData.ip;\n            \n            // Check transaction velocity\n            const velocityCheck = this.checkTransactionVelocity(userId, amount);\n            if (velocityCheck.isSuspicious) {\n                fraudScore += 30;\n                fraudReasons.push('High transaction velocity detected');\n            }\n            \n            // Check daily spending limit\n            const dailySpending = this.getDailySpending(userId);\n            if (dailySpending + amount > this.fraudThresholds.maxDailyAmount) {\n                fraudScore += 40;\n                fraudReasons.push('Daily spending limit exceeded');\n            }\n            \n            // Check for unusual amounts (round numbers, very specific amounts)\n            if (this.isUnusualAmount(amount)) {\n                fraudScore += 10;\n                fraudReasons.push('Unusual transaction amount pattern');\n            }\n            \n            // Check IP geolocation (if available)\n            const geoCheck = await this.checkGeolocation(ip, userId);\n            if (geoCheck.isSuspicious) {\n                fraudScore += 25;\n                fraudReasons.push('Transaction from unusual location');\n            }\n            \n            // Check time of transaction\n            const timeCheck = this.checkTransactionTime();\n            if (timeCheck.isSuspicious) {\n                fraudScore += 15;\n                fraudReasons.push('Transaction at unusual time');\n            }\n            \n            // Determine risk level\n            let riskLevel = 'low';\n            if (fraudScore >= 70) {\n                riskLevel = 'high';\n            } else if (fraudScore >= 40) {\n                riskLevel = 'medium';\n            }\n            \n            return {\n                fraudScore,\n                riskLevel,\n                fraudReasons,\n                requiresReview: fraudScore >= 40,\n                shouldBlock: fraudScore >= 70\n            };\n            \n        } catch (error) {\n            console.error('Error in fraud detection:', error);\n            return {\n                fraudScore: 100,\n                riskLevel: 'high',\n                fraudReasons: ['Fraud detection system error'],\n                requiresReview: true,\n                shouldBlock: true\n            };\n        }\n    }\n    \n    // Check transaction velocity\n    checkTransactionVelocity(userId, amount) {\n        const now = Date.now();\n        const windowStart = now - this.fraudThresholds.velocityWindow;\n        \n        if (!this.recentTransactions.has(userId)) {\n            this.recentTransactions.set(userId, []);\n        }\n        \n        const userTransactions = this.recentTransactions.get(userId);\n        \n        // Remove old transactions\n        const recentTxns = userTransactions.filter(txn => txn.timestamp > windowStart);\n        \n        // Add current transaction\n        recentTxns.push({ amount, timestamp: now });\n        \n        // Update stored transactions\n        this.recentTransactions.set(userId, recentTxns);\n        \n        return {\n            isSuspicious: recentTxns.length > this.fraudThresholds.suspiciousVelocity,\n            transactionCount: recentTxns.length\n        };\n    }\n    \n    // Get daily spending for user\n    getDailySpending(userId) {\n        const today = new Date();\n        today.setHours(0, 0, 0, 0);\n        \n        if (!this.recentTransactions.has(userId)) {\n            return 0;\n        }\n        \n        const userTransactions = this.recentTransactions.get(userId);\n        const todayTransactions = userTransactions.filter(txn => \n            new Date(txn.timestamp) >= today\n        );\n        \n        return todayTransactions.reduce((sum, txn) => sum + txn.amount, 0);\n    }\n    \n    // Check if amount is unusual\n    isUnusualAmount(amount) {\n        // Check for very round numbers (might indicate testing)\n        if (amount % 100 === 0 && amount >= 1000) {\n            return true;\n        }\n        \n        // Check for very specific amounts (might indicate fraud)\n        const decimalPart = amount % 1;\n        if (decimalPart > 0 && decimalPart.toString().length > 4) {\n            return true;\n        }\n        \n        return false;\n    }\n    \n    // Check geolocation (placeholder - would integrate with IP geolocation service)\n    async checkGeolocation(ip, userId) {\n        try {\n            // In a real implementation, this would:\n            // 1. Get IP geolocation\n            // 2. Compare with user's usual locations\n            // 3. Check for VPN/proxy usage\n            // 4. Validate against known fraud IP ranges\n            \n            // For now, return low risk\n            return {\n                isSuspicious: false,\n                country: 'US',\n                isVPN: false\n            };\n            \n        } catch (error) {\n            console.error('Error checking geolocation:', error);\n            return { isSuspicious: true, error: 'Geolocation check failed' };\n        }\n    }\n    \n    // Check transaction time\n    checkTransactionTime() {\n        const now = new Date();\n        const hour = now.getHours();\n        \n        // Flag transactions between 2 AM and 6 AM as potentially suspicious\n        const isSuspicious = hour >= 2 && hour <= 6;\n        \n        return {\n            isSuspicious,\n            hour,\n            reason: isSuspicious ? 'Transaction during unusual hours' : null\n        };\n    }\n    \n    // Secure payment processing\n    async processPayment(paymentData) {\n        try {\n            // Validate all payment data\n            const validations = await this.validatePaymentData(paymentData);\n            if (!validations.isValid) {\n                return {\n                    success: false,\n                    error: validations.errors.join(', '),\n                    code: 'VALIDATION_FAILED'\n                };\n            }\n            \n            // Fraud detection\n            const fraudCheck = await this.detectFraud(paymentData);\n            if (fraudCheck.shouldBlock) {\n                return {\n                    success: false,\n                    error: 'Transaction blocked due to fraud detection',\n                    code: 'FRAUD_DETECTED',\n                    fraudReasons: fraudCheck.fraudReasons\n                };\n            }\n            \n            // Log payment attempt\n            this.logPaymentEvent('PAYMENT_ATTEMPT', paymentData.userId, {\n                amount: paymentData.amount,\n                currency: paymentData.currency,\n                fraudScore: fraudCheck.fraudScore,\n                riskLevel: fraudCheck.riskLevel\n            });\n            \n            // Process payment (integrate with payment gateway)\n            const paymentResult = await this.processWithGateway(paymentData);\n            \n            // Log result\n            this.logPaymentEvent(\n                paymentResult.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',\n                paymentData.userId,\n                {\n                    amount: paymentData.amount,\n                    transactionId: paymentResult.transactionId,\n                    error: paymentResult.error\n                }\n            );\n            \n            return paymentResult;\n            \n        } catch (error) {\n            console.error('Error processing payment:', error);\n            \n            this.logPaymentEvent('PAYMENT_ERROR', paymentData.userId, {\n                error: error.message,\n                amount: paymentData.amount\n            });\n            \n            return {\n                success: false,\n                error: 'Payment processing failed',\n                code: 'PROCESSING_ERROR'\n            };\n        }\n    }\n    \n    // Validate all payment data\n    async validatePaymentData(paymentData) {\n        const errors = [];\n        \n        // Validate card number\n        if (paymentData.cardNumber) {\n            const cardValidation = this.validateCardNumber(paymentData.cardNumber);\n            if (!cardValidation.isValid) {\n                errors.push(cardValidation.error);\n            }\n        }\n        \n        // Validate CVV\n        if (paymentData.cvv) {\n            const cvvValidation = this.validateCVV(paymentData.cvv, paymentData.cardType);\n            if (!cvvValidation.isValid) {\n                errors.push(cvvValidation.error);\n            }\n        }\n        \n        // Validate expiry\n        if (paymentData.expiryMonth && paymentData.expiryYear) {\n            const expiryValidation = this.validateExpiryDate(paymentData.expiryMonth, paymentData.expiryYear);\n            if (!expiryValidation.isValid) {\n                errors.push(expiryValidation.error);\n            }\n        }\n        \n        // Validate amount\n        if (paymentData.amount) {\n            const amountValidation = this.validatePaymentAmount(paymentData.amount, paymentData.currency);\n            if (!amountValidation.isValid) {\n                errors.push(amountValidation.error);\n            }\n        }\n        \n        // Validate cardholder name\n        if (paymentData.cardholderName) {\n            if (paymentData.cardholderName.length < 2 || paymentData.cardholderName.length > 50) {\n                errors.push('Invalid cardholder name length');\n            }\n        }\n        \n        return {\n            isValid: errors.length === 0,\n            errors\n        };\n    }\n    \n    // Process with payment gateway (placeholder)\n    async processWithGateway(paymentData) {\n        try {\n            // In a real implementation, this would integrate with:\n            // - Stripe\n            // - PayPal\n            // - Square\n            // - Other PCI-compliant payment processors\n            \n            // Simulate payment processing\n            const transactionId = crypto.randomUUID();\n            \n            // Simulate success/failure (90% success rate for demo)\n            const isSuccess = Math.random() > 0.1;\n            \n            if (isSuccess) {\n                return {\n                    success: true,\n                    transactionId,\n                    amount: paymentData.amount,\n                    currency: paymentData.currency,\n                    status: 'completed',\n                    timestamp: new Date().toISOString()\n                };\n            } else {\n                return {\n                    success: false,\n                    error: 'Payment declined by bank',\n                    code: 'DECLINED',\n                    transactionId\n                };\n            }\n            \n        } catch (error) {\n            console.error('Gateway processing error:', error);\n            return {\n                success: false,\n                error: 'Gateway communication failed',\n                code: 'GATEWAY_ERROR'\n            };\n        }\n    }\n    \n    // Log payment events for audit and compliance\n    logPaymentEvent(eventType, userId, details = {}) {\n        const logEntry = {\n            timestamp: new Date().toISOString(),\n            eventType,\n            userId,\n            details: this.maskSensitiveData(details),\n            compliance: 'PCI_DSS'\n        };\n        \n        // In production, send to secure, PCI-compliant logging service\n        console.log('PAYMENT_AUDIT:', JSON.stringify(logEntry));\n    }\n    \n    // Mask sensitive data in logs\n    maskSensitiveData(data) {\n        const masked = { ...data };\n        \n        if (masked.cardNumber) {\n            masked.cardNumber = this.maskCardNumber(masked.cardNumber);\n        }\n        \n        if (masked.cvv) {\n            masked.cvv = '***';\n        }\n        \n        if (masked.ssn) {\n            masked.ssn = 'XXX-XX-' + masked.ssn.slice(-4);\n        }\n        \n        return masked;\n    }\n    \n    // Generate payment security report\n    async generateSecurityReport(timeframe = 30) {\n        try {\n            const report = {\n                reportDate: new Date().toISOString(),\n                timeframe: `${timeframe} days`,\n                summary: {\n                    totalTransactions: 0,\n                    fraudulentTransactions: 0,\n                    blockedTransactions: 0,\n                    totalAmount: 0,\n                    averageTransactionAmount: 0\n                },\n                fraudDetection: {\n                    highRiskTransactions: 0,\n                    mediumRiskTransactions: 0,\n                    lowRiskTransactions: 0,\n                    topFraudReasons: []\n                },\n                compliance: {\n                    pciCompliant: this.pciCompliance.encryptCardData,\n                    dataEncrypted: this.pciCompliance.encryptCardData,\n                    auditLogsEnabled: this.pciCompliance.logPaymentEvents\n                },\n                recommendations: []\n            };\n            \n            // Add recommendations based on findings\n            if (report.fraudDetection.highRiskTransactions > 10) {\n                report.recommendations.push('Consider implementing additional fraud detection rules');\n            }\n            \n            if (!report.compliance.pciCompliant) {\n                report.recommendations.push('Ensure PCI DSS compliance for all payment processing');\n            }\n            \n            return report;\n            \n        } catch (error) {\n            console.error('Error generating payment security report:', error);\n            return null;\n        }\n    }\n}\n\nmodule.exports = new PaymentSecurityService();