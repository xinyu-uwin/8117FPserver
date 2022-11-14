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
	curtain_open_percent = data["curtain-open"]
	if curtain_open_percent == 0:
		print("--- CURTAIN CLOSED")
	else:
		print("--- CURTAIN OPEN Percentage =", curtain_open_percent)
	print("\n")

myMQTTClient = AWSIoTMQTTClient("curtain")
myMQTTClient.configureEndpoint("a32yk77mbrevmu-ats.iot.us-east-2.amazonaws.com", 8883)
myMQTTClient.configureCredentials("./AmazonRootCA1.pem","./private.pem.key", "./certificate.pem.crt")

myMQTTClient.connect()
print("Device Curtain Connected to server!")

myMQTTClient.subscribe("trigger/curtain_open",1,customCallback)
# print("Device Curtain waiting for a trigger...\n")
exit = input()
