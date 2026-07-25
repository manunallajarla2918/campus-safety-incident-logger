/* ===================================================================
   CAMPUS SAFETY INCIDENT LOGGER - Student Report Script
   Form validation, live photo preview & AI Receipt Renderer
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  setupPhotoPreview();
  setupFormSubmission();
  setupAutoDateTime();
});

/**
 * Pre-fills current date & time into form inputs
 */
function setupAutoDateTime() {
  const dateInput = document.getElementById('incidentDate');
  const timeInput = document.getElementById('incidentTime');
  
  const now = new Date();
  if (dateInput && !dateInput.value) {
    dateInput.value = now.toISOString().split('T')[0];
  }
  if (timeInput && !timeInput.value) {
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
  }
}

/**
 * Live photo preview handler
 */
function setupPhotoPreview() {
  const photoInput = document.getElementById('incidentPhoto');
  const photoPreview = document.getElementById('photoPreview');
  const uploadWrapper = document.getElementById('imageUploadWrapper');

  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast('Image size exceeds 5MB limit. Please choose a smaller photo.', 'warning');
          photoInput.value = '';
          photoPreview.style.display = 'none';
          return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
          photoPreview.src = evt.target.result;
          photoPreview.style.display = 'block';
          if (uploadWrapper) {
            uploadWrapper.querySelector('.upload-text').textContent = `File selected: ${file.name}`;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

/**
 * Form Submit Handler with Validation
 */
function setupFormSubmission() {
  const form = document.getElementById('incidentForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Client-side Validation
    const roll = document.getElementById('rollNumber').value.trim();
    const name = document.getElementById('studentName').value.trim();
    const branch = document.getElementById('branch').value;
    const year = document.getElementById('year').value;
    const mobile = document.getElementById('mobile').value.trim();
    const location = document.getElementById('location').value;
    const incidentType = document.getElementById('incidentType').value;
    const description = document.getElementById('description').value.trim();
    const confirmCheck = document.getElementById('confirmCheck');

    if (!roll || !name || !branch || !year || !mobile || !location || !incidentType || !description) {
      showToast('Please fill in all required form fields.', 'warning');
      return;
    }

    // Roll number validation
    if (roll.length < 5) {
      showToast('Please enter a valid Roll Number.', 'warning');
      return;
    }

    // Phone validation (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobile)) {
      showToast('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    if (confirmCheck && !confirmCheck.checked) {
      showToast('Please check the confirmation box to verify information is true.', 'warning');
      return;
    }

    // Submit via FormData to API
    const submitBtn = document.getElementById('submitBtn');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing with AI...';

    try {
      const formData = new FormData(form);

      const response = await fetch('/api/report', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        showToast('Incident Report Submitted Successfully!', 'success');
        form.reset();
        document.getElementById('photoPreview').style.display = 'none';
        
        // Render AI Analysis Card & Receipt
        renderAIResultCard(result.data);
        
        // Smooth scroll to AI card
        document.getElementById('aiResultContainer').scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast(result.message || 'Error submitting report.', 'danger');
      }

    } catch (err) {
      console.error('Submission Error:', err);
      showToast('Network error while connecting to server.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  });
}

/**
 * Renders the Rule-Based AI Incident Analysis Card
 * @param {Object} inc Incident Record returned from Flask server
 */
function renderAIResultCard(inc) {
  const container = document.getElementById('aiResultContainer');
  if (!container) return;

  const prevMeasuresHTML = inc.preventive_measures.map(item => `
    <li><i class="fas fa-check-circle"></i> <span>${item}</span></li>
  `).join('');

  let emergencyHTML = '';
  if (inc.emergency_contact && inc.emergency_contact.name) {
    emergencyHTML = `
      <div class="emergency-alert-box">
        <div>
          <strong><i class="fas fa-phone-alt"></i> ${inc.emergency_contact.name}</strong>
          <div style="font-size: 0.85rem;">Direct Line: ${inc.emergency_contact.phone}</div>
        </div>
        <a href="tel:${inc.emergency_contact.phone}" class="btn btn-sm btn-danger"><i class="fas fa-headset"></i> Call Now</a>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="ai-card" id="printableReceipt">
      <div class="ai-card-header">
        <div class="ai-badge-header">
          <i class="fas fa-robot"></i>
          <span>AI Incident Analysis Report</span>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="ai-confidence-chip"><i class="fas fa-bolt"></i> AI Confidence: ${inc.confidence_score}</span>
          <span class="badge badge-info">${inc.report_id}</span>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem; font-size: 0.95rem; line-height: 1.5;">
        <strong>Summary:</strong> ${inc.incident_summary}
      </div>

      <div class="ai-metrics-grid">
        <div class="ai-metric-item">
          <label>Category</label>
          <span>${inc.category}</span>
        </div>
        <div class="ai-metric-item">
          <label>Risk Level</label>
          <span style="color: ${inc.risk_level === 'Critical' ? 'var(--danger)' : 'var(--warning)'};">${inc.risk_level}</span>
        </div>
        <div class="ai-metric-item">
          <label>Priority</label>
          <span>${inc.priority}</span>
        </div>
        <div class="ai-metric-item">
          <label>Assigned Department</label>
          <span>${inc.department}</span>
        </div>
        <div class="ai-metric-item">
          <label>Est. Response Time</label>
          <span>${inc.estimated_response}</span>
        </div>
        <div class="ai-metric-item">
          <label>Report Status</label>
          <span class="badge badge-warning">${inc.status}</span>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-bottom: 0.35rem;">Root Cause Analysis</h4>
        <p style="font-size: 0.9rem; color: var(--text-muted);">${inc.root_cause}</p>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-bottom: 0.35rem;">Immediate Action</h4>
        <p style="font-size: 0.9rem; color: var(--text-main); font-weight: 600;">${inc.immediate_action}</p>
      </div>

      <div>
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary); margin-bottom: 0.35rem;">Recommended Preventive Measures</h4>
        <ul class="preventive-list">
          ${prevMeasuresHTML}
        </ul>
      </div>

      ${emergencyHTML}

      <div style="margin-top: 1.75rem; display: flex; gap: 1rem; flex-wrap: wrap;" class="no-print">
        <button class="btn btn-secondary btn-sm" onclick="window.print()"><i class="fas fa-print"></i> Print Receipt</button>
        <button class="btn btn-outline btn-sm" onclick="location.reload()"><i class="fas fa-plus"></i> Submit Another Incident</button>
      </div>
    </div>
  `;
}
