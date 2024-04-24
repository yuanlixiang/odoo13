odoo.define('yj_control_panel.ClickOutSide', function (require) {
  "use strict";

  var createClickOutSide = () => {
    const ClickOutSide = Vue.component("ClickOutSide", {
      template: `
        <div>
          <slot />
        </div>`,  
      data() {
        return {
        }
      },
      mounted() {
        window.addEventListener('click', this.message)
      },
      beforeDestroy() {
        window.removeEventListener('click', this.message)
      },
      methods: {
        message(event) {
          let path = event.path || (event.composedPath && event.composedPath())
          if (path.includes(this.$el)) this.$emit('click-inside')
          else this.$emit('click-outside')
        }
      }
    })
    return ClickOutSide
  }
  return createClickOutSide;
});
      