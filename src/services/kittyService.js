import { getUsers, getLeaves, getPolicies } from './api';
import { getAllAttendanceToday } from './attendanceService';
import { getCandidates } from './recruitmentService';

// Fetch the consolidated system state
export const getCompanyState = async (companyId = 1) => {
  const state = {
    current_date: new Date().toISOString().split('T')[0],
    employees: { total: 0, list: [] },
    attendance_today: { present: 0, late: 0, absent: 0, list: [] },
    leaves: { active: [], pending_count: 0 },
    candidates: { total: 0, list: [] },
    policies: []
  };

  try {
    const [employeesData, attendanceData, leavesData, candidatesData, policiesData] = await Promise.allSettled([
      getUsers(companyId),
      getAllAttendanceToday(companyId),
      getLeaves({ companyId }),
      getCandidates(companyId),
      getPolicies(companyId)
    ]);

    // 1. Process Employees
    if (employeesData.status === 'fulfilled' && Array.isArray(employeesData.value)) {
      state.employees.total = employeesData.value.length;
      state.employees.list = employeesData.value.map(emp => ({
        id: emp.id,
        name: emp.name || emp.full_name,
        email: emp.email,
        department: emp.department,
        designation: emp.designation,
        joining_date: emp.joining_date,
        status: emp.status
      }));
    }

    // 2. Process Attendance
    if (attendanceData.status === 'fulfilled' && Array.isArray(attendanceData.value)) {
      const todayLogs = attendanceData.value;
      state.attendance_today.list = todayLogs.map(att => ({
        name: att.user?.name || att.user?.full_name || 'Employee',
        email: att.user?.email,
        status: att.status, // 'Present', 'Late', 'Absent', 'On Break'
        clock_in: att.clock_in,
        clock_out: att.clock_out,
        working_hours: att.working_hours
      }));
      state.attendance_today.present = todayLogs.filter(a => a.status === 'Present').length;
      state.attendance_today.late = todayLogs.filter(a => a.status === 'Late').length;
      state.attendance_today.absent = todayLogs.filter(a => a.status === 'Absent').length;
    }

    // 3. Process Leaves
    if (leavesData.status === 'fulfilled' && Array.isArray(leavesData.value)) {
      const todayStr = state.current_date;
      const today = new Date(todayStr);

      state.leaves.pending_count = leavesData.value.filter(l => l.status === 'Pending').length;

      // Filter leaves active today
      const activeLeaves = leavesData.value.filter(l => {
        if (l.status !== 'Approved') return false;
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        // Normalize time
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return today >= start && today <= end;
      });

      state.leaves.active = activeLeaves.map(l => ({
        name: l.user?.name || l.user?.full_name || 'Employee',
        email: l.user?.email,
        type: l.type,
        start_date: l.start_date,
        end_date: l.end_date,
        reason: l.reason
      }));
    }

    // 4. Process Candidates
    if (candidatesData.status === 'fulfilled' && Array.isArray(candidatesData.value)) {
      state.candidates.total = candidatesData.value.length;
      state.candidates.list = candidatesData.value.map(cand => ({
        name: cand.name,
        department: cand.department,
        designation: cand.designation,
        status: cand.status, // 'Applied', 'Screening', 'Technical Round', etc.
        expected_joining_date: cand.expected_joining_date,
        notice_period: cand.notice_period
      }));
    }

    // 5. Process Policies
    if (policiesData.status === 'fulfilled' && Array.isArray(policiesData.value)) {
      state.policies = policiesData.value.map(p => ({
        name: p.name,
        category: p.category
      }));
    }

  } catch (err) {
    console.error('Error fetching company state for Kitty:', err);
  }

  return state;
};

