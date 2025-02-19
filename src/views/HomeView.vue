<template>
  <div class="outer has-background-primary soft-if-dark">
    <div class="inner">
      <section class="hero">
        <div class="hero-body pb-1">
          <p class="title">Dashboard</p>
          <p class="subtitle mt-2">You can create or join one or more workspaces below</p>
        </div>
      </section>

      <div class="spacelist">
        <WorkspaceCard
          v-for="ws in workspaces"
          :key="ws.name"
          :name="ws.label"
          :subtitle="ws.name"
          @open="open(ws)"
        />

        <div class="workspace card">
          <div class="card-content">
            <div class="block">
              <div class="media-content">
                <p class="subtitle is-5">Don't see what you are looking for?</p>
              </div>
            </div>

            <div class="content has-text-right">
              <button class="button mr-2 mb-2 is-small-caps" @click="showCreate = true">
                Create a new workspace
              </button>
              <button class="button mr-2 is-primary is-small-caps soft-if-dark">
                Join a workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="fade-2">
      <CreateWorkspaceModal v-if="showCreate" @create="refreshList" @close="showCreate = false" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import CreateWorkspaceModal from '@/components/home/CreateWorkspaceModal.vue';
import WorkspaceCard from '@/components/home/WorkspaceCard.vue';

import storage from '@/services/storage';
import * as utils from '@/utils/index';

import type * as types from '@/services/types';

const router = useRouter();

const showCreate = ref(false);
const workspaces = ref([] as types.IWorkspace[]);

async function refreshList() {
  workspaces.value = await storage.db.workspaces.toArray();
}
refreshList();

function open(ws: types.IWorkspace) {
  router.push({
    name: 'space-home',
    params: {
      space: utils.escapeUrlName(ws.name),
    },
  });
}
</script>

<style scoped lang="scss">
.outer {
  height: 100%;
  width: auto;
  overflow-y: auto;

  .inner {
    max-width: 900px;
    margin: 0 auto;
  }

  .spacelist {
    margin: 40px;
  }
}
</style>
