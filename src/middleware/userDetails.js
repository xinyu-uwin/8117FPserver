const db = require('../database/connection.js')

// User login
exports.details = async (req, res, next) => {
    console.log("In middleware details")
    try{
        let username = req.body.username.toString()
        
        db.query(`select username,name,location,light_on,curtain_on,alarm_on,thermostat_on,thermostat_temp,preferred_temp,heat,cold,otp,alarm_time_weekday,alarm_time_weekend from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in middleware details function at select:", error)
                return res.status(400).send({msg:"error in middleware details function at select"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status:404, msg: "User not Found, Try registering!!"})
            }else{
                req.userdetails = results.rows[0]
                next()
            }
        })
    }
    catch(e){
        console.log("Error is : ", e)
        return res.status(401).send({ msg: 'Please authenticate.' })
    }
}