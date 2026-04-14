const db = require('../config/db');
const axios = require('axios');

// --- Global Settings ---

exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT key_name, value_text FROM admin_settings WHERE key_name IN ("latest_apk_version", "latest_apk_url")');
        const settings = {};
        rows.forEach(r => { settings[r.key_name] = r.value_text; });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Global Broadcast ---

exports.getBroadcast = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT value_text FROM admin_settings WHERE key_name = "global_broadcast"');
        res.json({ broadcast: rows[0]?.value_text || '' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateBroadcast = async (req, res) => {
    const { broadcast } = req.body;
    try {
        await db.query(
            'INSERT INTO admin_settings (key_name, value_text) VALUES ("global_broadcast", ?) ON DUPLICATE KEY UPDATE value_text = ?',
            [broadcast, broadcast]
        );
        res.json({ message: 'Broadcast updated successfully', broadcast });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Group Quotas ---

exports.getAllQuotas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM group_quotas');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getQuotaByGroup = async (req, res) => {
    const { groupName } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM group_quotas WHERE group_name = ?', [groupName]);
        if (rows.length === 0) return res.status(404).json({ message: 'Quota not found for this group' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateQuota = async (req, res) => {
    const { groupName } = req.params;
    const { read_target, hear_target, wake_target, sleep_target, study_target, placement_target } = req.body;
    try {
        await db.query(
            `INSERT INTO group_quotas (group_name, read_target, hear_target, wake_target, sleep_target, study_target, placement_target) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
                read_target = VALUES(read_target), 
                hear_target = VALUES(hear_target), 
                wake_target = VALUES(wake_target), 
                sleep_target = VALUES(sleep_target),
                study_target = VALUES(study_target),
                placement_target = VALUES(placement_target)`,
            [groupName, read_target, hear_target, wake_target, sleep_target, study_target, placement_target]
        );
        res.json({ message: `Quotas for ${groupName} updated successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// --- Release Management (GitHub Deployment) ---

exports.uploadRelease = async (req, res) => {
    const { version } = req.body;
    const file = req.file;

    if (!version || !file) {
        return res.status(400).json({ message: 'Version and APK file are required' });
    }

    try {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_REPO = process.env.GITHUB_REPO;

        if (!GITHUB_TOKEN || !GITHUB_REPO) {
            throw new Error('GitHub configuration missing in .env (GITHUB_TOKEN or GITHUB_REPO)');
        }

        // 1. Create a GitHub Release
        const releaseResponse = await axios.post(
            `https://api.github.com/repos/${GITHUB_REPO}/releases`,
            {
                tag_name: `v${version}`,
                name: `Sadhana Tracker v${version}`,
                body: `Automated release for version ${version}`,
                draft: false,
                prerelease: false
            },
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );

        const uploadUrl = releaseResponse.data.upload_url.replace('{?name,label}', `?name=SadhanaTracker_v${version}.apk`);

        // 2. Upload the APK binary to the Release
        const uploadResponse = await axios.post(
            uploadUrl,
            file.buffer,
            {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/vnd.android.package-archive',
                    'Content-Length': file.size
                }
            }
        );

        const downloadUrl = uploadResponse.data.browser_download_url;

        // 3. Update Database with latest info
        await db.query(
            'INSERT INTO admin_settings (key_name, value_text) VALUES ("latest_apk_version", ?), ("latest_apk_url", ?) ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)',
            [version, downloadUrl]
        );

        res.json({ message: 'Release uploaded to GitHub successfully!', version, downloadUrl });
    } catch (err) {
        console.error('GitHub Upload Error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Deployment failed: ' + (err.response?.data?.message || err.message) });
    }
};
