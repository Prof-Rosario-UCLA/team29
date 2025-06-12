import React, { useState, useRef, useEffect } from 'react';
import "./App.css";
import ChessBoard from "./components/chessBoard/chessBoard.js";
import { initializeBoard, getPieceImage } from "./utils/boardState";
import { initializeCastlingRights } from "./components/chessBoard/chessRules";
import io from 'socket.io-client';

function App() {
    const [user, setUser] = useState(null);
    const [gameState, setGameState] = useState(null);
    const [staticBoard] = useState(initializeBoard());
    const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [promotionMove, setPromotionMove] = useState(null);
    const [castlingRights, setCastlingRights] = useState(initializeCastlingRights());
    const [gameNotification, setGameNotification] = useState(null);
    const socketRef = useRef(null);

    // Add notification component
    const Notification = ({ message, type }) => {
        if (!message) return null;
        return (
            <div className={`game-notification ${type}`}>
                {message}
            </div>
        );
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = isLogin ? '/api/login' : '/api/register';
            const response = await fetch(`http://localhost:3001${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password, email })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }
            localStorage.setItem('token', data.token);
            setUser({ username: data.username, token: data.token });
        } catch (error) {
            console.error('Auth error:', error);
            alert(error.message || 'Authentication failed');
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem('token');
        setUser(null);
        setGameState(null);
        setUsername('');
        setPassword('');
        setEmail('');
    };

    const handleStartLocalGame = () => {
        setGameState({
            board: initializeBoard(),
            color: 'white',
            currentTurn: 'white',
            opponent: 'local',
            gameMode: 'local'
        });
    };

    const handleFindOnlineMatch = () => {
        console.log('handleFindOnlineMatch called');
        
        if (!user) {
            console.error('No user logged in');
            alert('Please log in first');
            return;
        }

        console.log('Starting matchmaking search for user:', user.username);
        setIsSearching(true);
        setGameNotification({ message: 'Searching for opponent...', type: 'info' });
        
        try {
            if (!socketRef.current) {
                console.error('Socket not initialized');
                alert('Connection error');
                return;
            }
            socketRef.current.emit('findMatch', { username: user.username }, (response) => {
                console.log('findMatch callback response:', response);
            });
            console.log('findMatch event emitted');
        } catch (error) {
            console.error('Error emitting findMatch:', error);
            setIsSearching(false);
            setGameNotification(null);
        }
    };

    const handleCancelSearch = () => {
        if (socketRef.current) {
            console.log('Cancelling matchmaking search for user:', user.username);
            socketRef.current.emit('cancelMatchmaking');
        }
        setIsSearching(false);
        setGameNotification(null);
    };

    const handleMove = async (move) => {
        if (!gameState) return;
        const { from, to } = move;
        const board = gameState.board.map(row => row.slice());
        const piece = board[from.row][from.col];
        
        if (!piece) {
            console.error('No piece at source position:', from);
            return;
        }

        // Check if it's player's turn
        if (gameState.gameMode === 'local') {
            // In local mode, just alternate turns
            if (gameState.currentTurn !== piece.color) {
                setGameNotification({ 
                    message: "It's not your turn!", 
                    type: 'error' 
                });
                return;
            }
        } else if (gameState.gameMode === 'online') {
            // In online mode, only allow moves for the player's color
            if (gameState.color !== piece.color) {
                setGameNotification({ 
                    message: "It's not your turn!", 
                    type: 'error' 
                });
                return;
            }
            // Emit move to server
            socketRef.current.emit('makeMove', {
                gameId: gameState.gameId,
                from,
                to
            });
        }

        // Update the board for the current player
        board[to.row][to.col] = piece;
        board[from.row][from.col] = null;

        // Update castling rights
        if (piece.type === 'king') {
            if (piece.color === 'white') {
                setCastlingRights(prev => ({ ...prev, white: { ...prev.white, kingMoved: true } }));
            } else {
                setCastlingRights(prev => ({ ...prev, black: { ...prev.black, kingMoved: true } }));
            }
        } else if (piece.type === 'rook') {
            if (piece.color === 'white') {
                if (from.col === 0) {
                    setCastlingRights(prev => ({ ...prev, white: { ...prev.white, queensideRookMoved: true } }));
                } else if (from.col === 7) {
                    setCastlingRights(prev => ({ ...prev, white: { ...prev.white, kingsideRookMoved: true } }));
                }
            } else {
                if (from.col === 0) {
                    setCastlingRights(prev => ({ ...prev, black: { ...prev.black, queensideRookMoved: true } }));
                } else if (from.col === 7) {
                    setCastlingRights(prev => ({ ...prev, black: { ...prev.black, kingsideRookMoved: true } }));
                }
            }
        }

        // Check if this is a castling move
        if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
            // Kingside castling
            if (to.col > from.col) {
                const rook = board[from.row][7];
                board[from.row][5] = rook;
                board[from.row][7] = null;
            }
            // Queenside castling
            else {
                const rook = board[from.row][0];
                board[from.row][3] = rook;
                board[from.row][0] = null;
            }
        }

        // Check if this is a promotion move
        if (piece.type === 'pawn' && ((piece.color === 'white' && to.row === 0) || (piece.color === 'black' && to.row === 7))) {
            setPromotionMove({ from, to, piece });
            return;
        }

        // Update state for player's move
        setGameState(prev => ({
            ...prev,
            board,
            currentTurn: prev.currentTurn === 'white' ? 'black' : 'white'
        }));

        // Clear any existing notifications
        setGameNotification(null);
    };

    const handlePromotion = (promotionType) => {
        if (!promotionMove) return;
        const { from, to, piece } = promotionMove;
        const board = gameState.board.map(row => row.slice());
        const promotedPiece = { type: promotionType, color: piece.color, image: getPieceImage(promotionType, piece.color) };
        board[to.row][to.col] = promotedPiece;
        board[from.row][from.col] = null;

        // If it's an online game, emit the promotion move
        if (gameState.gameMode === 'online' && socketRef.current) {
            socketRef.current.emit('makeMove', {
                gameId: gameState.gameId,
                from,
                to,
                promotion: promotionType
            });
        }

        // Update state for player's move
        setGameState(prev => ({
            ...prev,
            board,
            currentTurn: prev.currentTurn === 'white' ? 'black' : 'white'
        }));

        // Reset promotion state
        setPromotionMove(null);
        
        // Clear any existing notifications
        setGameNotification(null);
    };

    const handleResetGame = () => {
        setGameState(prev => ({
            ...prev,
            board: initializeBoard(),
            currentTurn: 'white',
            castlingRights: initializeCastlingRights()
        }));
        setCastlingRights(initializeCastlingRights());
    };

    const handleQuitGame = () => {
        if (gameState && gameState.gameMode === 'online' && socketRef.current) {
            socketRef.current.emit('quitGame', { gameId: gameState.gameId });
            // Show loss banner and increment losses for quitter
            setGameNotification({ message: 'You quit the game. This counts as a loss.', type: 'error' });
            setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
            setTimeout(() => {
                setGameState(null);
                setGameNotification(null);
            }, 3000);
        } else {
            setGameState(null);
            setCastlingRights(initializeCastlingRights());
        }
    };

    useEffect(() => {
        // Set up socket.io listeners when game state changes
        if (gameState && gameState.gameMode !== 'local' && socketRef.current) {
            socketRef.current.on('opponentMove', ({ from, to }) => {
                console.log('Received opponent move:', { from, to });
                setGameState(prev => {
                    if (!prev || prev.gameMode !== 'online') return prev;
                    const board = prev.board.map(row => row.slice());
                    const piece = board[from.row][from.col];
                    if (!piece) {
                        console.error('No piece found at source position:', from);
                        return prev;
                    }
                    board[to.row][to.col] = piece;
                    board[from.row][from.col] = null;
                    return {
                        ...prev,
                        board,
                        currentTurn: prev.currentTurn === 'white' ? 'black' : 'white'
                    };
                });
            });

            // Join the game room
            socketRef.current.emit('joinGame', { gameId: gameState.gameId });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('opponentMove');
            }
        };
    }, [gameState]);

    // Initialize socket after login
    useEffect(() => {
        if (user && user.token && !socketRef.current) {
            socketRef.current = io('http://localhost:3001', {
                auth: { token: user.token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5
            });
        }
        // Cleanup on logout or unmount
        return () => {
            if (socketRef.current && !user) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [user]);

    // Update game state when match is found
    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on('gameFound', (gameData) => {
                console.log('Game found! Data:', gameData);
                setGameState({
                    board: initializeBoard(),
                    color: gameData.color,
                    currentTurn: 'white',
                    opponent: gameData.players.white === user.username ? gameData.players.black : gameData.players.white,
                    gameId: gameData.gameId,
                    gameMode: 'online'
                });
                setIsSearching(false);
                setGameNotification({ 
                    message: `Game found! You are playing as ${gameData.color}.`, 
                    type: 'success' 
                });
                // Clear the notification after 3 seconds
                setTimeout(() => setGameNotification(null), 3000);
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('gameFound');
            }
        };
    }, [user]);

    // Update game state when game is over
    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on('gameOver', (result) => {
                console.log('Game over:', result);
                let message;
                if (result.winner === user.username) {
                    message = 'You won!';
                    setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
                } else if (result.winner === 'draw') {
                    message = 'Game ended in a draw!';
                    setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
                } else if (result.winner === 'opponent_disconnected') {
                    message = 'Opponent disconnected. You won!';
                    setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
                } else {
                    message = 'You lost!';
                    setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
                }
                
                // Show notification
                setGameNotification({ 
                    message, 
                    type: result.winner === user.username || result.winner === 'opponent_disconnected' ? 'success' : 'error' 
                });

                // Reset game state and clear notification after a delay
                setTimeout(() => {
                    setGameState(null);
                    setGameNotification(null);
                }, 3000);
            });

            socketRef.current.on('opponentDisconnected', () => {
                console.log('Opponent disconnected');
                setGameNotification({ 
                    message: 'Opponent disconnected. You won!', 
                    type: 'success' 
                });
                setStats(prev => ({ ...prev, wins: prev.wins + 1 }));

                // Reset game state and clear notification after a delay
                setTimeout(() => {
                    setGameState(null);
                    setGameNotification(null);
                }, 3000);
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('gameOver');
                socketRef.current.off('opponentDisconnected');
            }
        };
    }, [user]);

    useEffect(() => {
        if (!user && window.innerWidth <= 1200) {
            document.body.classList.add('only-auth-visible');
        } else {
            document.body.classList.remove('only-auth-visible');
        }
        return () => document.body.classList.remove('only-auth-visible');
    }, [user]);

    useEffect(() => {
        // On mount, check for token in localStorage and fetch username and stats from server
        const token = localStorage.getItem('token');
        if (token) {
            (async () => {
                try {
                    const res = await fetch('http://localhost:3001/api/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Fetch stats as well
                        const statsRes = await fetch('http://localhost:3001/api/user/stats', {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        let statsData = { wins: 0, losses: 0, draws: 0 };
                        if (statsRes.ok) {
                            statsData = await statsRes.json();
                        }
                        setUser({ username: data.username, token });
                        setStats(statsData);
                    } else {
                        setUser(null);
                        setStats({ wins: 0, losses: 0, draws: 0 });
                    }
                } catch (err) {
                    setUser(null);
                    setStats({ wins: 0, losses: 0, draws: 0 });
                }
            })();
        }
    }, []);

    return (
        <main className="app">
            <section className="main-content">
                <aside className="left-panel">
                    {!user ? (
                        <section className="auth-box-wrapper">
                            <article className="auth-container">
                                <form className="auth-box" onSubmit={handleAuthSubmit}>
                                    <h2>{isLogin ? 'Login' : 'Register'}</h2>

                                    <div className="form-group">
                                        <label htmlFor="username">Username</label>
                                        <input
                                            type="text"
                                            id="username"
                                            placeholder="Username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="password">Password</label>
                                        <input
                                            type="password"
                                            id="password"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {!isLogin && (
                                        <div className="form-group">
                                            <label htmlFor="email">Email</label>
                                            <input
                                                type="email"
                                                id="email"
                                                placeholder="Email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    )}

                                    <button className="auth-button" type="submit">{isLogin ? 'Login' : 'Register'}</button>

                                    <p className="auth-switch">
                                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                                        <button
                                            type="button"
                                            className="auth-switch-button"
                                            onClick={() => setIsLogin(!isLogin)}
                                        >
                                            {isLogin ? 'Register' : 'Login'}
                                        </button>
                                    </p>
                                </form>
                            </article>
                        </section>
                    ) : (
                        <>
                            <header>
                                <h2>Welcome, {user.username}!</h2>
                                <nav className="stats">
                                    <p>Wins: {stats.wins}</p>
                                    <p>Losses: {stats.losses}</p>
                                    <p>Draws: {stats.draws}</p>
                                </nav>
                                <button onClick={handleLogout} className="logout-button">Logout</button>
                            </header>
                            <section className="matchmaking">
                                <h3>Find a Match</h3>
                                <button onClick={handleStartLocalGame} className="find-match-button">Play Local Game</button>
                                <button onClick={handleFindOnlineMatch} className="find-match-button" disabled={isSearching}>
                                    {isSearching ? 'Searching...' : 'Play vs Human'}
                                </button>
                                {isSearching && (
                                    <button onClick={handleCancelSearch} className="cancel-search-button">Cancel Search</button>
                                )}
                            </section>
                        </>
                    )}
                </aside>
                <section className="right-panel">
                    {user ? (
                        <>
                            <article className="game-ui">
                                <ChessBoard
                                    board={gameState ? gameState.board : staticBoard}
                                    onMove={gameState ? handleMove : () => {}}
                                    currentTurn={gameState ? gameState.currentTurn : "white"}
                                    playerColor={gameState ? gameState.color : "white"}
                                    isStatic={!gameState}
                                    castlingRights={castlingRights}
                                />
                                {gameState && (
                                    <nav className="game-controls">
                                        <button className="quit-game-button" onClick={handleQuitGame}>
                                            Quit Game
                                        </button>
                                        {gameState.gameMode === 'local' && (
                                            <button className="reset-game-button" onClick={handleResetGame}>
                                                Reset Game
                                            </button>
                                        )}
                                    </nav>
                                )}
                            </article>
                        </>
                    ) : (
                        <section className="chess-board-container desktop-only">
                            <ChessBoard
                                board={staticBoard}
                                onMove={() => {}}
                                currentTurn="white"
                                playerColor="white"
                                isStatic={true}
                                castlingRights={castlingRights}
                            />
                        </section>
                    )}
                </section>
            </section>
            {gameNotification && (
                <aside className="game-notification" role="alert">
                    <p>{gameNotification.message}</p>
                </aside>
            )}
            {promotionMove && (
                <dialog className="promotion-modal" open role="dialog" aria-modal="true" aria-labelledby="promotion-title">
                    <h3 id="promotion-title">Choose a piece to promote to:</h3>
                    <nav className="promotion-options">
                        <button onClick={() => handlePromotion('queen')}>Queen</button>
                        <button onClick={() => handlePromotion('rook')}>Rook</button>
                        <button onClick={() => handlePromotion('bishop')}>Bishop</button>
                        <button onClick={() => handlePromotion('knight')}>Knight</button>
                    </nav>
                </dialog>
            )}
        </main>
    );
}

// Add styles for notifications
const styles = `
.game-notification {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 30px;
    border-radius: 5px;
    font-size: 1.2em;
    font-weight: 600;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    z-index: 1000;
    animation: fadeIn 0.3s ease-in;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    text-align: center;
    min-width: 200px;
}

.game-notification.success {
    background-color: #4CAF50;
    color: white;
}

.game-notification.error {
    background-color: #f44336;
    color: white;
}

.game-notification.info {
    background-color: #2196F3;
    color: white;
}

.game-controls {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    justify-content: center;
}

.quit-game-button, .reset-game-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.quit-game-button {
    background-color: #f44336;
    color: white;
}

.quit-game-button:hover {
    background-color: #d32f2f;
}

.reset-game-button {
    background-color: #2196F3;
    color: white;
}

.reset-game-button:hover {
    background-color: #1976D2;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
}
`;

// Add styles to the document
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default App;

