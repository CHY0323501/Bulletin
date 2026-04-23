/* ============================================================
 * 公告設定維護 (Announcement Management)
 * DevExtreme 24.1.3 + jQuery
 * ============================================================
 * 區塊配置：
 *   1. APP_CONFIG       — 全域可調參數（檔案大小限制、副檔名…）
 *   2. mockData         — Demo 用假資料
 *   3. dataService      — 資料存取抽象層 (TODO: 串實際 API 時只需改這層)
 *   4. state            — 目前編輯中的公告暫存狀態
 *   5. helpers          — 通用工具
 *   6. dataGrid         — 公告列表
 *   7. popup            — 新增/編輯公告主彈窗（含三個 Tab）
 *   8. attachments      — 附件清單與上傳
 *   9. surveyEditor     — 問卷題目編輯
 *  10. surveyResult     — 作答結果統計
 * ============================================================ */

// ============================================================
// 1. APP_CONFIG
// ============================================================
const APP_CONFIG = {
    fileUpload: {
        maxFileSize: 10 * 1024 * 1024, // 10 MB
        allowedExtensions: [
            '.jpg', '.jpeg', '.png', '.gif',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.txt', '.csv', '.zip'
        ]
    },
    importance: [
        { value: 'normal', text: '一般' },
        { value: 'high', text: '重要' }
    ],
    surveyTypes: [
        { value: 'none', text: '無問卷' },
        { value: 'single', text: '單選問答' },
        { value: 'multi', text: '多選問答' }
    ],
    api: {
        // TODO: 串實際 API 時填入 base url
        baseUrl: '',
        endpoints: {
            announcements: '/api/announcements',
            categories: '/api/announcement-categories',
            attachmentUpload: '/api/attachments',
            attachmentDownload: '/api/attachments/{id}/download',
            surveyResponses: '/api/announcements/{id}/survey-responses'
        }
    }
};

// ============================================================
// 2. mockData
// ============================================================
const mockCategories = [
    { id: 'C001', name: '系統公告' },
    { id: 'C002', name: '人事公告' },
    { id: 'C003', name: '活動公告' },
    { id: 'C004', name: '教育訓練' },
    { id: 'C005', name: '資安宣導' }
];

const mockAnnouncements = [
    {
        id: 'A001',
        title: '系統維護通知 (4/30 凌晨)',
        content: '本系統將於 4/30 00:00 ~ 04:00 進行例行維護，期間服務將暫停。\n造成不便敬請見諒。',
        categoryId: 'C001',
        importance: 'high',
        enabled: true,
        createdAt: '2026-04-15T09:30:00',
        attachments: [
            { id: 'F001', name: '維護範圍說明.pdf', size: 348293, uploadedAt: '2026-04-15T09:30:00' }
        ],
        surveyType: 'none',
        surveyQuestions: []
    },
    {
        id: 'A002',
        title: '新進員工教育訓練報名',
        content: '本季新進同仁教育訓練將於 5 月份舉辦，請填寫以下問卷以利課程安排。',
        categoryId: 'C004',
        importance: 'normal',
        enabled: true,
        createdAt: '2026-04-10T14:20:00',
        attachments: [],
        surveyType: 'single',
        surveyQuestions: [
            {
                id: 'Q001',
                text: '您偏好的上課時段？',
                required: true,
                options: [
                    { id: 'O001', text: '上午 (09:00-12:00)' },
                    { id: 'O002', text: '下午 (13:30-16:30)' },
                    { id: 'O003', text: '晚上 (18:30-21:00)' }
                ]
            },
            {
                id: 'Q002',
                text: '是否需要提供餐點？',
                required: false,
                options: [
                    { id: 'O004', text: '需要' },
                    { id: 'O005', text: '不需要' }
                ]
            }
        ]
    },
    {
        id: 'A003',
        title: '年度資安宣導：請選擇您有興趣的主題',
        content: '本年度資安宣導課程開放票選，可複選感興趣的主題，將依結果安排講師。',
        categoryId: 'C005',
        importance: 'normal',
        enabled: false,
        createdAt: '2026-04-01T10:00:00',
        attachments: [
            { id: 'F002', name: '去年度資安事件統計.xlsx', size: 89234, uploadedAt: '2026-04-01T10:00:00' },
            { id: 'F003', name: '資安政策摘要.pdf', size: 512440, uploadedAt: '2026-04-01T10:00:00' }
        ],
        surveyType: 'multi',
        surveyQuestions: [
            {
                id: 'Q003',
                text: '您有興趣的資安主題（可複選）',
                required: true,
                options: [
                    { id: 'O006', text: '社交工程與釣魚郵件' },
                    { id: 'O007', text: '密碼管理與多因子驗證' },
                    { id: 'O008', text: '個資保護法規' },
                    { id: 'O009', text: '勒索軟體防範' }
                ]
            }
        ]
    }
];

