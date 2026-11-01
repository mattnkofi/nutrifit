<template>
  <div class="coach-layer">
    <Transition name="backdrop">
      <div v-if="isCoachOpen" class="coach-backdrop" @click="closeCoach"></div>
    </Transition>

    <Transition name="panel">
      <section
        v-if="isCoachOpen"
        ref="panelRef"
        class="chat-panel"
        :class="{ 'is-fullscreen': isFullscreen }"
        role="dialog"
        aria-modal="true"
        aria-label="Coach chat"
      >
        <header class="chat-header">
          <div class="chat-id">
            <span class="chat-avatar">
              <span class="avatar-ring" aria-hidden="true"></span>
              <ion-icon :icon="barbellSharp" />
              <i class="avatar-status" aria-hidden="true"></i>
            </span>
            <div class="chat-titles">
              <strong>NutriFit Coach</strong>
              <small><i class="status-dot" aria-hidden="true"></i>{{ isTyping ? 'Typing…' : 'Online · ready to help' }}</small>
            </div>
          </div>
          <div class="chat-tools">
            <button
              class="chat-tool"
              type="button"
              @click="toggleFullscreen"
              :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
              :title="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'"
            >
              <ion-icon :icon="isFullscreen ? contractOutline : expandOutline" />
            </button>
            <button class="chat-tool" type="button" @click="resetChat" aria-label="Start a new chat" title="New chat">
              <ion-icon :icon="refreshOutline" />
            </button>
            <button class="chat-tool" type="button" @click="closeCoach" aria-label="Close chat" title="Close">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>
        </header>

        <div class="chat-scope" aria-hidden="true">
          <span>Training</span>
          <i></i>
          <span>Nutrition</span>
          <i></i>
          <span>Recovery</span>
        </div>

        <div class="chat-body" ref="bodyRef">
          <div class="chat-thread">
            <div
              v-for="(m, i) in messages"
              :key="i"
              class="msg-row"
              :class="[m.role, { 'msg-new': i === messages.length - 1 }]"
            >
              <span v-if="m.role === 'bot'" class="msg-avatar" aria-hidden="true">
                <ion-icon :icon="barbellSharp" />
              </span>
              <div class="msg" :class="m.role">
                <div class="msg-content" v-html="formatMessage(m.text)"></div>
              </div>
            </div>

            <div v-if="isTyping" class="msg-row bot">
              <span class="msg-avatar" aria-hidden="true"><ion-icon :icon="barbellSharp" /></span>
              <div class="msg bot typing"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>

        <Transition name="fade">
          <div v-if="messages.length <= 1 && !isTyping" class="chat-suggest">
            <button v-for="q in quickActions" :key="q" type="button" class="chip" @click="quickAction(q)">
              <span>{{ q }}</span>
              <ion-icon :icon="arrowForwardOutline" />
            </button>
          </div>
        </Transition>

        <form class="chat-input" @submit.prevent="send">
          <textarea
            ref="inputRef"
            v-model="input"
            rows="1"
            @input="resizeInput"
            @keydown.enter.exact.prevent="send"
            placeholder="Ask your coach anything…"
            aria-label="Message the AI coach"
          ></textarea>
          <button class="chat-send" type="submit" :disabled="!input.trim() || isTyping" aria-label="Send message">
            <ion-icon :icon="arrowUpOutline" />
          </button>
        </form>
      </section>
    </Transition>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  arrowForwardOutline,
  arrowUpOutline,
  barbellSharp,
  closeOutline,
  contractOutline,
  expandOutline,
  refreshOutline
} from 'ionicons/icons';
import { chatWithCoach } from '../../services/aiService';
import { useCoach } from '../../composables/useCoach';
import { useUserData } from '../../composables/useUserData';

const { isCoachOpen, closeCoach } = useCoach();
const { profile, streak, todayStats, mealHistory, workoutHistory, labels } = useUserData();

const GREETING = 'Hey — I\'m Coach. Ask me about training, food, or recovery and I\'ll keep it short and practical.';
const STORAGE_KEY = 'nutrifit_coach_history_v1';

const loadHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {}
  return [{ role: 'bot', text: GREETING }];
};

const input = ref('');
const messages = ref(loadHistory());
const bodyRef = ref(null);
const inputRef = ref(null);
const isTyping = ref(false);
const isFullscreen = ref(false);
const isMorphing = ref(false);
const panelRef = ref(null);

