# Raahi - The Immersive Task Intelligence Platform

**Raahi** (meaning "Traveler") is a high-fidelity, role-based task management dashboard designed to bridge the gap between team productivity and aesthetic excellence. Built with a robust **Django** backend and a stunning **Three.js** 3D interface, Raahi provides a seamless experience for managing complex projects with precision and style.

## Key Features

- **🛡️ Secure Role-Based Access (RBAC)**: Distinct workflows for **Admins** and **Members**. Admins have full control over project creation and final task approval, while Members focus on execution.
- **✨ Ultra-Modern Glassmorphism UI**: A premium, translucent interface featuring fluid animations, vibrant gradients, and a reactive 3D particle background powered by **Three.js**.
- **📋 Smart Review Workflow**: Members can't just "finish" a task—they must submit it for review with an optional note. Admins then verify the work before it is officially marked as "Done".
- **📊 Real-Time Data Analytics**: Integrated **Chart.js** provides instant visual insights into project progress (To Do vs. Done vs. Overdue), automatically recalculated as you filter through projects.
- **📁 Rich Task Management**: 
    - **Attachments**: Support for direct file uploads (images/docs) when assigning tasks.
    - **Detailed Descriptions**: Markdown-ready description fields for every task.
    - **Deadlines**: Automatic overdue detection with visual alerts.
- **📄 Professional PDF Reporting**: Generate official, print-ready A4 project reports with a single click, including executive summaries, progress charts, and full task breakdowns.
- **🔍 Project & Status Intelligence**: Instant local filtering by project or task status (Total/To Do/Done/Overdue) for a zero-latency experience.

## Local Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd django-task-manager
   ```

2. **Create a Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   # or source venv/bin/activate on macOS/Linux
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run Migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Start the Development Server**:
   ```bash
   python manage.py runserver
   ```
   Open `http://127.0.0.1:8000` in your browser.

## Deployment to Railway (Mandatory Steps)

1. **Push to GitHub**:
   - Initialize a git repository: `git init`
   - Add files: `git add .`
   - Commit: `git commit -m "Initial commit"`
   - Push to a new GitHub repository.

2. **Deploy on Railway**:
   - Go to [Railway.app](https://railway.app/) and create an account.
   - Click **New Project** -> **Deploy from GitHub repo**.
   - Select your newly created repository.

3. **Configure Database (Optional for Production)**:
   - Railway will use SQLite by default based on the current settings. Note that SQLite on Railway is ephemeral (data resets on deploy) unless a volume is attached.
   - To use PostgreSQL, add a PostgreSQL database in your Railway project, install `psycopg2-binary`, and update `DATABASES` in `settings.py` using `dj-database-url`.

4. **Add start command**:
   - Add a `Procfile` to the root directory with the following content:
     `web: gunicorn config.wsgi --log-file -`
   - Install gunicorn: `pip install gunicorn` and update `requirements.txt` (`pip freeze > requirements.txt`).

**Enjoy your highly immersive Task Management App!**
