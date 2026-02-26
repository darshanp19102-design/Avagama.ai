import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import api from '../api/client';

export default function MyEvaluationsPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [activeTab, setActiveTab] = useState('All');
  const navigate = useNavigate();

  const loadData = () => {
    api.get('/api/evaluations').then((r) => setRows(r.data));
  };

  useEffect(() => { loadData(); }, []);

  const toggleSelection = (e, id) => {
    e.stopPropagation();
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const setShortlistStatus = async (status, ids) => {
    await api.put('/api/evaluations/shortlist', { evaluation_ids: ids, shortlist_status: status });
    setSelected(new Set());
    loadData();
  };

  const handleBulkShortlist = (status) => {
    if (selected.size === 0) return;
    setShortlistStatus(status, Array.from(selected));
  };

  const handleSingleShortlist = (e, id, currentStatus) => {
    e.stopPropagation();
    setShortlistStatus(!currentStatus, [id]);
  };

  const displayedRows = rows.filter(r => activeTab === 'All' || (activeTab === 'Shortlisted' && r.is_shortlisted));

  return <div><TopNav /><main className='page'>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h1>My Evaluations</h1>
      {selected.size > 0 && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handleBulkShortlist(true)} style={{ padding: '6px 12px' }}>Shortlist Selected</button>
          <button onClick={() => handleBulkShortlist(false)} style={{ padding: '6px 12px', background: '#e0e0e0', color: '#333' }}>Remove Shortlist</button>
        </div>
      )}
    </div>

    <div className='tabs' style={{ width: '300px' }}>
      <button className={activeTab === 'All' ? 'active' : ''} onClick={() => setActiveTab('All')}>All</button>
      <button className={activeTab === 'Shortlisted' ? 'active' : ''} onClick={() => setActiveTab('Shortlisted')}>Shortlisted</button>
    </div>

    <table><thead><tr><th></th><th>Process</th><th>Date</th><th>Automation score</th><th>Feasibility score</th><th>Fitment</th><th>Status</th><th>Shortlisted</th></tr></thead>
      <tbody>{displayedRows.map(r => <tr key={r.id} onClick={() => navigate(`/results/${r.id}`)}>
        <td onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={selected.has(r.id)} onChange={(e) => toggleSelection(e, r.id)} />
        </td>
        <td>{r.process_name}</td><td>{new Date(r.created_at).toLocaleString()}</td><td>{String(r.automation_score ?? '-')}</td><td>{String(r.feasibility_score ?? '-')}</td><td>{String(r.fitment ?? '-')}</td><td>{r.status}</td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{r.is_shortlisted ? 'Yes' : 'No'}</span>
            <button
              onClick={(e) => handleSingleShortlist(e, r.id, r.is_shortlisted)}
              style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', color: '#9b5ba8', border: '1px solid #9b5ba8' }}
            >
              {r.is_shortlisted ? 'Unshortlist' : 'Shortlist'}
            </button>
          </div>
        </td>
      </tr>)}</tbody></table>
  </main></div>;
}
