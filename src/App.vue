<template>
  <router-view />
</template>

<script setup>
</script>

<style>
/* Global styles */
:root {
  --brand-purple: #8A3EEA;
  --brand-orange: #F3901B;
}

.text-brand-purple { color: var(--brand-purple); }
.bg-brand-purple { background-color: var(--brand-purple); }
.text-brand-orange { color: var(--brand-orange); }
.bg-brand-orange { background-color: var(--brand-orange); }

.bg-brand-purple\/10 { background-color: rgba(138, 62, 234, 0.1); }
.border-brand-purple\/20 { border-color: rgba(138, 62, 234, 0.2); }
</style>
