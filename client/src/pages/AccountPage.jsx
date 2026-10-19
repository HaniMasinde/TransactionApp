import PageHeader from '../components/PageHeader.jsx'

export default function AccountPage() {
  return <><PageHeader eyebrow="PERSONAL" title="Account settings" description="Manage your profile and account preferences."/><section className="content-card account-card"><h2>Profile information</h2><p>Update your name and contact details.</p><form className="account-form" onSubmit={event => event.preventDefault()}><label>Full name<input defaultValue="James Otieno"/></label><label>Phone number<input defaultValue="+254 712 345 678"/></label><label>Email address<input defaultValue="james.otieno@example.com"/></label><button className="primary-button">Save changes</button></form></section></>
}
