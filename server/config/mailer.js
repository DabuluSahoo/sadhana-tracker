const https = require('https');

const sendOTP = async (email, otp, subject = 'Your OTP - Sadhana Tracker', customHtml = null) => {
    const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; padding: 24px; border: 1px solid #f0a500; border-radius: 8px;">
                <h2 style="color: #c47a00; text-align: center;">🪷 Sadhana Tracker</h2>
                <p style="font-size: 16px;">Your One-Time Password (OTP) is:</p>
                <div style="font-size: 36px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #c47a00; padding: 16px; background: #fff8e1; border-radius: 8px;">
                    ${otp}
                </div>
                <p style="color: #888; font-size: 13px; margin-top: 16px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>
        `;

    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [email],
        subject,
        html: customHtml || defaultHtml,
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

const sendUsernameChangeNotification = async (email, oldUsername, newUsername) => {
    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [email],
        subject: '🔔 Your Login Username Has Been Updated - Sadhana Tracker',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 460px; margin: auto; padding: 24px; border: 1px solid #f0a500; border-radius: 8px;">
                <h2 style="color: #c47a00; text-align: center;">🪷 Sadhana Tracker</h2>
                <p style="font-size: 16px; color: #333;">Hare Krishna, <strong>${oldUsername}</strong>!</p>
                <p style="color: #555;">Your account username has been updated by the administrator.</p>
                <table style="width:100%; border-collapse:collapse; margin: 16px 0; font-size:15px;">
                    <tr>
                        <td style="padding:10px; background:#fff8e1; border:1px solid #f0e0a0; border-radius:4px 0 0 4px; color:#888;">Old Username</td>
                        <td style="padding:10px; background:#fff8e1; border:1px solid #f0e0a0; text-decoration:line-through; color:#c47a00;"><strong>${oldUsername}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding:10px; background:#fff3e0; border:1px solid #f0e0a0; border-radius:4px 0 0 4px; color:#888;">New Username</td>
                        <td style="padding:10px; background:#fff3e0; border:1px solid #f0e0a0; color:#3a7c00;"><strong>${newUsername}</strong></td>
                    </tr>
                </table>
                <p style="color:#555;">Please use your <strong>new username</strong> to log in from now on. Your password remains unchanged.</p>
                <p style="color: #aaa; font-size: 12px; margin-top: 20px;">If you have any questions, please contact your administrator. 🙏</p>
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

const sendEmailWithAttachment = async (email, subject, html, attachment, headers = {}) => {
    const bodyObj = {
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [email],
        subject,
        html,
        attachments: [
            {
                content: attachment.content,
                filename: attachment.filename,
            },
        ],
    };

    if (headers['In-Reply-To']) {
        bodyObj.headers = { ...bodyObj.headers, 'In-Reply-To': headers['In-Reply-To'] };
    }
    if (headers['References']) {
        bodyObj.headers = { ...bodyObj.headers, 'References': headers['References'] };
    }

    const body = JSON.stringify(bodyObj);

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
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
                else reject(new Error(`Resend API error: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

const sendApprovalNotificationToOwner = async (ownerEmail, devoteeDetails, approvalLink) => {
    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [ownerEmail],
        subject: '🔔 New User Registration Pending Approval - Sadhana Tracker',
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 2px solid #f0a500; border-radius: 12px; background: #fffdf5;">
                <h2 style="color: #c47a00; text-align: center;">🪷 New Registration Alert</h2>
                <p>Hare Krishna! 🙏 A new devotee has registered and is waiting for your approval.</p>
                
                <div style="background: white; border: 1px solid #f0e0b0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Username:</strong> ${devoteeDetails.username}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${devoteeDetails.email}</p>
                    <p style="margin: 5px 0;"><strong>Group:</strong> ${devoteeDetails.group_name.toUpperCase()}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${approvalLink}" 
                       style="background: #c47a00; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(196, 122, 0, 0.2);">
                        ✅ Approve Account
                    </a>
                </div>
                
                <p style="color: #888; font-size: 12px; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
                    Once you click approve, the devotee will receive a confirmation email and will be able to log in immediately.
                </p>
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
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
                else reject(new Error(`Resend Error: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

const sendApprovalConfirmationToUser = async (email, username) => {
    const body = JSON.stringify({
        from: 'Sadhana Tracker <noreply@wsahoo.space>',
        to: [email],
        subject: '✨ Account Approved! - Sadhana Tracker',
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #c47a00; border-radius: 12px; background: #fff;">
                <h2 style="color: #c47a00; text-align: center;">🪷 Welcome to Sadhana Tracker</h2>
                <p style="font-size: 16px;">Hare Krishna, <strong>${username}</strong>! 🙏</p>
                <p style="color: #444; line-height: 1.6;">
                    Your account has been **approved** by the administrator. You can now log in and start tracking your spiritual progress.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://sadhana.wsahoo.space/login" 
                       style="background: #c47a00; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: bold;">
                        Login Now
                    </a>
                </div>
                
                <p style="color: #888; font-size: 12px; text-align: center;">
                    Your spiritual progress is a gift to the world. 🌸
                </p>
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
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
                else reject(new Error(`Resend Error: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

module.exports = { 
    sendOTP, 
    sendUsernameChangeNotification, 
    sendEmailWithAttachment,
    sendApprovalNotificationToOwner,
    sendApprovalConfirmationToUser
};
