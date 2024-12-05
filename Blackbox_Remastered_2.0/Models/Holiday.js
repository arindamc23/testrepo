const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Holiday = sequelize.define('Holiday', {
  holiday_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  holiday_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  holiday_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  imagekit_file_id: {  // Store ImageKit's fileId here
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'Holiday',
  timestamps: true,

});
 
module.exports = Holiday;
