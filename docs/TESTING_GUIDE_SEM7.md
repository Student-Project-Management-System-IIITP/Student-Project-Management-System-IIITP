# Semester 7 Testing Guide

This guide covers all test scenarios for the Sem 7 workflow implementation.

## Prerequisites

1. **Admin Setup**:
   - Ensure you have admin access
   - Set up System Config windows (if not already set):
     - `sem7.choiceWindow` - Track selection window
     - `sem7.sixMonthSubmissionWindow` - 6-month internship submission
     - `sem7.sixMonthVerificationWindow` - Admin verification window
     - `sem7.major1.groupFormationWindow` - Major Project 1 group formation
     - `sem7.major1.preferenceWindow` - Faculty preference submission
     - `sem7.internship2.evidenceWindow` - Summer internship evidence submission
     - `sem7.internship1.registrationWindow` - Internship 1 registration
   - Set faculty preference limits:
     - `sem7.major1.facultyPreferenceLimit` (default: 5)
     - `sem7.internship1.facultyPreferenceLimit` (default: 5)

2. **Student Data**:
   - Have at least 2-3 test students in Sem 6
   - Have faculty members created for allocation

---

## Test Flow 1: Complete Internship Track (6-Month Internship)

### Step 1: Promote Student to Sem 7
- **Admin Action**: 
  - Go to `/admin/semester-management`
  - Select student(s) from Semester 6
  - Promote to Semester 7
  - **Expected**: Student semester updated to 7

### Step 2: Student Chooses Internship Track
- **Student Action**:
  - Login as student (Sem 7)
  - Navigate to `/student/sem7/track-selection` (or Dashboard → "Choose Track")
  - Select "6-Month Internship"
  - Submit choice
  - **Expected**: 
    - Choice saved with status "pending"
    - Dashboard shows "Track Choice: Pending"
    - Navbar shows "Sem 7 Track Selection" link (if not finalized)

### Step 3: Admin Reviews Track Choice
- **Admin Action**:
  - Go to `/admin/sem7/track-finalization`
  - Find the student's track choice
  - Click "Finalize" or "Update"
  - In modal:
    - Set Finalized Track: "6-Month Internship"
    - Set Verification Status: "Approved" (or "Needs Info" for testing)
    - Add remarks (optional)
    - Submit
  - **Expected**:
    - Status updated in table
    - If "Needs Info": Student sees "Update Track Choice" in Navbar
    - If "Approved": Student can proceed to internship application

### Step 4: Student Submits 6-Month Internship Application
- **Student Action**:
  - Login as student
  - Navigate to `/student/sem7/internship/apply/6month` (or Dashboard → "Submit 6-Month Internship Application")
  - Fill in form:
    - Company Name
    - Location
    - Start Date & End Date
    - Manager details (Name, Email, Phone)
    - Nature of work
    - Stipend (if any)
    - Mode (Onsite/Remote/Hybrid)
  - Upload files:
    - Offer Letter (required)
    - Completion Certificate (optional for now)
    - Report (optional)
  - Submit application
  - **Expected**:
    - Application saved with status "pending"
    - Dashboard shows application status
    - Can view/edit application

### Step 5: Admin Reviews Internship Application
- **Admin Action**:
  - Go to `/admin/sem7/internship-applications`
  - Filter by type: "6-Month Internship" (or use `?type=6month`)
  - Find the student's application
  - Click "Review"
  - Review all details
  - Download/view uploaded files (Offer Letter, etc.)
  - In review modal:
    - Set Status: "Approved" / "Needs Info" / "Rejected"
    - Add remarks
    - Submit review
  - **Expected**:
    - Application status updated
    - Student sees updated status on dashboard
    - If "Needs Info": Student can update application
    - If "Approved": Student track is finalized
    - If "Rejected": Admin can switch student to coursework

### Step 6: Verify Student Cannot Access Coursework Features
- **Student Action**:
  - Try to create a group for Major Project 1
  - Try to register for Major Project 1
  - **Expected**: 
    - Should not see group creation option
    - Should not see Major Project 1 registration
    - Dashboard only shows internship-related actions

---

## Test Flow 2: Complete Coursework Track (Major Project 1 + Summer Internship)

### Step 1: Promote Student to Sem 7
- Same as Flow 1, Step 1

### Step 2: Student Chooses Coursework Track
- **Student Action**:
  - Login as student
  - Navigate to `/student/sem7/track-selection`
  - Select "Coursework"
  - Submit choice
  - **Expected**: Choice saved with status "pending"

### Step 3: Admin Finalizes Coursework Track
- **Admin Action**:
  - Go to `/admin/sem7/track-finalization`
  - Find student
  - Finalize track as "Coursework" with status "Approved"
  - **Expected**: Student can now access coursework features

