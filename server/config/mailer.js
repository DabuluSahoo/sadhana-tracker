const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendOTP = async (email, otp, subject = 'Your OTP - Sadhana Tracker') => {
    await transporter.sendMail({
        from: `"Sadhana Tracker" <${process.env.EMAIL_USER}>`,
        to: email,
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
};

module.exports = { sendOTP };
