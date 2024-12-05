const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const Tasks = require('../Models/Tasks');
const Tasksheet = require('../Models/Tasksheet');
const Subtasksheet = require('../Models/Subtasksheet');
const Subtask = require('../Models/Subtask');
const User = require('../Models/User');
const ProfileImage = require('../Models/ProfileImage');
const Projects = require('../Models/Projects');
const Brand = require('../Models/Brand');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/authMiddleware');

// Endpoint to update Tasksheet when task status changes
router.post('/update-tasksheet', authenticateToken, async (req, res) => {
    const { task_id, status } = req.body;
    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        // Fetch task details from the Tasks table
        const task = await Tasks.findOne({
            where: { task_id },
            attributes: ['task_id', 'task_user_id', 'task_deadline', 'priority_flag', 'missed_deadline'],
            transaction, // Pass the transaction to the query
        });

        if (!task) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Task not found.' });
        }

        const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

        // Check if an entry for the current task and today's date exists in the Tasksheet table
        const existingEntry = await Tasksheet.findOne({
            where: {
                task_id: task.task_id,
                tasksheet_date: today,
            },
            transaction, // Pass the transaction to the query
        });

        if (existingEntry) {
            // Update the existing entry
            await existingEntry.update({
                task_status: status,
                task_deadline: task.task_deadline,
                task_priority_flag: task.priority_flag,
                missed_deadline: task.missed_deadline,
                tasksheet_date: today,
            }, { transaction }); // Pass the transaction to the update
        } else {
            // Insert a new entry for today
            await Tasksheet.create({
                task_id: task.task_id,
                tasksheet_user_id: task.task_user_id,
                task_status: status,
                task_deadline: task.task_deadline,
                task_priority_flag: task.priority_flag,
                missed_deadline: task.missed_deadline,
                tasksheet_date: today,
            }, { transaction }); // Pass the transaction to the create
        }

        // Commit the transaction
        await transaction.commit();
        res.status(200).json({ message: 'Tasksheet updated successfully.' });
    } catch (error) {
        // Rollback transaction in case of error
        if (transaction) await transaction.rollback();
        console.error('Error updating tasksheet:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        // Ensure transaction is closed if still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



router.post('/handle-subtask-status', authenticateToken, async (req, res) => {
    const { subtask_id, task_id } = req.body;

    if (!subtask_id || !task_id) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }

    let transaction;
    try {
        transaction = await sequelize.transaction();

        // Fetch subtask details
        const subtask = await Subtask.findByPk(subtask_id, {
            attributes: [
                'subtask_id',
                'status',
                'sub_task_deadline',
                'priority_flag',
                'missed_deadline',
                'sub_task_user_id',
            ],
            transaction,
        });

        if (!subtask) {
            throw new Error('Subtask not found.');
        }

        if (subtask.status !== 'Completed') {
            throw new Error('Subtask is not completed.');
        }

        // Fetch task details
        const task = await Tasks.findByPk(task_id, {
            attributes: ['task_id', 'task_user_id', 'task_deadline', 'priority_flag', 'missed_deadline'],
            transaction,
        });

        if (!task) {
            throw new Error('Task not found.');
        }

        const today = new Date().toISOString().split('T')[0]; // Format date as YYYY-MM-DD

        // Check for an existing entry in Tasksheet
        let tasksheet = await Tasksheet.findOne({
            where: {
                task_id: task.task_id,
                tasksheet_date: today,
            },
            transaction,
        });

        if (!tasksheet) {
            // Create a new entry in Tasksheet if not found
            tasksheet = await Tasksheet.create(
                {
                    task_id: task.task_id,
                    tasksheet_user_id: task.task_user_id,
                    task_status: task.status, // Default status for the task
                    task_deadline: task.task_deadline,
                    task_priority_flag: task.priority_flag,
                    missed_deadline: task.missed_deadline,
                    tasksheet_date: today,
                },
                { transaction }
            );
        }

        // Insert into Subtasksheet
        await Subtasksheet.create(
            {
                tasksheet_id: tasksheet.tasksheet_id,
                task_id,
                subtask_id,
                Subtask_status: subtask.status,
                task_deadline: subtask.sub_task_deadline,
                task_priority_flag: subtask.priority_flag,
                missed_deadline: subtask.missed_deadline,
            },
            { transaction }
        );

        await transaction.commit();
        return res.status(200).json({ message: 'Subtask data added to Subtasksheet successfully.' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error handling subtask status:', error);
        return res.status(500).json({ message: 'Internal server error.', error: error.message });
    } finally {
        // Ensure transaction is closed if still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});
 


router.get('/tasksheets', authenticateToken, async (req, res) => {
    const { start_date, end_date } = req.query;
  
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both start_date and end_date query parameters.',
      });
    }
  
    try {
      const tasksheets = await Tasksheet.findAll({
        where: {
          tasksheet_date: {
            [Op.between]: [new Date(start_date), new Date(end_date)],
          },
        },
        include: [
          {
            model: Tasks,
            as: 'Task',
            include: [
              {
                model: Subtasksheet,
                as: 'Subtasksheets',
                include: [
                  {
                    model: Subtask,
                    as: 'Subtask',
                  },
                ],
              },
              {
                model: Projects,
                as: 'project',
                attributes: ['project_id', 'project_name', 'brand_id'],
                include: [
                  {
                    model: Brand,
                    as: 'brand',
                    attributes: ['brand_id', 'brand_name'],
                  },
                ],
              },
            ],
          },
          {
            model: User,
            as: 'User',
            include: [
              {
                model: ProfileImage,
                as: 'profileImage',
              },
            ],
          },
        ],
        order: [
          [{ model: User, as: 'User' }, 'user_id', 'ASC'],
          ['tasksheet_date', 'ASC'],
        ],
      });
  
      if (!tasksheets.length) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No tasksheets found within the given date range.',
        });
      }
  
      const groupedData = {};
      for (const tasksheet of tasksheets) {
        const userId = tasksheet.User.user_id;
        const dateKey = tasksheet.tasksheet_date;
  
        if (!groupedData[userId]) {
          groupedData[userId] = {
            userDetails: {
              user_id: tasksheet.User.user_id,
              name: `${tasksheet.User.first_name} ${tasksheet.User.last_name}`,
              email: tasksheet.User.email,
              profileImage: tasksheet.User.profileImage?.image_url || null,
            },
            missedDeadlineCounts: {
              missedTrueCount: 0,
              missedFalseCount: 0,
            },
            tasksheets: {},
          };
        }
  
        groupedData[userId].missedDeadlineCounts.missedTrueCount += tasksheet.missed_deadline ? 1 : 0;
        groupedData[userId].missedDeadlineCounts.missedFalseCount += tasksheet.missed_deadline ? 0 : 1;
  
        if (!groupedData[userId].tasksheets[dateKey]) {
          groupedData[userId].tasksheets[dateKey] = [];
        }
  
        groupedData[userId].tasksheets[dateKey].push({
          ...tasksheet.toJSON(),
          project: {
            project_id: tasksheet.Task.project?.project_id || null,
            project_name: tasksheet.Task.project?.project_name || null,
            brand: tasksheet.Task.project?.brand || null,
          },
        });
      }
  
      res.status(200).json({
        success: true,
        data: groupedData,
      });
    } catch (error) {
      console.error('Error fetching tasksheets:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tasksheets',
        error: error.message,
      });
    }
  });
  
  



  router.get('/tasksheets/user/:tasksheet_user_id', authenticateToken, async (req, res) => {
    const { tasksheet_user_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        return res.status(400).json({
            success: false,
            message: 'Please provide both start_date and end_date query parameters.',
        });
    }

    try {
        const tasksheets = await Tasksheet.findAll({
            where: {
                tasksheet_user_id,
                tasksheet_date: {
                    [Op.between]: [new Date(start_date), new Date(end_date)],
                },
            },
            include: [
                {
                    model: Tasks,
                    as: 'Task',
                    include: [
                        {
                            model: Subtasksheet,
                            as: 'Subtasksheets',
                            include: [
                                {
                                    model: Subtask,
                                    as: 'Subtask',
                                },
                            ],
                        },
                        {
                            model: Projects,
                            as: 'project',
                            attributes: ['project_id', 'project_name', 'brand_id'],
                            include: [
                                {
                                    model: Brand,
                                    as: 'brand',
                                    attributes: ['brand_id', 'brand_name'],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: User,
                    as: 'User',
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                        },
                    ],
                },
            ],
            order: [['tasksheet_date', 'ASC']],
        });

        if (!tasksheets.length) {
            return res.status(200).json({
                success: true,
                data: null,
                message: 'No tasksheets found within the given date range.',
            });
        }

        res.status(200).json({
            success: true,
            data: tasksheets,
        });
    } catch (error) {
        console.error('Error fetching tasksheets for user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching tasksheets for user',
            error: error.message,
        });
    }
});











module.exports = router;
