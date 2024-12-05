const express = require('express');
const User = require('../Models/User');
const Attendance = require('../Models/Attendance');
const { authenticateToken } = require('../middleware/authMiddleware');
require('dotenv').config();
const router = express.Router();
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const moment = require('moment');

//Add attendance API--------------------------//
router.post('/add-checkin', authenticateToken, async (req, res) => {
    const { user_id, date, start_time } = req.body;

    let transaction; // Define the transaction variable

    try {
        // Start the transaction
        transaction = await sequelize.transaction();
        // Check if the user already has a check-in for the given date
        const existingCheckIn = await Attendance.findOne({
            where: { user_id, date },
            transaction
        });

        if (existingCheckIn) {
            return res.status(400).json({ message: 'Check-in already exists for this date.' });
        }

        // Create the attendance record for check-in
        const attendance = await Attendance.create({
            user_id,
            date,
            start_time,
            checkin_status: true
        }, { transaction });

        // Commit the transaction
        await transaction.commit();

        res.status(201).json({ message: 'Check-in added successfully'});

    } catch (error) {
        // Rollback the transaction in case of error
        if (transaction) await transaction.rollback();

        console.error('Error adding check-in:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        // Explicitly rollback if transaction is still open
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


// put attendance API--------------------------//
router.put('/update-checkout/:user_id', authenticateToken, async (req, res) => {
    const { user_id } = req.params;
    const { date, end_time } = req.body;

    let transaction;

    try {
        // Start the transaction
        transaction = await sequelize.transaction();

        // Find the attendance record for the user and date
        const attendance = await Attendance.findOne({
            where: { user_id, date },
            transaction
        });

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found for the specified user and date.' });
        }

        if (!attendance.start_time) {
            return res.status(400).json({ message: 'Start time is missing for this attendance record.' });
        }

        // Calculate total time in hours
        const startTime = moment(attendance.start_time, 'HH:mm');
        const endTime = moment(end_time, 'HH:mm');
        const duration = moment.duration(endTime.diff(startTime));
        const hours = duration.asHours();

        if (hours <= 0) {
            return res.status(400).json({ message: 'End time must be later than start time.' });
        }

        const total_time = `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;

        // Determine attendance status based on hours worked
        let Attendance_status = 'Started';
        if (hours > 5) {
            Attendance_status = 'Full-Day';
        } else if (hours > 3 && hours <= 5) {
            Attendance_status = 'Half-Day';
        }

        // Update attendance record
        attendance.end_time = end_time;
        attendance.total_time = total_time;
        attendance.checkin_status = false;
        attendance.Attendance_status = Attendance_status;

        await attendance.save({ transaction });

        // Commit the transaction
        await transaction.commit();

        res.status(200).json({
            message: 'Checkout updated successfully.'
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error updating checkout:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
    }
});


//fetch attendance API--------------------------//
// Fetch attendance API
router.get('/fetch-attendance', authenticateToken, async (req, res) => {
    const { user_id } = req.query;

    try {
        // Get the current date in YYYY-MM-DD format
        const currentDate = moment().format('YYYY-MM-DD');

        // Fetch attendance for the current date and user_id
        const attendances = await Attendance.findOne({
            where: {
                user_id,
                date: currentDate
            },
            attributes: ['checkin_status'], // Specify fields to include
        });

        if (!attendances) {
            // Return checkin_status: false when no attendance record is found
            return res.status(200).json({ checkin_status: false });
        }

        res.status(200).json(attendances);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// Attendance summary monthly API--------------------------//
router.get('/fetch-monthly-attendance', authenticateToken, async (req, res) => {
    const { user_id } = req.query;

    try {
        // Get the start and end dates of the current month
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');

        // Fetch attendance records for the current month
        const attendanceRecords = await Attendance.findAll({
            where: {
                user_id,
                date: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            }
        });

        // Calculate statistics
        let totalPresent = 0;
        let halfDays = 0;
        let fullDays = 0;
        const daysInMonth = moment().daysInMonth();
        const attendedDates = new Set();

        attendanceRecords.forEach(record => {
            attendedDates.add(record.date);
            if (record.Attendance_status === 'Full-Day') {
                totalPresent++;
                fullDays++;
            } else if (record.Attendance_status === 'Half-Day') {
                totalPresent++;
                halfDays++;
            }
        });

        const totalAbsent = daysInMonth - attendedDates.size;
        const remainingDays = daysInMonth - moment().date();

        // Response
        res.status(200).json({
            totalPresent,
            totalAbsent,
            halfDays,
            fullDays,
            remainingDays
        });
    } catch (error) {
        console.error('Error fetching monthly attendance:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;