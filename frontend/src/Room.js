import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from "react-router-dom";
import {CopyToClipboard} from 'react-copy-to-clipboard';
import { useToasts } from 'react-toast-notifications'
import Video from 'twilio-video';
import PoseNet from './posenet/components/PoseNet';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons'

import Participant from './Participant';
import { getTwilioToken } from './api_utils';
import { poseSimilarity } from './posenet_utils';

import useWebSocket, {ReadyState} from 'react-use-websocket';
import { SOCKET_HOST } from './constants';
import POSE_MAP from './data/moves'; // maps image names to pose objects.

import './Room.css';

const SIMILARITY_THRESHOLD_EXCELLENT = 0.25;
const SIMILARITY_THRESHOLD_GOOD = 0.55;
const SIMILARITY_THRESHOLD_OKAY = 0.8;
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
  const [muted, setMuted] = useState(true);
  const { addToast } = useToasts()
  
  // Websockets
  const SOCKET_STATIC_OPTIONS = useMemo(() => ({
    shouldReconnect: (closeEvent) => true,
    reconnectAttempts: 10,
    reconnectInterval: 2000,
  }), []);
  const [sendMessage, lastMessage, readyState] = useWebSocket(SOCKET_HOST, SOCKET_STATIC_OPTIONS);

  // Game State
  const [ready, setReady] = useState(false);
  const [gameState, setGameState] = useState(GameStateEnum.Waiting);
  const [roundState, setRoundState] = useState(RoundStateEnum.Ended);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [gameProgress, setGameProgress] = useState(0);
  const [correctFrames, setCorrectFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [leaderboard, setLeaderboard] = useState({});
  const imageRef = useRef();

  // TODO: handle loading of reference image poses.
  const [imageName, setImageName] = useState('tadasana.png');
  const [imagePose, setImagePose] = useState(POSE_MAP[imageName]);

  const [similarity, setSimilarity] = useState();
  
  const getNextRoom = () => {
    const lastChar = roomID[roomID.length - 1];
    let newChar = String.fromCharCode(lastChar.charCodeAt() + 1)
    if( /[^a-zA-Z0-9]/.test( newChar ) ) {
      newChar = 'A';
    }
    return roomID.substring(0, roomID.length - 1) + newChar;
  }

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
          setTotalRounds(data.totalRounds);
          setCorrectFrames(0);
          setTotalFrames(0);
          setLeaderboard(newLeaderboard);
          setImageName(data.imageName);
          setImagePose(POSE_MAP[data.imageName]);
          const finishRound = () => {
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
          setReady(false);
          setLeaderboard(newLeaderboard);
          break;
        default:
          console.log('Unrecognized game action!', data);
      }
    }
  }, [lastMessage]);

  // Join the game
  useEffect(() => {
    if (username !== null && readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({ action: 'JOIN_GAME', name: username, room: roomID}));
      // setReady(true); // TODO: change this elsewhere
    }
  }, [roomID, readyState, sendMessage, username]);

  // Set ready message
  useEffect(() => {
    if (ready === true && readyState === ReadyState.OPEN) {
      console.log('setting ready')
      sendMessage(JSON.stringify({ action: 'SET_READY', room: roomID}));
    }
  }, [ready, readyState, roomID, sendMessage]);

  // Submit Score
  useEffect(() => {
    if (gameState === GameStateEnum.Playing && roundState === RoundStateEnum.Ended && readyState === ReadyState.OPEN) {
      // TODO: check for NaN or Infinity
      const score = Math.round((correctFrames/totalFrames) * 10000);
      console.log('scoring');
      console.log(correctFrames);
      console.log(totalFrames);
      console.log(score);
      setGameProgress(((currentRound+1)/totalRounds));
      // Should probably include round number here if we have the frame counts as dependencies
      sendMessage(JSON.stringify({ action: 'FINISH_ROUND', score, room: roomID})); 
    }
  }, [correctFrames, totalFrames, gameState, readyState, roomID, roundState, sendMessage]);

  /* ============================================ TWILIO ============================================ */

  // get token, which only depends on roomID.
  useEffect(() => {
    const getToken = async () => {
      const token = await getTwilioToken(roomID);
      setToken(token);
    }
    getToken();
  }, [roomID]);

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
  }, [roomID, token]);

  const remoteParticipants = participants.map(participant => (
    <Participant key={participant.sid} muted={muted} participant={participant} score={leaderboard[participant.identity]}/>
  ));

  /* ========================================= POSENET + SCORING ========================================= */

  const handlePose = (pose) => {
    if (!imagePose || !pose || gameState === GameStateEnum.Finished) {
      return;
    }

    // handle scoring of video pose
    const s = poseSimilarity(imagePose, pose);
    setSimilarity(s);

    // on initial pose, set ready if true.
    // exploits the fact that ready is only changed once.
    // TODO: tune threshold
    if (!ready && s < SIMILARITY_THRESHOLD_EXCELLENT) {
      setReady(true);
    }
  }

  // UpdateScore
  useEffect(() => {
    if (gameState === GameStateEnum.Playing && roundState === RoundStateEnum.Started) {
      setTotalFrames(totalFrames+1);
      if (similarity <= SIMILARITY_THRESHOLD_EXCELLENT) {
        setCorrectFrames(correctFrames + 1);
      } else if (similarity <= SIMILARITY_THRESHOLD_GOOD) {
        setCorrectFrames(correctFrames + 0.6);
      } else if (similarity <= SIMILARITY_THRESHOLD_OKAY) {
        setCorrectFrames(correctFrames + 0.3);
      } else {
        setCorrectFrames(correctFrames + 0.1);
      }
    }
  }, [similarity, gameState, roundState]);

  /* ============================================ RENDER ============================================ */

  const DisplayScore = () => {
    if (gameState === GameStateEnum.Waiting) {
      return (
        <>
          {!ready ?
            <h1>Get in position to ready up!</h1> :
            <h1 style={{color: '#55efc4'}}>You are ready!</h1>
          }
          <h2>The game will start when everyone is ready.</h2>
        </>
      );
    }

    if (!ready || !similarity || gameState === GameStateEnum.Finished) {
      return null;
    }

    let score = Math.round((1-similarity)*100);
    let str = null;
    let color = null;
    if (similarity <= SIMILARITY_THRESHOLD_EXCELLENT) {
      str = 'Excellent!!'
      color = '#27ae60';
    } else if (similarity <= SIMILARITY_THRESHOLD_GOOD) {
      str = 'Good!';
      color = '#7bed9f';
    } else if (similarity <= SIMILARITY_THRESHOLD_OKAY) {
      str = 'Okay';
      color = 'orange';
    } else {
      str = 'Meh..';
      color = 'red';
    }
  return <h1 style={{color: color}}>{str}{' '}{score}</h1>;
  }

  const StatusBar = () => {
    if (totalRounds > 0){
      const progress = (gameProgress*100) + '%';
      return (
        <div style={{border: '2px solid #74b9ff', borderRadius: '10px', marginTop: '10px', marginBottom: '10px'}}>
          <div style={{backgroundColor: '#55efc4', height: '24px', width: progress, borderRadius: '10px'}}></div>
        </div>
      );
    }
    return null;
  }

  const GameOver = () => {
    const bestPlayer = Object.keys(leaderboard).reduce((a, b) => leaderboard[a] > leaderboard[b] ? a : b);
    return (
      <div className="game-over">
        <h1>Game Over!</h1>
        <h1>{bestPlayer} won with {leaderboard[bestPlayer]} points!</h1>
        <a className="button display" href={`/room/${getNextRoom()}`}>Join a new room</a>
      </div>
    );
  }

  const roomLink = window.location.href.replace(window.location.search, "");
  return (
    <div className="room">
      <div className="header">
        <h1 className="title display"><a href="/">PoseParty</a></h1>
        <h2>Send this link to your friends:
          <CopyToClipboard text={roomLink}
            onCopy={() => addToast('Copied link!', {
              appearance: 'info',
              autoDismiss: true,
            })}>
            <span style={{color: '#2ecc71', cursor: 'pointer'}}> { roomLink } </span>
          </CopyToClipboard>
        </h2>
        <a className="mute-button" onClick={() => setMuted(!muted)}>
          <FontAwesomeIcon icon={muted ? faVolumeMute : faVolumeUp} />
        </a>
      </div>

      <div className="main-container">

        { gameState === GameStateEnum.Finished ? 
          <GameOver /> :
          <img className="reference-img" 
            ref={imageRef}
            src={`${process.env.PUBLIC_URL}/img/${imageName}`}/>
        }

        <div className="local-participant">
          <h3>{room && room.localParticipant.identity}</h3>
          <div className='video-wrapper'>
            {room ? (
              <>
                <PoseNet
                  className="posenet"
                  frameRate={15}
                  // modelConfig={{
                  //   architecture: 'ResNet50',
                  //   quantBytes: 4,
                  //   outputStride: 32,
                  //   inputResolution: 193,
                  // }}
                  modelConfig={{
                    architecture: 'MobileNetV1',
                    outputStride: 16,
                    multiplier: 0.75,
                  }}
                  inferenceConfig={{
                    decodingMethod: 'single-person',
                    maxDetections: 1,
                  }}
                  onEstimate={(pose) => handlePose(pose)}
                  websocketReadyState={readyState}
                  drawSkeleton={!ready}
                />
                <DisplayScore />
              </>
            ) : null}
            <div className='score-overlay'>{room && leaderboard[room.localParticipant.identity]}</div>
          </div>
        </div>
      </div>
      <StatusBar />
      {remoteParticipants.length > 0 ? (
        <>
          <div className="remote-participants">{remoteParticipants}</div>
        </>
      ) : null}
      
    </div>
  );
}

export default Room;
