const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all exercises for the current user
router.get('/', async (req, res) => {
    try {
        const exercises = await executeQuery(
            `SELECT id, name, description, last_practiced_date, created_at, updated_at 
             FROM finger_exercises 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            exercises: exercises.map(exercise => ({
                id: exercise.id,
                name: exercise.name,
                description: exercise.description,
                last_practiced_date: exercise.last_practiced_date,
                creation_date: exercise.created_at,
                updated_at: exercise.updated_at
            }))
        });
    } catch (err) {
        logger.error('Error fetching exercises:', err);
        res.status(500).json({
            error: 'Failed to fetch exercises',
            message: 'Internal server error'
        });
    }
});

// Get exercise by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const exercises = await executeQuery(
            `SELECT id, name, description, last_practiced_date, created_at, updated_at 
             FROM finger_exercises 
             WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );

        if (exercises.length === 0) {
            return res.status(404).json({
                error: 'Exercise not found',
                message: 'Exercise not found or access denied'
            });
        }

        const exercise = exercises[0];
        res.json({
            exercise: {
                id: exercise.id,
                name: exercise.name,
                description: exercise.description,
                last_practiced_date: exercise.last_practiced_date,
                creation_date: exercise.created_at,
                updated_at: exercise.updated_at
            }
        });
    } catch (err) {
        logger.error('Error fetching exercise:', err);
        res.status(500).json({
            error: 'Failed to fetch exercise',
            message: 'Internal server error'
        });
    }
});

// Create new exercise
router.post('/', [
    body('name')
        .isLength({ min: 1, max: 200 })
        .withMessage('Exercise name must be between 1 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters')
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

        const { name, description } = req.body;

        const result = await executeQuery(
            `INSERT INTO finger_exercises (user_id, name, description) 
             VALUES (?, ?, ?)`,
            [req.user.id, name, description || null]
        );

        const exerciseId = result.insertId;

        logger.info(`New exercise created: ${name} (ID: ${exerciseId}, User: ${req.user.username})`);

        res.status(201).json({
            message: 'Exercise created successfully',
            exercise: {
                id: exerciseId,
                name,
                description: description || null,
                last_practiced_date: null,
                creation_date: new Date().toISOString()
            }
        });
    } catch (err) {
        logger.error('Error creating exercise:', err);
        res.status(500).json({
            error: 'Failed to create exercise',
            message: 'Internal server error'
        });
    }
});

// Update exercise
router.put('/:id', [
    body('name')
        .optional()
        .isLength({ min: 1, max: 200 })
        .withMessage('Exercise name must be between 1 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters')
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
        const { name, description } = req.body;

        // Check if exercise exists and belongs to user
        const existingExercise = await executeQuery(
            'SELECT id FROM finger_exercises WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingExercise.length === 0) {
            return res.status(404).json({
                error: 'Exercise not found',
                message: 'Exercise not found or access denied'
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No updates provided',
                message: 'At least one field must be updated'
            });
        }

        values.push(id, req.user.id);

        await executeQuery(
            `UPDATE finger_exercises SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND user_id = ?`,
            values
        );

        logger.info(`Exercise updated: ID ${id} (User: ${req.user.username})`);

        res.json({
            message: 'Exercise updated successfully'
        });
    } catch (err) {
        logger.error('Error updating exercise:', err);
        res.status(500).json({
            error: 'Failed to update exercise',
            message: 'Internal server error'
        });
    }
});

// Delete exercise
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if exercise exists and belongs to user
        const existingExercise = await executeQuery(
            'SELECT name FROM finger_exercises WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingExercise.length === 0) {
            return res.status(404).json({
                error: 'Exercise not found',
                message: 'Exercise not found or access denied'
            });
        }

        // Delete the exercise (this will also cascade delete related session exercises)
        await executeQuery(
            'DELETE FROM finger_exercises WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        logger.info(`Exercise deleted: ${existingExercise[0].name} (ID: ${id}, User: ${req.user.username})`);

        res.json({
            message: 'Exercise deleted successfully'
        });
    } catch (err) {
        logger.error('Error deleting exercise:', err);
        res.status(500).json({
            error: 'Failed to delete exercise',
            message: 'Internal server error'
        });
    }
});

// Mark exercise as practiced (update last practiced date)
router.post('/:id/practice', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if exercise exists and belongs to user
        const existingExercise = await executeQuery(
            'SELECT id, name FROM finger_exercises WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingExercise.length === 0) {
            return res.status(404).json({
                error: 'Exercise not found',
                message: 'Exercise not found or access denied'
            });
        }

        // Update last practiced date
        await executeQuery(
            'UPDATE finger_exercises SET last_practiced_date = CURDATE(), updated_at = NOW() WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        logger.info(`Exercise practiced: ${existingExercise[0].name} (ID: ${id}, User: ${req.user.username})`);

        res.json({
            message: 'Exercise marked as practiced'
        });
    } catch (err) {
        logger.error('Error marking exercise as practiced:', err);
        res.status(500).json({
            error: 'Failed to mark exercise as practiced',
            message: 'Internal server error'
        });
    }
});

module.exports = router;