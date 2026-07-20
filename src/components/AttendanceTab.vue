<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { getCurrentUser, getUserProfile } from '../services/api';
import {
  getTodayAttendance,
  clockIn,
  clockOut,
  getActiveBreak,
  startBreak,
  endBreak,
  getAttendanceHistory,
  submitCorrection,
  getCorrectionsForUser,
  getShifts
} from '../services/attendanceService';
import { addToast } from '../services/toastService';

// State variables
const loading = ref(true);
const currentUserId = ref('');
const currentUserProfile = ref(null);
const userShift = ref(null);

const todayLog = ref(null);
const activeBreak = ref(null);
const attendanceHistory = ref(null);
const corrections = ref([]);

// Active tab ('logs' or 'corrections')
const activeSubTab = ref('logs');

// Live Timer and Break Counters
const currentTimeString = ref('');
const currentDateString = ref('');
const currentDayString = ref('');
const breakTimerString = ref('00:00:00');

let clockInterval = null;
let breakInterval = null;

// Modals and Forms
const showBreakModal = ref(false);
const selectedBreakReason = ref('Lunch');
const breakReasons = ['Lunch', 'Tea/Coffee', 'Meeting', 'Personal'];

const showCorrectionModal = ref(false);
const correctionForm = ref({
  date: '',
  requested_clock_in: '',
  requested_clock_out: '',
  reason: ''
});
const submittingCorrection = ref(false);
const correctionMessage = ref('');
const correctionError = ref('');

// Load user info and logs
const loadData = async () => {
  loading.value = true;
  try {
    const user = await getCurrentUser();
    if (!user) return;
    currentUserId.value = user.id;

    const profile = await getUserProfile({ userId: user.id });
    currentUserProfile.value = profile;

    // Load shifts to find active employee's shift
    const shifts = await getShifts(profile?.companyId);
    const defaultShift = { id: 1, name: 'General Shift', start_time: '09:00:00', end_time: '18:00:00', late_buffer: 15 };
    userShift.value = shifts.find(s => s.id === Number(profile?.shift_id || 1)) || shifts[0] || defaultShift;

    // Load today's log status
    todayLog.value = await getTodayAttendance(user.id);
    
    // Check if on active break
    if (todayLog.value) {
      activeBreak.value = await getActiveBreak(todayLog.value.id, user.id);
      if (activeBreak.value) {
        startBreakTimer();
      }
    }

    // Load history & corrections
    attendanceHistory.value = await getAttendanceHistory(user.id);
    corrections.value = await getCorrectionsForUser(user.id);
  } catch (err) {
    console.error('Error loading attendance data:', err);
  } finally {
    loading.value = false;
  }
};

// Clock functionality
const updateClock = () => {
  const now = new Date();
  currentTimeString.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  currentDateString.value = now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  currentDayString.value = now.toLocaleDateString([], { weekday: 'long' });
};

// Break timer
const startBreakTimer = () => {
  if (breakInterval) clearInterval(breakInterval);
  breakInterval = setInterval(() => {
    if (!activeBreak.value) return;
    const start = new Date(activeBreak.value.start_time);
    const now = new Date();
    const diff = Math.max(0, now - start);
    
    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    breakTimerString.value = `${h}:${m}:${s}`;
  }, 1000);
};

const stopBreakTimer = () => {
  if (breakInterval) {
    clearInterval(breakInterval);
    breakInterval = null;
  }
  breakTimerString.value = '00:00:00';
};

// Actions
const handleClockIn = async () => {
  try {
    const shiftId = currentUserProfile.value?.shift_id || 1;
    const companyId = currentUserProfile.value?.companyId || 1;
    todayLog.value = await clockIn(currentUserId.value, shiftId, companyId);
    
    // Refresh history
    attendanceHistory.value = await getAttendanceHistory(currentUserId.value);
  } catch (err) {
    addToast('Clock-in failed: ' + err.message, 'error');
  }
};

const handleClockOut = async () => {
  if (!todayLog.value) return;
  
  if (activeBreak.value) {
    addToast('Please end your break before clocking out.', 'warning');
    return;
  }

  if (confirm('Are you sure you want to clock out for today?')) {
    try {
      todayLog.value = await clockOut(todayLog.value.id, currentUserId.value, todayLog.value.clock_in);
      
      // Refresh history
      attendanceHistory.value = await getAttendanceHistory(currentUserId.value);
    } catch (err) {
      addToast('Clock-out failed: ' + err.message, 'error');
    }
  }
};

const openBreakModal = () => {
  showBreakModal.value = true;
};

