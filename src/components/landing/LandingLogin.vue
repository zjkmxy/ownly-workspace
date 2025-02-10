<template>
  <div class="box wrapper p-4">
    <div class="header is-size-4 has-text-weight-semibold">Get started</div>

    <div class="login mt-2">
      First, you need an email address to verify your unique identity.
      <input class="input mt-3" type="email" placeholder="name@email.com" />

      <button class="button mt-3 is-primary is-fullwidth">Continue</button>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.wrapper {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .wrapper {
    margin: auto;
    margin-right: 100px;
    min-width: 350px;
  }
}
</style>
