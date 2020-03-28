
import { API_HOST } from './constants';

export const getOrCreateRoomID = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('id')) {
        const hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
        urlParams.set('id', hash);
        window.location.search = urlParams.toString();
    }
    return urlParams.get('id');
}

export const getTwilioToken = async (room) => {
    let resp = await fetch(`${API_HOST}/getToken/${room}`);
    return resp.text();
}