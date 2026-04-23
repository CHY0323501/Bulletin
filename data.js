/* ============================================================
 * data.js — 共用資料層
 * ============================================================
 * 給 app.js (公告維護) 與 survey.js (填寫問卷) 兩頁共用。
 *
 *   1. APP_CONFIG    — 全域可調參數
 *   2. helpers       — 通用工具
 *   3. mockData      — Demo 假資料（localStorage 持久化）
 *   4. dataService   — 資料存取抽象層（串實際 API 時只需改這層）
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
    storage: {
        announcementsKey: 'bulletin.announcements.v1',
        responsesKey: 'bulletin.surveyResponses.v1'
    },
    api: {
        // TODO: 串實際 API 時填入 base url
        baseUrl: '',
        endpoints: {
            announcements: '/api/announcements',
            categories: '/api/announcement-categories',
            attachmentUpload: '/api/attachments',
            attachmentDownload: '/api/attachments/{id}/download',
            surveyResponses: '/api/announcements/{id}/survey-responses',
            surveySubmit: '/api/announcements/{id}/survey-responses'
        }
    }
};

// ============================================================
// 2. helpers
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
    },
    escapeHtml(s) {
        return $('<div>').text(s == null ? '' : s).html();
    }
};

// ============================================================
// 3. mockData
// ============================================================
const defaultCategories = [
    { id: 'C001', name: '系統公告' },
    { id: 'C002', name: '人事公告' },
    { id: 'C003', name: '活動公告' },
    { id: 'C004', name: '教育訓練' },
    { id: 'C005', name: '資安宣導' }
];

const defaultAnnouncements = [
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
        enabled: true,
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

const defaultSurveyResponses = {
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

// runtime state（以 localStorage 為來源）
let mockCategories = helpers.deepClone(defaultCategories);
let mockAnnouncements = loadFromStorage(APP_CONFIG.storage.announcementsKey, defaultAnnouncements);
let mockSurveyResponses = loadFromStorage(APP_CONFIG.storage.responsesKey, defaultSurveyResponses);

function loadFromStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return helpers.deepClone(fallback);
        return JSON.parse(raw);
    } catch (e) {
        console.warn('localStorage load failed', key, e);
        return helpers.deepClone(fallback);
    }
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('localStorage save failed', key, e);
    }
}

function persistAnnouncements() {
    saveToStorage(APP_CONFIG.storage.announcementsKey, mockAnnouncements);
}
function persistResponses() {
    saveToStorage(APP_CONFIG.storage.responsesKey, mockSurveyResponses);
}

// ============================================================
// 4. dataService — 資料存取抽象層
// 串 API 時只改這層即可，UI 不用動
// ============================================================
const dataService = {
    // ----- reset (只在 demo 用) -----
    resetDemoData() {
        mockCategories = helpers.deepClone(defaultCategories);
        mockAnnouncements = helpers.deepClone(defaultAnnouncements);
        mockSurveyResponses = helpers.deepClone(defaultSurveyResponses);
        persistAnnouncements();
        persistResponses();
        return Promise.resolve();
    },

    // ----- categories -----
    getCategories() {
        // TODO: return $.getJSON(APP_CONFIG.api.baseUrl + APP_CONFIG.api.endpoints.categories);
        return Promise.resolve(helpers.deepClone(mockCategories));
    },

    // ----- announcements -----
    getAnnouncements() {
        // TODO: return $.getJSON(...endpoints.announcements);
        return Promise.resolve(helpers.deepClone(mockAnnouncements));
    },

    getAnnouncement(id) {
        const a = mockAnnouncements.find(x => x.id === id);
        return Promise.resolve(a ? helpers.deepClone(a) : null);
    },

    saveAnnouncement(payload) {
        // payload: { announcement, removedAttachmentIds, newFiles }
        // TODO: 實際應該是 multipart/form-data，附件分檔上傳
        return new Promise((resolve) => {
            const a = payload.announcement;
            const isCreate = !a.id;

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

            if (Array.isArray(payload.removedAttachmentIds) && payload.removedAttachmentIds.length) {
                a.attachments = (a.attachments || []).filter(
                    f => !payload.removedAttachmentIds.includes(f.id)
                );
            }

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
            persistAnnouncements();

            resolve(helpers.deepClone(a));
        });
    },

    deleteAnnouncement(id) {
        // TODO: $.ajax DELETE
        const idx = mockAnnouncements.findIndex(x => x.id === id);
        if (idx >= 0) mockAnnouncements.splice(idx, 1);
        delete mockSurveyResponses[id];
        persistAnnouncements();
        persistResponses();
        return Promise.resolve();
    },

    setEnabled(id, enabled) {
        // TODO: $.ajax PATCH
        const a = mockAnnouncements.find(x => x.id === id);
        if (a) a.enabled = enabled;
        persistAnnouncements();
        return Promise.resolve();
    },

    // ----- attachments -----
    downloadAttachment(file) {
        // TODO: window.open(APP_CONFIG.api.baseUrl + endpoint.replace('{id}', file.id))
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

    // ----- survey -----
    getSurveyResponses(announcementId) {
        // TODO: $.getJSON
        return Promise.resolve(
            mockSurveyResponses[announcementId]
                ? helpers.deepClone(mockSurveyResponses[announcementId])
                : null
        );
    },

    /**
     * 提交問卷作答
     * @param {string} announcementId
     * @param {object} answers — { [questionId]: optionId | optionId[] }
     * TODO: 實際應 POST endpoints.surveySubmit
     */
    submitSurveyResponse(announcementId, answers) {
        return new Promise(resolve => {
            if (!mockSurveyResponses[announcementId]) {
                mockSurveyResponses[announcementId] = {
                    totalResponses: 0,
                    questions: {}
                };
            }
            const bucket = mockSurveyResponses[announcementId];
            bucket.totalResponses = (bucket.totalResponses || 0) + 1;

            Object.keys(answers).forEach(qId => {
                if (!bucket.questions[qId]) bucket.questions[qId] = {};
                const ans = answers[qId];
                const opts = Array.isArray(ans) ? ans : [ans];
                opts.forEach(oId => {
                    if (!oId) return;
                    bucket.questions[qId][oId] = (bucket.questions[qId][oId] || 0) + 1;
                });
            });

            persistResponses();
            resolve();
        });
    }
};
