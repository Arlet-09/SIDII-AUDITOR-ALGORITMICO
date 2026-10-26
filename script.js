const navButtons = document.querySelectorAll('[data-section]');
const sections = document.querySelectorAll('.page-section');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function activateSection(id) {
  sections.forEach(section => section.classList.toggle('active-section', section.id === id));
  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.toggle('active', btn.dataset.section === id));
  history.replaceState(null, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navButtons.forEach(btn => {
  btn.addEventListener('click', event => {
    event.preventDefault();
    activateSection(btn.dataset.section);
  });
});

const initialSection = location.hash.replace('#', '') || 'perfil';
if (document.getElementById(initialSection)) activateSection(initialSection);

// Cargar datos: solamente simula el guardado en la interfaz.
document.getElementById('dataForm').addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById('dataMessage').textContent = '✓ Datos guardados correctamente (simulación).';
  showToast('Registro guardado en modo demostración.');
});

document.getElementById('dataForm').addEventListener('reset', () => {
  setTimeout(() => document.getElementById('dataMessage').textContent = '', 0);
});

// Evidencias.
const evidenceFile = document.getElementById('evidenceFile');
evidenceFile.addEventListener('change', () => {
  const name = evidenceFile.files[0]?.name || 'Seleccionar archivo';
  document.getElementById('fileLabel').textContent = name;
});

document.getElementById('evidenceForm').addEventListener('submit', event => {
  event.preventDefault();
  const description = document.getElementById('evidenceDescription').value.trim() || 'Evidencia sin descripción.';
  const type = document.getElementById('evidenceType').value;
  const component = document.getElementById('evidenceComponent').value;
  const ext = evidenceFile.files[0]?.name.split('.').pop()?.toUpperCase() || 'PDF';
  const item = document.createElement('article');
  item.className = 'evidence-item';
  item.innerHTML = `<div class="file-type">${ext}</div><div><strong>${type}</strong><span>${component} · ${new Date().toLocaleDateString('es-MX')}</span></div><span class="badge warning">Revisión</span>`;
  document.getElementById('evidenceList').prepend(item);
  document.getElementById('evidenceMessage').textContent = `✓ ${description}`;
  document.getElementById('evidenceForm').reset();
  document.getElementById('fileLabel').textContent = 'Seleccionar archivo';
  showToast('Evidencia registrada en modo demostración.');
});

// Tema de alto contraste claro/oscuro.
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
});

// Gráficos con datos simulados.
let chartInstances = [];
const baseData = {
  labels: ['Ene-Abr', 'May-Ago', 'Sep-Dic'],
  values: {
    programado: [100, 120, 140],
    realizado: [92, 106, 0],
    finProgramado: [80, 100, 120],
    finRealizado: [68, 84, 0],
    purposeProgramado: [70, 90, 110],
    purposeRealizado: [61, 80, 0],
    components: [82, 76, 72],
    activities: [88, 79, 74]
  }
};

function destroyCharts() {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances = [];
}

function axisOptions(max = 140) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#eadff0', boxWidth: 10, font: { size: 10 } }
      }
    },
    scales: {
      x: { ticks: { color: '#cdb8d8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.05)' } },
      y: { min: 0, max, ticks: { color: '#cdb8d8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,.06)' } }
    }
  };
}

