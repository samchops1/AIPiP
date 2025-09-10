export interface CoachingRecommendation {
  feedback: string;
  category: 'skill_development' | 'performance' | 'behavior' | 'goal_setting' | 'motivation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionItems: string[];
  timeframe: string;
  followUpRequired: boolean;
}

export interface CoachingContext {
  currentScore: number;
  previousScore?: number;
  averageScore: number;
  consecutiveLowPeriods: number;
  improvementTrend: 'improving' | 'declining' | 'stable';
  pipStatus?: 'active' | 'none';
  roleExpectations: number; // Expected score threshold
}

export class CoachingEngine {
  /**
   * Generates personalized coaching feedback based on performance data
   */
  generateCoaching(context: CoachingContext): CoachingRecommendation {
    const { currentScore, previousScore, averageScore, consecutiveLowPeriods, improvementTrend, pipStatus } = context;
    
    // Determine coaching category based on performance level
    const category = this.determineCoachingCategory(currentScore, consecutiveLowPeriods, pipStatus);
    
    // Generate specific feedback based on score range and context
    const feedback = this.generateFeedbackMessage(context);
    
    // Determine priority level
    const priority = this.determinePriority(currentScore, consecutiveLowPeriods, pipStatus);
    
    // Generate actionable items
    const actionItems = this.generateActionItems(context);
    
    // Set timeframe for implementation
    const timeframe = this.determineTimeframe(priority, pipStatus);
    
    // Determine if follow-up is needed
    const followUpRequired = this.shouldRequireFollowUp(currentScore, priority, pipStatus);
    
    return {
      feedback,
      category,
      priority,
      actionItems,
      timeframe,
      followUpRequired
    };
  }

  /**
   * Generates motivational and improvement-focused coaching messages
   */
  generateMotivationalCoaching(
    improvementPercent: number, 
    daysInPip: number, 
    targetScore: number
  ): string {
    if (improvementPercent > 15) {
      return `Excellent progress! You've improved by ${improvementPercent.toFixed(1)}% over the past ${daysInPip} days. Keep up the momentum and continue focusing on the strategies that are working. You're on track to exceed the ${targetScore}% target.`;
    } else if (improvementPercent > 5) {
      return `Good progress! You've shown ${improvementPercent.toFixed(1)}% improvement. Continue building on this foundation. Focus on consistency and maintaining the quality improvements you've made. The target of ${targetScore}% is achievable with continued effort.`;
    } else if (improvementPercent > 0) {
      return `You're moving in the right direction with ${improvementPercent.toFixed(1)}% improvement. While progress is modest, every step forward counts. Let's identify what's working and amplify those efforts to accelerate your progress toward ${targetScore}%.`;
    } else {
      return `Let's refocus and identify new strategies to help you reach the ${targetScore}% target. Consider this an opportunity to try different approaches and leverage additional resources. Your success is important, and support is available to help you improve.`;
    }
  }

  /**
   * Generates specific skill-based coaching recommendations
   */
  generateSkillCoaching(weakAreas: string[], currentScore: number): CoachingRecommendation[] {
    const recommendations: CoachingRecommendation[] = [];
    
    weakAreas.forEach(area => {
      let feedback = "";
      let actionItems: string[] = [];
      
      switch (area.toLowerCase()) {
        case 'communication':
          feedback = "Focus on improving clarity and professionalism in all communications. Clear communication is essential for task success and team collaboration.";
          actionItems = [
            "Practice active listening in team meetings",
            "Ask clarifying questions when instructions are unclear",
            "Provide regular status updates on task progress",
            "Use professional language in all written communications"
          ];
          break;
          
        case 'time_management':
          feedback = "Developing better time management skills will significantly improve your task completion rates and overall performance.";
          actionItems = [
            "Use task prioritization techniques (e.g., Eisenhower Matrix)",
            "Break large tasks into smaller, manageable steps",
            "Set realistic deadlines and buffer time for unexpected issues",
            "Track time spent on tasks to identify efficiency opportunities"
          ];
          break;
          
        case 'quality':
          feedback = "Focus on attention to detail and quality control processes. Taking time to review and verify work will improve overall output quality.";
          actionItems = [
            "Implement a personal quality checklist for each task type",
            "Schedule dedicated time for work review before submission",
            "Seek feedback early in the process to catch issues sooner",
            "Learn from mistakes by documenting and reviewing errors"
          ];
          break;
          
        case 'technical_skills':
          feedback = "Strengthening technical competencies will boost confidence and performance. Consider this an investment in your professional development.";
          actionItems = [
            "Complete relevant training modules or courses",
            "Practice new skills with low-risk tasks first",
            "Find a mentor or peer to provide guidance",
            "Document new learning for future reference"
          ];
          break;
          
        default:
          feedback = `Focus on improving performance in ${area}. Consistent effort in this area will contribute to overall performance improvement.`;
          actionItems = [
            "Identify specific improvement opportunities",
            "Set measurable goals for this area",
            "Seek resources and support for development",
            "Monitor progress regularly"
          ];
      }
      
      recommendations.push({
        feedback,
        category: 'skill_development',
        priority: currentScore < 60 ? 'high' : 'medium',
        actionItems,
        timeframe: '2-3 weeks',
        followUpRequired: true
      });
    });
    
    return recommendations;
  }

