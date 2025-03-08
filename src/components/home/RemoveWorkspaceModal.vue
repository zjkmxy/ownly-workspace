<template>
    <ModalComponent :show="show" :loading="loading" :target="target" @close="close">
        <div class="title is-5 mb-4">Remove Workspace</div>
        <div class="field">
          <p>You are about to remove the workspace "{{ target }}" from your dashboard. Note that this is a local action and will not delete the workspace remotely.</p>
        </div>

        <div class="field has-text-right">
        <div class="control">
            <button class="button is-light mr-2" @click="close">Cancel</button>
            <button class="button is-warning" @click="remove">Remove</button>
        </div>
        </div>
    </ModalComponent>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import ModalComponent from '../ModalComponent.vue';

import stats from '@/services/stats';
import { Toast } from '@/utils/toast';

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'remove'): void;
}>();

const loading = ref(false);

async function remove() {
  try {
    loading.value = true;

    await stats.db.workspaces.delete(props.target);

    emit('remove');
    emit('close');

    Toast.success(`Removed workspace ${props.target} successfully!`);
  } catch (err) {
    console.error(err);
    Toast.error(`Error removing workspace ${props.target}: ${err}`);
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
