import React, {useEffect, useState} from 'react';
import { ToastProvider } from 'react-toast-notifications'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
} from "react-router-dom";

import Room from './Room';
import LogPose from './LogPose';
import { GLITCH_SOCKET_HTTP_HOST } from './constants';
import './App.css';

function App() {

  const [message, setMessage] = useState(null);

  // Ping Glitch socket server on startup 
  useEffect(() => {
    fetch(GLITCH_SOCKET_HTTP_HOST, {
      mode: 'no-cors'
    });
  }, []);

  // Find any redirect messages on startup:
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message_key = params.get("msg");
    window.history.replaceState({}, document.title, '/')

    // const messages
    switch (message_key) {
      case 'game_full':
        setMessage('Sorry, the game you tried to join has reached the 10 person player limit.')
        break;
      case 'game_expired':
        setMessage('Sorry, your room has expired due to inactivity.')
        break;
    }
  })

  const generateRoomID = () => {
    return Math.floor(Math.random() * 0xFFFFFF).toString(16);
  }

  const roomID = generateRoomID();

  return (
    <div className="App">
      <ToastProvider>
        <Router>
          <div className="App-container">
            
            {/* A <Switch> looks through its children <Route>s and
                renders the first one that matches the current URL. */}
            <Switch>
              <Route path="/room/:roomID">
                <Room />
              </Route>
              <Route path="/pose/:imageName">
                <LogPose />
              </Route>
              <Route path="/">
                <div className="home">
                  {
                    message ?
                    <div className="alert">{message}</div> : null
                  }
                  <Link to="/"><h1 className="display">PoseParty</h1></Link>
                  <h2>A social exercise game you can play while social distancing.</h2>
                  <img className="demo" alt="Animated demo of PoseParty." height="300" src={`${process.env.PUBLIC_URL}/img/poseparty.gif`}/>
                  <Link to={`/room/${roomID}`}><div className="button display">Create a Room</div></Link>
                  <h3>Create a room, invite some friends, and try your hardest to match the poses shown to you over the course of the game!</h3>
                </div>
                {/* <h1 className="display" style={{marginBottom: '20px'}}>Demo</h1> */}
                {/* <iframe width="640" height="360" src="https://www.youtube.com/embed/1ielsQyZPLU" frameBorder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen="true"></iframe> */}
              </Route>
            </Switch>
            <div className="footer">
              {/* <p>© PoseParty</p> */}
              {/* <br/> */}
              <a className="donate" target="#blank" href="https://www.buymeacoffee.com/E72czYb"><span role="img" aria-label="coffee">☕</span> Buy us a coffee <span role="img" aria-label="smiley">😊</span></a>
            </div>
          </div>
        </Router>
      </ToastProvider>
    </div>
  );
}

export default App;
