/* ===================================================================
   CAMPUS SAFETY INCIDENT LOGGER - Admin Dashboard Script
   Chart.js Analytics, Search/Filters, Modal Details, Status Flow (Pending -> Resolved)
   =================================================================== */

let chartInstances = {};
let allIncidents = [];

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setupTableSearchAndFilters();
});

/**
 * Loads all dashboard data: stats, charts & incident list
 */
async function loadDashboardData() {
  await Promise.all([
    fetchStatsAndCharts(),
    fetchIncidentsTable()
  ]);
}

/**
 * Fetches stats metrics and initializes Chart.js graphs
 */
async function fetchStatsAndCharts() {
  try {
    const res = await fetch('/api/stats');
    const result = await res.json();

    if (result.success) {
      const { metrics, critical_alerts, recent_activities, charts } = result;

      // Update KPI Stat Cards
      document.getElementById('statTotal').textContent = metrics.total_reports;
      document.getElementById('statHigh').textContent = metrics.high_priority_incidents;
      document.getElementById('statResolved').textContent = metrics.resolved_reports;
      document.getElementById('statPending').textContent = metrics.pending_reports;
      document.getElementById('statLocation').textContent = metrics.most_affected_location;
      document.getElementById('statIncident').textContent = metrics.most_common_incident;

      // Render Critical Alert Banner
      renderCriticalBanner(critical_alerts);

      // Render Recent Activity Logs
      renderRecentActivity(recent_activities);

      // Render Chart.js Analytics
      renderChartJS(charts);
    }
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    showToast('Failed to load dashboard statistics.', 'danger');
  }
}

/**
 * Critical Notification Banner Renderer
 */
