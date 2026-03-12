const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env' });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'SMTP Test from MeetSphere',
    text: 'If you see this, your SMTP settings are correct!'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log('Error occurred:', error.message);
        process.exit(1);
    } else {
        console.log('Email sent successfully!');
        process.exit(0);
    }
});
