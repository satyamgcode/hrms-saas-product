<script setup>
import { ref } from 'vue';
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

const saveDocument = () => {
  if (selectedDocumentType.value && selectedFile.value) {
    uploadedDocuments.value.push({
      type: selectedDocumentType.value,
      name: selectedFile.value.name,
      file: selectedFile.value,
      lastModified: new Date().toLocaleDateString(),
    });
    selectedDocumentType.value = '';
    selectedFile.value = null;
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

const deleteDocument = (doc) => {
  const index = uploadedDocuments.value.indexOf(doc);
  if (index !== -1) {
    uploadedDocuments.value.splice(index, 1);
  }
};

const handleUpdateFile = (event) => {
  const file = event.target.files[0];
  if (file && documentToUpdate.value) {
    documentToUpdate.value.file = file;
    documentToUpdate.value.name = file.name;
    documentToUpdate.value.lastModified = new Date().toLocaleDateString();
    documentToUpdate.value = null;
  }
};
</script>

<template>
  <EmployeePage>
    <div class="flex flex-col py-7">
      <div class="flex gap-8">
        <!-- Upload New Documents Section -->
        <div class="w-full lg:w-2/3 bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4">Upload <span class="text-purple-500">New Documents</span></h2>

          <div class="mb-4">
            <label class="block text-gray-700 font-semibold mb-2">Document Type</label>
            <select v-model="selectedDocumentType"
                    class="border border-gray-300 rounded-md w-full p-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option disabled value="">--- Select Doc Type ---</option>
              <option v-for="doc in documentTypes" :key="doc" :value="doc">{{ doc }}</option>
            </select>
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 font-semibold mb-2">Upload Document</label>
            <div class="border-2 border-dashed border-gray-300 rounded-md p-8 text-center cursor-pointer hover:border-purple-500"
                 @dragover.prevent @drop.prevent="handleFileDrop" @click="triggerFileUpload">
              <input type="file" ref="fileInput" @change="handleFileUpload" class="hidden" />
              <p>Drop a document here or click to select file to upload</p>
              <i class="mdi mdi-upload text-3xl text-gray-500 mt-2"></i>
            </div>
            <p v-if="selectedFile" class="mt-2 text-sm text-gray-600">Selected file: {{ selectedFile.name }}</p>
          </div>

          <div>
            <input type="checkbox" class="mr-2" />
            <span class="text-red-600 text-sm">By uploading this document, you certify that these documents are true
              and all information is correct.</span>
          </div>

          <button @click="saveDocument"
                  class="mt-4 bg-purple-500 text-white py-2 px-6 rounded-md hover:bg-purple-600">Upload Document</button>
        </div>

        <!-- Required Documents List Section -->
        <div class="w-full lg:w-1/3 bg-white p-6 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4">Required <span class="text-purple-500">Documents</span></h2>
          <ul class="list-inside list-decimal text-gray-700">
            <li v-for="doc in requiredDocuments" :key="doc" class="flex items-center gap-2 mb-2">
              <i class="mdi mdi-check-circle text-green-500"></i>
              {{ doc }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Document Directory Section -->
      <div class="w-full bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 class="text-xl font-semibold mb-4">Document <span class="text-purple-600">Directory</span></h2>
        <div v-if="uploadedDocuments.length > 0">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr>
                <th class="border-b-2 border-gray-200 py-2">Document View</th>
                <th class="border-b-2 border-gray-200 py-2">Type</th>
                <th class="border-b-2 border-gray-200 py-2">Last Modified</th>
                <th class="border-b-2 border-gray-200 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in uploadedDocuments" :key="doc.type" class="hover:bg-gray-50">
                <td class="py-2">
                  <i class="mdi mdi-file-document-outline text-2xl text-gray-500"></i>
                </td>
                <td class="py-2">{{ doc.type }}</td>
                <td class="py-2">{{ doc.lastModified }}</td>
                <td class="py-2 flex items-center gap-2 justify-between sm:mr-3 ">
                  <div>
                    <button @click="previewDocument(doc)" class="text-purple-500 hover:text-purple-700">Preview</button> |
                  <button @click="triggerUpdateFileUpload(doc)" class="text-purple-500 hover:text-purple-700">Update</button>
                  </div>
                  <span @click="deleteDocument(doc)" class="mdi mdi-delete text-red-500 hover:text-red-700 cursor-pointer ml-2 text-2xl"></span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-gray-600">No documents uploaded yet.</p>
      </div>

      <!-- Hidden file input for updating document -->
      <input type="file" id="update-file-input" @change="handleUpdateFile" class="hidden" />
    </div>
  </EmployeePage>
</template>
