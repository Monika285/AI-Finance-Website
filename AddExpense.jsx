import React, {useState} from 'react';
export default function AddExpense({token,onAdd}){
  const [amount,setAmount]=useState(''); const [description,setDescription]=useState('');
  async function submit(e){
    e.preventDefault();
    await fetch('http://localhost:4000/api/expenses',{method:'POST',headers:{'Content-Type':'application/json', Authorization:'Bearer '+token},body:JSON.stringify({amount,description})});
    setAmount(''); setDescription(''); onAdd && onAdd();
  }
  return (<form onSubmit={submit} className='add-expense'>
    <input placeholder='amount' value={amount} onChange={e=>setAmount(e.target.value)} required />
    <input placeholder='description' value={description} onChange={e=>setDescription(e.target.value)} required />
    <button type='submit'>Add</button>
  </form>);
}
