<script setup>
import { ref, onMounted, computed } from 'vue';
import { adminApi } from '../../services/adminApi';
import { 
  getCurrentSession, 
  getUserProfile, 
  getRequiredDocuments, 
  createRequiredDocument, 
  updateRequiredDocument, 
  deleteRequiredDocument,
  deleteDocument,
  uploadFile
} from '../../services/api';
import { addToast } from '../../services/toastService';

const activeTab = ref('employees'); // 'employees' or 'configuration'
const loading = ref(true);
const companyId = ref(1);

// Employees & Documents data
const employees = ref([]);
const allDocuments = ref([]);
const selectedEmployeeId = ref('');
const requiredTemplates = ref([]);

// Filters & Modals
const searchQuery = ref('');
const statusFilter = ref('');
const showRejectModal = ref(false);
const documentToReject = ref(null);
const rejectionReasonInput = ref('');

const showUploadModal = ref(false);
const adminUploadDocType = ref('');
const adminUploadFile = ref(null);
const isUploadingAdmin = ref(false);

const showTemplateModal = ref(false);
const editingTemplate = ref(null);
const templateForm = ref({
  title: '',
  category: 'Identification',
  description: '',
  isRequired: true
});

onMounted(async () => {
  await loadAdminData();
});

const loadAdminData = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    if (session?.user) {
      const profile = await getUserProfile({ userId: session.user.id });
      if (profile?.companyId) {
        companyId.value = profile.companyId;
      }
    }

    const [empList, docsList, templatesList] = await Promise.all([
      adminApi.getAllEmployees(companyId.value),
      adminApi.getAllUserDocuments(companyId.value),
      getRequiredDocuments(companyId.value)
    ]);

    employees.value = empList;
    allDocuments.value = docsList;
    requiredTemplates.value = templatesList;

    if (empList.length > 0 && !selectedEmployeeId.value) {
      selectedEmployeeId.value = empList[0].id;
    }
  } catch (err) {
    console.error('Error loading admin document data:', err);
    addToast('Failed to load document records.', 'error');
  } finally {
    loading.value = false;
  }
};

// Currently selected employee profile
const selectedEmployee = computed(() => {
  return employees.value.find(e => e.id === selectedEmployeeId.value) || employees.value[0] || null;
});

// Documents for currently selected employee
const selectedEmployeeDocs = computed(() => {
  if (!selectedEmployee.value) return [];
  return allDocuments.value.filter(d => d.userId === selectedEmployee.value.id);
});

// Calculate employee's required document completion score
const selectedEmployeeCompliance = computed(() => {
  if (!selectedEmployee.value) return { percentage: 0, completed: 0, total: 0 };
  const userDocs = selectedEmployeeDocs.value;
  const required = requiredTemplates.value.filter(t => t.isRequired);
  const total = required.length || 1;

  let approvedCount = 0;
  required.forEach(t => {
    const hasApproved = userDocs.some(d => 
      (d.type?.toLowerCase() === t.title?.toLowerCase() || d.type?.toLowerCase().includes(t.title?.toLowerCase())) && 
      (d.status === 'Approved' || d.status === 'Pending')
    );
    if (hasApproved) approvedCount++;
  });

  const percentage = Math.min(100, Math.round((approvedCount / total) * 100));
  return { percentage, completed: approvedCount, total };
});

// Metrics summary
const metrics = computed(() => {
  const total = allDocuments.value.length;
  const pending = allDocuments.value.filter(d => d.status === 'Pending').length;
  const approved = allDocuments.value.filter(d => d.status === 'Approved').length;
  const rejected = allDocuments.value.filter(d => d.status === 'Rejected').length;

  return { total, pending, approved, rejected };
});

// Search & Filtered employee list
const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    const nameMatch = (emp.name || emp.full_name || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                      (emp.email || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                      (emp.department || '').toLowerCase().includes(searchQuery.value.toLowerCase());
    return nameMatch;
  });
});

