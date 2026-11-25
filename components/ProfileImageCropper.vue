<template>
  <div ref="host" />
</template>

<script>
import Croppie from 'croppie'
import 'croppie/croppie.css'

const instances = new WeakMap()

export default {
  props: {
    size: { type: Number, required: true },
  },
  mounted() {
    const host = this.$refs.host
    instances.set(
      host,
      new Croppie(host, {
        boundary: { width: this.size, height: this.size },
        viewport: {
          width: this.size - 48,
          height: this.size - 48,
          type: 'circle',
        },
        enableOrientation: true,
        enableResize: true,
      })
    )
  },
  beforeDestroy() {
    this.dispose()
  },
  beforeUnmount() {
    this.dispose()
  },
  methods: {
    bind(options) {
      return instances.get(this.$refs.host).bind(options)
    },
    result(options) {
      return instances
        .get(this.$refs.host)
        .result({ type: 'base64', ...options })
    },
    dispose() {
      const host = this.$refs.host
      instances.get(host)?.destroy()
      instances.delete(host)
    },
  },
}
</script>
