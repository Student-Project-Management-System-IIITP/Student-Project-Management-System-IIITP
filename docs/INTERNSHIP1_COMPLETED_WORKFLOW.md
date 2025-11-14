# Internship 1 - Completed Summer Internship Workflow

## Overview
This document outlines the complete workflow for a Semester 7 student who has **completed a 2-month summer internship** and needs to submit evidence for verification.

---

## Student Flow

### Step 1: Track Selection & Finalization
1. **Student chooses "Coursework" track** in Sem 7 Track Selection
   - Status: `chosenTrack = 'coursework'`
   - Student can proceed immediately (no need to wait for admin finalization)

2. **Admin finalizes track** (optional but recommended)
   - Admin sets `finalizedTrack = 'coursework'` via Track Finalization page
   - Student can proceed even if not finalized (uses `chosenTrack`)

### Step 2: Accessing Internship 1 Dashboard
1. **Student navigates to Internship 1 Dashboard**
   - Route: `/student/sem7/internship1/dashboard`
   - Accessible from:
     - Student Dashboard → "Internship 1" card
     - Navbar → "Internship 1" (if applicable)

2. **Dashboard displays two options:**
   - **Option A: "I have completed 2-month internship"** → Submit evidence
   - **Option B: "I haven't completed internship"** → Register for solo project

### Step 3: Submitting Summer Internship Evidence
1. **Student clicks "I have completed 2-month internship"**
   - Redirects to: `/student/sem7/internship/apply/summer`

2. **Student fills out the application form:**
   - **Required Fields:**
     - Company Name
     - Start Date
     - End Date
     - Completion Certificate (file upload - **REQUIRED**)
   
   - **Optional Fields:**
     - Location
     - Manager Name
     - Manager Contact Number
     - Manager Official Email
     - Nature of Work
     - Mode (onsite/remote/hybrid)
     - Stipend/Salary (Yes/No)
     - Monthly Stipend Amount (if Yes)
     - Offer Letter (file upload - optional)
     - Report (file upload - optional)

