import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  UserCheck, 
  ClipboardList, 
  ListChecks, 
  CheckCircle, 
  Play, 
  TrendingUp,
  ArrowRight,
  Stethoscope,
  Users,
  Heart,
  Activity,
  Sparkles,
  Zap,
  Target,
  Shield,
  Clock,
  Award,
  Star
} from "lucide-react";

// Cohesive color palette: Blue (primary), Teal (secondary), Amber (tertiary)
const workflowSteps = [
  {
    id: 1,
    title: "Smart Intake",
    description: "AI extracts conditions, needs, and goals from voice, WhatsApp, or forms.",
    output: "Patient Profile + Goals",
    icon: Brain,
    color: "bg-blue-100 text-blue-700",
    borderColor: "border-blue-200",
    gradient: "from-blue-50 to-blue-100/50",
  },
  {
    id: 2,
    title: "Coordinator Activation",
    description: "Review case, discovery session, and priority confirmation with family.",
    output: "Activated Case",
    icon: UserCheck,
    color: "bg-teal-100 text-teal-700",
    borderColor: "border-teal-200",
    gradient: "from-teal-50 to-teal-100/50",
  },
  {
    id: 3,
    title: "Care Plan Creation",
    description: "AI generates draft; Coordinator finalizes. Budget covers Clinical, Daily Living, and Equipment.",
    output: "Structured Care Plan",
    icon: ClipboardList,
    color: "bg-blue-100 text-blue-700",
    borderColor: "border-blue-200",
    gradient: "from-blue-50 to-blue-100/50",
  },
  {
    id: 4,
    title: "Task Engine",
    description: "Plans converted to tasks with Category, Frequency, Role, and Status.",
    output: "Task List",
    icon: ListChecks,
    color: "bg-teal-100 text-teal-700",
    borderColor: "border-teal-200",
    gradient: "from-teal-50 to-teal-100/50",
  },
  {
    id: 5,
    title: "Approval",
    description: "Family reviews and coordinator locks the plan.",
    output: "Approved Plan",
    icon: CheckCircle,
    color: "bg-amber-100 text-amber-700",
    borderColor: "border-amber-200",
    gradient: "from-amber-50 to-amber-100/50",
  },
  {
    id: 6,
    title: "Execution",
    description: "Tasks assigned; bookings confirmed; providers and helpers execute visits/tasks.",
    output: "Active Care",
    icon: Play,
    color: "bg-blue-100 text-blue-700",
    borderColor: "border-blue-200",
    gradient: "from-blue-50 to-blue-100/50",
  },
  {
    id: 7,
    title: "Monitoring",
    description: "Completion tracking, outcome logging, and dynamic plan updates.",
    output: "Optimized Care",
    icon: TrendingUp,
    color: "bg-teal-100 text-teal-700",
    borderColor: "border-teal-200",
    gradient: "from-teal-50 to-teal-100/50",
  },
];

const userRoles = [
  {
    title: "Care Seeker (Family)",
    icon: Heart,
    color: "text-pink-600",
    bg: "bg-pink-50",
    border: "border-pink-200",
    tasks: [
      "Upload medical data",
      "Approve care plans",
      "Track daily progress",
      "Communicate with system",
    ],
  },
  {
    title: "Coordinator",
    icon: Target,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    tasks: [
      "Builds care plans",
      "Defines tasks",
      "Assigns providers",
      "Monitors execution",
      "Adjusts plans dynamically",
    ],
  },
  {
    title: "Healthcare Provider",
    icon: Activity,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    tasks: [
      "Accept bookings",
      "Execute visits",
      "Submit clinical reports",
      "Track assigned tasks",
    ],
  },
  {
    title: "Support Worker",
    icon: Users,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    tasks: [
      "Executes simple home tasks",
      "Follows guided instructions",
      "Uses training videos",
      "Reports completion",
    ],
  },
];

const metrics = [
  { label: "Active Patients", value: "150+", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Care Plans", value: "320+", icon: ClipboardList, color: "text-green-600", bg: "bg-green-50" },
  { label: "Completed Tasks", value: "12K+", icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-50" },
  { label: "Provider Rating", value: "4.8", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
];

export default function CoordinatorWorkflowPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4 py-8">
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-sm px-4 py-1.5 font-semibold">
          <Sparkles className="w-3 h-3 mr-1 inline" />
          Coordinator Model v1.0
        </Badge>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
          Raiyah Plus — Care Coordination Platform
        </h1>
        <p className="text-xl text-slate-900 max-w-3xl mx-auto leading-relaxed">
          We don&apos;t connect services — we <span className="font-semibold text-blue-700">orchestrate care execution</span>.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link to="/demo/coordinator/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors transition-transform transition-shadow duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Zap className="w-4 h-4" />
            Launch Coordinator Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/demo/coordinator/careseeker"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 transition-colors transition-transform transition-shadow duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Heart className="w-4 h-4" />
            View as Care Seeker
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="hover:shadow-lg hover:-translate-y-1 transition-colors transition-transform transition-shadow duration-300">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${metric.bg} rounded-lg flex items-center justify-center`}>
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                  <p className="text-xs text-slate-600 font-medium">{metric.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Core Principle: The System Truth</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="px-3 py-1.5 bg-white/10 rounded-full font-semibold">Task</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 bg-white/10 rounded-full font-semibold">Assigned</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 bg-white/10 rounded-full font-semibold">Executed</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 bg-white/10 rounded-full font-semibold">Tracked</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="px-3 py-1.5 bg-blue-500/30 rounded-full font-semibold">Verified</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">End-to-End Workflow</h2>
        </div>
        <div className="grid gap-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.id}
                className={`${step.borderColor} border-2 hover:shadow-lg hover:-translate-y-0.5 transition-colors transition-transform transition-shadow duration-300 bg-gradient-to-r ${step.gradient}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 ${step.color} rounded-xl flex items-center justify-center shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900">
                          STEP {step.id}
                        </span>
                        {index < workflowSteps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-900" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-900 mb-2 leading-relaxed">
                        {step.description}
                      </p>
                      <Badge variant="outline" className="text-xs font-semibold bg-blue-50/80 text-blue-700 border-blue-200">
                        Output: {step.output}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">System Users</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {userRoles.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.title} className={`hover:shadow-lg hover:-translate-y-1 transition-colors transition-transform transition-shadow duration-300 border-2 ${role.border}`}>
                  <CardHeader className={`${role.bg} rounded-t-lg border-b ${role.border}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${role.color}`} />
                      <CardTitle className="text-sm text-slate-900">{role.title}</CardTitle>
                    </div>
                  </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {role.tasks.map((task) => (
                      <li key={task} className="flex items-start gap-2 text-sm text-slate-900">
                        <div className={`w-1.5 h-1.5 rounded-full ${role.color} mt-1.5 flex-shrink-0`} />
                        {task}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Award className="w-5 h-5 text-blue-600" />
          <p className="text-slate-900 mb-0 font-semibold">
            Explore the demo from different user perspectives:
          </p>
        </div>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link to="/demo/coordinator/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors transition-transform transition-shadow duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Coordinator Dashboard
          </Link>
          <Link to="/demo/coordinator/careseeker"
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors transition-transform transition-shadow duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            Care Seeker View
          </Link>
          <Link to="/demo/coordinator/provider"
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors transition-transform transition-shadow duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            Provider View
          </Link>
          <Link to="/demo/coordinator/helper"
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors transition-transform transition-shadow duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            Helper View
          </Link>
        </div>
      </div>
    </div>
  );
}
