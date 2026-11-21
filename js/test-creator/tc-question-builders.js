'use strict';

// Test Creator — Question Type Builders, Settings Modal & Item Editors
function buildSpecificEditorHtml(ex) {
  var html = '';
  switch (ex.type) {
    case 'cloze':
      TestCreatorService.normalizeExerciseItems(ex);
      var cItems = (ex.content && ex.content.items) || [];
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">' +
        '    <span class="field-label">Gapped Sentences (enclose answers in brackets e.g. [photosynthesis]):</span>' +
        '    <div style="display:flex;gap:12px;font-size:0.8rem;align-items:center;">' +
        '      <label style="cursor:pointer;font-weight:700;"><input type="checkbox" ' + (ex.content && ex.content.showWordBank ? 'checked' : '') + ' onchange="tcUpdateClozeOption(\'' + ex.id + '\', \'showWordBank\', this.checked)"> Provide Word Bank Chips Pool</label>' +
        '      <span style="font-weight:700;">Pts per blank: <input type="number" style="width:50px;padding:2px;font-family:inherit;" value="' + (ex.pointsPerItem || 1) + '" step="0.5" onchange="tcUpdateExPointsPerItem(\'' + ex.id + '\', Number(this.value))"></span>' +
        '    </div>' +
        '  </div>' +
        cItems.map(function (it, itIdx) {
          var cItemId = 'clozeItem_' + ex.id + '_' + itIdx;
          return '<div class="exercise-subitem-card cloze-subitem-card">' +
            '  <div class="subitem-header">' +
            '    <div class="subitem-header-left">' +
            '      <span class="subitem-badge">#' + (itIdx + 1) + '</span>' +
            '      <span class="subitem-hint-text">Enclose answers in brackets e.g. [photosynthesis]</span>' +
            '    </div>' +
            '    <div class="subitem-header-actions">' +
            (itIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + itIdx + ', -1)">▲</button>' : '') +
            (itIdx < cItems.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + itIdx + ', 1)">▼</button>' : '') +
            '      <button type="button" class="card-btn-icon" title="Duplicate sentence" onclick="tcDuplicateSubItem(\'' + ex.id + '\', \'items\', ' + itIdx + ')"><img src="../assets/icons/duplicate.svg" alt="Duplicate" style="width:13px;height:13px;"></button>' +
            (cItems.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete sentence" onclick="tcRemoveClozeItem(\'' + ex.id + '\', ' + itIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div class="subitem-body-section">' +
            buildSubitemWysiwygHtml({
              id: cItemId,
              content: it.text || '',
              placeholder: 'Sentence text with [bracketed answer]... (accepts markdown and HTML)',
              isCloze: true,
              onInputJs: 'tcUpdateClozeItemText(\'' + ex.id + '\', ' + itIdx + ', __VAL__)'
            }) +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;margin-top:2px;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddClozeItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddSentenceBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'cloze\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'mcq':
      if ((!ex.content.questions || !ex.content.questions.length) && Array.isArray(ex.content.options) && ex.content.options.length > 0) {
        var opts = ex.content.options.map(function (o) { return typeof o === 'string' ? o : (o.text || ''); });
        var corrects = [];
        ex.content.options.forEach(function (o, idx) {
          if (o && (o.isCorrect || o.correct)) corrects.push(idx);
        });
        if (corrects.length === 0 && ex.content.correctIndex !== undefined) corrects.push(ex.content.correctIndex);
        ex.content.questions = [{
          id: TestCreatorService.createEmptyExercise('cloze').id,
          prompt: ex.content.prompt || ex.prompt || 'Choose the correct answer:',
          options: opts,
          correctIndices: corrects,
          points: ex.points || 1
        }];
      } else if (!Array.isArray(ex.content.questions) || !ex.content.questions.length) {
        ex.content.questions = [{
          id: TestCreatorService.createEmptyExercise('cloze').id,
          prompt: ex.prompt || 'Choose the correct answer:',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndices: [0],
          points: 1
        }];
      }
      var qs = ex.content.questions;
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <span class="field-label">Questions &amp; Options:</span>' +
        qs.map(function (q, qIdx) {
          var mcqQId = 'mcqPrompt_' + ex.id + '_' + qIdx;
          var qPts = q.points !== undefined && q.points !== null ? q.points : 1;
          return '<div class="exercise-subitem-card mcq-subitem-card">' +
            '  <div class="subitem-header">' +
            '    <div class="subitem-header-left">' +
            '      <span class="subitem-badge">Q' + (qIdx + 1) + '</span>' +
            '      <div class="subitem-field-grp">' +
            '        <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemPtsLbl') || 'Pts:') + '</span>' +
            '        <input type="number" class="meta-input subitem-pts-input" value="' + qPts + '" title="Points" step="0.5" onchange="tcUpdateMcqPoints(\'' + ex.id + '\', ' + qIdx + ', Number(this.value))">' +
            '      </div>' +
            '    </div>' +
            '    <div class="subitem-header-actions">' +
            (qIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'questions\', ' + qIdx + ', -1)">▲</button>' : '') +
            (qIdx < qs.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'questions\', ' + qIdx + ', 1)">▼</button>' : '') +
            '      <button type="button" class="card-btn-icon" title="Duplicate Question" onclick="tcDuplicateSubItem(\'' + ex.id + '\', \'questions\', ' + qIdx + ')"><img src="../assets/icons/duplicate.svg" alt="Duplicate" style="width:13px;height:13px;"></button>' +
            (qs.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete Question" onclick="tcRemoveMcqQuestion(\'' + ex.id + '\', ' + qIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div class="subitem-body-section">' +
            buildSubitemWysiwygHtml({
              id: mcqQId,
              content: q.prompt || '',
              placeholder: i18n.t('tcQuestionPromptPlaceholder') || 'Enter question prompt (accepts markdown and HTML)...',
              onInputJs: 'tcUpdateMcqPrompt(\'' + ex.id + '\', ' + qIdx + ', __VAL__)'
            }) +
            '  </div>' +
            '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:2px;">' +
            (q.options || []).map(function (opt, oIdx) {
              var isCorrect = (q.correctIndices || []).indexOf(oIdx) !== -1;
              return '<div style="display:flex;align-items:center;gap:4px;font-size:0.8rem;background:#fff;border:1px solid #cbd5e1;padding:3px 6px;border-radius:3px;">' +
                '  <input type="checkbox" ' + (isCorrect ? 'checked' : '') + ' title="Mark as correct answer" onchange="tcToggleMcqCorrect(\'' + ex.id + '\', ' + qIdx + ', ' + oIdx + ', this.checked)">' +
                '  <input type="text" class="meta-input" style="flex:1;padding:2px 4px;font-size:0.8rem;border:none;background:transparent;" value="' + escapeAttr(opt) + '" onchange="tcUpdateMcqOption(\'' + ex.id + '\', ' + qIdx + ', ' + oIdx + ', this.value)">' +
                ((q.options || []).length > 2 ? '  <button type="button" style="border:none;background:none;cursor:pointer;color:#94a3b8;font-size:0.75rem;padding:0 2px;" title="Remove option" onclick="tcRemoveMcqOption(\'' + ex.id + '\', ' + qIdx + ', ' + oIdx + ')">&times;</button>' : '') +
                '</div>';
            }).join('') +
            '  </div>' +
            '  <div style="display:flex;gap:6px;margin-top:2px;">' +
            '    <button type="button" class="neo-btn sm" style="padding:1px 6px;font-size:0.75rem;" onclick="tcAddMcqOption(\'' + ex.id + '\', ' + qIdx + ')">+ Add Option</button>' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;margin-top:2px;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddMcqQuestion(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddSubQuestionBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'mcq\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'open_question':
      TestCreatorService.normalizeExerciseItems(ex);
      var oItems = (ex.content && ex.content.items) || [];
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <span class="field-label">Open / Short Answer Questions:</span>' +
        oItems.map(function (q, qIdx) {
          var lStyle = q.lineStyle || 'lines';
          var lCount = q.lineCount || 4;
          var oqPromptId = 'oqPrompt_' + ex.id + '_' + qIdx;
          var qPts = q.points !== undefined && q.points !== null ? q.points : 2;
          return '<div class="exercise-subitem-card open-question-subitem-card">' +
            '  <div class="subitem-header">' +
            '    <div class="subitem-header-left">' +
            '      <span class="subitem-badge">Q' + (qIdx + 1) + '</span>' +
            '      <div class="subitem-field-grp">' +
            '        <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemPtsLbl') || 'Pts:') + '</span>' +
            '        <input type="number" class="meta-input subitem-pts-input" value="' + qPts + '" step="0.5" min="0.5" onchange="tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'points\', Number(this.value))">' +
            '      </div>' +
            '    </div>' +
            '    <div class="subitem-header-actions">' +
            (qIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + qIdx + ', -1)">▲</button>' : '') +
            (qIdx < oItems.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + qIdx + ', 1)">▼</button>' : '') +
            '      <button type="button" class="card-btn-icon" title="Duplicate Question" onclick="tcDuplicateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ')"><img src="../assets/icons/duplicate.svg" alt="Duplicate" style="width:13px;height:13px;"></button>' +
            (oItems.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete Question" onclick="tcRemoveOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div class="subitem-body-section">' +
            buildSubitemWysiwygHtml({
              id: oqPromptId,
              content: q.prompt || '',
              placeholder: i18n.t('tcQuestionPromptPlaceholder') || 'Enter question prompt (accepts markdown and HTML)...',
              onInputJs: 'tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'prompt\', __VAL__)'
            }) +
            '  </div>' +
            '  <div class="subitem-settings-strip">' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemFormatLbl') || 'Format:') + '</span>' +
            '      <select class="meta-select subitem-select" onchange="tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'lineStyle\', this.value)">' +
            '        <option value="lines" ' + (lStyle === 'lines' ? 'selected' : '') + '>Ruled Writing Lines</option>' +
            '        <option value="dotted" ' + (lStyle === 'dotted' ? 'selected' : '') + '>Dotted Guide Lines</option>' +
            '        <option value="box" ' + (lStyle === 'box' ? 'selected' : '') + '>Blank Bordered Box</option>' +
            '        <option value="grid" ' + (lStyle === 'grid' ? 'selected' : '') + '>Squared Math Grid</option>' +
            '      </select>' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemLinesLbl') || 'Lines:') + '</span>' +
            '      <input type="number" class="meta-input subitem-number-input" value="' + lCount + '" min="1" max="25" onchange="tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'lineCount\', Number(this.value))">' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineSizeLabel') || 'Size:') + '</span>' +
            tcBuildUnitInputHtml(q.lineHeight || exOpts.lineHeight || '28px', 'px', ['px', 'pt', 'cm'], 'tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'lineHeight\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineThicknessLabel') || 'Thickness:') + '</span>' +
            tcBuildUnitInputHtml(q.lineThickness || exOpts.lineThickness || '1px', 'px', ['px', 'pt', 'mm'], 'tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'lineThickness\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineColorLabel') || 'Colour:') + '</span>' +
            '      <input type="color" data-color-css="' + escapeAttr(q.lineColor || exOpts.lineColor || '#94a3b8') + '" value="' + escapeAttr(q.lineColor || exOpts.lineColor || '#94a3b8') + '" style="width:28px;height:24px;padding:1px;border:1.5px solid #333;border-radius:4px;cursor:pointer;" onchange="tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'lineColor\', window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value)">' +
            '    </div>' +
            '    <div class="subitem-field-grp flex-1">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcStarterLbl')) + '</span>' +
            '      <input type="text" class="meta-input subitem-text-input flex-1" placeholder="' + escapeHtml(i18n.t('tcSubitemStarterPlaceholder') || 'e.g. Because...') + '" value="' + escapeAttr(q.answerPrefix || '') + '" onchange="tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'answerPrefix\', this.value)">' +
            '    </div>' +
            '    <div class="subitem-field-grp flex-1">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemGuidanceLbl') || 'Guidance:') + '</span>' +
            '      <input type="text" class="meta-input subitem-text-input flex-1" placeholder="' + escapeHtml(i18n.t('tcSubitemGuidancePlaceholder') || 'e.g. 2-3 sentences, max 40 words') + '" value="' + escapeAttr(q.lengthGuidance || '') + '" onchange="tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'lengthGuidance\', this.value)">' +
            '    </div>' +
            '  </div>' +
            '  <div class="subitem-solution-strip">' +
            '    <span class="subitem-solution-icon" title="Teacher Answer Key">🔑</span>' +
            '    <input type="text" class="meta-input subitem-solution-input flex-1" value="' + escapeAttr(q.sampleAnswer || '') + '" placeholder="' + escapeHtml(i18n.t('tcSubitemSampleAnswerPlaceholder') || 'Sample Solution / Teacher Answer Key') + '" onchange="tcUpdateOpenQuestionItem(\'' + ex.id + '\', ' + qIdx + ', \'sampleAnswer\', this.value)">' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;margin-top:2px;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddOpenQuestionItem(\'' + ex.id + '\')">+ Add Question</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'open_question\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'composition':
      TestCreatorService.normalizeExerciseItems(ex);
      var compItems = (ex.content && ex.content.items) || [];
      var exOpts = TestCreatorService.ensureExerciseOptions(ex);
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <span class="field-label">Writing Prompts &amp; Tasks (Multiple prompts allow choices or multi-part essays):</span>' +
        compItems.map(function (cItem, cIdx) {
          var twc = cItem.targetWordCount || 150;
          var cLines = (cItem.lineCount !== undefined && cItem.lineCount !== null && cItem.lineCount !== '') ? Number(cItem.lineCount) : 18;
          var cStyle = cItem.lineStyle || exOpts.lineStyle || 'solid';
          if (cStyle === 'lines') cStyle = 'solid';
          var cHeight = cItem.lineHeight || exOpts.lineHeight || 28;
          var cThickness = cItem.lineThickness || exOpts.lineThickness || 1;
          var compPromptId = 'compPrompt_' + ex.id + '_' + cIdx;
          return '<div class="exercise-subitem-card composition-subitem-card">' +
            '  <div class="subitem-header">' +
            '    <div class="subitem-header-left">' +
            '      <input type="text" class="meta-input subitem-label-input" value="' + escapeAttr(cItem.label || ('Task ' + (cIdx + 1))) + '" placeholder="Task Label (e.g. Option A)" onchange="tcUpdateCompositionItem(\'' + ex.id + '\', ' + cIdx + ', \'label\', this.value)">' +
            '      <div class="subitem-field-grp">' +
            '        <span class="subitem-field-label">Lines:</span>' +
            '        <input type="number" class="meta-input subitem-number-input" style="width:50px;" value="' + cLines + '" min="0" max="50" onchange="tcUpdateCompositionItem(\'' + ex.id + '\', ' + cIdx + ', \'lineCount\', Math.max(0, Number(this.value) || 0))">' +
            '      </div>' +
            '    </div>' +
            '    <div class="subitem-header-actions">' +
            (cIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + cIdx + ', -1)">▲</button>' : '') +
            (cIdx < compItems.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + cIdx + ', 1)">▼</button>' : '') +
            '      <button type="button" class="card-btn-icon" title="Duplicate Task" onclick="tcDuplicateSubItem(\'' + ex.id + '\', \'items\', ' + cIdx + ')"><img src="../assets/icons/duplicate.svg" alt="Duplicate" style="width:13px;height:13px;"></button>' +
            (compItems.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete task" onclick="tcRemoveCompositionItem(\'' + ex.id + '\', ' + cIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div class="subitem-body-section">' +
            buildSubitemWysiwygHtml({
              id: compPromptId,
              content: cItem.prompt || '',
              placeholder: 'Writing task prompt & instructions (accepts markdown and HTML)...',
              onInputJs: 'tcUpdateCompositionItem(\'' + ex.id + '\', ' + cIdx + ', \'prompt\', __VAL__)'
            }) +
            '  </div>' +
            '  <div class="subitem-settings-strip">' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + (t('tcEssayLineType') || 'Ruling:') + '</span>' +
            '      <select class="meta-select subitem-select" onchange="tcUpdateCompositionItem(\'' + ex.id + '\', ' + cIdx + ', \'lineStyle\', this.value)">' +
            '        <option value="solid"' + (cStyle === 'solid' ? ' selected' : '') + '>' + (t('tcEssayLineTypeSolid') || 'Solid') + '</option>' +
            '        <option value="dashed"' + (cStyle === 'dashed' ? ' selected' : '') + '>' + (t('tcEssayLineTypeDashed') || 'Dashed') + '</option>' +
            '        <option value="dotted"' + (cStyle === 'dotted' ? ' selected' : '') + '>' + (t('tcEssayLineTypeDotted') || 'Dotted') + '</option>' +
            '      </select>' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + (t('tcEssayLineHeight') || 'Line Height:') + '</span>' +
            tcBuildUnitInputHtml(cHeight, 'px', ['px', 'pt', 'cm', 'mm', 'em'], 'tcUpdateCompositionItem(\'' + ex.id + '\', ' + cIdx + ', \'lineHeight\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + (t('tcEssayLineThickness') || 'Thickness:') + '</span>' +
            tcBuildUnitInputHtml(cThickness, 'px', ['px', 'pt', 'mm'], 'tcUpdateCompositionItem(\'' + ex.id + '\', ' + cIdx + ', \'lineThickness\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + (t('tcLineColorLabel') || 'Colour:') + '</span>' +
            '      <input type="color" data-color-css="' + escapeAttr(cItem.lineColor || exOpts.lineColor || '#94a3b8') + '" value="' + escapeAttr(cItem.lineColor || exOpts.lineColor || '#94a3b8') + '" style="width:28px;height:24px;padding:1px;border:1.5px solid #333;border-radius:4px;cursor:pointer;" onchange="tcUpdateCompositionItem(\'' + ex.id + '\', ' + cIdx + ', \'lineColor\', window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value)">' +
            '    </div>' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;margin-top:2px;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddCompositionItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddWritingTask')) + '</button>' +
        '  </div>' +
        '  <div style="margin-top:6px;">' +
        '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:4px;">' +
        '      <span class="field-label" style="margin-bottom:0;">' + escapeHtml(i18n.t('tcScoringRubricCriteria')) + '</span>' +
        '      <div style="display:flex;align-items:center;gap:4px;">' +
        '        <button type="button" class="neo-btn sm" style="padding:2px 8px;font-size:0.75rem;background:#ecfdf5;color:#065f46;border-color:#059669;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenRubricLayoutModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcRubricLayoutTooltip') || 'Customise rubric layout, border, padding, and display mode below exercise') + '">' +
        '          <img src="../assets/icons/layout.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(i18n.t('tcRubricLayoutAppearance') || 'Layout & Appearance') +
        '        </button>' +
        '        <button type="button" class="neo-btn sm" style="padding:2px 8px;font-size:0.75rem;background:#d1fae5;color:#065f46;border-color:#059669;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenRubricMatrixModal(\'' + ex.id + '\')" title="' + escapeAttr(i18n.t('tcViewRubricMatrix') || 'View Rubric Matrix') + '">' +
        '          <img src="../assets/icons/eye.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(i18n.t('tcMatrixBtn') || 'Matrix') +
        '        </button>' +
        '      </div>' +
        '    </div>' +
        '    <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">' +
        (ex.markingRubric || []).map(function (rub, rIdx) {
          return '<div style="display:flex;align-items:center;gap:6px;background:#f8fafc;padding:4px 8px;border-radius:4px;border:1px solid #cbd5e1;font-size:0.8rem;">' +
            '  <input type="text" class="meta-input" style="flex:1;padding:2px 6px;" value="' + escapeAttr(rub.title) + '" onchange="tcUpdateRubricField(\'' + ex.id + '\', ' + rIdx + ', \'title\', this.value)">' +
            '  <span>Max: <input type="number" style="width:46px;padding:2px;" value="' + rub.maxPoints + '" onchange="tcUpdateRubricField(\'' + ex.id + '\', ' + rIdx + ', \'maxPoints\', Number(this.value))"></span>' +
            '  <span>Weight: <input type="number" style="width:40px;padding:2px;" value="' + (rub.weight || 1) + '" step="0.5" onchange="tcUpdateRubricField(\'' + ex.id + '\', ' + rIdx + ', \'weight\', Number(this.value))"></span>' +
            '  <div style="display:inline-flex;gap:3px;align-items:center;">' +
            (rIdx > 0 ? '    <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'markingRubric\', ' + rIdx + ', -1)">▲</button>' : '') +
            (rIdx < (ex.markingRubric || []).length - 1 ? '    <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'markingRubric\', ' + rIdx + ', 1)">▼</button>' : '') +
            '    <button type="button" class="card-btn-icon" style="color:#ef4444;" onclick="tcRemoveRubricItem(\'' + ex.id + '\', ' + rIdx + ')">&times;</button>' +
            '  </div>' +
            '</div>';
        }).join('') +
        '      <button type="button" class="neo-btn sm" style="align-self:flex-start;margin-top:4px;" onclick="tcAddRubricItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddCriteriaBtn')) + '</button>' +
        '    </div>' +
        '  </div>' +
        '</div>';
      break;

    case 'matching':
      var pairs = (ex.content && ex.content.pairs) || [];
      html = '<div style="display:flex;flex-direction:column;gap:6px;">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
        '    <span class="field-label">' + escapeHtml(i18n.t('tcMatchingPairsHeader')) + '</span>' +
        '    <span style="font-weight:700;font-size:0.8rem;">Pts per pair: <input type="number" style="width:48px;padding:2px;font-family:inherit;" value="' + (ex.pointsPerItem || 1) + '" step="0.5" onchange="tcUpdateExPointsPerItem(\'' + ex.id + '\', Number(this.value))"></span>' +
        '  </div>' +
        pairs.map(function (pr, prIdx) {
          return '<div style="display:flex;gap:6px;align-items:center;">' +
            '  <input type="text" class="meta-input" style="flex:1;padding:4px 8px;font-size:0.82rem;" value="' + escapeAttr(pr.left) + '" placeholder="' + escapeHtml(i18n.t('tcItemAPlaceholder')) + '" onchange="tcUpdatePair(\'' + ex.id + '\', ' + prIdx + ', \'left\', this.value)">' +
            '  <span>&harr;</span>' +
            '  <input type="text" class="meta-input" style="flex:1;padding:4px 8px;font-size:0.82rem;" value="' + escapeAttr(pr.right) + '" placeholder="' + escapeHtml(i18n.t('tcItemBPlaceholder')) + '" onchange="tcUpdatePair(\'' + ex.id + '\', ' + prIdx + ', \'right\', this.value)">' +
            '  <div style="display:inline-flex;gap:3px;align-items:center;">' +
            (prIdx > 0 ? '    <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'pairs\', ' + prIdx + ', -1)">▲</button>' : '') +
            (prIdx < pairs.length - 1 ? '    <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'pairs\', ' + prIdx + ', 1)">▼</button>' : '') +
            '    <button type="button" class="card-btn-icon" style="color:#ef4444;" onclick="tcRemovePair(\'' + ex.id + '\', ' + prIdx + ')">&times;</button>' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;align-self:flex-start;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddPair(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddPairBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'matching\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'transformation':
    case 'sentence_transformation':
      if (!ex.content) ex.content = {};
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        if (ex.content.leadIn || ex.content.original) {
          ex.content.items = [{
            id: TestCreatorService.createEmptyExercise('cloze').id,
            original: ex.content.leadIn || ex.content.original || '',
            keyword: ex.content.keyword || 'REWRITE',
            targetPrefix: ex.content.startOfSentence || ex.content.targetPrefix || '',
            targetSuffix: ex.content.targetSuffix || '',
            solution: ex.expectedAnswer || ex.content.solution || ''
          }];
        } else {
          ex.content.items = [{
            id: TestCreatorService.createEmptyExercise('cloze').id,
            original: 'He started working here two years ago.',
            keyword: 'FOR',
            targetPrefix: 'He has worked here',
            targetSuffix: 'two years.',
            solution: 'for'
          }];
        }
      }
      var tItems = ex.content.items;
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
        '    <span class="field-label">' + escapeHtml(i18n.t('tcSentenceTransHeader')) + '</span>' +
        '    <span style="font-size:0.8rem;font-weight:700;">Pts per sentence: <input type="number" style="width:48px;padding:2px;font-family:inherit;" value="' + (ex.pointsPerItem || 1) + '" step="0.5" onchange="tcUpdateExPointsPerItem(\'' + ex.id + '\', Number(this.value))"></span>' +
        '  </div>' +
        tItems.map(function (it, tIdx) {
          return '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;padding:8px;display:flex;flex-direction:column;gap:6px;">' +
            '  <div style="display:flex;gap:6px;align-items:center;">' +
            '    <span style="font-weight:800;font-size:0.8rem;width:20px;">' + (tIdx + 1) + '.</span>' +
            '    <input type="text" class="meta-input" style="flex:1;font-size:0.82rem;" value="' + escapeAttr(it.original) + '" placeholder="' + escapeHtml(i18n.t('tcTransOriginalPlaceholder')) + '" onchange="tcUpdateTransformationField(\'' + ex.id + '\', ' + tIdx + ', \'original\', this.value)">' +
            '    <input type="text" class="meta-input" style="width:90px;font-size:0.82rem;font-weight:bold;text-transform:uppercase;text-align:center;" value="' + escapeAttr(it.keyword) + '" placeholder="' + escapeHtml(i18n.t('tcKeywordPlaceholder')) + '" title="Clue keyword" onchange="tcUpdateTransformationField(\'' + ex.id + '\', ' + tIdx + ', \'keyword\', this.value.toUpperCase())">' +
            '    <div style="display:inline-flex;gap:3px;align-items:center;">' +
            (tIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + tIdx + ', -1)">▲</button>' : '') +
            (tIdx < tItems.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + tIdx + ', 1)">▼</button>' : '') +
            (tItems.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete sentence" onclick="tcRemoveTransformationItem(\'' + ex.id + '\', ' + tIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div style="display:flex;gap:6px;align-items:center;padding-left:26px;">' +
            '    <span style="font-weight:700;font-size:0.82rem;">&rarr;</span>' +
            '    <input type="text" class="meta-input" style="flex:1;font-size:0.8rem;" value="' + escapeAttr(it.targetPrefix || '') + '" placeholder="' + escapeHtml(i18n.t('tcTransPrefixPlaceholder')) + '" onchange="tcUpdateTransformationField(\'' + ex.id + '\', ' + tIdx + ', \'targetPrefix\', this.value)">' +
            '    <input type="text" class="meta-input" style="flex:1;font-size:0.8rem;border-color:#fca5a5;font-weight:bold;" value="' + escapeAttr(it.solution || '') + '" placeholder="' + escapeHtml(i18n.t('tcTransSolutionPlaceholder')) + '" title="Expected answer inside blank" onchange="tcUpdateTransformationField(\'' + ex.id + '\', ' + tIdx + ', \'solution\', this.value)">' +
            '    <input type="text" class="meta-input" style="flex:1;font-size:0.8rem;" value="' + escapeAttr(it.targetSuffix || '') + '" placeholder="' + escapeHtml(i18n.t('tcTransSuffixPlaceholder')) + '" onchange="tcUpdateTransformationField(\'' + ex.id + '\', ' + tIdx + ', \'targetSuffix\', this.value)">' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;align-self:flex-start;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddTransformationItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddSentenceBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'transformation\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'translation':
      if (!ex.content) ex.content = {};
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: TestCreatorService.createEmptyExercise('cloze').id,
          sourceText: 'Where is the nearest train station?',
          modelTranslation: 'Où se trouve la gare la plus proche ?',
          allocatedLines: 2
        }];
      }
      var trs = ex.content.items;
      html = '<div style="display:flex;flex-direction:column;gap:6px;">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
        '    <span class="field-label">' + escapeHtml(i18n.t('tcSentencesToTranslate')) + '</span>' +
        '    <span style="font-size:0.8rem;font-weight:700;">Pts per sentence: <input type="number" style="width:48px;padding:2px;font-family:inherit;" value="' + (ex.pointsPerItem || 2) + '" step="0.5" onchange="tcUpdateExPointsPerItem(\'' + ex.id + '\', Number(this.value))"></span>' +
        '  </div>' +
        trs.map(function (tr, tIdx) {
          return '<div style="display:flex;flex-direction:column;gap:4px;background:#f8fafc;padding:6px;border-radius:4px;border:1px solid #cbd5e1;">' +
            '  <div style="display:flex;gap:6px;align-items:center;">' +
            '    <span style="font-weight:800;font-size:0.8rem;width:20px;">' + (tIdx + 1) + '.</span>' +
            '    <input type="text" class="meta-input" style="flex:1;font-size:0.82rem;" value="' + escapeAttr(tr.sourceText) + '" placeholder="' + escapeHtml(i18n.t('tcSourceSentencePlaceholder')) + '" onchange="tcUpdateTrField(\'' + ex.id + '\', ' + tIdx + ', \'sourceText\', this.value)">' +
            '    <span style="font-size:0.75rem;font-weight:700;">Lines: <input type="number" style="width:40px;padding:2px;" value="' + (tr.allocatedLines || 2) + '" min="1" max="10" onchange="tcUpdateTrField(\'' + ex.id + '\', ' + tIdx + ', \'allocatedLines\', Number(this.value))"></span>' +
            '    <div style="display:inline-flex;gap:3px;align-items:center;">' +
            (tIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + tIdx + ', -1)">▲</button>' : '') +
            (tIdx < trs.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + tIdx + ', 1)">▼</button>' : '') +
            (trs.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete sentence" onclick="tcRemoveTrItem(\'' + ex.id + '\', ' + tIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div style="padding-left:26px;">' +
            '    <input type="text" class="meta-input" style="width:100%;font-size:0.82rem;border-color:#fca5a5;" value="' + escapeAttr(tr.modelTranslation) + '" placeholder="' + escapeHtml(i18n.t('tcModelTranslationPlaceholder')) + '" onchange="tcUpdateTrField(\'' + ex.id + '\', ' + tIdx + ', \'modelTranslation\', this.value)">' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;align-self:flex-start;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddTrItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddSentenceBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'translation\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'picture_description':
      TestCreatorService.normalizeExerciseItems(ex);
      var pItems = (ex.content && ex.content.items) || [];
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <span class="field-label">' + escapeHtml(i18n.t('tcPictureDescriptionHeader')) + '</span>' +
        pItems.map(function (pIt, pIdx) {
          var pImg = pIt.imagePath || '';
          var pCap = pIt.imageCaption || '';
          var pPrompt = pIt.prompt || '';
          var pLines = pIt.lineCount || 8;
          var pStyle = pIt.lineStyle || 'lines';
          var pAns = pIt.modelAnswer || '';
          var pPts = pIt.points || 4;
          var picPromptId = 'picPrompt_' + ex.id + '_' + pIdx;
          return '<div class="exercise-subitem-card picture-subitem-card">' +
            '  <div class="subitem-header">' +
            '    <div class="subitem-header-left" style="flex:1;">' +
            '      <span class="subitem-badge">Pic ' + (pIdx + 1) + '</span>' +
            '      <input type="text" class="meta-input subitem-text-input flex-1" value="' + escapeAttr(pImg) + '" placeholder="' + escapeHtml(i18n.t('tcPicturePathPlaceholder')) + '" onchange="tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'imagePath\', this.value); renderExerciseCards();">' +
            '      <input type="file" id="picFileInput_' + ex.id + '_' + pIdx + '" accept="image/*" style="display:none;" onchange="tcHandlePicItemFileSelected(\'' + ex.id + '\', ' + pIdx + ', this)">' +
            '      <button type="button" class="neo-btn sm" onclick="document.getElementById(\'picFileInput_' + ex.id + '_' + pIdx + '\').click()">' + escapeHtml(i18n.t('tcBrowseBtn')) + '</button>' +
            '      <div class="subitem-field-grp">' +
            '        <span class="subitem-field-label">Pts:</span>' +
            '        <input type="number" class="meta-input subitem-pts-input" value="' + pPts + '" step="0.5" onchange="tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'points\', Number(this.value))">' +
            '      </div>' +
            '    </div>' +
            '    <div class="subitem-header-actions">' +
            (pIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + pIdx + ', -1)">▲</button>' : '') +
            (pIdx < pItems.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + pIdx + ', 1)">▼</button>' : '') +
            '      <button type="button" class="card-btn-icon" title="Duplicate picture item" onclick="tcDuplicateSubItem(\'' + ex.id + '\', \'items\', ' + pIdx + ')"><img src="../assets/icons/duplicate.svg" alt="Duplicate" style="width:13px;height:13px;"></button>' +
            (pItems.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete picture item" onclick="tcRemovePictureItem(\'' + ex.id + '\', ' + pIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            (pImg ? '  <div class="subitem-thumbnail-preview"><img src="' + escapeAttr(pImg) + '" alt="Preview" /></div>' : '') +
            '  <div class="subitem-caption-row">' +
            '    <span class="subitem-field-label">Caption:</span>' +
            '    <input type="text" class="meta-input subitem-text-input flex-1" value="' + escapeAttr(pCap) + '" placeholder="' + escapeHtml(i18n.t('tcPictureCaptionPlaceholder')) + '" onchange="tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'imageCaption\', this.value)">' +
            '  </div>' +
            '  <div class="subitem-body-section">' +
            buildSubitemWysiwygHtml({
              id: picPromptId,
              content: pPrompt,
              placeholder: i18n.t('tcPicturePromptPlaceholder') || 'Describe the scene shown in the image (accepts markdown and HTML)...',
              onInputJs: 'tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'prompt\', __VAL__)'
            }) +
            '  </div>' +
            '  <div class="subitem-settings-strip">' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">Format:</span>' +
            '      <select class="meta-select subitem-select" onchange="tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'lineStyle\', this.value)">' +
            '        <option value="lines" ' + (pStyle === 'lines' ? 'selected' : '') + '>Lined Writing Area</option>' +
            '        <option value="box" ' + (pStyle === 'box' ? 'selected' : '') + '>Blank Bordered Box</option>' +
            '        <option value="grid" ' + (pStyle === 'grid' ? 'selected' : '') + '>Squared Math Grid</option>' +
            '      </select>' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">Lines:</span>' +
            '      <input type="number" class="meta-input subitem-number-input" value="' + pLines + '" min="1" max="30" onchange="tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'lineCount\', Number(this.value))">' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineSizeLabel') || 'Size:') + '</span>' +
            tcBuildUnitInputHtml(pIt.lineHeight || '28px', 'px', ['px', 'pt', 'cm'], 'tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'lineHeight\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineThicknessLabel') || 'Thickness:') + '</span>' +
            tcBuildUnitInputHtml(pIt.lineThickness || '1px', 'px', ['px', 'pt', 'mm'], 'tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'lineThickness\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineColorLabel') || 'Colour:') + '</span>' +
            '      <input type="color" data-color-css="' + escapeAttr(pIt.lineColor || '#94a3b8') + '" value="' + escapeAttr(pIt.lineColor || '#94a3b8') + '" style="width:28px;height:24px;padding:1px;border:1.5px solid #333;border-radius:4px;cursor:pointer;" onchange="tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'lineColor\', window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value)">' +
            '    </div>' +
            '    <div class="subitem-field-grp flex-1">' +
            '      <span class="subitem-solution-icon" title="Teacher Model Answer">🔑</span>' +
            '      <input type="text" class="meta-input subitem-solution-input flex-1" placeholder="' + escapeHtml(i18n.t('tcModelAnswerPlaceholder')) + '" value="' + escapeAttr(pAns) + '" onchange="tcUpdatePictureItem(\'' + ex.id + '\', ' + pIdx + ', \'modelAnswer\', this.value)">' +
            '    </div>' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;margin-top:2px;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddPictureItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddPictureBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'table_completion':
      var headers = (ex.content && ex.content.headers) || [];
      var rows = (ex.content && ex.content.rows) || [];
      html = '<div style="display:flex;flex-direction:column;gap:6px;">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
        '    <span class="field-label">' + escapeHtml(i18n.t('tcTableCompletionHeader')) + '</span>' +
        '    <span style="font-size:0.8rem;font-weight:700;">Pts per blank: <input type="number" style="width:48px;padding:2px;font-family:inherit;" value="' + (ex.pointsPerItem || 1) + '" step="0.5" onchange="tcUpdateExPointsPerItem(\'' + ex.id + '\', Number(this.value))"></span>' +
        '  </div>' +
        '  <div style="overflow-x:auto;">' +
        '    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">' +
        '      <thead><tr>' + headers.map(function (h, hIdx) {
          return '<th style="border:1px solid #94a3b8;padding:4px;background:#e2e8f0;">' +
            '  <div style="display:flex;align-items:center;gap:2px;">' +
            '    <input type="text" style="flex:1;font-weight:bold;border:none;background:none;font-size:0.8rem;" value="' + escapeAttr(h) + '" onchange="tcUpdateTableTh(\'' + ex.id + '\', ' + hIdx + ', this.value)">' +
            (headers.length > 1 ? '    <button type="button" style="border:none;background:none;cursor:pointer;color:#ef4444;font-size:0.7rem;padding:0 2px;" title="Delete Column" onclick="tcRemoveTableCol(\'' + ex.id + '\', ' + hIdx + ')">&times;</button>' : '') +
            '  </div>' +
            '</th>';
        }).join('') + '</tr></thead>' +
        '      <tbody>' + rows.map(function (r, rIdx) {
          return '<tr>' + (r || []).map(function (cell, cIdx) {
            var bg = cell && cell.isBlank ? '#fef08a' : '#fff';
            var badge = cell && cell.isBlank ? ' <span style="font-size:0.68rem;background:#000;color:#fff;padding:1px 4px;border-radius:2px;">' + escapeHtml(i18n.t('tcBlankCell')) + '</span>' : '';
            return '<td style="border:1px solid #94a3b8;padding:4px;background:' + bg + ';">' +
              '  <div style="display:flex;align-items:center;gap:4px;">' +
              '    <input type="text" style="flex:1;border:none;background:none;font-size:0.8rem;" value="' + escapeAttr(cell ? cell.text : '') + '" onchange="tcUpdateTableCellText(\'' + ex.id + '\', ' + rIdx + ', ' + cIdx + ', this.value)">' +
              '    <button type="button" style="border:1px solid #333;background:#fff;cursor:pointer;font-size:0.7rem;padding:1px 4px;" onclick="tcToggleTableCellBlank(\'' + ex.id + '\', ' + rIdx + ', ' + cIdx + ')">' + escapeHtml(i18n.t('tcToggleCell')) + '</button>' +
              badge +
              '  </div>' +
              '</td>';
          }).join('') +
          '  <td style="border:none;padding:2px;white-space:nowrap;">' +
          (rIdx > 0 ? '<button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'rows\', ' + rIdx + ', -1)">▲</button>' : '') +
          (rIdx < rows.length - 1 ? '<button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'rows\', ' + rIdx + ', 1)">▼</button>' : '') +
          (rows.length > 1 ? '<button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete Row" onclick="tcRemoveTableRow(\'' + ex.id + '\', ' + rIdx + ')">&times;</button>' : '') +
          '</td>' +
          '</tr>';
        }).join('') +
        '      </tbody>' +
        '    </table>' +
        '  </div>' +
        '  <div style="display:flex;gap:8px;margin-top:4px;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddTableRow(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddRowBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddTableCol(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddColBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'table_rows\')">' + escapeHtml(i18n.t('tcAddMultipleRowsBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'odd_one_out':
      if (!ex.content) ex.content = {};
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: TestCreatorService.createEmptyExercise('cloze').id,
          words: ['Apple', 'Banana', 'Carrot', 'Orange'],
          intruder: 'Carrot',
          justificationKey: 'Carrot is a vegetable while the others are fruits.',
          pointsIntruder: 1,
          pointsJustification: 1
        }];
      }
      var oddItems = ex.content.items;
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <span class="field-label">' + escapeHtml(i18n.t('tcOddOneOutHeader')) + '</span>' +
        oddItems.map(function (it, oIdx) {
          var wordsStr = Array.isArray(it.words) ? it.words.join(', ') : (it.words || '');
          return '<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;padding:8px;display:flex;flex-direction:column;gap:6px;">' +
            '  <div style="display:flex;gap:6px;align-items:center;">' +
            '    <span style="font-weight:800;font-size:0.8rem;width:20px;">' + (oIdx + 1) + '.</span>' +
            '    <input type="text" class="meta-input" style="flex:1;font-size:0.82rem;" value="' + escapeAttr(wordsStr) + '" placeholder="' + escapeHtml(i18n.t('tcWordsGroupPlaceholder')) + '" onchange="tcUpdateOddOneOutWords(\'' + ex.id + '\', ' + oIdx + ', this.value)">' +
            '    <div style="display:inline-flex;gap:3px;align-items:center;">' +
            (oIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + oIdx + ', -1)">▲</button>' : '') +
            (oIdx < oddItems.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'items\', ' + oIdx + ', 1)">▼</button>' : '') +
            (oddItems.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete item" onclick="tcRemoveOddOneOutItem(\'' + ex.id + '\', ' + oIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div style="display:flex;gap:8px;align-items:center;padding-left:26px;">' +
            '    <span style="font-weight:700;font-size:0.8rem;">' + escapeHtml(i18n.t('tcIntruderLbl')) + '</span>' +
            '    <input type="text" class="meta-input" style="width:130px;font-size:0.8rem;font-weight:bold;" value="' + escapeAttr(it.intruder || '') + '" placeholder="' + escapeHtml(i18n.t('tcIntruderPlaceholder')) + '" onchange="tcUpdateOddOneOutField(\'' + ex.id + '\', ' + oIdx + ', \'intruder\', this.value)">' +
            '    <span style="font-size:0.75rem;font-weight:700;">Pts: <input type="number" style="width:40px;padding:2px;" value="' + (it.pointsIntruder !== undefined ? it.pointsIntruder : 1) + '" step="0.5" onchange="tcUpdateOddOneOutField(\'' + ex.id + '\', ' + oIdx + ', \'pointsIntruder\', Number(this.value))"></span>' +
            '    <span style="font-weight:700;font-size:0.8rem;margin-left:6px;">' + escapeHtml(i18n.t('tcWhyLbl')) + '</span>' +
            '    <input type="text" class="meta-input" style="flex:1;font-size:0.8rem;border-color:#fca5a5;" value="' + escapeAttr(it.justificationKey || '') + '" placeholder="' + escapeHtml(i18n.t('tcJustificationPlaceholder')) + '" onchange="tcUpdateOddOneOutField(\'' + ex.id + '\', ' + oIdx + ', \'justificationKey\', this.value)">' +
            '    <span style="font-size:0.75rem;font-weight:700;">Pts: <input type="number" style="width:40px;padding:2px;" value="' + (it.pointsJustification !== undefined ? it.pointsJustification : 1) + '" step="0.5" onchange="tcUpdateOddOneOutField(\'' + ex.id + '\', ' + oIdx + ', \'pointsJustification\', Number(this.value))"></span>' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;align-self:flex-start;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddOddOneOutItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddItemBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'odd_one_out\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    case 'reading_comprehension':
      if (!ex.content) ex.content = {};
      var rcTitle = ex.content.passageTitle || '';
      var rcPassage = ex.content.passageText || '';
      var subQuestions = ex.content.subQuestions || [];
      var rcTitleId = 'rcTitle_' + ex.id;
      var rcPassageId = 'rcPassage_' + ex.id;
      html = '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '  <span class="field-label">' + escapeHtml(i18n.t('tcReadingPassageHeader')) + '</span>' +
        '  <div style="display:flex;align-items:center;gap:4px;">' +
        '    <input type="text" id="' + rcTitleId + '" class="meta-input" style="flex:1;font-weight:bold;font-size:0.85rem;" value="' + escapeAttr(rcTitle) + '" placeholder="' + escapeHtml(i18n.t('tcPassageTitlePlaceholder')) + '" onchange="tcUpdateExContentField(\'' + ex.id + '\', \'passageTitle\', this.value)">' +
        '    ' + buildMiniFormatToolbar(rcTitleId) +
        '  </div>' +
        buildSubitemWysiwygHtml({
          id: rcPassageId,
          content: rcPassage,
          placeholder: i18n.t('tcPassageTextPlaceholder') || 'Enter reading passage text (accepts markdown and HTML)...',
          minHeight: '110px',
          onInputJs: 'tcUpdateExContentField(\'' + ex.id + '\', \'passageText\', __VAL__)'
        }) +
        '  <span class="field-label" style="margin-top:4px;">' + escapeHtml(i18n.t('tcComprehensionQuestionsHeader')) + '</span>' +
        subQuestions.map(function (sq, sIdx) {
          var sqType = sq.answerType || 'short';
          var sqLines = sq.lineCount || 1;
          var rcSubQId = 'rcSubQ_' + ex.id + '_' + sIdx;
          var sqPts = sq.points !== undefined && sq.points !== null ? sq.points : 1;
          return '<div class="exercise-subitem-card reading-subitem-card">' +
            '  <div class="subitem-header">' +
            '    <div class="subitem-header-left">' +
            '      <span class="subitem-badge">Q' + (sIdx + 1) + '</span>' +
            '      <div class="subitem-field-grp">' +
            '        <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemPtsLbl') || 'Pts:') + '</span>' +
            '        <input type="number" class="meta-input subitem-pts-input" value="' + sqPts + '" step="0.5" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'points\', Number(this.value))">' +
            '      </div>' +
            '    </div>' +
            '    <div class="subitem-header-actions">' +
            (sIdx > 0 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move up" onclick="tcMoveSubItem(\'' + ex.id + '\', \'subQuestions\', ' + sIdx + ', -1)">▲</button>' : '') +
            (sIdx < subQuestions.length - 1 ? '      <button type="button" class="card-btn-icon tc-order-btn" title="Move down" onclick="tcMoveSubItem(\'' + ex.id + '\', \'subQuestions\', ' + sIdx + ', 1)">▼</button>' : '') +
            '      <button type="button" class="card-btn-icon" title="Duplicate Question" onclick="tcDuplicateSubItem(\'' + ex.id + '\', \'subQuestions\', ' + sIdx + ')"><img src="../assets/icons/duplicate.svg" alt="Duplicate" style="width:13px;height:13px;"></button>' +
            (subQuestions.length > 1 ? '      <button type="button" class="card-btn-icon" style="color:#ef4444;" title="Delete question" onclick="tcRemoveReadingSubQ(\'' + ex.id + '\', ' + sIdx + ')">&times;</button>' : '') +
            '    </div>' +
            '  </div>' +
            '  <div class="subitem-body-section">' +
            buildSubitemWysiwygHtml({
              id: rcSubQId,
              content: sq.prompt || '',
              placeholder: i18n.t('tcQuestionPromptPlaceholder') || 'Enter question prompt (accepts markdown and HTML)...',
              onInputJs: 'tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'prompt\', __VAL__)'
            }) +
            '  </div>' +
            '  <div class="subitem-settings-strip">' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemFormatLbl') || 'Format:') + '</span>' +
            '      <select class="meta-select subitem-select" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'answerType\', this.value)">' +
            '        <option value="short"' + (sqType === 'short' ? ' selected' : '') + '>Short Answer</option>' +
            '        <option value="true_false_justify"' + (sqType === 'true_false_justify' ? ' selected' : '') + '>True/False + Quote Line</option>' +
            '      </select>' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">Style:</span>' +
            '      <select class="meta-select subitem-select" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'lineStyle\', this.value)">' +
            '        <option value="lines"' + (sq.lineStyle === 'lines' ? ' selected' : '') + '>Ruled Lines</option>' +
            '        <option value="dotted"' + (sq.lineStyle === 'dotted' ? ' selected' : '') + '>Dotted Lines</option>' +
            '        <option value="box"' + (sq.lineStyle === 'box' ? ' selected' : '') + '>Bordered Box</option>' +
            '      </select>' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemLinesLbl') || 'Lines:') + '</span>' +
            '      <input type="number" class="meta-input subitem-number-input" value="' + sqLines + '" min="1" max="8" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'lineCount\', Number(this.value))">' +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineSizeLabel') || 'Size:') + '</span>' +
            tcBuildUnitInputHtml(sq.lineHeight || '28px', 'px', ['px', 'pt', 'cm'], 'tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'lineHeight\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineThicknessLabel') || 'Thickness:') + '</span>' +
            tcBuildUnitInputHtml(sq.lineThickness || '1px', 'px', ['px', 'pt', 'mm'], 'tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'lineThickness\', __VAL__)') +
            '    </div>' +
            '    <div class="subitem-field-grp">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcLineColorLabel') || 'Colour:') + '</span>' +
            '      <input type="color" data-color-css="' + escapeAttr(sq.lineColor || '#94a3b8') + '" value="' + escapeAttr(sq.lineColor || '#94a3b8') + '" style="width:28px;height:24px;padding:1px;border:1.5px solid #333;border-radius:4px;cursor:pointer;" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'lineColor\', window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(this) : this.value)">' +
            '    </div>' +
            '    <div class="subitem-field-grp flex-1">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcStarterLbl')) + '</span>' +
            '      <input type="text" class="meta-input subitem-text-input flex-1" placeholder="' + escapeHtml(i18n.t('tcSubitemStarterPlaceholder') || 'e.g. Because...') + '" value="' + escapeAttr(sq.answerPrefix || '') + '" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'answerPrefix\', this.value)">' +
            '    </div>' +
            '    <div class="subitem-field-grp flex-1">' +
            '      <span class="subitem-field-label">' + escapeHtml(i18n.t('tcSubitemGuidanceLbl') || 'Guidance:') + '</span>' +
            '      <input type="text" class="meta-input subitem-text-input flex-1" placeholder="' + escapeHtml(i18n.t('tcSubitemGuidancePlaceholder') || 'e.g. 2-3 sentences') + '" value="' + escapeAttr(sq.lengthGuidance || '') + '" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'lengthGuidance\', this.value)">' +
            '    </div>' +
            '  </div>' +
            '  <div class="subitem-solution-strip">' +
            '    <span class="subitem-solution-icon" title="Teacher Model Solution">🔑</span>' +
            '    <input type="text" class="meta-input subitem-solution-input flex-1" value="' + escapeAttr(sq.solution || '') + '" placeholder="' + escapeHtml(i18n.t('tcExpectedSolutionPlaceholder') || 'Expected solution / Answer key') + '" onchange="tcUpdateReadingSubQ(\'' + ex.id + '\', ' + sIdx + ', \'solution\', this.value)">' +
            '  </div>' +
            '</div>';
        }).join('') +
        '  <div style="display:flex;gap:8px;align-self:flex-start;">' +
        '    <button type="button" class="neo-btn sm" onclick="tcAddReadingSubQuestion(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddSubQuestionBtn')) + '</button>' +
        '    <button type="button" class="neo-btn sm" onclick="tcOpenBulkAddModal(\'' + ex.id + '\', \'reading_comprehension\')">' + escapeHtml(i18n.t('tcBulkAddBtn')) + '</button>' +
        '  </div>' +
        '</div>';
      break;

    default:
      html = '<div style="font-size:0.82rem;color:#64748b;">Configure details for ' + ex.type + ' above.</div>';
      break;
  }
  return html;
}

function buildExerciseOptionsHtml(ex) {
  var o = TestCreatorService.ensureExerciseOptions(ex);
  var typeObj = TestCreatorService.EXERCISE_TYPES.find(function (t) { return t.id === ex.type; }) || { name: ex.type };
  var html = '<div class="opt-panel-header">' +
    '<span class="opt-panel-title">Exercise Customisation Options (' + escapeHtml(typeObj.name || ex.type) + ')</span>' +
    '</div><div class="opt-grid">';

  switch (ex.type) {
    case 'cloze':
      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcBlankPresentationStyle')) + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'blankStyle\', this.value)">' +
        '<option value="underline"' + (o.blankStyle === 'underline' ? ' selected' : '') + '>Solid Underline (____)</option>' +
        '<option value="bracketed_box"' + (o.blankStyle === 'bracketed_box' ? ' selected' : '') + '>Boxed Fill-in ([ &nbsp; ])</option>' +
        '<option value="length_dots"' + (o.blankStyle === 'length_dots' ? ' selected' : '') + '>Character-length Dots (·····)</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcWordBankOrder')) + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'wordBankOrder\', this.value)">' +
        '<option value="shuffled"' + (o.wordBankOrder === 'shuffled' ? ' selected' : '') + '>Random Shuffled</option>' +
        '<option value="alphabetical"' + (o.wordBankOrder === 'alphabetical' ? ' selected' : '') + '>Alphabetical A–Z</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcExtraDistractors')) + '</span>' +
        '<input type="text" class="opt-input" placeholder="' + escapeHtml(i18n.t('tcExtraDistractorsPlaceholder')) + '" value="' + escapeAttr(o.wordBankDistractors || '') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'wordBankDistractors\', this.value)">' +
        '</div>';

      html += '<div class="opt-field" style="justify-content:center;">' +
        '<label class="opt-checkbox-label">' +
        '<input type="checkbox"' + (o.showFirstLetter ? ' checked' : '') + ' onchange="tcUpdateExOption(\'' + ex.id + '\', \'showFirstLetter\', this.checked)">' +
        '<span>' + escapeHtml(i18n.t('tcRevealFirstLetter')) + '</span>' +
        '</label></div>';
      break;

    case 'mcq':
      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcLayoutArrangement')) + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'layout\', this.value)">' +
        '<option value="2-columns"' + (o.layout === '2-columns' ? ' selected' : '') + '>2-Column Grid (Compact)</option>' +
        '<option value="1-column"' + (o.layout === '1-column' ? ' selected' : '') + '>1-Column Vertical Stack</option>' +
        '<option value="inline"' + (o.layout === 'inline' ? ' selected' : '') + '>Horizontal Inline Row</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcMarkerStyle')) + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'markerStyle\', this.value)">' +
        '<option value="letters"' + (o.markerStyle === 'letters' ? ' selected' : '') + '>Letters (A, B, C, D)</option>' +
        '<option value="checkbox"' + (o.markerStyle === 'checkbox' ? ' selected' : '') + '>Square Checkbox [ ]</option>' +
        '<option value="circle"' + (o.markerStyle === 'circle' ? ' selected' : '') + '>Radio Circle ( )</option>' +
        '<option value="numbers"' + (o.markerStyle === 'numbers' ? ' selected' : '') + '>Numbers (1, 2, 3, 4)</option>' +
        '</select></div>';

      html += '<div class="opt-field" style="justify-content:center;">' +
        '<label class="opt-checkbox-label">' +
        '<input type="checkbox"' + (o.shuffleOptions ? ' checked' : '') + ' onchange="tcUpdateExOption(\'' + ex.id + '\', \'shuffleOptions\', this.checked)">' +
        '<span>' + escapeHtml(i18n.t('tcShuffleExport')) + '</span>' +
        '</label></div>';
      break;

    case 'open_question':
      var curOqNumMode = (o.numberedLines !== undefined && o.numberedLines !== null) ? String(o.numberedLines) : 'inherit';
      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcDefaultLineStyle')) + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'lineStyle\', this.value)">' +
        '<option value="lines"' + (o.lineStyle === 'lines' ? ' selected' : '') + '>Ruled Writing Lines</option>' +
        '<option value="dotted"' + (o.lineStyle === 'dotted' ? ' selected' : '') + '>Dotted Guide Lines</option>' +
        '<option value="grid"' + (o.lineStyle === 'grid' ? ' selected' : '') + '>Squared Math Grid</option>' +
        '<option value="box"' + (o.lineStyle === 'box' ? ' selected' : '') + '>Blank Bordered Box</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcStyleNumberedLines') || 'Line Numbering') + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'numberedLines\', this.value === \'inherit\' ? \'inherit\' : (this.value === \'true\'))">' +
        '<option value="inherit"' + (curOqNumMode === 'inherit' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingInherit') || 'Inherit Test Global') + '</option>' +
        '<option value="true"' + (curOqNumMode === 'true' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingEnable') || 'Numbered Lines Enabled') + '</option>' +
        '<option value="false"' + (curOqNumMode === 'false' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingDisable') || 'Plain Lines (No Numbers)') + '</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcAnswerStarterPrefix')) + '</span>' +
        '<input type="text" class="opt-input" placeholder="' + escapeHtml(i18n.t('tcAnswerStarterPlaceholder')) + '" value="' + escapeAttr(o.answerPrefix || '') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'answerPrefix\', this.value)">' +
        '</div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcLengthGuidance')) + '</span>' +
        '<input type="text" class="opt-input" placeholder="' + escapeHtml(i18n.t('tcLengthGuidancePlaceholder')) + '" value="' + escapeAttr(o.lengthGuidance || '') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'lengthGuidance\', this.value)">' +
        '</div>';
      break;

    case 'composition':
      // Exercise Component Ordering & Inclusions Sub-panel (Merged)
      var compOrder = (Array.isArray(o.componentOrder) && o.componentOrder.length)
        ? o.componentOrder.slice()
        : ['genreBadge', 'prompts', 'draftBox', 'writingLines', 'checklist', 'rubric'];
      ['genreBadge', 'prompts', 'draftBox', 'writingLines', 'checklist', 'rubric'].forEach(function (k) {
        if (compOrder.indexOf(k) === -1) compOrder.push(k);
      });
      o.componentOrder = compOrder;

      var compLabels = {
        genreBadge: t('tcCompGenreBadge') || 'Genre / Type Badge',
        prompts: t('tcCompPrompts') || 'Prompts / Topic Choices',
        draftBox: t('tcCompDraftBox') || 'Rough Work / Draft Box',
        writingLines: t('tcCompWritingLines') || 'Writing / Essay Lines',
        checklist: t('tcCompChecklist') || 'Writing Checklist',
        rubric: t('tcCompRubric') || 'Evaluation Rubric'
      };

      function isCmpActive(k) {
        if (k === 'draftBox') return !!o.showDraftBox;
        if (k === 'checklist') return !!o.showChecklist;
        if (k === 'writingLines') return o.showWritingLines !== false;
        if (k === 'genreBadge') return o.showGenreBadge !== undefined ? !!o.showGenreBadge : !!o.textGenre;
        if (k === 'prompts') return o.showPrompts !== false;
        if (k === 'rubric') return o.showRubric !== false;
        return true;
      }

      var curLineStyle = o.lineStyle || 'solid';
      if (curLineStyle === 'lines') curLineStyle = 'solid';
      var curLineHeight = o.lineHeight || 28;
      var curLineThickness = o.lineThickness || 1;

      var clItems = (Array.isArray(o.checklistItems) && o.checklistItems.length)
        ? o.checklistItems
        : ['Structure & Paragraphs', 'Spelling & Verb Tenses', 'Punctuation & Capitalization', 'Word Count Verified'];
      var clItemsInitialHtml = clItems.map(function (cItem, cIdx) {
        return '<div class="tc-checklist-item-row">' +
          '<span style="font-weight:700;font-size:0.8rem;color:#64748b;user-select:none;">☐</span>' +
          '<input type="text" class="meta-input" style="flex:1;font-size:0.8rem;padding:2px 6px;" value="' + escapeAttr(cItem) + '" onchange="tcEditChecklistItem(\'' + ex.id + '\', ' + cIdx + ', this.value)">' +
          '<button type="button" class="card-btn-icon" style="font-size:0.7rem;" title="' + (t('tcMoveUp') || 'Move up') + '" onclick="tcMoveChecklistItem(\'' + ex.id + '\', ' + cIdx + ', -1)">▲</button>' +
          '<button type="button" class="card-btn-icon" style="font-size:0.7rem;" title="' + (t('tcMoveDown') || 'Move down') + '" onclick="tcMoveChecklistItem(\'' + ex.id + '\', ' + cIdx + ', 1)">▼</button>' +
          '<button type="button" class="card-btn-icon" style="color:#ef4444;font-size:0.9rem;" title="Delete" onclick="tcDeleteChecklistItem(\'' + ex.id + '\', ' + cIdx + ')">&times;</button>' +
          '</div>';
      }).join('');

      html += '<div class="opt-field" style="grid-column: 1 / -1;">' +
        '<div class="tc-subopts-panel" style="display:block;margin-top:4px;">' +
        '  <div class="tc-subopts-title">' + (t('tcQuestionComponentsSection') || t('tcQuestionComponentsOrder') || 'Question Components & Layout') + '</div>' +
        '  <div class="tc-order-list" style="margin-top:6px;">';

      compOrder.forEach(function (cKey, idx) {
        var on = isCmpActive(cKey);
        html += '<div class="tc-comp-wrap" id="tcCompWrap_' + ex.id + '_' + cKey + '">' +
          '  <div class="tc-order-item' + (!on ? ' tc-order-item-inactive' : '') + '" id="tcCompItem_' + ex.id + '_' + cKey + '">' +
          '    <label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;flex:1;user-select:none;">' +
          '      <input type="checkbox" ' + (on ? 'checked' : '') + ' onchange="tcToggleExerciseComponent(\'' + ex.id + '\', \'' + cKey + '\', this.checked)">' +
          '      <span class="tc-order-label"><span class="tc-order-num">' + (idx + 1) + '.</span> ' + escapeHtml(compLabels[cKey] || cKey) + '</span>' +
          '      <span class="tc-comp-badge ' + (on ? 'tc-comp-badge-on' : 'tc-comp-badge-off') + '">' + (on ? (t('tcCompIncluded') || 'Included') : (t('tcCompExcluded') || 'Removed')) + '</span>' +
          '    </label>' +
          '    <div style="display:inline-flex;align-items:center;gap:3px;">' +
          (idx > 0 ? '      <button type="button" class="tc-order-btn" onclick="tcMoveExerciseComponent(\'' + ex.id + '\', ' + idx + ', -1)" title="' + (t('tcMoveUp') || 'Move up') + '">▲</button>' : '') +
          (idx < compOrder.length - 1 ? '      <button type="button" class="tc-order-btn" onclick="tcMoveExerciseComponent(\'' + ex.id + '\', ' + idx + ', 1)" title="' + (t('tcMoveDown') || 'Move down') + '">▼</button>' : '') +
          '    </div>' +
          '  </div>';

        // Contextual sub-options panel per component
        if (cKey === 'draftBox') {
          html += '  <div id="tcCompSubOpts_' + ex.id + '_draftBox" class="tc-comp-subopts" style="display:' + (on ? 'block' : 'none') + ';">' +
            '    <div id="tcDraftSubOpts_' + ex.id + '">' +
            '      <div class="tc-subopts-title">' + (t('tcDraftBoxCustomisation') || 'Rough Work / Draft Area Customisation') + '</div>' +
            '      <div class="tc-subopts-grid">' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">Format Style</span>' +
            '          <select class="opt-select" onchange="tcUpdateDraftOption(\'' + ex.id + '\', \'draftStyle\', this.value)">' +
            '            <option value="box"' + (o.draftStyle === 'box' ? ' selected' : '') + '>Blank Bordered Box</option>' +
            '            <option value="lines"' + (o.draftStyle === 'lines' ? ' selected' : '') + '>Ruled Draft Lines</option>' +
            '            <option value="dotted"' + (o.draftStyle === 'dotted' ? ' selected' : '') + '>Dotted Guide Lines</option>' +
            '            <option value="grid"' + (o.draftStyle === 'grid' ? ' selected' : '') + '>Squared Math Grid</option>' +
            '          </select>' +
            '        </div>' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">Space Allocation</span>' +
            '          <div style="display:flex;gap:6px;align-items:center;">' +
            '            <span style="font-size:0.75rem;font-weight:700;">Lines:</span>' +
            '            <input type="number" class="opt-input" style="width:52px;" min="2" max="30" value="' + (o.draftLines || 6) + '" onchange="tcUpdateDraftOption(\'' + ex.id + '\', \'draftLines\', Number(this.value))">' +
            '            <span style="font-size:0.75rem;font-weight:700;margin-left:4px;">Box H:</span>' +
            tcBuildUnitInputHtml(o.draftHeight || 100, 'px', ['px', 'pt', 'cm', 'mm'], 'tcUpdateDraftOption(\'' + ex.id + '\', \'draftHeight\', __VAL__)') +
            '          </div>' +
            '        </div>' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">Draft Title / Label</span>' +
            '          <input type="text" class="opt-input" placeholder="Draft &amp; Rough Work (Not graded)" value="' + escapeAttr(o.draftTitle || '') + '" onchange="tcUpdateDraftOption(\'' + ex.id + '\', \'draftTitle\', this.value)">' +
            '        </div>' +
            '        <div class="opt-field" style="grid-column: 1 / -1;">' +
            '          <span class="opt-label">Draft Guidance Note (Optional student instructions)</span>' +
            '          <input type="text" class="opt-input" placeholder="e.g. Use this space for brainstorming, mind mapping, and paragraph outlines..." value="' + escapeAttr(o.draftNote || '') + '" onchange="tcUpdateDraftOption(\'' + ex.id + '\', \'draftNote\', this.value)">' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '  </div>';
        } else if (cKey === 'checklist') {
          html += '  <div id="tcCompSubOpts_' + ex.id + '_checklist" class="tc-comp-subopts" style="display:' + (on ? 'block' : 'none') + ';">' +
            '    <div id="tcChecklistSubOpts_' + ex.id + '">' +
            '      <div class="tc-subopts-title">' + (t('tcChecklistCustomisation') || 'Student Proofreading Checklist Customisation') + '</div>' +
            '      <div class="tc-subopts-grid" style="margin-bottom:8px;">' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">Checklist Heading / Title</span>' +
            '          <input type="text" class="opt-input" placeholder="Student Proofreading Checklist:" value="' + escapeAttr(o.checklistTitle || '') + '" onchange="tcUpdateChecklistOption(\'' + ex.id + '\', \'checklistTitle\', this.value)">' +
            '        </div>' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">Display Layout</span>' +
            '          <select class="opt-select" onchange="tcUpdateChecklistOption(\'' + ex.id + '\', \'checklistLayout\', this.value)">' +
            '            <option value="inline"' + (o.checklistLayout === 'inline' ? ' selected' : '') + '>Horizontal Inline Row (Compact)</option>' +
            '            <option value="columns"' + (o.checklistLayout === 'columns' ? ' selected' : '') + '>2-Column Checkbox Grid</option>' +
            '            <option value="stacked"' + (o.checklistLayout === 'stacked' ? ' selected' : '') + '>Vertical Checklist Stack</option>' +
            '          </select>' +
            '        </div>' +
            '      </div>' +
            '      <div class="tc-subopts-grid" style="margin-bottom:8px;">' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">' + (t('tcChecklistBg') || 'Container Background') + '</span>' +
            '          <select class="opt-select" onchange="tcUpdateChecklistOption(\'' + ex.id + '\', \'checklistBg\', this.value)">' +
            '            <option value="amber"' + ((o.checklistBg || 'amber') === 'amber' ? ' selected' : '') + '>' + (t('tcOptBgAmber') || 'Warm Amber Tint') + '</option>' +
            '            <option value="white"' + (o.checklistBg === 'white' ? ' selected' : '') + '>' + (t('tcOptBgWhite') || 'Crisp White') + '</option>' +
            '            <option value="ivory"' + (o.checklistBg === 'ivory' ? ' selected' : '') + '>' + (t('tcOptBgIvory') || 'Ivory Cream') + '</option>' +
            '            <option value="light_gray"' + (o.checklistBg === 'light_gray' ? ' selected' : '') + '>' + (t('tcOptBgLightGray') || 'Subtle Gray') + '</option>' +
            '            <option value="tint"' + (o.checklistBg === 'tint' ? ' selected' : '') + '>' + (t('tcOptBgTint') || 'Soft Blue Tint') + '</option>' +
            '            <option value="none"' + (o.checklistBg === 'none' ? ' selected' : '') + '>' + (t('tcOptBgNone') || 'None (Transparent)') + '</option>' +
            '          </select>' +
            '        </div>' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">' + (t('tcChecklistPadding') || 'Container Padding') + '</span>' +
            '          <select class="opt-select" onchange="tcUpdateChecklistOption(\'' + ex.id + '\', \'checklistPadding\', this.value)">' +
            '            <option value="compact"' + (o.checklistPadding === 'compact' ? ' selected' : '') + '>' + (t('tcOptPadCompact') || 'Compact (4px 8px)') + '</option>' +
            '            <option value="standard"' + ((o.checklistPadding || 'standard') === 'standard' ? ' selected' : '') + '>' + (t('tcOptPadStandard') || 'Standard (6px 12px)') + '</option>' +
            '            <option value="spacious"' + (o.checklistPadding === 'spacious' ? ' selected' : '') + '>' + (t('tcOptPadSpacious') || 'Spacious (12px 16px)') + '</option>' +
            '          </select>' +
            '        </div>' +
            '        <div class="opt-field">' +
            '          <span class="opt-label">' + (t('tcChecklistBorder') || 'Container Border') + '</span>' +
            '          <select class="opt-select" onchange="tcUpdateChecklistOption(\'' + ex.id + '\', \'checklistBorder\', this.value)">' +
            '            <option value="solid"' + ((o.checklistBorder || 'solid') === 'solid' ? ' selected' : '') + '>' + (t('tcOptBorderSolid') || 'Solid (1.5px Black)') + '</option>' +
            '            <option value="neobrutalist"' + (o.checklistBorder === 'neobrutalist' ? ' selected' : '') + '>' + (t('tcOptBorderNeobrutalist') || 'Neobrutalist (Thick + Shadow)') + '</option>' +
            '            <option value="dashed"' + (o.checklistBorder === 'dashed' ? ' selected' : '') + '>' + (t('tcOptBorderDashed') || 'Dashed Border') + '</option>' +
            '            <option value="quote"' + (o.checklistBorder === 'quote' ? ' selected' : '') + '>' + (t('tcOptBorderQuote') || 'Accent Left Bar (Quote)') + '</option>' +
            '            <option value="none"' + (o.checklistBorder === 'none' ? ' selected' : '') + '>' + (t('tcOptBorderNone') || 'None (Borderless)') + '</option>' +
            '          </select>' +
            '        </div>' +
            '      </div>' +
            '      <div style="margin-bottom:8px;">' +
            '        <span class="opt-label" style="display:block;margin-bottom:4px;">Quick Presets:</span>' +
            '        <div style="display:flex;flex-wrap:wrap;gap:6px;">' +
            '          <button type="button" class="neo-btn sm" onclick="tcApplyChecklistPreset(\'' + ex.id + '\', \'standard\')">Standard</button>' +
            '          <button type="button" class="neo-btn sm" onclick="tcApplyChecklistPreset(\'' + ex.id + '\', \'argumentative\')">Argumentative</button>' +
            '          <button type="button" class="neo-btn sm" onclick="tcApplyChecklistPreset(\'' + ex.id + '\', \'narrative\')">Narrative / Creative</button>' +
            '          <button type="button" class="neo-btn sm" onclick="tcApplyChecklistPreset(\'' + ex.id + '\', \'grammar\')">Grammar &amp; Accuracy</button>' +
            '          <button type="button" class="neo-btn sm" style="color:#ef4444;" onclick="tcApplyChecklistPreset(\'' + ex.id + '\', \'clear\')">Clear All</button>' +
            '        </div>' +
            '      </div>' +
            '      <div style="margin-bottom:6px;">' +
            '        <span class="opt-label" style="display:block;margin-bottom:4px;">Checklist Items to Verify:</span>' +
            '        <div id="tcChecklistItemsList_' + ex.id + '" style="display:flex;flex-direction:column;gap:4px;">' +
            clItemsInitialHtml +
            '        </div>' +
            '      </div>' +
            '      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;">' +
            '        <input type="text" id="tcNewChecklistItemInput_' + ex.id + '" class="opt-input" style="flex:1;" placeholder="Add custom checklist criterion (e.g. Transition words used)..." onkeydown="if(event.key===\'Enter\'){event.preventDefault();tcAddChecklistItem(\'' + ex.id + '\');}">' +
            '        <button type="button" class="neo-btn sm primary" onclick="tcAddChecklistItem(\'' + ex.id + '\')">' + escapeHtml(i18n.t('tcAddItemBtn')) + '</button>' +
            '      </div>' +
            '      <div style="margin-top:8px;">' +
            '        <span class="opt-label" style="display:block;margin-bottom:4px;">Quick Add Suggestion Chips:</span>' +
            '        <div style="display:flex;flex-wrap:wrap;gap:4px;">' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Word Count Verified\')">+ Word count</button>' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Structure &amp; Paragraphs\')">+ Paragraphs</button>' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Linking Words &amp; Connectors\')">+ Connectors</button>' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Spelling &amp; Verb Tenses\')">+ Spelling &amp; verbs</button>' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Punctuation &amp; Capitalization\')">+ Punctuation</button>' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Varied Vocabulary &amp; Synonyms\')">+ Rich vocab</button>' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Clear Introduction &amp; Conclusion\')">+ Intro / Conclusion</button>' +
            '          <button type="button" class="tc-chip-btn" onclick="tcQuickAddChecklistChip(\'' + ex.id + '\', \'Addressed All Prompt Requirements\')">+ Prompt points</button>' +
            '        </div>' +
            '      </div>' +
            '    </div>' +
            '  </div>';
        } else if (cKey === 'writingLines') {
          html += '  <div id="tcCompSubOpts_' + ex.id + '_writingLines" class="tc-comp-subopts" style="display:' + (on ? 'block' : 'none') + ';">' +
            '    <div class="tc-subopts-title">' + (t('tcEssayLinesSection') || 'Essay Writing Lines / Ruling') + '</div>' +
            '    <div class="tc-subopts-grid">' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcEssayLineType') || 'Line Type') + '</span>' +
            '        <select class="opt-select" onchange="tcUpdateEssayLineOption(\'' + ex.id + '\', \'lineStyle\', this.value)">' +
            '          <option value="solid"' + (curLineStyle === 'solid' ? ' selected' : '') + '>' + (t('tcEssayLineTypeSolid') || 'Solid Lines') + '</option>' +
            '          <option value="dashed"' + (curLineStyle === 'dashed' ? ' selected' : '') + '>' + (t('tcEssayLineTypeDashed') || 'Dashed Lines') + '</option>' +
            '          <option value="dotted"' + (curLineStyle === 'dotted' ? ' selected' : '') + '>' + (t('tcEssayLineTypeDotted') || 'Dotted Lines') + '</option>' +
            '        </select>' +
            '      </div>' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcEssayLineHeight') || 'Line Height / Spacing') + '</span>' +
            '        <div>' + tcBuildUnitInputHtml(curLineHeight, 'px', ['px', 'pt', 'cm', 'mm', 'em'], 'tcUpdateEssayLineOption(\'' + ex.id + '\', \'lineHeight\', __VAL__)') + '</div>' +
            '      </div>' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcEssayLineThickness') || 'Line Thickness') + '</span>' +
            '        <div>' + tcBuildUnitInputHtml(curLineThickness, 'px', ['px', 'pt', 'mm'], 'tcUpdateEssayLineOption(\'' + ex.id + '\', \'lineThickness\', __VAL__)') + '</div>' +
            '      </div>' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcStyleNumberedLines') || 'Line Numbering') + '</span>' +
            '        <select class="opt-select" onchange="tcUpdateEssayLineOption(\'' + ex.id + '\', \'numberedLines\', this.value === \'inherit\' ? \'inherit\' : (this.value === \'true\'))">' +
            '          <option value="inherit"' + (((o.numberedLines === 'inherit' || o.numberedLines === undefined || o.numberedLines === null)) ? ' selected' : '') + '>' + (t('tcLineNumberingInherit') || 'Inherit Test Global') + '</option>' +
            '          <option value="true"' + (o.numberedLines === true || o.numberedLines === 'true' ? ' selected' : '') + '>' + (t('tcLineNumberingEnable') || 'Numbered Lines Enabled') + '</option>' +
            '          <option value="false"' + (o.numberedLines === false || o.numberedLines === 'false' ? ' selected' : '') + '>' + (t('tcLineNumberingDisable') || 'Plain Lines (No Numbers)') + '</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap;">' +
            '      <button type="button" class="neo-btn sm" style="padding:2px 8px;font-size:0.75rem;" onclick="tcOpenExerciseStyleModal(\'' + ex.id + '\')" title="' + escapeAttr(t('tcLineNumberingFormatting') || 'Format line number digits, size, colour, distance to line, and intervals') + '">' +
            '        <img src="../assets/icons/layout.svg" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px;" alt="">' + (t('tcLineNumberingFormatting') || 'Number Formatting & Appearance…') +
            '      </button>' +
            '    </div>' +
            '  </div>';
        } else if (cKey === 'genreBadge') {
          html += '  <div id="tcCompSubOpts_' + ex.id + '_genreBadge" class="tc-comp-subopts" style="display:' + (on ? 'block' : 'none') + ';">' +
            '    <div class="tc-subopts-title">' + (t('tcCompGenreBadge') || 'Genre / Type Badge') + '</div>' +
            '    <div class="tc-subopts-grid">' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">Text Genre / Format Badge</span>' +
            '        <select id="tcGenreSelect_' + ex.id + '" class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'textGenre\', this.value)">' +
            '          <option value=""' + (!o.textGenre ? ' selected' : '') + '>None (Standard Essay)</option>' +
            '          <option value="Argumentative Essay"' + (o.textGenre === 'Argumentative Essay' ? ' selected' : '') + '>Argumentative Essay</option>' +
            '          <option value="Formal Letter"' + (o.textGenre === 'Formal Letter' ? ' selected' : '') + '>Formal Letter</option>' +
            '          <option value="News Article"' + (o.textGenre === 'News Article' ? ' selected' : '') + '>News Article</option>' +
            '          <option value="Personal Narrative"' + (o.textGenre === 'Personal Narrative' ? ' selected' : '') + '>Personal Narrative</option>' +
            '          <option value="Review / Critique"' + (o.textGenre === 'Review / Critique' ? ' selected' : '') + '>Review / Critique</option>' +
            '          <option value="Dialogue / Script"' + (o.textGenre === 'Dialogue / Script' ? ' selected' : '') + '>Dialogue / Script</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '  </div>';
        } else if (cKey === 'rubric') {
          html += '  <div id="tcCompSubOpts_' + ex.id + '_rubric" class="tc-comp-subopts" style="display:' + (on ? 'block' : 'none') + ';">' +
            '    <div class="tc-subopts-title">' + (t('tcCompRubricCustomisation') || 'Evaluation Rubric Layout & Appearance') + '</div>' +
            '    <div class="tc-subopts-grid" style="margin-bottom:8px;">' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcRubricTitle') || 'Rubric Heading / Title') + '</span>' +
            '        <input type="text" class="opt-input" placeholder="' + escapeAttr((ex.title ? (ex.title + ' — Rubric') : 'Assessment Rubric')) + '" value="' + escapeAttr(o.rubricTitle || '') + '" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricTitle\', this.value)">' +
            '      </div>' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcRubricDisplayMode') || 'Display Layout') + '</span>' +
            '        <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricDisplayMode\', this.value)">' +
            '          <option value="matrix"' + ((o.rubricDisplayMode || 'matrix') === 'matrix' ? ' selected' : '') + '>' + (t('tcDisplayMatrix') || 'Full Rubric Matrix Grid') + '</option>' +
            '          <option value="table"' + (o.rubricDisplayMode === 'table' ? ' selected' : '') + '>' + (t('tcEvaluationRubricTable') || 'Summary Rubric Table') + '</option>' +
            '          <option value="compact"' + (o.rubricDisplayMode === 'compact' ? ' selected' : '') + '>' + (t('tcDisplayCompact') || 'Compact Summary') + '</option>' +
            '          <option value="badges"' + (o.rubricDisplayMode === 'badges' ? ' selected' : '') + '>' + (t('tcCriteriaBadges') || 'Criteria Badges') + '</option>' +
            '          <option value="list"' + (o.rubricDisplayMode === 'list' ? ' selected' : '') + '>' + (t('tcBulletedList') || 'Bullet List') + '</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div class="tc-subopts-grid" style="margin-bottom:8px;">' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcRubricBg') || 'Container Background') + '</span>' +
            '        <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricBg\', this.value)">' +
            '          <option value="default"' + ((o.rubricBg || 'default') === 'default' ? ' selected' : '') + '>' + (t('tcOptBgDefaultGreen') || 'Default (Soft Green Tint)') + '</option>' +
            '          <option value="white"' + (o.rubricBg === 'white' ? ' selected' : '') + '>' + (t('tcOptBgWhite') || 'Crisp White') + '</option>' +
            '          <option value="ivory"' + (o.rubricBg === 'ivory' ? ' selected' : '') + '>' + (t('tcOptBgIvory') || 'Ivory Cream') + '</option>' +
            '          <option value="amber"' + (o.rubricBg === 'amber' ? ' selected' : '') + '>' + (t('tcOptBgAmber') || 'Warm Amber') + '</option>' +
            '          <option value="light_gray"' + (o.rubricBg === 'light_gray' ? ' selected' : '') + '>' + (t('tcOptBgLightGray') || 'Subtle Gray') + '</option>' +
            '          <option value="none"' + (o.rubricBg === 'none' ? ' selected' : '') + '>' + (t('tcOptBgNone') || 'None (Transparent)') + '</option>' +
            '        </select>' +
            '      </div>' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcRubricPadding') || 'Container Padding') + '</span>' +
            '        <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricPadding\', this.value)">' +
            '          <option value="compact"' + (o.rubricPadding === 'compact' ? ' selected' : '') + '>' + (t('tcOptPadCompact') || 'Compact (4px 8px)') + '</option>' +
            '          <option value="standard"' + ((o.rubricPadding || 'standard') === 'standard' ? ' selected' : '') + '>' + (t('tcOptPadStandard') || 'Standard (8px 14px)') + '</option>' +
            '          <option value="spacious"' + (o.rubricPadding === 'spacious' ? ' selected' : '') + '>' + (t('tcOptPadSpacious') || 'Spacious (14px 18px)') + '</option>' +
            '        </select>' +
            '      </div>' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcRubricBorder') || 'Container Border') + '</span>' +
            '        <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricBorder\', this.value)">' +
            '          <option value="solid"' + ((o.rubricBorder || 'solid') === 'solid' ? ' selected' : '') + '>' + (t('tcOptBorderSolid') || 'Solid (2px Green / Charcoal)') + '</option>' +
            '          <option value="neobrutalist"' + (o.rubricBorder === 'neobrutalist' ? ' selected' : '') + '>' + (t('tcOptBorderNeobrutalist') || 'Neobrutalist (Thick + Shadow)') + '</option>' +
            '          <option value="double"' + (o.rubricBorder === 'double' ? ' selected' : '') + '>' + (t('tcOptBorderDouble') || 'Double Rule') + '</option>' +
            '          <option value="dashed"' + (o.rubricBorder === 'dashed' ? ' selected' : '') + '>' + (t('tcOptBorderDashed') || 'Dashed Border') + '</option>' +
            '          <option value="minimal"' + (o.rubricBorder === 'minimal' ? ' selected' : '') + '>' + (t('tcOptBorderMinimal') || 'Minimal (Top/Bottom only)') + '</option>' +
            '          <option value="none"' + (o.rubricBorder === 'none' ? ' selected' : '') + '>' + (t('tcOptBorderNone') || 'None (Borderless)') + '</option>' +
            '        </select>' +
            '      </div>' +
            '      <div class="opt-field">' +
            '        <span class="opt-label">' + (t('tcPageOrientationLabel') || 'Page Orientation') + '</span>' +
            '        <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricPageOrientation\', this.value)">' +
            '          <option value="portrait"' + ((o.rubricPageOrientation || 'portrait') === 'portrait' ? ' selected' : '') + '>' + (t('tcOrientationPortrait') || 'Portrait (A4 Vertical)') + '</option>' +
            '          <option value="landscape"' + (o.rubricPageOrientation === 'landscape' ? ' selected' : '') + '>' + (t('tcOrientationLandscape') || 'Landscape (A4 Horizontal)') + '</option>' +
            '        </select>' +
            '      </div>' +
            '    </div>' +
            '    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:6px 0;border-top:1px dashed #cbd5e1;font-size:0.76rem;">' +
            '      <strong style="color:#065f46;">' + (t('tcVisibleColumnsLabel') || 'Table Columns:') + '</strong>' +
            '      <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showCriterionCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showCriterionCol\', this.checked)"><span>' + (t('tcColCritName') || 'Criterion Name') + '</span></label>' +
            '      <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showLevelsCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showLevelsCol\', this.checked)"><span>' + (t('tcColCritLevels') || 'Grade Levels') + '</span></label>' +
            '      <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showRubricDescriptions !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showRubricDescriptions\', this.checked)"><span>' + (t('tcColCritDesc') || 'Descriptors & Comments') + '</span></label>' +
            '      <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showMaxCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showMaxCol\', this.checked)"><span>' + (t('tcColCritMax') || 'Max Points') + '</span></label>' +
            '      <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showScoreCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showScoreCol\', this.checked)"><span>' + (t('tcColCritScore') || 'Score Box') + '</span></label>' +
            '      <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showCommentsCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showCommentsCol\', this.checked)"><span>' + (t('tcColCritComments') || 'Feedback & Comments') + '</span></label>' +
            '    </div>' +
            '    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:6px;">' +
            '      <label class="card-checkbox-label" style="font-size:0.78rem;color:#065f46;font-weight:800;">' +
            '        <input type="checkbox" ' + ((o.rubricSeparatePage || o.rubricPageOrientation === 'landscape') ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricSeparatePage\', this.checked)">' +
            '        <span>' + (t('tcPrintCriteriaOnSeparatePage') || 'Place Criteria Table on a Separate Page') + '</span>' +
            '      </label>' +
            '      <label class="card-checkbox-label" style="font-size:0.78rem;">' +
            '        <input type="checkbox" ' + (o.showRubric !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showRubric\', this.checked)">' +
            '        <span>' + (t('tcPrintRubricOnSheet') || 'Print Rubric on Exam Sheet') + '</span>' +
            '      </label>' +
            '      <button type="button" class="neo-btn sm" style="margin-left:auto;padding:2px 8px;font-size:0.75rem;background:#ecfdf5;color:#065f46;border-color:#059669;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenRubricLayoutModal(\'' + ex.id + '\')"><img src="../assets/icons/eye.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(t('tcLivePreviewRubricModal') || 'Live Preview & Customizer Modal…') + '</button>' +
            '    </div>' +
            '  </div>';
        }
        html += '</div>'; // close tc-comp-wrap
      });

      html += '  </div>' +
        '</div></div>';
      break;

    case 'matching':
      html += '<div class="opt-field">' +
        '<span class="opt-label">Presentation Format</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'presentation\', this.value)">' +
        '<option value="letter_boxes"' + (o.presentation === 'letter_boxes' ? ' selected' : '') + '>Letter Boxes (1. [ B ])</option>' +
        '<option value="connecting_lines"' + (o.presentation === 'connecting_lines' ? ' selected' : '') + '>Connecting Dots (● — ●)</option>' +
        '<option value="table"' + (o.presentation === 'table' ? ' selected' : '') + '>2-Column Response Table</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Column A Label</span>' +
        '<input type="text" class="opt-input" value="' + escapeAttr(o.colALabel || 'Column A') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'colALabel\', this.value)">' +
        '</div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Column B Label</span>' +
        '<input type="text" class="opt-input" value="' + escapeAttr(o.colBLabel || 'Column B') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'colBLabel\', this.value)">' +
        '</div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Extra Decoys (Column B)</span>' +
        '<input type="text" class="opt-input" placeholder="e.g. Decoy 1, Decoy 2" value="' + escapeAttr(o.distractors || '') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'distractors\', this.value)">' +
        '</div>';
      break;

    case 'transformation':
    case 'sentence_transformation':
      html += '<div class="opt-field" style="grid-column: span 2;">' +
        '<span class="opt-label">Word Count Constraint Rule</span>' +
        '<input type="text" class="opt-input" value="' + escapeAttr(o.wordConstraint || 'Use between 2 and 5 words, including the word given.') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'wordConstraint\', this.value)">' +
        '</div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Keyword Presentation</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'keywordStyle\', this.value)">' +
        '<option value="capital_block"' + (o.keywordStyle === 'capital_block' ? ' selected' : '') + '>Centered Capital Block</option>' +
        '<option value="bracketed"' + (o.keywordStyle === 'bracketed' ? ' selected' : '') + '>Bracketed in Sentence [KEYWORD]</option>' +
        '</select></div>';

      html += '<div class="opt-field" style="justify-content:center;">' +
        '<label class="opt-checkbox-label">' +
        '<input type="checkbox"' + (o.allowContractionsNote !== false ? ' checked' : '') + ' onchange="tcUpdateExOption(\'' + ex.id + '\', \'allowContractionsNote\', this.checked)">' +
        '<span>Show note: (Contractions count as two words)</span>' +
        '</label></div>';
      break;

    case 'translation':
      html += '<div class="opt-field">' +
        '<span class="opt-label">Translation Direction Badge</span>' +
        '<input type="text" class="opt-input" value="' + escapeAttr(o.direction || 'English → French') + '" placeholder="e.g. English → French" onchange="tcUpdateExOption(\'' + ex.id + '\', \'direction\', this.value)">' +
        '</div>';

      var curTrNumMode = (o.numberedLines !== undefined && o.numberedLines !== null) ? String(o.numberedLines) : 'inherit';
      html += '<div class="opt-field">' +
        '<span class="opt-label">Line Ruling Style</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'lineStyle\', this.value)">' +
        '<option value="lines"' + (o.lineStyle === 'lines' ? ' selected' : '') + '>Ruled Writing Lines</option>' +
        '<option value="dotted"' + (o.lineStyle === 'dotted' ? ' selected' : '') + '>Dotted Guide Lines</option>' +
        '<option value="box"' + (o.lineStyle === 'box' ? ' selected' : '') + '>Blank Bordered Box</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcStyleNumberedLines') || 'Line Numbering') + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'numberedLines\', this.value === \'inherit\' ? \'inherit\' : (this.value === \'true\'))">' +
        '<option value="inherit"' + (curTrNumMode === 'inherit' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingInherit') || 'Inherit Test Global') + '</option>' +
        '<option value="true"' + (curTrNumMode === 'true' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingEnable') || 'Numbered Lines Enabled') + '</option>' +
        '<option value="false"' + (curTrNumMode === 'false' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingDisable') || 'Plain Lines (No Numbers)') + '</option>' +
        '</select></div>';

      html += '<div class="opt-field" style="justify-content:center;">' +
        '<label class="opt-checkbox-label">' +
        '<input type="checkbox"' + (o.showHints !== false ? ' checked' : '') + ' onchange="tcUpdateExOption(\'' + ex.id + '\', \'showHints\', this.checked)">' +
        '<span>Show sentence vocabulary clues / hints</span>' +
        '</label></div>';
      break;

    case 'picture_description':
      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcLayoutArrangement')) + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'layout\', this.value)">' +
        '<option value="stacked"' + (o.layout === 'stacked' ? ' selected' : '') + '>Stacked (Image top, lines below)</option>' +
        '<option value="side_by_side"' + (o.layout === 'side_by_side' ? ' selected' : '') + '>Side-by-Side (Image left, lines right)</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Image Display Size</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'imageSize\', this.value)">' +
        '<option value="small"' + (o.imageSize === 'small' ? ' selected' : '') + '>Small (120px)</option>' +
        '<option value="medium"' + (o.imageSize === 'medium' ? ' selected' : '') + '>Medium (180px)</option>' +
        '<option value="large"' + (o.imageSize === 'large' ? ' selected' : '') + '>Large (250px)</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Document / Figure Label</span>' +
        '<input type="text" class="opt-input" value="' + escapeAttr(o.figureLabel || 'Figure 1') + '" placeholder="e.g. Figure 1, Document A" onchange="tcUpdateExOption(\'' + ex.id + '\', \'figureLabel\', this.value)">' +
        '</div>';

      var curPicNumMode = (o.numberedLines !== undefined && o.numberedLines !== null) ? String(o.numberedLines) : 'inherit';
      html += '<div class="opt-field">' +
        '<span class="opt-label">' + escapeHtml(i18n.t('tcStyleNumberedLines') || 'Line Numbering') + '</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'numberedLines\', this.value === \'inherit\' ? \'inherit\' : (this.value === \'true\'))">' +
        '<option value="inherit"' + (curPicNumMode === 'inherit' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingInherit') || 'Inherit Test Global') + '</option>' +
        '<option value="true"' + (curPicNumMode === 'true' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingEnable') || 'Numbered Lines Enabled') + '</option>' +
        '<option value="false"' + (curPicNumMode === 'false' ? ' selected' : '') + '>' + escapeHtml(i18n.t('tcLineNumberingDisable') || 'Plain Lines (No Numbers)') + '</option>' +
        '</select></div>';

      html += '<div class="opt-field" style="grid-column: span 2;">' +
        '<span class="opt-label">Target Vocabulary Chips Pool</span>' +
        '<input type="text" class="opt-input" placeholder="e.g. foreground, background, depicts, illustrates" value="' + escapeAttr(o.targetVocab || '') + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'targetVocab\', this.value)">' +
        '</div>';
      break;

    case 'table_completion':
      html += '<div class="opt-field">' +
        '<span class="opt-label">Table Border &amp; Style</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'tableStyle\', this.value)">' +
        '<option value="grid"' + (o.tableStyle === 'grid' ? ' selected' : '') + '>Full Bordered Grid</option>' +
        '<option value="zebra"' + (o.tableStyle === 'zebra' ? ' selected' : '') + '>Zebra Striped Rows</option>' +
        '<option value="scientific"' + (o.tableStyle === 'scientific' ? ' selected' : '') + '>Scientific / Minimal (No vertical borders)</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Cell Text Alignment</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'textAlign\', this.value)">' +
        '<option value="left"' + (o.textAlign === 'left' ? ' selected' : '') + '>Left Aligned</option>' +
        '<option value="center"' + (o.textAlign === 'center' ? ' selected' : '') + '>Centered</option>' +
        '</select></div>';

      html += '<div class="opt-field" style="justify-content:center;">' +
        '<label class="opt-checkbox-label">' +
        '<input type="checkbox"' + (o.showWordBank ? ' checked' : '') + ' onchange="tcUpdateExOption(\'' + ex.id + '\', \'showWordBank\', this.checked)">' +
        '<span>Word Bank pool for missing cells</span>' +
        '</label></div>';
      break;

    case 'odd_one_out':
      html += '<div class="opt-field">' +
        '<span class="opt-label">Task Mode</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'taskMode\', this.value)">' +
        '<option value="circle_and_justify"' + (o.taskMode === 'circle_and_justify' ? ' selected' : '') + '>Circle Intruder AND Justify Reasoning</option>' +
        '<option value="circle_only"' + (o.taskMode === 'circle_only' ? ' selected' : '') + '>Circle Intruder Only (Saves Space)</option>' +
        '<option value="cross_out"' + (o.taskMode === 'cross_out' ? ' selected' : '') + '>Cross Out Intruder</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Display Style</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'displayStyle\', this.value)">' +
        '<option value="pill_chips"' + (o.displayStyle === 'pill_chips' ? ' selected' : '') + '>Rounded Pill Badges</option>' +
        '<option value="plain_separated"' + (o.displayStyle === 'plain_separated' ? ' selected' : '') + '>Plain Words (Apple / Banana / Carrot)</option>' +
        '</select></div>';
      break;

    case 'reading_comprehension':
      html += '<div class="opt-field">' +
        '<span class="opt-label">Passage Layout</span>' +
        '<select class="opt-select" onchange="tcUpdateExOption(\'' + ex.id + '\', \'passageLayout\', this.value)">' +
        '<option value="full_width"' + (o.passageLayout === 'full_width' ? ' selected' : '') + '>Full Width Single Column</option>' +
        '<option value="two_columns"' + (o.passageLayout === 'two_columns' ? ' selected' : '') + '>Two-Column Newspaper Layout</option>' +
        '</select></div>';

      html += '<div class="opt-field">' +
        '<span class="opt-label">Default Lines per Subquestion</span>' +
        '<input type="number" class="opt-input" style="width:80px;" min="1" max="8" value="' + (o.defaultLineCount || 2) + '" onchange="tcUpdateExOption(\'' + ex.id + '\', \'defaultLineCount\', Number(this.value))">' +
        '</div>';

      html += '<div class="opt-field" style="grid-column: span 2;">' +
        '<span class="opt-label">Passage Vocabulary Footnotes / Glossary</span>' +
        '<textarea class="opt-input" style="height:44px;font-size:0.75rem;" placeholder="e.g. *1. breakthrough: an important accidental discovery" onchange="tcUpdateExOption(\'' + ex.id + '\', \'vocabularyFootnotes\', this.value)">' + escapeHtml(o.vocabularyFootnotes || '') + '</textarea>' +
        '</div>';
      break;
  }

  var hasAttachedRubrics = (Array.isArray(ex.criteria) && ex.criteria.length) || (Array.isArray(ex.markingRubric) && ex.markingRubric.length);
  if (ex.type !== 'composition' && hasAttachedRubrics) {
    html += '<div class="tc-subopts-panel" style="grid-column: 1 / -1; display:block; margin-top:8px;">' +
      '<div class="tc-subopts-title">' + (t('tcCompRubricCustomisation') || 'Evaluation Rubric Layout & Appearance') + '</div>' +
      '<div class="tc-subopts-grid" style="margin-bottom:8px;">' +
      '  <div class="opt-field">' +
      '    <span class="opt-label">' + (t('tcRubricTitle') || 'Rubric Heading / Title') + '</span>' +
      '    <input type="text" class="opt-input" placeholder="' + escapeAttr((ex.title ? (ex.title + ' — Rubric') : 'Assessment Rubric')) + '" value="' + escapeAttr(o.rubricTitle || '') + '" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricTitle\', this.value)">' +
      '  </div>' +
      '  <div class="opt-field">' +
      '    <span class="opt-label">' + (t('tcRubricDisplayMode') || 'Display Layout') + '</span>' +
      '    <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricDisplayMode\', this.value)">' +
      '      <option value="matrix"' + ((o.rubricDisplayMode || 'matrix') === 'matrix' ? ' selected' : '') + '>' + (t('tcDisplayMatrix') || 'Full Rubric Matrix Grid') + '</option>' +
      '      <option value="table"' + (o.rubricDisplayMode === 'table' ? ' selected' : '') + '>' + (t('tcEvaluationRubricTable') || 'Summary Rubric Table') + '</option>' +
      '      <option value="compact"' + (o.rubricDisplayMode === 'compact' ? ' selected' : '') + '>' + (t('tcDisplayCompact') || 'Compact Summary') + '</option>' +
      '      <option value="badges"' + (o.rubricDisplayMode === 'badges' ? ' selected' : '') + '>' + (t('tcCriteriaBadges') || 'Criteria Badges') + '</option>' +
      '      <option value="list"' + (o.rubricDisplayMode === 'list' ? ' selected' : '') + '>' + (t('tcBulletedList') || 'Bullet List') + '</option>' +
      '    </select>' +
      '  </div>' +
      '</div>' +
      '<div class="tc-subopts-grid" style="margin-bottom:8px;">' +
      '  <div class="opt-field">' +
      '    <span class="opt-label">' + (t('tcRubricBg') || 'Container Background') + '</span>' +
      '    <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricBg\', this.value)">' +
      '      <option value="default"' + ((o.rubricBg || 'default') === 'default' ? ' selected' : '') + '>' + (t('tcOptBgDefaultGreen') || 'Default (Soft Green Tint)') + '</option>' +
      '      <option value="white"' + (o.rubricBg === 'white' ? ' selected' : '') + '>' + (t('tcOptBgWhite') || 'Crisp White') + '</option>' +
      '      <option value="ivory"' + (o.rubricBg === 'ivory' ? ' selected' : '') + '>' + (t('tcOptBgIvory') || 'Ivory Cream') + '</option>' +
      '      <option value="amber"' + (o.rubricBg === 'amber' ? ' selected' : '') + '>' + (t('tcOptBgAmber') || 'Warm Amber') + '</option>' +
      '      <option value="light_gray"' + (o.rubricBg === 'light_gray' ? ' selected' : '') + '>' + (t('tcOptBgLightGray') || 'Subtle Gray') + '</option>' +
      '      <option value="none"' + (o.rubricBg === 'none' ? ' selected' : '') + '>' + (t('tcOptBgNone') || 'None (Transparent)') + '</option>' +
      '    </select>' +
      '  </div>' +
      '  <div class="opt-field">' +
      '    <span class="opt-label">' + (t('tcRubricPadding') || 'Container Padding') + '</span>' +
      '    <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricPadding\', this.value)">' +
      '      <option value="compact"' + (o.rubricPadding === 'compact' ? ' selected' : '') + '>' + (t('tcOptPadCompact') || 'Compact (4px 8px)') + '</option>' +
      '      <option value="standard"' + ((o.rubricPadding || 'standard') === 'standard' ? ' selected' : '') + '>' + (t('tcOptPadStandard') || 'Standard (8px 14px)') + '</option>' +
      '      <option value="spacious"' + (o.rubricPadding === 'spacious' ? ' selected' : '') + '>' + (t('tcOptPadSpacious') || 'Spacious (14px 18px)') + '</option>' +
      '    </select>' +
      '  </div>' +
      '  <div class="opt-field">' +
      '    <span class="opt-label">' + (t('tcRubricBorder') || 'Container Border') + '</span>' +
      '    <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricBorder\', this.value)">' +
      '      <option value="solid"' + ((o.rubricBorder || 'solid') === 'solid' ? ' selected' : '') + '>' + (t('tcOptBorderSolid') || 'Solid (2px Green / Charcoal)') + '</option>' +
      '      <option value="neobrutalist"' + (o.rubricBorder === 'neobrutalist' ? ' selected' : '') + '>' + (t('tcOptBorderNeobrutalist') || 'Neobrutalist (Thick + Shadow)') + '</option>' +
      '      <option value="double"' + (o.rubricBorder === 'double' ? ' selected' : '') + '>' + (t('tcOptBorderDouble') || 'Double Rule') + '</option>' +
      '      <option value="dashed"' + (o.rubricBorder === 'dashed' ? ' selected' : '') + '>' + (t('tcOptBorderDashed') || 'Dashed Border') + '</option>' +
      '      <option value="minimal"' + (o.rubricBorder === 'minimal' ? ' selected' : '') + '>' + (t('tcOptBorderMinimal') || 'Minimal (Top/Bottom only)') + '</option>' +
      '      <option value="none"' + (o.rubricBorder === 'none' ? ' selected' : '') + '>' + (t('tcOptBorderNone') || 'None (Borderless)') + '</option>' +
      '    </select>' +
      '  </div>' +
      '  <div class="opt-field">' +
      '    <span class="opt-label">' + (t('tcPageOrientationLabel') || 'Page Orientation') + '</span>' +
      '    <select class="opt-select" onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricPageOrientation\', this.value)">' +
      '      <option value="portrait"' + ((o.rubricPageOrientation || 'portrait') === 'portrait' ? ' selected' : '') + '>' + (t('tcOrientationPortrait') || 'Portrait (A4 Vertical)') + '</option>' +
      '      <option value="landscape"' + (o.rubricPageOrientation === 'landscape' ? ' selected' : '') + '>' + (t('tcOrientationLandscape') || 'Landscape (A4 Horizontal)') + '</option>' +
      '    </select>' +
      '  </div>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:6px 0;border-top:1px dashed #cbd5e1;font-size:0.76rem;">' +
      '  <strong style="color:#065f46;">' + (t('tcVisibleColumnsLabel') || 'Table Columns:') + '</strong>' +
      '  <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showCriterionCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showCriterionCol\', this.checked)"><span>' + (t('tcColCritName') || 'Criterion Name') + '</span></label>' +
      '  <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showLevelsCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showLevelsCol\', this.checked)"><span>' + (t('tcColCritLevels') || 'Grade Levels') + '</span></label>' +
      '  <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showRubricDescriptions !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showRubricDescriptions\', this.checked)"><span>' + (t('tcColCritDesc') || 'Descriptors & Comments') + '</span></label>' +
      '  <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showMaxCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showMaxCol\', this.checked)"><span>' + (t('tcColCritMax') || 'Max Points') + '</span></label>' +
      '  <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showScoreCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showScoreCol\', this.checked)"><span>' + (t('tcColCritScore') || 'Score Box') + '</span></label>' +
      '  <label class="card-checkbox-label" style="font-size:0.76rem;"><input type="checkbox" ' + (o.showCommentsCol !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showCommentsCol\', this.checked)"><span>' + (t('tcColCritComments') || 'Feedback & Comments') + '</span></label>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:6px;">' +
      '  <label class="card-checkbox-label" style="font-size:0.78rem;color:#065f46;font-weight:800;">' +
      '    <input type="checkbox" ' + ((o.rubricSeparatePage || o.rubricPageOrientation === 'landscape') ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'rubricSeparatePage\', this.checked)">' +
      '    <span>' + (t('tcPrintCriteriaOnSeparatePage') || 'Place Criteria Table on a Separate Page') + '</span>' +
      '  </label>' +
      '  <label class="card-checkbox-label" style="font-size:0.78rem;">' +
      '    <input type="checkbox" ' + (o.showRubric !== false ? 'checked' : '') + ' onchange="tcUpdateRubricOption(\'' + ex.id + '\', \'showRubric\', this.checked)">' +
      '    <span>' + (t('tcPrintRubricOnSheet') || 'Print Rubric on Exam Sheet') + '</span>' +
      '  </label>' +
      '  <button type="button" class="neo-btn sm" style="margin-left:auto;padding:2px 8px;font-size:0.75rem;background:#ecfdf5;color:#065f46;border-color:#059669;display:inline-flex;align-items:center;gap:4px;" onclick="tcOpenRubricLayoutModal(\'' + ex.id + '\')"><img src="../assets/icons/eye.svg" style="width:13px;height:13px;" alt="">' + escapeHtml(t('tcLivePreviewRubricModal') || 'Live Preview & Customizer Modal…') + '</button>' +
      '</div>' +
      '</div>';
  }

  html += '</div>';
  return html;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}

// ── Options Toggle & Mutation Actions ──────────────────────────────────
window._openOptionsExerciseIds = window._openOptionsExerciseIds || new Set();

var _activeSettingsPanel = null;
var _activeSettingsParent = null;
var _activeSettingsNext = null;

window.tcToggleExerciseOptions = function (exId) {
  if (_activeSettingsPanel) {
    tcCloseExerciseSettingsModal(true);
  }
  var panel = document.getElementById('optionsPanel_' + exId);
  var modal = document.getElementById('exerciseSettingsModal');
  var body = document.getElementById('exerciseSettingsModalBody');
  var titleEl = document.getElementById('exerciseSettingsModalTitle');
  if (!panel || !modal || !body) return;

  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  var typeMeta = ex && (TestCreatorService.EXERCISE_TYPES || []).find(function (t) { return t.id === ex.type; });
  var label = (ex && ex.title && String(ex.title).trim()) ? ex.title : (typeMeta ? typeMeta.name : 'Exercise');
  if (titleEl) {
    titleEl.textContent = (i18n.t('tcSettings') || 'Settings') + ': ' + label;
  }

  _activeSettingsPanel = panel;
  _activeSettingsParent = panel.parentNode;
  _activeSettingsNext = panel.nextSibling;

  panel.style.display = 'block';
  panel.style.borderTop = 'none';
  panel.style.marginTop = '0';
  panel.style.paddingTop = '0';
  body.innerHTML = '';
  body.appendChild(panel);

  modal.classList.add('open');
};

window.tcCloseExerciseSettingsModal = function (skipPreview) {
  var modal = document.getElementById('exerciseSettingsModal');
  if (modal) modal.classList.remove('open');
  if (_activeSettingsPanel) {
    _activeSettingsPanel.style.display = 'none';
    _activeSettingsPanel.style.borderTop = '';
    _activeSettingsPanel.style.marginTop = '';
    _activeSettingsPanel.style.paddingTop = '';
    if (_activeSettingsParent && _activeSettingsParent.isConnected) {
      if (_activeSettingsNext && _activeSettingsNext.parentNode === _activeSettingsParent) {
        _activeSettingsParent.insertBefore(_activeSettingsPanel, _activeSettingsNext);
      } else {
        _activeSettingsParent.appendChild(_activeSettingsPanel);
      }
    }
    _activeSettingsPanel = null;
    _activeSettingsParent = null;
    _activeSettingsNext = null;
  }
  if (!skipPreview && typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate();
  }
};

window.tcUpdateExOption = function (exId, optKey, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  o[optKey] = value;
  if (optKey === 'numberedLines') {
    if (!ex.exportStyle) ex.exportStyle = {};
    ex.exportStyle.numberedLines = (value === 'inherit' ? null : (value === true || value === 'true'));
  }
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate();
  }
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

// ── Essay Lines Customisation Handler ──────────────────────────────────
window.tcUpdateEssayLineOption = function (exId, key, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  o[key] = value;
  if (key === 'numberedLines') {
    if (!ex.exportStyle) ex.exportStyle = {};
    ex.exportStyle.numberedLines = (value === 'inherit' ? null : (value === true || value === 'true'));
  }
  if (ex.content && Array.isArray(ex.content.items)) {
    ex.content.items.forEach(function (it) {
      it[key] = value;
    });
  }
  renderExerciseCards();
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate();
  }
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

// ── Exercise Components & Sub-options Handlers ────────────────────────
window.tcToggleExerciseComponent = function (exId, compKey, isChecked) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  if (compKey === 'draftBox') {
    o.showDraftBox = !!isChecked;
  } else if (compKey === 'checklist') {
    o.showChecklist = !!isChecked;
    if (isChecked && (!Array.isArray(o.checklistItems) || o.checklistItems.length === 0)) {
      o.checklistItems = [
        'Structure & Paragraphs',
        'Spelling & Verb Tenses',
        'Punctuation & Capitalization',
        'Word Count Verified'
      ];
    }
    tcRenderChecklistItemsList(exId);
  } else if (compKey === 'writingLines') {
    o.showWritingLines = !!isChecked;
  } else if (compKey === 'genreBadge') {
    o.showGenreBadge = !!isChecked;
    if (isChecked && !o.textGenre) {
      o.textGenre = 'Argumentative Essay';
      var gSel = document.getElementById('tcGenreSelect_' + exId);
      if (gSel) gSel.value = o.textGenre;
    }
  } else if (compKey === 'prompts') {
    o.showPrompts = !!isChecked;
  } else if (compKey === 'rubric') {
    o.showRubric = !!isChecked;
  }

  // In-place UI update (smooth, no DOM destroy)
  var itemEl = document.getElementById('tcCompItem_' + exId + '_' + compKey);
  if (itemEl) {
    if (isChecked) {
      itemEl.classList.remove('tc-order-item-inactive');
    } else {
      itemEl.classList.add('tc-order-item-inactive');
    }
    var badgeEl = itemEl.querySelector('.tc-comp-badge');
    if (badgeEl) {
      badgeEl.className = 'tc-comp-badge ' + (isChecked ? 'tc-comp-badge-on' : 'tc-comp-badge-off');
      badgeEl.textContent = isChecked ? (t('tcCompIncluded') || 'Included') : (t('tcCompExcluded') || 'Removed');
    }
  }
  var subEl = document.getElementById('tcCompSubOpts_' + exId + '_' + compKey);
  if (subEl) {
    subEl.style.display = isChecked ? 'block' : 'none';
  }
  var legDraft = document.getElementById('tcDraftSubOpts_' + exId);
  if (legDraft && legDraft !== subEl) legDraft.style.display = isChecked ? 'block' : 'none';
  var legChecklist = document.getElementById('tcChecklistSubOpts_' + exId);
  if (legChecklist && legChecklist !== subEl) legChecklist.style.display = isChecked ? 'block' : 'none';

  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

window.tcToggleDraftBox = function (exId, isChecked) {
  tcToggleExerciseComponent(exId, 'draftBox', isChecked);
};

window.tcUpdateDraftOption = function (exId, key, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  o[key] = value;
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

window.tcToggleChecklist = function (exId, isChecked) {
  tcToggleExerciseComponent(exId, 'checklist', isChecked);
};

function tcRefreshPrintPreviewIfOpen() {
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate();
  }
}

window.tcUpdateChecklistOption = function (exId, key, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  o[key] = value;
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  tcRefreshPrintPreviewIfOpen();
};

window.tcRenderChecklistItemsList = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  var container = document.getElementById('tcChecklistItemsList_' + exId);
  if (!container) return;
  var items = Array.isArray(o.checklistItems) ? o.checklistItems : [];
  if (items.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem;color:#94a3b8;font-style:italic;padding:4px 0;">No criteria in checklist. Add one below or choose a preset.</div>';
    return;
  }
  container.innerHTML = items.map(function (item, idx) {
    return '<div class="tc-checklist-item-row">' +
      '<span style="font-weight:700;font-size:0.8rem;color:#64748b;user-select:none;">☐</span>' +
      '<input type="text" class="meta-input" style="flex:1;font-size:0.8rem;padding:2px 6px;" value="' + escapeAttr(item) + '" onchange="tcEditChecklistItem(\'' + exId + '\', ' + idx + ', this.value)">' +
      '<button type="button" class="card-btn-icon" style="font-size:0.7rem;" title="Move up" onclick="tcMoveChecklistItem(\'' + exId + '\', ' + idx + ', -1)">▲</button>' +
      '<button type="button" class="card-btn-icon" style="font-size:0.7rem;" title="Move down" onclick="tcMoveChecklistItem(\'' + exId + '\', ' + idx + ', 1)">▼</button>' +
      '<button type="button" class="card-btn-icon" style="color:#ef4444;font-size:0.9rem;" title="Delete" onclick="tcDeleteChecklistItem(\'' + exId + '\', ' + idx + ')">&times;</button>' +
      '</div>';
  }).join('');
};

window.tcEditChecklistItem = function (exId, idx, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  if (!Array.isArray(o.checklistItems) || !o.checklistItems[idx]) return;
  o.checklistItems[idx] = String(value || '').trim();
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  tcRefreshPrintPreviewIfOpen();
};

window.tcMoveChecklistItem = function (exId, idx, dir) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  if (!Array.isArray(o.checklistItems)) return;
  var targetIdx = idx + dir;
  if (targetIdx < 0 || targetIdx >= o.checklistItems.length) return;
  var temp = o.checklistItems[idx];
  o.checklistItems[idx] = o.checklistItems[targetIdx];
  o.checklistItems[targetIdx] = temp;
  tcRenderChecklistItemsList(exId);
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  tcRefreshPrintPreviewIfOpen();
};

window.tcDeleteChecklistItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  if (!Array.isArray(o.checklistItems)) return;
  o.checklistItems.splice(idx, 1);
  tcRenderChecklistItemsList(exId);
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  tcRefreshPrintPreviewIfOpen();
};

window.tcAddChecklistItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  var input = document.getElementById('tcNewChecklistItemInput_' + exId);
  if (!input) return;
  var val = input.value.trim();
  if (!val) return;
  if (!Array.isArray(o.checklistItems)) o.checklistItems = [];
  o.checklistItems.push(val);
  input.value = '';
  tcRenderChecklistItemsList(exId);
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  tcRefreshPrintPreviewIfOpen();
};

window.tcQuickAddChecklistChip = function (exId, text) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  if (!Array.isArray(o.checklistItems)) o.checklistItems = [];
  if (o.checklistItems.indexOf(text) === -1) {
    o.checklistItems.push(text);
    tcRenderChecklistItemsList(exId);
    tcOnDirty();
    if (ex.autoSaveToDb) {
      TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
    }
    tcRefreshPrintPreviewIfOpen();
  }
};

window.tcApplyChecklistPreset = function (exId, presetKey) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  var presets = {
    standard: [
      'Structure & Paragraphs',
      'Spelling & Verb Tenses',
      'Punctuation & Capitalization',
      'Word Count Verified'
    ],
    argumentative: [
      'Clear Thesis Statement & Stance',
      'Topic Sentences for Each Paragraph',
      'Transition Words (However, Furthermore...)',
      'Counter-argument Addressed & Refuted',
      'Spelling, Grammar & Formal Tone',
      'Target Word Count Respected'
    ],
    narrative: [
      'Engaging Hook in Introduction',
      'Rich Adjectives & Sensory Details',
      'Consistent Past Tense (Narrative Flow)',
      'Accurate Dialogue Punctuation',
      'Satisfying Climax & Resolution',
      'Target Word Count Respected'
    ],
    grammar: [
      'Subject-Verb Agreement',
      'Accurate Tenses & Conjugations',
      'Varied Sentence Structures',
      'Punctuation & Capitalization',
      'Rich Vocabulary & Synonyms',
      'Word Count Verified'
    ],
    clear: []
  };
  o.checklistItems = presets[presetKey] ? presets[presetKey].slice() : [];
  tcRenderChecklistItemsList(exId);
  tcOnDirty();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
  tcRefreshPrintPreviewIfOpen();
};

window.tcSaveBlockToDb = async function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var typeMeta = (TestCreatorService.EXERCISE_TYPES || []).find(function (t) { return t.id === ex.type; });
  var defaultTitle = (ex.title && String(ex.title).trim()) ? ex.title : (typeMeta ? typeMeta.name : 'Block');
  var promptMsg = i18n.t('tcSaveToTestBankPrompt') || 'Enter a title for this block in the Test Bank:';
  var chosenTitle = window.showPrompt ? await window.showPrompt(promptMsg, defaultTitle) : defaultTitle;
  if (chosenTitle === null) return;
  chosenTitle = String(chosenTitle).trim() || defaultTitle;
  var ok = await TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject, chosenTitle);
  if (ok) {
    if (window.showToast) showToast(i18n.t('tcSavedToDb') || 'Saved to Test Bank database!');
    if (typeof tcLoadDrawerContent === 'function') tcLoadDrawerContent();
  } else {
    if (window.showToast) showToast(i18n.t('tcSaveDbFailed') || 'Could not save to Test Bank database.', true);
  }
};

window.tcSaveHeaderToDb = async function () {
  if (!currentTest) return;
  var hc = JSON.parse(JSON.stringify(TestCreatorService.ensureHeaderConfig(currentTest)));
  var mats = JSON.parse(JSON.stringify(currentTest.materialsAllowed || []));
  var defaultTitle = (currentTest.title && String(currentTest.title).trim())
    ? (currentTest.title.trim() + ' — Header')
    : (i18n.t('tcBlockHeader') || 'Exam Header');
  var promptMsg = i18n.t('tcSaveToTestBankPrompt') || 'Enter a title for this block in the Test Bank:';
  var chosenTitle = window.showPrompt ? await window.showPrompt(promptMsg, defaultTitle) : defaultTitle;
  if (chosenTitle === null) return;
  chosenTitle = String(chosenTitle).trim() || defaultTitle;
  var headerBlock = {
    id: 'hdr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    type: 'section_header',
    title: chosenTitle,
    instructions: mats.length ? mats.join(', ') : '',
    points: 0,
    content: {
      headerConfig: hc,
      materialsAllowed: mats
    }
  };
  var ok = await TestCreatorService.saveExerciseToDatabase(headerBlock, currentTest.subject, chosenTitle);
  if (ok) {
    if (window.showToast) showToast(i18n.t('tcSavedToDb') || 'Saved to Test Bank database!');
    if (typeof tcLoadDrawerContent === 'function') tcLoadDrawerContent();
  } else {
    if (window.showToast) showToast(i18n.t('tcSaveDbFailed') || 'Could not save to Test Bank database.', true);
  }
};

// ── Universal WYSIWYG + HTML/CSS Block Editor Controller ─────────────
var _ubhTargetId = null;
var _ubhActiveTab = 'wysiwyg';

function tcGenerateStructuredBlockHtml(targetId) {
  if (!currentTest) return '';
  var tPts = TestCreatorService.calculateTotalTestPoints(currentTest);
  if (targetId === 'header') {
    return TestCreatorService.renderHeaderHtml(currentTest, false, currentTest.variant || 'A', '', currentTest.className || '', tPts, { forceStructured: true });
  }
  var exs = currentTest.exercises || [];
  var idx = exs.findIndex(function (e) { return e.id === targetId; });
  if (idx === -1) return '';
  var exNum = 0;
  for (var i = 0; i <= idx; i++) {
    var t = exs[i].type || '';
    if (!t.startsWith('section_') && t !== 'custom_block') exNum++;
  }
  return TestCreatorService.renderExerciseHtml(exs[idx], idx, false, {
    forceStructured: true,
    exportStyle: currentTest.exportStyle || {},
    test: currentTest,
    totalPoints: tPts,
    exerciseNumber: exNum,
    hasNextExercise: idx < exs.length - 1
  });
}

window.tcOpenBlockHtmlEditor = function (targetId) {
  if (!currentTest) return;
  _ubhTargetId = targetId;
  var titleEl = document.getElementById('ubhModalTitle');
  var chk = document.getElementById('ubhCustomEnabled');
  var canvas = document.getElementById('ubhWysiwygCanvas');
  var htmlTa = document.getElementById('ubhHtmlTextarea');
  var cssTa = document.getElementById('ubhCssTextarea');

  var htmlVal = '';
  var cssVal = '';
  var enabled = false;

  if (targetId === 'header') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    enabled = !!hc.customHtmlMode;
    htmlVal = hc.customHtml || tcGenerateStructuredBlockHtml('header');
    cssVal = hc.customCss || '';
    if (titleEl) titleEl.textContent = (i18n.t('tcUbhHeaderTitle') || 'Edit Header HTML & WYSIWYG');
  } else {
    var ex = (currentTest.exercises || []).find(function (e) { return e.id === targetId; });
    if (!ex) return;
    enabled = !!ex.customHtmlMode;
    htmlVal = ex.customHtml || tcGenerateStructuredBlockHtml(targetId);
    cssVal = ex.customCss || '';
    if (titleEl) titleEl.textContent = (i18n.t('tcUbhBlockTitle') || 'Edit Block HTML & WYSIWYG') + ': ' + (ex.title || ex.type);
  }

  if (chk) chk.checked = enabled;
  if (canvas) canvas.innerHTML = htmlVal;
  if (htmlTa) htmlTa.value = htmlVal;
  if (cssTa) cssTa.value = cssVal;

  tcSwitchUbhTab('wysiwyg');
  document.getElementById('universalBlockHtmlModal').classList.add('open');
};

window.tcCloseBlockHtmlEditor = function () {
  document.getElementById('universalBlockHtmlModal').classList.remove('open');
  _ubhTargetId = null;
};

window.tcSwitchUbhTab = function (tab) {
  _ubhActiveTab = tab;
  var map = { wysiwyg: 'ubhPanelWysiwyg', code: 'ubhPanelCode', preview: 'ubhPanelPreview' };
  var btnMap = { wysiwyg: 'ubhTabWysiwyg', code: 'ubhTabCode', preview: 'ubhTabPreview' };
  Object.keys(map).forEach(function (k) {
    var p = document.getElementById(map[k]);
    var b = document.getElementById(btnMap[k]);
    if (p) p.style.display = (k === tab) ? 'block' : 'none';
    if (b) b.classList.toggle('active', k === tab);
  });
  if (tab === 'preview') tcUbhUpdatePreview();
};

window.tcUbhMarkCustomEnabled = function () {
  var chk = document.getElementById('ubhCustomEnabled');
  if (chk && !chk.checked) chk.checked = true;
};

window.tcUbhSyncFromWysiwyg = function () {
  tcUbhMarkCustomEnabled();
  var canvas = document.getElementById('ubhWysiwygCanvas');
  var htmlTa = document.getElementById('ubhHtmlTextarea');
  if (canvas && htmlTa) htmlTa.value = canvas.innerHTML;
};

window.tcUbhSyncFromCode = function () {
  tcUbhMarkCustomEnabled();
  var canvas = document.getElementById('ubhWysiwygCanvas');
  var htmlTa = document.getElementById('ubhHtmlTextarea');
  if (canvas && htmlTa) canvas.innerHTML = htmlTa.value;
};

window.tcUbhSyncFromBlock = function () {
  if (!_ubhTargetId) return;
  var fresh = tcGenerateStructuredBlockHtml(_ubhTargetId);
  var canvas = document.getElementById('ubhWysiwygCanvas');
  var htmlTa = document.getElementById('ubhHtmlTextarea');
  if (canvas) canvas.innerHTML = fresh;
  if (htmlTa) htmlTa.value = fresh;
  tcUbhUpdatePreview();
  if (window.showToast) showToast(i18n.t('tcUbhSyncedToast') || 'Synced HTML from block settings');
};

window.tcUbhResetToStructured = function () {
  var chk = document.getElementById('ubhCustomEnabled');
  if (chk) chk.checked = false;
  tcUbhSyncFromBlock();
};

window.tcUbhUpdatePreview = function () {
  var box = document.getElementById('ubhPreviewBox');
  var htmlTa = document.getElementById('ubhHtmlTextarea');
  var cssTa = document.getElementById('ubhCssTextarea');
  if (!box || !htmlTa) return;
  var raw = htmlTa.value || '';
  var css = (cssTa && cssTa.value) ? ('<style>' + cssTa.value + '</style>\n') : '';
  var ex = (_ubhTargetId && _ubhTargetId !== 'header')
    ? (currentTest.exercises || []).find(function (e) { return e.id === _ubhTargetId; })
    : null;
  box.innerHTML = css + TestCreatorService.resolveBlockPlaceholders(raw, currentTest, ex, {});
};

window.tcUbhExec = function (cmd, val) {
  var canvas = document.getElementById('ubhWysiwygCanvas');
  if (!canvas) return;
  canvas.focus();
  try {
    document.execCommand(cmd, false, val !== undefined ? val : null);
  } catch (_) {}
  tcUbhSyncFromWysiwyg();
};

window.tcUbhSetFontSize = function (sz) {
  var canvas = document.getElementById('ubhWysiwygCanvas');
  if (!canvas) return;
  canvas.focus();
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  var range = sel.getRangeAt(0);
  if (range.collapsed) return;
  var span = document.createElement('span');
  span.style.fontSize = sz;
  try {
    range.surroundContents(span);
  } catch (_) {
    var frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  tcUbhSyncFromWysiwyg();
};

function tcUbhInsertHtmlAtCursor(snippet) {
  if (_ubhActiveTab === 'code') {
    var ta = document.getElementById('ubhHtmlTextarea');
    if (!ta) return;
    var start = ta.selectionStart || 0;
    var end = ta.selectionEnd || 0;
    ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + snippet.length;
    tcUbhSyncFromCode();
    return;
  }
  var canvas = document.getElementById('ubhWysiwygCanvas');
  if (!canvas) return;
  canvas.focus();
  try {
    document.execCommand('insertHTML', false, snippet);
  } catch (_) {
    canvas.innerHTML += snippet;
  }
  tcUbhSyncFromWysiwyg();
}

window.tcUbhInsertPlaceholder = function (token) {
  tcUbhInsertHtmlAtCursor(token);
};

window.tcUbhInsertColumns = function (cols) {
  var c = cols === 3 ? 3 : 2;
  var cells = '';
  for (var i = 1; i <= c; i++) {
    cells += '<div style="flex:1;padding:8px;border:1px dashed #94a3b8;min-height:40px;"><p>Column ' + i + '</p></div>';
  }
  tcUbhInsertHtmlAtCursor('<div style="display:flex;gap:12px;margin:8px 0;">' + cells + '</div><p><br></p>');
};

window.tcUbhInsertTable = async function () {
  var dims = window.showPrompt ? await window.showPrompt('Enter rows x columns (e.g. 3x3):', '3x3') : '3x3';
  if (!dims) return;
  var parts = String(dims).toLowerCase().split('x');
  var rows = Math.max(1, Math.min(20, parseInt(parts[0], 10) || 3));
  var cols = Math.max(1, Math.min(12, parseInt(parts[1], 10) || 3));
  var html = '<table style="width:100%;border-collapse:collapse;margin:8px 0;"><thead><tr>';
  for (var c = 1; c <= cols; c++) html += '<th style="border:1px solid #333;padding:6px;background:#f1f5f9;">Header ' + c + '</th>';
  html += '</tr></thead><tbody>';
  for (var r = 1; r < rows; r++) {
    html += '<tr>';
    for (var c2 = 1; c2 <= cols; c2++) html += '<td style="border:1px solid #333;padding:6px;">&nbsp;</td>';
    html += '</tr>';
  }
  html += '</tbody></table><p><br></p>';
  tcUbhInsertHtmlAtCursor(html);
};

window.tcUbhTableOp = function (op) {
  var canvas = document.getElementById('ubhWysiwygCanvas');
  if (!canvas) return;
  var sel = window.getSelection();
  var node = sel && sel.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement) : null;
  var tbl = node ? node.closest('table') : canvas.querySelector('table');
  if (!tbl) return;
  if (op === 'addRow') {
    var cols = tbl.rows[0] ? tbl.rows[0].cells.length : 2;
    var tr = tbl.insertRow(-1);
    for (var i = 0; i < cols; i++) {
      var td = tr.insertCell(-1);
      td.style.border = '1px solid #333';
      td.style.padding = '6px';
      td.innerHTML = '&nbsp;';
    }
  } else if (op === 'delRow' && tbl.rows.length > 1) {
    tbl.deleteRow(-1);
  } else if (op === 'addCol') {
    for (var r = 0; r < tbl.rows.length; r++) {
      var cell = tbl.rows[r].insertCell(-1);
      cell.style.border = '1px solid #333';
      cell.style.padding = '6px';
      cell.innerHTML = '&nbsp;';
    }
  }
  tcUbhSyncFromWysiwyg();
};

window.tcUbhInsertLines = async function () {
  var nStr = window.showPrompt ? await window.showPrompt('Number of writing lines:', '4') : '4';
  if (!nStr) return;
  var n = Math.max(1, Math.min(50, parseInt(nStr, 10) || 4));
  var h = '<div class="writing-lines solid-lines" style="margin:6px 0;">';
  for (var i = 0; i < n; i++) {
    h += '<div class="writing-line solid" style="height:28px;border-bottom:1px solid #333;"></div>';
  }
  h += '</div><p><br></p>';
  tcUbhInsertHtmlAtCursor(h);
};

window.tcUbhInsertCallout = function () {
  tcUbhInsertHtmlAtCursor('<div style="border:2px solid #333;border-left:5px solid #5b8fcc;background:#f8fafc;padding:10px 12px;margin:8px 0;"><strong>Note:</strong> Enter text here.</div><p><br></p>');
};

window.tcUbhInsertPageBreak = function () {
  tcUbhInsertHtmlAtCursor('<div class="page-break-before" style="border-top:2px dashed #94a3b8;margin:10px 0;padding-top:4px;font-size:0.75rem;color:#64748b;text-align:center;">--- Page Break ---</div><p><br></p>');
};

window.tcUbhInsertImage = async function () {
  var url = window.showPrompt ? await window.showPrompt('Image URL or Data URI:', 'https://') : '';
  if (!url) return;
  tcUbhInsertHtmlAtCursor('<img src="' + escapeAttr(url) + '" alt="" style="max-width:100%;height:auto;" />');
};

window.tcUbhInsertLink = async function () {
  var url = window.showPrompt ? await window.showPrompt('Link URL:', 'https://') : '';
  if (!url) return;
  tcUbhExec('createLink', url);
};

window.tcUbhAddCssSnippet = function (kind) {
  var cssTa = document.getElementById('ubhCssTextarea');
  if (!cssTa) return;
  var selPrefix = (_ubhTargetId === 'header') ? '.exam-header' : ('#ex-' + _ubhTargetId);
  var snippets = {
    columns2: selPrefix + ' .header-grid { display: flex; flex-wrap: wrap; gap: 8px 18px; } ' + selPrefix + ' .header-grid > div { flex: 1 1 calc(50% - 18px); min-width: 180px; }',
    columns3: selPrefix + ' .header-grid { display: flex; flex-wrap: wrap; gap: 8px 14px; } ' + selPrefix + ' .header-grid > div { flex: 1 1 calc(33.333% - 14px); min-width: 140px; }',
    noBorder: selPrefix + ' { border: none !important; box-shadow: none !important; background: transparent !important; }',
    solidBorder: selPrefix + ' { border: 2px solid #000 !important; padding: 12px !important; }',
    shaded: selPrefix + ' { background: #f8fafc !important; border: 1.5px solid #333 !important; padding: 12px !important; }'
  };
  if (snippets[kind]) {
    tcUbhMarkCustomEnabled();
    cssTa.value = (cssTa.value ? cssTa.value.trim() + '\n' : '') + snippets[kind];
    tcUbhUpdatePreview();
  }
};

window.tcSaveBlockHtmlEditor = function () {
  if (!_ubhTargetId || !currentTest) return;
  var enabled = !!(document.getElementById('ubhCustomEnabled') && document.getElementById('ubhCustomEnabled').checked);
  var htmlVal = (document.getElementById('ubhHtmlTextarea') && document.getElementById('ubhHtmlTextarea').value) || '';
  var cssVal = (document.getElementById('ubhCssTextarea') && document.getElementById('ubhCssTextarea').value) || '';

  if (_ubhTargetId === 'header') {
    var hc = TestCreatorService.ensureHeaderConfig(currentTest);
    hc.customHtmlMode = enabled;
    hc.customHtml = htmlVal;
    hc.customCss = cssVal;
  } else {
    var ex = (currentTest.exercises || []).find(function (e) { return e.id === _ubhTargetId; });
    if (ex) {
      ex.customHtmlMode = enabled;
      ex.customHtml = htmlVal;
      ex.customCss = cssVal;
    }
  }
  tcSaveCurrentTest(false);
  tcCloseBlockHtmlEditor();
  renderExerciseCards();
  if (typeof tcUpdatePrintPreview === 'function') {
    tcUpdatePrintPreview({ force: true });
  } else {
    tcScheduleLivePreviewUpdate(50);
  }
  if (window.showToast) showToast(i18n.t('tcUbhSavedToast') || 'Block HTML/CSS saved!');
};

window.tcToggleExAutoSave = async function (exId, isChecked) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  ex.autoSaveToDb = !!isChecked;
  tcOnDirty();
  if (isChecked) {
    await TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
    if (typeof tcLoadDrawerContent === 'function') tcLoadDrawerContent();
    if (window.showToast) {
      showToast(i18n.t('tcSavedToDb') || 'Saved exercise to database!');
    }
  } else {
    if (window.showToast) {
      showToast(i18n.t('tcRemovedAutoSaveDb') || 'Database auto-save disabled for this exercise');
    }
  }
};

// ── Custom Block (WYSIWYG & Pure HTML) Handlers ───────────────────────
window.tcSetCustomBlockMode = function (exId, newMode) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.content) ex.content = {};

  var wysiwygWrap = document.getElementById('wysiwygWrap_' + exId);
  var htmlWrap = document.getElementById('htmlWrap_' + exId);
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  var htmlTextarea = document.getElementById('htmlTextarea_' + exId);
  var htmlPreview = document.getElementById('htmlPreview_' + exId);
  var modeBtnWysiwyg = document.getElementById('modeBtnWysiwyg_' + exId);
  var modeBtnHtml = document.getElementById('modeBtnHtml_' + exId);
  var modeHint = document.getElementById('modeHint_' + exId);

  if (newMode === 'html') {
    // Sync from WYSIWYG to HTML
    if (wysiwygEl) {
      ex.content.html = wysiwygEl.innerHTML;
    }
    if (htmlTextarea) {
      htmlTextarea.value = ex.content.html || '';
    }
    if (htmlPreview) {
      htmlPreview.innerHTML = ex.content.html || '';
    }
    if (wysiwygWrap) wysiwygWrap.style.display = 'none';
    if (htmlWrap) htmlWrap.style.display = 'block';
    if (modeBtnWysiwyg) modeBtnWysiwyg.classList.remove('active');
    if (modeBtnHtml) modeBtnHtml.classList.add('active');
    if (modeHint) modeHint.textContent = i18n.t('tcCustomModeHtml') || 'Pure HTML Code Editor';
  } else {
    // Sync from HTML to WYSIWYG
    if (htmlTextarea) {
      ex.content.html = htmlTextarea.value;
    }
    if (wysiwygEl) {
      wysiwygEl.innerHTML = ex.content.html || '';
    }
    if (htmlWrap) htmlWrap.style.display = 'none';
    if (wysiwygWrap) wysiwygWrap.style.display = 'block';
    if (modeBtnHtml) modeBtnHtml.classList.remove('active');
    if (modeBtnWysiwyg) modeBtnWysiwyg.classList.add('active');
    if (modeHint) modeHint.textContent = i18n.t('tcCustomModeWysiwyg') || 'WYSIWYG Visual Editor';
  }

  ex.content.mode = newMode;
  tcOnDirty();
};

window.tcOnCustomWysiwygInput = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.content) ex.content = {};
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) {
    ex.content.html = wysiwygEl.innerHTML;
    var htmlTextarea = document.getElementById('htmlTextarea_' + exId);
    if (htmlTextarea && ex.content.mode === 'wysiwyg') {
      htmlTextarea.value = ex.content.html;
    }
    var htmlPreview = document.getElementById('htmlPreview_' + exId);
    if (htmlPreview) {
      htmlPreview.innerHTML = ex.content.html;
    }
  }
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate(300);
  }
};

window.tcOnCustomWysiwygBlur = function (exId) {
  window.tcOnCustomWysiwygInput(exId);
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

window.tcCustomWysiwygExec = function (exId, cmd, val) {
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) wysiwygEl.focus();
  try {
    document.execCommand(cmd, false, val || null);
  } catch (e) {
    console.warn('WYSIWYG execCommand error:', cmd, e);
  }
  window.tcOnCustomWysiwygInput(exId);
};

window.tcCustomWysiwygFormatBlock = function (exId, tag) {
  if (!tag) return;
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) wysiwygEl.focus();
  var blockTag = tag.startsWith('<') ? tag : ('<' + tag + '>');
  try {
    document.execCommand('formatBlock', false, blockTag);
  } catch (e) {
    console.warn('WYSIWYG formatBlock error:', tag, e);
  }
  window.tcOnCustomWysiwygInput(exId);
};

window.tcCustomWysiwygInsertTable = function (exId) {
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) wysiwygEl.focus();
  var tableHtml = '<table style="width:100%; border-collapse:collapse; margin:8px 0;">' +
    '<thead><tr style="background:#f3f4f6;">' +
    '<th style="border:1.5px solid #333333; padding:6px 10px;">Header 1</th>' +
    '<th style="border:1.5px solid #333333; padding:6px 10px;">Header 2</th>' +
    '<th style="border:1.5px solid #333333; padding:6px 10px;">Header 3</th>' +
    '</tr></thead>' +
    '<tbody>' +
    '<tr><td style="border:1.5px solid #333333; padding:6px 10px;">Cell 1</td><td style="border:1.5px solid #333333; padding:6px 10px;">Cell 2</td><td style="border:1.5px solid #333333; padding:6px 10px;">Cell 3</td></tr>' +
    '<tr><td style="border:1.5px solid #333333; padding:6px 10px;">Cell 4</td><td style="border:1.5px solid #333333; padding:6px 10px;">Cell 5</td><td style="border:1.5px solid #333333; padding:6px 10px;">Cell 6</td></tr>' +
    '</tbody></table><p><br></p>';
  try {
    document.execCommand('insertHTML', false, tableHtml);
  } catch (e) {
    if (wysiwygEl) wysiwygEl.innerHTML += tableHtml;
  }
  window.tcOnCustomWysiwygInput(exId);
};

