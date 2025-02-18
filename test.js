const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testNote = {
    content: "Patient shows good recovery progress",
    category: "General Notes",
    patientId: "12345",
    doctorId: "67890"
};

const testPrescription = {
    medication: "Acetaminophen",
    dosage: "500mg",
    frequency: "Every 6 hours",
    duration: "5 days",
    patientId: "12345",
    doctorId: "67890",
    pharmacy: "Local Pharmacy"
};

const testAppointment = {
    dateTime: new Date("2024-03-20T10:00:00").toISOString(),
    patientId: "12345",
    doctorId: "67890",
    type: "standard",
    notes: "Regular checkup"
};

async function runTests() {
    try {
        console.log('Testing Notes API...');
        const notesResponse = await axios.post(`${BASE_URL}/notes`, testNote);
        console.log('Created note:', notesResponse.data);

        console.log('\nTesting Prescriptions API...');
        const prescriptionResponse = await axios.post(`${BASE_URL}/prescriptions`, testPrescription);
        console.log('Created prescription:', prescriptionResponse.data);

        console.log('\nTesting Scheduling API...');
        const appointmentResponse = await axios.post(`${BASE_URL}/scheduling`, testAppointment);
        console.log('Created appointment:', appointmentResponse.data);

        // Test GET endpoints
        console.log('\nFetching all records...');
        const notes = await axios.get(`${BASE_URL}/notes`);
        console.log('Notes:', notes.data);

        const prescriptions = await axios.get(`${BASE_URL}/prescriptions`);
        console.log('Prescriptions:', prescriptions.data);

        const appointments = await axios.get(`${BASE_URL}/scheduling`);
        console.log('Appointments:', appointments.data);

    } catch (error) {
        console.error('Test failed:', error.response ? error.response.data : error.message);
    }
}

runTests(); 