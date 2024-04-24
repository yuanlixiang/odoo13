odoo.define("yj_control_panel.FsSelect", function (require) {
  "use strict";
  const createFsSelectBase = require("yj_control_panel.FsSelectBase");
  var pyUtils = require("web.py_utils");
  const FsSelectBase = createFsSelectBase();
  var createFsSelect = () => {
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
        activeHandler() {
          if (this.filter.context) {
            let domainContext = this.filter.context.replace(/'/g, '"');
            let domainContextObj = pyUtils.py_eval(domainContext);
            if (domainContextObj.domain) {
              this.loading = true;
              let domain = [];
              for (let key of domainContextObj.domain) {
                var obj = [key[0], key[1], key[2]];
                domain.push(obj);
              }
              this.filter.options = [];
              this.context
                ._getOptionsData({ relation: this.filter.relation }, domain)
                .then((res) => {
                  this.filter.options = res ? res : [];
                  this.filter.invalid = false;
                  this.loading = false;
                });
            }
            // 需要是从后端拉取数据
            if (this.filter.invalid) {
              this.loading = true;
              let domain = [];
              for (let key in domainContextObj.depends) {
                let filterId = this.selectData.find((item) => {
                  return item.description === key;
                }).id;
                // [{id:1},{id:2}]  => '1,2'
                let dependsIds = this.searchData[filterId].map(
                  (item) => item.id
                );
                if (dependsIds.length > 0) {
                  domain.push([
                    domainContextObj.depends[key][0],
                    "in",
                    dependsIds,
                  ]);
                }
              }
              this.filter.options = [];
              this.context
                ._getOptionsData({ relation: this.filter.relation }, domain)
                .then((res) => {
                  this.filter.options = res ? res : [];
                  this.filter.invalid = false;
                  this.loading = false;
                });
            }

            if (domainContextObj.value) {
              this.filter.options.forEach((item) => {
                item["value"] = item[domainContextObj.value];
              });
            }
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
              } catch (err) {}
            }
          });
        },
      },
    });
    return FsSelect;
  };
  return createFsSelect;
});
