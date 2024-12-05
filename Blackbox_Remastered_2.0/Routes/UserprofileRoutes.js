const express = require('express');
const User = require('../Models/User');
const Role = require('../Models/Role');
const UserDetails = require('../Models/UserDetails'); // Adjust the path as necessary
const Bank_Details = require('../Models/BankDetails'); // Adjust the path as necessary
const EducationInfo = require('../Models/EducationInfo'); // Adjust the path as necessary
const EmergencyContact = require('../Models/EmergencyContact'); // Adjust the path as necessary
const JoiningDate = require('../Models/JoiningDate'); // Adjust the path as necessary
const UserTime = require('../Models/Usertime'); // Adjust the path as necessary
const ProfileImage = require('../Models/ProfileImage'); // Adjust the path as necessary
const { authenticateToken } = require('../middleware/authMiddleware');
require('dotenv').config();
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const Attendance = require('../Models/Attendance');
const moment = require('moment');

// Add or update UserDetails 

router.post('/user-details', authenticateToken, async (req, res) => {
    let transaction; // Declare transaction outside the try block
    try {
      transaction = await sequelize.transaction(); // Start the transaction
  
      const {
        user_id,
        details_id,
        address,
        city,
        pincode,
        state,
        country,
        phone,
        gender,
        date_of_birth,
        forte,
        other_skills,
        pan_card_no,
        passport_no,
        aadhar_no,
        nationality,
        religion,
        marital_status,
        employment_of_spouse,
        no_of_children
      } = req.body;
  
      if (!user_id) {
        return res.status(400).json({ message: 'user_id is required.' });
      }
  
      const data = {
        user_id,
        address,
        city,
        pincode,
        state,
        country,
        phone,
        gender,
        date_of_birth,
        forte,
        other_skills,
        pan_card_no,
        passport_no,
        aadhar_no,
        nationality,
        religion,
        marital_status,
        employment_of_spouse,
        no_of_children
      };
  
      // Remove undefined fields from the data object
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });
  
      let response;
  
      if (details_id) {
        // Update existing record
        const existingRecord = await UserDetails.findOne({ where: { details_id, user_id } });
        if (existingRecord) {
          response = await existingRecord.update(data, { transaction });
          await transaction.commit(); // Commit the transaction
          return res.status(200).json({ message: 'User details updated successfully.', data: response });
        } else {
          return res.status(404).json({ message: 'User details not found for the provided details_id and user_id.' });
        }
      } else {
        // Create a new record
        response = await UserDetails.create(data, { transaction });
        await transaction.commit(); // Commit the transaction
        return res.status(201).json({ message: 'User details added successfully.', data: response });
      }
    } catch (error) {
      if (transaction) await transaction.rollback(); // Rollback transaction in case of error
      console.error('Error adding/updating user details:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      if (transaction && !transaction.finished) {
        await transaction.rollback(); // Explicitly rollback if transaction is still open
      }
    }
  });
 

// Fetch UserDetails by user_id API
router.get('/getUserDetails', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    try {
      const userDetails = await UserDetails.findOne({
        where: { user_id: userId }
      });
  
      if (!userDetails) {
        return res.status(204).end(); // 204 No Content
      }
  
      res.status(200).json(userDetails);
    } catch (error) {
      console.error(`Error fetching user details: ${error.message}`);
      res.status(500).json({ message: 'Error fetching user details', error: error.message });
    }
  });

  


  // Add or update BankDetails 

