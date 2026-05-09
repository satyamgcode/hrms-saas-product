<script setup>
import EmployeePage from './EmployeePage.vue';
import { ref } from 'vue';

const isEditing = ref(false);

const employeeData = ref({
  name: 'Satyam Gupta',
  role: 'Senior Software Engineer',
  department: 'Software Development',
  employeeId: 'EMP123456',
  email: 'satyam.gupta@example.com',
  phone: '+123 456 7890',
  website: 'www.satyamgcode.com',
  location: 'New York, USA',
  joiningDate: '2022-01-15',
  team: 5,
  awards: 3,
  projects: 10,
  clients: 15,
  profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
  socialLinks: {
    facebook: 'https://facebook.com/johndoe',
    twitter: 'https://twitter.com/johndoe',
    linkedin: 'https://linkedin.com/in/johndoe',
  },
  bio: 'Satyam Gupta is an experienced software engineer specializing in developing scalable web applications with a passion for learning new technologies.',
});

const toggleEditMode = () => {
  isEditing.value = !isEditing.value;
};

const updateDetails = () => {
  console.log('Employee details updated:', employeeData.value);
  isEditing.value = false;
};
</script>

<template>
  <EmployeePage>
    <div class="mt-6 bg-white p-6 rounded-lg shadow-md">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-semibold">Employee Details</h2>
        <button
          @click="toggleEditMode"
          class="bg-purple-600 text-white py-1 px-4 rounded hover:bg-purple-700"
        >
          {{ isEditing ? 'Cancel' : 'Edit' }}
        </button>
      </div>

      <!-- View Mode -->
      <div v-if="!isEditing" class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="flex items-center gap-4 mb-4">
          <img :src="employeeData.profilePicture" alt="Profile Picture" class="w-24 h-24 rounded-full" />
          <div>
            <h3 class="text-xl font-bold">{{ employeeData.name }}</h3>
            <p class="text-gray-600">{{ employeeData.role }}</p>
          </div>
        </div>
        <div>
          <p><strong>Department:</strong> {{ employeeData.department }}</p>
          <p><strong>Employee ID:</strong> {{ employeeData.employeeId }}</p>
          <p><strong>Location:</strong> {{ employeeData.location }}</p>
          <p><strong>Joining Date:</strong> {{ employeeData.joiningDate }}</p>
        </div>
        <div>
          <p><strong>Email:</strong> <a :href="`mailto:${employeeData.email}`" class="text-purple-600">{{ employeeData.email }}</a></p>
          <p><strong>Phone:</strong> <a :href="`tel:${employeeData.phone}`" class="text-purple-600">{{ employeeData.phone }}</a></p>
          <p><strong>Website:</strong> <a :href="employeeData.website" class="text-purple-600">{{ employeeData.website }}</a></p>
        </div>
        <div class="col-span-2">
          <p>{{ employeeData.bio }}</p>
        </div>
      </div>

      <!-- Edit Mode -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="flex items-center gap-4 mb-4">
          <img :src="employeeData.profilePicture" alt="Profile Picture" class="w-24 h-24 rounded-full" />   
          <p class="text-1xl text-red-600">edit your profile details</p>
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Name</label>
          <input type="text" v-model="employeeData.name" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Role</label>
          <input type="text" v-model="employeeData.role" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Department</label>
          <input type="text" v-model="employeeData.department" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Employee ID</label>
          <input type="text" v-model="employeeData.employeeId" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Location</label>
          <input type="text" v-model="employeeData.location" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Joining Date</label>
          <input type="date" v-model="employeeData.joiningDate" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Email</label>
          <input type="email" v-model="employeeData.email" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Phone</label>
          <input type="tel" v-model="employeeData.phone" class="border p-2 rounded w-full" />
        </div>
        <div>
          <label class="block text-gray-600 mb-1">Website</label>
          <input type="url" v-model="employeeData.website" class="border p-2 rounded w-full" />
        </div>
        <div class="col-span-2">
          <label class="block text-gray-600 mb-1">Bio</label>
          <textarea v-model="employeeData.bio" class="border p-2 rounded w-full" rows="3"></textarea>
        </div>
        <div class="col-span-2 mt-4 flex gap-4">
          <button @click="updateDetails" class="bg-green-600 text-white py-1 px-4 rounded hover:bg-green-700">
            Save Changes
          </button>
          <button @click="toggleEditMode" class="bg-gray-600 text-white py-1 px-4 rounded hover:bg-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </EmployeePage>
</template>