function makeCharts(multiplier = 1) {
  if (typeof Chart === 'undefined') {
    document.querySelectorAll('.chart-box').forEach(box => {
      if (box.dataset.chartFallback === 'true') return;
      const notice = document.createElement('p');
      notice.className = 'chart-unavailable';
      notice.textContent = 'Las gráficas necesitan que el componente de visualización esté disponible. Conéctate y recarga para volver a intentarlo.';
      box.replaceChildren(notice);
      box.dataset.chartFallback = 'true';
    });
    return;
  }
  document.querySelectorAll('.chart-box').forEach(box => {
    if (box.dataset.chartFallback === 'true') {
      box.replaceChildren();
      delete box.dataset.chartFallback;
    }
  });
  destroyCharts();
  const common = { borderRadius: 7, borderWidth: 0 };
  chartInstances.push(new Chart(document.getElementById('finChart'), {
    type: 'bar',
    data: { labels: baseData.labels, datasets: [
      { label: 'Programado', data: baseData.values.finProgramado.map(v => v * multiplier), backgroundColor: '#655472', ...common },
      { label: 'Realizado', data: baseData.values.finRealizado.map(v => v * multiplier), backgroundColor: '#9181a1', ...common }
    ] }, options: axisOptions(140)
  }));

  chartInstances.push(new Chart(document.getElementById('purposeChart'), {
    type: 'bar',
    data: { labels: baseData.labels, datasets: [
      { label: 'Programado', data: baseData.values.purposeProgramado.map(v => v * multiplier), backgroundColor: '#655472', ...common },
      { label: 'Realizado', data: baseData.values.purposeRealizado.map(v => v * multiplier), backgroundColor: '#9181a1', ...common }
    ] }, options: axisOptions(120)
  }));

  chartInstances.push(new Chart(document.getElementById('componentChart'), {
    type: 'bar',
    data: { labels: ['C1', 'C2', 'C3'], datasets: [{ label: 'Avance %', data: baseData.values.components.map(v => Math.round(v * multiplier)), backgroundColor: '#9181a1', ...common }] },
    options: axisOptions(100)
  }));

  chartInstances.push(new Chart(document.getElementById('activityChart'), {
    type: 'line',
    data: { labels: baseData.labels, datasets: [{ label: 'Avance %', data: baseData.values.activities.map(v => Math.round(v * multiplier)), borderColor: '#b7a9c6', backgroundColor: 'rgba(183,169,198,.14)', fill: true, tension: .35 }] },
    options: axisOptions(100)
  }));
}

function applyChartFilters() {
  const period = document.getElementById('periodFilter').value;
  const component = document.getElementById('chartComponent').value;
  let multiplier = 1;
  if (period === 'q1') multiplier = .92;
  if (period === 'q2') multiplier = 1;
  if (period === 'q3') multiplier = .74;
  if (component === 'c1') multiplier += .04;
  if (component === 'c2') multiplier -= .02;
  if (component === 'c3') multiplier -= .05;
  multiplier = Math.max(.55, Math.min(1.06, multiplier));
  document.getElementById('completionValue').textContent = `${Math.round(78 * multiplier)}%`;
  makeCharts(multiplier);
}

document.getElementById('periodFilter').addEventListener('change', applyChartFilters);
document.getElementById('chartComponent').addEventListener('change', applyChartFilters);
document.getElementById('printCharts').addEventListener('click', () => window.print());

// Gestión de datos.
document.getElementById('addRow').addEventListener('click', () => {
  const tbody = document.querySelector('#managementTable tbody');
  const row = document.createElement('tr');
  row.innerHTML = `<td>Componente</td><td>Nuevo registro</td><td>Descripción simulada</td><td>% avance</td><td><span class="mini-tag">1</span></td><td><button class="table-btn edit">Editar</button><button class="table-btn delete">Eliminar</button></td>`;
  tbody.prepend(row);
  showToast('Se agregó un registro de ejemplo.');
});

document.getElementById('managementTable').addEventListener('click', event => {
  const btn = event.target.closest('.table-btn');
  if (!btn) return;
  const row = btn.closest('tr');

  if (btn.classList.contains('delete')) {
    row.remove();
    showToast('Registro eliminado de la tabla de demostración.');
    return;
  }

  if (btn.classList.contains('save-edit')) {
    const cells = [...row.cells].slice(0, 4);
    cells.forEach(cell => {
      const input = cell.querySelector('input');
      if (input) cell.textContent = input.value;
    });
    btn.textContent = 'Editar';
    btn.classList.remove('save-edit');
    showToast('Cambios guardados en la maqueta.');
    return;
  }

  const cells = [...row.cells].slice(0, 4);
  cells.forEach(cell => {
    const current = cell.textContent.trim();
    cell.innerHTML = `<input value="${current.replace(/"/g, '&quot;')}" style="min-width:110px;">`;
  });
  btn.textContent = 'Guardar';
  btn.classList.add('save-edit');
});

makeCharts();
