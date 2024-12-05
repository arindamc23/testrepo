// models/LeaveRequest.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const LeaveRequest = sequelize.define('LeaveRequest', {
  Leave_request_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  Leave_type_Id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(100),
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'User_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  dates: {
    type: DataTypes.TEXT,
  },
  Total_days: {
    type: DataTypes.INTEGER,
  },
  reason: {
    type: DataTypes.STRING(2055), // Adding the new 'reason' column
    allowNull: true, // Set to true if the reason is optional
  },
  Status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Pending',
  },
  Comment: {
    type: DataTypes.TEXT,
  },
  Approved_By: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'User_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
 
}, {
  timestamps: true,
  tableName: 'LeaveRequest',
});

module.exports = LeaveRequest;
