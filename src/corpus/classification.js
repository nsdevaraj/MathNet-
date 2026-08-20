export const CLASSIFICATION_VERSION = 3;
export const GENERAL_TOPIC = 'General';
export const JEE_TOPIC = 'JEE';
export const LEGACY_GENERAL_SCIENCE_SUBJECT = 'General Science';
export const LEGACY_MULTIMODAL_SUBJECT = 'Mathematics (Multi-modal)';
export const OLYMPIAD_SUBJECT = 'Mathematics (Olympiad)';

const excludedSubjects = new Set(['Chemistry', 'Physics']);

const olympiadTopicByLegacySubject = {
  [LEGACY_GENERAL_SCIENCE_SUBJECT]: GENERAL_TOPIC,
  [LEGACY_MULTIMODAL_SUBJECT]: JEE_TOPIC,
};

/**
 * @param {{ subject?: string, topic?: string, subtopic?: string }} classification
 */
export const normalizeQuestionClassification = ({ subject, topic, subtopic }) => {
  const normalizedSubject = subject || 'General';
  const normalizedTopic = topic || 'Unknown';
  const normalizedSubtopic = subtopic || 'Unknown';

  if (excludedSubjects.has(normalizedSubject)) return null;

  const olympiadTopic = olympiadTopicByLegacySubject[normalizedSubject];
  if (!olympiadTopic) {
    return {
      subject: normalizedSubject,
      topic: normalizedTopic,
      subtopic: normalizedSubtopic,
    };
  }

  return {
    subject: OLYMPIAD_SUBJECT,
    topic: olympiadTopic,
    subtopic: normalizedTopic === 'Unknown' ? normalizedSubtopic : normalizedTopic,
  };
};