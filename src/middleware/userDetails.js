/**
 * @author Naveen
 */

/**
 * database connection variable
 */
const db = require('../database/connection.js')
const logger = require('../logger.js')

/**
 * A middleware that gets called to verify a user
 * @param {*} req request details
 * @param {*} res sends response status and message
 * @param {*} next proceeds to the next method
 * @returns message to user if authentication is required
 */
exports.details = async (req, res, next) => {
    try{
        /**
         * Varaibles username and room_name
         */
        let username = req.body.username.toString()
        let {room_name} = req.body
        if(username == null){
            return res.status(400).send({status: 400, msg:"Incorrect data provided, Please try again!"})
        }
        /**
         * Fetch user details from database
         */
        db.query(`select name,location from users where username='${username}';`, async (error, results)=>{
            if(error){
                logger.logExceptions(error, req.body, "details() select query-1")
                return res.status(400).send({msg:"Incorrect data provided!"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status:404, msg: "User not Found, Try registering!!"})
            }
            let {name, location} = results.rows[0]
            db.query(`select * from rooms where username='${username}';`, async (error, result)=>{
                if(error){
                    logger.logExceptions(error, req.body, "details() select query-2")
                    return res.status(400).send({msg:"Incorrect data provided!"})
                }
                let room_list = result.rows
                let room_details, room_names = [], send_data
                let rooms_count = room_list.length

                for(let i=0;i<rooms_count;i++){
                    room_names.push(room_list[i]["room_name"])
                }

                if(rooms_count == 1 || room_name == null || (room_names.includes(room_name) == false)){
                    room_details = room_list[0]
                }else{
                    for(let j=0;j<rooms_count;j++){
                        if(room_list[j].room_name == req.body.room_name){
                            room_details = room_list[j]
                            break        
                        }
                    }
                }
                send_data = {username, name, location, room_details, room_names, "rooms_count":result.rows.length, room_list}
                req.userdetails = send_data
                next()
            })
        })
    }
    catch(e){
        logger.logExceptions(e, req.body, "details() middleware function")
        return res.status(401).send({ msg: 'Please authenticate.' })
    }
}
