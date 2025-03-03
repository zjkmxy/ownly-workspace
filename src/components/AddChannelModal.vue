<template>
  <ModalComponent :show="show" @close="emit('close')">
    <div class="title is-5 mb-4">Create a channel</div>

    <div class="field">
      <label class="label">Name</label>
      <div class="control has-icons-left">
        <input
          autofocus
          class="input"
          type="text"
          placeholder="e.g. project-updates"
          v-model="name"
          @keyup.enter="create"
        />
        <span class="icon is-small is-left">
          <FontAwesomeIcon :icon="faHashtag" />
        </span>
        <p class="help">
          Channels are intended to separate discussions by topic or team. Use a short, descriptive
          name that is easy to understand and remember.
        </p>
      </div>
    </div>

    <div class="field has-text-right">
      <div class="control">
        <button class="button mr-2" @click="emit('close')">Cancel</button>
        <button class="button is-primary soft-if-dark" @click="create">Create</button>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faHashtag } from '@fortawesome/free-solid-svg-icons';

import ModalComponent from './ModalComponent.vue';

import { Workspace } from '@/services/workspace';
import { Toast } from '@/utils/toast';

defineProps({
  show: {
    type: Boolean,
    required: true,
  },
});
const emit = defineEmits(['close']);
const router = useRouter();

const name = ref(String());

async function create() {
  try {
    // 1-40 characters
    if (name.value.length < 1 || name.value.length > 40) {
      Toast.error('Channel name must be between 1 and 40 characters');
      return;
    }

    // Validate characters are only alphanumeric, hyphen, and underscore
    if (!/^[a-zA-Z0-9_-]+$/.test(name.value)) {
      Toast.error('Channel name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    // Get workspace
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Check if channel already exists
    const channels = await wksp.chat.getChannels();
    if (channels.some((c) => c.name === name.value)) {
      Toast.error('Channel with this name already exists');
      return;
    }

    // Create channel
    await wksp.chat.newChannel({
      uuid: String(), // auto
      name: name.value,
    });

    Toast.success(`Channel #${name.value} created`);
    emit('close');
    name.value = String();
  } catch (err) {
    console.error(err);
    Toast.error(`Error creating channel: ${err}`);
  }
}
</script>
