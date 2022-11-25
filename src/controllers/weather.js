/**
 * @author Naveen
 */

/**
 * imports
 */
const https = require('https')
const logger = require('../logger.js')

/**
 * Get weather details from 'openweathermap' API
 * @param {*} req accepts request body and params
 * @param {*} res responds with status and body data
 * @returns the weather data as response
 */
exports.weatherdata = (req, res) => {
    try {
        if (!req.body.location && !req.query.location) {
            return res.status(400).send({status: 400, msg: "Location not entered properly!" })
        }
        let location
        if(req.body.location){
            location = req.body.location
        }else{
            location = req.query.location
        }
        const api_key = process.env.WEATHER_API_ACCESS_KEY
        const api = "https://api.openweathermap.org/data/2.5/weather?q=" + location + "&APPID=" + api_key
        /**
         * Sending request to 'openweathermap' external API
         */
        https.get(api, (response) => {
            if(response.statusCode != 200){
                return res.status(404).send({status: 404, msg: "City not found! reenter the city!"})
            }
            response.on('data', (data)=>{
                const data_json = JSON.parse(data)
                const weather_data = data_json.weather[0]
                const temp_data = data_json.main
                console.log(data_json)
                /**
                 * convert temp from kelvin to celcius Celsius = (Kelvin – 273.15)
                 */
                const temperature = parseInt(temp_data.temp - 273.15)
                const feels_like = parseInt(temp_data.feels_like - 273.15)
                const data_to_send = {climate: weather_data.main, description: weather_data.description, place: data_json.name, country: data_json.sys.country, temperature, feels_like, unit: "celsius"}
                return res.status(200).send({status: 200, body:data_to_send})
            })
        })
    } catch (e) {
        logger.logExceptions(e, req.body, "weatherdata()")
        return res.status(400).send({status: 400, msg: "error encountered!" })
    }
}
