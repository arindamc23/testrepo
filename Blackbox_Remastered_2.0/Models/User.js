const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Role = require('./Role');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(2055),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  Role_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Role,
      key: 'Role_id',
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  Is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  user_type: {
    type: DataTypes.ENUM('Founder','Admin','SuperAdmin','HumanResource','Accounts','Department_Head','Employee','Social_Media_Manager','Task_manager','Ex_employee','Unverified'),
    defaultValue: 'Unverified',
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
  timestamps: true,
  tableName: 'User',
});

module.exports = User;