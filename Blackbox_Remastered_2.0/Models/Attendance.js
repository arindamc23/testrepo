const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Attendance = sequelize.define('Attendance', {
  attendance_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: true
  },

  total_time: {
    type: DataTypes.STRING,
    allowNull: true
  },
  checkin_status: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  Attendance_status: {
    type: DataTypes.ENUM(
      'Full-Day',
      'Half-Day',
      'Started'
    ),
      
    defaultValue: 'Started'
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'user_id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'Attendance',
  timestamps: false
});

module.exports = Attendance;
