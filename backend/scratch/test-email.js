const nodemailer = require('nodemailer');
require('dotenv').config({ path: './backend/.env' });

async function testConnection() {
    console.log('Testing SMTP connection...');
    console.log('User:', process.env.EMAIL_USER);
    // Strip spaces like the app does
    const pass = (process.env.EMAIL_PASS || '').replace(/\s/g, '');
    console.log('Pass Length:', pass.length);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    try {
        await transporter.verify();
        console.log('✅ Success! SMTP connection is valid.');
    } catch (error) {
        console.error('❌ Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('SMTP Response:', error.response);
        }
    }
}

testConnection();
