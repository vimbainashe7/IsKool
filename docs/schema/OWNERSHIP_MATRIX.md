# Ownership Matrix

| Data | Owner | APS Access | SAMS Access |
| --- | --- | --- | --- |
| Users | Shared identity authority to be ratified | Scoped auth reads | Scoped auth reads |
| Roles/user_roles | Shared identity authority to be ratified | Scoped roles only | Scoped roles only |
| Student master record | SAMS | Read via internal API/projection; no writable duplicate | Read/write |
| Guardians | SAMS | No direct access unless exposed | Read/write |
| Enrollments | SAMS | Read via internal API/projection | Read/write |
| Classes/timetables | SAMS for administrative schedule; APS may own academic class workspace metadata | Read projection | Read/write for admin schedule |
| Assignments/submissions/grades/notes/exams | APS | Read/write | No direct write |
| Fees/invoices/payments | SAMS | No write | Read/write |
| Attendance/leave/HR | SAMS | Read only if contract exists | Read/write |
| Audit logs | Owning system | Write APS events | Write SAMS events |
