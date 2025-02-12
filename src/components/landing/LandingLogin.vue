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
                @keyup.enter="emailSubmit"
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

          <button class="button mt-3 is-primary is-fullwidth" @click="emailSubmit">Continue</button>
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
                @keyup="codeSubmit"
              />
              <span class="icon is-small is-left">
                <FontAwesomeIcon :icon="fas.faKey" />
              </span>
              <p v-if="codeError" class="help is-danger">{{ codeError }}</p>
            </div>

            <a class="is-size-7 mt-3 ml-1 has-text-primary" @click="codeCancel">
              Go back to the previous step
            </a>
          </div>
        </div>
      </div>
    </Transition>

    <Transition @after-leave="afterTransition">
      <div class="anim-rtl-fade p-4 has-text-centered" v-if="showSuccess">
        <FontAwesomeIcon class="success" :icon="fas.faCircleCheck" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'vue-toast-notification'

import Spinner from '@/components/Spinner.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

import * as utils from '@/utils/index'
import ndn from '@/services/ndn'

const emit = defineEmits(['login'])
const $toast = useToast()

const showLoading = ref(true)
const showEmail = ref(false)
const showCode = ref(false)
const showSuccess = ref(false)
const afterTransition = ref(() => {})

const loadStatus = ref('')

const emailAddress = ref('varunpatil@ucla.edu')
const emailError = ref('')

const codeInput = ref('')
const codeError = ref('')
const codeSubmit = ref(() => {})

/** Validate email and move to step 2 */
function emailSubmit() {
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

/** Cancel code verification and go back to email step */
function codeCancel() {
  afterTransition.value = () => (showEmail.value = true)
  showCode.value = false
}

async function startChallenge() {
  showLoading.value = true

  try {
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
          if (codeInput.value.length !== 6) return

          afterTransition.value = () => {
            showLoading.value = true
            loadStatus.value = 'Completing challenge ...'
            resolve(codeInput.value)
          }
          showCode.value = false
        }
      })
    })

    // We are certified!
    loadStatus.value = 'Certified!'
    afterTransition.value = () => (showSuccess.value = true)
    showLoading.value = false
    setTimeout(() => emit('login'), 1500)
  } catch (err) {
    $toast.error('Failed to complete challenge')
    console.error(err)
    showLoading.value = false
    afterTransition.value = () => (showEmail.value = true)
  }
}

async function setup() {
  try {
    // Entrypoint - make sure service is loaded
    loadStatus.value = 'Setting up NDN service ...'
    await ndn.setup()

    // Check if we are already certified
    if (await ndn.api.hasTestbedKey()) {
      afterTransition.value = () => (showSuccess.value = true)
      showLoading.value = false
      setTimeout(() => emit('login'), 250)
      return
    }

    afterTransition.value = () => (showEmail.value = true)
    showLoading.value = false
  } catch (err) {
    console.error(err)
  }
}

setup()
</script>

<style scoped lang="scss">
.wrapper {
  display: flex;
  flex-direction: column;
}

.success {
  color: white;
  font-size: 5rem;
}

@media (min-width: 1024px) {
  .wrapper {
    margin: auto;
    margin-right: 10vw;
    min-width: 350px;
  }
}
</style>
