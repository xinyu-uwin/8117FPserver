/**
 * @author Naveen
 */

/**
 * imports
 */
const bcrypt = require('bcryptjs')
const { request } = require('express')
const https = require('https')
const db = require('../database/connection.js')
const email = require('../emails/send_otp')
const iotController = require('../connect_to_aws/publish_to_iot.js')
const axios = require('axios')


/**
 * regsiters a new user
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.register = (req, res) => {
    try{
        const {username, room_name, password, location, alarm_time_weekday, alarm_time_weekend, preferred_temp, name} = req.body
        if(username==null || room_name==null || password==null || location==null || alarm_time_weekday==null || alarm_time_weekend==null || preferred_temp==null || name==null){
            return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
        }
        /**
         * Check if user already exists or not
         */
        db.query(`select username from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in register function at select:", error)
                return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
            }
            else if(results.rows.length > 0){
                return res.status(400).send({status: 400, msg: "User already exists! Try login"})
            }
            let hashedPassword = await bcrypt.hash(password, 8)
            let api = process.env.ABSTRACT_TIMEZONE_API_3
            /**
             * Send request to 'abstract' external API
             * to get timezone based on location
             */
            axios.get('https://timezone.abstractapi.com/v1/current_time/?api_key='+api+'&location='+location)
            .then(response => {
                let {timezone_location} = response.data
                /**
                 * insert data into database tables
                 */
                let q1 = `insert into users(username,password,location,name,timezone_location) values('${username}','${hashedPassword}','${location}','${name}','${timezone_location}');`
                let q2 = `insert into rooms(room_name,username,alarm_time_weekday,alarm_time_weekend,preferred_temp) values('${room_name}','${username}','${alarm_time_weekday}','${alarm_time_weekend}','${preferred_temp}');`
                db.query(q1, (error, result)=>{
                    if(error){
                        console.log("error in register function at insert: ", error)
                        return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
                    }
                    else{
                        db.query(q2, (error, result)=>{
                            if(error){
                                console.log("error in register function at insert: ", error)
                                return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
                            }
                            else{
                                console.log("User '"+ username + "' Registered Successfully!")
                                return res.status(200).send({status: 200, msg: "User registered Successfully!"})
                            }
                        })
                    }
                })
            })
            .catch(error => {
                console.log("In correct location entered!")
                return res.status(400).send({status: 400, msg:"Enter a valid Location!"})
            })
        })
    }catch(e){
        console.log("Error in register: ", e)
        return res.status(400).send({status: 400, msg:"Incorrect data received!"})
    }
}

/**
 * validates user credentials
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.login = async (req, res) => {
    try{
        let {username, password} = req.body
        if(username == null){
            return res.status(400).send({status: 400, msg:"Incorrect data provided, Please try again!"})
        }
        if(password) password = password.toString()
        /**
         * get user password to verify the data
         */
        db.query(`select * from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in register function at select:", error)
                return res.status(400).send({status: 400, msg:"Incorrect data provided, Please try again!"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status: 404, msg: "User not found, Please register!!"})
            }else{
                if(password){
                    /**
                     * compare hashedPassword by getting data from database
                     */
                    let hashedPassword = results.rows[0].password
                    let password_correct = await bcrypt.compare(password, hashedPassword)
                    if(password_correct){
                        const {location,name} = results.rows[0]
                        db.query(`select * from rooms where username='${username}'`, (error, result)=>{
                            if(error){
                                console.log("error in register function at insert: ", error)
                                return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
                            }
                            else{
                                let send_data = {username, name, location, "rooms":result.rows, "rooms_count":result.rows.length}
                                return res.status(200).send({status: 200, body: send_data, msg:"User loggedIn!"})
                            }
                        })
                    }else{
                        return res.status(401).send({status: 401, msg: "Invalid Password! Try again!"})
                    }
                }else{
                    let send_data = {username}
                    return res.status(200).send({status: 200, body: send_data, msg:"Enter Password!"})
                }
            }
        })
    }catch(e){
        console.log("Error in login: ", e)
        return res.status(400).send({status: 400, msg:"Incorrect data received!"})
    }
}

