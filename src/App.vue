<template>
  <Transition name="fade-2" mode="out-in">
    <!-- This view will set up WASM and make sure we have a key -->
    <LandingView v-if="showLogin" @login="showLogin = false" />

    <!-- This view will show the main app -->
    <main v-else-if="!showLogin" class="full-h is-fullwidth router-view">
      <NavBar></NavBar>
      <div class="container">
        <RouterView v-slot="{ Component }">
          <Transition name="fade-2" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
    </main>
  </Transition>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { ref } from 'vue';
import LandingView from '@/views/LandingView.vue';
import NavBar from './components/NavBar.vue';

const showLogin = ref(true);
</script>

<style scoped lang="scss">
main.router-view {
  display: flex;
  flex-direction: row;
}
</style>
