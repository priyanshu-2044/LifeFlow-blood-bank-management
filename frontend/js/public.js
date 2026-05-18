const API_BASE = 'http://localhost:5000/api';

// --- UI Navigation ---
async function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${pageId}`).classList.remove('hidden');
    window.scrollTo(0, 0);

    // Refresh donor data when showing the donate page
    if (pageId === 'donate' || pageId === 'home') {
        const donorId = localStorage.getItem('donor_id');
        if (donorId) {
            try {
                const res = await fetch(`${API_BASE}/donors/${donorId}`);
                if (res.ok) {
                    const freshDonor = await res.json();
                    localStorage.setItem('donor_name', freshDonor.name);
                    localStorage.setItem('donor_status', freshDonor.status);
                    updateAuthUI(freshDonor);
                }
            } catch (err) {
                console.error('Failed to sync donor data', err);
            }
        }
    }
}

// --- Toast System ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-emerald-500 shadow-emerald-100',
        error: 'bg-rose-500 shadow-rose-100',
        warning: 'bg-amber-500 shadow-amber-100',
        info: 'bg-slate-800 shadow-slate-200'
    };
    
    toast.className = `${colors[type]} text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade transform transition-all duration-300 mb-3 pointer-events-auto`;
    toast.innerHTML = `<span class="font-bold">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-8');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- Auth System ---
async function handleLogin() {
    const contact = document.getElementById('login-contact').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const res = await fetch(`${API_BASE}/public/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact, password: pass })
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('donor_id', data.donor.donor_id);
            localStorage.setItem('donor_name', data.donor.name);
            localStorage.setItem('donor_status', data.donor.status);
            updateAuthUI(data.donor);
            showToast(`Welcome back, ${data.donor.name.split(' ')[0]}!`);
            showPage('home');
        } else {
            showToast(data.message || 'Invalid credentials', 'error');
        }
    } catch (err) {
        showToast('Server connection failed', 'error');
    }
}

function updateAuthUI(donor) {
    const regFormContainer = document.getElementById('register-form-container');
    const donorStatusContainer = document.getElementById('donor-status-container');

    if (donor) {
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-name').innerText = donor.name;
        document.getElementById('user-initials').innerText = donor.name.substring(0, 2).toUpperCase();
        document.getElementById('req-auth-msg').classList.add('hidden');
        
        // Pre-fill request form contact
        if (donor.contact) document.getElementById('req-contact').value = donor.contact;

        // Update donate page to show status
        if (regFormContainer && donorStatusContainer) {
            regFormContainer.classList.add('hidden');
            donorStatusContainer.classList.remove('hidden');
            
            const iconEl = document.getElementById('donor-status-icon');
            const titleEl = document.getElementById('donor-status-title');
            const msgEl = document.getElementById('donor-status-message');

            if (donor.status === 'Pending') {
                iconEl.innerHTML = '<i data-lucide="clock" class="w-16 h-16 text-amber-500"></i>';
                titleEl.innerText = 'Application Pending';
                msgEl.innerText = 'Your donor application is waiting for admin approval. We will notify you once approved.';
                if(document.getElementById('schedule-donation-section')) {
                    document.getElementById('schedule-donation-section').classList.add('hidden');
                }
            } else if (donor.status === 'Approved') {
                iconEl.innerHTML = '<i data-lucide="check-circle" class="w-16 h-16 text-emerald-500"></i>';
                titleEl.innerText = 'You are a Donor!';
                msgEl.innerText = 'Thank you for being part of our life-saving network. You can schedule your next donation below.';
                if(document.getElementById('schedule-donation-section')) {
                    document.getElementById('schedule-donation-section').classList.remove('hidden');
                    loadBloodBanksForScheduling();
                }
            } else {
                // If rejected or other status
                iconEl.innerHTML = '<i data-lucide="info" class="w-16 h-16 text-slate-500"></i>';
                titleEl.innerText = 'Status: ' + donor.status;
                msgEl.innerText = 'Please contact support for more information.';
                if(document.getElementById('schedule-donation-section')) {
                    document.getElementById('schedule-donation-section').classList.add('hidden');
                }
            }
            if (window.lucide) window.lucide.createIcons();
        }
    } else {
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('user-profile').classList.add('hidden');
        document.getElementById('req-auth-msg').classList.remove('hidden');

        // Restore registration form
        if (regFormContainer && donorStatusContainer) {
            regFormContainer.classList.remove('hidden');
            donorStatusContainer.classList.add('hidden');
        }
    }
}

function logout() {
    localStorage.removeItem('donor_id');
    localStorage.removeItem('donor_name');
    localStorage.removeItem('donor_status');
    updateAuthUI(null);
    showToast('Logged out', 'info');
    showPage('home');
}

// --- Registration ---
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('reg-name').value,
        blood_group: document.getElementById('reg-group').value,
        contact: document.getElementById('reg-contact').value,
        password: document.getElementById('reg-pass').value,
        address: document.getElementById('reg-address').value
    };

    try {
        const res = await fetch(`${API_BASE}/public/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast('Application sent! Awaiting Admin Approval.');
            showPage('login');
        } else {
            const data = await res.json();
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
});

