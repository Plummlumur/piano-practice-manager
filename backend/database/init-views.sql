-- Con Bravura Practice & Repertoire Assistant
-- Database Views (run after tables are created)

USE con_bravura;

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