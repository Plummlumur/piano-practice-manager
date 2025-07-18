const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user preferences
router.get('/preferences', async (req, res) => {
    try {
        const preferences = await executeQuery(
            'SELECT preference_key, preference_value FROM user_preferences WHERE user_id = ?',
            [req.user.id]
        );

        const preferencesObj = {};
        preferences.forEach(pref => {
            preferencesObj[pref.preference_key] = pref.preference_value;
        });

        res.json({
            preferences: preferencesObj
        });
    } catch (err) {
        logger.error('Error fetching user preferences:', err);
        res.status(500).json({
            error: 'Failed to fetch preferences',
            message: 'Internal server error'
        });
    }
});

// Update user preferences
router.put('/preferences', [
    body('preferences')
        .isObject()
        .withMessage('Preferences must be an object')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { preferences } = req.body;
        const allowedKeys = [
            'theme', 'language', 'default_session_duration', 'week_starts_on',
            'show_completed_sessions', 'auto_save', 'notification_enabled',
            'email_notifications', 'practice_reminders'
        ];

        const updates = [];
        for (const [key, value] of Object.entries(preferences)) {
            if (allowedKeys.includes(key)) {
                updates.push({
                    query: `INSERT INTO user_preferences (user_id, preference_key, preference_value) 
                           VALUES (?, ?, ?) 
                           ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value), updated_at = NOW()`,
                    params: [req.user.id, key, String(value)]
                });
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid preferences provided',
                message: 'At least one valid preference must be provided'
            });
        }

        await Promise.all(updates.map(update => executeQuery(update.query, update.params)));

        logger.info(`User preferences updated: ${req.user.username} (ID: ${req.user.id})`);

        res.json({
            message: 'Preferences updated successfully'
        });
    } catch (err) {
        logger.error('Error updating user preferences:', err);
        res.status(500).json({
            error: 'Failed to update preferences',
            message: 'Internal server error'
        });
    }
});

// Get user activity summary
router.get('/activity', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysInt = Math.min(parseInt(days) || 30, 365);

        const activities = await executeQuery(
            `SELECT 
                DATE(created_at) as date,
                'piece' as type,
                COUNT(*) as count
             FROM piano_pieces 
             WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             
             UNION ALL
             
             SELECT 
                DATE(created_at) as date,
                'exercise' as type,
                COUNT(*) as count
             FROM finger_exercises 
             WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             
             UNION ALL
             
             SELECT 
                DATE(session_date) as date,
                'session' as type,
                COUNT(*) as count
             FROM training_sessions 
             WHERE user_id = ? AND session_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(session_date)
             
             ORDER BY date DESC`,
            [req.user.id, daysInt, req.user.id, daysInt, req.user.id, daysInt]
        );

        // Group activities by date
        const activityByDate = {};
        activities.forEach(activity => {
            const date = activity.date;
            if (!activityByDate[date]) {
                activityByDate[date] = {
                    date,
                    pieces: 0,
                    exercises: 0,
                    sessions: 0
                };
            }
            activityByDate[date][activity.type === 'piece' ? 'pieces' : 
                                activity.type === 'exercise' ? 'exercises' : 'sessions'] = activity.count;
        });

        res.json({
            activities: Object.values(activityByDate).sort((a, b) => new Date(b.date) - new Date(a.date))
        });
    } catch (err) {
        logger.error('Error fetching user activity:', err);
        res.status(500).json({
            error: 'Failed to fetch activity',
            message: 'Internal server error'
        });
    }
});

// Get user profile summary
router.get('/profile/summary', async (req, res) => {
    try {
        const queries = [
            // User basic info
            'SELECT username, email, first_name, last_name, created_at, last_login_at FROM users WHERE id = ?',
            // Total pieces
            'SELECT COUNT(*) as total_pieces FROM piano_pieces WHERE user_id = ?',
            // Total exercises
            'SELECT COUNT(*) as total_exercises FROM finger_exercises WHERE user_id = ?',
            // Total sessions
            'SELECT COUNT(*) as total_sessions FROM training_sessions WHERE user_id = ?',
            // Total practice time
            'SELECT SUM(duration) as total_practice_minutes FROM training_sessions WHERE user_id = ? AND status = "Completed"',
            // Recent activity (last 7 days)
            'SELECT COUNT(*) as recent_sessions FROM training_sessions WHERE user_id = ? AND session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
        ];

        const results = await Promise.all(
            queries.map(query => executeQuery(query, [req.user.id]))
        );

        const user = results[0][0];
        const summary = {
            user: {
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at
            },
            stats: {
                totalPieces: results[1][0].total_pieces,
                totalExercises: results[2][0].total_exercises,
                totalSessions: results[3][0].total_sessions,
                totalPracticeMinutes: results[4][0].total_practice_minutes || 0,
                recentSessions: results[5][0].recent_sessions
            }
        };

        res.json(summary);
    } catch (err) {
        logger.error('Error fetching user profile summary:', err);
        res.status(500).json({
            error: 'Failed to fetch profile summary',
            message: 'Internal server error'
        });
    }
});

// Export user data
router.get('/export', async (req, res) => {
    try {
        const queries = [
            'SELECT * FROM piano_pieces WHERE user_id = ?',
            'SELECT * FROM finger_exercises WHERE user_id = ?',
            'SELECT * FROM training_sessions WHERE user_id = ?',
            'SELECT * FROM user_preferences WHERE user_id = ?'
        ];

        const results = await Promise.all(
            queries.map(query => executeQuery(query, [req.user.id]))
        );

        const exportData = {
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email
            },
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            data: {
                pieces: results[0],
                exercises: results[1],
                sessions: results[2],
                preferences: results[3]
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="con-bravura-export-${req.user.username}-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(exportData);

        logger.info(`User data exported: ${req.user.username} (ID: ${req.user.id})`);
    } catch (err) {
        logger.error('Error exporting user data:', err);
        res.status(500).json({
            error: 'Failed to export data',
            message: 'Internal server error'
        });
    }
});

// Delete user account (soft delete)
router.delete('/account', [
    body('password')
        .notEmpty()
        .withMessage('Password is required for account deletion')
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { password } = req.body;
        const bcrypt = require('bcryptjs');

        // Verify password
        const user = await executeQuery(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User not found'
            });
        }

        const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Password is incorrect'
            });
        }

        // Soft delete user account
        await executeQuery(
            'UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?',
            [req.user.id]
        );

        logger.info(`User account deleted: ${req.user.username} (ID: ${req.user.id})`);

        res.json({
            message: 'Account deleted successfully'
        });
    } catch (err) {
        logger.error('Error deleting user account:', err);
        res.status(500).json({
            error: 'Failed to delete account',
            message: 'Internal server error'
        });
    }
});

module.exports = router;