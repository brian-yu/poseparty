// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);

const clientId = Math.floor(Math.random() * 0xFFFFFF).toString(16);
console.log("CLIENT ID", clientId)
let rtcStarted = false;



const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};
// let pc;

// Maps clientIDs to (connections?)
const connections = new Set();

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true,
}).then(stream => {
  // STREAM = stream;
  // Display your local video in #localVideo element
  if (!localVideo.srcObject) {
    localVideo.srcObject = stream;
  }

  const socket = new WebSocket("ws://127.0.0.1:6789/");
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({action: 'subscribe', room: roomHash, clientId: clientId}))
    console.log("STARTING WEB RTC 1")
    // createConnAndListenForOffer(socket, roomHash, clientId, configuration);
  });
  socket.addEventListener('close', () => {
    console.log("Websocket connection closed.")
  });


  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.action === 'register') {
      console.log(data)
      console.log(data.clientIds)
      if (!rtcStarted) {
        // const isOfferer = data.count > 1;
        // console.log("STARTING WEB RTC")
        // startWebRTC(isOfferer);
        rtcStarted = true;
        if (data.count > 1) {
          // console.log("STARTING WEB RTC > 1")

          // TODO: FOR LOOP HERE AND OFFER TO EACH ALREADY CONNECTED CLIENT!
          // NEED TO BE OFFER TO SPECIFIC CLIENT, PERHAPS BY CLIENTID!!
          data.clientIds.map(targetClientId => {
            if (targetClientId !== clientId) {
              // console.log("SENDING OFFER TO", targetClientId)
              const conn = createConnAndSendOffer(socket, stream, roomHash, clientId, configuration, targetClientId);
              // createConnAndListenForOffer(socket, roomHash, clientId, configuration);
              listenForAnswer(conn, socket, clientId, targetClientId);
            }
          });
        } else {
          // console.log("STARTING WEB RTC 1")
          createConnAndListenForOffer(socket, stream, roomHash, clientId, configuration);
        }
      // } else {
      //   createConnAndListenForOffer(socket, roomHash, clientId, configuration);  
      } else if (clientId !== data.from) {
        createConnAndListenForOffer(socket, stream, roomHash, clientId, configuration);
      }
    }
  });

}, onError);

function onSuccess() {};
function onError(error) {
  console.error(error);
};


const sendData = (websocket, data) => {
  // console.log('sending data')
  websocket.send(JSON.stringify(data));
};

const setLocalDescription = (conn, desc, callback) => {
  conn.setLocalDescription(
    desc,
    callback,
    (err) => console.error("setLocalDescription", err)
  );
};

function createConnAndSendOffer(websocket, stream, room, clientId, config, targetClientId) {

  console.log("CREATING CONN AND SENDING OFFER TO", targetClientId)

  conn = new RTCPeerConnection(config);

  // navigator.mediaDevices.getUserMedia({
  //   audio: false,
  //   video: true,
  // }).then(stream => {
  //   // Display your local video in #localVideo element
  //   if (!localVideo.srcObject) {
  //     localVideo.srcObject = stream;
  //   }
  //   // Add your stream to be sent to the conneting peer
  //   stream.getTracks().forEach(track => conn.addTrack(track, stream));
  // }, onError);

  stream.getTracks().forEach(track => conn.addTrack(track, stream));

  // Create offer, set local description, and send to server.
  conn.onnegotiationneeded = () => {
    if (conn.signalingState != "stable") return; // https://stackoverflow.com/a/51115877/4014918

    console.log('creating offer and sending sdp to', targetClientId)
    console.log(conn)
    console.log(conn.signalingState)
    console.log(conn.localDescription)
    conn.createOffer().then(desc => setLocalDescription(
      conn,
      desc,
      () => sendData(websocket, {
        room,
        clientId,
        targetClientId,
        action: 'offer',
        sdp: conn.localDescription,
      }),
    )).catch(onError);
  };

  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  conn.onicecandidate = event => {
    if (event.candidate) {
      console.log('creating offer and sending candidate to', targetClientId)
      sendData(websocket, {
        room, // is this necessary?
        clientId,
        targetClientId,
        candidate: event.candidate,
        action: 'offer',
      });
    }
  };

  // conn.ontrack = event => {
  //   console.log("NEW STREAM!", event)
  //   const stream = event.streams[0];
  //   // if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
  //   //   remoteVideo.srcObject = stream;
  //   // }

  //   // TODO: remove video when disconnected

  //   const video = document.createElement('video');
  //   video.autoplay = true;
  //   video.srcObject = stream;
  //   remoteVideos.appendChild(video);
  // };

  // close peer connection on unload
  window.addEventListener("beforeunload", () => {
    console.log("CLOSING")
    conn.close()
  }, false);

  return conn;

}

