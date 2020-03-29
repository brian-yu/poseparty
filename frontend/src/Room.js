import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import Video from 'twilio-video';
import ml5 from 'ml5';

import Participant from './Participant';
import { getTwilioToken } from './api_utils';
import { drawKeypoints, drawSkeleton, poseSimilarity } from './posenet_utils';

import useWebSocket from 'react-use-websocket';
import { SOCKET_HOST } from './constants';

import './Room.css';

const MIN_POSE_CONFIDENCE = 0.1;
const GameStateEnum = Object.freeze({ Waiting: 1, Playing: 2, Finished: 3 });
const RoundStateEnum = Object.freeze({ Started: 1, Ended: 2});

function Room() {

  /* ============================================ INIT STATE ============================================ */

  // Room State
  const { roomID } = useParams();
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [sendMessage, lastMessage, readyState, getWebSocket] = useWebSocket(SOCKET_HOST);

  // Game State
  const [ready, setReady] = useState(false);
  const [gameState, setGameState] = useState(GameStateEnum.Waiting);
  const [roundState, setRoundState] = useState(RoundStateEnum.Ended);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState({});
  const [imageName, setImageName] = useState(null);
  const [imagePoseVector, setImagePoseVector] = useState(null);

  // PoseNet State
  const [videoRef, setVideoRef] = useState(null);
  const [canvasRef, setCanvasRef] = useState(null);
  const [poseNet, setPoseNet] = useState(null);
  
  /* ============================================ WEBSOCKETS ============================================ */

  // Log message output and change app state
  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);      
      const newLeaderboard = Object.entries(data.prevScores).reduce((acc, entry) => {
        const [key, value] = entry;
        acc[key] = value.reduce((a, b) => a + b, 0);
        return acc;
      }, {})

      switch (data.action) {
        case 'START_ROUND':
          console.log('STARTING ROUND!', data);
          if (gameState === GameStateEnum.Finished) {
            console.error('invalid game state transition');
            return;
          } else if (gameState === GameStateEnum.Waiting) {
            setGameState(GameStateEnum.Playing);
          }
          setRoundState(RoundStateEnum.Started);
          setCurrentRound(data.currentRound);
          setCurrentScore(0);
          setLeaderboard(newLeaderboard);
          // TODO: call function to display new scores
          // Update images/pose
          // Start new round animation
          const finishRound = () => {
            setCurrentScore(10); // Mock score update
            setRoundState(RoundStateEnum.Ended);
          }
          setTimeout(function() {finishRound()}, data.roundDuration * 1000);
          break;
        case 'END_GAME':
          console.log('ENDING GAME!', data);
          if (gameState !== GameStateEnum.Playing) {
            console.error('invalid game state transition');
            return;
          }
          setGameState(GameStateEnum.Finished);
          setLeaderboard(newLeaderboard);
          break;
        default:
          console.log('Unrecognized game action!', data);
      }
    }
  }, [lastMessage]);

  // Join the game
  useEffect(() => {
    if (username !== null) {
      sendMessage(JSON.stringify({ action: 'JOIN_GAME', name: username, room: roomID}));
      setReady(true); // TODO: change this elsewhere
    }
  }, [username]);

  // Set ready message
  useEffect(() => {
    if (ready === true) {
      sendMessage(JSON.stringify({ action: 'SET_READY', room: roomID}));
    }
  }, [ready]);

  // Submit Score
  useEffect(() => {
    if (gameState === GameStateEnum.Playing && roundState === RoundStateEnum.Ended) {
      sendMessage(JSON.stringify({ action: 'FINISH_ROUND', score: currentScore, room: roomID}));
    }
  }, [gameState, roundState]);

  /* ============================================ POSENET ============================================ */

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

  /* ============================================ TWILIO ============================================ */

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
          <h3>The Party</h3>
          <div className="remote-participants">{remoteParticipants}</div>
        </>
      ) : null}
      
    </div>
  );
}

export default Room;
