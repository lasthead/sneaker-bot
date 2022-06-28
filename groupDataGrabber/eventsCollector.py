import requests
import settings

result = requests.get("https://api.telegram.org/bot" + settings.BOT_TOKEN + "/getUpdates")
resJson = result.text

file = open('eventsCollections.json', 'w+')
file.write(resJson)
file.close()
