import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../services/users';

export default function AdminUsers() {
  const [tab, setTab] = useState('staff');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    usersAPI.list(tab, query).then((res) => setUsers(res.users || [])).catch(() => {});
  }, [tab, query]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="space-x-2">
          <button className={`btn ${tab==='staff'?'btn-primary':'btn-secondary'}`} onClick={() => setTab('staff')}>Staff</button>
          <button className={`btn ${tab==='guests'?'btn-primary':'btn-secondary'}`} onClick={() => setTab('guests')}>Guests</button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input className="input" placeholder="Search name or email" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <Link to="#" className="btn btn-primary">Invite</Link>
      </div>
      <div className="mt-6 card">
        <div className="card-body overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4 capitalize">{u.role}</td>
                  <td className="py-2 pr-4">{u.can_login ? 'Enabled' : 'Disabled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


