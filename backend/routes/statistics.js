const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        const queries = [
            // Total pieces
            'SELECT COUNT(*) as total_pieces FROM piano_pieces WHERE user_id = ?',
            // Training pieces
            'SELECT COUNT(*) as training_pieces FROM piano_pieces WHERE user_id = ? AND status = "In Training"',
            // Repertoire pieces
            'SELECT COUNT(*) as repertoire_pieces FROM piano_pieces WHERE user_id = ? AND status = "Repertoire"',
            // Total sessions
            'SELECT COUNT(*) as total_sessions FROM training_sessions WHERE user_id = ?',
            // Completed sessions
            'SELECT COUNT(*) as completed_sessions FROM training_sessions WHERE user_id = ? AND status = "Completed"',
            // Total practice time
            'SELECT SUM(duration) as total_practice_minutes FROM training_sessions WHERE user_id = ? AND status = "Completed"',
            // Total exercises
            'SELECT COUNT(*) as total_exercises FROM finger_exercises WHERE user_id = ?'
        ];

        const results = await Promise.all(
            queries.map(query => executeQuery(query, [req.user.id]))
        );

        const stats = {
            totalPieces: results[0][0].total_pieces,
            trainingPieces: results[1][0].training_pieces,
            repertoirePieces: results[2][0].repertoire_pieces,
            totalSessions: results[3][0].total_sessions,
            completedSessions: results[4][0].completed_sessions,
            totalPracticeMinutes: results[5][0].total_practice_minutes || 0,
            totalExercises: results[6][0].total_exercises
        };

        res.json({ stats });
    } catch (err) {
        logger.error('Error fetching dashboard statistics:', err);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: 'Internal server error'
        });
    }
});

// Get practice statistics for a specific number of days
router.get('/practice/:days', async (req, res) => {
    try {
        const { days } = req.params;
        const daysInt = parseInt(days);
        
        if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
            return res.status(400).json({
                error: 'Invalid days parameter',
                message: 'Days must be between 1 and 365'
            });
        }

        const practiceStats = await executeQuery(
            `SELECT 
                DATE(s.session_date) as date,
                SUM(s.duration) as total_minutes,
                COUNT(*) as session_count
             FROM training_sessions s
             WHERE s.user_id = ? 
             AND s.status = 'Completed'
             AND s.session_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(s.session_date)
             ORDER BY date DESC`,
            [req.user.id, daysInt]
        );

        res.json({
            practiceStats: practiceStats.map(stat => ({
                date: stat.date,
                total_minutes: stat.total_minutes,
                session_count: stat.session_count
            }))
        });
    } catch (err) {
        logger.error('Error fetching practice statistics:', err);
        res.status(500).json({
            error: 'Failed to fetch practice statistics',
            message: 'Internal server error'
        });
    }
});

// Get piece statistics
router.get('/pieces', async (req, res) => {
    try {
        const pieceStats = await executeQuery(
            `SELECT 
                p.id,
                p.name,
                p.composer,
                p.status,
                p.play_counter,
                p.last_played_date,
                COUNT(spp.id) as session_count,
                SUM(spp.duration_minutes) as total_practice_minutes
             FROM piano_pieces p
             LEFT JOIN session_piano_pieces spp ON p.id = spp.piece_id
             LEFT JOIN training_sessions s ON spp.session_id = s.id AND s.status = 'Completed'
             WHERE p.user_id = ?
             GROUP BY p.id
             ORDER BY p.play_counter DESC, p.name ASC`,
            [req.user.id]
        );

        res.json({
            pieceStats: pieceStats.map(stat => ({
                id: stat.id,
                name: stat.name,
                composer: stat.composer,
                status: stat.status,
                play_counter: stat.play_counter,
                last_played_date: stat.last_played_date,
                session_count: stat.session_count,
                total_practice_minutes: stat.total_practice_minutes || 0
            }))
        });
    } catch (err) {
        logger.error('Error fetching piece statistics:', err);
        res.status(500).json({
            error: 'Failed to fetch piece statistics',
            message: 'Internal server error'
        });
    }
});

