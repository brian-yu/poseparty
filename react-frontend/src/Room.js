import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useParams
} from "react-router-dom";

function Room() {

  let { roomID } = useParams();

  console.log(roomID)

  return (
    <div className="room">
      <h1>Room</h1>
    </div>
  );
}

export default Room;
