const PERMISSION_ERRORS = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError']);
const DEVICE_NOT_FOUND_ERRORS = new Set(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError']);
const DEVICE_BUSY_ERRORS = new Set(['NotReadableError', 'TrackStartError', 'AbortError']);

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export const stopMediaStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
};

export const getMediaTrack = (stream, kind) => {
    if (!stream) return null;
    return kind === 'video'
        ? stream.getVideoTracks()[0] || null
        : stream.getAudioTracks()[0] || null;
};

const ensureMediaDevices = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
        const error = new Error('Media devices are not supported in this browser context.');
        error.name = 'NotSupportedError';
        throw error;
    }
};

const mergeStreams = (streams) => {
    const merged = new MediaStream();
    streams.forEach((stream) => {
        stream.getTracks().forEach((track) => merged.addTrack(track));
    });
    return merged;
};

export const requestMediaStream = async ({ video = false, audio = false } = {}) => {
    ensureMediaDevices();

    if (!video && !audio) {
        return { stream: new MediaStream(), errors: {} };
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
        return { stream, errors: {} };
    } catch (combinedError) {
        if (!(video && audio)) {
            combinedError.errors = { [video ? 'camera' : 'microphone']: combinedError };
            throw combinedError;
        }
    }

    const partialStreams = [];
    const errors = {};

    try {
        partialStreams.push(await navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
    } catch (videoError) {
        errors.camera = videoError;
    }

    try {
        partialStreams.push(await navigator.mediaDevices.getUserMedia({ video: false, audio: true }));
    } catch (audioError) {
        errors.microphone = audioError;
    }

    if (partialStreams.length === 0) {
        const error = new Error('Unable to access camera or microphone.');
        error.name = 'MediaAccessError';
        error.errors = errors;
        throw error;
    }

    return { stream: mergeStreams(partialStreams), errors };
};

export const requestMediaTrack = async (kind) => {
    ensureMediaDevices();

    const constraints = kind === 'video'
        ? { video: true, audio: false }
        : { video: false, audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return getMediaTrack(stream, kind);
};

const describeSingleError = (label, mediaError) => {
    if (!mediaError) return '';

    if (PERMISSION_ERRORS.has(mediaError.name)) {
        return `${capitalize(label)} access is blocked. Allow it from your browser site settings and try again.`;
    }

    if (DEVICE_NOT_FOUND_ERRORS.has(mediaError.name)) {
        return `No ${label} was found on this device.`;
    }

    if (DEVICE_BUSY_ERRORS.has(mediaError.name)) {
        return `Your ${label} is busy in another app. Close the other app and try again.`;
    }

    if (mediaError.name === 'NotSupportedError') {
        return 'Camera and microphone are only available on HTTPS or localhost in supported browsers.';
    }

    return `Unable to access the ${label}. Check browser permissions and device availability, then try again.`;
};

export const describeMediaError = ({ error, errors = {}, requestedVideo = false, requestedAudio = false } = {}) => {
    const resolvedErrors = Object.keys(errors).length > 0 ? errors : (error?.errors || {});
    const cameraError = resolvedErrors.camera;
    const microphoneError = resolvedErrors.microphone;

    if (cameraError && microphoneError) {
        if (PERMISSION_ERRORS.has(cameraError.name) && PERMISSION_ERRORS.has(microphoneError.name)) {
            return 'Camera and microphone access is blocked. Allow them from your browser site settings and try again.';
        }

        if (DEVICE_BUSY_ERRORS.has(cameraError.name) || DEVICE_BUSY_ERRORS.has(microphoneError.name)) {
            return 'Camera or microphone is busy in another app. Close the other app and try again.';
        }

        if (DEVICE_NOT_FOUND_ERRORS.has(cameraError.name) && DEVICE_NOT_FOUND_ERRORS.has(microphoneError.name)) {
            return 'No working camera or microphone was found on this device.';
        }

        return 'Unable to access the camera and microphone. Check browser permissions and device availability, then try again.';
    }

    if (cameraError) {
        return describeSingleError('camera', cameraError);
    }

    if (microphoneError) {
        return describeSingleError('microphone', microphoneError);
    }

    if (error) {
        if (requestedVideo && requestedAudio) {
            return 'Unable to access the camera and microphone. Check browser permissions and device availability, then try again.';
        }
        if (requestedVideo) {
            return describeSingleError('camera', error);
        }
        if (requestedAudio) {
            return describeSingleError('microphone', error);
        }
    }

    return '';
};
