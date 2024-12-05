const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const JoiningDate = sequelize.define('JoiningDate', {
  joining_date_id: {
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
  joining_date: {
    type: DataTypes.DATEONLY, // Store only the date part
    allowNull: false,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
  tableName: 'JoiningDate',
});

module.exports = JoiningDate;
