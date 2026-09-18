import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { listEpisodes, type CareEpisode } from '@/lib/api/episodes';
import {
  bookFamilySession,
  getFamilyAssignedClinician,
  listFamilyOpenSlots,
  type OpenSlot,
  type ScheduleStaffOption,
} from '@/lib/api/scheduling';
import { familyDateLocale } from '@/lib/familyLanguage';
import StaffPersonCard from '@/components/care/StaffPersonCard';

const DURATIONS = [30, 45, 60] as const;

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextFourteenDays(locale: string) {
  const out: { ymd: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      ymd: localYmd(d),
      label: d.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    });
  }
  return out;
}

function slotLabel(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FamilyBookSessionPage() {
  const { t } = useTranslation('family');
  const dateLocale = familyDateLocale();
  const days = useMemo(() => nextFourteenDays(dateLocale), [dateLocale]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [episodeId, setEpisodeId] = useState<string | null>(searchParams.get('episodeId'));
  const [durationMinutes, setDurationMinutes] = useState<(typeof DURATIONS)[number]>(60);
  const [dateYmd, setDateYmd] = useState<string | null>(days[0]?.ymd ?? null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [clinician, setClinician] = useState<ScheduleStaffOption | null>(null);
  const [clinicianMessage, setClinicianMessage] = useState<string | null>(null);
  const [slots, setSlots] = useState<OpenSlot[]>([]);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [loadingClinician, setLoadingClinician] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const effectiveEpisodeId = episodeId ?? episodes[0]?.id ?? null;

  useEffect(() => {
    void (async () => {
      setLoadingEpisodes(true);
      try {
        const res = await listEpisodes({ limit: 50 });
        const open = (res.data ?? []).filter((e) => e.status !== 'closed');
        setEpisodes(open);
        setEpisodeId((prev) => prev ?? open[0]?.id ?? null);
      } catch (error: unknown) {
        toast.error(isApiError(error) ? error.message : t('bookSession.loadJourneysError'));
      } finally {
        setLoadingEpisodes(false);
      }
    })();
  }, [t]);

  const loadClinician = useCallback(
    async (id: string) => {
      setLoadingClinician(true);
      setClinician(null);
      setClinicianMessage(null);
      setSlotStart(null);
      try {
        const res = await getFamilyAssignedClinician(id);
        setClinician(res.clinician);
        setClinicianMessage(res.message ?? null);
      } catch (error: unknown) {
        toast.error(isApiError(error) ? error.message : t('bookSession.loadClinicianError'));
      } finally {
        setLoadingClinician(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!effectiveEpisodeId) return;
    void loadClinician(effectiveEpisodeId);
  }, [effectiveEpisodeId, loadClinician]);

  useEffect(() => {
    if (!effectiveEpisodeId || !clinician || !dateYmd) {
      setSlots([]);
      setSlotsMessage(null);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlotStart(null);
    void listFamilyOpenSlots({
      episodeId: effectiveEpisodeId,
      date: dateYmd,
      durationMinutes,
    })
      .then((res) => {
        if (!cancelled) {
          setSlots(res.slots ?? []);
          setSlotsMessage(res.message ?? null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSlots([]);
          setSlotsMessage(null);
          toast.error(isApiError(error) ? error.message : t('bookSession.loadSlotsError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveEpisodeId, clinician, dateYmd, durationMinutes, t]);

  const handleBook = async () => {
    if (!effectiveEpisodeId || !slotStart) {
      toast.error(t('bookSession.pickSlot'));
      return;
    }
    setBooking(true);
    try {
      const data = await bookFamilySession({
        episodeId: effectiveEpisodeId,
        scheduledAt: slotStart,
        durationMinutes,
        type: 'telehealth',
      });
      toast.success(t('bookSession.booked'));
      const invoiceId =
        data.invoice && typeof data.invoice === 'object' && 'invoiceId' in data.invoice
          ? (data.invoice as { invoiceId?: string }).invoiceId
          : undefined;
      if (invoiceId) {
        navigate(`/family/billing/${invoiceId}`);
      } else if (data.session.type === 'telehealth') {
        navigate(`/family/telehealth/${data.session.id}`);
      } else {
        navigate('/family/bookings');
      }
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('bookSession.bookingFailed'));
    } finally {
      setBooking(false);
    }
  };

  const availableCount = slots.filter((s) => (s.status ?? 'available') === 'available').length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          to="/family/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-800"
        >
          <ArrowLeft className="size-4" /> {t('bookSession.back')}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-stone-900">{t('bookSession.title')}</h2>
        <p className="mt-1 text-stone-600">{t('bookSession.description')}</p>
      </div>

      {loadingEpisodes ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      ) : episodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center text-stone-600">
          {t('bookSession.noJourneys')}
        </div>
      ) : (
        <div className="space-y-5">
          {episodes.length > 1 ? (
            <section className="rounded-2xl border bg-white p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                {t('bookSession.careJourney')}
              </p>
              <div className="space-y-2">
                {episodes.map((ep) => {
                  const selected = effectiveEpisodeId === ep.id;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => setEpisodeId(ep.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                        selected
                          ? 'border-teal-600 bg-teal-50 font-semibold text-teal-800'
                          : 'border-stone-200 text-stone-700'
                      }`}
                    >
                      {ep.title}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border bg-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {t('bookSession.yourClinician')}
            </p>
            {loadingClinician ? (
              <Loader2 className="size-5 animate-spin text-teal-600" />
            ) : clinician ? (
              <StaffPersonCard staff={clinician} variant="clinician" localize />
            ) : (
              <p className="text-sm text-amber-800">
                {clinicianMessage ?? t('bookSession.noClinician')}
              </p>
            )}
          </section>

          {clinician ? (
            <>
              <section className="rounded-2xl border bg-white p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {t('bookSession.duration')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationMinutes(d)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                        durationMinutes === d
                          ? 'bg-teal-600 text-white'
                          : 'border border-stone-200 text-stone-700'
                      }`}
                    >
                      {t('common.min', { count: d })}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {t('bookSession.date')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => (
                    <button
                      key={d.ymd}
                      type="button"
                      onClick={() => setDateYmd(d.ymd)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                        dateYmd === d.ymd
                          ? 'bg-teal-600 text-white'
                          : 'border border-stone-200 text-stone-700'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {t('bookSession.openSlots')}
                </p>
                <p className="text-xs text-stone-500">{t('bookSession.slotsHint')}</p>
                {loadingSlots ? (
                  <Loader2 className="size-5 animate-spin text-teal-600" />
                ) : slots.length === 0 ? (
                  <p className="text-sm text-stone-500">
                    {slotsMessage ?? t('bookSession.noHours')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {slotsMessage && availableCount === 0 ? (
                      <p className="text-sm text-amber-800">{slotsMessage}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => {
                        const status = slot.status ?? 'available';
                        const selected = slotStart === slot.start;
                        const selectable = status === 'available';
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={!selectable}
                            onClick={() => setSlotStart(slot.start)}
                            className={`min-w-[4.5rem] rounded-xl px-3 py-2 text-sm font-semibold ${
                              status === 'booked'
                                ? 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400 line-through'
                                : status === 'past'
                                  ? 'cursor-not-allowed border border-stone-200 bg-stone-50 text-stone-400'
                                  : selected
                                    ? 'bg-teal-600 text-white'
                                    : 'border border-teal-200 text-stone-800 hover:bg-teal-50'
                            }`}
                          >
                            <span className="block">{slotLabel(slot.start, dateLocale)}</span>
                            {status === 'booked' ? (
                              <span className="block text-[10px] font-medium uppercase tracking-wide">
                                {t('bookSession.taken')}
                              </span>
                            ) : status === 'past' ? (
                              <span className="block text-[10px] font-medium uppercase tracking-wide">
                                {t('bookSession.closed')}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <button
                type="button"
                disabled={booking || !slotStart}
                onClick={() => void handleBook()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {booking && <Loader2 className="size-4 animate-spin" />}
                {t('bookSession.bookCta')}
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
