<template>
  <span
    class="rolling-number"
    role="img"
    :aria-label="ariaLabel || display"
    :style="{ '--rn-duration': `${duration}ms` }"
  >
    <template v-for="item in chars" :key="item.key">
      <span v-if="item.digit !== null" class="rn-col" aria-hidden="true">
        <span class="rn-strip" :style="{ transform: `translateY(-${item.digit * 10}%)` }">
          <span v-for="digit in 10" :key="digit" class="rn-digit">{{ digit - 1 }}</span>
        </span>
      </span>
      <span v-else class="rn-sep" aria-hidden="true">{{ item.char }}</span>
    </template>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  // When null, numbers keep their natural decimals. Pass 0 for whole numbers.
  decimals: { type: Number, default: null },
  grouping: { type: Boolean, default: false },
  placeholder: { type: String, default: '0' },
  duration: { type: Number, default: 720 },
  ariaLabel: { type: String, default: '' },
});

const decimalsFor = (number) => {
  if (Number.isInteger(number)) return 0;
  const text = String(number);
  const dot = text.indexOf('.');
  if (dot < 0) return 0;
  // Keep measurement values (weight, height) readable without the long
  // floating point tails that averages can produce.
  return Math.min(2, text.length - dot - 1);
};

const display = computed(() => {
  const raw = props.value;
  if (raw === null || raw === undefined || raw === '') return props.placeholder;

  if (typeof raw === 'string') return raw;

  const number = Number(raw);
  if (!Number.isFinite(number)) return String(raw);

  const decimals = props.decimals ?? decimalsFor(number);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: props.grouping,
  }).format(number);
});

const chars = computed(() => {
  const text = display.value;
  const length = text.length;
  return Array.from(text).map((char, index) => {
    const isDigit = char >= '0' && char <= '9';
    return {
      // Keying from the right keeps the ones digit stable when the
      // number grows or shrinks, so only the new digits animate in.
      key: `${length - 1 - index}:${isDigit ? 'd' : char}`,
      digit: isDigit ? Number(char) : null,
      char,
    };
  });
});
</script>

<style scoped>
  .rolling-number {
    display: inline-flex;
    align-items: baseline;
    max-width: 100%;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    vertical-align: baseline;
  }

  .rn-col {
    position: relative;
    display: inline-block;
    width: 1ch;
    height: 1em;
    overflow: hidden;
    vertical-align: baseline;
  }

  .rn-strip {
    display: flex;
    flex-direction: column;
    width: 100%;
    transition: transform var(--rn-duration, 720ms) cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .rn-digit {
    display: block;
    flex: 0 0 1em;
    width: 100%;
    height: 1em;
    line-height: 1em;
    text-align: center;
  }

  .rn-sep {
    display: inline-block;
    white-space: pre;
  }
</style>
