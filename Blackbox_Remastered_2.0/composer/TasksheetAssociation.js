// Import models
const User = require('../Models/User');
const Tasks = require('../Models/Tasks');
const Tasksheet = require('../Models/Tasksheet');
const Subtasksheet = require('../Models/Subtasksheet');
const Subtask = require('../Models/Subtask');
// Define associations function
const createTasksheetAssociations = () => {
  // Association: Tasksheet belongs to Tasks
  Tasksheet.belongsTo(Tasks, {
    foreignKey: 'task_id',
    as: 'Task', // Alias for the association
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // Association: Tasks have many Tasksheets
  Tasks.hasMany(Tasksheet, {
    foreignKey: 'task_id',
    as: 'Tasksheets',
  });

  // Association: Tasksheet belongs to User
  Tasksheet.belongsTo(User, {
    foreignKey: 'tasksheet_user_id',
    as: 'User', // Alias for the association
    onUpdate: 'SET NULL',
    onDelete: 'SET NULL',
  });

  // Association: User has many Tasksheets
  User.hasMany(Tasksheet, {
    foreignKey: 'tasksheet_user_id',
    as: 'Tasksheets',
  });
};

  // Subtasksheet belongs to Tasksheet
  Subtasksheet.belongsTo(Tasksheet, {
    foreignKey: 'tasksheet_id',
    as: 'Tasksheet',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // Tasksheet has many Subtasksheets
  Tasksheet.hasMany(Subtasksheet, {
    foreignKey: 'tasksheet_id',
    as: 'Subtasksheets',
  });

  // Subtasksheet belongs to Tasks
  Subtasksheet.belongsTo(Tasks, {
    foreignKey: 'task_id',
    as: 'Task',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // Tasks have many Subtasksheets
  Tasks.hasMany(Subtasksheet, {
    foreignKey: 'task_id',
    as: 'Subtasksheets',
  });

  // Subtasksheet belongs to Subtask
  Subtasksheet.belongsTo(Subtask, {
    foreignKey: 'subtask_id',
    as: 'Subtask',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // Subtask has many Subtasksheets
  Subtask.hasMany(Subtasksheet, {
    foreignKey: 'subtask_id',
    as: 'Subtasksheets',
  });



// Export the association function
module.exports = createTasksheetAssociations;
