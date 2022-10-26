const express = require('express')
const userController = require('../controllers/user')
const weatherController = require('../controllers/weather')
const middleware = require('../middleware/auth')
const db = require('../database/connection.js')

db.connect()

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

// device control to turn on and off the devices
router.post('/user/device/control', middleware.auth, userController.deviceControl)

// To do IOT interaction

// Thermostat update
router.post('/user/thermostat/update', middleware.auth, userController.updateThermostat)
// Get alarm-on trigger to on the alarm features
router.post('/user/alarm-on/trigger', middleware.auth, userController.alarmTrigger)

router.post('/user/request/otp', userController.forgot_password_send_otp)
router.post('/user/verify/otp', userController.forgot_password_verify_otp)

// To do
router.post('/user/reset/password', userController.reset_password)
// router.post('/user/verify/otp', userController.forgot_password_verify_otp)


module.exports = router;
