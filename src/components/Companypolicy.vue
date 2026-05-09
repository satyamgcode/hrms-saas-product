<script setup>
import { ref } from 'vue';

const fileInput = ref(null);
const documents = ref([
    {
        name: 'Company Term and conditions',
        url: 'https://example.com/cv.pdf',
    },
    {
        name: 'PAN Card',    
        url: 'https://example.com/pan.pdf', 
    },
]);

const uploadDocument = () => {
    fileInput.value.click();
};

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        const newDocument = {
            name: file.name,
            url: URL.createObjectURL(file),
        };
        documents.value.push(newDocument);
    }
};
</script>

<template>
    <div class="p-4 text-gray-800">
        <div class="flex items-center justify-between mb-8">
            <p class="text-2xl font-semibold"><span class="text-purple-600 font-medium-">Company Policy</span>
                Documents Directory</p>
        </div>

        <!-- Add Document Button -->
        <div class="flex items-center justify-center p-4 bg-purple-50 border border-dashed border-purple-400 rounded-lg cursor-pointer hover:bg-purple-100"
            @click="uploadDocument">
            <span class="mdi mdi-file-plus-outline text-3xl text-purple-500 mr-2"></span>
            <span class="text-purple-500 font-semibold">Add Document</span>
        </div>

        <!-- Document Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div v-for="(document, index) in documents" :key="index"
                class="bg-white shadow-md p-4 rounded-lg flex items-start space-x-3">
                <span class="mdi mdi-file-document-outline text-3xl text-purple-500"></span>
                <div>
                    <p class="font-semibold text-gray-700">{{ document.name }}</p>
                    <a :href="document.url" target="_blank" class="text-purple-500 hover:underline text-sm">{{
                        document.url }}</a>
                </div>
            </div>
        </div>
        <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload" />
    </div>
</template>