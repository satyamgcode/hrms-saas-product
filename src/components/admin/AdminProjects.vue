<script setup>
import { ref, onMounted, computed } from 'vue';
import { getUsers, getCurrentSession, getUserProfile } from '../../services/api';
import {
  getClients, createClient, updateClient, deleteClient,
  getProjects, createProject, updateProject, deleteProject,
  getProjectAssignments, assignEmployeeToProject, removeEmployeeFromProject
} from '../../services/projectService';
import { addToast } from '../../services/toastService';

// State
const activeTab = ref('projects'); // 'projects' or 'clients'
const loading = ref(true);
const companyId = ref(1);

const projects = ref([]);
const clients = ref([]);
const employees = ref([]);

// Modals toggles
const showProjectModal = ref(false);
const showClientModal = ref(false);
const showAssignModal = ref(false);

const isEditingProject = ref(false);
const isEditingClient = ref(false);

// Focus items
const selectedProject = ref(null);
const activeAssignments = ref([]);

// Form states
const projectForm = ref({
  name: '',
  description: '',
  status: 'Planning',
  start_date: '',
  end_date: '',
  client_id: ''
});

const clientForm = ref({
  name: '',
  email: '',
  phone: '',
  industry: ''
});

const assignForm = ref({
  user_id: '',
  role: 'Developer'
});

// Load everything
const loadAllData = async () => {
  loading.value = true;
  try {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      if (profile) {
        companyId.value = profile.companyId || 1;
      }
    }
    const [projsData, clientsData, empsData] = await Promise.all([
      getProjects(companyId.value),
      getClients(companyId.value),
      getUsers(companyId.value)
    ]);
    projects.value = projsData;
    clients.value = clientsData;
    employees.value = empsData.map(e => ({
      id: e.id,
      name: e.name || e.full_name || e.email,
      avatar: e.avatar,
      email: e.email,
      designation: e.designation
    }));
  } catch (error) {
    console.error('Failed to load projects workspace data:', error);
    addToast('Error loading projects/clients database', 'error');
  } finally {
    loading.value = false;
  }
};

onMounted(loadAllData);

// ==========================================
// CLIENT HANDLERS
// ==========================================
const openCreateClient = () => {
  isEditingClient.value = false;
  clientForm.value = { name: '', email: '', phone: '', industry: '' };
  showClientModal.value = true;
};

const openEditClient = (client) => {
  isEditingClient.value = true;
  clientForm.value = { ...client };
  showClientModal.value = true;
};

const handleSaveClient = async () => {
  if (!clientForm.value.name) {
    addToast('Client name is required', 'warning');
    return;
  }
  try {
    if (isEditingClient.value) {
      const updated = await updateClient(clientForm.value.id, clientForm.value);
      const idx = clients.value.findIndex(c => c.id === updated.id);
      if (idx !== -1) clients.value[idx] = updated;
      addToast('Client details updated successfully', 'success');
    } else {
      const payload = { ...clientForm.value, companyId: companyId.value };
      const created = await createClient(payload);
      clients.value.unshift(created);
      addToast('New client registered successfully', 'success');
    }
    showClientModal.value = false;
  } catch (err) {
    addToast('Failed to save client details', 'error');
  }
};

const handleDeleteClient = async (id) => {
  if (confirm('Delete this client record? All projects linked to this client will be unlinked.')) {
    try {
      await deleteClient(id);
      clients.value = clients.value.filter(c => c.id !== id);
      addToast('Client profile deleted', 'success');
      loadAllData(); // reload projects to clear client mapping
    } catch (e) {
      addToast('Failed to delete client', 'error');
    }
  }
};

// ==========================================
// PROJECT HANDLERS
// ==========================================
const openCreateProject = () => {
  isEditingProject.value = false;
  projectForm.value = { name: '', description: '', status: 'Planning', start_date: '', end_date: '', client_id: '' };
  showProjectModal.value = true;
};

const openEditProject = (proj) => {
  isEditingProject.value = true;
  projectForm.value = { ...proj, client_id: proj.client_id || '' };
  showProjectModal.value = true;
};

