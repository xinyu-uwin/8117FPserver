const { request } = require('express')
const https = require('https')
const db = require('../database/connection.js')
const iotController = require('../connect_to_aws/publish_to_iot.js')

// Check if its sunny or cloudy and Set thermostat
exports.automateThermostat = ()=>{
    // Go through each user and get alarm time and location
    db.query(`select * from users;`, (error, results)=>{
        if(error){
            console.log("error in checkOutsideTemperature function at select:", error)
            return "error in checkOutsideTemperature"
        }
        else if(results.rows.length == 0){
            console.log("No Users!")
            return "No users!"
        }else{
            let users_list = results.rows
            let user_details, publish_data
            let topic = "trigger/thermostat_update"

            for(let i=0; i<users_list.length;i++){
                let update_db = 0
                user_details = users_list[i]
                let {username, location, heat, cold, thermostat_temp} = user_details
                const api_key = process.env.WEATHER_API_ACCESS_KEY
                const api = "https://api.openweathermap.org/data/2.5/weather?q=" + location + "&APPID=" + api_key
                
                https.get(api, (response) => {
                    if(response.statusCode != 200){
                        console.log("response statusCode " + response.statusCode + " is received, for weather data in alarmTrigger func!")
                        console.log("City not found! reenter the city!")
                    }
                    response.on('data', (data)=>{
                        const data_json = JSON.parse(data)
                        // const weather_data = data_json.weather[0]
                        const temp_data = data_json.main
                        
                        // convert temp from kelvin to celcius Celsius = (Kelvin – 273.15)
                        // const temperature = parseInt(temp_data.temp - 273.15)
                        const feels_like = parseInt(temp_data.feels_like - 273.15)
                        console.log(`For user=${username} at Location=${location}, outside temperature feels-like=${feels_like}`)
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

                        if(update_db == 1){
                            publish_data = {"temperature":thermostat_temp, heat, cold}
                            iotController.publish_to_iot(topic, publish_data)
                            db.query(`update users set heat='${heat}', cold='${cold}' where username='${username}'`, (error, results)=>{
                                if(error){
                                    console.log("error in alarmTrigger function at update: ", error)
                                }else{
                                    console.log("DB updated successfully!")
                                }
                            })
                        }
                    })
                })
            }
            return "Auto-Thermostat Operations done!!!"
        }
    })
}