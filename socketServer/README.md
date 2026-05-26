<div align="center">

# 🔌 Rydex Socket Engine (`socketServer`)
### *The Telemetry Heartbeat & Real-Time Logistics Overlord*

[![Runtime: Node.js](https://img.shields.io/badge/Runtime-Node.js-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Library: Socket.io](https://img.shields.io/badge/Library-Socket.io-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Database: MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

---

<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzhxNmY2ajdwbXg3NXc5ZjRwczVyeHZsMHN0dWRicGdzbzVmdXBpcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjei1nG/giphy.gif" width="500" alt="Flashing Server GIF"/>

*Our Socket Server when 10,000 drivers send GPS coordinates at the same millisecond.*

---

</div>

## 🧠 What does this server do?

If the **Rydex Frontend** is the gorgeous face of the application, then the **Socket Engine** is the nervous system. It handles the high-intensity, zero-latency, chaotic stream of live data.

Without this server:
*   Drivers would be driving in the dark.
*   Users would have to refresh their page 50 times just to see if their driver moved 2 meters.
*   The in-app chat would feel like sending a postcard via snail mail.

---

## ⚡ The Event Pipeline (How the Magic Works)

This server manages bidirectional event routing like a high-speed traffic controller. Here is a breakdown of the events it handles:

*   **`identity`:** When a client connects, they present their database ID. The server whispers to MongoDB: *"Hey, mark this user online and associate them with socket ID XYZ."*
*   **`join-booking`:** Joins a private virtual room prefixed with `booking-${bookingId}`. Both the user and driver enter this secret chatroom.
*   **`driver-location-update`:** Broadcasts the driver's real-time latitude and longitude to everyone in the booking room. The map coordinates wiggle, and the car icon moves!
*   **`chat-message`:** Forwards messages back and forth instantly within the booking room. No database lags, just pure, immediate communication.
*   **`update-location`:** Saves the driver's active GPS coordinate to MongoDB using standard GeoJSON `Point` formatting so users can find close-by rides.

---

## 🚧 The CORS Shield (Security Guard)

We have implemented a strict CORS shield. Only trusted origins are allowed to connect:
*   `https://rydexx.netlify.app` (Production)
*   `http://localhost:3000` (Local testing)
*   Custom domains listed in `process.env.NEXT_BASE_URL` & `process.env.CLIENT_URL`

*If your connection is rejected with `Socket.IO CORS` error, do not throw your mouse. Simply check your environment variables!*

---

## 📡 The Secret API Endpoint: `/emit`

We have built a powerful bridge between our HTTP web app and our real-time websocket connections. 

By sending a `POST` request to `/emit` with a `userId`, `event`, and `data`, the socket server will automatically track down that specific user's socket ID in the database and push the message directly to their active screen. 

*It's like having a heat-seeking missile for websocket notifications!*

---

## 📂 File Architecture

```
socketServer/
├── index.js          # The grand orchestra: WebSockets, CORS, and Express routing
├── models/           # Mongoose models mapped straight to the database
│   └── user.models.js# User schematics detailing active sockets, status, and GeoJSON locations
├── package.json      # Node dependency registry
└── .env              # Secrets and port assignments
```

---

## 🛠 Spin Up the Engine

Ready to make things real-time?

### 1. Fill the Environment Variables (`.env`)
Create a `.env` file in this directory:
```env
PORT=8000
MONGODB_URL=mongodb+srv://...
NEXT_BASE_URL=http://localhost:3000
```

### 2. Start the Server
```bash
npm install
npm run dev
```

If you see:
```text
server started at 8000
```
Congratulations! The real-time engine is listening and ready to steer coordinates across the net. 🚀

---

<div align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZndjN3JpcjE3NXYwZnZ4ODV5djR1N2t3a2s2ZjNqdGF3MHpsdnZtciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9Kmq3Qs2Ct1Yc/giphy.gif" width="300" alt="Funny Cat Typing"/>
  <p>Live tracking, live chats, zero friction. Rydex is moving fast! ⚡</p>
</div>
