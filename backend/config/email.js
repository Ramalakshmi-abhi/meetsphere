const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS requires secure: false for STARTTLS
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
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h1 style="color: #4f46e5;">Meeting Invitation</h1>
                <p><strong>${hostName}</strong> has invited you to join a video conference on MeetSphere.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Meeting ID:</strong> ${meetingId}</p>
                </div>
                
                <p>Choose how you'd like to join:</p>
                
                <div style="margin: 20px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://meetsphere-ten.vercel.app'}/room/${meetingId}?mode=guest" 
                       style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px; font-weight: bold;">
                        Join Meeting
                    </a>
                    
                    <a href="${process.env.FRONTEND_URL || 'https://meetsphere-ten.vercel.app'}/login?redirect=/room/${meetingId}" 
                       style="background: white; color: #4f46e5; border: 2px solid #4f46e5; padding: 10px 22px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Login to Join
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">If you don't have an account, you can still join as a guest or sign up first.</p>
            </div>
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
