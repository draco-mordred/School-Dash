# Notification System Testing Guide

## Backend Testing

### 1. Test Activity Notification Creation

**Endpoint:** `POST /activity-notifications`

**Request:**
```bash
curl -X POST http://localhost:5000/api/activity-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "activityId": "class-123",
    "activityType": "lecture",
    "activityTitle": "Introduction to Biology",
    "classId": "class-123",
    "location": "Room 101",
    "scheduledTime": "2026-07-26T14:30:00Z",
    "leadTimeMinutes": 15,
    "message": "Reminder: Introduction to Biology starts in 15 minutes"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "notification": {
    "_id": "notification-id",
    "userId": "user-id",
    "activityId": "class-123",
    "activityType": "lecture",
    "activityTitle": "Introduction to Biology",
    "scheduledTime": "2026-07-26T14:30:00Z",
    "notificationTime": "2026-07-26T14:15:00Z",
    "leadTimeMinutes": 15,
    "status": "pending",
    "browserNotificationSent": false,
    "createdAt": "2026-07-26T10:00:00Z",
    "updatedAt": "2026-07-26T10:00:00Z"
  }
}
```

---

### 2. Test Get Pending Notifications

**Endpoint:** `GET /activity-notifications/pending/:userId`

**Request:**
```bash
curl -X GET http://localhost:5000/api/activity-notifications/pending/USER_ID_HERE \
  -H "Authorization: Bearer TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "_id": "notification-id",
      "userId": "user-id",
      "activityType": "lecture",
      "activityTitle": "Introduction to Biology",
      "scheduledTime": "2026-07-26T14:30:00Z",
      "notificationTime": "2026-07-26T14:15:00Z",
      "status": "pending",
      "createdAt": "2026-07-26T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 3. Test Get Due Notifications

**Endpoint:** `GET /activity-notifications/due/:userId`

**Request:**
```bash
curl -X GET http://localhost:5000/api/activity-notifications/due/USER_ID_HERE \
  -H "Authorization: Bearer TOKEN"
```

**Expected Response:** Same as pending, but only notifications where `notificationTime <= now`

---

### 4. Test Update Notification Status

**Endpoint:** `PATCH /activity-notifications/:id`

**Request (Mark as Sent):**
```bash
curl -X PATCH http://localhost:5000/api/activity-notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sent",
    "browserNotificationSent": true
  }'
```

**Request (Mark as Dismissed):**
```bash
curl -X PATCH http://localhost:5000/api/activity-notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "dismissed"
  }'
```

---

## Frontend Testing

### 1. Manual Browser Notification Test

1. Navigate to Dashboard
2. Browser should prompt to allow notifications
3. Grant permission when prompted
4. Manually create an activity notification with a time 1 minute from now:
   ```javascript
   // In browser console:
   const { createNotificationRecord } = await import('/src/lib/notifications.ts');
   const now = new Date();
   const activity = {
     id: 'test-123',
     title: 'Test Lecture',
     type: 'lecture',
     startTime: new Date(now.getTime() + 60000), // 1 minute from now
     endTime: new Date(now.getTime() + 120000),
     classId: 'class-123'
   };
   await createNotificationRecord('YOUR_USER_ID', activity, new Date(now.getTime() + 45000));
   ```

5. Wait ~45 seconds and observe browser notification

---

### 2. Activity Dashboard Test

1. Go to Dashboard page
2. Scroll to "Your Activities" section
3. You should see:
   - **Today's Section:** Activities scheduled for today grouped by status
   - **This Week Section:** Activities for the current week
   - **Status Badges:** 
     - 🔵 Scheduled (>15 min away)
     - 🟡 Upcoming (within 15 min)
     - 🟢 In Progress (active now)
     - ⚫ Completed (finished)
   - **Notifications Count:** Badge showing pending notifications

---

### 3. Test Notification Preferences

1. Click on notification badges in Activity Dashboard
2. Verify status indicators match activity times
3. Check that timeline progress bars update in real-time

---

## End-to-End Testing Workflow

### Scenario 1: Lecture Reminder

1. **Create a lecture** in timetable scheduled 20 minutes from now
2. **Verify Dashboard** shows it with "Upcoming" status (yellow badge)
3. **Wait 5 minutes** → status should stay "Upcoming"
4. **Wait 10+ more minutes** → browser notification should appear
5. **Verify notification** shows correct activity title and time

---

### Scenario 2: Clinical Activity Reminder

1. **Create a clinical posting** scheduled 25 minutes from now
2. **Verify Dashboard** shows it with "Upcoming" status
3. **Wait 5+ minutes** → browser notification should appear (20 min lead time)

---

### Scenario 3: Multiple Activities

1. **Create 3 activities** with different times (1 hour, 30 min, 5 min away)
2. **Verify all appear** in Activity Dashboard
3. **Verify status order:** 5-min activity shows "Upcoming" (yellow), others "Scheduled" (blue)
4. **Verify notifications** fire at correct lead times

---

## Database Verification

### Check Created Notifications

```javascript
// In MongoDB CLI
use school_dash_db
db.activitynotifications.find({ status: "pending" }).pretty()
```

Expected to see notifications with:
- status: "pending" (before notification time)
- status: "sent" (after notification sent)
- browserNotificationSent: true/false

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Browser notifications not appearing | 1. Check permission in browser settings<br>2. Run `Notification.requestPermission()`<br>3. Verify lead time calculation |
| Activity Dashboard empty | 1. Check user has timetable/postings<br>2. Verify API `/timetables` and `/rotation-schedules/events` return data<br>3. Check browser console for fetch errors |
| Notifications not created | 1. Verify backend endpoint is registered (`/api/activity-notifications`)<br>2. Check MongoDB connection<br>3. Verify request body has all required fields |
| Dashboard not showing | 1. Verify `ActivityDashboard` import in Dashboard.tsx<br>2. Check for TypeScript errors<br>3. Look for fetch errors in Network tab |

---

## Performance Testing

### Load Test: Create 100 Notifications

```bash
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/activity-notifications \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"test-user\",
      \"activityId\": \"activity-$i\",
      \"activityType\": \"lecture\",
      \"activityTitle\": \"Test Activity $i\",
      \"scheduledTime\": \"2026-07-26T$(printf '%02d' $((15 + i/60))):$(printf '%02d' $((i % 60))):00Z\",
      \"leadTimeMinutes\": 15,
      \"message\": \"Test notification $i\"
    }"
done
```

Verify:
- All 100 notifications created successfully
- `GET /activity-notifications/pending/:userId` returns all 100
- Dashboard handles large notification lists smoothly

---

## Debugging Tips

1. **Check browser console** for API errors
2. **Use Network tab** to inspect API request/response
3. **Check server logs** for backend errors
4. **Verify MongoDB collections:** 
   - `activitynotifications` table exists
   - Indexes created correctly
5. **Test in private/incognito window** to bypass extension interference
