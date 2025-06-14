import "./chessBoard.css";
import React, { useState } from "react";
import { getValidMovesWithCheck } from "./chessRules";

const ChessBoard = ({ board, onMove, currentTurn, playerColor, isStatic, isAIMode, castlingRights }) => {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [validMoves, setValidMoves] = useState([]);

    const handleSquareClick = (row, col) => {
        if (isStatic) return;
        const piece = board[row][col];

        // In AI mode, only allow moving player's pieces
        if (isAIMode && piece && piece.color !== playerColor) {
            return;
        }

        if (!selectedSquare) {
            if (piece && piece.color === currentTurn) {
                setSelectedSquare({ row, col });
                setValidMoves(getValidMovesWithCheck(board, row, col));
            }
            return;
        }

        if (selectedSquare.row === row && selectedSquare.col === col) {
            setSelectedSquare(null);
            setValidMoves([]);
            return;
        }

        const isValid = validMoves.some(([r, c]) => r === row && c === col);
        if (isValid) {
            onMove({ from: selectedSquare, to: { row, col } });
            setSelectedSquare(null);
            setValidMoves([]);
            return;
        }

        if (piece && piece.color === currentTurn) {
            setSelectedSquare({ row, col });
            setValidMoves(getValidMovesWithCheck(board, row, col));
        }
    };

    const renderPiece = (piece) => {
        if (!piece) return null;
        return (
            <img
                src={piece.image}
                alt={`${piece.color} ${piece.type}`}
                className={`piece ${isAIMode && piece.color !== playerColor ? 'ai-piece' : ''}`}
            />
        );
    };

    return (
        <div className="chess-board-container">
            <div className="chess-board">
                {board.map((row, rowIndex) => (
                    <div key={rowIndex} className="board-row">
                        {row.map((piece, colIndex) => {
                            const isLight = (rowIndex + colIndex) % 2 === 0;
                            const isSelected = selectedSquare && selectedSquare.row === rowIndex && selectedSquare.col === colIndex;
                            const isValidMove = validMoves.some(([r, c]) => r === rowIndex && c === colIndex);
                            const isAIPiece = isAIMode && piece && piece.color !== playerColor;
                            return (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={`board-square ${isLight ? 'light' : 'dark'}${isSelected ? ' selected' : ''}${isValidMove ? ' valid-move' : ''}${isAIPiece ? ' ai-piece' : ''}`}
                                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                                >
                                    {renderPiece(piece)}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChessBoard;