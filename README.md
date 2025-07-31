# Skillrise-Project

A comprehensive digital workforce development platform that connects freelancers with learning resources, mentors, and project opportunities.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The API server will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Serve the frontend files using a simple HTTP server:
   ```bash
   # Using Python (if available)
   python -m http.server 8080
   
   # Or using Node.js http-server (install globally first)
   npm install -g http-server
   http-server -p 8080
   ```

The frontend will be available at `http://localhost:8080`

## Development

### Available Scripts (Backend)

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

### Technology Stack

**Frontend:**
- HTML, CSS, JavaScript

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcrypt for password hashing
- Various security and utility middleware