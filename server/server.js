// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const sequelize = require('./db');
const User = require('./models/User');
const Game = require('./models/Game');

// Load environment variables
require('dotenv').config();

// Server-side board initialization
function initializeBoard() {
    return {
        pieces: [
            ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
            ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
            ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
        ],
        currentTurn: 'white',
        capturedPieces: [],
        moveHistory: []
    };
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// CORS configuration
app.use(cors({
    origin: [process.env.CLIENT_URL || "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, process.env.JWT_SECRET || 'chess_app_secret_key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            username,
            password_hash: hashedPassword,
            email
        });

        const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET || 'chess_app_secret_key');
        res.json({ token, username });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(400).json({ error: 'User not found' });
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
        
        const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET || 'chess_app_secret_key');
        res.json({ token, username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Endpoint to get user stats
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const games = await Game.findAll({
            where: {
                [sequelize.Op.or]: [
                    { player_whiteId: user.id },
                    { player_blackId: user.id }
                ]
            }
        });

        const stats = { wins: 0, losses: 0, draws: 0 };

        games.forEach(game => {
            if (game.status === 'completed') {
                if (game.winner === user.id) stats.wins++;
                else if (game.winner === null) stats.draws++;
                else stats.losses++;
            }
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error fetching user stats' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Store active games and waiting players
const waitingPlayers = new Map();
const activeGames = new Map();

// Socket authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chess_app_secret_key');
        const user = await User.findByPk(decoded.id);
        
        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});

// Start server after database is ready
async function startServer() {
    try {
        // Wait for database to be ready
        await sequelize.authenticate();
        console.log('Database connection established');

        // Start the server on all interfaces
        const PORT = process.env.PORT || 3001;
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on http://0.0.0.0:${PORT}`);
        });

        // Socket connection handling
        io.on('connection', (socket) => {
            console.log('Socket authentication attempt');
            console.log('Socket authenticated for user:', socket.user.username);
            console.log('User connected:', socket.id, 'Username:', socket.user.username);

            socket.on('findMatch', async ({ username }) => {
                console.log('Player searching for match:', username);
                
                if (!waitingPlayers.has(username)) {
                    waitingPlayers.set(username, socket);
                    console.log('Added to matchmaking queue:', username);
                }

                if (waitingPlayers.size >= 2) {
                    const [player1, player2] = Array.from(waitingPlayers.entries());
                    const [username1, socket1] = player1;
                    const [username2, socket2] = player2;
                    waitingPlayers.delete(username1);
                    waitingPlayers.delete(username2);

                    const gameId = `game_${Date.now()}`;
                    console.log('Match found! Game ID:', gameId);

                    try {
                        const game = await Game.create({
                            id: gameId,
                            player_whiteId: socket1.user.id,
                            player_blackId: socket2.user.id,
                            status: 'ongoing'
                        });

                        activeGames.set(gameId, {
                            white: socket1,
                            black: socket2,
                            board: initializeBoard(),
                            currentTurn: 'white'
                        });

                        socket1.emit('gameFound', { gameId, color: 'white', players: { white: username1, black: username2 } });
                        socket2.emit('gameFound', { gameId, color: 'black', players: { white: username1, black: username2 } });
                    } catch (error) {
                        console.error('Error creating game record:', error);
                        socket1.emit('error', { message: 'Failed to create game' });
                        socket2.emit('error', { message: 'Failed to create game' });
                    }
                }
            });

            socket.on('quitGame', async ({ gameId }) => {
                console.log('Player quit game:', socket.user.username, 'Game ID:', gameId);
                const game = activeGames.get(gameId);
                if (game) {
                    const opponent = game.white === socket ? game.black : game.white;
                    if (opponent) {
                        opponent.emit('gameOver', { 
                            winner: opponent.user.username,
                            reason: 'opponent_quit'
                        });
                    }

                    try {
                        const gameRecord = await Game.findOne({ where: { id: gameId, status: 'ongoing' } });
                        if (gameRecord) {
                            await gameRecord.update({ status: 'completed', winner: opponent.user.id });
                        }
                        console.log('Game updated after quit:', gameId);
                    } catch (error) {
                        console.error('Error updating game record after quit:', error);
                    }

                    activeGames.delete(gameId);
                }
            });

            socket.on('disconnect', async (reason) => {
                console.log('User disconnected:', socket.id, 'Reason:', reason);
                for (const [gameId, game] of activeGames.entries()) {
                    if (game.white === socket || game.black === socket) {
                        const opponent = game.white === socket ? game.black : game.white;
                        if (opponent) {
                            opponent.emit('gameOver', { 
                                winner: opponent.user.username,
                                reason: 'opponent_disconnected'
                            });
                        }
                        try {
                            const gameRecord = await Game.findOne({ where: { id: gameId, status: 'ongoing' } });
                            if (gameRecord) {
                                await gameRecord.update({ status: 'completed', winner: opponent.user.id });
                            }
                            console.log('Game updated after disconnect:', gameId);
                        } catch (error) {
                            console.error('Error updating game record after disconnect:', error);
                        }
                        activeGames.delete(gameId);
                        break;
                    }
                }
                if (socket.user) waitingPlayers.delete(socket.user.username);
            });

            socket.on('makeMove', ({ gameId, from, to }) => {
                console.log('Move received:', { gameId, from, to });
                const game = activeGames.get(gameId);
                if (!game) return console.error('Game not found:', gameId);

                const isWhite = game.white === socket;
                const isBlack = game.black === socket;
                const isPlayerTurn = (isWhite && game.currentTurn === 'white') || (isBlack && game.currentTurn === 'black');
                if (!isPlayerTurn) return console.error('Not player\'s turn');

                const { row: fR, col: fC } = from;
                const { row: tR, col: tC } = to;
                const piece = game.board.pieces[fR][fC];
                game.board.pieces[fR][fC] = null;
                game.board.pieces[tR][tC] = piece;
                game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';

                const opponent = isWhite ? game.black : game.white;
                opponent.emit('opponentMove', { from, to });
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Only start the server if this file is run directly
if (require.main === module) {
    startServer();
}
