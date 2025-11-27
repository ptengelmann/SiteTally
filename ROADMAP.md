# SiteTally Roadmap

## Current Status: MVP Complete

Last updated: November 27, 2024

---

## Completed Features

### Phase 1: Core MVP
- [x] User authentication (login/register)
- [x] Role-based access control (manager/worker)
- [x] Asset CRUD operations
- [x] QR code scanning with camera
- [x] Check-in/check-out functionality
- [x] Real-time status updates
- [x] Asset history/audit trail
- [x] PostgreSQL database (Neon)

### Phase 2: Dashboard & Management
- [x] Dashboard with summary cards
- [x] Assets tab with search and filtering
- [x] Activity tab with global feed
- [x] Team tab for user management (managers only)
- [x] Add/edit/delete assets
- [x] Add/edit/deactivate users

### Phase 3: Mobile Experience
- [x] PWA manifest and icons
- [x] Install prompt for mobile browsers
- [x] "App Installed" indicator
- [x] Haptic feedback on scan success
- [x] Location presets for quick selection
- [x] Mobile-optimized UI

### Phase 4: Reporting & Alerts
- [x] Overdue alerts (7+ days checked out)
- [x] CSV export for assets
- [x] CSV export for activity logs
- [x] CSV export for team members
- [x] QR label printing (batch)
- [x] Asset categories

---

## In Progress

*Nothing currently in progress*

---

## Up Next

### Phase 5: Enhanced Notifications
- [ ] Push notifications for overdue items
- [ ] Email alerts for managers
- [ ] Configurable alert thresholds

### Phase 6: Location & GPS
- [ ] Capture GPS coordinates on check-in/out
- [ ] Map view of asset locations
- [ ] Geofencing for job sites

### Phase 7: Multi-tenancy
- [ ] Organization/company accounts
- [ ] Invite system for team members
- [ ] Organization-level settings
- [ ] Subscription/billing integration

---

## Future Ideas

### Analytics & Insights
- [ ] Utilization reports (most/least used assets)
- [ ] User activity summaries
- [ ] Cost tracking and depreciation
- [ ] Maintenance scheduling

### Integrations
- [ ] Slack/Teams notifications
- [ ] Calendar integration for reservations
- [ ] Accounting software sync
- [ ] Barcode support (in addition to QR)

### Advanced Features
- [ ] Asset reservations/booking
- [ ] Maintenance mode with service history
- [ ] Photo documentation on check-in/out
- [ ] Asset grouping (kits/sets)
- [ ] Custom fields per asset type

### Enterprise
- [ ] SSO/SAML authentication
- [ ] Audit log exports
- [ ] API access for integrations
- [ ] White-labeling

---

## Technical Debt

- [ ] Add comprehensive test coverage
- [ ] Set up CI/CD pipeline
- [ ] Add error monitoring (Sentry)
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1)

---

## How to Contribute

1. Pick an item from "Up Next"
2. Create a feature branch
3. Implement and test
4. Submit a PR for review

For questions or suggestions, open an issue on GitHub.
