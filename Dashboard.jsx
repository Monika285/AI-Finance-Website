import React, {useEffect, useState} from 'react';
import AddExpense from './AddExpense';
import { Pie } from 'react-chartjs-2';
import {Chart, ArcElement, Tooltip, Legend} from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend);

export default function Dashboard({token, onLogout}){
  const [expenses,setExpenses]=useState([]);
  const [pieData,setPieData]=useState({});
  const [insights,setInsights]=useState(null);

  async function fetchExpenses(){
    const res = await fetch('http://localhost:4000/api/expenses',{
      headers:{Authorization:'Bearer '+token}
    });
    if(res.ok){ setExpenses(await res.json()); }
  }

  async function fetchPie(){
    const res = await fetch('http://localhost:4000/api/pie',{
      headers:{Authorization:'Bearer '+token}
    });
    if(res.ok){ setPieData(await res.json()); }
  }

  async function fetchInsights(){
    const res = await fetch('http://localhost:4000/api/insights',{
      headers:{Authorization:'Bearer '+token}
    });
    if(res.ok) setInsights(await res.json());
  }

  useEffect(()=>{ 
    fetchExpenses(); 
    fetchPie(); 
    fetchInsights(); 
  },[]);

  return (
    <div className='container'>
      <header>
        <h1>Personal Finance Brain</h1>
        <div><button onClick={onLogout}>Logout</button></div>
      </header>

      <main>
        {/* LEFT SIDE */}
        <section className='left'>
          <AddExpense 
            token={token} 
            onAdd={()=>{
              fetchExpenses();
              fetchPie();
              fetchInsights();
            }} 
          />

          <h3>Recent expenses</h3>
          <ul className='list'>
            {expenses.map(e=> (
              <li key={e.id}>
                <b>₹{e.amount}</b> — {e.description} <i>({e.category})</i>
              </li>
            ))}
          </ul>
        </section>

        {/* RIGHT SIDE */}
        <section className='right'>
          <h3>Spending breakdown</h3>

          {Object.keys(pieData).length ? (
            <Pie
              data={{
                labels: Object.keys(pieData),
                datasets: [
                  {
                    data: Object.values(pieData),
                    backgroundColor: [
                      "#FF6384",
                      "#36A2EB",
                      "#FFCE56",
                      "#4BC0C0",
                      "#9966FF",
                      "#FF9F40"
                    ],
                    borderWidth: 1
                  }
                ]
              }}
            />
          ) : (
            <div>No data yet</div>
          )}

          <h3>AI Insights</h3>
          {insights ? (
            <div>
              <p>
                Predicted next month spend:{" "}
                <b>₹{insights.nextMonthPred}</b>
              </p>
              <p>
                Average monthly: ₹{Math.round(insights.avgMonthly)}
              </p>
              <ul>
                {insights.suggestions.map((s,i)=>(
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div>Loading...</div>
          )}
        </section>

      </main>
    </div>
  );
}
