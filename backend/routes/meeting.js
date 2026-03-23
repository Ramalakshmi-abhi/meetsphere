const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const auth = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/recordings');
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.warn("Could not create local upload directory (expected on Vercel/Serverless). Using temp directory instead.");
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.params.roomId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/schedule', auth, meetingController.scheduleMeeting);
router.get('/my-meetings', auth, meetingController.getMeetings);
router.get('/my-recordings', auth, meetingController.getMyRecordings); // Added
router.get('/public/:meetingId', meetingController.getPublicMeeting);
router.post('/:meetingId/invite', auth, meetingController.sendMeetingInvites);
router.post('/:roomId/recording', auth, upload.single('recording'), meetingController.uploadRecording); // Added
router.get('/:meetingId', auth, meetingController.getMeeting);
router.delete('/:id', auth, meetingController.deleteMeeting);

module.exports = router;
