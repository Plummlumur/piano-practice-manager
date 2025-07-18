const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

async function initDatabase() {
    try {
        logger.info('Starting database initialization...');

        // Read and execute schema
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split SQL statements by semicolon and execute each one
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            if (statement.toUpperCase().startsWith('CREATE') || 
                statement.toUpperCase().startsWith('INSERT') ||
                statement.toUpperCase().startsWith('USE')) {
                try {
                    await executeQuery(statement);
                    logger.info(`Executed: ${statement.substring(0, 50)}...`);
                } catch (err) {
                    logger.warn(`Warning executing statement: ${err.message}`);
                }
            }
        }

        logger.info('✅ Database initialization completed successfully!');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Database initialization failed:', err);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase };