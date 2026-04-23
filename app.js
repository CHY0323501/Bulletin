/* ============================================================
 * app.js — 公告維護頁
 * DevExtreme 24.1.3 + jQuery
 * ============================================================
 * 依賴：data.js（APP_CONFIG / helpers / mock* / dataService）
 *
 *   1. state         — 目前編輯中的公告暫存
 *   2. dataGrid      — 公告列表
 *   3. popup         — 新增/編輯彈窗（含三個 Tab）
 *   4. attachments   — 附件清單與上傳
 *   5. surveyEditor  — 問卷題目編輯
 *   6. surveyResult  — 作答結果統計
 * ============================================================ */

// (data-layer 已移至 data.js)

// ============================================================
// 4. state — 目前編輯中的公告暫存
// ============================================================
const editingState = {
    isCreate: true,
    announcement: null,            // 編輯中的公告物件 (淺複製)
    existingAttachments: [],       // [{ ...file, _removed: bool }]
    newFiles: [],                  // File 物件陣列
    surveyQuestions: []            // 編輯中的題目（複製，按下儲存才寫回）
};

function resetEditingState() {
    editingState.isCreate = true;
    editingState.announcement = null;
    editingState.existingAttachments = [];
    editingState.newFiles = [];
    editingState.surveyQuestions = [];
}


// ============================================================
// 6. dataGrid — 公告列表
// ============================================================
let gridInstance = null;
let categoriesCache = [];

function initDataGrid() {
    return Promise.all([
        dataService.getCategories(),
        dataService.getAnnouncements()
    ]).then(([categories, announcements]) => {
        categoriesCache = categories;

        gridInstance = $('#announcementGrid').dxDataGrid({
            dataSource: announcements,
            keyExpr: 'id',
            showBorders: true,
            showRowLines: true,
            rowAlternationEnabled: true,
            columnAutoWidth: true,
            wordWrapEnabled: true,
            paging: { pageSize: 10 },
            pager: {
                visible: true,
                showInfo: true,
                showPageSizeSelector: true,
                allowedPageSizes: [10, 20, 50]
            },
            searchPanel: { visible: true, width: 280, placeholder: '搜尋標題 / 內容...' },
            headerFilter: { visible: true },
            filterRow: { visible: true },
            toolbar: {
                items: [
                    {
                        location: 'before',
                        widget: 'dxButton',
                        options: {
                            icon: 'plus',
                            text: '新增公告',
                            type: 'default',
                            stylingMode: 'contained',
                            onClick: () => openAnnouncementPopup(null)
                        }
                    },
                    'searchPanel'
                ]
            },
            columns: [
                {
                    dataField: 'title',
                    caption: '標題',
                    minWidth: 220
                },
                {
                    dataField: 'categoryId',
                    caption: '類別',
                    width: 130,
                    lookup: {
                        dataSource: categoriesCache,
                        valueExpr: 'id',
                        displayExpr: 'name'
                    }
                },
                {
                    dataField: 'importance',
                    caption: '重要程度',
                    width: 100,
                    alignment: 'center',
                    lookup: {
                        dataSource: APP_CONFIG.importance,
                        valueExpr: 'value',
                        displayExpr: 'text'
                    },
                    cellTemplate: (cell, info) => {
                        const isHigh = info.value === 'high';
                        const text = isHigh ? '重要' : '一般';
                        const cls = isHigh ? 'importance-high' : 'importance-normal';
                        cell.append(`<span class="importance-pill ${cls}">${text}</span>`);
                    }
                },
                {
                    dataField: 'surveyType',
                    caption: '問卷',
                    width: 110,
                    alignment: 'center',
                    lookup: {
                        dataSource: APP_CONFIG.surveyTypes,
                        valueExpr: 'value',
                        displayExpr: 'text'
                    },
                    cellTemplate: (cell, info) => {
                        const map = { none: '無', single: '單選', multi: '多選' };
                        const cls = info.value === 'none' ? 'survey-tag none' : 'survey-tag';
                        cell.append(`<span class="${cls}">${map[info.value] || '-'}</span>`);
                    }
                },
                {
                    caption: '附件數',
                    width: 80,
                    alignment: 'center',
                    allowFiltering: false,
                    allowSorting: false,
                    calculateCellValue: row => (row.attachments || []).length
                },
                {
                    dataField: 'enabled',
                    caption: '啟用',
                    width: 80,
                    alignment: 'center',
                    dataType: 'boolean'
                },
                {
                    dataField: 'createdAt',
                    caption: '建立時間',
                    dataType: 'datetime',
                    width: 150,
                    format: 'yyyy-MM-dd HH:mm'
                },
                {
                    type: 'buttons',
                    caption: '操作',
                    width: 160,
                    buttons: [
                        {
                            hint: '編輯',
                            icon: 'edit',
                            onClick: e => openAnnouncementPopup(e.row.data)
                        },
                        {
                            hint: '作答結果',
                            icon: 'chart',
                            visible: e => e.row.data.surveyType !== 'none',
                            onClick: e => openSurveyResultPopup(e.row.data)
                        },
                        {
                            hint: '刪除',
                            icon: 'trash',
                            onClick: e => confirmDeleteAnnouncement(e.row.data)
                        }
                    ]
                }
            ]
        }).dxDataGrid('instance');
    });
}

function refreshGrid() {
    return dataService.getAnnouncements().then(rows => {
        gridInstance.option('dataSource', rows);
    });
}

function confirmDeleteAnnouncement(row) {
    const dialog = DevExpress.ui.dialog.confirm(
        `確定要刪除公告「${row.title}」嗎？此動作無法復原。`,
        '刪除確認'
    );
    dialog.done(yes => {
        if (!yes) return;
        dataService.deleteAnnouncement(row.id).then(() => {
            helpers.notify('公告已刪除', 'success');
            refreshGrid();
        });
    });
}

// ============================================================
// 7. popup — 主彈窗 (placeholders, 細節在後續區塊)
// ============================================================
let popupInstance = null;
let tabPanelInstance = null;

function openAnnouncementPopup(row) {
    resetEditingState();

    if (row) {
        editingState.isCreate = false;
        editingState.announcement = helpers.deepClone(row);
        editingState.existingAttachments = (row.attachments || []).map(f =>
            Object.assign({ _removed: false }, f)
        );
        editingState.surveyQuestions = helpers.deepClone(row.surveyQuestions || []);
    } else {
        editingState.isCreate = true;
        editingState.announcement = {
            id: null,
            title: '',
            content: '',
            categoryId: categoriesCache[0] ? categoriesCache[0].id : null,
            importance: 'normal',
            enabled: true,
            attachments: [],
            surveyType: 'none',
            surveyQuestions: []
        };
    }

    if (!popupInstance) {
        buildAnnouncementPopup();
    }

    popupInstance.option('title',
        editingState.isCreate ? '新增公告' : `編輯公告 — ${editingState.announcement.title}`
    );
    popupInstance.show(); // onShowing handler 會在內容掛好後 render
}

function buildAnnouncementPopup() {
    popupInstance = $('#announcementPopup').dxPopup({
        width: 880,
        height: 720,
        showCloseButton: true,
        dragEnabled: true,
        hideOnOutsideClick: false,
        onShowing: () => {
            if (tabPanelInstance) tabPanelInstance.option('selectedIndex', 0);
            renderPopupContent();
        },
        contentTemplate: container => {
            $(container).css({ padding: 0, height: '100%' });
            const $tab = $('<div style="height:100%">').appendTo($(container));
            tabPanelInstance = $tab.dxTabPanel({
                height: '100%',
                animationEnabled: true,
                swipeEnabled: false,
                deferRendering: false,
                items: [
                    {
                        title: '基本資料',
                        template: (data, index, element) => {
                            $('<div id="tabBasic" class="popup-form">').appendTo($(element));
                        }
                    },
                    {
                        title: '問卷設定',
                        template: (data, index, element) => {
                            $('<div id="tabSurvey" class="popup-form">').appendTo($(element));
                        }
                    },
                    {
                        title: '作答結果',
                        template: (data, index, element) => {
                            $('<div id="tabResult" class="popup-form">').appendTo($(element));
                        }
                    }
                ]
            }).dxTabPanel('instance');
        },
        toolbarItems: [
            {
                widget: 'dxButton',
                toolbar: 'bottom',
                location: 'after',
                options: {
                    text: '儲存',
                    type: 'default',
                    stylingMode: 'contained',
                    icon: 'save',
                    onClick: handleSaveAnnouncement
                }
            },
            {
                widget: 'dxButton',
                toolbar: 'bottom',
                location: 'after',
                options: {
                    text: '取消',
                    stylingMode: 'outlined',
                    onClick: () => popupInstance.hide()
                }
            }
        ]
    }).dxPopup('instance');
}

