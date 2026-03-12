const Meeting = require('../models/Meeting');
const { sendInvitation } = require('../config/email');

exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, startTime, participants } = req.body;
        const meetingId = Math.random().toString(36).substring(2, 10);
        
        console.log(`[Meeting] Scheduling meeting: ${title} (${meetingId}) for user ${req.user.name}`);

        const meeting = new Meeting({
            meetingId,
            title,
            startTime,
            host: req.user._id,
        });

        await meeting.save();
        console.log(`[Meeting] Meeting saved to DB: ${meetingId}`);

        // Send invitations in the background so we don't hang the response
        if (participants && participants.length > 0) {
            console.log(`[Meeting] Sending invitations to: ${participants.join(', ')}`);
            // We don't await this so the user gets a response immediately
            participants.forEach(email => {
                sendInvitation(email, meetingId, req.user.name)
                    .then(res => console.log(`[Email] Invitation sent to ${email}:`, res.success))
                    .catch(err => console.error(`[Email] Failed to send to ${email}:`, err));
            });
        }

        res.status(201).send(meeting);
    } catch (e) {
        console.error('[Meeting] Scheduling error:', e.message);
        res.status(400).send({ error: e.message });
    }
};

exports.getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find({ host: req.user._id }).sort({ startTime: 1 });
        res.send(meetings);
    } catch (e) {
        res.status(400).send(e);
    }
};
