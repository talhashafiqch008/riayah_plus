import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Heart } from "lucide-react";
import NotificationCenter from "@/demo/coordinator/components/notification-center";
import { tokens } from "@/demo/coordinator/tokens";

export function DemoCoordinatorLayout() {
  const activePath = useLocation().pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/demo/coordinator", label: "Workflow" },
    { href: "/demo/coordinator/intake", label: "Intake" },
    { href: "/demo/coordinator/dashboard", label: "Coordinator" },
    { href: "/demo/coordinator/careseeker", label: "Care Seeker" },
    { href: "/demo/coordinator/provider", label: "Provider" },
    { href: "/demo/coordinator/helper", label: "Helper" },
    { href: "/demo/coordinator/bookings", label: "Bookings" },
    { href: "/demo/coordinator/reporting", label: "Reports" },
    { href: "/demo/coordinator/monitoring", label: "Monitor" },
    { href: "/demo/coordinator/organization", label: "Org" },
  ];

  return (
    <div className={`min-h-screen ${tokens.colors.background.page} font-sans relative`}>
      {/* Atmospheric noise overlay for premium texture */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-50"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
        aria-hidden="true"
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to content
      </a>
      <header className={`${tokens.colors.background.header}/80 backdrop-blur-md border-b ${tokens.colors.border.default}/80 ${tokens.shadows.header} sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${tokens.colors.text.primary} tracking-tight`}>Raiyah Plus</h1>
                <p className={`text-xs ${tokens.colors.text.muted} font-medium`}>Coordinator Demo</p>
              </div>
            </div>
            
            <nav className="hidden md:flex gap-1" aria-label="Desktop navigation">
              {navItems.map((item) => {
                const isActive = activePath === item.href || activePath.startsWith(item.href + "/");
                return (
                  <Link key={item.href}
                    to={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isActive
                        ? "text-blue-600 bg-blue-50 font-semibold"
                        : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <NotificationCenter />
              </div>
              <button
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-2 border-t border-slate-100 pt-4" aria-label="Mobile navigation">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                const isActive = activePath === item.href || (item.href !== "/demo/coordinator" && activePath.startsWith(item.href + "/"));
                  return (
                    <Link key={item.href}
                      to={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors transition-transform duration-200 ${
                        isActive
                          ? "text-blue-600 bg-blue-50 font-semibold"
                          : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>
      <main id="main-content" className={`${tokens.spacing.container} py-6 sm:py-8`}>
        <Outlet />
      </main>
    </div>
  );
}
