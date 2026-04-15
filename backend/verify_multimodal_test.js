const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api/v1';
const IMG_PATH = 'D:/Software/ClinicaEye-NLP/Data/ODIR-5K/preprocessed_images/0_left.jpg';

async function verify() {
    console.log('--- START VERIFICATION ---');
    try {
        console.log('1. Registering/Logging in user...');
        let authRes;
        try {
            console.log('Attempting register...');
            authRes = await axios.post(`${BASE_URL}/auth/register`, {
                email: 'test_verif_final@clinicaeye.com',
                password: 'testpassword123',
                name: 'Dr. Verifier'
            });
            console.log('Registered successfully.');
        } catch (e) {
            console.log('Register failed or user exists, attempting login...');
            try {
                authRes = await axios.post(`${BASE_URL}/auth/login`, {
                    email: 'test_verif_final@clinicaeye.com',
                    password: 'testpassword123'
                });
                console.log('Logged in successfully.');
            } catch (loginError) {
                console.error('Login Failed:', loginError.message);
                if (loginError.response) console.error('Response:', loginError.response.data);
                throw loginError;
            }
        }

        const token = authRes.data.data.token;
        console.log('Auth Success. Token retrieved.');

        console.log('2. Sending multimodal analysis request to /api/v1/analyze ...');
        if (!fs.existsSync(IMG_PATH)) {
            console.error('IMAGE NOT FOUND:', IMG_PATH);
            process.exit(1);
        }

        const form = new FormData();
        form.append('text', 'Patient reports flashes of light and curtain-like shadow.');
        form.append('image', fs.createReadStream(IMG_PATH));
        form.append('patientContext', JSON.stringify({ ageRange: '50-60', gender: 'Male' }));

        console.log('Pushing request to gateway...');
        const analyzeRes = await axios.post(`${BASE_URL}/analyze`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            },
            timeout: 15000 
        });

        console.log('\n--- VERIFICATION SUCCESS! ---');
        console.log('Response Status:', analyzeRes.data.status);
        if (analyzeRes.data.data) {
            console.log('Prediction ID:', analyzeRes.data.data.predictionId);
            console.log('Image URL Path:', analyzeRes.data.data.imageUrl);
            console.log('Is Multimodal?:', !!analyzeRes.data.data.imageUrl);
            console.log('Latency:', analyzeRes.data.data.latency, 'ms');
            
            if (analyzeRes.data.data.visual) {
                console.log('Visual Status:', analyzeRes.data.data.visual.status);
                if (analyzeRes.data.data.visual.predictions) {
                    console.log('Visual Predictions (Top 3):', analyzeRes.data.data.visual.predictions.slice(0, 3));
                }
            }
        }

    } catch (error) {
        console.error('\n--- VERIFICATION FAILED ---');
        if (error.response) {
            console.error('API Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Client/Network Error:', error.message);
        }
        process.exit(1);
    }
}

verify();
