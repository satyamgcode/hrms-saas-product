import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../components/MainLayout.vue';
import { supabase } from '../utils/supabase';

const routes = [
  {
    path: '/signin',
    name: 'signin',
    component: () => import('../components/SignIn.vue'),
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
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  if (to.path === '/signin') {
    return true;
  }

  const refreshToken = to.query.refresh_token;
  if (refreshToken) {
    await supabase.auth.setSession({ refresh_token: refreshToken.toString() });
  }

  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session?.user) {
    return { path: '/signin' };
  }

  return true;
});

export default router;
