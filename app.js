// ════════════════════════════════════════════════════════
//  app.js  —  Student Record Management System  (all logic)
// ════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────────────────────
let students     = [];
let deletedStack = [];
let sortDir      = 'asc';
let generatedOTP = null;
let idCounter    = 1;
let toastTimer;

const CREDS = { user: 'admin', pass: 'admin123' };

// ── LocalStorage persistence ───────────────────────────────────────────────────
function saveData() {
  localStorage.setItem('srms_students', JSON.stringify(students));
  localStorage.setItem('srms_stack',    JSON.stringify(deletedStack));
  localStorage.setItem('srms_counter',  idCounter);
}

function loadData() {
  const s = localStorage.getItem('srms_students');
  const d = localStorage.getItem('srms_stack');
  const c = localStorage.getItem('srms_counter');
  if (s) students     = JSON.parse(s);
  if (d) deletedStack = JSON.parse(d);
  if (c) idCounter    = parseInt(c);
}

// ── OTP ───────────────────────────────────────────────────────────────────────
function generateOTP() {
  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const d = document.getElementById('otpDisplay');
  d.style.display = 'block';
  d.textContent   = 'Your OTP: ' + generatedOTP + '  (valid for this session)';
  showToast('OTP generated! Check the box above.', 'warn');
}

// ── Login ─────────────────────────────────────────────────────────────────────
function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const o = document.getElementById('otpInput').value.trim();
  const err = document.getElementById('loginError');

  if (u === CREDS.user && p === CREDS.pass && o === generatedOTP) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display     = 'block';
    loadData();
    renderTable();
    updateStats();
    showToast('Welcome back, Admin!', 'success');
  } else {
    err.style.display = 'block';
  }
}

// Allow Enter key to submit login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') {
    doLogin();
  }
});

function doLogout() {
  document.getElementById('mainApp').style.display     = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUser').value  = '';
  document.getElementById('loginPass').value  = '';
  document.getElementById('otpInput').value   = '';
  document.getElementById('otpDisplay').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
  generatedOTP = null;
  showToast('Logged out successfully.', 'info');
}

// ── Add Student — Array push() O(1) ──────────────────────────────────────────
function addStudent() {
  const name   = document.getElementById('inName').value.trim();
  const course = document.getElementById('inCourse').value.trim();
  const score  = parseInt(document.getElementById('inScore').value);
  const grade  = document.getElementById('inGrade').value;

  if (!name || !course || isNaN(score) || score < 0 || score > 100 || !grade) {
    showToast('Please fill all fields correctly.', 'error');
    return;
  }

  const student = {
    id: 'S' + String(idCounter++).padStart(3, '0'),
    name, course, score, grade
  };

  students.push(student); // Array push — O(1) amortized
  saveData();
  renderTable();
  updateStats();

  // Clear inputs
  document.getElementById('inName').value   = '';
  document.getElementById('inCourse').value = '';
  document.getElementById('inScore').value  = '';
  document.getElementById('inGrade').value  = '';

  showToast(name + ' added successfully.', 'success');
}

// ── Delete — Linear Search O(n) + Stack push O(1) ────────────────────────────
function deleteStudent(id) {
  const idx = students.findIndex(s => s.id === id); // Linear Search O(n)
  if (idx === -1) return;
  const removed = students.splice(idx, 1)[0];
  deletedStack.push(removed); // Stack push O(1)
  saveData();
  renderTable();
  updateStats();
  showToast(removed.name + ' deleted. Undo available.', 'warn');
}

// ── Restore — Stack pop O(1) ─────────────────────────────────────────────────
function restoreStudent() {
  if (!deletedStack.length) return;
  const restored = deletedStack.pop(); // Stack pop O(1)
  students.push(restored);
  saveData();
  renderTable();
  updateStats();
  showToast(restored.name + ' restored!', 'success');
}

// ── Sort — O(n log n) ─────────────────────────────────────────────────────────
function getSorted(arr) {
  const key = document.getElementById('sortKey').value;
  return [...arr].sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === 'score') { va = +va; vb = +vb; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return sortDir === 'asc' ? -1 :  1;
    if (va > vb) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });
}

function toggleSortDir() {
  sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  document.getElementById('sortDirBtn').textContent = sortDir === 'asc' ? '↑' : '↓';
  renderTable();
}

// ── Linear Search O(n) ────────────────────────────────────────────────────────
function searchStudents(arr, query) {
  if (!query) return arr;
  const q = query.toLowerCase();
  const results = [];
  for (let i = 0; i < arr.length; i++) { // Linear scan O(n)
    if (
      arr[i].name.toLowerCase().includes(q)   ||
      arr[i].id.toLowerCase().includes(q)     ||
      arr[i].course.toLowerCase().includes(q)
    ) results.push(arr[i]);
  }
  return results;
}