// Approve document
const approveDoc = async (doc) => {
  try {
    const updated = await adminApi.updateDocumentStatus(doc.id, 'Approved', '', doc.userId);
    const idx = allDocuments.value.findIndex(d => d.id === doc.id);
    if (idx !== -1) {
      allDocuments.value[idx] = { ...allDocuments.value[idx], ...updated, status: 'Approved', rejectionReason: '' };
    }
    addToast(`Document "${doc.type}" approved successfully.`, 'success');
  } catch (e) {
    console.error('Error approving document:', e);
    addToast('Failed to approve document.', 'error');
  }
};

// Open reject modal
const openRejectModal = (doc) => {
  documentToReject.value = doc;
  rejectionReasonInput.value = '';
  showRejectModal.value = true;
};

// Submit rejection with reason
const confirmRejectDoc = async () => {
  if (!rejectionReasonInput.value.trim()) {
    addToast('Please enter a rejection reason.', 'warning');
    return;
  }

  try {
    const updated = await adminApi.updateDocumentStatus(
      documentToReject.value.id, 
      'Rejected', 
      rejectionReasonInput.value.trim(), 
      documentToReject.value.userId
    );

    const idx = allDocuments.value.findIndex(d => d.id === documentToReject.value.id);
    if (idx !== -1) {
      allDocuments.value[idx] = { 
        ...allDocuments.value[idx], 
        ...updated, 
        status: 'Rejected', 
        rejectionReason: rejectionReasonInput.value.trim() 
      };
    }
    showRejectModal.value = false;
    addToast('Document rejected and employee notified with feedback.', 'info');
  } catch (e) {
    console.error('Error rejecting document:', e);
    addToast('Failed to reject document.', 'error');
  }
};
// Handle direct deletion by Admin
const deleteDoc = async (doc) => {
  if (confirm(`Are you sure you want to permanently delete "${doc.name}" from employee profile?`)) {
    try {
      await deleteDocument(doc.id, doc.userId);
      allDocuments.value = allDocuments.value.filter(d => d.id !== doc.id);
      addToast('Document deleted permanently.', 'success');
    } catch (e) {
      console.error('Error deleting document:', e);
      addToast('Failed to delete document.', 'error');
    }
  }
};

// Admin upload document for employee
const handleAdminFileUpload = (e) => {
  const file = e.target.files[0];
  if (file) {
    adminUploadFile.value = file;
  }
};

const saveAdminUpload = async () => {
  if (!selectedEmployee.value) {
    addToast('No employee selected.', 'warning');
    return;
  }
  if (!adminUploadDocType.value) {
    addToast('Please select a document type.', 'warning');
    return;
  }
  if (!adminUploadFile.value) {
    addToast('Please select a file.', 'warning');
    return;
  }

  isUploadingAdmin.value = true;
  try {
    const uploadedUrl = await uploadFile('documents', selectedEmployee.value.id, adminUploadFile.value);
    const newDoc = await adminApi.uploadEmployeeDocument(selectedEmployee.value.id, {
      type: adminUploadDocType.value,
      name: adminUploadFile.value.name,
      url: uploadedUrl
    }, companyId.value);

    allDocuments.value.unshift(newDoc);
    showUploadModal.value = false;
    adminUploadDocType.value = '';
    adminUploadFile.value = null;
    addToast(`Document uploaded successfully for ${selectedEmployee.value.name}!`, 'success');
  } catch (err) {
    console.error('Error in admin upload:', err);
    addToast('Failed to upload document for employee.', 'error');
  } finally {
    isUploadingAdmin.value = false;
  }
};

// Preview document
const previewDocument = (doc) => {
  if (!doc.url || doc.url === '#') {
    addToast('No preview available for this document.', 'warning');
    return;
  }
  window.open(doc.url, '_blank');
};

