import json
from pyrogram import Client
import settings

app = Client("my_account", settings.APP_ID, settings.APP_HASH)

def userEncoder(obj):
    return {
        "id": obj.user.id,
        "username": obj.user.username,
        "first_name": obj.user.first_name,
        "last_name": obj.user.last_name,
        "is_bot": obj.user.is_bot
    }

async def main():
    async with app:
        users = []
        async for member in app.get_chat_members(settings.CHAT_ID):
            if member.user.username:
                users.append(userEncoder(member))

        with open('users.json', 'w+', encoding='utf8') as file:
            file.write(json.dumps(users, ensure_ascii=False))
        
app.run(main())




