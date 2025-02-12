<template>
  <section class="hero">
    <div class="hero-body pb-1">
      <p class="title">Dashboard</p>
      <p class="subtitle mt-2">You can create or join one or more workspaces below</p>
    </div>
  </section>

  <div class="spacelist">
    <Workspace
      v-for="ws in workspaces"
      :key="ws.name"
      :name="ws.label"
      :subtitle="ws.name"
      @click="open(ws)"
    />

    <div class="workspace card">
      <div class="card-content">
        <div class="content">
          <button class="button is-fullwidth mb-2" @click="showCreate = true">Create New</button>
          <button class="button is-primary is-fullwidth">Join Workspace</button>
        </div>
      </div>
    </div>
  </div>

  <Transition>
    <CreateWorkspaceModal v-if="showCreate" @create="refreshList" @close="showCreate = false" />
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import CreateWorkspaceModal from '@/components/home/CreateWorkspaceModal.vue'
import Workspace from '@/components/home/Workspace.vue'

import router from '@/router'
import storage from '@/services/storage'
import * as utils from '@/utils/index'

import type * as types from '@/services/types'

const showCreate = ref(false)
const workspaces = ref([] as types.IWorkspace[])

async function refreshList() {
  workspaces.value = await storage.db.workspaces.toArray()
}
refreshList()

function open(ws: types.IWorkspace) {
  router.push({
    name: 'space',
    params: {
      space: utils.escapeUrlName(ws.name),
    },
  })
}
</script>

<style scoped lang="scss">
.spacelist {
  margin: 40px;
}
.workspace {
  display: inline-block;
  width: 100%;
  vertical-align: top;
}

@media (min-width: 600px) {
  .workspace {
    width: 250px;
    margin-right: 20px;
  }
}
</style>
