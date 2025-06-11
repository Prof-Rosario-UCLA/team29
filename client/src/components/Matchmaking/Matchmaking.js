import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Matchmaking.css';

const Matchmaking = ({ onGameStart, user }) => {
    const [socket, setSocket] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io('http://localhost:3001', {
            auth: {
                token: user.token
            }
        });

        newSocket.on('connect', () => {
            console.log('Connected to server with socket ID:', newSocket.id);
        });

        newSocket.on('gameFound', (gameData) => {
            console.log('Game found:', gameData);
            setIsSearching(false);
            onGameStart(gameData);
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
            setError(error.message);
            setIsSearching(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user.token, onGameStart]);

    const startSearching = () => {
        if (!socket) {
            setError('Not connected to server');
            return;
        }
        console.log('Starting matchmaking search...');
        setIsSearching(true);
        setError('');
        socket.emit('findMatch', { username: user.username });
    };

    const cancelSearch = () => {
        if (socket) {
            console.log('Canceling matchmaking search...');
            socket.emit('cancelMatchmaking');
            setIsSearching(false);
        }
    };

    return (
        <div className="matchmaking-container">
            <div className="matchmaking-box">
                <h2>Find a Game</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="user-info">
                    <p>Logged in as: {user.username}</p>
                </div>
                {!isSearching ? (
                    <button 
                        className="search-button"
                        onClick={startSearching}
                    >
                        Find Opponent
                    </button>
                ) : (
                    <div className="searching-state">
                        <p>Searching for opponent...</p>
                        <button 
                            className="cancel-button"
                            onClick={cancelSearch}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Matchmaking; 