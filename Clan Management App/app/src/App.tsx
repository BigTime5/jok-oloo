import { useState, useEffect, useMemo } from 'react'
import { API_BASE } from './lib/api'
import {
  Menu, X, Users, CreditCard, Bell, ChevronRight,
  Search, Plus, Phone, User, CheckCircle2, XCircle,
  Megaphone, Heart, Home, Lock, LogOut
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Payment {
  id: number;
  month: string;
  type: string;
  amount: number;
  paid: boolean;
  paidAt: string | null;
}

interface Member {
  id: number
  name: string
  phone: string
  branch: string
  registrationPaid: boolean
  payments: Payment[]
  avatar?: string
}

interface ReminderData {
  memberId: number;
  memberName: string;
  phone: string;
  messageEn: string;
  waLinkEn: string;
  messageLuo: string;
  waLinkLuo: string;
}

type View = 'dashboard' | 'members' | 'announcements' | 'reminders' | 'memberProfile'

// ─── Initial Data ────────────────────────────────────────────────────────────
const BRANCHES = ['Ndege', 'Otieno', 'Orinda', 'Atieno', 'Obondo', 'Akoth', 'Oluoch', 'Nyagilo', 'Odhiambo', 'Aduowo', 'Other']

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Welcome to Jok Oloo Connect!',
    content: 'Good evening Members, Receive my warm greetings. We have officially set our foundations, and though this is only just but the beginning of what we intend to achieve. We pray it materializes to a great success. The purpose and design of this group are to bring us together as a single entity, a family, a great clan. — James Otieno Orinda',
    date: '2026-05-31',
    author: 'James Otieno Orinda',
    type: 'welcome'
  },
  {
    id: 2,
    title: 'Payment Structure Reminder',
    content: 'Please note that registration fee is KES 50 and monthly contributions are KES 100, paid to our treasurer Susan Orinda via M-PESA: 0729207208. Let us all contribute to build our clan together.',
    date: '2026-05-31',
    author: 'Susan Orinda',
    type: 'finance'
  },
  {
    id: 3,
    title: 'Add Your Family Members',
    content: 'If you know a clan member who is not yet included in this group, please feel free to add them. There are absolutely no restrictions on registration at this stage until we have every single one of our members on board. Kindly let\'s ensure no one is left behind.',
    date: '2026-05-31',
    author: 'James Otieno Orinda',
    type: 'general'
  }
]

// ─── Utility Functions ───────────────────────────────────────────────────────
const formatPhone = (phone: string) => {
  if (!phone) return '—'
  if (phone.length === 9) return `0${phone}`
  return phone
}

const getMonthlyPayments = (member: Member): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  if (member.payments) {
    member.payments.forEach(p => {
      if (p.type === 'monthly') {
        result[p.month] = p.paid;
      }
    });
  }
  return result;
}

const getTotalPaid = (member: Member) => {
  let total = member.registrationPaid ? 50 : 0
  if (member.payments) {
    member.payments.forEach(p => {
      if (p.type === 'monthly' && p.paid) total += p.amount;
    })
  }
  return total
}



const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

// ─── Components ──────────────────────────────────────────────────────────────

