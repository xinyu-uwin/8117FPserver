import datetime
import json
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

def customCallback(client,userdata,message):
	data = json.loads(message.payload)
	# print("Data received from Server: ", data)
	time = datetime.datetime.now()

	username = data["username"]
	room_name = data["room_name"]
	print(">>> In room: " + room_name + " of user: " + username, end="\n")
	
	print(time, end=" ")
	light_on_percent = data["light-on"]
	if light_on_percent == 0:
		print("--- LIGHT TURNED OFF")
	else:
		print("--- LIGHT TURNED ON Percentage = ", light_on_percent)
	print("\n")

myMQTTClient = AWSIoTMQTTClient("light_bulb")
myMQTTClient.configureEndpoint("a32yk77mbrevmu-ats.iot.us-east-2.amazonaws.com", 8883)
myMQTTClient.configureCredentials("./AmazonRootCA1.pem","./private.pem.key", "./certificate.pem.crt")

myMQTTClient.connect()
print("Device light_bulb Connected to server!")

myMQTTClient.subscribe("trigger/light_on",1,customCallback)
# print("Device light_bulb waiting for a trigger...\n")
exit = input()

