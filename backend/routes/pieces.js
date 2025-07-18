const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all pieces for the current user
router.get('/', async (req, res) => {
    try {
        const pieces = await executeQuery(
            `SELECT id, name, composer, work_classification, source, status, play_counter, 
                    last_played_date, created_at, updated_at 
             FROM piano_pieces 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            pieces: pieces.map(piece => ({
                id: piece.id,
                name: piece.name,
                composer: piece.composer,
                work_classification: piece.work_classification,
                source: piece.source,
                status: piece.status,
                play_counter: piece.play_counter,
                last_played_date: piece.last_played_date,
                creation_date: piece.created_at,
                updated_at: piece.updated_at
            }))
        });
    } catch (err) {
        logger.error('Error fetching pieces:', err);
        res.status(500).json({
            error: 'Failed to fetch pieces',
            message: 'Internal server error'
        });
    }
});

// Get piece by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const pieces = await executeQuery(
            `SELECT id, name, composer, work_classification, source, status, play_counter, 
                    last_played_date, created_at, updated_at 
             FROM piano_pieces 
             WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );

        if (pieces.length === 0) {
            return res.status(404).json({
                error: 'Piece not found',
                message: 'Piece not found or access denied'
            });
        }

        const piece = pieces[0];
        res.json({
            piece: {
                id: piece.id,
                name: piece.name,
                composer: piece.composer,
                work_classification: piece.work_classification,
                source: piece.source,
                status: piece.status,
                play_counter: piece.play_counter,
                last_played_date: piece.last_played_date,
                creation_date: piece.created_at,
                updated_at: piece.updated_at
            }
        });
    } catch (err) {
        logger.error('Error fetching piece:', err);
        res.status(500).json({
            error: 'Failed to fetch piece',
            message: 'Internal server error'
        });
    }
});

