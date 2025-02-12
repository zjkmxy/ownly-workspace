<template>
  <aside class="menu has-background-primary">
    <router-link to="/" v-slot="{ navigate }">
      <img alt="logo" class="logo" src="@/assets/logo.svg" @click="navigate" />
    </router-link>

    <p class="menu-label">General</p>

    <!-- non-workspace general routes -->
    <template v-if="routeIsDashboard">
      <ul class="menu-list">
        <li><router-link to="/">Dashboard</router-link></li>
      </ul>
    </template>

    <template v-if="routeIsWorkspace">
      <ul class="menu-list">
        <li><router-link :to="linkFiles">Files</router-link></li>
        <li><router-link :to="linkDiscuss">Discussion</router-link></li>
      </ul>
    </template>

    <p class="menu-label">Settings</p>
    <ul class="menu-list">
      <li><a>Identity</a></li>
      <li><a>Connectivity</a></li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const routeIsDashboard = computed(() => route.name === 'home')
const routeIsWorkspace = computed(() => ['files', 'discuss'].includes(String(route.name)))

const linkFiles = computed(() => ({
  name: 'files',
  params: { space: route.params.space },
}))
const linkDiscuss = computed(() => ({
  name: 'discuss',
  params: { space: route.params.space },
}))
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
</style>
