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
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        // Separate table creation from view creation for proper execution order
        const createStatements = [];
        const viewStatements = [];
        const otherStatements = [];

        for (const statement of statements) {
            const upperStatement = statement.toUpperCase();
            if (upperStatement.startsWith('CREATE TABLE') || 
                upperStatement.startsWith('USE')) {
                createStatements.push(statement);
            } else if (upperStatement.startsWith('CREATE VIEW')) {
                viewStatements.push(statement);
            } else if (upperStatement.startsWith('CREATE') || 
                       upperStatement.startsWith('INSERT')) {
                otherStatements.push(statement);
            }
        }

        // Execute in proper order: USE -> CREATE TABLE -> CREATE VIEW -> INSERT
        const allStatements = [...createStatements, ...viewStatements, ...otherStatements];

        for (const statement of allStatements) {
            try {
                await executeQuery(statement);
                const statementType = statement.split(' ')[1]?.toUpperCase() || 'UNKNOWN';
                logger.info(`✅ Executed ${statementType}: ${statement.substring(0, 50)}...`);
            } catch (err) {
                logger.error(`❌ Failed to execute statement: ${statement.substring(0, 50)}...`);
                logger.error(`Error: ${err.message}`);
                // Don't exit on error, but log it for debugging
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