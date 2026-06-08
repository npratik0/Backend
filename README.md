Authentication System (Node.js + TypeScript + Sequelize + PostgreSQL)
A secure authentication backend system built using Node.js, Express, TypeScript, Sequelize, and PostgreSQL.
It includes user registration, login with JWT authentication, protected routes, and forgot password functionality using OTP via email (Nodemailer).

Features
• User Registration with password hashing
• User Login with JWT authentication
• Protected routes using middleware
• User profile API
• Forgot password using OTP via email
• Reset password with OTP verification
• Password hashing using bcrypt
• PostgreSQL database integration using Sequelize ORM

Tech Stack
• Backend: Node.js, Express.js
• Language: TypeScript
• Database: PostgreSQL
• ORM: Sequelize
• Authentication: JSON Web Token (JWT)
• Email Service: Nodemailer
• Security: bcrypt for password hashing

Project Structure

src/
│
├── config/           # Database configuration
├── controllers/      # Auth & user controllers
├── middleware/       # JWT authentication middleware
├── models/           # Sequelize models
├── routes/           # API routes
├── utils/            # Helper functions (hash, jwt, mailer)
├── app.ts            # Express app setup
└── server.ts         # Server entry point

Installation and Setup

1. Clone the repository
   git clone https://github.com/npratik0/auth-system.git
   cd auth-backend

2. Install dependencies
   npm install

3. Create environment variables
   Create a .env file in the root directory:
   PORT=5000
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=your_database
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password

4. Setup PostgreSQL
   Make sure PostgreSQL is installed and running.
   Create the database mentioned in .env.

5. Run the project
   npm run dev
   Server will run on:
   http://localhost:5000

API Endpoints
Auth Routes
Register User
POST /api/auth/register
Request Body:
{
"fullName": "John Doe",
"email": "john@example.com",
"phoneNumber": "9876543210",
"password": "123456",
"confirmPassword": "123456"
}

Login User
POST /api/auth/login
Request Body:
{
"email": "john@example.com",
"password": "123456"
}
Response:
{
"message": "Login successful",
"accessToken": "jwt_token_here"
}

User Routes
Get User Profile (Protected)
GET /api/user/profile
Headers:
Authorization: Bearer <access_token>
Response:
{
"user": {
"id": 1,
"fullName": "John Doe",
"email": "john@example.com",
"phoneNumber": "9876543210"
}
}

Password Reset Routes
Forgot Password (Send OTP)
POST /api/auth/forgot-password
Request Body:
{
"email": "john@example.com"
}

Reset Password (Verify OTP)
POST /api/auth/reset-password
Request Body:
{
"email": "john@example.com",
"otp": "123456",
"newPassword": "newpassword123"
}

Authentication Flow

1. User registers with email and password
2. Password is hashed before storing in database
3. User logs in and receives a JWT access token
4. Token is used to access protected routes
5. Forgot password generates OTP and sends via email
6. OTP is verified and password is updated

OTP System
• OTP is a 6-digit numeric code
• Sent via Nodemailer using Gmail SMTP
• Stored temporarily in server memory
• Expires after 10 minutes

Security Features
• Password hashing using bcrypt
• JWT-based authentication
• Protected routes using middleware
• OTP expiration handling
• Input validation for authentication routes
