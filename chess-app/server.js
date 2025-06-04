const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Store game rooms
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (roomId) => {
        // Leave any existing rooms
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });

        // Join the new room
        socket.join(roomId);
        
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [],
                board: null,
                currentTurn: 'white'
            });
        }

        const room = rooms.get(roomId);
        
        // Add player to room if not full
        if (room.players.length < 2) {
            room.players.push(socket.id);
            const playerColor = room.players.length === 1 ? 'white' : 'black';
            socket.emit('assignColor', playerColor);
            
            // If room is full, start the game
            if (room.players.length === 2) {
                io.to(roomId).emit('gameStart', { currentTurn: room.currentTurn });
            }
        } else {
            socket.emit('roomFull');
        }
    });

    socket.on('makeMove', ({ roomId, from, to, board }) => {
        const room = rooms.get(roomId);
        if (room) {
            // Update the room's board state
            room.board = board;
            // Switch turns
            room.currentTurn = room.currentTurn === 'white' ? 'black' : 'white';
            // Broadcast the new board and current turn to all players in the room
            io.to(roomId).emit('boardUpdate', { 
                board,
                currentTurn: room.currentTurn
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up rooms when players disconnect
        rooms.forEach((room, roomId) => {
            room.players = room.players.filter(id => id !== socket.id);
            if (room.players.length === 0) {
                rooms.delete(roomId);
            }
        });
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 