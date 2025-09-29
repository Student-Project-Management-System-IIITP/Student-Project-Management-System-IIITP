# 🧪 Complete Group Formation Testing Guide

This guide provides comprehensive testing instructions for the entire group formation process, including both automated and manual testing procedures.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Automated Testing](#automated-testing)
3. [Manual Testing Workflow](#manual-testing-workflow)
4. [Test Scenarios](#test-scenarios)
5. [Troubleshooting](#troubleshooting)
6. [Expected Results](#expected-results)

## 🔧 Prerequisites

### System Requirements
- Node.js (v16 or higher)
- MongoDB (running locally or accessible)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Git (for version control)

### Setup Steps
1. **Clone and Install Dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Backend environment
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   
   # Frontend environment
   cd ../frontend
   cp .env.example .env
   # Edit .env with your API URL
   ```

3. **Start Services**
   ```bash
   # Start MongoDB
   mongod

   # Start backend (terminal 1)
   cd backend
   npm start

   # Start frontend (terminal 2)
   cd frontend
   npm run dev
   ```

## 🤖 Automated Testing

### Backend Testing
```bash
# Run backend tests
cd backend
node scripts/testGroupFormation.js
```

**Expected Output:**
- ✅ Group creation with invitations
- ✅ Invitation acceptance/rejection
- ✅ Group finalization
- ✅ Multiple group scenarios
- ✅ Student search functionality
- ✅ Group status transitions

### Frontend Testing
```bash
# Run frontend tests (in browser console)
# Open browser dev tools and run:
const tester = new GroupFormationUITester();
await tester.runAllTests();
```

### Complete Testing Suite
```bash
# Run comprehensive test suite
node testGroupFormationComplete.js
```

## 👥 Manual Testing Workflow

### Phase 1: User Setup and Authentication

#### Step 1: Create Test Users
1. **Navigate to Registration Page**
   - Go to `http://localhost:3001/signup`
   - Register multiple test users (minimum 8 users for comprehensive testing)

2. **Create Student Accounts**
   ```
   User 1: Alice Johnson (alice.johnson@test.com) - MIS: 202400001
   User 2: Bob Smith (bob.smith@test.com) - MIS: 202400002
   User 3: Charlie Brown (charlie.brown@test.com) - MIS: 202400003
   User 4: Diana Prince (diana.prince@test.com) - MIS: 202400004
   User 5: Eve Wilson (eve.wilson@test.com) - MIS: 202400005
   User 6: Frank Miller (frank.miller@test.com) - MIS: 202400006
   User 7: Grace Lee (grace.lee@test.com) - MIS: 202400007
   User 8: Henry Davis (henry.davis@test.com) - MIS: 202400008
   ```

3. **Verify User Creation**
   - Login with each user
   - Check dashboard loads correctly
   - Verify user profile information

### Phase 2: Group Creation Testing

#### Step 2: Test Group Creation Process
1. **Login as Alice (Group Leader)**
   - Navigate to `http://localhost:3001/dashboard/student`
   - Verify "Create Group" option is visible

2. **Step 1: Group Details**
   - Click "Create Group"
   - Fill in group details:
     - **Name:** "Test Group Alpha"
     - **Description:** "This is a comprehensive test group for semester 5 minor project 2"
   - Click "Next"
   - ✅ **Verify:** Step advances to member selection

3. **Step 2: Member Selection**
   - Search for available students
   - ✅ **Verify:** Search shows Bob, Charlie, Diana, etc.
   - Select 3 members: Bob, Charlie, Diana
   - ✅ **Verify:** Selected members appear in "Group Members" section
   - ✅ **Verify:** Total count shows "4 members (You + 3 invites)"
   - Click "Next: Send Invitations"
   - ✅ **Verify:** Step advances to confirmation

4. **Step 3: Confirmation**
   - ✅ **Verify:** Group summary shows correct details
   - ✅ **Verify:** Leader shows as Alice
   - ✅ **Verify:** Selected members listed with names and MIS numbers
   - ✅ **Verify:** "Send Invitations" button is enabled
   - Click "Send Invitations"
   - ✅ **Verify:** Success message appears
   - ✅ **Verify:** Redirected to group dashboard

### Phase 3: Invitation Management Testing

#### Step 3: Test Invitation System
1. **Check Group Dashboard (Alice)**
   - Navigate to group dashboard
   - ✅ **Verify:** Group status shows "invitations_sent"
   - ✅ **Verify:** "Invited Members" section shows 3 pending invitations
   - ✅ **Verify:** Each invitation shows name, MIS number, and "Pending" status
   - ✅ **Verify:** Real-time updates panel is visible

2. **Test Invitation Acceptance (Bob)**
   - Login as Bob in new browser tab
   - Navigate to dashboard
   - ✅ **Verify:** "Group Invitations" shows pending invitation
   - ✅ **Verify:** Invitation shows group name and inviter
   - Click "Accept"
   - ✅ **Verify:** Success message appears
   - ✅ **Verify:** Bob is now part of the group
   - ✅ **Verify:** Dashboard shows group membership

3. **Test Invitation Rejection (Charlie)**
   - Login as Charlie in new browser tab
   - Navigate to dashboard
   - ✅ **Verify:** Pending invitation visible
   - Click "Reject"
   - ✅ **Verify:** Success message appears
   - ✅ **Verify:** Charlie is not part of any group

4. **Test Real-time Updates (Alice)**
   - Return to Alice's dashboard
   - ✅ **Verify:** Bob's status updated to "Accepted"
   - ✅ **Verify:** Charlie's status updated to "Rejected"
   - ✅ **Verify:** Real-time notifications panel shows updates

### Phase 4: Group Finalization Testing

#### Step 4: Test Group Finalization
1. **Accept More Invitations (Diana)**
   - Login as Diana
   - Accept the invitation
   - ✅ **Verify:** Diana joins the group

2. **Finalize Group (Alice)**
   - Return to Alice's group dashboard
   - ✅ **Verify:** Group has 3 members (Alice, Bob, Diana)
   - ✅ **Verify:** "Finalize Group" option is available
   - Click "Finalize Group"
   - Confirm finalization
   - ✅ **Verify:** Group status changes to "finalized"
   - ✅ **Verify:** Pending invitations are auto-rejected
   - ✅ **Verify:** "Register Minor Project 2" option appears

### Phase 5: Advanced Testing Scenarios

#### Step 5: Test Edge Cases and Error Handling

1. **Multiple Group Scenarios**
   - Create second group with Eve as leader
   - Invite Frank, Grace, Henry
   - ✅ **Verify:** Students can only be in one group
   - ✅ **Verify:** Invitation conflicts are handled properly

2. **Group Capacity Testing**
   - Try to invite more than 5 members
   - ✅ **Verify:** System prevents over-capacity invitations

3. **Invalid Data Testing**
   - Try creating group with empty name
   - ✅ **Verify:** Form validation prevents submission
   - Try creating group with short description
   - ✅ **Verify:** Validation error appears

4. **Network Error Testing**
   - Disconnect internet during group creation
   - ✅ **Verify:** Error handling and user feedback
   - Reconnect and retry
   - ✅ **Verify:** System recovers gracefully

5. **Browser Refresh Testing**
   - Start group creation process
   - Refresh browser during Step 2
   - ✅ **Verify:** Data persists (localStorage)
   - ✅ **Verify:** Can continue from where left off

### Phase 6: Data Integrity Testing

#### Step 6: Verify Database Consistency
1. **Check Database Records**
   ```bash
   # Connect to MongoDB
   mongosh
   
   # Check groups collection
   db.groups.find().pretty()
   
   # Check students collection
   db.students.find({}, {fullName: 1, groupMemberships: 1, invites: 1}).pretty()
   ```

2. **Verify Data Relationships**
   - ✅ **Verify:** Group members match student groupMemberships
   - ✅ **Verify:** Invitation statuses are consistent
   - ✅ **Verify:** No orphaned records exist

## 🧪 Test Scenarios

### Scenario 1: Happy Path
- **Description:** Complete successful group formation
- **Steps:** Create group → Send invitations → Accept invitations → Finalize group
- **Expected:** All steps complete successfully

### Scenario 2: Partial Acceptance
- **Description:** Some members accept, others reject
- **Steps:** Create group → Send invitations → Mixed responses
- **Expected:** System handles partial acceptance correctly

### Scenario 3: Group Conflict
- **Description:** Student tries to join multiple groups
- **Steps:** Create multiple groups → Try to accept invitations from both
- **Expected:** System prevents multiple group membership

### Scenario 4: Network Issues
- **Description:** Network problems during group formation
- **Steps:** Create group → Simulate network issues → Recover
- **Expected:** System handles network errors gracefully

### Scenario 5: Browser Issues
- **Description:** Browser refresh during group creation
- **Steps:** Start group creation → Refresh browser → Continue
- **Expected:** Data persists and process continues

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Create Group" Button Not Visible
**Symptoms:** Dashboard shows status messages but no create button
**Solutions:**
- Check user semester is 5
- Verify user role is student
- Check browser console for errors
- Refresh page and try again

#### Issue 2: Invitations Not Showing
**Symptoms:** Sent invitations don't appear in dashboard
**Solutions:**
- Check backend server is running
- Verify WebSocket connection
- Check browser network tab for API errors
- Refresh dashboard

#### Issue 3: Real-time Updates Not Working
**Symptoms:** Status changes don't update automatically
**Solutions:**
- Check WebSocket connection in browser dev tools
- Verify backend Socket.IO service is running
- Check browser console for WebSocket errors
- Try refreshing the page

#### Issue 4: Group Finalization Fails
**Symptoms:** Finalize button doesn't work or shows errors
**Solutions:**
- Check minimum member count is met (4 members)
- Verify all members have accepted invitations
- Check backend logs for specific error messages
- Ensure user is group leader

#### Issue 5: Data Not Persisting
**Symptoms:** Form data lost on page refresh
**Solutions:**
- Check localStorage in browser dev tools
- Verify localStorage is enabled
- Check for JavaScript errors preventing save
- Clear browser cache and try again

### Debug Commands

```bash
# Check backend logs
cd backend
npm start

# Check frontend console
# Open browser dev tools (F12)
# Check Console tab for errors

# Check network requests
# Open browser dev tools (F12)
# Check Network tab for failed requests

# Check MongoDB
mongosh
db.groups.find().pretty()
db.students.find({}, {fullName: 1, groupMemberships: 1}).pretty()
```

## ✅ Expected Results

### Successful Test Completion Indicators

1. **Group Creation:**
   - ✅ Form validation works correctly
   - ✅ Student search returns available members
   - ✅ Group created with correct status
   - ✅ Invitations sent successfully

2. **Invitation Management:**
   - ✅ Invitations appear in recipient dashboards
   - ✅ Accept/reject functionality works
   - ✅ Real-time updates show status changes
   - ✅ Bulk operations work correctly

3. **Group Finalization:**
   - ✅ Group finalizes when minimum members accept
   - ✅ Pending invitations are auto-rejected
   - ✅ Group status updates correctly
   - ✅ Project registration becomes available

4. **Data Integrity:**
   - ✅ Database records are consistent
   - ✅ No orphaned or duplicate records
   - ✅ Relationships between collections are correct
   - ✅ Status transitions are atomic

5. **User Experience:**
   - ✅ Smooth workflow progression
   - ✅ Clear status indicators
   - ✅ Helpful error messages
   - ✅ Data persistence across sessions

### Performance Expectations

- **Group Creation:** < 2 seconds
- **Invitation Sending:** < 1 second per invitation
- **Real-time Updates:** < 500ms delay
- **Page Load Times:** < 3 seconds
- **Database Operations:** < 1 second

### Browser Compatibility

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (responsive design)

## 📊 Test Report Template

After completing all tests, document results:

```markdown
## Test Report - [Date]

### Summary
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Success Rate: [Percentage]

### Issues Found
1. [Issue 1]: [Description and resolution]
2. [Issue 2]: [Description and resolution]

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

### Sign-off
- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] System ready for production
- [ ] Documentation updated
```

---

## 🎯 Quick Test Checklist

- [ ] **Prerequisites:** MongoDB running, dependencies installed
- [ ] **User Setup:** 8+ test users created
- [ ] **Group Creation:** Complete workflow tested
- [ ] **Invitation System:** Send, accept, reject tested
- [ ] **Real-time Updates:** WebSocket functionality verified
- [ ] **Group Finalization:** End-to-end process completed
- [ ] **Error Handling:** Edge cases and failures tested
- [ ] **Data Integrity:** Database consistency verified
- [ ] **Browser Compatibility:** Multiple browsers tested
- [ ] **Performance:** Response times within expectations

**✅ System Ready for Production Use!**
