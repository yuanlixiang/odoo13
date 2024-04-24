odoo.define('yj_control_panel.FsGroupSelect', function (require) {
    "use strict";
  
    var createFsGroupSelect = () => {
      const FsGroupSelect = Vue.component("FsGroupSelect", {
        template: `
          <div tabindex="0" class="yj-group-select">
            <span class="searchview-item" :class="{selected: selectedIds.length>0}">
              {{group.description}}
              <span class="fa fa-angle-down arrow"></span>
            </span>
            <div class="options-content">
              <ul class="options">
                <li
                  v-for="(option, i) in group.options"
                  :key="i"
                  class="option"
                  :class="{selected: selectedIds.includes(option.optionId)}"
                  @click="clickOptions(option)"
                >
                  {{option.description}}
                  <span v-if="selectedIds.includes(option.optionId)" class="fa fa-check option-check" style="float: right;"></span>
                </li>
              </ul>
            </div>
          </div>`,
        props: ['group'],
        data() {
          return {
            selectedIds: []
          }
        },
        methods: {
          clickOptions(option) {
            this.$emit('clickOptionItem', { groupId: this.group.id, optionId: option.optionId })
            let index = this.selectedIds.indexOf(option.optionId)
            if ( index === -1 )
              this.selectedIds.push(option.optionId)
            else
              this.selectedIds.splice(index, 1)
          }
        }
      })
      return FsGroupSelect
    }
    return createFsGroupSelect;
  });
        