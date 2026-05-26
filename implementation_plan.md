# Implementation Plan: PowerBI Mock Interface & Interactive Charts

We will transform the Admin Portal into a high-fidelity clone of the Microsoft PowerBI dark-mode service interface. It will feature real, interactive charts populated by a local sorting history (combining actual ceremony play results with pre-populated seed data).

---

## Proposed UI/UX Layout

```
+-------------------------------------------------------------------------+
| [=] Power BI  |  My Workspace > Reports > Auditour Recruitment   [Back] | (Header)
+---+---------------------------------------------------------------------+
| H | [ KPI: 154 Sorted ] [ KPI: Advisory (Popular) ] [ KPI: 94% Match ]  |
| C | +-----------------------------------------------------------------+ |
| B | | [Bar Chart: Sorted by Dept]       [Pie Chart: Skill Match]      | |
| M | |                                                                 | |
| W | | [Line Chart: Ceremony Timeline]                                 | |
|   | +-----------------------------------------------------------------+ |
+---+---------------------------------------------------------------------+
|   | [Recruit Analysis] [Skill Breakdown] [Logs]                         | (Tabs)
+---+---------------------------------------------------------------------+
```

* **Header Bar**: PowerBI logo, breadcrumbs, search, user profile icon, and a prominent **"Back to Ceremony"** ribbon button.
* **Left Navigation Bar**: PowerBI service icons (Home, Create, Browse, OneLake, Workspaces).
* **Interactive Canvas**: High-fidelity dashboard panels containing:
  * Key Performance Indicators (KPIs) cards.
  * Bar chart representing sorted recruits by department.
  * Doughnut chart showing skill match categories.
  * Line chart showing sorting activity timeline.
* **Page Navigation Tabs**: Bottom tab bar mimicking the PowerBI tab strip ("Recruit Analysis", "Skill Breakdown").

---

## Proposed Changes

### 1. [MODIFY] [index.html](file:///c:/Users/Administrator/Downloads/Auditour-Sorting%20Ceremony/index.html)
* Add Chart.js CDN dependency in `<head>`.
* Replace the `#admin-screen` contents with the PowerBI container mockup structure:
  * Header, sidebar, dashboard grid, and page tabs.
  * Add canvas elements for Chart.js integrations.

### 2. [MODIFY] [style.css](file:///c:/Users/Administrator/Downloads/Auditour-Sorting%20Ceremony/style.css)
* Add PowerBI aesthetic tokens (`#1f1f1f` header, `#181818` sidebar, yellow highlight themes).
* Style charts containers, KPI cards, and custom filter buttons to look like native PowerBI report visual cards.
* Style the navigation breadcrumbs and user options.

### 3. [MODIFY] [app.js](file:///c:/Users/Administrator/Downloads/Auditour-Sorting%20Ceremony/app.js)
* Implement local sorting results capture:
  * Save each completed sorting ceremony result (Department, Timestamp, Scores) in `localStorage`.
  * Seed initial history if storage is empty (so the report looks fully populated with e.g., 148 sorted candidates).
* Hook the Admin Portal toggle to:
  * Parse history data.
  * Initialize/update Chart.js chart instances.
  * Animate the KPI counters.

---

## Verification Plan

### Manual Verification
* Click **Admin Portal** from the main menu.
* Verify the interface resembles the official PowerBI service interface.
* Verify tooltips and animations are working on the bar, doughnut, and line charts.
* Complete the ceremony, select a department, return to menu, and open the Admin Portal again. Confirm the dashboard counter and charts dynamically increment to reflect your real results.
* Click the **"Back to Ceremony"** button in the header and verify it returns to the main menu.
