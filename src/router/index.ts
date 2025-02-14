import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import SpaceFilesView from '@/views/SpaceFilesView.vue';
import SpaceDiscussView from '@/views/SpaceDiscussView.vue';
import SpaceProjectView from '@/views/SpaceProjectView.vue';
import ProjectFileView from '@/views/ProjectFileView.vue';

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
      component: SpaceProjectView,
    },
    {
      path: '/:space/project/:project/:filename(.+)+',
      name: 'project-file',
      component: ProjectFileView,
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
