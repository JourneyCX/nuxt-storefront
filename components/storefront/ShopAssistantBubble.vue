<script setup lang="ts">
// Fixed-position floating chat bubble — site-wide chrome like WhatsAppWidget.vue
// right next to it, rendered by layouts/default.vue around every page, sourced
// from the same sb_site_settings row (server/utils/stratum.ts's SiteSettings
// interface). Distinct from the per-page "AI-Powered Tool" Puck block
// (components/storefront/AITool.vue) a merchant can still drag onto individual
// pages — this makes the same Shop Assistant persistently reachable everywhere.
// Ported 1:1 from studio-app's components/Navigation/ShopAssistantBubble.tsx so
// both renderers behave identically — keep both in sync.
import type { SiteSettings } from '~/server/utils/stratum'

type Msg = { role: 'user' | 'assistant'; content: string }

const props = defineProps<{ settings: SiteSettings }>()

const WHATSAPP_BUTTON_FOOTPRINT = 56 + 16 // button height + gap, matches WhatsAppWidget.vue

const open     = ref(false)
const messages = ref<Msg[]>([])
const input    = ref('')
const loading  = ref(false)
const error    = ref('')
const bottomEl = ref<HTMLElement | null>(null)

const visible       = computed(() => Boolean(props.settings.aiBubbleEnabled))
const accentColor   = computed(() => props.settings.aiBubbleAccentColor || '#2563eb')
const assistantName = computed(() => props.settings.aiBubbleAssistantName || 'Shop Assistant')
const greeting       = computed(() => props.settings.aiBubbleGreeting || 'Hi! How can I help you today?')
const starters = computed(() =>
  (props.settings.aiBubbleStarterPrompts || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 4),
)
const isRight = computed(() => props.settings.aiBubblePosition !== 'bottom-left')
// WhatsApp's own position is always bottom-right (no position field), so a
// collision is only possible when the assistant is also right-aligned.
const collidesWithWhatsapp = computed(() =>
  isRight.value && props.settings.whatsappEnabled && Boolean(props.settings.whatsappPhone),
)
const bottomOffset = computed(() => (collidesWithWhatsapp.value ? 24 + WHATSAPP_BUTTON_FOOTPRINT : 24))

watch([messages, loading, open], () => {
  if (!open.value) return
  nextTick(() => bottomEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
}, { deep: true })

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatMessage(content: string, linkColor: string): string {
  let html = escapeHtml(content)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const trailing = url.match(/[.,;:!?)\]]+$/)?.[0] ?? ''
    const clean = trailing ? url.slice(0, -trailing.length) : url
    return `<a href="${clean}" target="_blank" rel="noopener noreferrer" style="color:${linkColor};text-decoration:underline;">${clean}</a>${trailing}`
  })
  return html
}

