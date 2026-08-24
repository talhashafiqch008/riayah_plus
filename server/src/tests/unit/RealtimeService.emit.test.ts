import { attachRealtime, emitNotification } from '../../services/RealtimeService';

describe('emitNotification', () => {
  it('emits to the user notification room after attachRealtime', () => {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const io = { use: jest.fn(), on: jest.fn(), to } as never;

    attachRealtime(io);
    emitNotification('u1', { id: 'n1', type: 'invoice_generated' });

    expect(to).toHaveBeenCalledWith('notification.user.u1');
    expect(emit).toHaveBeenCalledWith('notification', { id: 'n1', type: 'invoice_generated' });
  });
});
