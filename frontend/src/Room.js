import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import Video from 'twilio-video';
import ml5 from 'ml5';

import Participant from './Participant';
import { getTwilioToken } from './api_utils';
import { drawKeypoints, drawSkeleton, poseSimilarity } from './posenet_utils';

import './Room.css';

const MIN_POSE_CONFIDENCE = 0.1;

function Room() {

  const { roomID } = useParams();
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  const [videoRef, setVideoRef] = useState(null);
  const [canvasRef, setCanvasRef] = useState(null);

  const [poseNet, setPoseNet] = useState(null);

  // load poseNet.
  useEffect(() => {
    if (poseNet) {
      return;
    }

    const modelReady = () => {
      console.log('model ready');
    }

    const model = ml5.poseNet(modelReady, {
      architecture: 'ResNet50',
      detectionType: 'single',
      quantBytes: 4,
      outputStride: 32,
      inputResolution: 193, // default 257
      maxPoseDetections: 1,
    });
    
    setPoseNet(model);
  });

  // setup canvas
  useEffect(() => {
    if (!videoRef || !canvasRef || !poseNet) {
      return;
    }
    console.log('VIDEO', videoRef.current)

    const ctx = canvasRef.current.getContext('2d');
    const video = videoRef.current;

    poseNet.video = video;

    let videoPose = null;

    poseNet.on('pose', (results) => {
      videoPose = results[0];
    });

    const drawCameraIntoCanvas = () => {
      // Draw the video element into the canvas
      ctx.drawImage(video, 0, 0, 640, 480);
      // We can call both functions to draw all keypoints and the skeletons
      if (videoPose !== null) {
        // console.log(pose)
        if (videoPose.pose.score >= MIN_POSE_CONFIDENCE) {
          drawKeypoints(videoPose, 0.2, ctx);
          drawSkeleton(videoPose, ctx);
        }
      }
      window.requestAnimationFrame(drawCameraIntoCanvas);
    }
    // Loop over the drawCameraIntoCanvas function
    drawCameraIntoCanvas();
    
  }, [videoRef, canvasRef, poseNet]);

  // get token, which only depends on roomID.
  useEffect(() => {
    const getToken = async () => {
      const token = await getTwilioToken(roomID);
      setToken(token);
    }
    getToken();
  }, []);

  // retrieve connected participants and create listeners for participant
  // connections.
  useEffect(() => {
    if (token === null) {
      return;
    }

    const participantConnected = participant => {
      setParticipants(prevParticipants => [...prevParticipants, participant]);
    };
    const participantDisconnected = participant => {
      setParticipants(prevParticipants =>
        prevParticipants.filter(p => p !== participant)
      );
    };
    Video.connect(token, {
      name: roomID
    }).then(room => {
      setRoom(room);
      setUsername(room.localParticipant.identity);
      room.on('participantConnected', participantConnected);
      room.on('participantDisconnected', participantDisconnected);
      room.participants.forEach(participantConnected);

      window.addEventListener('unload', () => {
        if (room && room.localParticipant.state === 'connected') {
          room.localParticipant.tracks.forEach(function(trackPublication) {
            trackPublication.track.stop();
          });
          room.disconnect();
        }
      })

    });

    return () => {
      setRoom(currentRoom => {
        if (currentRoom && currentRoom.localParticipant.state === 'connected') {
          currentRoom.localParticipant.tracks.forEach(function(trackPublication) {
            trackPublication.track.stop();
          });
          currentRoom.disconnect();
          return null;
        } else {
          return currentRoom;
        }
      });
    };
  }, [token]);

  const remoteParticipants = participants.map(participant => (
    <Participant key={participant.sid} participant={participant} />
  ));

  return (
    <div className="room">
      <div className="header">
        <h1 className="title"><a href="/">PoseParty</a></h1>
        <p>Send this link to your friends: <a href={window.location.href}>{ window.location.href }</a></p>
      </div>

      <div className="main-container">
        <img className="reference-img" 
          src={process.env.PUBLIC_URL + '/img/tadasana.png'}/>

        <div className="local-participant">
          {room ? (
            <Participant
              key={room.localParticipant.sid}
              participant={room.localParticipant}
              setVideoRef={setVideoRef}
              setCanvasRef={setCanvasRef}
              isPlayer={true}
            />
          ) : null}
        </div>

      </div>

      
      {remoteParticipants.length > 0 ? (
        <>
          <h3>Remote Participants</h3>
          <div className="remote-participants">{remoteParticipants}</div>
        </>
      ) : null}
      
    </div>
  );
}

export default Room;
