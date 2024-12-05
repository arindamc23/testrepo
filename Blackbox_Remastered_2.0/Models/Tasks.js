const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Projects = require('./Projects'); // Assuming the Projects model is in the same directory
const Brand = require('./Brand'); // Assuming the Brand model is in the same directory
const User = require('./User'); // Assuming the User model is in the same directory
const Tasks = sequelize.define('Tasks', {
  task_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Projects,
      key: 'project_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },

  brand_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Brand,
      key: 'brand_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  task_name: {
    type: DataTypes.STRING(1055),
    allowNull: false
  },
  task_description: {
    type: DataTypes.TEXT
  },
  task_startdate: {
    type: DataTypes.DATE
  },
  task_deadline: {
    type: DataTypes.DATE
  },
  task_user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id'
    },
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL'
  },
  missed_deadline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM(
      'Todo',
      'InProgress',
      'InReview',
      'InChanges',
      'Completed'
 
    ),
    defaultValue: 'To-do'
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
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  on_hold: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  priority_flag: {   // Updated column to ENUM type
    type: DataTypes.ENUM('Priority', 'No-Priority'),
    defaultValue: 'No-Priority'  // Set default value to No-Priority
  }
}, {
  tableName: 'Tasks',
  timestamps: true
});


module.exports = Tasks;
