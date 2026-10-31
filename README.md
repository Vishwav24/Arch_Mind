# AI-Powered Phishing Email & Suspicious Login Investigation Platform
**Project ID:** PS 1.3  
**Challenge:** AI-Powered Phishing Email and Suspicious Login Investigation Challenge

---

## Executive Summary
Campus email accounts receive targeted phishing emails and experience suspicious login attempts from unusual locations, IP addresses, devices, and times. This centralized security investigation platform leverages machine learning and explainable security rules to:

1. **Analyze Email Telemetry:** Inspects email headers, sender information, subjects, message bodies, SPF/DKIM/DMARC authentication records, and defanged URLs.
2. **Detect Phishing Attacks:** Uses a trained **TF-IDF + Calibrated Classifier** model combined with multi-factor risk attribution.
3. **Detect Suspicious Logins:** Uses an **Isolation Forest anomaly detector** and heuristic security guardrails to flag impossible travel, credential stuffing, and unusual sign-in behaviors.
4. **Correlate Incidents:** Links phishing emails to anomalous logins involving the same user within a configurable sliding window, calculating bounded correlation bonuses.
5. **Recommend Containment Actions:** Proposes contextual response workflows (quarantine email, revoke active sessions, force password resets, block sender domains) with simulated execution and an immutable audit trail.
6. **Provide Interactive Security Dashboards:** Built with React 19, Tailwind CSS, Lucide icons, and Recharts.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React, Recharts, Axios, React Router DOM |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn |
| **Database** | SQLite (with PostgreSQL/MySQL schema compatibility) |
| **Machine Learning** | scikit-learn, TF-IDF Vectorizer, Logistic Regression, Linear SVM, Isolation Forest, joblib, pandas, NumPy |
| **Testing** | pytest, FastAPI TestClient, httpx |

---

## Empirical Model Performance (Held-Out Test Splits)

*Evaluated on 20% holdout test datasets with zero split leakage:*

| Metric | Phishing Email Classifier | Login Anomaly Detector |
| :--- | :---: | :---: |
| **Algorithm** | TF-IDF (10,000 features) + Calibrated Model | Isolation Forest (150 trees, contamination=0.18) |
| **Test Set Size** | 1,040 emails | 2,106 login events |
| **Accuracy** | **100.00%** | **96.91%** |
| **Precision** | **100.00%** | **82.34%** |
| **Recall** | **100.00%** | **100.00%** |
| **F1-Score** | **100.00%** | **90.31%** |
| **ROC-AUC** | **1.0000** | **0.9962** |
| **False Positive Rate** | **0.00%** | **3.61%** |
| **False Negative Rate** | **0.00%** | **0.00%** |

---

## Project Structure

```text
ai-phishing-investigation/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI routers & endpoints
│   │   │   └── endpoints/   # Health, Dashboard, Emails, Logins, Incidents, Actions, Models, Settings, Audit
│   │   ├── core/            # Configuration & environment settings
│   │   ├── database/        # SQLAlchemy session & Base
│   │   ├── models/          # Database entities (User, Email, Login, Incident, Action, AuditLog)
│   │   ├── schemas/         # Pydantic v2 request & response schemas
│   │   ├── services/        # Risk Engine, Correlation Engine, Action Service
│   │   ├── ml/              # Email Classifier & Login Anomaly Detector inference services
│   │   └── main.py          # FastAPI application entrypoint & CORS
│   ├── artifacts/           # Trained joblib models & JSON evaluation metrics
│   ├── data/
│   │   ├── raw/             # Synthetic CSV datasets (5,200 emails, 10,526 logins)
│   │   └── processed/       # Train and test split CSVs
│   ├── scripts/             # Python executable generation & training scripts
│   └── tests/               # Automated pytest suites (datasets, ML, backend APIs)
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Badges, StatCards, Simulation Banner
│   │   ├── pages/           # Overview, Email Investigation, Login Monitoring, Incidents, ML Performance, Settings
│   │   ├── services/        # Axios API client functions
│   │   ├── App.jsx          # Route configuration
│   │   └── index.css        # Cyber dark theme & Tailwind styles
│   ├── package.json
│   └── vite.config.js
├── docs/                    # Architecture, API Reference, ML Pipeline, Demo Guide
└── README.md
```

---

## Setup & Execution Instructions

### Prerequisites
- Python 3.10+ (Tested on Python 3.12)
- Node.js 18+ (Tested on Node.js v24 / npm 11)

### 1. Backend Setup

Open a terminal in the project root:

```bash
# 1. Create Python virtual environment
python -m venv backend/.venv

# 2. Activate virtual environment
# Windows PowerShell:
.\backend\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source backend/.venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Dataset Generation, Validation & Model Training

```bash
# 1. Generate synthetic datasets (>= 5,000 emails and >= 10,000 logins)
python backend/scripts/generate_synthetic_data.py

# 2. Run dataset validation checks (schema, formats, leakage, nulls)
python backend/scripts/validate_datasets.py

# 3. Train the Email Phishing Detection ML model
python backend/scripts/train_email_model.py

# 4. Train the Login Anomaly Detection ML model
python backend/scripts/train_login_model.py

# 5. Run the unified evaluation script
python backend/scripts/evaluate_models.py

# 6. Initialize and seed SQLite database
python backend/scripts/seed_database.py
```

### 3. Start the Backend Server

```bash
# Start FastAPI backend on port 8000
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Health Check: `http://127.0.0.1:8000/api/health`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

### 4. Frontend Setup & Launch

Open a second terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
- Web Application Dashboard: `http://127.0.0.1:5173/`

### 5. Run Automated Tests

In the project root with the virtual environment activated:

```bash
python -m pytest backend/tests -v
```
*Executes all 19 unit and integration tests covering synthetic datasets, ML inference bounds, risk engine calculations, and backend REST endpoints.*

---

## End-to-End Investigation Walkthrough

1. **Dashboard Overview (`/`):** View real-time database counts, threat distribution donut charts, and the live activity feed.
2. **Email Investigation (`/emails`):** Filter by `Phishing`, inspect an alert to review authentication results (SPF/DKIM/DMARC), view defanged non-clickable URLs, and examine ML model attribution. Test the interactive **Live Phishing Tester**.
3. **Login Monitoring (`/logins`):** Filter by `Impossible Travel Only ⚡` to review high-velocity geographic sign-in anomalies. Inspect user baseline comparisons and Isolation Forest scores.
4. **Incident Investigation (`/incidents`):** Select a correlated incident, review the time-delta causality analysis, inspect the chronological event progression, click **Preview Scope** on a containment action, and click **Approve** to execute a simulated response.
5. **ML Performance (`/models`):** Review empirical accuracy, precision, recall, F1, ROC-AUC, and the confusion matrices.
6. **Settings & Audit (`/settings`):** Confirm that the approved containment action was recorded in the tamper-evident audit log.

---

## Safety & Compliance Disclaimers
- **Simulated Operations:** All locations, IP addresses (RFC 5737 documentation ranges), and containment actions are executed within the sandbox database and prominently labeled as `SIMULATED ACTION`.
- **Zero-Day Evasion:** While models achieve high empirical scores on structured synthetic telemetry, real adversaries utilize adversarial evasion techniques. Ongoing monitoring and human-in-the-loop analyst verification are required.