// 把三個 tab 的內容都 render 出來（區塊 8-10 會實作）
function renderPopupContent() {
    renderBasicTab();
    renderSurveyTab();
    renderResultTab();
}

// ----- 儲存 -----
function handleSaveAnnouncement() {
    // 拉取目前各表單欄位的值（由各 render 函式註冊到 editingState.announcement）
    const a = editingState.announcement;

    if (!a.title || !a.title.trim()) {
        helpers.notify('請輸入公告標題', 'error');
        if (tabPanelInstance) tabPanelInstance.option('selectedIndex', 0);
        return;
    }
    if (!a.categoryId) {
        helpers.notify('請選擇公告類別', 'error');
        if (tabPanelInstance) tabPanelInstance.option('selectedIndex', 0);
        return;
    }

    // 問卷驗證
    if (a.surveyType !== 'none') {
        if (!editingState.surveyQuestions.length) {
            helpers.notify('問卷至少需要一題', 'error');
            if (tabPanelInstance) tabPanelInstance.option('selectedIndex', 1);
            return;
        }
        for (let i = 0; i < editingState.surveyQuestions.length; i++) {
            const q = editingState.surveyQuestions[i];
            if (!q.text || !q.text.trim()) {
                helpers.notify(`第 ${i + 1} 題尚未填寫題目`, 'error');
                if (tabPanelInstance) tabPanelInstance.option('selectedIndex', 1);
                return;
            }
            if (!q.options || q.options.length < 2) {
                helpers.notify(`第 ${i + 1} 題至少需要 2 個選項`, 'error');
                if (tabPanelInstance) tabPanelInstance.option('selectedIndex', 1);
                return;
            }
            for (let j = 0; j < q.options.length; j++) {
                if (!q.options[j].text || !q.options[j].text.trim()) {
                    helpers.notify(`第 ${i + 1} 題第 ${j + 1} 個選項尚未填寫`, 'error');
                    if (tabPanelInstance) tabPanelInstance.option('selectedIndex', 1);
                    return;
                }
            }
        }
        a.surveyQuestions = helpers.deepClone(editingState.surveyQuestions);
    } else {
        a.surveyQuestions = [];
    }

    const removedIds = editingState.existingAttachments
        .filter(f => f._removed)
        .map(f => f.id);

    dataService.saveAnnouncement({
        announcement: a,
        removedAttachmentIds: removedIds,
        newFiles: editingState.newFiles
    }).then(() => {
        helpers.notify(editingState.isCreate ? '公告已新增' : '公告已更新', 'success');
        popupInstance.hide();
        refreshGrid();
    });
}

