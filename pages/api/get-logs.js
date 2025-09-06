import fs from 'fs';
import path from 'path';

function getDataPath() {
  return path.join(process.cwd(), 'data', 'pickup-logs.json');
}

function loadLogs() {
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

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const logs = loadLogs();
    
    // Query parameters voor filtering
    const { month, year, child } = req.query;
    
    let filteredLogs = logs;
    
    // Filter op maand/jaar als opgegeven
    if (month && year) {
      const targetMonth = `${year}-${month.padStart(2, '0')}`;
      filteredLogs = logs.filter(log => 
        log.date && log.date.startsWith(targetMonth)
      );
    }
    
    // Filter op kind als opgegeven
    if (child) {
      filteredLogs = filteredLogs.filter(log => 
        log.child && log.child.toLowerCase() === child.toLowerCase()
      );
    }
    
    // Bereken statistieken
    const totalCost = filteredLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
    const totalPickups = filteredLogs.length;
    
    // Groepeer per maand voor statistieken
    const monthlyStats = {};
    filteredLogs.forEach(log => {
      if (log.date) {
        const monthKey = log.date.substring(0, 7); // YYYY-MM
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            month: monthKey,
            pickups: 0,
            totalCost: 0,
            logs: []
          };
        }
        monthlyStats[monthKey].pickups++;
        monthlyStats[monthKey].totalCost += log.cost || 0;
        monthlyStats[monthKey].logs.push(log);
      }
    });

    res.status(200).json({
      success: true,
      logs: filteredLogs,
      stats: {
        totalCost,
        totalPickups,
        monthlyStats: Object.values(monthlyStats)
      }
    });

  } catch (error) {
    console.error('Error in get-logs API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
