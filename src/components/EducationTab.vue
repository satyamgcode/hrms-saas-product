<script setup>
import { ref, onMounted } from 'vue';
import { getCurrentUser, getUserDocuments, createDocument, updateDocument as updateDocumentApi, deleteDocument as deleteDocumentApi } from '../services/api';
import EmployeePage from './EmployeePage.vue';

const documentTypes = [
  'CV', 
  'PAN Card', 
  'Address Proof', 
  'Photo', 
  'Offer Letter', 
  'Appointment Letter', 
  'Qualification Certificate', 
  'Other Documents'
];
const requiredDocuments = [
  'CV', 
  'PAN Card', 
  'Address Proof', 
  'Photo', 
  'Offer Letter', 
  'Appointment Letter', 
  'Qualification Certificate', 
  'Other Documents'
];

const selectedDocumentType = ref('');
const selectedFile = ref(null);
const uploadedDocuments = ref([]);
const documentToUpdate = ref(null);
const loading = ref(true);

onMounted(async () => {
  await fetchDocuments();
});

const fetchDocuments = async () => {
  try {
    const user = await getCurrentUser();
    if (user) {
      uploadedDocuments.value = await getUserDocuments(user.id);
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
  } finally {
    loading.value = false;
  }
};

const handleFileDrop = (event) => {
  const file = event.dataTransfer.files[0];
  if (file) {
    selectedFile.value = file;
  }
};

const triggerFileUpload = () => {
  document.querySelector('input[type="file"]').click();
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
  }
};

