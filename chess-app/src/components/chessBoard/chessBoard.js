import "./chessBoard.css";

const ChessBoard = () => {
    const Ranks = Array(8).fill().map((_, i) => 8 - i);
    const Files = Array(8).fill().map((_, i) => String.fromCharCode(97 + i));

    return (
        <div className="chess-board">
            {Ranks.map((rank, i) =>
                Files.map((file, j) => {
                    const isLight = (i + j) % 2 === 0;
                    const isLeft = file === 'a';
                    const isBottom = rank === 1;

                    return (
                        <div
                            key={`${rank}${file}`}
                            className={`tile ${isLight ? 'light' : 'dark'}`}
                        >
                            <div className="tile-content">
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
    );
};

export default ChessBoard;
