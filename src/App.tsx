import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp,
  setDoc,
  doc,
  getDocs
} from 'firebase/firestore';
import { 
  PlusCircle, 
  ClipboardList, 
  Settings, 
  Laptop, 
  BatteryCharging, 
  ShieldCheck, 
  BarChart3,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, signIn, signOut, handleFirestoreError, OperationType } from './lib/firebase.ts';
import { onAuthStateChanged, User } from 'firebase/auth';
import { cn } from './lib/utils.ts';
import { Category, LogEntry, GradeLevel, DashboardStats } from './types.ts';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// --- STYLES & CONSTANTS ---
const SCHOOL_ORANGE = "#FF6B00";
const SCHOOL_BLACK = "#000000";

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'chromebook',
    name: 'Chromebook',
    description: 'Device repair and loan tracking',
    actions: ['Loaned', 'Repair Submission', 'Returned', 'Sub-Device Swap'],
    issues: ['Screen Damage', 'Battery Issues', 'Keyboard Issues', 'Trackpad Issues', 'Charging Issues', 'Software Issues', 'Physical Damage', 'Other'],
    active: true
  },
  {
    id: 'charger',
    name: 'Charger',
    description: 'Charger loans and replacements',
    actions: ['Loaned', 'Replaced', 'Returned', 'Lost', 'Damaged', 'Unpaid'],
    active: true
  },
  {
    id: 'yondr',
    name: 'YONDR Pouch',
    description: 'Pouch replacements and refurbishing',
    actions: ['Replaced', 'Refurbished', 'Damaged', 'Lost', 'Returned'],
    active: true
  }
];

// --- COMPONENTS ---

const Header = ({ activeTab, setActiveTab, user }: { activeTab: string, setActiveTab: (t: string) => void, user: User | null }) => (
  <header className="bg-black text-white p-4 shadow-xl border-b-4 border-[#FF6B00]">
    <div className="max-w-7xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center font-bold text-black border-2 border-white shadow-[2px_2px_0px_#fff]">
          DL
        </div>
        <div>
          <h1 className="font-sans font-black tracking-tighter text-2xl uppercase">DragonLink</h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF6B00]">IT Tracking System</p>
        </div>
      </div>
      
      <nav className="flex gap-4 items-center">
        {[
          { id: 'kiosk', icon: PlusCircle, label: 'New Log', adminOnly: false },
          { id: 'dashboard', icon: BarChart3, label: 'Dashboard', adminOnly: true },
          { id: 'logs', icon: ClipboardList, label: 'Records', adminOnly: true },
          { id: 'settings', icon: Settings, label: 'Setup', adminOnly: true }
        ].filter(item => !item.adminOnly || user).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
              activeTab === item.id 
                ? "bg-[#FF6B00] text-black shadow-[4px_4px_0px_#fff]" 
                : "hover:bg-white/10 text-white/70"
            )}
          >
            <item.icon size={16} />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
        
        {user ? (
          <button 
            onClick={signOut}
            className="ml-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 hover:border-[#FF6B00] transition-all"
            title={`Signed in as ${user.email}`}
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold">{user.email?.charAt(0).toUpperCase()}</span>
            )}
          </button>
        ) : (
          <button 
            onClick={signIn}
            className="ml-4 px-4 py-2 rounded-xl bg-white/5 border border-white/20 text-[10px] font-black uppercase tracking-widest hover:bg-[#FF6B00] hover:text-black transition-all"
          >
            Admin Sign In
          </button>
        )}
      </nav>
    </div>
  </header>
);

