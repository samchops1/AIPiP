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

  // Generate sample data
  // Terminated employees routes
  app.get("/api/terminated-employees", async (req, res) => {
    try {
      const terminatedEmployees = await storage.getTerminatedEmployees();
      res.json(terminatedEmployees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch terminated employees" });
    }
  });

  // Auto-firing demonstration endpoint
  app.post("/api/auto-fire/demo", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      
      if (settings.killSwitchActive) {
        return res.json({ 
          message: "Kill switch is active. Auto-firing is disabled.",
          terminated: []
        });
      }

      const employees = await storage.getAllEmployees();
      const metrics = await storage.getAllPerformanceMetrics();
      const terminated = [];

      // Find employees with consistently poor performance AND utilization
      for (const employee of employees) {
        if (employee.status !== 'active') continue;

        const employeeMetrics = metrics
          .filter(m => m.employeeId === employee.id)
          .sort((a, b) => b.period - a.period)
          .slice(0, settings.consecutiveLowPeriods);

        if (employeeMetrics.length >= settings.consecutiveLowPeriods) {
          const allLowPerformance = employeeMetrics.every(m => 
            m.score < settings.minScoreThreshold && 
            m.utilization < settings.minUtilizationThreshold
          );

          if (allLowPerformance) {
            const latestMetric = employeeMetrics[0];
            const reasons = [
              `Consistently scored below ${settings.minScoreThreshold}% for ${settings.consecutiveLowPeriods} consecutive periods`,
              `Utilization consistently below ${settings.minUtilizationThreshold}% vs company standard`,
              "Failed to meet minimum performance standards despite coaching opportunities",
              `Average score: ${Math.round(employeeMetrics.reduce((sum, m) => sum + m.score, 0) / employeeMetrics.length)}%`,
              `Average utilization: ${Math.round(employeeMetrics.reduce((sum, m) => sum + m.utilization, 0) / employeeMetrics.length)}%`
            ];

            // Update employee status
            await storage.updateEmployee(employee.id, { status: "terminated" });

            // Create termination record
            await storage.createTerminatedEmployee({
              employeeId: employee.id,
              employeeName: employee.name,
              terminationDate: new Date().toISOString().split('T')[0],
              terminationReason: "Consistent poor performance and utilization below company standards",
              terminationLetter: generateTerminationLetter(
                employee.name,
                employee.role || "Employee",
                latestMetric.score,
                latestMetric.utilization,
                reasons
              ),
              finalScore: latestMetric.score,
              finalUtilization: latestMetric.utilization
            });

            // Create audit log
            await storage.createAuditLog({
              action: "employee_auto_terminated",
              entityType: "employee",
              entityId: employee.id,
              details: {
                reason: "Auto-firing due to consecutive poor performance and utilization",
                finalScore: latestMetric.score,
                finalUtilization: latestMetric.utilization,
                periodsEvaluated: settings.consecutiveLowPeriods
              }
            });

            terminated.push({
              id: employee.id,
              name: employee.name,
              role: employee.role,
              finalScore: latestMetric.score,
              finalUtilization: latestMetric.utilization,
              reason: "Consecutive poor performance and low utilization"
            });
          }
        }
      }

      res.json({
        message: terminated.length > 0 
          ? `Auto-firing completed. ${terminated.length} employee(s) terminated.`
          : "No employees met termination criteria.",
        terminated
      });
    } catch (error) {
      console.error('Error in auto-firing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/sample-data/generate', async (req, res) => {
    try {
      await generateSampleData(storage);
      res.json({ success: true, message: 'Sample data generated successfully' });
    } catch (error) {
      console.error('Error generating sample data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Clear all data
  app.post('/api/sample-data/clear', async (req, res) => {
    try {
      await clearAllData(storage);
      res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
      console.error('Error clearing data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Auto-firing evaluation endpoint
  app.post('/api/evaluate-terminations', async (req, res) => {
    try {
      const results = await evaluateTerminationCandidates();
      res.json(results);
    } catch (error) {
      console.error('Error evaluating terminations:', error);
      res.status(500).json({ error: 'Failed to evaluate termination candidates' });
    }
  });

  // PIP document generation endpoint
  app.get('/api/pips/:id/document', async (req, res) => {
    try {
      const pip = await storage.getPipById(req.params.id);
      if (!pip) {
        return res.status(404).json({ error: 'PIP not found' });
      }

      const employee = await storage.getEmployee(pip.employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const document = generatePipDocument(pip, employee);
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="PIP_${employee.name.replace(/\s+/g, '_')}_${pip.id}.txt"`);
      res.send(document);
    } catch (error) {
      console.error('Error generating PIP document:', error);
      res.status(500).json({ error: 'Failed to generate PIP document' });
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

function generateTerminationLetter(
  employeeName: string, 
  role: string, 
  finalScore: number, 
  finalUtilization: number, 
  reasons: string[]
): string {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `EMPLOYMENT TERMINATION NOTICE

Date: ${currentDate}

Dear ${employeeName},

This letter serves as formal notice that your employment with our organization in the position of ${role} is terminated effective immediately.

PERFORMANCE SUMMARY:
• Final Performance Score: ${finalScore}%
• Final Utilization Rate: ${finalUtilization}%

REASONS FOR TERMINATION:
${reasons.map(reason => `• ${reason}`).join('\n')}

This decision is based on documented performance issues and failure to meet the minimum standards required for your position. Despite previous coaching efforts and performance improvement opportunities, the required improvements have not been achieved.

Your final paycheck, including any accrued vacation time, will be processed according to company policy and applicable law. Please return all company property, including but not limited to:
• Company equipment (laptop, phone, keys, etc.)
• Access cards and identification
• Any confidential or proprietary materials

For questions regarding benefits continuation or final pay, please contact Human Resources.

We wish you success in your future endeavors.

Sincerely,

Human Resources Department
Automated HR Management System

---
This letter was generated automatically based on performance data and company policies.
Generated on: ${currentDate}`;
}

// Sample data generation functions
async function generateSampleData(storage: any) {
  const employees = [
    {
      id: "emp-001",
      name: "Alex Thompson",
      role: "Software Engineer",
      email: "alex.thompson@company.com",
      department: "Engineering",
      status: "active",
      managerId: null
    },
    {
      id: "emp-002", 
      name: "Sarah Chen",
      role: "Product Manager",
      email: "sarah.chen@company.com",
      department: "Product",
      status: "active",
      managerId: null
    },
    {
      id: "emp-003",
      name: "Marcus Johnson",
      role: "QA Engineer",
      email: "marcus.johnson@company.com",
      department: "Engineering",
      status: "pip",
      managerId: null
    },
    {
      id: "emp-004",
      name: "Emily Rodriguez",
      role: "Designer",
      email: "emily.rodriguez@company.com",
      department: "Design",
      status: "active",
      managerId: null
    },
    {
      id: "emp-005",
      name: "David Kim",
      role: "Data Analyst",
      email: "david.kim@company.com",
      department: "Data",
      status: "active",
      managerId: null
    },
    {
      id: "emp-006",
      name: "Jennifer Wilson",
      role: "Sales Representative",
      email: "jennifer.wilson@company.com",
      department: "Sales",
      status: "terminated",
      managerId: null
    }
  ];

  // Create employees
  for (const emp of employees) {
    await storage.createEmployee(emp);
  }

  // Generate performance metrics with realistic patterns
  const currentPeriod = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7)); // Current week
  
  // Alex Thompson - High performer
  for (let i = 0; i < 12; i++) {
    await storage.createPerformanceMetric({
      employeeId: "emp-001",
      period: currentPeriod - i,
      score: Math.floor(Math.random() * 15) + 85, // 85-100
      utilization: Math.floor(Math.random() * 10) + 85, // 85-95% utilization
      tasksCompleted: Math.floor(Math.random() * 5) + 15, // 15-20
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  // Sarah Chen - Steady performer with recent improvement
  for (let i = 0; i < 12; i++) {
    const baseScore = i < 4 ? 78 : 65; // Recent improvement
    const baseUtilization = i < 4 ? 75 : 68; // Improving utilization
    await storage.createPerformanceMetric({
      employeeId: "emp-002",
      period: currentPeriod - i,
      score: Math.floor(Math.random() * 10) + baseScore, 
      utilization: Math.floor(Math.random() * 8) + baseUtilization, // 68-83%
      tasksCompleted: Math.floor(Math.random() * 3) + 12,
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  // Marcus Johnson - Struggling performer (should be on PIP)
  for (let i = 0; i < 12; i++) {
    await storage.createPerformanceMetric({
      employeeId: "emp-003",
      period: currentPeriod - i,
      score: Math.floor(Math.random() * 15) + 50, // 50-65
      utilization: Math.floor(Math.random() * 15) + 45, // 45-60% poor utilization
      tasksCompleted: Math.floor(Math.random() * 3) + 8, // 8-11
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  // Emily Rodriguez - Inconsistent performer
  for (let i = 0; i < 12; i++) {
    const isGoodWeek = Math.random() > 0.4;
    await storage.createPerformanceMetric({
      employeeId: "emp-004",
      period: currentPeriod - i,
      score: isGoodWeek ? Math.floor(Math.random() * 10) + 80 : Math.floor(Math.random() * 15) + 55,
      utilization: isGoodWeek ? Math.floor(Math.random() * 10) + 75 : Math.floor(Math.random() * 15) + 50, // Inconsistent 50-85%
      tasksCompleted: isGoodWeek ? Math.floor(Math.random() * 3) + 14 : Math.floor(Math.random() * 4) + 9,
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  // David Kim - Good performer with slight decline
  for (let i = 0; i < 12; i++) {
    const baseScore = i < 3 ? 68 : 78; // Recent decline
    const baseUtilization = i < 3 ? 65 : 75; // Declining utilization 
    await storage.createPerformanceMetric({
      employeeId: "emp-005",
      period: currentPeriod - i,
      score: Math.floor(Math.random() * 8) + baseScore,
      utilization: Math.floor(Math.random() * 8) + baseUtilization, // 65-83%
      tasksCompleted: Math.floor(Math.random() * 3) + 13,
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  // Jennifer Wilson - Poor performer (terminated)
  for (let i = 0; i < 8; i++) {
    await storage.createPerformanceMetric({
      employeeId: "emp-006",
      period: currentPeriod - i - 4, // Older data before termination
      score: Math.floor(Math.random() * 10) + 35, // 35-45
      utilization: Math.floor(Math.random() * 15) + 25, // 25-40% very poor utilization
      tasksCompleted: Math.floor(Math.random() * 3) + 5, // 5-8
      date: new Date(Date.now() - (i + 4) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  // Create termination record for Jennifer Wilson
  await storage.createTerminatedEmployee({
    employeeId: "emp-006",
    employeeName: "Jennifer Wilson",
    terminationDate: new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terminationReason: "Consistent poor performance and low utilization below company standards",
    terminationLetter: generateTerminationLetter("Jennifer Wilson", "Sales Representative", 41, 32, [
      "Consistently scored below 50% on performance metrics over 8 consecutive periods",
      "Utilization rate consistently below 40%, significantly under company standard of 60%",
      "Failed to meet improvement targets during performance review periods",
      "Unable to complete minimum required tasks per week (5-8 vs required 12+)"
    ]),
    finalScore: 41,
    finalUtilization: 32
  });

  // Create sample PIPs
  const pipStartDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const pipEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  await storage.createPip({
    employeeId: "emp-003",
    startDate: pipStartDate,
    endDate: pipEndDate,
    gracePeriodDays: 21,
    goals: [
      "Achieve 75% average performance score",
      "Complete 12+ tasks per week consistently", 
      "Improve code quality and reduce bugs"
    ],
    coachingPlan: "Weekly 1:1 sessions with technical mentoring and skill development focus",
    initialScore: 58,
    currentScore: 62,
    progress: 35,
    improvementRequired: 15,
    status: "active"
  });

  // Create sample coaching sessions
  await storage.createCoachingSession({
    employeeId: "emp-003",
    pipId: "pip-001",
    type: "automated",
    feedback: "Good progress this week. Focus on completing tasks with higher quality. Consider pair programming for complex features.",
    score: 62,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  await storage.createCoachingSession({
    employeeId: "emp-002",
    type: "automated", 
    feedback: "Excellent improvement in recent weeks. Continue maintaining this performance level.",
    score: 78,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Generate audit logs for sample actions
  await storage.createAuditLog({
    action: "sample_data_generated",
    entityType: "system",
    entityId: "sample",
    details: { employeesCreated: employees.length, metricsGenerated: "72 performance records" }
  });
}

async function clearAllData(storage: any) {
  // Note: This would clear all data - implementation depends on storage interface
  await storage.createAuditLog({
    action: "all_data_cleared",
    entityType: "system", 
    entityId: "system",
    details: { timestamp: new Date().toISOString() }
  });
}

async function evaluateTerminationCandidates() {
  const settings = await storage.getSystemSettings();
  
  if (settings.killSwitchActive) {
    return { message: "Kill switch is active. No automated terminations will be processed." };
  }

  const pips = await storage.getAllPips();
  const results = [];

  for (const pip of pips) {
    if (pip.status !== 'active') continue;

    const endDate = new Date(pip.endDate);
    const now = new Date();
    const isExpired = now > endDate;

    if (isExpired) {
      // Check if improvement requirements were met
      const improvementMet = pip.currentScore && pip.initialScore && 
        ((pip.currentScore - pip.initialScore) / pip.initialScore * 100) >= pip.improvementRequired;

      if (!improvementMet) {
        // Terminate employee
        await storage.updateEmployee(pip.employeeId, { status: "terminated" });
        await storage.updatePip(pip.id, { status: "terminated" });

        await storage.createAuditLog({
          action: "employee_terminated_automatically",
          entityType: "employee",
          entityId: pip.employeeId,
          details: { 
            pipId: pip.id,
            reason: "Failed to meet PIP improvement requirements",
            finalScore: pip.currentScore,
            requiredImprovement: pip.improvementRequired
          }
        });

        results.push({
          action: "terminated",
          employeeId: pip.employeeId,
          pipId: pip.id,
          reason: "Failed to meet PIP requirements"
        });
      } else {
        // PIP completed successfully
        await storage.updateEmployee(pip.employeeId, { status: "active" });
        await storage.updatePip(pip.id, { status: "completed" });

        await storage.createAuditLog({
          action: "pip_completed_successfully",
          entityType: "pip",
          entityId: pip.id,
          details: { 
            employeeId: pip.employeeId,
            finalScore: pip.currentScore,
            improvementAchieved: ((pip.currentScore - pip.initialScore) / pip.initialScore * 100)
          }
        });

        results.push({
          action: "pip_completed",
          employeeId: pip.employeeId,
          pipId: pip.id,
          reason: "Successfully met improvement requirements"
        });
      }
    }
  }

  return { results, processed: pips.length };
}

function generatePipDocument(pip: any, employee: any): string {
  const document = `
PERFORMANCE IMPROVEMENT PLAN (PIP)

Employee Information:
------------------
Name: ${employee.name}
Employee ID: ${employee.id}
Role: ${employee.role || 'N/A'}
Department: ${employee.department || 'N/A'}
Email: ${employee.email || 'N/A'}

PIP Details:
-----------
PIP ID: ${pip.id}
Start Date: ${pip.startDate}
End Date: ${pip.endDate}
Grace Period: ${pip.gracePeriodDays} days
Status: ${pip.status}

Performance Overview:
--------------------
Initial Score: ${pip.initialScore || 'N/A'}%
Current Score: ${pip.currentScore || 'N/A'}%
Required Improvement: ${pip.improvementRequired || 'N/A'}%
Current Progress: ${pip.progress || 0}%

Goals and Objectives:
--------------------
${pip.goals.map((goal: string, index: number) => `${index + 1}. ${goal}`).join('\n')}

Coaching Plan:
--------------
${pip.coachingPlan}

Progress Tracking:
-----------------
- Weekly performance reviews and feedback sessions
- Bi-weekly progress assessments
- Monthly goal evaluation and adjustment
- Regular coaching sessions with designated mentor

Expected Outcomes:
-----------------
By the end of this PIP period, the employee is expected to:
- Achieve a consistent performance score of ${(pip.initialScore || 70) + (pip.improvementRequired || 15)}% or higher
- Demonstrate sustained improvement in key performance areas
- Successfully complete all assigned goals and objectives
- Show commitment to ongoing professional development

Next Steps:
-----------
1. Employee acknowledgment and signature required
2. Schedule initial coaching session within 48 hours
3. Set up weekly check-in meetings
4. Begin performance monitoring and documentation
5. Provide necessary resources and training

Important Notes:
---------------
- This PIP is designed to support employee success and improvement
- Failure to meet the requirements may result in further disciplinary action
- All progress will be documented and reviewed regularly
- Employee support resources are available throughout the process

Generated on: ${new Date().toLocaleString()}
System: AI Talent PIP & Auto-Firing System

---
This document serves as an official Performance Improvement Plan.
Please review carefully and discuss any questions with your supervisor.
`;

  return document.trim();
}
