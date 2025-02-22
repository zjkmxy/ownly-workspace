<template>
  <Transition name="fade-2" mode="out-in">
    <!-- This view will set up WASM and make sure we have a key -->
    <LandingView v-if="showLogin" @login="showLogin = false" />

    <!-- This view will show the main app -->
    <main v-else-if="!showLogin" class="full-h is-fullwidth router-view">
      <NavBar></NavBar>
      <div class="router-view-inner">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </div>
    </main>
  </Transition>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterView } from 'vue-router';

import NavBar from '@/components/NavBar.vue';
import LandingView from '@/views/LandingView.vue';

import { GlobalBus } from '@/services/event-bus';
import { Toast } from '@/utils/toast';

const showLogin = ref(true);

onMounted(() => {
  GlobalBus.addListener('wksp-error', wkspErrorListener);
});

onUnmounted(() => {
  GlobalBus.removeListener('wksp-error', wkspErrorListener);
});

function wkspErrorListener(error: Error) {
  Toast.error(error.toString());
}
</script>

<style scoped lang="scss">
main.router-view {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;

  > .router-view-inner {
    flex: 1;
    overflow: hidden;
  }
}
</style>
