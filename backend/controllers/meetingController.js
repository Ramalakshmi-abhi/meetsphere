const Meeting = require('../models/Meeting');
const { sendInvitation } = require('../config/email');
const { ensureDatabaseConnected } = require('../config/runtime');
const { createLiveKitToken } = require('../config/livekit');

const meetingLookup = (meetingId) => ({
    $or: [
        { meetingId },
        { passcode: meetingId }
    ]
});

const slugifyParticipantName = (value = '') => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, startTime, participants, passcode, options, advancedOptions, isLocked } = req.body;
        const normalizedOptions = options || advancedOptions || {};
        ensureDatabaseConnected();

        if (passcode) {
            const existingMeeting = await Meeting.findOne({
                $or: [{ meetingId: passcode }, { passcode: passcode }]
            });
            if (existingMeeting) {
                return res.status(400).send({ error: 'This Meeting Passcode is already in use. Please choose a different one.' });
            }
        }

        // Check if the passcode is provided, otherwise generate a random meeting ID
        const meetingId = passcode || Math.random().toString(36).substring(2, 10);
        
        console.log(`[Meeting] Scheduling meeting: ${title} (${meetingId}) for user ${req.user.name}`);

        const meeting = new Meeting({
            meetingId,
            title,
            startTime,
            passcode,
            advancedOptions: normalizedOptions,
            isLocked: isLocked || false,
            host: req.user._id,
        });

        await meeting.save();
        console.log(`[Meeting] Meeting saved to DB: ${meetingId}`);

        // Ensure emails physically leave the server before responding, 
        // to prevent PaaS environments from halting CPU or closing sockets early.
        let emailWarnings = [];
        if (participants && participants.length > 0) {
            console.log(`[Meeting] Dispatching emails to: ${participants.join(', ')}`);
            
            await Promise.all(participants.map(async (email) => {
                try {
                    const emailRes = await sendInvitation(email, meetingId, req.user.name, { title, startTime });
                    if (!emailRes.success) {
                        const errMsg = emailRes.error ? emailRes.error.message || emailRes.error.toString() : 'Unknown Error';
                        console.error(`[Email Failed] to ${email}:`, errMsg);
                        emailWarnings.push(`Failed to send to ${email}: ${errMsg}`);
                    }
                } catch (emailErr) {
                    const errMsg2 = emailErr ? emailErr.message || emailErr.toString() : 'Unknown Catch Error';
                    console.error(`[Email Error] for ${email}:`, errMsg2);
                    emailWarnings.push(`Failed to send to ${email}: ${errMsg2}`);
                }
            }));
            console.log(`[Meeting] Email dispatch successfully completed! Warnings recorded: ${emailWarnings.length}`);
        }

        const responsePayload = {
            ...meeting.toObject(),
            emailWarnings
        };

        res.status(201).send(responsePayload);
    } catch (e) {
        console.error('CRITICAL: [Meeting] Scheduling error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Scheduling failed' });
    }
};

exports.getMeetings = async (req, res) => {
    try {
        ensureDatabaseConnected();
        const meetings = await Meeting.find({ host: req.user._id }).sort({ startTime: 1 }).populate('host', 'name profilePicture branding');
        res.send(meetings);
    } catch (e) {
        console.error('CRITICAL: [Meeting] Fetch error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Fetch failed' });
    }
};

exports.getMeeting = async (req, res) => {
    try {
        ensureDatabaseConnected();
        const meeting = await Meeting.findOne(meetingLookup(req.params.meetingId))
            .populate('host', 'name profilePicture branding');
        if (!meeting) return res.status(404).send({ error: 'Meeting not found' });
        res.send(meeting);
    } catch (e) {
        console.error('CRITICAL: [Meeting] Fetch single error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Fetch single failed' });
    }
};

exports.getPublicMeeting = async (req, res) => {
    try {
        ensureDatabaseConnected();
        const meeting = await Meeting.findOne(meetingLookup(req.params.meetingId))
            .populate('host', 'name branding');

        if (!meeting) {
            return res.status(404).send({ error: 'Meeting not found' });
        }

        res.send({
            meetingId: meeting.meetingId,
            passcode: meeting.passcode,
            title: meeting.title,
            startTime: meeting.startTime,
            isLocked: meeting.isLocked,
            advancedOptions: meeting.advancedOptions,
            host: meeting.host ? {
                name: meeting.host.name,
                branding: meeting.host.branding
            } : null
        });
    } catch (e) {
        console.error('CRITICAL: [Meeting] Public fetch error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Public fetch failed' });
    }
};