### Step 4: Student Forms Group for Major Project 1
- **Student Action** (Group Leader):
  - Navigate to `/student/groups/create` (or Dashboard → "Create Group")
  - Fill group details:
    - Name
    - Description
  - Click "Next" to invite members
  - Search for other Sem 7 coursework students
  - **Expected**:
    - Only Sem 7 coursework students appear in search
    - Students finalized for internship are NOT shown
    - Can select 1-4 additional members (max 5 total)
  - Select members and send invitations
  - **Expected**: Invitations sent

- **Student Action** (Group Members):
  - Login as invited students
  - Check dashboard for group invitation
  - Accept invitation
  - **Expected**: Group formed successfully

### Step 5: Student Registers Major Project 1
- **Student Action** (Group Leader):
  - Navigate to `/student/sem7/major1/register` (or Dashboard → "Register Major Project 1")
  - Step 1: Verify group members
  - Step 2: Fill project details:
    - Project Title
    - Domain
    - Description
  - Step 3: Select faculty preferences:
    - Must select exactly N faculty (based on config)
    - Can reorder preferences
    - Can remove preferences
  - Submit registration
  - **Expected**:
    - Project registered with status "pending"
    - Faculty allocation will be processed (same as Sem 5)

### Step 6: Student Submits Summer Internship Evidence (If Completed)
- **Student Action**:
  - Navigate to `/student/sem7/internship/apply/summer` (or Dashboard → "Submit Summer Internship Evidence")
  - Fill in form:
    - Company details
    - Internship dates
    - Manager details
    - Upload Completion Certificate (required)
    - Upload Report (optional)
  - Submit application
  - **Expected**: Application saved with status "pending"

### Step 7: Admin Reviews Summer Internship Application
- **Admin Action**:
  - Go to `/admin/sem7/internship-applications`
  - Filter by type: "Summer Internship" (or use `?type=summer`)
  - Review application
  - Approve or reject
  - **Expected**:
    - If approved: Student does NOT need Internship 1
    - If rejected/needs_info: Student must register for Internship 1

### Step 8: Student Registers for Internship 1 (If No Approved Summer Internship)
- **Prerequisite**: Student has no approved summer internship application
- **Student Action**:
  - Navigate to `/student/sem7/internship1/register` (or Dashboard → "Register Internship 1")
  - Step 1: Fill project details:
    - Project Title
    - Proposed Area/Description
  - Step 2: Select faculty preferences:
    - Must select exactly N faculty (based on config)
    - Can reorder preferences
  - Submit registration
  - **Expected**:
    - Internship 1 project registered
    - Faculty allocation will be processed

---

## Test Flow 3: Track Switching (Admin Feature)

### Step 1: Initial Setup
- Student has chosen "Internship" track
- Admin has finalized as "Internship"

### Step 2: Admin Switches Student to Coursework
- **Admin Action**:
  - Go to `/admin/sem7/track-finalization`
  - Find student with finalized internship track
  - Click "Update"
  - Change Finalized Track to "Coursework"
  - Set Verification Status: "Approved"
  - Add remark: "Switched to coursework"
  - Submit
  - **Expected**:
    - Student's finalized track updated
    - Student can now access coursework features
    - Internship application (if any) remains but student can't use it

### Step 3: Verify Student Can Now Access Coursework
- **Student Action**:
  - Login as student
  - Check dashboard
  - **Expected**:
    - Can see "Create Group" option
    - Can see Major Project 1 registration
    - Internship application still visible but not active

---

## Test Flow 4: Edge Cases and Error Handling

### Test 4.1: Needs Info Status
- **Student Action**: Submit track choice
- **Admin Action**: Set status to "Needs Info" with remarks
- **Expected**: 
  - Student sees "Update Track Choice" in Navbar
  - Student can update their choice
  - Admin can review again

### Test 4.2: Rejected Application
- **Student Action**: Submit 6-month internship application
- **Admin Action**: Reject application with remarks
- **Expected**:
  - Student sees rejection status
  - Admin can switch student to coursework
  - Student can update application (if status allows)

### Test 4.3: Group Formation Restrictions
- **Student Action** (Sem 7, Coursework):
  - Try to invite Sem 5 students
  - Try to invite internship-track students
  - **Expected**: 
    - Only Sem 7 coursework students appear
    - Cannot form group with wrong semester/track students

### Test 4.4: Cannot Reuse Previous Groups
- **Student Action** (Sem 7):
  - Try to continue previous Sem 5 group
  - **Expected**: 
    - Backend validation prevents this
    - Must create new group for Sem 7

