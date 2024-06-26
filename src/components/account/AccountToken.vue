<script setup lang="ts">
import TotpProgress from '@/components/TotpProgress.vue';
import { Account, AccountContent } from '@/types';
import { faCopy } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { IonButton } from '@ionic/vue';
import { TOTP } from 'totp-generator';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Popper from "vue3-popper";

const props = defineProps<{
  item: Account;
}>();

let intervalId: number;

onMounted(() => {
  intervalId = window.setInterval(() => {
    updateLeftTime();

    if (leftTime.value < 0) {
      generateTotp();
      updateLeftTime();
    }
  }, 1000);
});

onUnmounted(() => {
  clearInterval(intervalId);
});

const otp = ref('');
const expires = ref(0);
const leftTime = ref(0);

watch(() => props.item, () => {
  generateTotp();
  updateLeftTime();
}, { immediate: true });

function generateTotp() {
  const totp = TOTP.generate(props.item.content.secret);

  otp.value = totp.otp;
  expires.value = totp.expires;
}

function getLeftTime() {
  return (expires.value - new Date().getTime()) / 1000;
}

function updateLeftTime() {
  leftTime.value = getLeftTime();
}

function codeSplit(code: string) {
  const start = code.substring(0, 3);
  const end = code.substring(3);

  return `${start} ${end}`;
}

const showCopied = ref(false);

function codeButtonClick() {
  navigator.clipboard.writeText(otp.value);

  showCopied.value = true;

  setTimeout(() => {
    showCopied.value = false;
  }, 1500);
}

// Progress
const progress = computed(() => {
  return 100 - (leftTime.value / 30 * 100);
});

// Filters
function round(num: number) {
  return Math.round(num);
}
</script>

<template>
<div>
  <div class="c-account-item" style="text-align: center" >
    <img class="c-account-item__icon" :src="item.content.image" alt="icon" style="">

    <h2 class="c-account-item__title">{{ item.content.title }}</h2>

    <div class="c-account-item__otp">
      <Popper content="Copied!" class="c-copy-tooltip"
        arrow
        placement="top"
        :show="showCopied"
      >
        <ion-button class="c-otp-button"
          color="dark"
          fill="clear"
          @click="codeButtonClick"
        >
          <div class="c-otp" >
            <div class="c-otp__code">
              {{ codeSplit(otp) }}
            </div>
            <div class="c-otp__copy">
              <FontAwesomeIcon :icon="faCopy" />
            </div>
          </div>
        </ion-button>
      </Popper>
    </div>

    <div class="c-account-item__left-time"
      style="margin-top: .5rem">
      <TotpProgress :progress :size="48" >
        {{ round(leftTime) }}
      </TotpProgress>
    </div>

  </div>
</div>
</template>

<style scoped lang="scss">
.c-account-item {
  &__icon {
    max-width: 120px;
    height: 64px;
    object-fit: contain;
  }

  &__title {
    font-size: 1.25rem;
  }

  &__otp {
    display: flex;
    justify-content: center;
  }

  &__left-time {
    font-size: 1.35rem;
  }
}

.c-otp {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .75rem;
  padding: 0 .75rem;
  cursor: pointer;

  &__code {
    display: inline-block;
    font-size: 2.25rem;
    //color: #fefefe;
    letter-spacing: 3px;
  }

  &__copy {
    font-size: 1.2rem;
  }
}

.c-copy-tooltip {
  // Tooltip
  --popper-theme-background-color: #111;
  --popper-theme-background-color-hover: #111;
  --popper-theme-text-color: #ffffff;
  --popper-theme-border-width: 0px;
  --popper-theme-border-style: solid;
  --popper-theme-border-radius: 6px;
  --popper-theme-padding: .75rem;
  --popper-theme-box-shadow: 0 6px 30px -6px rgba(0, 0, 0, 0.25);
}
</style>
