# CorgiDash: README

---

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Future Improvements](#future-improvements)
- [Installation](#installation)
- [Architecture](#architecture)

---

## Overview
**CorgiDash** is a real-time multiplayer racing game where players customize a corgi and compete against friends to be the first across the finish line. Racers dodge flowers that slow them down and grab bones for speed boosts, with a live leaderboard and end-of-race stats. This app was built for my CS361: Software Engineering I course at Oregon State to showcase a microservice architecture, using a React client, a FastAPI WebSocket server, and four Python microservices (leaderboard, object generation, object counting, and corgi customization), with Supabase handling authentication and user data.

**🎥 Video Demo**  
[![CorgiDash Demo](https://img.youtube.com/vi/9ZGryl2O5t4/maxresdefault.jpg)](https://youtu.be/9ZGryl2O5t4)

> This app isn't currently hosted, since it requires a running WebSocket server and four microservices. See the video above for a walkthrough, or follow the setup instructions below to run it locally.

---

## Tech Stack
- **Frontend**: React (JSX, CSS), React Router, HTML5 Canvas for game rendering
- **Backend**: Python (FastAPI, Uvicorn), WebSocket server for real-time game state
- **Microservices**: Python (`websockets`), four services for leaderboard, object generation, object counting, and corgi customization
- **Authentication & Database**: Supabase (Auth with JWTs, user metadata)

---

## Features
- **Account Management**  
  Create an account with an email, username, and password, then log in or sign out. Reset a forgotten password through an emailed recovery link.

- **Corgi Customization**  
  Choose from four corgi skins (tri-color or tan, each with or without a tail). Your pick is saved to your account and shows up in the lobby and in races.

- **Multiplayer Rooms**  
  Join a game and get placed in a room with up to three players. Everyone sees who joined or left, and the race starts with a countdown once all players are ready.

- **Real-Time Racing**  
  Your corgi runs automatically while you use W/S or the arrow keys to switch lanes. Every racer's position and animation updates live for the whole room.

- **Boosts and Obstacles**  
  Bones give a short speed boost and flowers slow you down to sniff around. Objects spawn ahead of the leader, with extra boosts occasionally appearing for whoever is falling behind.

- **Live Leaderboard**  
  Rankings update throughout the race based on each player's position, with ties sharing a rank.

- **End-of-Race Stats**  
  When someone crosses the finish line, a popup shows the winner, the final leaderboard, and how many boosts and obstacles each player hit.

---

## Future Improvements

- **Server-Authoritative Game Logic**  
  Move movement calculation, collision detection, boost/obstacle effects, and finish line checks from the client to the server. Clients would send only input (up/down), and the server would run a fixed-rate game loop and broadcast the resulting state. This prevents cheating through modified clients.
  > I had intended to implement this after realizing the error in my logic, but unfortunately ran out of time in the class.

- **Player Interpolation**  
  Smooth the movement of other players' corgis by interpolating between received position updates instead of snapping to each one.

- **Robust Validation & Error Handling**  
  Add input validation on incoming WebSocket messages, automatic reconnection for the microservices and client, and clearer error messages when a service is unavailable.

- **Per-Room Microservice State**  
  Track object type weighting per room in the object generator, and send game-over stats only once per race instead of on every move after the finish.

- **Deployment Support**  
  Move WebSocket URLs and ports into environment variables so the app can run outside localhost.

- **UX Design Fixes**  
  Improve mobile support (including touch controls) and add feedback after signup when email confirmation is required.

--- 

## Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/)
- Python 3.10+
- A free [Supabase](https://supabase.com/) project

### 2. Clone the repository
```
git clone https://github.com/MadelineRachow/CorgiDash.git
cd CorgiDash
```

### 3. Configure Supabase
1. In your Supabase project, go to **Project Settings → API** and copy the project URL, anon key, service role key, and JWT secret.
2. Under **Authentication → URL Configuration**, add `http://localhost:3000/resetpassword` as a redirect URL so password recovery works.

### 4. Set environment variables
1. Create a `.env` file in the project root:
    ```
    SUPABASE_URL=your_project_url
    SUPABASE_JWT_SECRET=your_jwt_secret
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    ```
2. Create a `.env` file in `client/`:
    ```
    REACT_APP_SUPABASE_URL=your_project_url
    REACT_APP_SUPABASE_ANON_KEY=your_anon_key
    ```

### 5. Install and start the Python services
1. Create and activate a virtual environment:
   
    **Windows:**
    ```
    python -m venv .venv
    .venv\Scripts\activate
    ```
    **macOS/Linux:**
    ```
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3. Install dependencies:
    ```
    pip install fastapi "uvicorn[standard]" python-jose python-dotenv requests websockets
    ```
4. Start the game server first:
    ```
    cd server
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
    ```
5. In separate terminals (with the virtual environment activated), start the four microservices:
    ```
    cd microservice_corgi_customization
    uvicorn corgi_customization:app --reload --host 0.0.0.0 --port 8001
    ```
    ```
    cd microservice_leaderboard
    python leaderboard.py
    ```
    ```
    cd microservice_object_counter
    python object_counter.py
    ```
    ```
    cd microservice_object_generator
    python object_generator.py
    ```

### 6. Start the React client
```
cd client
npm install
npm start
```

### 7. (Optional) Testing multiplayer locally
Open a second account in a private/incognito window (or a different browser), since Supabase shares the login session across tabs in the same browser. Both players join a game and click **"I'm ready!"** to start the race.

--- 

## Architecture
Parentheses indicate dependencies.
```
CorgiDash/
├── client/
│   ├── public/
│   │   └── assets/                                   # Image assets & fonts used throughout the app
│   └── src/
│       ├── App.css                                   # Global CSS
│       ├── App.jsx                                   # Root component handling Supabase auth state & routing between pages             (imports multiple components)
│       ├── Background.jsx                            # Renders static canvas background image
│       ├── CorgiSprite.jsx                           # Animates corgi sprite sheet by cycling through frames on a timer
│       ├── CustomizePage.jsx                         # Lets users pick a corgi skin & syncs choice via customization microservice      (CorgiSprite)
│       ├── GameCanvas.jsx                            # Draws race canvas & handles movement input & object collisions
│       ├── GameOverPopup.jsx                         # Renders popup with winner, leaderboard, & toggleable boost/obstacle hit stats
│       ├── GamePage.jsx                              # Connects to game server over WebSocket & manages game state                     (GameCanvas, Popup, GameOverPopup)
│       ├── HelpPage.jsx                              # Renders static help page
│       ├── LobbyPage.jsx                             # Renders lobby with buttons to customize, join a game, view help, or sign out    (CorgiSprite)
│       ├── LoginPage.jsx                             # Renders login, account creation, & password recovery pages via Supabase auth
│       └── Popup.jsx                                 # Renders pre-race popup with controls, ready statuses, & countdown
├── microservice_corgi_customization/
│   └── corgi_customization.py                        # Microservice that authenticates users & updates their corgi skin in Supabase    (style_console_text)
├── microservice_leaderboard/
│   └── leaderboard.py                                # Microservice that ranks players by x position & sends back  leaderboard         (style_console_text)
├── microservice_object_counter/
│   └── object_counter.py                             # Microservice that tallies boost/obstacle hits per player & sends counts back    (style_console_text)
├── microservice_object_generator/
│   └── object_generator.py                           # Microservice that spawns boosts/obstacles ahead of leading player               (style_console_text)
├── server/
│   └── app.py                                        # FastAPI WebSocket server managing rooms, player state, auth, & microservices    (style_console_text)
└── style_console_text.py                             # Formats console text with optional bold and coloring
```
