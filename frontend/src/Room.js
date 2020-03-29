import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import Video from 'twilio-video';

import Participant from './Participant';
import { getTwilioToken } from './api_utils';

import './Room.css';

function Room() {

  const { roomID } = useParams();
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);

  // get token, which only depends on roomID.
  useEffect(() => {
    const getToken = async () => {
      const token = await getTwilioToken(roomID);
      console.log(token)
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
