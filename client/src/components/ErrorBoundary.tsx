
import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
 children: ReactNode;
}

interface State {
 hasError: boolean;
 error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
 constructor(props: Props) {
 super(props);
 this.state = { hasError: false };
 }

 static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
 console.error("Error caught by boundary:", error, errorInfo);
 }

 render() {
 if (this.state.hasError) {
 return (
 <div className="flex min-h-[400px] items-center justify-center bg-stone-50 p-4">
 <div className="rounded-xl border bg-white p-8 shadow-sm max-w-md text-center">
 <AlertTriangle className="mx-auto size-12 text-red-500 mb-4" />
 <h2 className="text-xl font-semibold text-stone-900 mb-2">Something went wrong</h2>
 <p className="text-sm text-stone-600 mb-4">
 {this.state.error?.message || "An unexpected error occurred"}
 </p>
 <div className="flex gap-3 justify-center">
 <button
 onClick={() => this.setState({ hasError: false, error: undefined })}
 className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
 >
 Try Again
 </button>
 <button
 onClick={() => window.location.reload()}
 className="rounded-md bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-300"
 >
 Reload
 </button>
 </div>
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}