window.tcCustomWysiwygInsertCallout = function (exId) {
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) wysiwygEl.focus();
  var calloutHtml = '<div style="background:#eff6ff; border:2px solid #2563eb; border-radius:6px; padding:10px 14px; margin:8px 0;">' +
    '<strong style="color:#1e40af;">ℹ️ Note / Instructions:</strong> Enter important details, context, or guidelines here.' +
    '</div><p><br></p>';
  try {
    document.execCommand('insertHTML', false, calloutHtml);
  } catch (e) {
    if (wysiwygEl) wysiwygEl.innerHTML += calloutHtml;
  }
  window.tcOnCustomWysiwygInput(exId);
};

window.tcCustomWysiwygInsertLines = function (exId) {
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) wysiwygEl.focus();
  var linesHtml = '<div style="margin:8px 0;">' +
    '<div style="border-bottom:1.5px solid #888888; height:26px;"></div>' +
    '<div style="border-bottom:1.5px solid #888888; height:26px;"></div>' +
    '<div style="border-bottom:1.5px solid #888888; height:26px;"></div>' +
    '</div><p><br></p>';
  try {
    document.execCommand('insertHTML', false, linesHtml);
  } catch (e) {
    if (wysiwygEl) wysiwygEl.innerHTML += linesHtml;
  }
  window.tcOnCustomWysiwygInput(exId);
};

