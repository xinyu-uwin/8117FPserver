const express = require('express')
const userController = require('../controllers/user')
const weatherController = require('../controllers/weather')
const middleware = require('../middleware/userDetails')
const db = require('../database/connection.js')
const cron = require('node-cron')
const automateControl = require('../controllers/automation.js')

db.connect()

// Cron Job
// cron.schedule("*/10 * * * * *", function() {
//     let check_date = new Date()
//     console.log("--> Auto-Thermostat Check at ", check_date)
//     automateControl.automateThermostat()

//     // Check time and send alarmTrigger
//     // automateControl.automateAlarmTrigger()
// })

const router = express.Router()

// Weather data
router.get('/weatherdata', weatherController.weatherdata)

// userDetailsentication
router.post('/user/register', userController.register)
router.post('/user/login', userController.login)
router.get('/user/logout', middleware.details, userController.logout)

// Get all user details
router.get('/user/details', middleware.details, userController.userdetails)

// change user settings
router.post('/user/settings', middleware.details, userController.settings)

// device control to turn on and off the devices
router.post('/user/device/control', middleware.details, userController.deviceControl)

// To do IOT interaction

// Thermostat update
router.post('/user/thermostat/update', middleware.details, userController.updateThermostat)
// Get alarm-on trigger to on the alarm features
router.post('/user/alarm-on/trigger', middleware.details, userController.alarmTrigger)

router.post('/user/request/otp', userController.forgot_password_send_otp)
router.post('/user/verify/otp', userController.forgot_password_verify_otp)
router.post('/user/reset/password', userController.reset_password)


module.exports = router;
