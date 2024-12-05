const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const EducationInfo = sequelize.define('EducationInfo', {
  id_educational_info: {
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
  institute: {
    type: DataTypes.STRING,
    allowNull: false
  },
  year_of_passing: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  degree_name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'EducationInfo',
  timestamps: false
});

module.exports = EducationInfo;