window.tcCustomWysiwygInsertLink = function (exId) {
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) wysiwygEl.focus();
  if (typeof showPrompt === 'function') {
    showPrompt(i18n.t('tcPromptEnterUrl'), 'https://').then(function (url) {
      if (url && url.trim()) {
        if (wysiwygEl) wysiwygEl.focus();
        try {
          document.execCommand('createLink', false, url.trim());
        } catch (e) {
          console.warn(e);
        }
        window.tcOnCustomWysiwygInput(exId);
      }
    });
  } else {
    var url = prompt(i18n.t('tcPromptEnterUrl'), 'https://');
    if (url && url.trim()) {
      if (wysiwygEl) wysiwygEl.focus();
      document.execCommand('createLink', false, url.trim());
      window.tcOnCustomWysiwygInput(exId);
    }
  }
};

window.tcCustomWysiwygInsertImage = function (exId) {
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl) wysiwygEl.focus();
  if (typeof showPrompt === 'function') {
    showPrompt(i18n.t('tcPromptEnterImageUrl'), '').then(function (url) {
      if (url && url.trim()) {
        if (wysiwygEl) wysiwygEl.focus();
        try {
          document.execCommand('insertImage', false, url.trim());
        } catch (e) {
          console.warn(e);
        }
        window.tcOnCustomWysiwygInput(exId);
      }
    });
  } else {
    var url = prompt(i18n.t('tcPromptEnterImageUrl'), '');
    if (url && url.trim()) {
      if (wysiwygEl) wysiwygEl.focus();
      document.execCommand('insertImage', false, url.trim());
      window.tcOnCustomWysiwygInput(exId);
    }
  }
};

