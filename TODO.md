# TODO - School Dash (Sidebar/Layout)

- [ ] Implement full 2-column shell layout in `frontend/src/components/layout/AppShell.tsx`:
  - [ ] Left sidebar: main (~14%) visible on wide screens
  - [ ] Left mini sidebar: icons-only visible on medium/smaller
  - [ ] Right column (~86%): sticky top nav, page title, bell -> /notifications, user dropdown
  - [ ] Right column main content + footer pinned bottom
- [ ] Add mini sidebar component (reuse existing nav data, icons-only)
- [ ] Create `frontend/src/pages/Notifications.tsx` with placeholder latest news
- [ ] Add compact footer matching spec (Avalon Industries + Private policy | Terms of use)
- [ ] Verify routes:
  - [ ] `/` and `/login` hide top nav + sidebars + footer
  - [ ] protected routes show layout
  - [ ] unknown routes show 404
- [ ] Run frontend checks (build/lint)


Okay, we're working on... Let's work properly now on the sidenav. 1. Let's ensure that the pages are split into: Left Side: Should contain the main Side bar (should be visible on all pages (except login and home) floating on the left side about 14% of the entire screen size and as tall as the screen height, Showing Buttons and Icons that link to The Other pages (only on fullscreen or wide screens), and a mini Sidebar (Which shows only Icons that link to the same Other pages as on the Main side bar (Only visible on medium and smaller screen sizes, e.g., mobile screens). Right Side: should float on the right, width about 86%, Shcould contain: The componenets of the Open pages, which include a Top Nav bar which is always visible on all pages (except for login and home), and should contain (A hamburger menu: that toggles that Sidebar open/close state, for both the Main and mini Side Bars; Page Title: on the Right side of the Hamburger menu Which displays the name of the current open page;; A Bell Icon: which redirects to Notifications page wherer latest news are shown - we'll need to create this page too; and A User Profile Icon: which is a dropdown that shows options for the currents logged in user (e.g., Logout, Edit Profile, Profile information, etc.,)); then The Main Page content like Dashboard page for Dashboard, and the like for the other pages. For pages that are unavailahble, we'll keep the 404 error page displayed for them, while we work on them. At the bottom of the page, we'll add a Footer section which shows copyright Avalon Industries (on the left side), Private policy | Terms of use (on the right side) Let's get to it. Let's continue from frontend/src/components/layout/AppSell.tsx fill we're working on previously.