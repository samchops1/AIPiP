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
  const doc = new PDFDocument({ margin: 50 });
  const fileName = `PIP_${employee.id}_${Date.now()}.pdf`;
  const filePath = path.join(pdfDir, fileName);
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(filePath));
  
  // Company Letterhead
  doc.fillColor('#000000');
  doc.fontSize(24).text('PERFORMANCE IMPROVEMENT PLAN', { align: 'center' });
  doc.fontSize(12).fillColor('#666666').text('Official Documentation - Confidential', { align: 'center' });
  doc.moveDown(2);
  
  // Document Information Box
  doc.rect(50, doc.y, 500, 80).stroke();
  const boxStartY = doc.y + 10;
  doc.fontSize(10).fillColor('#000000');
  doc.text(`Document ID: PIP-${pip.id}`, 60, boxStartY);
  doc.text(`Issue Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 60, boxStartY + 15);
  doc.text(`Effective Period: ${pip.startDate} to ${pip.endDate}`, 60, boxStartY + 30);
  doc.text(`Review Period: ${pip.gracePeriodDays} days`, 60, boxStartY + 45);
  doc.text(`Status: ${pip.status.toUpperCase()}`, 300, boxStartY);
  doc.text(`Progress: ${pip.progress || 0}%`, 300, boxStartY + 15);
  const daysRemaining = Math.max(0, Math.ceil((new Date(pip.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  doc.text(`Days Remaining: ${daysRemaining}`, 300, boxStartY + 30);
  doc.y += 100;
  
  // Employee Information Section
  doc.fontSize(16).fillColor('#1a365d').text('I. EMPLOYEE INFORMATION', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#000000');
  
  const empInfoTable = [
    ['Employee Name:', employee.name],
    ['Employee ID:', employee.id],
    ['Department:', employee.department || 'General Operations'],
    ['Position/Title:', employee.role || 'Team Member'],
    ['Company:', employee.companyId || 'Organization'],
    ['Direct Supervisor:', 'Performance Management Team'],
    ['HR Representative:', 'Automated HR System']
  ];
  
  empInfoTable.forEach(([label, value]) => {
    doc.text(label, 50, doc.y, { width: 150, continued: true });
    doc.text(value, 200, doc.y);
    doc.moveDown(0.3);
  });
  doc.moveDown();
  
  // Performance Analysis Section
  doc.fontSize(16).fillColor('#1a365d').text('II. PERFORMANCE ANALYSIS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#000000');
  
  const currentScore = pip.currentScore || pip.initialScore || 65;
  const targetScore = (pip.initialScore || 70) + (pip.improvementRequired || 15);
  const improvementNeeded = targetScore - currentScore;
  
  doc.text(`Current Performance Score: ${currentScore}% (Below Acceptable Threshold)`, { indent: 20 });
  doc.text(`Initial Baseline Score: ${pip.initialScore || currentScore}%`, { indent: 20 });
  doc.text(`Required Performance Target: ${targetScore}%`, { indent: 20 });
  doc.text(`Improvement Required: ${improvementNeeded}%`, { indent: 20 });
  
  if (pip.initialScore && pip.currentScore && pip.currentScore > pip.initialScore) {
    const improvementRate = ((pip.currentScore - pip.initialScore) / pip.initialScore * 100).toFixed(2);
    doc.text(`Current Improvement Rate: +${improvementRate}%`, { indent: 20 });
  }
  doc.moveDown();
  
  // Performance Deficiencies
  doc.fontSize(14).fillColor('#d32f2f').text('Identified Performance Deficiencies:', { underline: true });
  doc.fontSize(11).fillColor('#000000');
  const deficiencies = [
    'Consistent performance below company standards (70% minimum)',
    'Insufficient task completion rate and quality metrics',
    'Limited progress in skill development and competency areas',
    'Need for improved time management and productivity'
  ];
  
  deficiencies.forEach(deficiency => {
    doc.text(`• ${deficiency}`, { indent: 25 });
  });
  doc.moveDown();
  
  // Goals and Objectives Section
  doc.fontSize(16).fillColor('#1a365d').text('III. PERFORMANCE IMPROVEMENT OBJECTIVES', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#000000');
  
  const objectives = pip.goals && Array.isArray(pip.goals) ? pip.goals : [
    `Achieve and maintain a performance score of ${targetScore}% or higher`,
    'Complete all assigned tasks within established deadlines',
    'Demonstrate consistent quality improvement in work output',
    'Actively participate in coaching sessions and skill development',
    'Show measurable progress in identified competency gaps'
  ];
  
  objectives.forEach((goal: string, index: number) => {
    doc.fontSize(12).text(`${index + 1}. ${goal}`, { indent: 20 });
    doc.fontSize(10).fillColor('#666666');
    doc.text(`   Timeline: Ongoing throughout PIP period`, { indent: 25 });
    doc.text(`   Measurement: Weekly performance reviews and metrics`, { indent: 25 });
    doc.fillColor('#000000');
    doc.moveDown(0.3);
  });
  doc.moveDown();
  
  // Support and Resources Section
  doc.fontSize(16).fillColor('#1a365d').text('IV. SUPPORT PLAN & RESOURCES', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#000000');
  
  const supportPlan = pip.coachingPlan || 'The employee will receive comprehensive support including regular coaching sessions, skill development resources, and performance feedback to facilitate improvement.';
  
  doc.text('Coaching and Development Plan:', { underline: true });
  doc.fontSize(11).text(supportPlan, { align: 'justify', indent: 20 });
  doc.moveDown();
  
  doc.fontSize(12).text('Additional Support Resources:', { underline: true });
  doc.fontSize(11);
  const resources = [
    'Weekly one-on-one coaching sessions with performance specialist',
    'Access to professional development training materials',
    'Skill assessment and personalized improvement recommendations',
    'Regular feedback and progress monitoring',
    'Peer mentoring and best practice sharing opportunities'
  ];
  
  resources.forEach(resource => {
    doc.text(`• ${resource}`, { indent: 25 });
  });
  doc.moveDown();
  
  // Success Criteria and Measurement
  doc.fontSize(16).fillColor('#1a365d').text('V. SUCCESS CRITERIA & MEASUREMENT', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#000000');
  
  doc.text('Quantitative Measures:', { underline: true });
  doc.fontSize(11);
  doc.text(`• Achieve performance score of ${targetScore}% or higher`, { indent: 25 });
  doc.text('• Maintain consistent performance for minimum 2 weeks', { indent: 25 });
  doc.text('• Complete 100% of assigned tasks within deadlines', { indent: 25 });
  doc.text('• Show measurable improvement in quality metrics', { indent: 25 });
  doc.moveDown(0.5);
  
  doc.fontSize(12).text('Qualitative Measures:', { underline: true });
  doc.fontSize(11);
  doc.text('• Demonstrate improved initiative and problem-solving', { indent: 25 });
  doc.text('• Show active engagement in coaching and development', { indent: 25 });
  doc.text('• Display positive attitude toward feedback and improvement', { indent: 25 });
  doc.text('• Collaborate effectively with team members and supervisors', { indent: 25 });
  doc.moveDown();
  
  // New page for consequences and signatures
  doc.addPage();
  
  // Consequences Section
  doc.fontSize(16).fillColor('#d32f2f').text('VI. CONSEQUENCES OF NON-COMPLIANCE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#000000');
  
  doc.text('Failure to meet the objectives outlined in this Performance Improvement Plan may result in:', { align: 'justify' });
  doc.moveDown(0.3);
  doc.fontSize(11);
  doc.text('• Extension of the PIP period with modified objectives', { indent: 25 });
  doc.text('• Transfer to a different role more suited to current skill level', { indent: 25 });
  doc.text('• Demotion with corresponding adjustment to compensation', { indent: 25 });
  doc.text('• Termination of employment in accordance with company policy', { indent: 25 });
  doc.moveDown();
  
  doc.fontSize(12).fillColor('#d32f2f');
  doc.text('IMPORTANT:', { underline: true });
  doc.fontSize(11).fillColor('#000000');
  doc.text('This Performance Improvement Plan is not disciplinary action but rather a supportive tool designed to help you succeed. However, it is a formal document that becomes part of your employment record. Your commitment to this process is essential for a successful outcome.', { align: 'justify' });
  doc.moveDown();
  
  // Review Schedule
  doc.fontSize(16).fillColor('#1a365d').text('VII. REVIEW SCHEDULE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#000000');
  
  const reviewDates = [];
  const startDate = new Date(pip.startDate);
  const endDate = new Date(pip.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const reviewInterval = Math.floor(totalDays / 4);
  
  for (let i = 1; i <= 4; i++) {
    const reviewDate = new Date(startDate);
    reviewDate.setDate(startDate.getDate() + (reviewInterval * i));
    reviewDates.push(reviewDate.toLocaleDateString('en-US'));
  }
  
  doc.text('Scheduled Review Meetings:', { underline: true });
  reviewDates.forEach((date, index) => {
    doc.text(`Week ${(index + 1) * (totalDays / 28)}: ${date}`, { indent: 25 });
  });
  doc.text(`Final Review: ${endDate.toLocaleDateString('en-US')} (PIP Conclusion)`, { indent: 25 });
  doc.moveDown();
  
  // Acknowledgment Section
  doc.fontSize(16).fillColor('#1a365d').text('VIII. ACKNOWLEDGMENT', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#000000');
  
  doc.text('By proceeding with this Performance Improvement Plan, all parties acknowledge:', { align: 'justify' });
  doc.text('• The employee has received and understands this PIP document', { indent: 20 });
  doc.text('• The objectives and timeline have been clearly communicated', { indent: 20 });
  doc.text('• Support resources and coaching will be made available', { indent: 20 });
  doc.text('• Regular progress reviews will be conducted as scheduled', { indent: 20 });
  doc.text('• This process is designed to support employee success', { indent: 20 });
  doc.moveDown();
  
  // Signature Block
  doc.rect(50, doc.y + 20, 500, 120).stroke();
  doc.fontSize(12).text('SIGNATURES', 250, doc.y + 30, { align: 'center' });
  
  const sigY = doc.y + 60;
  doc.text('Employee: _________________________ Date: _________', 60, sigY);
  doc.text('HR Representative: _________________________ Date: _________', 60, sigY + 25);
  doc.text('Direct Supervisor: _________________________ Date: _________', 60, sigY + 50);
  
  // Footer
  doc.fontSize(8).fillColor('#666666');
  doc.text(`Document Generated: ${new Date().toLocaleString()}`, 50, doc.page.height - 50);
  doc.text('Performance Improvement Plan - Confidential HR Document', 50, doc.page.height - 35);
  doc.text(`Page 2 of 2 | PIP ID: ${pip.id}`, 400, doc.page.height - 35);
  
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