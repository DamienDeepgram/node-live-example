const express = require('express');
const router = express.Router();
const db = require('../utils/database');

// Get all notes
router.get('/', async (req, res) => {
    try {
        const notes = await db.get('clinicalNotes');
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new note
router.post('/', async (req, res) => {
    try {
        const note = await db.add('clinicalNotes', {
            notes: {
                content: req.body.content,
                category: req.body.category,
                patientId: req.body.patientId,
                doctorId: req.body.doctorId
            }
        });
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a note
router.put('/:id', async (req, res) => {
    try {
        await db.update('clinicalNotes', parseInt(req.params.id), {
            content: req.body.content,
            category: req.body.category,
            updatedAt: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a note
router.delete('/:id', async (req, res) => {
    try {
        await db.delete('clinicalNotes', parseInt(req.params.id));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 