3. **Window Check:**
   - System checks `sem7.internship2.evidenceWindow` from SystemConfig
   - If window is closed, student sees error message with window dates
   - If window is open or null (admin hasn't set), submission proceeds

4. **Form Submission:**
   - Creates `InternshipApplication` record:
     - `type = 'summer'`
     - `status = 'submitted'`
     - `semester = 7`
   - Files are saved to: `uploads/internships/{academicYear}/semester_7/summer/`

5. **Success Response:**
   - Application saved with `status = 'submitted'`
   - Student sees success notification
   - Dashboard updates to show application status

### Step 4: Waiting for Admin Review
1. **Student Dashboard Status:**
   - Internship 1 section shows: "Pending" status
   - Displays: "Submit evidence or register for solo project"

2. **Internship 1 Dashboard:**
   - Shows application status badge (e.g., "Submitted", "Needs Info")
   - Displays company details if available
   - Shows admin remarks if status is `needs_info`

3. **Student can update application if:**
   - Status is `submitted` (before admin reviews)
   - Status is `needs_info` (admin requested changes)

---

## Admin Flow

### Step 1: Viewing Applications
1. **Admin accesses Sem 7 Review & Management**
   - Route: `/admin/sem7/review`
   - Tab: "Summer Internship" (filters to `type = 'summer'`)

2. **Table displays all summer internship applications:**
   - Columns: Timestamp, Email, Name, MIS No., Contact No., Branch, Company Name, Start Date, End Date, Offer Letter, Manager Details, Nature of Work, Stipend Info, Status, Actions

3. **Filtering options:**
   - By status: all, submitted, needs_info, pending_verification, verified_pass, verified_fail, absent
   - By tab: All, 6-Month, Summer, Major Project 1

### Step 2: Reviewing Application
1. **Admin clicks "Review" button** on an application

2. **Review Modal displays:**
   - **Student Information:**
     - Name, MIS No., Email, Contact, Branch
   
   - **Company Details:**
     - Company Name, Location
     - Start Date, End Date
     - Mode (onsite/remote/hybrid)
   
   - **Manager/Contact Details:**
     - Manager Name, Contact Number, Email
   
   - **Nature of Work:**
     - Role/Nature of Work description
   
   - **Stipend/Salary Information:**
     - Has Stipend (Yes/No)
     - Monthly Amount (Rs.)
   
   - **Documents:**
     - Completion Certificate (download link)
     - Offer Letter (if uploaded - download link)
     - Report (if uploaded - download link)

3. **Admin sets status:**
   - **Status Options:**
     - `submitted` - Reset to initial submission state
     - `needs_info` - Request more information from student
     - `pending_verification` - Waiting for verification (intermediate state)
     - `verified_pass` - **Approved** - Student does NOT need Internship 1 project
     - `verified_fail` - **Rejected** - Student MUST do Internship 1 project
     - `absent` - **Absent** - Student MUST do Internship 1 project

4. **Admin adds remarks (optional):**
   - Max 500 characters
   - Visible to student if status is `needs_info`, `verified_fail`, or `absent`

5. **Admin clicks "Submit Review"**

### Step 3: Backend Processing
1. **Application status updated:**
   - `status` set to selected value
   - `adminRemarks` saved
   - `reviewedBy` set to admin user ID
   - `reviewedAt` set to current timestamp

2. **If status is verification-related** (`verified_pass`, `verified_fail`, `absent`):
   - `verifiedAt` set to current timestamp
   - `verifiedBy` set to admin user ID
   - `verificationRemarks` set to admin remarks

3. **Student eligibility check:**
   - Backend checks if student has `status IN ['approved', 'verified_pass']` for summer internship
   - If yes → Student is NOT eligible for Internship 1 solo project
   - If no → Student is eligible for Internship 1 solo project

---

## Student Outcomes Based on Admin Decision

### Case 1: Status = `verified_pass` (APPROVED) ✅
1. **Student Dashboard:**
   - Internship 1 section shows: "Approved" status (green badge)
   - Message: "✓ Summer internship approved"
   - No action required

2. **Internship 1 Dashboard:**
   - Shows success message: "Summer Internship Approved"
   - Displays: "Your 2-month summer internship has been approved. Internship 1 project is not required."
   - Shows internship details (company, duration)
   - No registration button visible

3. **Eligibility:**
   - `checkInternship1Eligibility()` returns:
     ```javascript
     {
       eligible: false,
       reason: 'You have an approved summer internship. Internship 1 is not required.',
       hasApprovedSummer: true
     }
     ```

4. **Next Steps:**
   - Student continues with Major Project 1 only
   - No Internship 1 solo project needed

### Case 2: Status = `needs_info` (UPDATE REQUIRED) ⚠️
1. **Student Dashboard:**
   - Internship 1 section shows: "Update Required" status (yellow/red badge)
   - Admin remarks displayed in yellow box
   - "Update Application" button visible

2. **Internship 1 Dashboard:**
   - Shows application status badge: "Update Required"
   - Displays admin remarks
   - "Update Application" button visible

3. **Student Action:**
   - Clicks "Update Application"
   - Redirected to: `/student/sem7/internship/apply/summer/{applicationId}/edit`
   - Can modify all fields and upload new files
   - Status automatically resets to `submitted` after update

4. **Workflow repeats:**
   - Student submits updated application
   - Admin reviews again
   - Process continues until approved/rejected

### Case 3: Status = `verified_fail` (REJECTED) ❌
1. **Student Dashboard:**
   - Internship 1 section shows: "Rejected" or error status
   - Admin remarks displayed
   - "Register for Internship 1 Project" option visible

2. **Internship 1 Dashboard:**
   - Shows application status badge: "Rejected"
   - Displays admin remarks
   - Shows message: "Your summer internship was not approved. You must complete an Internship 1 solo project."
   - "Register for Internship 1 Project" button visible

3. **Eligibility:**
   - `checkInternship1Eligibility()` returns:
     ```javascript
     {
       eligible: true
     }
     ```

4. **Next Steps:**
   - Student must register for Internship 1 solo project
   - Follows the "I haven't completed internship" workflow
   - Needs to:
     - Submit project topic/area
     - Select 5 faculty preferences
     - Wait for faculty allocation

### Case 4: Status = `absent` (ABSENT) ❌
1. **Same as Case 3 (verified_fail)**
   - Student must do Internship 1 solo project
   - All same outcomes as rejection

### Case 5: Status = `pending_verification` (PENDING) ⏳
1. **Student Dashboard:**
   - Internship 1 section shows: "Pending Verification" status
   - Message: "Waiting for verification"

2. **Internship 1 Dashboard:**
   - Shows application status badge: "Pending Verification"
   - No action required from student

3. **Eligibility:**
   - Student is NOT eligible for Internship 1 solo project yet
   - Must wait for final verification decision

4. **Next Steps:**
   - Admin will eventually set to `verified_pass` or `verified_fail`/`absent`
   - Student follows outcome based on final status

---

## Window Management

### Admin Configuration
- **Window Key:** `sem7.internship2.evidenceWindow`
- **Location:** System Configuration → Semester 7 tab
- **Fields:** Start Date, End Date
- **Purpose:** Controls when students can submit summer internship evidence

### Window Behavior
- **Window Open:** Students can submit applications
- **Window Closed:** Students see error with window dates
- **Window Null:** Students can submit (no restriction)

---

## Status Flow Diagram

```
[Student Submits Application]
         ↓
   [submitted]
         ↓
    [Admin Reviews]
         ↓
    ┌────┴────┬──────────┬──────────┬────────────┐
    ↓         ↓          ↓          ↓            ↓
[needs_info] [pending_] [verified_] [verified_] [absent]
              [verification] [pass]   [fail]
    ↓         ↓          ↓          ↓            ↓
[Student]    [Wait]    [APPROVED]  [REJECTED]  [ABSENT]
[Updates]    [for]     [No Intern] [Must do]   [Must do]
[Application] [Admin]   [ship 1]    [Internship] [Internship]
    ↓         ↓          [needed]    [1 needed]  [1 needed]
[submitted]  [Final]
    ↓         [Decision]
[Admin Reviews]
    ↓
[... continues]
```

---

## Key Database Fields

### InternshipApplication Model
- `type: 'summer'`
- `status: 'submitted' | 'needs_info' | 'pending_verification' | 'verified_pass' | 'verified_fail' | 'absent'`
- `uploads.completionCertificateFile` (REQUIRED)
- `uploads.offerLetterFile` (optional)
- `uploads.reportFile` (optional)
- `details.*` (company, dates, manager, stipend info)
- `adminRemarks` (visible to student)
- `verifiedAt`, `verifiedBy` (set when verified)

### Student Eligibility Check
- Query: `InternshipApplication.findOne({ student, semester: 7, type: 'summer', status: { $in: ['approved', 'verified_pass'] } })`
- If found → NOT eligible for Internship 1 solo project
- If not found → Eligible for Internship 1 solo project

---

## Edge Cases

1. **Multiple Applications:**
   - System prevents multiple summer applications for same student in Sem 7
   - Student can update existing application

2. **File Upload Issues:**
   - Completion certificate is REQUIRED
   - If missing, submission fails with error
   - Other files are optional

3. **Admin Changes Status Multiple Times:**
   - Admin can change status at any time
   - Each change updates `reviewedAt` and `reviewedBy`
   - Verification timestamps only set for verification statuses

4. **Window Closed After Submission:**
   - Once submitted, student can still update if status is `submitted` or `needs_info`
   - New submissions blocked if window is closed

5. **Track Change:**
   - If admin changes student track from coursework to internship:
     - Internship 1 projects are cancelled
     - Summer internship application remains (historical record)
     - Student follows 6-month internship workflow

---

## Testing Checklist

- [ ] Student can submit summer internship application
- [ ] Window check blocks submission when closed
- [ ] Completion certificate is required
- [ ] Admin can review and set status to all valid values
- [ ] Student sees appropriate status on dashboard
- [ ] `verified_pass` makes student ineligible for Internship 1 project
- [ ] `verified_fail`/`absent` makes student eligible for Internship 1 project
- [ ] `needs_info` allows student to update application
- [ ] Admin remarks are visible to student when appropriate
- [ ] Files are downloadable by admin
- [ ] Multiple status changes work correctly
- [ ] Eligibility check works correctly after status changes