// ── Render Table ──────────────────────────────────────────────────────────────
function renderTable() {
  const query   = document.getElementById('searchInput').value.trim();
  const sorted  = getSorted(students);
  const results = searchStudents(sorted, query);
  const tbody   = document.getElementById('tableBody');
  const empty   = document.getElementById('emptyState');
  const indic   = document.getElementById('searchIndicator');

  tbody.innerHTML = '';

  if (query) {
    indic.style.display = 'block';
    indic.textContent   = results.length + ' result(s) for "' + query + '"';
  } else {
    indic.style.display = 'none';
  }

  if (results.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    results.forEach((s, i) => {
      const fillColor = s.score >= 80 ? 'var(--green)' : s.score >= 60 ? 'var(--cyan)' : 'var(--amber)';
      const tr = document.createElement('tr');
      if (query) tr.classList.add('highlighted');
      tr.style.animationDelay = (i * 30) + 'ms';
      tr.innerHTML = `
        <td style="color:var(--dim);font-size:11px">${i + 1}</td>
        <td class="cell-id">${s.id}</td>
        <td style="font-weight:500">${s.name}</td>
        <td style="color:var(--muted)">${s.course}</td>
        <td>
          <div class="score-bar-wrap">
            <span>${s.score}</span>
            <div class="score-bar">
              <div class="score-bar-fill" style="width:${s.score}%;background:${fillColor}"></div>
            </div>
          </div>
        </td>
        <td><span class="grade-badge grade-${s.grade}">${s.grade}</span></td>
        <td><button class="btn-delete" onclick="deleteStudent('${s.id}')">✕ Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderStack();
}

// ── Render Stack ──────────────────────────────────────────────────────────────
function renderStack() {
  const container = document.getElementById('stackItems');
  const restore   = document.getElementById('restoreBtn');

  if (!deletedStack.length) {
    container.innerHTML = '<span class="stack-empty">Empty</span>';
    restore.disabled = true;
    return;
  }

  restore.disabled = false;
  container.innerHTML = '';
  [...deletedStack].reverse().forEach((s, i) => {
    const el = document.createElement('div');
    el.className  = 'stack-item' + (i === 0 ? ' top' : '');
    el.textContent = (i === 0 ? '▶️ TOP  ' : '') + s.name;
    container.appendChild(el);
  });
}

// ── Update Stats ──────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('totalCount').textContent = students.length;
  document.getElementById('stackCount').textContent = deletedStack.length;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast ' + type + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── DSA Modal Content ─────────────────────────────────────────────────────────
const dsaInfo = {
  array: {
    title: '▦ Array — Student Storage',
    color: 'var(--cyan)',
    content: `
      <p>All student records are stored in a <strong style="color:var(--cyan)">JavaScript Array</strong>. Each element holds id, name, course, score, and grade.</p>
      <p>Arrays provide O(1) indexed access. The <code>push()</code> method appends new records and <code>splice()</code> removes them. Data is saved to <strong>localStorage</strong> for persistence.</p>
      <table class="complexity-table">
        <tr><td>Access by index</td><td style="color:var(--cyan)">O(1)</td></tr>
        <tr><td>Push (append)</td><td style="color:var(--cyan)">O(1) amortized</td></tr>
        <tr><td>Traverse all</td><td style="color:var(--amber)">O(n)</td></tr>
        <tr><td>Delete by index</td><td style="color:var(--amber)">O(n)</td></tr>
      </table>`
  },
  search: {
    title: '⌕ Linear Search — Find Records',
    color: 'var(--amber)',
    content: `
      <p>The search bar runs a <strong style="color:var(--amber)">Linear Search</strong> that scans every record from index 0 to n-1, collecting all partial matches on name, ID, or course.</p>
      <p>Supports case-insensitive partial matching. No pre-sorting required — works on any array state.</p>
      <table class="complexity-table">
        <tr><td>Best case (first item)</td><td style="color:var(--green)">O(1)</td></tr>
        <tr><td>Average case</td><td style="color:var(--amber)">O(n/2)</td></tr>
        <tr><td>Worst case (no match)</td><td style="color:var(--red)">O(n)</td></tr>
      </table>`
  },
  sort: {
    title: '⇅ Sorting — Organize Records',
    color: 'var(--violet)',
    content: `
      <p>JavaScript's built-in <strong style="color:var(--violet)">Array.sort()</strong> uses TimSort (hybrid merge + insertion sort). A custom comparator handles both string and numeric fields.</p>
      <p>Sort by Name, Score, Grade, or Course in ascending or descending order. Non-destructive — original array is copied first.</p>
      <table class="complexity-table">
        <tr><td>Best case (nearly sorted)</td><td style="color:var(--green)">O(n)</td></tr>
        <tr><td>Average case</td><td style="color:var(--violet)">O(n log n)</td></tr>
        <tr><td>Worst case</td><td style="color:var(--violet)">O(n log n)</td></tr>
        <tr><td>Space</td><td style="color:var(--amber)">O(n)</td></tr>
      </table>`
  },
  stack: {
    title: '⧠ Stack — Undo Delete (LIFO)',
    color: 'var(--green)',
    content: `
      <p>Deleted records are <strong style="color:var(--green)">pushed</strong> onto a Stack (Last-In, First-Out). The most recently deleted record sits at the TOP.</p>
      <p>Clicking "Undo Delete" <strong>pops</strong> the top element and re-inserts it — mimicking undo/redo systems in text editors and OS file managers.</p>
      <table class="complexity-table">
        <tr><td>Push (on delete)</td><td style="color:var(--green)">O(1)</td></tr>
        <tr><td>Pop (on restore)</td><td style="color:var(--green)">O(1)</td></tr>
        <tr><td>Peek at top</td><td style="color:var(--green)">O(1)</td></tr>
        <tr><td>Space used</td><td style="color:var(--amber)">O(n)</td></tr>
      </table>`
  }
};

function openModal(key) {
  const info = dsaInfo[key];
  document.getElementById('modalTitle').textContent = info.title;
  document.getElementById('modalTitle').style.color = info.color;
  document.getElementById('modalBody').innerHTML    = info.content;
  document.getElementById('dsaModal').style.display = 'flex';
}

function closeModal(e) {
  if (e.target === document.getElementById('dsaModal')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('dsaModal').style.display = 'none';
}
