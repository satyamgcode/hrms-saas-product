import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../components/MainLayout.vue';
import AdminLayout from '../components/admin/AdminLayout.vue';
import { supabase } from '../utils/supabase';
import { getUserProfile } from '../services/api';

const routes = [
  {
    path: '/signin',
    name: 'signin',
    component: () => import('../components/SignIn.vue'),
  },
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('../components/admin/AdminDashboard.vue'),
      },
      {
        path: 'employees',
        name: 'admin-employees',
        component: () => import('../components/admin/AdminEmployees.vue'),
      },
      {
        path: 'policies',
        name: 'admin-policies',
        component: () => import('../components/Companypolicy.vue'),
      },
      {
        path: 'leaves',
        name: 'admin-leaves',
        component: () => import('../components/admin/AdminLeaves.vue'),
      },
      {
        path: 'payroll',
        name: 'admin-payroll',
        component: () => import('../components/admin/AdminPayroll.vue'),
      },
      {
        path: 'attendance',
        name: 'admin-attendance',
        component: () => import('../components/admin/AdminAttendance.vue'),
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: () => import('../components/admin/AdminSettings.vue'),
      },
      {
        path: ':pathMatch(.*)*',
        name: 'AdminNotFound',
        component: () => import('../components/NotFoundPage.vue'),
      },
    ],
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        redirect: '/signin',
      },
      {
        path: 'overview',
        name: 'overview',
        component: () => import('../components/OverviewTab.vue'),
      },
      {
        path: 'companypolicy',
        name: 'Companypolicy',
        component: () => import('../components/Companypolicy.vue'),
      },
      {
        path: 'holidays',
        name: 'holidays',
        component: () => import('../components/Holidays.vue'),
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../components/UsersTab.vue'),
      },
      {
        path: 'details',
        name: 'details',
        component: () => import('../components/DetailsTab.vue'),
      },
      {
        path: 'contact',
        name: 'contact',
        component: () => import('../components/ContactTab.vue'),
      },
      {
        path: 'documents',
        name: 'documents',
        component: () => import('../components/EducationTab.vue'),
      },
      {
        path: 'leaves',
        name: 'leaves',
        component: () => import('../components/LeavesTab.vue'),
      },
      {
        path: 'payslips',
        name: 'payslips',
        component: () => import('../components/PayslipsTab.vue'),
      },
      {
        path: 'attendance',
        name: 'attendance',
        component: () => import('../components/AttendanceTab.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../components/EmployeeSettings.vue'),
      },
      {
        path: ':pathMatch(.*)*',
        name: 'EmployeeNotFound',
        component: () => import('../components/NotFoundPage.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const refreshToken = to.query.refresh_token;
  if (refreshToken) {
    await supabase.auth.setSession({ refresh_token: refreshToken.toString() });
  }

  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (to.path === '/signin') {
    if (session?.user) {
      // User is already signed in. Check role to redirect.
      const profile = await getUserProfile({ email: session.user.email });
      if (profile?.role?.toLowerCase() === 'admin') {
        return { path: '/admin/dashboard' };
      }
      return { path: '/overview' };
    }
    return true;
  }

  if (!session?.user) {
    return { path: '/signin' };
  }

  // Check role restriction for admin panel
  if (to.path.startsWith('/admin')) {
    const profile = await getUserProfile({ email: session.user.email });
    if (profile?.role?.toLowerCase() !== 'admin') {
      console.warn('Unauthorized admin access attempt. Redirecting to employee overview.');
      return { path: '/overview' };
    }
  }

  return true;
});

export default router;
