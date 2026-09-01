import {
  decryptRecordingTranscript,
  encryptRecordingTranscript,
  isEncryptedRecordingTranscript,
} from '../../utils/recordingTranscriptCrypto';

describe('recordingTranscriptCrypto', () => {
  it('round-trips transcript plaintext', () => {
    const sample = 'Patient discussed mobility goals and medication adherence.';
    const encrypted = encryptRecordingTranscript(sample);
    expect(isEncryptedRecordingTranscript(encrypted)).toBe(true);
    expect(encrypted).not.toContain(sample);
    expect(decryptRecordingTranscript(encrypted)).toBe(sample);
  });

  it('allows legacy plaintext in non-production', () => {
    const legacy = 'legacy plaintext transcript';
    expect(decryptRecordingTranscript(legacy)).toBe(legacy);
  });
});
