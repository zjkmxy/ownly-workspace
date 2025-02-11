<template>
  <Transition @after-leave="showMain = true">
    <!-- This view will set up WASM and make sure we have a key -->
    <LandingView v-if="showLogin" @login="showLogin = false" class="anim-fade" />
  </Transition>

  <Transition>
    <!-- This view will show the main app -->
    <RouterView v-if="showMain" class="anim-fade" />
  </Transition>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'
import LandingView from '@/views/LandingView.vue'

const showLogin = ref(true)
const showMain = ref(false)
</script>
