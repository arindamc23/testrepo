const cron = require('node-cron');
const { Op } = require('sequelize');
const Task = require('../Models/Tasks'); // Adjust the path as necessary

const TaskDeadlineJob = () => {
  // Schedule a task to run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date(); // Get the current date and time

      // Find and update tasks that are 'InProgress' or 'InChanges' and have exceeded their deadlines
      const updatedTasks = await Task.update(
        { missed_deadline: true }, // Set missed_deadline to true
        {
          where: {
            [Op.and]: [
              { status: { [Op.in]: ['InProgress', 'InChanges'] } }, // Status is InProgress or InChanges
              { task_deadline: { [Op.lt]: now } }, // Deadline is earlier than the current time
              { missed_deadline: false } // Only update if missed_deadline is still false
            ]
          }
        }
      );

      console.log(`${updatedTasks[0]} tasks updated for missed deadlines.`);
    } catch (error) {
      console.error('Error checking subtask deadlines:', error);
    }
  });
};

module.exports = TaskDeadlineJob;
