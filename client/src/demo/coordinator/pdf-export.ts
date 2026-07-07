import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { mockPatients, mockCarePlans, mockProviders, mockProgress } from "./data";

export function exportCoordinatorReport() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  const addHeader = () => {
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Raiyah Plus — Coordinator Report", 14, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 80, 10);
  };

  const addSectionTitle = (title: string) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, currentY);
    currentY += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;
  };

  const addText = (text: string, fontSize = 10, isBold = false) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const splitText = doc.splitTextToSize(text, pageWidth - 28);
    doc.text(splitText, 14, currentY);
    currentY += splitText.length * 5 + 3;
  };

  addHeader();

  addSectionTitle("Executive Summary");
  addText(`Total Patients: ${mockPatients.length}`);
  addText(`Active Care Plans: ${mockCarePlans.filter((p) => p.status === "active").length}`);
  addText(`Total Tasks: ${mockCarePlans.reduce((acc, p) => acc + p.tasks.length, 0)}`);
  addText(`Available Providers: ${mockProviders.length}`);
  const totalTasks = mockCarePlans.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = mockCarePlans.reduce((acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length, 0);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  addText(`Completion Rate: ${completionRate}%`);

  addSectionTitle("Patient Profiles");
  mockPatients.forEach((patient) => {
    addText(`${patient.name} (Age: ${patient.age})`, 11, true);
    addText(`Condition: ${patient.condition}`);
    addText(`Priority: ${patient.priority.toUpperCase()}`);
    addText(`Status: ${patient.status}`);
    addText(`Goals: ${patient.goals.join(", ")}`);
    addText(`Medical Data: ${patient.medicalData.join("; ")}`);
    currentY += 5;
  });

  addSectionTitle("Care Plans Overview");
  mockCarePlans.forEach((plan) => {
    const patient = mockPatients.find((p) => p.id === plan.patientId);
    addText(`${plan.title} — ${patient?.name || "Unknown"}`, 11, true);
    addText(`Status: ${plan.status} | Budget: ${plan.totalBudget.toLocaleString()} SAR (Clinical: ${plan.clinicalBudget}, Daily Living: ${plan.dailyLivingBudget}, Equipment: ${plan.equipmentBudget})`);
    addText(`Tasks: ${plan.tasks.length} total (${plan.tasks.filter((t) => t.status === "completed").length} completed, ${plan.tasks.filter((t) => t.status === "pending").length} pending)`);
    currentY += 5;
  });

  addSectionTitle("Task Details");
  mockCarePlans.forEach((plan) => {
    plan.tasks.forEach((task) => {
      addText(`${task.title} [${task.status.toUpperCase()}]`, 10, true);
      addText(`Plan: ${plan.title} | Category: ${task.category} | Frequency: ${task.frequency} | Role: ${task.role}`);
      addText(`Description: ${task.description}`);
      if (task.assignedTo) addText(`Assigned to: ${task.assignedTo}`);
      if (task.completedAt) addText(`Completed: ${new Date(task.completedAt).toLocaleString()}`);
      currentY += 3;
    });
  });

  addSectionTitle("Provider Directory");
  mockProviders.forEach((provider) => {
    addText(`${provider.name} — ${provider.role}`, 11, true);
    addText(`Specialty: ${provider.specialty} | Rating: ${provider.rating}/5.0 | Rate: ${provider.hourlyRate} SAR/hr`);
    addText(`Availability: ${provider.availability.join(", ")}`);
    currentY += 5;
  });

  addSectionTitle("Progress Tracking");
  mockProgress.forEach((day) => {
    addText(`${new Date(day.date).toLocaleDateString()} — ${day.completedTasks}/${day.totalTasks} tasks completed`, 10, true);
    addText(`Notes: ${day.notes}`);
    if (day.outcomes.length > 0) addText(`Outcomes: ${day.outcomes.join("; ")}`);
    currentY += 3;
  });

  addSectionTitle("System Overview");
  addText("Raiyah Plus — Care Coordination & Execution Platform", 11, true);
  addText("Core Principle: Task → Assigned → Executed → Tracked → Verified");
  addText("This report contains all coordinator data for demo purposes.");

  doc.save("raiyah-plus-coordinator-report.pdf");
}

