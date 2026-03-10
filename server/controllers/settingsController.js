const db = require('../config/db');
const axios = require('axios');

// Get current settings
exports.getSettings = async (req, res) => {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(255) PRIMARY KEY, setting_value TEXT) ENGINE=InnoDB`);
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
        const settings = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

// Upload release to GitHub and update DB
exports.configureRelease = async (req, res) => {
    try {
        const { version } = req.body;
        const file = req.file;

        if (!version || !file) {
            return res.status(400).json({ message: 'Version number and APK file are required' });
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.trim();
        const GITHUB_REPO = process.env.GITHUB_REPO?.trim();

        if (!GITHUB_TOKEN || !GITHUB_REPO) {
            console.error('Missing GitHub credentials in .env file!');
            return res.status(500).json({ message: 'GitHub auto-updater credentials are not configured on the server.' });
        }

        console.log(`📡 Creating GitHub Release v${version}...`);
        
        // 1. Create Release on GitHub
        const releaseRes = await axios.post(
            `https://api.github.com/repos/${GITHUB_REPO}/releases`,
            {
                tag_name: `v${version}`,
                name: `Sadhana Tracker v${version}`,
                body: `Automated release v${version} for Sadhana Tracker App`,
                draft: false,
                prerelease: false
            },
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        // Upload URL has a template we need to format
        const rawUploadUrl = releaseRes.data.upload_url;
        const uploadUrl = rawUploadUrl.replace('{?name,label}', `?name=sadhana-app-v${version}.apk`);

        console.log(`📦 Uploading APK asset (${file.size} bytes) to GitHub...`);

        // 2. Upload APK binary as an Asset
        const assetRes = await axios.post(
            uploadUrl,
            file.buffer,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/vnd.android.package-archive',
                    'Accept': 'application/vnd.github.v3+json'
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        const downloadUrl = assetRes.data.browser_download_url;
        console.log(`✅ Upload complete! Global Download URL: ${downloadUrl}`);

        // 3. Update database with new version and the direct GitHub URL
        await db.query(`CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(255) PRIMARY KEY, setting_value TEXT) ENGINE=InnoDB`);
        await db.query('REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['latest_apk_version', version]);
        await db.query('REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)', ['apk_download_url', downloadUrl]);

        res.json({ message: 'Release published to GitHub successfully', version, url: downloadUrl });

    } catch (error) {
        console.error('Error in GitHub Release process:', error.response?.data || error);
        
        let errorMessage = `Error: ${error.message}`;
        if (error.response?.data) {
            errorMessage += ` | GitHub Details: ${JSON.stringify(error.response.data)}`;
        }

        if (error.response?.status === 401) errorMessage = 'Unauthorized: Invalid GitHub Token in server config.';
        if (error.response?.status === 404) errorMessage = 'Repository not found. Check GITHUB_REPO name.';
        if (error.response?.data?.errors?.[0]?.code === 'already_exists') errorMessage = `Release version v${version} already exists on GitHub! Please use a higher version.`;
        
        res.status(500).json({ message: errorMessage });
    }
};
