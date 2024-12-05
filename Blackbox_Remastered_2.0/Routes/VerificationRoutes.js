const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require('sequelize'); // Import Sequelize operators
const User = require('../Models/User');
const Role = require('../Models/Role');
const JoiningDate = require('../Models/JoiningDate'); // Adjust the path as necessary
const UserTime = require('../Models/Usertime'); // Adjust the path as necessary
const moment = require('moment'); // Install moment.js if not already installed
const { authenticateToken } = require('../middleware/authMiddleware');

//Employee verification
router.post('/update-user-role-location', authenticateToken, async (req, res) => {
    const { user_id, user_type, joining_date, start_time } = req.body;

    if (user_type === 'SuperAdmin') {
        return res.status(400).json({ message: 'Cannot update user to SuperAdmin role' });
    }

    let transaction;

    try {
        transaction = await sequelize.transaction();

        // Step 1: Fetch the role
        const role = await Role.findOne({
            where: {
                role_name: {
                    [Op.eq]: user_type,
                    [Op.not]: 'SuperAdmin',
                },
            },
            transaction,
        });

        if (!role) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Role not found or role is SuperAdmin' });
        }

        // Step 2: Update user details
        await User.update(
            { Role_id: role.Role_id, user_type: role.role_name },
            {
                where: { user_id },
                transaction,
            }
        );

        // Step 3: Update joining date
        await JoiningDate.upsert(
            {
                user_id,
                joining_date,
            },
            { transaction }
        );

        // Step 4: Format start_time and update UserTime
        const formattedTime = moment(start_time).format('HH:mm:ss'); // Extract only time
        await UserTime.upsert(
            {
                user_id,
                start_time: formattedTime,
            },
            { transaction }
        );

        await transaction.commit();
        res.status(200).json({ message: 'User details updated successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error updating user role and location:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});

 


  router.get('/unverified_count', authenticateToken, async (req, res) => {
    try {
        const count = await User.count({
            where: { user_type: 'Unverified' }
        });
        res.status(200).json({ count });
    } catch (error) {
        console.error('Error fetching unverified users count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.get('/users_unverified', authenticateToken,  async (req, res) => {
    try {
        const unverifiedUsers = await User.findAll({
            where: { user_type: 'Unverified' }
        });

      // Respond with users and their documents
      res.status(200).json(unverifiedUsers);
    } catch (error) {
      console.error('Error fetching unverified users and their documents:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


// GET /roles - Fetch all roles
router.get('/allroles',authenticateToken, async (req, res) => {
    try {
      const roles = await Role.findAll({
        attributes: ['Role_id', 'role_name'], // Specify the fields to fetch
      });
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles',
      });
    }
  });




module.exports = router;