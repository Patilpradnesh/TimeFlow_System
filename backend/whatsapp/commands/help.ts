/**
 * ═══════════════════════════════════════════════════════════════════
 * COMMAND: HELP & GREETING
 * ═══════════════════════════════════════════════════════════════════
 */

export const handleHelp = async (): Promise<string> => {
  return [
    '🤖 *TimeFlow WhatsApp Assistant*',
    '',
    '💼 *Job Applications:*',
    '• `jobs` or `jobs [stage]` — list applications',
    '• `job <n|company>` — view details',
    '• `add job <Company> | <Role> | [Stage] | [CTC] | [Link]`',
    '• `edit job <n> | ctc=12 LPA, next=tomorrow`',
    '• `move <n> | <new stage>` (e.g. `move 1 | OA`)',
    '• `del job <n>` — delete an application',
    '• `resume <n>` — get attached resume document',
    '• Attach document + caption `resume <n>` to upload resume',
    '• `funnel` or `due` — job pipeline overview',
    '',
    '⏰ *Alarms & Schedule:*',
    '• `alarms` — view your recurring alarms',
    '• `alarm 07:30 | Morning Standup | MON,WED,FRI`',
    '• `alarm on <n>` / `alarm off <n>`',
    '• `del alarm <n>` — delete an alarm',
    '',
    '📋 *Tasks & Notes:*',
    '• `tasks` or `todo` — view pending tasks',
    '• `add task <Title> | [Reason] | [Due Date/Time]`',
    '• `done <n>` — mark task completed',
    '• `del task <n>` — delete a task',
    '• `notes` / `add note <Title> | <Content>`',
    '• `goals` / `add goal <Title> | <Horizon>`',
    '• `today` — summary of today\'s tasks & alarms',
    '• `search <keyword>` — search tasks, jobs & notes',
    '',
    '⚙️ *Account:*',
    '• `whoami` — check linked profile',
    '• `link <email> <password>` — link your account',
    '• `unlink` — disconnect this phone',
  ].join('\n');
};
