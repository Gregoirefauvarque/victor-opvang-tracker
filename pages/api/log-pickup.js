import fs from 'fs';
import path from 'path';

// Victor's tarieven (8 jaar, geen peuter)
const PRICING_RULES = [
  { start: '15:25', end: '15:45', cost: 0 }, // gratis
  { start: '15:45', end: '16:15', cost: 0.66 },
  { start: '15:45', end: '16:45', cost: 1.32 },
  { start: '15:45', end: '17:15', cost: 1.98 },
  { start: '15:45', end: '17:45', cost: 2.64 },
  { start: '15:45', end: '18:15', cost: 3.30 },
  { start: '15:45', end: '18:30', cost: 3.63 },
  { start: '12:10', end: '12:30', cost: 0 }, // woensdag gratis
];

function calculateCost(pickupTime) {
  const time = pickupTime.toTimeString().slice(0, 5); // HH:MM format
  const day = pickupTime.getDay(); // 0 = Sunday, 3 = Wednesday
  
  // Woensdag 12:10-12:30 is gratis
  if (day === 3 && time >= '12:10' && time <= '12:30') {
    return { cost: 0, timeSlot: '12:10-12:30 (woensdag gratis)' };
  }
  
  // Vind de juiste tijdslot
  for (let rule of PRICING_RULES) {
    if (time >= rule.start && time <= rule.end) {
      return { 
        cost: rule.cost, 
        timeSlot: `${rule.start}-${rule.end}` 
      };
    }
  }
  
  // Als geen exacte match, bepaal op basis van tijd
  if (time >= '15:25' && time < '15:45') {
    return { cost: 0, timeSlot: '15:25-15:45 (gratis)' };
  } else if (time >= '15:45' && time < '16:15') {
    return { cost: 0.66, timeSlot: '15:45-16:15' };
  } else if (time >= '16:15' && time < '16:45') {
    return { cost: 1.32, timeSlot: '15:45-16:45' };
  } else if (time >= '16:45' && time < '17:15') {
    return { cost: 1.98, timeSlot: '15:45-17:15' };
  } else if (time >= '17:15' && time < '17:45') {
    return { cost: 2.64, timeSlot: '15:45-17:45' };
  } else if (time >= '17:45' && time < '18:15') {
    return { cost: 3.30, timeSlot: '15:45-18:15' };
  } else if (time >= '18:15' && time <= '18:30') {
    return { cost: 3.63, timeSlot: '15:45-18:30' };
  } else {
    // Buiten normale uren - gebruik hoogste tarief
    return { cost: 3.63, timeSlot: 'Buiten normale uren' };
  }
}

function getDataPath() {
  return path.join(process.cwd(), 'data', 'pickup-logs.json');
}

function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadLogs() {
  ensureDataDirectory();
  const dataPath = getDataPath();
  
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
}

function saveLogs(logs) {
  ensureDataDirectory();
  const dataPath = getDataPath();
  
  try {
    fs.writeFileSync(dataPath, JSON.stringify(logs, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving logs:', error);
    return false;
  }
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timestamp, child } = req.body;
    
    if (!timestamp || !child) {
      return res.status(400).json({ error: 'Timestamp and child are required' });
    }

    const pickupTime = new Date(timestamp);
    const costInfo = calculateCost(pickupTime);
    
    const newLog = {
      id: Date.now(),
      timestamp,
      child,
      pickupTime: pickupTime.toTimeString().slice(0, 5),
      date: pickupTime.toISOString().split('T')[0],
      day: pickupTime.toLocaleDateString('nl-NL', { weekday: 'long' }),
      cost: costInfo.cost,
      timeSlot: costInfo.timeSlot,
      createdAt: new Date().toISOString()
    };

    // Laad bestaande logs
    const logs = loadLogs();
    
    // Voeg nieuwe log toe (nieuwste eerst)
    logs.unshift(newLog);
    
    // Sla logs op
    if (!saveLogs(logs)) {
      return res.status(500).json({ error: 'Failed to save log' });
    }

    res.status(200).json({
      success: true,
      log: newLog,
      message: `Ophaling gelogd voor ${child} om ${newLog.pickupTime}`
    });

  } catch (error) {
    console.error('Error in log-pickup API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
