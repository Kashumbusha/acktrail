import { useEffect, useState } from 'react';
import { platformAPI } from '../api/client';

export default function PlatformDashboard() {
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    platformAPI.stats().then(res => setStats(res.data)).catch(()=>{});
  }, []);

  useEffect(() => {
    platformAPI.workspaces({ search }).then(res => setRows(res.data.workspaces || [])).catch(()=>{});
  }, [search]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Platform</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats && (
          <>
            <Stat title="Workspaces" value={stats.totals.workspaces} />
            <Stat title="Users" value={stats.totals.users} />
            <Stat title="Policies" value={stats.totals.policies} />
            <Stat title="Assignments" value={stats.totals.assignments} />
          </>
        )}
      </div>

      <div className="mt-10 card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Workspaces</h2>
            <input className="input" placeholder="Search workspaces" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Users</th>
                  <th className="py-2 pr-4">Policies</th>
                  <th className="py-2 pr-4">Assignments</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(ws => (
                  <tr key={ws.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-4">{ws.name}</td>
                    <td className="py-2 pr-4 capitalize">{ws.plan}</td>
                    <td className="py-2 pr-4">{ws.users_count}</td>
                    <td className="py-2 pr-4">{ws.policies_count}</td>
                    <td className="py-2 pr-4">{ws.assignments_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}