watch(messages, (next) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-30)));
  } catch (e) {}
}, { deep: true });

const getUserContext = () => {
  const p = profile.value;
  const stats = todayStats.value;
  const meals = (mealHistory.value || []).slice(0, 3).map(m => `${m.name} (${m.calories} kcal)`).join(', ');
  const workouts = (workoutHistory.value || []).slice(0, 2).map(w => w.title).join(', ');
  
  return `User Profile & Goals:
- Name: ${p.fullName || 'Member'}
- Main Goal: ${labels.value.goal || 'General fitness'} (Experience: ${labels.value.experience || 'Not set'})
- Daily Targets: ${p.dailyCalories || 'Not set'} kcal, ${p.dailyProtein || 'Not set'}g protein, ${p.waterTarget || 8} glasses water, ${p.trainingTarget || 4} training sessions/wk.
- Current Streak: ${streak.value} days
- Today's Progress: ${stats.calories} kcal eaten, ${stats.protein}g protein, ${stats.glasses} glasses water, ${stats.workouts.length} workouts completed.
- Recent Meals: ${meals || 'None logged yet'}
- Recent Workouts: ${workouts || 'None logged yet'}`;
};

const quickActions = [
  'Build me a push day',
  'I ate pizza — what now?',
  'How much protein do I need?'
];

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const inline = (value) => value
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/__([^_]+)__/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

