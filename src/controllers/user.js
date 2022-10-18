const mysql = require('mysql')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { request } = require('express')
const https = require('https')
const db = require('../database/connection.js')

// Register new user
exports.register = (req, res) => {
    try{
        console.log("In register")

        // console.log("req.body: ", req.body)
        const {username, password, location, alarm_time, preferred_temp, name} = req.body

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

            // insert user details into db
            let q = `insert into users(username,password,location,alarm_time,preferred_temp,name) values('${username}','${hashedPassword}','${location}','${alarm_time}','${preferred_temp}','${name}');`
            db.query(q, (error, results)=>{
                if(error){
                    console.log("error in register function at insert: ", error)
                    return res.status(400).send({status: 400, msg:"error in register function at insert"})
                }
                else{
                    return res.status(200).send({status: 200, msg: "User registered Successfully!"})
                }
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
                // compare hashedPassword
                let hashedPassword = results.rows[0].password
                let password_correct = await bcrypt.compare(password, hashedPassword)
                if(password_correct){
                    // Generate jwt token
                    const access_token = jwt.sign(username, process.env.ACCESS_TOKEN_SECRET)
                    // Insert jwt token details into db
                    db.query(`update users set token='${access_token}' where username='${username}';`, (error, results)=>{
                        if(error){
                            console.log("error in login function at insert: ", error)
                            return res.status(400).send({status: 400, msg:"error in users function at insert"})
                        }else{
                            console.log("Token insertion successfull!")
                        }
                    })

                    const {location, light_on, curtain_on, alarm_time, alarm_on, preferred_temp, name, heat, cold, thermostat_on} = results.rows[0]
                    let send_data = {username, location, light_on, curtain_on, alarm_time, alarm_on, preferred_temp, name, heat, cold, thermostat_on, token: access_token}
                    
                    // send jwt token
                    return res.status(200).send({status: 200, body: send_data, msg:"User loggedIn!"})
                }else{
                    return res.status(401).send({status: 401, msg: "Invalid Password! Try again!"})
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

// settings
exports.settings = (req, res) => {
    try{
        console.log("In Settings")
        // console.log(req.userdetails, req.body)
        const user_details = req.userdetails
        let {preferred_temp, location, alarm_time, alarm_on, name} = user_details

        if(req.body.preferred_temp || req.body.preferred_temp==0){
            preferred_temp = req.body.preferred_temp
        }if(req.body.location){
            location = req.body.location
        }if(req.body.alarm_time){
            alarm_time = req.body.alarm_time
        }if(req.body.name){
            name = req.body.name
        }if(req.body.alarm_on || req.body.alarm_on==0){
            alarm_on = req.body.alarm_on
        }
        
        // Update temp in DB
        db.query(`update users set preferred_temp='${preferred_temp}', location='${location}', alarm_time='${alarm_time}', alarm_on='${alarm_on}', name='${name}' where username='${user_details.username}';`, (error, results)=>{
            if(error){
                console.log("error in settings function at update: ", error)
                return res.status(400).send({status: 400, msg:"error in settings function at update"})
            }else{
                console.log("DB updated successfully!")
            }
        })
        return res.status(200).send({status: 200, body:{preferred_temp, location, alarm_time, alarm_on, name, username:user_details.username, light_on: user_details.light_on, curtain_on: user_details.curtain_on}, msg: "Updated the settings successfully!"})
    }catch(e){
        console.log("Error in updateThermostat: ", e)
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

        if(req.body.light_on || req.body.light_on==0){
            light_on = req.body.light_on
        }if(req.body.curtain_on || req.body.curtain_on==0){
            curtain_on = req.body.curtain_on
        }
        // console.log(light_on, curtain_on)
        
        // Send trigger to IOT device

        // Update in DB
        db.query(`update users set light_on='${light_on}', curtain_on='${curtain_on}' where username='${user_details.username}'`, (error, results)=>{
            if(error){
                console.log("error in deviceControl function at update: ", error)
                return res.status(400).send({status: 400, msg:"error in deviceControl function at update"})
            }else{
                console.log("DB updated successfully!")
            }
        })
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
        let {thermostat_on, thermostat_temp, preferred_temp, location, alarm_time, alarm_on, name, username, light_on, curtain_on, heat ,cold} = user_details

        if(req.body.temperature || req.body.temperature == 0){
            thermostat_temp = req.body.temperature
        }else{
            return res.status(400).send({status: 400, msg:"Temperature value NOT provided!"})            
        }
        
        // Send trigger to IOT device

        // Update temp in DB
        db.query(`update users set thermostat_temp='${thermostat_temp}' where username='${user_details.username}';`, (error, results)=>{
            if(error){
                console.log("error in updateThermostat function at update: ", error)
                return res.status(400).send({status: 400, msg:"error in updateThermostat function at update"})
            }else{
                console.log("DB updated successfully!")
            }
        })
        return res.status(200).send({status: 200, body:{thermostat_on, thermostat_temp, preferred_temp, heat, cold, location, alarm_time, alarm_on, name, username, light_on, curtain_on}, msg: "Updated the thermostat successfully!"})
    }catch(e){
        console.log("Error in updateThermostat: ", e)
        return res.status(400).send({status: 400, msg:"error in updateThermostat function"})
    }
}

// When alram time is up
exports.alarmTrigger = async (req, res) => {
    try{
        console.log("In alarmTrigger")
        // console.log(req.userdetails)
        const user_details = req.userdetails
        let {thermostat_temp, preferred_temp, location, alarm_time, alarm_on, name, username, light_on, curtain_on} = user_details
        let climate=""

        // for tests
        if(req.body.location){
            location = req.body.location
        }

        // if climate is in request(for tests)
        // check if it is sunny or cloudy
        const api_key = process.env.WEATHER_API_ACCESS_KEY
        const api = "https://api.openweathermap.org/data/2.5/weather?q=" + location + "&APPID=" + api_key
        console.log(api)
        https.get(api, (response) => {
            if(response.statusCode != 200){
                console.log("response statusCode " + response.statusCode + " is received, for weather data in alarmTrigger func!")
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
                    console.log("Close the curtains")
                    curtain_on = 0
                    console.log("On lights")
                    light_on = 1
                    console.log("On alarm")
                    console.log("Increase temperature")
                    thermostat_temp = 28

                    // Update details in DB
                }else{
                    console.log("Open curtain")
                    curtain_on = 1

                    console.log("On alarm")
                    
                    // update DB
                }
                return res.status(200).send({status: 200, body:{thermostat_temp, preferred_temp, location, alarm_time, alarm_on, name, username, light_on, curtain_on}, msg: weather_details.description})
            })
        })
    }catch(e){
        console.log("Error in alarmTrigger: ", e)
        return res.status(400).send({status: 400, msg:"error in alarmTrigger function"})
    }
}

