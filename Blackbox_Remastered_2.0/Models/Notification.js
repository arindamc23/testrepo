const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust this to your Sequelize configuration
const User= require('./User');
const Notification = sequelize.define('Notification', {
    notification_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,  // Name of the table in your database
            key: 'User_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    notification_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    icon_flag: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,  // New notifications will have this set to false
      },
    link_url: {
        type: DataTypes.STRING(2550),
        allowNull: true,
    }
}, {
    tableName: 'Notifications',  // Explicitly define the table name
    timestamps: false,           // Disable Sequelize's automatic timestamps
});

module.exports = Notification;
