import requests
import json
import copy
from orm.models import Group, session
from orm.configs import TG_GET_UPDATES_URI
class Chat(object):
    def __init__(self, id, title=False, type=False, **args):
        self.id = id
        self.type = type
        self.title = title
        self.owner = None
class Owner(object):
    def __init__(self, id, username=False, **args):
        self.id = id
        self.username = username

def getGroupsCollection(array):
    groupCollection = []
    for val in array:
        newObj = {}
        if ("my_chat_member" in val):
            newObj = copy.copy(Chat(**val["my_chat_member"]["chat"]))
            newObj.owner = copy.copy(Owner(**val["my_chat_member"]["from"]))
        if ("channel_post" in val):
            newObj = copy.copy(Chat(**val["channel_post"]["chat"]))
            newObj.owner = copy.copy(Owner(**val["channel_post"]["from"]))
        if ("message" in val):
            newObj = copy.copy(Chat(**val["message"]["chat"]))
            newObj.owner = copy.copy(Owner(**val["message"]["from"]))

        # remove duplicate groups from json response data
        if (len([x.id for x in groupCollection if x.id == newObj.id]) < 1):
            groupCollection.append(newObj)
    return groupCollection


result = requests.get(TG_GET_UPDATES_URI)
resJson = json.loads(result.content)
# print(resJson, TG_GET_UPDATES_URI)

groupsCollection = getGroupsCollection(resJson["result"])

existGroupsList = list(session.query(Group))


for group in groupsCollection:
     # the group id must be negative
    if (len([x.id for x in existGroupsList if x.id == -group.id]) < 1):
        groupEntity = Group(
            id = -group.id,
            name = group.title,
            owner_id = group.owner.id,
            owner_username = group.owner.username
        )
        session.add(groupEntity)

session.commit()
session.close()
