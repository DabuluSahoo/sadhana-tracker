const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testRegistrationFailure() {
    console.log('--- Testing Registration WITHOUT OTP (should fail) ---');
    try {
        const res = await axios.post(`${API_URL}/auth/register`, {
            email: 'test@example.com',
            username: 'tester123',
            password: 'password123',
            group_name: 'bhima'
            // Missing otp!
        });
        console.log('❌ Error: Registration succeeded without OTP!', res.data);
    } catch (err) {
        console.log('✅ Success: Registration failed as expected:', err.response?.data?.message || err.message);
    }
}

testRegistrationFailure();
