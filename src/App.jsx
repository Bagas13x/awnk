import React, { useEffect, useMemo, useState } from "react";
import awankuVideo from "./assets/awanku.mp4";
import { supabase } from "../lib/supabase";

// ===================== UTIL =====================
const DURATIONS = [
  { label: "Sesuai Tanggal", days: 0 }, // Opsi baru untuk auto-calculate
  { label: "3 Hari", days: 3 },
  { label: "1 Minggu", days: 7 },
  { label: "2 Minggu", days: 14 },
  { label: "3 Minggu", days: 21 },
  { label: "4 Minggu", days: 28 },
  { label: "5 Minggu", days: 35 },
  { label: "1 Bulan", days: 30 },
  { label: "2 Bulan", days: 60 },
  { label: "3 Bulan", days: 90 },
  { label: "4 Bulan", days: 120 },
  { label: "5 Bulan", days: 150 },
  { label: "1 Tahun", days: 365 },
  { label: "2 Tahun", days: 730 },
  { label: "3 Tahun", days: 1095 },
];

// Fungsi untuk menghitung durasi berdasarkan tanggal
function calculateDaysFromDates(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validasi tanggal
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end <= start) return 0;
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function fmtCurrency(n) {
  try { 
    return "Rp " + (n || 0).toLocaleString("id-ID"); 
  } catch { 
    return `Rp ${n || 0}`; 
  }
}

function endDateFrom(startISO, days) {
  const d = new Date(startISO);
  const end = new Date(d.getTime() + days * 24 * 3600 * 1000);
  return end;
}

function secondsLeft(startISO, days) {
  const target = endDateFrom(startISO, days).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((target - now) / 1000));
}

function fmtCountdown(secs) {
  if (secs <= 0) return "Waktu Habis";
  const d = Math.floor(secs / (24 * 3600));
  const h = Math.floor((secs % (24 * 3600)) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${d}h ${h}j ${m}m ${s}s`;
}

// ===================== STORAGE =====================
const LS_KEYS = {
  RENTALS: "rental_dashboard_v2_rentals",
  INFOS: "rental_dashboard_v2_infos",
  LOGGED_IN: "rental_dashboard_v2_logged_in",
};

function loadLS(key, def) {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) return def;
    const parsed = JSON.parse(item);
    return parsed ?? def;
  } catch (error) {
    console.warn(`Error loading from localStorage key "${key}":`, error);
    return def;
  }
}

function saveLS(key, val) {
  try { 
    localStorage.setItem(key, JSON.stringify(val)); 
  } catch (error) {
    console.warn(`Error saving to localStorage key "${key}":`, error);
  }
}

// ===================== UI PRIMS =====================
function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <Card>
      <div className="text-xs sm:text-sm text-gray-500">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{value}</div>
      {sub && <div className="text-[11px] sm:text-xs text-gray-400 mt-1">{sub}</div>}
    </Card>
  );
}

function StatusBadge({ status }) {
  const color = status === "Normal" ? "bg-green-100 text-green-700" : status === "Perbaikan" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${color}`}>{status}</span>;
}

// Add these components to your App.jsx file, right before the export default function App() line

