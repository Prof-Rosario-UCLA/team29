// Import all piece images
import wp from '../assets/pieces/wp.png';
import wr from '../assets/pieces/wr.png';
import wn from '../assets/pieces/wn.png';
import wb from '../assets/pieces/wb.png';
import wq from '../assets/pieces/wq.png';
import wk from '../assets/pieces/wk.png';
import bp from '../assets/pieces/bp.png';
import br from '../assets/pieces/br.png';
import bn from '../assets/pieces/bn.png';
import bb from '../assets/pieces/bb.png';
import bq from '../assets/pieces/bq.png';
import bk from '../assets/pieces/bk.png';

const PIECE_TYPES = {
    EMPTY: null,
    PAWN: 'pawn',
    ROOK: 'rook',
    KNIGHT: 'knight',
    BISHOP: 'bishop',
    QUEEN: 'queen',
    KING: 'king'
};

const COLORS = {
    WHITE: 'white',
    BLACK: 'black'
};

const getPieceImage = (type, color) => {
    if (!type || !color) return null;
    const pieceMap = {
        [PIECE_TYPES.PAWN]: color === COLORS.WHITE ? wp : bp,
        [PIECE_TYPES.ROOK]: color === COLORS.WHITE ? wr : br,
        [PIECE_TYPES.KNIGHT]: color === COLORS.WHITE ? wn : bn,
        [PIECE_TYPES.BISHOP]: color === COLORS.WHITE ? wb : bb,
        [PIECE_TYPES.QUEEN]: color === COLORS.WHITE ? wq : bq,
        [PIECE_TYPES.KING]: color === COLORS.WHITE ? wk : bk
    };
    return pieceMap[type];
};

const createEmptyBoard = () => {
    return Array(8).fill().map(() => Array(8).fill(null));
};

const initializeBoard = () => {
    const board = createEmptyBoard();
    for (let i = 0; i < 8; i++) {
        board[1][i] = {
            type: PIECE_TYPES.PAWN,
            color: COLORS.BLACK,
            image: getPieceImage(PIECE_TYPES.PAWN, COLORS.BLACK)
        };
        board[6][i] = {
            type: PIECE_TYPES.PAWN,
            color: COLORS.WHITE,
            image: getPieceImage(PIECE_TYPES.PAWN, COLORS.WHITE)
        };
    }
    const backRankPieces = [
        PIECE_TYPES.ROOK,
        PIECE_TYPES.KNIGHT,
        PIECE_TYPES.BISHOP,
        PIECE_TYPES.QUEEN,
        PIECE_TYPES.KING,
        PIECE_TYPES.BISHOP,
        PIECE_TYPES.KNIGHT,
        PIECE_TYPES.ROOK
    ];
    backRankPieces.forEach((piece, i) => {
        board[0][i] = {
            type: piece,
            color: COLORS.BLACK,
            image: getPieceImage(piece, COLORS.BLACK)
        };
    });
    backRankPieces.forEach((piece, i) => {
        board[7][i] = {
            type: piece,
            color: COLORS.WHITE,
            image: getPieceImage(piece, COLORS.WHITE)
        };
    });
    return board;
};

export { PIECE_TYPES, COLORS, createEmptyBoard, initializeBoard, getPieceImage }; 