const KioskMode = ({ categories }: { categories: Category[] }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<LogEntry>>({
    studentName: '',
    studentEmail: '',
    gradeLevel: '9',
    categoryId: '',
    categoryName: '',
    actionType: '',
    issueType: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeCategory = categories.find(c => c.id === formData.categoryId);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'logs'), {
        ...formData,
        timestamp: serverTimestamp(),
        status: 'Pending'
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStep(1);
        setFormData({ ...formData, studentName: '', studentEmail: '', notes: '', issueType: '', actionType: '' });
      }, 3000);
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border-8 border-[#FF6B00] shadow-[12px_12px_0px_#000]">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green-100 p-6 rounded-full mb-6">
          <CheckCircle2 size={64} className="text-green-600" />
        </motion.div>
        <h2 className="text-4xl font-black uppercase mb-2">Success!</h2>
        <p className="text-gray-600 font-medium">Log entry recorded. Have a great day, Dragon!</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full">
      <div className="bg-white p-8 rounded-3xl border-4 border-black shadow-[8px_8px_0px_#FF6B00]">
        <div className="mb-8 flex justify-between items-center overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-500 mx-1",
                step >= i ? "bg-[#FF6B00]" : "bg-gray-100"
              )} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-black uppercase">Who are you?</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name"
                    className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-[#FF6B00] outline-none transition-all font-medium text-lg"
                    value={formData.studentName}
                    onChange={e => setFormData({...formData, studentName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Grade / Role</label>
                  <div className="grid grid-cols-5 gap-2">
                    {['9', '10', '11', '12', 'Staff'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setFormData({...formData, gradeLevel: g as GradeLevel})}
                        className={cn(
                          "py-3 rounded-lg border-2 text-sm font-bold transition-all",
                          formData.gradeLevel === g ? "border-black bg-black text-white" : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => formData.studentName && setStep(2)}
                disabled={!formData.studentName}
                className="w-full py-4 bg-[#FF6B00] text-black font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-black uppercase">What do you need?</h2>
              <div className="grid grid-cols-1 gap-3">
                {categories.filter(c => c.active).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setFormData({...formData, categoryId: cat.id, categoryName: cat.name, actionType: '', issueType: ''});
                      setStep(3);
                    }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-[#FF6B00] hover:bg-orange-50 transition-all text-left group"
                  >
                    <div className="p-3 rounded-xl bg-gray-50 group-hover:bg-[#FF6B00] group-hover:text-black transition-all">
                      {cat.id === 'chromebook' ? <Laptop /> : cat.id === 'charger' ? <BatteryCharging /> : <ShieldCheck />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{cat.name}</h3>
                      <p className="text-xs text-gray-500 font-medium">{cat.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="w-full py-2 text-xs font-bold uppercase text-gray-400 hover:text-black">Go Back</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                {formData.categoryName} <span className="text-gray-300 font-light">&rarr;</span> Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-2">Action Required</label>
                  <div className="flex flex-wrap gap-2">
                    {activeCategory?.actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => setFormData({...formData, actionType: action})}
                        className={cn(
                          "px-4 py-2 rounded-full border-2 text-xs font-bold transition-all",
                          formData.actionType === action ? "border-black bg-black text-white" : "border-gray-100 hover:border-[#FF6B00]"
                        )}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>

                {activeCategory?.issues && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-2">Specific Issue (Optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {activeCategory.issues.map((issue) => (
                        <button
                          key={issue}
                          onClick={() => setFormData({...formData, issueType: issue})}
                          className={cn(
                            "px-4 py-2 rounded-full border-2 text-[10px] font-bold transition-all",
                            formData.issueType === issue ? "bg-orange-100 border-[#FF6B00] text-black" : "border-gray-50 text-gray-400 hover:border-gray-200"
                          )}
                        >
                          {issue}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Notes / Description</label>
                  <textarea 
                    placeholder="Briefly describe if needed"
                    className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-[#FF6B00] outline-none transition-all font-medium text-sm h-24 resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep(2)} 
                  className="px-6 py-4 rounded-xl border-2 border-gray-100 font-bold uppercase text-xs"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.actionType || loading}
                  className="flex-1 py-4 bg-[#FF6B00] text-black font-black uppercase tracking-widest rounded-xl shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Dashboard = ({ stats, categories }: { stats: any, categories: Category[] }) => {
  const chartData = categories.map(c => ({
    name: c.name,
    count: stats.logsByCategory[c.id] || 0
  }));

  const COLORS = ['#FF6B00', '#000000', '#666666', '#999999'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0px_#FF6B00]">
          <p className="text-[10px] uppercase font-bold text-gray-400">Total Entries</p>
          <p className="text-4xl font-black">{stats.totalLogs}</p>
        </div>
        {categories.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border-2 border-gray-100">
            <p className="text-[10px] uppercase font-bold text-gray-400">{c.name}s</p>
            <p className="text-2xl font-black">{stats.logsByCategory[c.id] || 0}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 h-[400px]">
          <h3 className="font-bold text-sm uppercase mb-6 flex items-center gap-2">
            <BarChart3 size={16} /> Asset Distribution
          </h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill="#FF6B00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 flex flex-col">
          <h3 className="font-bold text-sm uppercase mb-6">Action Breakdown</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(stats.logsByAction).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {Object.entries(stats.logsByAction).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const LogsTable = ({ logs }: { logs: LogEntry[] }) => {
  const [filter, setFilter] = useState('');
  
  const filteredLogs = logs.filter(log => 
    log.studentName.toLowerCase().includes(filter.toLowerCase()) ||
    log.categoryName.toLowerCase().includes(filter.toLowerCase()) ||
    log.actionType.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
        <h3 className="font-bold text-sm uppercase tracking-wider">Transaction History</h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search records..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-black text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#FF6B00] text-black uppercase text-[10px] font-black">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-orange-50/50 transition-colors cursor-pointer group">
                <td className="px-6 py-4">
                  <div className="font-bold text-black">{log.studentName}</div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{log.gradeLevel} Grade</div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{log.categoryName}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{log.actionType}</div>
                  {log.issueType && <div className="text-[10px] text-gray-400 italic font-bold">{log.issueType}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                    log.status === 'Completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {log.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                  {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, h:mm a') : '...'}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold uppercase italic">No records found matching filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsView = ({ categories, onUpdate }: { categories: Category[], onUpdate: (c: Category[]) => void }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase">Configuration</h2>
        <button className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <PlusCircle size={16} /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white p-6 rounded-2xl border-2 border-gray-100 hover:border-black transition-all flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg uppercase">{cat.name}</h3>
                {!cat.active && <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded font-black uppercase">Inactive</span>}
              </div>
              <p className="text-sm text-gray-500">{cat.description}</p>
              <div className="pt-4 flex flex-wrap gap-2">
                {cat.actions.map(a => (
                  <span key={a} className="text-[10px] font-bold uppercase py-1 px-3 bg-gray-50 border border-gray-100 rounded text-gray-400">{a}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"><Settings size={20} /></button>
              <button className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-gray-400">
                <AlertCircle size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [activeTab, setActiveTab] = useState('kiosk');
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalLogs: 0,
    logsByCategory: {},
    logsByAction: {},
    recentLogs: []
  });

  // Init Data and Auth
  useEffect(() => {
    // Auth State listener
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // Categories listener - Initialize with defaults to prevent flickering
    setCategories(DEFAULT_CATEGORIES);
    
    const unsubCat = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      if (cats.length > 0) {
        setCategories(cats);
      } else if (auth.currentUser) {
        // Only seed if we are authenticated to avoid repeated permission-denied noise for guest users
        DEFAULT_CATEGORIES.forEach(c => setDoc(doc(db, 'categories', c.id), c).catch(() => {}));
      }
    }, (error) => {
      // Don't log error for common permission issues on public reads during setup
      if (!error.message.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.GET, 'categories');
      }
    });

    return () => { 
      unsubAuth();
      unsubCat();
    };
  }, []);

  // Separate effect for logs to respond to user auth state
  useEffect(() => {
    if (!user) {
      setLogs([]);
      setStats({ totalLogs: 0, logsByCategory: {}, logsByAction: {}, recentLogs: [] });
      if (activeTab !== 'kiosk') setActiveTab('kiosk');
      return;
    }

    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
      setLogs(entries);

      const byCat: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      
      entries.forEach(log => {
        byCat[log.categoryId] = (byCat[log.categoryId] || 0) + 1;
        byAction[log.actionType] = (byAction[log.actionType] || 0) + 1;
      });

      setStats({
        totalLogs: entries.length,
        logsByCategory: byCat,
        logsByAction: byAction,
        recentLogs: entries.slice(0, 10)
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    return () => unsubLogs();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans selection:bg-[#FF6B00] selection:text-white relative overflow-hidden">
      {/* Koi Scale Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
        backgroundImage: `radial-gradient(circle at 10px 10px, black 2px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40a20 20 0 0 1 20-20A20 20 0 0 1 40 40H0zM0 0a20 20 0 0 1 20 20A20 20 0 0 1 40 0H0z' fill='%23000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '40px 40px'
      }} />
      
      <Header activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "circOut" }}
            >
              {activeTab === 'kiosk' && <KioskMode categories={categories} />}
              {activeTab === 'dashboard' && <Dashboard stats={stats} categories={categories} />}
              {activeTab === 'logs' && <LogsTable logs={logs} />}
              {activeTab === 'settings' && <SettingsView categories={categories} onUpdate={setCategories} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="p-8 text-center text-gray-300 font-mono text-[10px] uppercase tracking-[0.3em]">
        DRAGONLINK V1.0 // POWERED BY KOI ARCHITECTURE
      </footer>
    </div>
  );
}
