// composer/UserAssociation.js
const User = require('../Models/User');
const UserDetails = require('../Models/UserDetails');
const EmergencyContact = require('../Models/EmergencyContact');
const EducationInfo = require('../Models/EducationInfo');
const Role = require('../Models/Role');
const ProfileImage = require('../Models/ProfileImage');
const BankDetails = require('../Models/BankDetails');
const JoiningDate = require('../Models/JoiningDate');
const UserTime = require('../Models/Usertime');
const UserTaskLimits = require('../Models/UserTaskLimits');
const Overtime = require('../Models/Overtime');
// Define associations
const createUserAssociations = () => {
    // User has one UserDetails
    User.hasOne(UserDetails, {
        foreignKey: 'user_id',
        as: 'userDetails', // Keep this unique alias for UserDetails
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    UserDetails.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'userForDetails' // Unique alias for reverse association
    });

    // User has multiple EmergencyContacts
    User.hasMany(EmergencyContact, {
        foreignKey: 'user_id',
        as: 'emergencyContacts',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    EmergencyContact.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // User has multiple EducationInfos
    User.hasMany(EducationInfo, {
        foreignKey: 'user_id',
        as: 'educationInfos',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    EducationInfo.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // User has one Role
    User.belongsTo(Role, {
        foreignKey: 'Role_id',
        as: 'role',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
    });
    Role.hasMany(User, {
        foreignKey: 'Role_id',
        as: 'users'
    });

    // User has one ProfileImage
    User.hasOne(ProfileImage, {
        foreignKey: 'user_id',
        as: 'profileImage', // Assign unique alias for ProfileImage
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    ProfileImage.belongsTo(User, { foreignKey: 'user_id', as: 'userProfileImage' });

    // User has one BankDetails
    User.hasOne(BankDetails, {
        foreignKey: 'user_id',
        as: 'bankDetails', // Assign unique alias for BankDetails
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    BankDetails.belongsTo(User, { foreignKey: 'user_id', as: 'userBankDetails' });

    // User has multiple UserTime records
    User.hasMany(UserTime, { foreignKey: 'user_id', as: 'userTimes' });
    UserTime.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

    // User has multiple JoiningDate records
    User.hasMany(JoiningDate, { foreignKey: 'user_id', as: 'joiningDates' });
    JoiningDate.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

    UserTaskLimits.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
    User.hasOne(UserTaskLimits, { foreignKey: 'user_id', as: 'taskLimit' });


    Overtime.belongsTo(User, {
        foreignKey: 'user_id',
        as: 'requester', // Alias for the association
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

    Overtime.belongsTo(User, {
        foreignKey: 'approved_by',
        as: 'approver', // Alias for the association
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });
    User.hasMany(Overtime, {
        foreignKey: 'user_id', // Ensure this matches the Overtime model
        as: 'overtimes', // Alias used in the API query
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    });

};

module.exports = createUserAssociations;