window.tcOnCustomHtmlInput = function (exId, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.content) ex.content = {};
  ex.content.html = val;
  var prev = document.getElementById('htmlPreview_' + exId);
  if (prev) {
    prev.innerHTML = val;
  }
  var wysiwygEl = document.getElementById('wysiwyg_' + exId);
  if (wysiwygEl && ex.content.mode === 'html') {
    wysiwygEl.innerHTML = val;
  }
  tcOnDirty();
  if (typeof tcScheduleLivePreviewUpdate === 'function') {
    tcScheduleLivePreviewUpdate(300);
  }
};

window.tcInsertCustomHtmlSnippet = function (exId, snippetType) {
  var ta = document.getElementById('htmlTextarea_' + exId);
  if (!ta) return;
  var snippet = '';
  switch (snippetType) {
    case 'table':
      snippet = '\n<table style="width:100%; border-collapse:collapse; margin:8px 0;">\n' +
        '  <thead>\n' +
        '    <tr style="background:#f3f4f6;">\n' +
        '      <th style="border:1.5px solid #333333; padding:6px 10px;">Header 1</th>\n' +
        '      <th style="border:1.5px solid #333333; padding:6px 10px;">Header 2</th>\n' +
        '      <th style="border:1.5px solid #333333; padding:6px 10px;">Header 3</th>\n' +
        '    </tr>\n' +
        '  </thead>\n' +
        '  <tbody>\n' +
        '    <tr><td style="border:1.5px solid #333333; padding:6px 10px;">Data 1</td><td style="border:1.5px solid #333333; padding:6px 10px;">Data 2</td><td style="border:1.5px solid #333333; padding:6px 10px;">Data 3</td></tr>\n' +
        '    <tr><td style="border:1.5px solid #333333; padding:6px 10px;">Data 4</td><td style="border:1.5px solid #333333; padding:6px 10px;">Data 5</td><td style="border:1.5px solid #333333; padding:6px 10px;">Data 6</td></tr>\n' +
        '  </tbody>\n' +
        '</table>\n';
      break;
    case 'callout':
      snippet = '\n<div style="background:#eff6ff; border:2px solid #2563eb; border-radius:6px; padding:10px 14px; margin:8px 0;">\n' +
        '  <strong style="color:#1e40af;">ℹ️ Note:</strong> Important notice or instructions.\n' +
        '</div>\n';
      break;
    case 'two_cols':
      snippet = '\n<div style="display:flex; gap:16px; margin:8px 0;">\n' +
        '  <div style="flex:1; border:1.5px solid #333333; border-radius:6px; padding:10px;">\n' +
        '    <h4>Column 1</h4>\n' +
        '    <p>Content for column 1...</p>\n' +
        '  </div>\n' +
        '  <div style="flex:1; border:1.5px solid #333333; border-radius:6px; padding:10px;">\n' +
        '    <h4>Column 2</h4>\n' +
        '    <p>Content for column 2...</p>\n' +
        '  </div>\n' +
        '</div>\n';
      break;
    case 'ruled_lines':
      snippet = '\n<div style="margin:8px 0;">\n' +
        '  <div style="border-bottom:1.5px solid #888888; height:26px;"></div>\n' +
        '  <div style="border-bottom:1.5px solid #888888; height:26px;"></div>\n' +
        '  <div style="border-bottom:1.5px solid #888888; height:26px;"></div>\n' +
        '</div>\n';
      break;
    case 'badge':
      snippet = '<span style="background:#fef08a; border:1.5px solid #ca8a04; color:#713f12; font-weight:800; padding:2px 8px; border-radius:4px; font-size:0.85em;">Badge</span>';
      break;
    case 'image':
      snippet = '\n<figure style="margin:8px 0; text-align:center;">\n' +
        '  <img src="assets/..." alt="Figure description" style="max-width:100%; height:auto; border:1.5px solid #333333; border-radius:6px;" />\n' +
        '  <figcaption style="font-size:0.85em; font-style:italic; color:#64748b; margin-top:4px;">Figure Caption</figcaption>\n' +
        '</figure>\n';
      break;
  }

  var start = ta.selectionStart !== undefined ? ta.selectionStart : ta.value.length;
  var end = ta.selectionEnd !== undefined ? ta.selectionEnd : ta.value.length;
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(end);
  ta.value = before + snippet + after;
  ta.selectionStart = ta.selectionEnd = start + snippet.length;
  ta.focus();
  window.tcOnCustomHtmlInput(exId, ta.value);
};