function renderCriticalBanner(alerts) {
  const container = document.getElementById('criticalAlertContainer');
  if (!container) return;

  if (alerts && alerts.length > 0) {
    const topAlert = alerts[0];
    container.innerHTML = `
      <div class="critical-notification-banner">
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem;"></i>
          <div>
            <strong>🔴 CRITICAL SAFETY ALERT (${topAlert.report_id})</strong>
            <div style="font-size: 0.88rem; opacity: 0.95;">
              Critical ${topAlert.incident_type} reported at ${topAlert.location} (${topAlert.time}). Immediate dispatch required!
            </div>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="viewIncidentModal('${topAlert.report_id}')" style="background:#fff; color:#dc2626;">View Alert</button>
      </div>
    `;
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

function renderRecentActivity(activities) {
  const container = document.getElementById('recentActivityFeed');
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">No recent activities logged.</p>';
    return;
  }

  container.innerHTML = activities.map(act => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
      <div>
        <strong>${act.report_id}</strong> - ${act.type}
        <div style="font-size:0.78rem; color:var(--text-muted);">${act.date} at ${act.time}</div>
      </div>
      <span class="badge ${act.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${act.status}</span>
    </div>
  `).join('');
}

/**
 * Initializes and updates Chart.js graphs
 */
function renderChartJS(chartData) {
  // Chart 1: Monthly Incident Trends (Bar Chart)
  const monthlyCtx = document.getElementById('chartMonthly');
  if (monthlyCtx) {
    destroyChart('monthly');
    chartInstances['monthly'] = new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(chartData.monthly),
        datasets: [{
          label: 'Incidents Reported',
          data: Object.values(chartData.monthly),
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Chart 2: Reports by Branch (Pie Chart)
  const branchCtx = document.getElementById('chartBranch');
  if (branchCtx) {
    destroyChart('branch');
    chartInstances['branch'] = new Chart(branchCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(chartData.branches),
        datasets: [{
          data: Object.values(chartData.branches),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // Chart 3: Incident Categories (Doughnut Chart)
  const categoryCtx = document.getElementById('chartCategory');
  if (categoryCtx) {
    destroyChart('category');
    chartInstances['category'] = new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(chartData.categories),
        datasets: [{
          data: Object.values(chartData.categories),
          backgroundColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0284c7']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // Chart 4: Most Affected Locations (Horizontal Bar Chart)
  const locationCtx = document.getElementById('chartLocation');
  if (locationCtx) {
    destroyChart('location');
    chartInstances['location'] = new Chart(locationCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(chartData.locations),
        datasets: [{
          label: 'Reports Count',
          data: Object.values(chartData.locations),
          backgroundColor: '#0ea5e9',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Chart 5: Priority Distribution (Polar Area Chart)
  const priorityCtx = document.getElementById('chartPriority');
  if (priorityCtx) {
    destroyChart('priority');
    chartInstances['priority'] = new Chart(priorityCtx, {
      type: 'polarArea',
      data: {
        labels: Object.keys(chartData.priorities),
        datasets: [{
          data: Object.values(chartData.priorities),
          backgroundColor: [
            'rgba(239, 68, 68, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // Chart 6: Weekly Incident Reports (Line Chart)
  const weeklyCtx = document.getElementById('chartWeekly');
  if (weeklyCtx) {
    destroyChart('weekly');
    chartInstances['weekly'] = new Chart(weeklyCtx, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Weekly Trend',
          data: [8, 14, 11, 18],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
  }
}

/**
 * Fetches incidents list for table
 */
async function fetchIncidentsTable() {
  try {
    const res = await fetch('/api/incidents');
    const result = await res.json();
    if (result.success) {
      allIncidents = result.data;
      renderIncidentTable(allIncidents);
    }
  } catch (err) {
    console.error('Error fetching incident list:', err);
  }
}

/**
 * Renders HTML Incident Table rows with Admin Changes Status (Pending -> Resolved)
 */
function renderIncidentTable(incidents) {
  const tbody = document.getElementById('incidentTableBody');
  if (!tbody) return;

  if (incidents.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: 3rem;" class="text-muted">
          <i class="fas fa-folder-open" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block;"></i>
          No incident reports match your current search or filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = incidents.map(inc => `
    <tr id="row-${inc.report_id}">
      <td><strong>${inc.report_id}</strong></td>
      <td><span class="badge badge-info">${inc.campus || 'KIET-1'}</span></td>
      <td>${inc.roll_number}</td>
      <td>${inc.student_name}</td>
      <td><span class="badge badge-secondary">${inc.branch}</span></td>
      <td>${inc.location}</td>
      <td>${inc.incident_type}</td>
      <td><span class="badge ${inc.risk_level === 'Critical' || inc.risk_level === 'High' ? 'badge-danger' : 'badge-warning'}">${inc.risk_level}</span></td>
      <td><span class="badge ${inc.priority === 'Urgent' || inc.priority === 'High' ? 'badge-danger' : 'badge-info'}">${inc.priority}</span></td>
      <td>
        <span class="badge ${inc.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${inc.status}</span>
      </td>
      <td style="white-space: nowrap;">${inc.created_date}</td>
      <td>
        <div class="action-btns-cell">
          <button class="btn btn-sm btn-outline" title="View Details" onclick="viewIncidentModal('${inc.report_id}')"><i class="fas fa-eye"></i> Details</button>
          ${inc.status === 'Pending' ? 
            `<button class="btn btn-sm btn-primary" title="Mark Resolved" onclick="toggleIncidentStatus('${inc.report_id}', 'Resolved')"><i class="fas fa-check"></i> Resolve</button>` : 
            `<button class="btn btn-sm btn-secondary" title="Reopen" onclick="toggleIncidentStatus('${inc.report_id}', 'Pending')"><i class="fas fa-undo"></i> Pending</button>`
          }
          <button class="btn btn-sm btn-danger" title="Delete Report" onclick="deleteIncident('${inc.report_id}')"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Updates Incident Status (Pending <-> Resolved)
 */
async function toggleIncidentStatus(reportId, newStatus) {
  try {
    const res = await fetch(`/api/incidents/${reportId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Report ${reportId} changed to ${newStatus}`, 'success');
      loadDashboardData();
    } else {
      showToast(result.message || 'Update failed', 'danger');
    }
  } catch (err) {
    showToast('Failed to update status', 'danger');
  }
}

/**
 * Filter and Search Handlers
 */
function setupTableSearchAndFilters() {
  const searchInput = document.getElementById('tableSearchInput');
  const statusFilter = document.getElementById('statusFilterSelect');
  const priorityFilter = document.getElementById('priorityFilterSelect');

  function applyFilters() {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const st = statusFilter ? statusFilter.value : '';
    const pr = priorityFilter ? priorityFilter.value : '';

    const filtered = allIncidents.filter(inc => {
      if (st && inc.status !== st) return false;
      if (pr && inc.priority !== pr) return false;
      if (q) {
        const text = `${inc.report_id} ${inc.student_name} ${inc.roll_number} ${inc.branch} ${inc.location} ${inc.incident_type} ${inc.category}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    renderIncidentTable(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (priorityFilter) priorityFilter.addEventListener('change', applyFilters);
}

/**
 * Deletes Incident via DELETE API
 */
async function deleteIncident(reportId) {
  if (!confirm(`Are you sure you want to delete incident record ${reportId}?`)) return;

  try {
    const res = await fetch(`/api/incidents/${reportId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Report ${reportId} deleted successfully.`, 'success');
      loadDashboardData();
    } else {
      showToast(result.message || 'Delete failed', 'danger');
    }
  } catch (err) {
    showToast('Failed to delete record', 'danger');
  }
}

/**
 * Opens Incident Details Modal formatted as requested (e.g. Incident #1002 Details: Student, Location, Photo, Description, AI Analysis, Status, Admin Changes)
 */
function viewIncidentModal(reportId) {
  const inc = allIncidents.find(i => i.report_id === reportId);
  if (!inc) return;

  const modal = document.getElementById('reportDetailModal');
  const body = document.getElementById('modalDetailBody');

  const photoHTML = inc.photo_path ? `
    <div style="margin-top: 1rem;">
      <h5 style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">Photo Evidence</h5>
      <img src="${inc.photo_path}" style="max-height: 220px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" alt="Evidence">
    </div>
  ` : '<div style="margin-top:0.75rem; color:var(--text-muted); font-size:0.85rem;"><em>No photo evidence attached.</em></div>';

  const prevMeasuresHTML = (inc.preventive_measures || []).map(item => `
    <li style="display:flex; align-items:center; gap:0.5rem; font-size:0.88rem;">
      <i class="fas fa-check-circle" style="color:var(--success);"></i> ${item}
    </li>
  `).join('');

  body.innerHTML = `
    <!-- Header with Incident ID -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.25rem;">
      <div>
        <h3 style="font-size:1.5rem; color:var(--primary);">Incident #${inc.report_id.replace('CSI-2026-', '')} <span style="font-size:1rem; color:var(--text-muted);">(${inc.report_id})</span></h3>
        <p style="font-size:0.85rem; color:var(--text-muted);">Reported on ${inc.created_date} at ${inc.created_time}</p>
      </div>
      <div>
        <span class="badge ${inc.status === 'Resolved' ? 'badge-success' : 'badge-warning'}" style="font-size:1rem; padding:0.4rem 1.1rem;">${inc.status}</span>
      </div>
    </div>

    <!-- Student & Location Details -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
      <div style="background:var(--bg-main); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
        <h4 style="font-size:0.95rem; color:var(--primary); margin-bottom:0.5rem;"><i class="fas fa-user-graduate"></i> Student Information</h4>
        <div><strong>Student:</strong> ${inc.student_name}</div>
        <div><strong>Roll Number:</strong> <code>${inc.roll_number}</code></div>
        <div><strong>Campus:</strong> ${inc.campus || 'KIET-1'}</div>
        <div><strong>Branch:</strong> ${inc.branch} (${inc.year} Year)</div>
        <div><strong>Mobile:</strong> ${inc.mobile}</div>
      </div>

      <div style="background:var(--bg-main); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
        <h4 style="font-size:0.95rem; color:var(--primary); margin-bottom:0.5rem;"><i class="fas fa-map-marker-alt"></i> Location & Incident Category</h4>
        <div><strong>Location:</strong> ${inc.location}</div>
        <div><strong>Incident Type:</strong> ${inc.incident_type}</div>
        <div><strong>Risk / Priority:</strong> ${inc.risk_level} / ${inc.priority}</div>
        <div><strong>Department Assigned:</strong> ${inc.department}</div>
      </div>
    </div>

    <!-- Description -->
    <div style="margin-bottom:1.25rem;">
      <h5 style="font-size:0.88rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.35rem;">Problem Description</h5>
      <p style="background:var(--bg-main); padding:0.9rem; border-radius:var(--radius-sm); font-size:0.92rem; border:1px solid var(--border-color);">${inc.description}</p>
    </div>

    <!-- Photo -->
    ${photoHTML}

    <!-- AI Analysis -->
    <div style="background:var(--primary-light); border:1.5px solid var(--primary); padding:1.25rem; border-radius:var(--radius-md); margin-top:1.25rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <strong style="color:var(--primary); font-size:1.05rem;"><i class="fas fa-robot"></i> Offline AI Analysis Output</strong>
        <span class="ai-confidence-chip">AI Score: ${inc.confidence_score}</span>
      </div>
      
      <p style="font-size:0.9rem; margin-bottom:0.4rem;"><strong>Summary:</strong> ${inc.incident_summary}</p>
      <p style="font-size:0.9rem; margin-bottom:0.4rem;"><strong>Root Cause:</strong> ${inc.root_cause}</p>
      <p style="font-size:0.9rem; margin-bottom:0.75rem;"><strong>Immediate Action:</strong> ${inc.immediate_action}</p>

      <div style="margin-top:0.75rem;">
        <strong style="font-size:0.85rem; text-transform:uppercase; color:var(--primary);">Suggested Preventive Measures:</strong>
        <ul style="list-style:none; padding:0; margin-top:0.35rem; display:flex; flex-direction:column; gap:0.3rem;">
          ${prevMeasuresHTML}
        </ul>
      </div>
    </div>

    <!-- Admin Status Flow (Pending -> Resolved) -->
    <div style="background:var(--bg-main); border:1px solid var(--border-color); padding:1.25rem; border-radius:var(--radius-md); margin-top:1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
      <div>
        <strong style="font-size:0.95rem;">Admin Status Control Flow:</strong>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">
          Current Status: <strong style="color:${inc.status === 'Resolved' ? 'var(--success)' : 'var(--warning)'};">${inc.status}</strong> 
          (Status transition: Pending ➔ Resolved)
        </div>
      </div>
      <div>
        ${inc.status === 'Pending' ? 
          `<button class="btn btn-primary btn-sm" onclick="toggleIncidentStatus('${inc.report_id}', 'Resolved'); closeModal();"><i class="fas fa-check-circle"></i> Mark as Resolved</button>` :
          `<button class="btn btn-secondary btn-sm" onclick="toggleIncidentStatus('${inc.report_id}', 'Pending'); closeModal();"><i class="fas fa-undo"></i> Reopen to Pending</button>`
        }
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('reportDetailModal');
  if (modal) modal.classList.remove('active');
}

/**
 * CSV Export Functionality
 */
function exportToCSV() {
  if (!allIncidents || allIncidents.length === 0) {
    showToast('No incidents data to export.', 'warning');
    return;
  }

  const headers = ["Report ID", "Campus", "Roll Number", "Student Name", "Branch", "Year", "Mobile", "Location", "Incident Type", "Category", "Risk Level", "Priority", "Department", "Status", "Date"];
  const rows = allIncidents.map(inc => [
    inc.report_id,
    inc.campus || 'KIET-1',
    inc.roll_number,
    `"${inc.student_name}"`,
    `"${inc.branch}"`,
    inc.year,
    inc.mobile,
    `"${inc.location}"`,
    `"${inc.incident_type}"`,
    `"${inc.category}"`,
    inc.risk_level,
    inc.priority,
    `"${inc.department}"`,
    inc.status,
    inc.created_date
  ]);

  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `KIET_Campus_Safety_Incidents_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Incidents CSV file exported successfully!', 'success');
}
