// Simple AI module to mimic WASM: picks a random move index
export function pickMove(numMoves) {
    if (numMoves <= 0) return -1;
    return Math.floor(Math.random() * numMoves);
}

// Piece values for evaluation
const PIECE_VALUES = {
    pawn: 1,
    knight: 3.2,
    bishop: 3.33,
    rook: 5.1,
    queen: 8.8,
    king: 1000
};

const CENTER_SQUARES = [
    [3, 3], [3, 4], [4, 3], [4, 4],
    [2, 3], [2, 4], [3, 2], [3, 5], [4, 2], [4, 5], [5, 3], [5, 4]
];

function evaluateBoard(board, color) {
    let score = 0;
    let myMobility = 0, oppMobility = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const value = PIECE_VALUES[piece.type] || 0;
                let bonus = 0;
                // Center control bonus
                if (CENTER_SQUARES.some(([r, c]) => r === row && c === col)) {
                    bonus += 0.2;
                }
                // King safety (prefer king not in center)
                if (piece.type === 'king' && (row < 2 || row > 5 || col < 2 || col > 5)) {
                    bonus += 0.1;
                }
                score += (piece.color === color ? 1 : -1) * (value + bonus);
            }
        }
    }
    // Mobility bonus (difference in number of legal moves)
    // This is a simple version; you can pass in getAllLegalMoves if needed
    // score += 0.05 * (myMobility - oppMobility);
    return score;
}

function cloneBoard(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

function makeMove(board, move) {
    const newBoard = cloneBoard(board);
    const { from, to } = move;
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;
    return newBoard;
}

function alphabeta(board, color, castlingRights, getAllLegalMoves, depth, alpha, beta, isMaximizing, rootColor) {
    if (depth === 0) {
        return evaluateBoard(board, rootColor);
    }
    const moves = getAllLegalMoves(board, color, castlingRights);
    if (moves.length === 0) {
        return evaluateBoard(board, rootColor);
    }
    if (isMaximizing) {
        let value = -Infinity;
        for (const move of moves) {
            const newBoard = makeMove(board, move);
            value = Math.max(value, alphabeta(newBoard, color === 'white' ? 'black' : 'white', castlingRights, getAllLegalMoves, depth - 1, alpha, beta, false, rootColor));
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }
        return value;
    } else {
        let value = Infinity;
        for (const move of moves) {
            const newBoard = makeMove(board, move);
            value = Math.min(value, alphabeta(newBoard, color === 'white' ? 'black' : 'white', castlingRights, getAllLegalMoves, depth - 1, alpha, beta, true, rootColor));
            beta = Math.min(beta, value);
            if (beta <= alpha) break;
        }
        return value;
    }
}

export function pickMoveMinimax(board, color, castlingRights, getAllLegalMoves, depth = 3) {
    const moves = getAllLegalMoves(board, color, castlingRights);
    if (moves.length === 0) return -1;
    let bestEval = -Infinity;
    let bestIdx = 0;
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const newBoard = makeMove(board, move);
        const evalScore = alphabeta(
            newBoard,
            color === 'white' ? 'black' : 'white',
            castlingRights,
            getAllLegalMoves,
            depth - 1,
            -Infinity,
            Infinity,
            false,
            color
        );
        if (evalScore > bestEval) {
            bestEval = evalScore;
            bestIdx = i;
        }
    }
    return bestIdx;
} 