// 假的作答結果（announcementId -> questionId -> optionId -> count）
const mockSurveyResponses = {
    'A002': {
        totalResponses: 47,
        questions: {
            'Q001': { 'O001': 18, 'O002': 22, 'O003': 7 },
            'Q002': { 'O004': 31, 'O005': 16 }
        }
    },
    'A003': {
        totalResponses: 63,
        questions: {
            'Q003': { 'O006': 41, 'O007': 35, 'O008': 22, 'O009': 49 }
        }
    }
};

// ============================================================
// 3. dataService — 資料存取抽象層
// 串 API 時只改這層即可，UI 不用動
// ============================================================
const dataService = {
    // ----- categories -----
    getCategories() {
        // TODO: return $.getJSON(APP_CONFIG.api.baseUrl + APP_CONFIG.api.endpoints.categories);
        return Promise.resolve(JSON.parse(JSON.stringify(mockCategories)));
    },

    // ----- announcements -----
    getAnnouncements() {
        // TODO: return $.getJSON(APP_CONFIG.api.baseUrl + APP_CONFIG.api.endpoints.announcements);
        return Promise.resolve(JSON.parse(JSON.stringify(mockAnnouncements)));
    },

    saveAnnouncement(payload) {
        // payload: { announcement, removedAttachmentIds, newFiles }
        // TODO: 實際應該是 multipart/form-data，附件分檔上傳
        return new Promise((resolve) => {
            const a = payload.announcement;
            const isCreate = !a.id;

            // 新增 / 修改
            if (isCreate) {
                a.id = 'A' + String(Date.now()).slice(-6);
                a.createdAt = new Date().toISOString();
                a.attachments = [];
            } else {
                const idx = mockAnnouncements.findIndex(x => x.id === a.id);
                if (idx >= 0) {
                    a.attachments = mockAnnouncements[idx].attachments || [];
                }
            }

            // 移除附件
            if (Array.isArray(payload.removedAttachmentIds) && payload.removedAttachmentIds.length) {
                a.attachments = (a.attachments || []).filter(
                    f => !payload.removedAttachmentIds.includes(f.id)
                );
            }

            // 新增附件（demo：只記錄檔名 + 大小）
            (payload.newFiles || []).forEach(file => {
                a.attachments.push({
                    id: 'F' + Math.random().toString(36).slice(2, 8).toUpperCase(),
                    name: file.name,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                });
            });

            if (isCreate) {
                mockAnnouncements.unshift(a);
            } else {
                const idx = mockAnnouncements.findIndex(x => x.id === a.id);
                if (idx >= 0) mockAnnouncements[idx] = a;
            }

            resolve(JSON.parse(JSON.stringify(a)));
        });
    },

    deleteAnnouncement(id) {
        // TODO: $.ajax DELETE
        const idx = mockAnnouncements.findIndex(x => x.id === id);
        if (idx >= 0) mockAnnouncements.splice(idx, 1);
        delete mockSurveyResponses[id];
        return Promise.resolve();
    },

    setEnabled(id, enabled) {
        // TODO: $.ajax PATCH
        const a = mockAnnouncements.find(x => x.id === id);
        if (a) a.enabled = enabled;
        return Promise.resolve();
    },

    // ----- attachments -----
    downloadAttachment(file) {
        // TODO: window.open(APP_CONFIG.api.baseUrl + endpoint.replace('{id}', file.id))
        // demo：產一個假的 txt blob 讓使用者體驗下載動作
        const content = `[Demo] 這是「${file.name}」的模擬下載內容。\n` +
            `檔案大小: ${file.size} bytes\n` +
            `上傳時間: ${file.uploadedAt}`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name + '.demo.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return Promise.resolve();
    },

    // ----- survey results -----
    getSurveyResponses(announcementId) {
        // TODO: $.getJSON
        return Promise.resolve(
            mockSurveyResponses[announcementId]
                ? JSON.parse(JSON.stringify(mockSurveyResponses[announcementId]))
                : null
        );
    }
};

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
// 5. helpers
// ============================================================
const helpers = {
    formatBytes(bytes) {
        if (bytes == null) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    },
    formatDateTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
            `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    uniqueId(prefix) {
        return (prefix || 'id') + '_' + Date.now().toString(36) +
            Math.random().toString(36).slice(2, 6);
    },
    getExt(name) {
        const i = name.lastIndexOf('.');
        return i >= 0 ? name.slice(i).toLowerCase() : '';
    },
    notify(msg, type) {
        DevExpress.ui.notify(msg, type || 'success', 2200);
    },
    deepClone(o) {
        return JSON.parse(JSON.stringify(o));
    }
};

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
            const $tab = $('<div>').appendTo($(container));
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

    dataService.getSurveyResponses(a.id).then(resp => {
        $tab.empty();
        if (!resp || !resp.totalResponses) {
            $tab.append(`<div class="result-empty">尚無作答資料。</div>`);
            return;
        }
        renderResultContent($tab, a, resp);
    });
}

function renderResultContent($container, announcement, resp) {
    $container.append(`
        <div class="field-row" style="display:flex;align-items:center;gap:16px;">
            <strong>總作答數：</strong>
            <span style="font-size:20px;color:#2a7ade;font-weight:600;">${resp.totalResponses}</span>
            <span style="color:#8a8f99;">問卷類型：${announcement.surveyType === 'multi' ? '多選' : '單選'}</span>
        </div>
    `);

    announcement.surveyQuestions.forEach((q, idx) => {
        const counts = (resp.questions && resp.questions[q.id]) || {};
        const maxCount = Math.max(1, ...Object.values(counts));

        const $qBox = $('<div class="result-question">').appendTo($container);
        $qBox.append(`
            <div class="result-question-title">
                Q${idx + 1}. ${$('<div>').text(q.text).html()}
                ${q.required ? '<span style="color:#d9534f;font-size:12px;margin-left:6px;">[必填]</span>' : ''}
            </div>
        `);

        q.options.forEach(opt => {
            const c = counts[opt.id] || 0;
            const pct = resp.totalResponses ? Math.round((c / resp.totalResponses) * 100) : 0;
            const barPct = Math.round((c / maxCount) * 100);
            $qBox.append(`
                <div class="result-bar-row">
                    <div title="${$('<div>').text(opt.text).html()}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${$('<div>').text(opt.text).html()}</div>
                    <div class="result-bar-track"><div class="result-bar-fill" style="width:${barPct}%"></div></div>
                    <div class="result-bar-value">${c} (${pct}%)</div>
                </div>
            `);
        });
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
            width: 760,
            height: 600,
            showCloseButton: true,
            dragEnabled: true,
            hideOnOutsideClick: true,
            onShowing: () => {
                const r = resultPopupCurrentRow;
                if (!r) return;
                const $body = $('#resultPopupBody').empty();
                dataService.getSurveyResponses(r.id).then(resp => {
                    if (!resp || !resp.totalResponses) {
                        $body.append(`<div class="result-empty">尚無作答資料。</div>`);
                        return;
                    }
                    renderResultContent($body, r, resp);
                });
            },
            contentTemplate: container => {
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
