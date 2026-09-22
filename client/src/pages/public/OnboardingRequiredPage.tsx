import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import { ArrowRight, Check, LogOut, User, LayoutDashboard, FileCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth, isProviderRole } from '@/contexts/AuthContext';

export default function OnboardingRequiredPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (user) setUserRole(user.role || '');
  }, [user]);

  const getOnboardingUrl = () => {
    const role = userRole.toLowerCase();
    if (isProviderRole(role)) return '/provider/onboarding';
    if (role === 'family' || role === 'careseeker' || role === 'client') return '/careseeker/onboarding';
    return '/';
  };

  const steps = [
    { id: 1, label: t('onboardingRequired.stepAccount'), icon: User, status: 'completed' },
    { id: 2, label: t('onboardingRequired.stepVerification'), icon: FileCheck, status: 'current' },
    { id: 3, label: t('onboardingRequired.stepSuccess'), icon: LayoutDashboard, status: 'upcoming' },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FDFBF7] overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <m.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-[10%] -right-[10%] size-[900px] rounded-full bg-gradient-to-br from-teal-500/10 to-transparent blur-[120px]"
          />
          <m.div
            animate={{ scale: [1, 1.2, 1], x: [0, -30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-[20%] -left-[10%] size-[700px] rounded-full bg-gradient-to-tr from-amber-100/40 to-transparent blur-[100px]"
          />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#115e59 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white overflow-hidden p-8 text-center"
        >
          <div className="flex justify-center mb-6">
            <Logo size="lg" animated={true} />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-stone-900 mb-2">{t('onboardingRequired.title')}</h1>
            <p className="text-stone-500">{t('onboardingRequired.subtitle')}</p>
          </div>

          <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-white mb-10 mx-2 shadow-sm">
            <div className="relative flex justify-between items-center px-4">
              <div className="absolute left-[30px] right-[30px] top-1/2 h-0.5 bg-stone-200 -z-10 -translate-y-1/2 rounded-full" />
              <div className="absolute left-[30px] top-1/2 h-0.5 bg-teal-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000" style={{ width: '50%' }} />
              {steps.map((step, index) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';
                return (
                  <div key={step.id} className="relative flex flex-col items-center gap-3">
                    <m.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className={`size-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-sm ${isCompleted ? 'bg-teal-500 border-teal-500 text-white' : isCurrent ? 'bg-white border-teal-500 text-teal-600 ring-4 ring-teal-50' : 'bg-stone-100 border-stone-200 text-stone-300'}`}
                    >
                      {isCompleted ? <Check className="size-5" strokeWidth={3} /> : <step.icon className="size-5" />}
                    </m.div>
                    <span className={`text-xs font-bold absolute -bottom-8 whitespace-nowrap ${isCurrent ? 'text-teal-700' : isCompleted ? 'text-stone-900' : 'text-stone-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-4" />
          </div>

          <div className="space-y-4">
            <Link to={getOnboardingUrl()}>
              <m.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-stone-900/10 hover:shadow-stone-900/20 hover:bg-stone-800 transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-white/10 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                {t('onboardingRequired.completeSetup')}
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </m.button>
            </Link>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full py-3 text-stone-500 hover:text-stone-800 text-sm font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-stone-100 rounded-xl"
            >
              <LogOut className="size-4" />
              {t('onboardingRequired.signOut')}
            </button>
          </div>

          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-xs text-stone-400">{t('onboardingRequired.copyright')}</p>
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
}
