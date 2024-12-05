// composer/ProjectAssociation.js
const Project = require('../Models/Projects');
const Brand = require('../Models/Brand');
const Tasks = require('../Models/Tasks');
const Subtask = require('../Models/Subtask');
const ProjectUserRole = require('../Models/ProjectUserRole');
const User = require('../Models/User');
const UserTaskPositions = require('../Models/UserTaskPositions');
const TaskStatusLogger = require('../Models/Taskstatuslogger');
const createProjectAssociations = () => {
  // Brand to Projects
  Brand.hasMany(Project, {
    foreignKey: 'brand_id',
    as: 'projects', // Alias for projects under a brand
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });
  Project.belongsTo(Brand, {
    foreignKey: 'brand_id',
    as: 'brand', // Alias for the brand of a project
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });

  // User to Projects
  User.hasMany(Project, {
    foreignKey: 'lead_id',
    as: 'projects', // Alias for projects assigned to a user
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });
  Project.belongsTo(User, {
    foreignKey: 'lead_id',
    as: 'lead', // Alias for the lead of a project
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });

  // Project to Tasks
  Project.hasMany(Tasks, {
    foreignKey: 'project_id',
    as: 'tasks', // Alias for tasks under a project
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  Tasks.belongsTo(Project, {
    foreignKey: 'project_id',
    as: 'project', // Alias for the project of a task
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // User to Tasks
  User.hasMany(Tasks, {
    foreignKey: 'task_user_id',
    as: 'tasks', // Alias for tasks assigned to a user
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });
  Tasks.belongsTo(User, {
    foreignKey: 'task_user_id',
    as: 'assignee', // Alias for the user assigned to a task
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });

  // Tasks to Subtasks
  Tasks.hasMany(Subtask, {
    foreignKey: 'task_id',
    as: 'subtasks', // Alias for subtasks under a task
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  Subtask.belongsTo(Tasks, {
    foreignKey: 'task_id',
    as: 'task', // Alias for the task of a subtask
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Subtask to Project
  Project.hasMany(Subtask, {
    foreignKey: 'project_id',
    as: 'subtasks', // Alias for subtasks under a project
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  Subtask.belongsTo(Project, {
    foreignKey: 'project_id',
    as: 'project', // Alias for the project of a subtask
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Subtask to ProjectUserRole
  ProjectUserRole.hasMany(Subtask, {
    foreignKey: 'project_role_id',
    as: 'subtasks', // Alias for subtasks under a project role
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });
  Subtask.belongsTo(ProjectUserRole, {
    foreignKey: 'project_role_id',
    as: 'projectRole', // Alias for the project role of a subtask
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });

  // User to Subtasks
  User.hasMany(Subtask, {
    foreignKey: 'sub_task_user_id',
    as: 'subtasks', // Alias for subtasks assigned to a user
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });
  Subtask.belongsTo(User, {
    foreignKey: 'sub_task_user_id',
    as: 'assignee', // Alias for the user assigned to a subtask
    onDelete: 'SET NULL',
    onUpdate: 'SET NULL',
  });

// User to UserTaskPositions
User.hasMany(UserTaskPositions, {
    foreignKey: 'user_id',
    as: 'taskPositions', // Alias for task positions under a user
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  UserTaskPositions.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user', // Alias for the user of a task position
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Tasks to UserTaskPositions
  Tasks.hasMany(UserTaskPositions, {
    foreignKey: 'task_id',
    as: 'taskPositions', // Alias for task positions under a task
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  UserTaskPositions.belongsTo(Tasks, {
    foreignKey: 'task_id',
    as: 'task', // Alias for the task of a task position
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });


  // TaskStatusLogger to Tasks
   // Tasks to TaskStatusLogger
   Tasks.hasMany(TaskStatusLogger, {
    foreignKey: 'task_id',
    as: 'statusLogs', // Alias for status logs under a task
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  TaskStatusLogger.belongsTo(Tasks, {
    foreignKey: 'task_id',
    as: 'task', // Alias for the task of a status log
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // User to TaskStatusLogger
  User.hasMany(TaskStatusLogger, {
    foreignKey: 'task_user_id',
    as: 'statusLogs', // Alias for status logs created by a user
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  TaskStatusLogger.belongsTo(User, {
    foreignKey: 'task_user_id',
    as: 'user', // Alias for the user who created a status log
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

};

module.exports = createProjectAssociations;
