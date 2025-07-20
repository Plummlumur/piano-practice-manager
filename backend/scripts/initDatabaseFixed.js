const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

async function initDatabase() {
    try {
        logger.info('Starting database initialization...');

        // Step 1: Initialize tables first
        logger.info('Step 1: Creating database tables...');
        const tablesPath = path.join(__dirname, '../database/init-tables-only.sql');
        const tablesSql = fs.readFileSync(tablesPath, 'utf8');

        const tableStatements = tablesSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of tableStatements) {
            try {
                await executeQuery(statement);
                const statementType = statement.split(' ')[1]?.toUpperCase() || 'STATEMENT';
                logger.info(`✅ ${statementType}: ${statement.substring(0, 60)}...`);
            } catch (err) {
                logger.error(`❌ Failed to execute: ${statement.substring(0, 60)}...`);
                logger.error(`Error: ${err.message}`);
                throw err; // Stop on table creation errors
            }
        }

        // Step 2: Create views after tables exist
        logger.info('Step 2: Creating database views...');
        const viewsPath = path.join(__dirname, '../database/init-views.sql');
        const viewsSql = fs.readFileSync(viewsPath, 'utf8');

        const viewStatements = viewsSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of viewStatements) {
            try {
                await executeQuery(statement);
                logger.info(`✅ VIEW: ${statement.substring(0, 60)}...`);
            } catch (err) {
                logger.error(`❌ Failed to create view: ${statement.substring(0, 60)}...`);
                logger.error(`Error: ${err.message}`);
                // Continue on view errors (views are optional)
            }
        }

        logger.info('✅ Database initialization completed successfully!');
        logger.info('You can now run: npm run db:seed (to add demo data)');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Database initialization failed:', err);
        logger.error('Please check your database connection and try again.');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase };