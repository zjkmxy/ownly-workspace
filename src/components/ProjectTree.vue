<template>
  <ul class="menu-list project-inner">
    <template v-for="entry of tree" :key="entry.name">
      <li>
        <component
          :is="entry.is_folder ? 'a' : 'router-link'"
          :to="entry.is_folder ? null : linkToFile(entry)"
          @click="openFolder(entry)"
          class="one-entry"
        >
          <div class="link-inner">
            <FontAwesomeIcon class="mr-1" :icon="chooseIcon(entry)" size="sm" />
            {{ entry.name }}
          </div>

          <ProjectTreeAddButton
            class="link-button"
            :allow-new="entry.is_folder"
            :allow-delete="true"
            @new-file="newInSub(entry, 'file', $event)"
            @new-folder="newInSub(entry, 'folder')"
            @delete="executeDelete(entry)"
          />
        </component>

        <project-tree
          ref="subtrees"
          v-if="isFolderOpen(entry)"
          :project="props.project"
          :files="[]"
          :rtree="entry.children ?? []"
          :path="`${path}${entry.name}/`"
          :parent="entry.name"
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
            <FontAwesomeIcon :icon="faTimes" size="sm" />
          </button>
          <button class="button is-small" @click="executeNew">
            <FontAwesomeIcon :icon="faCheck" size="sm" />
          </button>
        </div>
      </div>
    </div>
  </ul>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type PropType } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toast-notification';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faTimes,
  faCheck,
  faFolder,
  faFolderOpen,
  faFile,
  faFileCode,
  faFileWord,
  faFilePowerpoint,
  faFileExcel,
  faFilePdf,
  faFileImage,
} from '@fortawesome/free-solid-svg-icons';

import ProjectTreeAddButton from './ProjectTreeAddButton.vue';

import { Workspace } from '@/services/workspace';

import type { IProject, IProjectFile } from '@/services/types';

type TreeEntry = {
  name: string;
  children?: TreeEntry[];
  is_folder?: boolean;
};

const props = defineProps({
  project: {
    type: Object as PropType<IProject>,
    required: true,
  },
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
  parent: {
    type: String,
    required: false,
    default: '',
  },
});

const route = useRoute();
const toast = useToast();

const subtrees = ref<InstanceType<any>>();
const newInput = ref<HTMLInputElement | null>(null);

const showNew = ref(false);
const newName = ref(String());
const newType = ref<'file' | 'folder'>('file');
const newExtension = ref<string>();

defineExpose({ newInHere, parent: props.parent });
onMounted(checkRoute);
watch(() => route.params.filename, checkRoute);
const splitPath = computed(() => props.path.split('/').filter(Boolean));

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

// Watch if the route changes to a file that includes this node's child
// In that case make sure that the child folder is open
function checkRoute() {
  if (!route.params.filename) return;
  const parts = route.params.filename as string[];
  if (parts.length <= 1) return;

  // Check if the route is a child of this folder
  const myparts = splitPath.value;
  if (parts.length <= myparts.length) return;
  if (parts.slice(0, myparts.length).every((p, i) => p === myparts[i])) {
    // Check if the route is a direct child of this folder
    const folder = parts[myparts.length];
    const entry = tree.value.find((e) => e.name === folder);
    if (entry) openFolder(entry, true);
  }
}

/** Get router link to a file */
function linkToFile(entry: TreeEntry) {
  return {
    name: 'project-file',
    params: {
      project: props.project.name,
      filename: splitPath.value.concat(entry.name),
    },
  };
}

