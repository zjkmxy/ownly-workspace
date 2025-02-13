<template>
  <div class="modal is-active anim-fade">
    <div class="modal-background"></div>
    <div class="modal-content">
      <div class="box">
        <div class="title is-5 mb-4">Create a channel</div>

        <div class="field">
          <label class="label">Name</label>
          <div class="control has-icons-left">
            <input
              class="input"
              type="text"
              placeholder="e.g. project-updates"
              v-model="name"
              @keyup.enter="create"
            />
            <span class="icon is-small is-left">
              <FontAwesomeIcon :icon="fas.faHashtag" />
            </span>
            <p class="help">
              Channels are intended to separate discussions by topic or team. Use a short,
              descriptive name that is easy to understand and remember.
            </p>
          </div>
        </div>

        <div class="field has-text-right">
          <div class="control">
            <button class="button is-primary soft-if-dark" @click="create">Create</button>
          </div>
        </div>
      </div>
    </div>

    <button class="modal-close is-large" aria-label="close" @click="emit('close')"></button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'vue-toast-notification'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

import * as workspace from '@/services/workspace'

const emit = defineEmits(['close'])
const $toast = useToast()

const name = ref(String())

async function create() {
  try {
    // 1-40 characters
    if (name.value.length < 1 || name.value.length > 40) {
      $toast.error('Channel name must be between 1 and 40 characters')
      return
    }

    // Validate characters are only alphanumeric, hyphen, and underscore
    if (!/^[a-zA-Z0-9_-]+$/.test(name.value)) {
      $toast.error('Channel name can only contain letters, numbers, hyphens, and underscores')
      return
    }

    // Get workspace
    const wksp = await workspace.setupOrRedir()
    if (!wksp) return

    // Check if channel already exists
    const channels = await wksp.getChatChannels()
    if (channels.some((c) => c.name === name.value)) {
      $toast.error('Channel with this name already exists')
      return
    }

    // Create channel
    await wksp.createChatChannel({
      id: Math.random() * 1e16,
      name: name.value,
    })

    $toast.success(`Channel #${name.value} created`)
    emit('close')
  } catch (err) {
    console.error(err)
    $toast.error(`Error creating channel: ${JSON.stringify(err)}`)
  }
}
</script>

<style scoped lang="scss"></style>
