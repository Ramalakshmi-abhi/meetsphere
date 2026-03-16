const Meeting = require('../models/Meeting');
const { sendInvitation } = require('../config/email');

exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, startTime, participants, passcode } = req.body;
        // Check if the passcode is provided, otherwise generate a random meeting ID
        const meetingId = passcode || Math.random().toString(36).substring(2, 10);
        
        console.log(`[Meeting] Scheduling meeting: ${title} (${meetingId}) for user ${req.user.name}`);

        const meeting = new Meeting({
            meetingId,
            title,
            startTime,
            passcode,
            host: req.user._id,
        });

        await meeting.save();
        console.log(`[Meeting] Meeting saved to DB: ${meetingId}`);

        // Send invitations asynchronously to prevent serverless function timeouts
        if (participants && participants.length > 0) {
            console.log(`[Meeting] Sending invitations background to: ${participants.join(', ')}`);
            Promise.all(participants.map(email => 
                sendInvitation(email, meetingId, req.user.name)
                    .then(res => console.log(`[Email] Invitation sent to ${email}:`, res.success))
                    .catch(err => console.error(`[Email] Failed to send to ${email}:`, err))
            ));
        }

        res.status(201).send(meeting);
    } catch (e) {
        console.error('CRITICAL: [Meeting] Scheduling error:', e);
        res.status(500).send({ error: e.message || 'Scheduling failed' });
    }
};

exports.getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find({ host: req.user._id }).sort({ startTime: 1 });
        res.send(meetings);
    } catch (e) {
        console.error('CRITICAL: [Meeting] Fetch error:', e);
        res.status(500).send({ error: e.message || 'Fetch failed' });
    }
};

exports.getMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findOne({ 
            $or: [
                { meetingId: req.params.meetingId },
                { passcode: req.params.meetingId }
            ]
        });
        if (!meeting) return res.status(404).send({ error: 'Meeting not found' });
        res.send(meeting);
    } catch (e) {
        console.error('CRITICAL: [Meeting] Fetch single error:', e);
        res.status(500).send({ error: e.message || 'Fetch single failed' });
    }
};
exports.deleteMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findOne({ _id: req.params.id, host: req.user._id });
        if (!meeting) {
            return res.status(404).send({ error: 'Meeting not found or you are not authorized to delete it.' });
        }
        await Meeting.deleteOne({ _id: req.params.id });
        res.send({ message: 'Meeting deleted successfully' });
    } catch (e) {
        console.error('CRITICAL: [Meeting] Delete error:', e);
        res.status(500).send({ error: e.message || 'Delete failed' });
    }
};
