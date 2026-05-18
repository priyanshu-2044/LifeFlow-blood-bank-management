const API_BASE = 'http://localhost:5000/api';

// --- TOAST SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-emerald-500 shadow-emerald-100',
        error: 'bg-rose-500 shadow-rose-100',
        warning: 'bg-amber-500 shadow-amber-100',
        info: 'bg-slate-800 shadow-slate-200'
    };
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    toast.className = `${colors[type]} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in pointer-events-auto transform transition-all duration-300 mb-3`;
    toast.innerHTML = `
        <i data-lucide="${icons[type]}" class="w-5 h-5"></i>
        <span class="text-sm font-bold">${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-12');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- AUTHENTICATION ---
async function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const error = document.getElementById('login-error');
    
    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', data.user);
            showToast(`Welcome back, ${data.user}!`);
            checkAuth();
        } else {
            error.innerText = data.message;
            error.classList.remove('hidden');
            showToast(data.message, 'error');
        }
    } catch (err) {
        error.innerText = 'Server connection failed';
        error.classList.remove('hidden');
        showToast('Connection failed', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'info');
    checkAuth();
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const screen = document.getElementById('login-screen');
    
    if (token) {
        screen.classList.add('hidden');
        document.getElementById('user-initials').innerText = user.substring(0, 2).toUpperCase();
        showSection('dashboard');
    } else {
        screen.classList.remove('hidden');
    }
}

// --- UI Navigation ---
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    
    // Update Sidebar Links
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active-link'));
    document.getElementById(`link-${sectionId}`).classList.add('active-link');

    // Show selected section
    const title = document.getElementById('section-title');
    const tableSection = document.getElementById('table-view');
    const dashboardSection = document.getElementById('dashboard');

    if (sectionId === 'dashboard') {
        dashboardSection.classList.remove('hidden');
        title.innerText = 'Dashboard';
        loadDashboardStats();
    } else {
        tableSection.classList.remove('hidden');
        title.innerText = sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace('-', ' ');
        loadTableData(sectionId);
    }
}

// --- Data Fetching ---

async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const stats = await res.json();
        
        document.getElementById('stat-donors').innerText = stats.donors;
        document.getElementById('stat-inventory').innerText = stats.inventory;
        document.getElementById('stat-patients').innerText = stats.patients;
        document.getElementById('stat-banks').innerText = stats.banks;
        document.getElementById('stat-staff').innerText = stats.staff;

        // Load Pending Requests count (Phase 7)
        const reqRes = await fetch(`${API_BASE}/requests`);
        const requests = await reqRes.json();
        const pendingReqs = requests.filter(r => r.status === 'Pending').length;
        if (pendingReqs > 0) {
            document.getElementById('link-requests').innerHTML += `<span class="ml-auto bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">${pendingReqs}</span>`;
        }

        // Load recent donors (Phase 1)
        const donorsRes = await fetch(`${API_BASE}/donors`);
        const donors = await donorsRes.json();
        const recent = donors.slice(-5).reverse();
        
        const tbody = document.getElementById('recent-donors-body');
        tbody.innerHTML = recent.map(d => `
            <tr class="border-b border-slate-50">
                <td class="py-3 font-medium text-slate-700">${d.name}</td>
                <td class="py-3"><span class="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">${d.blood_group}</span></td>
                <td class="py-3 text-slate-500 text-xs">${d.contact}</td>
            </tr>
        `).join('');

        // Load Stock Alerts (Phase 1)
        const inventoryRes = await fetch(`${API_BASE}/inventory`);
        const inventory = await inventoryRes.json();
        
        // --- Phase 6: Stock Visualization ---
        renderStockChart(inventory);

        const critical = inventory.filter(i => i.quantity < 2);
        
        const alertDiv = document.getElementById('stock-alerts');
        if (critical.length > 0) {
            alertDiv.innerHTML = critical.map(c => `
                <div class="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100 group hover:bg-rose-100/50 transition-colors">
                    <div class="flex items-center gap-3">
                        <span class="w-8 h-8 bg-rose-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">${c.blood_group}</span>
                        <div>
                            <p class="text-sm font-bold text-slate-700">${c.bank_name}</p>
                            <p class="text-[10px] text-rose-600 font-bold uppercase tracking-tight">Only ${c.quantity} unit left</p>
                        </div>
                    </div>
                    <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-500 animate-pulse"></i>
                </div>
            `).join('');
        } else {
            alertDiv.innerHTML = '<div class="flex flex-col items-center py-4 text-slate-400"><i data-lucide="check-circle" class="w-8 h-8 mb-2 text-emerald-500/50"></i><p class="text-sm">All stock levels are optimal</p></div>';
        }
        lucide.createIcons();

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

let currentTableData = [];
let currentTableType = '';

async function loadTableData(type) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    const search = document.getElementById('table-search');
    const filter = document.getElementById('group-filter');
    
    currentTableType = type;
    search.value = '';
    filter.value = '';
    
    // Show filter only for inventory/donors/patients/distributions/requests/appointments
    const groupFilterable = ['inventory', 'donors', 'patients', 'distributions', 'requests', 'appointments'].includes(type);
    if (groupFilterable) filter.classList.remove('hidden');
    else filter.classList.add('hidden');

    // Show status filter for donors
    const statusToggle = document.getElementById('status-toggle-container');
    if (type === 'donors') statusToggle.classList.remove('hidden');
    else statusToggle.classList.add('hidden');

    body.innerHTML = '<tr><td colspan="6" class="p-12 text-center"><div class="flex flex-col items-center gap-3"><div class="loader"></div><span class="text-slate-400 text-sm">Fetching records...</span></div></td></tr>';
    
    try {
        const res = await fetch(`${API_BASE}/${type}`);
        currentTableData = await res.json();
        
        if (currentTableData.length === 0) {
            body.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-slate-400">No records found matching your criteria.</td></tr>';
        } else {
            renderTable(currentTableData);
        }
    } catch (err) {
        body.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-red-500 font-medium">Failed to connect to server.</td></tr>`;
    }
}

