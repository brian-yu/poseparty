import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

import Room from './Room';

import logo from './logo.svg';
import './App.css';

function App() {

  const generateRoomID = () => {
    return Math.floor(Math.random() * 0xFFFFFF).toString(16);
  }

  return (
    <div className="App">
      <Router>
        <div>
          <Link to="/"><h1>PoseParty</h1></Link>
          {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}
          <Switch>
            <Route path="/room/:roomID">
              <Room />
            </Route>
            <Route path="/">
              <h2>A social exercise game you can play while social distancing.</h2>
              <Link to={`/room/${generateRoomID()}`>Create a Room</Link>
            </Route>
          </Switch>

          
        </div>
      </Router>
    </div>
  );
}

export default App;
