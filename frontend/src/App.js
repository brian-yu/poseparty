import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

import Room from './Room';
import './App.css';

function App() {

  const generateRoomID = () => {
    return Math.floor(Math.random() * 0xFFFFFF).toString(16);
  }

  const roomID = generateRoomID();

  return (
    <div className="App">
      <Router>
        <div className="App-container">
          
          {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}
          <Switch>
            <Route path="/room/:roomID">
              <Room />
            </Route>
            <Route path="/">
              <div className="home">
                <Link to="/"><h1 className="display">PoseParty</h1></Link>
                <h2>A social exercise game you can play while social distancing.</h2>
                <Link to={`/room/${roomID}`}><div className="button display">Create a Room</div></Link>
              </div>
            </Route>
          </Switch>

          
        </div>
      </Router>
    </div>
  );
}

export default App;
