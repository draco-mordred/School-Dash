#!/bin/bash

# Notification System Quick Start Testing Script
# This script creates test notifications for quick testing

set -e

API_BASE="http://localhost:5000/api"
USER_ID="${1:-}"

if [ -z "$USER_ID" ]; then
  echo "❌ Usage: bash test-notifications.sh <USER_ID>"
  echo "   Example: bash test-notifications.sh 6739a1b2c3d4e5f6g7h8i9j0"
  exit 1
fi

echo "🚀 Starting Notification System Test..."
echo "   API Base: $API_BASE"
echo "   User ID: $USER_ID"
echo ""

# Helper function to create activity notifications
create_notification() {
  local activity_type=$1
  local title=$2
  local offset_seconds=$3
  
  scheduled_time=$(node -e "console.log(new Date(Date.now() + $offset_seconds * 1000).toISOString())")
  
  echo "📝 Creating $activity_type notification: $title (in ${offset_seconds}s)..."
  
  curl -s -X POST "$API_BASE/activity-notifications" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$USER_ID\",
      \"activityId\": \"test-$(date +%s)\",
      \"activityType\": \"$activity_type\",
      \"activityTitle\": \"$title\",
      \"classId\": \"class-test\",
      \"location\": \"Room 101\",
      \"scheduledTime\": \"$scheduled_time\",
      \"leadTimeMinutes\": $([ \"$activity_type\" = \"lecture\" ] && echo \"15\" || echo \"20\"),
      \"message\": \"Reminder: $title starts soon\"
    }" | jq '.' || echo "❌ Failed to create notification"
  
  echo ""
}

echo "═══════════════════════════════════════════════════════════"
echo "BATCH 1: Immediate Test (Notifications fire in ~60 seconds)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Create notifications that will fire in 60 seconds
create_notification "lecture" "Introduction to Biology" 60
create_notification "clinical" "Pediatric Clinical Round" 60

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "BATCH 2: Mid-range Test (Notifications fire in ~5 minutes)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Create notifications that will fire in 5 minutes
create_notification "tutorial" "Statistics Tutorial" 300
create_notification "duty" "Ward Duty Assignment" 300

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "BATCH 3: Long-range Test (Notifications fire in ~30 minutes)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Create notifications that will fire in 30 minutes
create_notification "lecture" "Advanced Pharmacology" 1800
create_notification "call" "On-Call Duty" 1800

echo ""
echo "✅ Test notifications created successfully!"
echo ""
echo "📊 Next Steps:"
echo "   1. Go to Dashboard page"
echo "   2. Scroll to 'Your Activities' section"
echo "   3. Verify all 6 activities appear with status badges"
echo "   4. Wait for notifications to fire (check browser notification popup)"
echo "   5. Check that status changes from 'Scheduled' → 'Upcoming' → 'In Progress'"
echo ""
echo "🔍 To view pending notifications:"
echo "   curl -H 'Authorization: Bearer TOKEN' \\"
echo "     $API_BASE/activity-notifications/pending/$USER_ID"
echo ""
echo "🧹 To clean up test notifications:"
echo "   Use MongoDB CLI to delete notifications created in the last minute"
echo "   db.activitynotifications.deleteMany({ createdAt: { \\\$gte: new Date(Date.now() - 60000) } })"
