// Chess rules and move validation
import { PIECE_TYPES, COLORS } from './boardState';

// Helper function to check if a position is within the board
const isWithinBoard = (rank, file) => {
    return rank >= 0 && rank < 8 && file >= 0 && file < 8;
};

// Helper function to check if a square is empty
const isEmptySquare = (board, rank, file) => {
    return !board[rank][file];
};

// Helper function to check if a square contains an enemy piece
const isEnemyPiece = (board, rank, file, color) => {
    const piece = board[rank][file];
    return piece && piece.color !== color;
};

// Get valid moves for a pawn
const getPawnMoves = (board, rank, file, color) => {
    const moves = [];
    const direction = color === COLORS.WHITE ? -1 : 1;
    const startRank = color === COLORS.WHITE ? 6 : 1;

    // Forward move
    if (isWithinBoard(rank + direction, file) && isEmptySquare(board, rank + direction, file)) {
        if ((color === COLORS.WHITE && rank + direction === 0) || (color === COLORS.BLACK && rank + direction === 7)) {
            // Promotion move (default to queen)
            moves.push([rank + direction, file, PIECE_TYPES.QUEEN]);
        } else {
            moves.push([rank + direction, file]);
        }
        
        // Double move from starting position
        if (rank === startRank && isEmptySquare(board, rank + 2 * direction, file)) {
            moves.push([rank + 2 * direction, file]);
        }
    }

    // Captures
    const captureFiles = [file - 1, file + 1];
    captureFiles.forEach(captureFile => {
        if (isWithinBoard(rank + direction, captureFile) && 
            isEnemyPiece(board, rank + direction, captureFile, color)) {
            if ((color === COLORS.WHITE && rank + direction === 0) || (color === COLORS.BLACK && rank + direction === 7)) {
                // Promotion capture (default to queen)
                moves.push([rank + direction, captureFile, PIECE_TYPES.QUEEN]);
            } else {
                moves.push([rank + direction, captureFile]);
            }
        }
    });

    return moves;
};

// Get valid moves for a rook
const getRookMoves = (board, rank, file, color) => {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // right, left, down, up

    directions.forEach(([dRank, dFile]) => {
        let currentRank = rank + dRank;
        let currentFile = file + dFile;

        while (isWithinBoard(currentRank, currentFile)) {
            if (isEmptySquare(board, currentRank, currentFile)) {
                moves.push([currentRank, currentFile]);
            } else if (isEnemyPiece(board, currentRank, currentFile, color)) {
                moves.push([currentRank, currentFile]);
                break;
            } else {
                break;
            }
            currentRank += dRank;
            currentFile += dFile;
        }
    });

    return moves;
};

// Get valid moves for a knight
const getKnightMoves = (board, rank, file, color) => {
    const moves = [];
    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    knightMoves.forEach(([dRank, dFile]) => {
        const newRank = rank + dRank;
        const newFile = file + dFile;

        if (isWithinBoard(newRank, newFile) && 
            (isEmptySquare(board, newRank, newFile) || 
             isEnemyPiece(board, newRank, newFile, color))) {
            moves.push([newRank, newFile]);
        }
    });

    return moves;
};

// Get valid moves for a bishop
const getBishopMoves = (board, rank, file, color) => {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    directions.forEach(([dRank, dFile]) => {
        let currentRank = rank + dRank;
        let currentFile = file + dFile;

        while (isWithinBoard(currentRank, currentFile)) {
            if (isEmptySquare(board, currentRank, currentFile)) {
                moves.push([currentRank, currentFile]);
            } else if (isEnemyPiece(board, currentRank, currentFile, color)) {
                moves.push([currentRank, currentFile]);
                break;
            } else {
                break;
            }
            currentRank += dRank;
            currentFile += dFile;
        }
    });

    return moves;
};

// Get valid moves for a queen (combines rook and bishop moves)
const getQueenMoves = (board, rank, file, color) => {
    return [...getRookMoves(board, rank, file, color), 
            ...getBishopMoves(board, rank, file, color)];
};

