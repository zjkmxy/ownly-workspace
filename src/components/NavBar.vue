<template>
  <aside class="menu has-background-primary">
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
      <p class="menu-label">General</p>
      <ul class="menu-list">
        <li>
          <router-link :to="linkFiles"> Files </router-link>
        </li>
      </ul>

      <p class="menu-label">Discussion</p>
      <ul class="menu-list">
        <li v-for="chan in channels" :key="chan.id">
          <router-link :to="linkDiscuss(chan)" class="chan-name">
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
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

import type { IChatChannel } from '@/services/types'
import { GlobalWkspEvents } from '@/services/workspace'
import AddChannelModal from './AddChannelModal.vue'

const route = useRoute()
const routeIsDashboard = computed(() => route.name === 'home')
const routeIsWorkspace = computed(() => ['files', 'discuss'].includes(String(route.name)))

const channels = ref([] as IChatChannel[])
const showChannelModal = ref(false)

const linkFiles = computed(() => ({
  name: 'files',
  params: { space: route.params.space },
}))
const linkDiscuss = (channel: IChatChannel) => ({
  name: 'discuss',
  params: {
    space: route.params.space,
    channel: channel.name,
  },
})

onMounted(async () => {
  // Subscribe for chat channels
  GlobalWkspEvents.addListener('chat-channels', (chans) => (channels.value = chans))
})
</script>

<style scoped lang="scss">
.logo {
  display: block;
  height: 35px;
  margin: 5px;
  margin-bottom: 15px;
}

.menu {
  padding: 10px;
  min-width: 220px;

  .menu-label {
    color: silver;
  }
  .menu-list {
    a,
    button,
    .menu-item {
      background-color: transparent;
      color: white;

      &.is-active,
      &.router-link-active {
        background-color: var(--bulma-body-background-color);
        color: var(---bulma-text-strong);
      }
    }
  }
}

.chan-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