router.post('/bank-details', authenticateToken, async (req, res) => {
    let transaction; // Declare transaction outside the try block
    try {
      transaction = await sequelize.transaction(); // Start the transaction
  
      const {
        user_id,
        id_bank_details,
        bank_name,
        bank_account_no,
        ifsc_code,
        branch_name,
        accountHolder_name
      } = req.body;
  
      if (!user_id) {
        return res.status(400).json({ message: 'user_id is required.' });
      }
  
      const data = {
        user_id,
        bank_name,
        bank_account_no,
        ifsc_code,
        branch_name,
        accountHolder_name
      };
  
      // Remove undefined fields from the data object
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });
  
      let response;
  
      if (id_bank_details) {
        // Update existing record
        const existingRecord = await Bank_Details.findOne({ where: { id_bank_details, user_id } });
        if (existingRecord) {
          response = await existingRecord.update(data, { transaction });
          await transaction.commit(); // Commit the transaction
          return res.status(200).json({ message: 'Bank details updated successfully.', data: response });
        } else {
          return res.status(404).json({ message: 'Bank details not found for the provided details_id and user_id.' });
        }
      } else {  // Create a new record
        response = await Bank_Details.create(data, { transaction });
        await transaction.commit(); // Commit the transaction
        return res.status(201).json({ message: 'Bank details added successfully.', data: response });
      }
    } catch (error) {
      if (transaction) await transaction.rollback(); // Rollback transaction in case of error
      console.error('Error adding/updating bank details:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally { // Always release the transaction after the try block
      if (transaction && !transaction.finished) {
        await transaction.rollback(); // Explicitly rollback if transaction is still open
      }
    }
  });


  // Fetch BankDetails by user_id API
  router.get('/getBankDetails', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    try {
      const bankDetails = await Bank_Details.findOne({
        where: { user_id: userId }
      });
  
      if (!bankDetails) {
        return res.status(204).end(); // 204 No Content
      }
  
      res.status(200).json(bankDetails);
    } catch (error) {
      console.error(`Error fetching bank details: ${error.message}`);
      res.status(500).json({ message: 'Error fetching bank details', error: error.message });
    }
  });


// Add or update EducationInfo

router.post('/education-info', authenticateToken, async (req, res) => {
    let transaction; // Declare transaction outside the try block
    try {
      transaction = await sequelize.transaction(); // Start the transaction
  
      const {
        user_id,
        id_educational_info,
        institute,
        year_of_passing,
        degree_name
      } = req.body;
  
      if (!user_id) {
        return res.status(400).json({ message: 'user_id is required.' });
      }
  
      const data = {
        user_id,
        institute,
        year_of_passing,
        degree_name
      };
  
      // Remove undefined fields from the data object
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });
  
      let response;
  
      if (id_educational_info) {
        // Update existing record
        const existingRecord = await EducationInfo.findOne({ where: { id_educational_info, user_id } });
        if (existingRecord) {
          response = await existingRecord.update(data, { transaction });
          await transaction.commit(); // Commit the transaction
          return res.status(200).json({ message: 'Education info updated successfully.', data: response });
        } else {
          return res.status(404).json({ message: 'Education info not found for the provided details_id and user_id.' });
        }
      } else {  // Create a new record
        response = await EducationInfo.create(data, { transaction });
        await transaction.commit(); // Commit the transaction
        return res.status(201).json({ message: 'Education info added successfully.', data: response });
      }
    } catch (error) {
      if (transaction) await transaction.rollback(); // Rollback transaction in case of error
      console.error('Error adding/updating education info:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally { // Always release the transaction after the try block
      if (transaction && !transaction.finished) {
        await transaction.rollback(); // Explicitly rollback if transaction is still open
      }
    }
  });

  // Fetch EducationInfo by user_id API
  router.get('/getEducationInfo', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    try {
      const educationInfo = await EducationInfo.findAll({
        where: { user_id: userId }
      });
  
      if (!educationInfo) {
        return res.status(204).end(); // 204 No Content
      }
  
      res.status(200).json(educationInfo);
    } catch (error) {
      console.error(`Error fetching education info: ${error.message}`);
      res.status(500).json({ message: 'Error fetching education info', error: error.message });
    }
  });

