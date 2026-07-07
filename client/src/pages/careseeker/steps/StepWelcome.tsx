import { m, LazyMotion, domAnimation } from "framer-motion";
import { Shield, ArrowRight, LogIn, Heart, Users, Clock, CheckCircle, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Logo } from "../../../components/Logo";

interface StepWelcomeProps {
  onNext: () => void;
}

const features = [
  { icon: Users, title: "Verified Providers", description: "Background-checked independent professionals" },
  { icon: Heart, title: "Personalized Matching", description: "Find support that fits your needs" },
  { icon: Clock, title: "Flexible Scheduling", description: "Book support when you need it" },
  { icon: Shield, title: "Secure Platform", description: "Your data is protected & encrypted" },
];

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function StepWelcome({ onNext }: StepWelcomeProps) {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/careseeker/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b ring-1 ring-stone-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <button
            onClick={handleSignIn}
            className="text-stone-600 hover:text-teal-600 font-medium text-sm transition-colors"
          >
            Already have an account? Sign In
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <m.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="max-w-2xl w-full text-center"
        >
          {/* Logo Animation */}
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex justify-center mb-8"
          >
            <m.div
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative"
            >
              <div className="size-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-3xl flex items-center justify-center shadow-xl shadow-teal-200/50 rotate-3">
                <Heart className="size-12 text-white" />
              </div>
              <m.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute -bottom-2 -right-2 size-10 bg-stone-800 rounded-xl shadow-lg flex items-center justify-center"
              >
                <Building2 className="size-5 text-teal-600" />
              </m.div>
            </m.div>
          </m.div>

          {/* Title */}
          <m.h1
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-semibold text-stone-900 mb-4"
          >
            Welcome to Raiyah Plus
          </m.h1>

          {/* Subtitle */}
          <m.p
            variants={fadeInUp}
            className="text-xl text-stone-600 max-w-xl mx-auto mb-4 leading-relaxed"
          >
            A digital platform connecting individuals and families with independent care and support providers.
          </m.p>

          {/* Trust Badge */}
          <m.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-10 border border-amber-200"
          >
            <Shield className="size-4" />
            <span>We connect &mdash; providers deliver independently</span>
          </m.div>

          {/* CTA Buttons */}
          <m.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <m.button
              onClick={onNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-teal-600 text-white hover:bg-teal-700 font-bold rounded-2xl shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:bg-stone-800 transition-transform duration-300 flex items-center justify-center gap-3"
            >
              Get Started
              <ArrowRight className="size-5" />
            </m.button>
            <m.button
              onClick={handleSignIn}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-stone-800 text-stone-700 font-bold text-lg rounded-2xl shadow-lg border-2 ring-1 ring-stone-200/50 hover:border-teal-200 hover:bg-stone-50 transition-transform duration-300 flex items-center justify-center gap-3"
            >
              <LogIn className="size-5" />
              Sign In
            </m.button>
          </m.div>

          {/* Features Grid */}
          <m.div
            variants={fadeInUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <m.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="bg-stone-800 rounded-xl p-4 ring-1 ring-stone-100/50"
                >
                  <div className="size-10 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Icon className="size-5 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-stone-900 text-sm mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {feature.description}
                  </p>
                </m.div>
              );
            })}
          </m.div>

          {/* Compliance Footer */}
          <m.div
            variants={fadeInUp}
            className="space-y-2"
          >
            <div className="flex items-center justify-center gap-2 text-stone-400 text-sm">
              <Shield className="size-4" />
              <span>Qatar PDPL &amp; UAE Data Protection Compliant</span>
            </div>
            <p className="text-stone-500 text-sm">
              <Clock className="size-4 inline mr-1" />
              Takes about 3-5 minutes to complete
            </p>
          </m.div>
        </m.div>
      </main>
    </div>
  );
}
