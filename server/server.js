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
const cookieParser = require('cookie-parser');
const cookie = require('cookie');

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
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../client/build')));

// Authentication middleware
const JWT_SECRET = process.env.JWT_SECRET || 'chess_app_secret_key';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        console.log('No token provided');
        return res.sendStatus(401);
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('JWT verification failed:', err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password_hash: hashedPassword, email });
        const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
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
        const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

// Get user stats
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stats = {
            wins: user.wins || 0,
            losses: user.losses || 0,
            draws: user.draws || 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error fetching stats' });
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
        if (!token) return next(new Error('Authentication error'));
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (!user) return next(new Error('User not found'));
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

        // Start the server
        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
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
                    console.log('Current queue size:', waitingPlayers.size);
                    console.log('Players in queue:', Array.from(waitingPlayers.keys()));
                }

                if (waitingPlayers.size >= 2) {
                    const [player1, player2] = Array.from(waitingPlayers.entries());
                    const [username1, socket1] = player1;
                    const [username2, socket2] = player2;

                    waitingPlayers.delete(username1);
                    waitingPlayers.delete(username2);

                    const gameId = `game_${Date.now()}`;
                    console.log('Match found! Game ID:', gameId);
                    console.log('White:', username1);
                    console.log('Black:', username2);

                    try {
                        const game = await Game.create({
                            id: gameId,
                            player_whiteId: socket1.user.id,
                            player_blackId: socket2.user.id,
                            status: 'ongoing'
                        });
                        console.log('Game created in database:', game.id);

                        activeGames.set(gameId, {
                            white: socket1,
                            black: socket2,
                            board: initializeBoard(),
                            currentTurn: 'white'
                        });

                        socket1.emit('gameFound', {
                            gameId,
                            color: 'white',
                            players: { white: username1, black: username2 }
                        });
                        socket2.emit('gameFound', {
                            gameId,
                            color: 'black',
                            players: { white: username1, black: username2 }
                        });
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
                        const gameRecord = await Game.findOne({
                            where: {
                                id: gameId,
                                status: 'ongoing'
                            }
                        });

                        if (gameRecord) {
                            await gameRecord.update({
                                status: 'completed',
                                winner: opponent.user.id
                            });
                            console.log('Game updated in database after quit:', gameId);
                        }
                    } catch (error) {
                        console.error('Error updating game record after quit:', error);
                    }

                    activeGames.delete(gameId);
                }
            });

            socket.on('disconnect', async (reason) => {
                console.log('User disconnected:', socket.id, 'Username:', socket.user?.username, 'Reason:', reason);
                
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
                            const gameRecord = await Game.findOne({
                                where: {
                                    id: gameId,
                                    status: 'ongoing'
                                }
                            });

                            if (gameRecord) {
                                await gameRecord.update({
                                    status: 'completed',
                                    winner: opponent.user.id
                                });
                                console.log('Game updated in database after disconnect:', gameId);
                            }
                        } catch (error) {
                            console.error('Error updating game record after disconnect:', error);
                        }

                        activeGames.delete(gameId);
                        break;
                    }
                }

                if (socket.user) {
                    waitingPlayers.delete(socket.user.username);
                }
            });

            socket.on('makeMove', ({ gameId, from, to }) => {
                console.log('Move received:', { gameId, from, to });
                const game = activeGames.get(gameId);
                
                if (!game) {
                    console.error('Game not found:', gameId);
                    return;
                }

                // Determine if it's the player's turn
                const isWhite = game.white === socket;
                const isBlack = game.black === socket;
                const isPlayerTurn = (isWhite && game.currentTurn === 'white') || (isBlack && game.currentTurn === 'black');

                if (!isPlayerTurn) {
                    console.error('Not player\'s turn');
                    return;
                }

                // Update the board state
                const { row: fromRow, col: fromCol } = from;
                const { row: toRow, col: toCol } = to;
                const piece = game.board.pieces[fromRow][fromCol];
                game.board.pieces[fromRow][fromCol] = null;
                game.board.pieces[toRow][toCol] = piece;

                // Switch turns
                game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';

                // Broadcast the move to the opponent
                const opponent = isWhite ? game.black : game.white;
                opponent.emit('opponentMove', { from, to });
            });

            socket.on('requestDraw', ({ gameId }) => {
                console.log('Draw requested for game:', gameId);
                const game = activeGames.get(gameId);
                if (game) {
                    const opponent = game.white === socket ? game.black : game.white;
                    if (opponent) {
                        opponent.emit('drawRequested');
                    }
                }
            });

            socket.on('acceptDraw', ({ gameId }) => {
                console.log('Draw accepted for game:', gameId);
                const game = activeGames.get(gameId);
                if (game) {
                    const opponent = game.white === socket ? game.black : game.white;
                    if (opponent) {
                        opponent.emit('drawAccepted');
                    }
                    // Update game state or remove from active games if needed
                    activeGames.delete(gameId);
                }
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

// Get current authenticated user
app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ username: req.user.username });
});

module.exports = app; 