<script setup>
import EmployeePage from './EmployeePage.vue';

const employeeData = {
    name: 'Satyam gupta',
    role: 'Senior Software Engineer',
    email: 'satyam.gupta@example.com',
    website: 'www.satyamgcode.com',
    phone: '+123 456 7890',
    team: 5,
    awards: 3,
    projects: 10,
    clients: 15,
    socialLinks: {
        facebook: 'https://facebook.com/johndoe',
        twitter: 'https://twitter.com/johndoe',
        linkedin: 'https://github.com/satyamgcode',
    },
    bio: 'Satyam gupta is an experienced software engineer with over 10 years in the tech industry. He specializes in developing scalable web applications and has a passion for learning new technologies.',
};

</script>

<template>
    <EmployeePage>
        <div class="mt-6 bg-white p-6 rounded-lg shadow-md">
            <div class="flex items-center gap-4">
                <img src="https://randomuser.me/api/portraits/men/1.jpg" alt="Employee photo"
                    class="w-24 h-24 rounded-full" />
                <div>
                    <h2 class="text-2xl font-semibold">{{ employeeData.name }}</h2>
                    <p class="text-gray-600">{{ employeeData.role }}</p>
                </div>
            </div>

            <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                <div>
                    <p class="text-xl font-bold">{{ employeeData.team }}</p>
                    <p class="text-gray-600">Team</p>
                </div>
                <div>
                    <p class="text-xl font-bold">{{ employeeData.awards }}</p>
                    <p class="text-gray-600">Awards</p>
                </div>
                <div>
                    <p class="text-xl font-bold">{{ employeeData.projects }}</p>
                    <p class="text-gray-600">Projects</p>
                </div>
                <div>
                    <p class="text-xl font-bold">{{ employeeData.clients }}</p>
                    <p class="text-gray-600">Clients</p>
                </div>
            </div>

            <div class="mt-6">
                <p>Email: <a :href="`mailto:${employeeData.email}`" class="text-purple-600">{{ employeeData.email
                        }}</a></p>
                <p>Website: <a :href="employeeData.website" class="text-purple-600">{{ employeeData.website }}</a></p>
                <p>Phone: <a :href="`tel:${employeeData.phone}`" class="text-purple-600">{{ employeeData.phone }}</a>
                </p>
            </div>

            <div class="mt-4 flex gap-4">
                <a :href="employeeData.socialLinks.facebook" target="_blank">
                    <i class="mdi mdi-facebook text-blue-600 text-2xl"></i>
                </a>
                <a :href="employeeData.socialLinks.twitter" target="_blank">
                    <i class="mdi mdi-twitter text-blue-400 text-2xl"></i>
                </a>
                <a :href="employeeData.socialLinks.linkedin" target="_blank">
                    <i class="mdi mdi-linkedin text-blue-700 text-2xl"></i>
                </a>
            </div>

            <div class="mt-6">
                <p>{{ employeeData.bio }}</p>
            </div>
        </div>
    </EmployeePage>
</template>