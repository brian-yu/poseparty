import ml5 from 'ml5';

import { getOrCreateRoomID } from './api_utils';
import { setupTwilio } from './twilio_utils';
import { drawKeypoints, drawSkeleton, poseSimilarity } from './posenet_utils';
import { SOCKET_HOST } from './constants';

const MIN_POSE_CONFIDENCE = 0.1;
const MIN_PART_CONFIDENCE = 0.5;

const ROOM_ID = getOrCreateRoomID();

// TODO: fix bug where sometimes video feed doesnt load correctly.
document.addEventListener("DOMContentLoaded", run);

const GameStateEnum = Object.freeze({"Waiting":1, "Playing":2, "Finished":3})
const STATE = {
  gameState: GameStateEnum.Waiting,
  playerName: null,
  currentScore: 0, // and other scoring metadata
  currentRound: 0,
  allScores: {},
  totalScores: {},
  imageName: null,
  imagePoseVector: null,
}

// setup video calling and set player name
setupTwilio(ROOM_ID, STATE);

class GameClient {
  constructor(SOCKET_HOST, room) {
    this.room = room;
    this.ws = new WebSocket(SOCKET_HOST);
    
    this.ws.onmessage = event => {
      data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onopen = () => {
      // TODO: wait until twilio is ready
      this.join();
    };

    this.ws.onerror = (err) => {
      console.error('Error connecting to game socket server:', err);
    }

    this.ws.onclose = () => {
      console.log('Connection with game socket server closed.');
    }
  }

  join() {
    this.send({
      action: "JOIN_GAME",
      name: STATE.playerName,
    });
  }

  setReady() {
    this.send({ action: 'SET_READY' })
  }

  finishRound() {
    this.send({
      score: STATE.currentScore,
      action: 'FINISH_ROUND',
    })
  }

  send(data) {
    console.log(data);
    this.ws.send(JSON.stringify({
      room: this.room,
      ...data
    }));
  }

  handleMessage(data) {
    switch (data.action) {
      case 'START_ROUND':
        console.log('STARTING ROUND!', data);
        if (STATE.gameState === GameStateEnum.Finished) {
          console.error('invalid game state transition');
          return;
        } else if (STATE.gameState === GameStateEnum.Waiting) {
          STATE.gameState = GameStateEnum.Playing;
        }
        STATE.currentRound = data.currentRound;
        STATE.currentScore = 0;
        STATE.allScores = data.prevScores;
        STATE.totalScores = STATE.allScores.map((arr) => arr.reduce((a,b) => a + b, 0)); // SUM
        // TODO: call function to display new scores
        // Update images/pose
        // Start new round animation
        setTimeout(this.finishRound(), data.roundDuration*100);
        break;
      case 'END_GAME':
        console.log('ENDING GAME!', data);
        if (STATE.gameState !== GameStateEnum.Playing) {
          console.error('invalid game state transition');
          return;
        }
        STATE.gameState = GameStateEnum.Finished;
        STATE.allScores = data.prevScores;
        STATE.totalScores = STATE.allScores.map((arr) => arr.reduce((a,b) => a + b, 0)); // SUM
        break;
      default:
        console.log('Unrecognized game action!', data);
    }
  }
}

const GAME_CLIENT = new GameClient(SOCKET_HOST, ROOM_ID);
console.log('Game created');

/*
TODO:
- Set up websocket handler 
  - START_ROUND
    - If data[current_round] == 0 
      - notify user that game is starting
    - populate reference image with given image
    - populate each screen with the score
    - start timeout with given duration that calls score_submit
    - zero out current_score
  - END_GAME
    - replace reference image with leaderboard?
- JOIN_GAME on load
- SET_READY when user is in full frame / matches reaady pose ('tadasana'?)
    - (use posenet to detect)
    - add green somewhere (border?) to signify readiness


- cache pose computations of preset poses
- determine scoring
- improve posenet similarity matching
  - do bounding box trimming/scaling
  - weighted matching?
- make skeleton drawing prettier?

*/

function run() {
  // Grab elements, create settings, etc.
  const video = document.getElementById('video');
  const canvas = document.getElementById('video-canvas');
  const ctx = canvas.getContext('2d');

  const img = document.getElementById('img');
  const imgCanvas = document.getElementById('img-canvas');
  const imgCtx = imgCanvas.getContext('2d');

  // scale image to fit on canvas

  // The detected positions will be inside an array
  let videoPose = null;

  let imgPose = null;

  // Create a webcam capture
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      video.srcObject = stream;
      video.play();
    });
  }

  const drawImageIntoCanvas = (img, pose, canvas) => {
    const ctx = canvas.getContext('2d');

    // TODO: scale image and pose so that proportions are not distorted
    ctx.drawImage(img, 0, 0, 640, 480);

    drawKeypoints(pose, .2, ctx);
    drawSkeleton(pose, ctx);
  }

  // A function to draw the video and poses into the canvas.
  // This function is independent of the result of posenet
  // This way the video will not seem slow if poseNet
  // is not detecting a position
  function drawCameraIntoCanvas() {
    // Draw the video element into the canvas
    ctx.drawImage(video, 0, 0, 640, 480);
    // We can call both functions to draw all keypoints and the skeletons
    if (videoPose !== null) {
      // console.log(pose)
      if (videoPose.pose.score >= MIN_POSE_CONFIDENCE) {
        drawKeypoints(videoPose, .2, ctx);
        drawSkeleton(videoPose, ctx);
      }
    }
    window.requestAnimationFrame(drawCameraIntoCanvas);
  }
  // Loop over the drawCameraIntoCanvas function
  drawCameraIntoCanvas();

  // Create a new poseNet method with a single detection
  const poseNet = ml5.poseNet(modelReady, {
     // architecture: 'MobileNetV1',
     // detectionType: 'single',
     // multiplier: 1,
     // inputResolution: 353,

     architecture: 'ResNet50',
     detectionType: 'single',
     quantBytes: 4,
     outputStride: 32,
     inputResolution: 193, // default 257
     maxPoseDetections: 1,
     // minConfidence: MIN_PART_CONFIDENCE,
  });
  poseNet.on('pose', gotPoses);

  // A function that gets called every time there's an update from the model
  function gotPoses(results) {

    // handle first image pose.
    if (imgPose === null) {
      imgPose = results[0];
      console.log("IMGPOSE", imgPose)
      poseNet.video = video;

      drawImageIntoCanvas(img, imgPose, imgCanvas);
      return;
    }

    videoPose = results[0];
    // console.log("VIDEOPOSE", videoPose)

    const score = poseSimilarity(videoPose, imgPose);
    const scoreElem = document.getElementById('similarity-score');
    scoreElem.textContent = score;
    scoreElem.style['color'] = 'white';
    if (score < .1) {
      scoreElem.style['background-color'] = '#2ecc71';
    } else {
      scoreElem.style['background-color'] = '#e74c3c';
    }
    
  }

  function modelReady() {
    console.log('model ready');

    // first do image.
    poseNet.singlePose(img);
  }

}