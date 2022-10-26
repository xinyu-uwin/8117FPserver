import datetime
import json
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

def customCallback(client,userdata,message):
	data = json.loads(message.payload)
	# print("Data received from Server: ", data)
	time = datetime.datetime.now()
	print(time, end=" ")
	print("--- Temperature changed to ", data["temperature"])
myMQTTClient = AWSIoTMQTTClient("thermostat")
myMQTTClient.configureEndpoint("a32yk77mbrevmu-ats.iot.us-east-2.amazonaws.com", 8883)
myMQTTClient.configureCredentials("./AmazonRootCA1.pem","./private.pem.key", "./certificate.pem.crt")

myMQTTClient.connect()
print("Device Thermostat Connected to server!")

myMQTTClient.subscribe("trigger/thermostat_update",1,customCallback)
# print("Device Thermostat waiting for a trigger...\n")
exit = input()