const handleStartBreak = async () => {
  if (!todayLog.value) return;
  try {
    activeBreak.value = await startBreak(todayLog.value.id, currentUserId.value, selectedBreakReason.value);
    showBreakModal.value = false;
    startBreakTimer();
    
    // Update local status badge in todayLog
    todayLog.value.status = 'On Break';
  } catch (err) {
    addToast('Start break failed: ' + err.message, 'error');
  }
};

const handleEndBreak = async () => {
  if (!activeBreak.value) return;
  try {
    await endBreak(activeBreak.value.id, currentUserId.value);
    activeBreak.value = null;
    stopBreakTimer();
    
    // Reset status from break to standard Clocked In check
    todayLog.value = await getTodayAttendance(currentUserId.value);
  } catch (err) {
    addToast('End break failed: ' + err.message, 'error');
  }
};

// Correction Modal
const openCorrectionModal = (log = null) => {
  correctionForm.value = {
    date: log ? log.date : '',
    requested_clock_in: log?.clock_in ? new Date(log.clock_in).toISOString().slice(0, 16) : '',
    requested_clock_out: log?.clock_out ? new Date(log.clock_out).toISOString().slice(0, 16) : '',
    reason: ''
  };
  correctionMessage.value = '';
  correctionError.value = '';
  showCorrectionModal.value = true;
};

const handleCorrectionSubmit = async () => {
  if (!correctionForm.value.date || !correctionForm.value.requested_clock_in || !correctionForm.value.requested_clock_out) {
    correctionError.value = 'Please fill out all fields.';
    return;
  }

  const start = new Date(correctionForm.value.requested_clock_in);
  const end = new Date(correctionForm.value.requested_clock_out);
  if (start >= end) {
    correctionError.value = 'Clock-in time must be before clock-out time.';
    return;
  }

  submittingCorrection.value = true;
  correctionMessage.value = '';
  correctionError.value = '';

  try {
    // Find matching attendance ID if possible
    const match = attendanceHistory.value?.find(h => h.date === correctionForm.value.date);
    
    const payload = {
      attendance_id: match ? match.id : null,
      userId: currentUserId.value,
      date: correctionForm.value.date,
      requested_clock_in: start.toISOString(),
      requested_clock_out: end.toISOString(),
      reason: correctionForm.value.reason,
      userName: currentUserProfile.value?.full_name || currentUserProfile.value?.name || 'Employee',
      userEmail: currentUserProfile.value?.email || ''
    };

    await submitCorrection(payload);
    
    // Refresh corrections
    corrections.value = await getCorrectionsForUser(currentUserId.value);
    
    correctionMessage.value = 'Correction request submitted successfully!';
    setTimeout(() => {
      showCorrectionModal.value = false;
    }, 1500);
  } catch (err) {
    correctionError.value = 'Failed to submit correction: ' + err.message;
  } finally {
    submittingCorrection.value = false;
  }
};

// Summary metrics computed over current month
const currentMonthStats = computed(() => {
  if (!attendanceHistory.value) return { present: 0, late: 0, hours: 0, absent: 0 };
  
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const thisMonthLogs = attendanceHistory.value.filter(l => l.date.startsWith(currentMonthStr));
  
  const presentLogs = thisMonthLogs.filter(l => l.status === 'Present' || l.status === 'Late');
  const lateLogs = thisMonthLogs.filter(l => l.status === 'Late');
  const halfDays = thisMonthLogs.filter(l => l.status === 'Half Day');
  
  const totalHours = thisMonthLogs.reduce((sum, l) => sum + Number(l.working_hours || 0), 0);
  const absentLogs = thisMonthLogs.filter(l => l.status === 'Absent');

  return {
    present: presentLogs.length + halfDays.length * 0.5,
    late: lateLogs.length,
    hours: totalHours.toFixed(1),
    absent: absentLogs.length
  };
});

