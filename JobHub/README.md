<div align="center">
  <h1>Placement Tracker 🎓💼</h1>
  <p>A comprehensive campus placement platform connecting students, universities, and companies.</p>
  
  [![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Java](https://img.shields.io/badge/java-%23ED8B00.svg?style=for-the-badge&logo=java&logoColor=white)](https://www.java.com/en/)
  [![Maven](https://img.shields.io/badge/apache_maven-C71A36?style=for-the-badge&logo=apachemaven&logoColor=white)](https://maven.apache.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
  [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
</div>

## 📖 About

Placement Tracker (JobHub) is a robust full-stack campus recruitment platform designed to seamlessly connect universities, students, and recruiters. The platform handles the full lifecycle of campus placements—spanning student profile creation, resume matching, automated domain-based role verification, job posting and applications, candidate shortlisting, and real-time university analytics.

Built primarily to streamline organizational workflows for universities, it includes specialized portals (Super Admin, University, Company, Candidate) tailored around security and usability.

## ✨ Key Features

- **Role-Based Portals:** Dedicated interfaces for Super Admin, University Administrators, Companies, and Students.
- **Smart Resume Matching & Scoring:** Automated relevance tracking between applicant profiles/resumes and active job listings.
- **Domain-Based Verification:** University domains determine automatic mapping of registered students dynamically scope data. 
- **Advanced Security & RLS:** Employs Supabase PostgreSQL Row Level Security (RLS) to ensure strict data scoping so that companies/universities have access exclusively to their own data metrics.
- **Real-Time Notification Pipeline:** Robust trigger-based notification workflows keeping candidates and recruiters looped in. 
- **User Dashboard Analytics:** Advanced visual dashboards presenting insights, candidate numbers, and administrative statuses. 
- **OAuth & CAPTCHA Integration:** Secure login flows combined with robust super-admin verification actions (verify, revoke). 

## 🛠️ Technology Stack

**Frontend (`job_hub-main`)**
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui

**Backend (`placementtracker`)**
- **Core:** Java 
- **Build Tool:** Apache Maven
- **Authentication:** JWT (JSON Web Tokens)
- **API Features:** OAuth handling, File serving, Servlets

**Database Layer**
- **Database:** Supabase / PostgreSQL 
- **Security:** Strict Database Triggers & Row Level Security (RLS)

## 📂 Project Structure

```text
placement-tracker/
├── job_hub-main/          # React + Vite Frontend application
│   ├── src/               # UI components, API integrations, App Context
│   └── package.json       # Node dependencies
├── placementtracker/      # Java Maven Backend API
│   ├── src/               # Servlets, Models, Filters, JWT handling
│   └── pom.xml            # Maven dependencies
├── README.md              # Project Documentation
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18+)
- [Java Development Kit (JDK)](https://www.oracle.com/java/technologies/downloads/) (v17+)
- [Maven](https://maven.apache.org/)
- Supabase Account and Database Configuration

### Setting Up the Environment Variables

1. Navigate to the frontend directory `job_hub-main/` and copy the example environment file:
   ```sh
   cp .env.example .env
   ```
   Add your Frontend environment rules (e.g., Supabase API Keys, Backend URL parameters).

2. Navigate to the backend directory `placementtracker/` and establish environment keys:
   ```sh
   cp .env.example .env
   ```
   Provide Database Connection strings, Supabase JWT secrets, and OAuth configuration.

### Running the Project

**1. Start the Java Backend:**
```sh
cd placementtracker
./mvnw clean compile exec:java
# Or alternatively, run your application or deploy standard war to your Tomcat server
```

**2. Start the React Frontend:**
```sh
cd job_hub-main
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` (default local port for Vite).

## 🔑 Demo Access

For reviewing default configurations or testing local behaviors without registration verifications: 

| Role | Email | Password |
|---|---|---|
| **Student** | student@demo.com | *(Any Password)* |
| **Company** | company@demo.com | *(Any Password)* |
| **University** | university@demo.com | *(Any Password)* |
| **Super Admin** | admin@demo.com | *(Any Password)* |

## 🤝 Contribution Guidelines
1. **Fork** the repository and create your feature branch: `git checkout -b feature/awesome-feature`
2. Run formatters and linters (`npm run lint` on frontend, enforce standard Java styles on backend).
3. Commit strings logically, outlining precisely what the patch resolves.
4. Open a Pull Request pointing back to the main branch.

---
<div align="center">
  <i>Developed to enhance academic and professional pathways. 🚀</i>
</div>
