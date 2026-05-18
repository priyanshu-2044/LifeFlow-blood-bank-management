-- ============================================================
-- BLOOD BANK MANAGEMENT SYSTEM - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS blood_bank_db;
USE blood_bank_db;

-- ============================================================
-- TABLE 1: BLOOD_BANK (Created first - referenced by others)
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_bank (
    bank_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL
);

-- ============================================================
-- TABLE 2: DONOR
-- ============================================================
CREATE TABLE IF NOT EXISTS donor (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    contact VARCHAR(15) NOT NULL,
    address VARCHAR(200)
);

-- ============================================================
-- TABLE 3: BLOOD (DONATES + STORED_IN relationship)
-- ============================================================
CREATE TABLE IF NOT EXISTS blood (
    blood_id INT AUTO_INCREMENT PRIMARY KEY,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    donor_id INT NOT NULL,
    bank_id INT NOT NULL,
    donated_on DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (donor_id) REFERENCES donor(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (bank_id) REFERENCES blood_bank(bank_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 4: PATIENT
-- ============================================================
CREATE TABLE IF NOT EXISTS patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    contact VARCHAR(15) NOT NULL
);

-- ============================================================
-- TABLE 5: HOSPITAL (REQUESTS relationship with BLOOD_BANK)
-- ============================================================
CREATE TABLE IF NOT EXISTS hospital (
    hospital_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    bank_id INT NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES blood_bank(bank_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 6: STAFF (WORKS_IN relationship with BLOOD_BANK)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    bank_id INT NOT NULL,
    FOREIGN KEY (bank_id) REFERENCES blood_bank(bank_id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 7: RECEIVES (PATIENT receives BLOOD - junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS receives (
    patient_id INT NOT NULL,
    blood_id INT NOT NULL,
    received_on DATE DEFAULT (CURRENT_DATE),
    PRIMARY KEY (patient_id, blood_id),
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (blood_id) REFERENCES blood(blood_id) ON DELETE CASCADE
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Blood Banks
INSERT INTO blood_bank (name, location) VALUES
('City Blood Bank', 'Mumbai, Maharashtra'),
('Apollo Blood Center', 'Delhi, NCR'),
('LifeLine Blood Bank', 'Bangalore, Karnataka'),
('RedCross Blood Bank', 'Chennai, Tamil Nadu'),
('Sanjeevani Blood Bank', 'Hyderabad, Telangana');

-- Donors
INSERT INTO donor (name, blood_group, contact, address) VALUES
('Ravi Kumar', 'O+', '9876543210', '12 MG Road, Mumbai'),
('Priya Sharma', 'A+', '9823456781', '45 Lajpat Nagar, Delhi'),
('Ankit Verma', 'B+', '9712345678', '78 Koramangala, Bangalore'),
('Sunita Rao', 'AB+', '9634567890', '22 Anna Nagar, Chennai'),
('Mohammed Ali', 'O-', '9556789012', '56 Banjara Hills, Hyderabad'),
('Neha Patel', 'A-', '9445678901', '88 Juhu, Mumbai'),
('Vikram Singh', 'B-', '9334567890', '33 Rohini, Delhi');

-- Blood Inventory
INSERT INTO blood (blood_group, quantity, donor_id, bank_id, donated_on) VALUES
('O+', 2, 1, 1, '2026-05-01'),
('A+', 3, 2, 2, '2026-05-03'),
('B+', 1, 3, 3, '2026-05-05'),
('AB+', 2, 4, 4, '2026-05-07'),
('O-', 4, 5, 5, '2026-05-08'),
('A-', 1, 6, 1, '2026-05-10'),
('B-', 2, 7, 2, '2026-05-11');

-- Patients
INSERT INTO patient (name, blood_group, contact) VALUES
('Arun Mehta', 'O+', '9111234567'),
('Kavitha Nair', 'A+', '9222345678'),
('Rajesh Gupta', 'B+', '9333456789'),
('Farida Begum', 'AB+', '9444567890'),
('Suresh Pillai', 'O-', '9555678901');

-- Hospitals
INSERT INTO hospital (name, location, bank_id) VALUES
('St. Georges Hospital', 'Mumbai, Maharashtra', 1),
('AIIMS Delhi', 'New Delhi, NCR', 2),
('Manipal Hospital', 'Bangalore, Karnataka', 3),
('Apollo Hospital', 'Chennai, Tamil Nadu', 4),
('Care Hospital', 'Hyderabad, Telangana', 5);

-- Staff
INSERT INTO staff (name, role, bank_id) VALUES
('Dr. Meena Joshi', 'Doctor', 1),
('Ramesh Pillai', 'Technician', 1),
('Dr. Sanjay Gupta', 'Doctor', 2),
('Anjali Desai', 'Nurse', 3),
('Kiran Kumar', 'Technician', 4),
('Dr. Fatima Sheikh', 'Doctor', 5),
('Prakash Nair', 'Receptionist', 5);

-- Receives (Patient-Blood assignments)
INSERT INTO receives (patient_id, blood_id, received_on) VALUES
(1, 1, '2026-05-02'),
(2, 2, '2026-05-04'),
(3, 3, '2026-05-06'),
(4, 4, '2026-05-09'),
(5, 5, '2026-05-10');
