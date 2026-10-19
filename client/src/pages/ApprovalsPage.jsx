import Avatar from '../components/ui/Avatar.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { pendingRegistrations } from '../data/demoData.js'

export default function ApprovalsPage() {
  return <><PageHeader eyebrow="MEMBER MANAGEMENT" title="Registration approvals" description="Review requests to join Umoja Welfare."/><div className="notice-card"><b>{pendingRegistrations.length} registrations need your attention</b><p>Approved members can sign in and view their contribution records.</p></div><section className="approval-grid">{pendingRegistrations.map(person => <article className="content-card approval-card" key={person.name}><div className="person-cell"><Avatar name={person.name}/><b>{person.name}</b></div><p>{person.phone}</p><small>Applied {person.submitted}</small><div className="approval-actions"><button className="secondary-button">Decline</button><button className="primary-button">Approve</button></div></article>)}</section></>
}
