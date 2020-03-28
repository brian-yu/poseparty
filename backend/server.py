import flask
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

app = Flask(__name__)

# Substitute your Twilio AccountSid and ApiKey details
ACCOUNT_SID = 'SK405fe7fb175d6b479f62bd3ee922b036' # ???
API_KEY_SID = 'SK405fe7fb175d6b479f62bd3ee922b036'
API_KEY_SECRET = 'i46QxVuJKZ38LuewwpTDzkn5nbeMwXPH'




@app.route('/getToken/<room>/<username>')
def getToken(room, username):

    # Create an Access Token
    token = AccessToken(ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET)

    # Set the Identity of this token
    token.identity = username

    # Grant access to Video
    grant = VideoGrant(room='cool room')
    token.add_grant(grant)

    # Serialize the token as a JWT
    jwt = token.to_jwt()
    print(jwt)
    return jwt