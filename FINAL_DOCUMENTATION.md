# Chess Game Final Documentation

## Project Overview
A full-stack chess game application that allows users to play chess against other players or an AI opponent. The application features real-time gameplay, move validation, and a responsive design that works across all devices.

## Divergence from Original Plan

The final implementation diverged from the original plan in several key areas:

### Technology Stack Changes while adhering to the spec
1. **Database**: 
   - Original: SQLite with Prisma ORM
   - Final: PostgreSQL with Sequelize ORM
   - Reason: Better scalability and production readiness for cloud deployment

2. **Frontend Framework**:
   - Original: React with Tailwind CSS
   - Final: React with custom CSS modules
   - Reason: More control over styling and better performance

3. **Chess AI Implementation**:
   - Original: WebAssembly module with AssemblyScript
   - Final: JavaScript-based minimax algorithm with alpha-beta pruning
   - Reason: Simpler implementation while maintaining good performance

4. **Real-time Communication**:
   - Original: WebSocket
   - Final: Socket.IO
   - Reason: Better fallback support and easier implementation

### Feature Adjustments
1. **Drag and Drop**:
   - Original: Implement drag-and-drop piece movement
   - Final: Click-based movement
   - Reason: Better mobile compatibility and simpler implementation

2. **PWA Features**:
   - Original: Full offline support with IndexedDB
   - Final: Basic offline caching
   - Reason: Focus on core gameplay functionality

3. **Caching Layer**:
   - Original: Redis for match data caching
   - Final: In-memory caching on server
   - Reason: Sufficient for current scale

4. **AI Opponent**:
   - Original: External chess engine integration
   - Final: Custom JavaScript implementation

## Requirement Fulfillment

### 1. Semantic HTML5 Elements
✅ Implemented using:
- `<header>` for the top navigation
- `<nav>` for the game menu
- `<main>` for the game board
- `<article>` for game information
- `<section>` for different game states
- `<footer>` for additional information

### 2. Canvas API
✅ Implemented using:
- HTML5 Canvas for the chess board
- Move validation visualization
- Note: Drag and drop functionality was not implemented

### 3. Responsive Design
✅ Implemented using:
- CSS Grid and Flexbox
- Media queries for different screen sizes
- Mobile-first approach
- Touch-friendly controls
- Minimum width of 320px support (below that, the chessboard disappears - couldn't fix that)

### 4. Offline Support (PWA)
✅ Implemented using:
- Service Worker for basic caching
- Basic offline support
- Installable on devices
- Note: IndexedDB and offline-first architecture were not implemented

### 5. HTTPS
✅ Implemented using:
- SSL/TLS encryption
- Secure cookie handling
- JWT token security
- Secure WebSocket connections

### 6. Single Page Application
✅ Implemented using:
- React Router for navigation
- No page reloads
- State management with React hooks
- No horizontal/vertical scrolling

### 7. CSS Processing
✅ Implemented using:
- CSS Modules for component styling
- CSS variables for theming
- Responsive design patterns
- Modern CSS features

### 8. Authentication
✅ Implemented using:
- JWT tokens
- Secure cookie storage
- Password hashing with bcrypt
- Session management
- User registration and login

### 9. Cookie Consent
✅ Implemented using:
- Cookie consent banner
- User preference storage
- Clear privacy information
- Persistent user choices

### 10. Security
✅ Implemented using:
- Input validation
- XSS protection
- CSRF protection
- SQL injection prevention
- Secure password storage
- Rate limiting
- CORS configuration

### 11. Database
✅ Implemented using:
- PostgreSQL with Sequelize ORM
- User data storage
- Game state management
- Move history tracking
- Efficient queries

### 12. Node.js and Express
✅ Implemented using:
- Express.js backend
- RESTful API endpoints
- WebSocket server
- Middleware for security
- Error handling

### 13. PWA Features
✅ Implemented using:
- Service Worker
- Web App Manifest
- Basic offline support
- Installable on devices
- Note: Push notifications and background sync were not implemented

### 14. WebAssembly
✅ Implemented using:
- JavaScript-based chess AI (not WebAssembly)
- Minimax algorithm with alpha-beta pruning
- Move calculation
- Position evaluation
- Performance optimization

### 15. Real-time Features
✅ Implemented using:
- Socket.IO for game updates
- Real-time move validation
- Live game state updates
- Player notifications
- Game status tracking

### 16. Front-end Framework
✅ Implemented using:
- React.js
- Component architecture
- State management
- Event handling
- Performance optimization

### 17. Accessibility
✅ Implemented using:
- ARIA attributes
- Keyboard navigation
- Screen reader support
- Color contrast
- Focus management
- Semantic HTML

## Security Features

### 1. Authentication Security
- JWT token-based authentication
- Secure cookie storage
- Password hashing with bcrypt
- Token expiration and refresh
- Session management

### 2. Data Protection
- Input validation and sanitization
- Output encoding
- SQL injection prevention via Sequelize
- XSS protection via React
- CSRF protection

### 3. API Security
- Rate limiting
- Request validation
- Error handling
- CORS configuration
- HTTPS enforcement

### 4. PWA Security
- Service Worker scope
- Cache validation
- Basic offline data protection
- Update management

## Database Schema

### User Model
```javascript
{
    id: UUID,
    username: String,
    email: String,
    password: String (hashed),
    createdAt: Date,
    lastLogin: Date
}
```

### Game Model
```javascript
{
    id: UUID,
    player_whiteId: UUID,
    player_blackId: UUID,
    status: String,
    winner: UUID,
    createdAt: Date,
    updatedAt: Date
}
```

## API Endpoints
See `README.md` for complete API documentation.

## Deployment Challenges and Lessons Learned

### Initial Deployment Issues
My deployment attempts on the main branch faced significant challenges, primarily due to architectural decisions regarding database access:

1. **Monolithic Container Issues**
   - Initially attempted to run both application and database in a single container
   - Led to permission and access problems with PostgreSQL
   - Server became unresponsive due to constant database connection retries
   - Builds succeeded but application failed to serve properly

2. **Database Connection Problems**
   - PostgreSQL connection attempts were blocking the main application thread
   - Server resources were consumed by repeated connection retries
   - Application became unresponsive due to database connection issues
   - Basic game functionality was deployed but remained inaccessible
3. You can see the logs of one of two successful builds in image.png in the root of the submission.