import type { TFunction } from 'i18next';

const MISSING = '__NOTIF_CATALOG_MISSING__';

/** Exact English notification titles → catalog key (when type is missing or ambiguous). */
const TITLE_TO_CATALOG: Record<string, string> = {
  'Telehealth session in 30 minutes': 'telehealth_reminder',
  'Telehealth session confirmed': 'telehealth_ready',
  'You have been admitted': 'telehealth_admitted',
  'Meeting Cancelled': 'meeting_cancelled',
  'Meeting Ended': 'meeting_ended',
  '📅 Telehealth Meeting Scheduled': 'meeting_scheduled',
  'Telehealth Meeting Scheduled': 'meeting_scheduled',
  'Assessment scheduled': 'assessment_scheduled',
  'Consultation booked by family': 'consultation_booked_by_family',
  'Assessment booked': 'assessment_booked',
  'Assessment completed': 'assessment_completed',
  'Care Plan Ready for Your Review': 'care_plan_submitted',
  'Care Plan Revision Requested': 'care_plan_revision',
  'Care Plan Being Revised': 'care_plan_being_revised',
  'Care Plan Rejected': 'care_plan_rejected',
  'Care Plan Clinically Co-signed': 'care_plan_cosign',
  'AI Care Plan Draft Ready': 'care_plan_ai_draft',
  'Intake reviewed': 'intake_reviewed',
  'Your intake has been reviewed': 'episode_validated',
  'Intake withdrawn': 'intake_withdrawn',
  'New care session assigned': 'session_assigned',
  'New care session booked': 'session_booked',
  'Family booked a session': 'session_booked_by_family',
  'Recurring care sessions assigned': 'session_assigned_recurring',
  'Payment received': 'payment_received',
  'Payment failed': 'payment_failed',
  'Invoice ready': 'invoice_generated',
  'Invoice overdue': 'invoice_overdue',
  'Quotation ready': 'quotation_generated',
  'Out-of-Radius Check-In Detected': 'gps_out_of_radius',
  'Missed Check-In': 'gps_missed_checkin',
  'New Booking Request': 'new_booking',
  'Counter Offer Received': 'counter_offer',
  'Counter-Offer Received': 'bid_counter_offer',
  'Upcoming Booking Reminder': 'booking_reminder',
  'Booking Confirmed': 'booking_confirmed',
  'New Booking Payment': 'booking_payment_provider',
  'New Booking': 'booking_new',
  'Booking Update': 'booking_status_changed',
  'Document Expiring Soon': 'document_renewal',
  'Document Required': 'document_request',
  'Document Received': 'document_received',
  'Emergency Alert': 'emergency_alert',
  '🚨 Client Emergency': 'emergency_alert_provider',
  'Emergency Response': 'emergency_response',
  'New Bid Received': 'care_need_bid',
  'Bid Accepted!': 'bid_accepted',
  'Bid Not Accepted': 'bid_rejected',
  'New Care Order': 'care_order_created',
  'Account Deletion Request': 'account_deletion',
  'Account Verified!': 'verification_verified',
  'Verification Update': 'verification_rejected',
  'Dispute Opened': 'dispute_opened',
  'New Booking Dispute': 'dispute_opened_staff',
  'Dispute Resolved': 'dispute_resolved',
  'No-Show Penalty Applied': 'no_show_penalty',
  'No-Show Compensation': 'no_show_compensation',
  'Booking Cancelled — Provider No-Show': 'no_show_cancelled',
  'Payout Processed': 'payout_processed',
  'New WhatsApp Booking': 'whatsapp_booking',
};

/** Server type strings that map to a different catalog key. */
const TYPE_TO_CATALOG: Record<string, string> = {
  dispute_admin: 'dispute_opened_staff',
  payout_completed: 'payout_processed',
  provider_no_show: 'no_show_cancelled',
};

function catalogHasKey(catalogKey: string, t: TFunction): boolean {
  return (
    t(`notificationsCatalog.${catalogKey}.title`, { defaultValue: MISSING }) !== MISSING
  );
}

