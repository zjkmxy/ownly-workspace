<template>
  <ModalComponent :show="show" @close="emit('close')">
    <div class="title is-5 mb-4">Add Agent Card</div>

    <div class="field">
      <label class="label">Name *</label>
      <div class="control">
        <input
          autofocus
          class="input"
          type="text"
          placeholder="e.g. Code Assistant"
          v-model="form.name"
          @keyup.enter="create"
        />
        <p class="help">Human readable name for the agent</p>
      </div>
    </div>

    <div class="field">
      <label class="label">Description *</label>
      <div class="control">
        <textarea
          class="textarea"
          rows="3"
          placeholder="Brief description of what this agent does"
          v-model="form.description"
        ></textarea>
        <p class="help">Short description of the agent's capabilities</p>
      </div>
    </div>

    <div class="field">
      <label class="label">URL *</label>
      <div class="control">
        <input
          class="input"
          type="url"
          placeholder="http://localhost:3000/agent"
          v-model="form.url"
        />
        <p class="help">Base URL where the NDN agent is hosted (without trailing slash)</p>
      </div>
    </div>


    <div class="field has-text-right">
      <div class="control">
        <button class="button mr-2" @click="emit('close')">Cancel</button>
        <button class="button is-primary soft-if-dark" @click="create">Add Agent</button>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';


import ModalComponent from './ModalComponent.vue';

import { Workspace } from '@/services/workspace';
import { Toast } from '@/utils/toast';

import type { IAgentCard } from '@/services/types';

defineProps({
  show: {
    type: Boolean,
    required: true,
  },
});
const emit = defineEmits(['close']);
const router = useRouter();

const form = reactive({
  name: '',
  description: '',
  url: '',
  providerOrganization: '',
  providerUrl: '',
  version: '',
});

const customFields = ref<{ key: string; value: string }[]>([]);


async function create() {
  try {
    // Validate required fields
    if (!form.name.trim()) {
      Toast.error('Agent name is required');
      return;
    }
    if (!form.description.trim()) {
      Toast.error('Agent description is required');
      return;
    }
    if (!form.url.trim()) {
      Toast.error('Agent URL is required');
      return;
    }

    // Validate URL format
    try {
      new URL(form.url);
    } catch {
      Toast.error('Please enter a valid URL');
      return;
    }

    // Get workspace
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Build agent card
    const agentCard: IAgentCard = {
      name: form.name.trim(),
      description: form.description.trim(),
      url: form.url.trim().replace(/\/+$/, ''), // Remove trailing slashes
    };




    // Add custom fields
    for (const field of customFields.value) {
      if (field.key.trim() && field.value.trim()) {
        agentCard[field.key.trim()] = field.value.trim();
      }
    }

    // Save agent card to workspace using Y.js Array
    if (wksp.agent) {
      wksp.agent.addOrUpdateAgentCard(agentCard);
    }

    Toast.success(`Agent card "${form.name}" added successfully`);
    emit('close');
    resetForm();
  } catch (err) {
    console.error(err);
    Toast.error(`${err}`);
  }
}


function resetForm() {
  form.name = '';
  form.description = '';
  form.url = '';
  form.providerOrganization = '';
  form.providerUrl = '';
  form.version = '';
  customFields.value = [];
}
</script>