const handleSaveProject = async () => {
  if (!projectForm.value.name) {
    addToast('Project name is required', 'warning');
    return;
  }
  try {
    const payload = {
      ...projectForm.value,
      client_id: projectForm.value.client_id ? Number(projectForm.value.client_id) : null,
      start_date: projectForm.value.start_date || null,
      end_date: projectForm.value.end_date || null
    };

    if (isEditingProject.value) {
      const updated = await updateProject(projectForm.value.id, payload);
      addToast('Project details updated successfully', 'success');
    } else {
      const finalPayload = { ...payload, companyId: companyId.value };
      const created = await createProject(finalPayload);
      addToast('Project created successfully', 'success');
    }
    showProjectModal.value = false;
    loadAllData();
  } catch (err) {
    addToast('Failed to save project', 'error');
  }
};

const handleDeleteProject = async (id) => {
  if (confirm('Delete this project and all employee assignments permanently?')) {
    try {
      await deleteProject(id);
      projects.value = projects.value.filter(p => p.id !== id);
      addToast('Project deleted successfully', 'success');
    } catch (e) {
      addToast('Failed to delete project', 'error');
    }
  }
};

// ==========================================
// ASSIGNMENT HANDLERS
// ==========================================
const openTeamPanel = async (proj) => {
  selectedProject.value = proj;
  assignForm.value = { user_id: '', role: 'Developer' };
  activeAssignments.value = [];
  showAssignModal.value = true;
  try {
    activeAssignments.value = await getProjectAssignments(proj.id, companyId.value);
  } catch (err) {
    addToast('Error loading project team assignments', 'error');
  }
};

const handleAssignEmployee = async () => {
  if (!assignForm.value.user_id) {
    addToast('Please select an employee', 'warning');
    return;
  }
  
  const alreadyAssigned = activeAssignments.value.some(a => a.user_id === assignForm.value.user_id);
  if (alreadyAssigned) {
    addToast('Employee is already assigned to this project', 'warning');
    return;
  }

  try {
    const payload = {
      project_id: selectedProject.value.id,
      user_id: assignForm.value.user_id,
      role: assignForm.value.role
    };
    await assignEmployeeToProject(payload);
    addToast('Employee assigned to project team', 'success');
    
    // Refresh assignments
    activeAssignments.value = await getProjectAssignments(selectedProject.value.id, companyId.value);
    assignForm.value.user_id = '';
  } catch (err) {
    addToast('Failed to assign employee', 'error');
  }
};

const handleUnassignEmployee = async (id) => {
  try {
    await removeEmployeeFromProject(id);
    activeAssignments.value = activeAssignments.value.filter(a => a.id !== id);
    addToast('Employee removed from project team', 'success');
  } catch (err) {
    addToast('Failed to remove employee', 'error');
  }
};

