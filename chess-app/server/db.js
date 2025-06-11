const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chess_app', {
  dialect: 'postgres',
  logging: false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// Test the connection and sync models
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Import models
    const User = require('./models/User');
    const Game = require('./models/Game');
    
    // Only drop and recreate tables in development
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.query('DROP SCHEMA IF EXISTS public CASCADE;');
      await sequelize.query('CREATE SCHEMA public;');
      await sequelize.query('GRANT ALL ON SCHEMA public TO postgres;');
      await sequelize.query('GRANT ALL ON SCHEMA public TO public;');
      
      // Sync models with force option to recreate tables
      await User.sync({ force: true });
      await Game.sync({ force: true });
      console.log('Database tables synchronized successfully.');
    } else {
      // In production, just sync without force
      await User.sync();
      await Game.sync();
      console.log('Database tables synchronized successfully.');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

// Initialize database immediately
initializeDatabase();

module.exports = sequelize; 