// ============================================================
// 7a. 基本資料 Tab
// ============================================================
function renderBasicTab() {
    const $tab = $('#tabBasic').empty();
    const a = editingState.announcement;

    // --- 標題 ---
    const $titleRow = $(`
        <div class="field-row">
            <label class="field-label">公告標題<span class="required-mark">*</span></label>
            <div class="js-title"></div>
        </div>
    `).appendTo($tab);
    $titleRow.find('.js-title').dxTextBox({
        value: a.title,
        placeholder: '請輸入公告標題',
        maxLength: 100,
        onValueChanged: e => { a.title = e.value; }
    });

    // --- 類別 + 重要程度 + 啟用 (一列三欄) ---
    const $row2 = $(`
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr 140px;gap:16px;">
            <div>
                <label class="field-label">公告類別<span class="required-mark">*</span></label>
                <div class="js-category"></div>
            </div>
            <div>
                <label class="field-label">重要程度</label>
                <div class="js-importance"></div>
            </div>
            <div>
                <label class="field-label">啟用</label>
                <div class="js-enabled"></div>
            </div>
        </div>
    `).appendTo($tab);

    $row2.find('.js-category').dxSelectBox({
        dataSource: categoriesCache,
        valueExpr: 'id',
        displayExpr: 'name',
        value: a.categoryId,
        placeholder: '請選擇公告類別',
        searchEnabled: true,
        onValueChanged: e => { a.categoryId = e.value; }
    });

    $row2.find('.js-importance').dxRadioGroup({
        items: APP_CONFIG.importance,
        valueExpr: 'value',
        displayExpr: 'text',
        value: a.importance,
        layout: 'horizontal',
        onValueChanged: e => { a.importance = e.value; }
    });

    $row2.find('.js-enabled').dxSwitch({
        value: !!a.enabled,
        switchedOnText: '啟用',
        switchedOffText: '停用',
        width: 90,
        onValueChanged: e => { a.enabled = e.value; }
    });

    // --- 內容 ---
    const $contentRow = $(`
        <div class="field-row">
            <label class="field-label">公告內容</label>
            <div class="js-content"></div>
        </div>
    `).appendTo($tab);
    $contentRow.find('.js-content').dxTextArea({
        value: a.content,
        height: 160,
        placeholder: '請輸入公告內容...',
        autoResizeEnabled: false,
        onValueChanged: e => { a.content = e.value; }
    });

    // --- 附件 ---
    renderAttachmentSection($tab);
}

// ============================================================
// 8. attachments — 附件區（既有清單 + dxFileUploader 延遲上傳）
// ============================================================
function renderAttachmentSection($tab) {
    const cfg = APP_CONFIG.fileUpload;
    const extText = cfg.allowedExtensions.join(', ');
    const maxText = helpers.formatBytes(cfg.maxFileSize);

    const $section = $(`
        <div class="field-row">
            <label class="field-label">附件</label>
            <div class="attachment-section">
                <div class="js-existing-list attachment-list"></div>
                <div class="js-new-list attachment-list"></div>
                <div class="js-uploader" style="margin-top:8px;"></div>
                <div class="field-hint">
                    允許副檔名：${extText}；單檔上限：${maxText}；可選多檔；儲存後才會真正上傳。
                </div>
            </div>
        </div>
    `).appendTo($tab);

    renderExistingAttachments($section.find('.js-existing-list'));
    renderNewAttachments($section.find('.js-new-list'));

    $section.find('.js-uploader').dxFileUploader({
        multiple: true,
        uploadMode: 'useForm',           // 不自動上傳
        selectButtonText: '選擇檔案',
        labelText: '或將檔案拖曳至此',
        readyToUploadMessage: '',
        allowedFileExtensions: cfg.allowedExtensions,
        maxFileSize: cfg.maxFileSize,
        invalidFileExtensionMessage: '不允許的副檔名',
        invalidMaxFileSizeMessage: `檔案大小超過 ${maxText}`,
        onValueChanged: e => {
            const files = e.value || [];
            if (!files.length) return; // reset() 會觸發空陣列事件，直接忽略
            files.forEach(f => {
                const ext = helpers.getExt(f.name);
                if (!cfg.allowedExtensions.includes(ext)) {
                    helpers.notify(`「${f.name}」副檔名不允許`, 'error');
                    return;
                }
                if (f.size > cfg.maxFileSize) {
                    helpers.notify(`「${f.name}」超過大小限制`, 'error');
                    return;
                }
                // 避免重複（以 name+size 判斷）
                const exists = editingState.newFiles.some(
                    x => x.name === f.name && x.size === f.size
                );
                if (!exists) editingState.newFiles.push(f);
            });
            renderNewAttachments($section.find('.js-new-list'));
            // 非同步清空 uploader 自身的 value，讓它可再次選擇同檔
            setTimeout(() => e.component.reset(), 0);
        }
    });
}