// Create new piece
router.post('/', [
    body('name')
        .isLength({ min: 1, max: 200 })
        .withMessage('Piece name must be between 1 and 200 characters'),
    body('composer')
        .isLength({ min: 1, max: 100 })
        .withMessage('Composer name must be between 1 and 100 characters'),
    body('work_classification')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Work classification must be less than 100 characters'),
    body('source')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Source must be less than 200 characters'),
    body('status')
        .isIn(['In Training', 'Repertoire'])
        .withMessage('Status must be either "In Training" or "Repertoire"'),
    body('play_count')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Play count must be a non-negative integer')
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

        const { name, composer, work_classification, source, status, play_count } = req.body;

        const result = await executeQuery(
            `INSERT INTO piano_pieces (user_id, name, composer, work_classification, source, status, play_counter) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                name,
                composer,
                work_classification || null,
                source || null,
                status || 'In Training',
                play_count || 0
            ]
        );

        const pieceId = result.insertId;

        logger.info(`New piece created: ${name} by ${composer} (ID: ${pieceId}, User: ${req.user.username})`);

        res.status(201).json({
            message: 'Piece created successfully',
            piece: {
                id: pieceId,
                name,
                composer,
                work_classification: work_classification || null,
                source: source || null,
                status: status || 'In Training',
                play_counter: play_count || 0,
                last_played_date: null,
                creation_date: new Date().toISOString()
            }
        });
    } catch (err) {
        logger.error('Error creating piece:', err);
        res.status(500).json({
            error: 'Failed to create piece',
            message: 'Internal server error'
        });
    }
});

// Update piece
router.put('/:id', [
    body('name')
        .optional()
        .isLength({ min: 1, max: 200 })
        .withMessage('Piece name must be between 1 and 200 characters'),
    body('composer')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Composer name must be between 1 and 100 characters'),
    body('work_classification')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Work classification must be less than 100 characters'),
    body('source')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Source must be less than 200 characters'),
    body('status')
        .optional()
        .isIn(['In Training', 'Repertoire'])
        .withMessage('Status must be either "In Training" or "Repertoire"'),
    body('play_count')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Play count must be a non-negative integer')
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
        const { name, composer, work_classification, source, status, play_count } = req.body;

        // Check if piece exists and belongs to user
        const existingPiece = await executeQuery(
            'SELECT id FROM piano_pieces WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingPiece.length === 0) {
            return res.status(404).json({
                error: 'Piece not found',
                message: 'Piece not found or access denied'
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (composer !== undefined) {
            updates.push('composer = ?');
            values.push(composer);
        }
        if (work_classification !== undefined) {
            updates.push('work_classification = ?');
            values.push(work_classification);
        }
        if (source !== undefined) {
            updates.push('source = ?');
            values.push(source);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }
        if (play_count !== undefined) {
            updates.push('play_counter = ?');
            values.push(play_count);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No updates provided',
                message: 'At least one field must be updated'
            });
        }

        values.push(id, req.user.id);

        await executeQuery(
            `UPDATE piano_pieces SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`,
            values
        );

        logger.info(`Piece updated: ID ${id} (User: ${req.user.username})`);

        res.json({
            message: 'Piece updated successfully'
        });
    } catch (err) {
        logger.error('Error updating piece:', err);
        res.status(500).json({
            error: 'Failed to update piece',
            message: 'Internal server error'
        });
    }
});

// Delete piece
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if piece exists and belongs to user
        const existingPiece = await executeQuery(
            'SELECT name, composer FROM piano_pieces WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingPiece.length === 0) {
            return res.status(404).json({
                error: 'Piece not found',
                message: 'Piece not found or access denied'
            });
        }

        // Delete the piece (this will also cascade delete related session pieces)
        await executeQuery(
            'DELETE FROM piano_pieces WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        logger.info(`Piece deleted: ${existingPiece[0].name} by ${existingPiece[0].composer} (ID: ${id}, User: ${req.user.username})`);

        res.json({
            message: 'Piece deleted successfully'
        });
    } catch (err) {
        logger.error('Error deleting piece:', err);
        res.status(500).json({
            error: 'Failed to delete piece',
            message: 'Internal server error'
        });
    }
});

// Get pieces by status
router.get('/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        
        if (!['In Training', 'Repertoire'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be either "In Training" or "Repertoire"'
            });
        }

        const pieces = await executeQuery(
            `SELECT id, name, composer, work_classification, source, status, play_counter, 
                    last_played_date, created_at, updated_at 
             FROM piano_pieces 
             WHERE user_id = ? AND status = ? 
             ORDER BY last_played_date ASC NULLS FIRST`,
            [req.user.id, status]
        );

        res.json({
            pieces: pieces.map(piece => ({
                id: piece.id,
                name: piece.name,
                composer: piece.composer,
                work_classification: piece.work_classification,
                source: piece.source,
                status: piece.status,
                play_counter: piece.play_counter,
                last_played_date: piece.last_played_date,
                creation_date: piece.created_at,
                updated_at: piece.updated_at
            }))
        });
    } catch (err) {
        logger.error('Error fetching pieces by status:', err);
        res.status(500).json({
            error: 'Failed to fetch pieces',
            message: 'Internal server error'
        });
    }
});

// Mark piece as played (increment play counter and update last played date)
router.post('/:id/play', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if piece exists and belongs to user
        const existingPiece = await executeQuery(
            'SELECT id, name, composer FROM piano_pieces WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingPiece.length === 0) {
            return res.status(404).json({
                error: 'Piece not found',
                message: 'Piece not found or access denied'
            });
        }

        // Update play counter and last played date
        await executeQuery(
            'UPDATE piano_pieces SET play_counter = play_counter + 1, last_played_date = CURDATE(), updated_at = NOW() WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        logger.info(`Piece played: ${existingPiece[0].name} by ${existingPiece[0].composer} (ID: ${id}, User: ${req.user.username})`);

        res.json({
            message: 'Piece marked as played'
        });
    } catch (err) {
        logger.error('Error marking piece as played:', err);
        res.status(500).json({
            error: 'Failed to mark piece as played',
            message: 'Internal server error'
        });
    }
});

module.exports = router;