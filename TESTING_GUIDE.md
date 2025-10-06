# Testing Guide: Calendar and Recurring Reservations

## Quick Start Testing

### Prerequisites
1. Backend server running on http://localhost:8000
2. Frontend server running on http://localhost:5173
3. PostgreSQL database with sample data
4. User account created and logged in

## Test Scenarios

### Scenario 1: Basic Calendar View

**Steps:**
1. Log in to the application
2. Click "Calendar" in the top navigation
3. Select a room from the dropdown
4. Verify monthly view displays correctly
5. Click "Week" button to switch to week view
6. Click "Day" button to switch to day view
7. Use Previous/Next arrows to navigate
8. Click "Today" to return to current date

**Expected Results:**
- Calendar displays without errors
- Room selector shows all available rooms
- View switches work smoothly
- Reservations appear as colored blocks
- Blue = Confirmed, Amber = Pending, Gray = Cancelled
- Navigation updates the date range correctly

### Scenario 2: Quick Reservation from Calendar

**Steps:**
1. Navigate to Calendar view
2. Select a room with available slots
3. Click on an empty time slot
4. Modal appears with pre-filled date/time
5. Fill in:
   - Purpose: "Test meeting"
   - Attendees: "3"
   - Contact Email: your email
6. Click "Create Reservation"
7. Wait for success message
8. Verify new event appears on calendar

**Expected Results:**
- Modal opens instantly
- Date and time pre-filled from selected slot
- Validation works for required fields
- Reservation creates successfully
- Calendar updates with new event
- Event shows in correct color (amber for pending)

### Scenario 3: Weekly Recurring Reservation

**Steps:**
1. Go to "Browse Rooms"
2. Find a room with the repeat icon (🔁)
3. Click the repeat icon button
4. Recurring modal opens
5. Select "Weekly" frequency
6. Set start date: tomorrow
7. Set end date: 4 weeks from tomorrow
8. Set time: 10:00 AM - 11:00 AM
9. Fill in:
   - Purpose: "Weekly team standup"
   - Attendees: "5"
   - Email: your email
10. Click "Show Preview" if collapsed
11. Review the 4 dates generated
12. Check for any conflicts (red badges)
13. Click "Create Reservations"
14. Wait for success notification

**Expected Results:**
- Modal displays all frequency options
- Preview shows exactly 4 dates (weekly for 4 weeks)
- Each date shows day of week
- Conflicts highlighted in red
- Available dates shown in green
- Button shows "Create 4 Reservations" (or fewer if conflicts)
- Success message shows count: "Successfully created 4 reservations. 0 conflicts detected."
- "My Reservations" shows all 4 new entries

### Scenario 4: Monthly Recurring with Conflicts

**Steps:**
1. Create a single reservation for next month, 15th, 2:00 PM - 3:00 PM
2. Go to Browse Rooms
3. Click repeat icon for same room
4. Select "Monthly" frequency
5. Set start date: next month, 15th
6. Set end date: 3 months later
7. Set time: 2:00 PM - 3:00 PM (same as existing)
8. Fill in other fields
9. View preview
10. Observe first date has conflict (red)
11. Click "Create Reservations"

**Expected Results:**
- Preview shows 3 monthly occurrences
- First date (15th of next month) shows red conflict badge
- Other 2 dates show green (available)
- Warning message: "1 date has conflicts"
- Subtext: "These dates will be skipped. Only 2 reservations will be created."
- After creation, success message: "Successfully created 2 reservations. 1 conflict detected."
- Conflicting date was NOT created
- Other 2 dates created successfully

### Scenario 5: Daily Recurring Pattern

**Steps:**
1. Click repeat icon on any room
2. Select "Daily" frequency
3. Set start date: tomorrow
4. Set end date: 1 week from tomorrow (7 days)
5. Set time: 9:00 AM - 10:00 AM
6. Fill in details
7. View preview (should show 7 dates)
8. Create reservations

