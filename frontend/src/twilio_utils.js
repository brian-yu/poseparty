
import { connect, createLocalTracks } from 'twilio-video';
import { getTwilioToken } from './api_utils';

export const setupTwilio = (ROOM_ID, STATE) => {
    createLocalTracks({
        audio: true,
        video: { width: 640 }
    }).then(async (localTracks) => {
        const token = await getTwilioToken(ROOM_ID);
        return connect(token, {
        name: `${ROOM_ID}`,
        tracks: localTracks
        });
    }).then(room => {
        console.log(`Connected to Room: ${room.name}`);
        console.log(`Your identity: ${room.localParticipant.identity}`);

        STATE.playerName = room.localParticipant.identity;
    
        const addParticipant = participant => {

            const participantDiv = document.createElement('div');
            participantDiv.id = participant.identity;

            document.getElementById('remote-media-div').appendChild(participantDiv);

            const mediaDiv = document.createElement('div');
            mediaDiv.class = 'media';
            participantDiv.appendChild(mediaDiv);

            const nameElem = document.createElement('p');
            nameElem.textContent = participant.identity;
            participantDiv.appendChild(nameElem);

            participant.tracks.forEach(publication => {
                if (publication.isSubscribed) {
                    const track = publication.track;
                    const elem = track.attach();
                    elem.setAttribute('participantidentity', participant.identity);
                    participantDiv.appendChild(elem);
                }
            });
        
            participant.on('trackSubscribed', track => {
                const elem = track.attach();
                elem.setAttribute('participantidentity', participant.identity);
                mediaDiv.appendChild(elem);
            });
        }
    
        const removeParticipant = participant => {
            const container = document.getElementById('remote-media-div');
            // TODO: Fix participant removal.
            for (const elem of container.children) {
                console.log(elem)
                if (elem.getAttribute('participantidentity') === participant.identity) {
                    console.log('removing', elem);
                    elem.pause();
                    elem.removeAttribute('src');
                    elem.load();
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
            console.log(`Participant disconnected: '${participant.identity}'`);
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
};