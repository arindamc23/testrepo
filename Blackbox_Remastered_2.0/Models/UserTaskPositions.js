const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); // Assuming the User model is in the same directory
const Tasks = require('./Tasks');
const UserTaskPositions = sequelize.define('UserTaskPositions', {
    user_task_position_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    task_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Tasks,
        key: 'task_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    column: {
      type: DataTypes.ENUM(
        'Todo',
        'InProgress',
        'InReview',
        'InChanges',
        'Completed'
      ),
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'UserTaskPositions',
    timestamps: true
  });
  module.exports = UserTaskPositions;  