// ── Exercise Mutation Actions ─────────────────────────────────────────
window.tcUpdateExField = function (exId, field, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  ex[field] = value;
  if (field === 'points') {
    updatePointsBadge();
  }
  if (ex.autoSaveToDb && (field === 'title' || field === 'instructions')) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

window.tcUpdateClozeText = function (exId, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.content) ex.content = {};
  ex.content.text = val;
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateClozeOption = function (exId, opt, checked) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  ex.content[opt] = checked;
};

window.tcUpdateExPointsPerItem = function (exId, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  ex.pointsPerItem = val;
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateExContentField = function (exId, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!ex.content) ex.content = {};
  ex.content[field] = val;
};

// ── Cloze Multi-Item Handlers ──────────────────────────────────────────
window.tcAddClozeItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  TestCreatorService.normalizeExerciseItems(ex);
  ex.content.items.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    text: 'Sentence ' + (ex.content.items.length + 1) + ' with [blank].'
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcRemoveClozeItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content || !Array.isArray(ex.content.items)) return;
  ex.content.items.splice(idx, 1);
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateClozeItemText = function (exId, idx, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  TestCreatorService.normalizeExerciseItems(ex);
  if (ex.content.items[idx]) {
    ex.content.items[idx].text = val;
    ex.content.text = ex.content.items.map(function (it) { return it.text; }).join('\n');
    TestCreatorService.calculateExercisePoints(ex);
    updatePointsBadge();
  }
};

