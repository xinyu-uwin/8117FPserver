const mysql = require('mysql')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const db = require('../database/connection.js')

// User login
exports.auth = async (req, res, next) => {
    console.log("In auth middleware")
    try{
        const token = req.header('Authorization').replace('Bearer ', '')
        
        // verify the token using the access key
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async(err, decoded)=>{
            if(err){
                return res.status(401).send({status:401, msg: 'Please authenticate.'})
            }
            // console.log(decoded)
            // get user details for further use
            db.query(`select username, location, light_on, curtain_on, alarm_time_weekday, alarm_time_weekend, alarm_on, preferred_temp, name, heat, cold, thermostat_on, thermostat_temp from users where token='${token}';`, async (error, results)=>{
                if(error){
                    console.log("error in auth function at select:", error)
                    return res.status(400).send({msg:"error in auth function at select"})
                }
                else if(results.rows.length == 0){
                    return res.status(401).send({status:401, msg: "Token expired! Try logging In!!"})
                }else{
                    req.userdetails = results.rows[0]
                    next()
                }
            })
        })
    }
    catch(e){
        console.log("Error: ", e)
        res.status(401).send({ msg: 'Please authenticate.' })
    }
}
