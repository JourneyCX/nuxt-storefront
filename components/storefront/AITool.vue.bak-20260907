<script setup lang="ts">
type Mode = 'recommender' | 'planner' | 'assistant'
type Msg  = { role: 'user' | 'assistant'; content: string }

const props = defineProps<{
  mode?: Mode
  headline?: string
  subheadline?: string
  proxyEndpoint?: string
  apiKey?: string
  systemPrompt?: string
  starterPrompts?: string
  inputPlaceholder?: string
  assistantName?: string
  assistantAvatar?: string
  accentColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  borderRadius?: number
  maxHeight?: number
}>()

const MODE_META: Record<Mode, { icon: string; label: string }> = {
  recommender: { icon: '🛍', label: 'Product Recommender' },
  planner:     { icon: '🗺', label: 'Travel Planner' },
  assistant:   { icon: '💬', label: 'Store Assistant' },
}

const mode         = computed(() => props.mode || 'recommender')
const meta         = computed(() => MODE_META[mode.value])
const accentColor  = computed(() => props.accentColor || '#2563eb')
const backgroundColor = computed(() => props.backgroundColor || '#f8fafc')
const cardColor    = computed(() => props.cardColor || '#ffffff')
const textColor    = computed(() => props.textColor || '#1e293b')
const borderRadius = computed(() => props.borderRadius || 16)
const maxHeight    = computed(() => props.maxHeight || 400)
const bubbleRadius = computed(() => Math.round(borderRadius.value / 1.5))

const starters = computed(() =>
  (props.starterPrompts || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 4),
)

const messages = ref<Msg[]>([])
const input    = ref('')
const loading  = ref(false)
const error    = ref('')
const bottomEl = ref<HTMLElement | null>(null)

watch([messages, loading], () => {
  nextTick(() => bottomEl.value?.scrollIntoView({ behavior: 'smooth' }))
}, { deep: true })

function bubbleCorners(role: Msg['role']) {
  const r = bubbleRadius.value
  return role === 'user'
    ? `${r}px ${r}px 4px ${r}px`
    : `${r}px ${r}px ${r}px 4px`
}

async function send(text: string) {
  if (!text.trim() || loading.value) return
  messages.value = [...messages.value, { role: 'user', content: text }]
  input.value = ''
  loading.value = true
  error.value = ''

  if (!props.proxyEndpoint) {
    setTimeout(() => {
      messages.value = [...messages.value, {
        role: 'assistant',
        content: 'Configure the Proxy Endpoint and API Key in the block settings (AI Settings → Storefront AI Block) to enable live responses.',
      }]
      loading.value = false
    }, 900)
    return
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (props.apiKey) headers['X-AI-Key'] = props.apiKey

    const res = await fetch(props.proxyEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mode: mode.value,
        systemPrompt: props.systemPrompt || undefined,
        messages: messages.value.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    const data = await res.json()

    // Surface a credit-exhausted response as a distinct message
    if (data?.error === 'insufficient_credits') {
      messages.value = [...messages.value, {
        role: 'assistant',
        content: '⚠️ ' + (data.message ?? 'AI credit balance is empty. Please top up in the Stratum admin panel.'),
      }]
      return
    }

    if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)

    const content: string = data?.content ?? data?.choices?.[0]?.message?.content ?? 'No response received.'
    messages.value = [...messages.value, { role: 'assistant', content }]
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Request failed'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send(input.value)
  }
}
</script>

