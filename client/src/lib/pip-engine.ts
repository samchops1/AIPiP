import { PerformanceMetric, Employee, SystemSettings } from "@shared/schema";

export interface PipEvaluationResult {
  shouldCreatePip: boolean;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  consecutiveLowCount: number;
  averageScore: number;
  trendAnalysis: {
    direction: 'improving' | 'declining' | 'stable';
    changePercent: number;
  };
}

export interface PipProgressEvaluation {
  shouldTerminate: boolean;
  shouldExtend: boolean;
  improvementPercent: number;
  currentTrend: 'improving' | 'declining' | 'stable';
  recommendedActions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class PipEngine {
  private settings: SystemSettings;

  constructor(settings: SystemSettings) {
    this.settings = settings;
  }

  /**
   * Evaluates an employee for PIP eligibility based on performance metrics
   */
  evaluateForPip(
    employee: Employee, 
    metrics: PerformanceMetric[]
  ): PipEvaluationResult {
    if (this.settings.killSwitchActive) {
      return {
        shouldCreatePip: false,
        reason: "Kill switch is active - automated evaluations paused",
        riskLevel: 'low',
        recommendations: [],
        consecutiveLowCount: 0,
        averageScore: 0,
        trendAnalysis: { direction: 'stable', changePercent: 0 }
      };
    }

    // Sort metrics by period (most recent first)
    const sortedMetrics = metrics
      .filter(m => m.employeeId === employee.id)
      .sort((a, b) => b.period - a.period);

    if (sortedMetrics.length === 0) {
      return {
        shouldCreatePip: false,
        reason: "No performance metrics available",
        riskLevel: 'low',
        recommendations: ["Upload performance data for evaluation"],
        consecutiveLowCount: 0,
        averageScore: 0,
        trendAnalysis: { direction: 'stable', changePercent: 0 }
      };
    }

    // Check for existing PIP status
    if (employee.status === 'pip') {
      return {
        shouldCreatePip: false,
        reason: "Employee already has an active PIP",
        riskLevel: 'high',
        recommendations: ["Monitor PIP progress", "Provide additional coaching"],
        consecutiveLowCount: 0,
        averageScore: sortedMetrics[0]?.score || 0,
        trendAnalysis: this.calculateTrend(sortedMetrics)
      };
    }

    if (employee.status === 'terminated') {
      return {
        shouldCreatePip: false,
        reason: "Employee has been terminated",
        riskLevel: 'low',
        recommendations: [],
        consecutiveLowCount: 0,
        averageScore: 0,
        trendAnalysis: { direction: 'stable', changePercent: 0 }
      };
    }

    // Get recent metrics for consecutive low performance check
    const recentMetrics = sortedMetrics.slice(0, this.settings.consecutiveLowPeriods);
    const consecutiveLowCount = this.getConsecutiveLowCount(recentMetrics);
    const averageScore = this.calculateAverageScore(sortedMetrics.slice(0, 5));
    const trendAnalysis = this.calculateTrend(sortedMetrics);

    // Determine if PIP should be created
    const shouldCreatePip = consecutiveLowCount >= this.settings.consecutiveLowPeriods;
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (shouldCreatePip) {
      riskLevel = 'critical';
    } else if (consecutiveLowCount >= 2) {
      riskLevel = 'high';
    } else if (averageScore < this.settings.minScoreThreshold) {
      riskLevel = 'medium';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      averageScore, 
      consecutiveLowCount, 
      trendAnalysis
    );

    let reason = "";
    if (shouldCreatePip) {
      reason = `${consecutiveLowCount} consecutive periods below ${this.settings.minScoreThreshold}% threshold`;
    } else if (consecutiveLowCount > 0) {
      reason = `${consecutiveLowCount} recent periods below threshold - monitoring required`;
    } else {
      reason = "Performance within acceptable range";
    }

    return {
      shouldCreatePip,
      reason,
      riskLevel,
      recommendations,
      consecutiveLowCount,
      averageScore,
      trendAnalysis
    };
  }

  /**
   * Evaluates PIP progress and determines next steps
   */
  evaluatePipProgress(
    employee: Employee,
    metrics: PerformanceMetric[],
    pipStartDate: string,
    pipEndDate: string,
    initialScore: number,
    improvementRequired: number
  ): PipProgressEvaluation {
    const sortedMetrics = metrics
      .filter(m => m.employeeId === employee.id)
      .filter(m => m.date >= pipStartDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedMetrics.length === 0) {
      return {
        shouldTerminate: false,
        shouldExtend: true,
        improvementPercent: 0,
        currentTrend: 'stable',
        recommendedActions: ["No performance data during PIP period - extend for monitoring"],
        riskLevel: 'high'
      };
    }

    const latestScore = sortedMetrics[0].score;
    const improvementPercent = ((latestScore - initialScore) / initialScore) * 100;
    const averageScore = this.calculateAverageScore(sortedMetrics);
    const trendAnalysis = this.calculateTrend(sortedMetrics);

    // Check if PIP period has ended
    const pipEndTime = new Date(pipEndDate).getTime();
    const now = new Date().getTime();
    const pipEnded = now >= pipEndTime;

    let shouldTerminate = false;
    let shouldExtend = false;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    const recommendedActions: string[] = [];

    if (pipEnded) {
      // PIP period has ended - make final decision
      if (improvementPercent >= improvementRequired && averageScore >= this.settings.minScoreThreshold) {
        // Successful completion
        riskLevel = 'low';
        recommendedActions.push("PIP successfully completed - return to normal status");
      } else if (improvementPercent < improvementRequired / 2) {
        // Insufficient improvement
        shouldTerminate = true;
        riskLevel = 'critical';
        recommendedActions.push("Insufficient improvement - recommend termination");
      } else {
        // Some improvement but not enough
        shouldExtend = true;
        riskLevel = 'high';
        recommendedActions.push("Partial improvement shown - consider extension");
      }
    } else {
      // PIP is still in progress
      if (improvementPercent >= improvementRequired) {
        riskLevel = 'low';
        recommendedActions.push("On track for successful completion");
      } else if (trendAnalysis.direction === 'improving') {
        riskLevel = 'medium';
        recommendedActions.push("Showing improvement - continue monitoring");
      } else {
        riskLevel = 'high';
        recommendedActions.push("Limited progress - increase coaching frequency");
      }
    }

    return {
      shouldTerminate,
      shouldExtend,
      improvementPercent,
      currentTrend: trendAnalysis.direction,
      recommendedActions,
      riskLevel
    };
  }

  /**
   * Generates automated PIP goals based on employee performance
   */
  generatePipGoals(averageScore: number, weakAreas: string[]): string[] {
    const goals: string[] = [];
    
    // Score improvement goal
    const targetScore = Math.max(this.settings.minScoreThreshold + 10, 80);
    goals.push(`Achieve and maintain ${targetScore}% average performance score`);
    
    // Task completion goal
    goals.push(`Complete all assigned tasks within specified timeframes`);
    
    // Specific improvement areas based on score
    if (averageScore < 60) {
      goals.push("Attend mandatory skill development training sessions");
      goals.push("Meet with supervisor weekly for progress review");
    } else if (averageScore < 70) {
      goals.push("Improve task quality and attention to detail");
      goals.push("Demonstrate consistent application of learned skills");
    }
    
    // Add custom goals based on weak areas
    weakAreas.forEach(area => {
      goals.push(`Improve performance in: ${area}`);
    });
    
    return goals;
  }

  /**
   * Calculates coaching plan based on performance analysis
   */
  generateCoachingPlan(averageScore: number, trendAnalysis: any): string {
    let frequency = "weekly";
    let focus = "general performance improvement";
    
    if (averageScore < 50) {
      frequency = "bi-weekly";
      focus = "fundamental skills development and basic requirements";
    } else if (averageScore < 60) {
      frequency = "weekly";
      focus = "skill building and quality improvement";
    } else if (averageScore < 70) {
      frequency = "weekly";
      focus = "consistency and meeting performance standards";
    }
    
    if (trendAnalysis.direction === 'declining') {
      frequency = "bi-weekly";
    }
    
    return `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} coaching sessions focusing on ${focus}. Regular feedback and progress monitoring with documented action items.`;
  }

  private getConsecutiveLowCount(metrics: PerformanceMetric[]): number {
    let count = 0;
    for (const metric of metrics) {
      if (metric.score < this.settings.minScoreThreshold) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private calculateAverageScore(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + metric.score, 0);
    return sum / metrics.length;
  }

  private calculateTrend(metrics: PerformanceMetric[]): {
    direction: 'improving' | 'declining' | 'stable';
    changePercent: number;
  } {
    if (metrics.length < 2) {
      return { direction: 'stable', changePercent: 0 };
    }

    // Compare latest score to previous average
    const latest = metrics[0].score;
    const previous = metrics.slice(1, 3);
    const previousAvg = previous.reduce((sum, m) => sum + m.score, 0) / previous.length;
    
    const changePercent = ((latest - previousAvg) / previousAvg) * 100;
    
    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    if (changePercent > 5) {
      direction = 'improving';
    } else if (changePercent < -5) {
      direction = 'declining';
    }
    
    return { direction, changePercent };
  }

  private generateRecommendations(
    averageScore: number, 
    consecutiveLowCount: number, 
    trendAnalysis: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (consecutiveLowCount >= this.settings.consecutiveLowPeriods) {
      recommendations.push("Immediate PIP initiation required");
      recommendations.push("Schedule comprehensive performance review");
    } else if (consecutiveLowCount >= 2) {
      recommendations.push("Increase coaching frequency");
      recommendations.push("Monitor closely for PIP trigger");
    }
    
    if (averageScore < 50) {
      recommendations.push("Consider fundamental skills training");
      recommendations.push("Evaluate role fit and expectations");
    } else if (averageScore < 60) {
      recommendations.push("Provide targeted skill development");
      recommendations.push("Implement regular check-ins");
    }
    
    if (trendAnalysis.direction === 'declining') {
      recommendations.push("Address declining performance trend");
      recommendations.push("Identify and remove performance barriers");
    } else if (trendAnalysis.direction === 'improving') {
      recommendations.push("Continue current improvement strategies");
      recommendations.push("Recognize progress and maintain momentum");
    }
    
    return recommendations;
  }
}
