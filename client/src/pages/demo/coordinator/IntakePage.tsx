"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabNav } from "@/demo/coordinator/components/shared";
import { tokens } from "@/demo/coordinator/tokens";
import {
  Mic,
  Upload,
  FileText,
  Brain,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Phone,
  FileUp,
  Stethoscope,
  Activity,
  Heart,
  AlertCircle,
  X,
  Send,
  Loader2,
} from "lucide-react";

interface ExtractedData {
  conditions: string[];
  goals: string[];
  needs: string[];
  medications: string[];
  allergies: string[];
  vitals: Record<string, string>;
}

export default function SmartIntakePage() {
  const [activeTab, setActiveTab] = useState("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: "ai", text: "Hello! I'm Riayah AI. I can help you share your medical information through voice, files, or chat. What would you like to do?", time: "08:00 AM" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setIsProcessing(true);
    
      setTimeout(() => {
      setIsProcessing(false);
      setExtractedData({
        conditions: ["Hypertension", "Type 2 Diabetes", "Mild Arthritis"],
        goals: ["Blood pressure control", "Blood sugar management", "Pain reduction", "Mobility improvement"],
        needs: ["Daily medication reminders", "Weekly physiotherapy", "Monthly doctor visits", "Diet monitoring"],
        medications: ["Metformin 500mg", "Lisinopril 10mg", "Ibuprofen 400mg"],
        allergies: ["Penicillin", "Shellfish"],
        vitals: {
          "Blood Pressure": "140/90 mmHg",
          "Heart Rate": "78 bpm",
          "Blood Sugar": "180 mg/dL",
          "Weight": "78 kg",
          "Height": "175 cm",
        },
      });
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "ai", text: "I've analyzed your voice note. I've extracted your medical conditions, goals, and current medications. Please review the extracted data below.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    }, 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files).map((file) => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      type: file.type.includes("pdf") ? "PDF" : file.type.includes("image") ? "Image" : "Document",
    }));
    
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setIsProcessing(true);
    
    setTimeout(() => {
      setIsProcessing(false);
      setExtractedData({
        conditions: ["Diabetes Type 2", "High Cholesterol", "Lower Back Pain"],
        goals: ["HbA1c < 7%", "LDL < 100", "Pain-free mobility"],
        needs: ["Glucose monitoring", "Physical therapy", "Dietary planning"],
        medications: ["Metformin", "Atorvastatin", "Gabapentin"],
        allergies: ["Sulfa drugs"],
        vitals: {
          "HbA1c": "8.2%",
          "LDL": "145 mg/dL",
          "Blood Pressure": "135/85 mmHg",
          "Weight": "82 kg",
        },
      });
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "ai", text: `I've processed ${newFiles.length} medical report(s). Key findings: Diabetes Type 2, High Cholesterol, and Lower Back Pain detected. See extracted details below.`, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    }, 2500);
  };

  const sendWhatsappMessage = () => {
    if (!whatsappMessage.trim()) return;
    
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: whatsappMessage, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "ai", text: "I've recorded your message. Based on your symptoms described, I recommend scheduling a consultation with a specialist. Would you like me to create a care plan draft?", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    }, 2000);
    
    setWhatsappMessage("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${tokens.typography.display} text-slate-900`}>Smart Intake</h1>
          <p className="text-slate-600 mt-1">AI-powered medical data extraction from voice, files, and chat</p>
        </div>
        <Badge className="bg-purple-100 text-purple-800 px-3 py-1.5 font-semibold w-fit">
          <Sparkles className="w-3 h-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Brain className="w-5 h-5 text-blue-600" />
            Riayah AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-64 overflow-y-auto mb-4 p-2">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === "ai" ? "bg-purple-100" : "bg-blue-100"}`}>
                  {msg.sender === "ai" ? <Brain className="w-4 h-4 text-blue-600" /> : <MessageSquare className="w-4 h-4 text-blue-600" />}
                </div>
                <div className={`rounded-lg p-3 max-w-[80%] ${msg.sender === "ai" ? "bg-purple-50 text-slate-800" : "bg-blue-50 text-slate-800"}`}>
                  <p className="text-sm">{msg.text}</p>
                  <span className="text-xs text-slate-500 mt-1 block">{msg.time}</span>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is processing...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TabNav
        tabs={[
          { id: "voice", label: "Voice Note" },
          { id: "files", label: "Medical Reports" },
          { id: "whatsapp", label: "WhatsApp Chat" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="underline"
      />

      {activeTab === "voice" && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Mic className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Record Voice Note</h3>
              <p className="text-sm text-slate-600">Describe your symptoms, medical history, or concerns in your own language</p>
              
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <Button onClick={startRecording} className="bg-purple-600 hover:bg-purple-700">
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="animate-pulse">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                    Stop ({formatTime(recordingTime)})
                  </Button>
                )}
              </div>
              
              {isProcessing && activeTab === "voice" && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI is analyzing your voice note...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "files" && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <FileUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Upload Medical Reports</h3>
              <p className="text-sm text-slate-600">Upload PDFs, images, or scanned documents (lab results, prescriptions, discharge summaries)</p>
              
              <div className="flex justify-center">
                <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 max-w-md mx-auto">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-slate-500">{file.size} • {file.type}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "whatsapp" && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">WhatsApp Integration</h3>
                  <p className="text-sm text-slate-600">Send messages via WhatsApp and let AI extract medical information</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Type your message (e.g., 'My blood sugar is high today...')"
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onKeyDown={(e) => e.key === "Enter" && sendWhatsappMessage()}
                />
                <Button onClick={sendWhatsappMessage} className="bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {extractedData && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle className="w-5 h-5 text-green-600" />
              AI Extracted Medical Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Conditions
                </h4>
                <div className="space-y-1">
                  {extractedData.conditions.map((condition, i) => (
                    <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200">{condition}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Heart className="w-4 h-4 text-pink-500" />
                  Goals
                </h4>
                <ul className="space-y-1">
                  {extractedData.goals.map((goal, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Needs
                </h4>
                <ul className="space-y-1">
                  {extractedData.needs.map((need, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 text-blue-500" />
                      {need}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Stethoscope className="w-4 h-4 text-purple-500" />
                  Medications
                </h4>
                <div className="space-y-1">
                  {extractedData.medications.map((med, i) => (
                    <Badge key={i} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{med}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Allergies
                </h4>
                <div className="space-y-1">
                  {extractedData.allergies.map((allergy, i) => (
                    <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{allergy}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Activity className="w-4 h-4 text-green-500" />
                  Vitals
                </h4>
                <div className="space-y-1">
                  {Object.entries(extractedData.vitals).map(([key, value], i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{key}:</span>
                      <span className="font-medium text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-4 mt-6">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <ArrowRight className="w-4 h-4 mr-2" />
                Create Care Plan
              </Button>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Download Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
