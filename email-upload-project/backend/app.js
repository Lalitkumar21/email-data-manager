const express = require('express');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Excel = require('exceljs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// CORS configuration before other middleware
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Accept']
}));

// Middleware for parsing JSON bodies
app.use(express.json());

// Add middleware to check for valid API keys
app.use((req, res, next) => {
    if (req.path === '/generate-content') {
        const apiKey = req.headers['authorization']?.split(' ')[1];
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key is required'
            });
        }
    }
    next();
});

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    },
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB
    }
});

// Route for handling file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        console.log('Processing file:', req.file.originalname, 'Type:', req.file.mimetype);

        let data = [];
        const workbook = new Excel.Workbook();
        
        try {
            if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
                // For CSV files
                const fileContent = fs.readFileSync(req.file.path, 'utf8');
                const rows = fileContent.split('\n');
                const headers = rows[0].split(',').map(header => header.trim());

                for (let i = 1; i < rows.length; i++) {
                    if (rows[i].trim()) {  // Skip empty rows
                        const values = rows[i].split(',').map(val => val.trim());
                        const rowData = {};
                        headers.forEach((header, index) => {
                            rowData[header] = values[index] || '';
                        });
                        data.push(rowData);
                    }
                }
            } else {
                // For Excel files
                await workbook.xlsx.readFile(req.file.path);
                const worksheet = workbook.getWorksheet(1);
                
                if (!worksheet) {
                    throw new Error('No worksheet found in the file');
                }

                const headers = worksheet.getRow(1).values
                    .filter(Boolean)
                    .map(header => header.toString().trim());

                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {  // Skip header row
                        const rowData = {};
                        headers.forEach((header, index) => {
                            const cellValue = row.getCell(index + 1).value;
                            rowData[header] = cellValue ? cellValue.toString().trim() : '';
                        });
                        data.push(rowData);
                    }
                });
            }

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            // Validate data
            if (data.length === 0) {
                throw new Error('No data found in file');
            }

            const availableColumns = Object.keys(data[0]);
            
            res.json({
                success: true,
                message: 'File processed successfully',
                data: data,
                columns: availableColumns,
                totalRows: data.length
            });
        } catch (error) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            throw error;
        }
    } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error processing file'
        });
    }
});

// Add verification endpoint for multiple AI providers
app.post('/verify-ai-key', async (req, res) => {
    try {
        const { provider, apiKey } = req.body;
        let response;

        switch (provider) {
            case 'openai':
                const openai = new OpenAI({ apiKey });
                response = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: "Test" }],
                    max_tokens: 5
                });
                break;
            case 'anthropic':
                const anthropic = new Anthropic({ apiKey });
                response = await anthropic.messages.create({
                    model: "claude-3-opus-20240229",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: "Test" }]
                });
                break;
            case 'gemini':
                const client = new PredictionServiceClient({ apiKey });
                const projectId = 'your-google-cloud-project-id';
                const location = 'us-central1';
                const modelId = 'your-model-id';
                const endpoint = client.endpointPath(projectId, location, modelId);
                response = await client.predict({
                    endpoint,
                    instances: [{ content: "Test" }]
                });
                break;
            default:
                throw new Error('Unsupported AI provider');
        }

        if (response) {
            res.json({ success: true, message: `${provider} API key verified successfully` });
        } else {
            throw new Error('Invalid API key');
        }
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message || 'Invalid API key'
        });
    }
});

// Modify email verification to handle errors properly
app.post('/verify-email', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: email, pass: password }
        });

        await transporter.verify();
        app.locals.emailTransporter = transporter;
        app.locals.senderEmail = email;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid email credentials'
        });
    }
});

// Add email analytics storage
const emailAnalytics = {
    totalEmails: 0,
    sent: 0,
    failed: 0,
    inProgress: 0,
    history: [],
    startTime: null,
    endTime: null,
    averageSendTime: 0
};

