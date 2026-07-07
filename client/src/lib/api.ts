export * from './api/index';

// TODO: Avoid barrel imports for better tree-shaking
import * as api from './api/index';

export default api;
