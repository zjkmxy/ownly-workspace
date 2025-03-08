<template>
  <div class="workspace card">
    <div class="card-content">
      <div class="media">
        <div class="media-left">
          <figure class="image is-64x64 mr-1">
            <img :src="avatar" alt="Placeholder image" />
          </figure>
        </div>

        <div class="media-content">
          <p class="title is-4 has-text-weight-semibold">{{ name }}</p>
          <p class="subtitle is-6 mt-1">{{ subtitle }}</p>
        </div>
      </div>

      <div class="content has-text-right">
        <button class="button is-warning mr-2 is-small-caps soft-if-dark" @click="showRemove = true">
          Remove Workspace
        </button>
        <button class="button is-primary mr-2 mb-2 is-small-caps soft-if-dark" @click="launch">
          Launch Workspace
        </button>
      </div>
    </div>

    <RemoveWorkspaceModal :show="showRemove" :target="subtitle" @close="showRemove = false" @remove="remove"/>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as utils from '@/utils';
import RemoveWorkspaceModal from '@/components/home/RemoveWorkspaceModal.vue';

const showRemove = ref(false);

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['open', 'remove']);

const avatar = ref<string>(utils.makeAvatar(props.name ?? 'wksp', 'shapes'));

function launch() {
  emit('open');

  // Take this chance to request persistent storage
  navigator.storage?.persist?.().then((persisted) => {
    console.log(`Storage persistance state: ${persisted}`);
  });
}

function remove() {
  emit('remove');
}
</script>

<style scoped lang="scss">
.card,
.card-content,
.media-content {
  overflow: hidden;
  box-shadow: none;
}

.media img {
  border-radius: 4px;
}
</style>