function renderExistingAttachments($list) {
    $list.empty();
    const files = editingState.existingAttachments;
    if (!files.length) return;

    files.forEach(f => {
        const $item = $('<div>').addClass('attachment-item');
        if (f._removed) $item.addClass('is-removed');

        $item.append(`
            <div class="attachment-info">
                <i class="dx-icon dx-icon-attach"></i>
                <span class="attachment-name" title="${$('<div>').text(f.name).html()}">${$('<div>').text(f.name).html()}</span>
                <span class="attachment-meta">${helpers.formatBytes(f.size)}</span>
                <span class="attachment-meta">${helpers.formatDateTime(f.uploadedAt)}</span>
            </div>
        `);
        const $actions = $('<div class="attachment-actions">').appendTo($item);

        $('<div>').appendTo($actions).dxButton({
            icon: 'download',
            hint: '下載',
            stylingMode: 'text',
            disabled: !!f._removed,
            onClick: () => dataService.downloadAttachment(f)
        });

        $('<div>').appendTo($actions).dxButton({
            icon: f._removed ? 'undo' : 'trash',
            hint: f._removed ? '還原' : '刪除',
            stylingMode: 'text',
            type: f._removed ? 'normal' : 'danger',
            onClick: () => {
                f._removed = !f._removed;
                renderExistingAttachments($list);
            }
        });

        $list.append($item);
    });
}

function renderNewAttachments($list) {
    $list.empty();
    const files = editingState.newFiles;
    if (!files.length) return;

    files.forEach((f, idx) => {
        const $item = $('<div>').addClass('attachment-item is-new');
        $item.append(`
            <div class="attachment-info">
                <i class="dx-icon dx-icon-newfolder"></i>
                <span class="attachment-name" title="${$('<div>').text(f.name).html()}">${$('<div>').text(f.name).html()}</span>
                <span class="attachment-meta">${helpers.formatBytes(f.size)}</span>
                <span class="attachment-badge">待上傳</span>
            </div>
        `);
        const $actions = $('<div class="attachment-actions">').appendTo($item);
        $('<div>').appendTo($actions).dxButton({
            icon: 'close',
            hint: '移除',
            stylingMode: 'text',
            type: 'danger',
            onClick: () => {
                editingState.newFiles.splice(idx, 1);
                renderNewAttachments($list);
            }
        });
        $list.append($item);
    });
}

// ============================================================
// 9. surveyEditor — 問卷設定
// ============================================================
function renderSurveyTab() {
    const $tab = $('#tabSurvey').empty();
    const a = editingState.announcement;

    // 題型 radio
    const $typeRow = $(`
        <div class="field-row">
            <label class="field-label">是否含問卷（整份問卷為單一題型）</label>
            <div class="js-survey-type"></div>
        </div>
    `).appendTo($tab);

    $typeRow.find('.js-survey-type').dxRadioGroup({
        items: APP_CONFIG.surveyTypes,
        valueExpr: 'value',
        displayExpr: 'text',
        value: a.surveyType,
        layout: 'horizontal',
        onValueChanged: e => {
            a.surveyType = e.value;
            renderSurveyQuestions($tab.find('.js-survey-body'));
        }
    });

    // 題目區
    $('<div class="js-survey-body">').appendTo($tab);
    renderSurveyQuestions($tab.find('.js-survey-body'));
}

function renderSurveyQuestions($body) {
    $body.empty();
    const a = editingState.announcement;

    if (a.surveyType === 'none') {
        $body.append(`<div class="survey-empty">此公告不含問卷</div>`);
        return;
    }

    // 工具列：新增題目
    const $toolbar = $('<div class="survey-toolbar">').appendTo($body);
    $('<div>').appendTo($toolbar).html(`
        <strong>題目清單</strong>
        <span style="color:#8a8f99;margin-left:8px;font-size:12px;">
            共 ${editingState.surveyQuestions.length} 題
        </span>
    `);
    $('<div>').appendTo($toolbar).dxButton({
        icon: 'plus',
        text: '新增題目',
        type: 'default',
        stylingMode: 'contained',
        onClick: () => {
            editingState.surveyQuestions.push({
                id: helpers.uniqueId('Q'),
                text: '',
                required: true,
                options: [
                    { id: helpers.uniqueId('O'), text: '' },
                    { id: helpers.uniqueId('O'), text: '' }
                ]
            });
            renderSurveyQuestions($body);
        }
    });

    if (!editingState.surveyQuestions.length) {
        $('<div class="survey-empty">尚未建立題目，請點上方「新增題目」</div>').appendTo($body);
        return;
    }

    const $list = $('<div class="survey-question-list">').appendTo($body);
    editingState.surveyQuestions.forEach((q, qIdx) => {
        renderQuestionCard($list, q, qIdx, a.surveyType);
    });
}

