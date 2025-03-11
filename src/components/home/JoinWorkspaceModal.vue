<template>
  <ModalComponent :show="show" :loading="loading" @close="close">
    <div class="title is-5 mb-4">Join Workspace</div>

    <div class="field">
      <label class="label">Dashboard Label</label>
      <div class="control">
        <input
          class="input"
          type="text"
          placeholder="Marketing Team"
          v-model="opts.label"
          autofocus
        />
      </div>
      <p class="help">A readable label for the workspace on your dashboard</p>
    </div>

    <div class="field">
      <label class="label">NDN Name</label>
      <div class="control">
        <input class="input" type="text" placeholder="/my/awesome/workspace" v-model="opts.name" />
      </div>
      <p class="help">The owner of the workspace should know this</p>
    </div>

    <div class="field has-text-right">
      <div class="control">
        <button class="button is-light mr-2" @click="close">Cancel</button>
        <button class="button is-primary" @click="join">Join</button>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import ModalComponent from '@/components/ModalComponent.vue';

import { Toast } from '@/utils/toast';
import { Workspace } from '@/services/workspace';

defineProps({
  show: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'join', name: string): void;
}>();

const loading = ref(false);

const opts = ref({
  label: String(),
  name: String(),
});

async function join() {
  try {
    loading.value = true;

    // Validate the inputs
    const label = opts.value.label.trim();
    const name = opts.value.name.trim();
    if (!label || !name) {
      throw new Error('Please fill in all the fields');
    }

    // Join the workspace without attempting create
    const finalName = await Workspace.join(label, name, false);

    emit('join', finalName);
    emit('close');

    Toast.success('Joined workspace successfully!');
  } catch (err) {
    console.error(err);
    Toast.error(`${err}`);
  } finally {
    loading.value = false;
  }
}

function close() {
  loading.value = false;
  emit('close');
}
</script>

<style scoped lang="scss"></style>
