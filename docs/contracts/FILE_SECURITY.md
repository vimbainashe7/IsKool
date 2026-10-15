# File Security Contract

Upload and download features must include:

- magic-byte validation
- extraction size caps for archives and DOCX-style containers
- UUID/server-generated object names
- authenticated download authorization
- type allow-list
- content-length limit
- metadata capture
- signed URLs only after authorization
- future malware scan hook
- lifecycle cleanup

Object keys must never be derived from unsafe user filenames.
