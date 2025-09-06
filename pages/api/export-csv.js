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

function formatDateForCSV(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL');
}

function createCSV(logs) {
  // CSV Headers (Nederlandse labels)
  const headers = [
    'Datum',
    'Tijd',
    'Dag',
    'Kind',
    'Tijdslot',
    'Kosten (€)',
    'Opmerking'
  ];
  
  // CSV Rows
  const rows = logs.map(log => [
    formatDateForCSV(log.timestamp),
    log.pickupTime || '',
    log.day || '',
    log.child || '',
    log.timeSlot || '',
    log.cost ? log.cost.toFixed(2) : '0.00',
    log.cost === 0 ? 'Gratis' : ''
  ]);
  
  // Combineer headers en rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
    
  return csvContent;
}

function createMonthlyReport(logs) {
  // Groepeer per maand
  const monthlyData = {};
  
  logs.forEach(log => {
    if (log.date) {
      const monthKey = log.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          logs: [],
          totalCost: 0,
          totalPickups: 0,
          freeDays: 0,
          paidDays: 0
        };
      }
      
      monthlyData[monthKey].logs.push(log);
      monthlyData[monthKey].totalCost += log.cost || 0;
      monthlyData[monthKey].totalPickups++;
      
      if (log.cost === 0) {
        monthlyData[monthKey].freeDays++;
      } else {
        monthlyData[monthKey].paidDays++;
      }
    }
  });
  
  // Maak samenvatting CSV
  const summaryHeaders = [
    'Maand',
    'Totaal Ophalingen',
    'Gratis Dagen',
    'Betaalde Dagen',
    'Totaal Kosten (€)',
    'Gemiddeld per Dag (€)'
  ];
  
  const summaryRows = Object.values(monthlyData)
    .sort((a, b) => b.month.localeCompare(a.month)) // Nieuwste eerst
    .map(monthData => [
      monthData.month,
      monthData.totalPickups.toString(),
      monthData.freeDays.toString(),
      monthData.paidDays.toString(),
      monthData.totalCost.toFixed(2),
      monthData.totalPickups > 0 ? (monthData.totalCost / monthData.totalPickups).toFixed(2) : '0.00'
    ]);
  
  const summaryCSV = [summaryHeaders, ...summaryRows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
    
  return { detailedCSV: createCSV(logs), summaryCSV };
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const logs = loadLogs();
    const { type, month, year } = req.query;
    
    let filteredLogs = logs;
    let filename = 'victor-opvang-data';
    
    // Filter op maand/jaar als opgegeven
    if (month && year) {
      const targetMonth = `${year}-${month.padStart(2, '0')}`;
      filteredLogs = logs.filter(log => 
        log.date && log.date.startsWith(targetMonth)
      );
      filename = `victor-opvang-${targetMonth}`;
    } else {
      // Als geen specifieke maand, neem huidige maand
      const currentMonth = new Date().toISOString().substring(0, 7);
      filteredLogs = logs.filter(log => 
        log.date && log.date.startsWith(currentMonth)
      );
      filename = `victor-opvang-${currentMonth}`;
    }
    
    if (type === 'summary') {
      // Maandelijkse samenvatting
      const { summaryCSV } = createMonthlyReport(logs);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}-samenvatting.csv"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      return res.status(200).send('\ufeff' + summaryCSV); // BOM voor Excel UTF-8 support
    } else {
      // Gedetailleerde data
      const csvContent = createCSV(filteredLogs);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      return res.status(200).send('\ufeff' + csvContent); // BOM voor Excel UTF-8 support
    }

  } catch (error) {
    console.error('Error in export-csv API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