// ── Open Question Multi-Item Handlers ──────────────────────────────────
window.tcAddOpenQuestionItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  TestCreatorService.normalizeExerciseItems(ex);
  ex.content.items.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    prompt: 'Question ' + (ex.content.items.length + 1),
    lineStyle: 'lines',
    lineCount: 4,
    sampleAnswer: '',
    points: 2
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcDuplicateOpenQuestionItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  TestCreatorService.normalizeExerciseItems(ex);
  var source = ex.content.items[idx];
  if (source) {
    var dup = JSON.parse(JSON.stringify(source));
    dup.id = TestCreatorService.createEmptyExercise('cloze').id;
    dup.prompt = (dup.prompt || '') + ' (Copy)';
    ex.content.items.splice(idx + 1, 0, dup);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

window.tcRemoveOpenQuestionItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content || !Array.isArray(ex.content.items)) return;
  ex.content.items.splice(idx, 1);
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateOpenQuestionItem = function (exId, idx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  TestCreatorService.normalizeExerciseItems(ex);
  if (ex.content.items[idx]) {
    ex.content.items[idx][field] = val;
    if (field === 'points') {
      TestCreatorService.calculateExercisePoints(ex);
      updatePointsBadge();
    }
    tcOnDirty();
    if (ex.autoSaveToDb) {
      TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
    }
  }
};

