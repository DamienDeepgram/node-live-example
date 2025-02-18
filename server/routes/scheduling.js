const express = require('express');
const router = express.Router();
const db = require('../utils/database');

router.get('/', async (req, res) => {
    try {
        const appointments = await db.get('appointments');
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const appointment = await db.add('appointments', {
            upcoming: {
                dateTime: req.body.dateTime,
                patientId: req.body.patientId,
                doctorId: req.body.doctorId,
                type: req.body.type || 'standard',
                notes: req.body.notes
            }
        });
        res.status(201).json(appointment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        await db.update('appointments', parseInt(req.params.id), {
            dateTime: req.body.dateTime,
            notes: req.body.notes
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;