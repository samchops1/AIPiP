import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Ensure PDF directory exists
const pdfDir = path.join(process.cwd(), 'generated_pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

export function generateTerminationPDF(
  employeeName: string,
  employeeId: string,
  role: string,
  finalScore: number,
  finalUtilization: number,
  reasons: string[],
  terminationDate: string
): Promise<string> {
  const doc = new PDFDocument();
  const fileName = `Termination_${employeeId}_${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, fileName);
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(filePath));
  
  // Header
  doc.fontSize(20).text('EMPLOYMENT TERMINATION NOTICE', { align: 'center' });
  doc.moveDown();
  
  // Date
  doc.fontSize(12).text(`Date: ${new Date(terminationDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`);
  doc.moveDown();
  
  // Employee Information
  doc.fontSize(14).text('Employee Information:', { underline: true });
  doc.fontSize(12);
  doc.text(`Name: ${employeeName}`);
  doc.text(`Employee ID: ${employeeId}`);
  doc.text(`Position: ${role}`);
  doc.moveDown();
  
  // Performance Summary
  doc.fontSize(14).text('Performance Summary:', { underline: true });
  doc.fontSize(12);
  doc.text(`Final Performance Score: ${finalScore}%`);
  doc.text(`Final Utilization Rate: ${finalUtilization}%`);
  doc.moveDown();
  
  // Reasons for Termination
  doc.fontSize(14).text('Reasons for Termination:', { underline: true });
  doc.fontSize(11);
  reasons.forEach(reason => {
    doc.text(`• ${reason}`, { indent: 20 });
  });
  doc.moveDown();
  
  // Notice
  doc.fontSize(12).text(
    'This decision is based on documented performance issues and failure to meet the minimum standards required for your position. Despite previous coaching efforts and performance improvement opportunities, the required improvements have not been achieved.',
    { align: 'justify' }
  );
  doc.moveDown();
  
  // Final Instructions
  doc.fontSize(12).text('Next Steps:', { underline: true });
  doc.text('• Final paycheck will be processed according to company policy');
  doc.text('• Please return all company property immediately');
  doc.text('• Benefits information will be sent separately');
  doc.text('• Contact HR for any questions');
  doc.moveDown();
  
  // Footer
  doc.fontSize(10).fillColor('gray');
  doc.text('Human Resources Department', { align: 'center' });
  doc.text('Automated HR Management System', { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  
  // Finalize PDF and wait for completion
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(filePath);
    });
    doc.on('error', reject);
    doc.end();
  });
}

export function generateCoachingPDF(
  employeeName: string,
  employeeId: string,
  sessionDate: string,
  score: number,
  feedback: string,
  type: string,
  pipId?: string
): Promise<string> {
  const doc = new PDFDocument();
  const fileName = `Coaching_${employeeId}_${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, fileName);
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(filePath));
  
  // Header
  doc.fontSize(20).text('COACHING SESSION DOCUMENTATION', { align: 'center' });
  doc.moveDown();
  
  // Session Information
  doc.fontSize(14).text('Session Information:', { underline: true });
  doc.fontSize(12);
  doc.text(`Date: ${new Date(sessionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`);
  doc.text(`Type: ${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (pipId) {
    doc.text(`Related PIP ID: ${pipId}`);
  }
  doc.moveDown();
  
  // Employee Information
  doc.fontSize(14).text('Employee Information:', { underline: true });
  doc.fontSize(12);
  doc.text(`Name: ${employeeName}`);
  doc.text(`Employee ID: ${employeeId}`);
  doc.text(`Current Performance Score: ${score}%`);
  doc.moveDown();
  
  // Performance Analysis
  doc.fontSize(14).text('Performance Analysis:', { underline: true });
  doc.fontSize(12);
  let performanceLevel = 'Needs Improvement';
  if (score >= 90) performanceLevel = 'Excellent';
  else if (score >= 80) performanceLevel = 'Good';
  else if (score >= 70) performanceLevel = 'Satisfactory';
  
  doc.text(`Performance Level: ${performanceLevel}`);
  doc.text(`Score Trend: ${score < 70 ? 'Below Expectations' : score < 80 ? 'Meeting Expectations' : 'Exceeding Expectations'}`);
  doc.moveDown();
  
  // Feedback
  doc.fontSize(14).text('Coaching Feedback:', { underline: true });
  doc.fontSize(11);
  doc.text(feedback, { align: 'justify' });
  doc.moveDown();
  
  // Action Items
  doc.fontSize(14).text('Recommended Action Items:', { underline: true });
  doc.fontSize(11);
  if (score < 60) {
    doc.text('• Immediate performance improvement required');
    doc.text('• Daily check-ins with supervisor');
    doc.text('• Complete additional training modules');
    doc.text('• Review and acknowledge performance standards');
  } else if (score < 70) {
    doc.text('• Focus on consistency in task completion');
    doc.text('• Weekly progress reviews');
    doc.text('• Identify and address skill gaps');
    doc.text('• Seek clarification on expectations');
  } else if (score < 80) {
    doc.text('• Continue current improvement trajectory');
    doc.text('• Bi-weekly check-ins');
    doc.text('• Focus on quality metrics');
    doc.text('• Document best practices');
  } else {
    doc.text('• Maintain high performance standards');
    doc.text('• Consider mentoring opportunities');
    doc.text('• Share best practices with team');
    doc.text('• Explore advancement opportunities');
  }
  doc.moveDown();
  
  // Next Session
  doc.fontSize(12).text('Next Session:', { underline: true });
  const nextSessionDate = new Date(sessionDate);
  nextSessionDate.setDate(nextSessionDate.getDate() + 7);
  doc.text(`Scheduled for: ${nextSessionDate.toLocaleDateString('en-US')}`);
  doc.moveDown();
  
  // Footer
  doc.fontSize(10).fillColor('gray');
  doc.text('HR Coaching & Development', { align: 'center' });
  doc.text('Automated Coaching System', { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  
  // Finalize PDF and wait for completion
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(filePath);
    });
    doc.on('error', reject);
    doc.end();
  });
}

export function generatePIPPDF(
  pip: any,
  employee: any
): Promise<string> {
  const doc = new PDFDocument();
  const fileName = `PIP_${employee.id}_${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, fileName);
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(filePath));
  
  // Header
  doc.fontSize(20).text('PERFORMANCE IMPROVEMENT PLAN', { align: 'center' });
  doc.moveDown();
  
  // PIP Details
  doc.fontSize(14).text('PIP Details:', { underline: true });
  doc.fontSize(12);
  doc.text(`PIP ID: ${pip.id}`);
  doc.text(`Start Date: ${pip.startDate}`);
  doc.text(`End Date: ${pip.endDate}`);
  doc.text(`Grace Period: ${pip.gracePeriodDays} days`);
  doc.text(`Status: ${pip.status}`);
  doc.moveDown();
  
  // Employee Information
  doc.fontSize(14).text('Employee Information:', { underline: true });
  doc.fontSize(12);
  doc.text(`Name: ${employee.name}`);
  doc.text(`Employee ID: ${employee.id}`);
  doc.text(`Department: ${employee.department || 'N/A'}`);
  doc.text(`Role: ${employee.role || 'N/A'}`);
  doc.text(`Company: ${employee.companyId || 'N/A'}`);
  doc.moveDown();
  
  // Performance Overview
  doc.fontSize(14).text('Performance Overview:', { underline: true });
  doc.fontSize(12);
  doc.text(`Initial Score: ${pip.initialScore || 'N/A'}%`);
  doc.text(`Current Score: ${pip.currentScore || 'N/A'}%`);
  doc.text(`Required Improvement: ${pip.improvementRequired || 'N/A'}%`);
  doc.text(`Current Progress: ${pip.progress || 0}%`);
  
  // Calculate improvement rate
  if (pip.initialScore && pip.currentScore) {
    const improvementRate = ((pip.currentScore - pip.initialScore) / pip.initialScore * 100).toFixed(2);
    doc.text(`Improvement Rate: ${improvementRate}%`);
  }
  doc.moveDown();
  
  // Goals and Objectives
  doc.fontSize(14).text('Goals and Objectives:', { underline: true });
  doc.fontSize(11);
  if (Array.isArray(pip.goals)) {
    pip.goals.forEach((goal: string, index: number) => {
      doc.text(`${index + 1}. ${goal}`, { indent: 20 });
    });
  }
  doc.moveDown();
  
  // Coaching Plan
  doc.fontSize(14).text('Coaching Plan:', { underline: true });
  doc.fontSize(11);
  doc.text(pip.coachingPlan, { align: 'justify' });
  doc.moveDown();
  
  // Success Criteria
  doc.fontSize(14).text('Success Criteria:', { underline: true });
  doc.fontSize(11);
  const targetScore = (pip.initialScore || 70) + (pip.improvementRequired || 15);
  doc.text(`• Achieve consistent performance score of ${targetScore}% or higher`);
  doc.text(`• Complete all assigned goals and objectives`);
  doc.text(`• Demonstrate sustained improvement in key areas`);
  doc.text(`• Regular attendance at coaching sessions`);
  doc.moveDown();
  
  // Important Notes
  doc.fontSize(12).text('Important Notes:', { underline: true });
  doc.fontSize(11);
  doc.text('• This PIP is designed to support employee success');
  doc.text('• Failure to meet requirements may result in termination');
  doc.text('• All progress is documented and reviewed regularly');
  doc.text('• Support resources are available throughout the process');
  doc.moveDown();
  
  // Footer
  doc.fontSize(10).fillColor('gray');
  doc.text('Performance Improvement Program', { align: 'center' });
  doc.text('Automated PIP Management System', { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  
  // Finalize PDF and wait for completion
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(filePath);
    });
    doc.on('error', reject);
    doc.end();
  });
}

