import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Contact, Employer } from '@/types/database';
import { formatRelativeTime } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { Modal } from '@/components/Modal';
import { Users, Plus, Mail, Linkedin, Calendar, Building2, X } from 'lucide-react';

export function ContactsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [search, setSearch] = useState('');

  // Add form state
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [employerId, setEmployerId] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [contactsRes, employersRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('*, employer:employers(*)')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('employers').select('*').order('name'),
      ]);
      setContacts(contactsRes.data as unknown as Contact[] || []);
      setEmployers(employersRes.data as Employer[] || []);
      setLoading(false);
    })();
  }, [user]);

  const addContact = async () => {
    if (!user || !name.trim()) return;
    const { data } = await supabase
      .from('contacts')
      .insert({
        student_id: user.id,
        name,
        title: title || null,
        email: email || null,
        linkedin_url: linkedin || null,
        employer_id: employerId || null,
        relationship_type: relationshipType || null,
        notes: notes || null,
      })
      .select('*, employer:employers(*)')
      .single();
    if (data) {
      setContacts(prev => [data as unknown as Contact, ...prev]);
      setShowAdd(false);
      setName(''); setTitle(''); setEmail(''); setLinkedin(''); setEmployerId(''); setRelationshipType(''); setNotes('');
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    await supabase.from('contacts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (selectedContact?.id === id) setSelectedContact({ ...selectedContact, ...updates });
  };

  const deleteContact = async (id: string) => {
    await supabase.from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
    setSelectedContact(null);
  };

  const filteredContacts = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.title?.toLowerCase().includes(search.toLowerCase()) && !c.employer?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const needsFollowup = contacts.filter(c => c.next_followup_at && new Date(c.next_followup_at) <= new Date());

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink-900">Contacts</h1>
          <p className="text-ink-500 mt-1">Build and manage your networking connections.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Add contact
        </button>
      </div>

      {needsFollowup.length > 0 && (
        <div className="card border-warning-200 bg-warning-50 p-4 mb-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-warning-600 shrink-0" />
          <p className="text-sm text-warning-700">
            <span className="font-semibold">{needsFollowup.length}</span> {needsFollowup.length === 1 ? 'contact needs' : 'contacts need'} a follow-up. Reach out today!
          </p>
        </div>
      )}

      <div className="relative mb-4 sm:max-w-xs">
        <input className="input" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-ink-200 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-ink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-ink-400" />
          </div>
          <h3 className="text-lg font-display font-bold text-ink-900 mb-2">No contacts yet</h3>
          <p className="text-sm text-ink-500 mb-4">Add people you've met through networking events, alumni connections, or cold outreach.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add your first contact
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="card-hover p-4 cursor-pointer" onClick={() => setSelectedContact(contact)}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-ink-700 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {contact.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink-900 truncate">{contact.name}</div>
                  <div className="text-xs text-ink-500 truncate">{contact.title || 'No title'}</div>
                </div>
              </div>
              {contact.employer && (
                <div className="flex items-center gap-1.5 text-xs text-ink-500 mb-2">
                  <Building2 className="w-3.5 h-3.5" /> {contact.employer.name}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {contact.email && <span className="badge-ocean"><Mail className="w-3 h-3" /> Email</span>}
                {contact.linkedin_url && <span className="badge-brand"><Linkedin className="w-3 h-3" /> LinkedIn</span>}
                {contact.next_followup_at && new Date(contact.next_followup_at) <= new Date() && (
                  <span className="badge-warning">Follow up</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <Modal open={true} onClose={() => setShowAdd(false)} title="Add Contact" size="md">
          <div className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Senior Recruiter" />
            </div>
            <div>
              <label className="label">Company</label>
              <select className="input" value={employerId} onChange={e => setEmployerId(e.target.value)}>
                <option value="">None / Other</option>
                {employers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" />
              </div>
              <div>
                <label className="label">LinkedIn URL</label>
                <input className="input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/jane" />
              </div>
            </div>
            <div>
              <label className="label">Relationship type</label>
              <select className="input" value={relationshipType} onChange={e => setRelationshipType(e.target.value)}>
                <option value="">Select type</option>
                <option value="ALUMNI">Alumni</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="EMPLOYEE">Employee</option>
                <option value="PROFESSOR">Professor</option>
                <option value="COLD_OUTREACH">Cold Outreach</option>
                <option value="EVENT">Event Connection</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input min-h-[80px] resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="How you met, topics discussed..." />
            </div>
            <button onClick={addContact} disabled={!name.trim()} className="btn-primary w-full">
              <Plus className="w-4 h-4" /> Add contact
            </button>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {selectedContact && (
        <Modal open={true} onClose={() => setSelectedContact(null)} title="Contact Details" size="md">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 bg-ink-700 rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0">
                {selectedContact.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-ink-900">{selectedContact.name}</h3>
                <p className="text-sm text-ink-500">{selectedContact.title || 'No title'}</p>
                {selectedContact.employer && <p className="text-sm text-ink-500">{selectedContact.employer.name}</p>}
              </div>
            </div>

            {selectedContact.email && (
              <a href={`mailto:${selectedContact.email}`} className="card p-3 flex items-center gap-3 hover:border-ink-300 transition-colors">
                <Mail className="w-4 h-4 text-ocean-600" />
                <span className="text-sm text-ink-700">{selectedContact.email}</span>
              </a>
            )}
            {selectedContact.linkedin_url && (
              <a href={selectedContact.linkedin_url} target="_blank" rel="noopener noreferrer" className="card p-3 flex items-center gap-3 hover:border-ink-300 transition-colors">
                <Linkedin className="w-4 h-4 text-brand-600" />
                <span className="text-sm text-ink-700">LinkedIn Profile</span>
              </a>
            )}

            <div>
              <label className="label">Last contacted</label>
              <input type="date" className="input" value={selectedContact.last_contact_at?.split('T')[0] || ''} onChange={e => updateContact(selectedContact.id, { last_contact_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div>
              <label className="label">Next follow-up</label>
              <input type="date" className="input" value={selectedContact.next_followup_at?.split('T')[0] || ''} onChange={e => updateContact(selectedContact.id, { next_followup_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input min-h-[100px] resize-none" value={selectedContact.notes || ''} onChange={e => updateContact(selectedContact.id, { notes: e.target.value })} placeholder="Add notes..." />
            </div>

            <button onClick={() => deleteContact(selectedContact.id)} className="btn-danger w-full">
              <X className="w-4 h-4" /> Delete contact
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
