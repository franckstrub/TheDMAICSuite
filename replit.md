# Replit.md - Lean Six Sigma AI SaaS Platform

## Overview
This project is an AI-powered SaaS platform designed for managing Lean Six Sigma projects using the DMAIC (Define, Measure, Analyze, Improve, Control) methodology. It offers comprehensive project management, statistical analysis, measurement system analysis (MSA), and integrates AI for coaching and recommendations. The platform aims to streamline Six Sigma project execution and analysis for businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React.js with TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: TanStack Query
- **Forms**: React Hook Form with Zod
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database ORM**: Drizzle ORM
- **Authentication**: Session-based, multi-tenant

### Database
- **Primary Database**: PostgreSQL (Neon Serverless)
- **Schema Management**: Drizzle ORM
- **Multi-tenancy**: Organization-based data isolation

### Core Features
- **Project Management**: DMAIC phase management, gate review system.
- **Statistical Analysis**: Process capability (Cp, Cpk, Pp, Ppk), control charts, DPMO, RTY, OEE, Pareto analysis, One-Sample Hypothesis Testing with power analysis.
- **Measurement System Analysis (MSA)**: Continuous and attribute systems, Gage R&R.
- **AI Integration**: Google Gemini AI for coaching and analysis.
- **Data Management**: VOC, CTQ, SIPOC, Risk Assessment, Gantt Charts.
- **Visualizations**: BoxPlot, Pareto Chart, Draw.io integration for process maps and fishbone diagrams.

### Design Principles
- Type-safe development across frontend and backend.
- Component-based UI with a focus on reusability and modern aesthetics.
- Robust data persistence with proper foreign key relationships and cascade deletion.
- Role-based access control and multi-tenancy for data isolation.
- Comprehensive client-side validation and error handling.
- Dynamic UI adjustments based on project type (e.g., White Belt/Yellow Belt).
- **Regional Format Support**: Comprehensive French decimal format handling (comma-to-dot conversion) across all statistical input fields and paste operations.
- **Enhanced Focused Cell Paste**: Consistent focused cell paste functionality across One Sample and Two Sample Hypothesis Testing components with proper indexing and dual-dataset support.
- **Two Sample Focused Cell Paste**: Complete solution with virtual focusable cells for empty datasets. When Dataset 2 is empty, numbered virtual cells (1-5) are displayed allowing users to click any position and paste data directly via Ctrl+V. Uses React ref-based focus tracking (`activeDatasetFocusRef`) for immediate state updates without async issues. Enables focused cell paste functionality even when no actual data exists in the dataset.

## External Dependencies

### AI Services
- **Google Gemini AI**: Primary AI service.
- **Anthropic Claude**: Secondary AI service (for specific use cases).

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database.

### Libraries & Tools
- **jstat**: Statistical library for advanced calculations.
- **Drizzle Kit**: Database schema management.
- **Vite**: Frontend build tool.
- **ESBuild**: Production build optimization.
- **TypeScript**: Language and type checking.