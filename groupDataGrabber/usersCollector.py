import json
from pyrogram import Client
from sqlalchemy import engine_from_config, true
import settings
from orm.models import Group, User, session, eng
from sqlalchemy.sql.expression import true

app = Client("my_bot", 
        api_id = settings.APP_ID, 
        api_hash = settings.APP_HASH, 
        bot_token = settings.BOT_TOKEN
    )

def userEncoder(obj):
    return {
        "id": obj.user.id,
        "username": obj.user.username,
        "first_name": obj.user.first_name,
        "last_name": obj.user.last_name,
        "is_bot": obj.user.is_bot
    }

currentGroup = session.query(Group).filter(Group.is_active == true()).first()

async def main():
    if not hasattr(currentGroup, "id"): return False
    
    # remove unrelative users list
    q = '''TRUNCATE TABLE {}'''.format(User.__tablename__)
    session.execute(q)
    session.commit()
    
    async with app:
        # the group id must be negative 
        async for member in app.get_chat_members(-currentGroup.id):
            if member.user.username:
                userEntity = User(
                    id = member.user.id,
                    group_id = currentGroup.id,
                    username = member.user.username,
                    first_name = member.user.first_name,
                    last_name = member.user.last_name,
                    is_bot = member.user.is_bot
                )
                session.add(userEntity)

        session.commit()
        session.close()
        
app.run(main())




