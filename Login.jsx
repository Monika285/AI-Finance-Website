import React, {useState} from 'react';
export default function Login({onAuth}){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [mode,setMode]=useState('login'); const [err,setErr]=useState('');
  const api = (mode==='login')?'/api/login':'/api/register';
  async function submit(e){
    e.preventDefault();
    setErr('');
    try{
      const res = await fetch('http://localhost:4000'+api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const j = await res.json();
      if(res.ok){ onAuth(j.token); } else setErr(j.error||'failed');
    }catch(e){ setErr('network'); }
  }
  return (<div className='auth'><h2>{mode==='login'?'Login':'Register'}</h2>
    <form onSubmit={submit}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder='email' required />
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder='password' type='password' required />
      <button type='submit'>{mode==='login'?'Login':'Create account'}</button>
    </form>
    <div className='toggle'><button onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Create account':'Have account? Login'}</button></div>
    {err && <div className='error'>{err}</div>}
  </div>);
}