/** Choose an icon for a given entry */
function chooseIcon(entry: TreeEntry) {
  if (entry.is_folder) {
    return foldersOpen.value[entry.name] ? faFolderOpen : faFolder;
  }

  const extension = entry.name.split('.').pop()?.toLocaleLowerCase();
  switch (extension) {
    case 'md':
    case 'json':
    case 'tex':
    case 'bib':
    case 'sty':
    case 'cls':

    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'vue':
    case 'html':
    case 'css':
    case 'scss':
    case 'go':
    case 'py':
    case 'sh':
    case 'yaml':
    case 'yml':
    case 'toml':
      return faFileCode;
    case 'mdoc':
    case 'docx':
    case 'doc':
      return faFileWord;
    case 'pptx':
    case 'ppt':
      return faFilePowerpoint;
    case 'xlsx':
    case 'xls':
      return faFileExcel;
    case 'pdf':
      return faFilePdf;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'ico':
    case 'webp':
    case 'bmp':
    case 'tiff':
    case 'tif':
    case 'heic':
    case 'heif':
    case 'avif':
    case 'apng':
      return faFileImage;
    default:
      return faFile;
  }
}

/** Map of open folders for O(1) lookup */
const foldersOpen = ref<Record<string, boolean>>({});

/** Check if folder is open (show contents inside) */
function isFolderOpen(entry: TreeEntry) {
  return entry.is_folder && foldersOpen.value[entry.name];
}

/** Mark folder as open */
function openFolder(entry: TreeEntry, val?: boolean) {
  if (entry.is_folder) {
    foldersOpen.value[entry.name] = val !== undefined ? val : !foldersOpen.value[entry.name];
  }
}

/** Create a new file in a subfolder */
async function newInSub(subfolder: TreeEntry, type: 'file' | 'folder', extension?: string) {
  if (!subfolder.is_folder) return;
  openFolder(subfolder, true);
  await nextTick();

  const stree = subtrees.value?.find((t: any) => t?.parent === subfolder.name);
  stree?.newInHere(type, extension);
}

/** Create a new file in the current folder */
async function newInHere(type: 'file' | 'folder', extension?: string) {
  newType.value = type;
  newExtension.value = extension || String();
  showNew.value = true;
  newName.value = String();
  await nextTick();
  newInput.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  newInput.value?.focus();
}

/** Get the current project */
async function getProject() {
  const wksp = await Workspace.setupOrRedir();
  if (!wksp) throw new Error('Workspace not found');

  const proj = wksp.proj.getActive();
  if (!proj) throw new Error('Project not found');
  return proj;
}

/** Create a new file or folder */
async function executeNew() {
  if (newName.value.length < 1 || newName.value.length > 40) {
    toast.error('File and folder name must be between 1 and 40 characters');
    return;
  }

  if (newName.value.includes('/')) {
    toast.error('File and folder name cannot contain slashes');
    return;
  }

  let path = `${props.path}${newName.value}`;
  if (newType.value === 'folder') {
    path += '/';
  }

  if (newExtension.value && !path.endsWith(newExtension.value)) {
    path += `.${newExtension.value}`;
  }

  try {
    const proj = await getProject();
    await proj.newFile(path);
  } catch (err) {
    console.error(err);
    toast.error(`Error creating ${newName.value}: ${err}`);
    return;
  }

  toast.success(`Created ${newName.value}`);

  showNew.value = false;
}

/** Delete a file or folder */
async function executeDelete(entry: TreeEntry) {
  let path = `${props.path}${entry.name}`;
  if (entry.is_folder) path += '/';

  // TODO: confirmation prompt

  try {
    const proj = await getProject();
    await proj.deleteFile(path);
  } catch (err) {
    console.error(err);
    toast.error(`Error deleting ${path}: ${err}`);
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
    margin: 4px 4px !important;
  }

  li > a,
  .field input {
    height: 1.9em;
    font-size: 0.88em;
    padding: 0.4em 0.5em;
    line-height: 1.05em;
  }

  .field {
    position: relative;
    margin-top: 2px;

    input {
      border-radius: 3px;
      padding-right: 44px; // hack for buttons
    }

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
    // This is truly horrible, but it's the only way to reuse
    // the styles between navbar and project tree for the link
    // button with a bunch of !importants everywhere :'(
    transform: translateY(-0.2em);
  }
  .one-entry:hover > .link-button {
    display: inline-block;
  }
}
</style>
