import { getMeetingUrl } from '../api';

const INVITE_TIMEZONE = 'Asia/Kolkata';

const getInviteMoment = (value) => {
    const parsed = value ? new Date(value) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const buildMeetingInvite = ({ title = 'Meeting', meetingId = '', passcode = '', startTime } = {}) => {
    const resolvedMeetingId = String(meetingId || passcode || '').trim();
    const inviteMoment = getInviteMoment(startTime);
    const url = getMeetingUrl(resolvedMeetingId);
    const dateString = inviteMoment.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: INVITE_TIMEZONE,
    });
    const timeString = inviteMoment.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: INVITE_TIMEZONE,
    });

    const lines = [
        'Join my MeetSphere meeting!',
        '',
        `Topic: ${title || 'Meeting'}`,
        `Date: ${dateString}`,
        `Time: ${timeString}`,
        'Location: MeetSphere Web',
    ];

    if (resolvedMeetingId) {
        lines.push('', `Meeting ID: ${resolvedMeetingId}`);
    }

    if (passcode && passcode !== resolvedMeetingId) {
        lines.push(`Passcode: ${passcode}`);
    }

    lines.push('', url);

    return {
        text: lines.join('\n'),
        url,
        dateString,
        timeString,
    };
};

export const buildMeetingEmailDraft = ({ title = 'Meeting', meetingId = '', passcode = '', startTime } = {}) => {
    const { url, dateString, timeString } = buildMeetingInvite({ title, meetingId, passcode, startTime });
    const resolvedMeetingId = String(meetingId || passcode || '').trim();
    const bodyLines = [
        'You are invited to a MeetSphere meeting.',
        '',
        `Topic: ${title || 'Meeting'}`,
        `Date: ${dateString}`,
        `Time: ${timeString}`,
        '',
        'Join Link:',
        url
    ];

    return {
        subject: `Invitation: Join ${title || 'Meeting'} on MeetSphere`,
        body: bodyLines.join('\r\n'),
        url,
    };
};

export const openWhatsAppInvite = (text) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
};
