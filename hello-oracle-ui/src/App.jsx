import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5137';
const WORK_DAY_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

function StaffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function App() {
  const [staffs, setStaffs] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  const [workDays, setWorkDays] = useState([]);
  const [selectedDayName, setSelectedDayName] = useState('Senin');
  const [selectedDayId, setSelectedDayId] = useState(null);

  const [todos, setTodos] = useState([]);
  const [weeklyTodosByDay, setWeeklyTodosByDay] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState('');
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStaffs();
    initWorkDays();
  }, []);

  useEffect(() => {
    setEditingTodoId(null);
    if (selectedDayId !== null) {
      fetchTodos(selectedDayId);
    } else {
      setTodos([]);
    }
  }, [selectedDayId]);

  useEffect(() => {
    if (workDays.length > 0) {
      fetchWeeklySummary(workDays);
    }
  }, [workDays]);

  async function fetchStaffs() {
    try {
      const res = await fetch(`${API_BASE}/staffs`);
      if (!res.ok) throw new Error('Gagal memuat daftar staff.');
      const data = await res.json();
      setStaffs(data);
      if (data.length > 0 && selectedStaffId === null) {
        setSelectedStaffId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function ensureWorkDay(dayName, existingList) {
    const found = existingList.find(
      (d) => d.dayName.toLowerCase() === dayName.toLowerCase()
    );
    if (found) {
      setSelectedDayId(found.id);
      return existingList;
    }

    const res = await fetch(`${API_BASE}/work-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayName }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Gagal menyiapkan hari kerja.');
    }
    const created = await res.json();
    const updatedList = [...existingList, created];
    setWorkDays(updatedList);
    setSelectedDayId(created.id);
    return updatedList;
  }

  async function initWorkDays() {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/work-days`);
      if (!res.ok) throw new Error('Gagal memuat daftar hari kerja.');
      const data = await res.json();
      setWorkDays(data);
      await ensureWorkDay('Senin', data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchWeeklySummary(dayList) {
    try {
      setLoadingSummary(true);
      const entries = await Promise.all(
        WORK_DAY_OPTIONS.map(async (dayName) => {
          const matchedDay = dayList.find(
            (d) => d.dayName.toLowerCase() === dayName.toLowerCase()
          );
          if (!matchedDay) {
            return [dayName, []];
          }
          const res = await fetch(`${API_BASE}/work-days/${matchedDay.id}/todos`);
          if (!res.ok) return [dayName, []];
          const data = await res.json();
          return [dayName, data];
        })
      );

      const grouped = Object.fromEntries(entries);
      setWeeklyTodosByDay(grouped);
    } catch {
      // Abaikan jika gagal sementara, error utama sudah ditangani
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleSelectDayChange(e) {
    const dayName = e.target.value;
    setSelectedDayName(dayName);
    try {
      setError('');
      await ensureWorkDay(dayName, workDays);
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchTodos(dayId) {
    try {
      setLoadingTodos(true);
      setError('');
      const res = await fetch(`${API_BASE}/work-days/${dayId}/todos`);
      if (!res.ok) throw new Error('Gagal memuat daftar tugas.');
      const data = await res.json();
      setTodos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingTodos(false);
    }
  }

  async function handleAddStaff(e) {
    e.preventDefault();
    const cleanName = newStaffName.trim();
    if (!cleanName) return;

    try {
      setError('');
      const res = await fetch(`${API_BASE}/staffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menambah staff.');
      }
      const created = await res.json();
      setStaffs((prev) => [...prev, created]);
      setSelectedStaffId(created.id);
      setNewStaffName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteStaff(e, staffId) {
    e.stopPropagation();
    try {
      setError('');
      const res = await fetch(`${API_BASE}/staffs/${staffId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus staff.');

      const remaining = staffs.filter((s) => s.id !== staffId);
      setStaffs(remaining);
      if (staffId === selectedStaffId) {
        setSelectedStaffId(remaining.length > 0 ? remaining[0].id : null);
      }
      if (selectedDayId !== null) {
        fetchTodos(selectedDayId);
      }
      fetchWeeklySummary(workDays);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddTodo(e) {
    e.preventDefault();
    const cleanTitle = newTodoTitle.trim();
    if (!cleanTitle || selectedDayId === null) return;

    if (selectedStaffId === null) {
      setError('Silakan pilih atau tambahkan staff di panel samping terlebih dahulu.');
      return;
    }

    try {
      setError('');
      const res = await fetch(`${API_BASE}/work-days/${selectedDayId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          staffId: selectedStaffId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menambah tugas.');
      }
      const created = await res.json();
      setTodos((prev) => [...prev, created]);
      setWeeklyTodosByDay((prev) => ({
        ...prev,
        [selectedDayName]: [...(prev[selectedDayName] || []), created],
      }));
      setNewTodoTitle('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleTodo(todo) {
    try {
      setError('');
      const updatedCompleted = !todo.isCompleted;
      const res = await fetch(`${API_BASE}/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: todo.title,
          isCompleted: updatedCompleted,
        }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status tugas.');

      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, isCompleted: updatedCompleted } : item
        )
      );
      setWeeklyTodosByDay((prev) => ({
        ...prev,
        [selectedDayName]: (prev[selectedDayName] || []).map((item) =>
          item.id === todo.id ? { ...item, isCompleted: updatedCompleted } : item
        ),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditTodo(todo) {
    setError('');
    setEditingTodoId(todo.id);
    setEditingTodoTitle(todo.title);
  }

  function cancelEditTodo() {
    setEditingTodoId(null);
    setEditingTodoTitle('');
  }

  async function handleSaveEditTodo(todo) {
    const cleanTitle = editingTodoTitle.trim();
    if (!cleanTitle) {
      setError('Judul tugas tidak boleh kosong.');
      return;
    }

    try {
      setError('');
      const res = await fetch(`${API_BASE}/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          isCompleted: todo.isCompleted,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan perubahan tugas.');
      }

      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, title: cleanTitle } : item
        )
      );
      setWeeklyTodosByDay((prev) => ({
        ...prev,
        [selectedDayName]: (prev[selectedDayName] || []).map((item) =>
          item.id === todo.id ? { ...item, title: cleanTitle } : item
        ),
      }));
      setEditingTodoId(null);
      setEditingTodoTitle('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTodo(todoId) {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/todos/${todoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus tugas.');

      setTodos((prev) => prev.filter((item) => item.id !== todoId));
      setWeeklyTodosByDay((prev) => ({
        ...prev,
        [selectedDayName]: (prev[selectedDayName] || []).filter(
          (item) => item.id !== todoId
        ),
      }));
      if (editingTodoId === todoId) {
        cancelEditTodo();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  const activeStaff = staffs.find((s) => s.id === selectedStaffId);
  const filteredTodos = todos.filter((t) => t.staffId === selectedStaffId);

  // Hitung ringkasan keseluruhan tugas Senin s/d Jumat untuk Staff terpilih
  const staffWeeklySummary = WORK_DAY_OPTIONS.map((dayName) => {
    const dayTodos = (weeklyTodosByDay[dayName] || []).filter(
      (t) => t.staffId === selectedStaffId
    );
    return { dayName, items: dayTodos };
  });

  const totalWeeklyTasks = staffWeeklySummary.reduce(
    (sum, d) => sum + d.items.length,
    0
  );
  const completedWeeklyTasks = staffWeeklySummary.reduce(
    (sum, d) => sum + d.items.filter((t) => t.isCompleted).length,
    0
  );

  return (
    <div className="page-wrapper">
      <header className="top-header">
        <h1>To-Do List</h1>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="layout-grid-3">
        {/* KOLOM 1 (KIRI): DAFTAR STAFF */}
        <aside className="sidebar-card">
          <h2 className="sidebar-title">Daftar Staff</h2>

          <form onSubmit={handleAddStaff} className="sidebar-form">
            <input
              type="text"
              placeholder="Nama staff baru..."
              value={newStaffName}
              maxLength={100}
              onChange={(e) => setNewStaffName(e.target.value)}
              required
            />
            <button type="submit" className="btn-staff" title="Tambah Staff">
              +
            </button>
          </form>

          {staffs.length === 0 ? (
            <p className="muted-text">Belum ada data staff.</p>
          ) : (
            <ul className="staff-menu">
              {staffs.map((staff) => {
                const isSelected = staff.id === selectedStaffId;
                return (
                  <li
                    key={staff.id}
                    className={`staff-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedStaffId(staff.id)}
                  >
                    <div className="staff-info">
                      <span className="staff-icon-circle">
                        <StaffIcon />
                      </span>
                      <span className="staff-name">{staff.name}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-staff-del"
                      title="Hapus staff"
                      onClick={(e) => handleDeleteStaff(e, staff.id)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* KOLOM 2 (TENGAH): HARI KERJA & INPUT/EDIT TUGAS */}
        <main className="main-card">
          {activeStaff ? (
            <>
              <div className="selected-staff-banner">
                <span className="banner-icon">
                  <StaffIcon />
                </span>
                <div>
                  <span className="banner-label">Nama Staff</span>
                  <h2 className="banner-name">{activeStaff.name}</h2>
                </div>
              </div>

              <div className="workday-select-group">
                <label htmlFor="workday-dropdown" className="box-label">
                  Pilih Hari Kerja
                </label>
                <select
                  id="workday-dropdown"
                  className="workday-dropdown"
                  value={selectedDayName}
                  onChange={handleSelectDayChange}
                >
                  {WORK_DAY_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <hr className="divider" />

              <h3 className="section-title">
                Tugas {activeStaff.name} — Hari {selectedDayName}
              </h3>

              <form onSubmit={handleAddTodo} className="todo-add-form">
                <input
                  type="text"
                  placeholder={`Tambah tugas di hari ${selectedDayName}...`}
                  value={newTodoTitle}
                  maxLength={200}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  required
                />
                <button type="submit" className="btn-add">
                  + Tambah
                </button>
              </form>

              {loadingTodos ? (
                <p className="status">Memuat tugas...</p>
              ) : filteredTodos.length === 0 ? (
                <p className="status">
                  Belum ada tugas untuk <strong>{activeStaff.name}</strong> pada hari{' '}
                  <strong>{selectedDayName}</strong>.
                </p>
              ) : (
                <ul className="todo-list">
                  {filteredTodos.map((todo) => {
                    const isEditing = editingTodoId === todo.id;
                    return (
                      <li key={todo.id} className="todo-item">
                        {isEditing ? (
                          <div className="todo-edit-row">
                            <input
                              type="text"
                              className="todo-edit-input"
                              value={editingTodoTitle}
                              maxLength={200}
                              autoFocus
                              onChange={(e) => setEditingTodoTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditTodo(todo);
                                if (e.key === 'Escape') cancelEditTodo();
                              }}
                            />
                            <div className="todo-actions">
                              <button
                                type="button"
                                className="btn-save"
                                onClick={() => handleSaveEditTodo(todo)}
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                className="btn-cancel"
                                onClick={cancelEditTodo}
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <label className="todo-left">
                              <input
                                type="checkbox"
                                checked={todo.isCompleted}
                                onChange={() => handleToggleTodo(todo)}
                              />
                              <span className={todo.isCompleted ? 'completed' : ''}>
                                {todo.title}
                              </span>
                            </label>
                            <div className="todo-actions">
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => startEditTodo(todo)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn-del"
                                onClick={() => handleDeleteTodo(todo.id)}
                              >
                                Hapus
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="status">
              Silakan pilih atau tambahkan Staff di sebelah kiri untuk mengelola tugas.
            </p>
          )}
        </main>

        {/* KOLOM 3 (KANAN): SUMMARY SENIN S/D JUM'AT */}
        <aside className="summary-card">
          <div className="summary-header">
            <h2 className="sidebar-title">Summary Tugas</h2>
            {activeStaff && (
              <span className="summary-badge">
                {completedWeeklyTasks}/{totalWeeklyTasks} Selesai
              </span>
            )}
          </div>

          {activeStaff ? (
            <>
              <p className="summary-subtitle">
                Rekap <strong>{activeStaff.name}</strong> (Senin – Jum'at)
              </p>

              {loadingSummary ? (
                <p className="muted-text">Memuat ringkasan...</p>
              ) : (
                <div className="summary-days-list">
                  {staffWeeklySummary.map(({ dayName, items }) => {
                    const isCurrentDay = dayName === selectedDayName;
                    return (
                      <div
                        key={dayName}
                        className={`summary-day-box ${isCurrentDay ? 'current' : ''}`}
                      >
                        <div className="summary-day-header">
                          <span className="summary-day-name">{dayName}</span>
                          <span className="summary-day-count">
                            {items.length} tugas
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <p className="summary-empty">Tidak ada tugas</p>
                        ) : (
                          <ul className="summary-task-list">
                            {items.map((item) => (
                              <li
                                key={item.id}
                                className={`summary-task-item ${
                                  item.isCompleted ? 'done' : ''
                                }`}
                              >
                                <span className="summary-dot">
                                  {item.isCompleted ? '✓' : '•'}
                                </span>
                                <span className="summary-task-text">
                                  {item.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="muted-text">
              Pilih staff untuk melihat ringkasan tugas Senin s/d Jum'at.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}