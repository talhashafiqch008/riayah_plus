/**
 * Clinical assessment schedule — mirrors mern/client/src/lib/api/assessments.ts.
 * Paths are prefixed with `/api` because the mobile axios base URL is origin-only.
 */

export {
  getAssessment,
  listAssessments,
  updateAssessment,
  type Assessment,
  type AssessmentStatus,
} from './care';