// Deterministic local parser for keyword lookups
export const parseLocalQuery = (message, state) => {
  const query = message.toLowerCase();

  // 1. Attendance Today (Absent/Present/Late)
  if (query.includes('absent') || query.includes('leave today') || query.includes('off today')) {
    const absents = state.attendance_today.list.filter(a => a.status === 'Absent');
    const onLeaves = state.leaves.active;
    
    let text = `🤖 **HR Copilot Report: Absences & Leaves Today**\n\n`;
    text += `There are **${absents.length}** employees registered as absent today. `;
    if (onLeaves.length > 0) {
      text += `Additionally, **${onLeaves.length}** employee(s) are on approved leave today.\n\n`;
    } else {
      text += `No employees are on scheduled leaves today.\n\n`;
    }

    if (absents.length > 0) {
      text += `**Absent Employees:**\n`;
      absents.forEach(a => {
        text += `- **${a.name}** (${a.email || 'No email'})\n`;
      });
      text += `\n`;
    }
    
    if (onLeaves.length > 0) {
      text += `**Employees on Approved Leave:**\n`;
      onLeaves.forEach(l => {
        text += `- **${l.name}** (Reason: _${l.reason || 'None'}_, Type: ${l.type}, Date: ${l.start_date} to ${l.end_date})\n`;
      });
    }

    return text;
  }

  if (query.includes('present') || query.includes('active') || query.includes('attendance') || query.includes('clocked in') || query.includes('working today')) {
    const presents = state.attendance_today.list.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'On Break');
    const lates = state.attendance_today.list.filter(a => a.status === 'Late');

    let text = `🤖 **HR Copilot Report: Today's Attendance**\n\n`;
    text += `Total Clocked In Today: **${presents.length}** employees.\n`;
    text += `- Present On-Time: **${presents.length - lates.length}**\n`;
    text += `- Clocked In Late: **${lates.length}**\n\n`;

    if (presents.length > 0) {
      text += `**Clocked In Employees:**\n`;
      presents.forEach(p => {
        const timeStr = p.clock_in ? new Date(p.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const lateTag = p.status === 'Late' ? '⚠️ _(Late)_' : '';
        text += `- **${p.name}** at ${timeStr} ${lateTag}\n`;
      });
    } else {
      text += `No employees have clocked in yet today.`;
    }
    return text;
  }

  // 2. Joining this month or recently
  if (query.includes('join') || query.includes('new hire') || query.includes('new employee') || query.includes('onboarded')) {
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const newJoins = state.employees.list.filter(emp => emp.joining_date && emp.joining_date.startsWith(currentMonth));
    const upcomingCandidates = state.candidates.list.filter(cand => 
      cand.status === 'Hired' && cand.expected_joining_date && cand.expected_joining_date.startsWith(currentMonth)
    );

    let text = `🤖 **HR Copilot Report: New Hires for ${currentMonthName}**\n\n`;
    text += `New Joins active this month: **${newJoins.length}**\n`;
    text += `Hired Candidates onboarding this month: **${upcomingCandidates.length}**\n\n`;

    if (newJoins.length > 0) {
      text += `**Active New Members:**\n`;
      newJoins.forEach(j => {
        text += `- **${j.name}** (${j.designation} in ${j.department}) — Joined: ${j.joining_date}\n`;
      });
      text += `\n`;
    }

    if (upcomingCandidates.length > 0) {
      text += `**Upcoming Members (Offer Accepted/Hired):**\n`;
      upcomingCandidates.forEach(u => {
        text += `- **${u.name}** (${u.designation} in ${u.department}) — Expected Joining: ${u.expected_joining_date}\n`;
      });
    }

    if (newJoins.length === 0 && upcomingCandidates.length === 0) {
      text += `No new employees joined or are scheduled to join this month.`;
    }
    return text;
  }

  // 3. Candidates and recruitment
  if (query.includes('candidate') || query.includes('interview') || query.includes('recruit') || query.includes('pipeline')) {
    const pipeline = state.candidates.list;
    let text = `🤖 **HR Copilot Report: Recruitment Pipeline**\n\n`;
    text += `There are currently **${pipeline.length}** candidates in the hiring pipeline.\n\n`;

    if (pipeline.length > 0) {
      // Group by stage
      const stages = {};
      pipeline.forEach(c => {
        stages[c.status] = (stages[c.status] || 0) + 1;
      });

      text += `**Pipeline Stages breakdown:**\n`;
      Object.entries(stages).forEach(([stage, count]) => {
        text += `- **${stage}**: ${count} candidate(s)\n`;
      });
      text += `\n**Candidates List:**\n`;
      pipeline.forEach(c => {
        text += `- **${c.name}** — ${c.designation} (${c.department}) — Stage: _${c.status}_\n`;
      });
    } else {
      text += `Recruitment pipeline is empty.`;
    }
    return text;
  }

  // 4. Policies
  if (query.includes('policy') || query.includes('policies') || query.includes('rules')) {
    let text = `🤖 **HR Copilot Report: Company Policies**\n\n`;
    if (state.policies.length > 0) {
      text += `Here are the registered company terms & policies:\n`;
      state.policies.forEach(p => {
        text += `- **${p.name}** (Category: _${p.category || 'General'}_)\n`;
      });
    } else {
      text += `No company policies are uploaded to the system.`;
    }
    return text;
  }

  // 5. Help / Fallback
  return `🤖 **Hello! I am HR Copilot, your professional HR assistant.**

I can check company records and compile details instantly. Ask me specific questions, for example:
- *"How many employees are absent today?"*
- *"Who clocked in late today?"*
- *"How many new employees joined this month?"*
- *"Show me candidates currently in interview"*
- *"List company terms and policies"*

---
💡 **Want to have natural conversations?** 
Click the **Settings (gear icon)** at the top right of this chat, enter your **Gemini API Key**, and we can start chatting about everything!`;
};

// Main entry query resolver
export const queryHRCopilot = async (message, companyId = 1, apiKey = '', model = 'gemini-2.5-flash') => {
  const state = await getCompanyState(companyId);

  // If no Gemini key is provided, parse locally using deterministic logic
  if (!apiKey || apiKey.trim() === '') {
    return parseLocalQuery(message, state);
  }

  // If key is available, call Gemini API
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Create system instructions including database state context
    const systemContext = `You are HR Copilot, a helpful, highly intelligent, and professional AI assistant integrated inside this company's HRMS dashboard. 
You have access to the current date and the real-time company database. 

Current Date: ${state.current_date}

Here is the current database JSON state of the company:
${JSON.stringify(state, null, 2)}

Instructions:
1. Always introduce yourself or address the user as HR Copilot when appropriate.
2. Answer the user's questions clearly, accurately, and concisely based strictly on the provided company state.
3. If they ask about attendance/absents today, parse the 'attendance_today' dataset and state counts and names.
4. If they ask about new joins, check joining dates and candidates in the 'Hired' stage.
5. If the database lists no values, state that clearly rather than inventing names.
6. Use clean Markdown formatting, bullet lists, or tables to represent lists of employees.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: message
              }
            ]
          }
        ],
        systemInstruction: {
          parts: [
            {
              text: systemContext
            }
          ]
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      const errMsg = errData?.error?.message || 'Invalid Request (check key and quota)';
      console.warn('Gemini API request failed, falling back to local database parsing:', errData);
      return `⚠️ **Gemini API Error: ${errMsg} (Falling back to HR Copilot Local Engine):**\n\n` + parseLocalQuery(message, state);
    }

    const resJson = await response.json();
    const reply = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
      throw new Error('Empty response from LLM');
    }

    return reply;

  } catch (error) {
    console.error('Error calling Gemini API for Kitty:', error);
    return `⚠️ **HR Copilot Service Connection Error (Fallback activated):**\n\n` + parseLocalQuery(message, state);
  }
};
