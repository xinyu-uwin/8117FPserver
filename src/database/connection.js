const {Client} = require('pg')

// For localhost DB
// const client_dev = new Client({
//     host            : process.env.DB_HOST,
//     user            : process.env.DB_USER,
//     port            : process.env.DB_PORT,
//     password        : process.env.DB_PASS,
//     database        : process.env.DB_NAME
// })

// For heroku DB
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

module.exports = client