const express = require('express');
const sequelize = require('../config/database'); // Adjust the path as needed
const { Op } = require('sequelize');
const LeaveType = require('../Models/LeaveType');
const Role = require('../Models/Role');
const LeaveBalance = require('../Models/LeaveBalance');
const User = require('../Models/User');
const LeaveRequest = require('../Models/LeaveRequest');
const ProfileImage = require('../Models/ProfileImage');
const JoiningDate = require('../Models/JoiningDate');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

// API to add multiple leave types with transaction
router.post('/add-leave-types', authenticateToken, async (req, res) => {
    const { leaveTypes } = req.body;

    if (!Array.isArray(leaveTypes) || leaveTypes.length === 0) {
        return res.status(400).json({ message: 'Invalid input, provide an array of leave types.' });
    }

    let transaction;

    try {
        // Start a new transaction
        transaction = await sequelize.transaction();

        // Add leave types in a loop within the transaction
        const createdLeaveTypes = await Promise.all(
            leaveTypes.map(async (leaveType) => {
                const { name, description, total_days, Role_id, accrual_type } = leaveType;

                if (!name || !Role_id || !accrual_type) {
                    throw new Error(`Missing required fields for leave type: ${JSON.stringify(leaveType)}`);
                }

                // Validate accrual_type value
                if (!['MonthlyAquired', 'YearlyAquired'].includes(accrual_type)) {
                    throw new Error(`Invalid accrual_type value for leave type: ${JSON.stringify(leaveType)}`);
                }

                // Create the leave type
                const newLeaveType = await LeaveType.create(
                    {
                        name,
                        description,
                        total_days,
                        Role_id,
                        accrual_type,
                    },
                    { transaction } // Pass the transaction object
                );

                // Fetch all users with the specified Role_id
                const users = await User.findAll({
                    where: { Role_id },
                    transaction, // Use the same transaction
                });

                // Ensure LeaveBalance is created for each user
                await Promise.all(
                    users.map(async (user) => {
                        // Check if LeaveBalance already exists for this user and leave type
                        const existingLeaveBalance = await LeaveBalance.findOne({
                            where: {
                                user_id: user.user_id,
                                leave_type_id: newLeaveType.Leave_type_Id,
                            },
                            transaction, // Use the same transaction
                        });

                        if (!existingLeaveBalance) {
                            // Create LeaveBalance with initial values
                            await LeaveBalance.create(
                                {
                                    user_id: user.user_id,
                                    leave_type_id: newLeaveType.Leave_type_Id,
                                    name: newLeaveType.name,
                                    total_days: newLeaveType.total_days,
                                    earned_days: accrual_type === 'YearlyAquired' ? newLeaveType.total_days : 0,
                                    arrear_days: 0,
                                },
                                { transaction }
                            );
                        } else if (accrual_type === 'YearlyAquired') {
                            // Update the earned_days for YearlyAquired leave types
                            existingLeaveBalance.earned_days += newLeaveType.total_days;
                            await existingLeaveBalance.save({ transaction });
                        }
                    })
                );

                return newLeaveType;
            })
        );

        // Commit the transaction if everything is successful
        await transaction.commit();

        res.status(201).json({
            message: 'Leave types added successfully!',
            leaveTypes: createdLeaveTypes,
        });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error('Error adding leave types:', error);
        res.status(500).json({ message: 'An error occurred while adding leave types.', error: error.message });
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});




// API to get all leave types with associated roles
router.get('/get-all-leave-types', authenticateToken, async (req, res) => {
    try {
        const leaveTypes = await LeaveType.findAll({
            include: [
                {
                    model: Role,
                    as: 'role', // Alias defined in the association
                    attributes: ['Role_id', 'role_name'], // Only fetch Role_id and role_name
                },
            ],
        });
        res.status(200).json(leaveTypes);
    } catch (error) {
        console.error('Error fetching leave types with roles:', error);
        res.status(500).json({
            message: 'Failed to fetch leave types with roles.',
            error: error.message
        });
    }
});


// API to update a leave type
router.put('/update-leave-type/:id', authenticateToken, async (req, res) => {
    const { id } = req.params; // Leave type ID from URL
    const { name, description, total_days, Role_id, accrual_type } = req.body; // Updated fields
    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        // Validate if leave type exists
        const leaveType = await LeaveType.findByPk(id, { transaction });
        if (!leaveType) {
            return res.status(404).json({
                success: false,
                message: 'Leave type not found',
            });
        }

        // Validate accrual_type value
        if (accrual_type && !['MonthlyAquired', 'YearlyAquired'].includes(accrual_type)) {
            throw new Error(`Invalid accrual_type value: ${accrual_type}`);
        }

        // Check if `accrual_type` is being updated and take necessary actions
        const wasYearlyAquired = leaveType.accrual_type === 'YearlyAquired';
        const isYearlyAquired = accrual_type === 'YearlyAquired';

        // Update leave type
        await leaveType.update(
            { name, description, total_days, Role_id, accrual_type },
            { transaction }
        );

        // Update LeaveBalance for associated users
        const leaveBalances = await LeaveBalance.findAll({
            where: { leave_type_id: id },
            transaction,
        });

        await Promise.all(
            leaveBalances.map(async (leaveBalance) => {
                // Update `name` and `total_days`
                leaveBalance.name = name;
                leaveBalance.total_days = total_days;

                // If switching to `YearlyAquired`, add `total_days` to `earned_days`
                if (isYearlyAquired && wasYearlyAquired) {
                    leaveBalance.earned_days = total_days;
                }
                // If switching from `YearlyAquired`, adjust `earned_days` (optional logic based on your app's behavior)

                // Save the updated LeaveBalance
                await leaveBalance.save({ transaction });
            })
        );

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Leave type updated successfully',
            data: leaveType,
        });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error('Error updating leave type:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update leave type',
            error: error.message,
        });
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});