export function exportCarePlanPDF(planId: string) {
  const plan = mockCarePlans.find((p) => p.id === planId);
  if (!plan) return;

  const patient = mockPatients.find((p) => p.id === plan.patientId);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Care Plan Report", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 80, 12);

  currentY = 30;

  const addSection = (title: string) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, currentY);
    currentY += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;
  };

  const addText = (text: string, bold = false, indent = 0) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const splitText = doc.splitTextToSize(text, pageWidth - 28 - indent);
    doc.text(splitText, 14 + indent, currentY);
    currentY += splitText.length * 5 + 3;
  };

  addSection("Patient Information");
  addText(`Name: ${patient?.name || "N/A"}`, true);
  addText(`Age: ${patient?.age || "N/A"}`);
  addText(`Condition: ${patient?.condition || "N/A"}`);
  addText(`Priority: ${patient?.priority?.toUpperCase() || "N/A"}`);

  addSection("Plan Details");
  addText(`Title: ${plan.title}`, true);
  addText(`Status: ${plan.status.toUpperCase()}`);
  addText(`Created: ${plan.createdAt}`);
  if (plan.approvedAt) addText(`Approved: ${plan.approvedAt} by ${plan.approvedBy}`);

  addSection("Budget Breakdown");
  addText(`Clinical: ${plan.clinicalBudget.toLocaleString()} SAR`, true);
  addText(`Daily Living: ${plan.dailyLivingBudget.toLocaleString()} SAR`, true);
  addText(`Equipment: ${plan.equipmentBudget.toLocaleString()} SAR`, true);
  addText(`Total Budget: ${plan.totalBudget.toLocaleString()} SAR`, true);

  addSection("Task List");
  plan.tasks.forEach((task) => {
    addText(`${task.title} [${task.status.toUpperCase()}]`, true);
    addText(`Category: ${task.category} | Frequency: ${task.frequency} | Role: ${task.role}`, false, 5);
    addText(`Description: ${task.description}`, false, 5);
    if (task.assignedTo) addText(`Assigned: ${task.assignedTo}`, false, 5);
    if (task.completedAt) addText(`Completed: ${new Date(task.completedAt).toLocaleString()}`, false, 5);
    currentY += 3;
  });

  addSection("Summary");
  const completed = plan.tasks.filter((t) => t.status === "completed").length;
  const total = plan.tasks.length;
  addText(`Progress: ${completed}/${total} tasks completed (${Math.round((completed / total) * 100)}%)`, true);

  doc.save(`care-plan-${plan.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function exportProviderSchedule(providerName: string) {
  const provider = mockProviders.find((p) => p.name === providerName);
  if (!provider) return;

  const tasks = mockCarePlans.flatMap((plan) =>
    plan.tasks.filter((task) => task.assignedTo === providerName)
  );

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Provider Schedule: ${provider.name}`, 14, 11);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 70, 11);

  currentY = 28;

  const addSection = (title: string) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, currentY);
    currentY += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;
  };

  const addText = (text: string, bold = false) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const splitText = doc.splitTextToSize(text, pageWidth - 28);
    doc.text(splitText, 14, currentY);
    currentY += splitText.length * 5 + 3;
  };

  addSection("Provider Information");
  addText(`Name: ${provider.name}`, true);
  addText(`Role: ${provider.role}`);
  addText(`Specialty: ${provider.specialty}`);
  addText(`Rating: ${provider.rating}/5.0`);
  addText(`Hourly Rate: ${provider.hourlyRate} SAR`);
  addText(`Availability: ${provider.availability.join(", ")}`);

  addSection("Assigned Tasks");
  if (tasks.length === 0) {
    addText("No tasks currently assigned.");
  } else {
    tasks.forEach((task) => {
      const plan = mockCarePlans.find((p) => p.tasks.some((t) => t.id === task.id));
      addText(`${task.title} [${task.status.toUpperCase()}]`, true);
      addText(`Plan: ${plan?.title || "N/A"}`);
      addText(`Category: ${task.category} | Frequency: ${task.frequency}`);
      addText(`Description: ${task.description}`);
      if (task.dueDate) addText(`Due: ${task.dueDate}`);
      if (task.completedAt) addText(`Completed: ${new Date(task.completedAt).toLocaleString()}`);
      currentY += 3;
    });
  }

  addSection("Performance Summary");
  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  addText(`Total Tasks: ${total}`, true);
  addText(`Completed: ${completed}`, true);
  addText(`Pending: ${tasks.filter((t) => t.status === "pending" || t.status === "assigned").length}`, true);
  addText(`Completion Rate: ${total > 0 ? Math.round((completed / total) * 100) : 0}%`, true);

  doc.save(`provider-schedule-${provider.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export function exportPatientProgress(patientId: string) {
  const patient = mockPatients.find((p) => p.id === patientId);
  if (!patient) return;

  const plans = mockCarePlans.filter((p) => p.patientId === patientId);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Patient Progress: ${patient.name}`, 14, 11);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 70, 11);

  currentY = 28;

  const addSection = (title: string) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(139, 92, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, currentY);
    currentY += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;
  };

  const addText = (text: string, bold = false) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const splitText = doc.splitTextToSize(text, pageWidth - 28);
    doc.text(splitText, 14, currentY);
    currentY += splitText.length * 5 + 3;
  };

  addSection("Patient Information");
  addText(`Name: ${patient.name}`, true);
  addText(`Age: ${patient.age}`);
  addText(`Condition: ${patient.condition}`);
  addText(`Priority: ${patient.priority.toUpperCase()}`);
  addText(`Goals: ${patient.goals.join("; ")}`);

  addSection("Medical History");
  patient.medicalData.forEach((data) => {
    addText(`• ${data}`);
  });

  addSection("Care Plans");
  plans.forEach((plan) => {
    addText(plan.title, true);
    addText(`Status: ${plan.status} | Budget: ${plan.totalBudget.toLocaleString()} SAR`);
    const completed = plan.tasks.filter((t) => t.status === "completed").length;
    addText(`Progress: ${completed}/${plan.tasks.length} tasks (${Math.round((completed / plan.tasks.length) * 100)}%)`);
    currentY += 3;
  });

  addSection("Daily Progress");
  mockProgress.forEach((day) => {
    addText(`${new Date(day.date).toLocaleDateString()}: ${day.completedTasks}/${day.totalTasks} tasks`, true);
    addText(`Notes: ${day.notes}`);
    if (day.outcomes.length > 0) {
      addText(`Outcomes: ${day.outcomes.join("; ")}`);
    }
    currentY += 3;
  });

  doc.save(`patient-progress-${patient.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
