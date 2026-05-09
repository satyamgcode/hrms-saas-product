<script setup>
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import { ref , watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const text = ref(props.modelValue);

const options = ref({
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }],
      ['clean'],
    ],
  },
  placeholder: 'Write something...',
  theme: 'snow',
});

const onTextChange = (delta, oldDelta, source) => {
  emit('update:modelValue', text.value);
};

const onContentUpdate = (content) => {
  emit('update:modelValue', text.value);
};

const onToolbarUpdate = (toolbar) => {
  emit('update:modelValue', text.value);
};

const onReady = () => {
  emit('update:modelValue', text.value);
};

const onFocus = () => { 
  emit('update:modelValue', text.value);  
};

const onBlur = () => {
  emit('update:modelValue', text.value);
};

const onSelectionChange = () => {
  emit('update:modelValue', text.value);
};

const onChange = () => {
  emit('update:modelValue', text.value);
};  

const onScroll = () => {
  emit('update:modelValue', text.value);
};

watch(() => props.modelValue, (value) => {
  text.value = value;
});

watch(() => text.value, (value) => {  
  emit('update:modelValue', value);
});

watch(() => props.modelValue, (value) => {
  text.value = value;
});

</script>

<template>
  <div class="mt-[6px] flex-col justify-between border-gray-300 bg-white text-md font-normal"  >
    <QuillEditor
      theme="snow"
      placeholder="Write something..."  
      v-model="text"
      :options="options"
      @text-change="onTextChange"
      @update:content="onContentUpdate"
      @update:toolbar="onToolbarUpdate"
      @ready="onReady"
      @focus="onFocus"
      @blur="onBlur"
      @selection-change="onSelectionChange"
      @change="onChange"
      @scroll="onScroll"
      ref="editor"
    />
  </div>
</template>
