const { Resend } = require('resend');

// Initialize Resend with the provided API key
const resend = new Resend('re_V49KT2dT_JrmtHCJSVz6kcx1Y7RnPjWhP');

exports.sendInvitation = async (email, meetingId, hostName, meetingOptions = {}) => {
    const meetingTitle = meetingOptions.title || 'Scheduled Meeting';
    const formattedDate = meetingOptions.startTime ? new Date(meetingOptions.startTime).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }) : 'Scheduled (See Link)';

    const mailOptions = {
        from: 'MeetSphere <onboarding@resend.dev>', // Resend free tier requires this specific sender
        to: email,
        subject: `Meeting Invitation: ${hostName} invited you to "${meetingTitle}"`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h1 style="color: #4f46e5;">Meeting Invitation</h1>
                <p><strong>${hostName}</strong> has invited you to join a video conference on MeetSphere.</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>${meetingTitle}</strong></p>
                    <p style="margin: 0 0 5px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
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
        const data = await resend.emails.send(mailOptions);
        
        if (data.error) {
            console.error('Email error:', data.error);
            return { success: false, error: data.error };
        }

        console.log(`[Resend] Successfully sent email to ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error };
    }
};
