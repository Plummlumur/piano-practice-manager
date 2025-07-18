const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Register new user
router.post('/register', [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('firstName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('First name must be less than 100 characters'),
    body('lastName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Last name must be less than 100 characters')
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

        const { username, email, password, firstName, lastName } = req.body;

        // Check if user already exists
        const existingUser = await executeQuery(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                error: 'User already exists',
                message: 'Username or email already registered'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const result = await executeQuery(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, firstName || null, lastName || null]
        );

        const userId = result.insertId;

        // Generate JWT token
        const token = generateToken(userId, username);

        // Create default preferences for new user
        const defaultPreferences = [
            ['theme', 'light'],
            ['language', 'en'],
            ['default_session_duration', '60'],
            ['week_starts_on', 'monday'],
            ['show_completed_sessions', 'true'],
            ['auto_save', 'true']
        ];

        await Promise.all(
            defaultPreferences.map(([key, value]) =>
                executeQuery(
                    'INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES (?, ?, ?)',
                    [userId, key, value]
                )
            )
        );

        logger.info(`New user registered: ${username} (ID: ${userId})`);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: userId,
                username,
                email,
                firstName: firstName || null,
                lastName: lastName || null
            },
            token
        });
    } catch (err) {
        logger.error('Registration error:', err);
        res.status(500).json({
            error: 'Registration failed',
            message: 'Internal server error'
        });
    }
});

// Login user
router.post('/login', [
    body('username')
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
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

        const { username, password } = req.body;

        // Find user by username or email
        const users = await executeQuery(
            'SELECT id, username, email, password_hash, first_name, last_name, is_active FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: 'Login failed',
                message: 'Invalid username or password'
            });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Login failed',
                message: 'Invalid username or password'
            });
        }

        // Update last login timestamp
        await executeQuery(
            'UPDATE users SET last_login_at = NOW() WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = generateToken(user.id, user.username);

        logger.info(`User logged in: ${user.username} (ID: ${user.id})`);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            },
            token
        });
    } catch (err) {
        logger.error('Login error:', err);
        res.status(500).json({
            error: 'Login failed',
            message: 'Internal server error'
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await executeQuery(
            'SELECT id, username, email, first_name, last_name, created_at, last_login_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User profile not found'
            });
        }

        res.json({
            user: {
                id: user[0].id,
                username: user[0].username,
                email: user[0].email,
                firstName: user[0].first_name,
                lastName: user[0].last_name,
                createdAt: user[0].created_at,
                lastLoginAt: user[0].last_login_at
            }
        });
    } catch (err) {
        logger.error('Profile fetch error:', err);
        res.status(500).json({
            error: 'Profile fetch failed',
            message: 'Internal server error'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('firstName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('First name must be less than 100 characters'),
    body('lastName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Last name must be less than 100 characters'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
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

        const { firstName, lastName, email } = req.body;
        const updates = [];
        const values = [];

        // Build dynamic update query
        if (firstName !== undefined) {
            updates.push('first_name = ?');
            values.push(firstName);
        }
        if (lastName !== undefined) {
            updates.push('last_name = ?');
            values.push(lastName);
        }
        if (email !== undefined) {
            // Check if email is already used by another user
            const existingUser = await executeQuery(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.id]
            );
            if (existingUser.length > 0) {
                return res.status(409).json({
                    error: 'Email already in use',
                    message: 'This email is already registered to another account'
                });
            }
            updates.push('email = ?');
            values.push(email);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No updates provided',
                message: 'At least one field must be updated'
            });
        }

        values.push(req.user.id);

        await executeQuery(
            `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            values
        );

        logger.info(`User profile updated: ${req.user.username} (ID: ${req.user.id})`);

        res.json({
            message: 'Profile updated successfully'
        });
    } catch (err) {
        logger.error('Profile update error:', err);
        res.status(500).json({
            error: 'Profile update failed',
            message: 'Internal server error'
        });
    }
});

// Change password
router.put('/password', authenticateToken, [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
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

        const { currentPassword, newPassword } = req.body;

        // Get current password hash
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

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await executeQuery(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [newPasswordHash, req.user.id]
        );

        logger.info(`Password changed for user: ${req.user.username} (ID: ${req.user.id})`);

        res.json({
            message: 'Password changed successfully'
        });
    } catch (err) {
        logger.error('Password change error:', err);
        res.status(500).json({
            error: 'Password change failed',
            message: 'Internal server error'
        });
    }
});

// Logout (client-side token removal, but we can log the event)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        logger.info(`User logged out: ${req.user.username} (ID: ${req.user.id})`);
        
        res.json({
            message: 'Logout successful'
        });
    } catch (err) {
        logger.error('Logout error:', err);
        res.status(500).json({
            error: 'Logout failed',
            message: 'Internal server error'
        });
    }
});

module.exports = router;