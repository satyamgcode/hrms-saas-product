<script setup>
import { ref, onMounted, computed } from 'vue';
import { 
  getCurrentUser, 
  getUserProfile, 
  getUserDocuments, 
  getRequiredDocuments, 
  createDocument, 
  updateDocument as updateDocumentApi, 
  deleteDocument as deleteDocumentApi, 
  uploadFile 
} from '../services/api';
import EmployeePage from './EmployeePage.vue';
import { addToast } from '../services/toastService';

const requiredTemplates = ref([]);
const selectedDocumentType = ref('');
const selectedFile = ref(null);
const uploadedDocuments = ref([]);
const documentToUpdate = ref(null);
const loading = ref(true);
const isAdmin = ref(false);
const currentUserId = ref(null);
const isCertified = ref(false);
const isUploading = ref(false);
const uploadCardRef = ref(null);

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    const user = await getCurrentUser();
    if (user) {
      currentUserId.value = user.id;
      const profile = await getUserProfile({ email: user.email });
      isAdmin.value = profile?.role?.toLowerCase() === 'admin';
      
      const companyId = profile?.companyId || 1;
      const [reqDocs, userDocs] = await Promise.all([
        getRequiredDocuments(companyId),
        getUserDocuments(user.id)
      ]);
      
      requiredTemplates.value = reqDocs;
      uploadedDocuments.value = userDocs;
    }
  } catch (e) {
    console.error('Error fetching document data:', e);
  } finally {
    loading.value = false;
  }
};

// Available options for document type select dropdown based on company required documents
const availableDocumentTypes = computed(() => {
  if (requiredTemplates.value && requiredTemplates.value.length > 0) {
    const list = requiredTemplates.value.map(req => ({
      value: req.title,
      label: req.title + (req.isRequired ? ' * (Mandatory)' : ' (Optional)')
    }));
    list.push({ value: 'Other Document', label: 'Other Document' });
    return list;
  }
  return [
    { value: 'National ID / Aadhar Card', label: 'National ID / Aadhar Card * (Mandatory)' },
    { value: 'Educational Degree / Certificate', label: 'Educational Degree / Certificate * (Mandatory)' },
    { value: 'PAN / Tax ID Card', label: 'PAN / Tax ID Card * (Mandatory)' },
    { value: 'Bank Details / Passbook', label: 'Bank Details / Passbook * (Mandatory)' },
    { value: 'Updated Resume / CV', label: 'Updated Resume / CV * (Mandatory)' },
    { value: 'Relieving / Experience Letter', label: 'Relieving / Experience Letter (Optional)' },
    { value: 'Address Proof / Utility Bill', label: 'Address Proof / Utility Bill (Optional)' },
    { value: 'Other Document', label: 'Other Document' }
  ];
});

// Calculate status for each required template
const checklistItems = computed(() => {
  return requiredTemplates.value.map(template => {
    const match = uploadedDocuments.value.find(doc => 
      doc.type?.toLowerCase() === template.title?.toLowerCase() ||
      (doc.type && template.title && (doc.type.toLowerCase().includes(template.title.toLowerCase()) || template.title.toLowerCase().includes(doc.type.toLowerCase())))
    );

    let status = 'Pending'; // Pending Upload
    let doc = null;

    if (match) {
      doc = match;
      if (match.status === 'Approved') {
        status = 'Approved';
      } else if (match.status === 'Rejected') {
        status = 'Rejected';
      } else {
        status = 'Under Review';
      }
    }

    return {
      template,
      status,
      uploadedDoc: doc
    };
  });
});

// Calculate overall compliance percentage
const complianceStats = computed(() => {
  const totalRequired = requiredTemplates.value.filter(t => t.isRequired).length || requiredTemplates.value.length || 1;
  const approvedRequired = checklistItems.value.filter(item => item.template.isRequired && (item.status === 'Approved' || item.status === 'Under Review')).length;
  const percentage = Math.min(100, Math.round((approvedRequired / totalRequired) * 100));
  return {
    total: totalRequired,
    completed: approvedRequired,
    percentage
  };
});

