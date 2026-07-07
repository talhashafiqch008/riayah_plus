
import { useState } from "react";
import { Upload, File, Video, FileText, X } from "lucide-react";
import toast from "react-hot-toast";


export default function TrainerUploadPage() {
 const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
 const [uploadProgress, setUploadProgress] = useState(0);
 const [isUploading, setIsUploading] = useState(false);

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files) {
 setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
 }
 };

 const removeFile = (index: number) => {
 setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
 };

 const handleUpload = async () => {
 setIsUploading(true);
 // Simulate upload progress
 for (let i = 0; i <= 100; i += 10) {
 // TODO: Consider Promise.all for parallel async
 await new Promise(resolve => setTimeout(resolve, 200));
 setUploadProgress(i);
 }
 setIsUploading(false);
 setUploadProgress(0);
 setSelectedFiles([]);
 toast.success("Files uploaded successfully!");
 };

 const getFileIcon = (fileName: string) => {
 if (fileName.endsWith(".mp4") || fileName.endsWith(".mov")) {
 return <Video className="size-5 text-purple-600" />;
 } else if (fileName.endsWith(".pdf")) {
 return <FileText className="size-5 text-red-600" />;
 } else {
 return <File className="size-5 text-stone-600" />;
 }
 };

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Upload Content</h1>
 <p className="text-sm text-stone-500">Upload course materials and resources</p>
 </div>

 {/* Upload Area */}
 <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-12 text-center hover:border-teal-500 transition-colors">
 <Upload className="mx-auto size-12 text-stone-400 mb-4" />
 <h3 className="text-lg font-semibold text-stone-900 mb-2">Upload Files</h3>
 <p className="text-sm text-stone-500 mb-4">
 Drag and drop files here, or click to browse
 </p>
 <input
 type="file"
 multiple
 onChange={handleFileSelect}
 className="hidden"
 id="file-upload"
 accept=".pdf,.doc,.docx,.mp4,.mov,.ppt,.pptx"
 />
 <label
 htmlFor="file-upload"
 className="inline-flex cursor-pointer rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
 >
 Select Files
 </label>
 <p className="mt-2 text-xs text-stone-500">
 Supported formats: PDF, DOC, PPT, MP4, MOV (Max 100MB)
 </p>
 </div>

 {/* Selected Files */}
 {selectedFiles.length > 0 && (
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">
 Selected Files ({selectedFiles.length})
 </h3>
 <div className="space-y-3">
 {selectedFiles.map((file, index) => (
 <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg border p-3">
 <div className="flex items-center gap-3">
 {getFileIcon(file.name)}
 <div>
 <p className="text-sm font-medium text-stone-900">{file.name}</p>
 <p className="text-xs text-stone-500">
 {(file.size / 1024 / 1024).toFixed(2)} MB
 </p>
 </div>
 </div>
 <button
 onClick={() => removeFile(index)}
 className="rounded-md p-2 text-red-600 hover:bg-red-50"
 >
 <X className="size-5" />
 </button>
 </div>
 ))}
 </div>

 {/* Upload Progress */}
 {isUploading && (
 <div className="mt-4">
 <div className="flex items-center justify-between text-sm mb-2">
 <span className="text-stone-600">Uploading…</span>
 <span className="font-semibold text-stone-900">{uploadProgress}%</span>
 </div>
 <div className="w-full bg-stone-200 rounded-full h-2">
 <div
 className="bg-teal-600 h-2 rounded-full transition-all duration-300"
 style={{ width: `${uploadProgress}%` }}
 />
 </div>
 </div>
 )}

 {/* Upload Button */}
 <button
 onClick={handleUpload}
 disabled={isUploading}
 className="mt-4 w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isUploading ? "Uploading..." : "Upload Files"}
 </button>
 </div>
 )}

 {/* Recent Uploads */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Recent Uploads</h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between rounded-lg border p-3">
 <div className="flex items-center gap-3">
 <Video className="size-5 text-purple-600" />
 <div>
 <p className="text-sm font-medium text-stone-900">Introduction Video.mp4</p>
 <p className="text-xs text-stone-500">Uploaded 2 hours ago</p>
 </div>
 </div>
 <button className="text-sm text-teal-600 hover:text-teal-700">View</button>
 </div>
 <div className="flex items-center justify-between rounded-lg border p-3">
 <div className="flex items-center gap-3">
 <FileText className="size-5 text-red-600" />
 <div>
 <p className="text-sm font-medium text-stone-900">Course Syllabus.pdf</p>
 <p className="text-xs text-stone-500">Uploaded yesterday</p>
 </div>
 </div>
 <button className="text-sm text-teal-600 hover:text-teal-700">View</button>
 </div>
 </div>
 </div>
 </div>
 );
}
