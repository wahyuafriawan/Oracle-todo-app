import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5137';

export default function App() {
  const [staffs, setStaffs] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [workDays, setWorkDays] = useState([]);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [newDayName, setNewDayName] = useState('');

  const [todos, setTodos] = useState([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStaffs();
    fetchWorkDays();
  }, []);

  useEffect(() => {
    if (selectedDayId !== null) {
      fetchTodos(selectedDayId);
    } else {
      setTodos([]);
    }
  }, [selectedDayId]);

  async function fetchStaffs() {
    try {
      const res = await fetch(`${API_BASE}/staffs`);
      if (!res.ok) throw new Error('Gagal memuat daftar staff!');
      const data = await res.json();
      setStaffs(data);
      if (data.length > 0 && !selectedStaffId) {
        setSelectedStaffId(String(data[0].id));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchWorkDays() {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/work-days`);
      if (!res.ok) throw new Error('Gagal memuat daftar hari kerja.');
      const data = await res.json();
      setWorkDays(data);
      if (data.length > 0 && selectedDayId === null) {
        setSelectedDayId(data[0].id);
      }
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
      setSelectedStaffId(String(created.id));
      setNewStaffName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteStaff(staffId) {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/staffs/${staffId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus staff.');

      const remaining = staffs.filter((s) => s.id !== staffId);
      setStaffs(remaining);
      if (String(staffId) === selectedStaffId) {
        setSelectedStaffId(remaining.length > 0 ? String(remaining[0].id) : '');
      }
      if (selectedDayId !== null) {
        fetchTodos(selectedDayId);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddWorkDay(e) {
    e.preventDefault();
    const cleanName = newDayName.trim();
    if (!cleanName) return;

    try {
      setError('');
      const res = await fetch(`${API_BASE}/work-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayName: cleanName }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menambah hari kerja.');
      }
      const created = await res.json();
      setWorkDays((prev) => [...prev, created]);
      setSelectedDayId(created.id);
      setNewDayName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteWorkDay(dayId) {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/work-days/${dayId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus hari kerja.');

      const remaining = workDays.filter((d) => d.id !== dayId);
      setWorkDays(remaining);
      if (selectedDayId === dayId) {
        setSelectedDayId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddTodo(e) {
    e.preventDefault();
    const cleanTitle = newTodoTitle.trim();
    if (!cleanTitle || selectedDayId === null) return;

    if (!selectedStaffId) {
      setError('Silakan pilih atau tambahkan staff terlebih dahulu.');
      return;
    }

    try {
      setError('');
      const res = await fetch(`${API_BASE}/work-days/${selectedDayId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          staffId: Number(selectedStaffId),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menambah tugas.');
      }
      const created = await res.json();
      setTodos((prev) => [...prev, created]);
      setNewTodoTitle('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleTodo(todo) {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: todo.title,
          isCompleted: !todo.isCompleted,
        }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status tugas.');
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, isCompleted: !item.isCompleted } : item
        )
      );
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
    } catch (err) {
      setError(err.message);
    }
  }

  const activeDay = workDays.find((d) => d.id === selectedDayId);

  return (
    <div className="container">
      <div className="card">
        <h1>Jadwal Hari Kerja & To-Do List</h1>
        <p className="subtitle">ReactJS + .NET 10 Minimal API + Oracle 26ai</p>

        {error && <div className="error">{error}</div>}

        {/* Bagian Manajemen Staff */}
        <div className="panel-box">
          <h3 className="box-label">Daftar Staff</h3>
          <form onSubmit={handleAddStaff} className="inline-form">
            <input
              type="text"
              placeholder="Tambah nama staff baru..."
              value={newStaffName}
              maxLength={100}
              onChange={(e) => setNewStaffName(e.target.value)}
              required
            />
            <button type="submit" className="btn-staff">
              + Staff
            </button>
          </form>

          <div className="chip-list">
            {staffs.length === 0 ? (
              <span className="muted-text">Belum ada data staff.</span>
            ) : (
              staffs.map((staff) => (
                <span key={staff.id} className="staff-chip">
                  {staff.name}
                  <button
                    type="button"
                    className="btn-chip-del"
                    title="Hapus staff"
                    onClick={() => handleDeleteStaff(staff.id)}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Bagian Tambah Hari Kerja */}
        <h3 className="box-label">Pilih Hari Kerja</h3>
        <form onSubmit={handleAddWorkDay} className="inline-form">
          <input
            type="text"
            placeholder="Tambah hari kerja (misal: Kamis, Jumat)..."
            value={newDayName}
            maxLength={50}
            onChange={(e) => setNewDayName(e.target.value)}
            required
          />
          <button type="submit" className="btn-secondary">
            + Hari Kerja
          </button>
        </form>

        {/* Tabs Pilihan Hari Kerja */}
        <div className="day-tabs">
          {workDays.map((day) => (
            <div
              key={day.id}
              className={`day-tab ${day.id === selectedDayId ? 'active' : ''}`}
              onClick={() => setSelectedDayId(day.id)}
            >
              <span>{day.dayName}</span>
              <button
                type="button"
                className="btn-tab-del"
                title="Hapus hari kerja"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkDay(day.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <hr className="divider" />

        {/* Area To-Do List di dalam Hari Kerja yang Aktif */}
        {activeDay ? (
          <>
            <h2 className="section-title">Tugas Hari: {activeDay.dayName}</h2>

            <form onSubmit={handleAddTodo} className="todo-add-form">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="staff-select"
                required
              >
                <option value="" disabled>
                  -- Pilih Staff --
                </option>
                {staffs.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder={`Tulis tugas untuk ${activeDay.dayName}...`}
                value={newTodoTitle}
                maxLength={200}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                required
              />

              <button type="submit" className="btn-add">
                Tambah
              </button>
            </form>

            {loadingTodos ? (
              <p className="status">Memuat tugas...</p>
            ) : todos.length === 0 ? (
              <p className="status">Belum ada tugas untuk {activeDay.dayName}.</p>
            ) : (
              <ul className="todo-list">
                {todos.map((todo) => (
                  <li key={todo.id} className="todo-item">
                    <label className="todo-left">
                      <input
                        type="checkbox"
                        checked={todo.isCompleted}
                        onChange={() => handleToggleTodo(todo)}
                      />
                      <div className="todo-content">
                        <span className={todo.isCompleted ? 'completed' : ''}>
                          {todo.title}
                        </span>
                        <span className="staff-badge">
                          {todo.staffName ? `PIC: ${todo.staffName}` : 'Tanpa Staff'}
                        </span>
                      </div>
                    </label>
                    <button
                      type="button"
                      className="btn-del"
                      onClick={() => handleDeleteTodo(todo.id)}
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="status">Silakan tambahkan Hari Kerja terlebih dahulu di atas.</p>
        )}
      </div>
    </div>
  );
}