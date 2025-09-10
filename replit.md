# AI Talent PIP & Auto-Firing System (PIP-AutoFire)

## Overview

PIP-AutoFire is an AI-driven talent management system designed to automate Performance Improvement Plans (PIPs) and termination workflows in a manager-less environment. The system processes employee performance metrics, automatically initiates PIPs based on configurable thresholds, provides AI-generated coaching feedback, tracks improvement progress, and can automatically terminate employees who fail to meet improvement requirements. Built as a full-stack TypeScript application with React frontend and Express backend, the system prioritizes reliability with kill-switches, rollback capabilities, and comprehensive audit trails.

## User Preferences

Preferred communication style: Simple, everyday language.

## Quick Python Demo

For interview demos, a standalone Python script is included.

1. Install pandas if needed: `pip install pandas`
2. Run the workflow: `python pip_autofire.py`
3. Review `pip_log.json` and `termination_log.json` for audit trails.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured route organization
- **Validation**: Zod schemas for runtime type validation
- **Storage**: In-memory storage implementation with interface for future database integration
- **Development**: Hot-reload support with Vite middleware in development mode

### Data Storage Solutions
- **Database**: PostgreSQL configured via Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless connection (@neondatabase/serverless)
- **Current Implementation**: In-memory storage with database interface for production readiness

### Core Business Logic
- **PIP Engine**: Automated evaluation system that analyzes performance metrics against configurable thresholds
- **Coaching Engine**: AI-simulated coaching system that generates personalized feedback and action items
- **Risk Assessment**: Multi-factor scoring system considering consecutive low periods, trends, and improvement patterns
- **Grace Period Management**: Configurable timeframes for PIP completion with progress tracking

### System Reliability & Safety
- **Kill Switch**: Global system pause capability to halt all automated actions
- **Audit Logging**: Comprehensive tracking of all system actions and decisions
- **Rollback Capability**: Ability to reverse automated decisions with full audit trail
- **Threshold Configuration**: Administrative controls for performance thresholds and evaluation criteria
- **Manual Override**: Human-in-the-loop capabilities for appeals and exceptions

### Application Structure
- **Shared Schema**: Common TypeScript types and Zod schemas used across frontend and backend
- **Modular Components**: Reusable UI components organized by feature area (dashboard, upload, PIP management, coaching, audit, settings)
- **Service Abstraction**: Clean separation between business logic engines and API routes
- **Type Safety**: End-to-end TypeScript with runtime validation using Zod schemas

## External Dependencies

### Database & ORM
- **Drizzle ORM**: Database schema definition and query building
- **Neon Database**: Serverless PostgreSQL hosting (@neondatabase/serverless)
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI Framework & Components
- **Radix UI**: Headless component primitives for accessibility and behavior
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variant management

### Data Management
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment optimizations for Replit platform

### Business Logic Libraries
- **Drizzle-Zod**: Integration between Drizzle ORM and Zod validation
- **Embla Carousel**: Component for data visualization carousels
- **CMDK**: Command palette implementation for admin interfaces