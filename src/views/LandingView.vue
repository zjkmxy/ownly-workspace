<template>
  <main class="full-h has-background-primary is-fullwidth">
    <LandingLeft class="left" />
    <LandingLogin class="login" />
  </main>
</template>

<script setup lang="ts">
import LandingLeft from '@/components/landing/LandingLeft.vue'
import LandingLogin from '@/components/landing/LandingLogin.vue'
</script>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
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
