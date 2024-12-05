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
const UserTaskLimits = require('../Models/UserTaskLimits');
const moment = require('moment');
const { authenticateToken } = require('../middleware/authMiddleware');


// Helper function to calculate total time in days
function calculateTotalTime(start_date, end_date) {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    // Include both start and end dates as whole days
    const timeDifference = Math.abs(endDate - startDate) + 1 * 24 * 60 * 60 * 1000; // Adding one day in milliseconds
    const totalDays = Math.ceil(timeDifference / (24 * 60 * 60 * 1000)); // Convert milliseconds to days

    return totalDays;
}


//fetch all users --------------------------/
router.get('/fetch-all-users', authenticateToken, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'user_type'],
            where: {
                user_type: {
                    [Op.in]: ['Department_Head', 'Employee', 'Social_Media_Manager', 'Task_manager']
                }
            }
        });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


//Fetch all users with task data -------------------------------------------------------*//
router.get('/fetch-all-task-users', authenticateToken, async (req, res) => {
    try {
        const { user_id, start_date } = req.query;

        // Validate start_date
        if (!start_date) {
            return res.status(400).json({ message: "start_date is required." });
        }

        // Parse the provided start_date and set it to the start and end of the day
        const dayStart = new Date(start_date);
        dayStart.setHours(0, 0, 0, 0); // Start of the day
        const dayEnd = new Date(start_date);
        dayEnd.setHours(23, 59, 59, 999); // End of the day

        // Fetch all users with user_type 'Department_Head' or 'Employee'
        const userCondition = {
            user_type: {
                [Op.in]: ['Department_Head', 'Employee', 'Social_Media_Manager','Task_manager'],
            },
        };

        if (user_id) {
            userCondition.user_id = parseInt(user_id, 10); // Filter by user_id if provided
        }

        const users = await User.findAll({
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'user_type'],
            where: userCondition,
            include: [
                {
                    model: UserTaskLimits,
                    as: 'taskLimit',
                    attributes: ['max_tasks_per_day'],
                },
                {
                    model: ProfileImage,
                    as: 'profileImage',
                    attributes: ['image_url'],
                },
            ],
        });

        // Fetch tasks in "Todo" status for the specified date grouped by user
        const tasksToday = await Tasks.findAll({
            attributes: ['task_user_id', [sequelize.fn('COUNT', sequelize.col('task_id')), 'taskCount']],
            where: {
                status: {
                    [Op.in]: ['Todo', 'InProgress', 'InChanges'], // Include Todo, InProgress, and InChanges
                },
                task_startdate: {
                    [Op.between]: [dayStart, dayEnd],
                },
            },
            group: ['task_user_id'],
        });

        // Map task counts by user_id for easy access
        const taskCountMap = {};
        tasksToday.forEach(task => {
            taskCountMap[task.task_user_id] = parseInt(task.dataValues.taskCount, 10);
        });

        // Build the response by merging user data with task counts and limits
        const response = users.map(user => {
            const userId = user.user_id;
            const taskLimit = user.taskLimit?.max_tasks_per_day || 0;
            const taskCount = taskCountMap[userId] || 0;
            const remainingTasks = taskLimit - taskCount;

            return {
                user_id: userId,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                user_type: user.user_type,
                max_tasks_per_day: taskLimit,
                tasks_today: taskCount,
                remaining_tasks: remainingTasks > 0 ? remainingTasks : 0, // Ensure non-negative value
                limit_exceeded: taskCount >= taskLimit,
                profile_image: user.profileImage?.image_url || null, // Include profile image URL
            };
        });

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching all users with task details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});