// ── Composition Multi-Item Handlers ────────────────────────────────────
window.tcAddCompositionItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  TestCreatorService.normalizeExerciseItems(ex);
  var o = TestCreatorService.ensureExerciseOptions(ex);
  var count = ex.content.items.length + 1;
  ex.content.items.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    label: 'Option ' + String.fromCharCode(64 + count),
    prompt: 'Write about...',
    targetWordCount: 150,
    lineCount: 18,
    lineStyle: o.lineStyle || 'solid',
    lineHeight: o.lineHeight || 28,
    lineThickness: o.lineThickness || 1
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
  tcOnDirty();
};

window.tcRemoveCompositionItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content || !Array.isArray(ex.content.items)) return;
  ex.content.items.splice(idx, 1);
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
  tcOnDirty();
};

window.tcUpdateCompositionItem = function (exId, idx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  TestCreatorService.normalizeExerciseItems(ex);
  if (ex.content.items[idx]) {
    ex.content.items[idx][field] = val;
    if (field === 'lineStyle' || field === 'lineHeight' || field === 'lineThickness') {
      var o = TestCreatorService.ensureExerciseOptions(ex);
      o[field] = val;
    }
    tcOnDirty();
    if (ex.autoSaveToDb) {
      TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
    }
  }
};

// ── Picture Description Multi-Item Handlers ────────────────────────────
window.tcAddPictureItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  TestCreatorService.normalizeExerciseItems(ex);
  ex.content.items.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    imagePath: '',
    imageCaption: '',
    prompt: 'Describe the scene shown in the image.',
    lineStyle: 'lines',
    lineCount: 8,
    modelAnswer: '',
    points: 4
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcRemovePictureItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content || !Array.isArray(ex.content.items)) return;
  ex.content.items.splice(idx, 1);
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdatePictureItem = function (exId, idx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  TestCreatorService.normalizeExerciseItems(ex);
  if (ex.content.items[idx]) {
    ex.content.items[idx][field] = val;
    if (field === 'points') {
      TestCreatorService.calculateExercisePoints(ex);
      updatePointsBadge();
    }
  }
};

window.tcHandlePicItemFileSelected = function (exId, idx, fileInput) {
  if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
  var file = fileInput.files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    var dataUrl = e.target.result;
    var ex = (currentTest.exercises || []).find(function (it) { return it.id === exId; });
    if (ex) {
      TestCreatorService.normalizeExerciseItems(ex);
      if (ex.content.items[idx]) {
        ex.content.items[idx].imagePath = dataUrl;
        renderExerciseCards();
      }
    }
  };
  reader.readAsDataURL(file);
};

// ── Universal Bulk Add Controller ─────────────────────────────────────
var _bulkActiveExId = null;
var _bulkActiveType = null;

window.tcOpenBulkAddModal = function (exId, type) {
  _bulkActiveExId = exId;
  _bulkActiveType = type;
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  var titleEl = document.getElementById('bulkAddModalTitle');
  var hintEl = document.getElementById('bulkAddModalHint');
  var pasteEl = document.getElementById('bulkAddPasteArea');
  if (pasteEl) pasteEl.value = '';

  var title = 'Bulk Add Items';
  var hint = 'Quickly generate multiple blank items or paste lines below:';
  var placeholder = 'Enter or paste lines here...';

  if (type === 'cloze') {
    title = 'Bulk Add Gap-Fill Sentences';
    hint = 'Paste multiple sentences. Enclose missing words in brackets e.g. [answer].';
    placeholder = 'The solar system has eight [planets].\nThe sun is a [star].';
  } else if (type === 'open_question') {
    title = 'Bulk Add Open Questions';
    hint = 'Paste multiple questions (one per line).';
    placeholder = 'What is cellular respiration?\nName three components of a plant cell.\nHow do enzymes work?';
  } else if (type === 'mcq') {
    title = 'Bulk Add MCQ Questions';
    hint = 'Paste multiple question prompts (one per line).';
    placeholder = 'What is the speed of light?\nWhich continent is Egypt located in?';
  } else if (type === 'matching') {
    title = 'Bulk Add Matching Pairs';
    hint = 'Paste pairs separated by "=" or "-" (e.g. Left = Right).';
    placeholder = 'Cat = Chat\nDog = Chien\nBird = Oiseau';
  } else if (type === 'translation') {
    title = 'Bulk Add Translation Sentences';
    hint = 'Paste sentences to translate (one per line). Optionally separate source and target with "=" (e.g. Hello = Bonjour).';
    placeholder = 'Where is the library? = Où est la bibliothèque ?\nHave a great day!';
  } else if (type === 'transformation') {
    title = 'Bulk Add Sentence Transformations';
    hint = 'Paste lines formatted as: Original sentence | KEYWORD | Prefix | Solution | Suffix';
    placeholder = 'He started working here two years ago. | FOR | He has worked here | for | two years.';
  } else if (type === 'odd_one_out') {
    title = 'Bulk Add Odd One Out Items';
    hint = 'Paste items formatted as comma-separated words with intruder specified e.g. Apple, Banana, Carrot, Orange | Carrot';
    placeholder = 'Apple, Banana, Carrot, Orange | Carrot | Vegetable\nDog, Cat, Eagle, Cow | Eagle | Bird';
  } else if (type === 'reading_comprehension') {
    title = 'Bulk Add Comprehension Sub-Questions';
    hint = 'Paste multiple comprehension questions (one per line).';
    placeholder = 'Where does the story take place?\nWhy did the protagonist leave?';
  } else if (type === 'table_rows') {
    title = 'Add Multiple Table Rows';
    hint = 'Select how many rows to add, or paste tab-separated rows of cell values.';
    placeholder = 'to run\tran\trun\tcourir\nto eat\tate\teaten\tmanger';
  }

  if (titleEl) titleEl.textContent = title;
  if (hintEl) hintEl.textContent = hint;
  if (pasteEl) pasteEl.placeholder = placeholder;

  document.getElementById('bulkAddModal').classList.add('open');
};

window.tcCloseBulkAddModal = function () {
  document.getElementById('bulkAddModal').classList.remove('open');
  _bulkActiveExId = null;
  _bulkActiveType = null;
};

window.tcApplyBulkCount = function (count) {
  if (!_bulkActiveExId) return;
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === _bulkActiveExId; });
  if (!ex) return;
  TestCreatorService.normalizeExerciseItems(ex);

  for (var i = 0; i < count; i++) {
    if (_bulkActiveType === 'cloze') {
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, text: 'Sentence ' + (ex.content.items.length + 1) + ' with [blank].' });
    } else if (_bulkActiveType === 'open_question') {
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, prompt: 'Question ' + (ex.content.items.length + 1), lineStyle: 'lines', lineCount: 4, sampleAnswer: '', points: 2 });
    } else if (_bulkActiveType === 'mcq') {
      ex.content.questions.push({ id: TestCreatorService.createEmptyExercise('cloze').id, prompt: 'Question ' + (ex.content.questions.length + 1), options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndices: [0], points: 1 });
    } else if (_bulkActiveType === 'matching') {
      ex.content.pairs.push({ id: TestCreatorService.createEmptyExercise('cloze').id, left: 'Item ' + (ex.content.pairs.length + 1), right: 'Match ' + (ex.content.pairs.length + 1) });
    } else if (_bulkActiveType === 'translation') {
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, sourceText: 'Sentence ' + (ex.content.items.length + 1), modelTranslation: '', allocatedLines: 2 });
    } else if (_bulkActiveType === 'transformation') {
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, original: 'Sentence ' + (ex.content.items.length + 1), keyword: 'KEYWORD', targetPrefix: '', targetSuffix: '', solution: '' });
    } else if (_bulkActiveType === 'odd_one_out') {
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, words: ['Word 1', 'Word 2', 'Word 3', 'Intruder'], intruder: 'Intruder', justificationKey: '', pointsIntruder: 1, pointsJustification: 1 });
    } else if (_bulkActiveType === 'reading_comprehension') {
      ex.content.subQuestions.push({ id: TestCreatorService.createEmptyExercise('cloze').id, prompt: 'Sub-question ' + (ex.content.subQuestions.length + 1), answerType: 'short', solution: '', points: 1 });
    } else if (_bulkActiveType === 'table_rows') {
      var cols = (ex.content.headers && ex.content.headers.length) || 3;
      var newRow = [];
      for (var c = 0; c < cols; c++) {
        newRow.push({ text: '', isBlank: c % 2 === 1 });
      }
      if (!Array.isArray(ex.content.rows)) ex.content.rows = [];
      ex.content.rows.push(newRow);
    }
  }

  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
  tcCloseBulkAddModal();
  if (window.showToast) showToast(i18n.tFmt('tcAddedItemsCount', { count: count }));
};

