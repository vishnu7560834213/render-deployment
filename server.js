import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve the main game file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = new Map();

io.on('connection', (socket) => {
  console.log('\n=== New Player Connected ===');
  console.log('Player ID:', socket.id);
  console.log('Total Players:', players.size + 1);

  // Initialize player data
  const playerData = {
    id: socket.id,
    position: { x: 0, y: 57.5, z: 0 },
    rotation: { y: 0 },
    modelType: 'emily'
  };
  players.set(socket.id, playerData);

  // When a new player joins, send them the current players
  const currentPlayers = Array.from(players.entries());
  console.log('Sending current players to new player:', currentPlayers);
  socket.emit('currentPlayers', currentPlayers);

  // Notify other players about the new player
  socket.broadcast.emit('playerJoined', playerData);

  // Handle player model type
  socket.on('playerModelType', (modelType) => {
    console.log(`\nPlayer ${socket.id} selected model: ${modelType}`);
    const playerData = players.get(socket.id);
    if (playerData) {
      playerData.modelType = modelType;
      players.set(socket.id, playerData);
      socket.broadcast.emit('playerModelType', { id: socket.id, modelType });
    }
  });

  // When a player moves, broadcast their position to other players
  socket.on('playerUpdate', (playerData) => {
    const existingData = players.get(socket.id);
    if (existingData) {
      const updatedData = {
        ...existingData,
        ...playerData,
        id: socket.id
      };
      players.set(socket.id, updatedData);
      socket.broadcast.emit('playerMoved', updatedData);
    }
  });

  // When a player disconnects, remove them and notify others
  socket.on('disconnect', () => {
    console.log('\n=== Player Disconnected ===');
    console.log('Player ID:', socket.id);
    players.delete(socket.id);
    io.emit('playerDisconnected', socket.id);
    console.log('Remaining Players:', players.size);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n=== Server Running ===`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Game available at http://localhost:${PORT}`);
}); 