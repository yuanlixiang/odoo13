odoo.define("yj_control_panel.control_panel", function (require) {
  "use strict";
  var mvc = require("web.mvc");
  var ControlPanelRenderer = require("web.ControlPanelRenderer");
  var ControlPanelController = require("web.ControlPanelController");
  var Domain = require("web.Domain");
  var pyUtils = require("web.py_utils");
  var utils = require("web.utils");

  var Renderer = mvc.Renderer;
  var core = require("web.core");
  var QWeb = core.qweb;
  var searchBarAutocompleteRegistry = require("web.search_bar_autocomplete_sources_registry");

  // const createFsGroupSelect = require("yj_control_panel.FsGroupSelect");
  // const createFsSelect = require("yj_control_panel.FsSelect");
  // const createFsDate = require("yj_control_panel.FsDate");

  var controlPanel = ControlPanelRenderer.include({
    template: "control_panel.template",
    jsLibs: [
      "/yj_vue/static/src/js/vue.js",
      "/yj_vue/static/src/js/element-ui.js",
    ],
    cssLibs: ["/yj_vue/static/src/css/element-ui.css"],
    events: {},
    config: _.extend({}, ControlPanelRenderer.prototype.config, {
      Controller: ControlPanelController,
    }),
    init: function (parent, state, params) {
      this.state = state;
      this.fields = state.fields;
      this.filterFields = state.filterFields;
      this.groupBys = state.groupBys;
      this.filters = state.filters;
      this.selectData = [];
      // this.searchArr = [];
      this._super.apply(this, arguments);
    },
    start: function () {
      // todo渲染数据
      this.fetchSelectData();
      return this._super.apply(this, arguments);
    },
    createFsGroupSelect() {
      const FsGroupSelect = Vue.component("FsGroupSelect", {
        template: `
          <div tabindex="0" class="yj-group-select">
            <span class="searchview-item" :class="{selected: selectedIds.size}">
              {{group.description}}
              <span class="fa fa-angle-down arrow"></span>
            </span>
            <div class="options-content">
              <ul class="options">
                <li
                  v-for="(option, i) in group.options"
                  :key="i"
                  class="option"
                  :class="{selected: selectedIds.has(option.optionId)}"
                  @click="clickOptions(option)"
                >
                  {{option.description}}
                  <span v-if="selectedIds.has(option.optionId)" class="fa fa-check option-check" style="float: right;"></span>
                </li>
              </ul>
            </div>
          </div>`,
        props: ["group", "facets"],

        data() {
          return {
            selectedIds: new Set(),
          };
        },
        watch: {
          facets: {
            handler(val) {
              this.selectedIds = new Set();
              if (val && val.length) {
                val.map(el => {
                  el.filters && el.filters.length && el.filters.forEach((item) => {
                    if (this.group.id === item.id) {
                      this.selectedIds = item.currentOptionIds;
                    }
                  })
                })
              }
            },
            immediate: true
          },
        },
        methods: {
          clickOptions(option) {
            this.$emit("clickOptionItem", {
              groupId: this.group.id,
              optionId: option.optionId,
            });
          },
        },
      });
      return FsGroupSelect;
    },
    createFsSelectBase() {
      const ClickOutSide = this.createClickOutSide();
      const FsSelectBase = Vue.component("FsSelectBase", {
        template: `
        <ClickOutSide @click-outside="blur" @click-inside="activeHandler" class="yj-select">
          <div ref="select" class="yj-select-input-content" :style="inputStyle">
            <div class="select-area">
              <div v-if="value.length>0 && multiple" class="tag label-tag">
                <span class="tooltiptext" :style="{top: selectTop-28+'px', left: selectLeft+'px'}" v-html="value[0].label"></span>
                <div class="tag-span" v-html="value[0].label"></div>
                <div class="fa fa-close tag-close" @click="unselect(0)"></div>
              </div>
              <div v-if="value.length===1 && !multiple" class="single-label" v-html="value[0].label">
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
                  <span v-html="option.label"></span>
                  <span v-if="selectedIds.includes(option.id)" class="fa fa-check option-check" style="float: right;"></span>
              </li>
            </ul>
          </div>
        </ClickOutSide>
      `,
        props: {
          clearable: {
            // 是否有清空按钮
            type: Boolean,
            default: false,
          },
          searchable: {
            // 是否可搜索
            type: Boolean,
            default: false,
          },
          multiple: {
            // 是否多选
            type: Boolean,
            default: false,
          },
          can_select_all_able: {
            // 是否有全选功能
            type: Boolean,
            default: false,
          },
          value: {
            type: Array,
            default: () => [],
          },
          options: {
            // 选项
            type: Array,
            default: () => [],
          },
          loading: {
            type: Boolean,
            default: false,
          },
          inputStyle: {
            type: Object,
            default: {},
          },
        },
        data() {
          return {
            active: false, // 组件激活状态，下拉列表展示
            searchValue: "", // 搜索框的value
            selectWidth: 0,
            selectLeft: 0,
            selectTop: 0,
          };
        },
        mounted() {
          // 监听滚动事件
          this.$nextTick(() => {
            let selectBox =
              this.$refs.select &&
              this.$refs.select.getBoundingClientRect &&
              this.$refs.select.getBoundingClientRect();
            if (selectBox) {
              this.selectWidth = selectBox.width;
              this.selectLeft = selectBox.left;
              this.selectTop = selectBox.top;
            }
            setTimeout(() => {
              window.addEventListener("scroll", this.handleScroll, true);
            });
          });
        },
        destroyed() {
          window.removeEventListener("scroll", this.handleScroll);
        },
        computed: {
          // 搜索过滤后的选项
          searchedOptions() {
            return this.options;
          },
          // 选中的id
          selectedIds() {
            if (this.value) return this.value.map((item) => item.id);
            return [];
          },
          selectAllAble() {
            return this.multiple && this.can_select_all_able;
          },
        },
        watch: {
          searchValue(val) {
            this.$emit("active", this.searchValue);
          },
        },
        methods: {
          handleScroll() {
            if (this.$refs.select && this.$refs.select.getBoundingClientRect) {
              let selectBox = this.$refs.select.getBoundingClientRect();
              this.selectTop = selectBox.top;
            }
          },
          arrowClick() {
            if (this.active) this.blur();
            else this.activeHandler();
          },
          activeHandler() {
            this.$refs.search.focus(); // 激活阶段input始终focus
            if (this.active) return;

            this.active = true;
            this.$emit("active");
          },
          blur() {
            this.searchValue = "";
            this.active = false;
            this.$emit("blur");
          },
          // 选择 或 删除选中
          selectHandler(option) {
            let index = this.selectedIds.indexOf(option.id);
            if (index === -1) this.select(option);
            // 选择
            else this.unselect(index); // 删除选中
            this.searchValue = "";
          },
          // 全选
          selectAll() {
            if (this.value.length < this.searchedOptions.length) {
              this.$emit("input", this.searchedOptions.concat());
              this.$emit("change", "select_all");
            } else this.clear();
            this.searchValue = "";
          },
          // 选择一项
          select(option) {
            if (this.multiple) this.value.push(option);
            // 多选
            else {
              // 单选
              this.value = [option];
              this.blur();
            }
            this.$emit("input", this.value);

            if (this.value.length === 1) this.$emit("change", "first_select");
            // 选择第一个时，其实时减少了选取范围（不选=全选），所以需要clean数据
            else this.$emit("change", "select");
            this.searchValue = "";
          },
          // 清空
          clear() {
            this.$emit("input", []);
            this.$emit("change", "clear");
            this.searchValue = "";
          },
          // 删除选中
          unselect(index) {
            this.value.splice(index, 1);
            this.$emit("input", this.value);
            this.$emit("change", "unselect");
            this.searchValue = "";
          },
        },
      });
      return FsSelectBase;
    },
    createFsDate() {
      const FsSelectBase = this.createFsSelectBase();
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
            default: "",
          },
          value: {
            type: Object,
            default: () => { },
          },
        },
        data() {
          return {
            loading: false,
            isBetween: false,
            date1: "",
            date2: "",
          };
        },
        computed: {
          symbol_options() {
            if (this.value.fieldType === "datetime") {
              return [
                { id: 1, label: "介于" },
                { id: 4, label: "在之后", symbol: ">" },
                { id: 5, label: "在之前", symbol: "<" },
                { id: 6, label: "迟于或等于", symbol: ">=" },
                { id: 7, label: "早于或等于", symbol: "<=" },
              ];
            } else if (this.value.fieldType === "date") {
              return [
                { id: 1, label: "介于" },
                { id: 2, label: "等于", symbol: "=" },
                { id: 3, label: "不等于", symbol: "!=" },
                { id: 4, label: "在之后", symbol: ">" },
                { id: 5, label: "在之前", symbol: "<" },
                { id: 6, label: "迟于或等于", symbol: ">=" },
                { id: 7, label: "早于或等于", symbol: "<=" },
              ];
            }
          },
        },
        mounted() {
          if (this.value.fieldType === "datetime") {
            $(`#datetimepicker_${this.date_id}_a`).datetimepicker({
              format: "YYYY-MM-DD hh:mm:ss",
            });
            $(`#datetimepicker_${this.date_id}_a`).on(
              "change.datetimepicker",
              this.dateAHandler
            );

            $(`#datetimepicker_${this.date_id}_b`).datetimepicker({
              format: "YYYY-MM-DD hh:mm:ss",
            });
            $(`#datetimepicker_${this.date_id}_b`).on(
              "change.datetimepicker",
              this.dateBHandler
            );
          } else if (this.value.fieldType === "date") {
            $(`#datetimepicker_${this.date_id}_a`).datetimepicker({
              format: "YYYY-MM-DD",
            });
            $(`#datetimepicker_${this.date_id}_a`).on(
              "change.datetimepicker",
              this.dateAHandler
            );

            $(`#datetimepicker_${this.date_id}_b`).datetimepicker({
              format: "YYYY-MM-DD",
            });
            $(`#datetimepicker_${this.date_id}_b`).on(
              "change.datetimepicker",
              this.dateBHandler
            );
          }
        },
        methods: {
          changeHandler(event) {
            if (event[0].id === 1) {
              this.isBetween = true;
              if (this.value.domain.length === 1) {
                this.value.domain.push([this.value.domain[0][0], "", ""]);
              }
              this.$set(this.value.domain[0], 1, ">=");
              this.$set(this.value.domain[1], 1, "<=");
            } else {
              this.isBetween = false;
              if (this.value.domain.length === 2) {
                this.value.domain.splice(1, 1);
              }
              this.$set(this.value.domain[0], 1, event[0].symbol);
            }
            this.value.description = JSON.stringify(this.value.domain);
            this.$emit("input", this.value);
          },
          dateAHandler() {
            this.$set(this.value.domain[0], 2, this.$refs.inputA.value);
            this.value.description = JSON.stringify(this.value.domain);
            this.$emit("input", this.value);
          },
          dateBHandler() {
            this.$set(this.value.domain[1], 2, this.$refs.inputB.value);
            this.value.description = JSON.stringify(this.value.domain);
            this.$emit("input", this.value);
          },
        },
      });
      return FsDate;
    },
    createFsSelect: function () {
      const FsSelectBase = this.createFsSelectBase();

      const FsSelect = Vue.component("FsSelect", {
        template: `
          <FsSelectBase
            :value="value"
            :options="filter.options"
            :loading="loading"
            clearable
            searchable
            multiple
            can_select_all_able
            @input="$emit('input', $event)"
            @active="activeHandler"
            @change="changeHandler"
          />`,
        props: ["value", "filter", "context", "searchData", "selectData"],
        data() {
          return {
            loading: false,
          };
        },

        methods: {
          activeHandler(value) {
            // if (this.filter.context) {
            let domainContext = "";
            let domainContextObj = "";
            if (this.filter.context) {
              domainContext = this.filter.context.replace(/'/g, '"');
              domainContextObj = pyUtils.py_eval(domainContext);
            }

            if (this.filter.relation) {
              this.loading = true;
              let domain = [];

              if (domainContextObj) {
                if (domainContextObj.domain) {
                  for (let key of domainContextObj.domain) {
                    var obj = [key[0], key[1], key[2]];
                    domain.push(obj);
                  }
                }
                if (domainContextObj.depends) {
                  for (let key in domainContextObj.depends) {
                    let filterData = this.selectData.find((item) => {
                      return item.description === key;
                    });
                    if (filterData) {
                      let filterId = filterData.id;
                      let dependsIds = this.searchData[filterId].map(
                        (item) => item.id || item.value
                      );
                      if (dependsIds.length > 0) {
                        domain.push([
                          domainContextObj.depends[key][0],
                          "in",
                          dependsIds,
                        ]);
                      }
                    }
                  }
                }

              }
              this.filter.options = [];
              this.context
                ._getOptionsData(
                  { relation: this.filter.relation },
                  domain,
                  value
                )
                .then((res) => {
                  this.filter.options = res ? res : [];
                  // this.filter.invalid = false;
                  this.loading = false;
                  if (domainContextObj && domainContextObj.value) {
                    this.filter.options.forEach((item) => {
                      item["value"] = item[domainContextObj.value];
                    });
                  }
                });
            } else if (domainContextObj.domain) {
              this.loading = true;
              let domain = [];
              for (let key of domainContextObj.domain) {
                var obj = [key[0], key[1], key[2]];
                domain.push(obj);
              }
              this.filter.options = [];

              this.context
                ._getOptionsData(
                  { relation: this.filter.relation },
                  domain,
                  value
                )
                .then((res) => {
                  this.filter.options = res ? res : [];
                  // this.filter.invalid = false;
                  this.loading = false;

                  if (domainContextObj && domainContextObj.value) {
                    this.filter.options.forEach((item) => {
                      item["value"] = item[domainContextObj.value];
                    });
                  }
                });
            }
          },
          changeHandler(type) {
            switch (type) {
              case "clear":
                this.setInvalidAndClean({ invalid: true, clean: false });
                break;
              case "select_all":
                this.setInvalidAndClean({ invalid: true, clean: false });
                break;
              case "unselect":
                this.setInvalidAndClean({ invalid: true, clean: true });
                break;
              case "select":
                this.setInvalidAndClean({ invalid: true, clean: false });
                break;
              case "first_select":
                this.setInvalidAndClean({ invalid: true, clean: true });
                break;
              default:
                break;
            }
          },
          // 清空数据和设置失效 invalid：标记相关联的其它下拉框，激活时需要重新获取过滤后的选项。clean：清空相关联的下拉框
          setInvalidAndClean(option) {
            this.selectData.forEach((element) => {
              if (element.context) {
                try {
                  let domainContext = element.context.replace(/'/g, '"');
                  let domainContextObj = JSON.parse(domainContext);

                  for (let key in domainContextObj.depends) {
                    if (this.filter.description === key) {
                      if (option.invalid) element.invalid = true;
                      if (option.clean) {
                        this.searchData[element.id] = [];
                      }
                      return;
                    }
                  }
                } catch (err) { }
              }
            });
          },
        },
      });
      return FsSelect;
    },
    createClickOutSide: function () {
      const ClickOutSide = Vue.component("ClickOutSide", {
        template: `
        <div>
          <slot />
        </div>`,
        data() {
          return {};
        },
        mounted() {
          window.addEventListener("click", this.message);
        },
        beforeDestroy() {
          window.removeEventListener("click", this.message);
        },
        methods: {
          message(event) {
            let path =
              event.path || (event.composedPath && event.composedPath());
            if (path.includes(this.$el)) this.$emit("click-inside");
            else this.$emit("click-outside");
          },
        },
      });
      return ClickOutSide;
    },
    fetchSelectData: function () {
      if (this.filterFields.length != 0) {
        this.filterFields.forEach((el) => {
          this._getOptions(el);
        });
        // setTimeout(() => {
        //   $('.mountDOM').prepend(QWeb.render('seach.content', {
        //     selectList: this.selectList,
        //     groupBys: this.groupBys,
        //     screen: this.screen
        //   }))
        // }, 600)
      }
    },
    _getOptionsData(field, args, name) {
      var self = this;
      return this._rpc({
        model: field.relation,
        method: "name_search",
        kwargs: {
          name: name || "",
          args: args,
          limit: 999999999,
          context: this.context,
        },
      }).then(function (results) {
        if (_.isEmpty(results)) {
          return null;
        }
        return _(results).map(function (result) {
          return {
            id: result[0],
            label: _.escape(result[1]),
            facet: self._getExpandedFacetValue(result),
          };
        });
      });
    },
    _getOptions: function (filter) {
      var field = this.fields[filter.attrs.name];
      var args = field.domain;
      if (
        field.type === "char" ||
        field.type === "text" ||
        field.type === "integer" ||
        field.type === "datetime" ||
        field.type === "date"
      ) {
        this.selectData.push({
          id: filter.id,
          groupId: filter.groupId,
          description: filter.description,
          name: filter.attrs.string,
          key: filter.attrs.name,
          type: field.type,
          attrs:
            (filter.attrs.modifiers && JSON.parse(filter.attrs.modifiers)) ||
            "",
          autoCompleteValues: filter.autoCompleteValues,
          isDefault: filter.isDefault,
          defaultValue: filter.defaultValue,
        });
        return;
      }

      if (field.type === "selection") {
        let options = field.selection.map((item) => {
          return {
            value: item[0],
            id: item[0],
            label: item[1],
          };
        });
        this.selectData.push({
          id: filter.id,
          groupId: field.groupId,
          description: filter.description,
          name: filter.attrs.string,
          key: filter.attrs.name,
          context: filter.attrs.context,
          relation: field.relation,
          invalid: false,
          type: field.type,
          options: options ? options : [],
          autoCompleteValues: filter.autoCompleteValues,
          isDefault: filter.isDefault,
          defaultValue: filter.defaultValue,
        });
      }
      if (args != undefined) {
        if (typeof args === "string") {
          try {
            args = Domain.prototype.stringToArray(args);
          } catch (e) {
            args = [];
          }
        }
        this._getOptionsData(field, args).then((res) => {
          this.selectData.push({
            id: filter.id,
            groupId: field.groupId,
            description: filter.description,
            name: filter.attrs.string,
            key: filter.attrs.name,
            context: filter.attrs.context,
            relation: field.relation,
            invalid: false,
            type: field.type,
            options: res ? res : [],
            autoCompleteValues: filter.autoCompleteValues,
            isDefault: filter.isDefault,
            defaultValue: filter.defaultValue,
          });
        });
      }
    },
    _getExpandedFacetValue: function (value) {
      return {
        filter: this.filter,
        values: [{ label: value[1], value: value[0] }],
      };
    },
    on_attach_callback: function () {
      // 去除原生输入框focus事件
      // var res = this._super.apply(this, arguments);
      if (
        this.filterFields.length != 0 ||
        this.filters.length != 0 ||
        this.groupBys.length != 0
      ) {
        this._renderControlPanel();

        $(".o_cp_right .o_search_options .btn-group").hide().last().show();
      }
      // return  res
    },
    _renderControlPanel: function () {
      var context = this;
      var template = "#controlPanel";
      if (this.$el.parents().find(".modal-dialog").length !== 0) {
        this.$el.children()[2].id = "controlPanelDialog";
        template = "#controlPanelDialog";
      }

      const FsGroupSelect = this.createFsGroupSelect();
      const FsSelect = this.createFsSelect();
      const FsDate = this.createFsDate();
      this.controlPanel = new Vue({
        el: template,
        template: `
          <div class="control-panel-container">
            <div v-if="filters && filters.length>0" class="searchview-container searchview-fields">
              <div class="filter-item-label">筛选</div>
              <div v-for="(filter, i) in filters" :key="i" class="searchview-item"  >
                <FsGroupSelect v-if="filter.hasOptions" :facets="facets" :group="filter" @clickOptionItem="clickOptionItem"></FsGroupSelect>
                <span v-else class="searchview-item" :class="{selected: selectedItems.includes(filter.id)}" @click="clickItem(filter)">{{filter.description}}</span>
              </div>
            </div>
            <div v-if="groupBys && groupBys.length>0" class="searchview-container searchview-groupbys">
              <div class="filter-item-label">分组</div>
              <div v-for="(group, i) in groupBys" :key="i">
                <FsGroupSelect v-if="group.hasOptions" :facets="facets" :group="group" @clickOptionItem="clickOptionItem"></FsGroupSelect>
                <span v-else class="searchview-item" :class="{selected: selectedItems.includes(group.id)}" @click="clickItem(group)">{{group.description}}</span>
              </div>
            </div>
            <div v-if="selectData && selectData.length>0" class="row" style="align-items: flex-start;">
              <div v-for="(filter, i) in selectData" class="col-lg-3 col-md-4 col-sm-6 col-xs-12">
                <div class="filter-item">
                  <label class="filter-item-label">
                    {{filter.name}}:
                  </label>
                  <input v-model="searchData[filter.id]" v-if="filter.type==='char' || filter.type==='text' || filter.type === 'integer'" class="filter-item-input" @keyup.enter="search(true, true)"/>
                  <FsSelect
                    v-if="filter.type==='many2one' || filter.type==='many2many' || filter.type==='selection'"
                    v-model="searchData[filter.id]"
                    :selectData="selectData"
                    :filter="filter"
                    :context="context"
                    :searchData="searchData"
                    class="filter-item-content"
                  />
                  <el-date-picker
                    v-model="searchData[filter.id]['dateData']"
                    :type="dateType(searchData[filter.id], filter)"
                    range-separator="至"
                    start-placeholder=""
                    end-placeholder=""
                    size="mini"
                    v-if="searchData[filter.id] && (filter.type==='datetime' || filter.type==='date')"
                    />
                  <!--
                    :pickerOptions="dateOptionFn(searchData[filter.id], filter, pickerOptions)" 
                  -->
                  <!--
                  <FsDate v-model="searchData[filter.id]" v-if="filter.type==='datetime' || filter.type==='date'" class="filter-item-content" :date_id="filter.id" />
                  -->
                  
                </div>
              </div>
             
              <div class="col-lg-3 col-md-4 col-sm-6 col-xs-12">
                <button type="button" class="btn btn-primary" @click="search(true, true)" >搜索</button>
                <el-popover
                  placement="bottom"
                  width="300"
                  trigger="click"
                  popper-class="cantrol-panel"
                  >
                  <el-table :data="gridData" :show-header="false" size="mini">
                    <el-table-column type="selection" width="20"></el-table-column>
                    <el-table-column prop="description"></el-table-column>
                    <el-table-column width="20">
                      <template slot-scope="scope">
                        <el-button
                          @click.native.prevent="deleteRowFn(scope)"
                          type="text"
                          size="mini"
                          icon="el-icon-delete"></el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  <div style="border-bottom: 1px solid #ebeef5;padding: 5px 14px;">
                    <el-button size="mini" type="text" @click.native.prevent="collectionFn">保存当前搜索</el-button>
                  </div>
                  <div v-show="collectionData.isShow">
                    <el-input v-model="collectionData.name" placeholder="请输入内容" style="display:block;" class="input_content"></el-input>
                    <el-checkbox v-model="collectionData.isDefault" style="display:block;">默认使用</el-checkbox>
                    <el-checkbox v-model="collectionData.isShare" style="display:block;">与所有用户共享</el-checkbox>
                    <el-button type="primary" class="success-text" @click.native.prevent="collectionSave" size="mini" style="display:block;">保存</el-button>
                  </div>
                  <el-button v-if="false" slot="reference" icon="el-icon-star-on" size="mini" type="text">收藏</el-button>
                </el-popover>
              </div>
            </div>
          </div>
        `,
        components: {
          FsGroupSelect,
          FsSelect,
          FsDate,
        },
        directives: {
          preventReClick: {
            inserted: (el, binding) => {
              el.addEventListener("click", () => {
                if (!el.disabled) {
                  el.disabled = true;
                  setTimeout(() => {
                    el.disabled = false;
                  }, binding.value || 500);
                }
              });
            },
          },
        },
        data() {
          return {
            fields: context.fields,
            filterFields: context.filterFields,
            groupBys: context.groupBys,
            filters: context.filters,
            selectData: context.selectData,
            facets: context.state.facets,
            selectedItems: [],

            searchData: {},

            context: context,

            // pickerOptions: {
            //   shortcuts: [
            //     {
            //       text: "最近一周",
            //       onClick(picker) {
            //         const nowDate = moment().format("YYYY-MM-DD HH:mm:ss")
            //         const end = new Date(nowDate);
            //         const start = new Date(nowDate);
            //         start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
            //         picker.$emit("pick", [start, end]);
            //       },
            //     },
            //     {
            //       text: "最近一个月",
            //       onClick(picker) {
            //         const nowDate = moment().format("YYYY-MM-DD HH:mm:ss")
            //         const end = new Date(nowDate);
            //         const start = new Date(nowDate);
            //         start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
            //         picker.$emit("pick", [start, end]);
            //       },
            //     },
            //   ],
            // },

            value1: "",

            gridData:
              context.subMenus &&
              context.subMenus.favorite &&
              context.subMenus.favorite.items,

            collectionData: {
              isShow: false,
              name: context._title,
              isDefault: false,
              isShare: false,
            },
            isFavorite: false,
          };
        },
        created() {
          this.updateStateData();

          this.sortSelectData();
          this.setSearchData();
        },
        computed: {
          selectDataLength() {
            return this.selectData.length;
          },
        },
        watch: {
          selectDataLength() {
            this.sortSelectData();
            this.setSearchData();
          },
        },
        methods: {
          updateStateData(isInit) {
            this.selectedItems = [];
            this.isFavorite = false;
            this.facets = context.state.facets;
            context.state.facets.forEach((el) => {
              el.activeFilterIds.forEach((list) => {
                this.selectedItems = this.selectedItems.concat(list);
              });
              if (el.type === "favorite") {
                this.isFavorite = true;
                if (isInit) {
                  this.searchData = {};
                  this.setSearchData();
                }
              }
            });
          },
          // 初始化表单值
          setSearchData() {
            this.selectData.forEach((element) => {
              if (!this.searchData[element.id]) {
                if (
                  element.type === "char" ||
                  element.type === "text" ||
                  element.type === "integer"
                )
                  this.$set(this.searchData, element.id, "");
                else if (
                  element.type === "many2one" ||
                  element.type === "many2many"
                ) {
                  this.$set(this.searchData, element.id, []);
                  if (
                    element.description === "company_id" &&
                    element.isDefault &&
                    !this.isFavorite
                  ) {
                    if (
                      element.autoCompleteValues &&
                      element.autoCompleteValues.length
                    ) {
                      this.searchData[element.id] =
                        element.autoCompleteValues.map((item) => {
                          item.description = "company_id";
                          return item;
                        });
                    } else {
                      this.searchData[element.id] = [];
                    }
                  }
                } else if (
                  element.type === "datetime" ||
                  element.type === "date"
                ) {
                  this.$set(this.searchData, element.id, {
                    description: "",
                    fieldKey: element.key,
                    domain: [],
                    groupId: element.groupId,
                    id: element.id,
                    filter_id: element.id,
                    type: "filter",
                    fieldType: element.type,
                    dateData: "",
                    dateType: (element.attrs && element.attrs.type) || "",
                    other: (element.attrs && element.attrs.other) || "",  //month
                    format: (element.attrs && element.attrs.format) || "",  //format
                  });
                }
              }
            });
          },
          // 排序
          sortSelectData() {
            this.selectData.sort((a, b) => {
              let aIndex = this.filterFields.findIndex((item) => {
                return item.id === a.id;
              });
              let bIndex = this.filterFields.findIndex((item) => {
                return item.id === b.id;
              });
              return aIndex - bIndex;
            });
          },
          // 点击筛选、分组
          clickItem(event) {
            this.removeFavoriteFn();
            this.search(true);
            let index = this.selectedItems.indexOf(event.id);
            if (index === -1) this.selectedItems.push(event.id);
            else this.selectedItems.splice(index, 1);
            context.trigger_up("menu_item_clicked", { id: event.id });
          },
          // 点击分组中的下拉选项
          clickOptionItem(event) {
            this.removeFavoriteFn();
            this.search(true);
            context.trigger_up("item_option_clicked", {
              id: event.groupId,
              optionId: event.optionId,
            });
          },
          // 搜索
          search(noSearch, isQuery) {
            for (let filterId in this.searchData) {
              if (Array.isArray(this.searchData[filterId])) {
                // 下拉选择搜索
                if (this.searchData[filterId].length > 0) {
                  let autoCompleteValues = [];
                  this.searchData[filterId].forEach((element) => {
                    autoCompleteValues.push({
                      label: element.label,
                      value: element.value || element.id || element.label,
                    });
                  });
                  this.removeFavoriteFn();
                  context.trigger_up("autocompletion_filter", {
                    filterId,
                    autoCompleteValues,
                    noSearch,
                  });
                } else {
                  this.facetRemovedFn(filterId);
                }
              } else if (
                this.searchData[filterId].fieldType === "datetime" ||
                this.searchData[filterId].fieldType === "date"
              ) {
                // 时间
                let group = context.state.facets.find((el) => {
                  return filterId === el.filters[0]["filter_id"];
                });
                if (group) {
                  context.trigger_up("facet_removed", {
                    group,
                    noSearch: true,
                  });
                }

                let filter = JSON.parse(
                  JSON.stringify(this.searchData[filterId])
                );
                if (
                  filter.dateData &&
                  typeof filter.dateData == "object" &&
                  filter.dateData.length
                ) {
                  filter.dateData.forEach((item, index) => {
                    let dateTime = moment(item).valueOf();
                    if (index === 1) {
                      dateTime += 24 * 60 * 60 * 1000;
                    }
                    let l = [
                      filter.fieldKey,
                      index == 0 ? ">=" : "<",
                      this.setDateInfo(filter, dateTime)
                    ];
                    filter.domain.push(l);
                  });
                } else if (
                  filter.dateData &&
                  typeof filter.dateData == "string"
                ) {
                  let l = [
                    filter.fieldKey,
                    ">=",
                    this.setDateInfo(filter, filter.dateData)
                  ];
                  filter.domain.push(l);
                }
                if (filter.domain.length > 0) {
                  filter.domain = JSON.stringify(filter.domain);
                  this.removeFavoriteFn();
                  context.trigger_up("new_filters", {
                    filters: [filter],
                    noSearch,
                  });
                }
              } else {
                // 输入搜索
                let searchLabel = this.searchData[filterId].trim();
                if (searchLabel) {
                  let searchArr = searchLabel.split(",");
                  let autoCompleteValues = [];
                  searchArr.forEach((element) => {
                    if (element.trim())
                      autoCompleteValues.push({
                        label: element.trim(),
                        value: element.trim(),
                      });
                  });
                  this.removeFavoriteFn();
                  context.trigger_up("autocompletion_filter", {
                    filterId,
                    autoCompleteValues,
                    noSearch,
                  });
                } else {
                  this.facetRemovedFn(filterId);
                }
              }
            }
            if (isQuery) {
              context.trigger_up("search_click");
            }
          },
          getCookie(cname) {
            let name = cname + "=";
            let ca = document.cookie.split(";");
            for (let i = 0; i < ca.length; i++) {
              let c = ca[i].trim();
              if (c.indexOf(name) == 0)
                return c.substring(name.length, c.length);
            }
            return "";
          },
          facetRemovedFn(filterId) {
            let group = context.state.facets.find((el) => {
              return filterId === el.activeFilterIds[0][0];
            });
            if (group)
              context.trigger_up("facet_removed", { group, noSearch: true });
          },
          removeFavoriteFn() {
            let group = context.state.facets.find((el) => {
              return el.type === "favorite";
            });
            if (group)
              context.trigger_up("facet_removed", { group, noSearch: true });
          },
          // 日期判断
          dateType(info, filter) {
            console.log(info, filter, 'info, filter')
            let state = "date";
            if (info.dateType == 'single') {
              if (info.other) {
                state = info.other;
              } else {
                state = filter.type === 'datetime' ? 'datetime' : 'date';
              }
            } else {
              if (info.other) {
                state = info.other;
              } else {
                state = filter.type === 'datetime' ? 'daterange' : 'daterange';
              }
            }
            return state;
          },
          // dateOptionFn(info, filter, ob) {
          //   if (info.dateType == 'single') {
          //     return {}
          //   }
          //   return ob;
          // },
          // put date
          setDateInfo(filter, date) {
            let info = ""
            if (filter.other) {
              info = moment(date).format(filter.format);
            } else if (filter.fieldType == "date") {
              info = moment(date).format("YYYY-MM-DD");
            } else {
              info = moment(date).utc().format("YYYY-MM-DD HH:mm:ss");
            }
            return info;
          }
        },
      });
    },
    updateState: function () {
      var _self = this;
      return this._super.apply(this, arguments).then((res) => {
        _self.controlPanel &&
          _self.controlPanel.updateStateData &&
          _self.controlPanel.updateStateData(true);
      });
    },
  });

  return controlPanel;
});
