export interface DemoPatient {
  id: string;
  name: string;
  age: number;
  condition: string;
  avatar: string;
  medicalData: string[];
  goals: string[];
  priority: "high" | "medium" | "low";
  status: "intake" | "active" | "completed";
}

export interface DemoTask {
  id: string;
  title: string;
  description: string;
  category: "clinical" | "daily_living" | "equipment";
  frequency: "daily" | "weekly" | "monthly" | "once";
  role: "helper" | "specialist" | "family";
  status: "pending" | "assigned" | "in_progress" | "completed";
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  notes?: string;
}

export interface DemoCarePlan {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  clinicalBudget: number;
  dailyLivingBudget: number;
  equipmentBudget: number;
  totalBudget: number;
  status: "draft" | "pending_approval" | "approved" | "active" | "completed";
  tasks: DemoTask[];
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface DemoProvider {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatar: string;
  rating: number;
  availability: string[];
  hourlyRate: number;
}

export interface DemoProgress {
  date: string;
  completedTasks: number;
  totalTasks: number;
  notes: string;
  outcomes: string[];
}