  private determineCoachingCategory(
    currentScore: number, 
    consecutiveLowPeriods: number, 
    pipStatus?: string
  ): CoachingRecommendation['category'] {
    if (pipStatus === 'active') return 'performance';
    if (currentScore < 50) return 'skill_development';
    if (consecutiveLowPeriods >= 2) return 'performance';
    if (currentScore < 70) return 'goal_setting';
    return 'motivation';
  }

  private generateFeedbackMessage(context: CoachingContext): string {
    const { currentScore, previousScore, improvementTrend, pipStatus, roleExpectations } = context;
    
    if (pipStatus === 'active') {
      return this.generatePipFeedback(context);
    }
    
    if (currentScore >= roleExpectations) {
      return this.generatePositiveFeedback(context);
    } else if (currentScore >= 70) {
      return this.generateImprovementFeedback(context);
    } else {
      return this.generateDevelopmentFeedback(context);
    }
  }

  private generatePipFeedback(context: CoachingContext): string {
    const { currentScore, improvementTrend, roleExpectations } = context;
    
    if (improvementTrend === 'improving') {
      return `Your performance is showing positive improvement during the PIP period. Current score of ${currentScore}% demonstrates your commitment to growth. Continue implementing the strategies that are working and maintain this momentum to reach the ${roleExpectations}% target.`;
    } else if (improvementTrend === 'declining') {
      return `Performance needs immediate attention. The current score of ${currentScore}% requires focused effort to meet PIP requirements. Let's identify specific barriers and develop targeted solutions to get back on track toward the ${roleExpectations}% goal.`;
    } else {
      return `Performance is stable at ${currentScore}% during the PIP period. To successfully complete the PIP, we need to see consistent improvement toward the ${roleExpectations}% target. Let's review your action plan and identify opportunities for acceleration.`;
    }
  }

  private generatePositiveFeedback(context: CoachingContext): string {
    const { currentScore, improvementTrend } = context;
    
    if (improvementTrend === 'improving') {
      return `Excellent work! Your score of ${currentScore}% shows strong performance and continued improvement. You're meeting expectations and demonstrating great progress. Keep up the excellent work and continue building on your strengths.`;
    } else {
      return `Great job maintaining high performance with a score of ${currentScore}%. You're consistently meeting expectations. Continue to challenge yourself and look for opportunities to mentor others and share your successful strategies.`;
    }
  }

  private generateImprovementFeedback(context: CoachingContext): string {
    const { currentScore, improvementTrend, roleExpectations } = context;
    
    if (improvementTrend === 'improving') {
      return `Good progress! Your score of ${currentScore}% shows improvement and you're moving in the right direction. With continued focus, you can reach the ${roleExpectations}% target. Keep implementing the strategies that are working for you.`;
    } else {
      return `Your current score of ${currentScore}% indicates room for improvement to reach the ${roleExpectations}% target. Let's identify specific areas where you can enhance performance and develop a focused action plan for consistent improvement.`;
    }
  }

  private generateDevelopmentFeedback(context: CoachingContext): string {
    const { currentScore, roleExpectations } = context;
    
    return `Your current performance score of ${currentScore}% indicates significant opportunity for growth. The target is ${roleExpectations}%, which is achievable with focused development. Let's work together to identify your strengths and create a comprehensive improvement plan with clear, actionable steps.`;
  }

  private determinePriority(
    currentScore: number, 
    consecutiveLowPeriods: number, 
    pipStatus?: string
  ): CoachingRecommendation['priority'] {
    if (pipStatus === 'active' && currentScore < 60) return 'urgent';
    if (consecutiveLowPeriods >= 3) return 'urgent';
    if (currentScore < 50) return 'high';
    if (consecutiveLowPeriods >= 2) return 'high';
    if (currentScore < 70) return 'medium';
    return 'low';
  }

  private generateActionItems(context: CoachingContext): string[] {
    const { currentScore, consecutiveLowPeriods, pipStatus } = context;
    const actionItems: string[] = [];
    
    if (pipStatus === 'active') {
      actionItems.push("Review and implement all PIP action items daily");
      actionItems.push("Schedule weekly progress check-ins with supervisor");
    }
    
    if (currentScore < 50) {
      actionItems.push("Complete fundamental skills assessment");
      actionItems.push("Attend all required training sessions");
      actionItems.push("Request additional support and resources");
    } else if (currentScore < 70) {
      actionItems.push("Identify top 3 areas for improvement");
      actionItems.push("Set specific, measurable weekly goals");
      actionItems.push("Track daily performance metrics");
    } else {
      actionItems.push("Maintain current performance standards");
      actionItems.push("Identify opportunities for skill enhancement");
    }
    
    if (consecutiveLowPeriods >= 2) {
      actionItems.push("Analyze patterns in recent performance");
      actionItems.push("Implement corrective measures immediately");
    }
    
    return actionItems;
  }

  private determineTimeframe(priority: CoachingRecommendation['priority'], pipStatus?: string): string {
    if (priority === 'urgent') return '1 week';
    if (pipStatus === 'active') return '1-2 weeks';
    if (priority === 'high') return '2-3 weeks';
    if (priority === 'medium') return '3-4 weeks';
    return '4-6 weeks';
  }

  private shouldRequireFollowUp(
    currentScore: number, 
    priority: CoachingRecommendation['priority'], 
    pipStatus?: string
  ): boolean {
    return pipStatus === 'active' || priority === 'urgent' || priority === 'high' || currentScore < 60;
  }
}
