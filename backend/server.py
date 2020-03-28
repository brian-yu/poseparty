import flask
from flask import Flask
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
from twilio.rest import Client
import random
from time import sleep

app = Flask(__name__)

# Substitute your Twilio AccountSid and ApiKey details
# DO NOT CHANGE - all specific to Aaron's Twilio account
ACCOUNT_SID = '***REMOVED***'
AUTH_TOKEN = '***REMOVED***'
API_KEY_SID = '***REMOVED***'
API_KEY_SECRET = '***REMOVED***'
client = Client(ACCOUNT_SID, AUTH_TOKEN)

NAME_WORDS = [
    ['exuberant', 'restless', 'energetic', 'eager', 'infected', 'quarantined'], # adjectives
    ['yogi', 'poser', 'hacker', 'millenial', 'boomer', 'guru', 'student'], # nouns
]

@app.route('/createRoom/<name>/')
def createRoom(name):
    room = client.video.rooms.create(
                                type='peer-to-peer',
                                unique_name=name
                            )
    print(room.sid) # cannot make a room with the same name
    return room.sid

@app.route('/joinRoom/<name>/')
def joinRoom(name):
    room = client.video.rooms(name).fetch()
    return room.unique_name

@app.route('/completeRoom/<name>/')
def completeRoom(name):
    room = client.video.rooms(name).update(status='completed')
    return room.unique_name

@app.route('/workflow/<name>/')
def workflow(name):
    createRoom(name)
    joinRoom(name)
    sleep(5)
    return completeRoom(name)
    

@app.route('/getToken/<room>/')
def getToken(room):

    # Create an Access Token
    token = AccessToken(ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET)

    username = '-'.join(random.choice(NAME_WORDS[i]) for i in range(2))
    # Set the Identity of this token
    token.identity = username

    # Grant access to Video
    grant = VideoGrant(room=room) # this must be here
    token.add_grant(grant)

    # Serialize the token as a JWT
    jwt = token.to_jwt()
    print(jwt)
    return jwt

if __name__ == "__main__":
    app.run(debug=True)