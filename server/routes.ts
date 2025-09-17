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
import * as fs from 'fs';
import * as path from 'path';
import { 
  generateTerminationPDF, 
  generateCoachingPDF, 
  generatePIPPDF,
  generateBulkPerformanceReportPDF 
} from "./pdfGenerator";
import { requireRole, requireNotDryRun } from "./auth";
import { assertTransition } from "./fsm";
import { weeklyFairnessReport } from "./reports";

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

  app.post("/api/employees", requireRole("manager"), async (req, res) => {
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

  app.post("/api/performance-metrics", requireRole("manager"), async (req, res) => {
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
  app.post("/api/upload-csv", requireRole("manager"), async (req, res) => {
    try {
      const validatedData = csvUploadSchema.parse(req.body);
      
      const metrics = validatedData.data.map(row => ({
        employeeId: row.employee_id,
        period: row.period,
        score: row.score,
        utilization: row.utilization,
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
        const pipsWithNames = await Promise.all(pips.map(async (pip: any) => {
          const employee = await storage.getEmployee(pip.employeeId);
          return {
            ...pip,
            employeeName: employee?.name || `Employee ${pip.employeeId}`
          };
        }));
        res.json(pipsWithNames);
      } else if (active === "true") {
        const pips = await storage.getAllActivePips();
        const pipsWithNames = await Promise.all(pips.map(async (pip: any) => {
          const employee = await storage.getEmployee(pip.employeeId);
          return {
            ...pip,
            employeeName: employee?.name || `Employee ${pip.employeeId}`
          };
        }));
        res.json(pipsWithNames);
      } else {
        const pips = await storage.getAllActivePips();
        const pipsWithNames = await Promise.all(pips.map(async (pip: any) => {
          const employee = await storage.getEmployee(pip.employeeId);
          return {
            ...pip,
            employeeName: employee?.name || `Employee ${pip.employeeId}`
          };
        }));
        res.json(pipsWithNames);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch PIPs" });
    }
  });

  app.post("/api/pips", requireRole("manager"), async (req, res) => {
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

  app.put("/api/pips/:id", requireRole("manager"), async (req, res) => {
    try {
      const current = await storage.getPipById(req.params.id);
      if (!current) {
        return res.status(404).json({ error: "PIP not found" });
      }

      // Enforce FSM on status changes
      if (typeof req.body?.status === "string") {
        try {
          assertTransition((current.status as any) || "active", req.body.status);
        } catch (e: any) {
          return res.status(e.status || 409).json({ error: "illegal_transition", message: e.message });
        }
      }

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
  app.post("/api/evaluate-pips", requireRole("manager"), async (req, res) => {
    try {
      const results = await evaluatePIPCandidates();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to evaluate PIP candidates" });
    }
  });

  // Generate coaching endpoint
  app.post("/api/generate-coaching", requireRole("manager"), async (req, res) => {
    try {
      const { employeeId, score, pipId } = req.body;
      
      if (!employeeId || typeof score !== "number") {
        return res.status(400).json({ error: "employeeId and score are required" });
      }
      
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      // Check if employee is terminated
      const terminatedEmployees = await storage.getTerminatedEmployees();
      const isTerminated = terminatedEmployees.some((emp: any) => emp.employeeId === employeeId);
      
      
      if (isTerminated) {
        return res.status(400).json({ 
          error: "Cannot generate coaching for terminated employee", 
          message: `${employee.name} has been terminated and is no longer eligible for coaching sessions.` 
        });
      }
      
      // Check if employee is on PIP
      const activePips = await storage.getAllPips();
      const employeePip = activePips.find((pip: any) => pip.employeeId === employeeId && pip.status === 'active');
      
      // Get recent performance metrics for context
      const performanceMetrics = await storage.getPerformanceMetrics(employeeId);
      const recentMetrics = performanceMetrics?.slice(0, 3) || [];
      
      const feedback = generateCoachingFeedback(
        score, 
        employee.name, 
        employee.role || "Employee", 
        {
          ...employee,
          isOnPip: !!employeePip,
          pipDetails: employeePip,
          recentPerformance: recentMetrics,
          status: employee.status
        }
      );
      
      // Generate PDF for coaching session
      if (employee) {
        const pdf = await generateCoachingPDF(
          employee.name,
          employeeId,
          new Date().toISOString().split('T')[0],
          score,
          feedback,
          "automated",
          pipId
        );
      }
      
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

  // Debug endpoint to check specific employees
  app.get("/api/debug/employees/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const employee = await storage.getEmployee(employeeId);
      const metrics = await storage.getAllPerformanceMetrics();
      const settings = await storage.getSystemSettings();
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      const employeeMetrics = metrics
        .filter(m => m.employeeId === employeeId)
        .sort((a, b) => b.period - a.period)
        .slice(0, settings.consecutiveLowPeriods);
      
      const allLowPerformance = employeeMetrics.every(m => 
        m.score < settings.minScoreThreshold || 
        m.utilization < settings.minUtilizationThreshold
      );
      
      res.json({
        employee,
        recentMetrics: employeeMetrics,
        settings: {
          minScoreThreshold: settings.minScoreThreshold,
          minUtilizationThreshold: settings.minUtilizationThreshold,
          consecutiveLowPeriods: settings.consecutiveLowPeriods
        },
        evaluation: {
          hasEnoughMetrics: employeeMetrics.length >= settings.consecutiveLowPeriods,
          allLowPerformance,
          shouldTerminate: employeeMetrics.length >= settings.consecutiveLowPeriods && allLowPerformance,
          individualChecks: employeeMetrics.map(m => ({
            period: m.period,
            score: m.score,
            utilization: m.utilization,
            scoreBelowThreshold: m.score < settings.minScoreThreshold,
            utilizationBelowThreshold: m.utilization < settings.minUtilizationThreshold,
            meetsTerminationCriteria: m.score < settings.minScoreThreshold || m.utilization < settings.minUtilizationThreshold
          }))
        }
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ error: 'Debug endpoint failed' });
    }
  });

  // Advanced Appeals with Evidence endpoint
  app.post("/api/appeals/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { evidenceScore, evidenceDescription } = req.body;
      
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      const metrics = await storage.getPerformanceMetrics(employeeId);
      const variance = calculateVariance(metrics.map((m: any) => m.score));
      
      // Post-mortem analysis
      const postMortem = {
        variance,
        biasDetected: variance > 20,
        evidenceScore: evidenceScore || 0,
        evidenceDescription: evidenceDescription || ""
      };
      
      if (evidenceScore && evidenceScore > 10) {
        // Appeal approved
        const activePips = await storage.getPipsByEmployee(employeeId);
        if (activePips.length > 0) {
          const pip = activePips[0];
          await storage.updatePip(pip.id, { 
            status: "extended",
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
        }
        
        await storage.createAuditLog({
          action: "appeal_approved",
          entityType: "employee",
          entityId: employeeId,
          details: { postMortem, reason: "Evidence provided justifies extension" }
        });
        
        res.json({
          status: "approved",
          message: "Appeal approved. PIP extended based on evidence.",
          postMortem
        });
      } else {
        // Appeal denied
        await storage.createAuditLog({
          action: "appeal_denied",
          entityType: "employee",
          entityId: employeeId,
          details: { postMortem, reason: "Insufficient evidence" }
        });
        
        res.json({
          status: "denied",
          message: "Appeal denied. Insufficient evidence provided.",
          postMortem
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to process appeal" });
    }
  });

  // Bias Mitigation endpoint
  app.get("/api/bias-check", async (req, res) => {
    try {
      const { companyId } = req.query;
      const employees = await storage.getAllEmployees();
      const biasResults = [];
      
      for (const employee of employees) {
        if (companyId && employee.companyId !== companyId) continue;
        
        const metrics = await storage.getPerformanceMetrics(employee.id);
        if (metrics.length === 0) continue;
        
        const scores = metrics.map((m: any) => m.score);
        const variance = calculateVariance(scores);
        
        if (variance > 20) {
          biasResults.push({
            employeeId: employee.id,
            employeeName: employee.name,
            companyId: employee.companyId,
            variance,
            biasFlag: true,
            recommendation: "Review for fairness - high variance detected"
          });
        }
      }
      
      res.json({
        biasDetected: biasResults.length > 0,
        flaggedEmployees: biasResults,
        totalChecked: employees.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to perform bias check" });
    }
  });

  // ROI Visualization endpoint
  app.get("/api/roi-visualization", async (req, res) => {
    try {
      const { companyId } = req.query;
      const employees = await storage.getAllEmployees();
      const activePips = await storage.getAllActivePips();
      
      let filteredEmployees = employees;
      if (companyId) {
        filteredEmployees = employees.filter((e: any) => e.companyId === companyId);
      }
      
      // Calculate ROI based on improvements and savings
      const baseSavingsPerEmployee = 250; // Base savings per improved employee
      const hourlyRate = 50; // Average hourly rate
      const hoursRecovered = activePips.length * 10; // Hours recovered per PIP
      
      const totalROI = filteredEmployees.length * baseSavingsPerEmployee + (hoursRecovered * hourlyRate);
      const roiBenchmark = 9000; // 9000% benchmark from resume
      const currentROIPercent = (totalROI / 1000) * 100; // Assuming 1000 base investment
      
      // Generate text-based visualization
      const barLength = Math.min(50, Math.floor(currentROIPercent / 100));
      const roiBar = '#'.repeat(barLength);
      
      res.json({
        totalROI,
        roiPercent: currentROIPercent,
        benchmark: roiBenchmark,
        visualization: `ROI Progress: [${roiBar}${'·'.repeat(Math.max(0, 50 - barLength))}] ${currentROIPercent.toFixed(1)}%`,
        details: {
          employeesImproved: filteredEmployees.length,
          savingsPerEmployee: baseSavingsPerEmployee,
          hoursRecovered,
          hourlyRate,
          companyId: companyId || "all"
        },
        benchmarkComparison: `Current: ${currentROIPercent.toFixed(1)}% | Resume Benchmark: ${roiBenchmark}%`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate ROI visualization" });
    }
  });

  // Synthetic Testing endpoint
  app.post("/api/synthetic-test", async (req, res) => {
    try {
      const { numTests = 5 } = req.body;
      const testResults = [];
      const startTime = Date.now();
      
      for (let i = 0; i < numTests; i++) {
        // Simulate test scenario with low scores
        const testEmployees = await storage.getAllEmployees();
        const testMetrics = [];
        
        for (const emp of testEmployees.slice(0, 5)) { // Test on subset
          testMetrics.push({
            employeeId: emp.id,
            score: Math.floor(Math.random() * 30) + 40, // Low scores 40-70
            passed: false
          });
        }
        
        const failureRate = testMetrics.filter((m: any) => m.score < 70).length / testMetrics.length;
        testResults.push({
          testId: i + 1,
          failureRate,
          passed: failureRate < 0.5
        });
      }
      
      const mttr = (Date.now() - startTime) / 1000; // Mean time to recovery in seconds
      const passRate = testResults.filter((t: any) => t.passed).length / numTests;
      
      res.json({
        numTests,
        testResults,
        mttr,
        passRate: passRate * 100,
        status: mttr < 60 ? "PASS" : "FAIL",
        message: `Synthetic tests completed. MTTR: ${mttr.toFixed(2)}s, Pass rate: ${(passRate * 100).toFixed(1)}%`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to run synthetic tests" });
    }
  });

  // Ticket Triage Agents endpoint
  app.post("/api/triage-agents", async (req, res) => {
    try {
      const { suppressionThreshold = 0.5 } = req.body;
      const employees = await storage.getAllEmployees();
      const triageResults = [];
      let suppressedCount = 0;
      
      for (const employee of employees) {
        const metrics = await storage.getPerformanceMetrics(employee.id);
        if (metrics.length < 3) continue;
        
        // Calculate rolling variance (noise score)
        const recentScores = metrics.slice(-3).map((m: any) => m.score);
        const noiseScore = calculateVariance(recentScores);
        
        if (noiseScore < suppressionThreshold) {
          suppressedCount++;
          triageResults.push({
            employeeId: employee.id,
            action: "suppressed",
            noiseScore,
            reason: "Low variance indicates noise, not actual performance issue"
          });
        } else {
          triageResults.push({
            employeeId: employee.id,
            action: "flagged",
            noiseScore,
            reason: "High variance indicates genuine performance concern"
          });
        }
      }
      
      await storage.createAuditLog({
        action: "triage_agents_run",
        entityType: "system",
        entityId: "triage",
        details: { suppressedCount, total: triageResults.length }
      });
      
      res.json({
        suppressedCount,
        totalProcessed: triageResults.length,
        suppressionRate: (suppressedCount / triageResults.length * 100).toFixed(1),
        results: triageResults
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to run triage agents" });
    }
  });

  // Dynamic Communication Templates endpoint
  app.post("/api/generate-template", async (req, res) => {
    try {
      const { action, employeeId, details } = req.body;
      
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      
      let template = "";
      const auditData = {
        timestamp: new Date().toISOString(),
        employeeId,
        action,
        details
      };
      
      if (action === "PIP") {
        template = `Dear ${employee.name},\n\nYour Performance Improvement Plan starts ${details.startDate || 'immediately'}.\n\nGoals:\n${details.goals ? details.goals.join('\n') : 'To be defined'}\n\nCoaching Schedule: ${details.coachingSchedule || 'Weekly sessions'}\n\nAudit Log: ${JSON.stringify(auditData)}\n\nPlease acknowledge receipt of this notice.`;
      } else if (action === "Termination") {
        template = `Dear ${employee.name},\n\nTermination effective ${details.date || 'immediately'}.\n\nReason: ${details.reason || 'Performance below standards'}\n\nFinal Score: ${details.finalScore || 'N/A'}%\nFinal Utilization: ${details.finalUtilization || 'N/A'}%\n\nEvidence/Audit: ${JSON.stringify(auditData)}\n\nPlease return all company property.`;
      } else if (action === "Coaching") {
        template = `Dear ${employee.name},\n\nCoaching Session Scheduled\n\nDate: ${details.date || 'TBD'}\nFocus Areas: ${details.focusAreas || 'Performance improvement'}\nCurrent Score: ${details.score || 'N/A'}%\n\nAudit Trail: ${JSON.stringify(auditData)}`;
      }
      
      // Save template
      const templatePath = path.join(process.cwd(), `${action}_${employeeId}_template.json`);
      fs.writeFileSync(templatePath, JSON.stringify({ template, audit: auditData }, null, 2));
      
      await storage.createAuditLog({
        action: "template_generated",
        entityType: "template",
        entityId: employeeId,
        details: { action, templatePath }
      });
      
      res.json({
        template,
        audit: auditData,
        saved: templatePath
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // CI/CD Hooks Simulation endpoint  
  app.post("/api/cicd-simulation", async (req, res) => {
    try {
      const { turnaroundHours = 72, deploymentType = "threshold_update" } = req.body;
      const startTime = new Date();
      
      // Simulate deployment stages
      const stages = [
        { name: "Build", duration: turnaroundHours * 0.1 },
        { name: "Test", duration: turnaroundHours * 0.3 },
        { name: "Deploy", duration: turnaroundHours * 0.2 },
        { name: "Verify", duration: turnaroundHours * 0.4 }
      ];
      
      const deploymentLog = {
        deploymentId: `deploy-${Date.now()}`,
        type: deploymentType,
        startTime: startTime.toISOString(),
        endTime: new Date(startTime.getTime() + turnaroundHours * 60 * 60 * 1000).toISOString(),
        turnaroundHours,
        stages,
        status: "Success",
        changes: {
          before: { minScoreThreshold: 70 },
          after: { minScoreThreshold: 75 }
        }
      };
      
      await storage.createAuditLog({
        action: "cicd_simulation_run",
        entityType: "deployment",
        entityId: deploymentLog.deploymentId,
        details: deploymentLog
      });
      
      res.json({
        message: `CI/CD Simulation Complete: Turnaround ${turnaroundHours} hours`,
        deployment: deploymentLog,
        velocityMetrics: {
          deploymentFrequency: "High",
          leadTime: `${turnaroundHours} hours`,
          mttr: "< 1 hour",
          changeFailureRate: "5%"
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to run CI/CD simulation" });
    }
  });

  // Multi-Company Portfolio endpoint
  app.get("/api/portfolio/:companyId", async (req, res) => {
    try {
      const { companyId } = req.params;
      const employees = await storage.getAllEmployees();
      const companyEmployees = employees.filter((e: any) => e.companyId === companyId);
      
      const metrics = [];
      for (const emp of companyEmployees) {
        const empMetrics = await storage.getPerformanceMetrics(emp.id);
        metrics.push({
          employee: emp,
          metrics: empMetrics
        });
      }
      
      res.json({
        companyId,
        employeeCount: companyEmployees.length,
        employees: companyEmployees,
        performanceData: metrics
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio data" });
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
        ['pip_created', 'coaching_session_created', 'employee_auto_terminated', 'pip_created_automatically', 'coaching_generated'].includes(log.action)
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

  // Fairness weekly report
  app.get("/api/reports/fairness/weekly", weeklyFairnessReport);

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

  // Termination PDF download endpoint
  app.get("/api/employees/:employeeId/termination-pdf", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const terminatedEmployees = await storage.getTerminatedEmployees();
      const terminatedEmployee = terminatedEmployees.find((emp: any) => emp.employeeId === employeeId);
      
      if (!terminatedEmployee) {
        return res.status(404).json({ error: "Terminated employee not found" });
      }

      // Get the employee details for PDF generation
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee details not found" });
      }

      // Extract termination details from the termination letter
      const terminationReasons = [
        `Final Performance Score: ${terminatedEmployee.finalScore}%`,
        `Final Utilization Rate: ${terminatedEmployee.finalUtilization}%`,
        terminatedEmployee.terminationReason,
        "Failed to meet minimum performance standards despite coaching opportunities",
        "Consistently scored below company thresholds for consecutive evaluation periods"
      ];

      // Generate PDF on demand
      const pdf = await generateTerminationPDF(
        terminatedEmployee.employeeName,
        employeeId,
        employee.role || "Employee",
        terminatedEmployee.finalScore || 0,
        terminatedEmployee.finalUtilization || 0,
        terminationReasons,
        terminatedEmployee.terminationDate
      );

      const pdfBuffer = fs.readFileSync(pdf.filePath);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${terminatedEmployee.employeeName.replace(/\s+/g, '_')}_Termination_Letter.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating termination PDF:', error);
      res.status(500).json({ error: "Failed to generate termination PDF" });
    }
  });

  // Auto-firing demonstration endpoint
  app.post("/api/auto-fire/demo", requireRole("manager", "hr"), requireNotDryRun, async (req, res) => {
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
      const debugInfo = [];

      // Find employees with consistently poor performance OR utilization
      console.log(`Evaluating ${employees.length} employees with thresholds: score < ${settings.minScoreThreshold}%, utilization < ${settings.minUtilizationThreshold}%`);
      console.log(`Requiring ${settings.consecutiveLowPeriods} consecutive low periods`);
      
      for (const employee of employees) {
        if (employee.status !== 'active' && employee.status !== 'pip') {
          console.log(`Skipping ${employee.name} (${employee.id}) - status: ${employee.status}`);
          continue;
        }

        // Special focus on our problem employees for debugging
        const isTestEmployee = ['emp-003', 'emp-005', 'emp-007'].includes(employee.id);
        if (isTestEmployee) {
          console.log(`\n=== DEBUGGING ${employee.name} (${employee.id}) ===`);
          console.log(`Status: ${employee.status}`);
        }

        const employeeMetrics = metrics
          .filter(m => m.employeeId === employee.id)
          .sort((a, b) => b.period - a.period)
          .slice(0, settings.consecutiveLowPeriods);

        if (isTestEmployee || employeeMetrics.length >= settings.consecutiveLowPeriods) {
          console.log(`Employee ${employee.name} (${employee.id}) has ${employeeMetrics.length} recent metrics`);
        }

        if (employeeMetrics.length >= settings.consecutiveLowPeriods) {
          const allLowPerformance = employeeMetrics.every(m => 
            m.score < settings.minScoreThreshold || 
            m.utilization < settings.minUtilizationThreshold
          );
          
          // Debug logging for test employees or employees with some low metrics
          if (isTestEmployee || employeeMetrics.some(m => m.score < settings.minScoreThreshold || m.utilization < settings.minUtilizationThreshold)) {
            console.log(`${employee.name} (${employee.id}) recent metrics:`, employeeMetrics.map(m => `Score: ${m.score}%, Util: ${m.utilization}%`));
            console.log(`  - Threshold check: score < ${settings.minScoreThreshold}% OR utilization < ${settings.minUtilizationThreshold}%`);
            console.log(`  - Individual checks:`, employeeMetrics.map(m => `(Score ${m.score} < 70: ${m.score < 70}) OR (Util ${m.utilization} < 60: ${m.utilization < 60})`));
            console.log(`  - All periods low: ${allLowPerformance}`);
            
            debugInfo.push({
              employee: employee.name,
              id: employee.id,
              status: employee.status,
              metrics: employeeMetrics.map(m => `Score: ${m.score}%, Util: ${m.utilization}%`),
              allLowPerformance,
              shouldTerminate: allLowPerformance
            });
          }

          if (allLowPerformance) {
            const latestMetric = employeeMetrics[0];
            const reasons = [
              `Consistently scored below ${settings.minScoreThreshold}% for ${settings.consecutiveLowPeriods} consecutive periods`,
              `Utilization consistently below ${settings.minUtilizationThreshold}% vs company standard`,
              "Failed to meet minimum performance standards despite coaching opportunities",
              `Average score: ${Math.round(employeeMetrics.reduce((sum, m) => sum + m.score, 0) / employeeMetrics.length)}%`,
              `Average utilization: ${Math.round(employeeMetrics.reduce((sum, m) => sum + m.utilization, 0) / employeeMetrics.length)}%`
            ];

            // Generate PDF for termination
            const pdf = await generateTerminationPDF(
              employee.name,
              employee.id,
              employee.role || "Employee",
              latestMetric.score,
              latestMetric.utilization,
              reasons,
              new Date().toISOString().split('T')[0]
            );

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
              reason: "Consecutive poor performance and low utilization",
              terminationLetter: generateTerminationLetter(
                employee.name,
                employee.role || "Employee",
                latestMetric.score,
                latestMetric.utilization,
                reasons
              )
            });
          }
        }
      }

      res.json({
        message: terminated.length > 0 
          ? `Auto-firing completed. ${terminated.length} employee(s) terminated.`
          : "No employees met termination criteria.",
        terminated,
        debugInfo: debugInfo.slice(0, 10) // Include debug info for troubleshooting
      });
    } catch (error) {
      console.error('Error in auto-firing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/sample-data/generate', async (req, res) => {
    try {
      const results = await generateSampleData(storage);
      
      // Automatically trigger PIP evaluation after sample data
      console.log('Running automatic PIP evaluation...');
      const pipResults = await evaluatePIPCandidates();
      
      // Automatically run bias check
      console.log('Running automatic bias check...');
      const employees = await storage.getAllEmployees();
      const biasResults = [];
      for (const employee of employees) {
        const metrics = await storage.getPerformanceMetrics(employee.id);
        if (metrics.length > 0) {
          const variance = calculateVariance(metrics.map((m: any) => m.score));
          if (variance > 20) {
            biasResults.push({
              employeeId: employee.id,
              variance
            });
          }
        }
      }
      
      // Generate performance report PDF
      const allMetrics = await storage.getAllPerformanceMetrics();
      const pips = await storage.getAllPips();
      const improvementRate = results.improvementRate || 0;
      const report = await generateBulkPerformanceReportPDF(
        employees,
        allMetrics,
        pips,
        improvementRate
      );
      
      res.json({ 
        success: true, 
        message: 'Sample data generated with auto-actions triggered',
        results: {
          ...results,
          pipEvaluation: pipResults,
          biasDetected: biasResults.length,
          performanceReportPDF: report.filePath,
          performanceReport: { url: report.url, sha256: report.sha256 }
        }
      });
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
  app.post('/api/evaluate-terminations', requireRole("manager", "hr"), requireNotDryRun, async (req, res) => {
    try {
      // Legal/HR gate
      const { legal_signoff, hr_signoff, risk_flags = [] } = req.body || {};
      const blockFlags = new Set(["protected_class", "ongoing_leave", "whistleblower"]);
      const hasRisk = Array.isArray(risk_flags) && (risk_flags as string[]).some((f) => blockFlags.has(f));

      if (!legal_signoff || !hr_signoff) {
        return res.status(409).json({ error: "missing_signoff" });
      }
      if (hasRisk) {
        return res.status(409).json({ error: "risk_requires_hold", risk_flags });
      }

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

      // Generate PDF document
      const pdf = await generatePIPPDF(pip, employee);
      const filename = path.basename(pdf.filePath);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(pdf.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error generating PIP document:', error);
      res.status(500).json({ error: 'Failed to generate PIP document' });
    }
  });

  // PDF download endpoints
  app.get('/api/download-pdf/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const pdfPath = path.join(process.cwd(), 'generated_pdfs', filename);
      
      if (!fs.existsSync(pdfPath)) {
        return res.status(404).json({ error: 'PDF not found' });
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      res.status(500).json({ error: 'Failed to download PDF' });
    }
  });

  // List available PDFs
  app.get('/api/list-pdfs', async (req, res) => {
    try {
      const pdfDir = path.join(process.cwd(), 'generated_pdfs');
      if (!fs.existsSync(pdfDir)) {
        return res.json({ pdfs: [] });
      }
      
      const files = fs.readdirSync(pdfDir)
        .filter(file => file.endsWith('.pdf'))
        .map(file => {
          const stats = fs.statSync(path.join(pdfDir, file));
          return {
            filename: file,
            created: stats.birthtime,
            size: stats.size
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());
      
      res.json({ pdfs: files });
    } catch (error) {
      console.error('Error listing PDFs:', error);
      res.status(500).json({ error: 'Failed to list PDFs' });
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

function generateCoachingFeedback(score: number, employeeName?: string, role?: string, employee?: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const name = employeeName || '[Employee Name]';
  const position = role || '[Position]';
  
  // Extract personalized context from employee data
  const backstory = employee?.backstory || '';
  const recentHistory = employee?.recentHistory || [];
  const isOnPip = employee?.isOnPip || false;
  const pipDetails = employee?.pipDetails;
  const recentPerformance = employee?.recentPerformance || [];
  const status = employee?.status || 'active';
  
  // Generate status-specific context
  let statusContext = '';
  if (isOnPip && pipDetails) {
    statusContext = `

📋 PIP STATUS UPDATE:
You are currently enrolled in a Performance Improvement Plan (started ${pipDetails.startDate}). This coaching session is part of your structured development program to help you achieve the goals outlined in your PIP.

PIP Goals:
${pipDetails.goals?.map((goal: string, index: number) => `${index + 1}. ${goal}`).join('\n') || '• Improve overall performance metrics'}

Current PIP Progress: ${pipDetails.progress || 0}% complete
`;
  }
  
  // Generate performance trend analysis
  let performanceTrend = '';
  if (recentPerformance.length >= 2) {
    const currentScore = recentPerformance[0]?.score || score;
    const previousScore = recentPerformance[1]?.score || score;
    const trend = currentScore > previousScore ? 'improving' : currentScore < previousScore ? 'declining' : 'stable';
    
    performanceTrend = `

📊 PERFORMANCE TREND ANALYSIS:
Recent Score History: ${recentPerformance.slice(0, 3).map(m => `${m.score}%`).join(' → ')}
Current Trend: ${trend.toUpperCase()}
${trend === 'improving' ? '✅ Positive momentum - keep building on this progress!' : 
  trend === 'declining' ? '⚠️ Recent decline requires immediate attention and support' : 
  '➡️ Consistent performance - focus on breakthrough improvements'}
`;
  }
  
  // Generate contextual insights based on backstory
  let contextualInsights = '';
  let personalizedRecommendations = '';
  let historicalReference = '';
  
  if (recentHistory.length > 0) {
    historicalReference = `

CONTEXT & RECENT DEVELOPMENTS:
Based on your recent work history, I want to acknowledge:
${recentHistory.slice(0, 3).map((item, index) => `• ${item}`).join('\n')}
`;
  }
  
  if (backstory) {
    if (employee?.name === 'Marcus Johnson') {
      contextualInsights = `
PERSONALIZED ASSESSMENT:
Given your background in transitioning from manual to automated testing, I understand the technical challenges you've been facing. Your dedication is evident through the extra hours you've been putting in, which shows commitment to improvement.`;
      
      personalizedRecommendations = `
• Consider enrolling in intermediate automation testing courses to bridge the knowledge gap
• Pair with a senior automation engineer for 1-2 hours daily for the next two weeks
• Focus on mastering one testing framework at a time rather than trying to learn everything
• Use test case templates to improve consistency in your work
• Don't hesitate to ask questions - your willingness to learn is an asset`;
    
    } else if (employee?.name === 'David Kim') {
      contextualInsights = `
PERSONALIZED ASSESSMENT:
I recognize that you were previously a high-performing analyst whose work influenced major strategic decisions. The recent decline in performance appears to be situational rather than a reflection of your capabilities.`;
      
      personalizedRecommendations = `
• Let's discuss workload adjustments to help you regain focus
• Consider utilizing our Employee Assistance Program for additional support
• Work with your manager to prioritize critical tasks during this challenging period
• Implement structured daily planning to maximize your productive hours
• Remember that asking for help or extensions shows professional maturity`;
    
    } else if (employee?.name === 'Emily Rodriguez') {
      contextualInsights = `
PERSONALIZED ASSESSMENT:
Your creative talents are exceptional, as evidenced by your award-winning campaign work. The challenge appears to be balancing your perfectionist tendencies with consistent delivery timelines.`;
      
      personalizedRecommendations = `
• Implement time-boxed creative sessions to prevent over-polishing
• Break large projects into smaller milestone deliverables  
• Use project management tools to track time allocation across tasks
• Establish "good enough" criteria for routine vs. high-impact projects
• Leverage your collaborative skills shown in design thinking workshops`;
    
    } else if (employee?.name === 'Robert Thompson') {
      contextualInsights = `
PERSONALIZED ASSESSMENT:
I understand you joined with enthusiasm and have been working to adapt to our support systems. Customer service requires balancing speed with quality resolution, which can be challenging to master.`;
      
      personalizedRecommendations = `
• Shadow a top-performing support representative for a full day
• Create personal templates for common customer issues to improve response time
• Practice using our CRM system in a test environment during downtime
• Focus on one improvement area at a time (e.g., response time OR resolution quality)
• Attend weekly team knowledge-sharing sessions to learn best practices`;
    }
  }
  
  if (score < 60) {
    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    COACHING & DEVELOPMENT COMMUNICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${currentDate}
Employee: ${name}
Position: ${position}
Current Performance Score: ${score}%

Dear ${name},${statusContext}${performanceTrend}${historicalReference}${contextualInsights}

CURRENT PERFORMANCE ASSESSMENT:
Your recent performance score of ${score}% indicates areas requiring immediate attention and focused development. This coaching communication outlines specific steps to help you succeed in your role.

┌─ KEY AREAS FOR IMPROVEMENT ─────────────────────────────────┐

1. 📚 FUNDAMENTAL SKILLS DEVELOPMENT
   • Review core competencies required for your position
   • Complete relevant training modules within the next 2 weeks
   • Schedule 1:1 meetings with your supervisor twice weekly
   • Document questions and challenges for discussion

2. ✅ TASK MANAGEMENT & QUALITY
   • Carefully review all task requirements before beginning work
   • Use checklists to ensure completeness
   • Seek clarification immediately when uncertain
   • Submit work for review before final completion

3. 🤝 COMMUNICATION & COLLABORATION
   • Proactively communicate progress and obstacles
   • Participate actively in team meetings
   • Ask for help when needed - this shows initiative, not weakness
   • Provide regular status updates on ongoing projects

└──────────────────────────────────────────────────────────────┘

PERSONALIZED RECOMMENDATIONS:${personalizedRecommendations}

┌─ IMMEDIATE ACTION PLAN (Next 30 Days) ──────────────────────┐
□ Complete skills assessment with your manager
□ Enroll in relevant training programs  
□ Establish daily check-in routine
□ Set up weekly progress review meetings
□ Create personal improvement tracking system
└──────────────────────────────────────────────────────────────┘

RESOURCES AVAILABLE:
🎓 Online training library access
👥 Mentoring program enrollment
💡 Department expertise sharing sessions
💰 Professional development budget allocation

SUCCESS METRICS:
📊 Weekly performance score tracking
🎯 Task completion quality assessments
👂 Peer feedback collections
📝 Self-assessment evaluations

NEXT STEPS:
1. Schedule a follow-up meeting within 48 hours
2. Begin implementing the action plan immediately
3. Weekly progress reviews for the next month
4. Comprehensive reassessment in 30 days

Your development is important to us, and we are committed to providing the support you need to succeed. Please don't hesitate to reach out with questions or concerns.

Best regards,
AI Coaching & Development System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  } else if (score < 70) {
    return `
COACHING & DEVELOPMENT COMMUNICATION
${currentDate}

Dear ${name},${statusContext}${performanceTrend}${historicalReference}${contextualInsights}

Thank you for your continued efforts in your role as ${position}. Your current performance score of ${score}% shows progress, though there are opportunities for further improvement.

PERFORMANCE OVERVIEW:
You're demonstrating good foundational skills and showing positive momentum. With focused effort in key areas, you can reach the next performance level.

AREAS OF STRENGTH:
✓ Showing consistent effort and engagement
✓ Demonstrating basic competency in core tasks
✓ Responsive to feedback and coaching
✓ Maintains professional attitude and reliability

GROWTH OPPORTUNITIES:

1. QUALITY & ATTENTION TO DETAIL
   • Implement self-review processes before task submission
   • Use quality checklists and validation steps
   • Allocate additional time for thorough work completion
   • Seek peer review on important deliverables

2. TIME MANAGEMENT & EFFICIENCY
   • Develop better project planning and prioritization skills
   • Break complex tasks into manageable components
   • Set realistic deadlines with buffer time
   • Track time usage to identify improvement areas

3. PROFESSIONAL DEVELOPMENT
   • Identify 2-3 specific skills to develop this quarter
   • Attend relevant workshops or training sessions
   • Read industry-related materials regularly
   • Network with colleagues in similar roles

DEVELOPMENT PLAN (Next 60 Days):
□ Complete time management training module
□ Establish quality review routine
□ Set monthly skill development goals
□ Schedule bi-weekly coaching sessions
□ Join relevant professional development activities

SUPPORT SYSTEM:
• Regular check-ins with your supervisor
• Access to internal training resources
• Peer mentoring opportunities
• Professional development stipend available

MEASUREMENT & TRACKING:
- Bi-weekly performance assessments
- Quality metrics tracking
- Time management efficiency reports
- Goal achievement progress reviews

Your improvement trajectory is encouraging, and with continued focus, you're positioned to achieve higher performance levels. Keep up the good work and maintain your positive momentum.

Best regards,
AI Coaching & Development System
Automated Performance Management
`;
  } else if (score < 80) {
    return `
COACHING & DEVELOPMENT COMMUNICATION
${currentDate}

Dear ${name},${statusContext}${performanceTrend}${historicalReference}${contextualInsights}

Congratulations on maintaining solid performance in your role as ${position}. Your current score of ${score}% reflects competent execution of your responsibilities with room for excellence.

PERFORMANCE HIGHLIGHTS:
You consistently meet expectations and demonstrate reliability in your work. Your professional approach and steady performance are valued by the team.

CURRENT STRENGTHS:
✓ Consistent delivery of quality work
✓ Reliable task completion within deadlines
✓ Professional collaboration with team members
✓ Responsive to feedback and direction
✓ Strong foundational skills in core areas

ENHANCEMENT OPPORTUNITIES:

1. CONSISTENCY & RELIABILITY
   • Strive for consistent high-quality output across all tasks
   • Develop standardized personal processes
   • Create templates and checklists for routine work
   • Monitor performance metrics more closely

2. PROACTIVE CONTRIBUTION
   • Take initiative on process improvements
   • Volunteer for challenging assignments
   • Share knowledge and expertise with colleagues
   • Contribute ideas during team meetings and planning sessions

3. SKILL ADVANCEMENT
   • Identify emerging trends in your field
   • Develop expertise in new tools or methodologies
   • Cross-train in adjacent skill areas
   • Seek stretch assignments that challenge your abilities

ADVANCEMENT PLAN (Next 90 Days):
□ Set specific excellence targets for key performance areas
□ Identify and pursue one advanced skill development opportunity
□ Take on a leadership role in a team project
□ Create and implement one process improvement
□ Establish mentoring relationship (as mentor or mentee)

GROWTH RESOURCES:
• Advanced training program access
• Conference and workshop attendance
• Cross-functional project opportunities
• Leadership development programs
• External certification support

SUCCESS METRICS:
- Monthly performance trend analysis
- Project leadership effectiveness
- Peer feedback and collaboration scores
- Innovation and improvement contributions
- Advanced skill acquisition progress

You're well-positioned for advancement and increased responsibility. Continue building on your solid foundation while pushing toward excellence in all areas.

Best regards,
AI Coaching & Development System
Automated Performance Management
`;
  } else {
    return `
RECOGNITION & DEVELOPMENT COMMUNICATION
${currentDate}

Dear ${name},${statusContext}${performanceTrend}${historicalReference}${contextualInsights}

Outstanding work! Your exceptional performance as ${position} with a score of ${score}% demonstrates your commitment to excellence and significant value to our organization.

PERFORMANCE RECOGNITION:
Your consistent high-quality work, leadership qualities, and positive impact on team dynamics make you a standout performer. Your contributions are recognized and appreciated.

EXCEPTIONAL STRENGTHS:
⭐ Consistently exceeds performance expectations
⭐ Demonstrates leadership and mentoring capabilities
⭐ Innovative problem-solving and process improvement
⭐ Exceptional collaboration and team contribution
⭐ High-quality deliverables with minimal supervision
⭐ Proactive communication and professional growth

LEADERSHIP & MENTORING OPPORTUNITIES:

1. KNOWLEDGE SHARING & MENTORING
   • Consider becoming a mentor for new team members
   • Lead training sessions or workshops
   • Document best practices and create knowledge resources
   • Participate in cross-functional collaboration initiatives

2. INNOVATION & PROCESS IMPROVEMENT
   • Identify and lead process optimization projects
   • Explore new technologies or methodologies
   • Champion innovation initiatives within your team
   • Contribute to strategic planning and decision-making

3. CAREER ADVANCEMENT PREPARATION
   • Discuss career advancement opportunities with management
   • Develop skills for next-level responsibilities
   • Build broader organizational network
   • Consider additional certifications or advanced education

EXCELLENCE CONTINUATION PLAN:
□ Maintain current high-performance standards
□ Take on increased leadership responsibilities
□ Identify and develop emerging talent on the team
□ Lead or contribute to strategic initiatives
□ Explore advancement opportunities within the organization

RECOGNITION BENEFITS:
• Performance bonus consideration
• Advancement opportunity prioritization
• Special project assignment eligibility
• Professional development investment
• Recognition in team and organizational communications

ADVANCED DEVELOPMENT:
- Strategic leadership training programs
- Executive coaching opportunities  
- Advanced certification sponsorship
- Conference speaking and networking opportunities
- Cross-departmental project leadership

Your exceptional performance sets the standard for excellence. We look forward to supporting your continued growth and recognizing your valuable contributions.

Continue the outstanding work, and please don't hesitate to discuss career advancement opportunities or additional ways you can contribute to our organization's success.

Best regards,
AI Coaching & Development System
Automated Performance Management
`;
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

// Helper function to calculate variance
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}

// Enhanced sample data generation with company IDs and 50 PIP employees
async function generateSampleData(storage: any) {
  // Generate 200 companies
  const companies = [];
  for (let i = 1; i <= 200; i++) {
    companies.push(`C${i.toString().padStart(3, '0')}`);
  }
  
  // Track PIP employees and improvement metrics
  const pipEmployees = [];
  let totalImproved = 0;
  let totalPips = 0;
  
  const employees = [
    {
      id: "emp-001",
      name: "Alex Thompson",
      role: "Software Engineer",
      email: "alex.thompson@company.com",
      department: "Engineering",
      status: "active",
      managerId: null,
      companyId: "C001",
      backstory: "Senior developer with 8 years experience, specializing in full-stack development. Started as a junior developer and worked his way up through consistent performance and technical excellence. Known for clean code practices and mentoring junior team members. Recently completed AWS architecture certification.",
      recentHistory: [
        "Led successful migration of monolithic architecture to microservices, improving system performance by 40%",
        "Mentored 4 junior developers, with 3 receiving promotions in the past year",
        "Delivered critical feature for major client 3 weeks ahead of schedule",
        "Implemented automated testing framework that reduced deployment bugs by 65%",
        "Received 'Employee of the Month' recognition for outstanding technical leadership",
        "Completed advanced DevOps certification and introduced CI/CD best practices to team"
      ]
    },
    {
      id: "emp-002", 
      name: "Sarah Chen",
      role: "Product Manager",
      email: "sarah.chen@company.com",
      department: "Product",
      status: "active",
      managerId: null,
      companyId: "C001",
      backstory: "Product management veteran with MBA from top-tier business school. Previously worked at two successful startups before joining current company. Expert in agile methodology and user-centered design. Known for data-driven decision making and cross-functional collaboration.",
      recentHistory: [
        "Launched mobile app feature that increased user engagement by 35%",
        "Successfully coordinated product roadmap across 5 engineering teams", 
        "Led user research initiative that identified 3 new market opportunities",
        "Streamlined product development process, reducing time-to-market by 25%",
        "Presented quarterly business review to executive leadership, securing $2M additional budget",
        "Established partnership with key client that generated $500K in new revenue"
      ]
    },
    {
      id: "emp-003",
      name: "Marcus Johnson",
      role: "QA Engineer",
      email: "marcus.johnson@company.com",
      department: "Engineering",
      status: "active",
      managerId: null,
      companyId: "C001",
      backstory: "Quality assurance specialist who joined the company 3 years ago after completing a career change from manual testing to automation. Has been struggling with the transition to more complex automated testing frameworks and keeping up with rapidly evolving technology stack. Shows dedication but lacks confidence.",
      recentHistory: [
        "Completed basic automation training but struggled with advanced selenium concepts",
        "Missed 2 critical bugs in production that caused customer complaints",
        "Frequently asks for help on tasks that should be routine for his experience level",
        "Received feedback about needing to improve attention to detail and test coverage",
        "Has been working extra hours to catch up but output quality remains inconsistent",
        "Expressed feeling overwhelmed during recent 1:1 meetings with manager"
      ]
    },
    {
      id: "emp-004",
      name: "Emily Rodriguez",
      role: "Designer",
      email: "emily.rodriguez@company.com",
      department: "Design",
      status: "pip",
      managerId: null,
      companyId: "C002",
      backstory: "Creative designer with strong artistic background but inconsistent delivery. Graduated from prestigious art school with excellent portfolio. Shows bursts of brilliant creativity followed by periods of lower productivity. Works well under pressure but struggles with routine tasks and time management.",
      recentHistory: [
        "Created award-winning campaign design that increased brand recognition by 45%",
        "Missed 3 project deadlines in the past quarter due to perfectionist tendencies",
        "Delivered exceptional work for high-profile client presentation under tight deadline",
        "Received mixed feedback on routine design tasks - excellent creativity but inconsistent execution", 
        "Participated in design thinking workshop and showed strong collaborative skills",
        "Started PIP program focused on time management and consistent delivery"
      ]
    },
    {
      id: "emp-005",
      name: "David Kim",
      role: "Data Analyst",
      email: "david.kim@company.com",
      department: "Data",
      status: "active",
      managerId: null,
      companyId: "C002",
      backstory: "Data analyst who was previously a high performer but has shown significant decline in recent months. Personal challenges including family health issues have impacted work focus. Strong analytical skills but currently struggling with motivation and consistent output. Was once considered for promotion but performance has declined substantially.",
      recentHistory: [
        "Previously delivered comprehensive market analysis that influenced major strategic decisions",
        "Recent work quality has declined with multiple errors in data interpretation",
        "Missed several important deadlines for quarterly reporting",
        "Utilization has dropped significantly due to extended breaks and reduced focus",
        "Colleagues have noted decreased engagement in team meetings and collaboration",
        "Manager has expressed concerns about recent performance trend during informal check-ins"
      ]
    },
    {
      id: "emp-006",
      name: "Jennifer Wilson",
      role: "Sales Representative",
      email: "jennifer.wilson@company.com",
      department: "Sales",
      status: "terminated",
      managerId: null,
      companyId: "C003",
      backstory: "Former sales representative who consistently underperformed despite multiple coaching sessions and support. Had difficulty building client relationships and meeting sales targets. Terminated after extended period of poor performance and low activity levels.",
      recentHistory: [
        "Failed to meet sales quota for 8 consecutive months",
        "Received customer complaints about lack of follow-up on inquiries",
        "Attended sales training workshops but showed minimal improvement",
        "Had difficulty using CRM system effectively despite multiple training sessions",
        "Showed low activity levels in prospecting and lead generation",
        "Terminated due to continued poor performance and low utilization rates"
      ]
    }
  ];
  
  // Generate additional employees for scale (1000+ total) with 50 PIP employees
  const roles = ["Engineer", "Manager", "Analyst", "Designer", "Sales", "Support", "Marketing"];
  const departments = ["Engineering", "Product", "Sales", "Marketing", "Support", "Data", "Design"];
  const firstNames = ["John", "Jane", "Mike", "Lisa", "Tom", "Amy", "Chris", "Pat", "Sam", "Alex"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
  
  // Templates for generating diverse backstories
  const backstoryTemplates = {
    Engineer: [
      "Full-stack developer with {years} years experience. Specializes in {tech} and has worked on {projects} projects. {personality} Known for {strength} but {weakness}.",
      "Backend engineer who joined after working at {prevCompany}. Expert in {tech} with focus on {specialty}. {personality} {strength} though sometimes {weakness}.",
      "Frontend specialist with strong {skill} background. {experience} {personality} Colleagues appreciate {strength} but note {weakness}."
    ],
    Manager: [
      "Team lead with {years} years in management. Previously {background}. {personality} Team members value {strength} but feedback shows {weakness}.",
      "Department manager who {background}. Expert in {skill} and {specialty}. {personality} Known for {strength} while working on {weakness}.",
      "Operations manager with {experience}. Focuses on {specialty} and {tech}. {personality} Staff appreciate {strength} though {weakness}."
    ],
    Analyst: [
      "Data analyst specializing in {specialty} with {years} years experience. {background} {personality} Produces {strength} but {weakness}.",
      "Business analyst who {experience}. Expert in {tech} and {skill}. {personality} Known for {strength} while {weakness}.",
      "Research analyst with {background}. Focuses on {specialty} using {tech}. {personality} Delivers {strength} though {weakness}."
    ],
    Designer: [
      "Creative designer with {years} years experience in {specialty}. {background} {personality} Creates {strength} but {weakness}.",
      "UX/UI designer who {experience}. Specializes in {tech} and {skill}. {personality} Known for {strength} while {weakness}.",
      "Visual designer with {background}. Expert in {specialty} and {skill}. {personality} Produces {strength} though {weakness}."
    ],
    Sales: [
      "Sales representative with {years} years in {specialty}. {background} {personality} Achieves {strength} but {weakness}.",
      "Account manager who {experience}. Focuses on {skill} and {specialty}. {personality} Known for {strength} while {weakness}.",
      "Business development specialist with {background}. Expert in {specialty} using {tech}. {personality} Delivers {strength} though {weakness}."
    ],
    Support: [
      "Customer support specialist with {years} years experience. {background} {personality} Provides {strength} but {weakness}.",
      "Technical support engineer who {experience}. Expert in {tech} and {skill}. {personality} Known for {strength} while {weakness}.",
      "Help desk analyst with {background}. Specializes in {specialty} and {skill}. {personality} Delivers {strength} though {weakness}."
    ],
    Marketing: [
      "Marketing specialist with {years} years in {specialty}. {background} {personality} Creates {strength} but {weakness}.",
      "Digital marketer who {experience}. Expert in {tech} and {skill}. {personality} Known for {strength} while {weakness}.",
      "Brand manager with {background}. Focuses on {specialty} and {tech}. {personality} Produces {strength} though {weakness}."
    ]
  };

  const variables = {
    years: ["2", "3", "4", "5", "6", "7", "8", "10"],
    tech: ["React", "Python", "SQL", "JavaScript", "AWS", "Docker", "Kubernetes", "Node.js", "GraphQL", "MongoDB"],
    projects: ["mobile", "web", "enterprise", "e-commerce", "fintech", "healthcare", "SaaS", "analytics"],
    personality: ["Collaborative team player.", "Detail-oriented individual.", "Results-driven professional.", "Creative problem solver.", "Process-oriented worker.", "Innovation-focused contributor."],
    strength: ["high-quality deliverables", "meeting tight deadlines", "clear communication", "technical expertise", "mentoring others", "process improvement", "client relationships", "analytical thinking"],
    weakness: ["struggles with time management", "needs improvement in documentation", "could benefit from more proactive communication", "working on consistency", "developing leadership skills", "improving work-life balance", "could enhance collaboration", "building confidence"],
    prevCompany: ["a startup", "a Fortune 500 company", "a consulting firm", "a tech company", "a government agency", "a non-profit"],
    specialty: ["system architecture", "data visualization", "user experience", "performance optimization", "security", "automation", "client relations", "market analysis"],
    skill: ["project management", "agile methodology", "stakeholder communication", "requirements gathering", "quality assurance", "team leadership"],
    experience: ["transitioned from technical role to management", "started as intern and worked up", "brought extensive industry knowledge", "joined after career change", "promoted from within"],
    background: ["graduated from top university", "completed professional certification", "worked in multiple industries", "has military background", "self-taught professional", "has startup experience"]
  };

  const historyTemplates = [
    "Successfully completed {project} project {timeframe}",
    "Received {recognition} for {achievement}",
    "Led initiative that {result}",
    "Struggled with {challenge} but showed {improvement}",
    "Collaborated on {project} with {outcome}",
    "Attended {training} and applied {skill}",
    "Mentored {number} team members in {area}",
    "Identified and resolved {problem}",
    "Missed {deadline} due to {reason}",
    "Exceeded expectations in {area}"
  ];

  for (let i = 7; i <= 1000; i++) {
    const companyId = companies[Math.floor(Math.random() * companies.length)];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];
    
    // Make first 50 additional employees PIP candidates
    const isPipCandidate = i >= 7 && i <= 56;
    
    // Generate backstory
    const templates = backstoryTemplates[role] || backstoryTemplates.Engineer;
    let backstory = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace variables in backstory
    Object.entries(variables).forEach(([key, values]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      if (backstory.includes(`{${key}}`)) {
        backstory = backstory.replace(regex, values[Math.floor(Math.random() * values.length)]);
      }
    });

    // Generate 5-7 recent history items
    const historyCount = Math.floor(Math.random() * 3) + 5; // 5-7 items
    const recentHistory = [];
    for (let h = 0; h < historyCount; h++) {
      let historyItem = historyTemplates[Math.floor(Math.random() * historyTemplates.length)];
      
      // Replace placeholders
      const replacements = {
        project: ["mobile app", "dashboard redesign", "API integration", "database migration", "client presentation", "training program"],
        timeframe: ["last quarter", "this month", "3 months ago", "earlier this year", "in Q2", "during peak season"],
        recognition: ["positive feedback", "team award", "client commendation", "performance bonus", "peer nomination", "leadership recognition"],
        achievement: ["exceeding targets", "technical innovation", "process improvement", "mentoring success", "quality delivery", "customer satisfaction"],
        result: ["improved efficiency by 25%", "reduced costs", "increased customer satisfaction", "streamlined processes", "enhanced team collaboration", "delivered ahead of schedule"],
        challenge: ["tight deadlines", "technical complexity", "resource constraints", "shifting requirements", "team coordination", "learning new technology"],
        improvement: ["additional training", "process adjustments", "better planning", "enhanced collaboration", "skill development", "time management"],
        outcome: ["positive client feedback", "successful delivery", "improved metrics", "team recognition", "process optimization", "enhanced user experience"],
        training: ["technical workshop", "leadership seminar", "certification course", "skills bootcamp", "industry conference", "online training"],
        number: ["2", "3", "4", "several", "multiple"],
        area: ["technical skills", "project management", "client relations", "problem-solving", "industry knowledge", "best practices"],
        problem: ["system bottleneck", "communication gap", "workflow inefficiency", "quality issue", "resource conflict", "technical debt"],
        deadline: ["project deadline", "quarterly goal", "client deliverable", "milestone target", "reporting deadline", "launch schedule"],
        reason: ["competing priorities", "resource constraints", "technical challenges", "external dependencies", "scope changes", "unforeseen complexity"]
      };
      
      Object.entries(replacements).forEach(([key, values]) => {
        const regex = new RegExp(`{${key}}`, 'g');
        if (historyItem.includes(`{${key}}`)) {
          historyItem = historyItem.replace(regex, values[Math.floor(Math.random() * values.length)]);
        }
      });
      
      recentHistory.push(historyItem);
    }
    
    const employee = {
      id: `emp-${i.toString().padStart(3, '0')}`,
      name: `${firstName} ${lastName}`,
      role,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`,
      department,
      status: isPipCandidate ? "pip" : "active",
      managerId: null,
      companyId,
      backstory,
      recentHistory
    };
    
    employees.push(employee);
    
    if (isPipCandidate) {
      pipEmployees.push(employee);
    }
  }

  // Create employees in batches for performance
  console.log(`Creating ${employees.length} employees across ${companies.length} companies...`);
  for (let i = 0; i < employees.length; i += 100) {
    const batch = employees.slice(i, i + 100);
    for (const emp of batch) {
      await storage.createEmployee(emp);
    }
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

  // Marcus Johnson - Struggling performer (should be terminated)
  for (let i = 0; i < 12; i++) {
    // Recent 3 periods (i=0,1,2) should be consistently low for termination
    const baseScore = i < 3 ? 55 : Math.floor(Math.random() * 15) + 50; 
    const baseUtilization = i < 3 ? 45 : Math.floor(Math.random() * 12) + 45;
    await storage.createPerformanceMetric({
      employeeId: "emp-003",
      period: currentPeriod - i,
      score: i < 3 ? Math.floor(Math.random() * 5) + baseScore : Math.floor(Math.random() * 15) + 50, // Consistently low recent periods
      utilization: i < 3 ? Math.floor(Math.random() * 5) + baseUtilization : Math.floor(Math.random() * 12) + 45, // Always below 60 threshold
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

  // David Kim - Severe performance decline (should be terminated)
  for (let i = 0; i < 12; i++) {
    // Recent 3 periods (i=0,1,2) should be consistently low for termination
    const baseScore = i < 3 ? 55 : 78; // Recent severe decline
    const baseUtilization = i < 3 ? 45 : 75; // Severe utilization drop
    await storage.createPerformanceMetric({
      employeeId: "emp-005",
      period: currentPeriod - i,
      score: i < 3 ? Math.floor(Math.random() * 5) + baseScore : Math.floor(Math.random() * 8) + baseScore,
      utilization: i < 3 ? Math.floor(Math.random() * 5) + baseUtilization : Math.floor(Math.random() * 8) + baseUtilization,
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

  // Create another poor performer to guarantee terminations
  await storage.createEmployee({
    id: "emp-007",
    name: "Robert Thompson",
    role: "Customer Support Rep",
    department: "Support",
    companyId: `company-${Math.floor(Math.random() * 200) + 1}`,
    status: "active",
    backstory: "Customer support representative who has struggled to adapt to new support systems and procedures. Joined the company 2 years ago with enthusiasm but has shown consistent difficulty in meeting performance metrics. Receives frequent customer complaints about slow response times and inadequate problem resolution.",
    recentHistory: [
      "Consistently scores below average in customer satisfaction surveys",
      "Takes significantly longer than team average to resolve support tickets",
      "Has received multiple coaching sessions on communication and technical skills",
      "Frequently misses daily activity targets for ticket resolution",
      "Shows low engagement during team meetings and training sessions",
      "Customer complaints have increased 40% for tickets he handles compared to team average"
    ]
  });

  // Robert Thompson - Consistently poor performer (should definitely be terminated)
  for (let i = 0; i < 12; i++) {
    // Ensure recent 3 periods are consistently low
    const baseScore = 45;
    const baseUtilization = 35;
    await storage.createPerformanceMetric({
      employeeId: "emp-007",
      period: currentPeriod - i,
      score: i < 3 ? Math.floor(Math.random() * 5) + baseScore : Math.floor(Math.random() * 10) + 45, // Consistently low recent 3 periods
      utilization: i < 3 ? Math.floor(Math.random() * 5) + baseUtilization : Math.floor(Math.random() * 10) + 35, // Always below thresholds  
      tasksCompleted: Math.floor(Math.random() * 3) + 6, // 6-9
      date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  // Create sample PIPs (create for Emily who has inconsistent performance)
  const pipStartDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const pipEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  await storage.createPip({
    employeeId: "emp-004",
    startDate: pipStartDate,
    endDate: pipEndDate,
    gracePeriodDays: 21,
    goals: [
      "Achieve 75% average performance score",
      "Maintain consistent utilization above 70%", 
      "Improve design quality and reduce revisions"
    ],
    coachingPlan: "Weekly 1:1 sessions with design mentoring and process improvement focus",
    initialScore: 68,
    currentScore: 72,
    progress: 45,
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

  // Generate performance metrics for all employees including PIP candidates
  const metricsCurrentPeriod = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  
  // Generate metrics for PIP employees (showing improvement)
  for (const pipEmp of pipEmployees) {
    const initialScore = Math.floor(Math.random() * 15) + 55; // 55-70 initial
    const improved = Math.random() > 0.3; // 70% improvement rate
    
    if (improved) totalImproved++;
    totalPips++;
    
    for (let i = 0; i < 12; i++) {
      let score, utilization;
      
      if (i < 6) {
        // Poor performance initially
        score = initialScore + Math.floor(Math.random() * 5) - 2;
        utilization = Math.floor(Math.random() * 10) + 50;
      } else {
        // Show improvement or continued poor performance
        if (improved) {
          score = Math.floor(Math.random() * 10) + 75; // Improved to 75-85
          utilization = Math.floor(Math.random() * 10) + 70; // Better utilization
        } else {
          score = initialScore + Math.floor(Math.random() * 5);
          utilization = Math.floor(Math.random() * 10) + 45;
        }
      }
      
      await storage.createPerformanceMetric({
        employeeId: pipEmp.id,
        period: metricsCurrentPeriod - i,
        score,
        utilization,
        tasksCompleted: Math.floor(Math.random() * 8) + 8,
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    
    // Create PIP record with PDF
    const pipStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const pipEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const pip = await storage.createPip({
      employeeId: pipEmp.id,
      startDate: pipStartDate,
      endDate: pipEndDate,
      gracePeriodDays: 30,
      goals: [
        "Achieve 75% average performance score",
        "Maintain 70% utilization rate",
        "Complete all assigned tasks on time",
        "Attend weekly coaching sessions"
      ],
      coachingPlan: "Weekly 1:1 sessions with manager, bi-weekly skill training, daily task reviews",
      initialScore: initialScore,
      currentScore: improved ? 78 : initialScore + 2,
      progress: improved ? 75 : 25,
      improvementRequired: 15,
      status: "active"
    });
    
    // Generate PIP PDF
    await generatePIPPDF(pip, pipEmp);
    
    // Create coaching sessions with PDFs
    for (let week = 0; week < 4; week++) {
      const sessionDate = new Date(Date.now() - (week * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const sessionScore = improved ? 70 + (week * 2) : initialScore + (week * 0.5);
      const feedback = generateCoachingFeedback(sessionScore);
      
      await storage.createCoachingSession({
        employeeId: pipEmp.id,
        pipId: pip.id,
        type: "automated",
        feedback,
        score: sessionScore,
        date: sessionDate
      });
      
      // Generate coaching PDF
      await generateCoachingPDF(
        pipEmp.name,
        pipEmp.id,
        sessionDate,
        sessionScore,
        feedback,
        "automated",
        pip.id
      );
    }
  }
  
  // Generate metrics for other employees (sample)
  for (let empIndex = 57; empIndex <= Math.min(150, employees.length); empIndex++) {
    const emp = employees[empIndex - 1];
    for (let i = 0; i < 8; i++) {
      const isHighPerformer = Math.random() > 0.3;
      await storage.createPerformanceMetric({
        employeeId: emp.id,
        period: metricsCurrentPeriod - i,
        score: isHighPerformer ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 25) + 45,
        utilization: isHighPerformer ? Math.floor(Math.random() * 15) + 75 : Math.floor(Math.random() * 20) + 40,
        tasksCompleted: Math.floor(Math.random() * 10) + 10,
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  }
  
  // Create 3 fresh poor performers for auto-fire demo (always active with consistently poor recent performance)
  const poorPerformerIds = ['emp-995', 'emp-996', 'emp-997'];
  const poorPerformerData = [
    { name: 'Jake Wilson', role: 'Support Rep', dept: 'Support' },
    { name: 'Sam Martinez', role: 'QA Tester', dept: 'Engineering' },
    { name: 'Taylor Brown', role: 'Data Entry', dept: 'Operations' }
  ];
  
  for (let idx = 0; idx < poorPerformerIds.length; idx++) {
    const empId = poorPerformerIds[idx];
    const data = poorPerformerData[idx];
    
    // Create the employee as active
    await storage.createEmployee({
      id: empId,
      name: data.name,
      role: data.role,
      email: `${data.name.toLowerCase().replace(' ', '.')}@company.com`,
      department: data.dept,
      companyId: companies[Math.floor(Math.random() * companies.length)],
      status: "active",
      backstory: `Employee with recent performance challenges that require immediate attention. Consistently scoring below minimum thresholds.`,
      recentHistory: [
        "Performance has declined significantly in recent weeks",
        "Missing daily activity targets consistently",
        "Receiving feedback about work quality concerns",
        "Low engagement in team activities",
        "Struggling to meet basic job requirements"
      ]
    });
    
    // Create consistently poor recent performance (last 3-4 periods all below thresholds)
    for (let i = 0; i < 6; i++) {
      const isRecentPeriod = i < 4; // Recent 4 periods are consistently poor
      const score = isRecentPeriod 
        ? Math.floor(Math.random() * 15) + 45  // 45-60 (below 70 threshold)
        : Math.floor(Math.random() * 25) + 60; // 60-85 (mixed older performance)
      const utilization = isRecentPeriod
        ? Math.floor(Math.random() * 15) + 35  // 35-50 (below 60 threshold)
        : Math.floor(Math.random() * 20) + 55; // 55-75 (mixed older performance)
        
      await storage.createPerformanceMetric({
        employeeId: empId,
        period: metricsCurrentPeriod - i,
        score,
        utilization,
        tasksCompleted: Math.floor(Math.random() * 5) + 5, // 5-10 (low)
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  }
  
  // Calculate improvement rate
  const improvementRate = totalPips > 0 ? (totalImproved / totalPips * 100) : 0;
  
  // Generate audit logs for sample actions
  await storage.createAuditLog({
    action: "sample_data_generated",
    entityType: "system",
    entityId: "sample",
    details: { 
      employeesCreated: employees.length, 
      companiesCreated: companies.length,
      pipEmployeesCreated: pipEmployees.length,
      improvementRate: `${improvementRate.toFixed(2)}%`,
      metricsGenerated: "1500+ performance records",
      portfolioScale: "200 companies, 1000+ employees",
      pdfsGenerated: "Multiple PDFs for PIPs and coaching sessions"
    }
  });
  
  return {
    employeesCreated: employees.length,
    pipEmployees: pipEmployees.length,
    improvementRate,
    companiesCreated: companies.length
  };
}

async function clearAllData(storage: any) {
  // Clear all data from storage
  storage.employees.clear();
  storage.performanceMetrics.clear();
  storage.pips.clear();
  storage.coachingSessions.clear();
  storage.terminatedEmployees.clear();
  storage.auditLogs.clear();
  
  // Create final audit log
  await storage.createAuditLog({
    action: "all_data_cleared",
    entityType: "system", 
    entityId: "system",
    details: { 
      timestamp: new Date().toISOString(),
      message: "All employees, metrics, PIPs, coaching sessions, and terminated employee records cleared"
    }
  });
  
  console.log('All data cleared from storage');
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
      const improvementMet = pip.currentScore !== null && pip.initialScore !== null && 
        ((pip.currentScore - pip.initialScore) / pip.initialScore * 100) >= pip.improvementRequired;

      if (!improvementMet) {
        // Terminate employee (FSM: active -> terminated)
        try { assertTransition((pip.status as any) || "active", "terminated"); } catch (e: any) { return { error: "illegal_transition", message: e.message }; }
        await storage.updateEmployee(pip.employeeId, { status: "terminated" });
        await storage.updatePip(pip.id, { status: "terminated" });

        await storage.createAuditLog({
          action: "employee_terminated_automatically",
          entityType: "employee",
          entityId: pip.employeeId,
          details: { 
            pipId: pip.id,
            reason: "Failed to meet PIP improvement requirements",
            finalScore: pip.currentScore || 0,
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
        // PIP completed successfully (FSM: active -> completed)
        try { assertTransition((pip.status as any) || "active", "completed"); } catch (e: any) { return { error: "illegal_transition", message: e.message }; }
        await storage.updateEmployee(pip.employeeId, { status: "active" });
        await storage.updatePip(pip.id, { status: "completed" });

        await storage.createAuditLog({
          action: "pip_completed_successfully",
          entityType: "pip",
          entityId: pip.id,
          details: { 
            employeeId: pip.employeeId,
            finalScore: pip.currentScore,
            improvementAchieved: pip.currentScore !== null && pip.initialScore !== null 
              ? ((pip.currentScore - pip.initialScore) / pip.initialScore * 100)
              : 0
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
