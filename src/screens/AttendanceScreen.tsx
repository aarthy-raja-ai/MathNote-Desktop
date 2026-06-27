import React, { useState, useMemo } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context';
import { Attendance } from '../utils/storage';

const STATUS_CONFIG: Record<Attendance['status'], { label: string; color: string; icon: React.ReactNode }> = {
    present: { label: 'P', color: 'var(--color-success)', icon: <CheckCircle size={14} /> },
    absent: { label: 'A', color: 'var(--color-error)', icon: <XCircle size={14} /> },
    'half-day': { label: 'H', color: 'var(--color-warning)', icon: <Clock size={14} /> },
    late: { label: 'L', color: '#f59e0b', icon: <Clock size={14} /> },
    leave: { label: 'V', color: '#8b5cf6', icon: <Clock size={14} /> },
};

const AttendanceScreen: React.FC = () => {
    const { state, markAttendance, deleteAttendance } = useApp();

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'mark' | 'report'>('mark');

    // Get staff users
    const staffUsers = useMemo(() => {
        return state.contacts.filter(c => c.type === 'staff' || c.type === 'employee');
    }, [state.contacts]);

    // All users from app users list (people with roles)
    const appUsers = useMemo(() => {
        const users = JSON.parse(localStorage.getItem('@mathnote_users') || '[]') as Array<{ id: string; name: string; role: string }>;
        return users.filter(u => u.role !== 'owner');
    }, []);

    const allStaff = useMemo(() => {
        const combined: Array<{ id: string; name: string; source: string }> = [];
        appUsers.forEach(u => combined.push({ id: u.id, name: u.name, source: 'user' }));
        staffUsers.forEach(c => {
            if (!combined.find(x => x.name.toLowerCase() === c.name.toLowerCase())) {
                combined.push({ id: c.id, name: c.name, source: 'contact' });
            }
        });
        return combined;
    }, [appUsers, staffUsers]);

    // Today's attendance records
    const todayRecords = useMemo(() => {
        return state.attendance.filter(a => a.date === selectedDate);
    }, [state.attendance, selectedDate]);

    const getStatus = (staffId: string): Attendance['status'] | null => {
        const record = todayRecords.find(r => r.staffId === staffId);
        return record?.status || null;
    };

    const handleMark = async (staffId: string, staffName: string, status: Attendance['status']) => {
        await markAttendance([{ staffId, staffName, date: selectedDate, status }]);
    };

    // Shift date
    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // Monthly report data
    const currentMonth = selectedDate.substring(0, 7); // YYYY-MM
    const monthRecords = useMemo(() => {
        return state.attendance.filter(a => a.date.startsWith(currentMonth));
    }, [state.attendance, currentMonth]);

    const monthStats = useMemo(() => {
        const stats: Record<string, { present: number; absent: number; halfDay: number; late: number; name: string }> = {};
        monthRecords.forEach(r => {
            if (!stats[r.staffId]) stats[r.staffId] = { present: 0, absent: 0, halfDay: 0, late: 0, name: r.staffName };
            if (r.status === 'present') stats[r.staffId].present++;
            else if (r.status === 'absent') stats[r.staffId].absent++;
            else if (r.status === 'half-day') stats[r.staffId].halfDay++;
            else if (r.status === 'late') stats[r.staffId].late++;
        });
        return stats;
    }, [monthRecords]);

    const todaySummary = {
        total: allStaff.length,
        present: todayRecords.filter(r => r.status === 'present').length,
        absent: todayRecords.filter(r => r.status === 'absent').length,
        halfDay: todayRecords.filter(r => r.status === 'half-day').length,
        late: todayRecords.filter(r => r.status === 'late').length,
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <div>
                    <h1>Staff Attendance</h1>
                    <p>{allStaff.length} staff members</p>
                </div>
                <div className="flex gap-xs">
                    <button className={`chip ${activeTab === 'mark' ? 'active' : ''}`} onClick={() => setActiveTab('mark')}>Daily Mark</button>
                    <button className={`chip ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>Monthly Report</button>
                </div>
            </div>

            {activeTab === 'mark' && (
                <>
                    {/* Date Picker */}
                    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', marginBottom: '1rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => shiftDate(-1)}><ChevronLeft size={18} /></button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Calendar size={18} />
                            <input type="date" className="form-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: 150, fontWeight: 600 }} />
                            {selectedDate === new Date().toISOString().split('T')[0] && (
                                <span className="badge badge-primary">Today</span>
                            )}
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => shiftDate(1)}><ChevronRight size={18} /></button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-4" style={{ marginBottom: '1rem' }}>
                        {[
                            { label: 'Total', value: todaySummary.total, color: 'var(--color-text)' },
                            { label: 'Present', value: todaySummary.present, color: 'var(--color-success)' },
                            { label: 'Absent', value: todaySummary.absent, color: 'var(--color-error)' },
                            { label: 'Half Day/Late', value: todaySummary.halfDay + todaySummary.late, color: 'var(--color-warning)' },
                        ].map(s => (
                            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Staff List */}
                    {allStaff.length > 0 ? (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Staff Name</th><th style={{ textAlign: 'center' }}>Present</th><th style={{ textAlign: 'center' }}>Absent</th><th style={{ textAlign: 'center' }}>Half Day</th><th style={{ textAlign: 'center' }}>Late</th><th style={{ textAlign: 'center' }}>Status</th></tr>
                                </thead>
                                <tbody>
                                    {allStaff.map(staff => {
                                        const currentStatus = getStatus(staff.id);
                                        return (
                                            <tr key={staff.id}>
                                                <td style={{ fontWeight: 500 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.8rem' }}>
                                                            {staff.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        {staff.name}
                                                    </div>
                                                </td>
                                                {(['present', 'absent', 'half-day', 'late'] as Attendance['status'][]).map(status => (
                                                    <td key={status} style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleMark(staff.id, staff.name, status)}
                                                            style={{
                                                                width: 36, height: 36, borderRadius: '50%', border: '2px solid',
                                                                borderColor: currentStatus === status ? STATUS_CONFIG[status].color : 'var(--color-border)',
                                                                background: currentStatus === status ? STATUS_CONFIG[status].color + '20' : 'transparent',
                                                                color: currentStatus === status ? STATUS_CONFIG[status].color : 'var(--color-text-muted)',
                                                                cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            {STATUS_CONFIG[status].label}
                                                        </button>
                                                    </td>
                                                ))}
                                                <td style={{ textAlign: 'center' }}>
                                                    {currentStatus ? (
                                                        <span className="badge" style={{ background: STATUS_CONFIG[currentStatus].color + '20', color: STATUS_CONFIG[currentStatus].color }}>
                                                            {currentStatus}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Not marked</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <Users size={48} />
                                <h3>No staff members found</h3>
                                <p>Add contacts with type "staff" or "employee" in the Contacts screen, or add users with Manager/Staff roles in User Management</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'report' && (
                <>
                    <div className="card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 20px', marginBottom: '1rem', gap: 12 }}>
                        <Calendar size={18} />
                        <input type="month" className="form-input" value={currentMonth} onChange={e => setSelectedDate(e.target.value + '-01')} style={{ width: 180, fontWeight: 600 }} />
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        {Object.keys(monthStats).length > 0 ? (
                            <table className="data-table">
                                <thead>
                                    <tr><th>Staff</th><th style={{ textAlign: 'center' }}>Present</th><th style={{ textAlign: 'center' }}>Absent</th><th style={{ textAlign: 'center' }}>Half Day</th><th style={{ textAlign: 'center' }}>Late</th><th style={{ textAlign: 'center' }}>Total Days</th></tr>
                                </thead>
                                <tbody>
                                    {Object.entries(monthStats).map(([id, s]) => (
                                        <tr key={id}>
                                            <td style={{ fontWeight: 500 }}>{s.name}</td>
                                            <td style={{ textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>{s.present}</td>
                                            <td style={{ textAlign: 'center', color: 'var(--color-error)', fontWeight: 600 }}>{s.absent}</td>
                                            <td style={{ textAlign: 'center', color: 'var(--color-warning)', fontWeight: 600 }}>{s.halfDay}</td>
                                            <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 600 }}>{s.late}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.present + s.absent + s.halfDay + s.late}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state"><Calendar size={48} /><h3>No attendance records</h3><p>No records for {currentMonth}</p></div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AttendanceScreen;
