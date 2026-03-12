const Meeting = require('../models/Meeting');
const { sendInvitation } = require('../config/email');

exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, startTime, participants } = req.body;
        const meetingId = Math.random().toString(36).substring(2, 10);
        
        const meeting = new Meeting({
            meetingId,
            title,
            startTime,
            host: req.user._id,
        });

        await meeting.save();

        if (participants && participants.length > 0) {
            console.log('Sending invitations to:', participants);
            const invitationPromises = participants.map(email => 
                sendInvitation(email, meetingId, req.user.name)
            );
            const results = await Promise.all(invitationPromises);
            console.log('Email delivery results:', results);
        }

        res.status(201).send(meeting);
    } catch (e) {
        res.status(400).send(e);
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
