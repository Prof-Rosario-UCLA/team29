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
    const [searchInterval, setSearchInterval] = useState(null);
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
            console.log('Attempting to', isLogin ? 'login' : 'register', 'with:', { username, password, email });
            
            const response = await fetch(`http://localhost:3001${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password, email })
            });
            
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }
            
            // Store token and user info
            localStorage.setItem('token', data.token);
            setUser({ username: data.username, token: data.token });
        } catch (error) {
            console.error('Auth error:', error);
            alert(error.message || 'Authentication failed');
        }
    };

    const handleLogout = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
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

    function boardToString(board) {
        let str = '';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (!piece) {
                    str += '.';
                } else {
                    let c = '';
                    switch (piece.type) {
                        case 'pawn':   c = 'p'; break;
                        case 'rook':   c = 'r'; break;
                        case 'knight': c = 'n'; break;
                        case 'bishop': c = 'b'; break;
                        case 'queen':  c = 'q'; break;
                        case 'king':   c = 'k'; break;
                        default:       c = '.'; break;
                    }
                    str += piece.color === 'white' ? c.toUpperCase() : c;
                }
            }
        }
        console.log('Board string:', str);
        return str;
    }

    function moveStringToCoords(moveStr) {
        // WASM returns moves in format "fromRowfromColtoRowtoCol" (e.g., "6151" or "6151q")
        if (!moveStr || moveStr.length < 4) {
            console.error('Invalid move string:', moveStr);
            return null;
        }
        const from = { row: parseInt(moveStr[0]), col: parseInt(moveStr[1]) };
        const to = { row: parseInt(moveStr[2]), col: parseInt(moveStr[3]) };
        const promotion = moveStr.length > 4 ? moveStr[4] : null;
        console.log('Parsed move:', { from, to, promotion });
        return { from, to, promotion };
    }

    function applyMove(board, moveStr) {
        const move = moveStringToCoords(moveStr);
        if (!move) {
            console.error('Invalid move:', moveStr);
            return board;
        }
        
        const { from, to, promotion } = move;
        const newBoard = board.map(row => row.slice());
        const piece = newBoard[from.row][from.col];
        
        if (!piece) {
            console.error('No piece at source position:', from);
            return board;
        }

        // Move the piece
        newBoard[to.row][to.col] = piece;
        newBoard[from.row][from.col] = null;

        // Handle promotion
        if (promotion) {
            const promotedPiece = { 
                type: promotion.toLowerCase(), 
                color: piece.color, 
                image: getPieceImage(promotion.toLowerCase(), piece.color) 
            };
            newBoard[to.row][to.col] = promotedPiece;
        }

        console.log('Applied move:', { from, to, promotion });
        console.log('New board state:', newBoard);
        return newBoard;
    }

    const handleMove = async (move) => {
        if (!gameState) return;
        const { from, to } = move;
        const board = gameState.board.map(row => row.slice());
        const piece = board[from.row][from.col];
        
        // Check if it's player's turn
        if (gameState.gameMode === 'local') {
            // In local mode, just alternate turns
            if (gameState.currentTurn !== piece.color) {
                alert("It's not your turn!");
                return;
            }
        } else if (gameState.gameMode === 'online') {
            // In online mode, only allow moves for the player's color
            if (gameState.color !== piece.color) {
                alert("It's not your turn!");
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
    };

    const handlePromotion = (promotionType) => {
        if (!promotionMove) return;
        const { from, to, piece } = promotionMove;
        const board = gameState.board.map(row => row.slice());
        const promotedPiece = { type: promotionType, color: piece.color, image: getPieceImage(promotionType, piece.color) };
        board[to.row][to.col] = promotedPiece;
        board[from.row][from.col] = null;

        // Update state for player's move
        setGameState(prev => ({
            ...prev,
            board,
            currentTurn: prev.currentTurn === 'white' ? 'black' : 'white'
        }));

        // Reset promotion state
        setPromotionMove(null);
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
        if (gameState.gameMode === 'online' && socketRef.current) {
            socketRef.current.emit('quitGame', { gameId: gameState.gameId });
        }
        setGameState(null);
        setCastlingRights(initializeCastlingRights());
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
        if (user && !socketRef.current) {
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

    return (
        <div className="app">
            <div className="main-content">
                <div className="left-panel">
                    {!user ? (
                        <div className="auth-box-wrapper">
                            <div className="auth-container">
                                <div className="auth-box">
                                    <h2>{isLogin ? 'Login' : 'Register'}</h2>
                                    <form onSubmit={handleAuthSubmit}>
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                placeholder="Username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <input
                                                type="password"
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="auth-button">
                                            {isLogin ? 'Login' : 'Register'}
                                        </button>
                                    </form>
                                    <p className="auth-switch">
                                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                                        <button onClick={() => setIsLogin(!isLogin)} className="auth-switch-button">
                                            {isLogin ? 'Register' : 'Login'}
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.18)', fontFamily: 'Quicksand, Poppins, Arial, sans-serif', letterSpacing: '0.04em' }}>
                                Welcome, {user.username}!
                            </h2>
                            <div className="stats" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '2.5rem', fontFamily: 'Quicksand, Poppins, Arial, sans-serif', fontSize: '1.15rem', color: '#e0e0e0', fontWeight: 600, letterSpacing: '0.03em', marginBottom: '1.2rem' }}>
                                <p style={{ margin: 0 }}>Wins: {stats.wins}</p>
                                <p style={{ margin: 0 }}>Losses: {stats.losses}</p>
                                <p style={{ margin: 0 }}>Draws: {stats.draws}</p>
                            </div>
                            <button onClick={handleLogout} className="logout-button">Logout</button>
                            <div className="matchmaking">
                                <h3>Find a Match</h3>
                                <button onClick={handleStartLocalGame} className="find-match-button">Play Local Game</button>
                                <button onClick={handleFindOnlineMatch} className="find-match-button" disabled={isSearching}>{isSearching ? 'Searching...' : 'Play vs Human'}</button>
                                {isSearching && (
                                    <button onClick={handleCancelSearch} className="cancel-search-button">Cancel Search</button>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="right-panel">
                    {user ? (
                        <>
                            <div className="chess-board-container">
                                <ChessBoard
                                    board={gameState ? gameState.board : staticBoard}
                                    onMove={gameState ? handleMove : () => {}}
                                    currentTurn={gameState ? gameState.currentTurn : "white"}
                                    playerColor={gameState ? gameState.color : "white"}
                                    isStatic={!gameState}
                                    castlingRights={castlingRights}
                                />
                                {gameState && (
                                    <button className="quit-game-button" onClick={handleQuitGame} style={{ marginTop: '1rem' }}>
                                        Quit Game
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="chess-board-container desktop-only">
                            <ChessBoard
                                board={staticBoard}
                                onMove={() => {}}
                                currentTurn="white"
                                playerColor="white"
                                isStatic={true}
                                castlingRights={castlingRights}
                            />
                        </div>
                    )}
                </div>
            </div>
            {promotionMove && (
                <div className="promotion-modal">
                    <h3>Choose a piece to promote to:</h3>
                    <div className="promotion-options">
                        <button onClick={() => handlePromotion('queen')}>Queen</button>
                        <button onClick={() => handlePromotion('rook')}>Rook</button>
                        <button onClick={() => handlePromotion('bishop')}>Bishop</button>
                        <button onClick={() => handlePromotion('knight')}>Knight</button>
                    </div>
                </div>
            )}
        </div>
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

