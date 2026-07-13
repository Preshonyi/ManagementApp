# Precious Cloud Probase Todo

Cloud-based to-do list management system for the Shoprite Nigeria case study. It uses React, Tailwind CSS, Firebase Authentication, and Supabase for task data, realtime updates, reporting, and file attachments.

## Features

- User registration, login, and logout with Firebase Authentication
- Create, edit, delete, search, and filter tasks
- Deadlines, priorities, status tracking, reminders, and browser notifications
- Supabase realtime task refresh and attachment uploads
- Admin/reporting view controlled by `VITE_ADMIN_EMAILS`
- Dashboard analytics for total, completed, due-soon, and overdue tasks
- Dark mode and responsive layouts for mobile and desktop
- Local demo mode when cloud credentials are not configured

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in Firebase and Supabase values.

3. In Supabase SQL Editor, run:

   ```sql
   -- contents of supabase/schema.sql
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Cloud Notes

Firebase is used for authentication and optional analytics. Supabase stores tasks, streams realtime updates, and stores task attachment files in the `task-attachments` bucket.

The included Supabase policies are open prototype policies because the app signs users in with Firebase, not Supabase Auth. For production, replace them with Supabase Auth or a Firebase custom JWT bridge so row-level security can verify each user directly.

## Suggested Diagrams

### Use Case Diagram

```mermaid
flowchart LR
  Staff((Staff))
  Admin((Admin))
  System[Cloud To-Do System]
  Staff -->|Register/Login| System
  Staff -->|Create/Edit/Delete Tasks| System
  Staff -->|Set Deadlines and Reminders| System
  Staff -->|Upload Attachments| System
  Staff -->|Search and Filter Tasks| System
  Admin -->|View Reports| System
  Admin -->|Manage Staff Tasks| System
```

### Class Diagram

```mermaid
classDiagram
  class User {
    string uid
    string email
    string displayName
    boolean isAdmin
  }
  class Task {
    uuid id
    string title
    string description
    string status
    string priority
    datetime deadline
    datetime reminderAt
    string assignedTo
    string sharedWith
  }
  class Attachment {
    string name
    string publicUrl
  }
  User "1" --> "*" Task : creates
  Task "0..1" --> "1" Attachment : has
```

### Activity Diagram

```mermaid
flowchart TD
  A[Open App] --> B{Authenticated?}
  B -- No --> C[Login or Register]
  C --> D[Dashboard]
  B -- Yes --> D
  D --> E[Create or Update Task]
  E --> F[Save to Supabase]
  F --> G[Realtime Refresh]
  D --> H[Search, Filter, Report]
```

### Sequence Diagram

```mermaid
sequenceDiagram
  actor User
  participant React
  participant Firebase
  participant Supabase
  User->>React: Submit login form
  React->>Firebase: Authenticate user
  Firebase-->>React: User session
  React->>Supabase: Fetch tasks
  Supabase-->>React: Task records
  User->>React: Save task
  React->>Supabase: Insert/update task
  Supabase-->>React: Realtime task event
```

### Data Flow Diagram

```mermaid
flowchart LR
  User[Staff/Admin] --> UI[React UI]
  UI --> Auth[Firebase Auth]
  UI --> DB[(Supabase Tasks)]
  UI --> Files[(Supabase Storage)]
  DB --> Reports[Dashboard Reports]
  Reports --> UI
```

### ERD

```mermaid
erDiagram
  USERS ||--o{ TASKS : creates
  TASKS ||--o| ATTACHMENTS : includes
  USERS {
    string uid
    string email
    string display_name
  }
  TASKS {
    uuid id
    string title
    string status
    string priority
    timestamp deadline
    timestamp reminder_at
    string assigned_to
    string shared_with
  }
  ATTACHMENTS {
    string attachment_name
    string attachment_url
  }
```
