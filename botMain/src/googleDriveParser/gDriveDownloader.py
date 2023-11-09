from google.oauth2 import service_account
from googleapiclient.http import MediaIoBaseDownload,MediaFileUpload
from googleapiclient.discovery import build
import pprint
import io
import sys
import os

pp = pprint.PrettyPrinter(indent=4)

SCOPES = ['https://www.googleapis.com/auth/drive']
SERVICE_ACCOUNT_FILE = './src/googleDriveParser/credentials.json'

def downloader(outputFileName, googleFileId):
    credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('drive', 'v3', credentials=credentials)

    results = service.files().list(pageSize=10, fields="nextPageToken, files(id, name, mimeType)").execute()

    request = service.files().export_media(fileId=googleFileId, mimeType='application/zip')

    dirname = os.path.dirname(outputFileName)
    os.makedirs(dirname, exist_ok=True)

    fh = io.FileIO(outputFileName, 'wb')
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
    if done is True:
        print ("success")

if __name__ == "__main__":
   downloader(sys.argv[1], sys.argv[2])
