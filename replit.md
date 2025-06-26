# Replit.md - Lean Six Sigma AI SaaS Platform

## Overview

This is a comprehensive Lean Six Sigma AI-powered SaaS platform built for managing Six Sigma projects following the DMAIC methodology (Define, Measure, Analyze, Improve, Control). The platform provides statistical analysis capabilities, measurement system analysis (MSA), process capability studies, and project management tools.

## System Architecture

### Frontend Architecture
- **Framework**: React.js with TypeScript for type safety
- **Styling**: Tailwind CSS with component system using shadcn/ui components
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with multi-tenant support

### Database Architecture
- **Primary Database**: PostgreSQL (Neon Serverless)
- **Schema Management**: Drizzle ORM with migration support
- **Multi-tenancy**: Organization-based data isolation

## Key Components

### Core Features
1. **Project Management**: Complete project lifecycle management with DMAIC phases
2. **Statistical Analysis**: Process capability studies, control charts, statistical calculations
3. **MSA (Measurement System Analysis)**: Both continuous and attribute measurement systems
4. **AI Integration**: Google Gemini AI for coaching and analysis recommendations
5. **Document Management**: PDF export capabilities and file attachments
6. **Gate Review System**: Structured project reviews with deliverables tracking

### Data Management
- **Customer Requirements**: Voice of Customer (VOC) capture and CTQ management
- **Business Requirements**: Business case and financial justification tracking
- **SIPOC Diagrams**: Process mapping and stakeholder identification
- **Risk Assessment**: Project risk identification and mitigation planning
- **Gantt Charts**: Project timeline and task management

### Analysis Tools
- **Process Capability**: Cp, Cpk, Pp, Ppk calculations with Z-score analysis
- **Control Charts**: Statistical process control monitoring
- **MSA Studies**: Gage R&R analysis for measurement system validation
- **Financial Analysis**: ROI, NPV, payback period calculations

## Data Flow

### Project Creation Flow
1. User creates project with basic information
2. System generates default organizational structure
3. Project progresses through DMAIC phases sequentially
4. Each phase has specific deliverables and gate reviews

### Analysis Data Flow
1. Raw data input through forms or file upload
2. Server-side statistical calculations using dedicated algorithms
3. Results stored in JSON format for flexibility
4. Real-time updates to frontend via TanStack Query

### AI Integration Flow
1. User requests AI coaching or analysis
2. Context data prepared from project information
3. Google Gemini API called with structured prompts
4. AI response processed and displayed to user

## External Dependencies

### AI Services
- **Google Gemini AI**: Primary AI service for coaching and analysis
- **Anthropic Claude**: Secondary AI service for specific use cases

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection Pooling**: Built-in connection management

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Production build optimization
- **TypeScript**: Type checking and compilation

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reloading via Vite
- **Production**: Node.js server with static file serving
- **Database**: Neon Serverless PostgreSQL with automatic scaling

### Build Process
1. Frontend built with Vite to `dist/public`
2. Backend compiled with ESBuild to `dist/index.js`
3. Static files served from Express server in production

### Ports and Services
- **Development**: Port 5000 for backend API and frontend serving
- **Production**: Port 80 for external access
- **Database**: Managed connection through Neon

## Changelog
- June 23, 2025. Initial setup
- June 23, 2025. Completed comprehensive multi-tenant organization_id audit and fixes across all database operations
- June 23, 2025. Fixed DMAIC WBS Gantt generation with proper authentication and organization isolation
- June 23, 2025. Improved Process Capability UI - Calculate Statistics button always visible with proper state management
- June 25, 2025. Added comprehensive process variation analysis for continuous CTQs with control and stability assessment
- June 25, 2025. Implemented complete attribute CTQ process capability analysis with Non Conformity, DPMO, Rolled Throughput Yield, OEE, and Pareto calculations
- June 25, 2025. Fixed Non-Conformity Z value calculation using inverseNormCDF function and implemented auto-calculation on data changes without auto-save
- June 25, 2025. Fixed process capability database schema to properly track CTQs with ctq_id foreign key, analysis_type field, and unique constraint ensuring one analysis per CTQ
- June 26, 2025. Updated OEE card input structure from availability/performance/quality percentages to production-based inputs: scheduled time, available time, good count, nominal capacity, and parts manufactured
- June 26, 2025. Enhanced OEE results display to show calculated PERFORMANCE TIME, QUALITY TIME, AVAILABILITY %, PERFORMANCE %, QUALITY %, and OEE % with proper formulas

## User Preferences

Preferred communication style: Simple, everyday language.