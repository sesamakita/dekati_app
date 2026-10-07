// services/api/__tests__/letterService.test.ts
import { describe, it, expect } from 'vitest';
import { letterService } from '../letterService';

describe('LetterService Timeline and Business Logic', () => {
  it('should format timeline correctly for submitted status', () => {
    const steps = letterService.formatTimelineSteps([], 'submitted', '2026-10-04T10:00:00Z');
    expect(steps.length).toBe(4);
    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(false);
    expect(steps[2].done).toBe(false);
    expect(steps[3].done).toBe(false);
  });

  it('should format timeline correctly for approved status with official number', () => {
    const steps = letterService.formatTimelineSteps([], 'approved', '2026-10-04T10:00:00Z', '470/55/SK/2026');
    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(true);
    expect(steps[2].done).toBe(true);
    expect(steps[2].title).toContain('470/55/SK/2026');
    expect(steps[3].done).toBe(false);
  });

  it('should format timeline correctly for signed status with signedBy', () => {
    const steps = letterService.formatTimelineSteps([], 'signed', '2026-10-04T10:00:00Z', '470/55/SK/2026', 'Kepala Desa');
    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(true);
    expect(steps[2].done).toBe(true);
    expect(steps[3].done).toBe(true);
    expect(steps[3].title).toContain('Kepala Desa');
  });

  it('should format timeline correctly for rejected status', () => {
    const steps = letterService.formatTimelineSteps([], 'rejected', '2026-10-04T10:00:00Z');
    expect(steps[0].done).toBe(true);
    expect(steps[1].done).toBe(true);
    expect(steps[1].title.toLowerCase()).toContain('ditolak');
  });
});
