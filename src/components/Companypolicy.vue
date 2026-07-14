<script setup>
import { ref, onMounted } from 'vue';
import { getPolicies, createPolicy, getCurrentUser, getUserProfile, uploadFile, deletePolicy } from '../services/api';

const fileInput = ref(null);
const documents = ref([]);
const loading = ref(true);
const isAdmin = ref(false);

onMounted(async () => {
    try {
        const user = await getCurrentUser();
        if (user) {
            const profile = await getUserProfile({ email: user.email });
            isAdmin.value = profile?.role?.toLowerCase() === 'admin';
        }
        documents.value = await getPolicies();
    } catch (error) {
        console.error('Error fetching policies:', error);
    } finally {
        loading.value = false;
    }
});

const uploadDocument = () => {
    fileInput.value.click();
};

const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const uploadedUrl = await uploadFile('policies', 'company-policies', file);
            const newDocument = {
                name: file.name.replace(/\.[^/.]+$/, ""), // Strip file extension for cleaner name
                url: uploadedUrl,
                category: 'General'
            };
            
            const savedDoc = await createPolicy(newDocument);
            documents.value.push(savedDoc);
            alert(`Policy "${newDocument.name}" uploaded successfully!`);
        } catch (error) {
            console.error('Error uploading document:', error);
            alert(`Error uploading policy: ${error.message || error}`);
        } finally {
            event.target.value = ''; // Reset file input so same file can be selected again
        }
    }
};

const viewPolicy = (policy) => {
  if (!policy.url || policy.url === '#') {
    alert('No preview URL available for this policy.');
    return;
  }
  
  if (policy.url.startsWith('data:')) {
    try {
      const arr = policy.url.split(',');
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
      console.error('Error viewing base64 policy:', e);
      window.open(policy.url, '_blank');
    }
  } else {
    window.open(policy.url, '_blank');
  }
};

const deletePolicyItem = async (doc) => {
    if (confirm(`Are you sure you want to delete policy "${doc.name}"?`)) {
        try {
            await deletePolicy(doc.id);
            const index = documents.value.findIndex(d => d.id === doc.id);
            if (index !== -1) {
                documents.value.splice(index, 1);
            }
            alert(`Policy "${doc.name}" deleted successfully!`);
        } catch (error) {
            console.error('Error deleting policy:', error);
            alert(`Error deleting policy: ${error.message || error}`);
        }
    }
};
</script>

<template>
    <div class="p-6 text-gray-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
                <h2 class="text-3xl font-bold text-gray-900">Company Policies</h2>
                <p class="text-gray-500">Official documents and guidelines for employees.</p>
            </div>
            <button v-if="isAdmin" @click="uploadDocument" 
                    class="w-full sm:w-auto bg-brand-purple hover:bg-brand-purple/90 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/20">
                <i class="mdi mdi-upload"></i>
                Upload Document
            </button>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <span class="animate-spin h-10 w-10 border-4 border-brand-purple border-t-transparent rounded-full"></span>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="document in documents" :key="document.id"
                class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-brand-purple/30 hover:shadow-md transition-all group">
                <div class="flex items-center gap-4 mb-4">
                    <div class="p-3 bg-brand-purple/10 rounded-xl group-hover:bg-brand-purple group-hover:text-white transition-colors">
                        <i class="mdi mdi-file-document-outline text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-800 group-hover:text-brand-purple transition-colors">{{ document.name }}</h3>
                        <span class="text-xs text-gray-400 font-medium uppercase tracking-widest">{{ document.category }}</span>
                    </div>
                </div>
                
                <div class="flex items-center justify-between mt-6">
                    <a @click.prevent="viewPolicy(document)" href="#" 
                       class="text-sm font-bold text-brand-purple hover:text-brand-orange flex items-center gap-1 transition-colors">
                        <i class="mdi mdi-eye-outline"></i>
                        View Policy
                    </a>
                    
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 italic">Added recently</span>
                        <button v-if="isAdmin" @click="deletePolicyItem(document)"
                                class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-650 flex items-center justify-center transition-colors"
                                title="Delete Policy">
                            <i class="mdi mdi-delete-outline text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload" />
    </div>
</template>