const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');  // Adjust the path according to your project structure
const Role = require('./Role');  // Import the Role model if it is in a different file

const LeaveType = sequelize.define('LeaveType', {
  Leave_type_Id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),  // Assuming a maximum length of 100 characters for the name
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,  // Allows for a larger text field
    allowNull: true,
  },
  total_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,  // Assuming there is a default value for total days
  },
  accrual_type: {
    type: DataTypes.ENUM('MonthlyAquired', 'YearlyAquired'), // Define the enum field
    allowNull: false, // You can set it to true if the field is optional
  },
  Role_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Role,  // Reference to the Role model
      key: 'Role_id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,  // Disables automatic timestamp fields
  tableName: 'LeaveType',  // Explicitly define the table name
});

module.exports = LeaveType;