const express = require('express')
const userController = require('../controllers/user')
const weatherController = require('../controllers/weather')
const middleware = require('../middleware/auth')

const router = express.Router()

// Weather data
router.get('/weatherdata', weatherController.weatherdata)

// Authentication
router.post('/user/register', userController.register)
router.post('/user/login', userController.login)
router.get('/user/logout', middleware.auth, userController.logout)

// Get all user details
router.get('/user/details', middleware.auth, userController.userdetails)

// change user settings
router.post('/user/settings', middleware.auth, userController.settings)


// To do IOT interaction

// device control to turn on and off the devices
router.post('/user/device/control', middleware.auth, userController.deviceControl)
// Thermostat update
router.post('/user/thermostat/update', middleware.auth, userController.updateThermostat)

// To do

// Get alarm trigger when time is up
router.post('/user/alarm/trigger', middleware.auth, userController.userdetails)

module.exports = router;