function renderTable(data) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    const type = currentTableType;

    const groupTags = {
        'A+': 'bg-rose-100 text-rose-700', 'A-': 'bg-rose-50 text-rose-600 border border-rose-100',
        'B+': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-50 text-blue-600 border border-blue-100',
        'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-50 text-purple-600 border border-purple-100',
        'O+': 'bg-emerald-100 text-emerald-700', 'O-': 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    };

    if (type === 'donors') {
        head.innerHTML = `<tr><th class="p-5">Donor Name</th><th class="p-5">Group</th><th class="p-5">Contact</th><th class="p-5">Status</th><th class="p-5">Location</th><th class="p-5 text-right">Actions</th></tr>`;
        body.innerHTML = data.map(d => `
            <tr class="border-b border-slate-50 hover:bg-slate-50/80 transition group">
                <td class="p-5">
                    <div class="font-semibold text-slate-700">${d.name}</div>
                    <div class="text-[10px] text-slate-400 uppercase tracking-tighter">ID: #${d.donor_id}</div>
                </td>
                <td class="p-5"><span class="${groupTags[d.blood_group] || 'bg-slate-100'} px-2.5 py-1 rounded-md text-xs font-bold">${d.blood_group}</span></td>
                <td class="p-5 text-slate-600 font-medium">${d.contact}</td>
                <td class="p-5">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${d.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                        ${d.status || 'Pending'}
                    </span>
                </td>
                <td class="p-5 text-slate-500 text-sm">${d.address || 'N/A'}</td>
                <td class="p-5 text-right flex items-center justify-end gap-2">
                    ${d.status !== 'Approved' ? `
                    <button onclick="updateDonorStatus(${d.donor_id}, 'Approved')" class="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition" title="Approve Donor">
                        <i data-lucide="user-check" class="w-4 h-4"></i>
                    </button>` : ''}
                    <button onclick="deleteRecord('donors', ${d.donor_id})" class="p-2 text-slate-300 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
    } else if (type === 'inventory') {
        head.innerHTML = `<tr><th class="p-5">Blood Group</th><th class="p-5">Stock</th><th class="p-5">Date</th><th class="p-5">Source Donor</th><th class="p-5">Storage Bank</th><th class="p-5 text-right">Actions</th></tr>`;
        body.innerHTML = data.map(d => `
            <tr class="border-b border-slate-50 hover:bg-slate-50/80 transition">
                <td class="p-5"><span class="${groupTags[d.blood_group]} px-3 py-1.5 rounded-lg text-sm font-black tracking-widest">${d.blood_group}</span></td>
                <td class="p-5">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-700">${d.quantity}</span>
                        <span class="text-slate-400 text-xs">Units</span>
                    </div>
                </td>
                <td class="p-5 text-slate-500 text-xs">${new Date(d.donated_on).toLocaleDateString()}</td>
                <td class="p-5 text-slate-600 text-sm">${d.donor_name}</td>
                <td class="p-5 text-slate-600 text-sm">${d.bank_name}</td>
                <td class="p-5 text-right flex items-center justify-end gap-2">
                    ${d.quantity > 0 ? `
                    <button onclick="showDistributeModal(${d.blood_id}, '${d.blood_group}')" class="text-xs bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition shadow-sm hover:shadow-rose-100 font-bold">
                        Distribute
                    </button>` : '<span class="text-xs font-bold text-slate-300 uppercase tracking-widest">Depleted</span>'}
                    <button onclick="deleteRecord('inventory', ${d.blood_id})" class="p-2 text-slate-300 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
    } else if (type === 'patients') {
        head.innerHTML = `<tr><th class="p-4">Name</th><th class="p-4">Required Group</th><th class="p-4">Contact</th><th class="p-4 text-right">Action</th></tr>`;
        body.innerHTML = data.map(p => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium">${p.name}</td>
                <td class="p-4"><span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">${p.blood_group}</span></td>
                <td class="p-4 text-slate-600">${p.contact}</td>
                <td class="p-4 text-right">
                    <button onclick="deleteRecord('patients', ${p.patient_id})" class="text-slate-300 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
    } else if (type === 'hospitals') {
        head.innerHTML = `<tr><th class="p-4">Hospital Name</th><th class="p-4">Location</th><th class="p-4">Associated Bank</th><th class="p-4 text-right">Action</th></tr>`;
        body.innerHTML = data.map(h => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium">${h.name}</td>
                <td class="p-4 text-slate-600">${h.location}</td>
                <td class="p-4 text-slate-500">${h.bank_name}</td>
                <td class="p-4 text-right">
                    <button onclick="deleteRecord('hospitals', ${h.hospital_id})" class="text-slate-300 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
    } else if (type === 'blood-banks') {
        head.innerHTML = `<tr><th class="p-4">Bank Name</th><th class="p-4">Location</th><th class="p-4 text-right">Action</th></tr>`;
        body.innerHTML = data.map(b => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium">${b.name}</td>
                <td class="p-4 text-slate-600">${b.location}</td>
                <td class="p-4 text-right">
                    <button onclick="deleteRecord('blood-banks', ${b.bank_id})" class="text-slate-300 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
    } else if (type === 'staff') {
        head.innerHTML = `<tr><th class="p-4">Staff Name</th><th class="p-4">Role</th><th class="p-4">Assigned Bank</th><th class="p-4 text-right">Action</th></tr>`;
        body.innerHTML = data.map(s => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium">${s.name}</td>
                <td class="p-4"><span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">${s.role}</span></td>
                <td class="p-4 text-slate-600">${s.bank_name}</td>
                <td class="p-4 text-right">
                    <button onclick="deleteRecord('staff', ${s.staff_id})" class="text-slate-300 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
    } else if (type === 'distributions') {
        head.innerHTML = `<tr><th class="p-4">Recipient Patient</th><th class="p-4">Blood Unit</th><th class="p-4">Date Issued</th></tr>`;
        body.innerHTML = data.map(d => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium text-slate-700">${d.patient_name}</td>
                <td class="p-4"><span class="${groupTags[d.blood_group]} px-2 py-0.5 rounded text-xs font-bold">${d.blood_group}</span> <span class="text-[10px] text-slate-400">ID: #${d.blood_id}</span></td>
                <td class="p-4 text-slate-500 text-sm">${new Date(d.received_on).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } else if (type === 'donations') {
        head.innerHTML = `<tr><th class="p-4">Source Donor</th><th class="p-4">Blood Group</th><th class="p-4">Quantity</th><th class="p-4">Bank</th><th class="p-4">Date</th></tr>`;
        body.innerHTML = data.map(d => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium text-slate-700">${d.donor_name}</td>
                <td class="p-4"><span class="${groupTags[d.blood_group]} px-2 py-0.5 rounded text-xs font-bold">${d.blood_group}</span></td>
                <td class="p-4 text-slate-600">${d.quantity} units</td>
                <td class="p-4 text-slate-500">${d.bank_name}</td>
                <td class="p-4 text-slate-400 text-xs">${new Date(d.donated_on).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } else if (type === 'requests') {
        head.innerHTML = `<tr><th class="p-4">Patient Name</th><th class="p-4">Group</th><th class="p-4">Hospital</th><th class="p-4">Status</th><th class="p-4 text-right">Actions</th></tr>`;
        body.innerHTML = data.map(r => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium text-slate-700">${r.patient_name}</td>
                <td class="p-4"><span class="${groupTags[r.blood_group]} px-2 py-0.5 rounded text-xs font-bold">${r.blood_group}</span></td>
                <td class="p-4 text-slate-600 text-sm">${r.hospital_name}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">
                        ${r.status || 'Pending'}
                    </span>
                </td>
                <td class="p-4 text-right flex items-center justify-end gap-2">
                    ${r.status === 'Pending' ? `
                    <button onclick="fulfillRequest(${r.request_id})" class="text-[10px] bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition font-bold flex items-center gap-1 shadow-sm">
                        <i data-lucide="zap" class="w-3 h-3"></i> Fulfill
                    </button>
                    <button onclick="updateRequestStatus(${r.request_id}, 'Rejected')" class="p-1.5 text-rose-300 hover:text-rose-600 rounded transition" title="Reject"><i data-lucide="x" class="w-4 h-4"></i></button>` : ''}
                    <button onclick="deleteRecord('requests', ${r.request_id})" class="p-1.5 text-slate-300 hover:text-rose-600 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>
        `).join('');
    } else if (type === 'appointments') {
        head.innerHTML = `<tr><th class="p-4">Donor Name</th><th class="p-4">Group</th><th class="p-4">Blood Bank</th><th class="p-4">Date</th><th class="p-4">Status</th><th class="p-4 text-right">Actions</th></tr>`;
        body.innerHTML = data.map(a => `
            <tr class="border-b border-slate-50 hover:bg-slate-50 transition">
                <td class="p-4 font-medium text-slate-700">
                    ${a.donor_name} <br>
                    <span class="text-[10px] text-slate-400">${a.contact}</span>
                </td>
                <td class="p-4"><span class="${groupTags[a.blood_group]} px-2 py-0.5 rounded text-xs font-bold">${a.blood_group}</span></td>
                <td class="p-4 text-slate-600 text-sm">${a.bank_name}</td>
                <td class="p-4 text-slate-700 font-medium">${new Date(a.appointment_date).toLocaleDateString()}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${a.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">
                        ${a.status || 'Scheduled'}
                    </span>
                </td>
                <td class="p-4 text-right flex items-center justify-end gap-2">
                    ${a.status === 'Scheduled' ? `
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Completed')" class="text-[10px] bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition font-bold shadow-sm">
                        Complete
                    </button>
                    <button onclick="updateAppointmentStatus(${a.appointment_id}, 'Cancelled')" class="p-1.5 text-rose-300 hover:text-rose-600 rounded transition" title="Cancel"><i data-lucide="x" class="w-4 h-4"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    }
    
    // Ensure icons are rendered for newly added elements
    lucide.createIcons();
}

// --- CRUD Actions (Phase 4) ---
async function deleteRecord(type, id) {
    if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)}? This action cannot be undone.`)) return;
    
    try {
        const res = await fetch(`${API_BASE}/${type}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`${type.slice(0, -1)} deleted successfully`, 'warning');
            loadTableData(currentTableType);
            loadDashboardStats();
        }
    } catch (err) {
        showToast('Failed to delete record', 'error');
    }
}

async function updateDonorStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/donors/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            showToast(`Donor status updated to ${status}`);
            loadTableData('donors');
            loadDashboardStats();
        }
    } catch (err) {
        showToast('Status update failed', 'error');
    }
}

async function updateRequestStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/requests/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            showToast(`Request marked as ${status}`);
            loadTableData('requests');
            loadDashboardStats();
        }
    } catch (err) {
        showToast('Request update failed', 'error');
    }
}

async function fulfillRequest(id) {
    try {
        const res = await fetch(`${API_BASE}/requests/${id}/fulfill`, {
            method: 'POST'
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast(data.message + ` (Used ${data.unit_used} unit)`);
            loadTableData('requests');
            loadDashboardStats();
        } else {
            showToast(data.error || 'Fulfillment failed', 'error');
        }
    } catch (err) {
        showToast('Server error during fulfillment', 'error');
    }
}

async function updateAppointmentStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/appointments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            showToast(`Appointment marked as ${status}`);
            loadTableData('appointments');
        }
    } catch (err) {
        showToast('Update failed', 'error');
    }
}

function renderStockChart(inventory) {
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const stockCounts = {};
    groups.forEach(g => stockCounts[g] = 0);
    
    inventory.forEach(i => {
        if (stockCounts[i.blood_group] !== undefined) {
            stockCounts[i.blood_group] += Number(i.quantity);
        }
    });

    const maxStock = Math.max(...Object.values(stockCounts), 10);
    const chartDiv = document.getElementById('stock-chart-bars');
    
    if (chartDiv) {
        chartDiv.innerHTML = groups.map(g => {
            const percentage = (stockCounts[g] / maxStock) * 100;
            return `
                <div class="flex flex-col items-center gap-2 flex-1 group">
                    <div class="w-full bg-slate-50 rounded-lg flex items-end h-32 relative overflow-hidden">
                        <div class="w-full bg-rose-500/80 group-hover:bg-rose-600 transition-all rounded-t-sm" style="height: ${percentage}%">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                        </div>
                        <span class="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">${stockCounts[g]}</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-500">${g}</span>
                </div>
            `;
        }).join('');
    }
}

function filterData() {
    const searchTerm = document.getElementById('table-search').value.toLowerCase();
    const groupFilter = document.getElementById('group-filter').value;
    const showPendingOnly = document.getElementById('status-toggle')?.checked;

    const filtered = currentTableData.filter(item => {
        const matchesSearch = Object.values(item).some(val => 
            String(val).toLowerCase().includes(searchTerm)
        );
        const matchesGroup = !groupFilter || item.blood_group === groupFilter;
        const matchesStatus = !showPendingOnly || item.status === 'Pending';
        
        return matchesSearch && matchesGroup && matchesStatus;
    });

    renderTable(filtered);
}

document.getElementById('table-search').addEventListener('input', filterData);
document.getElementById('group-filter').addEventListener('change', filterData);

function exportToCSV() {
    if (!currentTableData.length) return;
    const headers = Object.keys(currentTableData[0]);
    const rows = currentTableData.map(obj => headers.map(h => `"${obj[h]}"`).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeflow-${currentTableType}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

// --- Modals & Forms ---

let currentFormType = 'donors';

async function openModal() {
    const modal = document.getElementById('modal');
    const form = document.getElementById('entry-form');
    const type = currentTableType;
    
    currentFormType = type;
    
    if (type === 'donors') {
        form.innerHTML = `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input type="text" id="donor-name" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Blood Group</label>
                <select id="donor-group" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none">
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Contact Number</label>
                <input type="text" id="donor-contact" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Address</label>
                <textarea id="donor-address" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none" rows="2"></textarea>
            </div>
        `;
    } else if (type === 'inventory') {
        currentFormType = 'donations';
        const [donors, banks] = await Promise.all([
            fetch(`${API_BASE}/donors?status=Approved`).then(r => r.json()),
            fetch(`${API_BASE}/blood-banks`).then(r => r.json())
        ]);
        
        if (donors.length === 0) {
            form.innerHTML = `<div class="p-8 text-center text-rose-500 bg-rose-50 rounded-xl">
                <i data-lucide="alert-circle" class="w-10 h-10 mx-auto mb-3"></i>
                <p class="font-bold">No Approved Donors</p>
                <p class="text-xs mt-1">Please approve a donor first in the Donors section.</p>
            </div>`;
            document.getElementById('save-btn').classList.add('hidden');
        } else {
            document.getElementById('save-btn').classList.remove('hidden');
            form.innerHTML = `
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Select Approved Donor</label>
                    <select id="donation-donor" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none">
                        ${donors.map(d => `<option value="${d.donor_id}">${d.name} (${d.blood_group})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Target Blood Bank</label>
                    <select id="donation-bank" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none">
                        ${banks.map(b => `<option value="${b.bank_id}">${b.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Quantity (Units)</label>
                    <input type="number" id="donation-qty" value="1" min="1" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none">
                </div>
            `;
        }
    } else if (type === 'patients') {
        form.innerHTML = `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Patient Name</label>
                <input type="text" id="patient-name" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Required Blood Group</label>
                <select id="patient-group" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Contact Number</label>
                <input type="text" id="patient-contact" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" required>
            </div>
        `;
    } else if (type === 'hospitals') {
        const banks = await fetch(`${API_BASE}/blood-banks`).then(r => r.json());
        form.innerHTML = `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Hospital Name</label>
                <input type="text" id="hosp-name" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Location</label>
                <input type="text" id="hosp-loc" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Associated Blood Bank</label>
                <select id="hosp-bank" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none">
                    ${banks.map(b => `<option value="${b.bank_id}">${b.name}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (type === 'blood-banks') {
        form.innerHTML = `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Bank Name</label>
                <input type="text" id="bank-name" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Location</label>
                <input type="text" id="bank-loc" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none" required>
            </div>
        `;
    } else if (type === 'staff') {
        const banks = await fetch(`${API_BASE}/blood-banks`).then(r => r.json());
        form.innerHTML = `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Full Name</label>
                <input type="text" id="staff-name" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Role / Designation</label>
                <select id="staff-role" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option>Doctor</option><option>Technician</option><option>Nurse</option><option>Receptionist</option><option>Administrator</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Assigned Bank</label>
                <select id="staff-bank" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                    ${banks.map(b => `<option value="${b.bank_id}">${b.name}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (type === 'requests') {
        form.innerHTML = `
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Patient Name</label>
                <input type="text" id="req-patient" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Blood Group Required</label>
                <select id="req-group" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none">
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Hospital Name</label>
                <input type="text" id="req-hosp" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none" required>
            </div>
            <div>
                <label class="block text-xs font-bold uppercase text-slate-400 mb-1">Contact Number</label>
                <input type="text" id="req-contact" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 outline-none" required>
            </div>
        `;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// --- Blood Compatibility Logic (Phase 3) ---
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

function canReceive(donorGroup, recipientGroup) {
    return COMPATIBILITY_MAP[donorGroup]?.includes(recipientGroup) || false;
}

async function showDistributeModal(bloodId, bloodGroup) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('entry-form');
    
    currentFormType = 'distributions';
    
    const [patients, distributions] = await Promise.all([
        fetch(`${API_BASE}/patients`).then(r => r.json()),
        fetch(`${API_BASE}/distributions`).then(r => r.json())
    ]);

    const receivedIds = new Set(distributions.map(d => d.patient_id));
    const compatiblePatients = patients.filter(p => 
        !receivedIds.has(p.patient_id) && 
        canReceive(bloodGroup, p.blood_group)
    );
    
    form.innerHTML = `
        <input type="hidden" id="dist-blood-id" value="${bloodId}">
        <div class="bg-rose-50 p-4 rounded-xl mb-4 border border-rose-100">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold uppercase text-rose-500 tracking-widest">Selected Unit</span>
                <span class="bg-rose-600 text-white px-2 py-0.5 rounded text-xs font-bold">${bloodGroup}</span>
            </div>
            <p class="text-[10px] text-slate-500 leading-tight">This unit can be safely given to patients with: <span class="font-bold text-rose-700">${COMPATIBILITY_MAP[bloodGroup].join(', ')}</span></p>
        </div>
        <div>
            <label class="block text-xs font-bold uppercase text-slate-400 mb-2">Select Compatible Patient</label>
            <select id="dist-patient-id" class="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-rose-500 outline-none">
                ${compatiblePatients.length > 0 
                    ? compatiblePatients.map(p => `<option value="${p.patient_id}">${p.name} (${p.blood_group})</option>`).join('')
                    : '<option disabled>No compatible patients found</option>'
                }
            </select>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

document.getElementById('add-btn').addEventListener('click', openModal);

document.getElementById('save-btn').addEventListener('click', async () => {
    let payload = {};
    let endpoint = currentFormType;

    if (currentFormType === 'donors') {
        payload = {
            name: document.getElementById('donor-name').value,
            blood_group: document.getElementById('donor-group').value,
            contact: document.getElementById('donor-contact').value,
            address: document.getElementById('donor-address').value
        };
        if (!payload.name || !payload.contact) return alert('Please fill required fields');
    } else if (currentFormType === 'donations') {
        const donorSelect = document.getElementById('donation-donor');
        const donorText = donorSelect.options[donorSelect.selectedIndex].text;
        payload = {
            donor_id: donorSelect.value,
            bank_id: document.getElementById('donation-bank').value,
            blood_group: donorText.match(/\(([^)]+)\)/)[1], // Extract group from text like "Name (A+)"
            quantity: document.getElementById('donation-qty').value
        };
    } else if (currentFormType === 'distributions') {
        payload = {
            patient_id: document.getElementById('dist-patient-id').value,
            blood_id: document.getElementById('dist-blood-id').value
        };
    } else if (currentFormType === 'patients') {
        payload = {
            name: document.getElementById('patient-name').value,
            blood_group: document.getElementById('patient-group').value,
            contact: document.getElementById('patient-contact').value
        };
        endpoint = 'patients';
    } else if (currentFormType === 'hospitals') {
        payload = {
            name: document.getElementById('hosp-name').value,
            location: document.getElementById('hosp-loc').value,
            bank_id: document.getElementById('hosp-bank').value
        };
        endpoint = 'hospitals';
    } else if (currentFormType === 'blood-banks') {
        payload = {
            name: document.getElementById('bank-name').value,
            location: document.getElementById('bank-loc').value
        };
        endpoint = 'blood-banks';
    } else if (currentFormType === 'staff') {
        payload = {
            name: document.getElementById('staff-name').value,
            role: document.getElementById('staff-role').value,
            bank_id: document.getElementById('staff-bank').value
        };
        endpoint = 'staff';
    } else if (currentFormType === 'requests') {
        payload = {
            patient_name: document.getElementById('req-patient').value,
            blood_group: document.getElementById('req-group').value,
            hospital_name: document.getElementById('req-hosp').value,
            contact: document.getElementById('req-contact').value
        };
        endpoint = 'requests';
    }

    try {
        const res = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            closeModal();
            showToast('Record saved successfully!');
            loadTableData(currentTableType);
            loadDashboardStats();
        } else {
            const errData = await res.json();
            showToast(errData.error || 'Error saving record', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server', 'error');
    }
});

// Initial Load
checkAuth();
