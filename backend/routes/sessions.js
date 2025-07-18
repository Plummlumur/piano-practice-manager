const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all sessions for the current user
router.get('/', async (req, res) => {
    try {
        const { from, to, status } = req.query;
        
        let query = `
            SELECT s.id, s.session_date, s.duration, s.status, s.notes, s.created_at, s.updated_at, s.completed_at,
                   GROUP_CONCAT(DISTINCT CONCAT(p.id, ':', p.name, ':', p.composer) SEPARATOR '|') as pieces,
                   GROUP_CONCAT(DISTINCT CONCAT(e.id, ':', e.name) SEPARATOR '|') as exercises
            FROM training_sessions s
            LEFT JOIN session_piano_pieces spp ON s.id = spp.session_id
            LEFT JOIN piano_pieces p ON spp.piece_id = p.id
            LEFT JOIN session_finger_exercises sfe ON s.id = sfe.session_id
            LEFT JOIN finger_exercises e ON sfe.exercise_id = e.id
            WHERE s.user_id = ?
        `;
        
        const params = [req.user.id];
        
        if (from) {
            query += ' AND s.session_date >= ?';
            params.push(from);
        }
        
        if (to) {
            query += ' AND s.session_date <= ?';
            params.push(to);
        }
        
        if (status) {
            query += ' AND s.status = ?';
            params.push(status);
        }
        
        query += ' GROUP BY s.id ORDER BY s.session_date DESC, s.created_at DESC';
        
        const sessions = await executeQuery(query, params);

        res.json({
            sessions: sessions.map(session => ({
                id: session.id,
                date: session.session_date,
                duration: session.duration,
                status: session.status,
                notes: session.notes,
                pieces: session.pieces ? session.pieces.split('|').map(piece => {
                    const [id, name, composer] = piece.split(':');
                    return { id: parseInt(id), name, composer };
                }) : [],
                exercises: session.exercises ? session.exercises.split('|').map(exercise => {
                    const [id, name] = exercise.split(':');
                    return { id: parseInt(id), name };
                }) : [],
                created_at: session.created_at,
                updated_at: session.updated_at,
                completed_at: session.completed_at
            }))
        });
    } catch (err) {
        logger.error('Error fetching sessions:', err);
        res.status(500).json({
            error: 'Failed to fetch sessions',
            message: 'Internal server error'
        });
    }
});

// Get session by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sessions = await executeQuery(
            `SELECT s.id, s.session_date, s.duration, s.status, s.notes, s.created_at, s.updated_at, s.completed_at,
                    GROUP_CONCAT(DISTINCT CONCAT(p.id, ':', p.name, ':', p.composer, ':', COALESCE(spp.duration_minutes, 0), ':', COALESCE(spp.notes, '')) SEPARATOR '|') as pieces,
                    GROUP_CONCAT(DISTINCT CONCAT(e.id, ':', e.name, ':', COALESCE(sfe.duration_minutes, 0), ':', COALESCE(sfe.notes, '')) SEPARATOR '|') as exercises
             FROM training_sessions s
             LEFT JOIN session_piano_pieces spp ON s.id = spp.session_id
             LEFT JOIN piano_pieces p ON spp.piece_id = p.id
             LEFT JOIN session_finger_exercises sfe ON s.id = sfe.session_id
             LEFT JOIN finger_exercises e ON sfe.exercise_id = e.id
             WHERE s.id = ? AND s.user_id = ?
             GROUP BY s.id`,
            [id, req.user.id]
        );

        if (sessions.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                message: 'Session not found or access denied'
            });
        }

        const session = sessions[0];
        res.json({
            session: {
                id: session.id,
                date: session.session_date,
                duration: session.duration,
                status: session.status,
                notes: session.notes,
                pieces: session.pieces ? session.pieces.split('|').map(piece => {
                    const [id, name, composer, duration, notes] = piece.split(':');
                    return { 
                        id: parseInt(id), 
                        name, 
                        composer,
                        duration_minutes: parseInt(duration) || 0,
                        notes: notes || null
                    };
                }) : [],
                exercises: session.exercises ? session.exercises.split('|').map(exercise => {
                    const [id, name, duration, notes] = exercise.split(':');
                    return { 
                        id: parseInt(id), 
                        name,
                        duration_minutes: parseInt(duration) || 0,
                        notes: notes || null
                    };
                }) : [],
                created_at: session.created_at,
                updated_at: session.updated_at,
                completed_at: session.completed_at
            }
        });
    } catch (err) {
        logger.error('Error fetching session:', err);
        res.status(500).json({
            error: 'Failed to fetch session',
            message: 'Internal server error'
        });
    }
});

