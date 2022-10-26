// Coomunicating with AWS IOT MQTT Client to publish mqtt messages to devices

var awsIot = require('aws-iot-device-sdk');
const path = require('path')

exports.publish_to_iot = function(topic, data){
    console.log("In publish_to_iot to topic: ", topic)
    var device = awsIot.device({
        keyPath :  path.resolve(__dirname, 'private.pem.key'),      // <YourPrivateKeyPath>,
        certPath:  path.resolve(__dirname, 'certificate.pem.crt'),  // <YourCertificatePath>,
        caPath  :  path.resolve(__dirname, 'AmazonRootCA1.pem'),    // <YourRootCACertificatePath>,
        clientId:  'server',                                        // <YourUniqueClientIdentifier>,
        host    :  'a32yk77mbrevmu-ats.iot.us-east-2.amazonaws.com' // <YourCustomEndpoint>
    })

    return device.publish(topic, JSON.stringify(data))
}
