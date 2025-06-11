# CS144 Chess Application

A real-time multiplayer chess application built with React, Node.js, and PostgreSQL.

## Features

- Real-time multiplayer chess games
- User authentication with JWT
- Offline support (PWA)
- Responsive design
- Accessibility features
- Canvas-based chess board
- Redis caching
- PostgreSQL database with Sequelize ORM

## System Architecture

```mermaid
graph TD
    Client[React Client] --> |HTTPS| Server[Express Server]
    Server --> |Socket.io| Client
    Server --> |ORM| Database[(PostgreSQL)]
    Server --> |Cache| Redis[(Redis Cache)]
    Client --> |Service Worker| Cache[Browser Cache]
```

## Database Schema

### PostgreSQL Tables

1. **Users**
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(50) UNIQUE NOT NULL,
     email VARCHAR(100) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Games**
   ```sql
   CREATE TABLE games (
     id SERIAL PRIMARY KEY,
     white_player_id INTEGER REFERENCES users(id),
     black_player_id INTEGER REFERENCES users(id),
     status VARCHAR(20) DEFAULT 'active',
     current_position JSONB,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Moves**
   ```sql
   CREATE TABLE moves (
     id SERIAL PRIMARY KEY,
     game_id INTEGER REFERENCES games(id),
     player_id INTEGER REFERENCES users(id),
     move_data JSONB,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### Redis Cache Structure
- Game states: `game:{gameId}:state`
- User sessions: `user:{userId}:session`
- Active games: `user:{userId}:active_games`

## Security Features

1. **SQL Injection Prevention**: Using Sequelize ORM for parameterized queries
2. **XSS Prevention**: React's built-in XSS protection
3. **CSRF Protection**: JWT tokens in Authorization header
4. **Input Validation**: Server-side validation of all inputs
5. **Secure Headers**: Using helmet middleware
6. **HTTPS**: SSL/TLS encryption
7. **Session Management**: Redis-based session storage

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Games
- `POST /api/game` - Create new game
- `GET /api/game/:id` - Get game state
- `PUT /api/game/:id` - Update game state

### WebSocket Events
- `join-game` - Join a game room
- `move` - Make a chess move
- `move-made` - Receive move updates

## Deployment Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Google Cloud account
- PM2 (for process management)

### Local Development
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   ```
3. Set up environment variables:
   ```bash
   # .env
   DATABASE_URL=postgres://username:password@localhost:5432/chess_app
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your-secret-key
   ```
4. Start development servers:
   ```bash
   npm run dev:full
   ```

### Google Cloud VM Deployment
1. Install Google Cloud SDK
2. Set up VM instance:
   ```bash
   gcloud compute instances create cs144-25s-srinathsai22 \
     --zone=us-west1-a \
     --machine-type=n1-standard-1 \
     --image-family=ubuntu-2004-lts \
     --image-project=ubuntu-os-cloud
   ```

3. Initial VM setup:
   ```bash
   # SSH into VM
   gcloud compute ssh cs144-25s-srinathsai22 --zone=us-west1-a
   
   # Install Node.js and PM2
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   
   # Install PostgreSQL and Redis
   sudo apt-get update
   sudo apt-get install -y postgresql postgresql-contrib redis-server
   
   # Start services
   sudo systemctl start postgresql
   sudo systemctl start redis-server
   ```

4. Manual Deployment:
   ```bash
   # From your local machine
   gcloud compute scp --recurse ./client/dist/* cs144-25s-srinathsai22:~/chess-app/client/dist --zone=us-west1-a
   gcloud compute scp --recurse ./server/* cs144-25s-srinathsai22:~/chess-app/server --zone=us-west1-a
   gcloud compute scp package.json package-lock.json cs144-25s-srinathsai22:~/chess-app --zone=us-west1-a
   
   # SSH into VM and start the application
   gcloud compute ssh cs144-25s-srinathsai22 --zone=us-west1-a
   cd ~/chess-app
   npm install
   pm2 start npm --name 'chess-app' -- start
   ```

5. Automatic Deployment (CI/CD):
   - Push to main branch
   - GitHub Actions will automatically:
     - Run tests
     - Build the application
     - Deploy to VM
     - Restart the service

## Requirements Documentation

### Project Requirements Met

1. **Frontend Requirements**
   - ✅ HTML5 Canvas API for chess board rendering
   - ✅ Responsive design (320px+ viewport support)
   - ✅ PWA with offline support and service workers
   - ✅ Single Page Application architecture
   - ✅ Accessibility features (ARIA labels, keyboard navigation)

2. **Backend Requirements**
   - ✅ Node.js and Express server
   - ✅ PostgreSQL database with Sequelize ORM
   - ✅ Redis caching for game states and sessions
   - ✅ Socket.io for real-time game updates
   - ✅ JWT authentication

3. **Security Requirements**
   - ✅ HTTPS encryption
   - ✅ SQL injection prevention via ORM
   - ✅ XSS protection
   - ✅ CSRF protection
   - ✅ Input validation
   - ✅ Secure session management

4. **Deployment Requirements**
   - ✅ CI/CD pipeline with GitHub Actions
   - ✅ Automated testing
   - ✅ Automated deployment
   - ✅ Process management with PM2
   - ✅ Environment configuration

### Deviations from Spec
- Used React instead of vanilla JavaScript for better state management and component reusability
- Implemented Redis caching for better performance
- Added WebSocket support for real-time game updates
- Used PM2 for process management instead of systemd

## Developer

- [Your Name] - Full Stack Development