// Update send-emails endpoint
app.post('/send-emails', async (req, res) => {
    try {
        const { subject, recipients, emailColumn } = req.body;
        
        if (!app.locals.emailTransporter || !app.locals.senderEmail) {
            throw new Error('Email configuration not found');
        }

        // Initialize analytics for this batch
        emailAnalytics.totalEmails = recipients.length;
        emailAnalytics.sent = 0;
        emailAnalytics.failed = 0;
        emailAnalytics.inProgress = recipients.length;
        emailAnalytics.startTime = Date.now();
        emailAnalytics.history = [];
        
        io.emit('analytics-update', emailAnalytics);

        const transporter = app.locals.emailTransporter;
        const batchSize = 50;
        let successCount = 0;
        let errorCount = 0;
        let errorMessages = [];
        
        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            
            const emailPromises = batch.map(async recipient => {
                const startTime = Date.now();
                try {
                    await transporter.sendMail({
                        from: app.locals.senderEmail,
                        to: recipient[emailColumn],
                        subject: subject,
                        text: recipient.processedBody,
                        html: recipient.processedBody.replace(/\n/g, '<br>')
                    });
                    
                    successCount++;
                    emailAnalytics.sent++;
                    emailAnalytics.inProgress--;
                    
                    emailAnalytics.history.push({
                        timestamp: new Date(),
                        recipient: recipient[emailColumn],
                        status: 'success',
                        duration: Date.now() - startTime
                    });
                    
                    io.emit('analytics-update', emailAnalytics);
                } catch (error) {
                    errorCount++;
                    emailAnalytics.failed++;
                    emailAnalytics.inProgress--;
                    
                    emailAnalytics.history.push({
                        timestamp: new Date(),
                        recipient: recipient[emailColumn],
                        status: 'failed',
                        error: error.message
                    });
                    
                    errorMessages.push(`Failed to send to ${recipient[emailColumn]}: ${error.message}`);
                    io.emit('analytics-update', emailAnalytics);
                }
            });

            await Promise.all(emailPromises);
            
            if (i + batchSize < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        emailAnalytics.endTime = Date.now();
        emailAnalytics.averageSendTime = (emailAnalytics.endTime - emailAnalytics.startTime) / recipients.length;
        io.emit('analytics-update', emailAnalytics);
        
        res.json({
            success: true,
            message: `Successfully sent ${successCount} emails. ${errorCount} errors occurred.`,
            errors: errorMessages,
            analytics: emailAnalytics
        });
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send emails'
        });
    }
});

// Add new AI content generation function
async function generateAIContent(provider, apiKey, prompt) {
    if (!provider || !apiKey || !prompt) {
        throw new Error('Missing required parameters');
    }

    try {
        switch (provider) {
            case 'openai':
                const openai = new OpenAI({ apiKey });
                const openaiResponse = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 1000
                });
                return openaiResponse.choices[0].message.content;

            case 'anthropic':
                const anthropic = new Anthropic({ apiKey });
                const anthropicResponse = await anthropic.messages.create({
                    model: "claude-3-opus-20240229",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }]
                });
                return anthropicResponse.completion;

            case 'gemini':
                const client = new PredictionServiceClient({ apiKey });
                const projectId = 'your-google-cloud-project-id';
                const location = 'us-central1';
                const modelId = 'your-model-id';
                const endpoint = client.endpointPath(projectId, location, modelId);
                const geminiResponse = await client.predict({
                    endpoint,
                    instances: [{ content: prompt }]
                });
                return geminiResponse.predictions[0].content;

            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    } catch (error) {
        console.error(`${provider} API error:`, error);
        throw new Error(`${provider} API error: ${error.message}`);
    }
}

// Update the generate-content endpoint
app.post('/generate-content', async (req, res) => {
    try {
        // Always set JSON content type
        res.setHeader('Content-Type', 'application/json');

        const { provider, prompt } = req.body;
        const apiKey = req.headers.authorization?.split(' ')[1];  // Get API key from Authorization header

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key is required'
            });
        }

        if (!provider || !prompt) {
            return res.status(400).json({
                success: false,
                message: 'Provider and prompt are required'
            });
        }

        try {
            const content = await generateAIContent(provider, apiKey, prompt);
            return res.json({
                success: true,
                content: content
            });
        } catch (aiError) {
            return res.status(500).json({
                success: false,
                message: `AI Generation failed: ${aiError.message}`
            });
        }
    } catch (error) {
        console.error('Content generation error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate content'
        });
    }
});

// Remove the readline questions at the end and just start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
