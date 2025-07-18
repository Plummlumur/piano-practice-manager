const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'con_bravura',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    acquireTimeout: 30000,
    timeout: 30000,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    trace: process.env.NODE_ENV === 'development'
});

// Test database connection
async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('✅ Database connected successfully');
        
        // Test query
        const rows = await conn.query('SELECT 1 as test');
        console.log('✅ Database query test passed:', rows[0]);
        
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

// Execute a query with error handling
async function executeQuery(query, params = []) {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(query, params);
        return result;
    } catch (err) {
        console.error('Database query error:', err.message);
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

// Execute a transaction
async function executeTransaction(queries) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        
        const results = [];
        for (const { query, params } of queries) {
            const result = await conn.query(query, params);
            results.push(result);
        }
        
        await conn.commit();
        return results;
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Transaction error:', err.message);
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

// Get database statistics
async function getDatabaseStats() {
    const queries = [
        'SELECT COUNT(*) as total_users FROM users WHERE is_active = 1',
        'SELECT COUNT(*) as total_pieces FROM piano_pieces',
        'SELECT COUNT(*) as total_sessions FROM training_sessions',
        'SELECT COUNT(*) as total_exercises FROM finger_exercises',
        'SELECT SUM(total_minutes) as total_practice_minutes FROM practice_statistics'
    ];
    
    try {
        const results = await Promise.all(
            queries.map(query => executeQuery(query))
        );
        
        return {
            totalUsers: results[0][0].total_users,
            totalPieces: results[1][0].total_pieces,
            totalSessions: results[2][0].total_sessions,
            totalExercises: results[3][0].total_exercises,
            totalPracticeMinutes: results[4][0].total_practice_minutes || 0
        };
    } catch (err) {
        console.error('Error getting database stats:', err.message);
        throw err;
    }
}

// Close database connection
async function closeConnection() {
    try {
        await pool.end();
        console.log('✅ Database connection closed');
    } catch (err) {
        console.error('❌ Error closing database connection:', err.message);
    }
}

module.exports = {
    pool,
    testConnection,
    executeQuery,
    executeTransaction,
    getDatabaseStats,
    closeConnection
};