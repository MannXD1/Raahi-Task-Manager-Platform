// Three.js Background Setup
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Particles
const geometry = new THREE.BufferGeometry();
const particlesCount = 1500;
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 10;
}

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const material = new THREE.PointsMaterial({
    size: 0.015,
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.8
});

const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);

camera.position.z = 3;

let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX / window.innerWidth - 0.5;
    mouseY = event.clientY / window.innerHeight - 0.5;
});

const animate = () => {
    requestAnimationFrame(animate);
    particlesMesh.rotation.y += 0.001;
    particlesMesh.rotation.x += 0.0005;
    
    // Interactive mouse movement
    particlesMesh.rotation.y += mouseX * 0.01;
    particlesMesh.rotation.x += mouseY * 0.01;

    renderer.render(scene, camera);
};

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// App Logic (API & DOM)
const apiBase = '/api';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const userInfo = document.getElementById('userInfo');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');

// State
let user = null;
let projects = [];
let currentProjectId = null;
let currentStatusFilter = null;
let globalDisplayTasks = [];

// CSRF Token Helper for Django
function getCsrfToken() {
    let cookieValue = '';
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === ('csrftoken=')) {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    // Fallback to DOM if cookie is somehow missing
    if (!cookieValue) {
        const el = document.querySelector('[name=csrfmiddlewaretoken]');
        cookieValue = el ? el.value : '';
    }
    return cookieValue;
}

// Auth Tabs Toggle
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

// Auth Handlers
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch(`${apiBase}/auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({
            action: 'login',
            username: loginForm.querySelector('#login-username').value,
            password: loginForm.querySelector('#login-password').value
        })
    });
    if (res.ok) {
        user = await res.json();
        initDashboard();
    } else {
        alert('Login failed');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await fetch(`${apiBase}/auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({
            action: 'register',
            username: registerForm.querySelector('#reg-username').value,
            email: registerForm.querySelector('#reg-email').value,
            password: registerForm.querySelector('#reg-password').value,
            role: registerForm.querySelector('#reg-role').value
        })
    });
    if (res.ok) {
        user = await res.json();
        initDashboard();
    } else {
        const errData = await res.json();
        alert('Registration failed: ' + JSON.stringify(errData));
    }
});

logoutBtn.addEventListener('click', async () => {
    await fetch(`${apiBase}/auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({ action: 'logout' })
    });
    location.reload();
});

// Dashboard Init
async function initDashboard() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    document.getElementById('username-display').innerText = `Hello, ${user.username} (${user.role})`;
    
    if (user.role !== 'ADMIN') {
        document.getElementById('new-project-btn').classList.add('hidden');
        document.getElementById('new-task-btn').classList.add('hidden');
    } else {
        await fetchAllUsers();
    }

    await fetchProjects();
    await fetchTasks();
}

// Fetch all users to populate assignee dropdown
async function fetchAllUsers() {
    const res = await fetch(`${apiBase}/users/`);
    if(res.ok) {
        const usersList = await res.json();
        const select = document.getElementById('task-assigned');
        select.innerHTML = '<option value="">Assign To...</option>';
        usersList.forEach(u => {
            select.innerHTML += `<option value="${u.id}">${u.username} (${u.role})</option>`;
        });
    }
}

// Fetch and Render Projects
async function fetchProjects() {
    const res = await fetch(`${apiBase}/projects/`);
    projects = await res.json();
    const list = document.getElementById('projects-list');
    const select = document.getElementById('task-project');
    
    list.innerHTML = '';
    select.innerHTML = '<option value="">Select Project</option>';
    
    const allActiveStyle = currentProjectId === null ? 'background: var(--primary); color: white; padding: 5px 10px; border-radius: 4px;' : 'padding: 5px 10px; opacity: 0.8;';
    list.innerHTML += `<li onclick="selectProject(null)" style="cursor: pointer; transition: 0.3s; ${allActiveStyle}"><strong>View All Projects</strong></li>`;
    
    projects.forEach(p => {
        const isActive = currentProjectId === p.id;
        const style = isActive ? 'background: var(--primary); color: white; padding: 5px 10px; border-radius: 4px;' : 'padding: 5px 10px; opacity: 0.8;';
        const deleteBtn = user && user.role === 'ADMIN' ? `<button onclick="deleteProject(${p.id}, event)" style="float: right; background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 1.2em; line-height: 1;">&times;</button>` : '';
        list.innerHTML += `<li onclick="selectProject(${p.id})" style="cursor: pointer; transition: 0.3s; ${style}">${p.name} ${deleteBtn}</li>`;
        select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
}

window.selectProject = function(id) {
    currentProjectId = id;
    fetchProjects();
    fetchTasks();
};

window.deleteProject = async function(id, event) {
    event.stopPropagation();
    if(confirm("Are you sure you want to delete this project?")) {
        await fetch(`${apiBase}/projects/${id}/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCsrfToken() }
        });
        currentProjectId = null;
        fetchProjects();
        fetchTasks();
    }
};

