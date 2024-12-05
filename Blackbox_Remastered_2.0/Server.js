const express = require('express');
const sequelize = require('./config/database');
const cors = require('cors');
const path = require('path');
require('dotenv').config();


// Definition of routes
const authRoutes = require('./Routes/AuthRoutes');
const promotionRoutes = require('./Routes/VerificationRoutes');
const ForgotPasswordRoutes = require('./Routes/ForgotPassword');
const ProfileimageRoutes = require('./Routes/ProfileimageRoutes');
const UserprofileRoutes = require('./Routes/UserprofileRoutes');
const AttendanceRoutes = require('./Routes/AttendanceRoutes');
const HolidayRoutes = require('./Routes/HolidayRoutes');
const ProjectRoutes = require('./Routes/ProjectRoutes');
const MonthlyReportRoutes = require('./Routes/MonthlyReportRoutes');
const LetterRoutes = require('./Routes/LetterRoutes');
const OvertimeRoutes = require('./Routes/OvertimeRoutes');
const TaskSheetRoutes = require('./Routes/TasksheetRoutes');
const LeaveRoutes = require('./Routes/LeaveRoutes');
const EmployeeReportRoutes = require('./Routes/EmployeeReport');
// Automated Cronjob Paths
const TaskDeadlineJob = require('./cronjobs/TaskDeadlinejob');
const LeaveBalanceAdjuster = require('./cronjobs/LeaveCronJob');
// Import association initializer
const createUserAssociations = require('./composer/UserAssociation');
const createAttendanceAssociations = require('./composer/AttendanceAssociation');
const createProjectAssociations = require('./composer/ProjectAssociation');
const createTasksheetAssociations = require('./composer/TasksheetAssociation');
const createLeaveAssociation = require('./composer/LeaveAssociation');

const app = express();
const port = process.env.PORT || 3000;
const publicRoot = path.resolve(__dirname, './dist');

// Middleware setup
app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve images from 'img' folder
app.use('/img', express.static(path.join(__dirname, 'img')));

// Routes Path
app.use('/authentication', authRoutes);
app.use('/promotion', promotionRoutes);
app.use('/Forgot', ForgotPasswordRoutes);
app.use('/profile-image', ProfileimageRoutes);
app.use('/user-profile', UserprofileRoutes);
app.use('/attendance', AttendanceRoutes);
app.use('/HolidayRoutes', HolidayRoutes);
app.use('/projectRoutes', ProjectRoutes);
app.use('/monthly-report', MonthlyReportRoutes);
app.use('/letterRoutes', LetterRoutes);
app.use('/overtimeRoutes', OvertimeRoutes);
app.use('/tasksheetRoutes', TaskSheetRoutes);
app.use('/leaveRoutes', LeaveRoutes);
app.use('/employee-report', EmployeeReportRoutes);
//Serve static files from React app
app.use(express.static(publicRoot));

// Serve React app for any route not handled by static files
app.get('/*', (req, res) => {
    res.sendFile(path.join(publicRoot, 'index.html'));
});


// Test DB connection
app.get('/database-connection', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.send('Database connection has been established successfully.');
    } catch (error) {
        res.status(500).send('Unable to connect to the database:', error);
    }
});


// Generic error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`
        <html>
            <head>
                <title>Error</title>
            </head>
            <body>
            <div style="height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; width: 100%; background-color: #f9fdfc;">
                <div style="width:300px; height: auto; border-radius: 10px; padding: 25px; text-align: center;">
                    <img src="/img/web_error.gif" alt="Error" style="width: 300px; height: 300px; margin:0 auto; object-fit: cover;">
                    <h1 style="color: #000; font-size: 38px; text-align: center; font-weight: bold; width: 100%; display: block;"><em>Oops!</em></h1>
                    <p style="color: #323030; font-size: 18px; text-align: center; margin-top: 15px; margin-bottom: 0;">Something went wrong on our end.</p>
                    <p style="color: #323030; font-size: 14px; text-align: center; margin-top: 15px; margin-top: 10px;">Please try again later....</p>
                </div>
            </body>
        </html>
    `);
});

// Initialize associations
createUserAssociations();
createAttendanceAssociations();
createProjectAssociations();
createTasksheetAssociations();
createLeaveAssociation();
sequelize.sync()
    .then(() => {
        console.log('Database connected and synchronized');
        // Cronjob Call
        TaskDeadlineJob();
        LeaveBalanceAdjuster();
        app.listen(port, () => {
            console.log(`Server is running on ${port}`);
        });
    })
    .catch(err => console.error('Error connecting to the database:', err));

module.exports = app;

