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
- June 26, 2025. Fixed aggressive polling loop in ProcessCapability component that was clearing OEE input fields after saving - auto-save now only triggers on user input changes, not continuous API polling
- June 26, 2025. Fixed OEE input fields not saving to database - updated server route to handle correct OEE field names (oeeScheduledTime, oeeAvailableTime, oeeNominalCapacity, oeePartsManufactured, oeeBadParts)
- June 26, 2025. Enhanced RTY (Rolled Throughput Yield) functionality with proper validation allowing passed units to be 0, which correctly represents process steps where no units passed successfully - critical for accurate quality analysis
- June 26, 2025. Applied DPMO defects field input logic to RTY passed units field - allows typing 0, proper value display, undefined handling for empty fields, and accurate database storage matching DPMO pattern
- June 26, 2025. Implemented comprehensive Pareto Chart functionality with data entry table for defect categorization, interactive visualization with dual Y-axes (count and percentage), cumulative percentage curve, results table, and key insights including 80% rule analysis
- June 26, 2025. Fixed DPU (Defects per Unit) data persistence issue by adding missing enableDpu and DPU fields to data transformation in ProcessCapability component - DPU checkbox now properly saves to database
- June 26, 2025. Enhanced DPU defects input field with same logic as DPMO defects - allows entering 0 values with proper undefined handling and consistent placeholder text
- June 26, 2025. Improved RTY (Rolled Throughput Yield) interface - shows empty first row when no data exists, removed "Add first step" button, added individual delete buttons for each row, and updated grid layout from 3 to 4 columns
- June 27, 2025. Fixed RTY empty row display issue for CTB#3 by updating display logic and input handlers to properly show and initialize empty first row when no data exists
- June 27, 2025. Enhanced OEE bad parts input field with same logic as DPMO defects - allows entering 0 values with proper undefined handling for empty fields, enabling accurate OEE calculations when no defective parts exist
- June 27, 2025. Fixed process capability save validation error by updating schema to handle null values instead of undefined for JSON serialization - Pareto and RTY fields now properly save with null handling for empty values
- June 27, 2025. Enhanced Pareto analysis defects input field with exact same logic as DPMO defects - shows empty field when cleared (not zero), allows entering 0 values, uses null for empty state to fix JSON serialization, and matches DPMO placeholder text exactly
- June 28, 2025. Fixed Measure Validation checklist loading Define deliverables instead of Measure deliverables - corrected database query WHERE clause logic to properly filter by phase, updated initialization logic to use fresh measure defaults, and ensured proper phase filtering in gate review API routes
- June 28, 2025. Resolved gate review system issues affecting both Define and Measure phases - fixed missing `asc` import causing database query failures, implemented robust error handling in frontend queries to gracefully handle API failures, and enhanced initialization logic to properly show default deliverables when database is empty or API calls fail
- June 28, 2025. Successfully completed Measure gate review validation system - fixed component crash by adding missing `getDefaultMeasureValidators` function, consolidated initialization logic to handle both existing and default data properly, verified save functionality works correctly with all 7 deliverables and 4 validators persisting to database, and cleaned up debug logging for production readiness
- June 28, 2025. Fixed Measure deliverables persistence issues - completed default deliverables function with all 7 proper Measure phase deliverables (Process Map, CTS Characteristics, Data Collection Plan, MSA, Process Capability, Control Plan, Gate Review), enhanced save function to properly create default deliverables without IDs in database, cleaned up TypeScript errors in completion percentage calculation, and verified all deliverables now save correctly with POST 201 responses
- June 28, 2025. Applied consistent charter-based validator logic across both Define and Measure phases - validators now only display for charter fields containing actual data, eliminating placeholder validators for empty fields. Both phases now accurately reflect authentic project data from charter instead of using synthetic placeholders
- June 28, 2025. Added informational message in Measure phase for White Belt and Yellow Belt projects - displays blue information card explaining that MSA and Process Capability studies are optional for these project types, helping users understand they can skip these sections based on project requirements
- June 29, 2025. Enhanced Gantt chart container with flexible height system - replaced fixed 600px height with responsive min-h-[600px] max-h-[80vh] design that auto-adjusts to accommodate growing task lists while maintaining optimal viewport usage
- June 29, 2025. Fixed Gantt task sequence management system - implemented automatic sequence incrementing when inserting new tasks, added proper database ordering with orderBy(asc(ganttTasks.sequence)), resolved duplicate sequence issues, and ensured tasks display in correct order for proper drag-and-drop functionality
- June 29, 2025. Implemented Gantt task deletion sequence decrement logic - when deleting a task, all subsequent tasks with higher sequence numbers automatically decrement by 1, eliminating gaps and maintaining continuous sequence ordering for optimal user experience
- June 29, 2025. Implemented MSA Analysis conditional display for White Belt and Yellow Belt projects - displays "Show MSA" button instead of card content by default, toggles to "Hide MSA" when expanded, with localStorage persistence for user preferences across sessions
- June 29, 2025. Successfully implemented Process Capability conditional display for White Belt and Yellow Belt projects - displays "Show Process Capability" button instead of card content by default, toggles to "Hide Process Capability" when expanded, with localStorage persistence for user preferences across sessions, and fixed initialization crashes by adding comprehensive null checks and proper data loading guards to prevent accessing ctqsData before initialization
- June 29, 2025. Fixed MSA justification field persistence issue for continuous CTQ analysis - added missing justification field to continuous MSA POST/PUT API routes and updated frontend initialization logic to properly load existing justification data from database
- June 29, 2025. Resolved authentication duplicate email constraint violation - changed upsertUser conflict resolution from users.id to users.email target to properly handle existing user logins without database crashes
- June 29, 2025. Fixed PayloadTooLargeError for project charter saves - increased Express request size limit from default to 50MB for both JSON and URL-encoded data to handle large project charter content
- June 29, 2025. Implemented comprehensive client-side payload validation - added 50MB file size validation to all image upload components (DefinePhase, UserDropdown, ProfileOverlay) with user-friendly error messages and automatic file input clearing to prevent server payload errors before upload
- June 29, 2025. Enhanced Process Capability AI analysis window with auto-adjusting height - implemented dynamic row calculation based on AI response text length (minimum 6 rows, maximum 20 rows), improved card layout with proper header/content sections, and added character count display with responsive height adjustment for optimal user experience
- June 30, 2025. Fixed CTS characteristics and data collection plan auto-refresh issue - when adding customer requirements with CTS defined in Define phase, CTQ data now automatically updates in Measure phase components without requiring page refresh through comprehensive cache invalidation of CTQ-related queries and updated data collection plan initialization logic to respond to CTQ data changes

## User Preferences

Preferred communication style: Simple, everyday language.