// Create new session
router.post('/', [
    body('date')
        .isISO8601()
        .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
    body('duration')
        .isInt({ min: 1, max: 480 })
        .withMessage('Duration must be between 1 and 480 minutes'),
    body('status')
        .optional()
        .isIn(['Planned', 'Completed', 'Cancelled'])
        .withMessage('Status must be either "Planned", "Completed", or "Cancelled"'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes must be less than 1000 characters'),
    body('pieces')
        .optional()
        .isArray()
        .withMessage('Pieces must be an array'),
    body('exercises')
        .optional()
        .isArray()
        .withMessage('Exercises must be an array')
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

        const { date, duration, status, notes, pieces, exercises } = req.body;

        const queries = [];
        
        // Insert session
        queries.push({
            query: `INSERT INTO training_sessions (user_id, session_date, duration, status, notes, completed_at) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
            params: [
                req.user.id,
                date,
                duration,
                status || 'Planned',
                notes || null,
                status === 'Completed' ? new Date() : null
            ]
        });

        const results = await executeTransaction(queries);
        const sessionId = results[0].insertId;

        // Add pieces and exercises if provided
        if (pieces && pieces.length > 0) {
            const pieceQueries = pieces.map(piece => ({
                query: 'INSERT INTO session_piano_pieces (session_id, piece_id, duration_minutes, notes) VALUES (?, ?, ?, ?)',
                params: [sessionId, piece.id, piece.duration_minutes || 0, piece.notes || null]
            }));
            await executeTransaction(pieceQueries);
        }

        if (exercises && exercises.length > 0) {
            const exerciseQueries = exercises.map(exercise => ({
                query: 'INSERT INTO session_finger_exercises (session_id, exercise_id, duration_minutes, notes) VALUES (?, ?, ?, ?)',
                params: [sessionId, exercise.id, exercise.duration_minutes || 0, exercise.notes || null]
            }));
            await executeTransaction(exerciseQueries);
        }

        // Update practice statistics if session is completed
        if (status === 'Completed') {
            await executeQuery(
                `INSERT INTO practice_statistics (user_id, stat_date, total_minutes, session_count, pieces_practiced, exercises_practiced) 
                 VALUES (?, ?, ?, 1, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 total_minutes = total_minutes + VALUES(total_minutes),
                 session_count = session_count + 1,
                 pieces_practiced = pieces_practiced + VALUES(pieces_practiced),
                 exercises_practiced = exercises_practiced + VALUES(exercises_practiced)`,
                [req.user.id, date, duration, pieces?.length || 0, exercises?.length || 0]
            );
        }

        logger.info(`New session created: ${date} (ID: ${sessionId}, User: ${req.user.username})`);

        res.status(201).json({
            message: 'Session created successfully',
            session: {
                id: sessionId,
                date,
                duration,
                status: status || 'Planned',
                notes: notes || null,
                pieces: pieces || [],
                exercises: exercises || []
            }
        });
    } catch (err) {
        logger.error('Error creating session:', err);
        res.status(500).json({
            error: 'Failed to create session',
            message: 'Internal server error'
        });
    }
});

// Update session
router.put('/:id', [
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)'),
    body('duration')
        .optional()
        .isInt({ min: 1, max: 480 })
        .withMessage('Duration must be between 1 and 480 minutes'),
    body('status')
        .optional()
        .isIn(['Planned', 'Completed', 'Cancelled'])
        .withMessage('Status must be either "Planned", "Completed", or "Cancelled"'),
    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes must be less than 1000 characters')
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

        const { id } = req.params;
        const { date, duration, status, notes } = req.body;

        // Check if session exists and belongs to user
        const existingSession = await executeQuery(
            'SELECT id, status as current_status FROM training_sessions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingSession.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                message: 'Session not found or access denied'
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];

        if (date !== undefined) {
            updates.push('session_date = ?');
            values.push(date);
        }
        if (duration !== undefined) {
            updates.push('duration = ?');
            values.push(duration);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
            
            // Update completed_at based on status
            if (status === 'Completed') {
                updates.push('completed_at = NOW()');
            } else if (status !== 'Completed' && existingSession[0].current_status === 'Completed') {
                updates.push('completed_at = NULL');
            }
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No updates provided',
                message: 'At least one field must be updated'
            });
        }

        values.push(id, req.user.id);

        await executeQuery(
            `UPDATE training_sessions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`,
            values
        );

        logger.info(`Session updated: ID ${id} (User: ${req.user.username})`);

        res.json({
            message: 'Session updated successfully'
        });
    } catch (err) {
        logger.error('Error updating session:', err);
        res.status(500).json({
            error: 'Failed to update session',
            message: 'Internal server error'
        });
    }
});

// Delete session
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if session exists and belongs to user
        const existingSession = await executeQuery(
            'SELECT session_date FROM training_sessions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingSession.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                message: 'Session not found or access denied'
            });
        }

        // Delete the session (this will also cascade delete related session pieces and exercises)
        await executeQuery(
            'DELETE FROM training_sessions WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        logger.info(`Session deleted: ${existingSession[0].session_date} (ID: ${id}, User: ${req.user.username})`);

        res.json({
            message: 'Session deleted successfully'
        });
    } catch (err) {
        logger.error('Error deleting session:', err);
        res.status(500).json({
            error: 'Failed to delete session',
            message: 'Internal server error'
        });
    }
});

// Get sessions by date range
router.get('/range/:from/:to', async (req, res) => {
    try {
        const { from, to } = req.params;
        
        const sessions = await executeQuery(
            `SELECT s.id, s.session_date, s.duration, s.status, s.notes, s.created_at, s.updated_at, s.completed_at,
                    COUNT(DISTINCT spp.piece_id) as piece_count,
                    COUNT(DISTINCT sfe.exercise_id) as exercise_count
             FROM training_sessions s
             LEFT JOIN session_piano_pieces spp ON s.id = spp.session_id
             LEFT JOIN session_finger_exercises sfe ON s.id = sfe.session_id
             WHERE s.user_id = ? AND s.session_date >= ? AND s.session_date <= ?
             GROUP BY s.id
             ORDER BY s.session_date DESC`,
            [req.user.id, from, to]
        );

        res.json({
            sessions: sessions.map(session => ({
                id: session.id,
                date: session.session_date,
                duration: session.duration,
                status: session.status,
                notes: session.notes,
                piece_count: session.piece_count,
                exercise_count: session.exercise_count,
                created_at: session.created_at,
                updated_at: session.updated_at,
                completed_at: session.completed_at
            }))
        });
    } catch (err) {
        logger.error('Error fetching sessions by date range:', err);
        res.status(500).json({
            error: 'Failed to fetch sessions',
            message: 'Internal server error'
        });
    }
});

module.exports = router;