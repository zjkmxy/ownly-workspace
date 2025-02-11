<template>
  <div class="wrapper">
    <Transition @after-leave="afterTransition">
      <div class="loading anim-fade has-text-white-bis has-text-centered" v-if="showLoading">
        <Spinner />
        {{ loadStatus }}
      </div>
    </Transition>

    <Transition @after-leave="afterTransition">
      <div class="box anim-rtl-fade p-4" v-if="showEmail">
        <div class="header is-size-4 has-text-weight-semibold">Get started</div>

        <div class="login mt-2">
          <div class="field">
            <label>First, you need an email address to verify your unique identity.</label>
            <div class="control has-icons-left has-icons-right mt-3">
              <input
                :class="{ input: true, 'is-danger': emailError }"
                type="email"
                placeholder="name@email.com"
                v-model="emailAddress"
                @keyup.enter="submitEmail"
              />
              <span class="icon is-small is-left">
                <FontAwesomeIcon :icon="fas.faEnvelope" />
              </span>

              <span class="icon is-small is-right" v-if="emailError">
                <FontAwesomeIcon :icon="fas.faExclamationTriangle" />
              </span>
            </div>
            <p v-if="emailError" class="help is-danger">{{ emailError }}</p>
          </div>

          <button class="button mt-3 is-primary is-fullwidth" @click="submitEmail">Continue</button>
        </div>
      </div>
    </Transition>

    <Transition @after-leave="afterTransition">
      <div class="box anim-rtl-fade p-4" v-if="showCode">
        <div class="header is-size-4 has-text-weight-semibold">Let's verify you</div>

        <div class="login mt-2">
          <div class="field">
            <label>
              We have sent a verification code to your email address. Enter the code below to
              continue.
            </label>
            <div class="control has-icons-left mt-3">
              <input
                :class="{ input: true, 'is-danger': codeError }"
                type="text"
                placeholder="123456"
                maxlength="6"
                minlength="6"
                v-model="codeInput"
                @keyup.enter="codeSubmit"
              />
              <span class="icon is-small is-left">
                <FontAwesomeIcon :icon="fas.faKey" />
              </span>
              <p v-if="codeError" class="help is-danger">{{ codeError }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Spinner from '@/components/Spinner.vue'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

import * as utils from '@/utils/email'
import ndn from '@/services/ndn'

const showLoading = ref(false)
const showEmail = ref(true)
const showCode = ref(false)
const afterTransition = ref(() => {})

const loadStatus = ref('')

const emailAddress = ref('varunpatil@ucla.edu')
const emailError = ref('')

const codeInput = ref('')
const codeError = ref('')
const codeSubmit = ref(() => {})

/** Validate email and move to step 2 */
function submitEmail() {
  if (!showEmail.value) return

  if (!emailAddress.value) {
    emailError.value = 'Email address is required'
    return
  }

  if (!utils.validateEmail(emailAddress.value)) {
    emailError.value = 'Invalid email address'
    return
  }

  afterTransition.value = startChallenge
  showEmail.value = false
}

async function startChallenge() {
  showLoading.value = true

  try {
    // Entrypoint - make sure service is loaded
    loadStatus.value = 'Setting up NDN service ...'
    await ndn.setup()

    // Connect to testbed
    loadStatus.value = 'Connecting to NDN testbed ...'
    await ndn.api.connectTestbed()

    // Start NDN challenge
    loadStatus.value = 'Starting NDNCERT challenge ...'
    await ndn.api.ndncertEmail(emailAddress.value, (status) => {
      codeError.value = ''
      codeInput.value = ''

      switch (status) {
        case 'need-code':
          break
        case 'wrong-code':
          codeError.value = 'Invalid verification code'
          break
        default:
          codeError.value = 'Verfication error: ' + status
          break
      }

      afterTransition.value = () => (showCode.value = true)
      showLoading.value = false

      return new Promise((resolve) => {
        codeSubmit.value = () => {
          if (codeInput.value.length !== 6) {
            codeError.value = 'Invalid verification code'
            return
          }

          afterTransition.value = () => {
            showLoading.value = true
            resolve(codeInput.value)
          }
          showCode.value = false
        }
      })
    })
  } catch (err) {
    alert('Failed to setup NDN service') // TODO
    console.error(err)
    showLoading.value = false
    afterTransition.value = () => (showEmail.value = true)
  }
}
</script>

<style scoped lang="scss">
.wrapper {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .wrapper {
    margin: auto;
    margin-right: 10vw;
    min-width: 350px;
  }
}
</style>
