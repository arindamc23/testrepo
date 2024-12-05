const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Brand = require('./Brand'); // Assuming the Brand model is in the same directory
const User = require('./User'); // Assuming the User model is in the same directory

const Projects = sequelize.define('Projects', {
  project_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  brand_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Brand,
      key: 'brand_id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  start_date: {
    type: DataTypes.DATEONLY
  },
  end_date: {
    type: DataTypes.DATEONLY
  },
  total_time: {
    type: DataTypes.DECIMAL(10, 2)
  },
  description: {
    type: DataTypes.TEXT
  },
  priority: {
    type: DataTypes.ENUM(
      'Low',
      'Medium',
      'High',
      'Urgent'
    ),
    defaultValue: 'Low'
  },
  lead_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  project_files: {
    type: DataTypes.STRING(1055)
  },

  status: {
    type: DataTypes.ENUM(
      'Created',
      'In-Progress',
      'Completed',
      'Deadline-missed',
      'On-Hold',
      'Rejected'
    ),
    defaultValue: 'Created'
  },
  missed_deadline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  member_id: {
    type: DataTypes.JSON, // Storing member IDs as an array of user IDs
    allowNull: true,
  },
  
}, {
  tableName: 'Projects',
  timestamps: true
});

module.exports = Projects;
