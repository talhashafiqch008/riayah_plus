
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
 ArrowLeft, Plus, Edit, Trash2, CheckCircle, XCircle,
 GripVertical, Copy, Eye, Save, ChevronDown, ChevronUp,
 HelpCircle, Clock, Award, AlertCircle, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTrainerQuizzes, createQuiz, deleteQuiz } from '@/lib/api/courses';
import toast from 'react-hot-toast';


interface Question {
 id: string;
 type: 'multiple_choice' | 'true_false' | 'short_answer';
 question: string;
 options?: string[];
 correct_answer: string | number;
 points: number;
 explanation?: string;
}

interface Quiz {
 id: string;
 title: string;
 description: string;
 course_id: string;
 course_name: string;
 passing_score: number;
 time_limit: number;
 questions: Question[];
 status: 'draft' | 'published';
 attempts: number;
 avg_score: number;
}

export default function QuizzesPage() {
 const [quizzes, setQuizzes] = useState<Quiz[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
 const [deletingId, setDeletingId] = useState<string | null>(null);

 const [newQuiz, setNewQuiz] = useState({
 title: '',
 description: '',
 course_id: '',
 passing_score: 70,
 time_limit: 30,
 });

 useEffect(() => {
 async function loadQuizzes() {
 try {
 const response = await getTrainerQuizzes();
 setQuizzes(response.data || []);
 } catch {
 toast.error('Failed to load quizzes');
 } finally {
 setIsLoading(false);
 }
 }
 loadQuizzes();
 }, []);

 const handleCreateQuiz = async () => {
 if (!newQuiz.title || !newQuiz.course_id) {
 toast.error('Title and linked course are required');
 return;
 }
 try {
 await createQuiz({
 course_id: newQuiz.course_id,
 title: newQuiz.title,
 description: newQuiz.description,
 passing_score: newQuiz.passing_score,
 time_limit: newQuiz.time_limit,
 status: 'draft',
 });
 toast.success('Quiz created');
 setShowCreateModal(false);
 setNewQuiz({ title: '', description: '', course_id: '', passing_score: 70, time_limit: 30 });
 const response = await getTrainerQuizzes();
 setQuizzes(response.data || []);
 } catch {
 toast.error('Failed to create quiz');
 }
 };

 const handleDeleteQuiz = async (id: string) => {
 setDeletingId(id);
 try {
 await deleteQuiz(id);
 setQuizzes((prev) => prev.filter((q) => q.id !== id));
 toast.success('Quiz deleted');
 } catch {
 toast.error('Failed to delete quiz');
 } finally {
 setDeletingId(null);
 }
 };

 const toggleQuizStatus = (quizId: string) => {
 setQuizzes(quizzes.map((q) =>
 q.id === quizId
 ? { ...q, status: q.status === 'draft' ? 'published' : 'draft' }
 : q
 ));
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Link to="/trainer" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
 <ArrowLeft className="size-5 text-stone-600" />
 </Link>
 <div>
 <h1 className="text-2xl font-semibold text-stone-900">Quiz Management</h1>
 <p className="text-stone-600">Create and manage course assessments</p>
 </div>
 </div>
 <Button onClick={() => setShowCreateModal(true)}>
 <Plus className="size-4 mr-2" />
 Create Quiz
 </Button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-teal-100 rounded-lg">
 <FileText className="size-5 text-teal-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">{quizzes.length}</p>
 <p className="text-sm text-stone-500">Total Quizzes</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-green-100 rounded-lg">
 <CheckCircle className="size-5 text-green-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">
 {quizzes.filter((q) => q.status === 'published').length}
 </p>
 <p className="text-sm text-stone-500">Published</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-100 rounded-lg">
 <Award className="size-5 text-blue-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">
 {quizzes.reduce((acc, q) => acc + (q.attempts || 0), 0)}
 </p>
 <p className="text-sm text-stone-500">Total Attempts</p>
 </div>
 </div>
 </div>
 <div className="bg-white rounded-xl p-5 border border-stone-200">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-purple-100 rounded-lg">
 <HelpCircle className="size-5 text-purple-600" />
 </div>
 <div>
 <p className="text-2xl font-bold text-stone-900">
 {quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0)}
 </p>
 <p className="text-sm text-stone-500">Total Questions</p>
 </div>
 </div>
 </div>
 </div>

 {isLoading ? (
 <div className="py-12 text-center text-sm text-stone-500">Loading quizzes…</div>
 ) : quizzes.length === 0 ? (
 <div className="py-12 text-center text-sm text-stone-500">No quizzes yet. Create your first quiz to get started.</div>
 ) : (
 <div className="space-y-4">
 {quizzes.map((quiz) => (
 <div key={quiz.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
 <div role="button" tabIndex={0}
 className="p-5 flex items-center justify-between cursor-pointer hover:bg-stone-50"
 onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 >
 <div className="flex items-center gap-4">
 <div className={`p-2 rounded-lg ${quiz.status === 'published' ? 'bg-green-100' : 'bg-amber-100'}`}>
 {quiz.status === 'published' ? (
 <CheckCircle className="size-5 text-green-600" />
 ) : (
 <Edit className="size-5 text-amber-600" />
 )}
 </div>
 <div>
 <h3 className="font-semibold text-stone-900">{quiz.title}</h3>
 <p className="text-sm text-stone-500">{quiz.course_name} • {(quiz.questions || []).length} questions</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="text-right hidden md:block">
 <div className="flex items-center gap-4 text-sm text-stone-500">
 <span className="flex items-center gap-1">
 <Clock className="size-4" />
 {quiz.time_limit} min
 </span>
 <span>Pass: {quiz.passing_score}%</span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={(e) => {
 e.stopPropagation();
 toggleQuizStatus(quiz.id);
 }}
 className={`px-3 py-1 rounded-full text-xs font-medium ${quiz.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700' }`}
 >
 {quiz.status}
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteQuiz(quiz.id);
 }}
 disabled={deletingId === quiz.id}
 className="p-2 hover:bg-red-100 rounded-lg text-stone-400 hover:text-red-600 disabled:opacity-50"
 >
 <Trash2 className="size-4" />
 </button>
 {expandedQuiz === quiz.id ? (
 <ChevronUp className="size-5 text-stone-400" />
 ) : (
 <ChevronDown className="size-5 text-stone-400" />
 )}
 </div>
 </div>
 </div>

 {expandedQuiz === quiz.id && (
 <div className="border-t border-stone-200 p-5 bg-stone-50">
 <div className="mb-4 flex items-center justify-between">
 <h4 className="font-medium text-stone-900">Questions</h4>
 <span className="text-sm text-stone-500">{quiz.questions?.length || 0} questions</span>
 </div>
 {(quiz.questions || []).length === 0 ? (
 <div className="text-sm text-stone-500">No questions added yet.</div>
 ) : (
 <div className="space-y-3">
 {quiz.questions.map((question, index) => (
 <div
 key={question.id}
 className="bg-white rounded-lg p-4 border border-stone-200 flex items-start gap-3"
 >
 <div className="p-1 text-stone-400 cursor-grab">
 <GripVertical className="size-4" />
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <span className="text-xs font-medium text-stone-500">Q{index + 1}</span>
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' : question.type === 'true_false' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700' }`}>
 {question.type.replace('_', ' ')}
 </span>
 <span className="text-xs text-stone-400">{question.points} pts</span>
 </div>
 <p className="text-stone-900">{question.question}</p>
 {question.options && (
 <div className="mt-2 grid grid-cols-2 gap-2">
 {question.options.map((option, i) => (
 <div
 key={option}
 className={`text-sm p-2 rounded ${i === Number(question.correct_answer) ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-stone-50 border border-stone-200 text-stone-600' }`}
 >
 {option}
 </div>
 ))}
 </div>
 )}
 {question.explanation && (
 <p className="mt-2 text-xs text-stone-500">
 <strong>Explanation:</strong> {question.explanation}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {showCreateModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={() => setShowCreateModal(false)}>
 <div className="bg-white rounded-2xl w-full max-w-lg" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); } }} onClick={(e) => e.stopPropagation()}>
 <div className="p-6 border-b border-stone-200">
 <h2 className="text-lg font-semibold text-stone-900">Create New Quiz</h2>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <label htmlFor="quiz-title" className="block text-sm font-medium text-stone-700 mb-1">Quiz Title</label>
 <input id="quiz-title"
 type="text"
 value={newQuiz.title}
 onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
 placeholder="e.g., Module 1 Assessment"
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1">Description</label>
 <textarea id="description"
 value={newQuiz.description}
 onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
 placeholder="Brief description of this quiz..."
 rows={2}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="linked-course" className="block text-sm font-medium text-stone-700 mb-1">Linked Course</label>
 <input id="linked-course"
 type="text"
 value={newQuiz.course_id}
 onChange={(e) => setNewQuiz({ ...newQuiz, course_id: e.target.value })}
 placeholder="Course ID"
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label htmlFor="passing-score" className="block text-sm font-medium text-stone-700 mb-1">Passing Score (%)</label>
 <input id="passing-score"
 type="number"
 value={newQuiz.passing_score}
 onChange={(e) => setNewQuiz({ ...newQuiz, passing_score: parseInt(e.target.value) })}
 min={0}
 max={100}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="time-limit--min" className="block text-sm font-medium text-stone-700 mb-1">Time Limit (min)</label>
 <input id="time-limit--min"
 type="number"
 value={newQuiz.time_limit}
 onChange={(e) => setNewQuiz({ ...newQuiz, time_limit: parseInt(e.target.value) })}
 min={5}
 className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
 />
 </div>
 </div>
 </div>
 <div className="p-6 border-t border-stone-200 flex gap-3">
 <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
 Cancel
 </Button>
 <Button className="flex-1" onClick={handleCreateQuiz} disabled={!newQuiz.title || !newQuiz.course_id}>
 Create Quiz
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
