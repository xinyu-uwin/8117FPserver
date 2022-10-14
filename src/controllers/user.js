const mysql = require('mysql')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs');
const { request } = require('express');
// const dotenv = require('dotenv')

// dotenv.config()

// Connection Pool
const db = mysql.createPool({
    connectionLimit : 100,
    host            : process.env.DB_HOST,
    user            : process.env.DB_USER,
    password        : process.env.DB_PASS,
    database        : process.env.DB_NAME
});

// Register new user
exports.register = (req, res) => {
    try{
        console.log("In register")

        // console.log("req.body: ", req.body)
        const {username, password, location, alarm_time, preferred_temp, name} = req.body

        // check if user already exists or not
        db.query('select username from users where username=?', [username], async (error, results)=>{
            if(error){
                console.log("error in register function at select:", error)
                return res.status(400).send({status: 400, msg:"error in register function at select"})
            }
            else if(results.length > 0){
                return res.status(400).send({status: 400, msg: "User already exists! Try login"})
            }

            let hashedPassword = await bcrypt.hash(password, 8)

            // insert user details into db
            db.query('insert into users set ?', {username, password: hashedPassword, location, alarm_time, preferred_temp, name}, (error, results)=>{
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
        db.query('select * from users where username=?', [username], async (error, results)=>{
            if(error){
                console.log("error in register function at select:", error)
                return res.status(400).send({status: 400, msg:"error in register function at select"})
            }
            else if(results.length == 0){
                return res.status(401).send({status: 404, msg: "User not found, Please register!!"})
            }else{
                // compare hashedPassword
                let hashedPassword = results[0].password
                let password_correct = await bcrypt.compare(password, hashedPassword)
                if(password_correct){
                    // Generate jwt token
                    const access_token = jwt.sign(username, process.env.ACCESS_TOKEN_SECRET)
                    // Insert jwt token details into db
                    db.query('update users set token=? where username=?', [access_token, username], (error, results)=>{
                        if(error){
                            console.log("error in login function at insert: ", error)
                            return res.status(400).send({status: 400, msg:"error in users function at insert"})
                        }else{
                            console.log("Token insertion successfull!")
                        }
                    })

                    const {location, light_on, curtain_on, alarm_time, alarm_on, preferred_temp, name} = results[0]
                    let send_data = {username, location, light_on, curtain_on, alarm_time, alarm_on, preferred_temp, name, token: access_token}
                    
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
        db.query('update users set token=? where id=?', [null, user_details.id], (error, results)=>{
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
        db.query('update users set preferred_temp=?, location=?, alarm_time=?, alarm_on=?, name=? where id=?', [preferred_temp, location, alarm_time, alarm_on, name, user_details.id], (error, results)=>{
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
        db.query('update users set light_on=?, curtain_on=? where id=?', [light_on, curtain_on, user_details.id], (error, results)=>{
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
        let {thermostat_temp, preferred_temp, location, alarm_time, alarm_on, name, username, light_on, curtain_on} = user_details

        if(req.body.temperature || req.body.temperature == 0){
            thermostat_temp = req.body.temperature
        }else{
            return res.status(400).send({status: 400, msg:"Temperature value NOT provided!"})            
        }
        
        // Send trigger to IOT device

        // Update temp in DB
        db.query('update users set thermostat_temp=? where id=?', [thermostat_temp, user_details.id], (error, results)=>{
            if(error){
                console.log("error in updateThermostat function at update: ", error)
                return res.status(400).send({status: 400, msg:"error in updateThermostat function at update"})
            }else{
                console.log("DB updated successfully!")
            }
        })
        return res.status(200).send({status: 200, body:{thermostat_temp, preferred_temp, location, alarm_time, alarm_on, name, username, light_on, curtain_on}, msg: "Updated the thermostat successfully!"})
    }catch(e){
        console.log("Error in updateThermostat: ", e)
        return res.status(400).send({status: 400, msg:"error in updateThermostat function"})
    }
}
