import React, { useEffect, useState } from 'react';
// Use the WASM module compiled with as-bind
import initWasm, { getBestMove } from '../wasm/chessAI';
import io from 'socket.io-client';
import ChessBoard from './ChessBoard';
import { useSocket } from '../contexts/SocketContext';

const socket = io('http://localhost:3001'); // Adjust the URL to your server

// Remove TypeScript interface and use plain JS props
export const ChessGame = ({ board, currentPlayer, gameType, setBoard }) => {
  const [waiting, setWaiting] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [isComputerGame, setIsComputerGame] = useState(false);
  const socket = useSocket();

  // Initialize WASM once on mount
  useEffect(() => {
    initWasm().catch(err => console.error('WASM init failed:', err));
  }, []);

  // Simulate finding a match for online mode
  useEffect(() => {
    if (gameType === 'online') {
      setWaiting(true);
      const timer = setTimeout(() => {
        setWaiting(false);
      }, 3000); // Simulate 3 seconds of waiting
      return () => clearTimeout(timer);
    }
  }, [gameType]);

  // Listen for incoming moves from the other player
  useEffect(() => {
    socket.on('move', ({ from, to, piece }) => {
      setBoard(prev => {
        const newBoard = prev.map(r => [...r]);
        newBoard[to.row][to.col] = piece;
        newBoard[from.row][from.col] = '.';
        return newBoard;
      });
      setCurrentPlayer(currentPlayer === 'w' ? 'b' : 'w');
    });
    return () => socket.off('move');
  }, []);

  // Trigger AI move when it's black's turn in AI mode
  useEffect(() => {
    const handleAIMove = async () => {
      // Build 64-char board string
      const boardStr = board.map(row => row.join('')).join('');
      console.log('AI thinking on board:', boardStr);
      try {
        const move = await getBestMove(boardStr, 'b');
        console.log('AI move:', move);
        if (move && move.length >= 4) {
          const fromRow = parseInt(move.charAt(0), 10);
          const fromCol = parseInt(move.charAt(1), 10);
          const toRow = parseInt(move.charAt(2), 10);
          const toCol = parseInt(move.charAt(3), 10);
          setBoard(prev => {
            const newBoard = prev.map(r => [...r]);
            newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
            newBoard[fromRow][fromCol] = '.';
            return newBoard;
          });
        }
      } catch (e) {
        console.error('Error during AI move:', e);
      }
    };
    console.log('Turn changed:', currentPlayer, 'Mode:', gameType);
    if (gameType === 'ai' && currentPlayer === 'b') {
      handleAIMove();
    }
  }, [board, currentPlayer, gameType, setBoard]);

  // Handle player move
  const handleMove = (row, col) => {
    if (gameType !== 'pvp') return; // Only allow moves in PvP mode
    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      const piece = board[fromRow][fromCol];
      // Only emit the move, do not update the board locally
      socket.emit('move', { from: { row: fromRow, col: fromCol }, to: { row, col }, piece });
      setSelectedSquare(null);
    } else {
      setSelectedSquare([row, col]);
    }
  };

  // Render waiting message for online mode
  if (waiting) {
    return <div>Waiting for opponent...</div>;
  }

  // Render chessboard UI
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '1px', width: '400px', height: '400px', border: '1px solid black' }}>
      {board.map((row, i) =>
        row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: (i + j) % 2 === 0 ? 'white' : 'gray',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: selectedSquare && selectedSquare[0] === i && selectedSquare[1] === j ? '2px solid blue' : 'none'
            }}
            onClick={() => handleMove(i, j)}
          >
            {cell}
          </div>
        ))
      )}
    </div>
  );
};

const Game = ({ gameId, isWhite }) => {
  const [isComputerGame, setIsComputerGame] = useState(false);
  const socket = useSocket();

  const handleComputerGame = () => {
    setIsComputerGame(true);
  };

  return (
    <div>
      <h2>Game {gameId}</h2>
      {!isComputerGame && (
        <button onClick={handleComputerGame}>
          Play against Computer
        </button>
      )}
      <ChessBoard
        gameId={gameId}
        isWhite={isWhite}
        isComputerGame={isComputerGame}
      />
    </div>
  );
};

export default Game;