// Fetch leave balance and leave type name by user_id
router.get('/fetch-leave-balances/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
        // Fetch user's role based on user_id
        const user = await User.findByPk(user_id, {
            attributes: ['Role_id'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const roleId = user.Role_id;

        // Fetch applicable leave types for the user's role
        const leaveTypes = await LeaveType.findAll({
            where: { Role_id: roleId },
            attributes: ['Leave_type_Id', 'name', 'accrual_type', 'total_days'],
        });

        if (!leaveTypes.length) {
            return res.status(404).json({ message: 'No leave types found for the user\'s role.' });
        }

        // Fetch leave balances for the user
        const leaveBalances = await LeaveBalance.findAll({
            where: { user_id },
            attributes: ['leave_balance_id', 'leave_type_id', 'earned_days'],
        });

        // Combine leave types with balances
        const leaveData = leaveTypes.map((leaveType) => {
            const userBalance = leaveBalances.find(
                (balance) => balance.leave_type_id === leaveType.Leave_type_Id
            );

            return {
                leave_type_id: leaveType.Leave_type_Id,
                name: leaveType.name,
                accrual_type: leaveType.accrual_type,
                total_days: userBalance ? userBalance.earned_days : 0,
            };
        });

        res.status(200).json(leaveData);
    } catch (error) {
        console.error('Error fetching leave balances:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});



router.post('/add-leave', authenticateToken, async (req, res) => {
    const { user_id, Leave_type_Id, dates, Total_days, reason } = req.body;

    let transaction;

    try {
        // Start the transaction
        transaction = await sequelize.transaction();

        // Fetch all existing leave requests for the user
        const existingLeaves = await LeaveRequest.findAll({
            where: { user_id },
            transaction,
        });

        // Check for overlapping dates
        const requestedDatesSet = new Set(dates);
        for (const leave of existingLeaves) {
            const existingDates = JSON.parse(leave.dates); // Parse the JSON string into an array
            const existingDatesSet = new Set(existingDates);

            // Check if there's any intersection between the requested and existing dates
            for (const date of requestedDatesSet) {
                if (existingDatesSet.has(date)) {
                    throw new Error(
                        `You already have a leave request for one or more of the requested dates: ${date}.`
                    );
                }
            }
        }

        // Fetch the leave type to validate
        const leaveType = await LeaveType.findOne({
            where: { Leave_type_Id },
            transaction,
        });

        if (!leaveType) {
            throw new Error('Invalid leave type');
        }

        // Fetch the leave balance
        const leaveBalance = await LeaveBalance.findOne({
            where: {
                leave_type_id: Leave_type_Id,
                user_id,
            },
            transaction,
        });

        if (!leaveBalance || leaveBalance.earned_days <= 0) {
            throw new Error('Insufficient leave balance for the selected leave type');
        }

        // Check if requested days exceed the balance
        if (Total_days > leaveBalance.earned_days) {
            throw new Error(
                `Requested leave days exceed available balance. You have ${leaveBalance.earned_days} day(s) remaining.`
            );
        }

        // Deduct the leave days from the balance
        leaveBalance.earned_days -= Total_days;
        await leaveBalance.save({ transaction });

        // Create the leave request
        const leaveRequest = await LeaveRequest.create(
            {
                Leave_type_Id,
                user_id,
                dates: JSON.stringify(dates), // Convert dates to JSON
                Total_days,
                reason,
                Status: 'Pending', // Default status
            },
            { transaction }
        );

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Leave request added successfully',
        });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error('Error adding leave request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add leave request',
            error: error.message,
        });
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});













router.delete('/delete-leave', authenticateToken, async (req, res) => {
    const { Leave_request_id, user_id } = req.body;

    let transaction;

    try {
        // Start the transaction
        transaction = await sequelize.transaction();

        // Fetch the leave request
        const leaveRequest = await LeaveRequest.findOne({
            where: {
                Leave_request_id,
                user_id,
                Status: 'Pending', // Only allow deletion if the status is Pending
            },
            transaction,
        });

        if (!leaveRequest) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found or is not in Pending status',
            });
        }

        // Restore the leave balance
        const leaveBalance = await LeaveBalance.findOne({
            where: {
                leave_type_id: leaveRequest.Leave_type_Id,
                user_id,
            },
            transaction,
        });

        if (leaveBalance) {
            leaveBalance.earned_days += leaveRequest.Total_days; // Restore the leave balance
            await leaveBalance.save({ transaction });
        }

        // Delete the leave request
        await LeaveRequest.destroy({
            where: { Leave_request_id },
            transaction,
        });

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Leave request deleted successfully',
        });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error('Error deleting leave request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete leave request',
            error: error.message,
        });
    }
    finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});







