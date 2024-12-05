const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // adjust path as necessary
const User = require('./User');
const Policy = sequelize.define('Policy', {
    policy_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    policy_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    policy_type: {
        type: DataTypes.ENUM('Client', 'Employee'),
        allowNull: false
    },
    policy_subject: {
        type: DataTypes.STRING
    },
    policy_desc: {
        type: DataTypes.TEXT
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User, // replace with the actual name of your Users table
            key: 'user_id'
        }
    },
    creator_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    updated_by: {
        type: DataTypes.INTEGER,
        references: {
            model: 'User', // replace with the actual name of your Users table
            key: 'user_id'
        }
    },
    updator_name: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'Policy',
    timestamps: true,
});

module.exports = Policy;
