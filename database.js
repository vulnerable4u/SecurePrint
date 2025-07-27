const { Pool } = require('pg');

// This function initializes a connection pool for PostgreSQL.
// It uses the DATABASE_URL environment variable, which Render provides.
async function initializeDatabase() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("FATAL ERROR: DATABASE_URL is not configured in .env file.");
        process.exit(1);
    }

    try {
        // When deploying to Render, the DATABASE_URL will not be for 'localhost'.
        // We can use this to determine if we need to enable SSL.
        const isProduction = !connectionString.includes('localhost');

        const db = new Pool({
            connectionString: connectionString,
            // Enforce SSL for all non-local connections.
            // rejectUnauthorized: false is often needed on platforms like Render
            // to allow connections to their managed database services.
            ssl: isProduction ? { rejectUnauthorized: false } : false
        });

        // The table creation logic is updated for PostgreSQL syntax.
        // Note the change from TEXT to VARCHAR/TEXT and the use of double quotes for column names.
        await db.query(`
            CREATE TABLE IF NOT EXISTS files (
                "accessCode" VARCHAR(255) PRIMARY KEY,
                "originalName" TEXT NOT NULL,
                "fileName" TEXT NOT NULL,
                path TEXT NOT NULL,
                "uploadTime" TIMESTAMPTZ NOT NULL,
                "expiryTime" TIMESTAMPTZ NOT NULL
            )
        `);

        console.log("Connection to PostgreSQL database established successfully.");
        return db;
    } catch (error) {
        console.error("Fatal Error: Could not connect to the PostgreSQL database:", error);
        process.exit(1);
    }
}

module.exports = initializeDatabase;
