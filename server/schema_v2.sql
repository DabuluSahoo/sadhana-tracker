-- New tables for Spiritual Analytics & Scoring System

CREATE TABLE IF NOT EXISTS admin_settings (
    key_name VARCHAR(255) PRIMARY KEY,
    value_text TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed initial broadcast
INSERT IGNORE INTO admin_settings (key_name, value_text) VALUES ('global_broadcast', 'Welcome to the new Spiritual Analytics system!');

CREATE TABLE IF NOT EXISTS group_quotas (
    group_name VARCHAR(50) PRIMARY KEY,
    read_target INT DEFAULT 0 COMMENT 'in minutes',
    hear_target INT DEFAULT 0 COMMENT 'in minutes',
    wake_target TIME DEFAULT '05:00:00',
    sleep_target TIME DEFAULT '22:00:00',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed default quotas for existing groups
INSERT IGNORE INTO group_quotas (group_name, read_target, hear_target, wake_target, sleep_target) 
VALUES 
('bhima', 30, 30, '05:00:00', '22:00:00'),
('arjun', 30, 30, '05:00:00', '22:00:00'),
('nakul', 30, 30, '05:00:00', '22:00:00'),
('sahadev', 30, 30, '05:00:00', '22:00:00'),
('other', 0, 0, '05:30:00', '22:30:00'),
('yudhisthir', 45, 45, '04:30:00', '22:00:00'),
('brahmacari', 60, 60, '04:00:00', '22:00:00');

-- Add admin_comment column to daily_sadhana for "Digital Grace"
-- ALTER TABLE daily_sadhana ADD COLUMN admin_comment TEXT AFTER comments;
