const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const auth = require('../middleware/auth');

router.post('/schedule', auth, meetingController.scheduleMeeting);
router.get('/my-meetings', auth, meetingController.getMeetings);

module.exports = router;
