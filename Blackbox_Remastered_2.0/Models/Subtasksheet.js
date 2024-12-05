const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Tasks = require('./Tasks'); // Assuming the Tasks model is in the same directory
const Tasksheet = require('./Tasksheet'); // Assuming the TaskSheet model is in the same directory
const Subtask = require('./Subtask'); // Assuming the Subtask model is in the same directory
const Subtasksheet = sequelize.define('Subtasksheet', {
  subtasksheet_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  }, 
  tasksheet_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Tasksheet,
      key: 'tasksheet_id'
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
  subtask_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Subtask,
      key: 'subtask_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  Subtask_status: {
    type: DataTypes.ENUM(
      'Todo','InProgress', 'Completed'
    ),
    allowNull: false,
  },
  task_deadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  task_priority_flag: {
    type: DataTypes.ENUM('Priority', 'No-Priority'),
    defaultValue: 'No-Priority'
  },
  missed_deadline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'Subtasksheet',
  timestamps: true
});

module.exports = Subtasksheet;
