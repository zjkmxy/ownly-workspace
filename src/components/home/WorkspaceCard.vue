<template>
  <div class="workspace card">
    <div class="card-content">
      <div class="block">
        <div class="media-content">
          <p class="title is-4 has-text-weight-bold">{{ name }}</p>
          <p class="subtitle is-5 mt-1">{{ subtitle }}</p>
        </div>
      </div>

      <div class="content has-text-right">
        <button class="button is-primary is-small-caps soft-if-dark" @click="launch">
          Launch Workspace
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  name: String,
  subtitle: String,
});

const emit = defineEmits(['open']);

function launch() {
  emit('open');

  // Take this chance to request persistent storage
  navigator.storage?.persist?.().then((persisted) => {
    console.log(`Storage persistance state: ${persisted}`);
  });
}
</script>

<style scoped lang="scss">
.card,
.card-content,
.media-content {
  overflow: hidden;
}
</style>
