const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- AUTHENTICATION ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'fake-jwt-token', user: 'Admin' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// --- ROUTES ---

// --- COMPATIBILITY LOGIC ---
const COMPATIBILITY_MAP = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
};

// 0. Blood Requests (Phase 7 & Public Portal)
app.get('/api/requests', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM blood_requests ORDER BY request_id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/requests', async (req, res) => {
    const { patient_name, blood_group, contact, hospital_name, patient_id, urgency, relation } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO blood_requests (patient_name, blood_group, contact, hospital_name, status, patient_id, urgency, relation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [patient_name, blood_group, contact, hospital_name, 'Pending', patient_id || null, urgency || 'Normal', relation || 'Self']
        );
        res.status(201).json({ id: result.insertId, message: 'Request submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PUBLIC PORTAL ROUTES ---
app.post('/api/public/register', async (req, res) => {
    const { name, blood_group, contact, password, address } = req.body;
    try {
        const [existing] = await db.query('SELECT donor_id FROM donor WHERE contact = ?', [contact]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Contact number already registered' });
        }

        const [result] = await db.query(
            'INSERT INTO donor (name, blood_group, contact, password, address, status) VALUES (?, ?, ?, ?, ?, ?)',
            [name, blood_group, contact, password, address, 'Pending']
        );
        res.status(201).json({ id: result.insertId, message: 'Donor application submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Auto-Fulfill Request (Phase 7+)
app.post('/api/requests/:id/fulfill', async (req, res) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1. Get request details
        const [requests] = await conn.query('SELECT * FROM blood_requests WHERE request_id = ?', [id]);
        if (!requests.length) throw new Error('Request not found');
        const request = requests[0];

        // 2. Find compatible blood groups
        const compatibleGroups = Object.keys(COMPATIBILITY_MAP).filter(donorGroup => 
            COMPATIBILITY_MAP[donorGroup].includes(request.blood_group)
        );

        // 3. Find oldest matching blood unit in stock
        const [units] = await conn.query(
            'SELECT * FROM blood WHERE blood_group IN (?) AND quantity > 0 ORDER BY donated_on ASC LIMIT 1',
            [compatibleGroups]
        );

        if (!units.length) {
            throw new Error(`No compatible ${request.blood_group} blood units in stock`);
        }

        const unit = units[0];

        // 4. Update Stock
        await conn.query('UPDATE blood SET quantity = quantity - 1 WHERE blood_id = ?', [unit.blood_id]);

        // 5. Log Distribution
        let targetPatientId = request.patient_id;

        if (!targetPatientId) {
            // If request came from public portal (no patient_id), create a patient record first
            const [newPatient] = await conn.query(
                'INSERT INTO patient (name, blood_group, contact) VALUES (?, ?, ?)',
                [request.patient_name, request.blood_group, request.contact]
            );
            targetPatientId = newPatient.insertId;
            
            // Link the new patient_id back to the request for consistency
            await conn.query('UPDATE blood_requests SET patient_id = ? WHERE request_id = ?', [targetPatientId, id]);
        }

        await conn.query(
            'INSERT INTO receives (patient_id, blood_id, received_on) VALUES (?, ?, NOW())',
            [targetPatientId, unit.blood_id]
        );

        // 6. Mark Request as Fulfilled
        await conn.query('UPDATE blood_requests SET status = "Approved" WHERE request_id = ?', [id]);

        await conn.commit();
        res.json({ message: 'Request fulfilled successfully!', unit_used: unit.blood_group });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ error: err.message });
    } finally {
        conn.release();
    }
});

app.post('/api/public/login', async (req, res) => {
    const { contact, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM donor WHERE contact = ? AND password = ?', [contact, password]);
        if (rows.length > 0) {
            res.json({ success: true, donor: rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Invalid contact or password' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/requests/:id', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
        await db.query('UPDATE blood_requests SET status = ? WHERE request_id = ?', [status, id]);
        res.json({ message: 'Request updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/donors/:id/status', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    try {
        await db.query('UPDATE donor SET status = ? WHERE donor_id = ?', [status, id]);
        res.json({ message: 'Donor status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1. Dashboard Stats
app.get('/api/stats', async (req, res) => {
    try {
        const [donors] = await db.query('SELECT COUNT(*) as count FROM donor');
        const [banks] = await db.query('SELECT COUNT(*) as count FROM blood_bank');
        const [patients] = await db.query('SELECT COUNT(*) as count FROM patient');
        const [staff] = await db.query('SELECT COUNT(*) as count FROM staff');
        const [inventory] = await db.query('SELECT SUM(quantity) as count FROM blood');
        
        res.json({
            donors: donors[0].count,
            banks: banks[0].count,
            patients: patients[0].count,
            staff: staff[0].count,
            inventory: Number(inventory[0].count) || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Blood Inventory
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT b.blood_id, b.blood_group, b.quantity, b.donated_on, 
                   d.name as donor_name, bb.name as bank_name
            FROM blood b
            JOIN donor d ON b.donor_id = d.donor_id
            JOIN blood_bank bb ON b.bank_id = bb.bank_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Donors
app.get('/api/donors', async (req, res) => {
    const { status } = req.query; // Optional filter
    try {
        let query = 'SELECT * FROM donor';
        if (status) query += ' WHERE status = ?';
        const [rows] = await db.query(query, status ? [status] : []);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/donors/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM donor WHERE donor_id = ?', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Donor not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/donors', async (req, res) => {
    const { name, blood_group, contact, address } = req.body;
    try {
        const [existing] = await db.query('SELECT donor_id FROM donor WHERE contact = ?', [contact]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Contact number already registered' });
        }

        const [result] = await db.query(
            'INSERT INTO donor (name, blood_group, contact, address) VALUES (?, ?, ?, ?)',
            [name, blood_group, contact, address]
        );
        res.status(201).json({ id: result.insertId, message: 'Donor registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Blood Banks
app.get('/api/blood-banks', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM blood_bank');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Appointments
app.post('/api/appointments', async (req, res) => {
    const { donor_id, bank_id, appointment_date } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO appointments (donor_id, bank_id, appointment_date, status) VALUES (?, ?, ?, ?)',
            [donor_id, bank_id, appointment_date, 'Scheduled']
        );
        res.status(201).json({ id: result.insertId, message: 'Donation scheduled successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/appointments', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, d.name as donor_name, d.blood_group, d.contact, bb.name as bank_name 
            FROM appointments a
            JOIN donor d ON a.donor_id = d.donor_id
            JOIN blood_bank bb ON a.bank_id = bb.bank_id
            ORDER BY a.appointment_date ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/appointments/donor/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT a.*, bb.name as bank_name, bb.location as bank_location
            FROM appointments a
            JOIN blood_bank bb ON a.bank_id = bb.bank_id
            WHERE a.donor_id = ?
            ORDER BY a.appointment_date DESC
        `, [id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, id]);
        res.json({ message: 'Appointment status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/blood-banks', async (req, res) => {
    const { name, location } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO blood_bank (name, location) VALUES (?, ?)',
            [name, location]
        );
        res.status(201).json({ id: result.insertId, message: 'Blood bank registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Patients
app.get('/api/patients', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM patient');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/patients', async (req, res) => {
    const { name, blood_group, contact } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO patient (name, blood_group, contact) VALUES (?, ?, ?)',
            [name, blood_group, contact]
        );
        res.status(201).json({ id: result.insertId, message: 'Patient registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Hospitals
app.get('/api/hospitals', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT h.*, bb.name as bank_name 
            FROM hospital h
            JOIN blood_bank bb ON h.bank_id = bb.bank_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/hospitals', async (req, res) => {
    const { name, location, bank_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO hospital (name, location, bank_id) VALUES (?, ?, ?)',
            [name, location, bank_id]
        );
        res.status(201).json({ id: result.insertId, message: 'Hospital registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6.5 Staff (Phase 2)
app.get('/api/staff', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, bb.name as bank_name 
            FROM staff s
            JOIN blood_bank bb ON s.bank_id = bb.bank_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/staff', async (req, res) => {
    const { name, role, bank_id } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO staff (name, role, bank_id) VALUES (?, ?, ?)',
            [name, role, bank_id]
        );
        res.status(201).json({ id: result.insertId, message: 'Staff registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PHASE 5: TRANSACTIONS ---

// 7. Record Donation (Adds to blood table)
app.post('/api/donations', async (req, res) => {
    const { donor_id, bank_id, blood_group, quantity } = req.body;
    try {
        // Validation: Only approved donors can donate (Phase 5 Business Logic)
        const [donor] = await db.query('SELECT status FROM donor WHERE donor_id = ?', [donor_id]);
        if (!donor.length || donor[0].status !== 'Approved') {
            return res.status(403).json({ error: 'Only approved donors can record donations' });
        }

        const [result] = await db.query(
            'INSERT INTO blood (donor_id, bank_id, blood_group, quantity) VALUES (?, ?, ?, ?)',
            [donor_id, bank_id, blood_group, quantity]
        );
        res.status(201).json({ id: result.insertId, message: 'Donation recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7.5 Donation History (Phase 5)
app.get('/api/donations', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT b.*, d.name as donor_name, bb.name as bank_name
            FROM blood b
            JOIN donor d ON b.donor_id = d.donor_id
            JOIN blood_bank bb ON b.bank_id = bb.bank_id
            ORDER BY b.donated_on DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Record Distribution (Patient receives blood)
app.post('/api/distributions', async (req, res) => {
    const { patient_id, blood_id } = req.body;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // 1. Check if blood unit exists and has quantity
        const [blood] = await conn.query('SELECT quantity FROM blood WHERE blood_id = ?', [blood_id]);
        if (!blood.length || blood[0].quantity <= 0) {
            throw new Error('Blood unit not available or out of stock');
        }

        // 2. Record the receipt
        await conn.query('INSERT INTO receives (patient_id, blood_id) VALUES (?, ?)', [patient_id, blood_id]);

        // 3. Deduct quantity (Simple logic: 1 unit per distribution)
        await conn.query('UPDATE blood SET quantity = quantity - 1 WHERE blood_id = ?', [blood_id]);

        await conn.commit();
        res.status(201).json({ message: 'Blood distribution recorded successfully' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

// 9. Generic DELETE (Phase 4)
app.delete('/api/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const tableMap = {
        'donors': 'donor',
        'patients': 'patient',
        'staff': 'staff',
        'hospitals': 'hospital',
        'blood-banks': 'blood_bank',
        'inventory': 'blood',
        'requests': 'blood_requests'
    };

    const idMap = {
        'donors': 'donor_id',
        'patients': 'patient_id',
        'staff': 'staff_id',
        'hospitals': 'hospital_id',
        'blood-banks': 'bank_id',
        'inventory': 'blood_id',
        'requests': 'request_id'
    };

    const table = tableMap[type];
    const idColumn = idMap[type];

    if (!table || !idColumn) return res.status(400).json({ error: 'Invalid type' });

    try {
        await db.query(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Distribution History (Phase 4)
app.get('/api/distributions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, p.name as patient_name, b.blood_group, b.blood_id 
            FROM receives r
            JOIN patient p ON r.patient_id = p.patient_id
            JOIN blood b ON r.blood_id = b.blood_id
            ORDER BY r.received_on DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
