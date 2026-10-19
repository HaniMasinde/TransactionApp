import Avatar from './ui/Avatar.jsx'
import StatusBadge from './ui/StatusBadge.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'

export default function TransactionTable({ rows }) {
  return <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>M-PESA CODE</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>
    {rows.map(row => <tr key={row.reference}><td><span className="person-cell"><Avatar name={row.name}/>{row.name}</span></td><td><code>{row.reference}</code></td><td>{row.date}</td><td className="amount">{formatCurrency(row.amount)}</td><td><StatusBadge>Received</StatusBadge></td></tr>)}
  </tbody></table>{rows.length === 0 && <p className="empty-state">No records to show.</p>}</div>
}
