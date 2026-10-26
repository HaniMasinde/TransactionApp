import Avatar from './ui/Avatar.jsx'
import StatusBadge from './ui/StatusBadge.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'

export default function TransactionTable({
  rows,
  canReverse = false,
  canRequestReversal = false,
  onReverse,
}) {
  const showAction = canReverse || canRequestReversal

  return <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>M-PESA CODE</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th>{showAction && <th>ACTION</th>}</tr></thead><tbody>
    {rows.map(row => {
      const name = row.entered_member_name || row.name || 'Unknown member'
      const reference = row.mpesa_reference || row.reference || '—'
      const paidAt = row.paid_at || row.date
      const date = paidAt
        ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(paidAt))
        : '—'
      const status = row.status === 'reversed' ? 'Reversed' : 'Received'
      const reversalRequestStatus = row.reversal_request_status
      const reversalStatus = {
        pending: 'Submitted',
        pending_treasurer: 'Submitted',
        pending_chairperson: 'Under review',
        approved: 'Approved',
        rejected: 'Rejected',
      }[reversalRequestStatus]
      const reversalTone = reversalRequestStatus === 'rejected'
        ? 'danger'
        : reversalRequestStatus === 'pending' ||
            reversalRequestStatus === 'pending_treasurer' ||
            reversalRequestStatus === 'pending_chairperson'
          ? 'warning'
          : 'success'
      const requestPending = reversalRequestStatus === 'pending' ||
        reversalRequestStatus === 'pending_treasurer' ||
        reversalRequestStatus === 'pending_chairperson'

      return (
        <tr key={row.id || reference}>
          <td><span className="person-cell"><Avatar name={name}/>{name}</span></td>
          <td><code>{reference}</code></td>
          <td>{date}</td>
          <td className="amount">{formatCurrency(row.amount)}</td>
          <td>
            <StatusBadge tone={status === 'Reversed' ? 'danger' : 'success'}>{status}</StatusBadge>
            {reversalStatus && (
              <div className="transaction-reversal-status">
                <StatusBadge tone={reversalTone}>{reversalStatus}</StatusBadge>
              </div>
            )}
          </td>
          {showAction && (
            <td>
              {row.status === 'active' && !requestPending ? (
                <button className="transaction-reverse-button" type="button" onClick={() => onReverse?.(row)}>
                  {canRequestReversal
                    ? 'Request reversal'
                    : row.reversal_approval_required
                    ? 'Request approval'
                    : 'Reverse'}
                </button>
              ) : (
                <span className="transaction-action-muted">
                  {requestPending ? 'Under review' : '—'}
                </span>
              )}
            </td>
          )}
        </tr>
      )
    })}
  </tbody></table>{rows.length === 0 && <p className="empty-state">No records to show.</p>}</div>
}