exports.createPublicLiveKitToken = async (req, res) => {
    try {
        ensureDatabaseConnected();

        const meeting = await Meeting.findOne(meetingLookup(req.params.meetingId))
            .populate('host', 'name');

        if (!meeting) {
            return res.status(404).send({ error: 'Meeting not found' });
        }

        const requestedName = String(
            req.body?.name || req.user?.name || req.body?.participantName || ''
        ).trim();

        if (!requestedName) {
            return res.status(400).send({ error: 'Participant name is required to join this room.' });
        }

        const participantName = requestedName.slice(0, 80);
        const baseIdentity = slugifyParticipantName(participantName) || 'guest';
        const participantIdentity = `${baseIdentity}-${Math.random().toString(36).slice(2, 10)}`;

        const { token, url } = await createLiveKitToken({
            roomName: meeting.meetingId,
            participantName,
            participantIdentity,
            metadata: {
                meetingId: meeting.meetingId,
                meetingTitle: meeting.title,
                hostName: meeting.host?.name || '',
                joinMode: 'livekit',
            },
        });

        res.send({
            token,
            url,
            roomName: meeting.meetingId,
            participantIdentity,
            participantName,
            meetingTitle: meeting.title,
        });
    } catch (e) {
        console.error('CRITICAL: [Meeting] LiveKit token error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Failed to generate room token.' });
    }
};

exports.sendMeetingInvites = async (req, res) => {
    try {
        ensureDatabaseConnected();

        const emails = Array.isArray(req.body.emails)
            ? req.body.emails
            : String(req.body.emails || '')
                .split(',')
                .map((email) => email.trim())
                .filter(Boolean);

        if (emails.length === 0) {
            return res.status(400).send({ error: 'At least one recipient email is required.' });
        }

        const uniqueEmails = [...new Set(emails)];
        const meeting = await Meeting.findOne({
            ...meetingLookup(req.params.meetingId),
            host: req.user._id
        });

        if (!meeting) {
            return res.status(404).send({ error: 'Meeting not found or you are not allowed to send invites for it.' });
        }

        const emailWarnings = [];
        let sentCount = 0;

        await Promise.all(uniqueEmails.map(async (email) => {
            try {
                const emailRes = await sendInvitation(email, meeting.meetingId, req.user.name, {
                    title: meeting.title,
                    startTime: meeting.startTime
                });

                if (!emailRes.success) {
                    const errorMessage = emailRes.error ? emailRes.error.message || emailRes.error.toString() : 'Unknown Error';
                    emailWarnings.push(`Failed to send to ${email}: ${errorMessage}`);
                    return;
                }

                sentCount += 1;
            } catch (emailErr) {
                const errorMessage = emailErr ? emailErr.message || emailErr.toString() : 'Unknown Error';
                emailWarnings.push(`Failed to send to ${email}: ${errorMessage}`);
            }
        }));

        res.send({
            message: sentCount > 0
                ? `Invitation${sentCount > 1 ? 's' : ''} sent to ${sentCount} recipient${sentCount > 1 ? 's' : ''}.`
                : 'No invitation emails were sent.',
            sentCount,
            totalCount: uniqueEmails.length,
            emailWarnings
        });
    } catch (e) {
        console.error('CRITICAL: [Meeting] Invite email error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Failed to send meeting invites.' });
    }
};

exports.deleteMeeting = async (req, res) => {
    try {
        ensureDatabaseConnected();
        const meeting = await Meeting.findOne({ _id: req.params.id, host: req.user._id });
        if (!meeting) {
            return res.status(404).send({ error: 'Meeting not found or you are not authorized to delete it.' });
        }
        await Meeting.deleteOne({ _id: req.params.id });
        res.send({ message: 'Meeting deleted successfully' });
    } catch (e) {
        console.error('CRITICAL: [Meeting] Delete error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Delete failed' });
    }
};

const Recording = require('../models/Recording');

exports.uploadRecording = async (req, res) => {
    try {
        ensureDatabaseConnected();
        if (!req.file) {
            return res.status(400).send({ error: 'No recording file uploaded' });
        }

        const meetingId = req.params.roomId;
        const hostId = req.user._id;

        // In a production environment with Vercel/Railway, 
        // storing to local disk isn't persistent unless volume is attached.
        // The file is currently in /uploads/recordings based on multer config.
        const fileUrl = `/uploads/recordings/${req.file.filename}`;

        const recording = new Recording({
            meetingId,
            host: hostId,
            fileUrl,
            sizeBytes: req.file.size
        });

        await recording.save();
        console.log(`[Recording] Saved recording for meeting ${meetingId}`);

        res.status(201).send({ message: 'Recording uploaded successfully', recording });
    } catch (e) {
        console.error('CRITICAL: [Recording] Upload error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Upload failed' });
    }
};

exports.getMyRecordings = async (req, res) => {
    try {
        ensureDatabaseConnected();
        const recordings = await Recording.find({ host: req.user._id }).sort({ createdAt: -1 });
        res.send(recordings);
    } catch (e) {
        console.error('CRITICAL: [Recording] Fetch error:', e);
        res.status(e.statusCode || 500).send({ error: e.message || 'Fetch failed' });
    }
};
