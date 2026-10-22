# Strativa HRMS Biometric Hardware Integration Specification

## 1. Overview
The Strativa attendance module is built with a provider-based, device-independent architecture. Raw biometric events are ingested into `AttendanceRawPunch` with compound idempotency keys, and aggregated by `PunchProcessor` into daily employee attendance records without calculating fake work hours.

Until a physical machine is connected, attendance records can be ingested via the web portal or imported through the built-in **CSV/Excel Import Adapter**.

---

## 2. Information Required When Physical Hardware is Selected
When an attendance machine is purchased or identified, provide the following specifications to connect the hardware adapter:

### A. Device Make and Model
- **Manufacturer**: (e.g., ZKTeco, Hikvision, Dahua, eSSL, Realtime, Anviz, Suprema).
- **Exact Model Number**: (e.g., ZKTeco uFace 800, SilkBio-101TC, Hikvision DS-K1T341AM).
- **Firmware Version**: The exact firmware release installed on the unit.

### B. Communication Protocol & Architecture Mode
Biometric terminals operate in one of four connection models:
1. **Push Protocol / ADMS / Cloud Server (Recommended for Cloud / Vercel Deployments)**:
   - Device connects outward via HTTP/HTTPS/WebSocket to our server webhook URL (`POST /attendance/machine/push`).
   - Requires device support for ADMS / IClock / Cloud push protocol.
2. **Local Network Listener / Standalone Pull (Requires on-premise IP)**:
   - Standard TCP/IP Socket communication (e.g., port 4370 for ZKTeco standalone protocol).
   - Requires a static local IP on the office network or port-forwarding with a public static IP / DDNS.
   - Alternatively, a lightweight Strativa local relay agent installed on an office PC that polls the machine over LAN and posts to the cloud API.
3. **Vendor Middleware / Central Server API**:
   - If the device connects to vendor server software (e.g., ZK BioTime, ZKTime.Net, HikCentral, eTimeTrackLite), the integration connects to the vendor's REST API or database.
   - Requires: Base API URL, API Token / App Secret, or Database Read Credentials.
4. **Scheduled Automated File Export**:
   - If network communication is restricted, the device software exports attendance punches periodically (CSV/XML/Excel) to an SFTP/S3 bucket or upload endpoint.

### C. Network & Security Credentials
- **Device IP Address & Subnet**: (e.g., `192.168.1.201:4370`).
- **Communication Key / Comm Password**: Set in device menu (default is usually `0` or `123456`).
- **Cloud Server URL & Server Port**: If using ADMS, configured in the device's Cloud Server settings menu.
- **Firewall / Port Forwarding**: External port open to WAN if direct inbound polling is used.

### D. User ID & Badge Mapping
- Ensure the **User ID / PIN / Badge Number** registered on the biometric terminal matches or maps to the employee's `employee_code` in Strativa ERP (e.g., `EMP001` or numeric code).

---

## 3. Extensible Provider Architecture
New device drivers plug in by extending `AttendanceProvider` in `server/src/services/attendance/`:
- `server/src/services/attendance/AttendanceProvider.js` (Interface)
- `server/src/services/attendance/PunchProcessor.js` (Universal event aggregator)
- `server/src/services/attendance/CsvImportProvider.js` (Active CSV/sheet parser)
- `server/src/services/attendance/ZkTecoProvider.js` (Template ready for ZKTeco ADMS/TCP)
- `server/src/services/attendance/HikvisionProvider.js` (Template ready for Hikvision ISAPI)
