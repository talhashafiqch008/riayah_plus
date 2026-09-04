import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Shared programmatic helper to scroll to top.
 */
export function scrollToTop(behavior: ScrollBehavior = 'smooth') {
  if (typeof window !== 'undefined') {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior,
    });
  }
}

/**
 * Global router listener component that ensures page navigations
 * automatically reset the viewport scroll position to the top.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // If navigating with an in-page anchor hash, scroll to that target
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Default: Reset scroll position to top on every route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [pathname, search, hash]);

  return null;
}
