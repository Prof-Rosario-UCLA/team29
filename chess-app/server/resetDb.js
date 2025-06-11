const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('chess_app', 'postgres', 'postgres', {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log // Enable logging for debugging
});

async function resetDatabase() {
  try {
    // Drop all tables and sequences
    await sequelize.query('DROP SCHEMA public CASCADE;');
    await sequelize.query('CREATE SCHEMA public;');
    await sequelize.query('GRANT ALL ON SCHEMA public TO postgres;');
    await sequelize.query('GRANT ALL ON SCHEMA public TO public;');
    
    // Drop the sequence if it exists
    await sequelize.query('DROP SEQUENCE IF EXISTS "Users_id_seq" CASCADE;');
    
    console.log('Database reset successfully.');
    
    // Import models
    const User = require('./models/User');
    const Game = require('./models/Game');
    
    // Sync User model first
    await User.sync({ force: true });
    console.log('Users table created successfully.');
    
    // Then sync Game model
    await Game.sync({ force: true });
    console.log('Games table created successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase(); 