// Get valid moves for a king
const getKingMoves = (board, rank, file, color, castlingRights) => {
    const moves = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];

    directions.forEach(([dRank, dFile]) => {
        const newRank = rank + dRank;
        const newFile = file + dFile;

        if (isWithinBoard(newRank, newFile) && 
            (isEmptySquare(board, newRank, newFile) || 
             isEnemyPiece(board, newRank, newFile, color))) {
            moves.push([newRank, newFile]);
        }
    });

    // Castling
    if (castlingRights) {
        if (color === COLORS.WHITE && rank === 7 && file === 4) {
            // Kingside castling
            if (castlingRights.white.kingMoved === false && castlingRights.white.kingsideRookMoved === false) {
                if (isEmptySquare(board, 7, 5) && isEmptySquare(board, 7, 6)) {
                    moves.push([7, 6]);
                }
            }
            // Queenside castling
            if (castlingRights.white.kingMoved === false && castlingRights.white.queensideRookMoved === false) {
                if (isEmptySquare(board, 7, 3) && isEmptySquare(board, 7, 2) && isEmptySquare(board, 7, 1)) {
                    moves.push([7, 2]);
                }
            }
        } else if (color === COLORS.BLACK && rank === 0 && file === 4) {
            // Kingside castling
            if (castlingRights.black.kingMoved === false && castlingRights.black.kingsideRookMoved === false) {
                if (isEmptySquare(board, 0, 5) && isEmptySquare(board, 0, 6)) {
                    moves.push([0, 6]);
                }
            }
            // Queenside castling
            if (castlingRights.black.kingMoved === false && castlingRights.black.queensideRookMoved === false) {
                if (isEmptySquare(board, 0, 3) && isEmptySquare(board, 0, 2) && isEmptySquare(board, 0, 1)) {
                    moves.push([0, 2]);
                }
            }
        }
    }

    return moves;
};

// Get all valid moves for a piece
const getValidMoves = (board, rank, file, castlingRights) => {
    const piece = board[rank][file];
    if (!piece) return [];

    switch (piece.type) {
        case PIECE_TYPES.PAWN:
            return getPawnMoves(board, rank, file, piece.color);
        case PIECE_TYPES.ROOK:
            return getRookMoves(board, rank, file, piece.color);
        case PIECE_TYPES.KNIGHT:
            return getKnightMoves(board, rank, file, piece.color);
        case PIECE_TYPES.BISHOP:
            return getBishopMoves(board, rank, file, piece.color);
        case PIECE_TYPES.QUEEN:
            return getQueenMoves(board, rank, file, piece.color);
        case PIECE_TYPES.KING:
            return getKingMoves(board, rank, file, piece.color, castlingRights);
        default:
            return [];
    }
};

// Find the king's position for a given color
const findKing = (board, color) => {
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (piece && piece.type === PIECE_TYPES.KING && piece.color === color) {
                return [rank, file];
            }
        }
    }
    return null;
};

// Check if a square is under attack by any enemy piece
const isSquareUnderAttack = (board, rank, file, defendingColor) => {
    const attackingColor = defendingColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Check all enemy pieces
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const piece = board[r][f];
            if (piece && piece.color === attackingColor) {
                const moves = getValidMoves(board, r, f, null);
                if (moves.some(([moveRank, moveFile]) => moveRank === rank && moveFile === file)) {
                    return true;
                }
            }
        }
    }
    return false;
};

// Check if the king is in check
const isKingInCheck = (board, color) => {
    const kingPos = findKing(board, color);
    if (!kingPos) return false;
    return isSquareUnderAttack(board, kingPos[0], kingPos[1], color);
};

// Check if a move would put or leave the king in check
const wouldBeInCheck = (board, fromRank, fromFile, toRank, toFile, color) => {
    // Make a temporary move
    const tempBoard = board.map(row => [...row]);
    tempBoard[toRank][toFile] = tempBoard[fromRank][fromFile];
    tempBoard[fromRank][fromFile] = null;
    
    // Check if the king would be in check after the move
    return isKingInCheck(tempBoard, color);
};

// Check if a piece is pinned (moving it would put the king in check)
const isPiecePinned = (board, rank, file, color) => {
    const piece = board[rank][file];
    if (!piece || piece.type === PIECE_TYPES.KING) return false;
    
    // Try moving the piece to each of its valid moves
    const moves = getValidMoves(board, rank, file, null);
    return moves.every(([toRank, toFile]) => 
        wouldBeInCheck(board, rank, file, toRank, toFile, color)
    );
};

// Track if kings and rooks have moved for castling
const initializeCastlingRights = () => ({
    white: { kingMoved: false, kingsideRookMoved: false, queensideRookMoved: false },
    black: { kingMoved: false, kingsideRookMoved: false, queensideRookMoved: false }
});

