const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Overtime = sequelize.define('Overtime', {
  overtime_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  total_time: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'), // Define enum values
    allowNull: false,
    defaultValue: 'Pending', // Default to 'Pending'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ovetime_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: 'Overtime',
  timestamps: true
});

module.exports = Overtime;
