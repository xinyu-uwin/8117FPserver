/**
 * @author Naveen
 */
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path')
const hbs = require('hbs')

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const viewsPath = path.join(__dirname,'/views')
app.set('view engine', 'hbs')
app.set('views',viewsPath)

/**
 * Parsing middleware
 * Parse application/x-www-form-urlencoded
 */
app.use(bodyParser.urlencoded({extended: false}));

/**
 * Parse application/json
*/
app.use(bodyParser.json());

/**
 * Route to users path
 */
const routes = require('./src/routes/user');
app.use(routes)

app.get('/privacynotice', (req,res)=>{
    res.render('privacynotice')
})

app.listen(port, () => console.log(`Listening on port ${port}`));