<template>
  <section :style="{ backgroundColor: backgroundColor, padding: '64px 24px' }">
    <div style="max-width:740px;margin:0 auto;">
      <div v-if="headline || subheadline" style="text-align:center;margin-bottom:36px;">
        <h2 v-if="headline" :style="{ color: textColor, fontSize: '30px', fontWeight: 800, margin: '0 0 10px' }">{{ headline }}</h2>
        <p v-if="subheadline" :style="{ color: textColor, opacity: 0.65, fontSize: '16px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
      </div>

      <div :style="{ backgroundColor: cardColor, borderRadius: `${borderRadius}px`, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', overflow: 'hidden', border: `1px solid ${textColor}0f` }">
        <!-- Header bar -->
        <div :style="{ padding: '14px 20px', borderBottom: `1px solid ${textColor}0f`, display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: accentColor + '0a' }">
          <span style="font-size:22px;">{{ meta.icon }}</span>
          <div>
            <p :style="{ color: textColor, fontWeight: 700, fontSize: '14px', margin: 0 }">{{ assistantName || meta.label }}</p>
            <p style="color:#10b981;font-size:11px;margin:0;display:flex;align-items:center;gap:4px;">
              <span style="width:6px;height:6px;border-radius:50%;background-color:#10b981;display:inline-block;" />
              Online
            </p>
          </div>
        </div>

        <!-- Messages -->
        <div :style="{ height: `${maxHeight}px`, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }">
          <div v-if="messages.length === 0 && starters.length > 0" style="text-align:center;padding-top:20px;">
            <img v-if="assistantAvatar" :src="assistantAvatar" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin-bottom:12px;" />
            <div v-else :style="{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 12px' }">{{ meta.icon }}</div>
            <p :style="{ color: textColor, opacity: 0.55, fontSize: '14px', marginBottom: '20px' }">Hi! How can I help you today?</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
              <button
                v-for="(s, i) in starters"
                :key="i"
                @click="send(s)"
                :style="{ backgroundColor: accentColor + '12', color: accentColor, border: `1px solid ${accentColor}30`, borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }"
              >{{ s }}</button>
            </div>
          </div>

          <div
            v-for="(msg, i) in messages"
            :key="i"
            :style="{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }"
          >
            <div v-if="msg.role === 'assistant'" :style="{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }">{{ meta.icon }}</div>
            <div :style="{ maxWidth: '75%', backgroundColor: msg.role === 'user' ? accentColor : textColor + '0c', color: msg.role === 'user' ? '#fff' : textColor, borderRadius: bubbleCorners(msg.role), padding: '10px 14px', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }">{{ msg.content }}</div>
          </div>

          <div v-if="loading" style="display:flex;gap:10px;align-items:flex-start;">
            <div :style="{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }">{{ meta.icon }}</div>
            <div :style="{ backgroundColor: textColor + '0c', borderRadius: `${bubbleRadius}px ${bubbleRadius}px ${bubbleRadius}px 4px`, padding: '12px 16px' }">
              <div class="ai-typing" :style="{ '--dot-color': accentColor }">
                <span class="ai-d1" /><span class="ai-d2" /><span class="ai-d3" />
              </div>
            </div>
          </div>

          <p v-if="error" style="color:#ef4444;font-size:13px;text-align:center;">⚠ {{ error }}</p>
          <div ref="bottomEl" />
        </div>

        <!-- Input -->
        <div :style="{ padding: '12px 16px', borderTop: `1px solid ${textColor}0f`, display: 'flex', gap: '10px' }">
          <textarea
            v-model="input"
            @keydown="onKeydown"
            :placeholder="inputPlaceholder || 'Ask me anything…'"
            rows="1"
            :style="{ flex: 1, resize: 'none', border: `1px solid ${textColor}18`, borderRadius: '10px', padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: textColor, backgroundColor: '#fff' }"
          />
          <button
            @click="send(input)"
            :disabled="!input.trim() || loading"
            :style="{ backgroundColor: accentColor, border: 'none', borderRadius: '10px', padding: '0 18px', cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1 }"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="!proxyEndpoint" :style="{ color: textColor, opacity: 0.4, fontSize: '12px', textAlign: 'center', marginTop: '12px' }">
        ℹ️ This block configures itself automatically — if this message persists, check <strong>AI Settings → Storefront AI Block</strong> in your Stratum admin, or set the Proxy Endpoint/API Key fields manually.
      </p>
    </div>
  </section>
</template>

<style scoped>
.ai-typing { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
.ai-typing span { width: 7px; height: 7px; border-radius: 50%; background-color: var(--dot-color, #2563eb); display: inline-block; }
.ai-d1 { animation: ai-dot 1.2s infinite 0s; }
.ai-d2 { animation: ai-dot 1.2s infinite 0.2s; }
.ai-d3 { animation: ai-dot 1.2s infinite 0.4s; }
@keyframes ai-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
</style>
