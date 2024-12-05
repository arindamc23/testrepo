const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // adjust path to your sequelize config

const ProjectUserRole = sequelize.define('ProjectUserRole', {
  project_role_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_role_name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'ProjectUserRole',
  timestamps: true
});

module.exports = ProjectUserRole;
