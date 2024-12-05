const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const ProfileImage = sequelize.define('ProfileImage', {
  profile_image_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  imagekit_file_id: {  // Store ImageKit's fileId here
    type: DataTypes.STRING,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
}, {
  tableName: 'Profile_Images',
  timestamps: false
});

module.exports = ProfileImage;
