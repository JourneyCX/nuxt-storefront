<script setup lang="ts">
import { ref, computed } from 'vue'

type StepMeta = { title: string; description: string; icon: string }
type FieldType = 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox'
type FormField = { step: number; type: FieldType; label: string; placeholder: string; required: boolean; options: string }

const props = withDefaults(defineProps<{
  headline?: string
  subheadline?: string
  submitEndpoint?: string
  submitButtonText?: string
  successMessage?: string
  showProgress?: 'bar' | 'steps' | 'both' | 'none'
  accentColor?: string
  backgroundColor?: string
  cardColor?: string
  textColor?: string
  borderColor?: string
  borderRadius?: number
  steps?: StepMeta[]
  fields?: FormField[]
}>(), {
  headline: '',
  subheadline: '',
  submitEndpoint: '',
  submitButtonText: 'Submit Request',
  successMessage: 'Request received! We\'ll be in touch within 24 hours.',
  showProgress: 'both',
  accentColor: '#2563eb',
  backgroundColor: '#f8fafc',
  cardColor: '#ffffff',
  textColor: '#1e293b',
  borderColor: '#e2e8f0',
  borderRadius: 16,
  steps: () => [],
  fields: () => [],
})

type Status = 'idle' | 'loading' | 'success' | 'error'

const currentStep = ref(0)
const formData = ref<Record<string, string>>({})
const errors = ref<Record<string, boolean>>({})
const status = ref<Status>('idle')
const errMsg = ref('')

const totalSteps = computed(() => props.steps.length)
const stepFields = computed(() => props.fields.filter(f => f.step === currentStep.value + 1))
const isLastStep = computed(() => currentStep.value === totalSteps.value - 1)
const currentStepMeta = computed(() => props.steps[currentStep.value])

function fieldOptions(field: FormField) {
  return field.options ? field.options.split(',').map(o => o.trim()).filter(Boolean) : []
}

function fieldValue(label: string) {
  return formData.value[label] || ''
}

function setFieldValue(label: string, v: string) {
  formData.value = { ...formData.value, [label]: v }
}

function validate() {
  const newErrors: Record<string, boolean> = {}
  let valid = true
  stepFields.value.forEach(f => {
    if (f.required && !fieldValue(f.label).trim()) {
      newErrors[f.label] = true
      valid = false
    }
  })
  errors.value = newErrors
  return valid
}

function next() {
  if (validate()) currentStep.value = Math.min(currentStep.value + 1, totalSteps.value - 1)
}

function prev() {
  currentStep.value = Math.max(currentStep.value - 1, 0)
  errors.value = {}
}

async function submit() {
  if (!validate()) return
  status.value = 'loading'
  if (!props.submitEndpoint) {
    setTimeout(() => { status.value = 'success' }, 900)
    return
  }
  try {
    const res = await fetch(props.submitEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value),
    })
    status.value = res.ok ? 'success' : 'error'
    if (!res.ok) errMsg.value = `Server returned ${res.status}`
  } catch (e: unknown) {
    status.value = 'error'
    errMsg.value = e instanceof Error ? e.message : 'Network error'
  }
}

function startOver() {
  status.value = 'idle'
  currentStep.value = 0
  formData.value = {}
}

const inputBase = (hasError: boolean) => ({
  width: '100%',
  padding: '11px 14px',
  border: `1.5px solid ${hasError ? '#ef4444' : '#e2e8f0'}`,
  borderRadius: '8px',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box' as const,
  backgroundColor: '#fff',
  color: '#1e293b',
  fontFamily: 'inherit',
})
</script>