const formatMessage = (raw) => {
  const text = escapeHtml(String(raw || '').trim());
  const lines = text.split(/\r?\n/);
  const html = [];
  let list = null;
  let code = null;

  const flushList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };
  const flushCode = () => {
    if (code) {
      html.push(`<pre><code>${code.join('\n')}</code></pre>`);
      code = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (code) flushCode();
      else {
        flushList();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!trimmed) {
      flushList();
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);

    if (bullet) {
      if (list !== 'ul') {
        flushList();
        html.push('<ul>');
        list = 'ul';
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
    } else if (numbered) {
      if (list !== 'ol') {
        flushList();
        html.push('<ol>');
        list = 'ol';
      }
      html.push(`<li>${inline(numbered[1])}</li>`);
    } else if (heading) {
      flushList();
      html.push(`<p class="md-h">${inline(heading[1])}</p>`);
    } else {
      flushList();
      html.push(`<p>${inline(trimmed)}</p>`);
    }
  }

  flushList();
  flushCode();
  return html.join('');
};

const scrollToBottom = async (smooth = true) => {
  await nextTick();
  const el = bodyRef.value;
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
};

const resizeInput = () => {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 92)}px`;
};

const resetChat = () => {
  if (isTyping.value) return;
  messages.value = [{ role: 'bot', text: GREETING }];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  input.value = '';
  if (inputRef.value) inputRef.value.style.height = 'auto';
  nextTick(() => scrollToBottom(false));
};

const toggleFullscreen = async () => {
  if (isMorphing.value) return;

  const el = panelRef.value;
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  if (!el || !isMobile || typeof el.animate !== 'function') {
    isFullscreen.value = !isFullscreen.value;
    await nextTick();
    scrollToBottom(false);
    window.setTimeout(() => scrollToBottom(true), 340);
    return;
  }

  isMorphing.value = true;
  try {
    const fadeOut = el.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.985)' }
      ],
      { duration: 90, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
    );
    await fadeOut.finished.catch(() => {});

    isFullscreen.value = !isFullscreen.value;
    await nextTick();
    scrollToBottom(false);

    const fadeIn = el.animate(
      [
        { opacity: 0, transform: 'scale(0.985)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      { duration: 190, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
    );
    await fadeIn.finished.catch(() => {});

    fadeOut.cancel();
    fadeIn.cancel();
  } finally {
    isMorphing.value = false;
    await scrollToBottom(false);
  }
};

const onKeydown = (event) => {
  if (!isCoachOpen.value || event.key !== 'Escape') return;
  if (isFullscreen.value) {
    toggleFullscreen();
  } else {
    closeCoach();
  }
};

watch(isCoachOpen, (open) => {
  if (!open) {
    isMorphing.value = false;
    window.removeEventListener('keydown', onKeydown);
    return;
  }
  isFullscreen.value = false;
  isMorphing.value = false;
  scrollToBottom(false);
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});

const quickAction = async (q) => {
  if (isTyping.value) return;
  input.value = q;
  await send();
};

const send = async () => {
  const msg = input.value.trim();
  if (!msg || isTyping.value) return;

  const history = messages.value.slice(-10);
  messages.value.push({ role: 'user', text: msg });
  input.value = '';
  if (inputRef.value) inputRef.value.style.height = 'auto';
  await scrollToBottom();

  isTyping.value = true;
  try {
    const userContext = getUserContext();
    const res = await chatWithCoach(msg, history, userContext);
    messages.value.push({ role: 'bot', text: res.reply });
  } catch (e) {
    messages.value.push({ role: 'bot', text: 'I couldn\'t reach the coach just now. Give me a moment and try again.' });
  } finally {
    isTyping.value = false;
    await scrollToBottom();
  }
};
</script>

<style scoped>
.coach-layer {
  position: static;
}

.coach-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1900;
  background: rgba(0, 0, 0, 0.62);
}

.chat-panel {
  --chat-fs: 0.72rem;
  --chat-title-fs: 0.82rem;
  --chat-sub-fs: 0.55rem;
  --chat-input-fs: 0.74rem;
  --chat-chip-fs: 0.62rem;

  position: fixed;
  top: calc(4.25rem + env(safe-area-inset-top, 0));
  left: 0.55rem;
  right: 0.55rem;
  bottom: calc(3.7rem + env(safe-area-inset-bottom, 0));
  z-index: 2000;
  transform-origin: top right;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 14px;
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(255, 255, 255, 0.06), transparent 52%),
    linear-gradient(168deg, rgba(22, 22, 22, 0.98), rgba(6, 6, 6, 0.99));
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  contain: layout paint;
  will-change: transform, opacity;
  transition:
    top 0.34s var(--ease-out),
    left 0.34s var(--ease-out),
    right 0.34s var(--ease-out),
    bottom 0.34s var(--ease-out),
    width 0.34s var(--ease-out),
    height 0.34s var(--ease-out),
    border-radius 0.34s var(--ease-out);
}
.chat-panel::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  z-index: 2;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6) 30%, rgba(255, 255, 255, 0.6) 70%, transparent);
  opacity: 0.55;
  pointer-events: none;
}
.chat-panel.is-fullscreen {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  border-color: transparent;
  border-radius: 0;
  box-shadow: none;
}
.chat-panel.is-fullscreen .chat-header {
  padding-top: calc(0.8rem + env(safe-area-inset-top, 0));
}
.chat-panel.is-fullscreen .chat-body {
  padding-bottom: 1.4rem;
}

.chat-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.72rem 0.7rem 0.72rem 0.8rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.012));
  border-bottom: 1px solid var(--line);
  flex: 0 0 auto;
}
.chat-header::before {
  content: '';
  position: absolute;
  top: 0.8rem;
  bottom: 0.8rem;
  left: 0;
  width: 2px;
  background: var(--white);
  opacity: 0.8;
}
.chat-id {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}
.chat-avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.05));
  border: 1px solid var(--line-strong);
  color: var(--white);
  font-size: 1.2rem;
  flex: 0 0 auto;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.avatar-ring {
  position: absolute;
  inset: -3px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  animation: avatarRing 3.6s var(--ease) infinite;
  pointer-events: none;
}
.avatar-status {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 0.66rem;
  height: 0.66rem;
  border-radius: 50%;
  background: #4ade80;
  border: 2px solid #141414;
}
.chat-titles {
  display: grid;
  gap: 0.14rem;
  min-width: 0;
}
.chat-titles strong {
  color: var(--text);
  font-family: var(--font-display);
  font-size: calc(var(--chat-title-fs) + 0.02rem);
  font-weight: 500;
  letter-spacing: 0.055em;
  line-height: 1.1;
  text-transform: uppercase;
}
.chat-titles small {
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  color: var(--dim);
  font-size: var(--chat-sub-fs);
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.status-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
  animation: statusPulse 2.4s var(--ease) infinite;
}

.chat-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 0 0 auto;
}
.chat-tool {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  font-size: 0.98rem;
  cursor: pointer;
  transition: color 0.25s var(--ease), border-color 0.25s var(--ease), background-color 0.25s var(--ease), transform 0.25s var(--ease);
}
.chat-tool:hover {
  color: var(--white);
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}
.chat-tool:active {
  transform: scale(0.92);
}

.chat-scope {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding: 0.48rem 0.85rem;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.015);
  color: var(--dim);
  font-size: 0.48rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  flex: 0 0 auto;
}
.chat-scope i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem 0.8rem 1.15rem;
  scroll-behavior: smooth;
  background: radial-gradient(85% 45% at 50% 0%, rgba(255, 255, 255, 0.028), transparent 70%);
}
.chat-body::-webkit-scrollbar {
  width: 4px;
}
.chat-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border: 0;
  border-radius: 2px;
}
.chat-thread {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.msg-row.msg-new {
  animation: msgIn 0.32s var(--ease-out) both;
}
.msg-row.user {
  justify-content: flex-end;
}
.msg-avatar {
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
  margin-top: 0.08rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--line);
  color: var(--text-soft);
  font-size: 0.8rem;
  flex: 0 0 auto;
}

.msg {
  max-width: 84%;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  font-size: var(--chat-fs);
  line-height: 1.52;
  letter-spacing: 0.005em;
  overflow-wrap: anywhere;
  transition: background-color 0.3s var(--ease), border-color 0.3s var(--ease);
}
.msg.bot {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: var(--text-soft);
  border-top-left-radius: 3px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.msg.user {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.11));
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text);
  border-top-right-radius: 3px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.msg-content :deep(p) {
  margin: 0 0 0.42rem;
}
.msg-content :deep(p:last-child) {
  margin-bottom: 0;
}
.msg-content :deep(strong) {
  color: var(--white);
  font-weight: 600;
}
.msg-content :deep(em) {
  font-style: italic;
  color: var(--text);
}
.msg-content :deep(ul),
.msg-content :deep(ol) {
  margin: 0.25rem 0 0.42rem;
  padding-left: 1.05rem;
  display: grid;
  gap: 0.16rem;
}
.msg-content :deep(li) {
  padding-left: 0.1rem;
}
.msg-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: calc(var(--chat-fs) - 0.06rem);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 0.06rem 0.3rem;
}
.msg-content :deep(pre) {
  margin: 0.3rem 0;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--line);
  overflow-x: auto;
}
.msg-content :deep(pre code) {
  background: none;
  padding: 0;
}
.msg-content :deep(.md-h) {
  color: var(--white);
  font-weight: 600;
}

.msg.typing {
  display: flex;
  align-items: center;
  gap: 0.32rem;
  padding: 0.72rem 0.85rem;
}
.msg.typing span {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 50%;
  background: var(--muted);
  animation: chatTyping 1.2s ease-in-out infinite;
}
.msg.typing span:nth-child(2) {
  animation-delay: 0.15s;
}
.msg.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

.chat-suggest {
  display: flex;
  gap: 0.45rem;
  padding: 0.7rem 0.8rem 0.75rem;
  border-top: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
  flex: 0 0 auto;
}
.chat-suggest::-webkit-scrollbar {
  display: none;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex: 0 0 auto;
  padding: 0.46rem 0.6rem 0.46rem 0.68rem;
  border: 1px solid var(--line-strong);
  border-left: 2px solid rgba(255, 255, 255, 0.45);
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.01));
  color: var(--text-soft);
  font-size: var(--chat-chip-fs);
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.25s var(--ease), border-color 0.25s var(--ease), background-color 0.25s var(--ease), transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease);
}
.chip ion-icon {
  font-size: 0.78rem;
  color: var(--dim);
  transition: color 0.25s var(--ease), transform 0.25s var(--ease-out);
}
.chip:hover {
  border-color: rgba(255, 255, 255, 0.5);
  border-left-color: var(--white);
  color: var(--white);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
}
.chip:hover ion-icon {
  color: var(--white);
  transform: translateX(2px);
}
.chip:active {
  transform: scale(0.97);
}

.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.7rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0));
  border-top: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.015), rgba(0, 0, 0, 0.25));
  flex: 0 0 auto;
}
.chat-input textarea {
  flex: 1;
  min-width: 0;
  min-height: 2.55rem;
  max-height: 92px;
  resize: none;
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--text);
  padding: 0.66rem 0.85rem;
  font-size: var(--chat-input-fs);
  line-height: 1.4;
  font-family: var(--font-body);
  outline: none;
  transition: border-color 0.3s var(--ease), background-color 0.3s var(--ease), box-shadow 0.3s var(--ease);
}
.chat-input textarea:focus {
  border-color: rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 0 3px rgba(255, 255, 255, 0.06);
}
.chat-input textarea::placeholder {
  color: var(--dim);
}
.chat-send {
  width: 2.55rem;
  height: 2.55rem;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(150deg, #ffffff, #d2d2d2);
  color: var(--black);
  display: grid;
  place-items: center;
  font-size: 1.15rem;
  cursor: pointer;
  flex: 0 0 auto;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: transform 0.25s var(--ease-out), opacity 0.25s var(--ease), box-shadow 0.25s var(--ease), filter 0.25s var(--ease);
}
.chat-send:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 22px rgba(255, 255, 255, 0.2);
}
.chat-send:active:not(:disabled) {
  transform: scale(0.93);
}
.chat-send:disabled {
  opacity: 0.32;
  cursor: default;
  filter: grayscale(0.2);
}

.panel-enter-active {
  transition: opacity 0.22s var(--ease-out), transform 0.26s var(--ease-out);
  will-change: transform, opacity;
}
.panel-leave-active {
  transition: opacity 0.16s var(--ease), transform 0.2s var(--ease);
  will-change: transform, opacity;
}
.panel-enter-from {
  opacity: 0;
  transform: translate3d(8px, -4px, 0) scale(0.97);
}
.panel-leave-to {
  opacity: 0;
  transform: translate3d(4px, -2px, 0) scale(0.985);
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s var(--ease);
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s var(--ease), transform 0.25s var(--ease);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@keyframes msgIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes chatTyping {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  30% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
@keyframes statusPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.45);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(74, 222, 128, 0);
  }
}
@keyframes avatarRing {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.15;
  }
}

@media (min-width: 768px) {
  .chat-panel {
    --chat-fs: 0.82rem;
    --chat-title-fs: 0.88rem;
    --chat-sub-fs: 0.58rem;
    --chat-input-fs: 0.8rem;
    --chat-chip-fs: 0.66rem;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .chat-panel {
    top: calc(4.6rem + env(safe-area-inset-top, 0));
    left: auto;
    right: 1rem;
    bottom: auto;
    width: 400px;
    height: min(600px, calc(100dvh - 5.5rem));
  }
}

@media (min-width: 1024px) {
  .chat-panel {
    --chat-fs: 0.9rem;
    --chat-title-fs: 0.95rem;
    --chat-sub-fs: 0.62rem;
    --chat-input-fs: 0.86rem;
    --chat-chip-fs: 0.7rem;

    top: calc(6.7rem + env(safe-area-inset-top, 0));
    left: auto;
    right: 8rem;
    bottom: auto;
    width: 420px;
    height: min(640px, calc(100dvh - 8rem));
  }

  .coach-backdrop {
    display: none;
  }
}

@media (min-width: 1280px) {
  .chat-panel {
    --chat-fs: 0.96rem;
    --chat-title-fs: 1rem;
    --chat-sub-fs: 0.65rem;
    --chat-input-fs: 0.9rem;
    --chat-chip-fs: 0.74rem;

    top: calc(7.4rem + env(safe-area-inset-top, 0));
    width: 440px;
    height: min(680px, calc(100dvh - 9rem));
  }
}

@media (min-width: 768px) {
  .chat-panel.is-fullscreen {
    top: 0;
    left: auto;
    right: 0;
    bottom: auto;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    border-color: transparent;
    border-radius: 0;
    box-shadow: none;
  }
}

@media (max-width: 767px) {
  .chat-panel {
    background: linear-gradient(168deg, rgba(22, 22, 22, 0.98), rgba(6, 6, 6, 0.99));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    transition: none;
  }

  .chat-body {
    background: transparent;
  }

  .panel-enter-active {
    transition: opacity 0.2s var(--ease-out), transform 0.24s var(--ease-out);
  }

  .panel-leave-active {
    transition: opacity 0.16s var(--ease), transform 0.2s var(--ease);
  }

  .panel-enter-from {
    transform: translate3d(0, 10px, 0) scale(0.98);
  }

  .panel-leave-to {
    transform: translate3d(0, 4px, 0) scale(0.99);
  }
}

@media (prefers-reduced-motion: reduce) {
  .msg.typing span,
  .status-dot,
  .avatar-ring {
    animation: none !important;
  }

  .panel-enter-active,
  .panel-leave-active {
    transition-duration: 0.01ms;
  }

  .panel-enter-from,
  .panel-leave-to {
    transform: none;
  }
}
</style>