### Test 4.5: Faculty Preference Limit Validation
- **Student Action**:
  - Register Major Project 1 or Internship 1
  - Try to submit with fewer than required preferences
  - Try to submit with more than required preferences
  - **Expected**: 
    - Validation error
    - Must submit exactly N preferences (from config)

### Test 4.6: Window Restrictions
- **Admin Action**: Close a window (e.g., `sem7.choiceWindow`)
- **Student Action**: Try to submit track choice
- **Expected**: Error message about window being closed

### Test 4.7: Multiple Applications
- **Student Action** (Coursework track):
  - Submit summer internship application
  - Application gets rejected
  - Submit another summer internship application
  - **Expected**: 
    - Can update existing application if status allows
    - Or create new application if needed

---

## Test Flow 5: Navigation and UI

### Test 5.1: Navbar Updates
- **As Student (Sem 7)**:
  - Check Navbar shows Sem 7 specific links
  - Check Project dropdown shows Major Project 1 / Internship 1
  - **Expected**: 
    - Links appear based on finalized track
    - Dynamic based on status

### Test 5.2: Dashboard Quick Actions
- **As Student (Sem 7)**:
  - Check dashboard quick actions
  - **Expected**: 
    - Shows appropriate actions based on:
      - Track choice status
      - Finalized track
      - Application status
      - Project registration status

### Test 5.3: Admin Navigation
- **As Admin**:
  - Check Navbar shows "Semester 7" dropdown
  - **Expected**: 
    - Track Finalization
    - Internship Applications
    - Filtered links (6-Month, Summer)

---

## Test Flow 6: Data Integrity

### Test 6.1: Academic Year Filtering
- **Admin Action**:
  - View track choices
  - Check only current academic year students appear
  - **Expected**: Proper academic year filtering

### Test 6.2: Status Consistency
- **Verify**:
  - Track choice status matches finalized track
  - Application status matches review status
  - All statuses are consistent across views

### Test 6.3: File Uploads
- **Student Action**: Upload files for internship application
- **Admin Action**: Download/view files
- **Expected**: 
  - Files uploaded correctly
  - Files accessible for download
  - File paths correct

---

## Checklist Summary

### ✅ Student Features
- [ ] Track selection (internship/coursework)
- [ ] Update track choice (if needs_info)
- [ ] 6-month internship application submission
- [ ] Summer internship evidence submission
- [ ] Group formation (coursework only, Sem 7 only)
- [ ] Major Project 1 registration
- [ ] Internship 1 registration (if no approved summer)
- [ ] View application status
- [ ] Update application (if status allows)
- [ ] Download uploaded files

### ✅ Admin Features
- [ ] View all track choices
- [ ] Filter track choices (status, track type)
- [ ] Finalize/update student track
- [ ] Switch student track
- [ ] View all internship applications
- [ ] Filter applications (type, status)
- [ ] Review applications
- [ ] Download/view uploaded files
- [ ] Add remarks
- [ ] Set verification status

### ✅ Validations
- [ ] Semester 7 students only
- [ ] Track finalization required for actions
- [ ] Group formation filters coursework students only
- [ ] Cannot reuse previous semester groups
- [ ] Faculty preference limit validation
- [ ] Window restrictions
- [ ] File upload requirements
- [ ] Application status transitions

### ✅ UI/UX
- [ ] Navbar shows correct links
- [ ] Dashboard shows correct quick actions
- [ ] Status badges display correctly
- [ ] Forms validate properly
- [ ] Error messages are clear
- [ ] Loading states work
- [ ] Modal dialogs work correctly

---

## Common Issues to Watch For

1. **Context Errors**: Ensure Sem7Context is available when needed
2. **Hook Usage**: Check for React hooks rules violations
3. **API Errors**: Verify all endpoints are correctly routed
4. **Permission Errors**: Ensure role-based access works
5. **Data Sync**: Verify data updates reflect immediately
6. **Window Timing**: Check window restrictions work correctly
7. **File Uploads**: Verify file paths and storage
8. **Status Transitions**: Ensure status changes are valid

---

## Recommended Test Order

1. Start with **Flow 1** (Internship Track) - Complete end-to-end
2. Then **Flow 2** (Coursework Track) - Complete end-to-end
3. Test **Flow 3** (Track Switching) - Verify admin flexibility
4. Run through **Flow 4** (Edge Cases) - Verify error handling
5. Check **Flow 5** (Navigation) - Verify UI consistency
6. Validate **Flow 6** (Data Integrity) - Ensure data correctness

---

## Notes

- Test with multiple students to verify group formation
- Test with different faculty preference limits
- Test window open/close scenarios
- Test with different application statuses
- Verify admin can always override student choices
- Check that Sem 5 workflows are NOT affected