<template>
  <section :style="{ backgroundColor, padding: '64px 24px' }">
    <div style="max-width:640px;margin:0 auto;">

      <template v-if="status === 'success'">
        <div :style="{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', backgroundColor: cardColor, borderRadius: borderRadius + 'px', padding: '56px 48px', boxShadow: '0 8px 40px rgba(0,0,0,0.09)', border: `1px solid ${borderColor}` }">
          <div style="width:64px;height:64px;border-radius:50%;background-color:#10b98118;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 :style="{ color: textColor, fontSize: '24px', fontWeight: 800, margin: '0 0 12px' }">{{ successMessage }}</h3>
          <button
            :style="{ marginTop: '20px', backgroundColor: accentColor, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }"
            @click="startOver"
          >
            Start Over
          </button>
        </div>
      </template>

      <template v-else>
        <div v-if="headline || subheadline" style="text-align:center;margin-bottom:36px;">
          <h2 v-if="headline" :style="{ color: textColor, fontSize: '30px', fontWeight: 800, margin: '0 0 10px' }">{{ headline }}</h2>
          <p v-if="subheadline" :style="{ color: textColor, opacity: 0.65, fontSize: '16px', margin: 0, lineHeight: 1.65 }">{{ subheadline }}</p>
        </div>

        <div :style="{ backgroundColor: cardColor, borderRadius: borderRadius + 'px', padding: '40px 44px', boxShadow: '0 8px 40px rgba(0,0,0,0.09)', border: `1px solid ${borderColor}` }">

          <div v-if="showProgress === 'bar' || showProgress === 'both'" :style="{ height: '4px', backgroundColor: accentColor + '20', borderRadius: '2px', overflow: 'hidden', marginBottom: '32px' }">
            <div :style="{ height: '100%', width: `${((currentStep + 1) / totalSteps) * 100}%`, backgroundColor: accentColor, borderRadius: '2px', transition: 'width 0.4s ease' }" />
          </div>

          <div v-if="(showProgress === 'steps' || showProgress === 'both') && totalSteps > 1" style="display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:32px;flex-wrap:wrap;">
            <div v-for="(s, i) in steps" :key="i" style="display:flex;align-items:center;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                <div :style="{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: i <= currentStep ? accentColor : accentColor + '20',
                  color: i <= currentStep ? '#fff' : accentColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: (i < currentStep ? 16 : 14) + 'px',
                  fontWeight: 700,
                  transition: 'all 0.3s',
                  border: i === currentStep ? `3px solid ${accentColor}` : 'none',
                  boxShadow: i === currentStep ? `0 0 0 3px ${accentColor}25` : 'none',
                }">
                  {{ i < currentStep ? '✓' : (s.icon || i + 1) }}
                </div>
                <span :style="{ fontSize: '11px', color: i === currentStep ? accentColor : textColor, opacity: i === currentStep ? 1 : 0.5, fontWeight: i === currentStep ? 700 : 400, whiteSpace: 'nowrap' }">{{ s.title }}</span>
              </div>
              <div v-if="i < steps.length - 1" :style="{ width: '40px', height: '2px', backgroundColor: i < currentStep ? accentColor : accentColor + '20', margin: '0 4px 22px', transition: 'background-color 0.3s' }" />
            </div>
          </div>

          <div style="margin-bottom:28px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
              <span v-if="currentStepMeta?.icon" style="font-size:24px;">{{ currentStepMeta.icon }}</span>
              <h3 :style="{ color: textColor, fontSize: '20px', fontWeight: 800, margin: 0 }">{{ currentStepMeta?.title }}</h3>
            </div>
            <p v-if="currentStepMeta?.description" :style="{ color: textColor, opacity: 0.6, fontSize: '14px', margin: 0, lineHeight: 1.6 }">{{ currentStepMeta.description }}</p>
          </div>

          <div style="display:flex;flex-direction:column;gap:18px;">
            <template v-if="stepFields.length > 0">
              <div v-for="(field, i) in stepFields" :key="i">
                <label v-if="field.type !== 'checkbox'" :style="{ display: 'block', fontSize: '13px', fontWeight: 600, color: textColor, marginBottom: '6px', opacity: 0.8 }">
                  {{ field.label }}<span v-if="field.required" style="color:#ef4444;margin-left:3px;">*</span>
                </label>

                <textarea v-if="field.type === 'textarea'"
                  :value="fieldValue(field.label)"
                  @input="setFieldValue(field.label, ($event.target as HTMLTextAreaElement).value)"
                  :placeholder="field.placeholder" rows="4"
                  :style="{ ...inputBase(!!errors[field.label]), resize: 'vertical' }" />

                <select v-else-if="field.type === 'select'"
                  :value="fieldValue(field.label)"
                  @change="setFieldValue(field.label, ($event.target as HTMLSelectElement).value)"
                  :style="{ ...inputBase(!!errors[field.label]), cursor: 'pointer', appearance: 'auto' }">
                  <option value="">— Select —</option>
                  <option v-for="(o, oi) in fieldOptions(field)" :key="oi" :value="o">{{ o }}</option>
                </select>

                <div v-else-if="field.type === 'radio'" style="display:flex;flex-direction:column;gap:10px;">
                  <label v-for="(o, oi) in fieldOptions(field)" :key="oi" style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:15px;color:#1e293b;">
                    <input type="radio" :checked="fieldValue(field.label) === o" @change="setFieldValue(field.label, o)" style="accent-color:#2563eb;width:17px;height:17px;" />
                    {{ o }}
                  </label>
                </div>

                <label v-else-if="field.type === 'checkbox'" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                  <input type="checkbox" :checked="fieldValue(field.label) === 'true'" @change="setFieldValue(field.label, ($event.target as HTMLInputElement).checked ? 'true' : '')" style="width:17px;height:17px;margin-top:2px;accent-color:#2563eb;" />
                  <span style="font-size:14px;color:#1e293b;line-height:1.5;">{{ field.placeholder || field.label }}</span>
                </label>

                <input v-else
                  :type="field.type"
                  :value="fieldValue(field.label)"
                  @input="setFieldValue(field.label, ($event.target as HTMLInputElement).value)"
                  :placeholder="field.placeholder"
                  :style="inputBase(!!errors[field.label])" />

                <p v-if="errors[field.label]" style="color:#ef4444;font-size:12px;margin:4px 0 0;">This field is required.</p>
              </div>
            </template>
            <div v-else :style="{ padding: '20px', textAlign: 'center', backgroundColor: accentColor + '08', borderRadius: '8px', border: `1px dashed ${accentColor}40` }">
              <p :style="{ color: textColor, opacity: 0.5, fontSize: '14px', margin: 0 }">No fields assigned to Step {{ currentStep + 1 }} yet.</p>
            </div>
          </div>

          <p v-if="status === 'error'" style="color:#ef4444;font-size:13px;margin-top:14px;">⚠ {{ errMsg || 'Something went wrong. Please try again.' }}</p>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:32px;">
            <button
              :disabled="currentStep === 0"
              :style="{ backgroundColor: 'transparent', color: textColor, border: `1.5px solid ${borderColor}`, padding: '11px 24px', borderRadius: '8px', cursor: currentStep === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px', opacity: currentStep === 0 ? 0.35 : 1 }"
              @click="prev"
            >
              ← Back
            </button>
            <span :style="{ color: textColor, opacity: 0.4, fontSize: '13px' }">Step {{ currentStep + 1 }} of {{ totalSteps }}</span>
            <button v-if="isLastStep"
              :disabled="status === 'loading'"
              :style="{ backgroundColor: accentColor, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', opacity: status === 'loading' ? 0.6 : 1 }"
              @click="submit"
            >
              {{ status === 'loading' ? 'Submitting…' : submitButtonText }}
            </button>
            <button v-else
              :style="{ backgroundColor: accentColor, color: '#fff', border: 'none', padding: '11px 28px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }"
              @click="next"
            >
              Next →
            </button>
          </div>
        </div>
      </template>

    </div>
  </section>
</template>
