"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockPatients, mockCarePlans } from "@/demo/coordinator/data";
import { TabNav } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import {
  Stethoscope,
  FileText,
  CheckCircle,
  Clock,
  Calendar,
  UserCheck,
  Activity,
  Heart,
  Thermometer,
  Weight,
  Ruler,
  ArrowRight,
  Send,
  Download,
  AlertCircle,
  ClipboardList,
  Save,
} from "lucide-react";

interface VisitReport {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  provider: string;
  visitType: string;
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    respiratoryRate: string;
    oxygenSaturation: string;
    weight: string;
    height: string;
  };
  assessment: string;
  plan: string[];
  medications: string[];
  followUp: string;
  notes: string;
  status: "draft" | "submitted" | "reviewed";
}

interface ReportFormState {
  visitDate?: string;
  visitType?: string;
  chiefComplaint?: string;
  symptoms?: string[];
  vitalSigns?: Record<string, string>;
  assessment?: string;
  plan?: string[];
  medications?: string[];
  followUp?: string;
  notes?: string;
}

export default function VisitReportingPage() {
  const [activeTab, setActiveTab] = useState("new");
  const [selectedPatient, setSelectedPatient] = useState(mockPatients[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [report, setReport] = useState<ReportFormState>({
    visitDate: new Date().toISOString().split("T")[0],
    visitType: "Routine Check",
    vitalSigns: {
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      weight: "",
      height: "",
    },
    symptoms: [],
    plan: [],
    medications: [],
  });

  const symptomInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const medInputRef = useRef<HTMLInputElement>(null);

  const [submittedReports, setSubmittedReports] = useState<VisitReport[]>([
    {
      id: "rpt-001",
      patientId: "pat-001",
      patientName: "Ahmad Al-Rashid",
      visitDate: "2026-06-01",
      provider: "Dr. Sarah Johnson",
      visitType: "Routine Check",
      chiefComplaint: "Follow-up for diabetes management",
      symptoms: ["Fatigue", "Mild headache", "Increased thirst"],
      vitalSigns: {
        bloodPressure: "135/85",
        heartRate: "78",
        temperature: "36.8",
        respiratoryRate: "16",
        oxygenSaturation: "98",
        weight: "78",
        height: "175",
      },
      assessment: "Diabetes mellitus type 2 - well controlled. HbA1c improved from 8.5% to 7.2%. Continue current management plan.",
      plan: ["Continue Metformin 500mg twice daily", "Maintain diet and exercise regimen", "Monitor blood glucose daily", "Follow-up in 3 months"],
      medications: ["Metformin 500mg", "Lisinopril 10mg", "Atorvastatin 20mg"],
      followUp: "3 months",
      notes: "Patient compliant with medication. Reports improved energy levels. Diet adherence good.",
      status: "submitted",
    },
    {
      id: "rpt-002",
      patientId: "pat-002",
      patientName: "Fatima Al-Saud",
      visitDate: "2026-06-03",
      provider: "Nurse Ahmed",
      visitType: "Physiotherapy",
      chiefComplaint: "Knee pain after surgery",
      symptoms: ["Pain on movement", "Swelling", "Limited range of motion"],
      vitalSigns: {
        bloodPressure: "128/82",
        heartRate: "72",
        temperature: "36.5",
        respiratoryRate: "14",
        oxygenSaturation: "99",
        weight: "65",
        height: "160",
      },
      assessment: "Post-operative knee replacement - recovering well. Swelling reduced. Range of motion improving.",
      plan: ["Continue physiotherapy exercises", "Ice therapy twice daily", "Gradual weight bearing", "Pain management as needed"],
      medications: ["Ibuprofen 400mg", "Paracetamol 500mg"],
      followUp: "1 week",
      notes: "Patient making good progress. Pain score decreased from 7/10 to 4/10. Motivated and compliant.",
      status: "reviewed",
    },
  ]);

  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    const errors: string[] = [];
    if (!report.chiefComplaint?.trim()) errors.push("Chief complaint is required");
    if (!report.assessment?.trim()) errors.push("Clinical assessment is required");
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);
    setIsSubmitting(true);
    setTimeout(() => {
      const newReport: VisitReport = {
        id: `rpt-${Date.now()}`,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        visitDate: report.visitDate || new Date().toISOString().split("T")[0],
        provider: "Dr. Sarah Johnson",
        visitType: report.visitType || "Routine Check",
        chiefComplaint: report.chiefComplaint || "",
        symptoms: report.symptoms || [],
        vitalSigns: (report.vitalSigns as VisitReport["vitalSigns"]) || {
          bloodPressure: "",
          heartRate: "",
          temperature: "",
          respiratoryRate: "",
          oxygenSaturation: "",
          weight: "",
          height: "",
        },
        assessment: report.assessment || "",
        plan: report.plan || [],
        medications: report.medications || [],
        followUp: report.followUp || "",
        notes: report.notes || "",
        status: "submitted",
      };
      
      setSubmittedReports((prev) => [newReport, ...prev]);
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      setReport({
        visitDate: new Date().toISOString().split("T")[0],
        visitType: "Routine Check",
        vitalSigns: {
          bloodPressure: "",
          heartRate: "",
          temperature: "",
          respiratoryRate: "",
          oxygenSaturation: "",
          weight: "",
          height: "",
        },
        symptoms: [],
        plan: [],
        medications: [],
      });
    }, 2000);
  };

  const addSymptom = (symptom: string) => {
    if (!symptom.trim()) return;
    setReport((prev) => ({
      ...prev,
      symptoms: [...(prev.symptoms || []), symptom],
    }));
  };

  const addPlan = (plan: string) => {
    if (!plan.trim()) return;
    setReport((prev) => ({
      ...prev,
      plan: [...(prev.plan || []), plan],
    }));
  };

  const addMedication = (med: string) => {
    if (!med.trim()) return;
    setReport((prev) => ({
      ...prev,
      medications: [...(prev.medications || []), med],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Visit Reporting</h1>
          <p className="text-slate-600 mt-1">Submit clinical reports and structured visit notes</p>
        </div>
        <Badge className="bg-green-100 text-green-800 px-3 py-1.5 font-semibold w-fit">
          <Stethoscope className="w-3 h-3 mr-1" />
          Clinical
        </Badge>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Report Submitted Successfully</p>
            <p className="text-sm text-green-700">The visit report has been saved and sent to the coordinator.</p>
          </div>
        </div>
      )}

      <TabNav
        tabs={[
          { id: "new", label: "New Report" },
          { id: "history", label: "Report History" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      {activeTab === "new" && formErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert" aria-live="assertive">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="font-semibold text-red-800">Please fix the following errors:</p>
          </div>
          <ul className="list-disc list-inside text-sm text-red-700">
            {formErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === "new" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <UserCheck className="w-5 h-5 text-green-600" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
                  <select
                    value={selectedPatient.id}
                    onChange={(e) => {
                      const patient = mockPatients.find((p) => p.id === e.target.value);
                      if (patient) setSelectedPatient(patient);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {mockPatients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={report.visitDate}
                    onChange={(e) => setReport((prev) => ({ ...prev, visitDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type</label>
                  <select
                    value={report.visitType}
                    onChange={(e) => setReport((prev) => ({ ...prev, visitType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option>Routine Check</option>
                    <option>Follow-up</option>
                    <option>Emergency</option>
                    <option>Physiotherapy</option>
                    <option>Medication Review</option>
                    <option>Post-operative</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Activity className="w-5 h-5 text-green-600" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: "Blood Pressure", key: "bloodPressure", unit: "mmHg", icon: Heart },
                  { label: "Heart Rate", key: "heartRate", unit: "bpm", icon: Heart },
                  { label: "Temperature", key: "temperature", unit: "°C", icon: Thermometer },
                  { label: "Respiratory Rate", key: "respiratoryRate", unit: "/min", icon: Activity },
                  { label: "O2 Saturation", key: "oxygenSaturation", unit: "%", icon: Activity },
                  { label: "Weight", key: "weight", unit: "kg", icon: Weight },
                  { label: "Height", key: "height", unit: "cm", icon: Ruler },
                ].map((vital) => (
                  <div key={vital.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <vital.icon className="w-3 h-3" />
                      {vital.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={report.vitalSigns?.[vital.key as keyof typeof report.vitalSigns] || ""}
                        onChange={(e) =>
                          setReport((prev) => ({
                            ...prev,
                            vitalSigns: {
                              ...(prev.vitalSigns || {}),
                              [vital.key]: e.target.value,
                            },
                          }))
                        }
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder={`Enter ${vital.label}`}
                      />
                      <span className="text-xs text-slate-500 w-12">{vital.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <AlertCircle className="w-5 h-5 text-green-600" />
                Symptoms & Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chief Complaint</label>
                <textarea
                  value={report.chiefComplaint || ""}
                  onChange={(e) => setReport((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-20"
                  placeholder="Describe the main reason for the visit"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Symptoms</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    ref={symptomInputRef}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Add symptom (e.g., Headache, Fever)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addSymptom((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = symptomInputRef.current;
                      if (input) {
                        addSymptom(input.value);
                        input.value = "";
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.symptoms?.map((symptom, i) => (
                    <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Assessment</label>
                <textarea
                  value={report.assessment || ""}
                  onChange={(e) => setReport((prev) => ({ ...prev, assessment: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-24"
                  placeholder="Provide clinical assessment and findings"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ClipboardList className="w-5 h-5 text-green-600" />
                Treatment Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Items</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    ref={planInputRef}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Add plan item (e.g., Continue medication, Schedule follow-up)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addPlan((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = planInputRef.current;
                      if (input) {
                        addPlan(input.value);
                        input.value = "";
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add
                  </Button>
                </div>
                <ul className="space-y-1">
                  {report.plan?.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <ArrowRight className="w-3 h-3 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Medications</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    ref={medInputRef}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Add medication (e.g., Metformin 500mg)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addMedication((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = medInputRef.current;
                      if (input) {
                        addMedication(input.value);
                        input.value = "";
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.medications?.map((med, i) => (
                    <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {med}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up</label>
                  <select
                    value={report.followUp || ""}
                    onChange={(e) => setReport((prev) => ({ ...prev, followUp: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select follow-up period</option>
                    <option>1 week</option>
                    <option>2 weeks</option>
                    <option>1 month</option>
                    <option>3 months</option>
                    <option>6 months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                  <textarea
                    value={report.notes || ""}
                    onChange={(e) => setReport((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-20"
                    placeholder="Any additional notes or observations"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
            <Button variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {submittedReports.map((rpt) => (
            <Card key={rpt.id} className="border-l-4 border-l-green-500">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg text-slate-900">{rpt.patientName}</h3>
                      <Badge className={rpt.status === "reviewed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
                        {rpt.status === "reviewed" ? "Reviewed" : "Submitted"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {rpt.visitDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="w-4 h-4" />
                        {rpt.visitType}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-4 h-4" />
                        {rpt.provider}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">
                      <span className="font-medium">Chief Complaint:</span> {rpt.chiefComplaint}
                    </p>
                    <p className="text-sm text-slate-700 mb-2">
                      <span className="font-medium">Assessment:</span> {rpt.assessment}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {rpt.medications.map((med, i) => (
                        <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {med}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
