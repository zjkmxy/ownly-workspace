<template>
  <div class="workspace card">
    <div class="card-content">
      <div class="block">
        <div class="media-content">
          <p class="has-text-weight-bold">{{ name }}</p>
          <p class="subtitle is-7 mt-1">{{ subtitle }}</p>
        </div>
      </div>

      <div class="content">
        <button class="button is-primary is-fullwidth">Enter</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  name: String,
  subtitle: String,
});
</script>

<style scoped lang="scss">
.card,
.card-content,
.media-content {
  overflow: hidden;
}
</style>
