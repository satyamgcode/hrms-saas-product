import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../components/MainLayout.vue';

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

export default router;
