        // ═══════════════════════════════════════════════════════ CLASS PLAN LOGIC ═══

        // ── Helpers ───────────────────────────────────────────────────────────────────

        function cpGetPlans(groupName) {
            if (!groupName) return [];
            if (!classPlans[groupName]) classPlans[groupName] = [];
            return classPlans[groupName];
        }

        function cpGetActivePlan(groupName) {
            return cpGetPlans(groupName).find(p => p.isActive) || null;
        }

        function cpSetActive(groupName, planId) {
            cpGetPlans(groupName).forEach(p => { p.isActive = (p.id === planId); });
        }

        function _cpSerializablePlans() {
            const out = {};
            for (const group in classPlans) {
                out[group] = (classPlans[group] || []).map(p => {
                    const clean = Object.assign({}, p);
                    delete clean._teamViewSeats;
                    delete clean._teamViewRows;
                    delete clean._seatsDirty;
                    return clean;
                });
            }
            return out;
        }

        function cpSavePlans() {
            const clean = _cpSerializablePlans();
            try { localStorage.setItem('cms-class-plans', JSON.stringify(clean)); } catch (_) { }
            if (window.Desktop && typeof window.Desktop.saveText === 'function') {
                (async function () {
                    try {
                        let layoutsSuffix = '';
                        if (typeof window.Desktop.readText === 'function') {
                            const existing = await window.Desktop.readText('classPlans', 'plans.js').catch(() => null);
                            if (existing && existing.ok && existing.content) {
                                const m = existing.content.match(/var\s+SAVED_CLASSROOM_LAYOUTS\s*=[\s\S]*/);
                                if (m) layoutsSuffix = '\n' + m[0];
                            }
                        }
                        const plansContent = 'var SAVED_CLASS_PLANS = ' + JSON.stringify(clean, null, 2) + ';' + layoutsSuffix;
                        await window.Desktop.saveText('classPlans', 'plans.js', plansContent);
                    } catch (_) { }
                })();
            }
        }

        function _cpPlanSlotLabel(slot) {
            if (!slot) return '';
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const day = days[parseInt(slot.day)] || ('Day ' + slot.day);
            const time = slot.time ? slot.time.slice(0, 5) : '';
            const half = slot.halfGroup ? ' ½' + slot.halfGroup : '';
            return day + (time ? ' ' + time : '') + half;
        }

        function _cpGetPlanSlots(plan) {
            if (!plan) return [];
            if (Array.isArray(plan.plannerSlots) && plan.plannerSlots.length) return plan.plannerSlots;
            if (plan.plannerSlot) {
                if (Array.isArray(plan.plannerSlot)) return plan.plannerSlot;
                if (typeof plan.plannerSlot === 'object') return [plan.plannerSlot];
            }
            return [];
        }

        function cpScheduleSummary(plan) {
            if (!plan.schedule || !plan.schedule.length) return '';
            return plan.schedule.map(s => `${s.day} ${s.start}–${s.end}`).join(' · ');
        }

        // ── Manager ───────────────────────────────────────────────────────────────────

        function cpOpenManager() {
            const title = document.getElementById('cp-manager-title');
            if (title) title.textContent = 'Class Plans';
            cpRenderManagerList();
            document.getElementById('cp-manager-modal').style.display = 'flex';
        }

        function cpCloseManager() {
            document.getElementById('cp-manager-modal').style.display = 'none';
        }

        function cpRenderManagerList() {
            const container = document.getElementById('cp-manager-list');
            if (!container) return;

            const allGroups = Object.keys(studentGroups || {}).filter(g => !rawMeta[g]?.archived);
            const extraGroups = Object.keys(classPlans || {}).filter(g => !allGroups.includes(g) && !rawMeta[g]?.archived);
            const groups = [...allGroups, ...extraGroups];

            let html = '';
            let anyPlan = false;
            groups.forEach(g => {
                const plans = cpGetPlans(g);
                if (!plans.length) return;
                anyPlan = true;
                const gEsc = g.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                html += `<div class="cp-manager-group-header">${escapeSettingsHtml(g)}</div>`;
                html += plans.map((p, idx) => {
                    const active = p.isActive ? `<span class="cp-active-badge">Active</span>` : '';
                    const temp = p.isTemporary ? `<span class="cp-temp-badge">Temp</span>` : '';
                    const pSlots = _cpGetPlanSlots(p);
                    const slotStr = pSlots.map(_cpPlanSlotLabel).filter(Boolean).join(', ');
                    const meta = [p.roomNumber ? '' + p.roomNumber : '', slotStr ? '' + slotStr : '', cpScheduleSummary(p), `${p.rows}×${p.cols}`].filter(Boolean).join(' · ');
                    return `<div class="cp-manager-row">
              <div class="cp-manager-row-name">${escapeSettingsHtml(p.name)} ${active} ${temp}</div>
              <div class="cp-manager-row-meta">${escapeSettingsHtml(meta)}</div>
              <div class="cp-manager-btns">
                <button onclick="cpManagerPrint('${gEsc}',${idx})"><img src="../assets/icons/printer.svg" class="btn-icon" alt="" style="width:13px;height:13px;" /></button>
                <button onclick="cpManagerEdit('${gEsc}',${idx})">Edit</button>
                ${!p.isActive ? `<button onclick="cpManagerSetActive('${gEsc}',${idx})">Set Active</button>` : ''}
                <button class="danger" onclick="cpManagerDelete('${gEsc}',${idx})"><img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" /></button>
              </div>
            </div>`;
                }).join('');
            });

            if (!anyPlan) {
                container.innerHTML = '<div style="padding:18px;color:#aaa;font-size:.85rem;text-align:center;">No plans yet. Click "+ New Plan" to create one.</div>';
                return;
            }
            container.innerHTML = html;
        }

        function cpManagerSetActive(groupName, idx) {
            const plans = cpGetPlans(groupName);
            if (!plans[idx]) return;
            plans.forEach((p, i) => { p.isActive = (i === idx); });
            cpSavePlans();
            cpRenderManagerList();
        }

        function cpManagerDelete(groupName, idx) {
            const plans = cpGetPlans(groupName);
            if (!plans[idx]) return;
            showConfirm('Delete plan "' + plans[idx].name + '"?', () => {
                plans.splice(idx, 1);
                if (plans.length && !plans.find(p => p.isActive)) plans[0].isActive = true;
                cpSavePlans();
                cpRenderManagerList();
            });
        }

        function cpManagerEdit(groupName, idx) {
            const plan = cpGetPlans(groupName)[idx];
            if (!plan) return;
            _cpEditingPlan = plan;
            _cpEditingGroup = groupName;
            _cpOpenEditorDirect(plan);
        }

        function cpManagerPrint(groupName, idx) {
            const plan = cpGetPlans(groupName)[idx];
            if (!plan) return;
            _cpDoPrint(plan, groupName);
        }

        // ── Config modal ──────────────────────────────────────────────────────────────

        let _cpConfigForNewPlan = true;

        function cpOpenNewPlanConfig() {
            _cpConfigForNewPlan = true;
            document.getElementById('cp-config-title').textContent = 'New Plan';
            document.getElementById('cp-config-edit-id').value = '';
            document.getElementById('cp-config-name').value = 'Seating Plan';
            document.getElementById('cp-config-rows').value = 4;
            document.getElementById('cp-config-cols').value = 5;
            document.getElementById('cp-config-room').value = '';
            document.getElementById('cp-config-temporary').checked = false;
            _cpRenderScheduleSlots([]);
            const groupSel = document.getElementById('cp-config-group');
            const groups = Object.keys(studentGroups).filter(g => !rawMeta[g]?.archived);
            groupSel.innerHTML = groups
                .sort((a, b) => {
                    const na = (rawMeta[a] && rawMeta[a].name) ? rawMeta[a].name : a;
                    const nb = (rawMeta[b] && rawMeta[b].name) ? rawMeta[b].name : b;
                    return na.localeCompare(nb);
                })
                .map(g => {
                    const gdn = (rawMeta[g] && rawMeta[g].name) ? rawMeta[g].name : g;
                    return `<option value="${escapeSettingsHtml(g)}"${g === selectedGroupName ? ' selected' : ''}>${escapeSettingsHtml(gdn)}</option>`;
                }).join('');
            groupSel.disabled = false;
            document.getElementById('cp-config-modal').style.display = 'flex';
            setTimeout(() => document.getElementById('cp-config-name').focus(), 80);
        }

        function cpOpenEditConfig(plan) {
            _cpConfigForNewPlan = false;
            document.getElementById('cp-config-title').textContent = 'Edit Plan Settings';
            document.getElementById('cp-config-edit-id').value = plan.id;
            document.getElementById('cp-config-name').value = plan.name;
            document.getElementById('cp-config-rows').value = plan.rows;
            document.getElementById('cp-config-cols').value = plan.cols;
            document.getElementById('cp-config-room').value = plan.roomNumber || '';
            document.getElementById('cp-config-temporary').checked = !!plan.isTemporary;
            _cpRenderScheduleSlots(plan.schedule || []);
            document.getElementById('cp-config-modal').style.display = 'flex';
        }

        function cpCloseConfig() {
            document.getElementById('cp-config-modal').style.display = 'none';
        }

        function _cpRenderScheduleSlots(slots) {
            const container = document.getElementById('cp-schedule-slots');
            container.innerHTML = '';
            (slots.length ? slots : []).forEach(s => _cpAppendScheduleSlot(container, s));
        }

        function cpAddScheduleSlot() {
            _cpAppendScheduleSlot(document.getElementById('cp-schedule-slots'), null);
        }

        function _cpAppendScheduleSlot(container, slot) {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const row = document.createElement('div');
            row.className = 'cp-schedule-row';
            const daySel = document.createElement('select');
            daySel.className = 'cp-sched-day';
            days.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; if (slot && slot.day === d) o.selected = true; daySel.appendChild(o); });
            const startIn = document.createElement('input');
            startIn.type = 'time'; startIn.className = 'cp-sched-start'; startIn.value = slot ? slot.start : '08:00';
            const sep = document.createElement('span');
            sep.textContent = '–'; sep.style.cssText = 'color:#888;font-size:.8rem;';
            const endIn = document.createElement('input');
            endIn.type = 'time'; endIn.className = 'cp-sched-end'; endIn.value = slot ? slot.end : '09:00';
            const rm = document.createElement('button');
            rm.className = 'cp-sched-remove'; rm.innerHTML = '<img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" />'; rm.title = 'Remove slot';
            rm.onclick = () => row.remove();
            row.appendChild(daySel); row.appendChild(startIn); row.appendChild(sep); row.appendChild(endIn); row.appendChild(rm);
            container.appendChild(row);
        }

        function _cpCollectSchedule() {
            return Array.from(document.querySelectorAll('#cp-schedule-slots .cp-schedule-row')).map(row => ({
                day: row.querySelector('.cp-sched-day').value,
                start: row.querySelector('.cp-sched-start').value,
                end: row.querySelector('.cp-sched-end').value
            }));
        }

        function cpConfirmConfig() {
            const name = document.getElementById('cp-config-name').value.trim();
            if (!name) { showPrompt('Enter a plan name:', 'Seating Plan', v => { if (v) { document.getElementById('cp-config-name').value = v; cpConfirmConfig(); } }); return; }
            const rows = Math.max(1, Math.min(12, parseInt(document.getElementById('cp-config-rows').value) || 4));
            const cols = Math.max(1, Math.min(14, parseInt(document.getElementById('cp-config-cols').value) || 5));
            const room = document.getElementById('cp-config-room').value.trim();
            const temp = document.getElementById('cp-config-temporary').checked;
            const sched = _cpCollectSchedule();
            const editId = document.getElementById('cp-config-edit-id').value;
            const group = document.getElementById('cp-config-group').value;
            if (!group) { mdbToast('Please select a class first.'); return; }
            const plans = cpGetPlans(group);

            let plan;
            if (editId) {
                plan = plans.find(p => p.id === editId);
                if (plan) {
                    plan.name = name; plan.rows = rows; plan.cols = cols;
                    plan.roomNumber = room; plan.isTemporary = temp; plan.schedule = sched;
                    // trim/expand seats if grid changed
                    plan.seats = (plan.seats || []).filter(s => s.row < rows && s.col < cols);
                }
            }
            if (!plan) {
                plan = {
                    id: 'cp_' + Date.now(), name, rows, cols, roomNumber: room,
                    schedule: sched, seats: [], isTemporary: temp,
                    isActive: !plans.length, createdAt: Date.now()
                };
                plans.push(plan);
            }
            cpSavePlans();
            cpCloseConfig();
            _cpEditingPlan = plan;
            _cpEditingGroup = group;
            _cpOpenEditorDirect(plan);
        }

        // ── Editor ────────────────────────────────────────────────────────────────────

        let _cpEditingPlan = null;
        let _cpEditingGroup = null;

        function _cpOpenEditorDirect(plan) {
            _cpEditingPlan = plan;
            if (!_cpEditingGroup) _cpEditingGroup = selectedGroupName;
            _cpBuildEditor(plan);
            document.getElementById('cp-editor-modal').style.display = 'flex';
        }

        function _cpBuildEditor(plan) {
            // Title
            const titleEl = document.getElementById('cp-editor-title');
            titleEl.textContent = plan.name;

            // Meta
            const meta = [plan.roomNumber ? '' + plan.roomNumber : '', cpScheduleSummary(plan)].filter(Boolean).join('  ·  ');
            document.getElementById('cp-editor-meta').textContent = meta;

            // Sidebar
            const group = selectedGroupName;
            const students = (studentGroups[group] || []).map(s => s.name);
            const placed = new Set((plan.seats || []).map(s => s.studentName));
            const sidebar = document.getElementById('cp-sidebar-chips');
            sidebar.innerHTML = '';
            students.forEach(name => {
                const chip = document.createElement('div');
                chip.className = 'cp-student-chip' + (placed.has(name) ? ' placed' : '');
                chip.textContent = name;
                chip.dataset.student = name;
                if (!placed.has(name)) {
                    chip.draggable = true;
                    chip.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', name); e.dataTransfer.effectAllowed = 'move'; });
                }
                sidebar.appendChild(chip);
            });

            // Grid / Pods / U-shape
            const grid = document.getElementById('cp-grid');
            const lt = plan.layoutType || 'grid';
            grid.innerHTML = '';
            grid.className = 'cp-grid';
            grid.removeAttribute('style');

            const controls = document.getElementById('cp-grid-controls');
            if (controls) controls.style.display = lt === 'grid' ? '' : 'none';

            if (lt === 'pods') {
                grid.classList.add('cp-pods-layout');
                grid.style.gridTemplateColumns = `repeat(${plan.roomCols || 3}, auto)`;
                for (let pr = 0; pr < (plan.roomRows || 2); pr++) {
                    for (let pc = 0; pc < (plan.roomCols || 3); pc++) {
                        const pod = document.createElement('div');
                        pod.className = 'cp-pod-container';
                        pod.style.gridTemplateColumns = `repeat(${plan.podCols || 3}, 90px)`;
                        for (let r = 0; r < (plan.podRows || 2); r++) {
                            for (let c = 0; c < (plan.podCols || 3); c++) {
                                const seatId = `${pr}:${pc}:${r}:${c}`;
                                const seat = (plan.seats || []).find(s => s.seatId === seatId);
                                pod.appendChild(_cpBuildSeatIdCell(seatId, seat ? seat.studentName : null, plan));
                            }
                        }
                        grid.appendChild(pod);
                    }
                }
            } else if (lt === 'ushape') {
                const w = plan.uWidth || 6;
                const d = plan.uDepth || 3;
                grid.style.gridTemplateColumns = `repeat(${w}, 90px)`;
                for (let c = 0; c < w; c++) {
                    const seatId = `top:${c}`;
                    const seat = (plan.seats || []).find(s => s.seatId === seatId);
                    grid.appendChild(_cpBuildSeatIdCell(seatId, seat ? seat.studentName : null, plan));
                }
                for (let r = 1; r <= d; r++) {
                    for (let c = 0; c < w; c++) {
                        if (c === 0) {
                            const seatId = `left:${r}`;
                            const seat = (plan.seats || []).find(s => s.seatId === seatId);
                            grid.appendChild(_cpBuildSeatIdCell(seatId, seat ? seat.studentName : null, plan));
                        } else if (c === w - 1) {
                            const seatId = `right:${r}`;
                            const seat = (plan.seats || []).find(s => s.seatId === seatId);
                            grid.appendChild(_cpBuildSeatIdCell(seatId, seat ? seat.studentName : null, plan));
                        } else {
                            const spacer = document.createElement('div');
                            spacer.style.cssText = 'width:90px;height:64px;';
                            grid.appendChild(spacer);
                        }
                    }
                }
            } else {
                grid.style.gridTemplateColumns = `repeat(${plan.cols}, 90px)`;
                for (let r = 0; r < plan.rows; r++) {
                    for (let c = 0; c < plan.cols; c++) {
                        const seat = (plan.seats || []).find(s => s.row === r && s.col === c);
                        grid.appendChild(_cpBuildCell(r, c, seat ? seat.studentName : null, plan));
                    }
                }
            }
        }

        function cpEditorAddRow() {
            const plan = _cpEditingPlan;
            if (!plan) return;
            if (plan.rows >= 12) return;
            plan.rows++;
            cpSavePlans();
            _cpBuildEditor(plan);
        }

        function cpEditorRemoveRow() {
            const plan = _cpEditingPlan;
            if (!plan || plan.rows <= 1) return;
            const lastRow = plan.rows - 1;
            const seatedInRow = (plan.seats || []).filter(s => s.row === lastRow);
            const _doRemove = () => { plan.seats = (plan.seats || []).filter(s => s.row !== lastRow); plan.rows--; cpSavePlans(); _cpBuildEditor(plan); };
            if (seatedInRow.length > 0) { showConfirm(`Remove last row? ${seatedInRow.length} student(s) will be unplaced.`, _doRemove); } else { _doRemove(); }
        }

        function cpEditorAddCol() {
            const plan = _cpEditingPlan;
            if (!plan) return;
            if (plan.cols >= 14) return;
            plan.cols++;
            cpSavePlans();
            _cpBuildEditor(plan);
        }

        function cpEditorRemoveCol() {
            const plan = _cpEditingPlan;
            if (!plan || plan.cols <= 1) return;
            const lastCol = plan.cols - 1;
            const seatedInCol = (plan.seats || []).filter(s => s.col === lastCol);
            const _doRemove = () => { plan.seats = (plan.seats || []).filter(s => s.col !== lastCol); plan.cols--; cpSavePlans(); _cpBuildEditor(plan); };
            if (seatedInCol.length > 0) { showConfirm(`Remove last column? ${seatedInCol.length} student(s) will be unplaced.`, _doRemove); } else { _doRemove(); }
        }

        function cpEditorRandomAssign() {
            const plan = _cpEditingPlan;
            if (!plan) return;
            const group = _cpEditingGroup || selectedGroupName;
            const students = (studentGroups[group] || []).map(s => s.name);
            if (!students.length) return;
            const lt = plan.layoutType || 'grid';
            const _doAssign = () => {
                const shuffled = [...students].sort(() => Math.random() - 0.5);
                if (lt === 'pods') {
                    const seatIds = [];
                    for (let pr = (plan.roomRows || 2) - 1; pr >= 0; pr--)
                        for (let pc = (plan.roomCols || 3) - 1; pc >= 0; pc--)
                            for (let r = (plan.podRows || 2) - 1; r >= 0; r--)
                                for (let c = (plan.podCols || 3) - 1; c >= 0; c--)
                                    seatIds.push(`${pr}:${pc}:${r}:${c}`);
                    plan.seats = shuffled.slice(0, seatIds.length).map((name, i) => ({ seatId: seatIds[i], studentName: name }));
                } else if (lt === 'ushape') {
                    const seatIds = [];
                    for (let r = (plan.uDepth || 3); r >= 1; r--) {
                        seatIds.push(`right:${r}`);
                        seatIds.push(`left:${r}`);
                    }
                    for (let c = (plan.uWidth || 6) - 1; c >= 0; c--) seatIds.push(`top:${c}`);
                    plan.seats = shuffled.slice(0, seatIds.length).map((name, i) => ({ seatId: seatIds[i], studentName: name }));
                } else {
                    const seats = [];
                    for (let c = plan.cols - 1; c >= 0; c--)
                        for (let r = plan.rows - 1; r >= 0; r--)
                            seats.push({ row: r, col: c });
                    plan.seats = shuffled.slice(0, seats.length).map((name, i) => ({ row: seats[i].row, col: seats[i].col, studentName: name }));
                }
                cpSavePlans();
                _cpBuildEditor(plan);
                mdbToast('Seats randomly assigned');
            };
            if ((plan.seats || []).length > 0) {
                showConfirm('Randomly assign all students? Current seating will be replaced.', _doAssign);
            } else {
                _doAssign();
            }
        }

        function _cpBuildCell(row, col, studentName, plan) {
            const cell = document.createElement('div');
            cell.className = 'cp-desk-cell';
            cell.dataset.row = row; cell.dataset.col = col;

            if (studentName) {
                _cpFillCell(cell, studentName, plan);
            } else {
                cell.innerHTML = '<span class="cp-desk-empty">+</span>';
            }

            // Drop target
            cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('cp-drag-over'); });
            cell.addEventListener('dragleave', () => cell.classList.remove('cp-drag-over'));
            cell.addEventListener('drop', e => {
                e.preventDefault();
                cell.classList.remove('cp-drag-over');
                const name = e.dataTransfer.getData('text/plain');
                if (!name) return;
                // Remove student from wherever they currently sit
                (plan.seats || []).filter(s => s.studentName === name).forEach(s => {
                    const oldCell = document.querySelector(`#cp-grid .cp-desk-cell[data-row="${s.row}"][data-col="${s.col}"]`);
                    if (oldCell) { oldCell.innerHTML = '<span class="cp-desk-empty">+</span>'; _cpRewireDrop(oldCell, s.row, s.col, plan); }
                });
                plan.seats = (plan.seats || []).filter(s => !(s.row === row && s.col === col) && s.studentName !== name);
                plan.seats.push({ row, col, studentName: name });
                _cpFillCell(cell, name, plan);
                _cpRefreshSidebar(plan);
            });

            return cell;
        }

        function _cpRewireDrop(cell, row, col, plan) {
            cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('cp-drag-over'); });
            cell.addEventListener('dragleave', () => cell.classList.remove('cp-drag-over'));
            cell.addEventListener('drop', e => {
                e.preventDefault(); cell.classList.remove('cp-drag-over');
                const name = e.dataTransfer.getData('text/plain');
                if (!name) return;
                (plan.seats || []).filter(s => s.studentName === name).forEach(s => {
                    const oldCell = document.querySelector(`#cp-grid .cp-desk-cell[data-row="${s.row}"][data-col="${s.col}"]`);
                    if (oldCell) { oldCell.innerHTML = '<span class="cp-desk-empty">+</span>'; _cpRewireDrop(oldCell, s.row, s.col, plan); }
                });
                plan.seats = (plan.seats || []).filter(s => !(s.row === row && s.col === col) && s.studentName !== name);
                plan.seats.push({ row, col, studentName: name });
                _cpFillCell(cell, name, plan);
                _cpRefreshSidebar(plan);
            });
        }

        function _cpBuildSeatIdCell(seatId, studentName, plan) {
            const cell = document.createElement('div');
            cell.className = 'cp-desk-cell';
            cell.dataset.seatId = seatId;
            if (studentName) {
                _cpFillCell(cell, studentName, plan);
            } else {
                cell.innerHTML = '<span class="cp-desk-empty">+</span>';
            }
            _cpRewireDropSeatId(cell, seatId, plan);
            return cell;
        }

        function _cpRewireDropSeatId(cell, seatId, plan) {
            cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('cp-drag-over'); });
            cell.addEventListener('dragleave', () => cell.classList.remove('cp-drag-over'));
            cell.addEventListener('drop', e => {
                e.preventDefault(); cell.classList.remove('cp-drag-over');
                const name = e.dataTransfer.getData('text/plain');
                if (!name) return;
                (plan.seats || []).filter(s => s.studentName === name).forEach(s => {
                    const oldCell = document.querySelector(`#cp-grid .cp-desk-cell[data-seat-id="${s.seatId}"]`);
                    if (oldCell) { oldCell.innerHTML = '<span class="cp-desk-empty">+</span>'; _cpRewireDropSeatId(oldCell, s.seatId, plan); }
                });
                plan.seats = (plan.seats || []).filter(s => s.seatId !== seatId && s.studentName !== name);
                plan.seats.push({ seatId, studentName: name });
                _cpFillCell(cell, name, plan);
                _cpRefreshSidebar(plan);
            });
        }

        function _cpFillCell(cell, studentName, plan) {
            // Team color tint
            const group = selectedGroupName;
            const student = (studentGroups[group] || []).find(s => s.name === studentName);
            let bgColor = '';
            if (student && student.teamId) {
                const tc = teamColors[student.teamId - 1];
                if (tc) bgColor = tc.hex;
            }

            cell.style.background = bgColor || '';
            cell.innerHTML = '';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'cp-desk-name';
            const isSen = !!(student && (student.sen || (student.uuid && studentRoster[student.uuid]?.sen)));
            const senStar = (senVisible && !PRESENTATION_MODE && isSen) ? ' *' : '';
            nameSpan.textContent = (student ? getDisplayName(student) : studentName) + senStar;

            const rmBtn = document.createElement('button');
            rmBtn.className = 'cp-desk-remove'; rmBtn.title = 'Remove'; rmBtn.innerHTML = '<img src="../assets/icons/close.svg" class="btn-icon" alt="" style="width:12px;height:12px;" />';
            rmBtn.addEventListener('click', e => {
                e.stopPropagation();
                const sid = cell.dataset.seatId;
                if (sid) {
                    plan.seats = (plan.seats || []).filter(s => s.seatId !== sid);
                    cell.style.background = '';
                    cell.innerHTML = '<span class="cp-desk-empty">+</span>';
                    _cpRewireDropSeatId(cell, sid, plan);
                } else {
                    plan.seats = (plan.seats || []).filter(s => !(s.row === parseInt(cell.dataset.row) && s.col === parseInt(cell.dataset.col)));
                    cell.style.background = '';
                    cell.innerHTML = '<span class="cp-desk-empty">+</span>';
                    _cpRewireDrop(cell, parseInt(cell.dataset.row), parseInt(cell.dataset.col), plan);
                }
                _cpRefreshSidebar(plan);
            });

            // Allow dragging occupied cell to another cell
            nameSpan.draggable = true;
            nameSpan.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', studentName); e.dataTransfer.effectAllowed = 'move'; });

            cell.appendChild(nameSpan);
            cell.appendChild(rmBtn);
        }

        function _cpRefreshSidebar(plan) {
            const group = _cpEditingGroup || selectedGroupName;
            const students = (studentGroups[group] || []).map(s => s.name);
            const placed = new Set((plan.seats || []).map(s => s.studentName));
            document.querySelectorAll('#cp-sidebar-chips .cp-student-chip').forEach(chip => {
                const name = chip.dataset.student;
                const isPlaced = placed.has(name);
                chip.classList.toggle('placed', isPlaced);
                chip.draggable = !isPlaced;
                if (!isPlaced && !chip._cpDragBound) {
                    chip._cpDragBound = true;
                    chip.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', name); e.dataTransfer.effectAllowed = 'move'; });
                }
            });
            // add any students missing from sidebar
            students.filter(n => !document.querySelector(`#cp-sidebar-chips [data-student="${CSS.escape(n)}"]`)).forEach(n => {
                const chip = document.createElement('div');
                chip.className = 'cp-student-chip' + (placed.has(n) ? ' placed' : '');
                chip.textContent = n; chip.dataset.student = n; chip.draggable = !placed.has(n);
                chip.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', n); e.dataTransfer.effectAllowed = 'move'; });
                document.getElementById('cp-sidebar-chips').appendChild(chip);
            });
        }

        function cpSaveEditor() {
            if (!_cpEditingPlan) return;
            // Capture potentially edited name
            const titleEl = document.getElementById('cp-editor-title');
            if (titleEl && titleEl.textContent.trim()) _cpEditingPlan.name = titleEl.textContent.trim();
            cpSavePlans();
            document.getElementById('cp-editor-modal').style.display = 'none';
            cpRenderManagerList();
            mdbToast('Plan saved.');
        }

        function cpCloseEditor(askIfDirty) {
            document.getElementById('cp-editor-modal').style.display = 'none';
            _cpEditingPlan = null;
        }

        // ── Print ─────────────────────────────────────────────────────────────────────

        function cpPrintPlan() {
            if (!_cpEditingPlan) return;
            _cpDoPrint(_cpEditingPlan, selectedGroupName);
        }

        function _cpDoPrint(plan, groupName) {
            const html = _cpBuildPrintHtml(plan, groupName);
            if (window.Desktop && typeof window.Desktop.printHtml === 'function') {
                window.Desktop.printHtml(html)
                    .then(res => {
                        if (!res || !res.ok) {
                            _cpBrowserPrint(html);
                        }
                    })
                    .catch(() => { _cpBrowserPrint(html); });
            } else {
                _cpBrowserPrint(html);
            }
        }

        function _cpBrowserPrint(html) {
            const frame = document.createElement('iframe');
            frame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;';
            document.body.appendChild(frame);
            frame.contentDocument.open();
            frame.contentDocument.write(html);
            frame.contentDocument.close();
            setTimeout(() => { frame.contentWindow.print(); setTimeout(() => frame.remove(), 1500); }, 300);
        }

        function _cpBuildPrintHtml(plan, groupName) {
            const todayStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            const schedStr = cpScheduleSummary(plan);
            const lt = plan.layoutType || 'grid';
            const seats = plan.seats || [];

            function teamBg(name) {
                if (!name || !studentGroups[groupName]) return '#fff';
                const st = studentGroups[groupName].find(s => s.name === name);
                return (st && st.teamId && teamColors[st.teamId - 1]) ? teamColors[st.teamId - 1].hex : '#fff';
            }
            function tdStyle(name, w = '2cm', h = '1.5cm') {
                const bg = teamBg(name);
                return `width:${w};height:${h};border:1px solid #bbb;text-align:center;vertical-align:middle;font-size:8pt;font-weight:${name ? '700' : '400'};color:${name ? '#111' : '#ddd'};background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;`;
            }

            let body = '';
            if (lt === 'pods') {
                let outerRows = '';
                for (let pr = 0; pr < (plan.roomRows || 2); pr++) {
                    let outerCells = '';
                    for (let pc = 0; pc < (plan.roomCols || 3); pc++) {
                        let podRows = '';
                        for (let r = 0; r < (plan.podRows || 2); r++) {
                            let podCells = '';
                            for (let c = 0; c < (plan.podCols || 3); c++) {
                                const sid = `${pr}:${pc}:${r}:${c}`;
                                const seat = seats.find(s => s.seatId === sid);
                                const name = seat ? seat.studentName : '';
                                podCells += `<td style="${tdStyle(name, '1.7cm', '1.3cm')}">${name || '·'}</td>`;
                            }
                            podRows += `<tr>${podCells}</tr>`;
                        }
                        outerCells += `<td style="padding:6px;vertical-align:top;"><table style="border-collapse:collapse;border:2px solid #999;">${podRows}</table></td>`;
                    }
                    outerRows += `<tr>${outerCells}</tr>`;
                }
                body = `<table style="border-collapse:separate;border-spacing:4px 4px;">${outerRows}</table>`;
            } else if (lt === 'ushape') {
                const w = plan.uWidth || 6; const d = plan.uDepth || 3;
                let tableRows = '';
                let topCells = '';
                for (let c = 0; c < w; c++) {
                    const seat = seats.find(s => s.seatId === `top:${c}`);
                    const name = seat ? seat.studentName : '';
                    topCells += `<td style="${tdStyle(name, '1.8cm', '1.4cm')}">${name || '·'}</td>`;
                }
                tableRows += `<tr>${topCells}</tr>`;
                for (let r = 1; r <= d; r++) {
                    let cells = '';
                    for (let c = 0; c < w; c++) {
                        if (c === 0) {
                            const seat = seats.find(s => s.seatId === `left:${r}`);
                            const name = seat ? seat.studentName : '';
                            cells += `<td style="${tdStyle(name, '1.8cm', '1.4cm')}">${name || '·'}</td>`;
                        } else if (c === w - 1) {
                            const seat = seats.find(s => s.seatId === `right:${r}`);
                            const name = seat ? seat.studentName : '';
                            cells += `<td style="${tdStyle(name, '1.8cm', '1.4cm')}">${name || '·'}</td>`;
                        } else {
                            cells += `<td style="width:1.8cm;height:1.4cm;border:none;"></td>`;
                        }
                    }
                    tableRows += `<tr>${cells}</tr>`;
                }
                body = `<table style="border-collapse:collapse;">${tableRows}</table>`;
            } else {
                const rows = plan.rows || 4; const cols = plan.cols || 5;
                let tableRows = '';
                for (let r = 0; r < rows; r++) {
                    let cells = '';
                    for (let c = 0; c < cols; c++) {
                        const seat = seats.find(s => s.row === r && s.col === c);
                        const name = seat ? seat.studentName : '';
                        cells += `<td style="${tdStyle(name)}">${name || '·'}</td>`;
                    }
                    tableRows += `<tr>${cells}</tr>`;
                }
                body = `<table style="border-collapse:collapse;">${tableRows}</table>`;
            }

            const tName = (typeof window.getAppTeacherName === 'function') ? window.getAppTeacherName() : '';
            const grpLabel = (rawMeta[groupName] && rawMeta[groupName].name) || groupName || '';
            const fBits = [grpLabel, tName].filter(Boolean).join('  ·  ');
            const fText = (fBits ? fBits + '  —  ' : '') + `Printed ${todayStr}`;

            return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${plan.name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 1cm; color: #111; }
  h1 { font-size: 13pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; }
  .meta { font-size: 8.5pt; color: #555; margin-bottom: 14px; }
  table { border-collapse: collapse; }
  td { padding: 2px; }
  footer { margin-top: 14px; font-size: 7.5pt; color: #aaa; border-top: 1px solid #eee; padding-top: 4px; }
  @page { size: A4; margin: 1cm; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>${plan.name}</h1>
<div class="meta">${[plan.roomNumber ? '' + plan.roomNumber : '', schedStr].filter(Boolean).join('  ·  ')}</div>
${body}
<footer>${fText}</footer>
</body></html>`;
        }

        // ── Roster Plan View toggle ────────────────────────────────────────────────────

        function toggleRosterPlanView(forceVal, persist = true) {
            if (typeof forceVal === 'boolean') {
                rosterPlanView = forceVal;
            } else {
                rosterPlanView = !rosterPlanView;
            }
            const btn = document.getElementById('roster-plan-view-btn');
            if (btn) {
                btn.classList.toggle('active', rosterPlanView);
                btn.classList.toggle('is-off', !rosterPlanView);
            }
            const toolbar = document.getElementById('roster-plan-toolbar');
            if (toolbar) toolbar.style.display = rosterPlanView ? 'flex' : 'none';
            if (!rosterPlanView) {
                const listEl = document.getElementById('roster-list');
                if (listEl) {
                    listEl.classList.remove('roster-plan-view');
                    listEl.style.removeProperty('--cp-cols');
                    listEl.style.height = '';
                    listEl.style.gridAutoRows = '';
                }
            }
            renderRoster();
            if (persist) {
                try { localStorage.setItem('cms-roster-plan-view', rosterPlanView ? '1' : '0'); } catch (_) { }
                if (!PRESENTATION_MODE) _broadcastPresentationState();
                persistSettingsToUserFile().catch(err => console.warn('toggleRosterPlanView: could not save config:', err));
            }
        }

        function renderRosterPlanView() {
            const listEl = document.getElementById('roster-list');
            listEl.innerHTML = '';
            closeRosterContextMenu();
            document.body.querySelectorAll(':scope > .badge-popup').forEach(el => el.remove());
            _openBadgePopupKey = null;
            listEl.classList.add('roster-plan-view');
            listEl.classList.remove('teams-active', 'roster-plan-pods');
            listEl.style.removeProperty('grid-template-columns');

            if (!selectedGroupName || !studentGroups[selectedGroupName]) {
                listEl.style.removeProperty('--cp-cols');
                listEl.innerHTML = '<li style="grid-column:1/-1;color:#999;padding:20px;text-align:center;">Select a group first.</li>';
                return;
            }

            const plan = cpGetActivePlan(selectedGroupName);
            if (!plan) {
                listEl.style.removeProperty('--cp-cols');
                listEl.innerHTML = '<li style="grid-column:1/-1;padding:20px;text-align:center;color:#aaa;">No active class plan for this group. <button class="btn-mini" style="margin-left:6px;" onclick="Desktop.openTool(\'class-plan.html\', selectedGroupName ? { query: { classId: selectedGroupName } } : undefined)">Set up a plan →</button></li>';
                updatePresentCount();
                return;
            }

            const lt = plan.layoutType || 'grid';
            const allStudents = studentGroups[selectedGroupName];
            const _halfRaw = selectedHalfGroup
                ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || null)
                : null;
            const halfNames = _halfRaw ? new Set(_halfGroupFilter(allStudents, _halfRaw).map(s => s.name)) : null;
            const _resetBtn = document.getElementById('roster-plan-reset-btn');
            _cpUpdateSaveBtn();

            if (lt === 'pods') {
                const roomRows = plan.roomRows || 2, roomCols = plan.roomCols || 3;
                const podRows = plan.podRows || 2, podCols = plan.podCols || 3;
                // Custom column template: pod columns interleaved with 12px gap columns
                const colParts = [];
                for (let rc = 0; rc < roomCols; rc++) {
                    if (rc > 0) colParts.push('12px');
                    for (let pc = 0; pc < podCols; pc++) colParts.push('minmax(0, 1fr)');
                }
                listEl.style.gridTemplateColumns = colParts.join(' ');
                listEl.classList.add('roster-plan-pods');
                if (_resetBtn) _resetBtn.style.display = plan._teamViewSeats ? '' : 'none';
                const seats = plan._teamViewSeats || plan.seats || [];
                const totalTracks = roomCols * podCols + (roomCols - 1);
                for (let roomRow = 0; roomRow < roomRows; roomRow++) {
                    if (roomRow > 0) {
                        // Spacer row between room rows
                        for (let i = 0; i < totalTracks; i++) {
                            const sp = document.createElement('li');
                            sp.style.cssText = 'height:12px;border:none;background:transparent;pointer-events:none;padding:0;min-height:0;';
                            listEl.appendChild(sp);
                        }
                    }
                    for (let podRow = 0; podRow < podRows; podRow++) {
                        for (let roomCol = 0; roomCol < roomCols; roomCol++) {
                            if (roomCol > 0) {
                                // Spacer cell for the gap column
                                const sp = document.createElement('li');
                                sp.style.cssText = 'border:none;background:transparent;pointer-events:none;padding:0;';
                                listEl.appendChild(sp);
                            }
                            for (let podCol = 0; podCol < podCols; podCol++) {
                                const seatId = `${roomRow}:${roomCol}:${podRow}:${podCol}`;
                                const seat = seats.find(s => s.seatId === seatId);
                                let student = seat && seat.studentName ? allStudents.find(s => s.name === seat.studentName) : null;
                                if (halfNames && student && !halfNames.has(student.name)) student = null;
                                const li = _appendRpcSeatIdCell(listEl, seatId, student, plan);
                                if (podRow === 0) li.dataset.podTop = '';
                                if (podRow === podRows - 1) li.dataset.podBottom = '';
                                if (podCol === 0) li.dataset.podLeft = '';
                                if (podCol === podCols - 1) li.dataset.podRight = '';
                            }
                        }
                    }
                }
            } else if (lt === 'ushape') {
                const w = plan.uWidth || 6, d = plan.uDepth || 3;
                listEl.style.setProperty('--cp-cols', w);
                if (_resetBtn) _resetBtn.style.display = 'none';
                const seats = plan.seats || [];
                for (let c = 0; c < w; c++) {
                    const seatId = `top:${c}`;
                    const seat = seats.find(s => s.seatId === seatId);
                    let student = seat && seat.studentName ? allStudents.find(s => s.name === seat.studentName) : null;
                    if (halfNames && student && !halfNames.has(student.name)) student = null;
                    _appendRpcSeatIdCell(listEl, seatId, student, plan);
                }
                for (let r = 1; r <= d; r++) {
                    for (let c = 0; c < w; c++) {
                        if (c === 0) {
                            const seatId = `left:${r}`;
                            const seat = seats.find(s => s.seatId === seatId);
                            let student = seat && seat.studentName ? allStudents.find(s => s.name === seat.studentName) : null;
                            if (halfNames && student && !halfNames.has(student.name)) student = null;
                            _appendRpcSeatIdCell(listEl, seatId, student, plan);
                        } else if (c === w - 1) {
                            const seatId = `right:${r}`;
                            const seat = seats.find(s => s.seatId === seatId);
                            let student = seat && seat.studentName ? allStudents.find(s => s.name === seat.studentName) : null;
                            if (halfNames && student && !halfNames.has(student.name)) student = null;
                            _appendRpcSeatIdCell(listEl, seatId, student, plan);
                        } else {
                            const spacer = document.createElement('li');
                            spacer.className = 'roster-plan-cell-empty';
                            spacer.style.cssText = 'border:none;background:transparent;pointer-events:none;';
                            listEl.appendChild(spacer);
                        }
                    }
                }
            } else {
                // Grid layout
                listEl.style.setProperty('--cp-cols', plan.cols);
                if (_resetBtn) _resetBtn.style.display = plan._teamViewSeats ? '' : 'none';

                const _viewSeats = plan._teamViewSeats || plan.seats || [];
                const _viewRows = plan._teamViewRows || plan.rows;

                // In presentation mode, detect and skip entirely-empty columns
                const _hiddenCols = new Set();
                if (PRESENTATION_MODE) {
                    for (let c = 0; c < plan.cols; c++) {
                        let colEmpty = true;
                        for (let r = 0; r < _viewRows; r++) {
                            const seat = _viewSeats.find(s => s.row === r && s.col === c);
                            if (seat && seat.studentName) {
                                const st = allStudents.find(s => s.name === seat.studentName);
                                if (!halfNames || (st && halfNames.has(st.name))) { colEmpty = false; break; }
                            }
                        }
                        if (colEmpty) _hiddenCols.add(c);
                    }
                    if (_hiddenCols.size > 0) {
                        listEl.style.setProperty('--cp-cols', plan.cols - _hiddenCols.size);
                    }
                }

                for (let r = 0; r < _viewRows; r++) {
                    for (let c = 0; c < plan.cols; c++) {
                        if (_hiddenCols.has(c)) continue;
                        const seat = _viewSeats.find(s => s.row === r && s.col === c);
                        let student = null;
                        if (seat && seat.studentName) {
                            student = allStudents.find(s => s.name === seat.studentName);
                            if (halfNames && student && !halfNames.has(student.name)) student = null;
                        }

                        const li = document.createElement('li');

                        if (!student) {
                            li.className = 'roster-plan-cell roster-plan-cell-empty';
                            li.innerHTML = '<span class="rpc-empty">·</span>';
                            li.setAttribute('data-row', r);
                            li.setAttribute('data-col', c);
                            li.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; li.classList.add('rpc-dragover'); });
                            li.addEventListener('dragleave', () => li.classList.remove('rpc-dragover'));
                            li.addEventListener('drop', e => { e.preventDefault(); li.classList.remove('rpc-dragover'); try { const d = JSON.parse(e.dataTransfer.getData('text/plain')); cpPlanSwapSeats(d.row, d.col, r, c); } catch (_) { } });
                            listEl.appendChild(li);
                            continue;
                        }

                        const isBlinking = typeof _activeBlinkStudentId !== 'undefined' && _activeBlinkStudentId === student.id && (Date.now() - _activeBlinkTime < 4000);
                        const hasFlags = !!(student.isFlagged || (typeof getActiveFlags === 'function' && getActiveFlags(student).length > 0));
                        li.className = 'roster-plan-cell' +
                            (student.isPicked ? ' picked' : '') +
                            (student.isAbsent ? ' absent' : '') +
                            (hasFlags ? ' flagged' : '') +
                            (isBlinking ? ' picked-blink' : '');
                        li.setAttribute('data-student-id', student.id);
                        li.setAttribute('data-row', r);
                        li.setAttribute('data-col', c);
                        li.draggable = true;
                        li.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', JSON.stringify({ row: r, col: c })); e.dataTransfer.effectAllowed = 'move'; li.classList.add('rpc-dragging'); listEl.classList.add('is-dragging'); });
                        li.addEventListener('dragend', () => { li.classList.remove('rpc-dragging'); listEl.classList.remove('is-dragging'); });
                        li.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; li.classList.add('rpc-dragover'); });
                        li.addEventListener('dragleave', e => { if (!li.contains(e.relatedTarget)) li.classList.remove('rpc-dragover'); });
                        li.addEventListener('drop', e => { e.preventDefault(); li.classList.remove('rpc-dragover'); try { const d = JSON.parse(e.dataTransfer.getData('text/plain')); cpPlanSwapSeats(d.row, d.col, r, c); } catch (_) { } });
                        li.addEventListener('contextmenu', e => { openRosterContextMenu(e, student.id); });

                        const teamColor = student.teamId ? teamColors[(student.teamId - 1) % teamColors.length] : null;
                        if (teamColor && !student.isAbsent) li.style.backgroundColor = teamColor.hex;

                        const plusDisplay = student.pluses > 0 ? `+${student.pluses}` : '';
                        const minusDisplay = student.minuses > 0 ? `−${student.minuses}` : '';
                        const teamPlusDisplay = student.teamPluses > 0 ? `T+${student.teamPluses}` : '';
                        const teamMinusDisplay = student.teamMinuses > 0 ? `T−${student.teamMinuses}` : '';

                        const badgeMap = {};
                        (student.badges || []).forEach(b => {
                            if (!badgeMap[b.icon]) badgeMap[b.icon] = { icon: b.icon, label: b.label, tone: b.tone || 'positive', count: 0 };
                            badgeMap[b.icon].count++;
                        });
                        const badgeSpans = Object.values(badgeMap).map(b => {
                            const sup = b.count > 1 ? `<sup>${b.count}</sup>` : '';
                            const toneClass = b.tone === 'negative' ? ' badge-chip-negative' : ' badge-chip-positive';
                            return `<span class="earned-badge-chip${toneClass}" onclick="removeBadge(${student.id},'${b.icon}')" title="${b.label}: click to remove">${b.icon}${sup}</span>`;
                        }).join('');

                        const hasNotes = student.comments && student.comments.length > 0;
                        const abbrev = getDisplayName(student);
                        const isSen = !!(student.sen || (student.uuid && studentRoster[student.uuid]?.sen));
                        const senStarHtml = (senVisible && !PRESENTATION_MODE && isSen) ? '<span class="sen-indicator" title="SEN" style="color:#e11d48;font-weight:bold;margin-left:2px;">*</span>' : '';
                        const flagsHtml = renderStudentFlagsHtml(student);

                        li.innerHTML = `
                    <span class="student-name rpc-name" onclick="if (event.altKey || event.shiftKey) { event.stopPropagation(); highlightStudentManually(${student.id}); } else { toggleStrike(${student.id}); }" title="${student.name}">
                        ${abbrev}${senStarHtml}
                        ${student.role && rolesVisible ? `<i class="student-role-tag" onclick="event.stopPropagation(); changeStudentRole(${student.id})">${student.role}</i>` : ''}
                    </span>
                    ${flagsHtml ? `<div class="rpc-flags">${flagsHtml}</div>` : ''}
                    <div class="badges rpc-badges" id="badges-row-${student.id}" style="${badgesVisible ? '' : 'display:none'}">
                        <span class="student-badges-earned">${badgeSpans}</span>
                        ${plusDisplay ? `<span class="p-plus" onclick="mod(${student.id}, 'p', -1)">${plusDisplay}</span>` : ''}
                        ${minusDisplay ? `<span class="p-minus" onclick="mod(${student.id}, 'm', -1)">${minusDisplay}</span>` : ''}
                        ${teamPlusDisplay ? `<span class="p-team-plus" onclick="modTeam(${student.teamId || 'null'}, 'p', -1, ${student.id})" title="Click to remove one team plus" style="cursor:pointer;">${teamPlusDisplay}</span>` : ''}
                        ${teamMinusDisplay ? `<span class="p-team-minus" onclick="modTeam(${student.teamId || 'null'}, 'm', -1, ${student.id})" title="Click to remove one team minus" style="cursor:pointer;">${teamMinusDisplay}</span>` : ''}
                    </div>
                    <div class="rpc-controls">
                        <button class="btn-mini btn-badge-open" onclick="toggleBadgePopup(event, ${student.id}, 'individual')" title="Award a badge" ${student.isAbsent ? 'style="display:none"' : ''}>…</button>
                        <div class="badge-popup" id="${_badgePopupElementId(student.id, 'individual')}">${buildBadgePopupButtons(student.id, 'individual')}</div>
                        ${!student.isAbsent ? buildBadgeInlineButtons(student.id, 'individual', 'positive') : ''}
                        <button class="btn-mini btn-plus" onclick="mod(${student.id}, 'p', 1)" ${student.isAbsent ? 'style="display:none"' : ''}>+</button>
                        <button class="btn-mini btn-minus" onclick="mod(${student.id}, 'm', 1)" ${student.isAbsent ? 'style="display:none"' : ''}>-</button>
                        ${!student.isAbsent ? buildBadgeInlineButtons(student.id, 'individual', 'negative') : ''}
                        <span class="comment-dot ${hasNotes ? 'has-comment' : ''}" onclick="openCommentPopup(event, ${student.id})" title="${hasNotes ? 'Notes — click to edit' : 'No notes — click to add'}">●</span>
                    </div>
                `;

                        listEl.appendChild(li);
                    }
                }
            }

            const teacherDesk = document.createElement('li');
            teacherDesk.className = 'roster-plan-teacher-desk';
            teacherDesk.innerHTML = `<span class="rptd-label" data-i18n="roster_plan_teacher">${typeof t === 'function' ? t('roster_plan_teacher') : 'Teacher'}</span>`;
            listEl.appendChild(teacherDesk);

            updatePresentCount();
            if (PRESENTATION_MODE) {
                applyPresNameSize();
                requestAnimationFrame(_presAdjustPlanViewHeight);
            } else {
                applyNameSize();
            }
        }

        function _appendRpcSeatIdCell(listEl, seatId, student, plan) {
            const li = document.createElement('li');
            if (!student) {
                li.className = 'roster-plan-cell roster-plan-cell-empty';
                li.innerHTML = '<span class="rpc-empty">·</span>';
                li.setAttribute('data-seat-id', seatId);
                li.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; li.classList.add('rpc-dragover'); });
                li.addEventListener('dragleave', () => li.classList.remove('rpc-dragover'));
                li.addEventListener('drop', e => { e.preventDefault(); li.classList.remove('rpc-dragover'); try { const d = JSON.parse(e.dataTransfer.getData('text/plain')); cpPlanSwapSeatsBySeatId(d.seatId, seatId); } catch (_) { } });
                listEl.appendChild(li);
                return li;
            }
            const isBlinking = typeof _activeBlinkStudentId !== 'undefined' && _activeBlinkStudentId === student.id && (Date.now() - _activeBlinkTime < 4000);
            const hasFlags = !!(student.isFlagged || (typeof getActiveFlags === 'function' && getActiveFlags(student).length > 0));
            li.className = 'roster-plan-cell' +
                (student.isPicked ? ' picked' : '') +
                (student.isAbsent ? ' absent' : '') +
                (hasFlags ? ' flagged' : '') +
                (isBlinking ? ' picked-blink' : '');
            li.setAttribute('data-student-id', student.id);
            li.setAttribute('data-seat-id', seatId);
            li.draggable = true;
            li.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', JSON.stringify({ seatId })); e.dataTransfer.effectAllowed = 'move'; li.classList.add('rpc-dragging'); listEl.classList.add('is-dragging'); });
            li.addEventListener('dragend', () => { li.classList.remove('rpc-dragging'); listEl.classList.remove('is-dragging'); });
            li.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; li.classList.add('rpc-dragover'); });
            li.addEventListener('dragleave', e => { if (!li.contains(e.relatedTarget)) li.classList.remove('rpc-dragover'); });
            li.addEventListener('drop', e => { e.preventDefault(); li.classList.remove('rpc-dragover'); try { const d = JSON.parse(e.dataTransfer.getData('text/plain')); cpPlanSwapSeatsBySeatId(d.seatId, seatId); } catch (_) { } });
            li.addEventListener('contextmenu', e => { openRosterContextMenu(e, student.id); });
            const teamColor = student.teamId ? teamColors[(student.teamId - 1) % teamColors.length] : null;
            if (teamColor && !student.isAbsent) li.style.backgroundColor = teamColor.hex;
            const plusDisplay = student.pluses > 0 ? `+${student.pluses}` : '';
            const minusDisplay = student.minuses > 0 ? `−${student.minuses}` : '';
            const teamPlusDisplay = student.teamPluses > 0 ? `T+${student.teamPluses}` : '';
            const teamMinusDisplay = student.teamMinuses > 0 ? `T−${student.teamMinuses}` : '';
            const badgeMap = {};
            (student.badges || []).forEach(b => {
                if (!badgeMap[b.icon]) badgeMap[b.icon] = { icon: b.icon, label: b.label, tone: b.tone || 'positive', count: 0 };
                badgeMap[b.icon].count++;
            });
            const badgeSpans = Object.values(badgeMap).map(b => {
                const sup = b.count > 1 ? `<sup>${b.count}</sup>` : '';
                const tc = b.tone === 'negative' ? ' badge-chip-negative' : ' badge-chip-positive';
                return `<span class="earned-badge-chip${tc}" onclick="removeBadge(${student.id},'${b.icon}')" title="${b.label}: click to remove">${b.icon}${sup}</span>`;
            }).join('');
            const teamBadgeMap = {};
            (student.badges || []).forEach(b => {
                if (_badgeScopeForBadge(b) === 'individual') return;
                if (!teamBadgeMap[b.icon]) teamBadgeMap[b.icon] = { icon: b.icon, label: b.label, tone: b.tone || 'positive', count: 0 };
                teamBadgeMap[b.icon].count++;
            });
            const teamBadgeSpans = Object.values(teamBadgeMap).map(b => {
                const sup = b.count > 1 ? `<sup>${b.count}</sup>` : '';
                const tc = b.tone === 'negative' ? ' badge-chip-negative' : ' badge-chip-positive';
                return `<span class="earned-badge-chip${tc}" onclick="removeBadge(${student.id},'${b.icon}')" title="${b.label}: click to remove">${b.icon}${sup}</span>`;
            }).join('');
            const hasNotes = student.comments && student.comments.length > 0;
            const abbrev = getDisplayName(student);
            const isSen = !!(student.sen || (student.uuid && studentRoster[student.uuid]?.sen));
            const senStarHtml = (senVisible && !PRESENTATION_MODE && isSen) ? '<span class="sen-indicator" title="SEN" style="color:#e11d48;font-weight:bold;margin-left:2px;">*</span>' : '';
            const flagsHtml = renderStudentFlagsHtml(student);
            li.innerHTML = `
        <span class="student-name rpc-name" onclick="if (event.altKey || event.shiftKey) { event.stopPropagation(); highlightStudentManually(${student.id}); } else { toggleStrike(${student.id}); }" title="${student.name}">
            ${abbrev}${senStarHtml}
            ${student.role && rolesVisible ? `<i class="student-role-tag" onclick="event.stopPropagation(); changeStudentRole(${student.id})">${student.role}</i>` : ''}
        </span>
        ${flagsHtml ? `<div class="rpc-flags">${flagsHtml}</div>` : ''}
        <div class="badges rpc-badges" id="badges-row-${student.id}" style="${badgesVisible ? '' : 'display:none'}">
            <span class="student-badges-earned">${badgeSpans}</span>
            ${plusDisplay ? `<span class="p-plus" onclick="mod(${student.id}, 'p', -1)">${plusDisplay}</span>` : ''}
            ${minusDisplay ? `<span class="p-minus" onclick="mod(${student.id}, 'm', -1)">${minusDisplay}</span>` : ''}
            ${teamPlusDisplay ? `<span class="p-team-plus" onclick="modTeam(${student.teamId || 'null'}, 'p', -1, ${student.id})" title="Click to remove one team plus" style="cursor:pointer;">${teamPlusDisplay}</span>` : ''}
            ${teamMinusDisplay ? `<span class="p-team-minus" onclick="modTeam(${student.teamId || 'null'}, 'm', -1, ${student.id})" title="Click to remove one team minus" style="cursor:pointer;">${teamMinusDisplay}</span>` : ''}
            ${teamBadgeSpans ? `<span class="team-badges-earned">${teamBadgeSpans}</span>` : ''}
        </div>
        <div class="rpc-controls">
            <button class="btn-mini btn-badge-open" onclick="toggleBadgePopup(event, ${student.id}, 'individual')" title="Award a badge" ${student.isAbsent ? 'style="display:none"' : ''}>…</button>
            <div class="badge-popup" id="${_badgePopupElementId(student.id, 'individual')}">${buildBadgePopupButtons(student.id, 'individual')}</div>
            ${!student.isAbsent ? buildBadgeInlineButtons(student.id, 'individual', 'positive') : ''}
            <button class="btn-mini btn-plus" onclick="mod(${student.id}, 'p', 1)" ${student.isAbsent ? 'style="display:none"' : ''}>+</button>
            <button class="btn-mini btn-minus" onclick="mod(${student.id}, 'm', 1)" ${student.isAbsent ? 'style="display:none"' : ''}>-</button>
            ${!student.isAbsent ? buildBadgeInlineButtons(student.id, 'individual', 'negative') : ''}
            <span class="comment-dot ${hasNotes ? 'has-comment' : ''}" onclick="openCommentPopup(event, ${student.id})" title="${hasNotes ? 'Notes — click to edit' : 'No notes — click to add'}">●</span>
        </div>`;
            listEl.appendChild(li);
            return li;
        }

        function cpPlanSwapSeats(fromRow, fromCol, toRow, toCol) {
            if (fromRow === toRow && fromCol === toCol) return;
            const plan = cpGetActivePlan(selectedGroupName);
            if (!plan) return;
            const isTeamView = !!plan._teamViewSeats;
            const seats = isTeamView ? plan._teamViewSeats : (plan.seats || []);
            const fromSeat = seats.find(s => s.row === fromRow && s.col === fromCol);
            if (!fromSeat) return;
            let toSeat = seats.find(s => s.row === toRow && s.col === toCol);
            const fromName = fromSeat.studentName;
            const toName = toSeat ? toSeat.studentName : null;
            if (toName) fromSeat.studentName = toName;
            else delete fromSeat.studentName;
            if (toSeat) toSeat.studentName = fromName;
            else seats.push({ row: toRow, col: toCol, studentName: fromName });
            if (!isTeamView) { plan._seatsDirty = true; _cpUpdateSaveBtn(); }
            renderRosterPlanView();
            if (!PRESENTATION_MODE) _broadcastPresentationState();
        }

        function cpPlanSwapSeatsBySeatId(fromSeatId, toSeatId) {
            if (!fromSeatId || fromSeatId === toSeatId) return;
            const plan = cpGetActivePlan(selectedGroupName);
            if (!plan) return;
            const isTeamView = !!plan._teamViewSeats;
            const seats = isTeamView ? plan._teamViewSeats : (plan.seats || []);
            const fromSeat = seats.find(s => s.seatId === fromSeatId);
            if (!fromSeat) return;
            let toSeat = seats.find(s => s.seatId === toSeatId);
            const fromName = fromSeat.studentName;
            const toName = toSeat ? toSeat.studentName : null;
            if (toName) fromSeat.studentName = toName; else delete fromSeat.studentName;
            if (toSeat) toSeat.studentName = fromName; else seats.push({ seatId: toSeatId, studentName: fromName });
            if (!isTeamView) { plan._seatsDirty = true; _cpUpdateSaveBtn(); }
            renderRosterPlanView();
            if (!PRESENTATION_MODE) _broadcastPresentationState();
        }

        function _cpUpdateSaveBtn() {
            const btn = document.getElementById('roster-plan-save-btn');
            if (!btn) return;
            const plan = cpGetActivePlan(selectedGroupName);
            btn.style.display = (plan && plan._seatsDirty) ? '' : 'none';
        }

        function cpSavePlanSeats() {
            const plan = cpGetActivePlan(selectedGroupName);
            if (!plan) return;
            delete plan._seatsDirty;
            cpSavePlans();
            _cpUpdateSaveBtn();
            mdbToast('Seats saved');
        }

        function cpAutoGroupByTeams() {
            if (!selectedGroupName || !studentGroups[selectedGroupName]) return;
            const plan = cpGetActivePlan(selectedGroupName);
            if (!plan) return;

            const _doGroup = () => {
                const allStudents = studentGroups[selectedGroupName];
                const halfNames = selectedHalfGroup
                    ? ((rawMeta[selectedGroupName] && rawMeta[selectedGroupName].halfGroups && rawMeta[selectedGroupName].halfGroups[selectedHalfGroup]) || null)
                    : null;
                const students = halfNames ? allStudents.filter(s => halfNames.includes(s.name)) : allStudents;

                // Present students first, sorted by team then name; absent go after
                const sorted = [...students].sort((a, b) => {
                    if (!!a.isAbsent !== !!b.isAbsent) return a.isAbsent ? 1 : -1;
                    const ta = a.teamId || 99999;
                    const tb = b.teamId || 99999;
                    if (ta !== tb) return ta - tb;
                    return compareStudentsByName(a, b);
                });

                // Build consecutive team runs (present first, then absent, each team as a group)
                const teamRuns = [];
                let cur = null;
                for (const s of sorted) {
                    const key = s.isAbsent ? '__absent__' : (s.teamId ? String(s.teamId) : '__none__');
                    if (!cur || cur.key !== key) { cur = { key, members: [] }; teamRuns.push(cur); }
                    cur.members.push(s);
                }

                // Pods layout: assign each team to its own pod(s), filling bottom-right first
                const lt = plan.layoutType || 'grid';
                if (lt === 'pods') {
                    const roomRows = plan.roomRows || 2, roomCols = plan.roomCols || 3;
                    const podRows = plan.podRows || 2, podCols = plan.podCols || 3;
                    const podCapacity = podRows * podCols;
                    // Pod order: bottom-right first, moving left then up
                    const podOrder = [];
                    for (let pr = roomRows - 1; pr >= 0; pr--)
                        for (let pc = roomCols - 1; pc >= 0; pc--)
                            podOrder.push([pr, pc]);
                    const newSeats = [];
                    let podIdx = 0, seatInPod = 0;
                    for (const run of teamRuns) {
                        // Each team starts in a fresh pod
                        if (seatInPod > 0) { podIdx++; seatInPod = 0; }
                        for (const student of run.members) {
                            if (podIdx >= podOrder.length) break;
                            if (seatInPod >= podCapacity) { podIdx++; seatInPod = 0; }
                            if (podIdx >= podOrder.length) break;
                            const [pr, pc] = podOrder[podIdx];
                            const r = Math.floor(seatInPod / podCols);
                            const c = seatInPod % podCols;
                            newSeats.push({ seatId: `${pr}:${pc}:${r}:${c}`, studentName: student.name });
                            seatInPod++;
                        }
                    }
                    plan._teamViewSeats = newSeats;
                    plan._teamViewRows = null;
                    renderRoster();
                    mdbToast('Seats grouped by team');
                    return;
                }

                // Place each team as a compact rectangular block, tiling left-to-right then top-to-bottom.
                // Coordinates are mirrored afterwards so blocks start from bottom-right and move up and left.
                const rawSeats = [];
                let curRow = 0, curCol = 0, bandHeight = 0, maxRowUsed = 0;

                for (const run of teamRuns) {
                    const n = run.members.length;
                    // Choose block width: as close to sqrt(n) as possible, capped at plan cols
                    const blockCols = Math.min(plan.cols, Math.ceil(Math.sqrt(n)));
                    const blockRows = Math.ceil(n / blockCols);

                    // If block doesn't fit in the remaining horizontal space, start a new band
                    if (curCol + blockCols > plan.cols) {
                        curRow += bandHeight;
                        curCol = 0;
                        bandHeight = 0;
                    }

                    // Fill the block left-to-right, top-to-bottom
                    let idx = 0;
                    for (let r = 0; r < blockRows && idx < n; r++) {
                        for (let c = 0; c < blockCols && idx < n; c++) {
                            rawSeats.push({ row: curRow + r, col: curCol + c, studentName: run.members[idx].name });
                            idx++;
                        }
                    }

                    maxRowUsed = Math.max(maxRowUsed, curRow + blockRows - 1);
                    bandHeight = Math.max(bandHeight, blockRows);
                    curCol += blockCols;
                }

                // Auto-expand view rows if students needed more rows than the plan currently has
                const viewRows = Math.max(plan.rows, maxRowUsed + 1);

                // Mirror all coordinates so the first team ends up at the bottom-right corner,
                // with subsequent teams moving up and to the left.
                const newSeats = rawSeats.map(s => ({
                    row: viewRows - 1 - s.row,
                    col: plan.cols - 1 - s.col,
                    studentName: s.studentName
                }));

                // Store as a temporary overlay — never touch plan.seats or plan.rows
                plan._teamViewSeats = newSeats;
                plan._teamViewRows = viewRows;
                renderRoster();
                mdbToast('Seats grouped by team');
            };

            // Warn before overwriting an existing hand-arranged plan (only on first use)
            if (!plan._teamViewSeats && (plan.seats || []).length > 0) {
                showConfirm('Rearrange seats by team?\nYour saved plan is unchanged — tap ↩ Reset seats to go back.', _doGroup);
            } else {
                _doGroup();
            }
        }

        function cpResetToOriginalPlan() {
            if (!selectedGroupName) return;
            const plan = cpGetActivePlan(selectedGroupName);
            if (!plan || !plan._teamViewSeats) return;
            delete plan._teamViewSeats;
            delete plan._teamViewRows;
            delete plan.seatsBackup;
            delete plan.rowsBackup;
            cpSavePlans();
            renderRoster();
            mdbToast('Seats restored to original arrangement');
        }

        // ── Temporary plan lifecycle (pagehide + DOMContentLoaded check) ──────────────

        window.addEventListener('pagehide', () => {
            const group = selectedGroupName;
            const active = cpGetActivePlan(group);
            if (active && active.isTemporary) {
                localStorage.setItem('cms-cp-temp-pending', JSON.stringify({ groupName: group, planId: active.id }));
            } else {
                localStorage.removeItem('cms-cp-temp-pending');
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            const pending = localStorage.getItem('cms-cp-temp-pending');
            if (!pending) return;
            localStorage.removeItem('cms-cp-temp-pending');
            try {
                const info = JSON.parse(pending);
                const plans = cpGetPlans(info.groupName);
                const plan = plans.find(p => p.id === info.planId);
                if (!plan || !plan.isTemporary) return;
                setTimeout(() => {
                    showConfirm(
                        `Your active class plan "${plan.name}" is temporary. Keep it for future sessions?`,
                        () => { plan.isTemporary = false; cpSavePlans(); mdbToast('Plan kept.'); },
                        () => {
                            const idx = plans.findIndex(p => p.id === info.planId);
                            if (idx !== -1) plans.splice(idx, 1);
                            if (plans.length && !plans.find(p => p.isActive)) plans[0].isActive = true;
                            cpSavePlans();
                            mdbToast('Temporary plan discarded.');
                        }
                    );
                }, 1800);
            } catch (_) { }
        });