// Rejected documents requiring attention
const rejectedDocs = computed(() => {
  return uploadedDocuments.value.filter(doc => doc.status === 'Rejected');
});

const handleFileDrop = (event) => {
  const file = event.dataTransfer.files[0];
  if (file) {
    selectedFile.value = file;
  }
};

const triggerFileUpload = () => {
  document.querySelector('input[type="file"]#main-file-input').click();
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
  }
};

const selectRequiredForUpload = (item) => {
  selectedDocumentType.value = item.template.title;
  if (uploadCardRef.value) {
    uploadCardRef.value.scrollIntoView({ behavior: 'smooth' });
  }
};

const saveDocument = async () => {
  if (!selectedDocumentType.value) {
    addToast('Please select a document type.', 'warning');
    return;
  }
  if (!selectedFile.value) {
    addToast('Please select a file to upload.', 'warning');
    return;
  }
  if (!isCertified.value) {
    addToast('Please certify that the provided information is true.', 'warning');
    return;
  }

  isUploading.value = true;
  try {
    const user = await getCurrentUser();
    const uploadedUrl = await uploadFile('documents', user?.id || 'general', selectedFile.value);
    
    const newDoc = {
      userId: user?.id,
      type: selectedDocumentType.value,
      name: selectedFile.value.name,
      url: uploadedUrl,
      status: 'Pending',
      uploadedBy: isAdmin.value ? 'Admin' : 'Employee',
      lastModified: new Date().toLocaleDateString(),
    };

    const savedDoc = await createDocument(newDoc);
    uploadedDocuments.value.unshift(savedDoc);
    selectedDocumentType.value = '';
    selectedFile.value = null;
    isCertified.value = false;
    addToast(`Document "${savedDoc.name}" uploaded successfully for verification!`, 'success');
  } catch (error) {
    console.error('Error saving document:', error);
    addToast(`Error saving document: ${error.message || error}`, 'error');
  } finally {
    isUploading.value = false;
  }
};

const previewDocument = (doc) => {
  if (!doc.url || doc.url === '#') {
    addToast('No preview URL available for this document.', 'warning');
    return;
  }
  
  if (doc.url.startsWith('data:')) {
    try {
      const arr = doc.url.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
    } catch (e) {
      console.error('Error previewing base64 document:', e);
      window.open(doc.url, '_blank');
    }
  } else {
    window.open(doc.url, '_blank');
  }
};

const triggerUpdateFileUpload = (doc) => {
  if (doc.status === 'Approved') {
    addToast('Approved documents can only be updated/replaced from the Admin Panel.', 'warning');
    return;
  }

  documentToUpdate.value = doc;
  document.querySelector('#update-file-input').click();
};

const handleDeleteDocument = async (doc) => {
  if (doc.status === 'Approved') {
    addToast('Approved documents can only be deleted from the Admin Panel.', 'warning');
    return;
  }

  if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
    try {
      await deleteDocumentApi(doc.id, currentUserId.value);
      const index = uploadedDocuments.value.findIndex(d => d.id === doc.id);
      if (index !== -1) {
        uploadedDocuments.value.splice(index, 1);
      }
      addToast('Document deleted successfully.', 'success');
    } catch (error) {
      console.error('Error deleting document:', error);
      addToast('Failed to delete document', 'error');
    }
  }
};


const handleUpdateFile = async (event) => {
  const file = event.target.files[0];
  if (file && documentToUpdate.value) {
    try {
      const user = await getCurrentUser();
      const uploadedUrl = await uploadFile('documents', user?.id || 'general', file);
      
      const updatedDoc = {
        ...documentToUpdate.value,
        name: file.name,
        url: uploadedUrl,
        status: 'Pending', // Resubmitted docs return to Pending review
        rejectionReason: '',
        lastModified: new Date().toLocaleDateString()
      };

      const savedDoc = await updateDocumentApi(documentToUpdate.value.id, updatedDoc);
      const index = uploadedDocuments.value.findIndex(d => d.id === documentToUpdate.value.id);
      if (index !== -1) {
        uploadedDocuments.value[index] = savedDoc;
      }
      documentToUpdate.value = null;
      addToast(`Document updated to "${file.name}" and resubmitted for review!`, 'success');
    } catch (error) {
      console.error('Error updating document:', error);
      addToast(`Error updating document: ${error.message || error}`, 'error');
    }
  }
};
</script>