function renderQuestionCard($list, q, qIdx, surveyType) {
    const $card = $('<div class="survey-question-card">').appendTo($list);

    const $header = $(`
        <div class="survey-question-header">
            <div class="survey-question-index">Q${qIdx + 1}.</div>
            <div class="survey-question-body">
                <div class="js-q-text"></div>
            </div>
            <div class="survey-question-actions">
                <div class="js-q-required"></div>
                <div class="js-q-up"></div>
                <div class="js-q-down"></div>
                <div class="js-q-del"></div>
            </div>
        </div>
    `).appendTo($card);

    $header.find('.js-q-text').dxTextBox({
        value: q.text,
        placeholder: '請輸入題目',
        onValueChanged: e => { q.text = e.value; }
    });

    // required checkbox
    $header.find('.js-q-required').dxCheckBox({
        value: !!q.required,
        text: '必填',
        onValueChanged: e => { q.required = e.value; }
    });

    $header.find('.js-q-up').dxButton({
        icon: 'chevronup',
        hint: '上移',
        stylingMode: 'text',
        disabled: qIdx === 0,
        onClick: () => {
            const arr = editingState.surveyQuestions;
            [arr[qIdx - 1], arr[qIdx]] = [arr[qIdx], arr[qIdx - 1]];
            renderSurveyQuestions($list.parent());
        }
    });
    $header.find('.js-q-down').dxButton({
        icon: 'chevrondown',
        hint: '下移',
        stylingMode: 'text',
        disabled: qIdx === editingState.surveyQuestions.length - 1,
        onClick: () => {
            const arr = editingState.surveyQuestions;
            [arr[qIdx + 1], arr[qIdx]] = [arr[qIdx], arr[qIdx + 1]];
            renderSurveyQuestions($list.parent());
        }
    });
    $header.find('.js-q-del').dxButton({
        icon: 'trash',
        hint: '刪除題目',
        stylingMode: 'text',
        type: 'danger',
        onClick: () => {
            editingState.surveyQuestions.splice(qIdx, 1);
            renderSurveyQuestions($list.parent());
        }
    });

    // 選項區
    const $opts = $('<div class="survey-options">').appendTo($card);
    renderOptions($opts, q, surveyType);
}

function renderOptions($opts, q, surveyType) {
    $opts.empty();
    const marker = surveyType === 'multi' ? '☐' : '○';

    q.options.forEach((opt, oIdx) => {
        const $row = $(`
            <div class="survey-option-row">
                <span class="survey-option-marker">${marker}</span>
                <div style="flex:1;" class="js-opt-text"></div>
                <div class="js-opt-up"></div>
                <div class="js-opt-down"></div>
                <div class="js-opt-del"></div>
            </div>
        `).appendTo($opts);

        $row.find('.js-opt-text').dxTextBox({
            value: opt.text,
            placeholder: `選項 ${oIdx + 1}`,
            onValueChanged: e => { opt.text = e.value; }
        });
        $row.find('.js-opt-up').dxButton({
            icon: 'chevronup', hint: '上移', stylingMode: 'text',
            disabled: oIdx === 0,
            onClick: () => {
                [q.options[oIdx - 1], q.options[oIdx]] = [q.options[oIdx], q.options[oIdx - 1]];
                renderOptions($opts, q, surveyType);
            }
        });
        $row.find('.js-opt-down').dxButton({
            icon: 'chevrondown', hint: '下移', stylingMode: 'text',
            disabled: oIdx === q.options.length - 1,
            onClick: () => {
                [q.options[oIdx + 1], q.options[oIdx]] = [q.options[oIdx], q.options[oIdx + 1]];
                renderOptions($opts, q, surveyType);
            }
        });
        $row.find('.js-opt-del').dxButton({
            icon: 'close', hint: '刪除選項', stylingMode: 'text', type: 'danger',
            disabled: q.options.length <= 2,
            onClick: () => {
                q.options.splice(oIdx, 1);
                renderOptions($opts, q, surveyType);
            }
        });
    });

    // 新增選項按鈕
    const $addRow = $('<div class="survey-option-row">').appendTo($opts);
    $('<div style="padding-left:20px;">').appendTo($addRow).dxButton({
        icon: 'plus',
        text: '新增選項',
        stylingMode: 'text',
        type: 'default',
        onClick: () => {
            q.options.push({ id: helpers.uniqueId('O'), text: '' });
            renderOptions($opts, q, surveyType);
        }
    });
}

