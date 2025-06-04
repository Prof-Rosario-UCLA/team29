import "./chessBoard.css";
import { useState, useEffect } from "react";
import { initializeBoard } from "./boardState";
import { io } from "socket.io-client";

const socket = io('http://localhost:3001');

const ChessBoard = () => {
    const [board, setBoard] = useState(initializeBoard());
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [currentTurn, setCurrentTurn] = useState('white');
    const [playerColor, setPlayerColor] = useState(null);
    const [roomId, setRoomId] = useState('room1'); // For testing, we'll use a fixed room
    const Ranks = Array(8).fill().map((_, i) => 8 - i);
    const Files = Array(8).fill().map((_, i) => String.fromCharCode(97 + i));

    useEffect(() => {
        // Join room when component mounts
        socket.emit('joinRoom', roomId);

        // Listen for color assignment
        socket.on('assignColor', (color) => {
            setPlayerColor(color);
            console.log('Assigned color:', color);
        });

        // Listen for game start
        socket.on('gameStart', ({ currentTurn: initialTurn }) => {
            console.log('Game started!');
            setCurrentTurn(initialTurn);
        });

        // Listen for board updates from the server
        socket.on('boardUpdate', ({ board: newBoard, currentTurn: newTurn }) => {
            setBoard(newBoard);
            setCurrentTurn(newTurn);
        });

        return () => {
            socket.off('assignColor');
            socket.off('gameStart');
            socket.off('boardUpdate');
        };
    }, [roomId]);

    const handleSquareClick = (rank, file) => {
        // Don't allow moves if it's not the player's turn
        if (currentTurn !== playerColor) return;

        const piece = board[rank][file];
        
        // If no piece is selected and clicked square has a piece of current turn's color, select it
        if (!selectedPiece && piece && piece.color === currentTurn) {
            setSelectedPiece({ position: [rank, file], piece });
            return;
        }

        // If a piece is already selected
        if (selectedPiece) {
            // If clicking the same piece, deselect it
            if (selectedPiece.position[0] === rank && selectedPiece.position[1] === file) {
                setSelectedPiece(null);
                return;
            }

            // If clicking a different piece of the same color, select the new piece
            if (piece && piece.color === currentTurn) {
                setSelectedPiece({ position: [rank, file], piece });
                return;
            }

            // Move the piece locally
            const newBoard = board.map(row => [...row]);
            const [fromRank, fromFile] = selectedPiece.position;
            newBoard[rank][file] = newBoard[fromRank][fromFile];
            newBoard[fromRank][fromFile] = null;
            setBoard(newBoard);

            // Emit the move to other players, including the full board
            socket.emit('makeMove', {
                roomId,
                from: selectedPiece.position,
                to: [rank, file],
                board: newBoard
            });

            setSelectedPiece(null);
        }
    };

    // Function to get the display rank based on player color
    const getDisplayRank = (rank) => {
        return playerColor === 'black' ? rank + 1 : 8 - rank;
    };

    // Function to get the display file based on player color
    const getDisplayFile = (file) => {
        return playerColor === 'black' ? String.fromCharCode(104 - file) : String.fromCharCode(97 + file);
    };

    // Determine board orientation based on player color
    const isBlack = playerColor === 'black';
    const displayRanks = isBlack ? [...Ranks].reverse() : Ranks;
    const displayFiles = isBlack ? [...Files].reverse() : Files;

    return (
        <div className="board-container">
            <div className="game-info">
                <div className="turn-indicator">
                    Current Turn: <span className={currentTurn}>{currentTurn}</span>
                </div>
                <div className="player-info">
                    Your Color: <span className={playerColor}>{playerColor || 'waiting...'}</span>
                </div>
            </div>
            <div className={`chess-board`}>
                {displayRanks.map((rank, i) =>
                    displayFiles.map((file, j) => {
                        // Calculate the real indices for the board array
                        const boardRank = isBlack ? 7 - i : i;
                        const boardFile = isBlack ? 7 - j : j;
                        const isLight = (boardRank + boardFile) % 2 === 0;
                        const isLeft = (!isBlack && file === 'a') || (isBlack && file === 'h');
                        const isBottom = (!isBlack && rank === 1) || (isBlack && rank === 8);
                        const piece = board[boardRank][boardFile];
                        const isSelected = selectedPiece && 
                            selectedPiece.position[0] === boardRank && 
                            selectedPiece.position[1] === boardFile;

                        return (
                            <div
                                key={`${rank}${file}`}
                                className={`tile ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSquareClick(boardRank, boardFile)}
                            >
                                <div className="tile-content">
                                    {piece && (
                                        <img 
                                            src={piece.image} 
                                            alt={`${piece.color} ${piece.type}`}
                                            className="chess-piece"
                                        />
                                    )}
                                    {isLeft && (
                                        <span className="rank-label">{rank}</span>
                                    )}
                                    {isBottom && (
                                        <span className="file-label">{file}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChessBoard;