<template>
  <EmployeePage>
    <div class="mt-4 sm:mt-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Rejection Alert Banner if any document was rejected -->
      <div v-if="rejectedDocs.length > 0" class="bg-red-50 border-2 border-red-200 rounded-3xl p-6 shadow-sm">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-red-200">
            <i class="mdi mdi-alert-circle-outline text-2xl"></i>
          </div>
          <div class="flex-grow">
            <h3 class="text-lg font-black text-red-900">Action Required: Document(s) Rejected by HR</h3>
            <p class="text-sm text-red-700 font-medium mt-1">
              One or more of your uploaded documents require revision. Please review feedback and re-upload:
            </p>
            <div class="mt-4 space-y-2">
              <div v-for="doc in rejectedDocs" :key="doc.id" class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white rounded-2xl border border-red-100 gap-3">
                <div>
                  <span class="font-bold text-gray-900 text-sm">{{ doc.type }}</span>
                  <span class="text-xs text-red-600 font-bold ml-2">({{ doc.name }})</span>
                  <p v-if="doc.rejectionReason" class="text-xs font-semibold text-red-700 mt-1">
                    <span class="font-black uppercase tracking-wider text-[10px]">Reason:</span> "{{ doc.rejectionReason }}"
                  </p>
                </div>
                <button @click="triggerUpdateFileUpload(doc)" 
                        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-center">
                  <i class="mdi mdi-upload"></i> Re-upload Document
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Section: Upload Card & Required Checklist -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <!-- Upload Card (Available to ALL users) -->
        <div ref="uploadCardRef" class="xl:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                  <i class="mdi mdi-cloud-upload-outline text-3xl"></i>
                </div>
                <div>
                  <h2 class="text-2xl font-black text-gray-900 tracking-tight">Upload Document</h2>
                  <p class="text-sm text-gray-500 font-medium mt-1">Upload required or additional personnel documents</p>
                </div>
              </div>
              <span class="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold">
                <i class="mdi mdi-shield-check text-purple-600 text-sm"></i> Secure & Encrypted
              </span>
            </div>

            <div class="space-y-6">
              <div>
                <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Document Type</label>
                <div class="relative">
                  <i class="mdi mdi-file-document-outline absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10"></i>
                  <select v-model="selectedDocumentType"
                          class="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-800 appearance-none cursor-pointer">
                    <option disabled value="">Select Document Type</option>
                    <option v-for="item in availableDocumentTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                  <i class="mdi mdi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl"></i>
                </div>
              </div>

              <div>
                <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">File Attachment</label>
                <div class="border-2 border-dashed border-gray-200 rounded-3xl p-8 sm:p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/20 transition-all group"
                     @dragover.prevent @drop.prevent="handleFileDrop" @click="triggerFileUpload">
                  <input type="file" id="main-file-input" @change="handleFileUpload" class="hidden" />
                  <div class="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:text-purple-600 transition-all duration-300">
                      <i class="mdi mdi-tray-arrow-up text-3xl text-gray-400 group-hover:text-purple-600 transition-colors"></i>
                  </div>
                  <h3 class="text-base font-bold text-gray-900 mb-1">Click or drag file here to upload</h3>
                  <p class="text-xs text-gray-500 font-medium">Supports PDF, JPG, PNG, DOCX up to 10MB</p>
                </div>
                
                <!-- Selected file pill -->
                <div v-if="selectedFile" class="mt-4 flex items-center justify-between p-3.5 bg-purple-50 border border-purple-100 rounded-2xl animate-in fade-in zoom-in duration-300">
                  <div class="flex items-center gap-3 overflow-hidden">
                      <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                          <i class="mdi mdi-file-check text-purple-600 text-lg"></i>
                      </div>
                      <span class="text-sm font-bold text-purple-900 truncate">{{ selectedFile.name }}</span>
                  </div>
                  <button @click.stop="selectedFile = null" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                      <i class="mdi mdi-close text-xl"></i>
                  </button>
                </div>
              </div>

              <div class="flex items-start gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <input type="checkbox" id="certify" v-model="isCertified" class="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-600 cursor-pointer transition-colors" />
                <label for="certify" class="text-xs text-gray-700 font-semibold cursor-pointer leading-relaxed">
                  I certify that all documents submitted are authentic, valid, and legibly scanned.
                </label>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-gray-50">
            <button @click="saveDocument" :disabled="isUploading"
                    class="w-full sm:w-auto px-5 py-2.5 bg-brand-purple hover:bg-purple-700 text-white text-xs rounded-xl font-bold transition-all shadow-md shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50">
                <i v-if="!isUploading" class="mdi mdi-cloud-upload-outline text-base"></i>
                <i v-else class="mdi mdi-spin mdi-loading text-base"></i>
                <span>{{ isUploading ? 'Uploading...' : 'Submit Document' }}</span>
            </button>
          </div>
        </div>

        <!-- Required Documents Checklist Card -->
        <div class="xl:col-span-1 bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange">
                  <i class="mdi mdi-clipboard-check-outline text-2xl"></i>
                </div>
                <div>
                  <h2 class="text-lg font-black text-gray-900">Required Documents</h2>
                  <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Company Checklist</p>
                </div>
              </div>
            </div>

            <!-- Overall Progress Bar -->
            <div class="mb-6 bg-purple-50/70 p-4 rounded-2xl border border-purple-100">
              <div class="flex items-center justify-between text-xs font-bold mb-2">
                <span class="text-gray-700">Completion Progress</span>
                <span class="text-brand-purple font-black">{{ complianceStats.completed }} / {{ complianceStats.total }} ({{ complianceStats.percentage }}%)</span>
              </div>
              <div class="w-full bg-purple-200/60 rounded-full h-2.5 overflow-hidden">
                <div class="bg-gradient-to-r from-brand-purple to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                     :style="{ width: complianceStats.percentage + '%' }"></div>
              </div>
            </div>

            <!-- List of Required Items -->
            <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              <div v-for="item in checklistItems" :key="item.template.id" 
                   class="p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3"
                   :class="[
                     item.status === 'Approved' ? 'bg-green-50/40 border-green-100' :
                     item.status === 'Under Review' ? 'bg-blue-50/40 border-blue-100' :
                     item.status === 'Rejected' ? 'bg-red-50/40 border-red-100' :
                     'bg-gray-50/60 border-gray-100'
                   ]">
                <div class="flex items-center gap-3 min-w-0">
                  <div :class="[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                    item.status === 'Approved' ? 'bg-green-500 text-white' :
                    item.status === 'Under Review' ? 'bg-blue-500 text-white' :
                    item.status === 'Rejected' ? 'bg-red-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  ]">
                    <i v-if="item.status === 'Approved'" class="mdi mdi-check"></i>
                    <i v-else-if="item.status === 'Under Review'" class="mdi mdi-clock-outline"></i>
                    <i v-else-if="item.status === 'Rejected'" class="mdi mdi-close"></i>
                    <i v-else class="mdi mdi-minus"></i>
                  </div>

                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="text-xs font-bold text-gray-900 truncate">{{ item.template.title }}</p>
                      <span v-if="item.template.isRequired" class="text-[9px] font-black uppercase px-1.5 py-0.2 bg-red-100 text-red-600 rounded">Req</span>
                    </div>
                    <p class="text-[10px] text-gray-400 font-medium truncate">{{ item.template.category || 'General' }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <span :class="[
                    'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg',
                    item.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    item.status === 'Under Review' ? 'bg-blue-100 text-blue-700' :
                    item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-600'
                  ]">
                    {{ item.status }}
                  </span>
                  <button v-if="item.status === 'Pending' || item.status === 'Rejected'" 
                          @click="selectRequiredForUpload(item)"
                          class="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Upload this document">
                    <i class="mdi mdi-upload text-base"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Directory Table Section -->
      <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <i class="mdi mdi-folder-account-outline text-2xl"></i>
              </div>
              <div>
                <h2 class="text-xl font-black text-gray-900">Uploaded Documents Directory</h2>
                <p class="text-sm text-gray-500 font-medium mt-0.5">Track verification status and download active records</p>
              </div>
            </div>
            <button @click="loadData" class="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 flex items-center gap-1.5 transition-all self-start sm:self-auto">
              <i class="mdi mdi-refresh"></i> Refresh
            </button>
        </div>

        <div v-if="uploadedDocuments.length > 0" class="overflow-x-auto rounded-2xl border border-gray-100">
          <table class="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th class="py-4 px-6 w-16 text-center">Icon</th>
                <th class="py-4 px-6">Document Type & File Name</th>
                <th class="py-4 px-6">Source</th>
                <th class="py-4 px-6">Date</th>
                <th class="py-4 px-6">Status</th>
                <th class="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="doc in uploadedDocuments" :key="doc.id" class="hover:bg-gray-50/50 transition-colors group">
                <td class="py-4 px-6">
                  <div class="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto shadow-sm">
                      <i class="mdi mdi-file-pdf-box text-xl text-purple-600"></i>
                  </div>
                </td>
                <td class="py-4 px-6">
                    <p class="font-bold text-gray-900 text-sm">{{ doc.type }}</p>
                    <p class="text-xs text-gray-400 font-medium truncate max-w-xs mt-0.5">{{ doc.name || 'document.pdf' }}</p>
                    <p v-if="doc.status === 'Rejected' && doc.rejectionReason" class="text-xs font-bold text-red-600 mt-1">
                      Note: {{ doc.rejectionReason }}
                    </p>
                </td>
                <td class="py-4 px-6">
                  <span class="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                    <i :class="doc.uploadedBy === 'Admin' ? 'mdi mdi-shield-account text-purple-600' : 'mdi mdi-account text-gray-400'"></i>
                    {{ doc.uploadedBy || 'Employee' }}
                  </span>
                </td>
                <td class="py-4 px-6 text-xs font-medium text-gray-500">
                  {{ doc.lastModified || 'Recent' }}
                </td>
                <td class="py-4 px-6">
                  <span :class="[
                    'px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5',
                    doc.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                    doc.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  ]">
                    <span :class="[
                      'w-1.5 h-1.5 rounded-full',
                      doc.status === 'Approved' ? 'bg-green-500' :
                      doc.status === 'Rejected' ? 'bg-red-500' :
                      'bg-blue-500 animate-pulse'
                    ]"></span>
                    {{ doc.status || 'Pending' }}
                  </span>
                </td>
                <td class="py-4 px-6">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="previewDocument(doc)" 
                            class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                            title="Preview Document">
                        <i class="mdi mdi-eye-outline text-sm"></i>
                    </button>
                    <!-- Update (Replace File) button: only allowed if file is NOT approved -->
                    <button v-if="doc.status !== 'Approved'"
                            @click="triggerUpdateFileUpload(doc)" 
                            class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            title="Replace File">
                        <i class="mdi mdi-cloud-upload-outline text-sm"></i>
                    </button>
                    <!-- Delete button: only allowed if file is NOT approved -->
                    <button v-if="doc.status !== 'Approved'"
                            @click="handleDeleteDocument(doc)" 
                            class="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Document">
                        <i class="mdi mdi-delete-outline text-sm"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Empty state for table -->
        <div v-else class="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200 mt-2">
            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                <i class="mdi mdi-folder-open-outline text-3xl text-gray-400"></i>
            </div>
            <h3 class="text-lg font-bold text-gray-900">No uploaded documents</h3>
            <p class="text-sm text-gray-500 mt-1">Submit your first document using the form above.</p>
        </div>
      </div>

      <!-- Hidden file input for updating document -->
      <input type="file" id="update-file-input" @change="handleUpdateFile" class="hidden" />

    </div>
  </EmployeePage>
</template>