// Colors mapping helper
const getStatusClass = (status) => {
  switch (status) {
    case 'Planning': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'In Progress': return 'bg-indigo-50 text-brand-purple border-indigo-150';
    case 'On Hold': return 'bg-amber-50 text-brand-orange border-amber-150';
    case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-150';
    default: return 'bg-gray-50 text-gray-500';
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Top Action Banner -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-purple-100/40 shadow-sm">
      <div>
        <h2 class="text-xl font-black text-gray-950 tracking-tight flex items-center gap-2">
          <i class="mdi mdi-briefcase-variant-outline text-brand-purple"></i>
          Workspace Projects
        </h2>
        <p class="text-xs font-medium text-gray-500 mt-1">Manage project assignments, team roles, and happy clients.</p>
      </div>

      <div class="flex gap-2">
        <button v-if="activeTab === 'projects'" @click="openCreateProject"
          class="px-4 py-2.5 bg-brand-purple text-white font-bold text-xs rounded-xl shadow-md shadow-brand-purple/15 hover:bg-purple-700 transition flex items-center gap-1.5">
          <i class="mdi mdi-plus-box text-base"></i>
          Create Project
        </button>
        <button v-else @click="openCreateClient"
          class="px-4 py-2.5 bg-brand-orange text-white font-bold text-xs rounded-xl shadow-md shadow-brand-orange/15 hover:bg-orange-600 transition flex items-center gap-1.5">
          <i class="mdi mdi-plus-box text-base"></i>
          Add Client
        </button>
      </div>
    </div>

    <!-- Toggle Tabs -->
    <div class="flex border-b border-gray-200 gap-1.5 p-1 bg-gray-100 rounded-2xl w-max">
      <button @click="activeTab = 'projects'"
        :class="['px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition', activeTab === 'projects' ? 'bg-white text-brand-purple shadow-sm' : 'text-gray-500 hover:text-gray-700']">
        <i class="mdi mdi-briefcase-check-outline mr-1.5 text-base"></i>
        Active Projects
      </button>
      <button @click="activeTab = 'clients'"
        :class="['px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition', activeTab === 'clients' ? 'bg-white text-brand-orange shadow-sm' : 'text-gray-500 hover:text-gray-700']">
        <i class="mdi mdi-handshake-outline mr-1.5 text-base"></i>
        Clients List
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 text-center">
      <span class="inline-block w-8 h-8 rounded-full border-4 border-purple-250 border-t-brand-purple animate-spin"></span>
      <p class="text-xs text-gray-400 font-bold mt-3">Loading projects data...</p>
    </div>

    <!-- TAB 1: PROJECTS LIST -->
    <div v-else-if="activeTab === 'projects'">
      <div v-if="projects.length === 0" class="bg-white rounded-3xl p-16 text-center border border-purple-50">
        <i class="mdi mdi-briefcase-outline text-5xl text-gray-300"></i>
        <h3 class="text-base font-bold text-gray-900 mt-4">No active projects</h3>
        <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Create a project and start assigning employees to initialize client workflows.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="proj in projects" :key="proj.id" 
          class="bg-white rounded-3xl border border-purple-100/30 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group relative overflow-hidden">
          
          <div class="space-y-4">
            <!-- Header status pill -->
            <div class="flex justify-between items-start">
              <span :class="['px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl border', getStatusClass(proj.status)]">
                {{ proj.status }}
              </span>
              
              <div class="opacity-0 group-hover:opacity-100 transition flex gap-1">
                <button @click="openEditProject(proj)" class="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-brand-purple" title="Edit project">
                  <i class="mdi mdi-pencil text-sm"></i>
                </button>
                <button @click="handleDeleteProject(proj.id)" class="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500" title="Delete project">
                  <i class="mdi mdi-delete-outline text-sm"></i>
                </button>
              </div>
            </div>

            <!-- Title -->
            <div>
              <h4 class="text-base font-black text-gray-950 leading-snug group-hover:text-brand-purple transition-colors">
                {{ proj.name }}
              </h4>
              <p v-if="proj.client?.name" class="text-xs text-brand-orange font-bold mt-1">
                <i class="mdi mdi-handshake mr-1"></i>{{ proj.client.name }}
              </p>
              <p v-else class="text-xs text-gray-400 font-bold mt-1">No client linked</p>
            </div>

            <p class="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3">
              {{ proj.description || 'No project description added yet.' }}
            </p>
          </div>

          <!-- Bottom Panel / Team trigger -->
          <div class="border-t border-gray-100 pt-4 mt-6 flex justify-between items-center bg-white">
            <div class="text-left">
              <p class="text-[9px] uppercase font-bold text-gray-400">Timeline</p>
              <p class="text-[10px] font-semibold text-gray-700 mt-0.5">
                {{ proj.start_date || 'Start date' }} to {{ proj.end_date || 'End date' }}
              </p>
            </div>

            <button @click="openTeamPanel(proj)"
              class="px-3.5 py-1.5 text-xs font-bold text-brand-purple bg-purple-50 hover:bg-brand-purple hover:text-white rounded-xl transition flex items-center gap-1">
              <i class="mdi mdi-account-multiple text-sm"></i>
              Manage Team
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: CLIENTS DIRECTORY -->
    <div v-else-if="activeTab === 'clients'">
      <div v-if="clients.length === 0" class="bg-white rounded-3xl p-16 text-center border border-purple-50">
        <i class="mdi mdi-handshake-outline text-5xl text-gray-300"></i>
        <h3 class="text-base font-bold text-gray-900 mt-4">No clients registered</h3>
        <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Add a client profile to begin assigning new project proposals.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="client in clients" :key="client.id"
          class="bg-white rounded-3xl border border-purple-100/30 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
          
          <div class="space-y-4">
            <div class="flex justify-between items-start">
              <span class="px-2.5 py-1 bg-amber-50 text-brand-orange border border-amber-100 rounded-xl text-[10px] font-black uppercase tracking-wider">
                {{ client.industry || 'General' }}
              </span>
              <div class="opacity-0 group-hover:opacity-100 transition flex gap-1">
                <button @click="openEditClient(client)" class="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-brand-purple">
                  <i class="mdi mdi-pencil text-sm"></i>
                </button>
                <button @click="handleDeleteClient(client.id)" class="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                  <i class="mdi mdi-delete-outline text-sm"></i>
                </button>
              </div>
            </div>

            <div>
              <h4 class="text-base font-black text-gray-900 leading-snug">{{ client.name }}</h4>
            </div>
            
            <div class="space-y-2 text-xs font-semibold text-gray-500">
              <div class="flex items-center gap-2">
                <i class="mdi mdi-email-outline text-gray-400"></i>
                <span>{{ client.email || 'No email' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="mdi mdi-phone-outline text-gray-400"></i>
                <span>{{ client.phone || 'No phone number' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 1: ADD/EDIT PROJECT -->
    <div v-if="showProjectModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-purple-50 animate-in fade-in zoom-in-95 duration-200">
        <header class="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-base font-black text-gray-900">{{ isEditingProject ? 'Edit Project Profile' : 'Launch New Project' }}</h3>
          <button @click="showProjectModal = false" class="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <i class="mdi mdi-close text-lg"></i>
          </button>
        </header>

        <form @submit.prevent="handleSaveProject" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Project Name *</label>
            <input v-model="projectForm.name" type="text" required placeholder="e.g. HRMS Portal Core Expansion"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Linked Client</label>
            <select v-model="projectForm.client_id"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
              <option value="">No Client (Internal Project)</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Date</label>
              <input v-model="projectForm.start_date" type="date"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Date</label>
              <input v-model="projectForm.end_date" type="date"
                class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Project Status</label>
            <select v-model="projectForm.status"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Project Description</label>
            <textarea v-model="projectForm.description" rows="3" placeholder="Outline scope, core services, or sprint items..."
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all resize-none"></textarea>
          </div>

          <div class="flex justify-end gap-2.5 pt-4 border-t border-gray-150 -mx-6 -mb-6 p-6 bg-gray-50/50">
            <button type="button" @click="showProjectModal = false" class="px-5 py-2.5 rounded-2xl border border-gray-200 font-bold text-sm text-gray-500 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2.5 rounded-2xl bg-brand-purple text-white font-bold text-sm hover:bg-purple-700 shadow-md shadow-brand-purple/10 transition">
              Save Project
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: ADD/EDIT CLIENT -->
    <div v-if="showClientModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-purple-50 animate-in fade-in zoom-in-95 duration-200">
        <header class="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 class="text-base font-black text-gray-900">{{ isEditingClient ? 'Edit Client profile' : 'Add Client profile' }}</h3>
          <button @click="showClientModal = false" class="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <i class="mdi mdi-close text-lg"></i>
          </button>
        </header>

        <form @submit.prevent="handleSaveClient" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Client Name *</label>
            <input v-model="clientForm.name" type="text" required placeholder="e.g. Acme Corporation"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <input v-model="clientForm.email" type="email" placeholder="e.g. contact@acme.com"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label>
            <input v-model="clientForm.phone" type="text" placeholder="e.g. +1 (555) 901-2345"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Industry Segment</label>
            <input v-model="clientForm.industry" type="text" placeholder="e.g. Tech, Retail, Energy"
              class="w-full px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all" />
          </div>

          <div class="flex justify-end gap-2.5 pt-4 border-t border-gray-150 -mx-6 -mb-6 p-6 bg-gray-50/50">
            <button type="button" @click="showClientModal = false" class="px-5 py-2.5 rounded-2xl border border-gray-200 font-bold text-sm text-gray-500 hover:bg-gray-100 transition">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2.5 rounded-2xl bg-brand-orange text-white font-bold text-sm hover:bg-orange-600 shadow-md shadow-brand-orange/10 transition">
              Save Client
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: ASSIGN TEAM PANEL -->
    <div v-if="showAssignModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-50 animate-in fade-in zoom-in-95 duration-200">
        <header class="bg-gray-50 px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 class="text-base font-black text-gray-900">Manage Project Team</h3>
            <p v-if="selectedProject" class="text-xs text-gray-500 font-medium mt-1">Assign employees and manage roles for project: <span class="font-bold text-brand-purple">{{ selectedProject.name }}</span></p>
          </div>
          <button @click="showAssignModal = false" class="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <i class="mdi mdi-close text-lg"></i>
          </button>
        </header>

        <div class="p-6 space-y-6">
          <!-- ASSIGN NEW TEAM MEMBER FORM -->
          <div class="bg-purple-50/30 border border-purple-100/50 rounded-2xl p-4">
            <h4 class="text-xs font-black uppercase tracking-wider text-purple-700 mb-3">Assign Team Member</h4>
            <form @submit.prevent="handleAssignEmployee" class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Select Employee</label>
                <select v-model="assignForm.user_id" required
                  class="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
                  <option value="">Choose employee...</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.name }} ({{ emp.designation || 'Staff' }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Project Role</label>
                <select v-model="assignForm.role"
                  class="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all">
                  <option value="Project Lead">Project Lead</option>
                  <option value="Developer">Developer</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Designer">UI/UX Designer</option>
                  <option value="QA Engineer">QA Engineer</option>
                </select>
              </div>

              <button type="submit"
                class="w-full py-2.5 bg-brand-purple text-white font-bold text-xs rounded-xl shadow-md shadow-brand-purple/10 hover:bg-purple-700 transition flex items-center justify-center gap-1.5">
                <i class="mdi mdi-account-plus text-sm"></i>
                Add Member
              </button>
            </form>
          </div>

          <!-- TEAM MEMBERS LIST -->
          <div>
            <h4 class="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Current Assignments</h4>
            
            <div v-if="activeAssignments.length === 0" class="py-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl">
              <i class="mdi mdi-account-off text-3xl"></i>
              <p class="text-xs font-semibold mt-2">No team members assigned yet.</p>
            </div>

            <div v-else class="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
              <div v-for="member in activeAssignments" :key="member.id"
                class="flex items-center justify-between p-3 border border-gray-150 rounded-2xl hover:bg-gray-50/50 transition bg-white">
                <div class="flex items-center gap-3">
                  <img :src="member.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || 'Employee')}&background=8A3EEA&color=fff`"
                    alt="avatar" class="w-9 h-9 rounded-full object-cover border border-purple-100 shadow-sm" />
                  <div class="text-left">
                    <p class="text-xs font-bold text-gray-900">{{ member.user?.name || 'Employee' }}</p>
                    <p class="text-[10px] text-gray-400 font-bold mt-0.5">{{ member.user?.email || 'No email' }}</p>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span class="px-2.5 py-1 bg-purple-50 border border-purple-100 text-brand-purple text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm">
                    {{ member.role }}
                  </span>
                  <button @click="handleUnassignEmployee(member.id)"
                    class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove from project">
                    <i class="mdi mdi-trash-can-outline text-base"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #E5E7EB;
  border-radius: 10px;
}
</style>
