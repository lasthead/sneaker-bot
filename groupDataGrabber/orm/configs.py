import os
from dotenv import load_dotenv
from pathlib import Path
import settings

HOSTNAME = os.getenv("HOSTNAME")
DATABASE = os.getenv("DATABASE")
USERNAME = os.getenv("USERNAME")
PASSWORD = os.getenv("PASSWORD")
TG_GET_UPDATES_URI=os.getenv("TG_GET_UPDATES_URI").format(settings.BOT_TOKEN)
DB_URI = 'mysql://{}:{}@{}/{}'.format(
    USERNAME, PASSWORD, HOSTNAME, DATABASE
)