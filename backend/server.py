import flask
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

# Substitute your Twilio AccountSid and ApiKey details
ACCOUNT_SID = '***REMOVED***' # ???
API_KEY_SID = '***REMOVED***'
API_KEY_SECRET = '***REMOVED***'

# Create an Access Token
token = AccessToken(ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET)

# Set the Identity of this token
token.identity = 'example-user'

# Grant access to Video
grant = VideoGrant(room='cool room')
token.add_grant(grant)

# Serialize the token as a JWT
jwt = token.to_jwt()
print(jwt)