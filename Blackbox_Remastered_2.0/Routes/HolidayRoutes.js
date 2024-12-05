const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require('sequelize'); // Import Sequelize operators
const Holiday = require('../Models/Holiday');
const { authenticateToken } = require('../middleware/authMiddleware');
const moment = require('moment'); // You'll need this package for date handling
const multer = require('multer');
const ImageKit = require('imagekit');

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: "public_UCxvoHx58ajkX85Q6oBFCP7pSuI=",
  privateKey: "private_ATOOFtW1RZ2IoJWSF41Jbu46lDM=",
  urlEndpoint: "https://ik.imagekit.io/blackboxv2",
});

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Creates a new holiday in the database
router.post('/addholiday', authenticateToken, upload.single('image'), async (req, res) => {
  const { holiday_name, holiday_date, status } = req.body;
  const transaction = await Holiday.sequelize.transaction();

  try {
      if (!req.file) {
          return res.status(400).json({ error: 'Image file is required' });
      }

      // Upload image to ImageKit
      const uploadResponse = await imagekit.upload({
          file: req.file.buffer, // File buffer from Multer
          fileName: `holiday_${Date.now()}`, // Unique file name
          folder: '/Holiday-images',
      });

      // Create new holiday record
      const newHoliday = await Holiday.create(
          {
              holiday_name,
              holiday_date,
              image_url: uploadResponse.url,
              imagekit_file_id: uploadResponse.fileId,
              status,
          },
          { transaction }
      );

      // Commit the transaction
      await transaction.commit();

      res.status(201).json({
          message: 'Holiday created successfully'
      });
  } catch (error) {
      // Rollback the transaction if there's an error
      if (transaction) await transaction.rollback();
      console.error('Error creating holiday:', error);
      res.status(500).json({
          message: 'Internal server error',
          details: error.message,
      });
  } finally {
      if (transaction && !transaction.finished) {
          await transaction.rollback();
      }
  }
});
  

 //Updates  Holiday in the database 
 router.put('/holiday/:id', authenticateToken, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { holiday_name, holiday_date, status } = req.body;
  let transaction; // Declare transaction using let

  try {
      transaction = await Holiday.sequelize.transaction();

      const holiday = await Holiday.findByPk(id);

      if (!holiday) {
          return res.status(404).json({ error: 'Holiday not found' });
      }

      let newImageUrl = holiday.image_url;
      let newImagekitFileId = holiday.imagekit_file_id;

      // Check if a new image is provided
      if (req.file) {
          // Delete the old image from ImageKit
          if (holiday.imagekit_file_id) {
              await imagekit.deleteFile(holiday.imagekit_file_id);
          }

          // Upload the new image to ImageKit
          const uploadResponse = await imagekit.upload({
              file: req.file.buffer, // File buffer from Multer
              fileName: `holiday_${Date.now()}`, // Unique file name
              folder: '/Holiday-images',
          });

          // Update the image URL and file ID
          newImageUrl = uploadResponse.url;
          newImagekitFileId = uploadResponse.fileId;
      }

      // Update holiday details
      const updatedHoliday = await holiday.update(
          {
              holiday_name,
              holiday_date,
              status,
              image_url: newImageUrl,
              imagekit_file_id: newImagekitFileId,
          },
          { transaction }
      );

      // Commit the transaction
      await transaction.commit();

      res.status(200).json({
          message: 'Holiday updated successfully',
          holiday: updatedHoliday,
      });
  } catch (error) {
      // Rollback the transaction if there's an error
      if (transaction) await transaction.rollback();
      console.error('Error updating holiday:', error);
      res.status(500).json({
          message: 'Internal server error',
          details: error.message,
      });
  } finally {
      if (transaction && !transaction.finished) {
          await transaction.rollback();
      }
  }
});

  
//Deletes  Holiday in the database
router.delete('/holiday/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  let transaction; // Declare the transaction

  try {
      transaction = await Holiday.sequelize.transaction();

      // Find the holiday by ID
      const holiday = await Holiday.findByPk(id);

      if (!holiday) {
          return res.status(404).json({ error: 'Holiday not found' });
      }

      // Delete the associated image from ImageKit
      if (holiday.imagekit_file_id) {
          try {
              await imagekit.deleteFile(holiday.imagekit_file_id);
          } catch (imageKitError) {
              console.error('Error deleting image from ImageKit:', imageKitError.message);
              return res.status(500).json({
                  error: 'Failed to delete image from ImageKit',
                  details: imageKitError.message,
              });
          }
      }

      // Delete the holiday record from the database
      await holiday.destroy({ transaction });

      // Commit the transaction
      await transaction.commit();

      res.status(200).json({ message: 'Holiday deleted successfully' });
  } catch (error) {
      // Rollback transaction in case of error
      if (transaction) await transaction.rollback();
      console.error('Error deleting holiday:', error.message);
      res.status(500).json({
          error: 'Failed to delete holiday',
          details: error.message,
      });
  } finally {
      if (transaction && !transaction.finished) {
          await transaction.rollback();
      }
  }
});
 

//Fetches All Holiday in the database
  router.get('/holidays', authenticateToken, async (req, res) => {
    try {
      const holidays = await Holiday.findAll();
      res.status(200).json(holidays);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch holidays', details: error.message });
    }
  });
  

// Route to get holidays for the current month
router.get('/holidays/current-month', authenticateToken, async (req, res) => {
    try {
      // Get the current month and year
      const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');
  
      // Query to find holidays within the current month
      const holidays = await Holiday.findAll({
        where: {
          holiday_date: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        }
      });
  
      res.status(200).json(holidays);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch holidays for the current month', details: error.message });
    }
  });


// weekly holiday----------------------------------------------------*//
// Route to fetch holidays within a date range
router.get('/holidays/week', authenticateToken, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
  
      // Validate and parse dates
      const start = moment(startDate).startOf('day');
      const end = moment(endDate).endOf('day');
  
      if (!start.isValid() || !end.isValid()) {
        return res.status(400).json({ message: 'Invalid date range' });
      }
  
      // Fetch holidays in the date range
      const holidays = await Holiday.findAll({
        where: {
            holiday_date: {
              [Op.between]: [start.toDate(), end.toDate()], // Ensure that 'Op.between' is used here correctly
            },
        },
      });
  
      res.status(200).json({ holidays });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching holidays' });
    }
  });





module.exports = router;