# LifeFlow - Blood Bank Management System

A full-stack, database-driven web application built with **Node.js**, **Express**, **MySQL**, and **Vanilla JS/Tailwind CSS**. 

LifeFlow simplifies blood bank operations by seamlessly bridging the gap between donors, patients, and administrators. It features a modern Public Portal for user interaction and a powerful Admin Dashboard for system management.

---

## ✨ Key Features

### 🌍 Public Portal (`public.html`)
- **Donor Registration:** Users can sign up to become donors. Accounts are verified via unique contact numbers.
- **Real-Time Status Tracking:** Donors can track their application status (Pending vs. Approved).
- **Appointment Scheduling:** Approved donors can schedule blood donation appointments at specific blood banks.
- **Blood Requests:** Patients or hospitals can submit urgent blood requests directly from the home page.

### 🛡️ Admin Dashboard (`index.html`)
- **Real-Time Analytics:** View live statistics on total donors, blood stock, distributions, and active banks.
- **Approval Workflow:** Admins can review and approve/reject pending donor applications and urgent blood requests.
- **Appointment Management:** Track, complete, or cancel scheduled donor appointments.
- **Inventory Management:** Monitor blood stock levels with critical stock alerts and distribute blood to matching patients based on medical compatibility.
- **Entity Management:** Full CRUD (Create, Read, Update, Delete) operations for Donors, Patients, Hospitals, Blood Banks, and Staff.

---

## 🚀 Getting Started

### 1. Database Setup
1. Open your MySQL client (e.g., MySQL Workbench or Command Line).
2. Run the main schema script located at `database/schema.sql` to create the database and seed it with initial data.
3. **Important:** Run the `database/update_phase7.sql` script to apply the latest schema upgrades (adds status/passwords for donors and creates the `blood_requests` table). 
*(Note: The `appointments` table schema is also documented in `database/updated_schema.txt` if you need to create it manually, though the application may handle it or you can execute it directly from the text file).*

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` directory.
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Open `backend/.env` and configure your local MySQL database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password
   DB_NAME=blood_bank_db
   PORT=5000
   ```
4. Start the backend server:
   ```bash
   npm start
   ```
   *The server will start running on `http://localhost:5000`.*

### 3. Frontend Setup
The frontend uses Vanilla JavaScript and loads Tailwind CSS via CDN. No build steps are required.
1. Open `frontend/public.html` in your web browser to view the **Public Portal**.
2. Open `frontend/index.html` in your web browser to access the **Admin Dashboard**.
3. **Default Admin Login:**
   -Default credentials can be configured in the database setup.

---

## 📁 Project Structure

- `/backend`: Node.js/Express server containing the REST API routes and database connection logic (`server.js`, `db.js`).
- `/database`: SQL schema definitions, Phase 7 upgrades, and the final combined schema reference (`updated_schema.txt`).
- `/frontend`:
  - `public.html` & `js/public.js`: The public-facing site for donors and patients.
  - `index.html` & `js/app.js`: The secure admin control panel.
  - `css/styles.css`: Custom CSS animations, scrollbars, and overrides.

## 🛠️ Technology Stack
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript, Lucide Icons
- **Backend:** Node.js, Express.js, CORS
- **Database:** MySQL (using `mysql2/promise`)

## 👨‍💻 Author
Priyanshu Prakash