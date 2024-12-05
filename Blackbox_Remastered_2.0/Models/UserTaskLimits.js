const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const UserTaskLimits = sequelize.define('UserTaskLimits', {
    usertasklimit_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: User, // Name of the user table
            key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    max_tasks_per_day: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5, // Default limit if not explicitly set
    },
}, {
    tableName: 'UserTaskLimits',
    timestamps: false,
});

module.exports = UserTaskLimits;
