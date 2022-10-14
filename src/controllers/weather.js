const https = require('https')
// const dotenv = require('dotenv')

// weather data
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

        https.get(api, (response) => {
            if(response.statusCode != 200){
                return res.status(404).send({status: 404, msg: "City not found! reenter the city!"})
            }
            response.on('data', (data)=>{
                const data_json = JSON.parse(data)
                const weather_data = data_json.weather[0]
                const temp_data = data_json.main
                
                // convert temp from kelvin to celcius Celsius = (Kelvin – 273.15)
                const temperature = parseInt(temp_data.temp - 273.15)
                const feels_like = parseInt(temp_data.feels_like - 273.15)

                return res.status(200).send({status: 200, body:{climate: weather_data.main, descriptioin: weather_data.description, place: data_json.name, country: data_json.sys.country, temperature, feels_like, unit: "celsius"}})
            })
        })
    } catch (e) {
        console.log("error:", e)
        return res.status(400).send({status: 400, msg: "error encountered!" })
    }
}