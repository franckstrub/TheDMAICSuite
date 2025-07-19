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
- June 30, 2025. Enhanced CTQ auto-refresh for MSA Analysis and Process Capability components - added comprehensive cache invalidation for msa-analysis and process-capability queries in both customer requirements and business requirements save mutations, ensuring all Measure phase components automatically display new CTQs when added in Define phase
- June 30, 2025. Fixed critical Process Capability data loss bug by implementing CTQ ID foreign key relationship - added ctq_id column to process_capability table with foreign key to cts_characteristics.id, updated backend routes to handle CTQ ID relationships for data persistence, migrated existing 5 records successfully, and enhanced frontend to include CTQ IDs in all save operations ensuring process capability data persists when CTQ names change
- June 30, 2025. Fixed foreign key constraint violation in CTS characteristics updates - replaced "delete all and recreate" approach with "update existing or insert new" logic to preserve CTQ IDs that process capability records reference, preventing database constraint errors when saving CTS characteristics modifications
- June 30, 2025. Fixed CTS characteristics creating duplicates instead of updating existing records - changed backend matching logic from CTQ names to CTQ IDs, ensuring modifications to CTQ names properly update existing records instead of creating new ones
- June 30, 2025. Fixed Process Capability component losing data when CTQ names change - updated frontend initialization logic to match existing capability data by CTQ ID instead of CTQ name, ensuring process capability data and analysis results persist when CTQ names are modified
- June 30, 2025. Applied CTQ ID foreign key relationship to MSA Analysis table - added ctq_id column to msa_analysis table with foreign key to cts_characteristics.id, migrated 2 existing records successfully, enhanced backend routes to handle CTQ ID resolution for both attribute and continuous MSA analysis, and updated cascade deletion to remove MSA records by both CTQ ID and CTQ name for complete data cleanup
- July 1, 2025. Removed unused gantt_settings table from database - table was defined in schema but never used in application, dropped table from database and cleaned up unused schema definitions and imports to remove TypeScript validation errors
- July 1, 2025. Enhanced organization management for admin/superadmin users - when admin or superadmin users update their company name in User Profile or User Management overlay, the system now automatically updates their organization name and changes organization type to enterprise_small, ensuring consistent organization branding across the platform
- July 1, 2025. Enhanced organization creation for existing users - when creating organizations for users who already exist in the database, the system now checks for existing company names in user records and automatically uses them to create enterprise organizations with enterprise_small type, ensuring proper organization setup even when user data exists before organization creation
- July 1, 2025. Fixed user management add user functionality crash - corrected POST route for adding new users that was calling non-existent findOrCreateOrganization method, updated to use proper getOrCreateUserOrganization method from organization service, ensuring new user creation works correctly with proper organization assignment
- July 1, 2025. Fixed OAuth signup organization creation issue - when users with company names sign up via OAuth, the system now correctly creates enterprise_small organizations with company names instead of defaulting to individual organizations with "Private Individual" naming, enhanced organization service validation to handle company name detection more robustly
- July 1, 2025. Implemented role-based company name restrictions for User Management - admin users are restricted to their organization's company name when adding new users (field is disabled and pre-filled), while superadmin users retain full flexibility to enter any company name like before, ensuring proper organization isolation for admins while maintaining superadmin capabilities
- July 1, 2025. Fixed critical backend permission issue in user creation route - updated POST /api/admin/users to allow both admin and superadmin access instead of superadmin-only, implemented proper organization isolation where admin users can only add users to their own organization while superadmin retains full flexibility, and enhanced company name assignment to automatically use admin's organization name for consistent data integrity
- July 1, 2025. Fixed organization creation duplication issue - resolved problem where admin-created users were getting duplicate "Private Individual" organizations during authentication flow. Updated replitAuth.ts and storage.ts to preserve existing organization assignments, ensuring admin users can only assign new users to their own organization without interference from authentication system organization creation logic
- July 1, 2025. Enhanced organization management for superadmin user creation - when superadmin creates users with company names, system now checks for existing organizations with matching names and assigns users to existing organizations instead of creating duplicates. Added organization lookup by company name in organizationService to prevent unnecessary organization proliferation
- July 1, 2025. Fixed admin user update permissions - updated PUT /api/admin/users/:userId route to allow both admin and superadmin access instead of superadmin-only, added organization isolation so admin users can only update users within their own organization while superadmin retains full flexibility across all organizations
- July 1, 2025. Fixed admin user deletion permissions - updated DELETE /api/admin/users/:userId route to allow both admin and superadmin access instead of superadmin-only, added organization isolation so admin users can only delete users within their own organization while superadmin retains full flexibility across all organizations
- July 1, 2025. Enhanced form clearing for admin user creation - streamlined success handler to use resetForm() function which properly preserves company name for admin users while clearing all other form fields after successful user creation
- July 1, 2025. Implemented superadmin user creation without company names - allows superadmin to create users without company names which automatically creates individual organizations with "userid Individual" naming format, removed required validation for company name field for superadmin users while maintaining it for admin users, enabling flexible user creation across organization types
- July 3, 2025. Separated DrawIoProcessMap and DrawIoFishbone components - restored original DrawIoProcessMap.tsx functionality for process mapping in Measure phase, created separate DrawIoFishbone.tsx component for CTQ-specific fishbone diagrams in Analyze phase using identical draw.io integration pattern, ensuring clear separation of concerns between process mapping and root cause analysis tools
- July 4, 2025. Fixed root cause prioritization component data persistence issues - resolved frontend-backend API route conflicts by changing URL pattern from `/api/projects/:projectId/:ctqId/rootcause-characteristics` to `/api/projects/:projectId/ctq/:ctqId/rootcause-characteristics`, added proper TanStack Query data fetching with useQuery hook for loading existing data, aligned data structure keys between frontend (rootCauses) and backend, and fixed data type validation error where multivotescore field was being sent as string but backend expected number - added proper type conversion in both frontend input handling and backend validation
- July 4, 2025. Fixed root cause deletion functionality - created proper DELETE endpoint `/api/projects/:projectId/ctq/:ctqId/rootcause-characteristics/:rootCauseId` with organization isolation and authentication, updated frontend to use correct deletion API instead of incorrect CTQ cascade deletion endpoint, added proper query cache invalidation to refresh data after deletion, ensuring deleted root causes are permanently removed from database and UI
- July 4, 2025. Resolved authentication issues in root cause deletion - fixed 401 Unauthorized errors by using parseInt(userId) pattern matching other successful DELETE endpoints, verified core deletion functionality works correctly, enhanced CTQ cascade deletion to include root cause prioritization records, updated frontend cache invalidation and user warning messages to reflect complete data cleanup when CTQs are deleted
- July 8, 2025. Completed comprehensive cause-effect matrix implementation with full CRUD operations - created database table with proper foreign key relationships, implemented project-level API routes for GET and POST operations, built complete React component with data loading/saving functionality, added proper cache invalidation and error handling, enhanced cascade deletion to include cause-effect matrix cleanup when projects are deleted, verified all cascade deletion paths include cause-effect matrix, MSA analysis, process capability, fishbone diagrams, process maps, and CTS characteristics for complete data cleanup
- July 8, 2025. Fixed cause-effect matrix save functionality and removed unnecessary ctq_id column - corrected API request parameter order in frontend mutation function, updated response handling to properly parse JSON, removed ctq_id foreign key column from cause_effect_matrix table since matrices operate at project level rather than CTQ level, updated schema and server routes to remove ctq_id dependency
- July 8, 2025. Fixed cause-effect matrix dimensions to properly save 5×4 matrix (5 root causes × 4 CTQs) instead of 5×5 - corrected matrix initialization logic to remove extra column, updated dimension synchronization and save function to trim matrix rows to CTQ count, ensured consistent 5×4 structure throughout component lifecycle
- July 9, 2025. Fixed keyboard shortcut compatibility in One-Sample Hypothesis Test component - replaced simple Ctrl+Z undo handler with comprehensive keyboard shortcut system supporting both Ctrl+V/Ctrl+Z (Windows/Linux) and Cmd+V/Cmd+Z (Mac) for paste and undo operations, matching ProcessCapability and MSA components functionality, updated help text to reflect cross-platform keyboard shortcuts
- July 9, 2025. Fixed Process Capability empty cell data saving issue - resolved server validation errors when cells are cleared by implementing proper empty value handling that removes data points from array instead of sending NaN values, added numeric value filtering to ensure only valid numbers are sent to server, enabled proper saving of empty datasets when all cells are cleared
- July 9, 2025. Fixed ContCTQHypTesting initialization error - resolved "Cannot access 'currentTestType' before initialization" runtime error by properly initializing ContCTQHypTestData state with function initializer, updated useEffect dependency to use safe optional chaining instead of currentTestType variable, ensured component defaults to "One Sample Hyp-Test" when state is undefined
- July 9, 2025. Fixed Ctrl+V paste functionality in ContCTQHypTesting component - resolved issue where Ctrl+V wasn't working but Cmd+V was working by updating keyboard shortcut handler to use local testType variable with safe optional chaining instead of accessing currentTestType, ensuring both Windows/Linux (Ctrl) and Mac (Cmd) keyboard shortcuts work consistently
- July 9, 2025. Enhanced ContCTQHypTesting keyboard shortcuts with proper CTQ tab awareness - implemented activeTab prop flow from AnalyzePhase through ContinuousCTQAnalysis to ContCTQHypTesting component, ensuring Ctrl+V/Ctrl+Z shortcuts only work when the specific CTQ tab is active, removed test type restrictions to support all hypothesis test types, matching MSA and ProcessCapability component behavior for robust multi-CTQ environments
- July 9, 2025. Fixed Ctrl+V paste functionality in ContCTQHypTesting component - resolved issue where keyboard shortcuts weren't working due to input field restrictions, simplified keyboard shortcut logic to match MSA and Process Capability components by removing input field detection, paste now works whenever the CTQ tab is active regardless of which field is focused
- July 9, 2025. Fixed MSA component showing incorrect data count when clipboard is empty - updated keyboard shortcut handler to properly check for empty clipboard data and show appropriate "No Data Found" message instead of attempting to process empty data, preventing misleading count messages when using Ctrl+V with cleared clipboard
- July 9, 2025. Enhanced MSA component numeric validation for paste operations - added proper numeric validation similar to Process Capability component that counts valid numbers and shows error when no valid numeric data is found, preventing processing of non-numeric clipboard content and ensuring only valid measurement data is accepted for MSA analysis
- July 9, 2025. Fixed MSA paste data incorrectly routing to Process Capability component - resolved keyboard shortcut conflict where both MSA and Process Capability components were listening for Ctrl+V simultaneously, implemented component-specific focus detection using data-component and msa-table class selectors, ensuring MSA paste operations correctly route to MSA data handlers instead of Process Capability handlers
- July 9, 2025. Completed MSA focused cell paste functionality - added data-row-index and data-field attributes to MSA input fields for proper cell position detection, enhanced keyboard shortcut and "Paste from Excel" button to detect focused cell position and use handleFocusedCellPaste instead of general table paste, ensuring data is pasted and rendered correctly from any focused cell position instead of always defaulting to row 1, column 1
- July 9, 2025. Fixed "Paste from Excel" button always pasting from row 1, column 1 - added lastFocusedCell state tracking to remember cell focus when button is clicked, implemented focus tracking with onFocus handlers on input fields, enhanced button logic to use last focused cell information when current focus is lost, ensuring both Ctrl+V and button respect the same focused cell position
- July 9, 2025. Enhanced ContCTQHypTesting undo functionality with granular action tracking - improved undo stack to store action descriptions (Add data point, Delete data point, Paste X data points, Edit data point at row Y), updated all saveToUndoStack calls to include specific action context, enhanced undo feedback messages to show exactly what action was undone, ensuring users understand what each undo operation reverts
- July 9, 2025. Fixed MSA undo functionality to restore original table state - implemented originalStates storage to capture initial table structure when MSA data loads, updated paste functions to save original state as undo state instead of current state, ensuring Ctrl+Z always restores to exact original table structure regardless of user modifications or additional rows created during paste operations
- July 9, 2025. Applied same original state restoration pattern to ContCTQHypTesting component - implemented simple original state capture and restoration for consistent undo behavior across MSA, Process Capability, and hypothesis testing components, ensuring Ctrl+Z restores to initial table state
- July 9, 2025. Enhanced ContCTQHypTesting undo button positioning - moved undo button to left of "Paste data from Excel" button for better user experience, updated styling with red color and undo icon, removed duplicate undo button from table bottom
- July 9, 2025. Fixed ContCTQHypTesting undo system to work incrementally like ProcessCapability - implemented proper undo state management that saves current data state before each operation (add, delete, paste, edit), clears undo state after use, and only reverses the last action instead of clearing all data. Removed showUndoButton state in favor of checking undoState directly for consistent behavior with ProcessCapability component
- July 10, 2025. Implemented database persistence for Continuous CTQ Analysis configuration choices - created continuous_ctq_analysis_config table with proper schema, foreign key relationships, and cascade deletion logic. Added GET/POST API routes for saving and loading analysis configurations. Enhanced ContinuousCTQAnalysis component with TanStack Query for data persistence, proper initialization from database, and user-friendly save functionality with loading states and error handling
- July 10, 2025. Fixed React state timing issue in ContinuousCTQAnalysis component - resolved race condition where checkboxes displayed incorrect values when navigating between MEASURE and ANALYZE phases. Implemented setTimeout(0) pattern to ensure state updates occur after React's batching cycle, ensuring saved configuration preferences load and display correctly without relying on debug timing delays
- July 10, 2025. Completed comprehensive hypothesis testing database persistence system - fixed TanStack Query HTTP method errors in both ContCTQHypTesting and ContCTQOneSampleHypTesting components by replacing apiRequest with proper fetch API pattern. Updated query keys to match default queryFn expectations, implemented proper authentication with credentials: 'include', and added robust error handling. Both main hypothesis testing configuration and one-sample hypothesis testing now successfully save and load user selections with 201 POST and 200 GET responses, ensuring persistent analysis type preferences across sessions
- July 10, 2025. Enhanced hypothesis testing components with improved loading guards - added !isLoading checks and isLoading dependency to useEffect hooks to prevent race conditions when accessing configData.config properties, ensuring reliable data initialization and preventing timing issues during component mounting and data loading phases
- July 10, 2025. Fixed one-sample hypothesis testing database schema compatibility issue - updated database to rename 'alternative' column to 'alternativemean' and added new 'alternativevariance' and 'alternativemedian' columns. Corrected component logic to properly load the new field names from database, resolving column "alternative" does not exist error and enabling successful configuration saves
- July 15, 2025. Implemented BoxPlot visualization for one-sample hypothesis testing - fixed syntax errors in function calls, added showBoxPlot state management, created proper component integration with confidence intervals and target value display, added default export to BoxPlotWith1SMeanTest component resolving import issues
- July 15, 2025. Installed jstat statistical library with custom TypeScript declarations - added comprehensive type definitions for normal, t-distribution, chi-square, and F-distribution functions, enabling advanced statistical calculations for hypothesis testing components
- July 15, 2025. Fixed jStat binomial distribution compatibility issues - implemented custom binomialQuantile function to replace non-existent jStat.binomial.inv method, updated median hypothesis testing to use proper binomial PDF-based quantile calculation, corrected TypeScript declarations to match actual jStat API
- July 15, 2025. Diagnosed deployment authentication issues vs database schema - confirmed one_sample_hypothesis_config table already has correct target_stdev field (not target_variance), verified all code uses proper field names, identified "failed to load projects" error as authentication issue rather than database problem, requiring users to re-authenticate in deployed environment
- July 19, 2025. Added project_typology field to projects table database schema - positioned next to project_category field with default value "Project", updated TypeScript schema definitions, verified database column creation and existing project data migration successful
- July 19, 2025. Added project_typology field to project_charters table database schema - positioned next to project_category field with default value "Project", fixed schema typo (projectTypologyy to projectTypology), verified all 7 existing project charters now have default value, confirmed TypeScript insert schema properly includes the field
- July 19, 2025. Completed project typology feature implementation - updated DefinePhase UI with 3-column layout (type/category/typology), added projectTypology to charter save mutation payload, enhanced server-side syncProjectBenefitsFromCharter function to synchronize project type, category, and typology from charter to main project data, includes proper form initialization and validation with dropdown options (Project, Program, Portfolio, Initiative, Campaign)
- July 19, 2025. Enhanced ContCTQOneSampleHypTesting component with auto-scroll functionality - added useRef for table container, implemented automatic scrolling to show newly added rows after adding data points, enhanced paste operations (button, keyboard shortcuts, cell paste) to scroll to newly pasted data, includes smart positioning for cell-specific paste operations to show the last pasted row

## User Preferences

Preferred communication style: Simple, everyday language.