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

          <ProjectTreeAddButton
            class="link-button"
            @new-file="startNew"
            @delete="executeDelete(entry.name)"
          />
        </component>

        <project-tree
          v-if="entry.children?.length && isFolderOpen(entry)"
          :files="[]"
          :rtree="entry.children"
          :path="`${path}${entry.name}/`"
        />
      </li>
    </template>

    <div class="field" v-if="showNew">
      <div class="control">
        <input
          ref="newInput"
          class="input"
          type="text"
          placeholder="..."
          v-model="newName"
          @keyup.enter="executeNew"
        />
        <div class="buttons">
          <button class="button is-small" @click="showNew = false">
            <FontAwesomeIcon :icon="fas.faTimes" size="sm" />
          </button>
          <button class="button is-small" @click="executeNew">
            <FontAwesomeIcon :icon="fas.faCheck" size="sm" />
          </button>
        </div>
      </div>
    </div>
  </ul>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, type PropType } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toast-notification';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import ProjectTreeAddButton from './ProjectTreeAddButton.vue';

import { Workspace } from '@/services/workspace';

import type { IProjectFile } from '@/services/types';

type TreeEntry = {
  name: string;
  children?: TreeEntry[];
  is_folder?: boolean;
};

const props = defineProps({
  files: {
    type: Array as PropType<IProjectFile[]>,
    required: true,
  },
  rtree: {
    type: Array as PropType<TreeEntry[]>,
    required: false,
  },
  path: {
    type: String,
    required: false,
    default: '/',
  },
});

const toast = useToast();
const route = useRoute();

const newInput = ref<HTMLInputElement | null>(null);
const showNew = ref(false);
const newName = ref(String());
defineExpose({ newFile });

/**
 * Tree computes the tree structure from the flat files list.
 * If this component is recursive, then rtree should be passed and is used instead.
 */
const tree = computed<TreeEntry[]>(() => {
  if (props.rtree) return props.rtree;

  // Computed tree structure
  const tree: TreeEntry[] = [];

  // DFS to fill the tree for the given path
  const fillPrefix = (path: string) => {
    const parts = path.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      const existing = current.find((e) => e.name === part);
      if (existing) {
        current = existing.children!;
      } else {
        const newEntry: TreeEntry = {
          name: part,
          is_folder: i !== parts.length - 1,
          children: [],
        };
        current.push(newEntry);
        current = newEntry.children!;
      }
    }
  };

  // Fill the tree for all files
  for (const file of props.files) {
    fillPrefix(file.path);
  }

  // Sort the tree by folder -> name
  const sortTree = (tree: TreeEntry[]) => {
    tree.sort((a, b) => {
      if (a.is_folder && !b.is_folder) return -1;
      if (!a.is_folder && b.is_folder) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });
    for (const entry of tree) {
      if (entry.children) sortTree(entry.children);
    }
  };
  sortTree(tree);

  return tree;
});

/** Choose an icon for a given entry */
function chooseIcon(entry: TreeEntry) {
  if (entry.is_folder) {
    return foldersOpen.value[entry.name] ? fas.faFolderOpen : fas.faFolder;
  }
  return fas.faFile;
}

/** Map of open folders for O(1) lookup */
const foldersOpen = ref<Record<string, boolean>>({});

/** Check if folder is open (show contents inside) */
function isFolderOpen(entry: TreeEntry) {
  return entry.is_folder && foldersOpen.value[entry.name];
}

/** Mark folder as open */
function openFolder(entry: TreeEntry) {
  if (entry.is_folder) {
    foldersOpen.value[entry.name] = !foldersOpen.value[entry.name];
  }
}

function newFile(folder: string) {
  startNew();
}

async function startNew() {
  showNew.value = true;
  newName.value = String();
  await nextTick();
  newInput.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  newInput.value?.focus();
}

async function getProject() {
  const wksp = await Workspace.setupOrRedir();
  if (!wksp) throw new Error('Workspace not found');

  const proj = await wksp.proj.get(route.params.project as string);
  if (!proj) throw new Error('Project not found');
  return proj;
}

async function executeNew() {
  if (newName.value.length < 1 || newName.value.length > 40) {
    toast.error('File and folder name must be between 1 and 40 characters');
    return;
  }

  if (newName.value.includes('/')) {
    toast.error('File and folder name cannot contain slashes');
    return;
  }

  try {
    const proj = await getProject();
    const path = `${props.path}${newName.value}`; //TODO: add / to end if folder
    await proj.newFile({ path });
  } catch (err) {
    console.error(err);
    toast.error(`Error creating ${newName.value}: ${err}`);
    return;
  }

  toast.success(`Created ${newName.value}`);

  showNew.value = false;
}

async function executeDelete(name: string) {
  const path = `${props.path}${name}`;
  // TODO: confirmation prompt

  try {
    const proj = await getProject();
    await proj.deleteFile({ path });
  } catch (err) {
    console.error(err);
    toast.error(`Error deleting ${name}: ${err}`);
    return;
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
    position: relative;

    .buttons {
      position: absolute;
      right: 0;
      top: 0;
      gap: 2px;

      button {
        padding: 0;
        width: 20px;
        background-color: transparent;
        box-shadow: none;
      }
    }
  }

  .one-entry > .link-button {
    display: none;
  }
  .one-entry:hover > .link-button {
    display: inline-block;
  }
}
</style>