const saveDocument = async () => {
  if (selectedDocumentType.value && selectedFile.value) {
    const user = await getCurrentUser();
    const newDoc = {
      userId: user?.id,
      type: selectedDocumentType.value,
      name: selectedFile.value.name,
      url: '#',
      lastModified: new Date().toLocaleDateString(),
    };

    try {
      const savedDoc = await createDocument(newDoc);
      uploadedDocuments.value.push(savedDoc);
      selectedDocumentType.value = '';
      selectedFile.value = null;
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }
};

const previewDocument = (doc) => {
  const fileURL = URL.createObjectURL(doc.file);
  window.open(fileURL, '_blank');
};

const triggerUpdateFileUpload = (doc) => {
  documentToUpdate.value = doc;
  document.querySelector('#update-file-input').click();
};

const deleteDocument = async (doc) => {
  try {
      await deleteDocumentApi(doc.id);
    if (index !== -1) {
      uploadedDocuments.value.splice(index, 1);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
  }
};

const handleUpdateFile = async (event) => {
  const file = event.target.files[0];
  if (file && documentToUpdate.value) {
    const updatedDoc = {
      ...documentToUpdate.value,
      name: file.name,
      lastModified: new Date().toLocaleDateString()
    };

    try {
      const savedDoc = await updateDocumentApi(documentToUpdate.value.id, updatedDoc);
      const index = uploadedDocuments.value.findIndex(d => d.id === documentToUpdate.value.id);
      if (index !== -1) {
        uploadedDocuments.value[index] = savedDoc;
      }
      documentToUpdate.value = null;
    } catch (error) {
      console.error('Error updating document:', error);
    }
  }
};
</script>

<template>
  <EmployeePage>
    <div class="mt-4 sm:mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Top Section: Upload & Required Docs -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        <!-- Upload Card -->
        <div class="xl:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div class="flex items-center gap-4 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <i class="mdi mdi-cloud-upload-outline text-3xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-black text-gray-900 tracking-tight">Upload Document</h2>
              <p class="text-sm text-gray-500 font-medium mt-1">Securely add new files to your personnel record</p>
            </div>
          </div>

          <div class="space-y-6">
            <div>
              <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Document Type</label>
              <div class="relative">
                <i class="mdi mdi-file-document-outline absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10"></i>
                <select v-model="selectedDocumentType"
                        class="w-full pl-12 pr-10 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-bold text-gray-700 appearance-none cursor-pointer">
                  <option disabled value="">Select Document Type</option>
                  <option v-for="doc in documentTypes" :key="doc" :value="doc">{{ doc }}</option>
                </select>
                <i class="mdi mdi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl"></i>
              </div>
            </div>

            <div>
              <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">File Upload</label>
              <div class="border-2 border-dashed border-gray-200 rounded-3xl p-8 sm:p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all group"
                   @dragover.prevent @drop.prevent="handleFileDrop" @click="triggerFileUpload">
                <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" />
                <div class="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:text-purple-600 transition-all duration-300">
                    <i class="mdi mdi-tray-arrow-up text-3xl text-gray-400 group-hover:text-purple-600 transition-colors"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-1">Click or drag file to upload</h3>
                <p class="text-sm text-gray-500 font-medium">PDF, JPG, PNG up to 10MB</p>
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

            <div class="flex items-start gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
              <input type="checkbox" id="certify" class="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-600 cursor-pointer transition-colors" />
              <label for="certify" class="text-sm text-red-800 font-medium cursor-pointer leading-relaxed">
                By uploading this document, I certify that these documents are true and all provided information is correct.
              </label>
            </div>

            <button @click="saveDocument"
                    class="w-full sm:w-auto px-8 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 active:scale-95 flex items-center justify-center gap-2">
                <i class="mdi mdi-cloud-check text-xl"></i>
                Submit Document
            </button>
          </div>
        </div>

        <!-- Required Documents Sidebar -->
        <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 h-fit">
          <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
            <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-brand-orange">
              <i class="mdi mdi-format-list-checks text-2xl"></i>
            </div>
            <div>
              <h2 class="text-lg font-black text-gray-900">Checklist</h2>
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Required Files</p>
            </div>
          </div>
          
          <div class="space-y-1">
            <div v-for="doc in requiredDocuments" :key="doc" 
                 class="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group cursor-default">
              <div class="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                  <i class="mdi mdi-check text-sm"></i>
              </div>
              <span class="text-sm font-bold text-gray-700">{{ doc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Directory Table Section -->
      <div class="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <i class="mdi mdi-folder-outline text-2xl"></i>
              </div>
              <div>
                <h2 class="text-xl font-black text-gray-900">Document Directory</h2>
                <p class="text-sm text-gray-500 font-medium mt-1">Manage previously uploaded files</p>
              </div>
            </div>
        </div>

        <div v-if="uploadedDocuments.length > 0" class="overflow-x-auto rounded-2xl border border-gray-100">
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest w-20 text-center">Type</th>
                <th class="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Name</th>
                <th class="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Modified</th>
                <th class="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="doc in uploadedDocuments" :key="doc.id || doc.type" class="hover:bg-gray-50/50 transition-colors group">
                <td class="py-4 px-6">
                  <div class="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm mx-auto group-hover:border-purple-200 transition-colors">
                      <i class="mdi mdi-file-document-outline text-2xl text-purple-500"></i>
                  </div>
                </td>
                <td class="py-4 px-6">
                    <p class="font-bold text-gray-900">{{ doc.type }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ doc.name || 'document.pdf' }}</p>
                </td>
                <td class="py-4 px-6 text-sm font-medium text-gray-500">{{ doc.lastModified }}</td>
                <td class="py-4 px-6">
                  <div class="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button @click="previewDocument(doc)" class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Preview">
                        <i class="mdi mdi-eye-outline text-lg"></i>
                    </button>
                    <button @click="triggerUpdateFileUpload(doc)" class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all" title="Update">
                        <i class="mdi mdi-cloud-upload-outline text-lg"></i>
                    </button>
                    <div class="w-px h-4 bg-gray-200 mx-1"></div>
                    <button @click="deleteDocument(doc)" class="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Delete">
                        <i class="mdi mdi-delete-outline text-lg"></i>
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
            <h3 class="text-lg font-bold text-gray-900">No documents found</h3>
            <p class="text-sm text-gray-500 mt-1">Upload your first document above.</p>
        </div>
      </div>

      <!-- Hidden file input for updating document -->
      <input type="file" id="update-file-input" @change="handleUpdateFile" class="hidden" />
    </div>
  </EmployeePage>
</template>
