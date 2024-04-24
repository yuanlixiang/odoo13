odoo.define('yj_control_panel.FsDate', function (require) {
    "use strict";
    const createFsSelectBase = require("yj_control_panel.FsSelectBase")
    const FsSelectBase = createFsSelectBase()
    var createFsDate = () => {
      const FsDate = Vue.component("FsDate", {
        template: `
          <div>
            <div style="display: flex;">
              <FsSelectBase
                :options="symbol_options"
                :inputStyle="{'border-top-right-radius': '0px', 'border-bottom-right-radius': '0px'}"
                style="flex: 0 0 70px;"
                @input="changeHandler"
              />
              <div class="input-group date" :id="'datetimepicker_'+date_id+'_a'" data-target-input="nearest">
                <input
                  ref="inputA"
                  type="text"
                  class="form-control datetimepicker-input"
                  :data-target="'#datetimepicker_'+date_id+'_a'"
                  style="border: 1px solid #ced4da;border-left: none; border-top-left-radius: 0; border-bottom-left-radius: 0;"
                />
                <div class="input-group-append" :data-target="'#datetimepicker_'+date_id+'_a'" data-toggle="datetimepicker">
                    <div class="input-group-text" style="border-color: #aaa; border: 1px; color: #495057; background-color: #e9ecef;"><i class="fa fa-calendar"></i></div>
                </div>
              </div>
            </div>
            <div v-show="isBetween" style="display: flex; margin-top: 4px;">
              <div style="flex: 0 0 69px;" />
              <div class="input-group date" :id="'datetimepicker_'+date_id+'_b'" data-target-input="nearest">
                <input
                  ref="inputB"
                  type="text"
                  class="form-control datetimepicker-input"
                  :data-target="'#datetimepicker_'+date_id+'_b'"
                  style="border-color: #aaa;"
                />
                <div class="input-group-append" :data-target="'#datetimepicker_'+date_id+'_b'" data-toggle="datetimepicker">
                  <div class="input-group-text" style="border-color: #aaa; border: 1px; color: #495057; background-color: #e9ecef;"><i class="fa fa-calendar"></i></div>
                </div>
              </div>
            </div>
          </div>
          `,
        props: {
          date_id: {
            type: String,
            default: ''
          },
          value: {
            type: Object,
            default: () => {}
          }
        },
        data() {
          return {
            loading: false,
            isBetween: false,
            date1: '',
            date2: ''
          }
        },
        computed: {
          symbol_options() {
            if (this.value.fieldType === 'datetime') {
              return [
                {id: 1, label: '介于'}, {id: 4, label: '在之后', symbol: '>'}, {id: 5, label: '在之前', symbol: '<'},
                {id: 6, label: '迟于或等于', symbol: '>='}, {id: 7, label: '早于或等于', symbol: '<='}
              ]
            } else if (this.value.fieldType === 'date') {
              return [
                {id: 1, label: '介于'}, {id: 2, label: '等于', symbol: '='}, {id: 3, label: '不等于', symbol: '!='}, {id: 4, label: '在之后', symbol: '>'},
                {id: 5, label: '在之前', symbol: '<'}, {id: 6, label: '迟于或等于', symbol: '>='}, {id: 7, label: '早于或等于', symbol: '<='}
              ]
            }
          }
        },
        mounted() {
          if (this.value.fieldType === 'datetime') {
            $(`#datetimepicker_${this.date_id}_a`).datetimepicker({ format: 'YYYY-MM-DD hh:mm:ss' })
            $(`#datetimepicker_${this.date_id}_a`).on('change.datetimepicker', this.dateAHandler)
  
            $(`#datetimepicker_${this.date_id}_b`).datetimepicker({ format: 'YYYY-MM-DD hh:mm:ss' })
            $(`#datetimepicker_${this.date_id}_b`).on('change.datetimepicker', this.dateBHandler)
          } else if (this.value.fieldType === 'date') {
            $(`#datetimepicker_${this.date_id}_a`).datetimepicker({ format: 'YYYY-MM-DD' })
            $(`#datetimepicker_${this.date_id}_a`).on('change.datetimepicker', this.dateAHandler)
  
            $(`#datetimepicker_${this.date_id}_b`).datetimepicker({ format: 'YYYY-MM-DD' })
            $(`#datetimepicker_${this.date_id}_b`).on('change.datetimepicker', this.dateBHandler)
          }
        },
        methods: {
          changeHandler(event) {
            if (event[0].id===1) {
              this.isBetween = true
              if (this.value.domain.length === 1) {
                this.value.domain.push([this.value.domain[0][0],'',''])
              }
              this.$set(this.value.domain[0], 1, '>=')
              this.$set(this.value.domain[1], 1, '<=')
            } else {
              this.isBetween = false
              if (this.value.domain.length === 2) {
                this.value.domain.splice(1, 1)
              }
              this.$set(this.value.domain[0], 1, event[0].symbol)
            }
            this.value.description = JSON.stringify(this.value.domain)
            this.$emit('input', this.value)
          },
          dateAHandler() {
            this.$set(this.value.domain[0], 2, this.$refs.inputA.value)
            this.value.description = JSON.stringify(this.value.domain)
            this.$emit('input', this.value)
          },
          dateBHandler() {
            this.$set(this.value.domain[1], 2, this.$refs.inputB.value)
            this.value.description = JSON.stringify(this.value.domain)
            this.$emit('input', this.value)
          }
        }
      })
      return FsDate
    }
    return createFsDate;
  });