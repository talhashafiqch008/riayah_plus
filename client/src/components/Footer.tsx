import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-stone-500">
            © {new Date().getFullYear()} Raiyah. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-stone-500">
            <Link to="/privacy" className="hover:text-stone-900 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-stone-900 transition-colors">
              Terms of Service
            </Link>
            <Link to="/find-support" className="hover:text-stone-900 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
