const axios = require('axios');

async function testAuth() {
    try {
        console.log('Testing /api/auth/profile...');
        const profileRes = await axios.get('http://localhost:5000/api/auth/profile');
        console.log('Profile Result:', profileRes.data);
    } catch (err) {
        console.error('Profile Error:', err.response ? err.response.status : err.message);
        if (err.response) console.log('Data:', err.response.data);
    }

    try {
        console.log('\nTesting /api/auth/login...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'test@example.com',
            password: 'password'
        });
        console.log('Login Result:', loginRes.data);
    } catch (err) {
        console.error('Login Error:', err.response ? err.response.status : err.message);
        if (err.response) console.log('Data:', err.response.data);
    }
}

testAuth();
