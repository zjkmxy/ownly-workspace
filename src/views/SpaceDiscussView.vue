<template>
  <div class="outer py-4">
    <DynamicScroller
      class="scroller"
      ref="scroller"
      :items="items"
      :min-item-size="15"
      key-field="uuid"
    >
      <template #before>
        <div class="title px-4 py-4">#Discussion</div>
      </template>

      <template #default="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :size-dependencies="[item.message]"
          :data-index="index"
          :data-active="active"
          class="chat-message"
        >
          <div
            :class="{
              'px-4': true,
              'pt-2': !skipHeader(item, index),
              'pb-1': true,
            }"
          >
            <div class="holder">
              <div class="avatar">
                <img
                  v-if="!skipHeader(item, index)"
                  :src="utils.makeAvatar(item.user)"
                  alt="avatar"
                />
              </div>

              <div class="message">
                <div class="header" v-if="!skipHeader(item, index)">
                  <span class="name">{{ item.user }}</span>
                  <span class="time">{{ formatTime(item) }}</span>
                </div>

                <div class="content">{{ item.message }}</div>
              </div>
            </div>
          </div>
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>

    <div class="chatbox mt-2 px-4">
      <textarea
        class="textarea"
        rows="2"
        placeholder="Send a message to start discussing!"
        v-model="outMessage"
        @keydown.enter="send"
      ></textarea>
      <button class="button mt-2 send" @click="send">
        <FontAwesomeIcon :icon="fas.faPaperPlane" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

import * as utils from '@/utils'
import * as workspace from '@/services/workspace'

import type { IChatMessage } from '@/services/types'

const scroller = ref<InstanceType<typeof DynamicScroller>>()
const wksp = ref(null as workspace.Workspace | null)
const outMessage = ref(String())
const items = ref([] as IChatMessage[])

onMounted(setup)
onUnmounted(() => {
  wksp.value?.events.removeListener('chat', onChatMessage)
})

/** Set up the workspace and chat */
async function setup() {
  wksp.value = await workspace.setupOrRedir()
  if (!wksp.value) return

  // Scroll to the end of the chat
  scroller.value.scrollToBottom()

  // Load the chat messages
  items.value = await wksp.value.getChatState()

  // Subscribe to chat messages
  wksp.value.events.addListener('chat', onChatMessage)
}

/** Skip the header if the user is the same and the message is within a minute */
function skipHeader(item: IChatMessage, index: number) {
  if (index === 0) return false
  const prev = items.value[index - 1]
  return prev.user === item.user && item.ts - prev.ts < 1000 * 60
}

/** Format the time of a chat message */
function formatTime(item: IChatMessage) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
  return formatter.format(new Date(item.ts))
}

/** Send a message to the workspace */
async function send(event: Event) {
  if (event instanceof KeyboardEvent) {
    if (event.shiftKey) return
    event.preventDefault()
  }
  if (!outMessage.value.trim()) return

  // Send the message to the workspace
  const message = {
    uuid: Math.random() * 1e16,
    user: wksp.value!.api.name,
    ts: Date.now(),
    message: outMessage.value,
  }
  await wksp.value?.sendChat(message)

  // Add the message to the chat and reset
  outMessage.value = ''
}

/** Trigger for receiving a chat message */
function onChatMessage(message: IChatMessage) {
  items.value.push(message)
  scroller.value.scrollToBottom()
}
</script>

<style scoped lang="scss">
.outer {
  display: flex;
  flex-direction: column;
  height: 100vh;

  .scroller {
    flex: 1;
    overflow-y: auto;
  }

  .textarea {
    resize: none;
    font-size: 0.9rem;
  }

  div.chatbox {
    position: relative;

    button.send {
      position: absolute;
      bottom: 6px;
      right: calc(16px + 6px);
      width: 32px;
      opacity: 0.5;
      &:hover {
        opacity: 1;
      }
    }
  }
}

.chat-message {
  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }

  .holder {
    display: flex;
    flex-direction: row;

    .avatar {
      min-width: 36px;
      max-height: 36px;
      object-fit: cover;
      border-radius: 5px;
      overflow: hidden;
      margin-right: 10px;
    }

    .message {
      flex: 1;
      display: flex;
      flex-direction: column;
      font-size: 14px;
      line-height: 1.5;

      .name {
        font-weight: bold;
      }

      .time {
        color: rgba(0, 0, 0, 0.5);
        font-size: 12px;
        margin-left: 7px;
      }

      .content {
        white-space: pre-wrap;
      }
    }
  }
}
</style>
