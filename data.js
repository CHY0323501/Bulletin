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
        responsesKey: 'bulletin.surveyResponses.v2' // v2: 結構改為 { responses: [] }
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

// 每筆作答獨立儲存：announcementId -> { responses: [{ id, respondent, submittedAt, answers }] }
const defaultSurveyResponses = {
    'A002': {
        responses: [
            { id: 'R001', respondent: '張小明', submittedAt: '2026-04-11T09:12:00', answers: { Q001: 'O001', Q002: 'O004' } },
            { id: 'R002', respondent: '王大華', submittedAt: '2026-04-11T09:34:00', answers: { Q001: 'O002', Q002: 'O005' } },
            { id: 'R003', respondent: '李美玲', submittedAt: '2026-04-11T10:02:00', answers: { Q001: 'O002', Q002: 'O004' } },
            { id: 'R004', respondent: '陳志強', submittedAt: '2026-04-11T10:18:00', answers: { Q001: 'O001', Q002: 'O004' } },
            { id: 'R005', respondent: '林淑芬', submittedAt: '2026-04-11T10:45:00', answers: { Q001: 'O003', Q002: 'O005' } },
            { id: 'R006', respondent: '黃俊雄', submittedAt: '2026-04-11T11:08:00', answers: { Q001: 'O002', Q002: 'O004' } },
            { id: 'R007', respondent: '吳怡君', submittedAt: '2026-04-11T13:22:00', answers: { Q001: 'O001', Q002: 'O005' } },
            { id: 'R008', respondent: '趙建宏', submittedAt: '2026-04-11T14:01:00', answers: { Q001: 'O002', Q002: 'O004' } },
            { id: 'R009', respondent: '周麗華', submittedAt: '2026-04-11T15:18:00', answers: { Q001: 'O003', Q002: 'O004' } },
            { id: 'R010', respondent: '鄭文杰', submittedAt: '2026-04-12T08:30:00', answers: { Q001: 'O001', Q002: 'O005' } },
            { id: 'R011', respondent: '何思慧', submittedAt: '2026-04-12T09:14:00', answers: { Q001: 'O002', Q002: 'O004' } },
            { id: 'R012', respondent: '劉明德', submittedAt: '2026-04-12T10:50:00', answers: { Q001: 'O002', Q002: 'O004' } }
        ]
    },
    'A003': {
        responses: [
            { id: 'R101', respondent: '林佳蓉', submittedAt: '2026-04-02T08:42:00', answers: { Q003: ['O006', 'O008', 'O009'] } },
            { id: 'R102', respondent: '蔡家偉', submittedAt: '2026-04-02T09:11:00', answers: { Q003: ['O007', 'O009'] } },
            { id: 'R103', respondent: '簡淑娟', submittedAt: '2026-04-02T09:55:00', answers: { Q003: ['O006', 'O007', 'O009'] } },
            { id: 'R104', respondent: '朱國鼎', submittedAt: '2026-04-02T10:33:00', answers: { Q003: ['O006', 'O008'] } },
            { id: 'R105', respondent: '高雅琪', submittedAt: '2026-04-02T11:20:00', answers: { Q003: ['O007', 'O009'] } },
            { id: 'R106', respondent: '楊志文', submittedAt: '2026-04-02T13:48:00', answers: { Q003: ['O006', 'O007'] } },
            { id: 'R107', respondent: '謝芳怡', submittedAt: '2026-04-03T09:05:00', answers: { Q003: ['O006', 'O009'] } },
            { id: 'R108', respondent: '沈俊翔', submittedAt: '2026-04-03T10:27:00', answers: { Q003: ['O006', 'O007', 'O008', 'O009'] } }
        ]
    }
};

/**
 * 把多筆 responses 彙整成 { totalResponses, questions: { qId: { oId: count } } }
 */
function aggregateResponses(responses) {
    const out = { totalResponses: responses.length, questions: {} };
    responses.forEach(r => {
        Object.keys(r.answers || {}).forEach(qId => {
            if (!out.questions[qId]) out.questions[qId] = {};
            const ans = r.answers[qId];
            const opts = Array.isArray(ans) ? ans : [ans];
            opts.forEach(oId => {
                if (oId == null) return;
                out.questions[qId][oId] = (out.questions[qId][oId] || 0) + 1;
            });
        });
    });
    return out;
}

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

    /**
     * 取得彙整結果（給長條圖用）
     * @returns {Promise<{totalResponses, questions} | null>}
     */
    getSurveyResponses(announcementId) {
        // TODO: 實際 API 通常後端就直接回彙整：return $.getJSON(...endpoints.surveyResponses)
        const bucket = mockSurveyResponses[announcementId];
        if (!bucket || !bucket.responses || !bucket.responses.length) return Promise.resolve(null);
        return Promise.resolve(aggregateResponses(bucket.responses));
    },

    /**
     * 取得個別作答清單
     * @returns {Promise<Array<{id, respondent, submittedAt, answers}>>}
     */
    getSurveyResponseList(announcementId) {
        // TODO: 實際 API: GET .../survey-responses?detail=list
        const bucket = mockSurveyResponses[announcementId];
        if (!bucket || !bucket.responses) return Promise.resolve([]);
        return Promise.resolve(helpers.deepClone(bucket.responses));
    },

    /**
     * 提交問卷作答
     * @param {string} announcementId
     * @param {object} payload — { respondent, answers }
     *   answers: { [questionId]: optionId | optionId[] }
     * TODO: 實際應 POST endpoints.surveySubmit
     */
    submitSurveyResponse(announcementId, payload) {
        return new Promise(resolve => {
            // 防禦：若 bucket 不存在或 responses 不是陣列（可能是舊版 localStorage 資料），重建
            const existing = mockSurveyResponses[announcementId];
            if (!existing || !Array.isArray(existing.responses)) {
                mockSurveyResponses[announcementId] = { responses: [] };
            }
            const bucket = mockSurveyResponses[announcementId];
            const record = {
                id: 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5).toUpperCase(),
                respondent: (payload && payload.respondent) || '匿名',
                submittedAt: new Date().toISOString(),
                answers: (payload && payload.answers) || {}
            };
            bucket.responses.push(record);
            persistResponses();
            resolve(record);
        });
    }
};