// Manage Template Modal
const openAddTemplateModal = () => {
  editingTemplate.value = null;
  templateForm.value = {
    title: '',
    category: 'Identification',
    description: '',
    isRequired: true
  };
  showTemplateModal.value = true;
};

const openEditTemplateModal = (template) => {
  editingTemplate.value = template;
  templateForm.value = {
    title: template.title,
    category: template.category || 'General',
    description: template.description || '',
    isRequired: template.isRequired ?? true
  };
  showTemplateModal.value = true;
};

const saveTemplate = async () => {
  if (!templateForm.value.title.trim()) {
    addToast('Please specify a document title.', 'warning');
    return;
  }

  try {
    if (editingTemplate.value) {
      await updateRequiredDocument(editingTemplate.value.id, templateForm.value, companyId.value);
      addToast('Required document configuration updated.', 'success');
    } else {
      await createRequiredDocument(templateForm.value, companyId.value);
      addToast('New required document requirement added.', 'success');
    }
    // Refresh full list so common seeded items and new items are displayed together
    requiredTemplates.value = await getRequiredDocuments(companyId.value);
    showTemplateModal.value = false;
  } catch (err) {
    console.error('Error saving template:', err);
    addToast('Failed to save document template.', 'error');
  }
};

const handleDeleteTemplate = async (template) => {
  if (confirm(`Are you sure you want to remove document requirement "${template.title}"?`)) {
    try {
      await deleteRequiredDocument(template.id, companyId.value);
      requiredTemplates.value = requiredTemplates.value.filter(t => t.id !== template.id);
      addToast('Document requirement removed.', 'success');
    } catch (e) {
      console.error('Error deleting template:', e);
      addToast('Failed to delete requirement.', 'error');
    }
  }
};
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    
    <!-- Top Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-gray-900">Document Management Center</h1>
        <p class="text-gray-500 font-medium mt-1">Configure company document requirements, review submissions, and manage employee files</p>
      </div>

      <div class="flex items-center gap-2.5">
        <button @click="openAddTemplateModal" 
                class="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5">
          <i class="mdi mdi-cog-outline text-sm"></i>
          <span>Configure Rules</span>
        </button>

        <button @click="showUploadModal = true" 
                class="px-3.5 py-2 bg-brand-purple hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 active:scale-95">
          <i class="mdi mdi-cloud-upload-outline text-sm"></i>
          <span>Upload File for Employee</span>
        </button>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-purple-50 text-brand-purple flex items-center justify-center">
          <i class="mdi mdi-folder-multiple-outline text-2xl"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Uploaded</p>
          <h3 class="text-2xl font-black text-gray-900 mt-0.5">{{ metrics.total }}</h3>
        </div>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <i class="mdi mdi-clock-alert-outline text-2xl"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending Review</p>
          <h3 class="text-2xl font-black text-gray-900 mt-0.5">{{ metrics.pending }}</h3>
        </div>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
          <i class="mdi mdi-check-decagram-outline text-2xl"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Approved</p>
          <h3 class="text-2xl font-black text-gray-900 mt-0.5">{{ metrics.approved }}</h3>
        </div>
      </div>

      <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <i class="mdi mdi-close-circle-outline text-2xl"></i>
        </div>
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Needs Revision</p>
          <h3 class="text-2xl font-black text-gray-900 mt-0.5">{{ metrics.rejected }}</h3>
        </div>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-gray-200">
      <button @click="activeTab = 'employees'" 
              :class="[
                'px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2',
                activeTab === 'employees' 
                  ? 'border-brand-purple text-brand-purple bg-white rounded-t-2xl shadow-sm' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              ]">
        <i class="mdi mdi-account-box-multiple-outline text-lg"></i>
        <span>Employee Documents</span>
      </button>

      <button @click="activeTab = 'configuration'" 
              :class="[
                'px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2',
                activeTab === 'configuration' 
                  ? 'border-brand-purple text-brand-purple bg-white rounded-t-2xl shadow-sm' 
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              ]">
        <i class="mdi mdi-tune-vertical text-lg"></i>
        <span>Required Document Rules ({{ requiredTemplates.length }})</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-20">
      <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
    </div>

    <!-- TAB 1: EMPLOYEE DOCUMENTS VIEW -->
    <div v-else-if="activeTab === 'employees'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left Sidebar: Employee Selector List -->
      <div class="lg:col-span-1 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-black text-gray-900 text-base">Select Personnel</h3>
          <span class="text-xs font-bold text-gray-400">{{ employees.length }} Employees</span>
        </div>

        <div class="relative">
          <i class="mdi mdi-magnify absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input v-model="searchQuery" type="text" placeholder="Search by name, email..." 
                 class="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600" />
        </div>

        <div class="space-y-2 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
          <div v-for="emp in filteredEmployees" :key="emp.id"
               @click="selectedEmployeeId = emp.id"
               :class="[
                 'p-3.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between',
                 selectedEmployeeId === emp.id 
                   ? 'bg-purple-50 border-purple-200 shadow-sm' 
                   : 'border-transparent hover:bg-gray-50'
               ]">
            <div class="flex items-center gap-3 min-w-0">
              <img :src="emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=8A3EEA&color=fff`" 
                   class="w-10 h-10 rounded-full object-cover border border-gray-100 flex-shrink-0" />
              <div class="min-w-0">
                <p class="font-bold text-gray-900 text-sm truncate">{{ emp.name || emp.full_name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ emp.designation || emp.department || 'Employee' }}</p>
              </div>
            </div>

            <!-- Docs count badge -->
            <span class="px-2 py-0.5 bg-white border border-gray-200 text-xs font-bold text-gray-600 rounded-lg flex-shrink-0">
              {{ allDocuments.filter(d => d.userId === emp.id).length }} files
            </span>
          </div>
        </div>
      </div>

      <!-- Right Main Panel: Selected Employee Document Details -->
      <div class="lg:col-span-2 space-y-6">
        <div v-if="selectedEmployee" class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          
          <!-- Employee Profile Header & Progress -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div class="flex items-center gap-4">
              <img :src="selectedEmployee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.name)}&background=8A3EEA&color=fff`" 
                   class="w-14 h-14 rounded-2xl object-cover border-2 border-purple-100 shadow-sm" />
              <div>
                <h2 class="text-xl font-black text-gray-900">{{ selectedEmployee.name || selectedEmployee.full_name }}</h2>
                <p class="text-xs text-gray-500 font-medium mt-0.5">{{ selectedEmployee.email }} • {{ selectedEmployee.department || 'General' }}</p>
              </div>
            </div>

            <div class="bg-purple-50 p-4 rounded-2xl border border-purple-100 min-w-[200px]">
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="text-gray-600">Compliance Rate</span>
                <span class="text-purple-700 font-black">{{ selectedEmployeeCompliance.completed }}/{{ selectedEmployeeCompliance.total }} ({{ selectedEmployeeCompliance.percentage }}%)</span>
              </div>
              <div class="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                <div class="bg-brand-purple h-2 rounded-full transition-all duration-500" :style="{ width: selectedEmployeeCompliance.percentage + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Document List Table for Employee -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-black text-gray-900">Submitted & Official Documents</h3>
              <button @click="showUploadModal = true" class="text-xs font-bold text-brand-purple hover:underline flex items-center gap-1">
                <i class="mdi mdi-plus-circle-outline"></i> Upload New File
              </button>
            </div>

            <div v-if="selectedEmployeeDocs.length > 0" class="overflow-x-auto rounded-2xl border border-gray-100">
              <table class="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <th class="py-3 px-4">Document Type</th>
                    <th class="py-3 px-4">File Name</th>
                    <th class="py-3 px-4">Date</th>
                    <th class="py-3 px-4">Status</th>
                    <th class="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="doc in selectedEmployeeDocs" :key="doc.id" class="hover:bg-gray-50/50 transition-colors">
                    <td class="py-3 px-4 font-bold text-gray-900 text-xs">
                      {{ doc.type }}
                      <span v-if="doc.uploadedBy === 'Admin'" class="ml-1 text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">HR Added</span>
                    </td>
                    <td class="py-3 px-4 text-xs text-gray-600 font-medium truncate max-w-xs">
                      {{ doc.name }}
                      <p v-if="doc.rejectionReason" class="text-[10px] text-red-600 font-bold mt-0.5">HR Note: "{{ doc.rejectionReason }}"</p>
                    </td>
                    <td class="py-3 px-4 text-xs text-gray-500 font-medium">
                      {{ doc.lastModified || 'Recent' }}
                    </td>
                    <td class="py-3 px-4">
                      <span :class="[
                        'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                        doc.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        doc.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      ]">
                        {{ doc.status || 'Pending' }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button @click="previewDocument(doc)" 
                                class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" 
                                title="View Document">
                          <i class="mdi mdi-eye text-xs"></i>
                        </button>
                        
                        <!-- Standard Verification Actions -->
                        <button v-if="doc.status !== 'Approved'" @click="approveDoc(doc)" 
                                class="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded transition-all shadow-xs flex items-center gap-0.5"
                                title="Approve Document">
                          <i class="mdi mdi-check text-xs"></i> Approve
                        </button>
                        <button v-if="doc.status !== 'Rejected'" @click="openRejectModal(doc)" 
                                class="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold rounded border border-red-200 transition-all flex items-center gap-0.5"
                                title="Reject Document">
                          <i class="mdi mdi-close text-xs"></i> Reject
                        </button>
                        
                        <!-- Admin Direct Delete Action -->
                        <button @click="deleteDoc(doc)" 
                                class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" 
                                title="Delete Document Permanently">
                          <i class="mdi mdi-delete-outline text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <i class="mdi mdi-folder-open-outline text-3xl text-gray-400"></i>
              <p class="text-sm font-bold text-gray-700 mt-2">No documents uploaded for {{ selectedEmployee.name }}</p>
              <p class="text-xs text-gray-400 mt-1">Upload a file directly using the button above.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: REQUIRED DOCUMENTS CONFIGURATION -->
    <div v-else-if="activeTab === 'configuration'" class="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <h2 class="text-xl font-black text-gray-900">Required Document Rules & Guidelines</h2>
          <p class="text-xs text-gray-500 font-medium mt-1">Define mandatory and optional documents company requires from every employee during onboarding</p>
        </div>
        <button @click="openAddTemplateModal" 
                class="px-5 py-2.5 bg-brand-purple hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 self-start sm:self-auto">
          <i class="mdi mdi-plus text-base"></i> Add New Requirement Rule
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="template in requiredTemplates" :key="template.id" 
             class="p-5 rounded-3xl border border-gray-100 hover:border-purple-200 transition-all bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-purple-500/5 group flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[10px] font-black uppercase tracking-wider">
                {{ template.category || 'General' }}
              </span>
              <span :class="[
                'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                template.isRequired ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-500'
              ]">
                {{ template.isRequired ? 'Mandatory' : 'Optional' }}
              </span>
            </div>

            <h3 class="font-bold text-gray-900 text-base mb-1">{{ template.title }}</h3>
            <p class="text-xs text-gray-500 font-medium leading-relaxed">{{ template.description || 'No specific description provided.' }}</p>
          </div>

          <div class="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
            <button @click="openEditTemplateModal(template)" 
                    class="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Edit Rule">
              <i class="mdi mdi-pencil-outline text-lg"></i>
            </button>
            <button @click="handleDeleteTemplate(template)" 
                    class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete Rule">
              <i class="mdi mdi-trash-can-outline text-lg"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 1: REJECT DOCUMENT MODAL -->
    <div v-if="showRejectModal" class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
        <div class="flex items-center gap-3 text-red-600">
          <div class="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
            <i class="mdi mdi-alert-circle-outline text-2xl"></i>
          </div>
          <h3 class="text-lg font-black text-gray-900">Reject Document</h3>
        </div>
        <p class="text-xs text-gray-500 font-medium leading-relaxed">
          Provide a rejection reason for <strong class="text-gray-900">{{ documentToReject?.type }}</strong>. The employee will see this feedback in their portal to resubmit:
        </p>

        <textarea v-model="rejectionReasonInput" 
                  rows="3" 
                  placeholder="e.g. Image quality is blurry, Expired identity document, Invalid document format..."
                  class="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button @click="showRejectModal = false" class="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button @click="confirmRejectDoc" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md">Confirm Rejection</button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: ADMIN UPLOAD FILE FOR EMPLOYEE MODAL -->
    <div v-if="showUploadModal" class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 class="text-xl font-black text-gray-900">Upload File for Personnel</h3>
            <p class="text-xs text-gray-500 font-medium mt-0.5">Attach document to <strong class="text-purple-600">{{ selectedEmployee?.name }}</strong>'s profile</p>
          </div>
          <button @click="showUploadModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Document Type</label>
            <select v-model="adminUploadDocType" 
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-600 cursor-pointer">
              <option disabled value="">Select Document Type</option>
              <option v-for="template in requiredTemplates" :key="template.id" :value="template.title">
                {{ template.title }}
              </option>
              <option value="Employment Contract">Employment Contract</option>
              <option value="Offer Letter">Offer Letter</option>
              <option value="Appraisal Letter">Appraisal Letter</option>
              <option value="Other Document">Other Document</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">File</label>
            <input type="file" @change="handleAdminFileUpload" 
                   class="w-full text-xs font-semibold text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
          <button @click="showUploadModal = false" class="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button @click="saveAdminUpload" :disabled="isUploadingAdmin" 
                  class="px-6 py-2.5 bg-brand-purple hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50">
            {{ isUploadingAdmin ? 'Uploading...' : 'Save to Employee Profile' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: ADD/EDIT REQUIRED DOCUMENT RULE MODAL -->
    <div v-if="showTemplateModal" class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 class="text-xl font-black text-gray-900">{{ editingTemplate ? 'Edit Document Requirement' : 'Add Required Document Rule' }}</h3>
            <p class="text-xs text-gray-500 font-medium mt-0.5">Set onboarding document standards for company employees</p>
          </div>
          <button @click="showTemplateModal = false" class="text-gray-400 hover:text-gray-600">
            <i class="mdi mdi-close text-xl"></i>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Document Title</label>
            <input v-model="templateForm.title" 
                   type="text" 
                   placeholder="e.g. Passport, Police Verification, Rent Agreement" 
                   class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-600" />
          </div>

          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
            <select v-model="templateForm.category" 
                    class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-purple-600">
              <option value="Identification">Identification</option>
              <option value="Education">Education</option>
              <option value="Taxation">Taxation</option>
              <option value="Finance">Finance</option>
              <option value="Experience">Experience</option>
              <option value="Legal">Legal</option>
              <option value="Career">Career</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5">Description / Instructions</label>
            <textarea v-model="templateForm.description" 
                      rows="3" 
                      placeholder="Brief instructions for the employee when scanning this document..." 
                      class="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-purple-600"></textarea>
          </div>

          <div class="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
            <input type="checkbox" id="is-required" v-model="templateForm.isRequired" class="w-5 h-5 rounded text-purple-600 focus:ring-purple-600" />
            <label for="is-required" class="text-xs font-bold text-gray-800 cursor-pointer">
              Mandatory Document (Required for complete onboarding compliance)
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
          <button @click="showTemplateModal = false" class="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button @click="saveTemplate" 
                  class="px-6 py-2.5 bg-brand-purple hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20">
            Save Requirement Rule
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
