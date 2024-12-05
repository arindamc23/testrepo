const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');
const User = require('../Models/User');
const PasswordResetToken = require('../Models/PasswordResetTokens'); // Import PasswordResetToken model
const crypto = require('crypto');
const { Op } = require('sequelize'); // Import Op from sequelize

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
  
  
    try {
      const user = await User.findOne({
        where: { email: email }, // Find user by email
      });
  
      if (!user) {
        return res.status(400).send('User not found');
      }
  
      // Check for an existing, non-expired token
      const existingToken = await PasswordResetToken.findOne({
        where: {
          user_id: user.User_id,
          expires_at: {
            [Op.gt]: new Date(), // Token must be still valid
          },
        },
      });
  
      let token;
      if (existingToken) {
        token = existingToken.token; // Reuse existing token
      } else {
        // Generate a new token
        token = crypto.randomBytes(32).toString('hex');
  
        // Calculate token expiration (e.g., 1 hour from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
  
        // Save the new token in the database
        await PasswordResetToken.create({
          user_id: user.User_id,
          token: token,
          expires_at: expiresAt,
        }); // Save within transaction
      }
  
      // Create reset URL with the token
      const resetUrl = `https://parallel-plaids-zkxlr.ondigitalocean.app/resetpassword/${token}`;
  
      const mailOptions = {
        to: user.email,
        from: 'your-email@gmail.com',
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        ${resetUrl}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      };
  
      await transporter.sendMail(mailOptions);

  
      res.send('Password reset link sent to email');
    } catch (error) {
      console.error('Error: ', error);
      res.status(500).send('Server error');
    }
  });

// Endpoint to reset password
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        // Find the token in the database and ensure it's still valid
        const resetToken = await PasswordResetToken.findOne({
            where: {
                token: token,
                expires_at: {
                    [Op.gt]: new Date(), // Check that the token is not expired
                },
            }
        });

        if (!resetToken) {
            return res.status(400).send('Invalid or expired token');
        }

        // Find the user associated with the token
        const user = await User.findOne({
            where: { User_id: resetToken.user_id }
        });

        if (!user) {
            return res.status(400).send('User not found');
        }

        // Hash the new password and update the user record
        user.password = await bcrypt.hash(password, 10);
        await user.save(); // Pass the transaction object

        // Delete the token after successful password reset
        await resetToken.destroy(); // Pass the transaction object


        res.send('Password has been reset successfully');
    } catch (error) {

        console.error('Error: ', error); // Log error details
        res.status(500).send('Server error');
    }
});

module.exports = router;