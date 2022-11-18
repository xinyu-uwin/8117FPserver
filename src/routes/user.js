/**
 * @author Naveen
 */

/**
 * import express library
 */
const express = require('express')
/**
 * import methods from user path
 */
const userController = require('../controllers/user')
/**
 * import methods from weather path
 */
const weatherController = require('../controllers/weather')
/**
 * import middelware function
 */
const middleware = require('../middleware/userDetails')
/**
 * import database connection function
 */
const db = require('../database/connection.js')
/**
 * import cron library
 */
const cron = require('node-cron')
/**
 * import automation functions from automation file
 */

const automateControl = require('../controllers/automation.js')
/**
 * import axios library
 */
const axios = require('axios');

db.connect()

/**
 * Cron Job
 */
// cron.schedule("*/30 * * * * *", function() {
//     let check_date = new Date()
//     console.log("--> Auto-Thermostat Check at ", check_date)
//     // automateControl.automateThermostat()
// 
//     automateControl.automateAlarmTrigger()
// })

/**
 * initialize router
 */
const router = express.Router()

/**
 * List of routes and there corresponding methods
 */
router.get('/weatherdata', weatherController.weatherdata)
router.post('/user/room-details', middleware.details, userController.userdetails)
router.post('/user/register', userController.register)
router.post('/user/login', userController.login)
router.get('/user/logout', middleware.details, userController.logout)
router.post('/user/room/add', middleware.details, userController.addRoom)
router.post('/user/room/remove', middleware.details, userController.removeRoom)
router.post('/user/settings', middleware.details, userController.settings)
router.post('/user/device/control', middleware.details, userController.deviceControl)
router.post('/user/thermostat/update', middleware.details, userController.updateThermostat)
router.post('/user/alarm-off/trigger', middleware.details, userController.alarmTriggerOff)
router.post('/user/alarm-on/trigger', middleware.details, userController.alarmTrigger)
router.post('/user/request/otp', userController.forgot_password_send_otp)
router.post('/user/verify/otp', userController.forgot_password_verify_otp)
router.post('/user/reset/password', userController.reset_password)

/**
 * export router data
 */
module.exports = router;
