/* ============================================================
 * survey.js — 填寫問卷頁
 * DevExtreme 24.1.3 + jQuery
 * ============================================================
 * 依賴：data.js
 *
 * 兩個 view：
 *   list  — 顯示所有 enabled + 含問卷的公告卡片
 *   fill  — 選定一則後渲染問卷表單
 * ============================================================ */

const surveyState = {
    view: 'list',           // 'list' | 'fill' | 'thanks'
    selectedAnnouncement: null,
    respondent: '',         // 填寫人姓名
    answers: {}             // { [questionId]: optionId | optionId[] }
};

const RESPONDENT_KEY = 'bulletin.respondent.v1';

function loadSavedRespondent() {
    try { return localStorage.getItem(RESPONDENT_KEY) || ''; }
    catch (e) { return ''; }
}
function saveRespondent(name) {
    try { localStorage.setItem(RESPONDENT_KEY, name || ''); } catch (e) {}
}

const SUBMITTED_KEY = 'bulletin.submitted.v1';

function getSubmittedSet() {
    try {
        const raw = localStorage.getItem(SUBMITTED_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) { return new Set(); }
}
function markSubmitted(announcementId) {
    const s = getSubmittedSet();
    s.add(announcementId);
    try {
        localStorage.setItem(SUBMITTED_KEY, JSON.stringify([...s]));
    } catch (e) {}
}

let categoriesCache = [];

// ============================================================
// 1. 列表 view
// ============================================================
function renderListView() {
    surveyState.view = 'list';
    surveyState.selectedAnnouncement = null;
    surveyState.answers = {};

    $('#pageTitle').text('填寫問卷');
    $('#pageSubtitle').text('選擇一則含有問卷的公告並填寫');

    const $main = $('#surveyMain').empty();

    Promise.all([
        dataService.getCategories(),
        dataService.getAnnouncements()
    ]).then(([categories, announcements]) => {
        categoriesCache = categories;
        const submitted = getSubmittedSet();
        const list = announcements.filter(a =>
            a.enabled && a.surveyType !== 'none' && (a.surveyQuestions || []).length > 0
        );

        if (!list.length) {
            $main.append(`
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <h3>目前沒有開放填寫的問卷</h3>
                    <div>請至「公告維護」頁面建立含問卷的公告。</div>
                </div>
            `);
            return;
        }

        const $grid = $('<div class="survey-list">').appendTo($main);
        list.forEach(a => $grid.append(buildCard(a, submitted.has(a.id))));
    });
}

function buildCard(a, isSubmitted) {
    const cat = categoriesCache.find(c => c.id === a.categoryId);
    const importanceCls = a.importance === 'high' ? 'importance-high' : 'importance-normal';
    const importanceText = a.importance === 'high' ? '重要' : '一般';
    const typeText = a.surveyType === 'multi' ? '多選' : '單選';
    const qCount = (a.surveyQuestions || []).length;

    const $card = $(`
        <div class="survey-card ${isSubmitted ? 'submitted' : ''}">
            <div class="survey-card-header">
                <div class="survey-card-title">${helpers.escapeHtml(a.title)}</div>
            </div>
            <div class="survey-card-meta">
                <span class="importance-pill ${importanceCls}">${importanceText}</span>
                <span class="survey-tag">${typeText}・${qCount} 題</span>
                ${cat ? `<span class="survey-tag none">${helpers.escapeHtml(cat.name)}</span>` : ''}
            </div>
            <div class="survey-card-content">${helpers.escapeHtml(a.content)}</div>
            <div class="survey-card-footer">
                <span>${helpers.formatDateTime(a.createdAt)}</span>
                <span class="arrow">${isSubmitted ? '可重新填寫 →' : '開始填寫 →'}</span>
            </div>
        </div>
    `);
    $card.on('click', () => renderFillView(a));
    return $card;
}

// ============================================================
// 2. 填寫 view
// ============================================================
function renderFillView(announcement) {
    surveyState.view = 'fill';
    surveyState.selectedAnnouncement = helpers.deepClone(announcement);
    surveyState.answers = {};
    surveyState.respondent = loadSavedRespondent();

    $('#pageTitle').text('填寫問卷');
    $('#pageSubtitle').text('請完成下列問題後送出');

    const a = surveyState.selectedAnnouncement;
    const cat = categoriesCache.find(c => c.id === a.categoryId);
    const importanceCls = a.importance === 'high' ? 'importance-high' : 'importance-normal';
    const importanceText = a.importance === 'high' ? '重要' : '一般';

    const $main = $('#surveyMain').empty();
    const $form = $('<div class="fill-form">').appendTo($main);

    // 返回連結
    const $back = $('<div class="fill-back">← 返回問卷列表</div>').appendTo($form);
    $back.on('click', renderListView);

    // 公告 header
    const $header = $(`
        <div class="fill-announcement-header">
            <h2 class="fill-announcement-title">${helpers.escapeHtml(a.title)}</h2>
            <div class="fill-announcement-meta">
                ${cat ? `<span class="survey-tag none">${helpers.escapeHtml(cat.name)}</span>` : ''}
                <span class="importance-pill ${importanceCls}">${importanceText}</span>
                <span>建立於 ${helpers.formatDateTime(a.createdAt)}</span>
            </div>
            <div class="fill-announcement-content">${helpers.escapeHtml(a.content)}</div>
        </div>
    `).appendTo($form);

    // 附件區
    if ((a.attachments || []).length) {
        const $att = $('<div class="fill-attachments">').appendTo($header);
        $att.append('<div style="font-size:12px;color:var(--ink-500);margin-bottom:6px;">📎 附件</div>');
        a.attachments.forEach(f => {
            const $chip = $(`
                <span class="fill-attachment-chip">
                    <span>${helpers.escapeHtml(f.name)}</span>
                    <span style="opacity:0.7;">${helpers.formatBytes(f.size)}</span>
                </span>
            `).appendTo($att);
            $chip.on('click', () => dataService.downloadAttachment(f));
        });
    }

    // 填寫人姓名（必填）
    const $nameRow = $(`
        <div class="fill-question" style="background:var(--surface-tint);padding:14px 16px;border-radius:var(--radius-sm);border-left:3px solid var(--accent);">
            <div class="fill-question-title">
                <span class="fill-question-index">👤</span>填寫人姓名<span class="fill-required-mark">*</span>
            </div>
            <div class="js-respondent" style="max-width:320px;"></div>
        </div>
    `).appendTo($form);
    $nameRow.find('.js-respondent').dxTextBox({
        value: surveyState.respondent,
        placeholder: '請輸入您的姓名',
        maxLength: 30,
        onValueChanged: e => { surveyState.respondent = (e.value || '').trim(); }
    });

    // 題目
    a.surveyQuestions.forEach((q, idx) => {
        renderQuestion($form, q, idx, a.surveyType);
    });

    // 送出 / 重設
    const $actions = $('<div class="fill-actions">').appendTo($form);
    $('<div>').appendTo($actions).dxButton({
        text: '取消',
        stylingMode: 'outlined',
        onClick: renderListView
    });
    $('<div>').appendTo($actions).dxButton({
        text: '清除作答',
        icon: 'refresh',
        stylingMode: 'outlined',
        onClick: () => renderFillView(announcement)
    });
    $('<div>').appendTo($actions).dxButton({
        text: '送出問卷',
        icon: 'check',
        type: 'default',
        stylingMode: 'contained',
        onClick: handleSubmit
    });

    // 滾到頁首
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderQuestion($form, q, idx, surveyType) {
    const $q = $('<div class="fill-question">').appendTo($form);
    $q.append(`
        <div class="fill-question-title">
            <span class="fill-question-index">Q${idx + 1}.</span>${helpers.escapeHtml(q.text)}
            ${q.required ? '<span class="fill-required-mark">*</span>' : ''}
        </div>
    `);

    const $widget = $('<div>').appendTo($q);

    if (surveyType === 'single') {
        $widget.dxRadioGroup({
            items: q.options,
            valueExpr: 'id',
            displayExpr: 'text',
            value: surveyState.answers[q.id] || null,
            layout: 'vertical',
            onValueChanged: e => {
                surveyState.answers[q.id] = e.value;
            }
        });
    } else if (surveyType === 'multi') {
        $widget.dxTagBox({
            items: q.options,
            valueExpr: 'id',
            displayExpr: 'text',
            value: surveyState.answers[q.id] || [],
            placeholder: '請選擇選項（可複選）',
            showSelectionControls: true,
            applyValueMode: 'useButtons',
            multiline: true,
            searchEnabled: false,
            onValueChanged: e => {
                surveyState.answers[q.id] = e.value || [];
            }
        });
    }
}

// ============================================================
// 3. 送出 / 致謝 view
// ============================================================
function handleSubmit() {
    const a = surveyState.selectedAnnouncement;

    // 驗證填寫人
    if (!surveyState.respondent || !surveyState.respondent.trim()) {
        helpers.notify('請輸入填寫人姓名', 'error');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // 驗證必填
    for (let i = 0; i < a.surveyQuestions.length; i++) {
        const q = a.surveyQuestions[i];
        if (!q.required) continue;
        const ans = surveyState.answers[q.id];
        const empty = ans == null
            || (Array.isArray(ans) && ans.length === 0)
            || ans === '';
        if (empty) {
            helpers.notify(`第 ${i + 1} 題為必填，請完成後再送出`, 'error');
            return;
        }
    }

    // 確認送出
    DevExpress.ui.dialog.confirm(
        `確定以「${helpers.escapeHtml(surveyState.respondent)}」的名義送出？送出後將無法修改答案。`,
        '送出確認'
    ).done(yes => {
        if (!yes) return;
        dataService.submitSurveyResponse(a.id, {
            respondent: surveyState.respondent.trim(),
            answers: surveyState.answers
        }).then(() => {
            saveRespondent(surveyState.respondent.trim()); // 記住下次預填
            markSubmitted(a.id);
            renderThankYouView();
        });
    });
}

function renderThankYouView() {
    surveyState.view = 'thanks';
    $('#pageTitle').text('感謝您的填寫');
    $('#pageSubtitle').text('您的回應已送出');

    const $main = $('#surveyMain').empty();
    const a = surveyState.selectedAnnouncement;

    const $card = $(`
        <div class="thank-you">
            <div class="thank-you-icon">✓</div>
            <h2>感謝您的填寫！</h2>
            <p>「${helpers.escapeHtml(a.title)}」的回應已送出。</p>
            <div class="js-actions" style="display:flex;gap:10px;justify-content:center;"></div>
        </div>
    `).appendTo($main);

    $('<div>').appendTo($card.find('.js-actions')).dxButton({
        text: '回到問卷列表',
        icon: 'arrowleft',
        type: 'default',
        stylingMode: 'contained',
        onClick: renderListView
    });
}

// ============================================================
// Bootstrap
// ============================================================
$(function () {
    renderListView();
});
