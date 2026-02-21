const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const https = require('https');

async function testResend() {
    console.log('--- TESTING RESEND API ---');
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        console.error('❌ RESEND_API_KEY is missing in .env');
        process.exit(1);
    }

    console.log('Sending test request to Resend...');

    // Just a simple GET to check API key validity
    const options = {
        hostname: 'api.resend.com',
        path: '/emails', // This is technically a POST endpoint but we can check auth via unauthorized response
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${key}`
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            if (res.statusCode === 200 || res.statusCode === 405) { // 405 Method Not Allowed is fine, means auth passed but GET not supported
                console.log('✅ Auth seems OK');
            } else {
                console.log(`❌ Auth FAILED: ${data}`);
            }
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error(`❌ Connection Error: ${e.message}`);
        process.exit(1);
    });

    req.end();
}

testResend();
