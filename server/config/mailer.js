const https = require('https');

const sendOTP = async (email, otp, subject = 'Your OTP - Sadhana Tracker') => {
    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [email],
        subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 24px; border: 1px solid #f0a500; border-radius: 8px;">
                <h2 style="color: #c47a00; text-align: center;">🪷 Sadhana Tracker</h2>
                <p style="font-size: 16px;">Your One-Time Password (OTP) is:</p>
                <div style="font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #c47a00; padding: 16px; background: #fff8e1; border-radius: 8px;">
                    ${otp}
                </div>
                <p style="color: #888; font-size: 13px; margin-top: 16px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>
        `,
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Resend API error: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

module.exports = { sendOTP };