// Add Project API
router.post('/add-project', authenticateToken, async (req, res) => {
    const {
        project_name,
        brand_id,
        start_date,
        end_date,
        description,
        priority,
        lead_id,
        project_files, // Single file URL
        member_id,      // Array of member user IDs
    } = req.body;

    let transaction;

    try {
        // Start transaction
        transaction = await sequelize.transaction();

        // Calculate total time
        const total_time = calculateTotalTime(start_date, end_date);

        // Create the project
        const newProject = await Projects.create(
            {
                project_name,
                brand_id,
                start_date,
                end_date,
                total_time, // Computed total time
                description,
                priority,
                lead_id,
                project_files,
                member_id, // Add member IDs
            },
            { transaction }
        );

        // Commit transaction
        await transaction.commit();

        res.status(201).json({
            message: 'Project created successfully',
            project: newProject,
        });
    } catch (error) {
        // Rollback transaction in case of error
        if (transaction) await transaction.rollback();
        console.error('Error adding project:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        // Ensure transaction is closed if still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// Edit Project API
router.put('/edit-project/:project_id', authenticateToken, async (req, res) => {
    const { project_id } = req.params; // Get project ID from URL parameters
    const {
        project_name,
        brand_id,
        start_date,
        end_date,
        description,
        priority,
        lead_id,
        project_files, // Single file URL
        member_id,      // Array of member user IDs
    } = req.body;

    let transaction;

    try {
        // Start transaction
        transaction = await sequelize.transaction();

        // Find the project by ID
        const project = await Projects.findByPk(project_id, { transaction });

        if (!project) {
            // Rollback transaction if project is not found
            await transaction.rollback();
            return res.status(404).json({ message: 'Project not found' });
        }

        // Dynamically update only the fields that are provided
        const updates = {};
        if (project_name !== undefined) updates.project_name = project_name;
        if (brand_id !== undefined) updates.brand_id = brand_id;
        if (start_date !== undefined) updates.start_date = start_date;
        if (end_date !== undefined) updates.end_date = end_date;
        if (description !== undefined) updates.description = description;
        if (priority !== undefined) updates.priority = priority;
        if (lead_id !== undefined) updates.lead_id = lead_id;
        if (project_files !== undefined) updates.project_files = project_files;
        if (member_id !== undefined) updates.member_id = member_id;

        // Update total time if dates are provided
        if (start_date && end_date) {
            updates.total_time = calculateTotalTime(start_date, end_date);
        }

        // Update the project with the dynamically built `updates` object
        await project.update(updates, { transaction });

        // Commit transaction
        await transaction.commit();

        res.status(200).json({
            message: 'Project updated successfully',
            project,
        });
    } catch (error) {
        // Rollback transaction in case of error
        if (transaction) await transaction.rollback();
        console.error('Error editing project:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        // Ensure transaction is closed if still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



// Fetch All Projects API with Pagination and Filters
router.get('/all-projects', authenticateToken, async (req, res) => {
    const { page = 1, limit = 10, brand_name, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    try {
        const whereConditions = {};
        const brandConditions = {};

        // Filter by end_date range
        if (start_date && end_date) {
            whereConditions.end_date = { [Op.between]: [start_date, end_date] };
        } else if (end_date) {
            whereConditions.end_date = { [Op.lte]: end_date };
        }

        // Filter by brand_name (case-insensitive match)
        if (brand_name) {
            brandConditions.brand_name = { [Op.like]: `%${brand_name}%` }; // Use `LIKE` for MySQL
        }

        // Fetch projects with filters, pagination, and associated data
        const { rows: projects, count: total } = await Projects.findAndCountAll({
            where: whereConditions,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            include: [
                {
                    model: Brand,
                    as: 'brand',
                    attributes: ['brand_name'],
                    where: brandConditions, // Apply brand_name filter
                },
                {
                    model: User,
                    as: 'lead',
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'],
                        },
                    ],
                },
            ],
        });

        // Fetch member details for each project
        const memberDetails = await Promise.all(
            projects.map(async (project) => {
                const memberIds = Array.isArray(project.member_id)
                    ? project.member_id
                    : []; // Ensure it's an array

                const members = await User.findAll({
                    where: {
                        user_id: memberIds,
                    },
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'],
                        },
                    ],
                });
                return { project_id: project.project_id, members };
            })
        );

        // Combine projects with their respective member details
        const enrichedProjects = projects.map((project) => ({
            ...project.toJSON(),
            members: memberDetails.find((m) => m.project_id === project.project_id)?.members || [],
        }));

        res.status(200).json({
            message: 'Projects fetched successfully',
            projects: enrichedProjects,
            total, // Total count for pagination
            page: parseInt(page, 10),
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Fetch Projects by User API with Pagination and Filters
router.get('/projects/user/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;
    const { page = 1, limit = 10, project_name, end_date } = req.query;
    const offset = (page - 1) * limit;

    try {
        // Fetch user type for the given user_id
        const user = await User.findOne({
            where: { user_id },
            attributes: ['user_type'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userType = user.user_type;
        let whereConditions = {};

        // If user_type is one of the privileged roles, fetch all projects
        if (['Founder', 'Admin', 'SuperAdmin', 'HumanResource', 'Department_Head', 'Task_manager'].includes(userType)) {
            whereConditions = {}; // Fetch all projects without filtering by user_id
        } else {
            // For other user types, apply the existing filtering logic
            whereConditions = {
                [Op.or]: [
                    { lead_id: user_id },
                    sequelize.literal(`JSON_CONTAINS(member_id, '"${user_id}"')`), // Use JSON_CONTAINS for JSON array
                ],
            };

        }

        // Apply additional filters (project_name and end_date)
        if (project_name) {
            whereConditions.project_name = { [Op.iLike]: `%${project_name}%` };
        }

        if (end_date) {
            whereConditions.end_date = { [Op.lte]: end_date };
        }

        // Fetch projects with filters, pagination, and associated data
        const { rows: projects, count: total } = await Projects.findAndCountAll({
            where: whereConditions,
            replacements: { user_id }, // Pass user_id as a parameter for sequelize.literal
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            include: [
                {
                    model: Brand,
                    as: 'brand',
                    attributes: ['brand_name'],
                },
                {
                    model: User,
                    as: 'lead',
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'],
                        },
                    ],
                },
            ],
        });

        // Fetch member details for each project
        const memberDetails = await Promise.all(
            projects.map(async (project) => {
                const memberIds = Array.isArray(project.member_id)
                    ? project.member_id
                    : []; // Ensure it's an array

                const members = await User.findAll({
                    where: {
                        user_id: memberIds,
                    },
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'],
                        },
                    ],
                });
                return { project_id: project.project_id, members };
            })
        );

        // Combine projects with their respective member details
        const enrichedProjects = projects.map((project) => ({
            ...project.toJSON(),
            members: memberDetails.find((m) => m.project_id === project.project_id)?.members || [],
        }));

        res.status(200).json({
            message: 'Projects fetched successfully',
            projects: enrichedProjects,
            total, // Total count for pagination
            page: parseInt(page, 10),
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching projects for user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



//*-----------------------------------------------Api to fetch specific project by id --------------------------------------*//

// Fetch Project by ID API
router.get('/projects/:project_id', authenticateToken, async (req, res) => {
    const { project_id } = req.params;

    try {
        // Fetch project details by project_id
        const project = await Projects.findOne({
            where: { project_id },
            include: [
                {
                    model: Brand,
                    as: 'brand',
                    attributes: ['brand_name'],
                },
                {
                    model: User,
                    as: 'lead',
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'],
                        },
                    ],
                },
            ],
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Fetch member details
        const memberIds = Array.isArray(project.member_id) ? project.member_id : [];
        const members = await User.findAll({
            where: {
                user_id: memberIds,
            },
            attributes: ['user_id', 'first_name', 'last_name'],
            include: [
                {
                    model: ProfileImage,
                    as: 'profileImage',
                    attributes: ['image_url'],
                },
            ],
        });

        // Combine project details with member data
        const enrichedProject = {
            ...project.toJSON(),
            members,
        };

        res.status(200).json({
            message: 'Project fetched successfully',
            project: enrichedProject,
        });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


//*---------------------------------------------------project scearch by brand name ----------------------------------------*/
router.get('/projects-by-brand', authenticateToken, async (req, res) => {
    const { brand_name } = req.query;

    try {
        if (!brand_name) {
            return res.status(400).json({ message: 'Brand name is required' });
        }

        // Fetch projects associated with the given brand name
        const projects = await Projects.findAll({
            include: [
                {
                    model: Brand,
                    as: 'brand',
                    attributes: ['brand_name'],
                    where: {
                        brand_name: { [Op.like]: `%${brand_name}%` }, // Case-insensitive match
                    },
                },
            ],
        });

        if (projects.length === 0) {
            return res.status(404).json({ message: 'No projects found for the specified brand' });
        }

        res.status(200).json({
            message: 'Projects fetched successfully',
            projects,
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



/*--------------------------------------------UserRole APIs--------------------------------------------*/

// Add or Edit ProjectUserRole
router.post('/project-user-role', authenticateToken, async (req, res) => {
    const { id, project_role_name, description } = req.body;
    let transaction;

    try {
        // Start a new transaction
        transaction = await sequelize.transaction();

        if (id) {
            // Find the role to update within the transaction
            const role = await ProjectUserRole.findByPk(id, { transaction });
            if (!role) {
                return res.status(404).json({ error: 'Role not found' });
            }

            // Update the role details
            role.project_role_name = project_role_name || role.project_role_name;
            role.description = description || role.description;
            await role.save({ transaction });

            // Commit the transaction
            await transaction.commit();
            return res.status(200).json({ message: 'Role updated successfully', role });
        } else {
            // Add new ProjectUserRole within the transaction
            const newRole = await ProjectUserRole.create(
                { project_role_name, description },
                { transaction }
            );

            // Commit the transaction
            await transaction.commit();
            return res.status(201).json({ message: 'Role created successfully', newRole });
        }
    } catch (error) {
        // Rollback the transaction if an error occurs
        await transaction.rollback();
        res.status(500).json({ error: 'Error adding or updating project user role' });
    } finally {
        // Ensure transaction is closed if still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// View all ProjectUserRoles
router.get('/viewproject-user-role', authenticateToken, async (req, res) => {
    try {
        const roles = await ProjectUserRole.findAll();
        res.status(200).json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving project user roles' });
    }
});

//*-----------------------------------------------Branch APIs--------------------------------------------*/

// Add or Edit Branch
// CREATE or UPDATE: Add a new Brand if it doesn't exist, or update if it does
router.post('/AddeditBrands', authenticateToken, async (req, res) => {
    const { brand_id, brand_name } = req.body;

    let transaction;

    try {
        // Start a new transaction
        transaction = await sequelize.transaction();

        if (brand_id) {
            // Update the existing brand if `brand_id` is provided
            const [updated] = await Brand.update(
                { brand_name },
                { where: { brand_id }, transaction } // Use the transaction
            );

            if (updated) {
                // Commit the transaction
                await transaction.commit();

                // Fetch and return the updated brand
                const updatedBrand = await Brand.findByPk(brand_id);
                return res.status(200).json(updatedBrand);
            } else {
                // Rollback the transaction if update failed
                await transaction.rollback();
                return res.status(404).json({ error: 'Brand not found or not updated' });
            }
        } else {
            // Create a new brand if `brand_id` is not provided
            const brand = await Brand.create({ brand_name }, { transaction });

            // Commit the transaction
            await transaction.commit();

            return res.status(201).json(brand);
        }
    } catch (error) {
        // Rollback the transaction if an error occurs
        await transaction.rollback();
        res.status(500).json({ error: 'Error adding or updating brand', details: error.message });
    } finally {
        // Ensure transaction is closed if still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

// READ: Get all Brands
router.get('/fetchallbrands', authenticateToken, async (req, res) => {
    try {
        const brands = await Brand.findAll();
        res.status(200).json(brands);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve brands', details: error });
    }
});






//*--------------------------------------------------------------task Routes---------------------------------------------*//

router.post('/add-tasks', authenticateToken, async (req, res) => {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "Tasks must be a non-empty array." });
    }

    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        const addedTasks = [];

        for (const task of tasks) {
            const {
                user_id,
                project_id,
                brand_id,
                task_name,
                task_description,
                task_startdate,
                task_deadline,
                priority
            } = task;

            // Parse task_startdate and define the start and end of the day for that date
            const startDate = new Date(task_startdate);
            startDate.setHours(0, 0, 0, 0); // Start of the task date
            const endDate = new Date(task_startdate);
            endDate.setHours(23, 59, 59, 999); // End of the task date

            // Fetch the user's task limit
            const user = await User.findOne({
                attributes: ['user_id'],
                where: { user_id },
                include: [
                    {
                        model: UserTaskLimits,
                        as: 'taskLimit',
                        attributes: ['max_tasks_per_day'],
                    },
                ],
            });

            if (!user) {
                console.error(`User with ID ${user_id} not found.`);
                continue; // Skip this task
            }

            const taskLimit = user.taskLimit?.max_tasks_per_day || 0;

            // Fetch the user's current task count for the specified date
            const taskCount = await Tasks.count({
                where: {
                    task_user_id: user_id,
                    status: {
                        [Op.in]: ['Todo', 'InProgress', 'InChanges'], // Include Todo, InProgress, and InChanges
                    },
                    task_startdate: {
                        [Op.between]: [startDate, endDate],
                    },
                },
            });

            if (taskCount >= taskLimit) {
                console.log(`User ${user_id} has reached their task limit (${taskLimit}) for ${task_startdate}. Task skipped.`);
                continue; // Skip this task
            }

            // Add the task
            const newTask = await Tasks.create({
                project_id,
                brand_id,
                task_user_id: user_id,
                task_name,
                task_description,
                task_startdate,
                task_deadline,
                priority,
                status: 'Todo',
            }, { transaction });

            // Fetch users to notify
            const usersToNotify = await User.findAll({
                attributes: ['user_id'],
                where: {
                    user_type: {
                        [Op.in]: ['Founder', 'Admin', 'SuperAdmin', 'HumanResource', 'Department_Head', 'Task_manager'],
                    },
                },
            });

            const userIds = new Set(usersToNotify.map(user => user.user_id));
            userIds.add(user_id);

            // Add task positions for each user
            for (const id of userIds) {
                const maxPosition = await UserTaskPositions.max('position', {
                    where: { user_id: id, column: 'Todo' },
                });

                const position = (maxPosition || 0) + 1;

                await UserTaskPositions.create({
                    user_id: id,
                    task_id: newTask.task_id,
                    column: 'Todo',
                    position,
                }, { transaction });
            }

            addedTasks.push(newTask);
        }

        // Commit the transaction
        await transaction.commit();

        res.status(201).json({
            message: 'Tasks added successfully.',
            tasks: addedTasks,
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        res.status(500).json({ error: 'Error adding tasks', details: error.message });
    }
    finally {
        // Ensure transaction is closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



//*Usdate Task Status API --------------------------------------------------*//

router.put('/update-task-status', authenticateToken, async (req, res) => {
    const { task_id, new_column, new_position, user_id } = req.body;

    if (!task_id || !new_column || new_position === undefined || !user_id) {
        return res.status(400).json({ error: 'Missing required fields: task_id, new_column, new_position, user_id' });
    }

    let transaction;

    try {
        transaction = await sequelize.transaction();

        // Step 1: Fetch the task
        const task = await Tasks.findOne({ where: { task_id }, transaction });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Prevent moving tasks back to Todo or updating completed tasks
        if ((task.status !== 'Todo' && new_column === 'Todo') || task.status === 'Completed') {
            return res.status(400).json({
                error: `Invalid status update: ${task.status}`,
            });
        }

        // Prevent moving from InReview to InProgress
        if (task.status === 'InReview' && new_column === 'InProgress') {
            return res.status(400).json({
                error: 'Invalid status update: Tasks cannot move from InReview to InProgress.',
            });
        }


        // Save the initial status for logging
        const initialStatus = task.status;

        // Update the task's status
        await Tasks.update(
            { status: new_column },
            { where: { task_id }, transaction }
        );

        // Step 2: Update positions for the current user
        const currentPosition = await UserTaskPositions.findOne({
            where: { task_id, user_id },
            transaction,
        });

        // Reorder tasks in the current column for the current user
        if (currentPosition && currentPosition.column !== new_column) {
            await UserTaskPositions.update(
                { position: sequelize.literal(`CASE WHEN position > ${currentPosition.position} THEN position - 1 ELSE position END`) },
                {
                    where: { column: currentPosition.column, position: { [Op.gt]: currentPosition.position }, user_id },
                    transaction,
                }
            );
        }

        // Reorder tasks in the new column for the current user
        await UserTaskPositions.update(
            { position: sequelize.literal(`CASE WHEN position >= ${new_position} THEN position + 1 ELSE position END`) },
            { where: { column: new_column, user_id }, transaction }
        );

        // Update the current user's position and column
        if (currentPosition) {
            await UserTaskPositions.update(
                { column: new_column, position: new_position },
                { where: { task_id, user_id }, transaction }
            );
        } else {
            await UserTaskPositions.create(
                { task_id, user_id, column: new_column, position: new_position },
                { transaction }
            );
        }

        // Step 3: Update positions for other users sharing the task
        const otherUsers = await UserTaskPositions.findAll({
            where: { task_id, user_id: { [Op.ne]: user_id } },
            transaction,
        });

        for (const otherUser of otherUsers) {
            const maxPosition = await UserTaskPositions.max('position', {
                where: { column: new_column, user_id: otherUser.user_id },
                transaction,
            });

            // Assign max + 1 as the new position for other users
            await UserTaskPositions.update(
                { column: new_column, position: maxPosition + 1 },
                { where: { task_id, user_id: otherUser.user_id }, transaction }
            );
        }

        // Step 4: Log the status change in TaskStatusLogger
        const user = await User.findOne({ where: { user_id }, transaction });
        const username = user ? `${user.first_name} ${user.last_name}` : 'Unknown';

        await TaskStatusLogger.create(
            {
                task_id,
                task_user_id: user_id,
                username,
                status_initial: initialStatus,
                status_final: new_column,
                missed_deadline: task.due_date && new Date() > task.due_date,
                time_stamp: new Date(),
            },
            { transaction }
        );

        await transaction.commit();

        res.status(200).json({
            message: 'Task status and positions updated successfully.',
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        res.status(500).json({
            error: 'Failed to update task status and positions',
            details: error.message,
        });
    } finally {
        // Ensure transaction is closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});



//* --------------------------------task deadline change --------------------------------------*//
router.put('/update-task-deadline', authenticateToken, async (req, res) => {
    const { task_id, new_deadline } = req.body;

    if (!task_id || !new_deadline) {
        return res.status(400).json({ error: 'Missing required fields: task_id, new_deadline' });
    }

    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        // Find the task by ID
        const task = await Tasks.findByPk(task_id, { transaction });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Update the task deadline
        await Tasks.update(
            { task_deadline: new_deadline },
            { where: { task_id }, transaction }
        );

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({
            message: 'Task deadline updated successfully',
            task: {
                task_id: task_id,
                new_deadline: new_deadline
            }
        });
    } catch (error) {
        // Rollback the transaction if something goes wrong
        if (transaction) await transaction.rollback();

        res.status(500).json({
            error: 'Failed to update task deadline',
            details: error.message
        });
    } finally {
        // Ensure transaction is closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

//--------------------------------------------------Taskboard fetc task api---------------------------------------------------//
// GET API to fetch tasks for Kanban board specific to the requesting user
router.get('/tasks/kanban', authenticateToken, async (req, res) => {
    try {
        // Fetch query parameters
        const { user_id, brand_id, start_date, end_date } = req.query; // Add start_date and end_date query params

        if (!user_id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Build dynamic where clause for filtering
        const whereClause = { user_id };

        // Apply brand filter if provided
        if (brand_id) {
            whereClause['$task.project.brand_id$'] = brand_id;
        }

        // Apply date range filter if provided
        if (start_date || end_date) {
            const dateRange = {};
            if (start_date) {
                dateRange[Op.gte] = new Date(`${start_date}T00:00:00`); // Start of the day
            }
            if (end_date) {
                dateRange[Op.lte] = new Date(`${end_date}T23:59:59`); // End of the day
            }
            whereClause['$task.task_startdate$'] = dateRange;
        }

        // Fetch tasks with positions, brand, and project associations
        const userTasks = await UserTaskPositions.findAll({
            where: whereClause,
            include: [
                {
                    model: Tasks,
                    as: 'task',
                    include: [
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
                        {
                            model: User,
                            as: 'assignee',
                            attributes: ['user_id', 'first_name', 'last_name', 'email'],
                            include: [
                                {
                                    model: ProfileImage,
                                    as: 'profileImage',
                                    attributes: ['image_url'],
                                },
                            ],
                        },
                    ],
                    attributes: [
                        'task_id',
                        'task_name',
                        'status',
                        'priority',
                        'priority_flag',
                        'task_deadline',
                        'task_description',
                        'missed_deadline',
                    ],
                },
            ],
            order: [
                ['column', 'ASC'], // Arrange by column (status)  
                [{ model: Tasks, as: 'task' }, 'priority_flag', 'DESC'],
                ['position', 'ASC'],
            ],
        });

        if (!userTasks || userTasks.length === 0) {
            return res.status(200).json({
                message: "No tasks found for the user's Kanban board",
                data: {
                    Todo: [],
                    InProgress: [],
                    InReview: [],
                    InChanges: [],
                    Completed: [],
                },
            });
        }

        // Structure tasks into a Kanban board format
        const kanbanBoard = {
            Todo: [],
            InProgress: [],
            InReview: [],
            InChanges: [],
            Completed: [],
        };

        userTasks.forEach((entry) => {
            const taskData = {
                task_id: entry.task?.task_id || null,
                task_name: entry.task?.task_name || 'N/A',
                status: entry.task?.status || 'N/A',
                priority: entry.task?.priority || 'N/A',
                priority_flag: entry.task?.priority_flag || 'No-Priority',
                missed_deadline: entry.task?.missed_deadline || false,
                task_description: entry.task?.task_description || 'N/A',
                position: entry.position,
                end_date: entry.task?.task_deadline || 'N/A',
                assignee_name: `${entry.task?.assignee?.first_name || 'N/A'} ${entry.task?.assignee?.last_name || ''}`.trim(),
                assignee_email: entry.task?.assignee?.email || 'N/A',
                profile_image: entry.task?.assignee?.profileImage?.image_url || null,
                project_name: entry.task?.project?.project_name || 'N/A',
                brand_name: entry.task?.project?.brand?.brand_name || 'N/A',
            };

            // Add the task to the appropriate column based on its status
            if (kanbanBoard[entry.column]) {
                kanbanBoard[entry.column].push(taskData);
            }
        });

        Object.keys(kanbanBoard).forEach((column) => {
            kanbanBoard[column].sort((a, b) => {
                const priorityOrder = b.priority_flag.localeCompare(a.priority_flag);
                return priorityOrder !== 0 ? priorityOrder : a.position - b.position;
            });
        });


        res.status(200).json({
            message: "Tasks fetched successfully for the user's Kanban board",
            data: kanbanBoard,
        });
    } catch (error) {
        console.error('Error fetching tasks for Kanban board:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

//*---------------------------------------------------Fetch Specific Task by ID ----------------------------------------*/

// Fetch task and its subtasks
router.get('/fetchspecifictask/:taskId', authenticateToken, async (req, res) => {
    const { taskId } = req.params;

    try {
        const task = await Tasks.findOne({
            where: { task_id: taskId },
            include: [
                {
                    model: Projects,
                    as: 'project',
                    attributes: ['project_name'],
                    include: {
                        model: Brand,
                        as: 'brand',
                        attributes: ['brand_name']
                    }
                },
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['first_name', 'last_name', 'email'],
                    include: {
                        model: ProfileImage,
                        as: 'profileImage',
                        attributes: ['image_url']
                    }
                },
                {
                    model: Subtask,
                    as: 'subtasks',
                    attributes: [
                        'subtask_id',
                        'subtask_name',
                        'sub_task_description',
                        'status',
                        'priority',
                        'sub_task_startdate',
                        'sub_task_deadline',
                        'missed_deadline'
                    ],
                    include: {
                        model: ProjectUserRole,
                        as: 'projectRole',
                        attributes: ['project_role_name']
                    }
                }
            ]
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json(task);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

//*---------------------------------------fetch Specific Task and subtask for duplication ---------------------------------------*//
router.get('/fetchtaskforedit/:taskId', async (req, res) => {
    const { taskId } = req.params;

    try {
        // Fetch tasks and their subtasks with all fields
        const tasks = await Tasks.findAll({
            where: { task_id: taskId },
        });

        // Check if tasks exist
        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: 'No tasks found for the given task ID' });
        }

        // Send the response
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


router.get('/fetchsubtaskforedit/:subtask_id', async (req, res) => {
    const { subtask_id } = req.params;

    try {
        // Fetch tasks and their subtasks with all fields
        const subtask = await Subtask.findAll({
            where: { subtask_id: subtask_id },
        });

        // Check if tasks exist
        if (!subtask || subtask.length === 0) {
            return res.status(404).json({ message: 'No subtask found' });
        }

        // Send the response
        res.status(200).json(subtask);
    } catch (error) {
        console.error('Error fetching subtask:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});




//*--------------------------------------------------Duplicate Task API-----------------------------------------------------*//

router.post('/duplicate-task', authenticateToken, async (req, res) => {
    const {
        task_id,         // ID of the task to duplicate
        task_startdate,  // New start date for the duplicated task
        task_deadline,   // New deadline for the duplicated task
        task_user_id     // New user assigned to the duplicated task
    } = req.body;

    let transaction;

    try {
        // Start a new transaction
        transaction = await sequelize.transaction();

        // Step 1: Fetch the original task by ID
        const originalTask = await Tasks.findByPk(task_id);

        if (!originalTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Step 2: Create a duplicate of the task with user-provided details
        const duplicatedTask = await Tasks.create({
            project_id: originalTask.project_id,
            brand_id: originalTask.brand_id,
            task_user_id, // New user assigned
            task_name: `${originalTask.task_name} (Copy)`, // Append '(Copy)' to the task name
            task_description: originalTask.task_description,
            task_startdate, // User-provided start date
            task_deadline,  // User-provided deadline
            priority: originalTask.priority,
            status: 'Todo' // Default status is 'Todo'
        }, { transaction });

        // Step 3: Fetch all users who should have access to the task
        const users = await User.findAll({
            attributes: ['user_id', 'user_type'], // Fetch user_id and user_type
            where: {
                user_type: {
                    [Op.in]: [ // Reference Sequelize Op.in
                        'Founder',
                        'Admin',
                        'SuperAdmin',
                        'HumanResource',
                        'Department_Head',
                        'Task_manager'

                    ]
                }
            }
        });

        // Convert user list to a set to avoid duplicates
        const userIds = new Set(users.map(user => user.user_id));

        // Ensure the task_user_id is included in the list
        userIds.add(task_user_id);

        // Step 4: Add task positions for each user
        for (const id of userIds) {
            // Fetch all existing positions in the 'Todo' column for the current user
            const existingPositions = await UserTaskPositions.findAll({
                where: {
                    user_id: id,
                    column: 'Todo'
                },
                attributes: ['position'],
                order: [['position', 'ASC']]
            });

            let position = 1; // Start with position 1
            if (existingPositions.length > 0) {
                // Find the first gap in the sequence of positions
                const positionSet = new Set(existingPositions.map(pos => pos.position));
                while (positionSet.has(position)) {
                    position++;
                }
            }

            // Create a new task position for the user
            await UserTaskPositions.create({
                user_id: id,
                task_id: duplicatedTask.task_id,
                column: 'Todo', // Default column is 'Todo'
                position
            }, { transaction });
        }

        // Commit the transaction
        await transaction.commit();

        res.status(201).json({
            message: 'Task duplicated successfully.',
            task: duplicatedTask
        });
    } catch (error) {
        // Rollback the transaction if an error occurs
        if (transaction) await transaction.rollback();
        res.status(500).json({ error: 'Error duplicating task', details: error.message });
    } finally {
        // Ensure transaction is closed if still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


//*------------------------------------------------------Edit Task --------------------------------------------------*//
// PUT /api/tasks/:task_id
router.put('/edit-task/:task_id', authenticateToken, async (req, res) => {
    const { task_id } = req.params;
    const {
        task_name,
        task_description,
        task_startdate,
        task_deadline,
        task_user_id,
        missed_deadline,
        status,
        priority,
        is_active,
        on_hold,
        priority_flag
    } = req.body;

    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        // Find the task by ID
        const task = await Tasks.findByPk(task_id, { transaction });
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Update the task with the provided data
        await task.update(
            {
                task_name,
                task_description,
                task_startdate,
                task_deadline,
                task_user_id,
                missed_deadline,
                status,
                priority,
                is_active,
                on_hold,
                priority_flag
            },
            { transaction }
        );

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({
            message: 'Task updated successfully',
            task
        });
    } catch (error) {
        // Rollback the transaction in case of error
        if (transaction) await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Failed to update task', error: error.message });
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


//*---------------------------------------------------Subtask Add Edit Delete Api ---------------------------------------------------*//
// POST /api/subtasks
router.post('/subtask_add', authenticateToken, async (req, res) => {
    const {
        subtask_name,
        task_id,
        project_id,
        brand_id,
        project_role_id,
        sub_task_description,
        sub_task_startdate,
        sub_task_deadline,
        sub_task_user_id,
        missed_deadline,
        status,
        priority,
        is_active,
        on_hold,
        priority_flag
    } = req.body;

    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        // Create a new subtask
        const newSubtask = await Subtask.create(
            {
                subtask_name,
                task_id,
                project_id,
                brand_id,
                project_role_id,
                sub_task_description,
                sub_task_startdate,
                sub_task_deadline,
                sub_task_user_id,
                missed_deadline,
                status,
                priority,
                is_active,
                on_hold,
                priority_flag
            },
            { transaction }
        );

        // Commit the transaction
        await transaction.commit();

        res.status(201).json({ message: 'Subtask created successfully', subtask: newSubtask });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Failed to create subtask', error: error.message });
    }
    finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// PUT /api/subtasks/:subtask_id
router.put('/subtask_edit/:subtask_id', authenticateToken, async (req, res) => {
    const { subtask_id } = req.params;
    const {
        subtask_name,
        sub_task_description,
        sub_task_startdate,
        sub_task_deadline,
        sub_task_user_id,
        missed_deadline,
        status,
        priority,
        is_active,
        on_hold,
        priority_flag
    } = req.body;

    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        // Find the subtask by ID
        const subtask = await Subtask.findByPk(subtask_id, { transaction });
        if (!subtask) {
            return res.status(404).json({ message: 'Subtask not found' });
        }

        // Update the subtask
        await subtask.update(
            {
                subtask_name,
                sub_task_description,
                sub_task_startdate,
                sub_task_deadline,
                sub_task_user_id,
                missed_deadline,
                status,
                priority,
                is_active,
                on_hold,
                priority_flag
            },
            { transaction }
        );

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({ message: 'Subtask updated successfully', subtask });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Failed to update subtask', error: error.message });
    }
    finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


//*-------------------------------------------Subtask Status Change-------------------------------------------------*//
// PUT /api/subtasks/:subtask_id/status
router.put('/subtasks/:subtask_id/status', authenticateToken, async (req, res) => {
    const { subtask_id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        // Find the subtask by ID
        const subtask = await Subtask.findByPk(subtask_id, { transaction });
        if (!subtask) {
            return res.status(404).json({ message: 'Subtask not found' });
        }

        // Update only the status
        subtask.status = status;
        await subtask.save({ transaction });

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({ message: 'Subtask status updated successfully', subtask });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error(error);
        res.status(500).json({ message: 'Failed to update subtask status', error: error.message });
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


//*-------------------------------------------------task log Status-----------------------------------------------------*//
router.get('/task-logs/:task_id', authenticateToken, async (req, res) => {
    const { task_id } = req.params;

    if (!task_id) {
        return res.status(400).json({ error: 'Task ID is required.' });
    }

    try {
        const taskLogs = await TaskStatusLogger.findAll({
            where: { task_id },
            include: [
                {
                    model: User,
                    as: 'user', // Ensure this alias matches the defined association
                    attributes: ['first_name', 'last_name'], // Fetch necessary fields
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage', // Alias for ProfileImage
                            attributes: ['image_url'], // Fetch only the image URL
                        },
                    ],
                },
            ],
            order: [['time_stamp', 'DESC']], // Sort by timestamp in descending order
        });

        res.status(200).json({
            message: 'Task logs retrieved successfully.',
            task_id,
            logs: taskLogs || [], // Return an empty array if no logs are found
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch task logs.',
            details: error.message,
        });
    }
});


//fetch all task specific to a project --------------------------------------------------*//

// Fetch tasks by project_id, include user and profile image data, and count tasks by status
router.get('/fetch-project-all-tasks', authenticateToken, async (req, res) => {
    try {
        const { project_id } = req.query;

        // Validate project_id
        if (!project_id) {
            return res.status(400).json({ message: 'Project ID is required.' });
        }

        // Fetch tasks for the given project_id
        const tasks = await Tasks.findAll({
            where: {
                project_id: project_id // Fetch all tasks for the project
            },
            include: [
                {
                    model: User,
                    as: 'assignee', // Alias defined in the association
                    attributes: ['first_name', 'last_name'], // Fetch first_name and last_name
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage', // Alias for ProfileImage
                            attributes: ['image_url'], // Fetch only image_url
                        }
                    ]
                }
            ]
        });

        // Fetch the count of tasks by status
        const taskCountByStatus = await Tasks.findAll({
            where: { project_id: project_id },
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
            group: ['status'],
            raw: true
        });

        // Prepare the response with both task data and task counts
        return res.status(200).json({
            tasks,
            taskCountByStatus
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
});




// Fetch tasks for the current week with priority flag "Priority"
router.get('/tasks/weekly-priority', authenticateToken, async (req, res) => {
    try {
        // Calculate start and end of the current week
        const startOfWeek = moment().startOf('week').toDate();
        const endOfWeek = moment().endOf('week').toDate();

        // Query tasks for the current week with the "Priority" flag
        const tasks = await Tasks.findAll({
            where: {
                task_startdate: {
                    [Op.gte]: startOfWeek,
                    [Op.lte]: endOfWeek
                },
                priority_flag: 'Priority'
            },
            include: [

                {
                    model: Projects,
                    as: 'project',
                    attributes: ['project_id', 'project_name', 'lead_id'], // Include relevant project attributes
                    include: [
                        {
                            model: Brand,
                            as: 'brand',
                            attributes: ['brand_id', 'brand_name'] // Include relevant brand attributes
                        },
                        {
                            model: User,
                            as: 'lead', // Alias for project lead
                            attributes: ['user_id', 'first_name', 'last_name'], // Include lead details
                            include: [
                                {
                                    model: ProfileImage,
                                    as: 'profileImage',
                                    attributes: ['image_url'] // Include lead's profile image
                                }
                            ]
                        }
                    ]
                },
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'] // Include assignee's profile image
                        }
                    ]
                }
            ]
        });

        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        console.error('Error fetching weekly priority tasks:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching tasks.' });
    }
});




router.get('/tasks/categorized/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;

    try {
        // Define start and end of the week
        const startOfWeek = moment().startOf('week').toDate();
        const endOfWeek = moment().endOf('week').toDate();

        // Define start and end of today
        const today = moment().startOf('day').toDate();
        const endOfToday = moment().endOf('day').toDate();

        // Fetch tasks for the user and categorize them
        const tasks = await Tasks.findAll({
            where: {
                task_user_id: user_id,
                is_active: true,
            },
            include: [
                {
                    model: Projects,
                    as: 'project',
                    attributes: ['project_id', 'project_name'],
                    include: [
                        {
                            model: Brand,
                            as: 'brand',
                            attributes: ['brand_id', 'brand_name'],
                        },
                        {
                            model: User,
                            as: 'lead',
                            attributes: ['user_id', 'first_name', 'last_name'],
                            include: [
                                {
                                    model: ProfileImage,
                                    as: 'profileImage',
                                    attributes: ['image_url'],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['user_id', 'first_name', 'last_name'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'],
                        },
                    ],
                },
            ],
        });

        // Categorize tasks
        const categorizedTasks = {
            today_tasks: tasks.filter(
                (task) =>
                    moment(task.task_startdate).isBetween(today, endOfToday, null, '[]') &&
                    task.status === 'Todo'
            ),
            pending_tasks: tasks.filter(
                (task) =>
                    moment(task.task_startdate).isBetween(startOfWeek, endOfWeek, null, '[]') &&
                    ['InProgress', 'InReview', 'InChanges'].includes(task.status)
            ),
            urgent_tasks: tasks.filter(
                (task) =>
                    task.priority_flag === 'Priority' &&
                    moment(task.task_startdate).isBetween(startOfWeek, endOfWeek, null, '[]')
            ),
            missed_deadlines: tasks.filter(
                (task) =>
                    task.missed_deadline === true &&
                    moment(task.task_startdate).isBetween(startOfWeek, endOfWeek, null, '[]')
            ),
        };

        res.status(200).json({ success: true, data: categorizedTasks });
    } catch (error) {
        console.error('Error fetching categorized tasks:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching tasks.' });
    }
});







module.exports = router;
