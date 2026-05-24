/**
 * Unit Tests for panelValidation.js
 * 
 * Run: npx jest tests/panelValidation.test.js
 * 
 * These tests use in-memory mocking — no database required.
 */

const mongoose = require('mongoose');

// Mock the Panel model before requiring the module
jest.mock('../models/Panel');
const Panel = require('../models/Panel');
const { isConveyerEligible, validatePanelMembers } = require('../utils/panelValidation');

// Helper to create a mock ObjectId
const mockId = (id) => new mongoose.Types.ObjectId(id || undefined);

describe('isConveyerEligible', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Test 1: Faculty with no existing conveyer assignments ──
  test('should return eligible when faculty is not a conveyer in any panel', async () => {
    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });

    const facultyId = mockId();
    const result = await isConveyerEligible(facultyId);

    expect(result.eligible).toBe(true);
    expect(result.conflictingPanels).toHaveLength(0);
    expect(result.message).toContain('eligible');
  });

  // ── Test 2: Faculty already a conveyer in another panel ──
  test('should return ineligible when faculty is conveyer in another panel', async () => {
    const conflicting = [{
      _id: mockId(),
      panelNumber: 3,
      semester: 5,
      academicYear: '2025-26'
    }];

    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(conflicting)
      })
    });

    const facultyId = mockId();
    const result = await isConveyerEligible(facultyId);

    expect(result.eligible).toBe(false);
    expect(result.conflictingPanels).toHaveLength(1);
    expect(result.message).toContain('Panel #3');
    expect(result.message).toContain('Sem 5');
  });

  // ── Test 3: Excludes current panel when editing ──
  test('should exclude the specified panel from the check', async () => {
    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });

    const facultyId = mockId();
    const excludePanelId = mockId();
    const result = await isConveyerEligible(facultyId, excludePanelId);

    // Verify the query included $ne exclusion
    const queryArg = Panel.find.mock.calls[0][0];
    expect(queryArg._id).toEqual({ $ne: excludePanelId });
    expect(result.eligible).toBe(true);
  });

  // ── Test 4: Faculty is conveyer in multiple panels ──
  test('should list all conflicting panels when faculty is conveyer in multiple', async () => {
    const conflicting = [
      { _id: mockId(), panelNumber: 1, semester: 5, academicYear: '2025-26' },
      { _id: mockId(), panelNumber: 4, semester: 7, academicYear: '2025-26' }
    ];

    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(conflicting)
      })
    });

    const result = await isConveyerEligible(mockId());

    expect(result.eligible).toBe(false);
    expect(result.conflictingPanels).toHaveLength(2);
    expect(result.message).toContain('Panel #1');
    expect(result.message).toContain('Panel #4');
  });

  // ── Test 5: Throws on missing facultyId ──
  test('should throw when facultyId is not provided', async () => {
    await expect(isConveyerEligible(null)).rejects.toThrow('facultyId is required');
    await expect(isConveyerEligible(undefined)).rejects.toThrow('facultyId is required');
  });

  // ── Test 6: Checks across all semesters (no semester filter in query) ──
  test('should NOT filter by semester (checks globally)', async () => {
    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });

    await isConveyerEligible(mockId());

    const queryArg = Panel.find.mock.calls[0][0];
    // Must not have a semester filter — the check is cross-semester
    expect(queryArg.semester).toBeUndefined();
    // Must filter only active panels
    expect(queryArg.isActive).toBe(true);
  });
});

describe('validatePanelMembers', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeMember = (role = 'member') => ({
    faculty: mockId(),
    department: 'CSE',
    role
  });

  // ── Test 7: Valid panel with one conveyer + members ──
  test('should pass for a valid panel with one conveyer', async () => {
    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });

    const members = [
      makeMember('conveyer'),
      makeMember('member'),
      makeMember('member')
    ];

    const result = await validatePanelMembers(members);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ── Test 8: Fails with zero conveyers ──
  test('should fail when no conveyer is assigned', async () => {
    const members = [makeMember('member'), makeMember('member')];

    const result = await validatePanelMembers(members);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Panel must have exactly one conveyer');
  });

  // ── Test 9: Fails with multiple conveyers ──
  test('should fail when multiple conveyers are assigned', async () => {
    const members = [makeMember('conveyer'), makeMember('conveyer')];

    const result = await validatePanelMembers(members);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('more than one conveyer');
  });

  // ── Test 10: Fails with duplicate faculty ──
  test('should fail when same faculty appears twice', async () => {
    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });

    const sharedId = mockId();
    const members = [
      { faculty: sharedId, department: 'CSE', role: 'conveyer' },
      { faculty: sharedId, department: 'CSE', role: 'member' }
    ];

    const result = await validatePanelMembers(members);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  // ── Test 11: Fails with empty members array ──
  test('should fail with empty members array', async () => {
    const result = await validatePanelMembers([]);
    expect(result.valid).toBe(false);
  });

  // ── Test 12: Passes excludePanelId through to isConveyerEligible ──
  test('should pass excludePanelId when validating conveyer eligibility', async () => {
    Panel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      })
    });

    const excludeId = mockId();
    const members = [makeMember('conveyer'), makeMember('member')];

    await validatePanelMembers(members, excludeId);

    const queryArg = Panel.find.mock.calls[0][0];
    expect(queryArg._id).toEqual({ $ne: excludeId });
  });
});
