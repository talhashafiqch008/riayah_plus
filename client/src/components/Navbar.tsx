
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDashboard } from '@/routes/getRoleDashboard';
import NotificationsDropdown from './NotificationsDropdown';
import { Logo } from '@/components/Logo';

export default function Navbar() {
 const { user, logout, isAuthenticated } = useAuth();
 const [isMenuOpen, setIsMenuOpen] = useState(false);

 const handleToggleMenu = useCallback(() => {
 setIsMenuOpen(prev => !prev);
 }, []);

 const handleCloseMenu = useCallback(() => {
 setIsMenuOpen(false);
 }, []);

 const handleLogout = useCallback(() => {
 logout();
 setIsMenuOpen(false);
 }, [logout]);

 const dashboardPath = user?.role ? getRoleDashboard(user.role) : '/';

 return (
 <nav className="bg-white border-b border-neutral-100 sticky top-0 z-50 shadow-sm">
 <div className="container mx-auto px-4 h-16 flex items-center justify-between">
 <Link to="/" className="flex items-center gap-2">
 <Logo size="md" animated={false} />
 </Link>

 {/* Desktop Menu */}
 <div className="hidden md:flex items-center gap-2">
 <Link to="/find-support" className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-teal-600 hover:bg-neutral-50 rounded-full transition-all">
 Find Support
 </Link>
  <span className="px-4 py-2 text-sm font-medium text-neutral-400 cursor-not-allowed">
  Join as Provider — Coming Soon
  </span>


 {isAuthenticated ? (
 <>
  <Link to={dashboardPath} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-teal-600 hover:bg-neutral-50 rounded-full transition-all">
  Dashboard
  </Link>

 <div className="h-6 w-px bg-neutral-200 mx-2" />

 <NotificationsDropdown />

 <div className="relative group">
 <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-neutral-50 transition-colors">
 <div className="size-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold border border-teal-200">
 {user?.firstName?.[0] || <User className="size-4" />}
 </div>
 <span className="text-sm font-medium text-neutral-700">{user?.firstName}</span>
 </button>

 <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 transform origin-top-right">
 <div className="px-4 py-3 border-b border-neutral-50">
 <p className="text-xs text-neutral-500">Signed in as</p>
 <p className="text-sm font-medium text-neutral-900 truncate">{user?.email}</p>
 </div>
 <Link to="/profile" className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
 Profile Settings
 </Link>
 <button
 onClick={logout}
 className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
 >
 Sign out
 </button>
 </div>
 </div>
 </>
 ) : (
 <Link to="/" className="px-5 py-2.5 text-sm font-semibold text-white bg-stone-900 rounded-full hover:bg-stone-950 transition-colors shadow-sm hover:shadow">
 Login
 </Link>
 )}
 </div>

 {/* Mobile Menu Button */}
 <button
 className="md:hidden p-2 text-neutral-600"
 onClick={handleToggleMenu}
 >
 {isMenuOpen ? <X /> : <Menu />}
 </button>
 </div>

 {/* Mobile Menu Dropdown */}
 {isMenuOpen && (
 <div className="md:hidden border-t border-neutral-100 bg-white">
 <div className="flex flex-col p-4 gap-4">
 <Link
 to="/find-support"
 className="text-sm font-medium text-neutral-600 hover:text-teal-600"
 onClick={handleCloseMenu}
 >
 Find Support
 </Link>
  <span
  className="text-sm font-medium text-neutral-400 cursor-not-allowed"
  >
  Join as Provider — Coming Soon
  </span>
 {isAuthenticated ? (
 <>
 <Link
 to={dashboardPath}
 className="text-sm font-medium text-neutral-600 hover:text-teal-600"
 onClick={handleCloseMenu}
 >
 Dashboard
 </Link>
 <button
 onClick={handleLogout}
 className="text-sm font-medium text-red-600 text-left"
 >
 Sign out
 </button>
 </>
 ) : (
 <Link
 to="/"
 className="px-4 py-2 text-sm font-medium text-center text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
 onClick={handleCloseMenu}
 >
 Login
 </Link>
 )}
 </div>
 </div>
 )}
 </nav>
 );
}
