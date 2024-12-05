const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Tasks = require('./Tasks'); // Assuming the Brand model is in the same directory
const TaskStatusLogger = sequelize.define('TaskStatusLogger', {
    task_status_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Tasks, // Name of the table to reference
        key: 'task_id',
      },
    },
    task_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'user_id',
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status_initial: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status_final: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    missed_deadline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
   
    time_stamp: {
      type: DataTypes.DATE,
      defaultValue: sequelize.NOW,
    },
  }, {
    tableName: 'task_status_logger',
    timestamps: true, // Disable automatic creation of createdAt/updatedAt fields
  });
  
  module.exports = TaskStatusLogger;