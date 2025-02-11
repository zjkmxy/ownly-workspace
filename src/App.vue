<template>
  <Transition @after-leave="showMain = true">
    <!-- This view will set up WASM and make sure we have a key -->
    <LandingView v-if="showLogin" @login="showLogin = false" class="anim-fade" />
  </Transition>

  <Transition>
    <!-- This view will show the main app -->
    <main v-if="showMain" class="full-h has-background-primary is-fullwidth anim-fade">
      <NavBar></NavBar>
      <div class="box full-h-nav">
        <RouterView />
      </div>
    </main>
  </Transition>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'
import LandingView from '@/views/LandingView.vue'
import NavBar from './components/NavBar.vue'

const showLogin = ref(true)
const showMain = ref(false)
</script>

<style scoped lang="scss">
main > .box.full-h-nav {
  height: calc(100vh - 20px - 40px);
}
</style>