// Add or update EmergencyContact
router.post('/emergency-contact', authenticateToken, async (req, res) => {
  let transaction; // Declare transaction outside the try block
  try {
      transaction = await sequelize.transaction(); // Start the transaction

      const {
          user_id,
          id_emergency_contact,
          name,
          relationship,
          phone
      } = req.body;

      if (!user_id) {
          return res.status(400).json({ message: 'user_id is required.' });
      }

      if (id_emergency_contact && !name && !relationship && !phone) {
          // If only id_emergency_contact is provided, delete the contact
          const existingRecord = await EmergencyContact.findOne({ where: { id_emergency_contact, user_id } });
          if (existingRecord) {
              await existingRecord.destroy({ transaction });
              await transaction.commit();
              return res.status(200).json({ message: 'Emergency contact deleted successfully.' });
          } else {
              return res.status(404).json({ message: 'Emergency contact not found.' });
          }
      }

      const data = {
          user_id,
          name,
          relationship,
          phone
      };

      // Remove undefined fields from the data object
      Object.keys(data).forEach((key) => {
          if (data[key] === undefined) {
              delete data[key];
          }
      });

      let response;

      if (id_emergency_contact) {
          // Update existing record
          const existingRecord = await EmergencyContact.findOne({ where: { id_emergency_contact, user_id } });
          if (existingRecord) {
              response = await existingRecord.update(data, { transaction });
              await transaction.commit();
              return res.status(200).json({ message: 'Emergency contact updated successfully.', data: response });
          } else {
              return res.status(404).json({ message: 'Emergency contact not found.' });
          }
      } else {
          // Create a new record
          response = await EmergencyContact.create(data, { transaction });
          await transaction.commit();
          return res.status(201).json({ message: 'Emergency contact added successfully.', data: response });
      }
  } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('Error adding/updating/deleting emergency contact:', error);
      res.status(500).json({ message: 'Internal server error' });
  } finally {
      if (transaction && !transaction.finished) {
          await transaction.rollback();
      }
  }
});


  // Fetch EmergencyContact by user_id API
  router.get('/getEmergencyContact', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    try {
      const emergencyContact = await EmergencyContact.findAll({
        where: { user_id: userId }
      });
  
      if (!emergencyContact) {
        return res.status(204).end(); // 204 No Content
      }
  
      res.status(200).json(emergencyContact);
    } catch (error) {
      console.error(`Error fetching emergency contact: ${error.message}`);
      res.status(500).json({ message: 'Error fetching emergency contact', error: error.message });
    }
  });   
 
// Fetch main user details without exposing the password
router.get('/main-user-details', authenticateToken, async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
  }

  try {
    const today = moment().format('YYYY-MM-DD'); // Format the date to match your database
      const userDetails = await User.findOne({
          where: { user_id: userId },
          attributes: { exclude: ['password'] }, // Exclude the password field
          include: [
              {
                  model: Role,
                  as: 'role', // Ensure the alias matches your model definition
                  attributes: ['role_name'], // Fetch only the role_name
              },
              {
                  model: UserTime,
                  as: 'userTimes', // Ensure the alias matches your model definition
                  attributes: ['start_time', 'createdAt', 'updatedAt'], // Fetch relevant fields
              },
              {
                  model: JoiningDate,
                  as: 'joiningDates', // Ensure the alias matches your model definition
                  attributes: ['joining_date', 'createdAt', 'updatedAt'], // Fetch relevant fields
              },
              {
                model: Attendance,
                as: 'attendances', // Ensure the alias matches your model definition
                attributes: ['checkin_status'], // Fetch only the relevant fields
                required: false, // Change this to allow LEFT JOIN
                where: {
                  date: today, // Filter by today's date
                },
              },
          ],
      });

      if (!userDetails) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json(userDetails);
  } catch (error) {
      console.error(`Error fetching user details: ${error.message}`);
      res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
});

  

//*-------------------------------Get all profile of users Api---------------------------------------*//
router.get('/getallusers', authenticateToken, async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD'); // Format the date to match your database
      // Fetch users with associations and filter out unverified users
      const users = await User.findAll({
          where: {
              user_type: {
                  [Op.not]: 'Unverified',
              },
          },
          include: [
              {
                  model: UserTime,
                  as: 'userTimes',
              },
              {
                  model: JoiningDate,
                  as: 'joiningDates',
              },
              {
                  model: ProfileImage,
                  as: 'profileImage',
              },
              {
                  model: UserDetails,
                  as: 'userDetails',
              },
              {
                model: Attendance,
                as: 'attendances', // Ensure the alias matches your model definition
                attributes: ['checkin_status'], // Fetch only the role_name
                where: {
                  date: today, // Filter by today's date
                },
                required: false,
              },
          ],
      });

      // Sorting logic
      const userTypePriority = {
          Founder: 1,
          Admin: 2,
          SuperAdmin: 3,
          HumanResource: 4,
          Accounts: 5,
          Department_Head: 6,
          Employee: 7,
          Ex_employee: 8,
      };

      const sortedUsers = users.sort(
          (a, b) => userTypePriority[a.user_type] - userTypePriority[b.user_type]
      );

      res.status(200).json(sortedUsers);
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});









module.exports = router;