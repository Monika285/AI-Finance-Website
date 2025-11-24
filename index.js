const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const adapter = new JSONFile(path.join(__dirname,'db.json'));
const db = new Low(adapter);

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

async function initDB(){
  await db.read();
  db.data = db.data || { users: [], expenses: [] };
  await db.write();
}
initDB();

// --- Auth ---
app.post('/api/register', async (req,res)=>{
  await db.read();
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({error:'email & password required'});
  if(db.data.users.find(u=>u.email===email)) return res.status(400).json({error:'user exists'});
  const hashed = bcrypt.hashSync(password,8);
  const user = { id: nanoid(), email, password: hashed };
  db.data.users.push(user);
  await db.write();
  const token = jwt.sign({id:user.id,email}, JWT_SECRET, {expiresIn:'7d'});
  res.json({token});
});

app.post('/api/login', async (req,res)=>{
  await db.read();
  const { email, password } = req.body;
  const user = db.data.users.find(u=>u.email===email);
  if(!user) return res.status(400).json({error:'invalid'});
  if(!bcrypt.compareSync(password, user.password)) return res.status(400).json({error:'invalid'});
  const token = jwt.sign({id:user.id,email}, JWT_SECRET, {expiresIn:'7d'});
  res.json({token});
});

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'missing token'});
  const token = auth.split(' ')[1];
  try{
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  }catch(e){ return res.status(401).json({error:'invalid token'}); }
}

// --- Simple categorizer ---
const KEYWORDS = {
  Food: ['restaurant','zomato','swiggy','uber eats','cafe','coffee','dine'],
  Rent: ['rent','apartment','landlord'],
  Transport: ['uber','ola','taxi','bus','metro','petrol','fuel'],
  Groceries: ['grocery','supermarket','flipkart','amazon','bigbasket'],
  Entertainment: ['netflix','spotify','movie','cinema','game'],
  Bills: ['electricity','water','internet','phone','bill'],
  Misc: []
};

function categorize(description, amount){
  const desc = (description||'').toLowerCase();
  for(const [cat, keys] of Object.entries(KEYWORDS)){
    for(const k of keys){
      if(desc.includes(k)) return cat;
    }
  }
  // simple heuristics by amount
  if(amount>20000) return 'Rent';
  if(amount>5000) return 'Bills';
  return 'Misc';
}

// --- Expenses endpoints ---
app.post('/api/expenses', authMiddleware, async (req,res)=>{
  await db.read();
  const { amount, description, date } = req.body;
  const userId = req.user.id;
  if(!amount) return res.status(400).json({error:'amount required'});
  const category = categorize(description, amount);
  const exp = { id: nanoid(), userId, amount: Number(amount), description, date: date||new Date().toISOString(), category };
  db.data.expenses.push(exp);
  await db.write();
  res.json(exp);
});

app.get('/api/expenses', authMiddleware, async (req,res)=>{
  await db.read();
  const userId = req.user.id;
  const items = db.data.expenses.filter(e=>e.userId===userId).sort((a,b)=> new Date(b.date)-new Date(a.date));
  res.json(items);
});

// Delete
app.delete('/api/expenses/:id', authMiddleware, async (req,res)=>{
  await db.read();
  const userId = req.user.id;
  const id = req.params.id;
  const idx = db.data.expenses.findIndex(e=>e.id===id && e.userId===userId);
  if(idx===-1) return res.status(404).json({error:'not found'});
  db.data.expenses.splice(idx,1);
  await db.write();
  res.json({ok:true});
});

// --- Insights and predictions ---
app.get('/api/insights', authMiddleware, async (req,res)=>{
  await db.read();
  const userId = req.user.id;
  const items = db.data.expenses.filter(e=>e.userId===userId);
  // totals by category (last 30 days)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-30);
  const recent = items.filter(i=>new Date(i.date) >= cutoff);
  const totals = {};
  for(const it of recent){
    totals[it.category] = (totals[it.category]||0) + it.amount;
  }
  // simple suggestion: top recurring category
  const categoryTotals = {};
  for(const it of items){
    categoryTotals[it.category] = (categoryTotals[it.category]||0) + it.amount;
  }
  const topCat = Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1])[0] || ['None',0];
  const suggestions = [];
  if(topCat[0] && topCat[0]!=='None'){
    suggestions.push(`Try reducing ${topCat[0]} spending by 10% to save ₹${Math.round(topCat[1]*0.1)}`);
  }
  // prediction: next month's spend = average monthly total * 1.02 (small growth)
  const months = {};
  for(const it of items){
    const d = new Date(it.date);
    const key = `${d.getFullYear()}-${d.getMonth()+1}`;
    months[key] = (months[key]||0) + it.amount;
  }
  const monthVals = Object.values(months);
  const avgMonthly = monthVals.length ? monthVals.reduce((a,b)=>a+b,0)/monthVals.length : 0;
  const nextMonthPred = Math.round(avgMonthly * 1.02);
  res.json({ totals, suggestions, nextMonthPred, avgMonthly });
});

// pie chart data
app.get('/api/pie', authMiddleware, async (req,res)=>{
  await db.read();
  const userId = req.user.id;
  const items = db.data.expenses.filter(e=>e.userId===userId);
  const totals = {};
  for(const it of items){
    totals[it.category] = (totals[it.category]||0) + it.amount;
  }
  res.json(totals);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Server listening on',PORT));
