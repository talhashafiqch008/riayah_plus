import { buildCarePlanPayloadFromEpisode } from '../../services/AiCarePlanDraftService';

describe('AI care plan payload minimization (HP8)', () => {
  const episode = {
    id: 'ep-1',
    title: 'Post-op recovery',
    reasonForCare: 'Mobility support',
    urgencyLevel: 'medium',
    medicalHistory: 'Full narrative history that must not be sent',
    currentMeds: 'Aspirin 100mg',
    diagnoses: ['M54.5'],
    serviceInterests: ['physiotherapy'],
    observedChallenges: ['stairs'],
    careRecipient: {
      dateOfBirth: new Date('1980-05-01'),
      gender: 'female',
      diagnosisCodes: ['M54.5'],
    },
    assessments: [
      {
        type: 'initial',
        findings: { raw: 'detailed clinical findings' },
        recommendations: 'Weekly PT; pain monitoring',
      },
    ],
  };

  it('excludes DOB, medical history, raw findings, and current meds', () => {
    const payload = buildCarePlanPayloadFromEpisode(episode, { outputLanguage: 'en' });
    expect(payload.patient).not.toHaveProperty('dateOfBirth');
    expect(payload.patient).not.toHaveProperty('medicalHistory');
    expect(payload.episode).not.toHaveProperty('medicalHistory');
    expect(payload.episode).not.toHaveProperty('currentMeds');
    expect(payload.assessments?.[0]?.findings).toBeNull();
    expect(payload.assessments?.[0]?.recommendations).toEqual(['Weekly PT', 'pain monitoring']);
    expect(payload.patient?.diagnoses).toEqual(['M54.5']);
  });
});