// --- Request Logic ---
window.toggleRelationField = function() {
    const reqFor = document.getElementById('req-for').value;
    const relationContainer = document.getElementById('req-relation-container');
    const reqNameInput = document.getElementById('req-name');
    const donorName = localStorage.getItem('donor_name');

    if (reqFor === 'Myself') {
        relationContainer.classList.add('hidden');
        if (donorName) reqNameInput.value = donorName;
        document.getElementById('req-relation').value = 'Self';
    } else {
        relationContainer.classList.remove('hidden');
        if (donorName && reqNameInput.value === donorName) {
            reqNameInput.value = '';
        }
        document.getElementById('req-relation').value = '';
    }
};

document.getElementById('request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let relation = 'Self';
    if (document.getElementById('req-for') && document.getElementById('req-for').value === 'Someone Else') {
        relation = document.getElementById('req-relation').value || 'Other';
    }

    const payload = {
        patient_name: document.getElementById('req-name').value,
        blood_group: document.getElementById('req-group').value,
        hospital_name: document.getElementById('req-hospital').value,
        contact: document.getElementById('req-contact').value,
        urgency: document.getElementById('req-urgency').value,
        relation: relation
    };

    try {
        const res = await fetch(`${API_BASE}/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            showToast('Request submitted! We are finding donors.', 'success');
            document.getElementById('request-form').reset();
            showPage('home');
        } else {
            showToast('Failed to submit request', 'error');
        }
    } catch (err) {
        showToast('Connection error', 'error');
    }
});

// --- Scheduling ---
async function loadBloodBanksForScheduling() {
    try {
        const res = await fetch(`${API_BASE}/blood-banks`);
        const banks = await res.json();
        const select = document.getElementById('sched-bank');
        if(select) {
            select.innerHTML = '<option value="">Select a Blood Bank...</option>';
            banks.forEach(bank => {
                select.innerHTML += `<option value="${bank.bank_id}">${bank.name} - ${bank.location}</option>`;
            });
        }
    } catch (err) {
        console.error('Failed to load banks', err);
    }
}

if(document.getElementById('schedule-form')) {
    document.getElementById('schedule-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const donorId = localStorage.getItem('donor_id');
        const bankId = document.getElementById('sched-bank').value;
        const date = document.getElementById('sched-date').value;

        if (!donorId || !bankId || !date) return;

        try {
            const res = await fetch(`${API_BASE}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donor_id: donorId, bank_id: bankId, appointment_date: date })
            });
            if (res.ok) {
                showToast('Donation scheduled successfully!', 'success');
                document.getElementById('schedule-form').reset();
            } else {
                showToast('Failed to schedule donation', 'error');
            }
        } catch (err) {
            showToast('Connection error', 'error');
        }
    });
}

// Initial Load
(async function() {
    const donorId = localStorage.getItem('donor_id');
    let donorName = localStorage.getItem('donor_name');
    let donorStatus = localStorage.getItem('donor_status');
    
    if (donorId) {
        // Optimistic UI update
        updateAuthUI({ donor_id: donorId, name: donorName, status: donorStatus });
        
        // Fetch latest data to ensure status is up-to-date
        try {
            const res = await fetch(`${API_BASE}/donors/${donorId}`);
            if (res.ok) {
                const freshDonor = await res.json();
                localStorage.setItem('donor_name', freshDonor.name);
                localStorage.setItem('donor_status', freshDonor.status);
                updateAuthUI(freshDonor);
            }
        } catch (err) {
            console.error('Failed to sync donor data', err);
        }
    }
})();
