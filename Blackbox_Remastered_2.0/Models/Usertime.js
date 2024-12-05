const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const UserTime = sequelize.define('UserTime', {
  usertime_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  start_time: {
    type: DataTypes.TIME, // Store only the time part
    allowNull: false,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  tableName: 'UserTime',
});

module.exports = UserTime;
