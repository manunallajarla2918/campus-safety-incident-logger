"""
===================================================================
CAMPUS SAFETY INCIDENT LOGGER - Backend Application & AI Engine
Tech Stack: Python Flask, JSON Storage, Rule-Based AI Classifier
Campuses: KIET-1 (25B21AXXXX) & KIET-2 (256Q1AXXXX)
Branches: CSE, CSE(AI&DS), CSE(AI&ML), CAI, CSD, CSM ,CSC
Role Separation: Student (Report Incident) vs Admin (Check & Resolve)
===================================================================
"""

import os
import json
import re
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'campus_safety_secret_key_2026_antigravity'

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# CSE Allied Branches Constant (exact requested branches)
CSE_ALLIED_BRANCHES = [
    "CSE",
    "CSE (AI & DS)",
    "CSE (AI & ML)",
    "CAI",
    "CSD",
    "CSM",
    "CSC"
]


# ===================================================================
# DATA PERSISTENCE & ROLL NUMBER VALIDATION
# ===================================================================

def load_incidents():
    """Reads incident records from JSON database."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading JSON database: {e}")
        return []

def save_incidents(incidents):
    """Writes updated incident records to JSON database."""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(incidents, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing to JSON database: {e}")
        return False

def validate_roll_number(roll, campus):
    """
    Validates roll number against campus series:
    KIET-1: 25B21AXXXX (Length 10)
    KIET-2: 256Q1AXXXX (Length 10)
    """
    roll = roll.strip().upper()
    if len(roll) != 10:
        return False, "Roll number must be exactly 10 characters long."

    if campus == "KIET-1":
        if not roll.startswith("25B21A"):
            return False, "Invalid Roll Series for KIET-1! Must start with '25B21A' (e.g. 25B21A0501)."
    elif campus == "KIET-2":
        if not roll.startswith("256Q1A"):
            return False, "Invalid Roll Series for KIET-2! Must start with '256Q1A' (e.g. 256Q1A0501)."
    else:
        if not (roll.startswith("25B21A") or roll.startswith("256Q1A")):
            return False, "Roll number must start with '25B21A' (KIET-1) or '256Q1A' (KIET-2)."

    suffix = roll[6:]
    if not re.match(r'^[0-9A-Z]{4}$', suffix):
        return False, "The last 4 characters of the roll number must be alphanumeric (e.g. 0501)."

    return True, "Valid Roll Number"

def generate_report_id(incidents):
    year = datetime.now().year
    max_num = 1000
    pattern = re.compile(rf"CSI-{year}-(\d{{4}})")
    
    for inc in incidents:
        r_id = inc.get("report_id", "")
        match = pattern.match(r_id)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
                
    next_num = max_num + 1
    return f"CSI-{year}-{next_num:04d}"

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ===================================================================
# OFFLINE RULE-BASED AI ENGINE
# ===================================================================

KEYWORD_RULES = {
    "Fire": {
        "keywords": ["fire", "flame", "smoke", "burning", "explosion", "spark", "combustion"],
        "category": "Safety & Disaster Control",
        "department": "Campus Fire Safety & Security",
        "default_risk": "Critical",
        "default_priority": "Urgent",
        "sla": "Within 15 Mins",
        "emergency_contact": {"name": "Campus Fire Emergency Control", "phone": "101 / +91 98000 11111"},
        "root_cause": "Electrical overheating, flammable material ignition, or improper disposal of smoldering items.",
        "immediate_action": "Evacuate immediate vicinity, activate nearest manual fire alarm pull station, and alert Security.",
        "preventive_measures": [
          "Conduct quarterly mandatory fire evacuation drills",
          "Inspect and service all ABC powder and CO2 fire extinguishers monthly",
          "Verify clear, unobstructed access to emergency exit stairwells",
          "Conduct thermographic electrical panel inspections to catch overheating early"
        ]
    },
    "Water Leakage": {
        "keywords": ["leak", "water", "pipe", "burst", "overflow", "flooding", "seepage", "drip"],
        "category": "Maintenance",
        "department": "Maintenance Department",
        "default_risk": "Medium",
        "default_priority": "High",
        "sla": "Within 2 Hours",
        "emergency_contact": {"name": "Plumbing Maintenance Desk", "phone": "+91 98000 11223"},
        "root_cause": "Aging plumbing pipe corrosion, joint displacement, or high water pressure surge.",
        "immediate_action": "Shut off the local water isolating valve immediately to stop water flow.",
        "preventive_measures": [
          "Replace aging galvanized iron pipes with corrosion-resistant CPVC/PPR lines",
          "Conduct routine quarterly pressure checks across campus plumbing networks",
          "Install automatic moisture sensors near main overhead storage tanks",
          "Place caution warning signs around damp floors to prevent slips"
        ]
    },
    "Electrical Problem": {
        "keywords": ["spark", "short circuit", "wire", "shock", "blackout", "power", "fuse", "breaker", "voltage", "flicker"],
        "category": "Facilities & Safety",
        "department": "Electrical & Maintenance Board",
        "default_risk": "High",
        "default_priority": "Urgent",
        "sla": "Within 30 Mins",
        "emergency_contact": {"name": "Campus Electrical Emergency", "phone": "+91 98000 44556"},
        "root_cause": "Circuit overloading, damaged wiring insulation, loose terminal connections, or water contact.",
        "immediate_action": "Isolate the main circuit breaker panel and keep away from exposed wiring.",
        "preventive_measures": [
          "Re-encase exposed electrical cabling in rigid flame-retardant PVC conduits",
          "Balance electrical load distribution across distribution sub-panels",
          "Enforce regular testing of Earth Leakage Circuit Breakers (ELCB/RCCB)",
          "Inspect outdoor junction boxes and replace damaged weatherproof seal caps"
        ]
    },
    "Medical Emergency": {
        "keywords": ["faint", "collapse", "bleed", "injury", "fracture", "dizzy", "unconscious", "headache", "cut", "breath"],
        "category": "Health & Medical",
        "department": "Campus Health & Medical Center",
        "default_risk": "Critical",
        "default_priority": "Urgent",
        "sla": "Within 15 Mins",
        "emergency_contact": {"name": "Campus Ambulance & Health Desk", "phone": "+91 98000 99911"},
        "root_cause": "Heat exhaustion, acute physical trauma, sudden illness, or pre-existing medical condition.",
        "immediate_action": "Administer first aid, loosen tight clothing, and call campus medical desk for immediate ambulance dispatch.",
        "preventive_measures": [
          "Ensure First Aid boxes in all labs, canteens, and sports complexes are fully stocked",
          "Maintain certified student first-responder teams across all hostel blocks",
          "Position hydration and electrolyte points near open sports fields",
          "Mount automated external defibrillators (AEDs) in major campus buildings"
        ]
    },
    "Ragging": {
        "keywords": ["ragging", "senior", "intimidate", "harass", "bully", "threaten", "abuse", "shout", "fresher"],
        "category": "Student Welfare",
        "department": "Anti-Ragging Committee & Campus Security",
        "default_risk": "Critical",
        "default_priority": "Urgent",
        "sla": "Within 15 Mins",
        "emergency_contact": {"name": "Anti-Ragging Helpline / Chief Warden", "phone": "+91 98000 77889"},
        "root_cause": "Violation of anti-ragging code of conduct during off-peak hours.",
        "immediate_action": "Dispatch Anti-Ragging Task Force and Hostel Warden immediately to secure the students.",
        "preventive_measures": [
          "Maintain strict anti-ragging vigilance patrols around hostels during night hours",
          "Organize mandatory orientation sessions outlining UGC zero-tolerance regulations",
          "Install night vision CCTV surveillance in common hostel walkways and mess halls",
          "Provide anonymous high-priority reporting channels on student portals"
        ]
    },
    "Theft": {
        "keywords": ["stolen", "theft", "missing", "wallet", "laptop", "phone", "bag", "lock", "thief", "stole"],
        "category": "Campus Security",
        "department": "Campus Security & Vigilance",
        "default_risk": "Medium",
        "default_priority": "High",
        "sla": "Within 1 Hour",
        "emergency_contact": {"name": "Campus Security Command Center", "phone": "+91 98000 33445"},
        "root_cause": "Unattended personal valuables left in high-footfall open areas or weak locking hardware.",
        "immediate_action": "Lock down nearby campus exit gates and pull high-definition CCTV logs for the timestamp range.",
        "preventive_measures": [
          "Install smart digital lockers in libraries and reading zones",
          "Increase guard foot patrols across parking areas and study halls",
          "Require RFID gate verification for entering and leaving academic blocks",
          "Conduct awareness campaigns reminding students to secure belongings"
        ]
    },
    "Lost & Found": {
        "keywords": ["found", "lost", "misplaced", "calculator", "key", "card", "bottle", "spectacles", "umbrella"],
        "category": "General Administration",
        "department": "Student Welfare & Lost Found Cell",
        "default_risk": "Low",
        "default_priority": "Low",
        "sla": "Within 6 Hours",
        "emergency_contact": {"name": "Student Welfare Desk", "phone": "+91 98000 55544"},
        "root_cause": "Student accidentally leaving personal items behind after lectures or study sessions.",
        "immediate_action": "Log found item in the central repository register with exact date, time, and location tag.",
        "preventive_measures": [
          "Maintain a searchable digital Lost & Found portal updated daily",
          "Set up designated collection boxes in library and departmental offices"
        ]
    },
    "Suspicious Person": {
        "keywords": ["suspicious", "stranger", "unknown", "trespasser", "unauthorized", "wandering", "fence", "intruder"],
        "category": "Campus Security",
        "department": "Campus Vigilance & Main Security",
        "default_risk": "High",
        "default_priority": "Urgent",
        "sla": "Within 15 Mins",
        "emergency_contact": {"name": "Main Security Control Room", "phone": "+91 98000 33445"},
        "root_cause": "Perimeter fencing gap or unauthorized bypass of gate security screening.",
        "immediate_action": "Intercept individual for identification check and request security backup.",
        "preventive_measures": [
          "Repair perimeter wall fencing and install anti-climb wire mesh",
          "Enforce mandatory smart ID badge scanning for all staff, visitors, and students",
          "Integrate AI facial recognition on primary campus entrance camera feeds"
        ]
    },
    "Infrastructure Damage": {
        "keywords": ["broken", "damage", "crack", "ceiling", "wall", "door", "window", "bench", "railing", "collapsed"],
        "category": "Maintenance",
        "department": "Estate & Civil Infrastructure Division",
        "default_risk": "Medium",
        "default_priority": "Medium",
        "sla": "Within 4 Hours",
        "emergency_contact": {"name": "Estate Engineering Division", "phone": "+91 98000 22334"},
        "root_cause": "Material wear and tear, environmental weathering, or structural stress.",
        "immediate_action": "Cordon off the hazardous zone with caution tape to prevent student access.",
        "preventive_measures": [
          "Conduct monthly civil infrastructure health audits across all buildings",
          "Use high-durability reinforced materials for public fixtures",
          "Perform immediate structural repairs upon initial crack detection"
        ]
    },
    "Cyber Security": {
        "keywords": ["phishing", "virus", "hacked", "ransomware", "spam", "password", "webmail", "credential", "breach"],
        "category": "IT & Cyber Security",
        "department": "IT & Cyber Security Cell",
        "default_risk": "High",
        "default_priority": "High",
        "sla": "Within 1 Hour",
        "emergency_contact": {"name": "Campus IT Helpdesk & Cyber Security", "phone": "+91 98000 88800"},
        "root_cause": "Malicious email campaign, unpatched software vulnerabilities, or unverified USB drive usage.",
        "immediate_action": "Disconnect compromised system from network LAN and block malicious domains on firewall.",
        "preventive_measures": [
          "Mandate Multi-Factor Authentication (MFA) for all campus user logins",
          "Deploy real-time antivirus endpoint protection across lab computers",
          "Run regular cybersecurity hygiene workshops and phishing simulations"
        ]
    }
}

DEFAULT_RULE = {
    "category": "General Safety",
    "department": "Campus Security & General Admin",
    "default_risk": "Low",
    "default_priority": "Medium",
    "sla": "Within 4 Hours",
    "emergency_contact": {"name": "Campus General Desk", "phone": "+91 98000 00000"},
    "root_cause": "Unspecified operational or environment hazard reported.",
    "immediate_action": "Assess site condition and assign inspector.",
    "preventive_measures": [
      "Conduct safety inspection of reported area",
      "Log incident details for administrative review"
    ]
}

def analyze_incident_with_ai(incident_type, description, location, severity_selected):
    desc_lower = description.lower()
    rule = KEYWORD_RULES.get(incident_type, DEFAULT_RULE)
    keywords = rule.get("keywords", [])
    matches = sum(1 for kw in keywords if kw in desc_lower)
    
    if matches >= 3:
        confidence = 98
    elif matches == 2:
        confidence = 95
    elif matches == 1:
        confidence = 92
    else:
        confidence = 88
        
    if severity_selected in ["Critical", "High"]:
        confidence = min(99, confidence + 1)
        
    confidence_str = f"{confidence}%"
    risk_level = severity_selected if severity_selected in ["High", "Critical"] else rule["default_risk"]
    
    if severity_selected == "Critical" or rule["default_risk"] == "Critical":
        priority = "Urgent"
    elif severity_selected == "High" or rule["default_risk"] == "High":
        priority = "High"
    elif severity_selected == "Medium":
        priority = "Medium"
    else:
        priority = "Low"
        
    summary = f"{incident_type} incident reported at {location}. {description[:120].strip()}"
    if not summary.endswith('.'):
        summary += '.'
        
    return {
        "category": rule["category"],
        "risk_level": risk_level,
        "priority": priority,
        "department": rule["department"],
        "incident_summary": summary,
        "root_cause": rule["root_cause"],
        "immediate_action": rule["immediate_action"],
        "preventive_measures": rule["preventive_measures"],
        "confidence_score": confidence_str,
        "emergency_contact": rule["emergency_contact"],
        "estimated_response": rule["sla"]
    }


# ===================================================================
# PAGE ROUTES & ROLE SEPARATION
# ===================================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/student-login')
def student_login_page():
    if session.get('student_logged_in'):
        return redirect(url_for('report'))
    return render_template('student_login.html')

@app.route('/report')
def report():
    if not session.get('student_logged_in'):
        return redirect(url_for('student_login_page'))
    return render_template('report.html', cse_branches=CSE_ALLIED_BRANCHES)

@app.route('/login')
def login():
    if session.get('admin_logged_in'):
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))
    return render_template('dashboard.html')


# ===================================================================
# REST API ENDPOINTS
# ===================================================================

@app.route('/api/student-login', methods=['POST'])
def api_student_login():
    data = request.get_json() or {}
    campus = data.get('campus', 'KIET-1').strip()
    roll_number = data.get('roll_number', '').strip().upper()
    student_name = data.get('student_name', '').strip()
    
    if not roll_number or not student_name:
        return jsonify({"success": False, "message": "Please enter Student Name and Roll Number."}), 400
        
    is_valid, msg = validate_roll_number(roll_number, campus)
    if not is_valid:
        return jsonify({"success": False, "message": msg}), 400
        
    session['student_logged_in'] = True
    session['student_campus'] = campus
    session['student_roll'] = roll_number
    session['student_name'] = student_name
    
    return jsonify({
        "success": True,
        "message": f"Welcome, {student_name}! Logged in successfully as Student.",
        "data": {
            "campus": campus,
            "roll_number": roll_number,
            "student_name": student_name
        }
    })

@app.route('/api/student-logout', methods=['POST'])
def api_student_logout():
    session.pop('student_logged_in', None)
    session.pop('student_campus', None)
    session.pop('student_roll', None)
    session.pop('student_name', None)
    return jsonify({"success": True, "message": "Student logged out."})

@app.route('/api/student-session', methods=['GET'])
def api_student_session():
    if session.get('student_logged_in'):
        return jsonify({
            "logged_in": True,
            "campus": session.get('student_campus'),
            "roll_number": session.get('student_roll'),
            "student_name": session.get('student_name')
        })
    return jsonify({"logged_in": False})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if username == 'admin' and password == 'admin123':
        session['admin_logged_in'] = True
        return jsonify({"success": True, "message": "Admin authenticated successfully!"})
    else:
        return jsonify({"success": False, "message": "Invalid Admin credentials. (Demo: admin / admin123)"}), 401

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('admin_logged_in', None)
    return jsonify({"success": True, "message": "Logged out successfully."})

@app.route('/api/incidents', methods=['GET'])
def api_get_incidents():
    incidents = load_incidents()
    q = request.args.get('q', '').lower().strip()
    status_filter = request.args.get('status', '').strip()
    priority_filter = request.args.get('priority', '').strip()
    
    filtered = []
    for inc in incidents:
        if status_filter and inc.get('status') != status_filter:
            continue
        if priority_filter and inc.get('priority') != priority_filter:
            continue
        if q:
            searchable = f"{inc.get('report_id','')} {inc.get('student_name','')} {inc.get('roll_number','')} {inc.get('location','')} {inc.get('incident_type','')} {inc.get('description','')}".lower()
            if q not in searchable:
                continue
        filtered.append(inc)
        
    return jsonify({"success": True, "count": len(filtered), "data": filtered})

@app.route('/api/report', methods=['POST'])
def api_create_report():
    try:
        campus = request.form.get('campus', session.get('student_campus', 'KIET-1')).strip()
        roll_number = request.form.get('roll_number', '').strip().upper()
        student_name = request.form.get('student_name', '').strip()
        branch = request.form.get('branch', '').strip()
        year = request.form.get('year', '').strip()
        mobile = request.form.get('mobile', '').strip()
        location = request.form.get('location', '').strip()
        incident_type = request.form.get('incident_type', '').strip()
        severity = request.form.get('severity', 'Medium').strip()
        description = request.form.get('description', '').strip()
        
        if not all([roll_number, student_name, branch, year, mobile, location, incident_type, description]):
            return jsonify({"success": False, "message": "Please fill in all required form fields."}), 400

        is_valid, msg = validate_roll_number(roll_number, campus)
        if not is_valid:
            return jsonify({"success": False, "message": msg}), 400
            
        photo_path = ""
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(f"{int(datetime.now().timestamp())}_{file.filename}")
                file_save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_save_path)
                photo_path = f"/static/uploads/{filename}"

        incidents = load_incidents()
        report_id = generate_report_id(incidents)
        ai_analysis = analyze_incident_with_ai(incident_type, description, location, severity)
        
        now = datetime.now()
        created_date = now.strftime('%Y-%m-%d')
        created_time = now.strftime('%I:%M %p')
        
        new_incident = {
            "report_id": report_id,
            "campus": campus,
            "roll_number": roll_number,
            "student_name": student_name,
            "branch": branch,
            "year": year,
            "mobile": mobile,
            "location": location,
            "incident_type": incident_type,
            "severity": severity,
            "description": description,
            "photo_path": photo_path,
            "category": ai_analysis["category"],
            "risk_level": ai_analysis["risk_level"],
            "priority": ai_analysis["priority"],
            "department": ai_analysis["department"],
            "incident_summary": ai_analysis["incident_summary"],
            "root_cause": ai_analysis["root_cause"],
            "immediate_action": ai_analysis["immediate_action"],
            "preventive_measures": ai_analysis["preventive_measures"],
            "confidence_score": ai_analysis["confidence_score"],
            "emergency_contact": ai_analysis["emergency_contact"],
            "estimated_response": ai_analysis["estimated_response"],
            "status": "Pending",
            "created_date": created_date,
            "created_time": created_time
        }
        
        incidents.insert(0, new_incident)
        save_incidents(incidents)
        
        return jsonify({
            "success": True,
            "message": "Incident report submitted successfully!",
            "data": new_incident
        }), 201

    except Exception as e:
        print(f"Error submitting report: {e}")
        return jsonify({"success": False, "message": f"Server Error: {str(e)}"}), 500

@app.route('/api/incidents/<report_id>/status', methods=['PUT'])
def api_update_status(report_id):
    if not session.get('admin_logged_in'):
        return jsonify({"success": False, "message": "Unauthorized. Admin session required."}), 403

    data = request.get_json() or {}
    new_status = data.get('status', '').strip()
    valid_statuses = ["Pending", "Resolved"]
    
    incidents = load_incidents()
    updated = False
    target_inc = None
    
    for inc in incidents:
        if inc.get('report_id') == report_id:
            if new_status in valid_statuses:
                inc['status'] = new_status
            updated = True
            target_inc = inc
            break
            
    if updated:
        save_incidents(incidents)
        return jsonify({"success": True, "message": f"Report {report_id} status changed to {new_status}.", "data": target_inc})
    else:
        return jsonify({"success": False, "message": "Report ID not found."}), 404

@app.route('/api/incidents/<report_id>', methods=['DELETE'])
def api_delete_incident(report_id):
    if not session.get('admin_logged_in'):
        return jsonify({"success": False, "message": "Unauthorized. Admin session required."}), 403

    incidents = load_incidents()
    initial_len = len(incidents)
    incidents = [inc for inc in incidents if inc.get('report_id') != report_id]
    
    if len(incidents) < initial_len:
        save_incidents(incidents)
        return jsonify({"success": True, "message": f"Report {report_id} deleted successfully."})
    else:
        return jsonify({"success": False, "message": "Report ID not found."}), 404

@app.route('/api/stats', methods=['GET'])
def api_get_stats():
    incidents = load_incidents()
    
    total = len(incidents)
    resolved = sum(1 for i in incidents if i.get('status') == 'Resolved')
    pending = sum(1 for i in incidents if i.get('status') == 'Pending')
    high_priority = sum(1 for i in incidents if i.get('priority') in ['High', 'Urgent'])
    
    location_counts = {}
    type_counts = {}
    branch_counts = {}
    category_counts = {}
    priority_counts = {}
    monthly_counts = {}
    critical_alerts = []
    
    for inc in incidents:
        loc = inc.get('location', 'Other')
        itype = inc.get('incident_type', 'Other')
        br = inc.get('branch', 'CSE')
        cat = inc.get('category', 'General Safety')
        prio = inc.get('priority', 'Medium')
        st = inc.get('status', 'Pending')
        dt = inc.get('created_date', '2026-07-01')
        
        location_counts[loc] = location_counts.get(loc, 0) + 1
        type_counts[itype] = type_counts.get(itype, 0) + 1
        branch_counts[br] = branch_counts.get(br, 0) + 1
        category_counts[cat] = category_counts.get(cat, 0) + 1
        priority_counts[prio] = priority_counts.get(prio, 0) + 1
        
        ym = dt[:7] if len(dt) >= 7 else "2026-07"
        monthly_counts[ym] = monthly_counts.get(ym, 0) + 1
        
        if (inc.get('severity') == 'Critical' or prio == 'Urgent') and st == 'Pending':
            critical_alerts.append({
                "report_id": inc.get('report_id'),
                "incident_type": itype,
                "location": loc,
                "status": st,
                "time": inc.get('created_time')
            })

    most_affected_loc = max(location_counts, key=location_counts.get) if location_counts else "N/A"
    most_common_type = max(type_counts, key=type_counts.get) if type_counts else "N/A"
    
    recent_activities = []
    for inc in incidents[:6]:
        recent_activities.append({
            "report_id": inc.get('report_id'),
            "type": inc.get('incident_type'),
            "status": inc.get('status'),
            "date": inc.get('created_date'),
            "time": inc.get('created_time')
        })

    return jsonify({
        "success": True,
        "metrics": {
            "total_reports": total,
            "resolved_reports": resolved,
            "pending_reports": pending,
            "high_priority_incidents": high_priority,
            "most_affected_location": most_affected_loc,
            "most_common_incident": most_common_type,
            "avg_response_time": "1.4 Hours"
        },
        "critical_alerts": critical_alerts,
        "recent_activities": recent_activities,
        "charts": {
            "locations": location_counts,
            "types": type_counts,
            "branches": branch_counts,
            "categories": category_counts,
            "priorities": priority_counts,
            "monthly": monthly_counts
        }
    })


if __name__ == '__main__':
    print("=========================================================")
    print(" CAMPUS SAFETY INCIDENT LOGGER - Server Starting")
    print(" Running on http://0.0.0.0:5000")
    print(" Branches: CSE, CSE(AI&DS), CSE(AI&ML), CAI, CSD, CSM")
    print("=========================================================")
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
