const bcrypt = require('bcryptjs')
const { request } = require('express')
const https = require('https')
const db = require('../database/connection.js')
const email = require('../emails/send_otp')
const iotController = require('../connect_to_aws/publish_to_iot.js')
const axios = require('axios')


// Register new user
exports.register = (req, res) => {
    try{
        console.log("In register")

        // console.log("req.body: ", req.body)
        const {username, password, location, alarm_time_weekday, alarm_time_weekend, preferred_temp, name} = req.body

        // check if user already exists or not
        db.query(`select username from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in register function at select:", error)
                return res.status(400).send({status: 400, msg:"error in register function at select"})
            }
            else if(results.rows.length > 0){
                return res.status(400).send({status: 400, msg: "User already exists! Try login"})
            }

            let hashedPassword = await bcrypt.hash(password, 8)
            let api = process.env.ABSTRACT_TIMEZONE_API_3
            axios.get('https://timezone.abstractapi.com/v1/current_time/?api_key='+api+'&location='+location)
            .then(response => {
                let {timezone_location} = response.data
                // insert user details into db
                let q = `insert into users(username,password,location,alarm_time_weekday,alarm_time_weekend,preferred_temp,name,timezone_location) values('${username}','${hashedPassword}','${location}','${alarm_time_weekday}','${alarm_time_weekend}','${preferred_temp}','${name}','${timezone_location}');`
                db.query(q, (error, result)=>{
                    if(error){
                        console.log("error in register function at insert: ", error)
                        return res.status(400).send({status: 400, msg:"error in register function at insert"})
                    }
                    else{
                        return res.status(200).send({status: 200, msg: "User registered Successfully!"})
                    }
                })
            })
            .catch(error => {
                console.log("In correct lcoation entered!")
                return res.status(400).send({status: 400, msg:"Enter a valid Location!"})
            })
        })
    }catch(e){
        console.log("Error in register: ", e)
        return res.status(400).send({status: 400, msg:"error in register function"})
    }
}

// User login
exports.login = async (req, res) => {
    try{
        console.log("In login")

        // console.log("req.body: ", req.body)
        const {username, password} = req.body

        // get user password to verify
        db.query(`select * from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in register function at select:", error)
                return res.status(400).send({status: 400, msg:"error in register function at select"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status: 404, msg: "User not found, Please register!!"})
            }else{
                if(password){
                    // compare hashedPassword
                    let hashedPassword = results.rows[0].password
                    let password_correct = await bcrypt.compare(password, hashedPassword)
                    if(password_correct){
                        const {location, light_on, curtain_on, alarm_time_weekday, alarm_time_weekend, alarm_on, preferred_temp, name, heat, cold, thermostat_on} = results.rows[0]
                        let send_data = {username, location, light_on, curtain_on, alarm_time_weekday, alarm_time_weekend, alarm_on, preferred_temp, name, heat, cold, thermostat_on}
                        
                        // send jwt token
                        return res.status(200).send({status: 200, body: send_data, msg:"User loggedIn!"})
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
        return res.status(400).send({status: 400, msg:"error in login function"})
    }
}

// get userdetails
exports.userdetails = (req, res) => {
    try{
        console.log("In userdetails")
        // console.log("req.userdetails: ", req.userdetails)
        const user_details = req.userdetails
        return res.status(200).send({status: 200, body: user_details})
    }catch(e){
        console.log("Error in userdetails: ", e)
        return res.status(400).send({status: 400, msg:"error in userdetails function"})
    }
}

// User logout
exports.logout = async (req, res) => {
    try{
        console.log("In logout")
        // console.log(req.userdetails)
        const user_details = req.userdetails
        // remove token
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

// Forgot password send otp
exports.forgot_password_send_otp = async (req, res) => {
    try{
        console.log("In forgot_password_send_otp!")

        // console.log("req.body: ", req.body)
        const {username} = req.body

        // get user password to verify
        db.query(`select otp from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in forgot_password_send_otp function at select:", error)
                return res.status(400).send({status: 400, msg:"error in forgot_password_send_otp function at select"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status: 404, msg: "User not found, Please register!!"})
            }else{
                // Generate otp
                let otp = Math.floor(1000 + Math.random() * 9000)

                // Send otp to mail
                await email.send_otp(username, otp)

                // Insert otp details into db
                db.query(`update users set otp='${otp}' where username='${username}';`, (error, results)=>{
                    if(error){
                        console.log("error in forgot_password_send_otp function at insert: ", error)
                        return res.status(400).send({status: 400, msg:"error in forgot_password_send_otp function at insert"})
                    }else{
                        console.log("OTP stored successfully!")
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

// Forgot password verify otp
exports.forgot_password_verify_otp = async (req, res) => {
    try{
        console.log("In forgot_password_verify_otp!")

        // console.log("req.body: ", req.body)
        const {username} = req.body
        const otp_received = req.body.otp

        // get user password to verify
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

// reset password
exports.reset_password = async (req, res) => {
    try{
        console.log("In reset_password!")

        // console.log("req.body: ", req.body)
        const {username, password} = req.body

        let hashedPassword = await bcrypt.hash(password, 8)

        // update password in db
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

// settings
exports.settings = (req, res) => {
    try{
        console.log("In Settings")
        // console.log(req.userdetails, req.body)
        const user_details = req.userdetails
        let {preferred_temp, location, timezone_location, alarm_time_weekday, alarm_time_weekend, alarm_on, name} = user_details
        let update_db = 0, update_timezone=0

        if((req.body.preferred_temp || req.body.preferred_temp==0) && (req.body.preferred_temp != preferred_temp)){
            update_db = 1
            preferred_temp = req.body.preferred_temp
        }if(req.body.location && req.body.location != location){
            update_db = 1
            update_timezone = 1
            location = req.body.location    
        }if(req.body.alarm_time_weekday && req.body.alarm_time_weekday != alarm_time_weekday){
            update_db = 1
            alarm_time_weekday = req.body.alarm_time_weekday
        }if(req.body.alarm_time_weekend && req.body.alarm_time_weekend != alarm_time_weekend){
            update_db = 1
            alarm_time_weekend = req.body.alarm_time_weekend
        }if(req.body.name && req.body.name != name){
            update_db = 1
            name = req.body.name
        }if((req.body.alarm_on || req.body.alarm_on==0) && (req.body.alarm_on != alarm_on)){
            update_db = 1
            alarm_on = req.body.alarm_on
        }

        if(update_db == 1){
            if(update_timezone == 1){
                let api = process.env.ABSTRACT_TIMEZONE_API_3
                axios.get('https://timezone.abstractapi.com/v1/current_time/?api_key='+api+'&location='+location)
                .then(response => {
                    timezone_location = response.data.timezone_location
                    db.query(`update users set preferred_temp='${preferred_temp}', location='${location}', timezone_location='${timezone_location}', alarm_time_weekday='${alarm_time_weekday}', alarm_time_weekend='${alarm_time_weekend}', alarm_on='${alarm_on}', name='${name}' where username='${user_details.username}';`, (error, results)=>{
                        if(error){
                            console.log("error in settings function at update: ", error)
                            return res.status(400).send({status: 400, msg:"error in settings function at update"})
                        }else{
                            console.log("DB updated successfully!")
                        }
                    })
                })
            }else{
                db.query(`update users set preferred_temp='${preferred_temp}', location='${location}', alarm_time_weekday='${alarm_time_weekday}', alarm_time_weekend='${alarm_time_weekend}', alarm_on='${alarm_on}', name='${name}' where username='${user_details.username}';`, (error, results)=>{
                    if(error){
                        console.log("error in settings function at update: ", error)
                        return res.status(400).send({status: 400, msg:"error in settings function at update"})
                    }else{
                        console.log("DB updated successfully!")
                    }
                })
            }
        }
        return res.status(200).send({status: 200, body:{preferred_temp, location, alarm_time_weekday, alarm_time_weekend, alarm_on, name, username:user_details.username, light_on: user_details.light_on, curtain_on: user_details.curtain_on}, msg: "Updated the settings successfully!"})
    }catch(e){
        console.log("Error in Settings: ", e)
        return res.status(400).send({status: 400, msg:"error in settings function"})
    }
}

// device control on/off
exports.deviceControl = (req, res) => {
    try{
        console.log("In deviceControl")
        // console.log(req.userdetails)
        const user_details = req.userdetails
        let {light_on, curtain_on} = user_details
        let topic = ""
        let data = {}
        let update_db = 0

        if((req.body.light_on || req.body.light_on==0) && (req.body.light_on != light_on)){
            update_db = 1
            light_on = req.body.light_on
            topic = "trigger/light_on"
            data = {"light-on": light_on}
            iotController.publish_to_iot(topic, data)
        }if((req.body.curtain_on || req.body.curtain_on==0) && (req.body.curtain_on != curtain_on)){
            update_db = 1
            curtain_on = req.body.curtain_on
            topic = "trigger/curtain_open"
            data = {"curtain-open": curtain_on}
            iotController.publish_to_iot(topic, data)
        }
        if(update_db == 1){
            db.query(`update users set light_on='${light_on}', curtain_on='${curtain_on}' where username='${user_details.username}'`, (error, results)=>{
                if(error){
                    console.log("error in deviceControl function at update: ", error)
                    return res.status(400).send({status: 400, msg:"error in deviceControl function at update"})
                }else{
                    console.log("DB updated successfully!")
                }
            })
        }
        return res.status(200).send({status: 200, body:{light_on, curtain_on}, msg: "Updated the devices successfully!"})
    }catch(e){
        console.log("Error in deviceControl: ", e)
        return res.status(400).send({status: 400, msg:"error in deviceControl function"})
    }
}

// update thermostat
exports.updateThermostat = (req, res) => {
    try{
        console.log("In updateThermostat")
        // console.log(req.userdetails)
        const user_details = req.userdetails
        let {thermostat_on, thermostat_temp, preferred_temp, location, alarm_time_weekday, alarm_time_weekend, alarm_on, name, username, light_on, curtain_on, heat ,cold} = user_details
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

        if(update_db == 1){
            data = {"temperature":thermostat_temp, heat, cold}
            iotController.publish_to_iot(topic, data)
            db.query(`update users set heat='${heat}', cold='${cold}', thermostat_temp='${thermostat_temp}' where username='${user_details.username}';`, (error, results)=>{
                if(error){
                    console.log("error in updateThermostat function at update: ", error)
                    return res.status(400).send({status: 400, msg:"error in updateThermostat function at update"})
                }else{
                    console.log("DB updated successfully!")
                }
            })
        }
        return res.status(200).send({status: 200, body:{thermostat_on, thermostat_temp, preferred_temp, heat, cold, location, alarm_time_weekday, alarm_time_weekend, alarm_on, name, username, light_on, curtain_on}, msg: "Updated the thermostat successfully!"})
    }catch(e){
        console.log("Error in updateThermostat: ", e)
        return res.status(400).send({status: 400, msg:"error in updateThermostat function"})
    }
}

// When alram time is up
exports.alarmTrigger = async (req, res) => {
    try{
        console.log("In alarmTrigger")
        const user_details = req.userdetails
        // console.log(user_details)
        let {thermostat_temp, preferred_temp, location, alarm_time_weekday, alarm_time_weekend, alarm_on, name, username, light_on, curtain_on, heat, cold} = user_details
        let climate=""
        let topic = ""
        let data = {}

        // for tests
        if(req.body.location){
            location = req.body.location
        }

        // if climate is in request(for tests)
        // check if it is sunny or cloudy
        const api_key = process.env.WEATHER_API_ACCESS_KEY
        const api = "https://api.openweathermap.org/data/2.5/weather?q=" + location + "&APPID=" + api_key
        // console.log(api)
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
                
                // convert temp from kelvin to celcius Celsius = (Kelvin – 273.15)
                const temperature = parseInt(temp_data.temp - 273.15)
                const feels_like = parseInt(temp_data.feels_like - 273.15)
                const weather_details = {climate: weather_data.main, description: weather_data.description, place: data_json.name, country: data_json.sys.country, temperature, feels_like, unit: "celsius"}
                let current_climate = weather_details.climate
                climate = current_climate

                // console.log("climate:", climate)

                if(climate.toLocaleLowerCase().includes("cloud") || climate.toLocaleLowerCase().includes("mist") || climate.toLocaleLowerCase().includes("fog")){
                    console.log(">> It is Cloudy!")
                    console.log("Light-on , Curtian-Close, Increase Temperature!")
                    curtain_on = 0
                    light_on = 100
                    thermostat_temp = 26
                }else{
                    console.log(">> It is Sunny!")
                    console.log("Light-off , Curtian-Open, Temperature to preferred temperature!")
                    curtain_on = 100
                    light_on = 0
                    thermostat_temp = preferred_temp
                }

                // Trigger to IOT devices
                topic = "trigger/curtain_open"
                data = {"curtain-open": curtain_on}
                iotController.publish_to_iot(topic, data)
                
                topic = "trigger/light_on"
                data = {"light-on": light_on}
                iotController.publish_to_iot(topic, data)
                
                topic = "trigger/thermostat_update"
                data = {"temperature": thermostat_temp, "heat": heat, "cold": cold}
                iotController.publish_to_iot(topic, data)
                
                // console.log("On alarm")

                // Update details in DB
                db.query(`update users set light_on='${light_on}', curtain_on='${curtain_on}', thermostat_temp='${thermostat_temp}' where username='${user_details.username}'`, (error, results)=>{
                    if(error){
                        console.log("error in alarmTrigger function at update: ", error)
                        if(req.no_return == true){
                            return 400
                        }
                        return res.status(400).send({status: 400, msg:"error in alarmTrigger function at update"})
                    }else{
                        console.log("DB updated successfully!")
                    }
                })
                if(req.no_return == true){
                    console.log("Alarm trigger done!")
                    return 200
                }
                return res.status(200).send({status: 200, body:{thermostat_temp, preferred_temp, location, alarm_time_weekday, alarm_time_weekend, alarm_on, name, username, light_on, curtain_on}, msg: weather_details.description})
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

// Off the alarm
exports.alarmTriggerOff = (req, res) => {
    try{
        const user_details = req.userdetails
        // console.log(user_details)
        let {thermostat_temp, preferred_temp, username, light_on, heat, cold} = user_details
        let topic, data = {}
        light_on = 0, thermostat_temp = preferred_temp

        topic = "trigger/light_on"
        data = {"light-on": light_on}
        iotController.publish_to_iot(topic, data)
        
        topic = "trigger/thermostat_update"
        data = {"temperature": thermostat_temp, "heat": heat, "cold": cold}
        iotController.publish_to_iot(topic, data)

        // Update details in DB
        db.query(`update users set light_on='${light_on}', thermostat_temp='${thermostat_temp}' where username='${username}'`, (error, results)=>{
            if(error){
                console.log("error in alarmTriggerOff function at update: ", error)
                return res.status(400).send({status: 400, msg:"error in alarmTriggerOff function at update"})
            }else{
                console.log("DB updated successfully!")
            }
        })

        return res.status(200).send({status: 200, msg: "Alarm tunred off!"})
    }catch(e){
        console.log("Error in alarmTriggerOff():", e)
    }
}
