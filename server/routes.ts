import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertEmployeeSchema,
  insertPerformanceMetricSchema,
  insertPipSchema,
  insertCoachingSessionSchema,
  insertAuditLogSchema,
  updateSystemSettingsSchema,
  csvUploadSchema
} from "@shared/schema";
import { z } from "zod";
import { PipEngine } from "@/lib/pip-engine";
import { generateTerminationPdf } from "./pdf";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      
      await storage.createAuditLog({
        action: "employee_created",
        entityType: "employee",
        entityId: employee.id,
        details: { employee }
      });
      
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  // Performance metrics routes
  app.get("/api/performance-metrics", async (req, res) => {
    try {
      const { employeeId } = req.query;
      
      if (employeeId) {
        const metrics = await storage.getPerformanceMetrics(employeeId as string);
        res.json(metrics);
      } else {
        const metrics = await storage.getAllPerformanceMetrics();
        res.json(metrics);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  app.post("/api/performance-metrics", async (req, res) => {
    try {
      const validatedData = insertPerformanceMetricSchema.parse(req.body);
      const metric = await storage.createPerformanceMetric(validatedData);
      
      await storage.createAuditLog({
        action: "performance_metric_created",
        entityType: "performance_metric",
        entityId: metric.id,
        details: { metric }
      });
      
      res.status(201).json(metric);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid metric data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create performance metric" });
    }
  });

  // CSV upload route
  app.post("/api/upload-csv", async (req, res) => {
    try {
      const validatedData = csvUploadSchema.parse(req.body);
      
      const metrics = validatedData.data.map(row => ({
        employeeId: row.employee_id,
        period: row.period,
        score: row.score,
        tasksCompleted: row.tasks_completed,
        date: row.date
      }));

      const createdMetrics = await storage.createPerformanceMetrics(metrics);
      
      await storage.createAuditLog({
        action: "csv_uploaded",
        entityType: "performance_metrics",
        entityId: "bulk",
        details: { count: createdMetrics.length, metrics: createdMetrics }
      });

      // Run PIP evaluation after CSV upload
      const evaluationResults = await evaluatePIPCandidates();
      
      res.status(201).json({ 
        message: "CSV data uploaded successfully",
        metricsCreated: createdMetrics.length,
        pipEvaluationResults: evaluationResults
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid CSV data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to upload CSV data" });
    }
  });

  // PIP routes
  app.get("/api/pips", async (req, res) => {
    try {
      const { employeeId, active } = req.query;
      
      if (employeeId) {
        const pips = await storage.getPipsByEmployee(employeeId as string);
        res.json(pips);
      } else if (active === "true") {
        const pips = await storage.getAllActivePips();
        res.json(pips);
      } else {
        const pips = await storage.getAllActivePips();
        res.json(pips);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch PIPs" });
    }
  });

  app.post("/api/pips", async (req, res) => {
    try {
      const validatedData = insertPipSchema.parse(req.body);
      const pip = await storage.createPip(validatedData);
      
      // Update employee status
      await storage.updateEmployee(pip.employeeId, { status: "pip" });
      
      await storage.createAuditLog({
        action: "pip_created",
        entityType: "pip",
        entityId: pip.id,
        details: { pip }
      });
      
      res.status(201).json(pip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid PIP data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create PIP" });
    }
  });

  app.put("/api/pips/:id", async (req, res) => {
    try {
      const pip = await storage.updatePip(req.params.id, req.body);
      if (!pip) {
        return res.status(404).json({ error: "PIP not found" });
      }
      
      await storage.createAuditLog({
        action: "pip_updated",
        entityType: "pip",
        entityId: pip.id,
        details: { pip, updates: req.body }
      });
      
      res.json(pip);
    } catch (error) {
      res.status(500).json({ error: "Failed to update PIP" });
    }
  });

  // Coaching routes
  app.get("/api/coaching-sessions", async (req, res) => {
    try {
      const { employeeId } = req.query;
      if (!employeeId) {
        return res.status(400).json({ error: "employeeId parameter is required" });
      }
      
      const sessions = await storage.getCoachingSessions(employeeId as string);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch coaching sessions" });
    }
  });

  app.post("/api/coaching-sessions", async (req, res) => {
    try {
      const validatedData = insertCoachingSessionSchema.parse(req.body);
      const session = await storage.createCoachingSession(validatedData);
      
      await storage.createAuditLog({
        action: "coaching_session_created",
        entityType: "coaching_session",
        entityId: session.id,
        details: { session }
      });
      
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid coaching session data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create coaching session" });
    }
  });

  // Audit logs route
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // System settings routes
  app.get("/api/system-settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  });

  app.put("/api/system-settings", async (req, res) => {
    try {
      const validatedData = updateSystemSettingsSchema.parse(req.body);
      const settings = await storage.updateSystemSettings(validatedData);
      
      await storage.createAuditLog({
        action: "system_settings_updated",
        entityType: "system_settings",
        entityId: "system",
        details: { settings, updates: validatedData }
      });
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update system settings" });
    }
  });

  // PIP evaluation endpoint
  app.post("/api/evaluate-pips", async (req, res) => {
    try {
      const results = await evaluatePIPCandidates();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to evaluate PIP candidates" });
    }
  });

  // Generate coaching endpoint
  app.post("/api/generate-coaching", async (req, res) => {
    try {
      const { employeeId, score, pipId } = req.body;
      
      if (!employeeId || typeof score !== "number") {
        return res.status(400).json({ error: "employeeId and score are required" });
      }
      
      const feedback = generateCoachingFeedback(score);
      const session = await storage.createCoachingSession({
        employeeId,
        pipId,
        feedback,
        type: "automated",
        score,
        date: new Date().toISOString().split('T')[0]
      });
      
      await storage.createAuditLog({
        action: "coaching_generated",
        entityType: "coaching_session",
        entityId: session.id,
        details: { session }
      });
      
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate coaching" });
    }
  });

  // Evaluate PIP progress and handle termination
  app.post("/api/pips/:id/evaluate", async (req, res) => {
    try {
      const pip = await storage.getPip(req.params.id);
      if (!pip) {
        return res.status(404).json({ error: "PIP not found" });
      }

      const employee = await storage.getEmployee(pip.employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const metrics = await storage.getPerformanceMetrics(pip.employeeId);
      const settings = await storage.getSystemSettings();
      const engine = new PipEngine(settings);

      const result = engine.evaluatePipProgress(
        employee,
        metrics,
        pip.startDate,
        pip.endDate,
        pip.initialScore || 0,
        pip.improvementRequired
      );

      if (result.shouldTerminate) {
        await storage.updateEmployee(employee.id, { status: "terminated" });
        await storage.updatePip(pip.id, { status: "terminated" });

        const pdf = await generateTerminationPdf(
          employee.name || employee.id,
          new Date().toISOString().split('T')[0]
        );

        await storage.createAuditLog({
          action: "employee_terminated",
          entityType: "pip",
          entityId: pip.id,
          details: { pdf }
        });

        return res.json({ ...result, terminationPdf: pdf });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to evaluate PIP progress" });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard-metrics", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      const activePips = await storage.getAllActivePips();
      const allMetrics = await storage.getAllPerformanceMetrics();
      
      // Calculate improvement rate (PIPs that led to improvement)
      let improvedCount = 0;
      for (const pip of activePips) {
        if (pip.currentScore && pip.initialScore) {
          const improvement = ((pip.currentScore - pip.initialScore) / pip.initialScore) * 100;
          if (improvement >= pip.improvementRequired) {
            improvedCount++;
          }
        }
      }
      
      const improvementRate = activePips.length > 0 ? (improvedCount / activePips.length) * 100 : 0;
      
      // Count today's automated actions
      const today = new Date().toISOString().split('T')[0];
      const auditLogs = await storage.getAuditLogs();
      const todayActions = auditLogs.filter(log => 
        log.timestamp && log.timestamp.toISOString().split('T')[0] === today &&
        (log.action === 'pip_created' || log.action === 'coaching_session_created')
      );
      
      const metrics = {
        totalEmployees: employees.length,
        activePIPs: activePips.length,
        improvementRate: Math.round(improvementRate),
        autoActionsToday: todayActions.length
      };
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
async function evaluatePIPCandidates() {
  const settings = await storage.getSystemSettings();
  
  if (settings.killSwitchActive) {
    return { message: "Kill switch is active. No automated actions will be taken." };
  }
  
  const employees = await storage.getAllEmployees();
  const results = [];
  
  for (const employee of employees) {
    if (employee.status === "terminated") continue;
    
    const metrics = await storage.getPerformanceMetrics(employee.id);
    const recentMetrics = metrics
      .sort((a, b) => b.period - a.period)
      .slice(0, settings.consecutiveLowPeriods);
    
    if (recentMetrics.length >= settings.consecutiveLowPeriods) {
      const allBelowThreshold = recentMetrics.every(m => m.score < settings.minScoreThreshold);
      
      if (allBelowThreshold && employee.status !== "pip") {
        // Create PIP
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + settings.defaultGracePeriod * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        
        const pip = await storage.createPip({
          employeeId: employee.id,
          startDate,
          endDate,
          gracePeriodDays: settings.defaultGracePeriod,
          goals: [
            `Achieve ${settings.minScoreThreshold + 10}% average score`,
            `Complete ${settings.defaultGracePeriod} tasks`,
            "Improve communication and task quality"
          ],
          coachingPlan: "Weekly feedback sessions focusing on performance improvement areas",
          initialScore: recentMetrics[0].score,
          improvementRequired: settings.minImprovementPercent
        });
        
        await storage.updateEmployee(employee.id, { status: "pip" });
        
        await storage.createAuditLog({
          action: "pip_created_automatically",
          entityType: "pip",
          entityId: pip.id,
          details: { pip, reason: "Consecutive low performance scores" }
        });
        
        results.push({
          action: "pip_created",
          employeeId: employee.id,
          pipId: pip.id,
          reason: "Consecutive low performance scores"
        });
      }
    }
  }
  
  return { results, processed: employees.length };
}

function generateCoachingFeedback(score: number): string {
  if (score < 60) {
    return "Focus on fundamental skills improvement. Review task requirements carefully and seek clarification when needed. Consider additional training resources.";
  } else if (score < 70) {
    return "Good progress but room for improvement. Pay attention to quality metrics and time management. Regular check-ins recommended.";
  } else if (score < 80) {
    return "Solid performance with minor areas for enhancement. Focus on consistency and meeting all task objectives.";
  } else {
    return "Excellent work! Continue maintaining high standards and consider mentoring opportunities.";
  }
}
