# Campus Safety Incident Logger 🛡️⚡
> **AI-Assisted Campus Safety Monitoring & Incident Management System**
> Designed for KIET-1 (25B21A Series) & KIET-2 (256Q1A Series) - CSE Allied Branches

An enterprise-grade, modern web application designed for students to report campus safety incidents in real-time, powered by an offline **Rule-Based AI Classification Engine** and an interactive **Admin Analytics Dashboard**.

---

## 📌 Problem Statement

Traditional university campus safety management relies on manual paper-based register complaints, verbal phone calls, or unmonitored email threads. This results in:
- Delayed response times during critical emergencies (e.g., electrical sparks, water leakage, ragging).
- Lack of automated priority triaging and risk assessment.
- Absence of real-time analytical insights to identify hazard-prone campus locations.
- Difficulty in tracking complaint status updates for students and administration.

---

## 🎯 Objectives

1. **Streamlined Student Reporting**: Provide a secure portal for students of KIET-1 and KIET-2 to report incidents using validated Roll Series (`25B21AXXXX` and `256Q1AXXXX`).
2. **Automated AI Triaging**: Automatically categorize complaints, evaluate risk levels, assign priority, recommend responsible departments, and generate preventive measures offline.
3. **Centralized Incident Management**: Enable campus administrators to review, assign, and transition incident status from `Pending` ➔ `Resolved`.
4. **Data-Driven Analytics**: Visualize monthly trends, branch breakdown, category distribution, and affected location heatmaps using Chart.js.
5. **Zero-API Dependency**: Ensure 100% data privacy and offline operational capability using a Python rule-based NLP algorithm.

---

## 🛠️ Technology Used

- **Frontend**: HTML5, CSS3 (Modern HSL Blue Theme, Glassmorphism, Dark/Light Mode), JavaScript (ES6+)
- **Backend Framework**: Python 3.x, Flask Web Framework
- **Database / Data Storage**: Structured JSON File Storage (`data.json`)
- **Data Visualization**: Chart.js 4.x (Bar, Line, Pie, Doughnut, Polar Charts)
- **Icons & Styling**: FontAwesome 6.5.1, CSS Animations, Custom Toast Notifications
- **Data Export**: Native CSV Export Blob, Browser PDF/Print Engine

---

## 🤖 Role of AI (Offline Rule-Based Classifier)

The application features an offline **Rule-Based AI Engine** implemented in Python (`app.py`):
1. **Keyword Analysis**: Scans student problem descriptions for critical keywords (e.g. *fire, short circuit, leak, faint, stolen, ragging, phishing, fence*).
2. **Risk & Severity Synthesis**: Combines student-selected severity with keyword weights to output:
   - Incident Category (Maintenance, Security, Health, Welfare, Cyber IT)
   - Calculated Risk Level (*Low*, *Medium*, *High*, *Critical*)
   - Priority Rating (*Low*, *Medium*, *High*, *Urgent*)
   - Assigned Department & SLA Response Time
3. **Intelligent Action Plans**: Generates potential root cause analysis, immediate response actions, and tailored preventive measures.
4. **AI Confidence Score**: Computes a match confidence percentage (88% - 99%).
5. **Emergency Contacts**: Automatically displays direct emergency telephone numbers if safety threats are detected.

---

## 💡 Key Benefits

- **Instant Triaging**: Critical fire and electrical hazards are automatically flagged as Urgent for immediate security dispatch.
- **Roll Number Validation**: Enforces strict campus roll series authentication for KIET-1 (`25B21AXXXX`) and KIET-2 (`256Q1AXXXX`).
- **CSE Allied Scope**: Tailored for CSE, CSE (AI & ML), CSE (Data Science), CSE (Cyber Security), CSIT, and IT branches.
- **Transparency**: Clear status flow (`Pending` ➔ `Resolved`) with status update history.
- **Offline & Private**: Requires no paid cloud APIs or internet connectivity to run AI classification.

---

## 🔮 Future Scope

1. **Mobile Application Integration**: Develop Flutter / React Native mobile apps for one-touch SOS location reporting.
2. **GPS & Geo-Fencing**: Automatically attach precise latitude/longitude coordinates to campus location dropdowns.
3. **Machine Learning Model Upgrade**: Train custom Naïve Bayes / BERT NLP models on historical campus incident data.
4. **Automated WhatsApp / SMS Alerts**: Send instant SMS/WhatsApp emergency notifications to campus security guards upon Critical incident submission.

---

## 🚀 Quick Start & Execution

### 1. Requirements
Python 3.8+ installed on your machine.

### 2. Dependencies
Install Flask and Werkzeug:
```bash
pip install -r requirements.txt
```

### 3. Run Application
Start the Flask server:
```bash
python app.py
```

### 4. Application URLs
- **Landing Page**: `http://127.0.0.1:5000/`
- **Student Login**: `http://127.0.0.1:5000/student-login` *(Roll: `25B21A0501` for KIET-1 or `256Q1A0502` for KIET-2)*
- **Incident Reporting**: `http://127.0.0.1:5000/report`
- **Admin Login**: `http://127.0.0.1:5000/login` *(Demo: `admin` / `admin123`)*
- **Admin Dashboard**: `http://127.0.0.1:5000/dashboard`
