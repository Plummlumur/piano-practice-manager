-- Con Bravura Practice & Repertoire Assistant
-- MariaDB Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS con_bravura CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE con_bravura;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Piano pieces table
CREATE TABLE IF NOT EXISTS piano_pieces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    composer VARCHAR(100) NOT NULL,
    work_classification VARCHAR(100),
    source VARCHAR(200),
    status ENUM('In Training', 'Repertoire') DEFAULT 'In Training',
    play_counter INT DEFAULT 0,
    last_played_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_composer (composer),
    INDEX idx_last_played (last_played_date)
);

-- Finger exercises table
CREATE TABLE IF NOT EXISTS finger_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    last_practiced_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_last_practiced (last_practiced_date)
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_date DATE NOT NULL,
    duration INT NOT NULL, -- in minutes
    status ENUM('Planned', 'Completed', 'Cancelled') DEFAULT 'Planned',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_date (session_date),
    INDEX idx_status (status)
);

-- Session finger exercises junction table
CREATE TABLE IF NOT EXISTS session_finger_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    duration_minutes INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES finger_exercises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_exercise (session_id, exercise_id),
    INDEX idx_session_id (session_id),
    INDEX idx_exercise_id (exercise_id)
);

-- Session piano pieces junction table
CREATE TABLE IF NOT EXISTS session_piano_pieces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    piece_id INT NOT NULL,
    duration_minutes INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (piece_id) REFERENCES piano_pieces(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_piece (session_id, piece_id),
    INDEX idx_session_id (session_id),
    INDEX idx_piece_id (piece_id)
);

-- Practice statistics table for quick analytics
CREATE TABLE IF NOT EXISTS practice_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stat_date DATE NOT NULL,
    total_minutes INT NOT NULL,
    session_count INT NOT NULL,
    pieces_practiced INT DEFAULT 0,
    exercises_practiced INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, stat_date),
    INDEX idx_user_id (user_id),
    INDEX idx_stat_date (stat_date)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(50) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id, preference_key),
    INDEX idx_user_id (user_id)
);

-- API tokens table for authentication
CREATE TABLE IF NOT EXISTS api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    token_name VARCHAR(100) DEFAULT 'Default Token',
    expires_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
);

-- Create views for common queries
CREATE VIEW IF NOT EXISTS user_piece_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(pp.id) as total_pieces,
    SUM(CASE WHEN pp.status = 'In Training' THEN 1 ELSE 0 END) as training_pieces,
    SUM(CASE WHEN pp.status = 'Repertoire' THEN 1 ELSE 0 END) as repertoire_pieces,
    SUM(pp.play_counter) as total_play_count,
    AVG(pp.play_counter) as avg_play_count
FROM users u
LEFT JOIN piano_pieces pp ON u.id = pp.user_id
WHERE u.is_active = 1
GROUP BY u.id, u.username;

CREATE VIEW IF NOT EXISTS user_practice_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(ts.id) as total_sessions,
    SUM(CASE WHEN ts.status = 'Completed' THEN 1 ELSE 0 END) as completed_sessions,
    SUM(CASE WHEN ts.status = 'Completed' THEN ts.duration ELSE 0 END) as total_practice_minutes,
    AVG(CASE WHEN ts.status = 'Completed' THEN ts.duration ELSE NULL END) as avg_session_duration
FROM users u
LEFT JOIN training_sessions ts ON u.id = ts.user_id
WHERE u.is_active = 1
GROUP BY u.id, u.username;

-- Insert default preferences
INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES
(1, 'theme', 'light'),
(1, 'language', 'en'),
(1, 'default_session_duration', '60'),
(1, 'week_starts_on', 'monday'),
(1, 'show_completed_sessions', 'true'),
(1, 'auto_save', 'true')
ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value);