import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()
env_path = Path('.')/'.env'
load_dotenv(dotenv_path=env_path)

APP_ID = os.getenv("APP_ID")
APP_HASH = os.getenv("APP_HASH")
BOT_TOKEN = os.getenv("APP_ID")
CHAT_ID = os.getenv("CHAT_ID")