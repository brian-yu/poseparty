#!/usr/bin/env python

# WS server example

import asyncio
import websockets
import json

USERS = {}
STATE = {"value": 0}
ROOMS = {}

def state_event():
    return json.dumps({"type": "state", **STATE})

def users_event():
    return json.dumps({"type": "users", "count": len(USERS)})

async def notify_state():
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = state_event()
        await asyncio.wait([user.send(message) for user in USERS])

async def notify_users():
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = users_event()
        await asyncio.wait([user.send(message) for user in USERS])

async def publish(room, data):
    users = ROOMS[room]
    print(users)
    if users:  # asyncio.wait doesn't accept an empty list
        message = json.dumps({"type": "data", **data})
        await asyncio.wait([user.send(message) for user in users])


async def register(websocket):
    USERS[websocket] = {}
    # print(websocket)
    await notify_users()

async def unregister(websocket):
    # remove websocket from room
    ROOMS[USERS[websocket]['room']].remove(websocket)
    USERS.pop(websocket)
    await notify_users()

async def counter(websocket, path):
    # register(websocket) sends user_event() to websocket
    await register(websocket)
    try:
        await websocket.send(state_event())
        async for message in websocket:
            data = json.loads(message)
            action = data['action']
            if action == "minus":
                STATE["value"] -= 1
                await notify_state()
            elif action == "plus":
                STATE["value"] += 1
                await notify_state()
            elif action in {"offer", "answer"}:
                room = data['room']
                print(data)
                # data.pop('action')
                data.pop('room')
                await publish(room, data)

            elif action == "subscribe":
                room = data['room']
                clientId = data['clientId']
                # add websocket to room
                ROOMS.setdefault(room, set())
                ROOMS[room].add(websocket)
                # add room to websocket
                USERS[websocket]['room'] = room
                USERS[websocket]['clientId'] = clientId

                await publish(room, {
                    'action': 'register',
                    'count': len(ROOMS[room]),
                    'room': room,
                    'from': clientId,
                    'clientIds': [USERS[s]['clientId'] for s in ROOMS[room]],
                    })
                # print(ROOMS)
            else:
                logging.error("unsupported event: {}", data)
    finally:
        await unregister(websocket)


start_server = websockets.serve(counter, "localhost", 6789)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()