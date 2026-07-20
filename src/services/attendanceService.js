import { supabase } from '../utils/supabase';

let useLocalStorage = false;
let dbCheckPromise = null;

const checkDbConnection = async () => {
  try {
    const { error } = await supabase.from('shifts').select('id').limit(1);
    if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('42P01'))) {
      console.warn("Supabase attendance tables not found. Switching to localStorage fallback.");
      useLocalStorage = true;
    }
  } catch (err) {
    console.warn("Failed to connect to Supabase attendance tables. Switching to localStorage fallback.", err);
    useLocalStorage = true;
  }
};

const ensureDbChecked = async () => {
  if (!dbCheckPromise) {
    dbCheckPromise = checkDbConnection();
  }
  await dbCheckPromise;
};

// ----------------------------------------------------
// LOCAL STORAGE SEED SYSTEM
// ----------------------------------------------------
const DEFAULT_SHIFTS = [
  { id: 1, name: 'General Shift', start_time: '09:00:00', end_time: '18:00:00', late_buffer: 15, companyId: 1 },
  { id: 2, name: 'Morning Shift', start_time: '07:00:00', end_time: '15:00:00', late_buffer: 10, companyId: 1 },
  { id: 3, name: 'Evening Shift', start_time: '15:00:00', end_time: '23:00:00', late_buffer: 10, companyId: 1 },
  { id: 4, name: 'Night Shift', start_time: '23:00:00', end_time: '07:00:00', late_buffer: 15, companyId: 1 }
];

const seedShifts = () => {
  if (!localStorage.getItem('hrms_shifts')) {
    localStorage.setItem('hrms_shifts', JSON.stringify(DEFAULT_SHIFTS));
  }
};

