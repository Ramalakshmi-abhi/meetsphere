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

const normalizeInviteRecipients = (to = '') => {
    if (Array.isArray(to)) {
        return to
            .flatMap((entry) => String(entry || '').split(/[;,]/))
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    return String(to || '')
        .split(/[;,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const buildMailtoUrl = ({ subject = '', body = '', to = '' } = {}) => {
    const recipients = normalizeInviteRecipients(to)
        .map((email) => encodeURIComponent(email))
        .join(',');
    return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const buildGmailComposeUrl = ({ subject = '', body = '', to = '' } = {}) => {
    const params = new URLSearchParams({
        view: 'cm',
        fs: '1',
        tf: '1',
        su: subject,
        body,
    });

    const recipients = normalizeInviteRecipients(to).join(',');
    if (recipients) {
        params.set('to', recipients);
    }

    return `https://mail.google.com/mail/?${params.toString()}`;
};

export const openMeetingEmailDraft = ({ title = 'Meeting', meetingId = '', passcode = '', startTime, to = '' } = {}) => {
    const { subject, body } = buildMeetingEmailDraft({ title, meetingId, passcode, startTime });
    const mailto = buildMailtoUrl({ subject, body, to });

    try {
        // Use direct top-level navigation so browsers treat this as the button's user gesture.
        window.location.assign(mailto);
        return true;
    } catch (error) {
        console.error('Failed to open mail app via location navigation:', error);
        try {
            const anchor = document.createElement('a');
            anchor.href = mailto;
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            return true;
        } catch (anchorError) {
            console.error('Failed to open mail app via anchor click:', anchorError);
            return false;
        }
    }
};

export const openMeetingGmailDraft = ({ title = 'Meeting', meetingId = '', passcode = '', startTime, to = '' } = {}) => {
    const { subject, body } = buildMeetingEmailDraft({ title, meetingId, passcode, startTime });
    const gmailUrl = buildGmailComposeUrl({ subject, body, to });
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    return gmailUrl;
};