function createConnAndListenForOffer(websocket, stream, room, clientId, config) {
  console.log("CREATING CONN AND LISTENING FOR OFFER")
  conn = new RTCPeerConnection(config);

  stream.getTracks().forEach(track => conn.addTrack(track, stream));

  conn.ontrack = event => {
    console.log("NEW STREAM!", event)
    const stream = event.streams[0];
    // if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
    //   remoteVideo.srcObject = stream;
    // }

    // TODO: remove video when disconnected

    const video = document.createElement('video');
    video.autoplay = true;
    video.srcObject = stream;
    remoteVideos.appendChild(video);
  };

  websocket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    // console.log('listen to offer websocket msg!', data);
    
    if (data.action === 'offer') {

      // ignore messages from self
      if (data.clientId === clientId || data.targetClientId !== clientId) {
        return;
      }

      console.log(`RECEIVED ${data.sdp ? 'SDP' : 'CANDIDATE'} OFFER FROM ${data.clientId}`);
      console.log(data);

      // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
      // message to the other peer through the signaling server
      conn.onicecandidate = event => {
        if (event.candidate) {
          console.log('creating answer and sending candidate to', data.clientId)
          sendData(websocket, {
            room,
            clientId,
            targetClientId: data.clientId, // reply with answr
            candidate: event.candidate,
            action: 'answer',
          });
        }
      };

      if (data.sdp) {
        console.log('REMOTE DESC', conn.remoteDescription)
        if (conn.remoteDescription !== null) {
          return;
        }
        // This is called after receiving an offer or answer from another peer
        conn.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
          // When receiving an offer lets answer it
          if (conn.remoteDescription.type === 'offer') {
            console.log('creating answer and sending sdp to', data.clientId)
            conn.createAnswer().then(desc => setLocalDescription(
              conn,
              desc,
              () => sendData(websocket, {
                room,
                clientId,
                targetClientId: data.clientId, //reply with answer
                action: 'answer',
                sdp: conn.localDescription,
              }),
            )).catch((err) => console.log("createAnswer", err));
          }
        }, (err) => console.log("setRemoteDescription", err));
      } else if (data.candidate) {
        // Add the new ICE candidate to our connections remote description
        console.log('ICE STATE', conn.iceConnectionState)
        if (conn.iceConnectionState !== 'new') {
          return;
        }
        conn.addIceCandidate(
          new RTCIceCandidate(data.candidate), onSuccess,
            (err) => console.error("offer addIceCandidate", err)
        );
      }

      
    }
  });

  // close peer connection on unload
  window.addEventListener("beforeunload", () => {
    console.log("CLOSING")
    conn.close()
  }, false);

  return conn;

}

function listenForAnswer(conn, websocket, clientId, fromClientId) {

  console.log("LISTENING FOR ANSWER FROM", fromClientId)

  conn.ontrack = event => {
    console.log("NEW STREAM!", event)
    const stream = event.streams[0];
    // if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
    //   remoteVideo.srcObject = stream;
    // }

    // TODO: remove video when disconnected

    const video = document.createElement('video');
    video.autoplay = true;
    video.srcObject = stream;
    remoteVideos.appendChild(video);
  };

  websocket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    
    if (data.action === 'answer') {

      // ignore messages from self
      if (data.clientId !== fromClientId || data.targetClientId !== clientId) {
        return;
      }

      console.log(`RECEIVED ${data.sdp ? 'SDP' : 'CANDIDATE'} ANSWER FROM ${data.clientId}`);
      console.log(data);

      if (data.sdp) {

        if (conn.remoteDescription !== null) {
          return;
        }

        // This is called after receiving an offer or answer from another peer
        conn.setRemoteDescription(new RTCSessionDescription(
          data.sdp), () => {}, (err) => console.error("answer setRemoteDesc", err));
      } else if (data.candidate) {

        if (conn.iceConnectionState !== 'new') {
          return;
        }
        // Add the new ICE candidate to our connections remote description
        conn.addIceCandidate(
          new RTCIceCandidate(data.candidate), onSuccess,
          (err) => console.error("answer addIceCandidate", err)
        );
      }
    }
  });
  
}