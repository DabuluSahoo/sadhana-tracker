const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true
};

async function setupDatabase() {
    let connection;
    try {
        console.log('Connecting to MySQL...');
        // Connect without database selected first
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected successfully!');

        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

        console.log('Running schema setup...');
        await connection.query(schema);

        console.log('Database and tables created successfully!');
    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();
