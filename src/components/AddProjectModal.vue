<template>
  <div class="modal is-active anim-fade">
    <div class="modal-background"></div>
    <div class="modal-content">
      <div class="box">
        <div class="title is-5 mb-4">Create a project</div>

        <div class="field">
          <label class="label">Name</label>
          <div class="control has-icons-left">
            <input
              class="input"
              type="text"
              placeholder="e.g. vendor-documents"
              v-model="name"
              @keyup.enter="create"
            />
            <span class="icon is-small is-left">
              <FontAwesomeIcon :icon="fas.faLayerGroup" />
            </span>
            <p class="help">
              Projects separate files by purpose or team. Use a short, descriptive name that is easy
              to understand and remember.
            </p>
          </div>
        </div>

        <div class="field has-text-right">
          <div class="control">
            <button class="button is-light mr-2" @click="emit('close')">Cancel</button>
            <button class="button is-primary soft-if-dark" @click="create">Create</button>
          </div>
        </div>
      </div>
    </div>

    <button class="modal-close is-large" aria-label="close" @click="emit('close')"></button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'vue-toast-notification';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { Workspace } from '@/services/workspace';

const emit = defineEmits(['close']);
const $toast = useToast();

const name = ref(String());

async function create() {
  try {
    // 1-40 characters
    if (name.value.length < 1 || name.value.length > 40) {
      $toast.error('Project name must be between 1 and 40 characters');
      return;
    }

    // Validate characters are only alphanumeric, hyphen, and underscore
    if (!/^[a-zA-Z0-9_-]+$/.test(name.value)) {
      $toast.error('Project name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    // Get workspace
    const wksp = await Workspace.setupOrRedir();
    if (!wksp) return;

    // Check if project already exists
    const projs = await wksp.proj.getProjects();
    if (projs.some((c) => c.name === name.value)) {
      $toast.error('Project with this name already exists');
      return;
    }

    // Create channel
    await wksp.proj.newProject({
      id: Math.random() * 1e16,
      name: name.value,
    });

    $toast.success(`Project ${name.value} created`);
    emit('close');
  } catch (err) {
    console.error(err);
    $toast.error(`Error creating project: ${err}`);
  }
}
</script>

<style scoped lang="scss"></style>
