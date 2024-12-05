const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // adjust path to your sequelize config
const Projects = require('./Projects'); // Assuming the Projects model is in the same directory
const Brand = require('./Brand'); // Assuming the Brand model is in the same directory
const User = require('./User'); // Assuming the User model is in the same directory
const Tasks = require('./Tasks'); // Assuming the User model is in the same directory
const ProjectUserRole = require('./ProjectUserRole'); // Assuming the User model is in the same directory
const Subtask = sequelize.define('Subtask', {
  subtask_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subtask_name: {
    type: DataTypes.STRING, 
    allowNull: false
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Tasks,
      key: 'task_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Projects,
      key: 'project_id'
    },
    onDelete: 'CASCADE',  
    onUpdate: 'CASCADE',
  }, 

  brand_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Brand,
      key: 'brand_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },

  project_role_id: {
    type: DataTypes.INTEGER,
    references: {
      model: ProjectUserRole,
      key: 'project_role_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  },
  sub_task_description: {
    type: DataTypes.TEXT
  },
  sub_task_startdate: {
    type: DataTypes.DATE,  // Change to DATE to store both date and time
    allowNull: false
  },
  sub_task_deadline: {
    type: DataTypes.DATE,  // Change to DATE to store both date and time
    allowNull: false
  },
  sub_task_user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  missed_deadline: {
    type: DataTypes.BOOLEAN
  },
  status: {
    type: DataTypes.ENUM('Todo','InProgress', 'Completed')
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Urgent')
  },
  is_active: {
    type: DataTypes.BOOLEAN
  },
  on_hold: {
    type: DataTypes.BOOLEAN
  },
  priority_flag: {   // Updated column to ENUM type
    type: DataTypes.ENUM('Priority', 'No-Priority'),
    defaultValue: 'No-Priority'  // Set default value to No-Priority
  }
}, {
  tableName: 'Subtask',
  timestamps: true
});




module.exports = Subtask;
