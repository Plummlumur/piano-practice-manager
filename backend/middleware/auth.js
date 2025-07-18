const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access denied',
            message: 'No token provided'
        });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if user exists and is active
        const user = await executeQuery(
            'SELECT id, username, email, is_active FROM users WHERE id = ? AND is_active = 1',
            [decoded.userId]
        );

        if (!user || user.length === 0) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid token or user not found'
            });
        }

        // Add user info to request
        req.user = {
            id: user[0].id,
            username: user[0].username,
            email: user[0].email
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please log in again'
            });
        }
        
        return res.status(403).json({
            error: 'Invalid token',
            message: 'Token verification failed'
        });
    }
};

// Middleware to check if user is admin (for future use)
const requireAdmin = async (req, res, next) => {
    try {
        const user = await executeQuery(
            'SELECT role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user || user.length === 0 || user[0].role !== 'admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Admin privileges required'
            });
        }

        next();
    } catch (err) {
        return res.status(500).json({
            error: 'Server error',
            message: 'Error checking admin privileges'
        });
    }
};

// Generate JWT token
const generateToken = (userId, username) => {
    return jwt.sign(
        { userId, username },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Decode token without verification (for debugging)
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (err) {
        return null;
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    generateToken,
    decodeToken
};