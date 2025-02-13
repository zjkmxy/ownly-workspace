<template>
  <router-link :to="linkProject(project)">
    <div class="link-inner">
      <FontAwesomeIcon class="mr-1" :icon="fas.faLayerGroup" size="sm" />
      {{ project.name }}
    </div>

    <ProjectTreeAddButton v-if="active" class="link-button" @add="projectNewFile('/')" />
  </router-link>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useRoute } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import ProjectTreeAddButton from './ProjectTreeAddButton.vue';

import type { IProject } from '@/services/types';

const route = useRoute();

defineProps({
  active: Boolean,
  project: {
    type: Object as PropType<IProject>,
    required: true,
  },
});

const linkProject = (project: IProject) => ({
  name: 'project',
  params: {
    space: route.params.space,
    project: project.name,
  },
});

const projectNewFile = (path: string) => {
  alert('New file');
};
</script>

<style lang="css" scoped></style>
