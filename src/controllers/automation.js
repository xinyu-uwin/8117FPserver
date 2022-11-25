/**
 * @author Naveen
 */

/**
 * imports
 */
const { request } = require('express')
const https = require('https')
const db = require('../database/connection.js')
const iotController = require('../connect_to_aws/publish_to_iot.js')
const userController = require('../controllers/user')
const axios = require('axios')
const logger = require('../logger.js')

/**
 * Check if its sunny or cloudy and Set thermostat
 */
exports.automateThermostat = ()=>{
    db.query(`select * from users;`, (error, results)=>{
        if(error){
            logger.logExceptions(error, req.body, "automateThermostat() select query")
            return "error in checkOutsideTemperature"
        }
        else if(results.rows.length == 0){
            console.log("No Users!")
            return "No users!"
        }
        let users_list = results.rows
        let user_details, publish_data
        let topic = "trigger/thermostat_update"

        for(let i=0; i<users_list.length;i++){
            let update_db = 0
            user_details = users_list[i]
            let {username, location} = user_details
            const api_key = process.env.WEATHER_API_ACCESS_KEY
            const api = "https://api.openweathermap.org/data/2.5/weather?q=" + location + "&APPID=" + api_key
            
            /**
             * Send request to 'openweathermap' API for weather data
             */
            https.get(api, (response) => {
                if(response.statusCode != 200){
                    console.log("response statusCode " + response.statusCode + " is received, for weather data in alarmTrigger func!")
                    console.log("City not found! reenter the city!")
                }
                response.on('data', (data)=>{
                    const data_json = JSON.parse(data)
                    const temp_data = data_json.main
                    /**
                     * convert temp from kelvin to celcius Celsius = (Kelvin – 273.15)
                     */
                    const feels_like = parseInt(temp_data.feels_like - 273.15)
                    console.log(`For user=${username} at Location=${location}, outside temperature feels-like=${feels_like}`)
                    db.query(`select * from rooms where username='${username}'`,(error, res)=>{
                        if(error){
                            logger.logExceptions(error, req.body, "automateThermostat() select query-2")
                            return "error in checkOutsideTemperature"
                        }
                        for(let k=0; k<res.rows.length;k++){
                            let room_details = res.rows[k]
                            let {heat, cold, room_name, thermostat_temp} = room_details
                            console.log("In Room -> ", room_name)
                            if(feels_like <= 18){
                                if(heat != 1){
                                    console.log("So, Turn the Heat ON!")
                                    update_db = 1
                                    heat = 1
                                    cold = 0
                                }else{
                                    console.log("Heat is already turned ON!")
                                }
                            }else{
                                if(cold != 1){
                                    console.log("So, Turn the Cold ON")
                                    update_db = 1
                                    cold = 1
                                    heat = 0
                                }else{
                                    console.log("Cold is already turned ON!")
                                }
                            }
                            /**
                             * Update database tables
                             */
                            if(update_db == 1){
                                publish_data = {"temperature":thermostat_temp, heat, cold, room_name, username}
                                iotController.publish_to_iot(topic, publish_data)
                                db.query(`update rooms set heat='${heat}', cold='${cold}' where username='${username}'`, (error, results)=>{
                                    if(error){
                                        logger.logExceptions(error, req.body, "automateThermostat() update query")
                                    }else{
                                        console.log("DB updated successfully!")
                                    }
                                })
                            }
                        }
                    })
                })
            })
        }
        return "Auto-Thermostat Operations done!!!"
    })
}

/**
 * Check and Send trigger to turn alarm on.
 * @returns message of the operations
 */
exports.automateAlarmTrigger = async () => {
    try{
        console.log("Alarm Check...")
        /**
         * Get data from database and check each user details
         */
        db.query(`select * from users;`, (error, results)=>{
            if(error){
                logger.logExceptions(error, req.body, "automateAlarmTrigger() select query")
                return "error in checkOutsideTemperature"
            }
            else if(results.rows.length == 0){
                console.log("No Users!")
                return "No users!"
            }
            let users_list = results.rows
            let user_details, alarm_time

            for(let i=0; i<users_list.length;i++){
                user_details = users_list[i]
                let {timezone_location, username} = user_details
                /**
                 * Get data from database and check the alarm_time for each room
                 */
                db.query(`select * from rooms where username='${username}'`,(error, res)=>{
                    if(error){
                        logger.logExceptions(error, req.body, "automateAlarmTrigger() select query-2")
                        return "error in checkOutsideTemperature"
                    }
                    for(let k=0; k<res.rows.length;k++){
                        let room_details = res.rows[k]
                        let {heat, cold, room_name, thermostat_temp, username, alarm_time_weekday ,alarm_time_weekend} = room_details
                        user_details.room_details = room_details
                        let req = {"userdetails": user_details, "body":{}, "no_return":true}
                        let date_string = new Date().toLocaleString("en-US", { timeZone: timezone_location });
                        current_date = new Date(date_string)
                        let day = current_date.getDay(), hours = current_date.getHours().toString(), minutes = current_date.getMinutes()
                        let minutes_str = minutes.toString()
                        if(hours.length < 2){
                            hours = "0"+hours
                        }
                        if(minutes.length < 2){
                            minutes_str = "0" + minutes_str
                        }
                        let hours_list = [(hours + ":" + minutes_str)]
                        if(day == 0 || day == 6){
                            /**
                             * Weekend condition
                             */
                            alarm_time = alarm_time_weekend
                        }else{
                            /**
                             * Weekday condition
                             */
                            alarm_time = alarm_time_weekday
                        }
                        /**
                         * When alarm_time is reached, call the alarmTrigger(req) function
                         * to turn the alarm on
                         */
                        if(hours_list.includes(alarm_time)){
                            console.log("Alarm time up In Room -> ", room_name)
                            userController.alarmTrigger(req)
                        }
                    }
                })
            }
        })
    }catch(e){
        logger.logExceptions(e, req.body, "automateAlarmTrigger() function")
        return e
    }
}
