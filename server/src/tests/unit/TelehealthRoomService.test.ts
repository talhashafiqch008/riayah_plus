import {
  shouldProvisionTelehealthRoom,
  telehealthNotifyUserIds,
} from '../../services/TelehealthRoomService';

describe('shouldProvisionTelehealthRoom', () => {
  it('is true for a confirmed telehealth session without a room', () => {
    expect(
      shouldProvisionTelehealthRoom({ type: 'telehealth', status: 'accepted', livekitRoomId: null }),
    ).toBe(true);
  });

  it('is false for in-person or home visit', () => {
    expect(
      shouldProvisionTelehealthRoom({ type: 'in_person', status: 'accepted', livekitRoomId: null }),
    ).toBe(false);
    expect(
      shouldProvisionTelehealthRoom({ type: 'home_visit', status: 'accepted', livekitRoomId: null }),
    ).toBe(false);
  });

  it('is false when a room is already bound', () => {
    expect(
      shouldProvisionTelehealthRoom({
        type: 'telehealth',
        status: 'accepted',
        livekitRoomId: 'session-1',
      }),
    ).toBe(false);
  });

  it('is false until the appointment is confirmed', () => {
    expect(
      shouldProvisionTelehealthRoom({ type: 'telehealth', status: 'pending', livekitRoomId: null }),
    ).toBe(false);
    expect(
      shouldProvisionTelehealthRoom({ type: 'telehealth', status: 'cancelled', livekitRoomId: null }),
    ).toBe(false);
    expect(
      shouldProvisionTelehealthRoom({ type: 'telehealth', status: 'completed', livekitRoomId: null }),
    ).toBe(false);
  });
});

describe('telehealthNotifyUserIds', () => {
  it('notifies family and clinician, plus coordinator when distinct', () => {
    expect(
      telehealthNotifyUserIds({ clientId: 'fam', providerId: 'clin', coordinatorId: 'coord' }).sort(),
    ).toEqual(['clin', 'coord', 'fam']);
  });

  it('dedupes when the coordinator is also the clinician', () => {
    expect(
      telehealthNotifyUserIds({ clientId: 'fam', providerId: 'clin', coordinatorId: 'clin' }).sort(),
    ).toEqual(['clin', 'fam']);
  });
});
