import datetime
import json
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

def customCallback(client,userdata,message):
	data = json.loads(message.payload)
	# print("Data received from Server: ", data)
	time = datetime.datetime.now()
	print(time, end=" ")
	if data["curtain-open"] == 1:
		print("--- CURTAIN OPENED")
	elif data["curtain-open"] == 0:
		print("--- CURTAIN CLOSE")

myMQTTClient = AWSIoTMQTTClient("curtain")
myMQTTClient.configureEndpoint("a32yk77mbrevmu-ats.iot.us-east-2.amazonaws.com", 8883)
myMQTTClient.configureCredentials("./AmazonRootCA1.pem","./private.pem.key", "./certificate.pem.crt")

myMQTTClient.connect()
print("Device Curtain Connected to server!")

myMQTTClient.subscribe("trigger/curtain_open",1,customCallback)
# print("Device Curtain waiting for a trigger...\n")
exit = input()