// ============================================================
// 10. surveyResult — 作答結果 Tab（在主彈窗內）
// ============================================================
function renderResultTab() {
    const $tab = $('#tabResult').empty();
    const a = editingState.announcement;

    if (!a.id || a.surveyType === 'none') {
        $tab.append(`
            <div class="result-empty">
                ${!a.id ? '公告尚未儲存，無作答結果。' : '此公告不含問卷，無作答結果。'}
            </div>
        `);
        return;
    }
    renderResultContent($tab, a);
}

/**
 * 結果主版面：summary + 子分頁（彙整 / 個別回應）
 */
function renderResultContent($container, announcement) {
    $container.empty();
    Promise.all([
        dataService.getSurveyResponses(announcement.id),
        dataService.getSurveyResponseList(announcement.id)
    ]).then(([resp, list]) => {
        if (!resp || !resp.totalResponses) {
            $container.append(`<div class="result-empty">尚無作答資料。</div>`);
            return;
        }
        const typeText = announcement.surveyType === 'multi' ? '多選' : '單選';

        // summary
        $container.append(`
            <div class="result-summary">
                <div>
                    <div class="result-summary-label">總作答數</div>
                    <div class="result-summary-value">${resp.totalResponses}</div>
                </div>
                <div class="result-summary-type">問卷類型：${typeText}</div>
            </div>
        `);

        // sub-tabs
        const $tabs = $('<div style="margin-bottom:14px;">').appendTo($container);
        const $aggBox = $('<div>').appendTo($container);
        const $indBox = $('<div style="display:none;">').appendTo($container);

        $tabs.dxTabs({
            dataSource: [
                { id: 'agg', text: '彙整', icon: 'chart' },
                { id: 'ind', text: `個別回應 (${list.length})`, icon: 'detailslayout' }
            ],
            selectedIndex: 0,
            onItemClick: e => {
                if (e.itemData.id === 'agg') {
                    $aggBox.show();
                    $indBox.hide();
                } else {
                    $aggBox.hide();
                    $indBox.show();
                }
            }
        });

        renderAggregationView($aggBox, announcement, resp);
        renderIndividualView($indBox, announcement, list);
    });
}

/**
 * 彙整視圖：每題長條圖
 */
function renderAggregationView($container, announcement, resp) {
    $container.empty();
    announcement.surveyQuestions.forEach((q, idx) => {
        const counts = (resp.questions && resp.questions[q.id]) || {};
        const maxCount = Math.max(1, ...Object.values(counts));

        const $qBox = $('<div class="result-question">').appendTo($container);
        $qBox.append(`
            <div class="result-question-title">
                Q${idx + 1}. ${helpers.escapeHtml(q.text)}
                ${q.required ? '<span class="result-question-required">必填</span>' : ''}
            </div>
        `);

        q.options.forEach(opt => {
            const c = counts[opt.id] || 0;
            const pct = resp.totalResponses ? Math.round((c / resp.totalResponses) * 100) : 0;
            const barPct = Math.round((c / maxCount) * 100);
            $qBox.append(`
                <div class="result-bar-row">
                    <div class="result-bar-label" title="${helpers.escapeHtml(opt.text)}">${helpers.escapeHtml(opt.text)}</div>
                    <div class="result-bar-track"><div class="result-bar-fill" style="width:${barPct}%"></div></div>
                    <div class="result-bar-value">${c} <span style="color:var(--ink-500);">(${pct}%)</span></div>
                </div>
            `);
        });
    });
}

/**
 * 個別回應視圖：DataGrid + masterDetail 看完整 Q&A
 */
