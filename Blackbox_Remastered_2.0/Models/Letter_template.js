const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path to your database config

const LetterTemplate = sequelize.define('LetterTemplate', {
  template_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  template_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  template_subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  template_body: {
    type: DataTypes.TEXT('long'), // Use TEXT('long') to simulate LONGTEXT in Sequelize
    allowNull: false,
  },
  signature_url: {
    type: DataTypes.STRING, // URL for signature image
    allowNull: true,
  },
  signature_file_id: {
    type: DataTypes.STRING, // You might want to add a length limit if needed, e.g., DataTypes.STRING(255)
    allowNull: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt columns
  tableName: 'letter_templates', // Consistent snake_case for table name
});

module.exports = LetterTemplate;
