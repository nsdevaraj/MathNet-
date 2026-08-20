import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GENERAL_TOPIC,
  JEE_TOPIC,
  OLYMPIAD_SUBJECT,
  normalizeQuestionClassification,
} from './classification.js';

test('moves legacy Multi-modal questions under Olympiad as JEE', () => {
  assert.deepEqual(
    normalizeQuestionClassification({
      subject: 'Mathematics (Multi-modal)',
      topic: 'Geometry',
      subtopic: 'Plane Geometry',
    }),
    {
      subject: OLYMPIAD_SUBJECT,
      topic: JEE_TOPIC,
      subtopic: 'Geometry',
    },
  );
});

test('moves General Science under Olympiad as General', () => {
  assert.deepEqual(
    normalizeQuestionClassification({
      subject: 'General Science',
      topic: 'Algebra',
      subtopic: 'Equations and Inequalities',
    }),
    {
      subject: OLYMPIAD_SUBJECT,
      topic: GENERAL_TOPIC,
      subtopic: 'Algebra',
    },
  );
});

test('leaves existing Olympiad classifications unchanged', () => {
  assert.deepEqual(
    normalizeQuestionClassification({
      subject: 'Mathematics (Olympiad)',
      topic: 'Geometry',
      subtopic: 'Plane Geometry',
    }),
    {
      subject: 'Mathematics (Olympiad)',
      topic: 'Geometry',
      subtopic: 'Plane Geometry',
    },
  );
});