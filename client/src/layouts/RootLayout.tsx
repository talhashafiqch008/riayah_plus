import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';

export function RootLayout() {
  return (
    <HelmetProvider>
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1C1917',
            color: '#FAFAF9',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 8px 24px -4px rgb(0 0 0 / 0.15)',
          },
          success: {
            duration: 3000,
            iconTheme: { primary: '#22C55E', secondary: '#fff' },
            style: {
              background: '#F0FDF4',
              color: '#166534',
              border: '1px solid #86EFAC',
            },
          },
          error: {
            duration: 4000,
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
            style: {
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FCA5A5',
            },
          },
        }}
      />
    </HelmetProvider>
  );
}
