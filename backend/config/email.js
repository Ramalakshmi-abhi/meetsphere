const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendInvitation = async (email, meetingId, hostName) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Meeting Invitation: ${hostName} is inviting you to a MeetSphere meeting`,
        html: `
            <h1>Meeting Invitation</h1>
            <p>${hostName} has invited you to join a video conference on MeetSphere.</p>
            <p><strong>Meeting ID:</strong> ${meetingId}</p>
            <p><a href="${process.env.FRONTEND_URL || 'https://meetsphere-ten.vercel.app'}/room/${meetingId}">Click here to join the meeting</a></p>
            <p>If you don't have an account, please sign up first.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error };
    }
};
