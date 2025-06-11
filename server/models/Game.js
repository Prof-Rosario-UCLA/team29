const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  player_whiteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  player_blackId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  winner: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'ongoing'
  }
}, {
  timestamps: true,
  tableName: 'Games'
});

// Define associations
Game.belongsTo(User, { as: 'player_white', foreignKey: 'player_whiteId' });
Game.belongsTo(User, { as: 'player_black', foreignKey: 'player_blackId' });
Game.belongsTo(User, { as: 'winner_user', foreignKey: 'winner' });

module.exports = Game; 