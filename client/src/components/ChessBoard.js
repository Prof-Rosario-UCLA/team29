import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { init, getBestMove } from '../wasm/chessAI';

const PIECE_IMAGES = {
  'white-pawn': '/pieces/white-pawn.png',
  'white-knight': '/pieces/white-knight.png',
  'white-bishop': '/pieces/white-bishop.png',
  'white-rook': '/pieces/white-rook.png',
  'white-queen': '/pieces/white-queen.png',
  'white-king': '/pieces/white-king.png',
  'black-pawn': '/pieces/black-pawn.png',
  'black-knight': '/pieces/black-knight.png',
  'black-bishop': '/pieces/black-bishop.png',
  'black-rook': '/pieces/black-rook.png',
  'black-queen': '/pieces/black-queen.png',
  'black-king': '/pieces/black-king.png'
};

const ChessBoard = ({ gameId, isWhite, isComputerGame = false }) => {
  const canvasRef = useRef(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [boardState, setBoardState] = useState(initializeBoard());
  const [pieceImages, setPieceImages] = useState({});
  const [isThinking, setIsThinking] = useState(false);
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const socket = useSocket();

  // Initialize WebAssembly
  useEffect(() => {
    const initializeWasm = async () => {
      try {
        await init();
        setWasmInitialized(true);
      } catch (error) {
        console.error('Failed to initialize WebAssembly:', error);
      }
    };
    initializeWasm();
  }, []);

  // Load piece images
  useEffect(() => {
    const loadImages = async () => {
      const images = {};
      for (const [key, path] of Object.entries(PIECE_IMAGES)) {
        const img = new Image();
        img.src = path;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        images[key] = img;
      }
      setPieceImages(images);
    };
    loadImages();
  }, []);

  // Computer move logic
  useEffect(() => {
    if (isComputerGame && !isWhite && !isThinking && wasmInitialized) {
      const makeComputerMove = async () => {
        setIsThinking(true);
        try {
          const boardStr = boardState.map(piece => piece || '.').join('');
          const move = await getBestMove(boardStr, 'b');
          if (move) {
            const from = parseInt(move.substring(0, 2));
            const to = parseInt(move.substring(2, 4));
            const newBoardState = [...boardState];
            newBoardState[to] = newBoardState[from];
            newBoardState[from] = null;
            setBoardState(newBoardState);
          }
        } catch (error) {
          console.error('Error making computer move:', error);
        }
        setIsThinking(false);
      };
      makeComputerMove();
    }
  }, [boardState, isComputerGame, isWhite, isThinking, wasmInitialized]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const squareSize = canvas.width / 8;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw board
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#f0d9b5' : '#b58863';
        ctx.fillRect(j * squareSize, i * squareSize, squareSize, squareSize);
      }
    }

    // Draw pieces
    boardState.forEach((piece, index) => {
      if (piece && pieceImages[piece]) {
        const row = Math.floor(index / 8);
        const col = index % 8;
        const img = pieceImages[piece];
        const pieceSize = squareSize * 0.8; // Slightly smaller than square
        const offset = (squareSize - pieceSize) / 2;
        ctx.drawImage(
          img,
          col * squareSize + offset,
          row * squareSize + offset,
          pieceSize,
          pieceSize
        );
      }
    });

    // Draw selected piece highlight
    if (selectedPiece !== null) {
      const row = Math.floor(selectedPiece / 8);
      const col = selectedPiece % 8;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        col * squareSize,
        row * squareSize,
        squareSize,
        squareSize
      );
    }

    // Draw thinking indicator
    if (isThinking) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Computer is thinking...', canvas.width / 2, canvas.height / 2);
    }
  }, [boardState, selectedPiece, pieceImages, isThinking]);

  const handleClick = (e) => {
    if (isThinking) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const squareSize = canvas.width / 8;
    const col = Math.floor((e.clientX - rect.left) / squareSize);
    const row = Math.floor((e.clientY - rect.top) / squareSize);
    const index = row * 8 + col;

    if (selectedPiece === null) {
      const piece = boardState[index];
      if (piece && piece.startsWith(isWhite ? 'white' : 'black')) {
        setSelectedPiece(index);
      }
    } else {
      // Move piece
      const newBoardState = [...boardState];
      newBoardState[index] = newBoardState[selectedPiece];
      newBoardState[selectedPiece] = null;
      setBoardState(newBoardState);
      setSelectedPiece(null);

      // Emit move to server if not computer game
      if (!isComputerGame) {
        socket.emit('move', {
          gameId,
          from: selectedPiece,
          to: index
        });
      }
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        onClick={handleClick}
        role="img"
        aria-label="Chess board"
        tabIndex="0"
        onKeyDown={(e) => {
          // Add keyboard navigation
          if (selectedPiece === null) return;
          let newIndex = selectedPiece;
          switch (e.key) {
            case 'ArrowUp': newIndex -= 8; break;
            case 'ArrowDown': newIndex += 8; break;
            case 'ArrowLeft': newIndex -= 1; break;
            case 'ArrowRight': newIndex += 1; break;
            default: return;
          }
          if (newIndex >= 0 && newIndex < 64) {
            setSelectedPiece(newIndex);
          }
        }}
      />
      {isThinking && (
        <div role="status" aria-live="polite">
          Computer is thinking...
        </div>
      )}
    </div>
  );
};

function initializeBoard() {
  const board = new Array(64).fill(null);
  // Set up pawns
  for (let i = 0; i < 8; i++) {
    board[8 + i] = 'black-pawn';
    board[48 + i] = 'white-pawn';
  }
  // Set up other pieces
  const pieces = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  pieces.forEach((piece, i) => {
    board[i] = `black-${piece}`;
    board[56 + i] = `white-${piece}`;
  });
  return board;
}

export default ChessBoard; 