/**
 * fetches user details from database
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.userdetails = (req, res) => {
    try{
        let {username, name, location, room_names, rooms_count, room_list, room_details} = req.userdetails
        let send_data = {username,name, location, room_names, rooms_count}
        if(req.body.room_name){
            send_data.room_details = room_details
        }else{
            send_data.room_list = room_list
        }
        return res.status(200).send({status: 200, body: send_data, msg:"User Details found!"})
    }catch(e){
        console.log("Error in userdetails: ", e)
        return res.status(400).send({status: 400, msg:"Incorrect correct data received!"})
    }
}

/**
 * Add a new room details for a user
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.addRoom = (req, res) => {
    try{
        let room_names = req.userdetails.room_names
        let {room_name,username,alarm_time_weekday,alarm_time_weekend,preferred_temp} = req.body

        if(room_name == null || username==null || alarm_time_weekday==null || alarm_time_weekend == null || preferred_temp == null){
            return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
        }

        if(room_names.includes(room_name)){
            return res.status(400).send({status: 400, msg: "Room name already exists! Try again"})
        }

        let q1 = `insert into rooms(room_name,username,alarm_time_weekday,alarm_time_weekend,preferred_temp) values('${room_name}','${username}','${alarm_time_weekday}','${alarm_time_weekend}','${preferred_temp}');`
        db.query(q1, (error, result)=>{
            if(error){
                console.log("error in roomAdd function at insert: ", error)
                return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
            }
            console.log("Room '"+ room_name + "' Added Successfully!")
            let room_details = {room_name,username,alarm_time_weekday,alarm_time_weekend,preferred_temp}
            return res.status(200).send({status: 200, body:room_details, msg: "Room added Successfully!"})
        })
    }catch(e){
        console.log("Error in userRoomAdd: ", e)
        return res.status(400).send({status: 400, msg:"Incorrect correct data received!"})
    }
}

/**
 * Remove a room details for a user
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.removeRoom = (req, res) => {
    try{
        let user_details = req.userdetails
        let {username, room_name} = req.body
        let {room_details, room_names, rooms_count} = user_details

        if(room_name == null || username==null){
            return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
        }

        if(room_names.includes(room_name) == false){
            return res.status(200).send({status: 200, msg: "Room Removed Successfully!"})
        }

        let q1 = `delete from rooms where room_name='${room_name}';`
        db.query(q1, (error, result)=>{
            if(error){
                console.log("error in roomRemove function at insert: ", error)
                return res.status(400).send({status: 400, msg:"Incorrect data provided, Please Try again!"})
            }
            console.log("Room '"+ room_name + "' Removed Successfully!")
            return res.status(200).send({status: 200, msg: "Room Removed Successfully!"})
        })
    }catch(e){
        console.log("Error in roomRemove: ", e)
        return res.status(400).send({status: 400, msg:"Incorrect correct data received!"})
    }
}

/**
 * Logout a user
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.logout = async (req, res) => {
    try{
        console.log("In logout")
        const user_details = req.userdetails
        db.query(`update users set token=${null} where username='${user_details.username}';`, (error, results)=>{
            if(error){
                console.log("error in logout function at insert: ", error)
                return res.status(400).send({status: 400, msg:"error in users function at update"})
            }else{
                console.log("User logged out!")
                return res.status(200).send({status: 200, msg:"User logged out!"})
            }
        })
    }catch(e){
        console.log("Error in logout: ", e)
        return res.status(400).send({status: 400, msg:"error in logout function"})
    }  
}

/**
 * sends otp to user's mail to rest the password
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.forgot_password_send_otp = async (req, res) => {
    try{
        const {username} = req.body
        /**
         * get user password to verify
         */
        db.query(`select otp from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in forgot_password_send_otp function at select:", error)
                return res.status(400).send({status: 400, msg:"error in forgot_password_send_otp function at select"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status: 404, msg: "User not found, Please register!!"})
            }else{
                /**
                 * Generate otp
                 */
                let otp = Math.floor(1000 + Math.random() * 9000)
                /**
                 * Send otp to mail
                 */
                await email.send_otp(username, otp)

                /**
                 * Insert otp details into db
                 */
                db.query(`update users set otp='${otp}' where username='${username}';`, (error, results)=>{
                    if(error){
                        console.log("error in forgot_password_send_otp function at insert: ", error)
                        return res.status(400).send({status: 400, msg:"error in forgot_password_send_otp function at insert"})
                    }
                    return res.status(200).send({status: 200, body: {otp}, msg:"OTP sent successfully!"})
                })
            }
        })
    }catch(e){
        console.log("Error in orgot_password_send_otp: ", e)
        return res.status(400).send({status: 400, msg:"error in forgot_password_send_otp function"})
    }
}

/**
 * Validates users otp
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.forgot_password_verify_otp = async (req, res) => {
    try{
        const {username} = req.body
        const otp_received = req.body.otp

        /**
         * get user password to verify
         */
        db.query(`select otp from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in forgot_password_verify_otp function at select:", error)
                return res.status(400).send({status: 400, msg:"error in forgot_password_verify_otp function at select"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status: 404, msg: "User not found, Please register!!"})
            }else{
                if(results.rows[0].otp == otp_received){
                    return res.status(200).send({status: 200, msg:"OTP verified! Can reset password!"})
                }else{
                    return res.status(401).send({status: 401, msg:"OTP invalid!"})
                }
            }
        })
    }catch(e){
        console.log("Error in orgot_password_verify_otp: ", e)
        return res.status(400).send({status: 400, msg:"error in forgot_password_verify_otp function"})
    }
}

