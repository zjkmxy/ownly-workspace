<template>
  <div class="agent-browser">
    <div class="header">
      <div class="title is-5">
        <FontAwesomeIcon :icon="faRobot" class="mr-2" />
        Agent Cards
      </div>
      <div class="header-controls">
        <button class="button is-small mr-3" @click="loadAgentCards" title="Refresh">
          <FontAwesomeIcon :icon="faRefresh" />
        </button>
        <button class="button is-primary is-small" @click="showAddModal = true">
          <FontAwesomeIcon :icon="faPlus" class="mr-1" />
          Add Agent
        </button>
      </div>
    </div>

    <div class="tabs">
      <ul>
        <li :class="{ 'is-active': activeTab === 'workspace' }">
          <a @click="activeTab = 'workspace'">Workspace Agents</a>
        </li>
        <li :class="{ 'is-active': activeTab === 'discover' }">
          <a @click="activeTab = 'discover'">Discover</a>
        </li>
      </ul>
    </div>

    <div class="tab-content">
      <!-- Workspace Agents Tab -->
      <div v-if="activeTab === 'workspace'" class="workspace-agents">
        <div v-if="loading" class="has-text-centered py-4">
          <LoadingSpinner text="Loading agent cards..." />
        </div>

        <div v-else-if="agentCards.length === 0" class="empty-state">
          <div class="has-text-centered py-6">
            <FontAwesomeIcon :icon="faRobot" size="3x" class="has-text-grey-light mb-3" />
            <p class="has-text-grey">No agent cards found in this workspace.</p>
            <p class="has-text-grey-light">Add some agents to get started!</p>
          </div>
        </div>

        <div v-else class="agent-grid">
          <div v-for="agent in agentCards" :key="agent.name" class="agent-card">
            <div class="card">
              <div class="card-content">
                <div class="media">
                  <div class="media-left">
                    <figure class="image is-48x48">
                      <div class="agent-avatar">
                        <FontAwesomeIcon :icon="faRobot" size="lg" />
                      </div>
                    </figure>
                  </div>
                  <div class="media-content">
                    <p class="title is-6">{{ agent.name }}</p>
                    <p class="subtitle is-7 has-text-grey">
                      {{ agent.provider?.organization || 'Unknown Provider' }}
                    </p>
                  </div>
                </div>

                <div class="content">
                  <p class="description">{{ agent.description }}</p>
                  <div class="agent-details">
                    <span class="tag is-light is-small">
                      <FontAwesomeIcon :icon="faLink" class="mr-1" />
                      {{ getHostname(agent.url) }}
                    </span>
                    <span v-if="agent.version" class="tag is-light is-small ml-1">
                      v{{ agent.version }}
                    </span>
                  </div>
                </div>
              </div>
              <footer class="card-footer">
                <a class="card-footer-item" @click="inviteToChannel(agent)">
                  <FontAwesomeIcon :icon="faPlus" class="mr-1" />
                  Invite to Channel
                </a>
                <a class="card-footer-item has-text-danger" @click="removeAgent(agent)">
                  <FontAwesomeIcon :icon="faTrash" class="mr-1" />
                  Remove
                </a>
              </footer>
            </div>
          </div>
        </div>
      </div>

      <!-- Discover Tab -->
      <div v-if="activeTab === 'discover'" class="discover-agents">
        <div class="field has-addons">
          <div class="control is-expanded">
            <input
              class="input"
              type="url"
              v-model="discoverUrl"
              placeholder="Enter agent URL to discover (e.g. https://example.com)"
              @keyup.enter="discoverAgent"
            />
          </div>
          <div class="control">
            <button
              class="button is-primary"
              @click="discoverAgent"
              :class="{ 'is-loading': discovering }"
              :disabled="!discoverUrl.trim()"
            >
              <FontAwesomeIcon :icon="faSearch" class="mr-1" />
              Discover
            </button>
          </div>
        </div>

        <div v-if="discoveredAgent" class="discovered-agent mt-4">
          <div class="notification is-info">
            <button class="delete" @click="discoveredAgent = null"></button>
            <div class="media">
              <div class="media-left">
                <figure class="image is-48x48">
                  <div class="agent-avatar">
                    <FontAwesomeIcon :icon="faRobot" size="lg" />
                  </div>
                </figure>
              </div>
              <div class="media-content">
                <p class="title is-6">{{ discoveredAgent.name }}</p>
                <p class="subtitle is-7">{{ discoveredAgent.description }}</p>
                <div class="buttons mt-3">
                  <button class="button is-primary is-small" @click="addDiscoveredAgent">
                    <FontAwesomeIcon :icon="faPlus" class="mr-1" />
                    Add to Workspace
                  </button>
                  <button class="button is-small" @click="inviteToChannel(discoveredAgent)">
                    <FontAwesomeIcon :icon="faComments" class="mr-1" />
                    Invite to Channel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="help-section mt-4">
          <h6 class="title is-6">How to discover agents:</h6>
          <ul>
            <li>Enter the base URL of an agent server</li>
            <li>The system will look for <code>/.well-known/agent.json</code></li>
            <li>Compatible agents will be automatically detected</li>
          </ul>

          <div class="notification is-warning mt-3">
            <strong>CORS Issues?</strong> If you get a "Failed to fetch" error, the agent server doesn't allow cross-origin requests.
            You can:
            <ol class="mt-2">
              <li>Ask the agent provider to add CORS headers</li>
              <li>Use the "Add Agent" tab to manually create the agent card</li>
              <li>Copy the agent.json content from your browser and paste the details manually</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Agent Modal -->
    <AddAgentModal
      :show="showAddModal"
      @close="showAddModal = false"
    />

    <!-- Invite to Channel Modal -->
    <ModalComponent :show="showChannelModal" @close="showChannelModal = false">
      <div class="title is-5 mb-4">Invite Agent to Channel</div>

      <div class="field">
        <label class="label">Select Channel</label>
        <div class="control">
          <div class="select is-fullwidth">
            <select v-model="selectedChannelName">
              <option value="">Choose a channel...</option>
              <option v-for="channel in availableChannels" :key="channel.name" :value="channel.name">
                #{{ channel.name }}
              </option>
            </select>
          </div>
          <p class="help">Select an existing chat channel to invite the agent to</p>
        </div>
      </div>

      <div class="field has-text-right">
        <div class="control">
          <button class="button mr-2" @click="showChannelModal = false">Cancel</button>
          <button class="button is-primary soft-if-dark" @click="inviteAgentToSelectedChannel" :disabled="!selectedChannelName">
            Send Invitation
          </button>
        </div>
      </div>
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faRobot,
  faPlus,
  faLink,
  faTrash,
  faSearch,
  faComments,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';

