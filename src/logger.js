/**
 * import from winston library
 */
const {createLogger, transports, format} = require("winston");

const customFormat = format.combine(format.timestamp(), format.printf((info)=>{
    return `${info.timestamp} - ${info.message}`
}))

/**
 * logger method that stores error logs in 'errorReport.log' file, located in root folder.
 */
const logger = createLogger({
    format: customFormat,
    transports:[
        // new transports.Console({level:'info'}),
        new transports.File({filename: 'errorReport.log'})
    ]
})

/**
 * Formatting the Exception messages to log them.
 */
const logExceptions = (error, reqBody, errInFunction)=>{
    try{
        if(typeof reqBody == "object") reqBody = JSON.stringify(reqBody)
        logMsg = "errorInFunction: "+errInFunction+", requestBody: "+reqBody+", errorMsg:"
        logger.error(logMsg, reqBody, error)
    }catch(e){
        console.log("In logger!")
    }
}

module.exports = {
    logger,
    logExceptions
}
