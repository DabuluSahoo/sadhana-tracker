CREATE DATABASE IF NOT EXISTS sadhana_db;
USE sadhana_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('devotee', 'admin') DEFAULT 'devotee',
    -- Group the devotee belongs to (null = not yet selected)
    group_name ENUM('bhima','arjun','nakul','sahadev') DEFAULT NULL,
    -- JSON array of groups an admin can access, e.g. ["arjun","nakul"]
    -- NULL means no restriction (owner) or not applicable (devotee)
    group_permissions JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ⚠️  For existing databases, run these ALTER statements manually in TiDB Cloud:
-- ALTER TABLE users ADD COLUMN group_name ENUM('bhima','arjun','nakul','sahadev') DEFAULT NULL;
-- ALTER TABLE users ADD COLUMN group_permissions JSON DEFAULT NULL;

CREATE TABLE IF NOT EXISTS otp_tokens (
    email VARCHAR(255) PRIMARY KEY,
    otp VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL
);


CREATE TABLE IF NOT EXISTS daily_sadhana (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    rounds INT DEFAULT 0,
    reading_time INT DEFAULT 0 COMMENT 'in minutes',
    hearing_time INT DEFAULT 0 COMMENT 'in minutes',
    study_time INT DEFAULT 0 COMMENT 'in minutes',
    dayrest_time INT DEFAULT 0 COMMENT 'in minutes',
    mangala_aarti BOOLEAN DEFAULT FALSE,
    wakeup_time TIME,
    sleep_time TIME,
    service_hours FLOAT DEFAULT 0,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date)
);