// Format date and times for view
const formatTime = (isoString) => {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '--:--';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

// Lifecycle
onMounted(() => {
  loadData();
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (breakInterval) clearInterval(breakInterval);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-black tracking-tight text-gray-900">Attendance Log</h1>
      <p class="text-gray-500 font-medium">Clock in/out, register breaks, and track your working hours daily.</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- LEFT SECTION: Clock Panel -->
      <div class="lg:col-span-1 space-y-6">
        
        <!-- Live Clock Widget -->
        <div class="bg-gradient-to-tr from-brand-purple to-purple-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[340px]">
          <!-- Decorative Glow -->
          <div class="absolute -right-20 -top-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div class="absolute -left-20 -bottom-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>

          <div>
            <!-- Status Badge -->
            <div class="flex justify-between items-center mb-4">
              <span class="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-white/20">
                Shift: {{ userShift?.name || 'General' }}
              </span>
              <span :class="[
                'px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm',
                todayLog?.clock_out ? 'bg-gray-100 text-gray-650' : 
                activeBreak ? 'bg-yellow-400 text-yellow-950 animate-pulse' : 
                todayLog?.clock_in ? 'bg-green-400 text-green-950' : 'bg-red-400 text-red-950'
              ]">
                {{ todayLog?.clock_out ? 'Clocked Out' : 
                   activeBreak ? 'On Break' : 
                   todayLog?.clock_in ? 'Clocked In' : 'Not Clocked In' }}
              </span>
            </div>

            <!-- Assigned Timings -->
            <p class="text-xs text-purple-100 font-bold">
              Shift hours: {{ userShift?.start_time?.slice(0, 5) }} - {{ userShift?.end_time?.slice(0, 5) }} 
              ({{ userShift?.late_buffer }} mins buffer)
            </p>
          </div>

          <!-- Time Display -->
          <div class="my-6">
            <h2 class="text-5xl font-black tracking-tight font-mono">{{ currentTimeString }}</h2>
            <p class="text-sm font-bold text-purple-100 mt-1">{{ currentDayString }}, {{ currentDateString }}</p>
          </div>

          <!-- Clock Actions -->
          <div class="space-y-2 mt-auto">
            <!-- Normal Clock in (when not clocked in at all) -->
            <button v-if="!todayLog?.clock_in" @click="handleClockIn"
                    class="w-full py-3 bg-white text-brand-purple hover:bg-purple-50 font-black rounded-2xl shadow-lg active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
              <i class="mdi mdi-login-variant text-lg"></i> Clock In
            </button>

            <!-- Active states when clocked in -->
            <div v-else-if="!todayLog?.clock_out" class="grid grid-cols-2 gap-2">
              <!-- Break Button Toggle -->
              <button v-if="!activeBreak" @click="openBreakModal"
                      class="py-3 bg-white/20 text-white hover:bg-white/30 font-black rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 border border-white/20">
                <i class="mdi mdi-pause-circle-outline text-lg"></i> Break
              </button>
              <button v-else @click="handleEndBreak"
                      class="py-3 bg-yellow-400 text-yellow-950 hover:bg-yellow-350 font-black rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 shadow-md">
                <i class="mdi mdi-play-circle-outline text-lg"></i> Resume
              </button>

              <!-- Clock Out Button -->
              <button @click="handleClockOut"
                      class="py-3 bg-red-500 text-white hover:bg-red-650 font-black rounded-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 shadow-md">
                <i class="mdi mdi-logout-variant text-lg"></i> Clock Out
              </button>
            </div>

            <!-- Complete Day log clocked out state -->
            <div v-else class="text-center py-2 bg-white/10 rounded-2xl border border-white/20">
              <p class="text-xs font-black text-purple-100 flex items-center justify-center gap-1">
                <i class="mdi mdi-check-circle text-base"></i> You completed today's log.
              </p>
            </div>
          </div>
        </div>

        <!-- Break Live Counter Panel -->
        <div v-if="activeBreak" class="bg-yellow-50 border border-yellow-100 p-6 rounded-3xl text-center space-y-2">
          <div class="w-10 h-10 bg-yellow-400/20 text-yellow-800 rounded-xl flex items-center justify-center text-xl mx-auto">
            <i class="mdi mdi-clock-fast"></i>
          </div>
          <p class="text-xs font-black text-yellow-600 uppercase tracking-widest">Active Break Session ({{ activeBreak.reason }})</p>
          <h3 class="text-3xl font-black font-mono text-yellow-900">{{ breakTimerString }}</h3>
          <p class="text-xs text-yellow-500 font-bold">Started at {{ formatTime(activeBreak.start_time) }}</p>
        </div>

        <!-- Shift details & Rules -->
        <div class="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h4 class="text-sm font-black text-gray-900 flex items-center gap-2">
            <i class="mdi mdi-information-outline text-brand-purple"></i> Attendance Guidelines
          </h4>
          <ul class="text-xs space-y-2.5 font-bold text-gray-500">
            <li class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1 flex-shrink-0"></span>
              <span>Clocking in after shift buffer time ({{ userShift?.late_buffer }} mins) marks your status as <b>Late</b>.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1 flex-shrink-0"></span>
              <span>A minimum of 4 working hours is required to avoid a <b>Half Day</b> penalty.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1 flex-shrink-0"></span>
              <span>Breaks are tracked automatically. Please ensure you resume to record standard logs.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1 flex-shrink-0"></span>
              <span>Missed clock-ins/outs can be corrected by submitting a <b>Correction Request</b> for approval.</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- RIGHT SECTION: Summary Stats & History List -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Summary metrics cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <div class="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">Present Days</div>
            <div class="text-2xl font-black text-gray-950">{{ currentMonthStats.present }}</div>
            <div class="text-[10px] text-gray-400 font-bold mt-1">This month</div>
          </div>

          <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <div class="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">Hours Worked</div>
            <div class="text-2xl font-black text-gray-950">{{ currentMonthStats.hours }}h</div>
            <div class="text-[10px] text-gray-400 font-bold mt-1 font-mono">Accumulated</div>
          </div>

          <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <div class="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">Late Arrivals</div>
            <div class="text-2xl font-black text-orange-600">{{ currentMonthStats.late }}</div>
            <div class="text-[10px] text-gray-400 font-bold mt-1">Buffer exceeded</div>
          </div>

          <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <div class="text-gray-400 text-xs font-black uppercase tracking-wider mb-1">Absences</div>
            <div class="text-2xl font-black text-red-650">{{ currentMonthStats.absent }}</div>
            <div class="text-[10px] text-gray-400 font-bold mt-1">Unmarked days</div>
          </div>
        </div>

        <!-- History/Requests Segment -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <!-- Toggle Sub Tabs -->
          <div class="flex border-b border-gray-100 p-2 bg-gray-50/50">
            <button @click="activeSubTab = 'logs'"
                    :class="[
                      'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all duration-200',
                      activeSubTab === 'logs' ? 'bg-white text-brand-purple shadow-sm border border-gray-150' : 'text-gray-400 hover:text-gray-700'
                    ]">
              <i class="mdi mdi-clock-outline"></i> Attendance Log History
            </button>
            <button @click="activeSubTab = 'corrections'"
                    :class="[
                      'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black transition-all duration-200',
                      activeSubTab === 'corrections' ? 'bg-white text-brand-purple shadow-sm border border-gray-150' : 'text-gray-400 hover:text-gray-700'
                    ]">
              <i class="mdi mdi-history"></i> Correction Requests
            </button>
          </div>

          <!-- TAB 1: Attendance Log List -->
          <div v-show="activeSubTab === 'logs'" class="p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-black text-gray-900">Recent logs</h3>
              <button @click="openCorrectionModal(null)"
                      class="px-4 py-2 border border-gray-250 hover:border-brand-purple hover:bg-brand-purple/5 text-gray-700 hover:text-brand-purple font-black rounded-xl text-xs transition-all flex items-center gap-1">
                <i class="mdi mdi-clock-plus-outline"></i> Request Correction
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 text-gray-400 text-xs font-black uppercase">
                    <th class="pb-3">Date</th>
                    <th class="pb-3">Clock In</th>
                    <th class="pb-3">Clock Out</th>
                    <th class="pb-3">Work Hours</th>
                    <th class="pb-3">Status</th>
                    <th class="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                  <tr v-for="log in attendanceHistory" :key="log.id" class="hover:bg-gray-50/50">
                    <td class="py-3.5 font-bold">{{ formatDate(log.date) }}</td>
                    <td class="py-3.5 font-mono text-xs">{{ formatTime(log.clock_in) }}</td>
                    <td class="py-3.5 font-mono text-xs">{{ formatTime(log.clock_out) }}</td>
                    <td class="py-3.5 font-mono text-xs">{{ log.working_hours ? `${log.working_hours}h` : '--' }}</td>
                    <td class="py-3.5">
                      <span :class="[
                        'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                        log.status === 'Present' ? 'bg-green-50 text-green-600' :
                        log.status === 'Late' ? 'bg-orange-50 text-orange-600' :
                        log.status === 'Half Day' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'
                      ]">
                        {{ log.status }}
                      </span>
                    </td>
                    <td class="py-3.5 text-right">
                      <button @click="openCorrectionModal(log)"
                              class="text-gray-400 hover:text-brand-purple transition-colors p-1"
                              title="Request correction/adjust times">
                        <i class="mdi mdi-pencil-outline text-lg"></i>
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!attendanceHistory?.length">
                    <td colspan="6" class="text-center py-8 text-gray-400 font-bold">
                      No attendance records found. Click Clock In to log your time.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 2: Correction Requests -->
          <div v-show="activeSubTab === 'corrections'" class="p-6">
            <h3 class="text-lg font-black text-gray-900 mb-4">Correction request logs</h3>

            <div class="space-y-4">
              <div v-for="corr in corrections" :key="corr.id" class="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-3">
                <div class="flex justify-between items-start">
                  <div>
                    <h5 class="font-black text-gray-900 text-sm">Log Date: {{ formatDate(corr.date) }}</h5>
                    <p class="text-xs text-gray-500 font-bold mt-0.5">Submitted at: {{ new Date(corr.created_at).toLocaleDateString() }}</p>
                  </div>
                  <span :class="[
                    'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                    corr.status === 'Approved' ? 'bg-green-50 text-green-600' :
                    corr.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-750'
                  ]">
                    {{ corr.status }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-4 text-xs font-bold text-gray-600 bg-white p-3 rounded-xl border border-gray-100">
                  <div>
                    <span class="text-gray-400 block mb-0.5">Requested In</span>
                    <span class="font-mono text-gray-800">{{ formatTime(corr.requested_clock_in) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400 block mb-0.5">Requested Out</span>
                    <span class="font-mono text-gray-800">{{ formatTime(corr.requested_clock_out) }}</span>
                  </div>
                </div>

                <div class="text-xs font-semibold text-gray-600">
                  <span class="text-gray-450 block font-bold mb-1">Reason for request:</span>
                  <p class="bg-white px-3 py-2 rounded-xl border border-gray-100 italic">{{ corr.reason }}</p>
                </div>

                <div v-if="corr.comments" class="text-xs font-semibold text-gray-600 bg-purple-50/50 p-3 rounded-xl border border-purple-100/50">
                  <span class="text-brand-purple block font-black mb-1">Admin Comments:</span>
                  <p class="text-purple-900 font-medium">{{ corr.comments }}</p>
                </div>
              </div>

              <div v-if="!corrections?.length" class="text-center py-8 text-gray-400 font-bold">
                No correction requests submitted.
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- MODAL: CHOOSE BREAK REASON -->
    <div v-if="showBreakModal" class="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-sm w-full border border-gray-150 shadow-2xl p-6 relative animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h3 class="text-lg font-black text-gray-900">Select Break Reason</h3>
          <button @click="showBreakModal = false" class="text-gray-400 hover:text-gray-650">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-black uppercase text-gray-400 mb-1.5">Reason for break</label>
            <select v-model="selectedBreakReason"
                    class="w-full px-4 py-2.5 bg-gray-50 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold">
              <option v-for="r in breakReasons" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button @click="showBreakModal = false" class="px-4 py-2 border border-gray-250 rounded-xl text-gray-600 font-bold text-xs">
              Cancel
            </button>
            <button @click="handleStartBreak" class="px-4 py-2 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl font-bold text-xs shadow-md">
              Start Break
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ATTENDANCE CORRECTION REQUEST -->
    <div v-if="showCorrectionModal" class="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full border border-gray-150 shadow-2xl p-6 relative animate-fade-in">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <h3 class="text-lg font-black text-gray-900">Attendance Correction Request</h3>
          <button @click="showCorrectionModal = false" class="text-gray-400 hover:text-gray-650">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <form @submit.prevent="handleCorrectionSubmit" class="space-y-4">
          <div v-if="correctionMessage" class="p-3 bg-green-50 text-green-600 text-xs font-bold rounded-xl border border-green-200">
            {{ correctionMessage }}
          </div>
          <div v-if="correctionError" class="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200">
            {{ correctionError }}
          </div>

          <div>
            <label class="block text-xs font-black uppercase text-gray-400 mb-1.5">Date of log</label>
            <input v-model="correctionForm.date" type="date" required
                   class="w-full px-4 py-2.5 bg-gray-50 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-black uppercase text-gray-400 mb-1.5">Requested Clock In</label>
              <input v-model="correctionForm.requested_clock_in" type="datetime-local" required
                     class="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-xs font-semibold" />
            </div>
            <div>
              <label class="block text-xs font-black uppercase text-gray-400 mb-1.5">Requested Clock Out</label>
              <input v-model="correctionForm.requested_clock_out" type="datetime-local" required
                     class="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-xs font-semibold" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-black uppercase text-gray-400 mb-1.5">Reason for Correction</label>
            <textarea v-model="correctionForm.reason" rows="3" required placeholder="Describe why you need to correct these times (e.g. forgot to check out)..."
                      class="w-full px-4 py-2.5 bg-gray-50 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple text-gray-800 text-sm font-semibold"></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <button type="button" @click="showCorrectionModal = false" class="px-5 py-2.5 border border-gray-250 rounded-xl text-gray-600 font-bold text-sm">
              Cancel
            </button>
            <button type="submit" :disabled="submittingCorrection"
                    class="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 active:scale-95 transition-all">
              <span v-if="submittingCorrection" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://cdn.materialdesignicons.com/5.4.55/css/materialdesignicons.min.css');
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
