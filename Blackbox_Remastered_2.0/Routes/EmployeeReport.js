const express = require('express');
const User = require('../Models/User');
const Role = require('../Models/Role');
const UserDetails = require('../Models/UserDetails'); // Adjust the path as necessary
const JoiningDate = require('../Models/JoiningDate'); // Adjust the path as necessary
const UserTime = require('../Models/Usertime'); // Adjust the path as necessary
const ProfileImage = require('../Models/ProfileImage'); // Adjust the path as necessary
const Overtime = require('../Models/Overtime');
const { authenticateToken } = require('../middleware/authMiddleware');
require('dotenv').config();
const router = express.Router();
const sequelize = require('../config/database');
const { Op, fn, col, literal } = require('sequelize');
const Attendance = require('../Models/Attendance');
const LeaveType = require('../Models/LeaveType');
const LeaveBalance = require('../Models/LeaveBalance');
const LeaveRequest = require('../Models/LeaveRequest');
const Tasks = require('../Models/Tasks');
const moment = require('moment');

router.get('/Employee-report-attendance', authenticateToken, async (req, res) => {
    const { userId, month, year } = req.query;

    if (!userId || !month || !year) {
        return res.status(400).json({ message: 'userId, month, and year are required' });
    }

    try {
        // Parse month and year
        const startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
        const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');
        const isCurrentMonth = moment().isSame(moment(startDate), 'month');

        // Fetch user details excluding overtime
        const userDetails = await User.findOne({
            where: { user_id: userId },
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: ProfileImage,
                    as: 'profileImage', // Alias for ProfileImage
                    attributes: ['image_url'], // Fetch only image_url
                },
                {
                    model: Role,
                    as: 'role',
                    attributes: ['role_name'],
                },
                {
                    model: UserTime,
                    as: 'userTimes',
                    attributes: ['start_time', 'createdAt', 'updatedAt'],
                },
                {
                    model: JoiningDate,
                    as: 'joiningDates',
                    attributes: ['joining_date', 'createdAt', 'updatedAt'],
                },
                {
                    model: Attendance,
                    as: 'attendances',
                    attributes: ['date', 'checkin_status', 'start_time', 'end_time', 'total_time', 'Attendance_status'],
                    where: {
                        date: {
                            [Op.between]: [startDate, endDate],
                        },
                    },
                    required: false, // Allow LEFT JOIN for attendance
                },
            ],
        });

        if (!userDetails) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { attendances, userTimes } = userDetails;
        const startTime = userTimes?.[0]?.start_time || '09:00:00';

        // Calculate statistics
        const totalDaysInMonth = moment(startDate).daysInMonth();
        const weekdays = [...Array(totalDaysInMonth).keys()].map((i) =>
            moment(startDate).add(i, 'days')
        );
        const workingDays = weekdays.filter(
            (date) => ![0, 6].includes(date.day()) // Exclude weekends (Sunday: 0, Saturday: 6)
        );

        const totalPresentDays = attendances.length;
        const totalAbsentDays =
            isCurrentMonth
                ? workingDays.filter((date) => date.isBefore(moment()) && !attendances.some((att) => att.date === date.format('YYYY-MM-DD'))).length
                : workingDays.length - totalPresentDays;

        const totalLateCount = attendances.filter(
            (attendance) => attendance.start_time > startTime
        ).length;

        res.status(200).json({
            userDetails,
            totalDaysInMonth,
            totalPresentDays,
            totalAbsentDays,
            totalLateCount,


        });
    } catch (error) {
        console.error(`Error fetching user details: ${error.message}`);
        res.status(500).json({ message: 'Error fetching user details', error: error.message });
    }
});




