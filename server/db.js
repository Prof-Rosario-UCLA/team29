const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/chess_app', {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
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
    if (process.env.NODE_ENV === 'development') {
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
    console.error('Please ensure PostgreSQL is running and the database exists.');
    console.error('You can create the database using:');
    console.error('psql -U postgres -c "CREATE DATABASE chess_app;"');
    process.exit(1);
  }
}

// Initialize database immediately
initializeDatabase();

module.exports = sequelize; 