// Check if castling is possible
const canCastle = (board, color, side, castlingRights) => {
    const rank = color === COLORS.WHITE ? 7 : 0;
    const kingFile = 4;
    const rookFile = side === 'kingside' ? 7 : 0;
    const direction = side === 'kingside' ? 1 : -1;
    
    // Check if king and rook haven't moved
    if (color === COLORS.WHITE) {
        if (side === 'kingside' && castlingRights.white.kingMoved) return false;
        if (side === 'kingside' && castlingRights.white.kingsideRookMoved) return false;
        if (side === 'queenside' && castlingRights.white.queensideRookMoved) return false;
    } else {
        if (side === 'kingside' && castlingRights.black.kingMoved) return false;
        if (side === 'kingside' && castlingRights.black.kingsideRookMoved) return false;
        if (side === 'queenside' && castlingRights.black.queensideRookMoved) return false;
    }

    // Check if king and rook are in correct positions
    const king = board[rank][kingFile];
    const rook = board[rank][rookFile];
    if (!king || !rook || 
        king.type !== PIECE_TYPES.KING || 
        rook.type !== PIECE_TYPES.ROOK || 
        king.color !== color || 
        rook.color !== color) {
        return false;
    }

    // Check if squares between king and rook are empty
    for (let file = kingFile + direction; file !== rookFile; file += direction) {
        if (board[rank][file]) return false;
    }

    // Check if king is in check
    if (isKingInCheck(board, color)) return false;

    // Check if squares king would move through are under attack
    for (let file = kingFile + direction; file !== kingFile + 2 * direction; file += direction) {
        if (isSquareUnderAttack(board, rank, file, color)) return false;
    }

    return true;
};

// Get castling moves if available
const getCastlingMoves = (board, rank, file, color, castlingRights) => {
    const moves = [];
    if (rank === (color === COLORS.WHITE ? 7 : 0) && file === 4) { // King's position
        if (canCastle(board, color, 'kingside', castlingRights)) {
            moves.push([rank, file + 2]); // King's destination
        }
        if (canCastle(board, color, 'queenside', castlingRights)) {
            moves.push([rank, file - 2]); // King's destination
        }
    }
    return moves;
};

// Check if a position is checkmate
const isCheckmate = (board, color) => {
    // First check if the king is in check
    if (!isKingInCheck(board, color)) return false;

    // Check if any piece can make a move that gets out of check
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (piece && piece.color === color) {
                const moves = getValidMovesWithCheck(board, rank, file, null);
                if (moves.length > 0) return false; // Found a legal move
            }
        }
    }

    return true; // No legal moves found and king is in check
};

// Get valid moves considering checks and pins
const getValidMovesWithCheck = (board, rank, file, castlingRights = null) => {
    const piece = board[rank][file];
    if (!piece) return [];

    let moves = getValidMoves(board, rank, file, castlingRights);
    
    // Add castling moves for king
    if (piece.type === PIECE_TYPES.KING && castlingRights) {
        moves = [...moves, ...getCastlingMoves(board, rank, file, piece.color, castlingRights)];
    }
    
    // If the piece is pinned, it can only move along the pin line
    if (isPiecePinned(board, rank, file, piece.color)) {
        return moves.filter(([toRank, toFile]) => 
            !wouldBeInCheck(board, rank, file, toRank, toFile, piece.color)
        );
    }

    // If the king is in check, only allow moves that get out of check
    if (isKingInCheck(board, piece.color)) {
        return moves.filter(([toRank, toFile]) => 
            !wouldBeInCheck(board, rank, file, toRank, toFile, piece.color)
        );
    }

    // Normal case: filter out moves that would put the king in check
    return moves.filter(([toRank, toFile]) => 
        !wouldBeInCheck(board, rank, file, toRank, toFile, piece.color)
    );
};

// Update the isValidMove function to use the new check-aware logic
const isValidMove = (board, fromRank, fromFile, toRank, toFile) => {
    const validMoves = getValidMovesWithCheck(board, fromRank, fromFile, null);
    return validMoves.some(([rank, file]) => rank === toRank && file === toFile);
};

// Export the new functions
export { 
    getValidMoves, 
    isValidMove, 
    isKingInCheck, 
    isPiecePinned,
    getValidMovesWithCheck,
    isCheckmate,
    initializeCastlingRights
}; 