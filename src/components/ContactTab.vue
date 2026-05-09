<script setup>
import { ref } from 'vue';
import EmployeePage from './EmployeePage.vue';

const contactData = ref({
  email: 'satyam.gupta@example.com',
  phone: '+123 456 7890',
  currentAddress: '4567 Maple Avenue, Los Angeles, CA, USA',
  permanentAddress: '1234 Elm Street, New York, NY, USA',
  officeAddress: '7890 Pine Road, San Francisco, CA, USA',
  socialLinks: {
    linkedin: 'https://linkedin.com/in/johndoe',
    twitter: 'https://twitter.com/johndoe',
    facebook: 'https://facebook.com/johndoe',
  },
});

const isEditing = ref(false);

const toggleEdit = () => {
  isEditing.value = !isEditing.value;
};

const saveChanges = () => {
  console.log('Saving changes:', contactData.value);
  isEditing.value = false;
};
</script>

<template>
  <EmployeePage>
    <div class="max-w-full mx-auto mt-8 bg-white p-8 rounded-lg shadow-md ">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-semibold">Contact Details</h2>
        <button @click="toggleEdit" class="text-gray-500 hover:text-gray-700">
          <i :class="isEditing ? 'mdi mdi-cancel text-green-500' : 'mdi mdi-pencil text-gray-500'" class="text-2xl"></i>
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label class="block text-gray-600 mb-1">Email</label>
          <input
            v-if="isEditing"
            v-model="contactData.email"
            type="email"
            class="w-full border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p v-else><a :href="`mailto:${contactData.email}`" class="text-purple-600">{{ contactData.email }}</a></p>
        </div>

        <div>
          <label class="block text-gray-600 mb-1">Phone</label>
          <input
            v-if="isEditing"
            v-model="contactData.phone"
            type="tel"
            class="w-full border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <p v-else><a :href="`tel:${contactData.phone}`" class="text-purple-600">{{ contactData.phone }}</a></p>
        </div>

        <div class="col-span-2">
          <label class="block text-gray-600 mb-1">Current Address</label>
          <input
            v-if="isEditing"
            v-model="contactData.currentAddress"
            type="text"
            class="w-full border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p v-else>{{ contactData.currentAddress }}</p>
        </div>

        <div class="col-span-2">
          <label class="block text-gray-600 mb-1">Permanent Address</label>
          <input
            v-if="isEditing"
            v-model="contactData.permanentAddress"
            type="text"
            class="w-full border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p v-else>{{ contactData.permanentAddress }}</p>
        </div>

        <div class="col-span-2">
          <label class="block text-gray-600 mb-1">Office Address</label>
          <input
            v-if="isEditing"
            v-model="contactData.officeAddress"
            type="text"
            class="w-full border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p v-else>{{ contactData.officeAddress }}</p>
        </div>
      </div>

      <div class="mt-6">
        <h3 class="text-lg font-semibold mb-2">Social Links</h3>
        <div class="flex gap-4">
          <a :href="contactData.socialLinks.linkedin" target="_blank" class="flex items-center gap-2 text-blue-700">
            <i class="mdi mdi-linkedin text-2xl"></i> LinkedIn
          </a>
          <a :href="contactData.socialLinks.twitter" target="_blank" class="flex items-center gap-2 text-blue-400">
            <i class="mdi mdi-twitter text-2xl"></i> Twitter
          </a>
          <a :href="contactData.socialLinks.facebook" target="_blank" class="flex items-center gap-2 text-blue-600">
            <i class="mdi mdi-facebook text-2xl"></i> Facebook
          </a>
        </div>
      </div>
    </div>
  </EmployeePage>
</template>
