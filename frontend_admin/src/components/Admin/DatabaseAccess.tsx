import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { adminAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import CustomSelect from '../UI/CustomSelect';

// Define interfaces
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: string;
  status: string;
  isCheckedIn: boolean;
  checkInTime?: string;
  referral?: string;
}

interface Ticket {
  id: string;
  userId: string;
  holderName: string;
  status: string;
  type: string;
  qrCodeData?: string;
  createdAt: string;
  isCheckedIn?: boolean;
  checkInTime?: string;
}

export default function DatabaseAccess() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'tickets'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterConfig, setFilterConfig] = useState({
    status: 'All', // All, Verified, Pending, Checked In, Not Checked In
    searchField: 'All' // All, Name, Email, ID
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt', // createdAt, name
    direction: 'desc' // desc, asc
  });
  const [showFilters, setShowFilters] = useState(false);

  // Helper to format date with suffix
  const formatDateWithSuffix = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();

    const getSuffix = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1:  return 'st';
        case 2:  return 'nd';
        case 3:  return 'rd';
        default: return 'th';
      }
    };

    return `${day}${getSuffix(day)} ${month} ${year}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const token = await getToken();
        if (!token) throw new Error('No authentication token found');

        const response = await adminAPI.getAllTickets(token);
        const allTickets = response.data.tickets || [];

        // Process Tickets
        const formattedTickets: Ticket[] = allTickets.map((t: any) => ({
          id: t._id,
          userId: t.holderEmail, 
          holderName: t.holderName,
          status: t.status,
          type: 'General', 
          qrCodeData: t.qrCodeData,
          createdAt: t.createdAt,
          isCheckedIn: t.isCheckedIn,
          checkInTime: t.checkInTime
        }));

        setTickets(formattedTickets);

        // Process Users - One user per email
        const userMap = new Map<string, User>();
        allTickets.forEach((t: any) => {
          if (!userMap.has(t.holderEmail)) {
            userMap.set(t.holderEmail, {
              id: t.holderEmail,
              name: t.holderName,
              email: t.holderEmail,
              phone: t.holderPhone,
              gender: t.holderGender,
              dob: t.holderDob ? formatDateWithSuffix(t.holderDob) : '',
              status: t.status,
              isCheckedIn: t.isCheckedIn,
              checkInTime: t.checkInTime ? new Date(t.checkInTime).toLocaleString() : '',
              referral: t.holderReferralSource
            });
          }
        });

        setUsers(Array.from(userMap.values()));

      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load database records. ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken]);

  // Filtering & Sorting Logic
  const processData = (data: any[], type: 'users' | 'tickets') => {
    let result = [...data];

    // 1. Filter by Status
    if (filterConfig.status !== 'All') {
      if (filterConfig.status === 'Checked In') {
        result = result.filter(item => item.isCheckedIn);
      } else if (filterConfig.status === 'Not Checked In') {
        result = result.filter(item => !item.isCheckedIn);
      } else {
        result = result.filter(item => item.status?.toLowerCase() === filterConfig.status.toLowerCase());
      }
    }

    // 2. Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        if (type === 'users') {
          const matchName = (item.name?.toLowerCase() || '').includes(q);
          const matchEmail = (item.email?.toLowerCase() || '').includes(q);
          const matchPhone = (item.phone || '').includes(q);
          
          if (filterConfig.searchField === 'Name') return matchName;
          if (filterConfig.searchField === 'Email') return matchEmail;
          return matchName || matchEmail || matchPhone;
        } else {
          const matchName = (item.holderName?.toLowerCase() || '').includes(q);
          const matchEmail = (item.userId?.toLowerCase() || '').includes(q);
          const matchId = (item.id?.toLowerCase() || '').includes(q);

          if (filterConfig.searchField === 'Name') return matchName;
          if (filterConfig.searchField === 'Email') return matchEmail;
          if (filterConfig.searchField === 'ID') return matchId;
          return matchName || matchEmail || matchId;
        }
      });
    }

    // 3. Sorting
    result.sort((a, b) => {
      let valA, valB;

      if (sortConfig.key === 'name') {
        valA = type === 'users' ? a.name : a.holderName;
        valB = type === 'users' ? b.name : b.holderName;
      } else {
        // createdAt logic needs 'createdAt' field or fallback
        // Users don't natively have createdAt in interface shown, assuming sorting users by name mainly or adding logic
        // For consistency, let's sort users by Name or fallback
        if(type === 'users') {
             // If sorting users by date, we might need a field like initial fetch index or similar if not present.
             // Actually User interface doesn't have createdAt. Let's use Name for users when date is selected?
             // Or rely on original order (which is usually time based from DB).
             // Let's stick to Name for users if Date selected, or maybe just Name.
             // Actually, tickets have createdAt. Users we derived.
             valA = a.name; valB = b.name; 
        } else {
             valA = new Date(a.createdAt).getTime();
             valB = new Date(b.createdAt).getTime();
        }
      }

      // Override for explicitly 'name' sorting
      if (sortConfig.key === 'name') {
         valA = (valA || '').toLowerCase();
         valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  };

  const filteredUsers = processData(users, 'users');
  const filteredTickets = processData(tickets, 'tickets');

  // Download Logic
  const downloadJSON = () => {
    const data = activeTab === 'users' ? filteredUsers : filteredTickets;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compex_${activeTab}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const data = activeTab === 'users' ? filteredUsers : filteredTickets;
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compex_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const data = activeTab === 'users' ? filteredUsers : filteredTickets;
    if (data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'users' ? 'Users' : 'Tickets');
    
    // Auto-width columns
    const cols = Object.keys(data[0] || {}).map(key => {
        const maxContentLength = data.reduce((w, r: any) => Math.max(w, String(r[key] || '').length), 10);
        const headerLength = key.length;
        return { wch: Math.max(maxContentLength, headerLength) + 2 };
    });
    worksheet['!cols'] = cols;

    XLSX.writeFile(workbook, `compex_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ padding: '2rem', color: 'white', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontFamily: 'Orbitron, sans-serif', margin: 0 }}>Database Access</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={downloadJSON} style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid #a5b4fc', borderRadius: '8px', cursor: 'pointer' }}>
            Download JSON
          </button>
          <button onClick={downloadCSV} style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '8px', cursor: 'pointer' }}>
            Download CSV
          </button>
          <button onClick={downloadExcel} style={{ padding: '8px 16px', background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid #facc15', borderRadius: '8px', cursor: 'pointer' }}>
            Download Excel
          </button>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '1.5rem', 
        flexWrap: 'wrap', 
        gap: '1rem',
        background: 'rgba(255,255,255,0.05)',
        padding: '1rem',
        borderRadius: '12px'
      }}>
        {/* Left Side: Tabs */}
        <div>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '4px' }}>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '8px 16px',
                background: activeTab === 'users' ? '#a5b4fc' : 'transparent',
                color: activeTab === 'users' ? '#1e1b4b' : '#aaa',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              style={{
                 padding: '8px 16px',
                 background: activeTab === 'tickets' ? '#a5b4fc' : 'transparent',
                 color: activeTab === 'tickets' ? '#1e1b4b' : '#aaa',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                 transition: 'all 0.2s'
              }}
            >
              Tickets
            </button>
          </div>
        </div>

        {/* Right Side: Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: showFilters ? 'rgba(165, 180, 252, 0.2)' : 'rgba(255,255,255,0.1)',
            color: showFilters ? '#a5b4fc' : 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filters
        </button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap', 
          background: 'rgba(0,0,0,0.4)', 
          padding: '1rem', 
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <CustomSelect
              label="Status"
              value={filterConfig.status}
              onChange={(val) => setFilterConfig({ ...filterConfig, status: val })}
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'Verified', label: 'Verified' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Checked In', label: 'Checked In' },
                { value: 'Not Checked In', label: 'Not Checked In' }
              ]}
              minWidth="160px"
            />
          </div>

           {/* Sort Filter */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
             <CustomSelect
              label="Sort By"
              value={`${sortConfig.key}-${sortConfig.direction}`}
              onChange={(val) => {
                const [key, direction] = val.split('-');
                setSortConfig({ key, direction });
              }}
              options={[
                { value: 'createdAt-desc', label: 'Newest First' },
                { value: 'createdAt-asc', label: 'Oldest First' },
                { value: 'name-asc', label: 'Name (A-Z)' },
                { value: 'name-desc', label: 'Name (Z-A)' }
              ]}
              minWidth="160px"
            />
          </div>

          {/* Search Field */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <CustomSelect
              label="Search Field"
              value={filterConfig.searchField}
              onChange={(val) => setFilterConfig({ ...filterConfig, searchField: val })}
              options={[
                { value: 'All', label: 'All Fields' },
                { value: 'Name', label: 'Name' },
                { value: 'Email', label: 'Email' },
                ...(activeTab === 'tickets' ? [{ value: 'ID', label: 'Ticket ID' }] : [])
              ]}
              minWidth="140px"
            />
          </div>
            
          {/* Search Input */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Search Query</label>
             <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}


      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading records...</div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0 }}>
                    <tr>
                        {activeTab === 'users' ? (
                            <>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Phone</th>
                                <th style={{ padding: '1rem' }}>Gender</th>
                                <th style={{ padding: '1rem' }}>DOB</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Checked In</th>
                            </>
                        ) : (
                             <>
                                <th style={{ padding: '1rem' }}>Holder</th>
                                <th style={{ padding: '1rem' }}>Type</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Created At</th>
                                <th style={{ padding: '1rem' }}>Checked In At</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {activeTab === 'users' ? (
                        filteredUsers.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <td style={{ padding: '1rem' }}>{user.name}</td>
                                <td style={{ padding: '1rem' }}>{user.email}</td>
                                <td style={{ padding: '1rem' }}>{user.phone || '-'}</td>
                                <td style={{ padding: '1rem' }}>{user.gender || '-'}</td>
                                <td style={{ padding: '1rem' }}>{user.dob || '-'}</td>
                                <td style={{ padding: '1rem' }}>
                                  <span style={{ 
                                    padding: '4px 8px', 
                                    borderRadius: '4px',
                                    background: user.status === 'VERIFIED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                    color: user.status === 'VERIFIED' ? '#4ade80' : '#facc15'
                                  }}>
                                    {user.status}
                                  </span>
                                </td>
                                <td style={{ padding: '1rem' }}>{user.isCheckedIn ? '✅' : '❌'}</td>
                            </tr>
                        ))
                    ) : (
                         filteredTickets.map(ticket => (
                            <tr key={ticket.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div>{ticket.holderName}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{ticket.userId}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>{ticket.type}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ 
                                        padding: '4px 8px', 
                                        borderRadius: '4px',
                                        background: ticket.status === 'confirmed' || ticket.status === 'verified' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                        color: ticket.status === 'confirmed' || ticket.status === 'verified' ? '#4ade80' : '#facc15'
                                    }}>
                                        {ticket.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                    {new Date(ticket.createdAt).toLocaleString()}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.9rem', color: ticket.checkInTime ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                                    {ticket.isCheckedIn && ticket.checkInTime 
                                      ? new Date(ticket.checkInTime).toLocaleString() 
                                      : 'Not Checked In'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            {(activeTab === 'users' && filteredUsers.length === 0) || (activeTab === 'tickets' && filteredTickets.length === 0) ? (
                 <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>No records found</div>
            ) : null}
        </div>
      )}
    </div>
  );
}