function resolveCatalogKey(
  item: {
    title: string;
    body?: string | null;
    message?: string | null;
    type?: string | null;
  },
  t: TFunction,
): string | null {
  const title = item.title?.trim() ?? '';
  const type = item.type?.trim();
  const rawBody = item.body ?? item.message ?? '';

  if (type === 'care_plan_revision') {
    if (title === 'Care Plan Being Revised' && catalogHasKey('care_plan_being_revised', t)) {
      return 'care_plan_being_revised';
    }
    if (catalogHasKey('care_plan_revision', t)) return 'care_plan_revision';
  }

  if (type === 'session_assigned') {
    if (title === 'Recurring care sessions assigned' && catalogHasKey('session_assigned_recurring', t)) {
      return 'session_assigned_recurring';
    }
    if (title === 'New care session booked' && catalogHasKey('session_booked', t)) {
      return 'session_booked';
    }
    if (catalogHasKey('session_assigned', t)) return 'session_assigned';
  }

  if (type === 'telehealth_admitted') {
    if (/The clinician admitted you/i.test(rawBody) && catalogHasKey('telehealth_admitted_clinician', t)) {
      return 'telehealth_admitted_clinician';
    }
    if (/The host admitted you/i.test(rawBody) && catalogHasKey('telehealth_admitted_host', t)) {
      return 'telehealth_admitted_host';
    }
    if (catalogHasKey('telehealth_admitted', t)) return 'telehealth_admitted';
  }

  if (type === 'assessment_scheduled') {
    if (title === 'Consultation booked by family' && catalogHasKey('consultation_booked_by_family', t)) {
      return 'consultation_booked_by_family';
    }
    if (title === 'Assessment booked' && catalogHasKey('assessment_booked', t)) {
      return 'assessment_booked';
    }
    if (catalogHasKey('assessment_scheduled', t)) return 'assessment_scheduled';
  }

  if (
    (type === 'intake_reviewed' || type === 'episode_validated') &&
    title === 'Your intake has been reviewed' &&
    catalogHasKey('episode_validated', t)
  ) {
    return 'episode_validated';
  }

  if (type === 'invoice_sent' || /^Invoice\s+\S+/.test(title)) {
    if (catalogHasKey('invoice_sent', t)) return 'invoice_sent';
  }

  if (type === 'booking_paid') {
    if (title === 'New Booking Payment' && catalogHasKey('booking_payment_provider', t)) {
      return 'booking_payment_provider';
    }
    if (title === 'Booking Confirmed' && catalogHasKey('booking_confirmed', t)) {
      return 'booking_confirmed';
    }
    if (title === 'New Booking' && catalogHasKey('booking_new', t)) {
      return 'booking_new';
    }
    if (catalogHasKey('booking_confirmed', t)) return 'booking_confirmed';
  }

  if (type === 'booking_status' && catalogHasKey('booking_status', t)) {
    return 'booking_status';
  }

  if (type === 'booking_status_changed' && catalogHasKey('booking_status_changed', t)) {
    return 'booking_status_changed';
  }

  if (type === 'emergency_alert') {
    if (/Client Emergency/i.test(title) && catalogHasKey('emergency_alert_provider', t)) {
      return 'emergency_alert_provider';
    }
    if (catalogHasKey('emergency_alert', t)) return 'emergency_alert';
  }

  if (type === 'verification_update') {
    if (title === 'Account Verified!' && catalogHasKey('verification_verified', t)) {
      return 'verification_verified';
    }
    if (catalogHasKey('verification_rejected', t)) return 'verification_rejected';
  }

  if (type === 'document_fulfilled' && catalogHasKey('document_received', t)) {
    return 'document_received';
  }

  if (type) {
    const aliased = TYPE_TO_CATALOG[type];
    if (aliased && catalogHasKey(aliased, t)) return aliased;
    if (catalogHasKey(type, t)) return type;
  }

  const byTitle = TITLE_TO_CATALOG[title];
  if (byTitle && catalogHasKey(byTitle, t)) return byTitle;

  return null;
}

function interpolationFromData(
  data: Record<string, unknown> | null | undefined,
  title: string,
  body: string | null | undefined,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};

  if (data) {
    if (typeof data.distanceMeters === 'number') out.distanceMeters = data.distanceMeters;
    if (typeof data.count === 'number') out.count = data.count;
    if (data.amount != null) out.amount = String(data.amount);
    if (data.currency != null) out.currency = String(data.currency);
    if (data.invoiceNumber != null) out.invoiceNumber = String(data.invoiceNumber);
    if (data.documentType != null) {
      out.documentType = String(data.documentType).replace(/_/g, ' ');
    }
    if (data.status != null) out.status = String(data.status);
  }

  if (/^Invoice\s+(\S+)/.test(title) && out.invoiceNumber == null) {
    out.invoiceNumber = title.replace(/^Invoice\s+/, '').trim();
  }

  if (body) {
    if (out.amount == null) {
      const amountMatch = body.match(/new rate of ([\d.,]+)/i);
      if (amountMatch) out.amount = amountMatch[1];
    }
    if (out.invoiceNumber == null) {
      const inv =
        body.match(/Invoice\s+([A-Z0-9-]+)/i) ||
        body.match(/invoice\s+([A-Z0-9-]+)/i) ||
        body.match(/quotation\s+\(([A-Z0-9-]+)\)/i);
      if (inv) out.invoiceNumber = inv[1];
    }
    if (out.currency == null || out.amount == null) {
      const money = body.match(/\b([A-Z]{3})\s+([\d.,]+)/);
      if (money) {
        if (out.currency == null) out.currency = money[1];
        if (out.amount == null) out.amount = money[2];
      }
    }
    if (out.documentType == null || out.documentType === '') {
      const doc =
        body.match(/asked to upload a (.+?) document/i) ||
        body.match(/requested (.+?) document/i);
      if (doc) out.documentType = doc[1].trim();
    }
    if (out.status == null) {
      const statusFromBody = body.match(/status changed to:\s*(.+)$/i);
      if (statusFromBody) {
        out.status = statusFromBody[1].trim();
      } else if (title !== 'Booking Update') {
        const bookingStatus = title.match(/^Booking\s+(.+)$/i);
        if (bookingStatus) out.status = bookingStatus[1];
      }
    }
  }

  if (out.invoiceNumber == null) out.invoiceNumber = '';
  if (out.currency == null) out.currency = '';
  if (out.amount == null) out.amount = '';
  if (out.documentType == null) out.documentType = '';
  if (out.status == null) out.status = '';

  return out;
}

export function localizeNotification(
  item: {
    title: string;
    body?: string | null;
    message?: string | null;
    type?: string | null;
    data?: Record<string, unknown> | null;
  },
  t: TFunction,
): { title: string; body: string } {
  const rawBody = item.body ?? item.message ?? '';
  const catalogKey = resolveCatalogKey(item, t);

  if (!catalogKey) {
    return { title: item.title, body: rawBody };
  }

  const vars = interpolationFromData(item.data, item.title, rawBody);
  const title = t(`notificationsCatalog.${catalogKey}.title`, vars);
  const body = t(`notificationsCatalog.${catalogKey}.body`, {
    ...vars,
    defaultValue: rawBody,
  });

  return { title, body: body || rawBody };
}
