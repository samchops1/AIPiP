import { 
  type Employee, 
  type InsertEmployee,
  type PerformanceMetric,
  type InsertPerformanceMetric,
  type Pip,
  type InsertPip,
  type CoachingSession,
  type InsertCoachingSession,
  type AuditLog,
  type InsertAuditLog,
  type TerminatedEmployee,
  type InsertTerminatedEmployee,
  type SystemSettings,
  type UpdateSystemSettings
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Employees
  getEmployee(id: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined>;
  
  // Performance Metrics
  getPerformanceMetrics(employeeId: string): Promise<PerformanceMetric[]>;
  getAllPerformanceMetrics(): Promise<PerformanceMetric[]>;
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  createPerformanceMetrics(metrics: InsertPerformanceMetric[]): Promise<PerformanceMetric[]>;
  
  // PIPs
  getPip(id: string): Promise<Pip | undefined>;
  getPipsByEmployee(employeeId: string): Promise<Pip[]>;
  getAllActivePips(): Promise<Pip[]>;
  createPip(pip: InsertPip): Promise<Pip>;
  updatePip(id: string, updates: Partial<Pip>): Promise<Pip | undefined>;
  
  // Coaching Sessions
  getCoachingSessions(employeeId: string): Promise<CoachingSession[]>;
  createCoachingSession(session: InsertCoachingSession): Promise<CoachingSession>;
  
  // Audit Logs
  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Terminated Employees
  getTerminatedEmployees(): Promise<TerminatedEmployee[]>;
  createTerminatedEmployee(employee: InsertTerminatedEmployee): Promise<TerminatedEmployee>;
  
  // System Settings
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(updates: UpdateSystemSettings): Promise<SystemSettings>;
}

export class MemStorage implements IStorage {
  private employees: Map<string, Employee>;
  private performanceMetrics: Map<string, PerformanceMetric>;
  private pips: Map<string, Pip>;
  private coachingSessions: Map<string, CoachingSession>;
  private auditLogs: Map<string, AuditLog>;
  private terminatedEmployees: Map<string, TerminatedEmployee>;
  private systemSettings: SystemSettings;

  constructor() {
    this.employees = new Map();
    this.performanceMetrics = new Map();
    this.pips = new Map();
    this.coachingSessions = new Map();
    this.auditLogs = new Map();
    this.terminatedEmployees = new Map();
    this.systemSettings = {
      id: "system",
      killSwitchActive: false,
      minScoreThreshold: 70,
      minUtilizationThreshold: 60,
      consecutiveLowPeriods: 3,
      defaultGracePeriod: 21,
      minImprovementPercent: 10,
      updatedAt: new Date()
    };
  }

  // Employees
  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const employee: Employee = {
      ...insertEmployee,
      role: insertEmployee.role || null,
      email: insertEmployee.email || null,
      department: insertEmployee.department || null,
      managerId: insertEmployee.managerId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.employees.set(employee.id, employee);
    return employee;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updated = { ...employee, ...updates, updatedAt: new Date() };
    this.employees.set(id, updated);
    return updated;
  }

  // Performance Metrics
  async getPerformanceMetrics(employeeId: string): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values())
      .filter(metric => metric.employeeId === employeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getAllPerformanceMetrics(): Promise<PerformanceMetric[]> {
    return Array.from(this.performanceMetrics.values());
  }

  async createPerformanceMetric(insertMetric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const id = randomUUID();
    const metric: PerformanceMetric = {
      ...insertMetric,
      id,
      createdAt: new Date()
    };
    this.performanceMetrics.set(id, metric);
    return metric;
  }

  async createPerformanceMetrics(insertMetrics: InsertPerformanceMetric[]): Promise<PerformanceMetric[]> {
    const metrics = insertMetrics.map(insertMetric => {
      const id = randomUUID();
      const metric: PerformanceMetric = {
        ...insertMetric,
        id,
        createdAt: new Date()
      };
      this.performanceMetrics.set(id, metric);
      return metric;
    });
    return metrics;
  }

  // PIPs
  async getPip(id: string): Promise<Pip | undefined> {
    return this.pips.get(id);
  }

  async getPipsByEmployee(employeeId: string): Promise<Pip[]> {
    return Array.from(this.pips.values())
      .filter(pip => pip.employeeId === employeeId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  async getAllActivePips(): Promise<Pip[]> {
    return Array.from(this.pips.values())
      .filter(pip => pip.status === "active");
  }

  async getPipById(id: string): Promise<Pip | undefined> {
    return this.pips.get(id);
  }

  async createPip(insertPip: InsertPip): Promise<Pip> {
    const id = randomUUID();
    const pip: Pip = {
      ...insertPip,
      id,
      progress: insertPip.progress || 0,
      initialScore: insertPip.initialScore || null,
      currentScore: insertPip.currentScore || null,
      createdAt: new Date()
    };
    this.pips.set(id, pip);
    return pip;
  }

  async updatePip(id: string, updates: Partial<Pip>): Promise<Pip | undefined> {
    const pip = this.pips.get(id);
    if (!pip) return undefined;
    
    const updated = { ...pip, ...updates };
    this.pips.set(id, updated);
    return updated;
  }

  // Coaching Sessions
  async getCoachingSessions(employeeId: string): Promise<CoachingSession[]> {
    return Array.from(this.coachingSessions.values())
      .filter(session => session.employeeId === employeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createCoachingSession(insertSession: InsertCoachingSession): Promise<CoachingSession> {
    const id = randomUUID();
    const session: CoachingSession = {
      ...insertSession,
      id,
      score: insertSession.score || null,
      pipId: insertSession.pipId || null,
      createdAt: new Date()
    };
    this.coachingSessions.set(id, session);
    return session;
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = {
      ...insertLog,
      id,
      userId: insertLog.userId || null,
      timestamp: new Date()
    };
    this.auditLogs.set(id, log);
    return log;
  }

  // Terminated Employees
  async getTerminatedEmployees(): Promise<TerminatedEmployee[]> {
    return Array.from(this.terminatedEmployees.values())
      .sort((a, b) => new Date(b.terminationDate).getTime() - new Date(a.terminationDate).getTime());
  }

  async createTerminatedEmployee(insertEmployee: InsertTerminatedEmployee): Promise<TerminatedEmployee> {
    const id = randomUUID();
    const employee: TerminatedEmployee = {
      ...insertEmployee,
      id,
      finalScore: insertEmployee.finalScore || null,
      finalUtilization: insertEmployee.finalUtilization || null,
      createdAt: new Date()
    };
    this.terminatedEmployees.set(id, employee);
    return employee;
  }

  // System Settings
  async getSystemSettings(): Promise<SystemSettings> {
    return this.systemSettings;
  }

  async updateSystemSettings(updates: UpdateSystemSettings): Promise<SystemSettings> {
    this.systemSettings = {
      ...this.systemSettings,
      ...updates,
      updatedAt: new Date()
    };
    return this.systemSettings;
  }
}

export const storage = new MemStorage();