import LoadingSpinner from './LoadingSpinner.vue';
import AddAgentModal from './AddAgentModal.vue';
import ModalComponent from './ModalComponent.vue';

import { Workspace } from '@/services/workspace';
import { Toast } from '@/utils/toast';

import type { IAgentCard } from '@/services/types';

const router = useRouter();

// Component state
const activeTab = ref<'workspace' | 'discover'>('workspace');
const loading = ref(true);
const agentCards = ref<IAgentCard[]>([]);
const showAddModal = ref(false);
const showChannelModal = ref(false);
const selectedAgent = ref<IAgentCard | null>(null);
const selectedChannelName = ref('');
const availableChannels = ref<{name: string}[]>([]);

// Discover tab state
const discoverUrl = ref('');
const discovering = ref(false);
const discoveredAgent = ref<IAgentCard | null>(null);


onMounted(async () => {
  await loadAgentCards();
});

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// async function repairAgentFile(proj: any, existingMeta: any) {
//   // Delete the corrupted file entry
//   await proj.deleteFile('.well-known/agent.json');

//   // Create an empty agent.json file with proper structure
//   const emptyAgentJson = JSON.stringify([], null, 2);
//   const stream = new ReadableStream<Uint8Array>({
//     start(controller) {
//       controller.enqueue(new TextEncoder().encode(emptyAgentJson));
//       controller.close();
//     }
//   });

//   // Import the file properly
//   await proj.importFile('.well-known/agent.json', stream);
//   console.log('Agent file repaired with empty structure');
// }

async function loadAgentCards() {
  try {
    loading.value = true;
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Load agent cards from WorkspaceAgentManager Y.js Array
    if (wksp.agent) {
      agentCards.value = wksp.agent.getAgentCards();
    }
    console.log('Loaded agent cards from Y.js Array:', agentCards.value);
  } catch (error) {
    console.error('Failed to load agent cards:', error);
    Toast.error('Failed to load agent cards');
    agentCards.value = [];
  } finally {
    loading.value = false;
  }
}

