<template>
  <div class="modal is-active anim-fade">
    <div class="modal-background"></div>
    <div class="modal-content">
      <div class="box">
        <div class="title is-5 mb-4">Create Workspace</div>

        <div class="field">
          <label class="label">Dashboard Label</label>
          <div class="control">
            <input class="input" type="text" placeholder="Marketing Team" />
          </div>
          <p class="help">A human-readable title for the workspace on your dashboard</p>
        </div>

        <div class="field">
          <label class="label">NDN Name</label>
          <div class="control">
            <input class="input" type="text" placeholder="/org/division/team/workspace" />
          </div>
          <p class="help">A unique NDN name identifier for the workspace, structured like a path</p>
        </div>

        <div class="field">
          <div class="control">
            <button class="button is-primary">Create</button>
          </div>
        </div>
      </div>
    </div>

    <button class="modal-close is-large" aria-label="close" @click="$emit('close')"></button>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss"></style>
