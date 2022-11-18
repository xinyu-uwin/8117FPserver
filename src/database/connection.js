/**
 * import postgresql library
 */
const {Client} = require('pg')

/**
 * Connect to Heroku database
 */
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

module.exports = client
