export * from './client';
export * from './auth';
export * from './bookings';
export * from './chat';
export * from './payments';
export * from './admin';
export * from './documents';
export * from './notifications';
export * from './providers';
export * from './shifts';
export * from './reviews';
export * from './courses';
export * from './reports';
export * from './services';
export * from './telehealth';
export * from './careseeker';
export * from './insurance';
export * from './user';
export * from './matching';

// Backward-compatible namespace object for gradual migration
import * as auth from './auth';
import * as bookings from './bookings';
import * as chat from './chat';
import * as payments from './payments';
import * as admin from './admin';
import * as documents from './documents';
import * as notifications from './notifications';
import * as providers from './providers';
import * as shifts from './shifts';
import * as reviews from './reviews';
import * as courses from './courses';
import * as reports from './reports';
import * as services from './services';
import * as telehealth from './telehealth';
import * as careseeker from './careseeker';
import * as insurance from './insurance';
import * as user from './user';
import * as matching from './matching';

const api = {
    ...auth,
    ...bookings,
    ...chat,
    ...payments,
    ...admin,
    ...documents,
    ...notifications,
    ...providers,
    ...shifts,
    ...reviews,
    ...courses,
    ...reports,
    ...services,
    ...telehealth,
    ...careseeker,
    ...insurance,
    ...user,
    ...matching,
};

export default api;
