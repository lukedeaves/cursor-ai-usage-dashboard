import { state } from './state.js';
import { fmt$, fmtK } from './utils.js';

export function renderTable() {
  const tableSource = state.filteredData;
  const tableData = tableSource.map(r => ({
    date: r.date,
    user: r.user,
    cloudAgentId: r.cloudAgentId,
    automationId: r.automationId,
    kind: r.kind,
    model: r.model,
    maxMode: r.maxMode,
    inputCache: r.inputCache,
    inputNoCache: r.inputNoCache,
    cacheRead: r.cacheRead,
    output: r.output,
    total: r.total,
    cost: r.cost,
  }));

  const totalCost = tableSource.reduce((s, r) => s + r.cost, 0);
  document.getElementById('table-summary').textContent =
    `— ${fmt$(totalCost)} total · ${tableSource.length.toLocaleString()} rows`;

  const exportBtn = document.getElementById('export-btn');
  exportBtn.style.display = tableSource.length > 0 ? 'inline-flex' : 'none';

  const sig = `${state.hasUsers}|${state.hasTeamFields}`;
  if (state.table && state.tableHasUsers !== sig) {
    state.table.destroy();
    state.table = null;
  }

  if (state.table) {
    state.table.setData(tableData);
    return;
  }

  state.tableHasUsers = sig;

  const userCols = state.hasUsers ? [{ title: 'User', field: 'user', sorter: 'string', width: 120 }] : [];
  const teamCols = state.hasTeamFields ? [
    { title: 'Cloud Agent', field: 'cloudAgentId', sorter: 'string', width: 110 },
    { title: 'Automation', field: 'automationId', sorter: 'string', width: 100 },
  ] : [];

  state.table = new Tabulator('#data-table', {
    data: tableData,
    layout: 'fitColumns',
    pagination: 'local',
    paginationSize: 25,
    paginationSizeSelector: [10, 25, 50, 100],
    height: '520px',
    initialSort: [{ column: 'date', dir: 'desc' }],
    columns: [
      { title: 'Date', field: 'date', sorter: 'string', width: 105 },
      ...userCols,
      ...teamCols,
      { title: 'Kind', field: 'kind', sorter: 'string', width: 90 },
      { title: 'Model', field: 'model', sorter: 'string', minWidth: 140 },
      { title: 'Max Mode', field: 'maxMode', sorter: 'string', width: 100 },
      { title: 'Input (Cache)', field: 'inputCache', sorter: 'number', width: 120, hozAlign: 'right', formatter: cell => fmtK(cell.getValue()) },
      { title: 'Input (No Cache)', field: 'inputNoCache', sorter: 'number', width: 130, hozAlign: 'right', formatter: cell => fmtK(cell.getValue()) },
      { title: 'Cache Read', field: 'cacheRead', sorter: 'number', width: 110, hozAlign: 'right', formatter: cell => fmtK(cell.getValue()) },
      { title: 'Output', field: 'output', sorter: 'number', width: 90, hozAlign: 'right', formatter: cell => fmtK(cell.getValue()) },
      { title: 'Total Tokens', field: 'total', sorter: 'number', width: 110, hozAlign: 'right', formatter: cell => fmtK(cell.getValue()) },
      { title: 'Cost', field: 'cost', sorter: 'number', width: 95, hozAlign: 'right', formatter: cell => fmt$(cell.getValue()) },
    ],
  });
}

export function destroyTable() {
  if (state.table) {
    state.table.destroy();
    state.table = null;
    state.tableHasUsers = null;
  }
}
