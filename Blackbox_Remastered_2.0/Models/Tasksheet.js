const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Tasks = require('./Tasks'); // Assuming the Tasks model is in the same directory
const User = require('./User'); // Assuming the Users model is in the same directory

const Tasksheet = sequelize.define('Tasksheet', {
  tasksheet_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  task_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Tasks,
      key: 'task_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  tasksheet_user_id: { 
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id',
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL',
  },
  task_status: {
    type: DataTypes.ENUM('Todo', 'InProgress', 'InReview', 'InChanges', 'Completed'),
    allowNull: false,
    defaultValue: 'Todo',
  },
  task_deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  task_priority_flag: {
    type: DataTypes.ENUM('Priority', 'No-Priority'),
    defaultValue: 'No-Priority',
  },
  missed_deadline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  tasksheet_date: {
    type: DataTypes.DATEONLY, // DATEONLY since it represents only the date
    allowNull: false, // Changed to not allow null for consistency
    defaultValue: DataTypes.NOW, // Automatically sets today's date
  },
}, {
  tableName: 'Tasksheet',
  timestamps: true,
});

module.exports = Tasksheet;
