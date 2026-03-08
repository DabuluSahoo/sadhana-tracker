const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../config/mailer');

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP for registration or password reset
exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in DB (upsert)
        await db.query(
            'INSERT INTO otp_tokens (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?',
            [email, otp, expiresAt, otp, expiresAt]
        );

        await sendOTP(email, otp);
        res.json({ message: 'OTP sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to send OTP: ' + err.message });
    }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT * FROM otp_tokens WHERE email = ? AND otp = ? AND expires_at > NOW()',
            [email, otp]
        );
        if (rows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP' });

        // We no longer delete the OTP here to allow final Register/Reset step to also verify it
        res.json({ message: 'OTP verified successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Register (after OTP verified)
exports.register = async (req, res) => {
    let { email, username, password, group_name } = req.body;
    const validGroups = ['bhima', 'arjun', 'nakul', 'sahadev', 'yudhisthir', 'other'];
    try {
        email = email?.trim().toLowerCase();
        username = username?.trim();

        if (!validGroups.includes(group_name)) {
            return res.status(400).json({ message: 'Please select a valid group' });
        }

        const [existing] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing.length > 0) return res.status(400).json({ message: 'Username or email already exists' });

        // 1. Verify OTP first
        const [otpRows] = await db.query(
            'SELECT * FROM otp_tokens WHERE email = ? AND otp = ? AND expires_at > NOW()',
            [email, req.body.otp]
        );
        if (otpRows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP' });

        // 2. Hash and Save
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (email, username, password, group_name) VALUES (?, ?, ?, ?)', [email, username, hashedPassword, group_name]);

        // 3. Cleanup OTP
        await db.query('DELETE FROM otp_tokens WHERE email = ?', [email]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Login
exports.login = async (req, res) => {
    let { username, password } = req.body;
    try {
        username = username?.trim();

        // Allow login by username OR email
        const [users] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username.toLowerCase()]);
        if (users.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const tokenPayload = { id: user.id, role: user.role, group_name: user.group_name, group_permissions: user.group_permissions };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                group_name: user.group_name,
                group_permissions: user.group_permissions
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
    let { email } = req.body;
    try {
        email = email?.trim().toLowerCase();
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ message: 'No account found with this email' });

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
            'INSERT INTO otp_tokens (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?',
            [email, otp, expiresAt, otp, expiresAt]
        );

        await sendOTP(email, otp, 'Reset Your Password - Sadhana Tracker');
        res.json({ message: 'OTP sent to your email' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Reset Password (after OTP verified)
exports.resetPassword = async (req, res) => {
    let { email, otp, newPassword } = req.body;
    try {
        email = email?.trim().toLowerCase();
        const [rows] = await db.query(
            'SELECT * FROM otp_tokens WHERE email = ? AND otp = ? AND expires_at > NOW()',
            [email, otp]
        );
        if (rows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        await db.query('DELETE FROM otp_tokens WHERE email = ?', [email]);

        // Send confirmation email with the new password
        try {
            await sendOTP(email, newPassword, 'Your Password Has Been Reset - Sadhana Tracker', `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #f0a500; border-radius: 8px;">
                    <h2 style="color: #c47a00; text-align: center;">🪷 Password Reset Successful</h2>
                    <p style="font-size: 16px;">Hare Krishna! 🙏</p>
                    <p style="font-size: 15px; color: #444;">
                        Your password for <strong>Sadhana Tracker</strong> has been successfully reset.
                    </p>
                    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 16px; margin: 16px 0; text-align: center;">
                        <p style="font-size: 14px; color: #856404; margin-bottom: 8px;">Your new password is:</p>
                        <code style="font-size: 18px; font-weight: bold; color: #000; background: white; padding: 4px 12px; border-radius: 4px;">${newPassword}</code>
                    </div>
                    <p style="font-size: 14px; color: #666;">
                        Please log in and change your password if you did not request this change.
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="https://sadhana.wsahoo.space/login" 
                           style="background: #c47a00; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold;">
                            Login Now
                        </a>
                    </div>
                </div>
            `);
        } catch (mailErr) {
            console.error('Failed to send password confirmation email:', mailErr);
            // We don't fail the whole request if just the email fails, as the DB is already updated
        }

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Set Group (one-time, for existing users who don't have a group yet)
exports.setGroup = async (req, res) => {
    const validGroups = ['bhima', 'arjun', 'nakul', 'sahadev', 'yudhisthir', 'other'];
    const { group_name } = req.body;
    const userId = req.user.id;

    if (!validGroups.includes(group_name)) {
        return res.status(400).json({ message: 'Invalid group name' });
    }

    try {
        const [rows] = await db.query('SELECT group_name FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        if (rows[0].group_name !== null) {
            return res.status(400).json({ message: 'Group already set. Cannot change.' });
        }

        await db.query('UPDATE users SET group_name = ? WHERE id = ?', [group_name, userId]);
        res.json({ message: 'Group set successfully', group_name });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
