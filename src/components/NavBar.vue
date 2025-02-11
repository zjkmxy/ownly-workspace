<template>
  <aside class="menu has-background-primary">
    <img alt="logo" class="logo" src="@/assets/logo.svg" />

    <p class="menu-label">General</p>
    <ul class="menu-list">
      <li><a :class="{ 'is-active': route == 'home' }">Dashboard</a></li>
    </ul>

    <p class="menu-label">Settings</p>
    <ul class="menu-list">
      <li><a>Identity</a></li>
      <li><a>Connectivity</a></li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import router from '@/router'
import { computed } from 'vue'

const route = computed(() => router.currentRoute.value.name)
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

      &.is-active {
        background-color: var(--bulma-body-background-color);
        color: var(---bulma-text-strong);
      }
    }
  }
}
</style>
