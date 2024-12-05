const express = require('express');
const router = express.Router();
const Overtime = require('../Models/Overtime');
const ProfileImage = require('../Models/ProfileImage');
const moment = require('moment');
const User = require('../Models/User');
const { Op } = require('sequelize'); // Import Sequelize operators for queries
const sequelize = require('../config/database'); // Sequelize instance
const { authenticateToken } = require('../middleware/authMiddleware');

// POST endpoint to add overtime with SQL transaction
router.post('/add-overtime', authenticateToken, async (req, res) => {
  let transaction;

  try {
    const { user_id, start_time, end_time, total_time, ovetime_date } = req.body;

    // Validate required fields
    if (!user_id || !start_time || !end_time || !total_time || !ovetime_date) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Start transaction
    transaction = await sequelize.transaction();

    // Create a new overtime record
    const newOvertime = await Overtime.create(
      {
        user_id,
        start_time,
        end_time,
        total_time,
        status: 'Pending', // Default to 'Pending' if not provided
        ovetime_date,
      },
      { transaction } // Pass transaction instance
    );

    // Commit transaction
    await transaction.commit();

    return res.status(201).json({ message: 'Overtime record created successfully.', data: newOvertime });
  } catch (error) {
    // Rollback transaction in case of error
    if (transaction) await transaction.rollback();
    console.error('Error adding overtime record:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    // Ensure transaction is closed if still open
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
  }
});


// PUT endpoint to edit overtime if status is Pending
router.put('/edit-overtime/:overtime_id', authenticateToken, async (req, res) => {
    let transaction;
  
    try {
      const { overtime_id } = req.params;
      const { start_time, end_time, total_time, ovetime_date } = req.body;
  
      // Validate required fields
      if (!start_time || !end_time || !total_time || !ovetime_date) {
        return res.status(400).json({ message: 'Missing required fields.' });
      }
  
      // Start a transaction
      transaction = await sequelize.transaction();
  
      // Fetch the overtime record
      const overtimeRecord = await Overtime.findOne({ where: { overtime_id }, transaction });
  
      if (!overtimeRecord) {
        return res.status(404).json({ message: 'Overtime record not found.' });
      }
  
      // Allow edit only if status is Pending
      if (overtimeRecord.status !== 'Pending') {
        return res.status(400).json({ message: 'Cannot edit overtime record unless status is Pending.' });
      }
  
      // Update the overtime record
      await Overtime.update(
        {
          start_time,
          end_time,
          total_time,
          ovetime_date,
        },
        {
          where: { overtime_id },
          transaction,
        }
      );
  
      // Commit the transaction
      await transaction.commit();
  
      res.status(200).json({ message: 'Overtime record updated successfully.' });
    } catch (error) {
      // Rollback the transaction in case of error
      if (transaction) await transaction.rollback();
      console.error('Error editing overtime record:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure the transaction is closed if still open
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    }
  });




// PUT endpoint to update approval details and status
router.put('/update-overtime-status/:overtime_id', authenticateToken, async (req, res) => {
    let transaction;
  
    try {
      const { overtime_id } = req.params;
      const { approved_by, reason, status } = req.body;
  
      // Validate required fields
      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Only "Approved" or "Rejected" are allowed.' });
      }
  
      if (status === 'Rejected' && !reason) {
        return res.status(400).json({ message: 'Reason is required when rejecting an overtime request.' });
      }
  
      // Start a transaction
      transaction = await sequelize.transaction();
  
      // Fetch the overtime record
      const overtimeRecord = await Overtime.findOne({ where: { overtime_id }, transaction });
  
      if (!overtimeRecord) {
        return res.status(404).json({ message: 'Overtime record not found.' });
      }
  
      // Only allow update if status is Pending
      if (overtimeRecord.status !== 'Pending') {
        return res.status(400).json({ message: 'Cannot update overtime record unless status is Pending.' });
      }
  
      // Update the record
      await Overtime.update(
        {
          approved_by,
          reason,
          status,
        },
        {
          where: { overtime_id },
          transaction,
        }
      );
  
      // Commit the transaction
      await transaction.commit();
  
      res.status(200).json({ message: 'Overtime status updated successfully.' });
    } catch (error) {
      // Rollback the transaction in case of error
      if (transaction) await transaction.rollback();
      console.error('Error updating overtime status:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      // Ensure the transaction is closed if still open
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
    }
  });



  router.get('/allovertime', authenticateToken, async (req, res) => {
    try {
      // Extract query parameters
      const { requesterName, monthYear } = req.query;
  
      // Build a dynamic filter object
      const where = {};
  
      // Filter by requester name (combine first and last name)
      if (requesterName) {
        where[Op.or] = [
          sequelize.where(
            sequelize.fn('concat', sequelize.col('requester.first_name'), ' ', sequelize.col('requester.last_name')),
            { [Op.like]: `%${requesterName}%` }
          )
        ];
      }
  
      // Filter by month and year for overtime_date
      if (monthYear) {
        const [year, month] = monthYear.split('-'); // Extract year and month
        if (year && month) {
          where.ovetime_date = {
            [Op.and]: [
              sequelize.where(sequelize.fn('YEAR', sequelize.col('ovetime_date')), year),
              sequelize.where(sequelize.fn('MONTH', sequelize.col('ovetime_date')), month),
            ]
          };
        } else {
          return res.status(400).json({ message: 'Invalid monthYear format. Use YYYY-MM.' });
        }
      }
  
      // Fetch records with filters applied
      const overtimeRecords = await Overtime.findAll({
        where,
        include: [
          {
            model: User,
            as: 'requester', // Fetch requester details
            attributes: ['first_name', 'last_name'], // Customize fields as needed
          },
          {
            model: User,
            as: 'approver', // Fetch approver details
            attributes: ['first_name', 'last_name'], // Customize fields as needed
          },
        ],
      });
  
      // Separate records by status
      const pendingRecords = overtimeRecords.filter(record => record.status === 'Pending');
      const approvedRecords = overtimeRecords.filter(record => record.status === 'Approved');
      const rejectedRecords = overtimeRecords.filter(record => record.status === 'Rejected');
  
      // Structure the response
      res.status(200).json({
        Pending: pendingRecords,
        Approved: approvedRecords,
        Rejected: rejectedRecords,
      });
    } catch (error) {
      console.error('Error fetching overtime records:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  


  router.get('/overtime/user/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;
    const { monthYear } = req.query;
  
    try {
        // Build a dynamic filter object
        const where = { user_id };
  
        // Filter by month and year for ovetime_date
        if (monthYear) {
            const [year, month] = monthYear.split('-'); // Extract year and month
            if (year && month) {
                where.ovetime_date = {
                    [Op.and]: [
                        sequelize.where(sequelize.fn('YEAR', sequelize.col('ovetime_date')), year),
                        sequelize.where(sequelize.fn('MONTH', sequelize.col('ovetime_date')), month),
                    ],
                };
            } else {
                return res.status(400).json({ message: 'Invalid monthYear format. Use YYYY-MM.' });
            }
        }
  
        // Fetch records with filters applied
        const userOvertimeRecords = await Overtime.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'requester', // Fetch requester details
                    attributes: ['first_name', 'last_name'], // Customize fields as needed
                },
                {
                    model: User,
                    as: 'approver', // Fetch approver details
                    attributes: ['first_name', 'last_name'], // Customize fields as needed
                },
            ],
        });
  
        // Separate records by status
        const pendingRecords = userOvertimeRecords.filter(record => record.status === 'Pending');
        const approvedRecords = userOvertimeRecords.filter(record => record.status === 'Approved');
        const rejectedRecords = userOvertimeRecords.filter(record => record.status === 'Rejected');
  
        // Structure the response, even if empty
        res.status(200).json({
            Pending: pendingRecords,
            Approved: approvedRecords,
            Rejected: rejectedRecords,
        });
    } catch (error) {
        console.error('Error fetching overtime records for user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

  
  

  


  router.get('/overtime/:overtime_id', authenticateToken, async (req, res) => {
    const { overtime_id } = req.params;
  
    try {
      const overtimeRecord = await Overtime.findOne({
        where: { overtime_id },
      });
  
      if (!overtimeRecord) {
        return res.status(404).json({ message: 'Overtime record not found.' });
      }
  
      res.status(200).json(overtimeRecord);
    } catch (error) {
      console.error('Error fetching overtime record:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  




  router.get('/dashboardovertime', authenticateToken,  async (req, res) => {
    try {
      // Get the start and end dates for the current week
      const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
      const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
  
      // Fetch records with filters applied
      const overtimeRecords = await Overtime.findAll({
        where: {
          status: 'Pending', // Filter only pending records
          ovetime_date: {
            [Op.between]: [startOfWeek, endOfWeek], // Filter by the current week's date range
          },
        },
        include: [
          {
            model: User,
            as: 'requester', // Fetch requester details
            attributes: ['first_name', 'last_name'], // Customize fields as needed
            include: [
              {
                model: ProfileImage,
                as: 'profileImage', // Fetch profile image details
                attributes: ['image_url'], // Only fetch the image URL
              },
              
            ],
          },
          {
            model: User,
            as: 'approver', // Fetch approver details
            attributes: ['first_name', 'last_name'], // Customize fields as needed
          },
        ],
      });
  
      // Respond with the filtered records
      res.status(200).json({
        Pending: overtimeRecords,
      });
    } catch (error) {
      console.error('Error fetching overtime records:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });







module.exports = router;
