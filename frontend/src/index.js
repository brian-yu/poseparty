import ml5 from 'ml5';
import { connect, createLocalTracks } from 'twilio-video';

import { drawKeypoints, drawSkeleton, poseSimilarity } from './utils';
import { TEST_TOKEN } from './secrets';

const MIN_POSE_CONFIDENCE = 0.1;
const MIN_PART_CONFIDENCE = 0.5;

const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.has('room')) {
  const hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  urlParams.set('room', hash);
  window.location.search = urlParams.toString();
}
const room = urlParams.get('room');

document.addEventListener("DOMContentLoaded", run);


console.log('hello!');

// TODO: create room based on urlParams. and get access token from flask.

createLocalTracks({
  audio: true,
  video: { width: 640 }
}).then(localTracks => {
  return connect(TEST_TOKEN, {
    name: 'room1',
    tracks: localTracks
  });
}).then(room => {
  console.log(`Connected to Room: ${room.name}`);

  const addParticipant = participant => {
    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        const track = publication.track;
        const elem = track.attach();
        elem.participantIdentity = participant.identity;
        document.getElementById('remote-media-div').appendChild(elem);
      }
    });

    participant.on('trackSubscribed', track => {
      const track = publication.track;
      const elem = track.attach();
      elem.participantIdentity = participant.identity;
      document.getElementById('remote-media-div').appendChild(elem);
    });
  }

  const removeParticipant = participant => {
    const container = document.getElementById('remote-media-div');
    for (const elem of container.children) {
      if (elem.participantIdentity === participant.identity) {
        container.removeChild(elem);
      }
    }
  }

  room.participants.forEach(participant => {
    console.log(`Participant "${participant.identity}" is connected to the Room`);

    addParticipant(participant);
  });


  // Attach the Participant's Media to a <div> element.
  room.on('participantConnected', participant => {
    console.log(`Participant "${participant.identity}" connected`);

    addParticipant(participant);
  });

  room.on('participantDisconnected', participant => {
    console.log(`Participant disconnected: ${participant.identity}`);
    removeParticipant(participant);
  });

  room.on('disconnected', room => {
    // Detach the local media elements
    room.localParticipant.tracks.forEach(publication => {
      const attachedElements = publication.track.detach();
      attachedElements.forEach(element => element.remove());
    });
  });

  window.addEventListener('unload', () => {
    room.disconnect();
  });
});

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

    ctx.drawImage(img, 0, 0, 640, 480);

    // ctx.drawImage(img, 0, 0, img.width,    img.height,     // source rectangle
    //                  0, 0, canvas.width, canvas.height); // destination rectangle

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