import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import SpaceFilesView from '@/views/SpaceFilesView.vue';
import SpaceDiscussView from '@/views/SpaceDiscussView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/:space/',
      name: 'files',
      component: SpaceFilesView,
    },
    {
      path: '/:space/project/:project',
      name: 'project',
      component: SpaceFilesView,
    },
    {
      path: '/:space/discuss/:channel',
      name: 'discuss',
      component: SpaceDiscussView,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

export default router;
