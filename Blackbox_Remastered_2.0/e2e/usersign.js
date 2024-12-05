import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.0.0/index.js';

export const options = {
    stages: [
        { duration: '1m', target: 30 }, // Ramp up to 10 users
        { duration: '1m', target: 40 }, // Stay at 10 users
        { duration: '1m', target: 0 },  // Ramp down
    ],
};

const BASE_URL = 'http://localhost:5000'; // Replace with your actual API URL
const PASSWORD = 'Password123';

export default function () {
    // Step 1: Register a new user
    const registerPayload = JSON.stringify({
        first_name: `Test${randomString(5)}`,
        last_name: `User${randomString(5)}`,
        email: `testuser${randomString(5)}@example.com`,
        password: PASSWORD,
    });
    const registerHeaders = { 'Content-Type': 'application/json' };

    const registerRes = http.post(`${BASE_URL}/authentication/register`, registerPayload, { headers: registerHeaders });
    check(registerRes, {
        'registered successfully': (r) => r.status === 201,
    });
    sleep(1);

    // Step 2: Login as the new user
    const loginPayload = JSON.stringify({
        email: JSON.parse(registerPayload).email,
        password: PASSWORD,
    });

    const loginRes = http.post(`${BASE_URL}/authentication/login`, loginPayload, { headers: registerHeaders });
    const loginResponseBody = loginRes.json();
    check(loginRes, {
        'logged in successfully': (r) => r.status === 200,
        'access token received': (r) => loginResponseBody.accessToken !== undefined,
    });

    const token = loginResponseBody.accessToken;
    const userId = loginResponseBody.user_id; // Capture user_id from the login response

    sleep(1);

    // Step 3: Verify the user by updating the role (excluding SuperAdmin)
    const roles = ['Founder', 'Admin', 'HumanResource', 'Accounts', 'Department_Head', 'Employee'];
    const newRole = roles[Math.floor(Math.random() * roles.length)]; // Randomly select a role

    const updateRolePayload = JSON.stringify({
        user_id: userId, // Pass captured user_id here
        user_type: newRole,
    });

    const updateRoleHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Include the access token in headers
    };

    const updateRoleRes = http.post(`${BASE_URL}/promotion/update-user-role-location`, updateRolePayload, { headers: updateRoleHeaders });
    check(updateRoleRes, {
        'role updated successfully': (r) => r.status === 200,
    });

    // Optional delay between iterations
    sleep(2);
}
