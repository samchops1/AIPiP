import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  department: text("department"),
  role: text("role"),
  managerId: varchar("manager_id"),
  companyId: varchar("company_id"),
  status: text("status").notNull().default("active"), // active, pip, terminated
  backstory: text("backstory"), // Employee's background and context
  recentHistory: jsonb("recent_history"), // Array of recent notable events/achievements
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  period: integer("period").notNull(),
  score: real("score").notNull(),
  utilization: real("utilization").notNull(), // percentage of billable hours
  tasksCompleted: integer("tasks_completed").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`)
});

export const pips = pgTable("pips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  status: text("status").notNull().default("active"), // active, completed, terminated
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  gracePeriodDays: integer("grace_period_days").notNull().default(21),
  goals: jsonb("goals").notNull(),
  coachingPlan: text("coaching_plan").notNull(),
  progress: real("progress").notNull().default(0),
  initialScore: real("initial_score"),
  currentScore: real("current_score"),
  improvementRequired: real("improvement_required").notNull().default(10),
  createdAt: timestamp("created_at").default(sql`now()`)
});

export const coachingSessions = pgTable("coaching_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  pipId: varchar("pip_id"),
  feedback: text("feedback").notNull(),
  type: text("type").notNull(), // automated, manual
  score: real("score"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`)
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  userId: varchar("user_id"),
  details: jsonb("details").notNull(),
  timestamp: timestamp("timestamp").default(sql`now()`)
});

export const terminatedEmployees = pgTable("terminated_employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  terminationDate: text("termination_date").notNull(),
  terminationReason: text("termination_reason").notNull(),
  terminationLetter: text("termination_letter").notNull(),
  finalScore: real("final_score"),
  finalUtilization: real("final_utilization"),
  createdAt: timestamp("created_at").default(sql`now()`)
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default("system"),
  killSwitchActive: boolean("kill_switch_active").notNull().default(false),
  minScoreThreshold: real("min_score_threshold").notNull().default(70),
  minUtilizationThreshold: real("min_utilization_threshold").notNull().default(60),
  consecutiveLowPeriods: integer("consecutive_low_periods").notNull().default(3),
  defaultGracePeriod: integer("default_grace_period").notNull().default(21),
  minImprovementPercent: real("min_improvement_percent").notNull().default(10),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Insert schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  createdAt: true,
  updatedAt: true
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true
});

export const insertPipSchema = createInsertSchema(pips).omit({
  id: true,
  createdAt: true
});

export const insertCoachingSessionSchema = createInsertSchema(coachingSessions).omit({
  id: true,
  createdAt: true
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true
});

export const insertTerminatedEmployeeSchema = createInsertSchema(terminatedEmployees).omit({
  id: true,
  createdAt: true
});

export const updateSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true
}).partial();

// CSV upload schema
export const csvUploadSchema = z.object({
  data: z.array(z.object({
    employee_id: z.string(),
    period: z.number(),
    score: z.number(),
    utilization: z.number(),
    tasks_completed: z.number(),
    date: z.string()
  }))
});

// Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type Pip = typeof pips.$inferSelect;
export type InsertPip = z.infer<typeof insertPipSchema>;
export type CoachingSession = typeof coachingSessions.$inferSelect;
export type InsertCoachingSession = z.infer<typeof insertCoachingSessionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type TerminatedEmployee = typeof terminatedEmployees.$inferSelect;
export type InsertTerminatedEmployee = z.infer<typeof insertTerminatedEmployeeSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type UpdateSystemSettings = z.infer<typeof updateSystemSettingsSchema>;
export type CsvUpload = z.infer<typeof csvUploadSchema>;
