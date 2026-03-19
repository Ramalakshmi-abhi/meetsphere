const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getContacts, addContact, updateContact, deleteContact } = require('../controllers/contactController');

// All endpoints require JWT authentication
router.use(auth);

// RESTful routing definition
router.get('/', getContacts);
router.post('/', addContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
