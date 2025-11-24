import React, {useState, useEffect} from 'react';
import Login from './auth/Login';
import Dashboard from './dashboard/Dashboard';

function App(){
  const [token, setToken] = useState(localStorage.getItem('token'));
  useEffect(()=>{ if(token) localStorage.setItem('token', token); else localStorage.removeItem('token'); },[token]);
  return token ? <Dashboard token={token} onLogout={()=>setToken(null)} /> : <Login onAuth={(t)=>setToken(t)} />;
}
export default App;