let progressChartInstance = null;
function updateChart(todo, done, overdue) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if (progressChartInstance) {
        progressChartInstance.destroy();
    }
    progressChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['To Do', 'Done', 'Overdue'],
            datasets: [{
                data: [todo, done, overdue],
                backgroundColor: ['#4da6ff', '#28a745', '#dc3545'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: 'white' } }
            }
        }
    });
}

window.exportToPDF = function() {
    const projName = currentProjectId ? projects.find(p => p.id === currentProjectId)?.name || 'Unknown' : "All Projects";
    const dateStr = new Date().toLocaleDateString();
    
    const total = document.getElementById('stat-total').innerText;
    const todo = document.getElementById('stat-todo').innerText;
    const done = document.getElementById('stat-done').innerText;
    const overdue = document.getElementById('stat-overdue') ? document.getElementById('stat-overdue').innerText : 0;
    
    const chartCanvas = document.getElementById('progressChart');
    const chartImage = chartCanvas ? chartCanvas.toDataURL("image/png") : '';

    let taskRows = '';
    globalDisplayTasks.forEach(t => {
        const assigned = t.assigned_to_name || 'Unassigned';
        const due = t.due_date ? t.due_date : 'N/A';
        const status = t.status.replace('_', ' ');
        taskRows += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">${t.title}</td>
                <td style="padding: 8px;">${assigned}</td>
                <td style="padding: 8px;">${status}</td>
                <td style="padding: 8px;">${due}</td>
            </tr>
        `;
    });

    const reportHTML = `
        <div style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; background: white; width: 800px;">
            <div style="text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Official Project Report</h1>
                <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 16px;">Generated on: ${dateStr}</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h2 style="color: #2980b9; margin-top: 0;">Project: ${projName}</h2>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                <div style="width: 48%;">
                    <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Executive Summary</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr><td style="padding: 8px 0; border-bottom: 1px solid #f5f5f5;"><strong>Total Tasks:</strong></td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #f5f5f5;">${total}</td></tr>
                        <tr><td style="padding: 8px 0; border-bottom: 1px solid #f5f5f5;"><strong>To Do:</strong></td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #f5f5f5;">${todo}</td></tr>
                        <tr><td style="padding: 8px 0; border-bottom: 1px solid #f5f5f5;"><strong>Done:</strong></td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #f5f5f5;">${done}</td></tr>
                        <tr><td style="padding: 8px 0;"><strong>Overdue:</strong></td><td style="text-align: right; padding: 8px 0;">${overdue}</td></tr>
                    </table>
                </div>
                <div style="width: 48%; text-align: center;">
                    <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Progress Chart</h3>
                    ${chartImage ? `<img src="${chartImage}" style="max-height: 200px; margin-top: 10px;">` : '<p>No chart data</p>'}
                </div>
            </div>

            <div>
                <h3 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Task Breakdown</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #2c3e50; color: white;">
                            <th style="padding: 10px; text-align: left;">Task Title</th>
                            <th style="padding: 10px; text-align: left;">Assignee</th>
                            <th style="padding: 10px; text-align: left;">Status</th>
                            <th style="padding: 10px; text-align: left;">Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${taskRows.length > 0 ? taskRows : '<tr><td colspan="4" style="padding: 10px; text-align: center;">No tasks found.</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 40px; text-align: center; color: #95a5a6; font-size: 12px;">
                <p>Generated by Raahi &bull; Confidential & Proprietary</p>
            </div>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = reportHTML;
    document.body.appendChild(container);
    container.style.position = 'absolute';
    container.style.left = '-9999px';

    html2pdf().from(container.firstElementChild).set({
        margin: 10,
        filename: `${projName.replace(/\s+/g, '_')}_Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save().then(() => {
        document.body.removeChild(container);
    });
};

// Status Filter logic
window.selectStatusFilter = function(filter) {
    currentStatusFilter = filter;
    
    // Update visuals
    document.querySelectorAll('.stat-card').forEach(card => {
        card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        card.style.transform = 'translateY(0)';
    });
    
    const activeStyle = (id) => {
        const el = document.getElementById(id);
        if(el) {
            el.style.border = '2px solid var(--primary)';
            el.style.transform = 'translateY(-5px)';
        }
    };

    if (filter === null) activeStyle('card-total');
    else if (filter === 'TODO') activeStyle('card-todo');
    else if (filter === 'DONE') activeStyle('card-done');
    else if (filter === 'OVERDUE') activeStyle('card-overdue');
    
    fetchTasks();
};

// Fetch and Render Tasks
async function fetchTasks() {
    const res = await fetch(`${apiBase}/tasks/`);
    let allTasks = await res.json();
    
    // 1. Filter by Project
    let projectTasks = currentProjectId ? allTasks.filter(t => t.project === currentProjectId) : allTasks;
    
    const today = new Date();
    today.setHours(0,0,0,0);

    // 2. Calculate Stats from projectTasks
    let totalCount = projectTasks.length;
    let doneCount = 0;
    let overdueCount = 0;
    
    projectTasks.forEach(t => {
        let isOverdue = false;
        if (t.due_date) {
            const dateObj = new Date(t.due_date);
            if (dateObj < today && t.status !== 'DONE') {
                isOverdue = true;
            }
        }
        if (t.status === 'DONE') doneCount++;
        if (isOverdue) overdueCount++;
    });
    
    let todoCount = totalCount - doneCount - overdueCount;
    
    // Update Stats UI
    document.getElementById('stat-total').innerText = totalCount;
    document.getElementById('stat-todo').innerText = todoCount;
    document.getElementById('stat-done').innerText = doneCount;
    if(document.getElementById('stat-overdue')) {
        document.getElementById('stat-overdue').innerText = overdueCount;
    }
    
    // Update Chart
    updateChart(todoCount, doneCount, overdueCount);

    // 3. Apply Status Filter
    let displayTasks = projectTasks.filter(t => {
        let isOverdue = false;
        if (t.due_date) {
            const dateObj = new Date(t.due_date);
            isOverdue = dateObj < today && t.status !== 'DONE';
        }

        if (currentStatusFilter === 'OVERDUE') return isOverdue;
        if (currentStatusFilter === 'DONE') return t.status === 'DONE';
        if (currentStatusFilter === 'TODO') return t.status !== 'DONE' && !isOverdue;
        
        return true; 
    });
    globalDisplayTasks = displayTasks;

    const list = document.getElementById('tasks-list');
    list.innerHTML = '';
    
    displayTasks.forEach(t => {
        const projName = projects.find(p => p.id === t.project)?.name || 'Unknown';
        
        let dueStr = '';
        if (t.due_date) {
            const dateObj = new Date(t.due_date);
            const today = new Date();
            // Reset times for accurate date comparison
            today.setHours(0,0,0,0);
            
            // Note: dateObj from YYYY-MM-DD might be in UTC. To avoid timezone shift, format manually or use timezone offset
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
            const isOverdue = dateObj < today && t.status !== 'DONE';
            
            if (isOverdue) {
                dueStr = ` | <span style="color: var(--danger); font-weight: bold;">Due: ${formattedDate} (Overdue)</span>`;
            } else {
                dueStr = ` | Due: ${formattedDate}`;
            }
        }

        let deleteBtn = user && user.role === 'ADMIN' ? `<button onclick="deleteTask(${t.id})" class="btn btn-sm btn-danger" style="margin-top: 10px;">Delete</button>` : '';

        let actionHtml = '';
        if (user.role === 'ADMIN') {
            if (t.status === 'IN_REVIEW') {
                actionHtml = `
                    <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px; font-size: 0.9em;">
                        <div style="margin-bottom: 8px;"><strong>Note from user:</strong> <em>${t.note || 'No note provided'}</em></div>
                        <button onclick="updateTaskStatus(${t.id}, 'DONE')" class="btn btn-sm btn-success">Approve (Done)</button>
                        <button onclick="updateTaskStatus(${t.id}, 'IN_PROGRESS')" class="btn btn-sm btn-danger">Reject</button>
                    </div>`;
            }
            actionHtml += deleteBtn;
        } else {
            // Member view
            if (t.status !== 'DONE' && t.status !== 'IN_REVIEW') {
                actionHtml = `<button onclick="promptReview(${t.id})" class="btn btn-sm btn-primary" style="margin-top: 10px;">Submit for Review</button>`;
            } else if (t.status === 'IN_REVIEW') {
                actionHtml = `<div style="margin-top: 8px; font-size: 0.85em; color: var(--secondary);"><em>Waiting for Admin Approval...</em></div>`;
            }
        }
        
        let descHtml = t.description ? `<div style="font-size: 0.85em; margin: 5px 0; color: #ccc;">${t.description}</div>` : '';
        let attachmentHtml = t.attachment ? `<div style="font-size: 0.85em; margin: 5px 0;"><a href="${t.attachment}" target="_blank" style="color: var(--primary);">View Attachment</a></div>` : '';

        list.innerHTML += `
            <li class="status-${t.status}">
                <div>
                    <strong>${t.title}</strong>
                    ${descHtml}
                    <div class="task-meta">${projName} | Assigned to: ${t.assigned_to_name || 'Unassigned'}${dueStr}</div>
                    ${attachmentHtml}
                    ${actionHtml}
                </div>
                <span class="badge">${t.status.replace('_', ' ')}</span>
            </li>`;
    });
}

// Global actions for onclick
window.updateTaskStatus = async function(taskId, newStatus) {
    const res = await fetch(`${apiBase}/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({ status: newStatus })
    });
    if(!res.ok) alert('Failed to update task');
    fetchTasks();
};

window.promptReview = async function(taskId) {
    const note = prompt("Add a note for the Admin (optional):");
    if (note !== null) { 
        const res = await fetch(`${apiBase}/tasks/${taskId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({ status: 'IN_REVIEW', note: note })
        });
        if(!res.ok) alert('Failed to submit for review');
        fetchTasks();
    }
};

window.deleteTask = async function(taskId) {
    if(confirm("Are you sure you want to delete this task?")) {
        await fetch(`${apiBase}/tasks/${taskId}/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCsrfToken() }
        });
        fetchTasks();
    }
};

// Removed fetchStats() completely

// Toggle Forms
document.getElementById('new-project-btn').addEventListener('click', () => {
    document.getElementById('project-form').classList.toggle('hidden');
});
document.getElementById('new-task-btn').addEventListener('click', () => {
    document.getElementById('task-form').classList.toggle('hidden');
});

// Create Project
document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('proj-name').value;
    const res = await fetch(`${apiBase}/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({ name })
    });

    if(!res.ok) {
        const err = await res.json();
        alert('Failed to create project: ' + JSON.stringify(err));
        return;
    }

    document.getElementById('proj-name').value = '';
    document.getElementById('project-form').classList.add('hidden');
    fetchProjects();
});

// Create Task
document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const desc = document.getElementById('task-desc').value;
    const project = document.getElementById('task-project').value;
    const assigned_to = document.getElementById('task-assigned').value || user.id;
    const status = document.getElementById('task-status').value;
    const due_date = document.getElementById('task-due-date').value || null;
    const fileInput = document.getElementById('task-file');
    
    const formData = new FormData();
    formData.append('title', title);
    if (desc) formData.append('description', desc);
    formData.append('project', project);
    if (assigned_to) formData.append('assigned_to', assigned_to);
    formData.append('status', status);
    if (due_date) formData.append('due_date', due_date);
    if (fileInput.files.length > 0) {
        formData.append('attachment', fileInput.files[0]);
    }

    const res = await fetch(`${apiBase}/tasks/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: formData
    });

    if(!res.ok) {
        const err = await res.json();
        alert('Failed to create task: ' + JSON.stringify(err));
        return;
    }

    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-file').value = '';
    document.getElementById('task-form').classList.add('hidden');
    fetchTasks();
});

// Check if user is already logged in (using session cookie)
fetch(`${apiBase}/users/me/`)
    .then(res => {
        if(res.ok) {
            return res.json();
        }
        throw new Error('Not logged in');
    })
    .then(userData => {
        user = userData;
        initDashboard();
    })
    .catch(() => {
        // Not logged in, stay on auth screen
    });
