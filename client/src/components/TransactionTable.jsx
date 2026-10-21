import Avatar from './ui/Avatar.jsx'
import StatusBadge from './ui/StatusBadge.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'

export default function TransactionTable({ rows }) {
  return <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>M-PESA CODE</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>
    {rows.map(row => {
      const name = row.entered_member_name || row.name || 'Unknown member'
      const reference = row.mpesa_reference || row.reference || '—'
      const paidAt = row.paid_at || row.date
      const date = paidAt
        ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(paidAt))
        : '—'
      const status = row.status === 'reversed' ? 'Reversed' : 'Received'

      return (
        <tr key={row.id || reference}>
          <td><span className="person-cell"><Avatar name={name}/>{name}</span></td>
          <td><code>{reference}</code></td>
          <td>{date}</td>
          <td className="amount">{formatCurrency(row.amount)}</td>
          <td><StatusBadge tone={status === 'Reversed' ? 'danger' : 'success'}>{status}</StatusBadge></td>
        </tr>
      )
    })}
  </tbody></table>{rows.length === 0 && <p className="empty-state">No records to show.</p>}</div>
}
