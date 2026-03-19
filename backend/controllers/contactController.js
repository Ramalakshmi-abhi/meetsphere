const Contact = require('../models/Contact');

// Get all contacts for a user
exports.getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(contacts);
    } catch (err) {
        console.error("Get Contacts Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// Add a new contact
exports.addContact = async (req, res) => {
    const { name, role, email, phone } = req.body;

    try {
        const newContact = new Contact({
            user: req.user.id,
            name,
            role,
            email,
            phone
        });

        const contact = await newContact.save();
        res.json(contact);
    } catch (err) {
        console.error("Add Contact Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// Update an existing contact
exports.updateContact = async (req, res) => {
    const { name, role, email, phone } = req.body;

    try {
        let contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ msg: 'Contact not found' });

        // Ensure user owns contact
        if (contact.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { name, role, email, phone },
            { new: true } // Returns the updated document
        );

        res.json(contact);
    } catch (err) {
        console.error("Update Contact Error:", err.message);
        res.status(500).send('Server Error');
    }
};

// Delete a contact
exports.deleteContact = async (req, res) => {
    try {
        let contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ msg: 'Contact not found' });

        // Ensure user owns contact
        if (contact.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Contact.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Contact removed successfully' });
    } catch (err) {
        console.error("Delete Contact Error:", err.message);
        res.status(500).send('Server Error');
    }
};
