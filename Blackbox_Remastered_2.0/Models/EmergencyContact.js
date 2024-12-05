const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const EmergencyContact = sequelize.define('EmergencyContact', {
  id_emergency_contact: {
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
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  relationship: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'Emergency_Contact',
  timestamps: false
});

module.exports = EmergencyContact;