<template>
  <section class="hero">
    <div class="hero-body pb-1">
      <p class="title">Dashboard</p>
      <p class="subtitle mt-2">You can create or join one or more workspaces below</p>
    </div>
  </section>

  <div class="spacelist">
    <div class="workspace card">
      <div class="card-content">
        <div class="content">
          <button class="button is-fullwidth mb-2">Create New</button>
          <button class="button is-primary is-fullwidth">Join Workspace</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Workspace from '@/components/home/Workspace.vue'
</script>

<style scoped lang="scss">
.spacelist {
  margin: 40px;
}
.workspace {
  display: inline-block;
  width: 100%;
  vertical-align: top;
}

@media (min-width: 600px) {
  .workspace {
    width: 250px;
    margin-right: 20px;
  }
}
</style>