const seedAttendanceAndBreaks = (userId) => {
  const attKey = `hrms_attendance_${userId}`;
  const breaksKey = `hrms_breaks_${userId}`;
  const correctionsKey = `hrms_corrections_${userId}`;

  if (localStorage.getItem(attKey)) {
    return; // Already seeded for this user
  }

  const attendanceLogs = [];
  const breakLogs = [];
  const correctionLogs = [];

  const today = new Date();
  const shifts = JSON.parse(localStorage.getItem('hrms_shifts') || JSON.stringify(DEFAULT_SHIFTS));
  const generalShift = shifts.find(s => s.id === 1) || DEFAULT_SHIFTS[0];

  // Seed the last 30 days
  for (let i = 30; i >= 1; i--) {
    const logDate = new Date(today);
    logDate.setDate(today.getDate() - i);
    const dateStr = logDate.toISOString().split('T')[0];

    const dayOfWeek = logDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // Skip weekends
    }

    // Determine status
    const rand = Math.random();
    let status = 'Present';
    let clockIn = null;
    let clockOut = null;
    let workingHours = 0;

    if (rand < 0.08) {
      // Absent day
      status = 'Absent';
    } else {
      // Present/Late day
      const isLate = Math.random() < 0.25;
      const baseHour = 9;
      // Regular clock-in around 8:45 AM - 8:59 AM
      // Late clock-in around 9:16 AM - 9:40 AM
      const clockInMin = isLate ? 16 + Math.floor(Math.random() * 20) : -15 + Math.floor(Math.random() * 14);
      
      const inTime = new Date(logDate);
      inTime.setHours(baseHour, clockInMin, 0, 0);
      clockIn = inTime.toISOString();

      status = clockInMin > generalShift.late_buffer ? 'Late' : 'Present';

      // Clock out 8.5 to 9.5 hours later
      const hoursWorked = 8.5 + Math.random() * 1.0;
      const outTime = new Date(inTime.getTime() + hoursWorked * 60 * 60 * 1000);
      clockOut = outTime.toISOString();
      workingHours = Number(hoursWorked.toFixed(2));

      // Generate breaks for present days
      const attId = `mock-att-${dateStr}-${userId}`;
      
      // Lunch break
      const lunchStart = new Date(logDate);
      lunchStart.setHours(13, Math.floor(Math.random() * 15), 0, 0);
      const lunchDuration = 2400 + Math.floor(Math.random() * 600); // 40-50 mins
      const lunchEnd = new Date(lunchStart.getTime() + lunchDuration * 1000);

      breakLogs.push({
        id: `mock-break-lunch-${dateStr}-${userId}`,
        attendance_id: attId,
        userId,
        start_time: lunchStart.toISOString(),
        end_time: lunchEnd.toISOString(),
        duration: lunchDuration,
        reason: 'Lunch'
      });

      // Coffee break (occasionally)
      if (Math.random() > 0.4) {
        const coffeeStart = new Date(logDate);
        coffeeStart.setHours(16, Math.floor(Math.random() * 10), 0, 0);
        const coffeeDuration = 600 + Math.floor(Math.random() * 300); // 10-15 mins
        const coffeeEnd = new Date(coffeeStart.getTime() + coffeeDuration * 1000);

        breakLogs.push({
          id: `mock-break-coffee-${dateStr}-${userId}`,
          attendance_id: attId,
          userId,
          start_time: coffeeStart.toISOString(),
          end_time: coffeeEnd.toISOString(),
          duration: coffeeDuration,
          reason: 'Tea/Coffee'
        });
      }
    }

    attendanceLogs.push({
      id: `mock-att-${dateStr}-${userId}`,
      userId,
      date: dateStr,
      clock_in: clockIn,
      clock_out: clockOut,
      working_hours: workingHours,
      status: status,
      shift_id: generalShift.id,
      companyId: 1,
      created_at: clockIn || logDate.toISOString(),
      updated_at: clockOut || logDate.toISOString()
    });
  }

  // Seed a correction request
  const correctionDate = new Date(today);
  correctionDate.setDate(today.getDate() - 2); // 2 days ago
  const corrDateStr = correctionDate.toISOString().split('T')[0];

  const reqIn = new Date(correctionDate);
  reqIn.setHours(9, 0, 0, 0);
  const reqOut = new Date(correctionDate);
  reqOut.setHours(18, 0, 0, 0);

  correctionLogs.push({
    id: `mock-corr-1-${userId}`,
    attendance_id: `mock-att-${corrDateStr}-${userId}`,
    userId,
    date: corrDateStr,
    requested_clock_in: reqIn.toISOString(),
    requested_clock_out: reqOut.toISOString(),
    reason: 'Forgot to clock out due to urgent client meeting.',
    status: 'Pending',
    approved_by: null,
    comments: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Save all to localStorage
  localStorage.setItem(attKey, JSON.stringify(attendanceLogs));
  localStorage.setItem(breaksKey, JSON.stringify(breakLogs));
  localStorage.setItem(correctionsKey, JSON.stringify(correctionLogs));
};

seedShifts();

// ----------------------------------------------------
// SHIFT CONFIGURATION SERVICE
// ----------------------------------------------------
export const getShifts = async (companyId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    return JSON.parse(localStorage.getItem('hrms_shifts') || '[]');
  }
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
};

export const saveShift = async (shift) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_shifts') || '[]');
    let saved;
    if (shift.id) {
      const idx = list.findIndex(s => s.id === shift.id);
      saved = { ...list[idx], ...shift, updated_at: new Date().toISOString() };
      list[idx] = saved;
    } else {
      saved = {
        ...shift,
        id: list.length ? Math.max(...list.map(s => s.id)) + 1 : 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(saved);
    }
    localStorage.setItem('hrms_shifts', JSON.stringify(list));
    return saved;
  }

  const { data, error } = await supabase
    .from('shifts')
    .upsert({ ...shift, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteShift = async (id) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const list = JSON.parse(localStorage.getItem('hrms_shifts') || '[]');
    const filtered = list.filter(s => s.id !== id);
    localStorage.setItem('hrms_shifts', JSON.stringify(filtered));
    return;
  }
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) throw error;
};

export const assignShiftToEmployee = async (employeeId, shiftId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    // In local storage, employees are read from a separate table.
    // If users profile supports shift_id, update it.
    const profiles = JSON.parse(localStorage.getItem('hrms_profiles_custom') || '{}');
    profiles[employeeId] = { ...profiles[employeeId], shift_id: shiftId };
    localStorage.setItem('hrms_profiles_custom', JSON.stringify(profiles));
    return;
  }
  const { error } = await supabase.from('users').update({ shift_id: shiftId }).eq('id', employeeId);
  if (error) throw error;
};