async function send(text: string) {
  if (!text.trim() || loading.value) return
  messages.value = [...messages.value, { role: 'user', content: text }]
  input.value = ''
  loading.value = true
  error.value = ''

  if (!props.settings.aiBubbleProxyEndpoint) {
    setTimeout(() => {
      messages.value = [...messages.value, {
        role: 'assistant',
        content: 'Save the Shop Assistant section in Site Settings to enable live responses.',
      }]
      loading.value = false
    }, 900)
    return
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (props.settings.aiBubbleApiKey) headers['X-AI-Key'] = props.settings.aiBubbleApiKey

    const res = await fetch(props.settings.aiBubbleProxyEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mode: 'assistant',
        systemPrompt: props.settings.aiBubbleSystemPrompt || undefined,
        messages: messages.value.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    const data = await res.json()

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
  <div
    v-if="visible"
    :style="{
      position: 'fixed',
      bottom: `${bottomOffset}px`,
      [isRight ? 'right' : 'left']: '24px',
      zIndex: 9997,
    }"
  >
    <div
      v-if="open"
      :style="{
        position: 'absolute',
        bottom: '68px',
        [isRight ? 'right' : 'left']: '0',
        width: 'min(340px, calc(100vw - 48px))',
        height: 'min(480px, calc(100vh - 160px))',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
        backgroundColor: '#fff',
      }"
    >
      <div :style="{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: accentColor, color: '#fff', flexShrink: 0 }">
        <span style="font-size:20px;">💬</span>
        <div style="flex:1;min-width:0;">
          <p style="font-weight:700;font-size:14px;margin:0;">{{ assistantName }}</p>
          <p style="font-size:11px;margin:0;opacity:0.85;display:flex;align-items:center;gap:4px;">
            <span style="width:6px;height:6px;border-radius:50%;background-color:#4ade80;display:inline-block;" />
            Online
          </p>
        </div>
        <button type="button" aria-label="Close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;padding:4px;" @click="open = false">✕</button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background-color:#f8fafc;">
        <div v-if="messages.length === 0" style="text-align:center;padding-top:12px;">
          <div :style="{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 10px' }">💬</div>
          <p style="color:#334155;opacity:0.75;font-size:13px;margin-bottom:16px;">{{ greeting }}</p>
          <div v-if="starters.length > 0" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
            <button
              v-for="(s, i) in starters"
              :key="i"
              :style="{ backgroundColor: accentColor + '12', color: accentColor, border: `1px solid ${accentColor}30`, borderRadius: '16px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }"
              @click="send(s)"
            >{{ s }}</button>
          </div>
        </div>

        <div
          v-for="(msg, i) in messages"
          :key="i"
          :style="{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }"
        >
          <div
            :style="{ maxWidth: '80%', backgroundColor: msg.role === 'user' ? accentColor : '#fff', color: msg.role === 'user' ? '#fff' : '#1e293b', borderRadius: '12px', padding: '9px 12px', fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap', boxShadow: msg.role === 'assistant' ? '0 1px 2px rgba(0,0,0,0.06)' : undefined }"
            v-html="formatMessage(msg.content, msg.role === 'user' ? '#fff' : accentColor)"
          />
        </div>

        <div v-if="loading" style="background-color:#fff;border-radius:12px;padding:10px 12px;width:fit-content;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
          <div class="ai-bubble-typing" :style="{ '--dot-color': accentColor }">
            <span class="ai-bubble-d1" /><span class="ai-bubble-d2" /><span class="ai-bubble-d3" />
          </div>
        </div>

        <p v-if="error" style="color:#ef4444;font-size:12px;text-align:center;">⚠ {{ error }}</p>
        <div ref="bottomEl" />
      </div>

      <div style="padding:10px;border-top:1px solid #e2e8f0;display:flex;gap:8px;background-color:#fff;flex-shrink:0;">
        <textarea
          v-model="input"
          placeholder="Ask me anything…"
          rows="1"
          style="flex:1;resize:none;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;outline:none;font-family:inherit;"
          @keydown="onKeydown"
        />
        <button
          type="button"
          :disabled="!input.trim() || loading"
          :style="{ backgroundColor: accentColor, border: 'none', borderRadius: '8px', padding: '0 14px', cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1 }"
          @click="send(input)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>

    <button
      type="button"
      :aria-label="open ? 'Close chat' : 'Chat with us'"
      :style="{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer', backgroundColor: accentColor, boxShadow: '0 6px 16px rgba(0,0,0,0.24)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }"
      @click="open = !open"
    >
      {{ open ? '✕' : '💬' }}
    </button>
  </div>
</template>

<style scoped>
.ai-bubble-typing { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
.ai-bubble-typing span { width: 6px; height: 6px; border-radius: 50%; background-color: var(--dot-color, #2563eb); display: inline-block; }
.ai-bubble-d1 { animation: ai-bubble-dot 1.2s infinite 0s; }
.ai-bubble-d2 { animation: ai-bubble-dot 1.2s infinite 0.2s; }
.ai-bubble-d3 { animation: ai-bubble-dot 1.2s infinite 0.4s; }
@keyframes ai-bubble-dot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
</style>
