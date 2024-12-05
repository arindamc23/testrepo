const cron = require('node-cron');
const sequelize = require('../config/database'); // Adjust path to your database config
const { Op } = require('sequelize');
const LeaveBalance = require('../Models/LeaveBalance');
const JoiningDate = require('../Models/JoiningDate');
const LeaveType = require('../Models/LeaveType');
const LeaveRequest = require('../Models/LeaveRequest');
const User = require('../Models/User');

const LeaveBalanceAdjuster = () => {
  // Define the cron job to run monthly
  cron.schedule('0 0 1 * *', async () => {
    // cron.schedule('*/1 * * * *', async () => {
    console.log('Running monthly leave accrual calculation...');

    let transaction;
    try {
      // Start a transaction for safe updates
      transaction = await sequelize.transaction();

      // Fetch all leave balances for leave types with monthly accrual
      const leaveBalances = await LeaveBalance.findAll({
        include: [
          {
            model: LeaveType,
            as: 'leaveType',
            where: { accrual_type: 'MonthlyAquired' },
          },
          {
            model: User,
            as: 'user',
            include: [
              {
                model: JoiningDate,
                as: 'joiningDates', // Fetch JoiningDate for service calculation
              },
            ],
          },
        ],
        transaction,
      });

      const now = new Date();

      for (const leaveBalance of leaveBalances) {
        const { user_id, total_days, arrear_days } = leaveBalance;

        // Ensure JoiningDate is available for the user
        const joiningDate = leaveBalance.user?.joiningDates?.[0]?.joining_date;
        if (!joiningDate) {
          console.warn(`No joining date found for user_id: ${user_id}`);
          continue;
        }

        // Calculate months of service
        const joiningDateObj = new Date(joiningDate);
        const monthsOfService =
          (now.getFullYear() - joiningDateObj.getFullYear()) * 12 +
          now.getMonth() -
          joiningDateObj.getMonth();

        if (monthsOfService < 0) {
          console.warn(`Joining date is in the future for user_id: ${user_id}`);
          continue;
        }

        // Calculate earned days
        const earnedDays = Math.floor(monthsOfService * (total_days / 12)) - arrear_days;

        // Fetch pending and approved leave requests for the user
        const leaveRequests = await LeaveRequest.findAll({
          where: {
            user_id,
            Status: { [Op.in]: ['Pending', 'Approved'] }, // Consider both pending and approved leaves
          },
          attributes: ['Total_days'], // Fetch total days of leave
          transaction,
        });

        // Sum the total days for pending and approved leave requests
        const leaveDaysTaken = leaveRequests.reduce((sum, req) => sum + req.Total_days, 0);

        // Subtract leaveDaysTaken from earnedDays
        const adjustedEarnedDays = Math.max(0, earnedDays - leaveDaysTaken);

        // Update the leave balance record
        await leaveBalance.update(
          { earned_days: adjustedEarnedDays },
          { transaction }
        );

        console.log(
          `Updated earned_days for user_id: ${user_id}, leave_balance_id: ${leaveBalance.leave_balance_id}, leave_days_taken: ${leaveDaysTaken}`
        );
      }

      // Commit the transaction after all updates
      await transaction.commit();
      console.log('Monthly leave accrual calculation completed successfully.');
    } catch (error) {
      // Rollback the transaction in case of an error
      if (transaction) await transaction.rollback();
      console.error('Error during leave accrual calculation:', error);
    } finally {
      // Ensure the transaction is properly closed
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    }
  });
};

module.exports = LeaveBalanceAdjuster;


