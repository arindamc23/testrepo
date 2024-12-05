// composer/AttendanceAssociation.js
const User = require('../Models/User');
const Attendance = require('../Models/Attendance');

// Define associations
const createAttendanceAssociations = () => {

  // A User has many Attendance records
  User.hasMany(Attendance, {
    foreignKey: 'user_id', // Foreign key in Attendance
    as: 'attendances',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  Attendance.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });
};

module.exports = createAttendanceAssociations;
