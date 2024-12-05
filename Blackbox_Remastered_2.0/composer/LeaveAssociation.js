const LeaveType = require('../Models/LeaveType');
const Role = require('../Models/Role');
const User = require('../Models/User');
const LeaveBalance = require('../Models/LeaveBalance');
const LeaveRequest = require('../Models/LeaveRequest');
// Define associations
const createLeaveAssociation = () => {
  // LeaveType belongs to Role
  LeaveType.belongsTo(Role, {
    foreignKey: 'Role_id',
    as: 'role', // Alias for the association
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Role has many LeaveTypes
  Role.hasMany(LeaveType, {
    foreignKey: 'Role_id',
    as: 'leaveTypes',
  });

  // LeaveBalance belongs to User
  LeaveBalance.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user', // Alias for the association
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // User has many LeaveBalances
  User.hasMany(LeaveBalance, {
    foreignKey: 'user_id',
    as: 'leaveBalances',
  });

  // LeaveBalance belongs to LeaveType
  LeaveBalance.belongsTo(LeaveType, {
    foreignKey: 'leave_type_id',
    as: 'leaveType', // Alias for the association
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // LeaveType has many LeaveBalances
  LeaveType.hasMany(LeaveBalance, {
    foreignKey: 'leave_type_id',
    as: 'leaveBalances',
  });

// LeaveRequest belongs to User (Requestor)
LeaveRequest.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'requestor', // Alias for the requestor user
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // LeaveRequest belongs to LeaveType
  LeaveRequest.belongsTo(LeaveType, {
    foreignKey: 'Leave_type_Id',
    as: 'leaveType', // Alias for the leave type
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // LeaveRequest belongs to User (Approver)
  LeaveRequest.belongsTo(User, {
    foreignKey: 'Approved_By',
    as: 'approver', // Alias for the approver user
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // User has many LeaveRequests (as Requestor)
  User.hasMany(LeaveRequest, {
    foreignKey: 'user_id',
    as: 'leaveRequests',
  });

  // User has many LeaveRequests (as Approver)
  User.hasMany(LeaveRequest, {
    foreignKey: 'Approved_By',
    as: 'approvedRequests',
  });

  // LeaveType has many LeaveRequests
  LeaveType.hasMany(LeaveRequest, {
    foreignKey: 'Leave_type_Id',
    as: 'leaveRequests',
  });
};

module.exports = createLeaveAssociation;
