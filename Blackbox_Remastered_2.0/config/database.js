const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,  // Include the port
    dialect: 'mysql',
    pool: {
        max: 5,            // Maximum number of connections in the pool
        min: 1,             // Minimum number of connections in the pool
        acquire: 30000,     // Maximum time (in milliseconds) that pool will try to get a connection before throwing error
        idle: 1000          // Maximum time (in milliseconds) that a connection can be idle before being released
    },
    define: {
        timestamps: false   // Optional, disables automatic timestamp columns if not needed
    },
    timezone: '+05:30',     // Set timezone to Indian Standard Time (UTC+05:30)
});

module.exports = sequelize;
