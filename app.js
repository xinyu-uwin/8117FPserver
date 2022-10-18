const express = require('express');
const bodyParser = require('body-parser');
// const db = require('./database/connection.js')

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Parsing middleware
// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Parse application/json
app.use(bodyParser.json());

const routes = require('./src/routes/user');
app.use('/', routes)

app.listen(port, () => console.log(`Listening on port ${port}`));
