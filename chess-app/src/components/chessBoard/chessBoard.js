import "./chessBoard.css";
import { useState } from "react";
import { initializeBoard } from "./boardState";

const ChessBoard = () => {
    const [board, setBoard] = useState(initializeBoard());
    const [selectedPiece, setSelectedPiece] = useState(null);
    const [currentTurn, setCurrentTurn] = useState('white'); // 'white' or 'black'
    const Ranks = Array(8).fill().map((_, i) => 8 - i);
    const Files = Array(8).fill().map((_, i) => String.fromCharCode(97 + i));

    const handleSquareClick = (rank, file) => {
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

            // Move the piece
            setBoard(prevBoard => {
                const newBoard = prevBoard.map(row => [...row]);
                const [fromRank, fromFile] = selectedPiece.position;
                newBoard[rank][file] = newBoard[fromRank][fromFile];
                newBoard[fromRank][fromFile] = null;
                return newBoard;
            });
            setSelectedPiece(null);
            // Switch turns after a valid move
            setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
        }
    };

    return (
        <div className="board-container">
            <div className="turn-indicator">
                Current Turn: <span className={currentTurn}>{currentTurn}</span>
            </div>
            <div className="chess-board">
                {Ranks.map((rank, i) =>
                    Files.map((file, j) => {
                        const isLight = (i + j) % 2 === 0;
                        const isLeft = file === 'a';
                        const isBottom = rank === 1;
                        const piece = board[i][j];
                        const isSelected = selectedPiece && 
                            selectedPiece.position[0] === i && 
                            selectedPiece.position[1] === j;

                        return (
                            <div
                                key={`${rank}${file}`}
                                className={`tile ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSquareClick(i, j)}
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
