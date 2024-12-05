const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require('sequelize'); // Import Sequelize operators
const User = require('../Models/User');
const Projects = require('../Models/Projects');
const Brand = require('../Models/Brand');
const Tasks = require('../Models/Tasks');
const Subtask = require('../Models/Subtask');
const ProjectUserRole = require('../Models/ProjectUserRole');
const UserTaskPositions = require('../Models/UserTaskPositions');
const ProfileImage = require('../Models/ProfileImage');
const TaskStatusLogger = require('../Models/Taskstatuslogger');
const { authenticateToken } = require('../middleware/authMiddleware');


//*-----------------------------------------------Monthly Reports-----------------------------------------------*//

// GET /monthly-report
router.get('/fetch-monthly-report', authenticateToken, async (req, res) => {
    const { brandId, projectId, month } = req.query;

    if (!brandId || !projectId || !month) {
        return res.status(400).json({ error: 'brand_name, project_name, and month are required' });
    }

    try {
        // Step 1: Fetch Brand Data
        const brand = await Brand.findOne({
            where: { brand_id: brandId },
        });

        if (!brand) {
            return res.status(404).json({ error: 'Brand not found' });
        }

        // Step 2: Fetch Project Data
        const project = await Projects.findOne({
            where: {
                project_id: projectId,
                brand_id: brand.brand_id,
            },
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Step 3: Fetch Lead Details
        const lead = await User.findOne({
            where: { user_id: project.lead_id },
            attributes: ['first_name', 'last_name'],
            include: {
                model: ProfileImage,
                as: 'profileImage',
                attributes: ['image_url'],
            },
        });

        // Step 4: Fetch Member Details
        const memberIds = project.member_id || [];
        const members = await User.findAll({
            where: {
                user_id: {
                    [Op.in]: memberIds,
                },
            },
            attributes: ['first_name', 'last_name'],
            include: {
                model: ProfileImage,
                as: 'profileImage',
                attributes: ['image_url'],
            },
        });

        // Step 5: Fetch Task Data
        const tasks = await Tasks.findAll({
            where: {
                project_id: project.project_id,
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('MONTH', sequelize.col('task_startdate')),
                        month
                    ),
                ],
            },
            include: [
                {
                    model: User,
                    as: 'assignee', // Assuming 'assignee' alias for user in task-user association
                    attributes: ['first_name', 'last_name'],
                    include: {
                        model: ProfileImage,
                        as: 'profileImage', // Assuming 'profileImage' alias for user-profile association
                        attributes: ['image_url'],
                    },
                },
            ],
        });

        // Step 6: Priority Tasks and Statistics
        const priorityTasks = tasks.filter(task => task.priority_flag === 'Priority');
        const priorityTaskDetails = priorityTasks.map(task => ({
            task_id: task.task_id,
            task_name: task.task_name,
            deadline: task.task_deadline,
            status: task.status,
            missed_deadline: task.missed_deadline,
            assignee: task.assignee
                ? {
                    first_name: task.assignee.first_name,
                    last_name: task.assignee.last_name,
                    profile_image: task.assignee.profileImage?.image_url || null,
                }
                : null, // If no assignee
        }));

        const taskCountByStatus = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});

        const missedDeadlineCount = tasks.filter(task => task.missed_deadline).length;

        // Step 7: Task Logs with User Details
        const taskLogs = await TaskStatusLogger.findAll({
            where: {
                task_id: tasks.map(task => task.task_id),
            },
            order: [['task_id', 'ASC']],
            include: [
                {
                    model: Tasks,
                    as: 'task',
                    attributes: ['task_name', 'task_description'], // Include task name and description
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['first_name', 'last_name'],
                    include: {
                        model: ProfileImage,
                        as: 'profileImage',
                        attributes: ['image_url'],
                    },
                },
            ],
        });

        // Step 8: Response
        return res.json({
            brand,
            project: {
                ...project.toJSON(),
                lead,
                members,
            },
            taskStatistics: {
                totalTasks: tasks.length,
                taskCountByStatus,
                missedDeadlineCount,
                priorityTasks: {
                    count: priorityTasks.length,
                    details: priorityTaskDetails,
                },
            },
            taskLogs,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




module.exports = router;