// ----------------------------------------------------
// ATTENDANCE LOG ACTIONS
// ----------------------------------------------------
export const getTodayAttendance = async (userId) => {
  await ensureDbChecked();
  const dateStr = new Date().toISOString().split('T')[0];

  if (useLocalStorage) {
    seedAttendanceAndBreaks(userId);
    const logs = JSON.parse(localStorage.getItem(`hrms_attendance_${userId}`) || '[]');
    return logs.find(l => l.date === dateStr) || null;
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('userId', userId)
    .eq('date', dateStr)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const clockIn = async (userId, shiftId = 1, companyId = 1) => {
  await ensureDbChecked();
  const dateStr = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Determine status (Late or Present)
  const shifts = await getShifts();
  const activeShift = shifts.find(s => s.id === Number(shiftId)) || DEFAULT_SHIFTS[0];
  
  // Calculate if late
  const [shiftHours, shiftMins] = activeShift.start_time.split(':').map(Number);
  const shiftTimeToday = new Date(now);
  shiftTimeToday.setHours(shiftHours, shiftMins, 0, 0);
  
  // Add buffer
  const bufferTime = new Date(shiftTimeToday.getTime() + (activeShift.late_buffer || 15) * 60 * 1000);
  const status = now > bufferTime ? 'Late' : 'Present';

  const payload = {
    userId,
    date: dateStr,
    clock_in: now.toISOString(),
    status,
    shift_id: Number(shiftId),
    companyId: companyId || 1,
    working_hours: 0,
    clock_out: null,
    updated_at: now.toISOString()
  };

  if (useLocalStorage) {
    const attKey = `hrms_attendance_${userId}`;
    seedAttendanceAndBreaks(userId);
    const logs = JSON.parse(localStorage.getItem(attKey) || '[]');
    const idx = logs.findIndex(l => l.date === dateStr);
    
    const newLog = {
      ...payload,
      id: idx !== -1 ? logs[idx].id : `mock-att-${dateStr}-${userId}`,
      created_at: now.toISOString()
    };

    if (idx !== -1) {
      logs[idx] = newLog;
    } else {
      logs.push(newLog);
    }
    localStorage.setItem(attKey, JSON.stringify(logs));
    return newLog;
  }

  const { data, error } = await supabase
    .from('attendance')
    .upsert(payload, { onConflict: 'userId,date' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const clockOut = async (attendanceId, userId, clockInTimeStr) => {
  await ensureDbChecked();
  const now = new Date();
  const clockInTime = new Date(clockInTimeStr);
  const diffTime = Math.abs(now - clockInTime);
  const workingHours = Number((diffTime / (1000 * 60 * 60)).toFixed(2));

  // Determine standard status (maintain Late if late, or set Half Day if hours < 4)
  let status = 'Present';
  if (workingHours < 4) {
    status = 'Half Day';
  }

  if (useLocalStorage) {
    const attKey = `hrms_attendance_${userId}`;
    const logs = JSON.parse(localStorage.getItem(attKey) || '[]');
    const idx = logs.findIndex(l => l.id === attendanceId || (l.userId === userId && l.date === now.toISOString().split('T')[0]));
    if (idx !== -1) {
      const existingStatus = logs[idx].status;
      const finalStatus = workingHours < 4 ? 'Half Day' : (existingStatus === 'Late' ? 'Late' : 'Present');
      
      const updated = {
        ...logs[idx],
        clock_out: now.toISOString(),
        working_hours: workingHours,
        status: finalStatus,
        updated_at: now.toISOString()
      };
      logs[idx] = updated;
      localStorage.setItem(attKey, JSON.stringify(logs));
      return updated;
    }
    throw new Error('Attendance log not found locally');
  }

  // Get current status from database to preserve 'Late' status if work hours >= 4
  const { data: currentAtt } = await supabase.from('attendance').select('status').eq('id', attendanceId).single();
  const finalStatus = workingHours < 4 ? 'Half Day' : (currentAtt?.status === 'Late' ? 'Late' : 'Present');

  const { data, error } = await supabase
    .from('attendance')
    .update({
      clock_out: now.toISOString(),
      working_hours: workingHours,
      status: finalStatus,
      updated_at: now.toISOString()
    })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ----------------------------------------------------
// BREAK LOG ACTIONS
// ----------------------------------------------------
export const getActiveBreak = async (attendanceId, userId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const breaks = JSON.parse(localStorage.getItem(`hrms_breaks_${userId}`) || '[]');
    return breaks.find(b => b.attendance_id === attendanceId && b.end_time === null) || null;
  }
  const { data, error } = await supabase
    .from('breaks')
    .select('*')
    .eq('attendance_id', attendanceId)
    .is('end_time', null)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const startBreak = async (attendanceId, userId, reason = 'Lunch') => {
  await ensureDbChecked();
  const now = new Date();
  const payload = {
    attendance_id: attendanceId,
    userId,
    start_time: now.toISOString(),
    end_time: null,
    duration: 0,
    reason
  };

  if (useLocalStorage) {
    const breaksKey = `hrms_breaks_${userId}`;
    const breaks = JSON.parse(localStorage.getItem(breaksKey) || '[]');
    const newBreak = {
      ...payload,
      id: `mock-break-${Date.now()}`
    };
    breaks.push(newBreak);
    localStorage.setItem(breaksKey, JSON.stringify(breaks));
    return newBreak;
  }

  const { data, error } = await supabase
    .from('breaks')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const endBreak = async (breakId, userId) => {
  await ensureDbChecked();
  const now = new Date();

  if (useLocalStorage) {
    const breaksKey = `hrms_breaks_${userId}`;
    const breaks = JSON.parse(localStorage.getItem(breaksKey) || '[]');
    const idx = breaks.findIndex(b => b.id === breakId);
    if (idx !== -1) {
      const start = new Date(breaks[idx].start_time);
      const durationSecs = Math.floor(Math.abs(now - start) / 1000);
      const updated = {
        ...breaks[idx],
        end_time: now.toISOString(),
        duration: durationSecs
      };
      breaks[idx] = updated;
      localStorage.setItem(breaksKey, JSON.stringify(breaks));
      return updated;
    }
    throw new Error('Break log not found locally');
  }

  const { data: activeBreak } = await supabase.from('breaks').select('start_time').eq('id', breakId).single();
  const start = new Date(activeBreak.start_time);
  const durationSecs = Math.floor(Math.abs(now - start) / 1000);

  const { data, error } = await supabase
    .from('breaks')
    .update({
      end_time: now.toISOString(),
      duration: durationSecs
    })
    .eq('id', breakId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getBreaksForAttendance = async (attendanceId, userId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    const breaks = JSON.parse(localStorage.getItem(`hrms_breaks_${userId}`) || '[]');
    return breaks.filter(b => b.attendance_id === attendanceId);
  }
  const { data, error } = await supabase
    .from('breaks')
    .select('*')
    .eq('attendance_id', attendanceId);
  if (error) throw error;
  return data;
};

// ----------------------------------------------------
// ATTENDANCE HISTORY
// ----------------------------------------------------
export const getAttendanceHistory = async (userId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    seedAttendanceAndBreaks(userId);
    const logs = JSON.parse(localStorage.getItem(`hrms_attendance_${userId}`) || '[]');
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }
  const { data, error } = await supabase
    .from('attendance')
    .select('*, shift:shifts(name, start_time, end_time)')
    .eq('userId', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
};

// Admin monitoring
export const getAllAttendanceToday = async (companyId) => {
  await ensureDbChecked();
  const dateStr = new Date().toISOString().split('T')[0];

  if (useLocalStorage) {
    const users = [];
    const results = [];
    for (const u of users) {
      seedAttendanceAndBreaks(u.id);
      const atts = JSON.parse(localStorage.getItem(`hrms_attendance_${u.id}`) || '[]');
      const todayAtt = atts.find(a => a.date === dateStr);
      
      // Check if they are on break
      let activeBreak = null;
      if (todayAtt) {
        const breaks = JSON.parse(localStorage.getItem(`hrms_breaks_${u.id}`) || '[]');
        activeBreak = breaks.find(b => b.attendance_id === todayAtt.id && b.end_time === null) || null;
      }

      results.push({
        user: u,
        userId: u.id,
        date: dateStr,
        clock_in: todayAtt?.clock_in || null,
        clock_out: todayAtt?.clock_out || null,
        status: todayAtt ? (activeBreak ? 'On Break' : todayAtt.status) : 'Absent',
        working_hours: todayAtt?.working_hours || 0,
        active_break: activeBreak,
        id: todayAtt?.id || null
      });
    }
    return results;
  }

  // Supabase query: Select all users, and outer join attendance today
  const { data: allUsers, error: userErr } = await supabase.from('users').select('id, name, full_name, email, role, avatar').eq('companyId', companyId);
  if (userErr) throw userErr;

  const { data: todayAtts, error: attErr } = await supabase.from('attendance').select('*').eq('date', dateStr);
  if (attErr) throw attErr;

  const results = [];
  for (const u of allUsers) {
    const todayAtt = todayAtts.find(a => a.userId === u.id);
    let activeBreak = null;
    if (todayAtt) {
      const { data: brk } = await supabase.from('breaks').select('*').eq('attendance_id', todayAtt.id).is('end_time', null).maybeSingle();
      activeBreak = brk;
    }

    results.push({
      user: {
        id: u.id,
        name: u.name || u.full_name || u.email,
        email: u.email,
        role: u.role,
        avatar: u.avatar
      },
      userId: u.id,
      date: dateStr,
      clock_in: todayAtt?.clock_in || null,
      clock_out: todayAtt?.clock_out || null,
      status: todayAtt ? (activeBreak ? 'On Break' : todayAtt.status) : 'Absent',
      working_hours: todayAtt?.working_hours || 0,
      active_break: activeBreak,
      id: todayAtt?.id || null
    });
  }

  return results;
};

// ----------------------------------------------------
// CORRECTION REQUESTS SERVICE
// ----------------------------------------------------
export const submitCorrection = async (correction) => {
  await ensureDbChecked();
  const payload = {
    ...correction,
    status: 'Pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (useLocalStorage) {
    const corrKey = `hrms_corrections_${correction.userId}`;
    const list = JSON.parse(localStorage.getItem(corrKey) || '[]');
    const newCorr = {
      ...payload,
      id: `mock-corr-${Date.now()}`
    };
    list.push(newCorr);
    localStorage.setItem(corrKey, JSON.stringify(list));
    return newCorr;
  }

  // Clean payload for Supabase database columns to prevent columns-mismatch errors
  const cleanPayload = {
    attendance_id: payload.attendance_id,
    userId: payload.userId,
    date: payload.date,
    requested_clock_in: payload.requested_clock_in,
    requested_clock_out: payload.requested_clock_out,
    reason: payload.reason,
    status: payload.status,
    created_at: payload.created_at,
    updated_at: payload.updated_at
  };

  const { data, error } = await supabase
    .from('attendance_corrections')
    .insert(cleanPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getCorrectionsForUser = async (userId) => {
  await ensureDbChecked();
  if (useLocalStorage) {
    seedAttendanceAndBreaks(userId);
    return JSON.parse(localStorage.getItem(`hrms_corrections_${userId}`) || '[]');
  }
  const { data, error } = await supabase
    .from('attendance_corrections')
    .select('*')
    .eq('userId', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getPendingCorrections = async (companyId) => {
  await ensureDbChecked();
  
  if (!companyId) {
    return [];
  }

  const getFromLocalStorage = () => {
    return [];
  };

  if (useLocalStorage) {
    return getFromLocalStorage();
  }

  try {
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('companyId', companyId);
    if (userErr) throw userErr;
    
    if (!users || users.length === 0) {
      return [];
    }

    const userIds = users.map(u => u.id);

    const { data, error } = await supabase
      .from('attendance_corrections')
      .select('*, user:users!attendance_corrections_userId_fkey(id, name, full_name, email)')
      .eq('status', 'Pending')
      .in('userId', userIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return data ?? [];
  } catch (err) {
    if (err.message?.includes('does not exist') || err.code === '42P01') {
      console.warn("Table 'attendance_corrections' does not exist in Supabase.");
      return [];
    }
    throw err;
  }
};

export const reviewCorrection = async (correctionId, status, comments, adminUserId, targetUserId = null) => {
  await ensureDbChecked();
  const now = new Date().toISOString();

  if (useLocalStorage) {
    const userIds = targetUserId ? [targetUserId] : ['1', '2'];
    for (const uid of userIds) {
      const corrKey = `hrms_corrections_${uid}`;
      const list = JSON.parse(localStorage.getItem(corrKey) || '[]');
      const idx = list.findIndex(c => c.id === correctionId);
      if (idx !== -1) {
        const corr = list[idx];
        const updatedCorr = {
          ...corr,
          status,
          comments,
          approved_by: adminUserId,
          updated_at: now
        };
        list[idx] = updatedCorr;
        localStorage.setItem(corrKey, JSON.stringify(list));

        // If approved, update the actual attendance log as well!
        if (status === 'Approved') {
          const attKey = `hrms_attendance_${corr.userId}`;
          const attLogs = JSON.parse(localStorage.getItem(attKey) || '[]');
          
          const inTime = new Date(corr.requested_clock_in);
          const outTime = new Date(corr.requested_clock_out);
          const hrs = Number((Math.abs(outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
          
          // Determine status based on clock in time and shift buffer
          const shifts = JSON.parse(localStorage.getItem('hrms_shifts') || '[]');
          const activeShift = shifts.find(s => s.id === 1) || DEFAULT_SHIFTS[0]; // General Shift
          const [sHours, sMins] = activeShift.start_time.split(':').map(Number);
          const shiftTime = new Date(inTime);
          shiftTime.setHours(sHours, sMins, 0, 0);
          const bufferTime = new Date(shiftTime.getTime() + (activeShift.late_buffer || 15) * 60 * 1000);
          const finalStatus = inTime > bufferTime ? 'Late' : 'Present';

          const attIdx = attLogs.findIndex(a => a.date === corr.date);
          if (attIdx !== -1) {
            attLogs[attIdx] = {
              ...attLogs[attIdx],
              clock_in: corr.requested_clock_in,
              clock_out: corr.requested_clock_out,
              working_hours: hrs,
              status: hrs < 4 ? 'Half Day' : finalStatus,
              updated_at: now
            };
          } else {
            attLogs.push({
              id: corr.attendance_id || `mock-att-${corr.date}-${corr.userId}`,
              userId: corr.userId,
              date: corr.date,
              clock_in: corr.requested_clock_in,
              clock_out: corr.requested_clock_out,
              working_hours: hrs,
              status: hrs < 4 ? 'Half Day' : finalStatus,
              shift_id: 1,
              companyId: 1,
              created_at: now,
              updated_at: now
            });
          }
          localStorage.setItem(attKey, JSON.stringify(attLogs));
        }
        return updatedCorr;
      }
    }
    throw new Error('Correction request not found locally');
  }

  // Handle Supabase Database review
  const { data: originalCorr, error: fetchErr } = await supabase
    .from('attendance_corrections')
    .select('*')
    .eq('id', correctionId)
    .single();
  if (fetchErr) throw fetchErr;

  const { data: updatedCorr, error: updateErr } = await supabase
    .from('attendance_corrections')
    .update({
      status,
      comments,
      approved_by: adminUserId,
      updated_at: now
    })
    .eq('id', correctionId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // If approved, update or insert attendance log
  if (status === 'Approved') {
    const inTime = new Date(originalCorr.requested_clock_in);
    const outTime = new Date(originalCorr.requested_clock_out);
    const hrs = Number((Math.abs(outTime - inTime) / (1000 * 60 * 60)).toFixed(2));

    // Determine status (check shift timings)
    const { data: userProfile } = await supabase.from('users').select('shift_id').eq('id', originalCorr.userId).single();
    let finalShiftId = userProfile?.shift_id || 1;
    const { data: activeShift } = await supabase.from('shifts').select('*').eq('id', finalShiftId).maybeSingle();
    const shift = activeShift || DEFAULT_SHIFTS[0];

    const [sHours, sMins] = shift.start_time.split(':').map(Number);
    const shiftTime = new Date(inTime);
    shiftTime.setHours(sHours, sMins, 0, 0);
    const bufferTime = new Date(shiftTime.getTime() + (shift.late_buffer || 15) * 60 * 1000);
    const logStatus = inTime > bufferTime ? 'Late' : 'Present';

    const payload = {
      userId: originalCorr.userId,
      date: originalCorr.date,
      clock_in: originalCorr.requested_clock_in,
      clock_out: originalCorr.requested_clock_out,
      working_hours: hrs,
      status: hrs < 4 ? 'Half Day' : logStatus,
      shift_id: finalShiftId,
      companyId: 1,
      updated_at: now
    };

    if (originalCorr.attendance_id) {
      await supabase.from('attendance').update(payload).eq('id', originalCorr.attendance_id);
    } else {
      await supabase.from('attendance').upsert(payload, { onConflict: 'userId,date' });
    }
  }

  return updatedCorr;
};

// ----------------------------------------------------
// ATTENDANCE REPORT & PAYROLL COUPLING
// ----------------------------------------------------
export const getAttendanceReport = async (monthStr, companyId) => {
  await ensureDbChecked();
  const year = Number(monthStr.split('-')[0]);
  const month = Number(monthStr.split('-')[1]) - 1; // 0-indexed

  // Calculate total business days (mon-fri) in the month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const totalDays = endDate.getDate();
  
  let workingDaysCount = 0;
  for (let d = 1; d <= totalDays; d++) {
    const cur = new Date(year, month, d);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      workingDaysCount++;
    }
  }

  // Load all users
  let employees = [];
  if (useLocalStorage) {
    employees = [];
  } else {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, full_name, email, department, role')
      .eq('companyId', companyId);
    if (error) throw error;
    employees = users.map(u => ({
      id: u.id,
      name: u.name || u.full_name || u.email,
      email: u.email,
      department: u.department || 'General',
      role: u.role
    }));
  }

  const reports = [];

  for (const emp of employees) {
    let logs = [];
    if (useLocalStorage) {
      seedAttendanceAndBreaks(emp.id);
      logs = JSON.parse(localStorage.getItem(`hrms_attendance_${emp.id}`) || '[]');
    } else {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('userId', emp.id)
        .gte('date', `${monthStr}-01`)
        .lte('date', `${monthStr}-${totalDays}`);
      if (error) throw error;
      logs = data ?? [];
    }

    // Filter logs for this month
    const monthLogs = logs.filter(l => l.date.startsWith(monthStr));

    const presentLogs = monthLogs.filter(l => l.status === 'Present' || l.status === 'Late');
    const lateLogs = monthLogs.filter(l => l.status === 'Late');
    const halfDayLogs = monthLogs.filter(l => l.status === 'Half Day');
    
    // Breaks
    let totalBreakSecs = 0;
    if (useLocalStorage) {
      const breaks = JSON.parse(localStorage.getItem(`hrms_breaks_${emp.id}`) || '[]');
      breaks.forEach(b => {
        if (b.start_time.startsWith(monthStr)) {
          totalBreakSecs += b.duration || 0;
        }
      });
    } else {
      // Supabase query for breaks
      const logIds = monthLogs.map(l => l.id);
      if (logIds.length > 0) {
        const { data: breaksData } = await supabase
          .from('breaks')
          .select('duration')
          .in('attendance_id', logIds);
        breaksData?.forEach(b => {
          totalBreakSecs += b.duration || 0;
        });
      }
    }

    const presentDays = presentLogs.length + halfDayLogs.length * 0.5;
    const absences = Math.max(0, workingDaysCount - presentDays); // estimated absences

    reports.push({
      employeeId: emp.id,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      workingDays: workingDaysCount,
      presentDays,
      lateCount: lateLogs.length,
      halfDays: halfDayLogs.length,
      absences,
      totalWorkingHours: monthLogs.reduce((sum, l) => sum + Number(l.working_hours || 0), 0).toFixed(1),
      totalBreakHours: (totalBreakSecs / 3600).toFixed(1)
    });
  }

  return {
    workingDays: workingDaysCount,
    totalDays,
    reports
  };
};