router.put('/update-leave-status', authenticateToken, async (req, res) => {
    const { Leave_request_id, Approved_By, Status, Comment } = req.body;

    if (!['Approved', 'Rejected'].includes(Status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid status. Status must be 'Approved' or 'Rejected'.",
        });
    }

    let transaction;

    try {
        // Start the transaction
        transaction = await sequelize.transaction();

        // Fetch the leave request
        const leaveRequest = await LeaveRequest.findOne({
            where: {
                Leave_request_id,
                Status: 'Pending', // Only allow updates for pending requests
            },
            transaction,
        });

        if (!leaveRequest) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found or is not in Pending status',
            });
        }

        // Handle status change
        if (Status === 'Rejected') {
            // Restore leave balance
            const leaveBalance = await LeaveBalance.findOne({
                where: {
                    leave_type_id: leaveRequest.Leave_type_Id,
                    user_id: leaveRequest.user_id,
                },
                transaction,
            });

            if (leaveBalance) {
                leaveBalance.earned_days += leaveRequest.Total_days;
                await leaveBalance.save({ transaction });
            }
        }

        // Update the leave request
        leaveRequest.Status = Status;
        leaveRequest.Approved_By = Approved_By || leaveRequest.Approved_By;
        leaveRequest.Comment = Comment || leaveRequest.Comment;

        await leaveRequest.save({ transaction });

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: `Leave request has been ${Status.toLowerCase()} successfully.`,
        });
    } catch (error) {
        // Rollback the transaction in case of an error
        if (transaction) await transaction.rollback();
        console.error('Error updating leave status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update leave status',
            error: error.message,
        });
    } finally {
        // Ensure the transaction is properly closed
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});






router.get('/leave-requests-by-status', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, search_query } = req.query;

        // Build the filtering conditions for leave requests
        const whereConditions = {};

        if (start_date && end_date) {
            whereConditions.updatedAt = {
                [Op.between]: [new Date(start_date), new Date(end_date)],
            };
        }

        const userWhereConditions = {};
        if (search_query) {
            userWhereConditions[Op.or] = [
                { first_name: { [Op.like]: `%${search_query}%` } },
                { last_name: { [Op.like]: `%${search_query}%` } },
            ];
        }

        const leaveRequests = await LeaveRequest.findAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'requestor',
                    attributes: ['User_id', 'first_name', 'last_name', 'email'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage',
                            attributes: ['image_url'],
                        },
                    ],
                    where: userWhereConditions,
                },
                {
                    model: User,
                    as: 'approver',
                    attributes: ['User_id', 'first_name', 'last_name', 'email'],
                },
                {
                    model: LeaveType,
                    as: 'leaveType',
                    attributes: ['name', 'description'],
                },
            ],
            order: [['Status', 'ASC'], ['createdAt', 'DESC']],
        });

        const groupedRequests = {
            Pending: [],
            Approved: [],
            Rejected: [],
        };

        leaveRequests.forEach((request) => {
            groupedRequests[request.Status].push(request);
        });

        res.status(200).json({
            success: true,
            data: groupedRequests,
        });
    } catch (error) {
        console.error('Error fetching leave requests by status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave requests',
            error: error.message,
        });
    }
});









