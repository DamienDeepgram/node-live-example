const express = require('express');
const router = express.Router();
const db = require('../utils/database');

// Get all prescriptions
router.get('/', async (req, res) => {
    try {
        const prescriptions = await db.get('prescriptions');
        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new prescription
router.post('/', async (req, res) => {
    try {
        const prescription = await db.add('prescriptions', {
            active: {
                medication: req.body.medication,
                dosage: req.body.dosage,
                frequency: req.body.frequency,
                duration: req.body.duration,
                patientId: req.body.patientId,
                doctorId: req.body.doctorId,
                pharmacy: req.body.pharmacy
            }
        });
        res.status(201).json(prescription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a prescription
router.put('/:id', async (req, res) => {
    try {
        await db.update('prescriptions', parseInt(req.params.id), {
            medication: req.body.medication,
            dosage: req.body.dosage,
            frequency: req.body.frequency,
            duration: req.body.duration,
            pharmacy: req.body.pharmacy,
            status: req.body.status
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Move prescription to history
router.post('/:id/complete', async (req, res) => {
    try {
        const prescription = await db.get('prescriptions');
        const activePrescription = prescription.active.find(p => p.id === parseInt(req.params.id));
        
        if (!activePrescription) {
            throw new Error('Prescription not found');
        }

        await db.add('prescriptions', {
            history: {
                ...activePrescription,
                completedAt: new Date().toISOString()
            }
        });
        await db.delete('prescriptions', parseInt(req.params.id));
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 