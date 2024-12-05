const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');  // Adjust the path according to your project structure
const User = require('./User');  // Import the User model
const LeaveType = require('./LeaveType');  // Import the LeaveType model

const LeaveBalance = sequelize.define('LeaveBalance', {
  leave_balance_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'User_id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    allowNull: false,
  },
  leave_type_id: {
    type: DataTypes.INTEGER,
    references: {
      model: LeaveType,
      key: 'Leave_type_Id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),  // Assuming a maximum length of 100 characters for the name
    allowNull: false,
  },
  total_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  earned_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  arrear_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,  // Default value can be adjusted as per your requirements
  },
}, {
  timestamps: true,  // Enables automatic timestamp fields
  tableName: 'LeaveBalance',  // Explicitly define the table name
});

module.exports = LeaveBalance;