async function discoverAgent() {
  if (!discoverUrl.value.trim()) return;

  try {
    discovering.value = true;
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;
    if (wksp.agent) {
      discoveredAgent.value = await wksp.agent.discoverAgent(discoverUrl.value.trim());
      if (discoveredAgent.value) {
        Toast.success(`Discovered agent: ${discoveredAgent.value.name}`);
      }
    }

  } catch (error) {
    console.error('Discovery failed:', error);
    Toast.error(`Failed to discover agent: ${error}`);
    discoveredAgent.value = null;
  } finally {
    discovering.value = false;
  }
}

async function addDiscoveredAgent() {
  if (!discoveredAgent.value) return;

  try {
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Add agent card to workspace using Y.js Array
    if (wksp.agent) {
      wksp.agent.addOrUpdateAgentCard(discoveredAgent.value);
    }

    // Reload the list
    await loadAgentCards();

    Toast.success(`Added agent "${discoveredAgent.value.name}" to workspace`);
    discoveredAgent.value = null;
    discoverUrl.value = '';
    activeTab.value = 'workspace';
  } catch (error) {
    console.error('Failed to add agent:', error);
    Toast.error(`Failed to add agent: ${error}`);
  }
}

async function inviteToChannel(agent: IAgentCard) {
  selectedAgent.value = agent;
  selectedChannelName.value = '';

  try {
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Load available chat channels
    availableChannels.value = await wksp.chat.getChannels();
    showChannelModal.value = true;
  } catch (error) {
    console.error('Failed to load channels:', error);
    Toast.error('Failed to load channels');
  }
}

async function inviteAgentToSelectedChannel() {
  if (!selectedAgent.value || !selectedChannelName.value) return;

  try {
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Use the new invitation system instead of creating separate agent channels
    if (wksp.agent) {
      await wksp.agent.inviteAgentToChannel(selectedAgent.value, selectedChannelName.value);
    }

    Toast.success(`Invited ${selectedAgent.value.name} to #${selectedChannelName.value}`);
    showChannelModal.value = false;
    selectedChannelName.value = '';
    selectedAgent.value = null;
  } catch (error) {
    console.error('Failed to invite agent:', error);
    Toast.error(`Failed to invite agent: ${error}`);
  }
}



async function removeAgent(agent: IAgentCard) {
  if (!confirm(`Are you sure you want to remove "${agent.name}" from this workspace?`)) {
    return;
  }

  try {
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Remove agent card from workspace using Y.js Array
    if (wksp.agent) {
      const removed = wksp.agent.removeAgentCard(agent.url);

      if (removed) {
        // Reload the list
        await loadAgentCards();
        Toast.success(`Removed agent "${agent.name}"`);
      }
      else {
        Toast.error(`Agent "${agent.name}" not found`);
      }
    }
  } catch (error) {
    console.error('Failed to remove agent:', error);
    Toast.error(`Failed to remove agent: ${error}`);
  }
}
</script>

<style scoped lang="scss">
.agent-browser {
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    .header-controls {
      display: flex;
      align-items: center;
    }
  }

  .tab-content {
    margin-top: 1rem;
  }

  .agent-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .agent-card {
    .card {
      height: 100%;
      display: flex;
      flex-direction: column;

      .card-content {
        flex: 1;
      }

      .description {
        font-size: 0.875rem;
        line-height: 1.4;
        margin-bottom: 0.75rem;
      }

      .agent-details {
        margin-top: 0.5rem;
      }
    }
  }

  .agent-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .empty-state {
    .fa-robot {
      opacity: 0.3;
    }
  }

  .help-section {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 6px;
    border-left: 4px solid #3273dc;

    ul {
      margin-left: 1rem;

      li {
        margin-bottom: 0.25rem;
      }
    }

    code {
      background: #e8e8e8;
      padding: 0.125rem 0.25rem;
      border-radius: 3px;
      font-size: 0.875rem;
    }
  }

  .discovered-agent {
    .agent-avatar {
      background: linear-gradient(135deg, #48c78e 0%, #06d6a0 100%);
    }
  }
}
</style>