**Expected Results:**
- Preview shows 7 consecutive days
- All dates are weekdays + weekends
- If any conflicts, those dates shown in red
- Success creates one reservation per day
- Can view all 7 in "My Reservations"

### Scenario 6: Bi-weekly Recurring

**Steps:**
1. Click repeat icon
2. Select "Bi-weekly"
3. Start date: tomorrow
4. End date: 6 weeks from tomorrow
5. Time: 3:00 PM - 4:00 PM
6. Complete form
7. Check preview (should show 3 dates: week 0, 2, 4, 6)
8. Create

**Expected Results:**
- Preview shows dates 2 weeks apart
- Total of 3-4 occurrences (depending on exact dates)
- Creates successfully
- All have same time slot

### Scenario 7: Edge Cases

#### Test 7A: Past Date Validation
1. Try to set start date in the past
2. Should be blocked by date input (min attribute)

#### Test 7B: End Before Start
1. Set end date before start date
2. Form should prevent submission or show error

#### Test 7C: Maximum Capacity
1. Set attendees > room capacity
2. Should show validation error

#### Test 7D: Time Range Validation
1. Set end time before start time
2. Should show error or warning

#### Test 7E: Empty Required Fields
1. Leave purpose empty
2. Try to submit
3. Should show "Purpose required" error

#### Test 7F: Very Long Pattern
1. Try daily frequency for 1 year (365 days)
2. Preview might take longer
3. Should handle gracefully (or add limit)

### Scenario 8: Reservation Management

**Steps:**
1. Create a recurring pattern (weekly, 4 occurrences)
2. Go to "My Reservations"
3. Find the reservations (all 4 should be listed)
4. Each has same purpose, room, time
5. Each has different date (1 week apart)
6. Try to cancel one
7. Confirm cancellation
8. Verify only that one is cancelled
9. Other 3 remain active

**Expected Results:**
- All recurring reservations listed individually
- Can manage each independently
- Cancelling one doesn't affect others
- Status shows correctly (pending/confirmed)

### Scenario 9: Calendar Multi-Room View

**Steps:**
1. Go to Calendar
2. Select Room A
3. Note the reservations
4. Switch to Room B using dropdown
5. Calendar updates with Room B's reservations
6. Switch back to Room A
7. Data refreshes correctly

**Expected Results:**
- Room selector works smoothly
- Calendar updates when room changes
- Each room shows only its reservations
- No cross-contamination of data
- Loading indicator during fetch

### Scenario 10: Dark Mode Testing

**Steps:**
1. Toggle dark mode using theme button
2. Check Calendar view in dark mode
3. Check recurring modal in dark mode
4. Verify all colors are readable
5. Check contrast on events
6. Preview conflicts should be visible

**Expected Results:**
- All text readable in dark mode
- Calendar grid lines visible
- Events have good contrast
- Modals have dark background
- Buttons style correctly
- No white flashes during transition

## API Testing

### Test Preview Endpoint

```bash
# Get preview for weekly recurring reservation
curl -X GET \
  'http://localhost:8000/api/reservations/recurring/preview/?frequency=weekly&start_date=2025-10-08&end_date=2025-11-08&room_id=1&start_time=10:00&end_time=11:00' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Expected Response:**
```json
{
  "total_dates": 5,
  "conflicts": 0,
  "available": 5,
  "dates": [
    {
      "date": "2025-10-08",
      "day_of_week": "Wednesday",
      "has_conflict": false
    },
    ...
  ]
}
```

### Test Create Endpoint

```bash
# Create weekly recurring reservation
curl -X POST \
  http://localhost:8000/api/reservations/recurring/ \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{
    "room_id": 1,
    "frequency": "weekly",
    "start_date": "2025-10-08",
    "end_date": "2025-11-08",
    "start_time": "10:00",
    "end_time": "11:00",
    "purpose": "Weekly team standup",
    "attendees": 5,
    "contact_email": "test@example.com"
  }'