router.get('/leave-requests/user/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;
    const { start_date, end_date } = req.query;

    try {
        // Build the filtering condition for the JSON dates array
        const whereConditions = { user_id };

        if (start_date && end_date) {
            // Add date range filter based on updatedAt
            whereConditions.updatedAt = {
                [Op.between]: [new Date(start_date), new Date(end_date)],
            };
        }


        // Fetch leave requests for a specific user
        const leaveRequests = await LeaveRequest.findAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'requestor', // Requester details
                    attributes: ['User_id', 'first_name', 'last_name', 'email'],
                    include: [
                        {
                            model: ProfileImage,
                            as: 'profileImage', // Profile image of the requester
                            attributes: ['image_url'], // Include the profile image URL
                        },
                    ],
                },
                {
                    model: User,
                    as: 'approver', // Approver details
                    attributes: ['User_id', 'first_name', 'last_name', 'email'],
                },
                {
                    model: LeaveType,
                    as: 'leaveType', // Leave type details
                    attributes: ['name', 'description'],
                },
            ],
            order: [['Status', 'ASC'], ['createdAt', 'DESC']], // Sort by status and creation date
        });

        // Group leave requests by status
        const groupedRequests = {
            Pending: [],
            Approved: [],
            Rejected: [],
        };

        leaveRequests.forEach((request) => {
            groupedRequests[request.Status].push(request);
        });

        res.status(200).json({
            success: true,
            data: groupedRequests,
        });
    } catch (error) {
        console.error('Error fetching leave requests for user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave requests',
            error: error.message,
        });
    }
});



// api to display user leave balances
// API to fetch leave balance by user_id
router.get('/fetch-user-leave-balances/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;

    try {
        // Fetch leave balances for the given user_id with associated leave type details
        const leaveBalances = await LeaveBalance.findAll({
            where: { user_id },
            include: [
                {
                    model: LeaveType, // Include the LeaveType model to fetch leave type details
                    as: 'leaveType', 
                    attributes: ['Leave_type_Id', 'name', 'accrual_type'], // Adjust attributes as needed
                },
            ],
        });

        if (!leaveBalances || leaveBalances.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No leave balances found for the specified user.',
            });
        }

        // Return leave balances
        res.status(200).json({
            success: true,
            data: leaveBalances,
        });
    } catch (error) {
        console.error('Error fetching leave balance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave balances.',
            error: error.message,
        });
    }
});





// // API to fetch all leave balances grouped by users
router.get('/fetch-all-leave-balances-for-adjustment', authenticateToken, async (req, res) => {
    try {
      // Fetch all leave balances with user details and profile images
      const users = await User.findAll({
        where: {
            Is_active: true, // Fetch only active users
            user_type: {
              [Op.in]: [
                'HumanResource',
                'Accounts',
                'Department_Head',
                'Employee',
                'Social_Media_Manager',
                'Task_manager',
              ],
            },
          },
        attributes: ['user_id', 'first_name', 'last_name'], // Include necessary fields
        include: [
          {
            model: ProfileImage,
            as: 'profileImage',
            attributes: ['image_url'], // Fetch profile image if available
          },
          {
            model: JoiningDate,
            as: 'joiningDates', // Ensure the alias matches your model definition
            attributes: ['joining_date'], // Fetch relevant fieldss
        },
          {
            model: LeaveBalance,
            as: 'leaveBalances',
            attributes: ['leave_balance_id', 'total_days', 'earned_days', 'arrear_days'], // Include leave balance details
            include: [
              {
                model: LeaveType,
                as: 'leaveType',
                attributes: ['name'], // Include leave type name
              },
            ],
          },
        ],
      });
  
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Error fetching users with leave balances:', error.message || error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave balances. Please try again later.',
      });
    }
  });
  



  router.put('/update-arrear-days', async (req, res) => {
    const { leave_balance_id, arrear_days } = req.body;
  
    if (!leave_balance_id || arrear_days === undefined) {
      return res.status(400).json({
        success: false,
        message: 'balance_id and arrear_days are required.',
      });
    }
  
    let transaction;
  
    try {
      // Start a new transaction
      transaction = await sequelize.transaction();
  
      // Find the LeaveBalance entry
      const leaveBalance = await LeaveBalance.findByPk(leave_balance_id, { transaction });
  
      if (!leaveBalance) {
        await transaction.rollback(); // Rollback transaction if record not found
        return res.status(404).json({
          success: false,
          message: 'Leave balance not found.',
        });
      }
  
      // Update arrear_days
      leaveBalance.arrear_days = arrear_days;
      await leaveBalance.save({ transaction });
  
      // Commit the transaction
      await transaction.commit();
  
      return res.status(200).json({
        success: true,
        message: 'Arrear days updated successfully.',
        data: leaveBalance,
      });
    } catch (error) {
      // Rollback the transaction in case of an error
      if (transaction) await transaction.rollback();
      console.error('Error updating arrear days:', error.message || error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update arrear days. Please try again later.',
      });
    } finally {
      // Ensure the transaction is properly closed
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    }
  });




module.exports = router;