window.tcConfirmBulkAdd = function () {
  if (!_bulkActiveExId) return;
  var pasteEl = document.getElementById('bulkAddPasteArea');
  var text = (pasteEl ? pasteEl.value : '').trim();
  if (!text) {
    tcApplyBulkCount(3);
    return;
  }

  var ex = (currentTest.exercises || []).find(function (e) { return e.id === _bulkActiveExId; });
  if (!ex) return;
  TestCreatorService.normalizeExerciseItems(ex);
  var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  var addedCount = 0;

  lines.forEach(function (line) {
    if (_bulkActiveType === 'cloze') {
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, text: line });
      addedCount++;
    } else if (_bulkActiveType === 'open_question') {
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, prompt: line, lineStyle: 'lines', lineCount: 4, sampleAnswer: '', points: 2 });
      addedCount++;
    } else if (_bulkActiveType === 'mcq') {
      ex.content.questions.push({ id: TestCreatorService.createEmptyExercise('cloze').id, prompt: line, options: ['Option A', 'Option B', 'Option C', 'Option D'], correctIndices: [0], points: 1 });
      addedCount++;
    } else if (_bulkActiveType === 'matching') {
      var parts = line.split(/[=-]/);
      var left = (parts[0] || line).trim();
      var right = (parts[1] || '').trim();
      ex.content.pairs.push({ id: TestCreatorService.createEmptyExercise('cloze').id, left: left, right: right });
      addedCount++;
    } else if (_bulkActiveType === 'translation') {
      var parts = line.split('=');
      var src = (parts[0] || line).trim();
      var tr = (parts[1] || '').trim();
      ex.content.items.push({ id: TestCreatorService.createEmptyExercise('cloze').id, sourceText: src, modelTranslation: tr, allocatedLines: 2 });
      addedCount++;
    } else if (_bulkActiveType === 'transformation') {
      var parts = line.split('|').map(function (s) { return s.trim(); });
      ex.content.items.push({
        id: TestCreatorService.createEmptyExercise('cloze').id,
        original: parts[0] || line,
        keyword: parts[1] || 'REWRITE',
        targetPrefix: parts[2] || '',
        solution: parts[3] || '',
        targetSuffix: parts[4] || ''
      });
      addedCount++;
    } else if (_bulkActiveType === 'odd_one_out') {
      var parts = line.split('|').map(function (s) { return s.trim(); });
      var words = (parts[0] || line).split(/[,;]/).map(function (w) { return w.trim(); }).filter(Boolean);
      var intruder = parts[1] || (words[words.length - 1] || '');
      var why = parts[2] || '';
      ex.content.items.push({
        id: TestCreatorService.createEmptyExercise('cloze').id,
        words: words,
        intruder: intruder,
        justificationKey: why,
        pointsIntruder: 1,
        pointsJustification: 1
      });
      addedCount++;
    } else if (_bulkActiveType === 'reading_comprehension') {
      ex.content.subQuestions.push({ id: TestCreatorService.createEmptyExercise('cloze').id, prompt: line, answerType: 'short', solution: '', points: 1 });
      addedCount++;
    } else if (_bulkActiveType === 'table_rows') {
      var cells = line.split(/\t|,/).map(function (c) { return c.trim(); });
      var rowObj = cells.map(function (txt, cIdx) {
        return { text: txt, isBlank: cIdx === 1 || cIdx === 2 };
      });
      if (!Array.isArray(ex.content.rows)) ex.content.rows = [];
      ex.content.rows.push(rowObj);
      addedCount++;
    }
  });

  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
  tcCloseBulkAddModal();
  if (window.showToast) showToast(i18n.tFmt('tcAddedItemsCount', { count: addedCount }));
};

window.tcAddMcqQuestion = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  if (!Array.isArray(ex.content.questions)) ex.content.questions = [];
  ex.content.questions.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    prompt: 'New Question',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndices: [0],
    points: 1
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateMcqPrompt = function (exId, qIdx, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.questions && ex.content.questions[qIdx]) {
    ex.content.questions[qIdx].prompt = val;
  }
};

window.tcUpdateMcqOption = function (exId, qIdx, oIdx, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.questions && ex.content.questions[qIdx]) {
    ex.content.questions[qIdx].options[oIdx] = val;
  }
};

window.tcToggleMcqCorrect = function (exId, qIdx, oIdx, checked) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content || !ex.content.questions || !ex.content.questions[qIdx]) return;
  var q = ex.content.questions[qIdx];
  if (!Array.isArray(q.correctIndices)) q.correctIndices = [];
  var idx = q.correctIndices.indexOf(oIdx);
  if (checked && idx === -1) q.correctIndices.push(oIdx);
  if (!checked && idx !== -1) q.correctIndices.splice(idx, 1);
};

window.tcUpdateMcqPoints = function (exId, qIdx, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.questions && ex.content.questions[qIdx]) {
    ex.content.questions[qIdx].points = Number(val) || 1;
    TestCreatorService.calculateExercisePoints(ex);
    updatePointsBadge();
  }
};

window.tcAddMcqOption = function (exId, qIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.questions && ex.content.questions[qIdx]) {
    var q = ex.content.questions[qIdx];
    if (!Array.isArray(q.options)) q.options = [];
    q.options.push('Option ' + String.fromCharCode(65 + q.options.length));
    renderExerciseCards();
  }
};

window.tcRemoveMcqOption = function (exId, qIdx, oIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.questions && ex.content.questions[qIdx]) {
    var q = ex.content.questions[qIdx];
    if (Array.isArray(q.options)) {
      q.options.splice(oIdx, 1);
      if (Array.isArray(q.correctIndices)) {
        q.correctIndices = q.correctIndices.filter(function (i) { return i !== oIdx; }).map(function (i) { return i > oIdx ? i - 1 : i; });
      }
      renderExerciseCards();
    }
  }
};

window.tcRemoveMcqQuestion = function (exId, qIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.questions)) {
    ex.content.questions.splice(qIdx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

window.tcAddPair = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  if (!Array.isArray(ex.content.pairs)) ex.content.pairs = [];
  ex.content.pairs.push({ id: TestCreatorService.createEmptyExercise('cloze').id, left: '', right: '' });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdatePair = function (exId, prIdx, side, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.pairs && ex.content.pairs[prIdx]) {
    ex.content.pairs[prIdx][side] = val;
  }
};

window.tcRemovePair = function (exId, prIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.pairs) {
    ex.content.pairs.splice(prIdx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

window.tcToggleTableCellBlank = function (exId, rIdx, cIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.rows && ex.content.rows[rIdx] && ex.content.rows[rIdx][cIdx]) {
    var cell = ex.content.rows[rIdx][cIdx];
    cell.isBlank = !cell.isBlank;
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

window.tcAddTableRow = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  var cols = (ex.content.headers && ex.content.headers.length) || 3;
  var newRow = [];
  for (var i = 0; i < cols; i++) {
    newRow.push({ text: '', isBlank: i % 2 === 1 });
  }
  if (!Array.isArray(ex.content.rows)) ex.content.rows = [];
  ex.content.rows.push(newRow);
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcAddRubricItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  if (!Array.isArray(ex.markingRubric)) ex.markingRubric = [];
  ex.markingRubric.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    title: 'New Criterion',
    maxPoints: 2,
    weight: 1
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateRubricField = function (exId, rIdx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.markingRubric && ex.markingRubric[rIdx]) {
    ex.markingRubric[rIdx][field] = val;
    TestCreatorService.calculateExercisePoints(ex);
    updatePointsBadge();
  }
};

window.tcRemoveRubricItem = function (exId, rIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.markingRubric) {
    ex.markingRubric.splice(rIdx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

// ── Translation Helpers ────────────────────────────────────────────────
window.tcAddTrItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  if (!Array.isArray(ex.content.items)) ex.content.items = [];
  ex.content.items.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    sourceText: '',
    modelTranslation: '',
    allocatedLines: 2
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateTrField = function (exId, tIdx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.items && ex.content.items[tIdx]) {
    ex.content.items[tIdx][field] = val;
  }
};

window.tcRemoveTrItem = function (exId, tIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.items)) {
    ex.content.items.splice(tIdx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

// ── Table Completion Helpers ──────────────────────────────────────────
window.tcUpdateTableTh = function (exId, hIdx, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.headers)) {
    ex.content.headers[hIdx] = val;
  }
};

window.tcUpdateTableCellText = function (exId, rIdx, cIdx, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.rows && ex.content.rows[rIdx] && ex.content.rows[rIdx][cIdx]) {
    ex.content.rows[rIdx][cIdx].text = val;
  }
};

window.tcAddTableCol = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  if (!Array.isArray(ex.content.headers)) ex.content.headers = [];
  ex.content.headers.push('Col ' + (ex.content.headers.length + 1));
  if (Array.isArray(ex.content.rows)) {
    ex.content.rows.forEach(function (r) {
      r.push({ text: '', isBlank: false });
    });
  }
  renderExerciseCards();
};

window.tcRemoveTableRow = function (exId, rIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.rows)) {
    ex.content.rows.splice(rIdx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

window.tcRemoveTableCol = function (exId, cIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.headers) && ex.content.headers.length > 1) {
    ex.content.headers.splice(cIdx, 1);
    if (Array.isArray(ex.content.rows)) {
      ex.content.rows.forEach(function (r) {
        if (r && r.length > cIdx) r.splice(cIdx, 1);
      });
    }
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

// ── Sentence Transformation Helpers ───────────────────────────────────
window.tcAddTransformationItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  if (!Array.isArray(ex.content.items)) ex.content.items = [];
  ex.content.items.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    original: '',
    keyword: '',
    targetPrefix: '',
    targetSuffix: '',
    solution: ''
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateTransformationField = function (exId, idx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.items && ex.content.items[idx]) {
    ex.content.items[idx][field] = val;
  }
};

window.tcRemoveTransformationItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.items)) {
    ex.content.items.splice(idx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

// ── Picture Description File Helpers ──────────────────────────────────
window.tcHandlePicFileSelected = function (exId, fileInput) {
  if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
  var file = fileInput.files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    var dataUrl = e.target.result;
    var ex = (currentTest.exercises || []).find(function (it) { return it.id === exId; });
    if (ex) {
      if (!ex.content) ex.content = {};
      ex.content.imagePath = dataUrl;
      renderExerciseCards();
    }
  };
  reader.readAsDataURL(file);
};

// ── Odd One Out Helpers ────────────────────────────────────────────────
window.tcAddOddOneOutItem = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  if (!Array.isArray(ex.content.items)) ex.content.items = [];
  ex.content.items.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    words: ['Item 1', 'Item 2', 'Item 3', 'Intruder'],
    intruder: 'Intruder',
    justificationKey: '',
    pointsIntruder: 1,
    pointsJustification: 1
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateOddOneOutWords = function (exId, idx, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.items && ex.content.items[idx]) {
    var arr = String(val || '').split(/[,|]/).map(function (w) { return w.trim(); }).filter(Boolean);
    ex.content.items[idx].words = arr;
  }
};

window.tcUpdateOddOneOutField = function (exId, idx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.items && ex.content.items[idx]) {
    ex.content.items[idx][field] = val;
    if (field === 'pointsIntruder' || field === 'pointsJustification') {
      TestCreatorService.calculateExercisePoints(ex);
      updatePointsBadge();
    }
  }
};

window.tcRemoveOddOneOutItem = function (exId, idx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.items)) {
    ex.content.items.splice(idx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

// ── Reading Comprehension Helpers ─────────────────────────────────────
window.tcAddReadingSubQuestion = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex || !ex.content) return;
  if (!Array.isArray(ex.content.subQuestions)) ex.content.subQuestions = [];
  ex.content.subQuestions.push({
    id: TestCreatorService.createEmptyExercise('cloze').id,
    prompt: 'New Question',
    answerType: 'short',
    solution: '',
    points: 1
  });
  TestCreatorService.calculateExercisePoints(ex);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcUpdateReadingSubQ = function (exId, sIdx, field, val) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && ex.content.subQuestions && ex.content.subQuestions[sIdx]) {
    ex.content.subQuestions[sIdx][field] = val;
    if (field === 'points') {
      TestCreatorService.calculateExercisePoints(ex);
      updatePointsBadge();
    }
    tcOnDirty();
    if (ex.autoSaveToDb) {
      TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
    }
  }
};

window.tcRemoveReadingSubQ = function (exId, sIdx) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (ex && ex.content && Array.isArray(ex.content.subQuestions)) {
    ex.content.subQuestions.splice(sIdx, 1);
    TestCreatorService.calculateExercisePoints(ex);
    renderExerciseCards();
    updatePointsBadge();
  }
};

window.tcMoveExercise = function (index, direction) {
  var target = index + direction;
  var exs = currentTest.exercises;
  if (target < 0 || target >= exs.length) return;
  var temp = exs[index];
  exs[index] = exs[target];
  exs[target] = temp;
  renderExerciseCards();
};

window.tcDuplicateExercise = function (exId) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var clone = JSON.parse(JSON.stringify(ex));
  clone.id = TestCreatorService.createEmptyExercise('cloze').id;
  clone.title = (clone.title || 'Exercise') + ' (Copy)';
  var idx = currentTest.exercises.indexOf(ex);
  currentTest.exercises.splice(idx + 1, 0, clone);
  renderExerciseCards();
  updatePointsBadge();
};

window.tcDeleteExercise = function (exId) {
  currentTest.exercises = (currentTest.exercises || []).filter(function (e) {
    return e.id !== exId;
  });
  renderExerciseCards();
  updatePointsBadge();
};

window.tcQuickAddExercise = function (type) {
  var ex = TestCreatorService.createEmptyExercise(type);
  if (!Array.isArray(currentTest.exercises)) currentTest.exercises = [];
  currentTest.exercises.push(ex);
  renderExerciseCards();
  updatePointsBadge();
  if (ex.autoSaveToDb) {
    TestCreatorService.saveExerciseToDatabase(ex, currentTest.subject);
  }
};

window.tcAddSectionBlockToExam = function (type, insertAtIdx) {
  var ex = TestCreatorService.createEmptyExercise(type);
  if (!Array.isArray(currentTest.exercises)) currentTest.exercises = [];
  if (type === 'section_competences') {
    ex.linkedCompetences = [];
    ex.linkedCompetenceIds = [];
  } else if (type === 'section_criteria') {
    ex.criteria = [];
    ex.linkedCriteria = [];
    ex.markingRubric = [];
    ex.points = 0;
    TestCreatorService.calculateExercisePoints(ex, currentTest);
  } else if (type === 'section_custom' || type === 'custom_block') {
    ex.title = i18n.t('tcCustomBlockTitle') || 'Custom Block';
    ex.instructions = '';
    ex.points = 0;
    ex.content = {
      mode: 'wysiwyg',
      html: '<p>' + (i18n.t('tcCustomBlockDefaultHtml') || 'Enter your custom content here. You can format text, insert tables, images, formulas, or custom layouts.') + '</p>'
    };
  } else if (type === 'section_pdf') {
    ex.title = i18n.t('tcPdfCardTitle') || 'Document: Reading Passage';
    ex.instructions = '';
    ex.points = 0;
    ex.forcePageBreak = true;
    ex.content = {
      pdfPath: '',
      pdfName: '',
      pdfSize: 0,
      totalPdfPages: 0,
      pageSelectionMode: 'all',
      pageRangeString: 'all',
      selectedPageNumbers: [],
      renderedPagesCache: {}
    };
    ex.options = {
      displayMode: 'full_page',
      separatePage: true,
      pageOrientation: 'portrait',
      fitMode: 'fit_page',
      customScalePercent: 100,
      showTitle: true,
      showInstructions: true,
      showPageNumbers: true,
      includeInStudentTest: true,
      includeInTeacherKey: true
    };
  }
  if (typeof insertAtIdx === 'number' && insertAtIdx >= 0 && insertAtIdx <= currentTest.exercises.length) {
    currentTest.exercises.splice(insertAtIdx, 0, ex);
  } else {
    currentTest.exercises.push(ex);
  }
  renderExerciseCards();
  updatePointsBadge();
  if (window.showToast) {
    var title = ex.title || 'Section block';
    var template = i18n.t('tcSectionBlockAddedToast') || "Added '{0}' block to exam sequence";
    showToast(template.replace('{0}', title));
  }
  tcOnDirty();
  // A new rubric block is empty: open the Criteria Database panel targeting it.
  if (type === 'section_criteria' && typeof window.tcOpenCriteriaDrawerForSection === 'function') {
    window.tcOpenCriteriaDrawerForSection(ex.id);
  }
};

function syncRubricOptionKeys(o, key, value, ex) {
  if (!o) return;
  o[key] = value;
  if (key === 'displayMode') o.rubricDisplayMode = value;
  else if (key === 'rubricDisplayMode') o.displayMode = value;
  else if (key === 'background') o.rubricBg = value;
  else if (key === 'rubricBg') o.background = value;
  else if (key === 'padding') o.rubricPadding = value;
  else if (key === 'rubricPadding') o.padding = value;
  else if (key === 'border') o.rubricBorder = value;
  else if (key === 'rubricBorder') o.border = value;
  else if (key === 'showDescriptions') o.showRubricDescriptions = value;
  else if (key === 'showRubricDescriptions') o.showDescriptions = value;
  else if (key === 'separatePage') {
    o.rubricSeparatePage = value;
    if (ex && (ex.type === 'section_criteria' || ex.type === 'section_competences' || ex.type === 'section_grading_scale')) ex.forcePageBreak = !!value;
  } else if (key === 'rubricSeparatePage') {
    o.separatePage = value;
    if (ex && (ex.type === 'section_criteria' || ex.type === 'section_competences' || ex.type === 'section_grading_scale')) ex.forcePageBreak = !!value;
  } else if (key === 'pageOrientation') {
    o.rubricPageOrientation = value;
    if (value === 'landscape') {
      o.separatePage = true;
      o.rubricSeparatePage = true;
      if (ex && (ex.type === 'section_criteria' || ex.type === 'section_competences' || ex.type === 'section_grading_scale')) ex.forcePageBreak = true;
    }
  } else if (key === 'rubricPageOrientation') {
    o.pageOrientation = value;
    if (value === 'landscape') {
      o.separatePage = true;
      o.rubricSeparatePage = true;
      if (ex && (ex.type === 'section_criteria' || ex.type === 'section_competences' || ex.type === 'section_grading_scale')) ex.forcePageBreak = true;
    }
  } else if (key === 'levelSubs') {
    o.rubricLevelSubs = value;
  } else if (key === 'rubricLevelSubs') {
    o.levelSubs = value;
  }
}

window.tcUpdateExOptionField = function (exId, optKey, value) {
  var ex = (currentTest.exercises || []).find(function (e) { return e.id === exId; });
  if (!ex) return;
  var o = TestCreatorService.ensureExerciseOptions(ex);
  syncRubricOptionKeys(o, optKey, value, ex);
  renderExerciseCards();
  tcOnDirty();
  if (window._currentEditingRubricExId === exId && typeof tcRenderRubricLayoutPreview === 'function') {
    tcRenderRubricLayoutPreview(ex);
  }
  if (window._currentEditingCompExId === exId && typeof tcRenderCompLayoutPreview === 'function') {
    tcRenderCompLayoutPreview(ex);
  }
  if (window._currentEditingScaleExId === exId && typeof tcRenderScaleLayoutPreview === 'function') {
    tcRenderScaleLayoutPreview(ex);
  }
  if (typeof tcScheduleLivePreviewUpdate === 'function') tcScheduleLivePreviewUpdate();
};

window.tcBrowseCompetences = function (targetId) {
  _targetAttachExId = targetId || '__exam__';
  var drawer = document.getElementById('testDrawer');
  if (drawer) drawer.style.display = 'flex';
  tcSwitchDrawerTab('competences');
  updateCompetenceTargetDropdown();
  if (typeof tcFilterCompetences === 'function') tcFilterCompetences();
};

window.tcBrowseCriteria = function (targetId) {
  _targetAttachExId = targetId || '__exam__';
  var drawer = document.getElementById('testDrawer');
  if (drawer) drawer.style.display = 'flex';
  tcSwitchDrawerTab('criteriadb');
  updateCriteriaTargetDropdown();
  if (typeof tcRenderCriteriaList === 'function' && Array.isArray(_cachedCriteria)) {
    tcRenderCriteriaList(_cachedCriteria);
  }
};

window.tcBrowseScales = function (targetId) {
  _targetAttachExId = targetId || '__exam__';
  var drawer = document.getElementById('testDrawer');
  if (drawer) drawer.style.display = 'flex';
  tcSwitchDrawerTab('scales');
  if (typeof updateScaleTargetDropdown === 'function') updateScaleTargetDropdown();
};

window.tcOpenCompetenceDrawerForSection = function (exId) {
  tcBrowseCompetences(exId);
  var ex = (currentTest && currentTest.exercises) ? currentTest.exercises.find(function (e) { return e.id === exId; }) : null;
  var title = ex ? (ex.title || 'Competences Block') : (exId === '__exam__' ? (i18n.t('tcExamWideHeader') || 'Exam-wide Competences') : 'Competences Block');
  if (window.showToast && exId !== '__exam__') {
    showToast((i18n.t('tcTargetingCompetenceBlock') || "Targeting block '{title}'. Competences added will belong to this block.").replace('{title}', title));
  }
};

window.tcOpenCriteriaDrawerForSection = function (exId) {
  tcBrowseCriteria(exId);
  var ex = (currentTest && currentTest.exercises) ? currentTest.exercises.find(function (e) { return e.id === exId; }) : null;
  var title = ex ? (ex.title || 'Criteria Block') : (exId === '__exam__' ? (i18n.t('tcExamWideHeader') || 'Exam-wide Rubric') : 'Criteria Block');
  if (window.showToast && exId !== '__exam__') {
    showToast((i18n.t('tcTargetingCriteriaBlock') || "Targeting block '{title}'. Criteria added will belong to this block.").replace('{title}', title));
  }
};

window.tcOpenScalesDrawerForSection = function (exId) {
  tcBrowseScales(exId);
  if (window.showToast && exId !== '__exam__') {
    showToast(i18n.t('tcManageInDrawer') || 'Open & Edit in Drawer…');
  }
};

window.tcOpenAddExerciseModal = function () {
  tcQuickAddExercise('cloze');
};

// ── Drawer Management ────────────────────────────────────────────────
window.tcToggleDrawer = function () {
  var drawer = document.getElementById('testDrawer');
  if (drawer.style.display === 'none') {
    drawer.style.display = 'flex';
  } else {
    drawer.style.display = 'none';
  }
};

window.tcSwitchDrawerTab = function (tabId) {
  activeDrawerTab = tabId;
  var btns = document.querySelectorAll('.drawer-tab-btn');
  btns.forEach(function (b) { b.classList.remove('active'); });
  var panels = document.querySelectorAll('.drawer-tab-panel');
  panels.forEach(function (p) { p.classList.remove('active'); });

  if (tabId === 'testbank') {
    document.getElementById('tabBtnTestBank').classList.add('active');
    document.getElementById('panelTestBank').classList.add('active');
  } else if (tabId === 'learningdb') {
    document.getElementById('tabBtnLearningDb').classList.add('active');
    document.getElementById('panelLearningDb').classList.add('active');
  } else if (tabId === 'criteriadb') {
    document.getElementById('tabBtnCriteriaDb').classList.add('active');
    document.getElementById('panelCriteriaDb').classList.add('active');
    updateCriteriaTargetDropdown();
  } else if (tabId === 'competences') {
    document.getElementById('tabBtnCompetences').classList.add('active');
    document.getElementById('panelCompetences').classList.add('active');
    updateCompetenceTargetDropdown();
  } else if (tabId === 'scales') {
    document.getElementById('tabBtnScales').classList.add('active');
    document.getElementById('panelScales').classList.add('active');
    if (typeof updateScaleTargetDropdown === 'function') updateScaleTargetDropdown();
  }
  tcLoadDrawerContent();
};