```

**Expected Response:**
```json
{
  "recurring_pattern_id": 1,
  "reservations_created": 5,
  "conflicts": [],
  "created_dates": [
    "2025-10-08",
    "2025-10-15",
    "2025-10-22",
    "2025-10-29",
    "2025-11-05"
  ],
  "message": "Successfully created 5 reservations. 0 conflicts detected."
}
```

### Test Calendar Availability

```bash
# Get room availability for October 2025
curl -X GET \
  'http://localhost:8000/api/rooms/1/availability/?start_date=2025-10-01&end_date=2025-10-31' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

**Expected Response:**
```json
{
  "room_id": 1,
  "room_name": "Conference Room A",
  "start_date": "2025-10-01",
  "end_date": "2025-10-31",
  "availability": {
    "2025-10-01": {
      "date": "2025-10-01",
      "is_available": true,
      "reservations": []
    },
    "2025-10-08": {
      "date": "2025-10-08",
      "is_available": false,
      "reservations": [
        {
          "id": 123,
          "start_time": "10:00",
          "end_time": "11:00",
          "status": "confirmed",
          "attendees": 5
        }
      ]
    }
  }
}
```

## Bug Reports Template

If you find issues, report them with this format:

```
## Bug: [Short description]

**Environment:**
- Browser: Chrome 120 / Firefox 121 / Safari 17
- OS: Windows 11 / macOS 14 / Ubuntu 22.04
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Screenshots:**
(if applicable)

**Console Errors:**
(copy from browser console)

**Network Errors:**
(copy from Network tab)

**Additional Context:**
Any other relevant information
```

## Performance Testing

### Load Test Calendar
1. Create 100 reservations for single room across 1 month
2. Navigate to calendar
3. Measure page load time (should be <2 seconds)
4. Switch between month/week/day views (should be instant)

### Load Test Recurring Pattern
1. Try creating daily pattern for 90 days
2. Preview should load in <1 second
3. Creation should complete in <3 seconds
4. Database should handle 90 INSERT operations efficiently

## Success Criteria

All scenarios should:
- ✅ Complete without errors
- ✅ Display appropriate feedback messages
- ✅ Update UI in real-time
- ✅ Handle conflicts gracefully
- ✅ Validate inputs properly
- ✅ Work in both light and dark modes
- ✅ Be responsive on mobile devices
- ✅ Maintain good performance (<2s load times)

## Troubleshooting

### Issue: Calendar shows no events
**Solution:**
- Check room has reservations in date range
- Verify API returns data in Network tab
- Check console for JavaScript errors

### Issue: Recurring modal won't open
**Solution:**
- Check React errors in console
- Verify modal state is being set
- Check if button click handler is attached

### Issue: Conflicts not detected
**Solution:**
- Verify reservations exist in database
- Check time overlap logic in backend
- Test with exact same time range

### Issue: Preview takes too long
**Solution:**
- Reduce date range
- Check database query performance
- Add database indexes if needed

## Final Checklist

Before marking as complete, verify:
- [ ] All 10 scenarios pass
- [ ] No console errors
- [ ] No network errors (except expected 404s)
- [ ] Dark mode works perfectly
- [ ] Mobile responsive (test on phone)
- [ ] Toast notifications appear
- [ ] Loading states show appropriately
- [ ] Error messages are helpful
- [ ] Can create, view, and cancel reservations
- [ ] Calendar navigation is smooth
- [ ] All buttons have hover states
- [ ] Forms validate inputs
- [ ] Success messages are clear

---

**Happy Testing!**

For questions or issues, refer to:
- Implementation Report: `CALENDAR_IMPLEMENTATION_REPORT.md`
- CLAUDE.md for general project information
- Backend API: http://localhost:8000/api/
- Frontend Dev Server: http://localhost:5173