// ===================== COUNTDOWN TABLE =====================
function CountdownTable({ rentals, onChangeStatus, isLoggedIn }) {
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs sm:text-sm text-gray-500">
            <th className="py-2 pr-4">Nama</th>
            <th className="py-2 pr-4">Jenis</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Sisa Waktu</th>
            <th className="py-2 pr-4">Harga</th>
            <th className="py-2 pr-4">Status</th>
            {isLoggedIn && <th className="py-2 pr-4">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => {
            const left = secondsLeft(r.startISO, r.durasiDays);
            return (
              <tr key={r.id} className="border-t">
                <td className="py-2 pr-4 font-medium">{r.nama}</td>
                <td className="py-2 pr-4">{r.jenis}</td>
                <td className="py-2 pr-4 text-xs">{r.gmail || '-'}</td>
                <td className="py-2 pr-4">
                  <div className={`font-mono text-xs ${left <= 0 ? 'text-red-600' : left < 86400 ? 'text-orange-600' : 'text-green-600'}`}>
                    {fmtCountdown(left)}
                  </div>
                </td>
                <td className="py-2 pr-4">{fmtCurrency(r.harga)}</td>
                <td className="py-2 pr-4">
                  <StatusBadge status={r.status} />
                </td>
                {isLoggedIn && (
                  <td className="py-2 pr-4">
                    <select
                      value={r.status}
                      onChange={(e) => onChangeStatus(r.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Perbaikan">Perbaikan</option>
                      <option value="Rusak">Rusak</option>
                      <option value="Waktu Habis">Waktu Habis</option>
                    </select>
                  </td>
                )}
              </tr>
            );
          })}
          {rentals.length === 0 && (
            <tr>
              <td className="py-3 text-gray-400 text-sm text-center" colSpan={isLoggedIn ? 7 : 6}>
                Belum ada data costumer
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ===================== TRANSACTIONS TABLE =====================
function TransactionsTable({ rentals }) {
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'method'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [filterMethod, setFilterMethod] = useState('all'); // 'all', 'Tunai', 'Transfer'

  const filteredAndSorted = useMemo(() => {
    let filtered = rentals.filter(r => 
      filterMethod === 'all' || r.metode === filterMethod
    );

    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.startISO).getTime() - new Date(b.startISO).getTime();
      } else if (sortBy === 'amount') {
        comparison = (a.harga || 0) - (b.harga || 0);
      } else if (sortBy === 'method') {
        comparison = (a.metode || '').localeCompare(b.metode || '');
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [rentals, sortBy, sortOrder, filterMethod]);

  const totalByMethod = useMemo(() => {
    const tunai = rentals.filter(r => r.metode === 'Tunai').reduce((sum, r) => sum + (r.harga || 0), 0);
    const transfer = rentals.filter(r => r.metode === 'Transfer').reduce((sum, r) => sum + (r.harga || 0), 0);
    return { tunai, transfer, total: tunai + transfer };
  }, [rentals]);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-xl">
          <div className="text-sm text-green-600 font-medium">Total Tunai</div>
          <div className="text-xl font-bold text-green-700">{fmtCurrency(totalByMethod.tunai)}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl">
          <div className="text-sm text-blue-600 font-medium">Total Transfer</div>
          <div className="text-xl font-bold text-blue-700">{fmtCurrency(totalByMethod.transfer)}</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-xl">
          <div className="text-sm text-indigo-600 font-medium">Total Keseluruhan</div>
          <div className="text-xl font-bold text-indigo-700">{fmtCurrency(totalByMethod.total)}</div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter:</label>
          <select 
            value={filterMethod} 
            onChange={(e) => setFilterMethod(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">Semua Metode</option>
            <option value="Tunai">Tunai</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Urutkan:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="date">Tanggal</option>
            <option value="amount">Jumlah</option>
            <option value="method">Metode</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs sm:text-sm text-gray-500 bg-gray-50">
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-4">Nama</th>
              <th className="py-3 px-4">Jenis</th>
              <th className="py-3 px-4">Durasi</th>
              <th className="py-3 px-4">Jumlah</th>
              <th className="py-3 px-4">Metode</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="py-3 px-4 text-xs">
                  {new Date(r.startISO).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </td>
                <td className="py-3 px-4 font-medium">{r.nama}</td>
                <td className="py-3 px-4">{r.jenis}</td>
                <td className="py-3 px-4">{r.durasiDays} hari</td>
                <td className="py-3 px-4 font-semibold">{fmtCurrency(r.harga)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    r.metode === 'Transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {r.metode}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
            {filteredAndSorted.length === 0 && (
              <tr>
                <td className="py-4 text-gray-400 text-sm text-center" colSpan={7}>
                  {filterMethod === 'all' ? 'Belum ada transaksi' : `Tidak ada transaksi ${filterMethod}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== ADMIN MANAGER =====================
function AdminManager({ rentals, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      const matchesSearch = !searchTerm || 
        r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.jenis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.gmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [rentals, searchTerm, statusFilter]);

  function startEdit(rental) {
    setEditingId(rental.id);
    setEditForm({
      nama: rental.nama,
      jenis: rental.jenis,
      gmail: rental.gmail,
      harga: rental.harga,
      metode: rental.metode,
      durasiDays: rental.durasiDays,
      status: rental.status
    });
  }

  function saveEdit() {
    if (!editForm.nama?.trim() || !editForm.jenis?.trim()) {
      alert('Nama dan jenis harus diisi!');
      return;
    }

    onUpdate(editingId, {
      nama: editForm.nama.trim(),
      jenis: editForm.jenis.trim(),
      gmail: editForm.gmail.trim(),
      harga: Number(editForm.harga) || 0,
      metode: editForm.metode,
      durasiDays: Number(editForm.durasiDays) || 1,
      status: editForm.status
    });
    
    setEditingId(null);
    setEditForm({});
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  function handleDelete(id, nama) {
    if (window.confirm(`Yakin ingin menghapus data "${nama}"?`)) {
      onDelete(id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold mb-4">Kelola Data Rental</div>
      
      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Cari nama, jenis, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">Semua Status</option>
          <option value="Normal">Normal</option>
          <option value="Perbaikan">Perbaikan</option>
          <option value="Rusak">Rusak</option>
          <option value="Waktu Habis">Waktu Habis</option>
        </select>
      </div>

      <div className="text-sm text-gray-600 mb-2">
        Menampilkan {filteredRentals.length} dari {rentals.length} data
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs sm:text-sm text-gray-500 bg-gray-50">
              <th className="py-3 px-4">Nama</th>
              <th className="py-3 px-4">Jenis</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Harga</th>
              <th className="py-3 px-4">Metode</th>
              <th className="py-3 px-4">Durasi</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredRentals.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                {editingId === r.id ? (
                  // Edit mode
                  <>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={editForm.nama}
                        onChange={(e) => setEditForm(prev => ({...prev, nama: e.target.value}))}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={editForm.jenis}
                        onChange={(e) => setEditForm(prev => ({...prev, jenis: e.target.value}))}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="email"
                        value={editForm.gmail}
                        onChange={(e) => setEditForm(prev => ({...prev, gmail: e.target.value}))}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={editForm.harga}
                        onChange={(e) => setEditForm(prev => ({...prev, harga: e.target.value}))}
                        className="w-full border rounded px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <select
                        value={editForm.metode}
                        onChange={(e) => setEditForm(prev => ({...prev, metode: e.target.value}))}
                        className="w-full border rounded px-2 py-1 text-xs"
                      >
                        <option value="Tunai">Tunai</option>
                        <option value="Transfer">Transfer</option>
                      </select>
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={editForm.durasiDays}
                        onChange={(e) => setEditForm(prev => ({...prev, durasiDays: e.target.value}))}
                        className="w-full border rounded px-2 py-1 text-xs"
                        min="1"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm(prev => ({...prev, status: e.target.value}))}
                        className="w-full border rounded px-2 py-1 text-xs"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Perbaikan">Perbaikan</option>
                        <option value="Rusak">Rusak</option>
                        <option value="Waktu Habis">Waktu Habis</option>
                      </select>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={saveEdit}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                        >
                          ✗
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="py-3 px-4 font-medium">{r.nama}</td>
                    <td className="py-3 px-4">{r.jenis}</td>
                    <td className="py-3 px-4 text-xs">{r.gmail || '-'}</td>
                    <td className="py-3 px-4">{fmtCurrency(r.harga)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        r.metode === 'Transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {r.metode}
                      </span>
                    </td>
                    <td className="py-3 px-4">{r.durasiDays} hari</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(r)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.nama)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredRentals.length === 0 && (
              <tr>
                <td className="py-4 text-gray-400 text-sm text-center" colSpan={8}>
                  {searchTerm || statusFilter !== 'all' ? 'Tidak ada data yang sesuai filter' : 'Belum ada data rental'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================== LOGIN FORM =====================
function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      alert("Username dan password harus diisi!");
      return;
    }

    setIsLoading(true);
    
    // Simulate loading for better UX
    setTimeout(() => {
      onLogin(username.trim(), password.trim());
      setIsLoading(false);
      
      // Clear form only if login failed (onLogin would handle success)
      if (username !== "Bagas" || password !== "9087") {
        setPassword("");
      }
    }, 500);
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="text-lg font-semibold text-gray-800">Login Admin</div>
        <div className="text-sm text-gray-600 mt-1">Masuk untuk akses fitur admin</div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          value={username}
          onChange={setUsername}
          required
          disabled={isLoading}
          placeholder="Masukkan username"
        />
        
        <Input
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          required
          disabled={isLoading}
          placeholder="Masukkan password"
        />
        
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-xl font-medium transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          } text-white`}
        >
          {isLoading ? 'Memverifikasi...' : 'Login'}
        </button>
      </form>
      
      <div className="text-center">
        <div className="text-xs text-gray-500">
          Hubungi admin jika lupa password
        </div>
      </div>
    </div>
  );
}f

// ===================== FORM INPUTS =====================
function Input({ label, value, onChange, type = "text", required = false, min, max, placeholder, ...rest }) {
  // Only pass valid HTML attributes to the input element
  const validInputProps = {};
  
  if (min !== undefined) validInputProps.min = min;
  if (max !== undefined) validInputProps.max = max;
  if (placeholder !== undefined) validInputProps.placeholder = placeholder;
  
  // Filter out any other custom props that shouldn't go to DOM
  Object.keys(rest).forEach(key => {
    // Only allow standard HTML input attributes
    if (['id', 'name', 'disabled', 'readonly', 'maxLength', 'minLength', 'pattern', 'step', 'autoComplete', 'autoFocus'].includes(key)) {
      validInputProps[key] = rest[key];
    }
  });
  
  return (
    <label className="block">
      <div className="text-xs sm:text-sm text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </div>
      <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        required={required}
        {...validInputProps}
        className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm" 
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-xs sm:text-sm text-gray-600 mb-1">{label}</div>
      <select 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))} 
        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {options.map((o) => (
          <option key={o.days} value={o.days}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function SelectSimple({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-xs sm:text-sm text-gray-600 mb-1">{label}</div>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

// ===================== APP =====================
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(loadLS(LS_KEYS.LOGGED_IN, false));

  const [rentals, setRentals] = useState(loadLS(LS_KEYS.RENTALS, []));
  const [infos, setInfos] = useState(loadLS(LS_KEYS.INFOS, []));

  // NEW: toggle sidebar untuk mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // live-tick to refresh countdown
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // persist - dengan error handling
  useEffect(() => {
    try {
      saveLS(LS_KEYS.RENTALS, rentals);
    } catch (error) {
      console.error('Error saving rentals:', error);
    }
  }, [rentals]);
  
  useEffect(() => {
    try {
      saveLS(LS_KEYS.INFOS, infos);
    } catch (error) {
      console.error('Error saving infos:', error);
    }
  }, [infos]);
  
  useEffect(() => {
    try {
      saveLS(LS_KEYS.LOGGED_IN, isLoggedIn);
    } catch (error) {
      console.error('Error saving login status:', error);
    }
  }, [isLoggedIn]);

  // auto-update status -> Waktu Habis
  useEffect(() => {
    try {
      setRentals((prev) => {
        if (!Array.isArray(prev)) return [];
        
        return prev.map((r) => {
          if (!r || typeof r !== 'object') return r;
          
          try {
            const left = secondsLeft(r.startISO, r.durasiDays);
            if (left <= 0 && r.status !== "Waktu Habis") {
              return { ...r, status: "Waktu Habis" };
            }
            return r;
          } catch (error) {
            console.error('Error updating rental status:', error, r);
            return r;
          }
        });
      });
    } catch (error) {
      console.error('Error in auto-update effect:', error);
    }
  }, [tick]);

  const totals = useMemo(() => {
    try {
      if (!Array.isArray(rentals)) return { totalOmset: 0, tunai: 0, transfer: 0, active: 0 };
      
      const totalOmset = rentals.reduce((s, r) => {
        const harga = Number(r?.harga) || 0;
        return s + harga;
      }, 0);
      
      const tunai = rentals
        .filter((r) => r?.metode === "Tunai")
        .reduce((s, r) => s + (Number(r?.harga) || 0), 0);
        
      const transfer = rentals
        .filter((r) => r?.metode === "Transfer")
        .reduce((s, r) => s + (Number(r?.harga) || 0), 0);
        
      const active = rentals.filter((r) => {
        try {
          return r && secondsLeft(r.startISO, r.durasiDays) > 0;
        } catch {
          return false;
        }
      }).length;
      
      return { totalOmset, tunai, transfer, active };
    } catch (error) {
      console.error('Error calculating totals:', error);
      return { totalOmset: 0, tunai: 0, transfer: 0, active: 0 };
    }
  }, [rentals, tick]);

  function addRental(data) {
    try {
      console.log('Adding rental with data:', data);
      
      // Validasi input
      if (!data || !data.nama || !data.jenis) {
        console.error('Invalid rental data:', data);
        alert("Data tidak lengkap. Nama dan jenis wajib diisi.");
        return;
      }

      const r = {
        id: Date.now() + Math.random(), // Lebih unik
        nama: String(data.nama || '').trim(),
        jenis: String(data.jenis || '').trim(),
        gmail: String(data.gmail || '').trim(),
        harga: Number(data.harga) || 0,
        metode: data.metode || "Tunai",
        durasiDays: Number(data.durasiDays) || 7,
        startISO: new Date().toISOString(),
        status: "Normal",
      };

      console.log('Created rental object:', r);

      // Update rentals dengan error handling
      setRentals((prevRentals) => {
        try {
          const newRentals = Array.isArray(prevRentals) ? [r, ...prevRentals] : [r];
          console.log('New rentals array:', newRentals);
          return newRentals;
        } catch (error) {
          console.error('Error updating rentals:', error);
          return [r];
        }
      });

      // Update infos dengan error handling
      setInfos((prevInfos) => {
        try {
          const newInfo = {
            id: Date.now() + Math.random(),
            date: new Date().toLocaleString(),
            text: `Rental baru: ${r.nama} (${r.jenis}) senilai ${fmtCurrency(r.harga)}.`,
            chats: []
          };
          
          const newInfos = Array.isArray(prevInfos) ? [newInfo, ...prevInfos] : [newInfo];
          console.log('New infos array:', newInfos);
          return newInfos;
        } catch (error) {
          console.error('Error updating infos:', error);
          return prevInfos || [];
        }
      });

      console.log('Rental added successfully');
    } catch (error) {
      console.error('Error in addRental function:', error);
      alert("Terjadi kesalahan saat menambah data. Silakan coba lagi.");
    }
  }

  function updateRental(id, patch) {
    try {
      setRentals((list) => {
        if (!Array.isArray(list)) return [];
        return list.map((r) => {
          if (r && r.id === id) {
            return { ...r, ...patch };
          }
          return r;
        });
      });
    } catch (error) {
      console.error('Error updating rental:', error);
    }
  }

  function deleteRental(id) {
    try {
      setRentals((list) => {
        if (!Array.isArray(list)) return [];
        return list.filter((r) => r && r.id !== id);
      });
    } catch (error) {
      console.error('Error deleting rental:', error);
    }
  }

  function addInfo(text) {
    try {
      if (!text || !text.trim()) return;
      
      setInfos((prevInfos) => {
        const newInfo = {
          id: Date.now() + Math.random(),
          date: new Date().toLocaleString(),
          text: text.trim(),
          chats: []
        };
        return Array.isArray(prevInfos) ? [newInfo, ...prevInfos] : [newInfo];
      });
    } catch (error) {
      console.error('Error adding info:', error);
    }
  }

  function addChat(infoId, text) {
    try {
      if (!text || !text.trim()) return;
      
      setInfos((arr) => {
        if (!Array.isArray(arr)) return [];
        
        return arr.map((i) => {
          if (i && i.id === infoId) {
            const newChat = { id: Date.now() + Math.random(), text: text.trim() };
            const newChats = Array.isArray(i.chats) ? [...i.chats, newChat] : [newChat];
            return { ...i, chats: newChats };
          }
          return i;
        });
      });
    } catch (error) {
      console.error('Error adding chat:', error);
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setPage("dashboard");
    setIsSidebarOpen(false);
  }

  function SidebarLink({ id, label, icon, adminOnly = false }) {
    if (adminOnly && !isLoggedIn) return null;
    const active = page === id;
    return (
      <button
        onClick={() => { 
          setPage(id); 
          setIsSidebarOpen(false); 
        }}
        className={`flex items-center gap-3 w-full text-left px-4 py-2 rounded-xl transition ${active ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-sm sm:text-base">{label}</span>
      </button>
    );
  }

  return (
    <div className="h-screen w-full bg-blue-50/60 flex relative">
      {/* MOBILE TOPBAR */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg border active:scale-95"
            onClick={() => setIsSidebarOpen((v) => !v)}
            aria-label="Toggle Sidebar"
          >
            ☰
          </button>
          <div className="text-sm font-semibold text-indigo-700">Awanku Digital</div>
        </div>
        <div className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</div>
      </div>

      {/* SIDEBAR */}
      <aside
        className={`w-64 sm:w-72 bg-white h-full shadow-xl p-5 flex-col gap-4 z-40
        ${isSidebarOpen ? "fixed inset-y-0 left-0 flex" : "hidden sm:flex"}`}
      >
        <div className="flex items-center justify-center mb-2">
          <video
            src={awankuVideo}
            autoPlay
            loop
            muted
            className="h-20 w-20 sm:h-28 sm:w-28 object-cover rounded-xl"
          />
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <SidebarLink id="dashboard" label="Dashboard" icon="☁" />
          <SidebarLink id="countdown" label="Costumer" icon="👥" />
          <SidebarLink id="finance" label="Keuangan" icon="💰" adminOnly />
          <SidebarLink id="input" label="Input Data" icon="➕" adminOnly />
          <SidebarLink id="info" label="Tentang" icon="ℹ️"/>
          <SidebarLink id="admin" label="Admin" icon="⚙️" adminOnly />
        </div>

        <div className="mt-auto">
          {isLoggedIn ? (
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center gap-3">
              <span className="text-lg">🚪</span>
              <span className="font-medium text-sm sm:text-base">Logout</span>
            </button>
          ) : (
            <button onClick={() => { setPage('login'); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center gap-3">
              <span className="text-lg">🔑</span>
              <span className="font-medium text-sm sm:text-base">Login</span>
            </button>
          )}
        </div>
      </aside>

      {/* BACKDROP mobile ketika drawer open */}
      {isSidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* MAIN */}
      <main className={`flex-1 p-4 sm:p-6 overflow-y-auto w-full ${isSidebarOpen ? "pointer-events-none sm:pointer-events-auto" : ""} pt-20 sm:pt-6`}>

        {page === "dashboard" && (
          <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
              <div className="text-xs sm:text-sm text-gray-500">{new Date().toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Stat label="Total Omset" value={fmtCurrency(totals.totalOmset)} sub="" />
              <Stat label="Tunai" value={fmtCurrency(totals.tunai)} sub="" />
              <Stat label="Transfer" value={fmtCurrency(totals.transfer)} sub="" />
              <Stat label="Aktif Berjalan" value={`${totals.active}`} sub="" />
            </div>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="text-base sm:text-lg font-semibold">Data Costumer</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs sm:text-sm text-gray-500">
                      <th className="py-2 pr-4">Nama</th>
                      <th className="py-2 pr-4">Jenis</th>
                      <th className="py-2 pr-4">Durasi</th>
                      <th className="py-2 pr-4">Harga</th>
                      <th className="py-2 pr-4">Metode</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(rentals) && rentals.slice(0, 6).map((r) => (
                      <tr key={r?.id || Math.random()} className="border-t">
                        <td className="py-2 pr-4">{r?.nama || '-'}</td>
                        <td className="py-2 pr-4">{r?.jenis || '-'}</td>
                        <td className="py-2 pr-4">{r?.durasiDays || 0} hari</td>
                        <td className="py-2 pr-4">{fmtCurrency(r?.harga)}</td>
                        <td className="py-2 pr-4">{r?.metode || '-'}</td>
                        <td className="py-2"><StatusBadge status={r?.status || 'Normal'} /></td>
                      </tr>
                    ))}
                    {(!Array.isArray(rentals) || rentals.length === 0) && (
                      <tr>
                        <td className="py-3 text-gray-400 text-sm" colSpan={6}>Belum ada Data Costumer :c</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {page === "input" && isLoggedIn && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold mb-4">Input Data Rental</h1>
            <Card>
              <RentalForm onSubmit={addRental} />
            </Card>
          </div>
        )}

        {page === "countdown" && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold">Waktu Durasi Costumer</h1>
            <Card>
              <CountdownTable 
                rentals={Array.isArray(rentals) ? rentals : []} 
                onChangeStatus={(id, s) => updateRental(id, { status: s })} 
                isLoggedIn={isLoggedIn} 
              />
            </Card>
          </div>
        )}

        {page === "finance" && isLoggedIn && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold">Keuangan</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat label="Total Omset" value={fmtCurrency(totals.totalOmset)} />
              <Stat label="Tunai" value={fmtCurrency(totals.tunai)} />
              <Stat label="Transfer" value={fmtCurrency(totals.transfer)} />
            </div>
            <Card>
              <TransactionsTable rentals={Array.isArray(rentals) ? rentals : []} />
            </Card>
          </div>
        )}

        {page === "info" && (
          <TentangAwanku 
            isLoggedIn={isLoggedIn} 
            katalog={Array.isArray(infos?.katalog) ? infos.katalog : []} 
            onAddProduk={(p) => setInfos((prev) => ({ 
              ...prev, 
              katalog: Array.isArray(prev?.katalog) ? [...prev.katalog, p] : [p] 
            }))} 
          />
        )}

        {page === "admin" && isLoggedIn && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold">Admin Panel</h1>
            <Card>
               <AdminManager 
        rentals={Array.isArray(rentals) ? rentals : []} 
        onUpdate={updateRental} 
        onDelete={deleteRental} 
      />
    </Card>
  </div>
)}

{page === 'login' && !isLoggedIn && (
  <div className="max-w-md mx-auto mt-8 sm:mt-20">
    <h1 className="text-xl sm:text-2xl font-bold mb-4">Login Admin</h1>
    <Card>
      <LoginForm onLogin={(user, pass) => {
        if (user === "Bagas" && pass === "9087") {
          setIsLoggedIn(true);
          setPage("dashboard");
        } else {
          alert("Username atau password salah.");
        }
      }} />
    </Card>
  </div>
)}

{/* Halaman yang membutuhkan login tapi user belum login */}
{((page === 'input' || page === 'admin' || page === 'finance') && !isLoggedIn) && (
  <div className="text-center mt-16 sm:mt-20">
    <h1 className="text-xl sm:text-2xl font-bold">Akses Ditolak</h1>
    <p className="text-gray-600 mt-2 text-sm sm:text-base">Kamu harus login untuk mengakses halaman ini ya</p>
    <button onClick={() => setPage('login')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Login</button>
  </div>
)}
      </main>
    </div>
  );
}

// ===================== PAGES & WIDGETS =====================

// ===================== TENTANG AWANKU PAGE =====================
function TentangAwanku({ isLoggedIn, katalog, onAddProduk }) {
  return (
    <div className="bg-white min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-10">
      <video
        src={awankuVideo}
        className="w-full max-w-md mx-auto rounded-2xl object-cover h-48 sm:h-64 lg:h-80"
        autoPlay
        loop
        muted
      />

      <section className="max-w-4xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-black-700 mb-4 text-center">
          AWANKU
        </h2>

        <p className="text-sm text-gray-700 text-justify mb-6">
          Tempatnya buat kamu yang butuh semua layanan digital, Kita jual akun premium <strong>Netflix, CapCut, YouTube Music, Spotify</strong>, plus layanan digital lain sesuai kebutuhan kamu. Semua 100% original, jadi aman dan terpercaya.
        </p>

        <p className="text-sm text-gray-700 text-justify mb-6">
          Gak cuma akun premium, kita juga nyediain <strong>jasa bikin template</strong> mulai dari poster, presentasi (PPT), sampai desain siap pakai. Buat yang pengen tampil beda, ada juga <strong>template PPT 3D lengkap sama animasinya</strong>.
        </p>

        <p className="text-sm text-gray-700 text-justify mb-6">
          Buat yang mau belajar, kita buka juga <strong>kelas online Bot WhatsApp</strong> dari nol sampai bisa jalan sendiri. Semua dibuat supaya gampang dipahami, gak ribet, dan bisa langsung dipraktikkin.
        </p>

        <div className="text-sm text-gray-700 text-justify mb-6">
          <p className="mb-2">Sistem pembelian? Gampang banget:</p>
          <ul className="list-disc list-inside mt-2">
            <li><strong>Akun premium</strong> via WhatsApp, langsung chat, cepat dan jelas.</li>
            <li><strong>Jasa Template & Kelas Online</strong> via website, pakai sistem pembayaran otomatis. Produk atau akses langsung dikirim setelah bayar.</li>
          </ul>
        </div>

        <p className="text-sm text-gray-700 text-justify mb-6">
          Jadi, kalau mau layanan digital yang <strong>cepat, aman, dan kualitas oke</strong>, AWANKU jawabannya.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <a
            href="https://drive.google.com/file/d/1vOCQTF01H8t9Lqf2SfvFDujzKMPPxtgx/view?usp=drivesdk"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-200/90 hover:bg-blue-500/50 transition p-4 rounded-xl text-center font-medium text-white"
          >
            Proposal
          </a>

          <a
            href="https://lynk.id/Daycohere"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-200/90 hover:bg-green-500/50 transition p-4 rounded-xl text-center font-medium text-white"
          >
            Kelas & Jasa Template
          </a>
        </div>
      </section>
    </div>
  );
}

// ===================== RENTAL FORM =====================
function RentalForm({ onSubmit }) {
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState("");
  const [gmail, setGmail] = useState("");
  const [durasiDays, setDurasiDays] = useState(7);
  const [harga, setHarga] = useState("");
  const [metode, setMetode] = useState("Tunai");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");

  // Auto-calculate durasi ketika tanggal berubah atau durasi dipilih "Sesuai Tanggal"
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [isDurasiFromDate, setIsDurasiFromDate] = useState(false);

  // Effect untuk auto-calculate durasi dari tanggal
  useEffect(() => {
    if (tanggalMulai && tanggalAkhir) {
      const days = calculateDaysFromDates(tanggalMulai, tanggalAkhir);
      setCalculatedDays(days);
      
      // Jika durasi dipilih "Sesuai Tanggal" (value 0), update durasiDays
      if (durasiDays === 0) {
        setIsDurasiFromDate(true);
      }
    } else {
      setCalculatedDays(0);
      if (isDurasiFromDate && durasiDays === 0) {
        setDurasiDays(7); // Reset ke default jika tanggal dihapus
        setIsDurasiFromDate(false);
      }
    }
  }, [tanggalMulai, tanggalAkhir, durasiDays, isDurasiFromDate]);

  // Handle perubahan durasi
  function handleDurasiChange(days) {
    setDurasiDays(days);
    if (days === 0) {
      setIsDurasiFromDate(true);
    } else {
      setIsDurasiFromDate(false);
    }
  }

  // Handle perubahan tanggal mulai
  function handleTanggalMulaiChange(date) {
    setTanggalMulai(date);
    
    // Auto-set tanggal akhir jika durasi sudah dipilih (kecuali "Sesuai Tanggal")
    if (date && durasiDays > 0) {
      const startDate = new Date(date);
      const endDate = new Date(startDate.getTime() + durasiDays * 24 * 60 * 60 * 1000);
      setTanggalAkhir(endDate.toISOString().split('T')[0]);
    }
  }

  // Handle perubahan tanggal akhir
  function handleTanggalAkhirChange(date) {
    setTanggalAkhir(date);
    
    // Validasi tanggal akhir tidak boleh lebih kecil dari tanggal mulai
    if (tanggalMulai && date && new Date(date) <= new Date(tanggalMulai)) {
      alert("Tanggal akhir harus lebih besar dari tanggal mulai!");
      return;
    }
  }

  // Mendapatkan durasi final untuk submit
  function getFinalDurasi() {
    if (durasiDays === 0 && calculatedDays > 0) {
      return calculatedDays;
    }
    return durasiDays;
  }

  function submit(e) {
    e.preventDefault();
    
    if (!nama.trim() || !jenis.trim() || !harga) {
      alert("Nama, jenis, dan harga wajib diisi!");
      return;
    }

    const finalDurasi = getFinalDurasi();
    if (finalDurasi <= 0) {
      alert("Durasi harus lebih dari 0 hari!");
      return;
    }

    const formData = {
      nama: nama.trim(),
      jenis: jenis.trim(),
      gmail: gmail.trim(),
      durasiDays: finalDurasi,
      harga: Number(harga),
      metode,
      tanggalMulai: tanggalMulai || null,
      tanggalAkhir: tanggalAkhir || null
    };

    console.log('Submitting form data:', formData);
    onSubmit(formData);
    
    // Reset form
    setNama("");
    setJenis("");
    setGmail("");
    setDurasiDays(7);
    setHarga("");
    setMetode("Tunai");
    setTanggalMulai("");
    setTanggalAkhir("");
    setCalculatedDays(0);
    setIsDurasiFromDate(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Nama Penyewa *" value={nama} onChange={setNama} required />
        <Input label="Jenis Barang *" value={jenis} onChange={setJenis} required />
      </div>
      <Input label="Email (opsional)" value={gmail} onChange={setGmail} type="email" />
      
      {/* Durasi dengan info tambahan */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Select 
            label="Durasi *" 
            value={durasiDays} 
            onChange={handleDurasiChange} 
            options={DURATIONS} 
          />
          {durasiDays === 0 && calculatedDays > 0 && (
            <div className="text-xs text-blue-600 mt-1">
              Durasi: {calculatedDays} hari (dari tanggal)
            </div>
          )}
          {durasiDays === 0 && calculatedDays === 0 && (
            <div className="text-xs text-orange-600 mt-1">
              Pilih tanggal mulai & akhir
            </div>
          )}
        </div>
        
        <Input label="Harga Sewa *" value={harga} onChange={setHarga} type="number" min="0" required />
        <SelectSimple label="Metode Pembayaran" value={metode} onChange={setMetode} options={["Tunai","Transfer"]} />
      </div>
      
      {/* Tanggal dengan auto-calculation */}
      <div className="grid md:grid-cols-2 gap-4">
        <Input 
          label="Tanggal Mulai" 
          value={tanggalMulai} 
          onChange={handleTanggalMulaiChange} 
          type="date" 
        />
        <Input 
          label="Tanggal Akhir" 
          value={tanggalAkhir} 
          onChange={handleTanggalAkhirChange} 
          type="date" 
        />
      </div>
      
      {/* Info durasi dari tanggal */}
      {tanggalMulai && tanggalAkhir && calculatedDays > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="text-sm text-blue-800">
            <strong>Info Durasi:</strong>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Dari {new Date(tanggalMulai).toLocaleDateString('id-ID')} sampai {new Date(tanggalAkhir).toLocaleDateString('id-ID')} = <strong>{calculatedDays} hari</strong>
            {durasiDays === 0 && (
              <span className="text-blue-600"> (Digunakan sebagai durasi)</span>
            )}
          </div>
        </div>
      )}
      
      <div className="flex gap-3 flex-wrap">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
          Simpan Data
        </button>
        <button
          type="button"
          onClick={() => {
            setNama(""); setJenis(""); setGmail(""); setDurasiDays(7);
            setHarga(""); setMetode("Tunai"); setTanggalMulai(""); setTanggalAkhir("");
            setCalculatedDays(0); setIsDurasiFromDate(false);
          }}
          className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200"
        >
          Reset
        </button>
      </div>
    </form>
  );
}