/**
 * update user password in the database
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.reset_password = async (req, res) => {
    try{
        const {username, password} = req.body

        let hashedPassword = await bcrypt.hash(password, 8)
        /**
         * update password in db
         */
        db.query(`update users set password='${hashedPassword}' where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in reset_password function at select:", error)
                return res.status(400).send({status: 400, msg:"error in reset_password function at select"})
            }
            else{
                return res.status(200).send({status: 200, msg:"Password Changed Successfull!"})
            }
        })
    }catch(e){
        console.log("Error in reset_password: ", e)
        return res.status(400).send({status: 400, msg:"error in reset_password function"})
    }
}

/**
 * Update user settings
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.settings = (req, res) => {
    try{
        let {room_names, location, timezone_location, name} = req.userdetails
        let {room_name, username, new_room_name} = req.body
        let {preferred_temp,alarm_time_weekday, alarm_time_weekend} = req.userdetails.room_details
        let update_users = 0, update_timezone=0, update_rooms=0, update_room_name = 0, old_room_name = room_name

        if(new_room_name){
            if(room_names.includes(new_room_name)){
                return res.status(400).send({status: 400, msg:"Room name already exists, Try with new name!"})
            }
            update_rooms = 1
            update_room_name = 1
            room_name = new_room_name
        }
        if((req.body.preferred_temp || req.body.preferred_temp==0) && (req.body.preferred_temp != preferred_temp)){
            update_rooms = 1
            preferred_temp = req.body.preferred_temp
        }if(req.body.location && req.body.location != location){
            update_users = 1
            update_timezone = 1
            location = req.body.location
        }if(req.body.alarm_time_weekday && req.body.alarm_time_weekday != alarm_time_weekday){
            update_rooms = 1
            alarm_time_weekday = req.body.alarm_time_weekday
        }if(req.body.alarm_time_weekend && req.body.alarm_time_weekend != alarm_time_weekend){
            update_rooms = 1
            alarm_time_weekend = req.body.alarm_time_weekend
        }if(req.body.name && req.body.name != name){
            update_users = 1
            name = req.body.name
        }
        /**
         * Update database details
         */
        if(update_users == 1){
            if(update_timezone == 1){
                let api = process.env.ABSTRACT_TIMEZONE_API_3
                axios.get('https://timezone.abstractapi.com/v1/current_time/?api_key='+api+'&location='+location)
                .then(response => {
                    timezone_location = response.data.timezone_location
                    db.query(`update users set location='${location}', timezone_location='${timezone_location}',name='${name}' where username='${username}';`, (error, results)=>{
                        if(error){
                            console.log("error in settings function at update: ", error)
                            return res.status(400).send({status: 400, msg:"Incorrect data received!"})
                        }
                    })
                })
            }else{
                db.query(`update users set location='${location}',name='${name}' where username='${username}';`, (error, results)=>{
                    if(error){
                        console.log("error in settings function at update: ", error)
                        return res.status(400).send({status: 400, msg:"Incorrect data received!"})
                    }
                })
            }
        }
        if(update_rooms == 1){
            if(update_room_name == 1){
                db.query(`update rooms set preferred_temp='${preferred_temp}', alarm_time_weekday='${alarm_time_weekday}', alarm_time_weekend='${alarm_time_weekend}', room_name='${new_room_name}' where username='${username}' and room_name='${old_room_name}';`, (error, results)=>{
                    if(error){
                        console.log("error in settings function at update: ", error)
                        return res.status(400).send({status: 400, msg:"Incorrect data received!"})
                    }else{
                        console.log("DB updated successfully!")
                    }
                })
            }else{
                db.query(`update rooms set preferred_temp='${preferred_temp}', alarm_time_weekday='${alarm_time_weekday}', alarm_time_weekend='${alarm_time_weekend}' where username='${username}' and room_name='${room_name}';`, (error, results)=>{
                    if(error){
                        console.log("error in settings function at update: ", error)
                        return res.status(400).send({status: 400, msg:"Incorrect data received!"})
                    }else{
                        console.log("DB updated successfully!")
                    }
                })
            }
        }
        return res.status(200).send({status: 200, body:{room_name, preferred_temp, location, alarm_time_weekday, alarm_time_weekend, name, username}, msg: "Updated the settings successfully!"})
    }catch(e){
        console.log("Error in Settings: ", e)
        return res.status(400).send({status: 400, msg:"Incorrect data rcevied!"})
    }
}

/**
 * control devices light and curtain
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.deviceControl = (req, res) => {
    try{
        const user_details = req.userdetails
        let {light_on, curtain_on, room_name, username} = user_details.room_details
        let topic = ""
        let data = {}
        let update_db = 0

        if(req.body.username == null || req.body.room_name == null){
            return res.status(400).send({status: 400, msg:"Incorrect data recevied, Try again!"})
        }
        /**
         * Send trigger to IOT devices though MQTT Topics
         */
        if((req.body.light_on || req.body.light_on==0) && (req.body.light_on != light_on)){
            update_db = 1
            light_on = req.body.light_on
            topic = "trigger/light_on"
            data = {"light-on": light_on, room_name, username}
            iotController.publish_to_iot(topic, data)
        }if((req.body.curtain_on || req.body.curtain_on==0) && (req.body.curtain_on != curtain_on)){
            update_db = 1
            curtain_on = req.body.curtain_on
            topic = "trigger/curtain_open"
            data = {"curtain-open": curtain_on, room_name, username}
            iotController.publish_to_iot(topic, data)
        }
        /**
         * Update database details
         */
        if(update_db == 1){
            db.query(`update rooms set light_on='${light_on}', curtain_on='${curtain_on}' where username='${username}' and room_name='${room_name}'`, (error, results)=>{
                if(error){
                    console.log("error in deviceControl function at update: ", error)
                    return res.status(400).send({status: 400, msg:"Incorrect data recevied, Try again!"})
                }else{
                    console.log("DB updated successfully!")
                }
            })
        }
        return res.status(200).send({status: 200, body:{room_name, light_on, curtain_on}, msg: "Updated the devices successfully!"})
    }catch(e){
        console.log("Error in deviceControl: ", e)
        return res.status(400).send({status: 400, msg:"error in deviceControl function"})
    }
}

/**
 * control thermostat temperature, heat and cold
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.updateThermostat = (req, res) => {
    try{
        console.log("In updateThermostat")
        const user_details = req.userdetails
        let {thermostat_temp,username,heat,cold, room_name} = user_details.room_details

        if(req.body.username == null || req.body.room_name == null){
            return res.status(400).send({status: 400, msg:"Incorrect data recevied, Try again!"})
        }

        let update_db = 0

        topic = "trigger/thermostat_update"
        if((req.body.temperature || req.body.temperature == 0) && (req.body.temperature != thermostat_temp)){
            update_db = 1
            thermostat_temp = req.body.temperature
        }
        if((req.body.heat || req.body.heat==0) && (req.body.heat != heat)){
            update_db = 1
            heat = req.body.heat
            if(heat == 1){
                cold = 0
            }
        }
        if((req.body.cold || req.body.cold==0) && (req.body.cold != cold)){
            update_db = 1
            cold = req.body.cold
            if(cold == 1){
                heat = 0
            }
        }
        /**
         * Send trigger to IOT devices though MQTT Topics
         * And update database details
         */
        if(update_db == 1){
            data = {username,room_name,"temperature":thermostat_temp, heat, cold}
            iotController.publish_to_iot(topic, data)
            db.query(`update rooms set heat='${heat}', cold='${cold}', thermostat_temp='${thermostat_temp}' where username='${user_details.username}' and room_name='${room_name}';`, (error, results)=>{
                if(error){
                    console.log("error in updateThermostat function at update: ", error)
                    return res.status(400).send({status: 400, msg:"error in updateThermostat function at update"})
                }else{
                    console.log("DB updated successfully!")
                }
            })
        }
        return res.status(200).send({status: 200, body:{room_name, thermostat_temp, heat, cold}, msg: "Updated the thermostat successfully!"})
    }catch(e){
        console.log("Error in updateThermostat: ", e)
        return res.status(400).send({status: 400, msg:"error in updateThermostat function"})
    }
}

/**
 * Turn the alarm on
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.alarmTrigger = async (req, res) => {
    try{
        console.log("Alarm Trigger")
        const user_details = req.userdetails
        let {thermostat_temp, preferred_temp, alarm_time_weekday, alarm_time_weekend, username, light_on, curtain_on, heat, cold, room_name} = user_details.room_details
        let {location,name} = user_details
        let climate=""
        let topic = ""
        let data = {}

        if(req.body.location){
            location = req.body.location
        }

        /**
         * if climate is in request(for tests)
         * check if it is sunny or cloudy by getting weather data from external weather API
         */
        const api_key = process.env.WEATHER_API_ACCESS_KEY
        const api = "https://api.openweathermap.org/data/2.5/weather?q=" + location + "&APPID=" + api_key
        https.get(api, (response) => {
            if(response.statusCode != 200){
                console.log("response statusCode " + response.statusCode + " is received, for weather data in alarmTrigger func!")
                if(req.no_return == true){
                    console.log("City Not found!")
                    return 404
                }
                return res.send({status: 404, msg: "City not found! reenter the city!"})
            }
            response.on('data', (data)=>{
                const data_json = JSON.parse(data)
                const weather_data = data_json.weather[0]
                const temp_data = data_json.main
                /**
                 * convert temp from kelvin to celcius Celsius = (Kelvin – 273.15)
                 */
                const temperature = parseInt(temp_data.temp - 273.15)
                const feels_like = parseInt(temp_data.feels_like - 273.15)
                const weather_details = {climate: weather_data.main, description: weather_data.description, place: data_json.name, country: data_json.sys.country, temperature, feels_like, unit: "celsius"}
                let current_climate = weather_details.climate
                climate = current_climate
                if(climate.toLocaleLowerCase().includes("cloud") || climate.toLocaleLowerCase().includes("mist") || climate.toLocaleLowerCase().includes("fog")){
                    console.log(">> It's Cloudy!")
                    console.log("Light-on , Curtian-Close, Increase Temperature!")
                    curtain_on = 0
                    light_on = 100
                    thermostat_temp = 26
                }else{
                    console.log(">> It's clear sky!")
                    console.log("Light-off , Curtian-Open, Temperature to preferred temperature!")
                    curtain_on = 100
                    light_on = 0
                    thermostat_temp = preferred_temp
                }
                /**
                 * Trigger to IOT devices though MQTT Topics
                 */
                topic = "trigger/curtain_open"
                data = {"curtain-open": curtain_on, room_name, username}
                iotController.publish_to_iot(topic, data)
                
                topic = "trigger/light_on"
                data = {"light-on": light_on, room_name, username}
                iotController.publish_to_iot(topic, data)
                
                topic = "trigger/thermostat_update"
                data = {"temperature": thermostat_temp, "heat": heat, "cold": cold, room_name, username}
                iotController.publish_to_iot(topic, data)
                /**
                 * Update details in Database
                 */
                db.query(`update rooms set light_on='${light_on}', curtain_on='${curtain_on}', thermostat_temp='${thermostat_temp}' where username='${user_details.username}' and room_name='${room_name}'`, (error, results)=>{
                    if(error){
                        console.log("error in alarmTrigger function at update: ", error)
                        if(req.no_return == true){
                            return 400
                        }
                        return res.status(400).send({status: 400, msg:"Incorrect data received, Try again!"})
                    }else{
                        console.log("DB updated successfully!")
                    }
                })
                /**
                 * If the trigger is from the server, return the statusCode
                 */
                if(req.no_return == true){
                    console.log("Alarm trigger done!")
                    return 200
                }
                return res.status(200).send({status: 200, body:{room_name,thermostat_temp, preferred_temp, location, alarm_time_weekday, alarm_time_weekend, name, username, light_on, curtain_on}, msg: weather_details.description})
            })
        })
    }catch(e){
        console.log("Error in alarmTrigger: ", e)
        if(req.no_return == true){
            return 400
        }
        return res.status(400).send({status: 400, msg:"error in alarmTrigger function"})
    }
}

/**
 * Turn off the alarm
 * @param {*} req Accepts request details
 * @param {*} res Sends response body and status
 * @returns returns the response data
 */
exports.alarmTriggerOff = (req, res) => {
    try{
        const user_details = req.userdetails
        let {thermostat_temp, preferred_temp, username, light_on, heat, cold, room_name} = user_details.room_details
        let topic, data = {}
        light_on = 0, thermostat_temp = preferred_temp
        /**
         * Send triggers to IOT devices though MQTT Topics
         */
        topic = "trigger/light_on"
        data = {"light-on": light_on, room_name, username}
        iotController.publish_to_iot(topic, data)
        
        topic = "trigger/thermostat_update"
        data = {"temperature": thermostat_temp, "heat": heat, "cold": cold, room_name, username}
        iotController.publish_to_iot(topic, data)
        /**
         * Update details in DB
         */
        db.query(`update rooms set light_on='${light_on}', thermostat_temp='${thermostat_temp}' where username='${username}' and room_name='${room_name}'`, (error, results)=>{
            if(error){
                console.log("error in alarmTriggerOff function at update: ", error)
                return res.status(400).send({status: 400, msg:"Incorrect data received!"})
            }else{
                console.log("DB updated successfully!")
                return res.status(200).send({status: 200, msg: "Alarm tunred off!"})
            }
        })
    }catch(e){
        console.log("Error in alarmTriggerOff():", e)
    }
}
