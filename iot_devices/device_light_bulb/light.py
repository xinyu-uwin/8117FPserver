import datetime
import json
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

def customCallback(client,userdata,message):
	data = json.loads(message.payload)
	# print("Data received from Server: ", data)
	time = datetime.datetime.now()
	print(time, end=" ")
	if data["light-on"] == 1:
		print("--- LIGHT TURNED ON")
	elif data["light-on"] == 0:
		print("--- LIGHT TURNED OFF")

myMQTTClient = AWSIoTMQTTClient("light_bulb")
myMQTTClient.configureEndpoint("a32yk77mbrevmu-ats.iot.us-east-2.amazonaws.com", 8883)
myMQTTClient.configureCredentials("./AmazonRootCA1.pem","./private.pem.key", "./certificate.pem.crt")

myMQTTClient.connect()
print("Device light_bulb Connected to server!")

myMQTTClient.subscribe("trigger/light_on",1,customCallback)
# print("Device light_bulb waiting for a trigger...\n")
exit = input()