router.get('/fetch-user-leave-balances/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;

    try {
        // Get the current year
        const currentYear = new Date().getFullYear();

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

        // Fetch total leave count taken for each leave type (for the current year, excluding pending/rejected leaves)
        const leaveCounts = await LeaveRequest.findAll({
            where: {
                user_id,
                Status: 'Approved', // Exclude pending or rejected leave
                createdAt: { // Filter for the current year
                    [Op.between]: [
                        `${currentYear}-01-01 00:00:00`,
                        `${currentYear}-12-31 23:59:59`,
                    ],
                },
            },
            attributes: [
                'Leave_type_Id',
                [sequelize.fn('SUM', sequelize.col('Total_days')), 'leaveTaken'], // Aggregate total days
            ],
            group: ['Leave_type_Id'], // Group by leave type
            raw: true, // Return plain objects instead of Sequelize instances
        });

        // Map leave counts by Leave_type_Id for easy reference
        const leaveCountsMap = leaveCounts.reduce((acc, leave) => {
            acc[leave.Leave_type_Id] = parseInt(leave.leaveTaken, 10) || 0;
            return acc;
        }, {});

        // Format leave balances to match desired structure
        const formattedBalances = leaveBalances.map((balance) => ({
            LeaveType: balance.leaveType.name || 'Unknown', // Leave type name
            Total: balance.total_days || 0, // Total leave balance
            Earned: balance.earned_days || 0, // Earned leave (if applicable)
            LeaveTaken: leaveCountsMap[balance.leave_type_id] || 0, // Leave taken
        }));

        // Return leave balances in the desired structure
        res.status(200).json({
            success: true,
            data: formattedBalances,
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


// Month name mapping
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

router.get('/fetch-task-stats/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({
            success: false,
            message: "Month and year query parameters are required.",
        });
    }

    try {
        // Start and end dates for the selected month and year
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Fetch task count by status for the given month, year, and user
        const taskCountsByStatus = await Tasks.findAll({
            where: {
                task_user_id: user_id,
                task_startdate: {
                    [Op.between]: [startDate, endDate],
                },
            },
            attributes: [
                'status',
                [fn('COUNT', col('status')), 'statusCount'],
            ],
            group: ['status'],
            raw: true,
        });

        // Fetch missed and on-time task counts for the given month
        const missedAndOnTimeCounts = await Tasks.findAll({
            where: {
                task_user_id: user_id,
                task_startdate: {
                    [Op.between]: [startDate, endDate],
                },
            },
            attributes: [
                [sequelize.literal(`SUM(CASE WHEN missed_deadline = true THEN 1 ELSE 0 END)`), 'missedCount'],
                [sequelize.literal(`SUM(CASE WHEN missed_deadline = false THEN 1 ELSE 0 END)`), 'onTimeCount'],
            ],
            raw: true,
        });

        // Fetch all tasks of the year for the given user, grouped by month
        const tasksByMonth = await Tasks.findAll({
            where: {
                task_user_id: user_id,
                task_startdate: {
                    [Op.between]: [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59)],
                },
            },
            attributes: [
                [sequelize.literal(`MONTH(task_startdate)`), 'month'],
                [fn('COUNT', col('task_id')), 'totalTasks'],
                [fn('SUM', sequelize.literal('NOT missed_deadline')), 'successfulTasks'],
            ],
            group: [sequelize.literal(`MONTH(task_startdate)`)],
            raw: true,
        });

        // Calculate yearly totals for conversion rate
        const yearlyTotals = tasksByMonth.reduce(
            (acc, monthData) => {
                acc.totalTasks += parseInt(monthData.totalTasks, 10);
                acc.successfulTasks += parseInt(monthData.successfulTasks, 10);
                return acc;
            },
            { totalTasks: 0, successfulTasks: 0 }
        );

        // Yearly conversion rate
        const yearlyConversionRate = yearlyTotals.totalTasks > 0
            ? ((yearlyTotals.successfulTasks / yearlyTotals.totalTasks) * 100).toFixed(2)
            : '0.00';

        // Map month numbers to names and calculate monthly conversion rates
        const conversionRates = tasksByMonth.map(monthData => {
            const monthIndex = parseInt(monthData.month, 10) - 1; // Convert DB month (1-12) to array index (0-11)
            if (monthIndex < 0 || monthIndex > 11) {
                throw new Error(`Invalid month index ${monthIndex}`);
            }
            const monthName = monthNames[monthIndex];
            const totalTasks = parseInt(monthData.totalTasks, 10);
            const successfulTasks = parseInt(monthData.successfulTasks, 10);
            return {
                month: monthName,
                totalTasks,
                successfulTasks,
                conversionRate: totalTasks > 0 ? ((successfulTasks / totalTasks) * 100).toFixed(2) : '0.00',
            };
        });

        res.status(200).json({
            success: true,
            data: {
                taskCountsByStatus,        // Includes counts grouped by task status
                missedAndOnTimeCounts: missedAndOnTimeCounts[0], // Missed and on-time counts
                yearlyConversionRate,      // Yearly conversion rate
                monthlyConversionRates: conversionRates, // Monthly conversion rates
            },
        });
    } catch (error) {
        console.error('Error fetching task statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch task statistics.',
            error: error.message,
        });
    }
});






router.get('/fetch-report-users', authenticateToken, async (req, res) => {
    const { search } = req.query;

    const userTypes = ['Department_Head', 'Employee', 'Social_Media_Manager', 'Task_manager'];
    try {
        const users = await User.findAll({
            where: {
                user_type: { [Op.in]: userTypes },
                Is_active: true,
                ...(search && {
                    [Op.or]: [
                        { first_name: { [Op.like]: `%${search}%` } },
                        { last_name: { [Op.like]: `%${search}%` } },
                    ],
                }),
            },
            attributes: [
                'user_id',
                [sequelize.fn('CONCAT', sequelize.col('first_name'), ' ', sequelize.col('last_name')), 'username'],
            ],
            raw: true,
        });

        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users.', error: error.message });
    }
});


router.get('/task-stats/monthly/:userId', async (req, res) => {
    const { userId } = req.params;
  const currentYear = new Date().getFullYear();

  try {
    // Fetch all relevant data
    const allTasks = await Tasks.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('task_id')), 'total']
      ],
      where: {
        task_user_id: userId,
        createdAt: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lte]: new Date(currentYear, 11, 31)
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('createdAt'))]
    });

    const completedTasks = await Tasks.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('task_id')), 'completed']
      ],
      where: {
        task_user_id: userId,
        status: 'Completed',
        createdAt: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lte]: new Date(currentYear, 11, 31)
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('createdAt'))]
    });

    const missedDeadlineTasks = await Tasks.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('task_id')), 'missed_deadlines']
      ],
      where: {
        task_user_id: userId,
        missed_deadline: true,
        createdAt: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lte]: new Date(currentYear, 11, 31)
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('createdAt'))]
    });

    // Helper to map data into months
    const mapDataToMonths = (data, key) => {
      const monthData = Array(12).fill(0);
      data.forEach((entry) => {
        const monthIndex = entry.dataValues.month - 1; // sequelize month starts from 1
        monthData[monthIndex] = parseInt(entry.dataValues[key], 10);
      });
      return monthData;
    };

    const totalTasksByMonth = mapDataToMonths(allTasks, 'total');
    const completedTasksByMonth = mapDataToMonths(completedTasks, 'completed');
    const missedDeadlineTasksByMonth = mapDataToMonths(missedDeadlineTasks, 'missed_deadlines');

    // Build response
    const response = monthNames.map((month, index) => ({
      month,
      total_tasks: totalTasksByMonth[index],
      completed_tasks: completedTasksByMonth[index],
      missed_deadline_tasks: missedDeadlineTasksByMonth[index]
    }));

    return res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});



module.exports = router; 