function Header({
  onMenuOpen,
  onNavigate,
  currentView,
  onLogout,
  isAdmin,
  onLoginClick
}: {
  onMenuOpen: () => void
  onNavigate: (v: View) => void
  currentView: View
  isAdmin: boolean
  onLoginClick: () => void
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-warmborder animate-slide-down">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={onMenuOpen} className="p-2 -ml-2 rounded-xl hover:bg-warmborder/50 transition-colors">
          <Menu className="w-5 h-5 text-charcoal" strokeWidth={1.5} />
        </button>
        <h1
          className="absolute left-1/2 -translate-x-1/2 font-serif text-lg font-bold text-charcoal cursor-pointer"
          onClick={() => onNavigate('dashboard')}
        >
          Jok Oloo Connect
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`hidden sm:block px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              currentView === 'dashboard'
                ? 'bg-terracotta text-cream shadow-button'
                : 'bg-warmborder/50 text-charcoal hover:bg-warmborder'
            }`}
          >
            Dashboard
          </button>
          {isAdmin ? (
            <button onClick={onLogout} className="p-2 rounded-xl hover:bg-warmborder/50 transition-colors text-mutedgray" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onLoginClick} className="p-2 rounded-xl hover:bg-warmborder/50 transition-colors text-mutedgray" title="Admin Login">
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function Sidebar({
  isOpen,
  onClose,
  onNavigate,
  currentView,
  adminName,
  isAdmin
}: {
  isOpen: boolean
  onClose: () => void
  onNavigate: (v: View) => void
  currentView: View
  isAdmin: boolean
  adminName: string
}) {
  const navItems: { label: string; view: View; icon: React.ReactNode }[] = [
    { label: 'Dashboard', view: 'dashboard', icon: <Home className="w-5 h-5" strokeWidth={1.5} /> },
    { label: 'Members', view: 'members', icon: <Users className="w-5 h-5" strokeWidth={1.5} /> },
    ...(isAdmin ? [{ label: 'Reminders', view: 'reminders' as View, icon: <Bell className="w-5 h-5" strokeWidth={1.5} /> }] : []),
    { label: 'Announcements', view: 'announcements', icon: <Megaphone className="w-5 h-5" strokeWidth={1.5} /> },
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[60] animate-fade-in"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] bg-charcoal z-[70] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-serif text-xl font-bold text-cream">Jok Oloo Connect</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-cream/10 transition-colors">
              <X className="w-5 h-5 text-cream" strokeWidth={1.5} />
            </button>
          </div>
          <nav className="space-y-2">
            {navItems.map((item, i) => (
              <button
                key={item.view}
                onClick={() => { onNavigate(item.view); onClose() }}
                className={`w-full nav-item ${currentView === item.view ? 'active' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        {isAdmin && (
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-cream/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center">
                <User className="w-5 h-5 text-terracotta" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-cream font-medium text-sm capitalize">{adminName}</p>
                <p className="text-cream/50 text-xs">Administrator</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

function StatCard({
  value,
  label,
  sublabel,
  delay = 0
}: {
  value: string | number
  label: string
  sublabel: string
  delay?: number
}) {
  return (
    <div
      className="stat-card border-r border-warmborder last:border-r-0 animate-fade-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
      <p className="text-xs text-mutedgray mt-0.5">{sublabel}</p>
    </div>
  )
}

function Dashboard({
  members,
  onNavigate,
  onViewMember
}: {
  members: Member[]
  onNavigate: (v: View) => void
  onViewMember: (id: number) => void
}) {
  const totalMembers = members.length
  const paidReg = members.filter(m => m.registrationPaid).length
  const unpaidReg = totalMembers - paidReg
  const totalCollected = members.reduce((sum, m) => sum + getTotalPaid(m), 0)
  const monthlyTarget = totalMembers * 100

  const branchData = useMemo(() => {
    const counts: Record<string, number> = {}
    members.forEach(m => { counts[m.branch] = (counts[m.branch] || 0) + 1 })
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [members])

  const chartData = [
    { name: 'Week 1', collected: 400, target: 1000 },
    { name: 'Week 2', collected: 800, target: 2000 },
    { name: 'Week 3', collected: totalCollected * 0.6, target: 3000 },
    { name: 'Week 4', collected: totalCollected, target: monthlyTarget },
  ]

  const recentMembers = [...members].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl mx-4 mt-4 animate-scale-in opacity-0" style={{ animationFillMode: 'forwards' }}>
        <img
          src="/hero.jpg"
          alt="Jok Oloo Family"
          className="w-full h-48 sm:h-56 object-cover bg-charcoal"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=1000&auto=format&fit=crop' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream mb-1">
            {getGreeting()}, Jok Oloo
          </h2>
          <p className="text-cream/80 text-sm max-w-md">
            We have officially set our foundations. This is only the beginning of what we intend to achieve together as one family, one great clan.
          </p>
        </div>
      </section>

      {/* Statistics */}
      <section className="mx-4 card-white p-4 animate-scale-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="grid grid-cols-3">
          <StatCard value={totalMembers} label="Total Members" sublabel="registered in the clan" delay={300} />
          <StatCard value={paidReg} label="Registration Paid" sublabel="members paid joining fee" delay={400} />
          <StatCard value={unpaidReg} label="Still Unpaid" sublabel="yet to pay registration" delay={500} />
        </div>
      </section>

      {/* Financial Overview */}
      <section className="mx-4 card-white p-6 animate-scale-in opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="section-heading">Total Collected</h3>
            <p className="text-xs text-mutedgray mt-1">Financial Overview</p>
          </div>
        </div>
        <div className="flex gap-8 mb-6">
          <div>
            <p className="text-3xl font-serif font-bold text-terracotta">KES {totalCollected.toLocaleString()}</p>
            <p className="text-xs text-mutedgray">Total contributions to date</p>
          </div>
          <div>
            <p className="text-3xl font-serif font-bold text-olive">KES {monthlyTarget.toLocaleString()}</p>
            <p className="text-xs text-mutedgray">Monthly target (all members)</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E86A33" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E86A33" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A5D23" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4A5D23" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D5" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8A8A8A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8A8A8A' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #EAE3D5', boxShadow: '0px 4px 24px rgba(26, 26, 26, 0.06)' }}
                labelStyle={{ color: '#1A1A1A', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="collected" stroke="#E86A33" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollected)" />
              <Area type="monotone" dataKey="target" stroke="#4A5D23" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorTarget)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Branch Distribution */}
      <section className="mx-4 card-white p-6 animate-scale-in opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
        <h3 className="section-heading mb-4">Family Branches</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE3D5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#8A8A8A' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#1A1A1A', fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #EAE3D5', boxShadow: '0px 4px 24px rgba(26, 26, 26, 0.06)' }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                {branchData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#E86A33' : index === 1 ? '#4A5D23' : '#EAE3D5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Members */}
      <section className="mx-4 animate-fade-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-heading">Recent Members</h3>
            <p className="text-xs text-mutedgray mt-0.5">{members.length} members registered</p>
          </div>
          <button onClick={() => onNavigate('members')} className="text-terracotta text-sm font-medium flex items-center gap-1 hover:underline">
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {recentMembers.map(member => (
            <button
              key={member.id}
              onClick={() => onViewMember(member.id)}
              className="w-full card-white p-4 flex items-center gap-4 text-left hover:shadow-lg transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0 group-hover:bg-terracotta/20 transition-colors">
                <span className="text-terracotta font-serif font-bold text-sm">{member.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-charcoal text-sm truncate">{member.name}</p>
                <p className="text-xs text-mutedgray">{member.branch} Branch</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={member.registrationPaid ? 'status-paid' : 'status-unpaid'}>
                  {member.registrationPaid ? (
                    <><CheckCircle2 className="w-3 h-3" /> Paid</>
                  ) : (
                    <><XCircle className="w-3 h-3" /> Unpaid</>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-mutedgray" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function MembersDirectory({
  members,
  onViewMember,
  onAddMember,
  onUpdateRegistration,
  isAdmin,
  onLoginRequest
}: {
  members: Member[]
  onViewMember: (id: number) => void
  onAddMember: () => void
  onUpdateRegistration: (memberId: number, paid: boolean) => Promise<void>
  isAdmin: boolean
  onLoginRequest: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterBranch, setFilterBranch] = useState('All')
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all')

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.phone.includes(search)
      const matchBranch = filterBranch === 'All' || m.branch === filterBranch
      const matchStatus = filterStatus === 'all' ||
        (filterStatus === 'paid' && m.registrationPaid) ||
        (filterStatus === 'unpaid' && !m.registrationPaid)
      return matchSearch && matchBranch && matchStatus
    })
  }, [members, search, filterBranch, filterStatus])

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-charcoal">Members</h2>
            <p className="text-xs text-mutedgray mt-0.5">{members.length} members · {members.filter(m => m.registrationPaid).length} paid registration</p>
          </div>
          <button 
            onClick={isAdmin ? onAddMember : onLoginRequest} 
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {isAdmin ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            Add Member
          </button>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedgray" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full input-warm pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setFilterBranch('All')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filterBranch === 'All' ? 'bg-terracotta text-cream' : 'bg-warmborder/50 text-charcoal hover:bg-warmborder'
              }`}
            >
              All Branches
            </button>
            {BRANCHES.filter(b => b !== 'Other').map(branch => (
              <button
                key={branch}
                onClick={() => setFilterBranch(branch)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filterBranch === branch ? 'bg-terracotta text-cream' : 'bg-warmborder/50 text-charcoal hover:bg-warmborder'
                }`}
              >
                {branch}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['all', 'paid', 'unpaid'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                  filterStatus === status ? 'bg-olive text-cream' : 'bg-warmborder/50 text-charcoal hover:bg-warmborder'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold text-mutedgray uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-mutedgray uppercase tracking-wider">Member</th>
              <th className="px-4 py-3 text-xs font-semibold text-mutedgray uppercase tracking-wider hidden sm:table-cell">Phone</th>
              <th className="px-4 py-3 text-xs font-semibold text-mutedgray uppercase tracking-wider">Reg. Fee</th>
              <th className="px-4 py-3 text-xs font-semibold text-mutedgray uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member, idx) => (
              <tr
                key={member.id}
                className={`table-row-warm cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-cream'}`}
                onClick={() => onViewMember(member.id)}
              >
                <td className="px-4 py-3 text-sm text-mutedgray">{member.id}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-terracotta font-serif font-bold text-xs">{member.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-charcoal text-sm">{member.name}</p>
                      <p className="text-xs text-mutedgray sm:hidden">{member.branch}</p>
                      <span className="branch-tag hidden sm:inline-flex mt-0.5">{member.branch}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-mutedgray hidden sm:table-cell">{formatPhone(member.phone)}</td>
                <td className="px-4 py-3" onClick={e => { 
                  e.stopPropagation(); 
                  if (isAdmin) {
                    onUpdateRegistration(member.id, !member.registrationPaid);
                  } else {
                    onLoginRequest();
                  }
                }}>
                  <span className={`${member.registrationPaid ? 'status-paid' : 'status-unpaid'} ${isAdmin ? 'cursor-pointer hover:scale-105 transition-transform animate-bounce-badge' : ''}`}>
                    {member.registrationPaid ? <><CheckCircle2 className="w-3 h-3" /> Paid</> : <><XCircle className="w-3 h-3" /> Unpaid</>}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-serif font-bold text-sm text-charcoal">KES {getTotalPaid(member)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-mutedgray mx-auto mb-3" strokeWidth={1} />
            <p className="text-mutedgray text-sm">No members found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MemberProfileModal({
  member,
  onClose,
  onUpdateRegistration,
  onUpdateMonthly,
  isAdmin,
  onLoginRequest
}: {
  member: Member | null
  onClose: () => void
  onUpdateRegistration: (memberId: number, paid: boolean) => Promise<void>
  onUpdateMonthly: (memberId: number, month: string, paid: boolean) => Promise<void>
  isAdmin: boolean
  onLoginRequest: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (!member) return null

  const totalPaid = getTotalPaid(member)
  const monthlyPayments = getMonthlyPayments(member)

  const handleEditClick = () => {
    if (isAdmin) {
      setIsEditing(!isEditing)
    } else {
      onLoginRequest()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in flex flex-col">
        <div className="p-6 border-b border-warmborder">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-xl font-bold text-charcoal">Member Profile</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-warmborder/50 transition-colors">
              <X className="w-5 h-5 text-mutedgray" />
            </button>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-terracotta/10 flex items-center justify-center mb-3">
              <span className="text-terracotta font-serif font-bold text-2xl">{member.name.charAt(0)}</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-charcoal">{member.name}</h3>
            <p className="text-sm text-mutedgray mt-1">{member.branch}</p>
            <p className="text-sm font-medium text-terracotta mt-2">KES {totalPaid} paid</p>
          </div>
        </div>

        <div className="p-6 border-b border-warmborder">
          <h4 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">Contact Details</h4>
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-mutedgray" />
            <div>
              <p className="text-xs text-mutedgray">Phone</p>
              <p className="text-sm font-medium text-charcoal">{formatPhone(member.phone)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h4 className="font-serif font-bold text-charcoal">Payment History</h4>
              <p className="text-xs text-terracotta font-medium mt-0.5">Admin only</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div 
              className={`flex items-center justify-between p-3 rounded-xl bg-cream ${isEditing ? 'cursor-pointer hover:bg-warmborder/50 transition-colors ring-1 ring-terracotta' : ''}`}
              onClick={() => isEditing && onUpdateRegistration(member.id, !member.registrationPaid)}
            >
              <div>
                <p className="text-sm font-medium text-charcoal">Registration Fee</p>
                <p className="text-xs text-mutedgray">KES 50 one-time</p>
              </div>
              <span className={`${member.registrationPaid ? 'status-paid' : 'status-unpaid'}`}>
                {member.registrationPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>

            {Object.entries(monthlyPayments).map(([month, paid]) => (
              <div 
                key={month}
                className={`flex items-center justify-between p-3 rounded-xl bg-cream ${isEditing ? 'cursor-pointer hover:bg-warmborder/50 transition-colors ring-1 ring-terracotta' : ''}`}
                onClick={() => isEditing && onUpdateMonthly(member.id, month, !paid)}
              >
                <div>
                  <p className="text-sm font-medium text-charcoal">{month}</p>
                  <p className="text-xs text-mutedgray">KES 100 monthly</p>
                </div>
                <span className={`${paid ? 'status-paid' : 'status-unpaid'}`}>
                  {paid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center font-serif">
            <span className="font-bold text-charcoal">Total Paid</span>
            <span className="font-bold text-terracotta">KES {totalPaid}</span>
          </div>
        </div>

        <div className="p-6 border-t border-warmborder flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-warmborder text-sm font-medium hover:bg-warmborder/50 transition-colors text-charcoal">
            Close
          </button>
          <button onClick={handleEditClick} className={`flex-1 py-2.5 rounded-full text-sm font-medium text-cream transition-colors ${isEditing ? 'bg-olive' : 'bg-terracotta'}`}>
            {isEditing ? 'Done Editing' : 'Admin Edit'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddMemberModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (member: Partial<Member>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [branch, setBranch] = useState(BRANCHES[0])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (!branch) newErrors.branch = 'Branch is required'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setLoading(true)
    try {
      await onAdd({ name: name.trim(), phone: phone.trim(), branch })
      setName(''); setPhone(''); setBranch(BRANCHES[0]); setErrors({})
      onClose()
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'Failed to add member' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-xl font-bold text-charcoal">Add New Member</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-warmborder/50 transition-colors">
              <X className="w-5 h-5 text-mutedgray" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                placeholder="Enter full name"
                className={`w-full input-warm ${errors.name ? 'border-red-400 ring-2 ring-red-200' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full input-warm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Family Branch *</label>
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full input-warm appearance-none bg-white"
              >
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {errors.form && <p className="text-xs text-red-500">{errors.form}</p>}
            <button onClick={handleSubmit} disabled={loading} className="w-full btn-primary py-3 text-sm font-medium mt-2">
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RemindersView() {
  const [reminders, setReminders] = useState<ReminderData[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState<number | null>(null)
  const [language, setLanguage] = useState<'en' | 'luo'>('en')

  // Generate month options: current month + last 5 months
  const monthOptions = useMemo(() => {
    const options: string[] = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      options.push(d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }))
    }
    return options
  }, [])

  const [month, setMonth] = useState(monthOptions[0])

  const fetchReminders = async () => {
    setLoading(true)
    setFetched(false)
    setError(null)
    setReminders([])
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`${API_BASE}/api/reminders/generate/${encodeURIComponent(month)}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setReminders(data)
        setFetched(true)
      } else if (res.status === 401) {
        setError('Session expired. Please log out and log in again as admin.')
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `Server error (${res.status}). Please try again.`)
      }
    } catch (e) {
      console.error(e)
      setError('Network error — make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  // Log that admin sent a reminder via WhatsApp
  const handleSend = async (rem: ReminderData, idx: number) => {
    setSending(idx)
    try {
      const token = localStorage.getItem('admin_token')
      await fetch(`${API_BASE}/api/reminders/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          memberId: rem.memberId,
          month,
          message: language === 'en' ? rem.messageEn : rem.messageLuo,
          sentVia: 'wame',
        }),
      })
    } catch (e) {
      console.error('Failed to log reminder:', e)
    } finally {
      setSending(null)
    }
    // Open WhatsApp link
    window.open(language === 'en' ? rem.waLinkEn : rem.waLinkLuo, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-4 space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-charcoal">Payment Reminders</h2>
          <p className="text-xs text-mutedgray mt-0.5">Send WhatsApp messages to unpaid members</p>
        </div>

        {/* Month selector + Generate button */}
        <div className="card-white p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-mutedgray uppercase tracking-wider mb-1.5">Select Month</label>
            <select
              value={month}
              onChange={e => { setMonth(e.target.value); setReminders([]); setFetched(false); setError(null) }}
              className="w-full input-warm appearance-none bg-white"
            >
              {monthOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchReminders}
            disabled={loading}
            className="btn-primary py-2.5 px-6 text-sm whitespace-nowrap self-end disabled:opacity-60"
          >
            {loading ? 'Generating...' : '⚡ Generate Links'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Could not load reminders</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {fetched && reminders.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="font-serif font-bold text-charcoal">Unpaid for {month}</h4>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="bg-warmborder/50 rounded-full p-1 flex">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${language === 'en' ? 'bg-white shadow text-charcoal' : 'text-mutedgray'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLanguage('luo')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${language === 'luo' ? 'bg-white shadow text-charcoal' : 'text-mutedgray'}`}
                  >
                    Dholuo
                  </button>
                </div>
                <span className="px-3 py-1 bg-terracotta/10 text-terracotta text-xs font-semibold rounded-full whitespace-nowrap">
                  {reminders.length} member{reminders.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            {reminders.map((rem, i) => (
              <div key={i} className="card-white p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h5 className="font-medium text-charcoal truncate">{rem.memberName}</h5>
                  <p className="text-xs text-mutedgray">{rem.phone || 'No phone'}</p>
                  <p className="text-xs text-mutedgray/70 mt-1 line-clamp-3 whitespace-pre-wrap">
                    {language === 'en' ? rem.messageEn : rem.messageLuo}
                  </p>
                </div>
                {rem.phone ? (
                  <button
                    onClick={() => handleSend(rem, i)}
                    disabled={sending === i}
                    className="flex-shrink-0 px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-medium hover:bg-[#128C7E] transition-colors flex items-center gap-2 disabled:opacity-60"
                  >
                    <Bell className="w-4 h-4" />
                    {sending === i ? 'Opening...' : 'Send'}
                  </button>
                ) : (
                  <span className="flex-shrink-0 px-4 py-2 bg-warmborder text-mutedgray rounded-lg text-xs">No Phone</span>
                )}
              </div>
            ))}
          </div>
        )}

        {fetched && reminders.length === 0 && (
          <div className="text-center py-12 card-white">
            <CheckCircle2 className="w-12 h-12 text-olive mx-auto mb-3" strokeWidth={1} />
            <p className="font-serif font-bold text-charcoal">All members paid for {month}! 🎉</p>
            <p className="text-mutedgray text-sm mt-1">No reminders needed.</p>
          </div>
        )}

        {!fetched && !error && (
          <div className="text-center py-12 card-white">
            <Bell className="w-12 h-12 text-mutedgray mx-auto mb-3" strokeWidth={1} />
            <p className="text-mutedgray text-sm">Select a month and click <strong>Generate Links</strong> to see who hasn't paid yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AnnouncementsView() {
  return (
    <div className="pb-20">
      <div className="px-4 pt-4 space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-charcoal">Announcements</h2>
          <p className="text-xs text-mutedgray mt-0.5">Stay connected with your clan</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-charcoal p-6 text-cream">
          <div className="absolute top-0 right-0 w-32 h-32 bg-terracotta/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-olive/20 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <Heart className="w-8 h-8 text-terracotta mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-xl font-bold mb-2">Unity · Contribution · Family</h3>
            <p className="text-cream/70 text-sm">Together as a single entity, a family, a great clan.</p>
          </div>
        </div>

        <div className="card-white p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-terracotta" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-serif font-bold text-charcoal">Payment Details</h4>
              <p className="text-xs text-mutedgray">Treasurer: Susan Orinda</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cream rounded-xl p-3 text-center">
              <p className="text-2xl font-serif font-bold text-terracotta">KES 50</p>
              <p className="text-xs text-mutedgray">Registration Fee</p>
            </div>
            <div className="bg-cream rounded-xl p-3 text-center">
              <p className="text-2xl font-serif font-bold text-olive">KES 100</p>
              <p className="text-xs text-mutedgray">Monthly Contribution</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-cream rounded-xl flex items-center gap-2">
            <Phone className="w-4 h-4 text-olive" strokeWidth={1.5} />
            <span className="text-sm font-medium text-charcoal">M-PESA: 0729207208</span>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-serif font-bold text-charcoal">Latest Updates</h4>
          {ANNOUNCEMENTS.map(ann => (
            <div key={ann.id} className="card-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${
                  ann.type === 'welcome' ? 'bg-terracotta' : ann.type === 'finance' ? 'bg-olive' : 'bg-mutedgray'
                }`} />
                <span className="text-xs text-mutedgray uppercase tracking-wider font-semibold">{ann.type}</span>
              </div>
              <h5 className="font-medium text-charcoal mb-2">{ann.title}</h5>
              <p className="text-sm text-mutedgray leading-relaxed">{ann.content}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-warmborder/50">
                <span className="text-xs text-mutedgray">— {ann.author}</span>
                <span className="text-xs text-mutedgray">{ann.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoginModal({ onLogin, onClose }: { onLogin: () => void, onClose: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (res.ok) {
        const data = await res.json()
        // Store token in localStorage for cross-origin auth
        if (data.token) {
          localStorage.setItem('admin_token', data.token)
          localStorage.setItem('admin_username', username)
        }
        onLogin()
      } else {
        const data = await res.json()
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error — check server is running')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative card-white p-8 w-full max-w-md animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-warmborder/50 transition-colors">
          <X className="w-5 h-5 text-mutedgray" />
        </button>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-terracotta" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-charcoal">Admin Login</h2>
          <p className="text-sm text-mutedgray mt-2">Sign in to manage Jok Oloo Connect</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full input-warm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full input-warm"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="w-full btn-primary py-3">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [view, setView] = useState<View>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Auth check — use localStorage token (cookie won't travel cross-origin)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('admin_token')
        if (!token) { setIsLoadingAuth(false); return }
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setAdminName(data.username)
          setIsAdmin(true)
        } else {
          // Token invalid/expired — clear it
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_username')
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoadingAuth(false)
      }
    }
    checkAuth()
  }, [])

  // Fetch members (public endpoint — no auth needed)
  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/members`)
      if (res.ok) {
        setMembers(await res.json())
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    setIsAdmin(false)
    setAdminName('')
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' })
    } catch { /* ignore */ }
  }

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  )

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-cream">Loading...</div>
  }

  const handleViewMember = (id: number) => {
    setSelectedMemberId(id)
    setProfileModalOpen(true)
  }

  const handleAddMember = async (newMember: Partial<Member>) => {
    const token = localStorage.getItem('admin_token')
    const res = await fetch(`${API_BASE}/api/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(newMember)
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to add member')
    }

    await fetchMembers()
  }

  const handleUpdateRegistration = async (id: number, _paid?: boolean) => {
    try {
      const token = localStorage.getItem('admin_token')
      await fetch(`${API_BASE}/api/payments/registration/${id}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      await fetchMembers()
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateMonthly = async (memberId: number, month: string, paid: boolean) => {
    try {
      const token = localStorage.getItem('admin_token')
      await fetch(`${API_BASE}/api/payments/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ memberId, month, type: 'monthly', amount: 100, paid })
      })
      await fetchMembers()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header 
        onMenuOpen={() => setSidebarOpen(true)} 
        onNavigate={setView} 
        currentView={view} 
        isAdmin={isAdmin}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout} 
      />
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNavigate={setView} 
        currentView={view} 
        isAdmin={isAdmin}
        adminName={adminName} 
      />

      <main className="max-w-5xl mx-auto">
        {view === 'dashboard' && (
          <Dashboard members={members} onNavigate={setView} onViewMember={handleViewMember} />
        )}
        {view === 'members' && (
          <MembersDirectory
            members={members}
            onViewMember={handleViewMember}
            onAddMember={() => setShowAddMember(true)}
            onUpdateRegistration={handleUpdateRegistration}
            isAdmin={isAdmin}
            onLoginRequest={() => setShowLoginModal(true)}
          />
        )}
        {view === 'reminders' && isAdmin && <RemindersView />}
        {view === 'announcements' && <AnnouncementsView />}
      </main>

      {/* Modals */}
      {profileModalOpen && selectedMember && (
        <MemberProfileModal
          member={selectedMember}
          onClose={() => { setProfileModalOpen(false); setSelectedMemberId(null) }}
          onUpdateRegistration={handleUpdateRegistration}
          onUpdateMonthly={handleUpdateMonthly}
          isAdmin={isAdmin}
          onLoginRequest={() => setShowLoginModal(true)}
        />
      )}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        onAdd={handleAddMember}
      />
      {showLoginModal && (
        <LoginModal 
          onLogin={async () => {
            setIsAdmin(true)
            setShowLoginModal(false)
            // Read the username we stored during login
            const savedUsername = localStorage.getItem('admin_username')
            if (savedUsername) setAdminName(savedUsername)
          }}
          onClose={() => setShowLoginModal(false)} 
        />
      )}
    </div>
  )
}
