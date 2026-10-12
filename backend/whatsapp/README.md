# 🤖 TimeFlow WhatsApp Assistant

A bidirectional WhatsApp bot connecting your phone to TimeFlow. Manage job applications, tasks, alarms, and notes seamlessly with real-time web sync.

---

## 🚀 Quick Start

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```
2. On initial startup, if no saved session exists, a QR code will print in the console. Scan it with WhatsApp on your phone.
3. Message the bot from your phone:
   ```text
   link <your-email> <your-password>
   ```
4. Once linked, you can manage your applications and tasks directly from WhatsApp!

---

## 💬 Command Reference

### 💼 Job Tracker
- `jobs` or `jobs [stage]` — List active applications (e.g. `jobs OA`)
- `job <n|company>` — View full job details
- `add job <Company> | <Role> | [Stage] | [CTC] | [Link]`
- `edit job <n> | ctc=18 LPA, next=tomorrow`
- `move <n> | <stage>` — Update stage (`Applied`, `OA`, `Tech`, `HR`, `Offered`, `Rejected`)
- `del job <n>` — Delete an application
- `resume <n>` — Downloads attached resume file to your WhatsApp chat
- `funnel` or `stats` — Overview of interview conversion stages

### ⏰ Alarms & Scheduled Alerts
- `alarms` — View configured alarms
- `alarm 07:30 | Morning Routine | MON,TUE,WED` — Create recurring alarm
- `alarm on <n>` / `alarm off <n>` — Enable/disable
- `del alarm <n>` — Delete alarm

### 📝 Tasks & Productivity
- `tasks` or `todo` — View pending tasks
- `add task <Title> | [Reason] | [Due Date/Time]`
- `done <n>` — Mark task completed
- `del task <n>` — Delete task
- `today` — Comprehensive overview of today's tasks and alarms
- `search <keyword>` — Search across tasks, jobs, and notes

### ⚙️ Account
- `whoami` — Check currently linked account details
- `unlink` — Disconnect phone from TimeFlow
