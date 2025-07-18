const bcrypt = require('bcryptjs');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

async function seedDatabase() {
    try {
        logger.info('Starting database seeding...');

        // Create a demo user
        const demoUsername = 'demo_user';
        const demoEmail = 'demo@conbravura.com';
        const demoPassword = 'DemoPassword123!';

        // Check if demo user already exists
        const existingUser = await executeQuery(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [demoUsername, demoEmail]
        );

        if (existingUser.length > 0) {
            logger.info('Demo user already exists, skipping user creation');
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(demoPassword, 12);

        // Create demo user
        const userResult = await executeQuery(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [demoUsername, demoEmail, passwordHash, 'Demo', 'User']
        );

        const userId = userResult.insertId;
        logger.info(`Demo user created with ID: ${userId}`);

        // Create default preferences
        const defaultPreferences = [
            ['theme', 'light'],
            ['language', 'en'],
            ['default_session_duration', '60'],
            ['week_starts_on', 'monday'],
            ['show_completed_sessions', 'true'],
            ['auto_save', 'true']
        ];

        for (const [key, value] of defaultPreferences) {
            await executeQuery(
                'INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES (?, ?, ?)',
                [userId, key, value]
            );
        }

        logger.info('Default preferences created');

        // Create sample piano pieces
        const samplePieces = [
            ['Für Elise', 'Ludwig van Beethoven', 'WoO 59', 'Henle Urtext', 'Repertoire', 5, '2024-01-20'],
            ['Moonlight Sonata - 1st Movement', 'Ludwig van Beethoven', 'Op. 27 No. 2', 'Henle Urtext', 'Repertoire', 8, '2024-01-18'],
            ['Prelude in C Major', 'Johann Sebastian Bach', 'BWV 846', 'Bach Complete Works', 'In Training', 3, '2024-01-15'],
            ['Minute Waltz', 'Frédéric Chopin', 'Op. 64 No. 1', 'Peters Edition', 'In Training', 2, '2024-01-12'],
            ['Clair de Lune', 'Claude Debussy', 'L. 75 No. 3', 'Durand Edition', 'In Training', 1, '2024-01-10'],
            ['Gymnopédie No. 1', 'Erik Satie', '', 'Public Domain', 'Repertoire', 12, '2024-01-22'],
            ['Invention No. 1 in C Major', 'Johann Sebastian Bach', 'BWV 772', 'Bach Complete Works', 'Repertoire', 6, '2024-01-19']
        ];

        for (const [name, composer, classification, source, status, playCount, lastPlayed] of samplePieces) {
            await executeQuery(
                'INSERT INTO piano_pieces (user_id, name, composer, work_classification, source, status, play_counter, last_played_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [userId, name, composer, classification, source, status, playCount, lastPlayed]
            );
        }

        logger.info('Sample piano pieces created');

        // Create sample exercises
        const sampleExercises = [
            ['Hanon Exercise No. 1', 'Five-finger patterns for independence and strength', '2024-01-20'],
            ['Scales - C Major', 'Major scale practice in C major, both hands', '2024-01-19'],
            ['Arpeggios - C Major Triad', 'Broken chord practice in C major', '2024-01-18'],
            ['Chromatic Scale', 'Chromatic scale practice for finger dexterity', '2024-01-17'],
            ['Octave Exercises', 'Octave stretches and strength building', '2024-01-16'],
            ['Hanon Exercise No. 2', 'Finger independence and strength building', '2024-01-15'],
            ['Scales - G Major', 'Major scale practice in G major, both hands', '2024-01-14']
        ];

        for (const [name, description, lastPracticed] of sampleExercises) {
            await executeQuery(
                'INSERT INTO finger_exercises (user_id, name, description, last_practiced_date) VALUES (?, ?, ?, ?)',
                [userId, name, description, lastPracticed]
            );
        }

        logger.info('Sample exercises created');

        // Create sample training sessions
        const sampleSessions = [
            ['2024-01-22', 90, 'Completed', 'Great practice session focusing on Bach and Chopin', '2024-01-22 20:30:00'],
            ['2024-01-21', 75, 'Completed', 'Worked on scales and Beethoven pieces', '2024-01-21 19:45:00'],
            ['2024-01-20', 60, 'Completed', 'Technical exercises and sight-reading', '2024-01-20 18:15:00'],
            ['2024-01-19', 45, 'Completed', 'Quick practice session before dinner', '2024-01-19 17:30:00'],
            ['2024-01-18', 120, 'Completed', 'Long practice session with repertoire pieces', '2024-01-18 16:00:00'],
            ['2024-01-23', 60, 'Planned', 'Planned practice session', null],
            ['2024-01-24', 75, 'Planned', 'Focus on new pieces', null]
        ];

        for (const [date, duration, status, notes, completedAt] of sampleSessions) {
            await executeQuery(
                'INSERT INTO training_sessions (user_id, session_date, duration, status, notes, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, date, duration, status, notes, completedAt]
            );
        }

        logger.info('Sample training sessions created');

        // Create practice statistics
        const practiceStats = [
            ['2024-01-22', 90, 1, 3, 2],
            ['2024-01-21', 75, 1, 2, 3],
            ['2024-01-20', 60, 1, 2, 2],
            ['2024-01-19', 45, 1, 1, 1],
            ['2024-01-18', 120, 1, 4, 3]
        ];

        for (const [date, minutes, sessions, pieces, exercises] of practiceStats) {
            await executeQuery(
                'INSERT INTO practice_statistics (user_id, stat_date, total_minutes, session_count, pieces_practiced, exercises_practiced) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, date, minutes, sessions, pieces, exercises]
            );
        }

        logger.info('Practice statistics created');

        logger.info('✅ Database seeding completed successfully!');
        logger.info(`Demo user credentials:`);
        logger.info(`Username: ${demoUsername}`);
        logger.info(`Email: ${demoEmail}`);
        logger.info(`Password: ${demoPassword}`);
        
        process.exit(0);
    } catch (err) {
        logger.error('❌ Database seeding failed:', err);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = { seedDatabase };