function renderIndividualView($container, announcement, list) {
    $container.empty();

    if (!list.length) {
        $container.append('<div class="result-empty">尚無個別作答資料。</div>');
        return;
    }

    const qMap = {};
    announcement.surveyQuestions.forEach(q => { qMap[q.id] = q; });

    function answerToText(qId, answer) {
        const q = qMap[qId];
        if (!q) return '';
        const ans = Array.isArray(answer) ? answer : [answer];
        return ans.map(oId => {
            const opt = q.options.find(o => o.id === oId);
            return opt ? opt.text : '(未知)';
        }).join('、');
    }

    const $grid = $('<div>').appendTo($container);
    $grid.dxDataGrid({
        dataSource: list,
        keyExpr: 'id',
        showBorders: true,
        rowAlternationEnabled: true,
        columnAutoWidth: true,
        wordWrapEnabled: true,
        searchPanel: { visible: true, placeholder: '搜尋姓名...', width: 220 },
        headerFilter: { visible: true },
        paging: { pageSize: 10 },
        pager: { visible: true, showInfo: true },
        columns: [
            {
                caption: '#',
                width: 50,
                alignment: 'center',
                cellTemplate: (cell, info) => {
                    cell.text(info.rowIndex + 1);
                }
            },
            {
                dataField: 'respondent',
                caption: '填寫人',
                minWidth: 120
            },
            {
                dataField: 'submittedAt',
                caption: '送出時間',
                dataType: 'datetime',
                format: 'yyyy-MM-dd HH:mm',
                width: 160,
                sortOrder: 'desc'
            },
            {
                caption: '答題摘要',
                allowFiltering: false,
                allowSorting: false,
                cellTemplate: (cell, info) => {
                    const ans = info.data.answers || {};
                    const summary = announcement.surveyQuestions.map((q, i) =>
                        `Q${i + 1}: ${answerToText(q.id, ans[q.id])}`
                    ).join(' ｜ ');
                    cell.append(`<span style="color:var(--ink-700);font-size:12px;">${helpers.escapeHtml(summary)}</span>`);
                }
            }
        ],
        masterDetail: {
            enabled: true,
            template: (container, options) => {
                const r = options.data;
                const $box = $('<div style="padding:14px 18px;background:var(--surface-tint);">').appendTo(container);
                $box.append(`
                    <div style="margin-bottom:10px;display:flex;gap:14px;align-items:baseline;">
                        <strong style="font-size:14px;">${helpers.escapeHtml(r.respondent)}</strong>
                        <span style="color:var(--ink-500);font-size:12px;">送出於 ${helpers.formatDateTime(r.submittedAt)}</span>
                    </div>
                `);
                announcement.surveyQuestions.forEach((q, i) => {
                    const text = answerToText(q.id, r.answers[q.id]);
                    $box.append(`
                        <div style="margin-bottom:10px;padding:10px 12px;background:var(--surface);border-radius:6px;border:1px solid var(--ink-100);">
                            <div style="font-size:13px;color:var(--ink-700);margin-bottom:4px;">
                                <span style="color:var(--primary);font-weight:600;">Q${i + 1}.</span>
                                ${helpers.escapeHtml(q.text)}
                                ${q.required ? '<span class="result-question-required">必填</span>' : ''}
                            </div>
                            <div style="font-size:14px;color:var(--ink-900);font-weight:500;padding-left:8px;">
                                ${text ? '→ ' + helpers.escapeHtml(text) : '<span style="color:var(--ink-300);">（未作答）</span>'}
                            </div>
                        </div>
                    `);
                });
            }
        },
        export: {
            enabled: false
        }
    });
}

// ============================================================
// 獨立的「作答結果」彈窗（從列表直接點開時使用）
// ============================================================
let resultPopupInstance = null;

let resultPopupCurrentRow = null;

function openSurveyResultPopup(row) {
    resultPopupCurrentRow = row;
    if (!resultPopupInstance) {
        resultPopupInstance = $('#surveyResultPopup').dxPopup({
            width: 960,
            height: 720,
            showCloseButton: true,
            dragEnabled: true,
            hideOnOutsideClick: true,
            onShowing: () => {
                const r = resultPopupCurrentRow;
                if (!r) return;
                renderResultContent($('#resultPopupBody'), r);
            },
            contentTemplate: container => {
                $(container).css({ padding: 0, height: '100%' });
                $('<div id="resultPopupBody" class="popup-form">').appendTo($(container));
            }
        }).dxPopup('instance');
    }
    resultPopupInstance.option('title', `作答結果 — ${row.title}`);
    resultPopupInstance.show();
}

// ============================================================
// Bootstrap
// ============================================================
$(function () {
    initDataGrid();
});
