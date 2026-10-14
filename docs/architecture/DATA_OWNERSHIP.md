# Data Ownership

APS owns academic workflow data:

- course outlines
- assignments
- submissions
- grade components
- grades
- notes
- question bank
- exams
- announcements
- APS AI job metadata
- APS academic audit events

SAMS owns administrative and master data:

- student master record
- guardians
- admissions
- enrollments
- staff/HR
- fee heads
- invoices
- payments
- attendance
- leave
- timetables
- reporting
- SAMS audit events

Rules:

- APS never writes SAMS-owned tables.
- APS never creates a writable duplicate student master.
- APS does not use direct cross-schema joins as normal architecture.
- SAMS exposes internal read contracts needed by APS.
- Critical writes are audited in the owning system.
- APS may consume SAMS read projections/internal APIs for authorization and display.
