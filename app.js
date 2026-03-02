/* =====================================================
   Motet - Concert PWA Logic
   ===================================================== */

(function () {
  'use strict';

  // ────────────────────────── Storage ──────────────────────────
  const STORAGE_KEY = 'motet_concerts';

  function loadConcerts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function saveConcerts(concerts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(concerts));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ────────────────────────── Date Helpers ──────────────────────────
  const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function getStartOfWeek(d) {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    dt.setDate(dt.getDate() + diff);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function getEndOfWeek(startOfWeek) {
    const end = new Date(startOfWeek);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatDateLong(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
  }

  function formatRange(start, end) {
    const s = `${start.getDate()} ${MONTHS_ES[start.getMonth()].slice(0, 3)}`;
    const e = `${end.getDate()} ${MONTHS_ES[end.getMonth()].slice(0, 3)}`;
    return `${s} — ${e}`;
  }

  // ────────────────────────── DOM refs ──────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const viewWeekly = $('#view-weekly');
  const viewCalendar = $('#view-calendar');
  const weeklyList = $('#weekly-list');
  const weeklyEmpty = $('#weekly-empty');
  const weekRange = $('#week-range');
  const nextWeeklyList = $('#next-week-list');
  const nextWeeklyEmpty = $('#next-week-empty');
  const nextWeekRange = $('#next-week-range');
  const monthsGrid = $('#months-grid');
  const calendarYearLabel = $('#calendar-year span');
  const btnPrevYear = $('#prev-year');
  const btnNextYear = $('#next-year');
  const fab = $('#fab-add');
  const navBtns = $$('.nav-btn');

  // Modal form
  const modalOverlay = $('#modal-form');
  const modalTitle = $('#modal-title');
  const concertForm = $('#concert-form');
  const editIdInput = $('#edit-id');
  const fieldBand = $('#field-band');
  const fieldDate = $('#field-date');
  const fieldTime = $('#field-time');
  const fieldType = $('#field-type');
  const fieldPlace = $('#field-place');
  const modalCloseBtn = $('#modal-close');

  // Action sheet
  const actionOverlay = $('#action-sheet');
  const actionInfo = $('#action-sheet-info');
  const actionEdit = $('#action-edit');
  const actionDelete = $('#action-delete');
  const actionCancel = $('#action-cancel');

  // Confirm
  const confirmOverlay = $('#confirm-overlay');
  const confirmDetail = $('#confirm-detail');
  const confirmYes = $('#confirm-yes');
  const confirmNo = $('#confirm-no');

  // Toast
  const toast = $('#toast');

  // ────────────────────────── State ──────────────────────────
  let concerts = loadConcerts();
  let currentView = 'weekly';
  let selectedConcertId = null;
  let calendarYear = new Date().getFullYear();

  // ────────────────────────── Navigation ──────────────────────────
  function switchView(viewName) {
    currentView = viewName;
    viewWeekly.classList.toggle('active', viewName === 'weekly');
    viewCalendar.classList.toggle('active', viewName === 'calendar');
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    if (viewName === 'weekly') renderWeekly();
    if (viewName === 'calendar') renderCalendar();
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // ────────────────────────── Weekly View ──────────────────────────
  function renderWeekly() {
    const today = new Date();
    const startThisWeek = getStartOfWeek(today);
    const endThisWeek = getEndOfWeek(startThisWeek);

    const startNextWeek = new Date(startThisWeek);
    startNextWeek.setDate(startNextWeek.getDate() + 7);
    const endNextWeek = getEndOfWeek(startNextWeek);

    weekRange.textContent = formatRange(startThisWeek, endThisWeek);
    nextWeekRange.textContent = formatRange(startNextWeek, endNextWeek);

    const thisWeekly = concerts.filter(c => {
      const d = new Date(c.date + 'T00:00:00');
      return d >= startThisWeek && d <= endThisWeek;
    }).sort((a, b) => a.date.localeCompare(b.date));

    const nextWeekly = concerts.filter(c => {
      const d = new Date(c.date + 'T00:00:00');
      return d >= startNextWeek && d <= endNextWeek;
    }).sort((a, b) => a.date.localeCompare(b.date));

    weeklyList.innerHTML = '';
    if (thisWeekly.length === 0) {
      weeklyEmpty.classList.remove('hidden');
    } else {
      weeklyEmpty.classList.add('hidden');
      thisWeekly.forEach(c => {
        weeklyList.appendChild(createConcertCard(c));
      });
    }

    nextWeeklyList.innerHTML = '';
    if (nextWeekly.length === 0) {
      nextWeeklyEmpty.classList.remove('hidden');
    } else {
      nextWeeklyEmpty.classList.add('hidden');
      nextWeekly.forEach(c => {
        nextWeeklyList.appendChild(createConcertCard(c));
      });
    }
  }

  function createConcertCard(c) {
    const card = document.createElement('div');
    card.className = 'concert-card';
    card.dataset.id = c.id;
    const timeHtml = c.time ? `<span><i class="fas fa-clock"></i>Hora: ${c.time}</span>` : '';
    card.innerHTML = `
      <div class="card-top">
        <span class="band-name">${esc(c.band)}</span>
        <span class="event-badge">${esc(c.type)}</span>
      </div>
      <div class="card-bottom">
        <span><i class="fas fa-calendar-day"></i>${formatDateLong(c.date)}</span>
        ${timeHtml}
        <span><i class="fas fa-map-marker-alt"></i>${esc(c.place)}</span>
      </div>
    `;
    card.addEventListener('click', () => openActionSheet(c.id));
    return card;
  }

  // ────────────────────────── Calendar View ──────────────────────────
  function renderCalendar() {
    calendarYearLabel.textContent = calendarYear;
    monthsGrid.innerHTML = '';

    for (let m = 0; m < 12; m++) {
      const monthConcerts = concerts
        .filter(c => {
          const d = new Date(c.date + 'T00:00:00');
          return d.getFullYear() === calendarYear && d.getMonth() === m;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const block = document.createElement('div');
      block.className = 'month-block';

      block.innerHTML = `
        <div class="month-header">
          <span class="month-name">${MONTHS_ES[m]}</span>
          <span class="month-count">
            <span class="count-num">${monthConcerts.length}</span>
            <i class="fas fa-chevron-down"></i>
          </span>
        </div>
        <div class="month-body"></div>
      `;

      const body = block.querySelector('.month-body');

      if (monthConcerts.length === 0) {
        body.innerHTML = '<div class="month-empty">Sin conciertos</div>';
      } else {
        monthConcerts.forEach(c => {
          const item = document.createElement('div');
          item.className = 'month-concert-item';
          item.dataset.id = c.id;
          item.innerHTML = `
            <span class="mci-date">${formatDateShort(c.date)}</span>
            <span class="mci-sep">—</span>
            <span class="mci-band">${esc(c.band)}</span>
            <span class="mci-sep">—</span>
            <span class="mci-place">${esc(c.place)}</span>
          `;
          item.addEventListener('click', () => openActionSheet(c.id));
          body.appendChild(item);
        });
      }

      block.querySelector('.month-header').addEventListener('click', () => {
        block.classList.toggle('open');
      });

      monthsGrid.appendChild(block);
    }
  }

  btnPrevYear.addEventListener('click', () => { calendarYear--; renderCalendar(); });
  btnNextYear.addEventListener('click', () => { calendarYear++; renderCalendar(); });

  // ────────────────────────── Modal (Add/Edit) ──────────────────────────
  function openModal(concertId) {
    if (concertId) {
      const c = concerts.find(x => x.id === concertId);
      if (!c) return;
      modalTitle.innerHTML = '<i class="fas fa-pen"></i> Editar Concierto';
      editIdInput.value = c.id;
      fieldBand.value = c.band;
      fieldDate.value = c.date;
      fieldTime.value = c.time || '';
      fieldType.value = c.type;
      fieldPlace.value = c.place;
    } else {
      modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Concierto';
      concertForm.reset();
      editIdInput.value = '';
    }
    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  fab.addEventListener('click', () => openModal(null));
  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  concertForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      band: fieldBand.value.trim(),
      date: fieldDate.value,
      time: fieldTime.value,
      type: fieldType.value.trim(),
      place: fieldPlace.value.trim(),
    };

    if (!data.band || !data.date || !data.type || !data.place) return;

    const editId = editIdInput.value;
    if (editId) {
      const idx = concerts.findIndex(c => c.id === editId);
      if (idx !== -1) {
        concerts[idx] = { ...concerts[idx], ...data };
        showToast('Concierto actualizado ✔');
      }
    } else {
      concerts.push({ id: generateId(), ...data });
      showToast('Concierto guardado 🎉');
    }

    saveConcerts(concerts);
    closeModal();
    refreshViews();
  });

  // ────────────────────────── Action Sheet ──────────────────────────
  function openActionSheet(concertId) {
    const c = concerts.find(x => x.id === concertId);
    if (!c) return;
    selectedConcertId = concertId;

    actionInfo.innerHTML = `
      <div class="asi-band">${esc(c.band)}</div>
      <div class="asi-detail">${formatDateLong(c.date)} · ${esc(c.place)} · ${esc(c.type)}</div>
    `;
    actionOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeActionSheet() {
    actionOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    selectedConcertId = null;
  }

  actionCancel.addEventListener('click', closeActionSheet);
  actionOverlay.addEventListener('click', (e) => {
    if (e.target === actionOverlay) closeActionSheet();
  });

  actionEdit.addEventListener('click', () => {
    const id = selectedConcertId;
    closeActionSheet();
    setTimeout(() => openModal(id), 200);
  });

  actionDelete.addEventListener('click', () => {
    const c = concerts.find(x => x.id === selectedConcertId);
    if (!c) return;
    closeActionSheet();
    setTimeout(() => openConfirm(c), 200);
  });

  // ────────────────────────── Confirm Delete ──────────────────────────
  let pendingDeleteId = null;

  function openConfirm(c) {
    pendingDeleteId = c.id;
    confirmDetail.textContent = `${c.band} — ${formatDateShort(c.date)} — ${c.place}`;
    confirmOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeConfirm() {
    confirmOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    pendingDeleteId = null;
  }

  confirmNo.addEventListener('click', closeConfirm);
  confirmOverlay.addEventListener('click', (e) => {
    if (e.target === confirmOverlay) closeConfirm();
  });

  confirmYes.addEventListener('click', () => {
    if (pendingDeleteId) {
      concerts = concerts.filter(c => c.id !== pendingDeleteId);
      saveConcerts(concerts);
      showToast('Concierto eliminado 🗑️');
      closeConfirm();
      refreshViews();
    }
  });

  // ────────────────────────── Toast ──────────────────────────
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2400);
  }

  // ────────────────────────── Helpers ──────────────────────────
  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function refreshViews() {
    if (currentView === 'weekly') renderWeekly();
    if (currentView === 'calendar') renderCalendar();
  }

  // ────────────────────────── Service Worker Registration ──────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    });
  }

  // ────────────────────────── Init ──────────────────────────
  renderWeekly();

})();
