import { useState } from 'react'
import Avatar from '../components/ui/Avatar.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { members } from '../data/demoData.js'
import { formatCurrency } from '../utils/formatCurrency.js'

export default function MembersPage() {
  const [search, setSearch] = useState('')
  const results = members.filter(member => member.name.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeader eyebrow="YOUR COMMUNITY" title="Members" description="People contributing to Umoja Welfare."/><section className="content-card"><div className="toolbar"><input aria-label="Search members" placeholder="Search members" value={search} onChange={event => setSearch(event.target.value)}/><span className="record-count">48 members · 45 active</span></div><div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>PHONE</th><th>JOINED</th><th>TOTAL CONTRIBUTED</th><th>STATUS</th></tr></thead><tbody>{results.map(member => <tr key={member.name}><td><span className="person-cell"><Avatar name={member.name}/>{member.name}</span></td><td>{member.phone}</td><td>{member.joined}</td><td className="amount">{formatCurrency(member.total)}</td><td><StatusBadge/></td></tr>)}</tbody></table></div></section></>
}
