
import { API_HOST } from './constants';

export const getTwilioToken = async (room) => {
    let resp = await fetch(`${API_HOST}/getToken/${room}`);
    return resp.text();
}