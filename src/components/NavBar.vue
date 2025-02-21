<template>
  <aside class="menu main-nav has-background-primary soft-if-dark">
    <router-link to="/" v-slot="{ navigate }">
      <img alt="logo" class="logo" src="@/assets/logo-white.svg" @click="navigate" />
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
        <li v-for="proj in projects" :key="proj.name">
          <router-link :to="linkProject(proj)">
            <div class="link-inner">
              <FontAwesomeIcon class="mr-1" :icon="faLayerGroup" size="sm" />
              {{ proj.name }}
            </div>

            <ProjectTreeMenu
              v-if="activeProjectName === proj.name"
              class="link-button"
              :allow-new="true"
              :allow-delete="false"
              @new-file="$refs.projectTree[0]?.newHere('file', $event)"
              @new-folder="$refs.projectTree[0]?.newHere('folder')"
              @import="$refs.projectTree[0]?.importHere()"
              @import-zip="$refs.projectTree[0]?.importZipHere()"
              @export="$refs.projectTree[0]?.executeExport(null)"
            />
          </router-link>

          <ProjectTree
            v-if="activeProjectName == proj.name"
            class="outermost"
            ref="projectTree"
            :project="proj"
            :files="projectFiles"
          />
        </li>

        <li>
          <a @click="showProjectModal = true">
            <FontAwesomeIcon class="mr-1" :icon="faPlus" size="sm" />
            Add project
          </a>
        </li>
      </ul>

      <p class="menu-label">Discussion</p>
      <ul class="menu-list">
        <li v-for="chan in channels" :key="chan.id">
          <router-link :to="linkDiscuss(chan)">
            <FontAwesomeIcon class="mr-1" :icon="faHashtag" size="sm" />
            {{ chan.name }}
          </router-link>
        </li>
        <li>
          <a @click="showChannelModal = true">
            <FontAwesomeIcon class="mr-1" :icon="faPlus" size="sm" />
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

    <AddChannelModal :show="showChannelModal" @close="showChannelModal = false" />
    <AddProjectModal :show="showProjectModal" @close="showProjectModal = false" />
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faLayerGroup, faPlus, faHashtag } from '@fortawesome/free-solid-svg-icons';

import ProjectTree from './ProjectTree.vue';
import ProjectTreeMenu from './ProjectTreeMenu.vue';
import AddChannelModal from './AddChannelModal.vue';
import AddProjectModal from './AddProjectModal.vue';

import { GlobalBus } from '@/services/event-bus';
import type { IChatChannel, IProject, IProjectFile } from '@/services/types';

const route = useRoute();
const routeIsDashboard = computed(() => route.name === 'home');
const routeIsWorkspace = computed(() =>
  ['space-home', 'project', 'discuss', 'project-file'].includes(String(route.name)),
);

const channels = ref([] as IChatChannel[]);
const showChannelModal = ref(false);

const projects = ref([] as IProject[]);
const showProjectModal = ref(false);
const activeProjectName = ref(null as string | null);
const projectFiles = ref([] as IProjectFile[]);

const busListeners = {
  'project-list': (projs: IProject[]) => (projects.value = projs),
  'project-files': (name: string, files: IProjectFile[]) => {
    activeProjectName.value = name;
    projectFiles.value = files;
  },
  'chat-channels': (chans: IChatChannel[]) => (channels.value = chans),
};

onMounted(async () => {
  GlobalBus.addListener('project-list', busListeners['project-list']);
  GlobalBus.addListener('project-files', busListeners['project-files']);
  GlobalBus.addListener('chat-channels', busListeners['chat-channels']);
});

onUnmounted(() => {
  GlobalBus.removeListener('project-list', busListeners['project-list']);
  GlobalBus.removeListener('project-files', busListeners['project-files']);
  GlobalBus.removeListener('chat-channels', busListeners['chat-channels']);
});

/** Link to project home page */
function linkProject(project: IProject) {
  return {
    name: 'project',
    params: {
      space: route.params.space,
      project: project.name,
    },
  };
}

/** Link to discussion channel */
function linkDiscuss(channel: IChatChannel) {
  return {
    name: 'discuss',
    params: {
      space: route.params.space,
      channel: channel.name,
    },
  };
}
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

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    &.is-active,
    &.router-link-active {
      background-color: var(--bulma-body-background-color);
      color: var(--bulma-white-on-scheme);
    }
  }
}
</style>
