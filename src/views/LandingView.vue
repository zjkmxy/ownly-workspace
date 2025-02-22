<template>
  <main class="has-background-primary p-2">
    <LandingLeft class="left" />
    <LandingLogin class="login" @login="emit('login')" />
  </main>
</template>

<script setup lang="ts">
import LandingLeft from '@/components/landing/LandingLeft.vue';
import LandingLogin from '@/components/landing/LandingLogin.vue';

const emit = defineEmits(['login']);
</script>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

@media (min-width: 1024px) {
  main {
    flex-direction: row;
    height: 100vh;
  }

  .login {
    flex: 1;
  }
}
</style>
