CREATE DATABASE IF NOT EXISTS sadhana_db;
USE sadhana_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE, -- storing email here ideally
    password VARCHAR(255) NOT NULL,
    role ENUM('devotee', 'admin') DEFAULT 'devotee',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_sadhana (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    rounds INT DEFAULT 0,
    reading_time INT DEFAULT 0 COMMENT 'in minutes',
    hearing_time INT DEFAULT 0 COMMENT 'in minutes',
    mangala_aarti BOOLEAN DEFAULT FALSE,
    wakeup_time TIME,
    sleep_time TIME,
    service_hours FLOAT DEFAULT 0,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date)
);
