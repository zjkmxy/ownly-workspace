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
          <ProjectTree :project="proj" :active="proj.name === activeProjectName" />
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

    <Transition name="fade-2">
      <AddChannelModal v-if="showChannelModal" @close="showChannelModal = false" />
    </Transition>

    <Transition name="fade-2">
      <AddProjectModal v-if="showProjectModal" @close="showProjectModal = false" />
    </Transition>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import AddChannelModal from './AddChannelModal.vue';
import AddProjectModal from './AddProjectModal.vue';

import type { IChatChannel, IProject } from '@/services/types';
import { GlobalWkspEvents } from '@/services/workspace';
import ProjectTree from './ProjectTree.vue';

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
  });
  // Subscribe for chat channels
  GlobalWkspEvents.addListener('chat-channels', (chans) => (channels.value = chans));
});
</script>

<style scoped lang="scss">
.main-nav {
  padding: 10px;
  min-width: 220px;

  .logo {
    display: block;
    height: 35px;
    margin: 5px;
    margin-bottom: 15px;
  }

  .menu-label {
    color: #bbb;
  }

  li > a {
    background-color: transparent;
    color: white;

    &.is-active,
    &.router-link-active {
      background-color: var(--bulma-body-background-color);
      color: var(---bulma-text-strong);
    }
  }

  li > a,
  .link-inner {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // Link inner supports a button to the right of the link
  // The actual content is in div.link-inner
  li > a:has(div.link-inner) {
    // Bulma puts the padding on the outer link
    // element, but that clips the serifs in the text
    padding-top: 0px;
    padding-bottom: 0px;

    position: relative;
    display: flex;
    flex-direction: row;

    // Put bulma's padding on the inner element
    :deep(div.link-inner) {
      padding-top: 0.5em;
      padding-bottom: 0.5em;
      flex: 1;
    }

    :deep(.link-button) {
      margin-right: -6px;
      margin-top: 0.65em;
      padding: 0.2em;
      line-height: 0px;
      width: 1em;
      height: 1em;
      background-color: rgba(0, 0, 0, 0.15) !important;
    }

    &:not(.router-link-active) {
      :deep(.link-button) {
        color: white !important;
      }
    }
    &.router-link-active {
      :deep(.link-button) {
        color: var(--bulma-text-strong) !important;
      }
    }
  }
}
</style>
