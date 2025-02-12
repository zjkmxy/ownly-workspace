<template>
  <div class="modal is-active anim-fade">
    <div class="modal-background"></div>
    <div class="modal-content">
      <Spinner class="fixed-center" v-if="loading" />

      <div class="box">
        <div class="title is-5 mb-4">Create Workspace</div>

        <div class="field">
          <label class="label">Dashboard Label</label>
          <div class="control">
            <input class="input" type="text" placeholder="Marketing Team" v-model="opts.label" />
          </div>
          <p class="help">A human-readable title for the workspace on your dashboard</p>
        </div>

        <div class="field">
          <label class="label">NDN Name</label>
          <div class="control">
            <input
              class="input"
              type="text"
              placeholder="/org/division/team/workspace"
              v-model="opts.name"
            />
          </div>
          <p class="help">A unique NDN name identifier for the workspace, structured like a path</p>
        </div>

        <div class="field">
          <div class="control">
            <button class="button is-primary" @click="create">Create</button>
          </div>
        </div>
      </div>
    </div>

    <button
      class="modal-close is-large"
      aria-label="close"
      :disabled="loading"
      @click="emit('close')"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'vue-toast-notification'

import Spinner from '../Spinner.vue'

import storage from '@/services/storage'
import ndn from '@/services/ndn'

const emit = defineEmits(['close', 'create'])
const $toast = useToast()

const loading = ref(false)

const opts = ref({
  label: String(),
  name: String(),
})

async function create() {
  try {
    loading.value = true

    await ndn.api.createWorkspace(opts.value.name)

    await storage.db.workspaces.put({
      label: opts.value.label,
      name: opts.value.name,
      owner: true,
    })

    emit('create')
    emit('close')

    $toast.success('Workspace created')
  } catch (err) {
    console.error(err)
    $toast.error(`Error creating workspace: ${JSON.stringify(err)}`)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss"></style>
