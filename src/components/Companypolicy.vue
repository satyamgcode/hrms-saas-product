<script setup>
import { ref, onMounted } from 'vue';
import { getPolicies, createPolicy } from '../services/api';

const fileInput = ref(null);
const documents = ref([]);
const loading = ref(true);

onMounted(async () => {
    try {
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
        const newDocument = {
            name: file.name,
            url: '#',
            category: 'General'
        };
        
        try {
            const savedDoc = await createPolicy(newDocument);
            documents.value.push(savedDoc);
        } catch (error) {
            console.error('Error uploading document:', error);
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
            <button @click="uploadDocument" 
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
                    <a :href="document.url" target="_blank" 
                       class="text-sm font-bold text-brand-purple hover:text-brand-orange flex items-center gap-1 transition-colors">
                        <i class="mdi mdi-download"></i>
                        Download PDF
                    </a>
                    <span class="text-xs text-gray-400 italic">Added recently</span>
                </div>
            </div>
        </div>

        <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload" />
    </div>
</template>