export function generateBulkPerformanceReportPDF(
  employees: any[],
  metrics: any[],
  pips: any[],
  improvementRate: number
): Promise<string> {
  const doc = new PDFDocument();
  const fileName = `Performance_Report_${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, fileName);
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(filePath));
  
  // Header
  doc.fontSize(20).text('PERFORMANCE MANAGEMENT REPORT', { align: 'center' });
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();
  
  // Executive Summary
  doc.fontSize(16).text('Executive Summary', { underline: true });
  doc.fontSize(12);
  doc.text(`Total Employees: ${employees.length}`);
  doc.text(`Active PIPs: ${pips.filter(p => p.status === 'active').length}`);
  doc.text(`Terminated Employees: ${employees.filter(e => e.status === 'terminated').length}`);
  doc.text(`Overall Improvement Rate: ${improvementRate.toFixed(2)}%`);
  doc.moveDown();
  
  // PIP Statistics
  doc.fontSize(16).text('PIP Statistics', { underline: true });
  doc.fontSize(12);
  const activePips = pips.filter(p => p.status === 'active');
  const completedPips = pips.filter(p => p.status === 'completed');
  const terminatedPips = pips.filter(p => p.status === 'terminated');
  
  doc.text(`Active PIPs: ${activePips.length}`);
  doc.text(`Completed Successfully: ${completedPips.length}`);
  doc.text(`Resulted in Termination: ${terminatedPips.length}`);
  doc.text(`Success Rate: ${pips.length > 0 ? (completedPips.length / pips.length * 100).toFixed(2) : 0}%`);
  doc.moveDown();
  
  // Company Distribution (if applicable)
  const companyGroups = employees.reduce((acc: any, emp: any) => {
    const company = emp.companyId || 'Unknown';
    acc[company] = (acc[company] || 0) + 1;
    return acc;
  }, {});
  
  if (Object.keys(companyGroups).length > 1) {
    doc.fontSize(16).text('Company Distribution', { underline: true });
    doc.fontSize(11);
    Object.entries(companyGroups)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([company, count]: any) => {
        doc.text(`${company}: ${count} employees`);
      });
    doc.moveDown();
  }
  
  // Performance Trends
  doc.fontSize(16).text('Performance Trends', { underline: true });
  doc.fontSize(11);
  
  // Calculate average scores
  const avgScore = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length 
    : 0;
  const avgUtilization = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.utilization || 0), 0) / metrics.length
    : 0;
  
  doc.text(`Average Performance Score: ${avgScore.toFixed(2)}%`);
  doc.text(`Average Utilization: ${avgUtilization.toFixed(2)}%`);
  doc.text(`Employees Below Threshold (70%): ${metrics.filter(m => m.score < 70).length}`);
  doc.text(`High Performers (>85%): ${metrics.filter(m => m.score > 85).length}`);
  doc.moveDown();
  
  // Recommendations
  doc.fontSize(16).text('Recommendations', { underline: true });
  doc.fontSize(11);
  doc.text('• Continue monitoring employees on active PIPs');
  doc.text('• Implement additional coaching for below-threshold performers');
  doc.text('• Recognize and retain high performers');
  doc.text('• Review and adjust performance thresholds quarterly');
  doc.text('• Conduct bias analysis on performance metrics');
  
  // Footer
  doc.addPage();
  doc.fontSize(10).fillColor('gray');
  doc.text('Confidential - Performance Management System', { align: 'center' });
  doc.text('This report contains sensitive employee information', { align: 'center' });
  
  // Finalize PDF and wait for completion
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(filePath);
    });
    doc.on('error', reject);
    doc.end();
  });
}