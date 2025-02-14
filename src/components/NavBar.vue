<template>
  <aside class="menu main-nav has-background-primary soft-if-dark">
    <router-link to="/" v-slot="{ navigate }">
      <img alt="logo" class="logo" src="@/assets/logo.svg" @click="navigate" />
    </router-link>

    <!-- non-workspace general routes -->
    <template v-if="routeIsDashboard">
      <p class="menu-label">General</p>
      <ul class="menu-list">
        <li><router-link to="/">Dashboard</router-link></li>
      </ul>
    </template>

    <template v-if="routeIsWorkspace">
      <p class="menu-label">Projects</p>
      <ul class="menu-list">
        <li v-for="proj in projects" :key="proj.id">
          <router-link :to="linkProject(proj)">
            <div class="link-inner">
              <FontAwesomeIcon class="mr-1" :icon="fas.faLayerGroup" size="sm" />
              {{ proj.name }}
            </div>

            <ProjectTreeAddButton
              v-if="activeProjectName === proj.name"
              class="link-button"
              :allow-new="true"
              :allow-delete="false"
              @new-file="$refs.projectTree.find(() => true)?.newInHere('file')"
              @new-folder="$refs.projectTree.find(() => true)?.newInHere('folder')"
            />
          </router-link>

          <ProjectTree
            v-if="activeProjectName == proj.name"
            class="outermost"
            ref="projectTree"
            :files="projectFiles"
          />
        </li>

        <li>
          <a @click="showProjectModal = true">
            <FontAwesomeIcon class="mr-1" :icon="fas.faPlus" size="sm" />
            Add project
          </a>
        </li>
      </ul>

      <p class="menu-label">Discussion</p>
      <ul class="menu-list">
        <li v-for="chan in channels" :key="chan.id">
          <router-link :to="linkDiscuss(chan)">
            <FontAwesomeIcon class="mr-1" :icon="fas.faHashtag" size="sm" />
            {{ chan.name }}
          </router-link>
        </li>
        <li>
          <a @click="showChannelModal = true">
            <FontAwesomeIcon class="mr-1" :icon="fas.faPlus" size="sm" />
            Add channel
          </a>
        </li>
      </ul>
    </template>

    <p class="menu-label">Settings</p>
    <ul class="menu-list">
      <li><a>Identity</a></li>
      <li><a>Connectivity</a></li>
    </ul>

    <Teleport to="body">
      <Transition name="fade-2">
        <AddChannelModal v-if="showChannelModal" @close="showChannelModal = false" />
      </Transition>

      <Transition name="fade-2">
        <AddProjectModal v-if="showProjectModal" @close="showProjectModal = false" />
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import ProjectTree from './ProjectTree.vue';
import ProjectTreeAddButton from './ProjectTreeAddButton.vue';
import AddChannelModal from './AddChannelModal.vue';
import AddProjectModal from './AddProjectModal.vue';

import type { IChatChannel, IProject, IProjectFile } from '@/services/types';
import { GlobalWkspEvents } from '@/services/workspace';

const route = useRoute();
const routeIsDashboard = computed(() => route.name === 'home');
const routeIsWorkspace = computed(() =>
  ['files', 'project', 'discuss'].includes(String(route.name)),
);

const channels = ref([] as IChatChannel[]);
const showChannelModal = ref(false);

const projects = ref([] as IProject[]);
const showProjectModal = ref(false);
const activeProjectName = ref(null as string | null);
const projectFiles = ref([] as IProjectFile[]);

const linkProject = (project: IProject) => ({
  name: 'project',
  params: {
    space: route.params.space,
    project: project.name,
  },
});

const linkDiscuss = (channel: IChatChannel) => ({
  name: 'discuss',
  params: {
    space: route.params.space,
    channel: channel.name,
  },
});

onMounted(async () => {
  // Subscribe for projects list
  GlobalWkspEvents.addListener('project-list', (projs) => (projects.value = projs));
  // Subscribe for project files list
  GlobalWkspEvents.addListener('project-files', (name, files) => {
    activeProjectName.value = name;
    projectFiles.value = files;
  });
  // Subscribe for chat channels
  GlobalWkspEvents.addListener('chat-channels', (chans) => (channels.value = chans));
});
</script>

<style scoped lang="scss">
@use '@/components/navbar-item.scss';

.main-nav {
  padding: 10px;

  width: 230px;
  min-width: 230px;
  height: 100vh;
  overflow-y: auto;

  .logo {
    display: block;
    height: 35px;
    margin: 5px;
    margin-bottom: 15px;
  }

  .menu-label {
    color: #bbb;
  }

  :deep(li > a) {
    background-color: transparent;
    color: white;

    &.is-active,
    &.router-link-active {
      background-color: var(--bulma-body-background-color);
      color: var(---bulma-text-strong);
    }
  }
}
</style>
