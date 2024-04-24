odoo.define('yj_control_panel.FsSelectBase', function (require) {
  "use strict";
  const createClickOutSide = require("yj_control_panel.ClickOutSide")
  
  var createFsSelectBase = () => {
    const ClickOutSide = createClickOutSide()
    const FsSelectBase = Vue.component("FsSelectBase", {
      template: `
        <ClickOutSide @click-outside="blur" @click-inside="activeHandler" class="yj-select">
          <div ref="select" class="yj-select-input-content" :style="inputStyle">
            <div class="select-area">
              <div v-if="value.length>0 && multiple" class="tag label-tag">
                <span class="tooltiptext" :style="{top: selectTop-28+'px', left: selectLeft+'px'}">{{ value[0].label }}</span>
                <div class="tag-span">{{ value[0].label }}</div>
                <div class="fa fa-close tag-close" @click="unselect(0)"></div>
              </div>
              <div v-if="value.length===1 && !multiple" class="single-label">
                {{ value[0].label }}
              </div>
              <div v-if="value.length>1" class="tag">
                +{{ value.length - 1 }}
              </div>
              <input v-show="searchable && multiple" ref="search" v-model="searchValue" class="search-input" >
            </div>
            <span v-if="value.length>0 && clearable" class="fa fa-times-circle fs-del right-icon" @click.stop="clear"></span>
            <span class="fa fa-angle-down fs-arrow right-icon" :class="{up: active}" @click.stop="arrowClick"></span>
          </div>
          <div class="options-content" :class="{unfold: active}" :style="{width: selectWidth+'px'}">
            <ul class="options">
              <li v-if="loading" class="info-option">加载中...</li>
              <li v-if="!loading && searchedOptions.length===0" class="info-option">无匹配数据</li>
              <li
                v-if="!loading && searchedOptions.length!==0 && selectAllAble"
                class="option"
                :class="{selected: searchedOptions.length===value.length}"
                @click="selectAll"
              >
                全选
                <span v-if="searchedOptions.length===value.length" class="fa fa-check option-check" style="float: right;"></span>
              </li>
              <li
                v-for="(option, i) in searchedOptions"
                :key="i"
                class="option"
                :class="{selected: selectedIds.includes(option.id)}"
                @click.stop="selectHandler(option)"
              >
                  {{option.label}}
                  <span v-if="selectedIds.includes(option.id)" class="fa fa-check option-check" style="float: right;"></span>
              </li>
            </ul>
          </div>
        </ClickOutSide>
      `,
      props: {
        clearable: { // 是否有清空按钮
          type: Boolean,
          default: false
        },
        searchable: { // 是否可搜索
          type: Boolean,
          default: false
        },
        multiple: { // 是否多选
          type: Boolean,
          default: false
        },
        can_select_all_able: { // 是否有全选功能
          type: Boolean,
          default: false
        },
        value: {
          type: Array,
          default: ()=>[]
        },
        options: { // 选项
          type: Array,
          default: ()=>[]
        },
        loading: {
          type: Boolean,
          default: false
        },
        inputStyle: {
            type: Object,
            default: {}
        }
      },
      data() {
        return {
          active: false, // 组件激活状态，下拉列表展示
          searchValue: '', // 搜索框的value
          selectWidth: 0,
          selectLeft: 0,
          selectTop: 0
        }
      },
      mounted() {
        // 监听滚动事件
        this.$nextTick(()=> {
            let selectBox = this.$refs.select && this.$refs.select.getBoundingClientRect && this.$refs.select.getBoundingClientRect()
            if (selectBox) {
                this.selectWidth = selectBox.width
                this.selectLeft = selectBox.left
                this.selectTop = selectBox.top
            }
            setTimeout(()=> {
                window.addEventListener('scroll', this.handleScroll, true)
            })
        })
      },
      destroyed () {
        window.removeEventListener('scroll', this.handleScroll)
      },
      computed: {
        // 搜索过滤后的选项
        searchedOptions() {
          return this.options.filter(item => {
            return item.label.search(this.searchValue) !== -1
          })
        },
        // 选中的id
        selectedIds() {
          if (this.value) return this.value.map(item => item.id)
          return []
        },
        selectAllAble() {
          return this.multiple && this.can_select_all_able
        }
      },
      methods: {
        handleScroll() {    
            if (this.$refs.select && this.$refs.select.getBoundingClientRect) {
                let selectBox = this.$refs.select.getBoundingClientRect()
                this.selectTop = selectBox.top
            }
        },
        arrowClick() {
          if (this.active) this.blur()
          else this.activeHandler()
        },
        activeHandler() {
          this.$refs.search.focus() // 激活阶段input始终focus
          if (this.active) return

          this.active = true
          this.$emit('active')
        },
        blur() {
          this.searchValue = ''
          this.active = false
          this.$emit('blur')
        },
        // 选择 或 删除选中
        selectHandler(option) {
          let index = this.selectedIds.indexOf(option.id)
          if (index === -1) this.select(option) // 选择
          else this.unselect(index) // 删除选中
        },
        // 全选
        selectAll() {
          if (this.value.length < this.searchedOptions.length) {
            this.$emit('input', this.searchedOptions.concat())
            this.$emit('change', 'select_all')
          } else this.clear()
        },
        // 选择一项
        select(option) {
          if (this.multiple) this.value.push(option) // 多选
          else { // 单选
            this.value = [option]
            this.blur()
          }
          this.$emit('input', this.value)

          if (this.value.length === 1) this.$emit('change', 'first_select') // 选择第一个时，其实时减少了选取范围（不选=全选），所以需要clean数据
          else this.$emit('change', 'select')
        },
        // 清空
        clear() {
          this.$emit('input', [])
          this.$emit('change', 'clear')
        },
        // 删除选中
        unselect(index) {
          this.value.splice(index, 1)
          this.$emit('input', this.value)
          this.$emit('change', 'unselect')
        }
      }
    })
    return FsSelectBase
  }
  return createFsSelectBase;
});
        