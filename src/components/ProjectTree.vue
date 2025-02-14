<template>
  <ul class="menu-list project-inner">
    <template v-for="entry of tree" :key="entry.name">
      <li>
        <component
          :is="entry.is_folder ? 'a' : 'router-link'"
          :to="entry.is_folder ? null : '/'"
          @click="openFolder(entry)"
          class="one-entry"
        >
          <div class="link-inner">
            <FontAwesomeIcon class="mr-1" :icon="chooseIcon(entry)" size="sm" />
            {{ entry.name }}
          </div>

          <ProjectTreeAddButton class="link-button" />
        </component>

        <project-tree
          v-if="entry.children && isFolderOpen(entry)"
          :project="project"
          :ptree="entry.children"
        />
      </li>
    </template>
  </ul>
</template>

<script setup lang="ts">
import { computed, ref, type PropType } from 'vue';
import { useRoute } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import ProjectTreeAddButton from './ProjectTreeAddButton.vue';

import type { IProject } from '@/services/types';

type TreeEntry = {
  name: string;
  children?: TreeEntry[];
  is_folder?: boolean;
};

const route = useRoute();

const props = defineProps({
  project: {
    type: Object as PropType<IProject>,
    required: true,
  },
  ptree: {
    type: Array as PropType<TreeEntry[]>,
    required: false,
  },
});

// List of open folders
const foldersOpen = ref<Record<string, boolean>>({});

const tree = computed<TreeEntry[]>(() => {
  if (props.ptree) {
    return props.ptree;
  }

  return [
    {
      name: 'Project Status',
      is_folder: true,
      children: [
        {
          name: 'Vendor Documents',
          is_folder: true,
          children: [
            {
              name: 'stylesheet.tex',
            },
            {
              name: 'nxp_imx8_radio_sensitivity.pdf',
            },
          ],
        },
        {
          name: 'passwords.txt',
        },
      ],
    },
  ];
});

function chooseIcon(entry: TreeEntry) {
  if (entry.is_folder) {
    return foldersOpen.value[entry.name] ? fas.faFolderOpen : fas.faFolder;
  }
  return fas.faFile;
}

function isFolderOpen(entry: TreeEntry) {
  return entry.is_folder && foldersOpen.value[entry.name];
}

function openFolder(entry: TreeEntry) {
  if (entry.is_folder) {
    foldersOpen.value[entry.name] = !foldersOpen.value[entry.name];
  }
}
</script>

<style lang="scss" scoped>
@use '@/components/navbar-item.scss';

.project-inner {
  padding-inline-start: 4px !important;
  &:not(.outermost) {
    margin: 0 0 0 6px !important;
  }
  &.outermost {
    margin: 6px 4px !important;
  }

  li > a,
  .field input {
    height: 1.8em;
    font-size: 0.85em;
    padding: 0.4em 0.5em;
    line-height: 1em;
  }

  .field {
    margin-bottom: 3px;
  }

  .one-entry > .link-button {
    display: none;
  }
  .one-entry:hover > .link-button {
    display: inline-block;
  }
}
</style>