// Get exercise statistics
router.get('/exercises', async (req, res) => {
    try {
        const exerciseStats = await executeQuery(
            `SELECT 
                e.id,
                e.name,
                e.last_practiced_date,
                COUNT(sfe.id) as session_count,
                SUM(sfe.duration_minutes) as total_practice_minutes
             FROM finger_exercises e
             LEFT JOIN session_finger_exercises sfe ON e.id = sfe.exercise_id
             LEFT JOIN training_sessions s ON sfe.session_id = s.id AND s.status = 'Completed'
             WHERE e.user_id = ?
             GROUP BY e.id
             ORDER BY e.last_practiced_date DESC NULLS LAST, e.name ASC`,
            [req.user.id]
        );

        res.json({
            exerciseStats: exerciseStats.map(stat => ({
                id: stat.id,
                name: stat.name,
                last_practiced_date: stat.last_practiced_date,
                session_count: stat.session_count,
                total_practice_minutes: stat.total_practice_minutes || 0
            }))
        });
    } catch (err) {
        logger.error('Error fetching exercise statistics:', err);
        res.status(500).json({
            error: 'Failed to fetch exercise statistics',
            message: 'Internal server error'
        });
    }
});

// Get monthly practice summary
router.get('/monthly/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const yearInt = parseInt(year);
        const monthInt = parseInt(month);
        
        if (isNaN(yearInt) || isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
            return res.status(400).json({
                error: 'Invalid year or month',
                message: 'Year must be a valid year and month must be between 1 and 12'
            });
        }

        const monthlyStats = await executeQuery(
            `SELECT 
                DATE(s.session_date) as date,
                SUM(s.duration) as total_minutes,
                COUNT(*) as session_count,
                COUNT(DISTINCT spp.piece_id) as unique_pieces_practiced,
                COUNT(DISTINCT sfe.exercise_id) as unique_exercises_practiced
             FROM training_sessions s
             LEFT JOIN session_piano_pieces spp ON s.id = spp.session_id
             LEFT JOIN session_finger_exercises sfe ON s.id = sfe.session_id
             WHERE s.user_id = ? 
             AND s.status = 'Completed'
             AND YEAR(s.session_date) = ?
             AND MONTH(s.session_date) = ?
             GROUP BY DATE(s.session_date)
             ORDER BY date ASC`,
            [req.user.id, yearInt, monthInt]
        );

        // Calculate totals
        const totalMinutes = monthlyStats.reduce((sum, day) => sum + (day.total_minutes || 0), 0);
        const totalSessions = monthlyStats.reduce((sum, day) => sum + (day.session_count || 0), 0);
        const avgSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

        res.json({
            month: `${yearInt}-${monthInt.toString().padStart(2, '0')}`,
            summary: {
                totalMinutes,
                totalSessions,
                avgSessionLength,
                practicedays: monthlyStats.length
            },
            dailyStats: monthlyStats.map(stat => ({
                date: stat.date,
                total_minutes: stat.total_minutes || 0,
                session_count: stat.session_count || 0,
                unique_pieces_practiced: stat.unique_pieces_practiced || 0,
                unique_exercises_practiced: stat.unique_exercises_practiced || 0
            }))
        });
    } catch (err) {
        logger.error('Error fetching monthly statistics:', err);
        res.status(500).json({
            error: 'Failed to fetch monthly statistics',
            message: 'Internal server error'
        });
    }
});

// Get practice streak information
router.get('/streak', async (req, res) => {
    try {
        const streakData = await executeQuery(
            `SELECT 
                DATE(session_date) as practice_date,
                SUM(duration) as total_minutes
             FROM training_sessions 
             WHERE user_id = ? AND status = 'Completed'
             GROUP BY DATE(session_date)
             ORDER BY practice_date DESC
             LIMIT 100`,
            [req.user.id]
        );

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let lastDate = null;

        for (const day of streakData) {
            const practiceDate = new Date(day.practice_date);
            
            if (lastDate === null) {
                // First day
                currentStreak = 1;
                tempStreak = 1;
                lastDate = practiceDate;
            } else {
                const daysDiff = Math.floor((lastDate - practiceDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff === 1) {
                    // Consecutive day
                    tempStreak++;
                    if (currentStreak > 0) {
                        currentStreak++;
                    }
                } else {
                    // Streak broken
                    longestStreak = Math.max(longestStreak, tempStreak);
                    tempStreak = 1;
                    currentStreak = 0; // Only count current streak from today backwards
                }
                
                lastDate = practiceDate;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);

        // Check if current streak is still active (practiced today or yesterday)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate) {
            const daysSinceLastPractice = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            if (daysSinceLastPractice > 1) {
                currentStreak = 0;
            }
        }

        res.json({
            currentStreak,
            longestStreak,
            totalPracticeDays: streakData.length,
            lastPracticeDate: lastDate ? lastDate.toISOString().split('T')[0] : null
        });
    } catch (err) {
        logger.error('Error fetching streak information:', err);
        res.status(500).json({
            error: 'Failed to fetch streak information',
            message: 'Internal server error'
        });
    }
});

module.exports = router;