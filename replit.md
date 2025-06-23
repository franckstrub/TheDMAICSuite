# Lean Six Sigma AI-Powered SaaS Platform

## Overview

This is a comprehensive Lean Six Sigma project management platform built as a full-stack web application. The system provides AI-powered statistical analysis, MSA functionality, and complete DMAIC (Define, Measure, Analyze, Improve, Control) methodology support. The platform is designed to help organizations manage Six Sigma projects from initiation to completion with built-in coaching, statistical tools, and automated reporting capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React.js with TypeScript for type safety and maintainability
- **UI Framework**: Tailwind CSS with shadcn/ui components for consistent design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Form Management**: React Hook Form with Zod validation for robust form handling
- **Routing**: Client-side routing for SPA experience
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for end-to-end type safety
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with standardized error handling
- **File Handling**: Multer for file uploads and attachment management

### Database Architecture
- **Primary Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Strategy**: Programmatic migrations with versioning
- **Data Modeling**: Relational model with proper foreign key constraints and cascading deletes

## Key Components

### AI Integration
- **Primary AI**: Google Gemini API for project coaching and analysis
- **Secondary AI**: Anthropic Claude for specialized content generation (elevator speeches)
- **Capabilities**: 
  - Real-time coaching assistance for Lean Six Sigma methodologies
  - Automated capability study assessments
  - Intelligent project insights and recommendations

### Statistical Analysis Engine
- **Process Capability Studies**: Automated calculation of Cp, Cpk, Pp, Ppk metrics
- **MSA (Measurement System Analysis)**: Support for both continuous and attribute data
- **Control Charts**: Real-time statistical process control monitoring
- **Normality Testing**: Automated statistical validation of data distributions

### Project Management Features
- **DMAIC Methodology**: Complete implementation of Define, Measure, Analyze, Improve, Control phases
- **Gate Reviews**: Structured phase gates with deliverable tracking and validation
- **Gantt Charts**: Interactive project timeline management with task dependencies
- **Risk Assessment**: Comprehensive risk analysis and mitigation planning
- **Stakeholder Management**: RACI matrices and stakeholder analysis tools

### Multi-Tenant Architecture
- **Organizations**: Support for multiple organizations with isolated data
- **User Roles**: Hierarchical role-based access control (super_admin, admin, manager, member)
- **Data Isolation**: Complete tenant separation at the database level

## Data Flow

1. **User Authentication**: Users authenticate and are associated with their organization
2. **Project Creation**: Projects are created within organizational boundaries
3. **Phase Management**: Users progress through DMAIC phases with guided workflows
4. **Data Collection**: Statistical data is collected and validated in real-time
5. **AI Analysis**: Background AI processing provides insights and recommendations
6. **Reporting**: Automated generation of charts, statistics, and exportable reports
7. **Gate Reviews**: Formal checkpoints ensure project quality and completeness

## External Dependencies

### AI Services
- **Google Gemini API**: Primary AI coaching and analysis engine
- **Anthropic Claude API**: Content generation for specialized outputs

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **Connection Pooling**: Managed through @neondatabase/serverless

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Static type checking across the entire stack
- **ESBuild**: Fast JavaScript bundling for production builds

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Consistent icon library
- **React Hook Form**: Performance-optimized form management
- **Framer Motion**: Smooth animations and transitions

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with hot reloading via Vite
- **Production**: Optimized builds with static asset serving
- **Database**: Serverless PostgreSQL with automatic scaling

### Build Process
1. **Frontend Build**: Vite builds optimized React bundle
2. **Backend Build**: ESBuild creates Node.js production bundle
3. **Asset Management**: Static assets served from dist/public
4. **Database Migration**: Automatic schema updates on deployment

### Hosting Requirements
- **Node.js Runtime**: Version 20+ for modern JavaScript features
- **PostgreSQL**: Version 16+ for advanced JSON operations
- **Port Configuration**: Port 5000 for development, configurable for production

## Changelog

- June 23, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.