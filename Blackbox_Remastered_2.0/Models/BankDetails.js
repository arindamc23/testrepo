const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const BankDetails = sequelize.define('BankDetails', {
  id_bank_details: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  bank_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bank_account_no: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ifsc_code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branch_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  accountHolder_name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'Bank_Details',
  timestamps: true
});

module.exports = BankDetails;
