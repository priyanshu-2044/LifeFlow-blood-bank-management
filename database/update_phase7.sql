ALTER TABLE donor ADD COLUMN status ENUM('Pending', 'Approved') DEFAULT 'Pending';

CREATE TABLE IF NOT EXISTS blood_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
    contact VARCHAR(15) NOT NULL,
    hospital_name VARCHAR(100),
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    requested_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update existing donors to 'Approved'
UPDATE donor SET status = 'Approved' WHERE status IS NULL;
