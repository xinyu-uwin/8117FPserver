const db = require('../database/connection.js')

// User login
exports.details = async (req, res, next) => {
    // console.log("In middleware details")
    try{
        let username = req.body.username.toString()
        let {room_name} = req.body
        if(username == null){
            return res.status(400).send({status: 400, msg:"Incorrect data provided, Please try again!"})
        }
        db.query(`select name,location from users where username='${username}';`, async (error, results)=>{
            if(error){
                console.log("error in middleware details function at select:", error)
                return res.status(400).send({msg:"Incorrectt data provided!"})
            }
            else if(results.rows.length == 0){
                return res.status(401).send({status:404, msg: "User not Found, Try registering!!"})
            }
            let {name, location} = results.rows[0]
            db.query(`select * from rooms where username='${username}';`, async (error, result)=>{
                if(error){
                    console.log("error in middleware details function at select:", error)
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
        console.log("Error is : ", e)
        return res.status(401).send({ msg: 'Please authenticate.' })
    }
}
