# [PoseParty](https://poseparty.brian.lol)

## Inspiration

Over the course of this Coronavirus quarantine, we've discovered that it's significantly harder to connect with friends in a way that promotes physical activity. We wanted to solve this issue with a fun game that encourages a whole group of friends to get out of their chairs in an exciting and competitive way.

## What it does

PoseParty is a game where players have to strike and hold the right pose to earn the most points. Each round is fast-paced, with a pose that a player has to hold for a random time duration. After several rounds, the person with the most points wins!

## How we built it

To implement our game flow and keep all the different players synchronized, we used websockets. Our backend consisted of a websocket game server to control game flow and a Flask server to send and receive Twilio tokens. Both backend servers were written in Python and are deployed on Google Compute Engine and Google Cloud App Engine, respectively. 

For our frontend, we used React. We used the Twilio Video API to connect the video and audio of multiple users for each room. For pose detection, we are running an in-browser JavaScript version of PoseNet running on TensorflowJS that detects the body position of a user and compares them to a reference image to score how well they hold the yoga pose.

## Challenges we ran into

Before this project, none of us had any experience with websockets, and it was difficult to set up since we all had to adjust to a different communication protocol. We had to use some hacks to get it hosted correctly on Google Cloud so that anyone on the web can access it.

## Accomplishments that we're proud of

It's very exciting to have fun in a game that we built from scratch! We're also incredibly happy to have our game working in production and be able to send a PoseParty room link to friends and have them immediately join without any setup.

## What we learned

We learned a lot about using and deploying WebSockets so that we could facilitate communication between users of the application and send/receive game state updates in real-time. We also learned a lot about React hooks and TensorflowJS.

## What's next for PoseParty

We're gonna go viral! We would also like to add custom poses that players can create and upload, and also different game modes where players can cooperate to pass levels.

## Other links
[Full Video Demo](https://www.youtube.com/watch?v=1ielsQyZPLU)
